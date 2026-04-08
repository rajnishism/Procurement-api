import prisma from '../utils/db.js';

const generateGRNNumber = async () => {
    const count = await prisma.gRN.count();
    return `GRN-${String(count + 1).padStart(4, '0')}`;
};

export const getGRNs = async (req, res) => {
    try {
        const grns = await prisma.gRN.findMany({
            include: {
                po: { select: { poNumber: true, vendor: { select: { name: true } } } },
                lineItems: true,
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(grns);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getGRNById = async (req, res) => {
    try {
        const { id } = req.params;
        const grn = await prisma.gRN.findUnique({
            where: { id },
            include: { po: { include: { lineItems: true, vendor: true } }, lineItems: { include: { poLineItem: true } } }
        });
        if (!grn) return res.status(404).json({ error: 'GRN not found' });
        res.json(grn);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getGRNsByPO = async (req, res) => {
    try {
        const { poId } = req.params;
        const grns = await prisma.gRN.findMany({
            where: { poId },
            include: { lineItems: { include: { poLineItem: true } } }
        });
        res.json(grns);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createGRN = async (req, res) => {
    try {
        const { poId, receivedBy, remarks, lineItems } = req.body;
        if (!poId || !lineItems?.length) {
            return res.status(400).json({ error: 'poId and lineItems are required.' });
        }

        const po = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
        if (!po) return res.status(404).json({ error: 'PO not found.' });

        // Determine if fully or partially received
        const allComplete = lineItems.every(item => parseFloat(item.receivedQty) >= parseFloat(item.orderedQty));
        const grnStatus = allComplete ? 'COMPLETE' : 'PARTIAL';

        const grnNumber = await generateGRNNumber();
        const grn = await prisma.$transaction(async (tx) => {
            const g = await tx.gRN.create({
                data: {
                    grnNumber,
                    poId,
                    receivedBy: receivedBy || null,
                    remarks: remarks || null,
                    status: grnStatus,
                    lineItems: {
                        create: lineItems.map(item => ({
                            poLineItemId: item.poLineItemId,
                            description: item.description,
                            orderedQty: parseFloat(item.orderedQty),
                            receivedQty: parseFloat(item.receivedQty),
                            rejectedQty: parseFloat(item.rejectedQty || 0),
                            remarks: item.remarks || null,
                        }))
                    }
                },
                include: { lineItems: true }
            });

            // Update PO status
            const poStatus = allComplete ? 'DELIVERED' : 'PARTIALLY_DELIVERED';
            await tx.purchaseOrder.update({ where: { id: poId }, data: { status: poStatus } });
            return g;
        });

        res.status(201).json(grn);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
