import prisma from '../utils/db.js';
import { parsePrPdf } from '../services/pdfService.js';
import { calculateAllocation } from '../services/allocationService.js';
import { sendCancellationEmail } from '../services/emailService.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { generateExcelPR, updateExcelFile } from '../services/generateTemplate.js';
import { sendAiPrGeneratedNotification, sendApprovalEmail, sendIndentorConfirmationEmail } from '../services/emailService.js';
import { ensureDepartmentExists, ensureWbsExists } from '../utils/wbsSync.js';
import { wbsConfig } from '../config/wbsCodes.js';
import * as storageService from '../services/storageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadPr = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileName = req.file.originalname;
        console.log(`--- Parsing Filename: ${fileName} ---`);

        // Pattern: MMCL-DEPT-HEAD-PR-NUMBER.pdf
        const fileParts = fileName.split('-');
        let filenameMetadata = {};

        if (fileParts.length >= 5) {
            filenameMetadata = {
                deptCode: fileParts[1],
                headCode: fileParts[2],
                prSuffix: fileParts[4].split('.')[0],
                wbsCode: "M-1017-M-" + fileParts[1] + "-" + fileParts[2]
            };
            console.log("Filename Metadata Extracted:", filenameMetadata);
            console.log("WBS Code Generated:", "M-1017-M-" + filenameMetadata.deptCode + "-" + filenameMetadata.headCode);
        }

        const parsedData = await parsePrPdf(req.file.path);

        // Merge and Resolve Department from config / DB
        if (filenameMetadata.deptCode) {
            const configDept = wbsConfig.find(d => d.department.substring(0, 3).toUpperCase() === filenameMetadata.deptCode);
            if (configDept) {
                parsedData.departmentId = await ensureDepartmentExists(configDept.department);
                parsedData.department = configDept.department;
                console.log(`Department resolved from filename code using Config: ${configDept.department}`);
            }
        } else if (parsedData.department) {
            parsedData.departmentId = await ensureDepartmentExists(parsedData.department);
        }

        // Cross-verify or Supplement WBS from filename
        if (filenameMetadata.headCode && !parsedData.wbsCode) {
            parsedData.wbsCode = filenameMetadata.wbsCode;
        }

        // --- NEW: Enforce Config-Driven Dept from WBS ---
        if (parsedData.wbsCode) {
            console.log(`[Upload PR] Resolving Dept from WBS: ${parsedData.wbsCode}`);
            const syncResult = await ensureWbsExists(parsedData.wbsCode);
            if (syncResult) {
                parsedData.departmentId = syncResult.departmentId;
                console.log(`[Upload PR] Overrode Dept from WBS Config: ${syncResult.departmentId}`);
            }
        }

        // Generate Indent Number from Filename Pattern
        if (filenameMetadata.deptCode && filenameMetadata.headCode && filenameMetadata.prSuffix) {
            const generatedIndentNo = `MMC/${filenameMetadata.deptCode}/${filenameMetadata.headCode}/PR-${filenameMetadata.prSuffix}`;
            parsedData.indentNo = generatedIndentNo;
            console.log(`Auto-generated Indent Number: ${generatedIndentNo}`);
        }

        // Always store the pdf filename for later retrieval
        parsedData.pdfPath = path.basename(req.file.path);

        const allocationSuggestion = await calculateAllocation(parsedData);

        res.json({
            parsed: parsedData,
            allocationSuggestion
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getPrById = async (req, res) => {
    try {
        const { id } = req.params;
        const pr = await prisma.pr.findUnique({
            where: { id, deletedAt: null },
            include: {
                department: true,
                allocations: {
                    include: { budgetHead: true, subClassification: true }
                },
                approvals: {
                    include: { approver: true },
                    orderBy: { createdAt: 'asc' }
                },
                techSpec: true,
                rfqs: {
                    include: {
                        rfqVendors: {
                            include: {
                                vendor: true,
                                quotation: true
                            }
                        }
                    }
                }
            }
        });
        if (!pr) return res.status(404).json({ error: 'PR not found' });
        res.json(pr);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createPr = async (req, res) => {
    try {
        const { prNumber, date, month, year, description, departmentId, totalValue, wbsCode, allocations, indentor, approver, verifiedBy, pdfPath, lineItems } = req.body;

        console.log("--- CREATING PR ---");
        console.log("Payload Sample:", { prNumber, date, departmentId, wbsCode });

        // Validate Date
        const prDate = new Date(date);
        if (isNaN(prDate.getTime())) {
            console.error(`Invalid Date received: "${date}"`);
            return res.status(400).json({ error: `Invalid date format: "${date}"` });
        }

        const result = await prisma.$transaction(async (tx) => {
            // 1. Create the PR
            console.log("Step 1: Creating PR record...");
            const pr = await tx.pr.create({
                data: {
                    prNumber,
                    prDate,
                    month,
                    year,
                    description,
                    departmentId,
                    totalValue,
                    wbsCode,
                    indentor: indentor || null,
                    approver: approver || null,
                    verifiedBy: verifiedBy || null,
                    pdfPath: pdfPath || null,
                    lineItems: lineItems || [],
                    createdById: req.user?.id || null,
                    allocations: {
                        create: allocations.map(a => ({
                            budgetHeadId: a.budgetHeadId,
                            subClassificationId: a.subClassificationId || null,
                            amount: a.amount,
                            isManualOverride: a.isManualOverride || false
                        }))
                    }
                },
                include: { allocations: true }
            });

            // 2. Update Monthly Budgets
            console.log("Step 2: Updating Monthly Budgets...");
            for (const alloc of pr.allocations) {
                const budget = await tx.monthlyBudget.findFirst({
                    where: {
                        budgetHeadId: alloc.budgetHeadId,
                        subClassificationId: alloc.subClassificationId || null,
                        month,
                        year
                    }
                });

                if (budget) {
                    await tx.monthlyBudget.update({
                        where: { id: budget.id },
                        data: {
                            allocated: { increment: alloc.amount },
                            remaining: { decrement: alloc.amount }
                        }
                    });
                } else {
                    console.log(`Creating missing monthly budget for Head: ${alloc.budgetHeadId}, ${month}/${year}`);
                    await tx.monthlyBudget.create({
                        data: {
                            budgetHeadId: alloc.budgetHeadId,
                            subClassificationId: alloc.subClassificationId || null,
                            month,
                            year,
                            amount: 0,
                            allocated: alloc.amount,
                            remaining: -alloc.amount
                        }
                    });
                }
            }
            return pr;
        });

        console.log("PR Created Successfully:", result.prNumber);
        res.json(result);
    } catch (error) {
        console.error('Create PR Error TRACE:', error);

        // Prisma unique constraint violation → prNumber already exists
        if (error.code === 'P2002' && error.meta?.target?.includes('prNumber')) {
            return res.status(409).json({
                error: `A PR with number "${req.body.prNumber}" already exists in the system. Please check the PR Tracking page.`
            });
        }

        res.status(500).json({
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });

    }
};



export const saveAiPr = async (req, res) => {
    try {
        const prData = req.body;
        if (!prData) return res.status(400).json({ error: 'No PR data received.' });

        console.log(`[Save AI PR] Initiating persistence for Indent: ${prData.indentNo}`);
        
        const prNumber = prData.indentNo || `AI-PR-${Date.now()}`;
        const prDir = storageService.getPrDir(prNumber);
        storageService.ensureDir(prDir);

        // 1. Generate the Excel PR template internally in the PR folder
        console.log("[Save AI PR] Step 1: Generating background Excel template...");
        const fullExcelPath = await generateExcelPR(prData, [], prDir);
        const excelFilename = path.basename(fullExcelPath);
        console.log(`[Save AI PR] Excel generated: ${excelFilename} at ${fullExcelPath}`);

        // 1a. Move the source quotation to the PR folder
        let finalPdfPath = prData.pdfPath;
        if (prData.pdfPath) {
            const tempQuotePath = path.join(__dirname, '../../uploads/temp', prData.pdfPath);
            if (fs.existsSync(tempQuotePath)) {
                const movedPath = storageService.moveToEntityFolder(tempQuotePath, 'PR', prNumber, prData.pdfPath);
                if (movedPath) {
                    finalPdfPath = path.basename(movedPath); // We store just filename if we know it's in the PR folder
                    console.log(`[Save AI PR] Source quote moved to PR folder: ${finalPdfPath}`);
                }
            } else {
                console.warn(`[Save AI PR] Temp quote not found at: ${tempQuotePath}`);
            }
        }

        // 2. Resolve Department ID from config / DB
        console.log("[Save AI PR] Step 2: Resolving department link...");
        let departmentId = null;
        if (prData.department) {
            departmentId = await ensureDepartmentExists(prData.department);
            console.log(`[Save AI PR] Resolved Dept ID from Config/Sync: ${departmentId}`);
        } else {
            console.log("[Save AI PR] No department in payload. Falling back to Mining.");
            departmentId = await ensureDepartmentExists('Mining'); 
        }

        // 2a. Sync WBS and derive Department from Config
        const finalWbs = prData.items?.[0]?.wbs || prData.wbs || null;
        if (finalWbs) {
            console.log(`[Save AI PR] Enforcing WBS from Config: ${finalWbs}`);
            const syncResult = await ensureWbsExists(finalWbs);
            if (syncResult) {
                departmentId = syncResult.departmentId;
                console.log(`[Save AI PR] Overrode Dept from WBS Config: ${departmentId}`);
            }
        }

        const prDate = prData.date ? new Date(prData.date) : new Date();
        
        // prNumber is already declared and assigned above from prData.indentNo or generated AI-PR-timestamp
        
        // 3. Check for duplicates
        console.log("[Save AI PR] Step 3: Checking for existing Indent Number...");
        const existingPr = await prisma.pr.findUnique({
            where: { prNumber }
        });
        if (existingPr) {
            console.error(`[Save AI PR] Duplicate detected: ${prNumber}`);
            return res.status(409).json({ error: `A PR with Indent No "${prNumber}" already exists in the system.` });
        }

        console.log("[Save AI PR] Step 4: Creating database record...");
        const newPr = await prisma.pr.create({
            data: {
                prNumber,
                prDate: prDate,
                month: prDate.getMonth() + 1,
                year: prDate.getFullYear(),
                description: prData.main_item?.description || 'AI Extracted Quotation',
                departmentId: departmentId,
                totalValue: prData.grand_total || 0,
                wbsCode: prData.items?.[0]?.wbs || prData.wbs || null,
                area: prData.items?.[0]?.area || prData.area || null,
                status: 'PENDING',
                pdfPath: finalPdfPath,   // Original Quotation (now in uploads/prs/{prNumber})
                excelPath: excelFilename,  // Generated Excel (now in uploads/prs/{prNumber})
                lineItems: prData.items || [],
                createdById: req.user?.id || null,
            }
        });
        console.log(`[Save AI PR] PR Record Created with ID: ${newPr.id}`);

        // 5. Handle Sequential Multi-Role Approval Workflow
        const workflowRoles = [
            { email: prData.indentorEmail, role: 'INDENTOR' },
            { email: prData.approverS1, role: 'STAGE1' }, // PR Approver
            { email: prData.verifierS2, role: 'STAGE2' }, // Verifier
            { email: prData.finalApproverS3, role: 'STAGE3' } // Final Approver
        ];

        console.log(`[Save AI PR] Step 5: Initiating sequential workflow...`);

        for (let i = 0; i < workflowRoles.length; i++) {
            const config = workflowRoles[i];
            if (!config.email) continue;

            // Find or Register Person
            const person = await prisma.approver.upsert({
                where: { email: config.email.toLowerCase() },
                update: {}, 
                create: {
                    email: config.email.toLowerCase(),
                    name: config.email.split('@')[0], 
                    departmentId: departmentId
                }
            });

            const token = uuidv4();
            
            // Create Approval Record (All are created, but only first/indentor get emails now)
            await prisma.prApproval.create({
                data: {
                    prId: newPr.id,
                    approverId: person.id,
                    role: config.role,
                    token,
                    status: 'PENDING'
                }
            });

            // Prepare Attachments for approval mails
            const attachments = [];
            const excelFile = path.join(prDir, excelFilename);
            if (fs.existsSync(excelFile)) {
                attachments.push({ filename: `PR-Draft-${newPr.prNumber}.xlsx`, path: excelFile });
            }
            if (newPr.pdfPath) {
                const quoteFile = path.join(prDir, newPr.pdfPath);
                if (fs.existsSync(quoteFile)) {
                    attachments.push({ filename: `Original-Quote-${newPr.prNumber}${path.extname(newPr.pdfPath)}`, path: quoteFile });
                }
            }

            // Logic: 
            // - If INDENTOR: Send Verification Request immediately.
            // - Others: No email until triggered by previous stage.
            
            if (config.role === 'INDENTOR') {
                sendIndentorConfirmationEmail({
                    indentorName: person.name,
                    indentorEmail: person.email,
                    prNumber: newPr.prNumber,
                    department: prData.department || 'General',
                    totalValue: Number(newPr.totalValue),
                    description: newPr.description,
                    token,
                    attachments
                }).catch(err => console.error(`[Email] Indentor verification failed:`, err.message));
            } else if (config.role === 'STAGE1') {
                // We no longer send Stage 1 email immediately. 
                // It will be sent when INDENTOR clicks "Confirm".
                console.log(`[Save AI PR] Deferring Stage 1 email until Indentor confirmation.`);
            }
        }

        // 5. Send generic notification alert to rajnishism24@gmail.com
        sendAiPrGeneratedNotification({
            prNumber: newPr.prNumber,
            department: prData.department,
            totalValue: newPr.totalValue,
            mainItemDescription: newPr.description,
            pdfPath: newPr.pdfPath
        })
        .then(() => console.log(`[Admin Notification] AI PR Notification sent.`))
        .catch(err => console.error('[Admin Notification] FAILED:', err.message));

        console.log(`[Save AI PR] Workflow Complete. PR: ${newPr.prNumber}`);
        res.status(201).json(newPr);
    } catch (error) {
        console.error('[Save AI PR] Critical Trace:', error);
        
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'This Indent Number has just been taken by another user. Please choose a unique Indent No.' });
        }

        res.status(500).json({ error: error.message });
    }
};

export const deletePr = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason || !reason.trim()) {
            return res.status(400).json({ error: 'A reason is required to delete a PR.' });
        }

        let prSnapshot;

        await prisma.$transaction(async (tx) => {
            const pr = await tx.pr.findUnique({
                where: { id, deletedAt: null },
                include: {
                    allocations: true,
                    department: true,
                    approvals: { include: { approver: true } }
                }
            });

            if (!pr) throw new Error('PR not found');
            prSnapshot = pr;

            // 1. Revert Budget Allocations
            for (const alloc of pr.allocations) {
                const budget = await tx.monthlyBudget.findFirst({
                    where: {
                        budgetHeadId: alloc.budgetHeadId,
                        subClassificationId: alloc.subClassificationId || null,
                        month: pr.month,
                        year: pr.year
                    }
                });

                if (budget) {
                    await tx.monthlyBudget.update({
                        where: { id: budget.id },
                        data: {
                            allocated: { decrement: alloc.amount },
                            remaining: { increment: alloc.amount }
                        }
                    });
                }
            }

            // 2. Soft-delete the PR with reason
            await tx.pr.update({
                where: { id },
                data: { deletedAt: new Date(), deletionReason: reason.trim() }
            });
        });

        // 3. Send cancellation emails (fire-and-forget — doesn't block response)
        const approversToNotify = prSnapshot?.approvals.map(a => a.approver) || [];
        if (approversToNotify.length > 0) {
            Promise.all(
                approversToNotify.map(approver =>
                    sendCancellationEmail({
                        approverName: approver.name,
                        approverEmail: approver.email,
                        prNumber: prSnapshot.prNumber,
                        department: prSnapshot.department?.name || 'N/A',
                        totalValue: parseFloat(prSnapshot.totalValue),
                        description: prSnapshot.description,
                        reason: reason.trim(),
                    }).catch(err =>
                        console.error(`[Email] Cancellation failed for ${approver.email}:`, err.message)
                    )
                )
            );
        }

        res.json({ message: 'PR deleted successfully' });
    } catch (error) {
        console.error('Delete PR Error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const updatePr = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        console.log(`[Update PR] Updating ID: ${id}`, updateData);

        const updatedPr = await prisma.pr.update({
            where: { id },
            data: updateData
        });

        res.json(updatedPr);
    } catch (error) {
        console.error('[Update PR] Error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getPrs = async (req, res) => {
    try {
        const { status } = req.query; // optional filter, e.g. ?status=APPROVED
        const where = { deletedAt: null };
        if (status) where.status = status;

        const prs = await prisma.pr.findMany({
            where,
            include: {
                department: true,
                allocations: {
                    include: {
                        budgetHead: true,
                        subClassification: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(prs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
export const updatePrExcel = async (req, res) => {
    try {
        const { id } = req.params;
        const { updates } = req.body; // Array of { type, cell, value, range, imagePath }

        const pr = await prisma.pr.findUnique({ where: { id } });
        if (!pr || !pr.excelPath) return res.status(404).json({ error: 'PR or Excel file not found' });

        const prDir = storageService.getPrDir(pr.prNumber);
        const fullPath = path.join(prDir, pr.excelPath);
        await updateExcelFile(fullPath, updates);

        res.json({ message: 'Excel updated successfully' });
    } catch (error) {
        console.error('[Update Excel] Error:', error);
        res.status(500).json({ error: error.message });
    }
};
