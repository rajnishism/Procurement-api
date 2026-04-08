import prisma from '../utils/db.js';
import { v4 as uuidv4 } from 'uuid';
import { sendRFQEmail } from '../services/emailService.js';

// Auto-generate RFQ number
const generateRFQNumber = async () => {
    const count = await prisma.rFQ.count();
    return `RFQ-${String(count + 1).padStart(4, '0')}`;
};

export const getRFQs = async (req, res) => {
    try {
        const rfqs = await prisma.rFQ.findMany({
            include: {
                pr: { select: { prNumber: true, description: true, totalValue: true } },
                rfqVendors: { include: { vendor: true, quotation: true } },
                _count: { select: { quotations: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(rfqs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getRFQById = async (req, res) => {
    try {
        const { id } = req.params;
        const rfq = await prisma.rFQ.findUnique({
            where: { id },
            include: {
                pr: true,
                rfqVendors: {
                    include: {
                        vendor: true,
                        quotation: { include: { lineItems: true } }
                    }
                },
                quotations: {
                    include: { vendor: true, lineItems: true }
                }
            }
        });
        if (!rfq) return res.status(404).json({ error: 'RFQ not found' });
        res.json(rfq);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createRFQ = async (req, res) => {
    try {
        const { prId, title, description, deadline } = req.body;
        if (!prId || !title || !deadline) {
            return res.status(400).json({ error: 'prId, title, and deadline are required.' });
        }
        const pr = await prisma.pr.findUnique({ where: { id: prId, deletedAt: null } });
        if (!pr) return res.status(404).json({ error: 'PR not found.' });
        if (pr.status !== 'APPROVED') return res.status(400).json({ error: 'Only approved PRs can have an RFQ.' });

        const rfqNumber = await generateRFQNumber();
        const rfq = await prisma.rFQ.create({
            data: { rfqNumber, prId, title, description, deadline: new Date(deadline) }
        });
        res.status(201).json(rfq);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const sendRFQ = async (req, res) => {
    try {
        const { id } = req.params;
        const { vendorIds } = req.body;

        if (!vendorIds?.length) {
            return res.status(400).json({ error: 'Select at least one vendor.' });
        }

        const rfq = await prisma.rFQ.findUnique({
            where: { id },
            include: { pr: true }
        });
        if (!rfq) return res.status(404).json({ error: 'RFQ not found' });
        if (rfq.status === 'CLOSED' || rfq.status === 'CANCELLED') {
            return res.status(400).json({ error: 'Cannot send a closed or cancelled RFQ.' });
        }

        const vendors = await prisma.vendor.findMany({
            where: { id: { in: vendorIds }, isActive: true }
        });

        // Create RFQVendor records (skip if already exists for this RFQ)
        const entries = [];
        for (const vendor of vendors) {
            const existing = await prisma.rFQVendor.findUnique({
                where: { rfqId_vendorId: { rfqId: id, vendorId: vendor.id } }
            });
            if (!existing) {
                const entry = await prisma.rFQVendor.create({
                    data: { rfqId: id, vendorId: vendor.id, token: uuidv4(), sentAt: new Date() }
                });
                entries.push({ entry, vendor });
            }
        }

        // Update RFQ status → SENT
        await prisma.rFQ.update({ where: { id }, data: { status: 'SENT' } });

        // Send emails (fire-and-forget)
        const appUrl = process.env.APP_URL || 'http://localhost:5173';
        Promise.all(
            entries.map(({ entry, vendor }) =>
                sendRFQEmail({
                    vendorName: vendor.name,
                    vendorEmail: vendor.email,
                    rfqNumber: rfq.rfqNumber,
                    rfqTitle: rfq.title,
                    rfqDescription: rfq.description,
                    deadline: rfq.deadline,
                    prNumber: rfq.pr.prNumber,
                    token: entry.token,
                    portalUrl: `${appUrl}/rfq/respond?token=${entry.token}`,
                }).catch(err => console.error(`[Email] RFQ send failed for ${vendor.email}:`, err.message))
            )
        );

        res.json({ message: `RFQ sent to ${entries.length} vendor(s).`, newVendors: entries.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const closeRFQ = async (req, res) => {
    try {
        const { id } = req.params;
        const rfq = await prisma.rFQ.update({
            where: { id },
            data: { status: 'CLOSED' }
        });
        res.json(rfq);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getQuotationComparison = async (req, res) => {
    try {
        const { id } = req.params;
        const rfq = await prisma.rFQ.findUnique({
            where: { id },
            include: {
                pr: { select: { prNumber: true, lineItems: true, totalValue: true } },
                quotations: {
                    include: {
                        vendor: { select: { id: true, name: true, email: true } },
                        lineItems: true
                    },
                    where: { status: { not: 'REJECTED' } }
                }
            }
        });
        if (!rfq) return res.status(404).json({ error: 'RFQ not found' });
        res.json(rfq);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const selectVendor = async (req, res) => {
    try {
        const { id } = req.params; // rfqId
        const { quotationId } = req.body;

        // Mark selected quotation, reject others
        const quotation = await prisma.quotation.findUnique({ where: { id: quotationId } });
        if (!quotation || quotation.rfqId !== id) {
            return res.status(400).json({ error: 'Invalid quotation for this RFQ.' });
        }

        await prisma.$transaction([
            prisma.quotation.update({ where: { id: quotationId }, data: { status: 'SELECTED' } }),
            prisma.quotation.updateMany({
                where: { rfqId: id, id: { not: quotationId } },
                data: { status: 'REJECTED' }
            }),
        prisma.rFQ.update({ where: { id }, data: { status: 'VENDOR_SELECTED' } }),
        ]);

        const updatedQuotation = await prisma.quotation.findUnique({
            where: { id: quotationId },
            include: { vendor: true, lineItems: true }
        });
        res.json(updatedQuotation);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
