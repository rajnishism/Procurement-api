import prisma from '../utils/db.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { sendPoApprovalEmail, sendPoIssuanceEmail } from '../services/emailService.js';
import { reverseBudgetForPO, deductBudgetForPO } from '../services/budgetService.js';
import { updateExcelFile } from '../services/generateTemplate.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * POST /api/po-approvals/send
 * Nominate an approver for a PO by email.
 */
export const sendPoApprovalRequest = async (req, res) => {
    try {
        const { poId, approverIds } = req.body;
        if (!poId || !approverIds || approverIds.length === 0) {
            return res.status(400).json({ error: 'poId and at least one approverId are required.' });
        }

        const po = await prisma.purchaseOrder.findUnique({
            where: { id: poId },
            include: { vendor: true, pr: true, rfq: true }
        });
        if (!po) return res.status(404).json({ error: 'PO not found.' });
        if (po.status !== 'DRAFT') return res.status(400).json({ error: 'PO is already in an active workflow.' });

        let approvers = await prisma.approver.findMany({
            where: { id: { in: approverIds } }
        });
        
        if (approvers.length === 0) return res.status(404).json({ error: 'No valid approvers found.' });

        // Ensure approvers are mapped exactly in the hierarchical sequence selected
        approvers = approvers.sort((a, b) => approverIds.indexOf(a.id) - approverIds.indexOf(b.id));

        // Generate approvals with sequential roles
        const roles = ['PREPARER', 'STAGE1', 'STAGE2', 'STAGE3'];
        const results = [];

        for (let i = 0; i < approvers.length; i++) {
            const approver = approvers[i];
            const token = uuidv4();
            const assignedRole = roles[i] || 'STAGE3';

            await prisma.poApproval.create({
                data: { 
                    poId, 
                    approverId: approver.id, 
                    role: assignedRole,
                    token, 
                    status: 'PENDING' 
                }
            });

            // If it's the very first approver, notify them immediately
            if (i === 0) {
                try {
                    await sendPoApprovalEmail({
                        approverName: approver.name,
                        approverEmail: approver.email,
                        poNumber: po.poNumber,
                        vendorName: po.vendor?.name || 'Manual Vendor',
                        totalAmount: parseFloat(po.totalAmount),
                        prNumber: po.pr?.prNumber || 'N/A',
                        token
                    });
                    results.push({ approver: approver.name, email: approver.email, status: 'sent' });
                } catch (emailErr) {
                    console.error(`[Email Error] Failed to send to ${approver.email}:`, emailErr.message);
                    results.push({ approver: approver.name, email: approver.email, status: 'failed' });
                }
            } else {
                 results.push({ approver: approver.name, email: approver.email, status: 'queued' });
            }
        }

        // 1. Lock Budget for the PO
        await deductBudgetForPO(po.id, po.totalAmount);
        
        // 2. Transition Status
        await prisma.purchaseOrder.update({ where: { id: poId }, data: { status: 'PENDING_APPROVAL' } });

        res.json({ message: 'PO approval requests initiated.', results });
    } catch (error) {
        console.error('sendPoApprovalRequest Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/po-approvals/action/:token
 * Resolve token → return PO & approver details for the approval portal.
 */
export const getPoApprovalByToken = async (req, res) => {
    try {
        const { token } = req.params;
        const approval = await prisma.poApproval.findUnique({
            where: { token },
            include: {
                approver: true,
                po: { include: { vendor: true, pr: true, lineItems: true } }
            }
        });

        if (!approval) return res.status(404).json({ error: 'Invalid or expired approval link.' });

        if (approval.status !== 'PENDING') {
            return res.json({ alreadyResponded: true, status: approval.status, approver: approval.approver.name, poNumber: approval.po.poNumber });
        }

        res.json({
            alreadyResponded: false,
            approvalId: approval.id,
            approver: { name: approval.approver.name, email: approval.approver.email },
            po: {
                id: approval.po.id,
                poNumber: approval.po.poNumber,
                vendorName: approval.po.vendor?.name || 'Manual Vendor',
                prNumber: approval.po.pr?.prNumber || 'N/A',
                totalAmount: parseFloat(approval.po.totalAmount),
                lineItems: approval.po.lineItems,
                status: approval.po.status,
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * POST /api/po-approvals/action/:token
 * 
 * Flow:
 * 1. Record Decision
 * 2. If APPROVED -> Patch Excel with Digital Signature & Signature Name
 * 3. If REJECTED -> Reverse Budget Deduction
 * 4. Transition status & Notify vendor
 */
export const submitPoApproval = async (req, res) => {
    try {
        const { token } = req.params;
        const { decision, comments } = req.body;

        if (!['APPROVED', 'REJECTED'].includes(decision)) {
            return res.status(400).json({ error: 'Decision must be APPROVED or REJECTED.' });
        }

        const approval = await prisma.poApproval.findUnique({
            where: { token },
            include: { 
                po: { include: { vendor: true, pr: true, poApprovals: { include: { approver: true } } } },
                approver: true 
            }
        });

        if (!approval) return res.status(404).json({ error: 'Invalid or expired approval link.' });
        if (approval.status !== 'PENDING') return res.status(409).json({ error: 'Already responded.', status: approval.status });

        // ── 1. RECORD DECISION 
        await prisma.poApproval.update({
            where: { token },
            data: { status: decision, comments: comments || null, respondedAt: new Date() }
        });

        const currentPoId = approval.poId;
        const currentRole = approval.role;
        
        const updatedPo = await prisma.purchaseOrder.findUnique({
            where: { id: currentPoId },
            include: { vendor: true, pr: true, poApprovals: { include: { approver: true } } }
        });

        const allApprovals = updatedPo.poApprovals;
        const anyRejected = allApprovals.some(a => a.status === 'REJECTED');

        let nextEmailSent = false;
        let poNewStatus = 'PENDING_APPROVAL';

        if (anyRejected) {
            poNewStatus = 'CANCELLED';
        } else {
            const roleSequence = ['PREPARER', 'STAGE1', 'STAGE2', 'STAGE3'];
            const currentIndex = roleSequence.indexOf(currentRole);

            if (decision === 'APPROVED') {
                const nextRole = roleSequence[currentIndex + 1];
                let nextApproval = null;
                
                // Find next sequential pending approver
                if (nextRole) {
                    nextApproval = allApprovals.find(a => a.role === nextRole && a.status === 'PENDING');
                }

                if (nextApproval) {
                    try {
                        await sendPoApprovalEmail({
                            approverName: nextApproval.approver.name,
                            approverEmail: nextApproval.approver.email,
                            poNumber: updatedPo.poNumber,
                            vendorName: updatedPo.vendor?.name || 'Manual Vendor',
                            totalAmount: parseFloat(updatedPo.totalAmount),
                            prNumber: updatedPo.pr?.prNumber || 'N/A',
                            token: nextApproval.token
                        });
                        nextEmailSent = true;
                    } catch (err) {
                        console.error('[Sequential PO Flow] Failed to trigger email:', err.message);
                    }
                } else {
                    // Everyone approved
                    poNewStatus = 'ISSUED';
                }
            }
        }

        // ── 2. TRANSITION STATUS
        const finalPo = await prisma.purchaseOrder.update({
            where: { id: currentPoId },
            data: {
                status: poNewStatus,
                ...(poNewStatus === 'ISSUED' ? { issuedAt: new Date() } : {})
            }
        });

        // ── 3. IN-PLACE EXCEL PATCHING
        if (decision === 'APPROVED' && finalPo.excelPath) {
            const excelFile = path.resolve(__dirname, '../../uploads/output', finalPo.excelPath);
            const excelUpdates = [];

            const approverName = approval.approver.name || approval.approver.email;
            
            // Map signatures to cells based on standard template (Mock map)
            // PREPARER = B32, STAGE1 = D32, STAGE2 = F32, STAGE3 = K32
            const posMap = {
                'PREPARER': { name: 'B33', sig: 'B32:B32' },
                'STAGE1': { name: 'D33', sig: 'D32:D32' },
                'STAGE2': { name: 'F33', sig: 'F32:F32' },
                'STAGE3': { name: 'K33', sig: 'K32:K32' }
            };

            const pos = posMap[currentRole] || posMap['STAGE3'];

            excelUpdates.push({ type: 'text', cell: pos.name, value: 'APPROVED BY: ' + approverName, bold: true });

            if (approval.approver.signaturePath) {
                const sigPath = path.resolve(__dirname, '../../uploads/signatures', approval.approver.signaturePath);
                excelUpdates.push({ type: 'image', range: pos.sig, imagePath: sigPath });
            }

            try {
                await updateExcelFile(excelFile, excelUpdates);
                console.log(`[PO-Approval] Excel document ${finalPo.poNumber} patched with digital signature for ${currentRole}.`);
            } catch (excelErr) {
                console.error(`[PO-Approval] Excel patch failed for ${finalPo.poNumber}:`, excelErr.message);
            }
        }

        // ── 4. BUDGET REVERSION IF REJECTED
        if (poNewStatus === 'CANCELLED') {
            await reverseBudgetForPO(currentPoId, updatedPo.totalAmount);
            console.log(`[Budget] Reversion triggered for Rejected PO: ${updatedPo.poNumber}`);
        }

        // ── 5. FINAL NOTIFICATION TO VENDOR
        if (poNewStatus === 'ISSUED' && updatedPo.vendor?.email) {
            sendPoIssuanceEmail({
                vendorEmail: updatedPo.vendor.email,
                vendorName: updatedPo.vendor.name,
                poNumber: updatedPo.poNumber,
                prNumber: updatedPo.pr?.prNumber || 'N/A',
                totalAmount: parseFloat(updatedPo.totalAmount)
            }).catch(err => console.error('[PO Issuance Email Failed]', err.message));
        }

        res.json({ 
            message: decision === 'APPROVED' ? 
                (nextEmailSent ? 'Approval recorded. Notified next reviewer.' : 'Final approval completed. PO Issued.') : 
                'PO rejected and cancelled.', 
            decision, 
            poStatus: poNewStatus 
        });
    } catch (error) {
        console.error('submitPoApproval Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/po-approvals/po/:poId
 * Fetch all approval entries for a given PO.
 */
export const getPoApprovals = async (req, res) => {
    try {
        const { poId } = req.params;
        const approvals = await prisma.poApproval.findMany({
            where: { poId },
            include: { approver: true },
            orderBy: { createdAt: 'asc' }
        });
        res.json(approvals);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
