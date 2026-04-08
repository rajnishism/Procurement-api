import prisma from '../utils/db.js';
import path from 'path';
import fs from 'fs';
import { sendVendorQuoteAcknowledgement } from '../services/emailService.js';
import * as storageService from '../services/storageService.js';

// GET /api/quotations/respond/:token — vendor portal page data
export const getQuotationByToken = async (req, res) => {
    try {
        const { token } = req.params;
        const rfqVendor = await prisma.rFQVendor.findUnique({
            where: { token },
            include: {
                vendor: true,
                rfq: { include: { pr: { select: { prNumber: true, lineItems: true, description: true } } } },
                quotation: true
            }
        });

        if (!rfqVendor) {
            return res.status(404).json({ error: 'Invalid or expired quotation link.' });
        }

        if (rfqVendor.rfq.status === 'CANCELLED') {
            return res.json({ rfqCancelled: true, rfqNumber: rfqVendor.rfq.rfqNumber });
        }

        if (rfqVendor.quotation) {
            return res.json({
                alreadySubmitted: true,
                rfqNumber: rfqVendor.rfq.rfqNumber,
                vendorName: rfqVendor.vendor.name,
                submittedAt: rfqVendor.quotation.submittedAt,
                attachments: rfqVendor.quotation.attachments || []
            });
        }

        if (rfqVendor.rfq.status === 'CLOSED') {
            return res.json({
                rfqClosed: true,
                rfqNumber: rfqVendor.rfq.rfqNumber,
                vendorName: rfqVendor.vendor.name
            });
        }

        res.json({
            rfqVendorId: rfqVendor.id,
            vendor: { name: rfqVendor.vendor.name, email: rfqVendor.vendor.email },
            rfq: {
                id: rfqVendor.rfq.id,
                rfqNumber: rfqVendor.rfq.rfqNumber,
                title: rfqVendor.rfq.title,
                description: rfqVendor.rfq.description,
                deadline: rfqVendor.rfq.deadline,
                prNumber: rfqVendor.rfq.pr.prNumber,
                prDescription: rfqVendor.rfq.pr.description,
                lineItems: rfqVendor.rfq.pr.lineItems || [],
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// POST /api/quotations/respond/:token — vendor submits quotation (multipart/form-data)
// req.files comes from multer: Array of file objects
export const submitQuotation = async (req, res) => {
    try {
        const { token } = req.params;

        // req.body fields come as strings from multipart/form-data
        const { totalAmount, taxAmount, deliveryDays, validityDays, notes, lineItems: lineItemsRaw } = req.body;

        if (!totalAmount) {
            return res.status(400).json({ error: 'Total amount is required.' });
        }

        // Parse lineItems — arrives as a JSON string from FormData, or may be absent (lump-sum quote)
        let lineItems = [];
        try {
            if (lineItemsRaw) {
                lineItems = typeof lineItemsRaw === 'string' ? JSON.parse(lineItemsRaw) : lineItemsRaw;
            }
        } catch {
            return res.status(400).json({ error: 'Invalid lineItems format.' });
        }

        // Filter out completely blank rows (description empty AND unitPrice zero/missing)
        const validLineItems = lineItems.filter(item =>
            (String(item.description || '').trim() !== '') ||
            (parseFloat(item.unitPrice) > 0)
        );

        const rfqVendor = await prisma.rFQVendor.findUnique({
            where: { token },
            include: { rfq: { include: { pr: true } }, quotation: true }
        });

        if (!rfqVendor) return res.status(404).json({ error: 'Invalid link.' });
        if (rfqVendor.quotation) return res.status(409).json({ error: 'Quotation already submitted.' });
        if (['CLOSED', 'CANCELLED'].includes(rfqVendor.rfq.status)) {
            return res.status(400).json({ error: 'This RFQ is no longer accepting quotations.' });
        }

        const prNumber = rfqVendor.rfq.pr.prNumber;
        const prDir = storageService.getPrDir(prNumber);
        const sanitizedPr = prNumber.replace(/\//g, '-');

        // Build attachments metadata from multer files and MOVE them
        const attachments = (req.files || []).map(f => {
            const oldPath = f.path;
            const newPath = path.join(prDir, f.filename);
            
            if (fs.existsSync(oldPath)) {
                fs.renameSync(oldPath, newPath);
            }

            return {
                filename: f.filename,           // stored disk name
                originalName: f.originalname,   // as uploaded by vendor
                mimetype: f.mimetype,
                size: f.size,                   // bytes
                path: `uploads/prs/${sanitizedPr}/${f.filename}`, // updated relative path
            };
        });

        const quotation = await prisma.$transaction(async (tx) => {
            const q = await tx.quotation.create({
                data: {
                    rfqVendorId: rfqVendor.id,
                    rfqId: rfqVendor.rfqId,
                    vendorId: rfqVendor.vendorId,
                    totalAmount: parseFloat(totalAmount),
                    taxAmount: parseFloat(taxAmount || 0),
                    deliveryDays: deliveryDays ? parseInt(deliveryDays) : null,
                    validityDays: validityDays ? parseInt(validityDays) : null,
                    notes,
                    attachments,  // stored as JSONB
                    lineItems: validLineItems.length > 0 ? {
                        create: validLineItems.map(item => ({
                            description: String(item.description || '').trim() || 'Item',
                            qty: parseFloat(item.qty) || 1,
                            unit: item.unit || null,
                            unitPrice: parseFloat(item.unitPrice) || 0,
                            totalPrice: (parseFloat(item.qty) || 1) * (parseFloat(item.unitPrice) || 0),
                        }))
                    } : undefined,
                },
                include: { lineItems: true }
            });
            await tx.rFQVendor.update({
                where: { id: rfqVendor.id },
                data: { status: 'RESPONDED' }
            });
            return q;
        });

        // Send acknowledgement email to vendor (fire-and-forget)
        const fullRfqVendor = await prisma.rFQVendor.findUnique({
            where: { id: rfqVendor.id },
            include: { vendor: true, rfq: true }
        });
        if (fullRfqVendor) {
            sendVendorQuoteAcknowledgement({
                vendorEmail: fullRfqVendor.vendor.email,
                vendorName: fullRfqVendor.vendor.name,
                rfqNumber: fullRfqVendor.rfq.rfqNumber,
                rfqTitle: fullRfqVendor.rfq.title
            }).catch(err => console.error('[Quote Ack Email]', err.message));
        }

        res.status(201).json({ ...quotation, attachments });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET /api/quotations/pr/:prId
export const getQuotationsByPr = async (req, res) => {
    try {
        const { prId } = req.params;
        const quotes = await prisma.quotation.findMany({
            where: { rfq: { prId } },
            include: {
                vendor: { select: { name: true, email: true } },
                lineItems: true,
                rfq: { select: { rfqNumber: true } }
            },
            orderBy: { submittedAt: 'desc' }
        });
        res.json(quotes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
