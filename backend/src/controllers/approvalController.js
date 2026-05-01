import prisma from '../utils/db.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { sendApprovalEmail } from '../services/emailService.js';
import { generateExcelPR, updateExcelFile } from '../services/generateTemplate.js';
import path from 'path';
import { ensureWbsExists } from '../utils/wbsSync.js';

/**
 * POST /api/approvals/send
 * Body: { prId, approverIds: [id, id, ...] }
 * Creates PrApproval records, sends emails to each approver.
 */
export const sendApprovalRequests = async (req, res) => {
    try {
        const { prId, approverIds } = req.body;

        if (!prId || !approverIds || approverIds.length === 0) {
            return res.status(400).json({ error: 'prId and at least one approverId are required' });
        }

        // Fetch PR with department
        const pr = await prisma.pr.findUnique({
            where: { id: prId },
            include: { department: true }
        });
        if (!pr) return res.status(404).json({ error: 'PR not found' });

        // Fetch approvers
        const approvers = await prisma.approver.findMany({
            where: { id: { in: approverIds } }
        });

        if (approvers.length === 0) {
            return res.status(404).json({ error: 'No valid approvers found' });
        }

        // Check for existing pending approvals and skip re-send
        const existingApprovals = await prisma.prApproval.findMany({
            where: { prId }
        });
        const alreadySentIds = new Set(existingApprovals.map(a => a.approverId));

        const newApprovers = approvers.filter(a => !alreadySentIds.has(a.id));

        // Create PrApproval entries and send emails
        const results = [];
        for (const approver of newApprovers) {
            const token = uuidv4();

            await prisma.prApproval.create({
                data: {
                    prId,
                    approverId: approver.id,
                    token,
                    status: 'PENDING'
                }
            });

            try {
                await sendApprovalEmail({
                    approverName: approver.name,
                    approverEmail: approver.email,
                    prNumber: pr.prNumber,
                    department: pr.department?.name || 'N/A',
                    totalValue: parseFloat(pr.totalValue),
                    description: pr.description,
                    token,
                });
                results.push({ approver: approver.name, email: approver.email, status: 'sent' });
            } catch (emailErr) {
                console.error(`[Email Error] Failed to send to ${approver.email}:`, emailErr.message);
                results.push({ approver: approver.name, email: approver.email, status: 'failed', error: emailErr.message });
            }
        }

        res.json({
            message: `Approval requests processed for ${newApprovers.length} approver(s).`,
            skipped: approvers.length - newApprovers.length,
            results
        });
    } catch (error) {
        console.error('sendApprovalRequests Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/approvals/action/:token
 * Returns the PR details and current approval state for this token.
 */
export const getApprovalByToken = async (req, res) => {
    try {
        const { token } = req.params;

        const approval = await prisma.prApproval.findUnique({
            where: { token },
            include: {
                approver: true,
                pr: {
                    include: {
                        department: true,
                        approvals: { include: { approver: true } }
                    }
                }
            }
        });

        if (!approval) {
            return res.status(404).json({ error: 'Invalid or expired approval link.' });
        }

        // PR was soft-deleted after email was sent
        if (approval.pr.deletedAt) {
            return res.json({
                prDeleted: true,
                prNumber: approval.pr.prNumber,
                approver: approval.approver.name,
            });
        }

        if (approval.status !== 'PENDING') {
            return res.json({
                alreadyResponded: true,
                status: approval.status,
                approver: approval.approver.name,
                prNumber: approval.pr.prNumber
            });
        }

        res.json({
            alreadyResponded: false,
            approvalId: approval.id,
            approver: {
                name: approval.approver.name,
                email: approval.approver.email,
                role: approval.role
            },
            pr: {
                id: approval.pr.id,
                prNumber: approval.pr.prNumber,
                prDate: approval.pr.prDate,
                department: approval.pr.department?.name,
                totalValue: parseFloat(approval.pr.totalValue),
                description: approval.pr.description,
                lineItems: approval.pr.lineItems,
                status: approval.pr.status,
            }
        });
    } catch (error) {
        console.error('getApprovalByToken Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * POST /api/approvals/action/:token
 * Body: { decision: 'APPROVED' | 'REJECTED', comments?: string }
 * Records the decision and runs the unanimous model.
 */
export const submitApproval = async (req, res) => {
    try {
        const { token } = req.params;
        const { decision, comments } = req.body;

        if (!['APPROVED', 'REJECTED'].includes(decision)) {
            return res.status(400).json({ error: 'Decision must be APPROVED or REJECTED' });
        }

        const approval = await prisma.prApproval.findUnique({
            where: { token },
            include: { pr: true }
        });

        if (!approval) {
            return res.status(404).json({ error: 'Invalid or expired approval link.' });
        }

        // Reject action if PR has been soft-deleted
        if (approval.pr.deletedAt) {
            return res.status(410).json({
                error: 'This PR has been cancelled and is no longer active.',
                prDeleted: true,
                prNumber: approval.pr.prNumber,
            });
        }

        if (approval.status !== 'PENDING') {
            return res.status(409).json({
                error: 'This approval link has already been used.',
                status: approval.status
            });
        }

        // Step 1: Record decision
        await prisma.prApproval.update({
            where: { token },
            data: {
                status: decision,
                comments: comments || null,
                respondedAt: new Date()
            }
        });

        // Step 2: Handle Sequential Logic & PR Status
        const currentPrId = approval.prId;
        const currentRole = approval.role; // e.g. STAGE1

        // Stage 1 specific updates: Indent No and WBS Code
        if (currentRole === 'STAGE1' && decision === 'APPROVED') {
            const { indentNo, wbsCode } = req.body;
            const updateData = {};
            if (indentNo) updateData.prNumber = indentNo;

            if (wbsCode) {
                updateData.wbsCode = wbsCode;
                // Resolve from config and update department to match!
                const syncResult = await ensureWbsExists(wbsCode);
                if (syncResult) {
                    updateData.departmentId = syncResult.departmentId;
                }
            }

            if (Object.keys(updateData).length > 0) {
                console.log(`[Sequential Flow] STAGE1 update:`, updateData);
                await prisma.pr.update({
                    where: { id: currentPrId },
                    data: updateData
                });
            }
        }

        // Final PR fetch for logic
        const updatedPr = await prisma.pr.findUnique({
            where: { id: currentPrId },
            include: { department: true, approvals: { include: { approver: true } } }
        });

        const allApprovals = updatedPr.approvals;
        const anyRejected = allApprovals.some(a => a.status === 'REJECTED');

        let nextEmailSent = false;
        let prNewStatus = 'PENDING';

        if (anyRejected) {
            prNewStatus = 'REJECTED';
        } else {
            // Check sequence: INDENTOR -> STAGE1 -> STAGE2 -> STAGE3
            const roleSequence = ['INDENTOR', 'STAGE1', 'STAGE2', 'STAGE3'];
            const currentIndex = roleSequence.indexOf(currentRole);

            if (decision === 'APPROVED') {
                // Determine if there is a next stage needing email
                const nextRole = roleSequence[currentIndex + 1];
                if (nextRole) {
                    const nextApproval = allApprovals.find(a => a.role === nextRole);
                    if (nextApproval && nextApproval.status === 'PENDING') {
                        // Send Email to Next Approver
                        try {
                            // Prepare Attachments for the next person
                            const attachments = [];
                            if (updatedPr.excelPath) {
                                const excelFile = path.resolve('uploads/output', updatedPr.excelPath);
                                if (fs.existsSync(excelFile)) {
                                    attachments.push({ filename: `PR-Draft-${updatedPr.prNumber}.xlsx`, path: excelFile });
                                }
                            }
                            if (updatedPr.pdfPath) {
                                const quoteFile = path.resolve('uploads/quotations', updatedPr.pdfPath);
                                if (fs.existsSync(quoteFile)) {
                                    attachments.push({ filename: `Original-Quote-${updatedPr.prNumber}${path.extname(updatedPr.pdfPath)}`, path: quoteFile });
                                }
                            }

                            await sendApprovalEmail({
                                approverName: nextApproval.approver.name,
                                approverEmail: nextApproval.approver.email,
                                role: nextRole === 'STAGE1' ? 'PR Approver (Stage 1)' : nextRole === 'STAGE2' ? 'Verifier (Stage 2)' : 'Final Approver (Stage 3)',
                                prNumber: updatedPr.prNumber,
                                department: updatedPr.department?.name || 'N/A',
                                totalValue: parseFloat(updatedPr.totalValue),
                                description: updatedPr.description,
                                token: nextApproval.token,
                                attachments
                            });
                            nextEmailSent = true;
                        } catch (err) {
                            console.error(`[Sequential Flow] Failed to trigger next email (${nextRole}):`, err.message);
                        }
                    }
                } else {
                    // This was the last stage (STAGE3)
                    prNewStatus = 'APPROVED';
                }
            }
        }

        // Update PR Status
        await prisma.pr.update({
            where: { id: currentPrId },
            data: {
                status: prNewStatus,
                ...(prNewStatus === 'APPROVED' ? { dateOfApproval: new Date() } : {})
            }
        });

        // Step 3: Patch the EXISTING Excel file in-place (no new file created)
        if (updatedPr.excelPath && decision === 'APPROVED') {
            const excelFile = path.resolve('uploads/output', updatedPr.excelPath);

            // Map each role to its signature cell positions in the Excel sheet
            const sigPositions = {
                'INDENTOR': { nameCell: 'B21', imageRange: 'B20:B20' },
                
                'STAGE2': { nameCell: 'D21', imageRange: 'D20:D20' },
                'STAGE3': { nameCell: 'J21', imageRange: 'J20:L20' },
            };

            const pos = sigPositions[currentRole];
            const currentApproverRecord = updatedPr.approvals.find(a => a.role === currentRole);

            const excelUpdates = [];

            if (pos && currentApproverRecord?.approver) {
                const approverName = currentApproverRecord.approver.name || currentApproverRecord.approver.email;
                // Write approver name below signature area
                excelUpdates.push({ type: 'text', cell: pos.nameCell, value: approverName, bold: true });

                // Embed signature image if available
                if (currentApproverRecord.approver.signaturePath) {
                    const sigPath = path.resolve('uploads/signatures', currentApproverRecord.approver.signaturePath);
                    excelUpdates.push({ type: 'image', range: pos.imageRange, imagePath: sigPath });
                }
            }

            // Stage 1: also patch Indent No and WBS Code cells in the header
            if (currentRole === 'STAGE1') {
                if (updatedPr.prNumber) {
                    excelUpdates.push({ type: 'text', cell: 'A6', value: 'INDENT NO: ' + updatedPr.prNumber });
                }
                if (updatedPr.wbsCode) {
                    excelUpdates.push({ type: 'text', cell: 'L9', value: updatedPr.wbsCode });
                }
            }

            if (excelUpdates.length > 0) {
                try {
                    await updateExcelFile(excelFile, excelUpdates);
                    console.log(`[Approval Action] Excel patched in-place for role: ${currentRole}`);
                } catch (excelErr) {
                    console.error('[Approval Action] Excel patch failed:', excelErr.message);
                }
            }
        }

        res.json({
            message: decision === 'APPROVED'
                ? (nextEmailSent ? `Approved! Notification sent to the next stage.` : `Final approval received! PR is now completed.`)
                : `Decision recorded. PR has been rejected.`,
            decision,
            prStatus: prNewStatus
        });
    } catch (error) {
        console.error('submitApproval Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/approvals/pr/:prId
 * Returns all approval entries for a given PR (for tracking page).
 */
export const getPrApprovals = async (req, res) => {
    try {
        const { id } = req.params; // Use 'id' from req.params to match the route /api/prs/:id/approvals
        const approvals = await prisma.prApproval.findMany({
            where: { prId: id },
            include: { approver: true },
            orderBy: { createdAt: 'asc' }
        });
        res.json(approvals);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
