import prisma from '../utils/db.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { deductBudgetForPO } from '../services/budgetService.js';
import { sendPoApprovalEmail } from '../services/emailService.js';
import * as storageService from '../services/storageService.js';
import { excelToPDF } from '../services/exportExcelToPdf.js';
import { parsePO } from '../services/poParser.js';

const generatePONumber = async () => {
    const count = await prisma.purchaseOrder.count();
    return `PO-${String(count + 1).padStart(4, '0')}`;
};

export const getPOs = async (req, res) => {
    try {
        const pos = await prisma.purchaseOrder.findMany({
            include: {
                vendor: { select: { id: true, name: true, email: true } },
                rfq: { select: { rfqNumber: true } },
                pr: { select: { prNumber: true, description: true } },
                quotation: { select: { totalAmount: true } },
                lineItems: true,
                _count: { select: { grns: true, invoices: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(pos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getPOById = async (req, res) => {
    try {
        const { id } = req.params;
        const po = await prisma.purchaseOrder.findUnique({
            where: { id },
            include: {
                vendor: true,
                rfq: true,
                pr: true,
                quotation: { include: { lineItems: true } },
                lineItems: { include: { grnLineItems: true } },
                grns: { include: { lineItems: true } },
                invoices: true
            }
        });
        if (!po) return res.status(404).json({ error: 'PO not found' });
        res.json(po);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Standard PO Creation (from RFQ/Quotation context)
 */
export const createPO = async (req, res) => {
    try {
        const { rfqId, quotationId, deliveryAddress, expectedDelivery } = req.body;
        if (!rfqId || !quotationId) {
            return res.status(400).json({ error: 'rfqId and quotationId are required.' });
        }

        const quotation = await prisma.quotation.findUnique({
            where: { id: quotationId },
            include: { lineItems: true, rfq: { include: { pr: true } } }
        });
        if (!quotation) return res.status(404).json({ error: 'Quotation not found.' });

        const poNumber = await generatePONumber();
        const po = await prisma.purchaseOrder.create({
            data: {
                poNumber,
                rfqId,
                prId: quotation.rfq.prId,
                vendorId: quotation.vendorId,
                quotationId,
                totalAmount: quotation.totalAmount,
                taxAmount: quotation.taxAmount,
                deliveryAddress: deliveryAddress || null,
                expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
                lineItems: {
                    create: quotation.lineItems.map(item => ({
                        description: item.description,
                        qty: item.qty,
                        unit: item.unit || null,
                        unitPrice: item.unitPrice,
                        totalPrice: item.totalPrice,
                    }))
                }
            },
            include: { lineItems: true }
        });
        res.status(201).json(po);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * POST /api/purchase-orders/generate-excel
 */
export const generatePOExcel = async (req, res) => {
    try {
        const { generateExcelPO } = await import('../services/generatePOTemplate.js');
        let poData = req.body;
        let poId = poData.poId;
        let dbPO = null;

        const mdEmail = poData.approver_email || process.env.MD_EMAIL || 'md@procurement.com';
        const mdName = 'Managing Director / Approver';

        const poNum = poData.po_number || await generatePONumber();

        // ── 1. GENERATE EXCEL into the PO's versions/ folder ────────────────
        const poDir = storageService.getPoDir(poNum);
        const dirs = storageService.ensureEntityDirs(poDir);
        const rawExcelPath = await generateExcelPO(poData, dirs.versions);
        // Rename to canonical convention
        const poVersion = storageService.nextVersion(poDir);
        const excelCanonical = storageService.buildFileName(poNum, 'purchase-order', poVersion, '.xlsx');
        const excelFinalPath = path.join(dirs.versions, excelCanonical);
        if (rawExcelPath !== excelFinalPath) fs.renameSync(rawExcelPath, excelFinalPath);
        const excelRelPath = path.relative(storageService.UPLOADS_ROOT, excelFinalPath);

        // ── 1a. CONVERT TO PDF → preview_main.pdf in preview/ folder ────────
        let templatePdfRelPath = null;
        try {
            const rawPdfPath = await excelToPDF(excelFinalPath, dirs.preview);
            const previewDest = path.join(dirs.preview, 'preview_main.pdf');
            if (rawPdfPath !== previewDest) fs.renameSync(rawPdfPath, previewDest);
            templatePdfRelPath = path.relative(storageService.UPLOADS_ROOT, previewDest);
        } catch (pdfErr) {
            console.warn('[PO Generator] PDF preview generation failed (non-fatal):', pdfErr.message);
        }

        // ── 2. PERSIST OR UPDATE IN DATABASE ─────────────────────────────────
        if (!poId) {
            let pr = null;
            if (poData.pr_number) {
                pr = await prisma.pr.findFirst({ where: { prNumber: poData.pr_number } });
            }

            let vendor = null;
            if (poData.vendor_id) {
                vendor = await prisma.vendor.findUnique({ where: { id: poData.vendor_id } });
            } else if (poData.vendor_details) {
                vendor = await prisma.vendor.findFirst({ where: { name: poData.vendor_details.split('\n')[0] } });
            }
            if (!vendor && poData.vendor_details) {
                const vendorName = poData.vendor_details.split('\n')[0].substring(0, 50).trim() || 'UNKNOWN VENDOR';
                const ts = Date.now();
                vendor = await prisma.vendor.create({
                    data: {
                        name: vendorName,
                        code: `VND-AUTO-${ts}`,
                        email: `auto-${ts}@example.com`,
                        address: poData.vendor_details,
                    }
                });
            } else if (!vendor) {
                return res.status(400).json({ error: 'No active vendor found in the system registry. Please add a vendor before creating a PO.' });
            }

            const poNum = poData.po_number || await generatePONumber();

            dbPO = await prisma.purchaseOrder.create({
                data: {
                    poNumber: poNum,
                    status: 'DRAFT',
                    totalAmount: Number(poData.total_amount),
                    taxAmount: Number(poData.tax || 0),
                    prId: pr ? pr.id : null,
                    vendorId: vendor.id,
                    rfqId: null,      // Optional linkage
                    quotationId: null,
                    excelPath: excelRelPath,
                    templatePdfPath: templatePdfRelPath,
                    lineItems: {
                        create: (poData.po_items || []).map(item => ({
                            description: item.description,
                            qty: item.quantity,
                            unit: item.unit,
                            unitPrice: item.rate,
                            totalPrice: item.quantity * item.rate
                        }))
                    }
                }
            });
            poId = dbPO.id;
        } else if (poId) {
            dbPO = await prisma.purchaseOrder.update({
                where: { id: poId },
                data: { excelPath: excelRelPath, templatePdfPath: templatePdfRelPath, status: 'DRAFT' }
            });
        }

        if (poId && !dbPO) {
            dbPO = await prisma.purchaseOrder.findUnique({
                where: { id: poId },
                include: { vendor: true, pr: { include: { department: true } }, lineItems: true }
            });
        }

        // Return JSON so frontend can proceed to "Select Approvers" step
        res.status(200).json({
            message: 'PO Excel successfully generated and saved.',
            poId,
            poNumber: dbPO.poNumber,
            excelPath: excelRelPath,
            templatePdfPath: templatePdfRelPath,
            blobUrl: templatePdfRelPath
                ? `/api/uploads/${templatePdfRelPath}`
                : `/api/uploads/${excelRelPath}`
        });
    } catch (error) {
        console.error('[PO Generator] Error:', error);

        if (error.code === 'P2002') {
            return res.status(409).json({ error: `A Draft or Active PO with number "${poData.po_number || poData.poId}" already exists. Please choose a unique PO Number.` });
        }

        res.status(500).json({ error: error.message });
    }
};

export const issuePO = async (req, res) => {
    try {
        const { id } = req.params;
        const po = await prisma.purchaseOrder.update({
            where: { id },
            data: { status: 'ISSUED', issuedAt: new Date() }
        });
        res.json(po);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const acknowledgePO = async (req, res) => {
    try {
        const { id } = req.params;
        const po = await prisma.purchaseOrder.update({
            where: { id },
            data: { status: 'ACKNOWLEDGED' }
        });
        res.json(po);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const cancelPO = async (req, res) => {
    try {
        const { id } = req.params;
        const { cancelReason } = req.body;
        if (!cancelReason?.trim()) {
            return res.status(400).json({ error: 'A cancel reason is required.' });
        }
        const po = await prisma.purchaseOrder.update({
            where: { id },
            data: { status: 'CANCELLED', cancelReason: cancelReason.trim() }
        });
        res.json(po);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * POST /api/purchase-orders/parse
 * Accepts an Excel file and returns parsed PO data.
 */
export const parsePOFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const data = parsePO(req.file.path);

        // Optional: Clean up temp file after parsing
        try {
            fs.unlinkSync(req.file.path);
        } catch (unlinkErr) {
            console.warn('[PO Parser] Could not delete temp file:', unlinkErr.message);
        }

        res.json(data);
    } catch (error) {
        console.error('[PO Parser] Extraction Failed:', error);
        res.status(500).json({ error: error.message });
    }
};
