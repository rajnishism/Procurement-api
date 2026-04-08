import prisma from '../utils/db.js';

export const getPayments = async (req, res) => {
    try {
        const payments = await prisma.payment.findMany({
            include: {
                invoice: {
                    select: {
                        invoiceNumber: true,
                        po: { select: { poNumber: true, vendor: { select: { name: true } } } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(payments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createPayment = async (req, res) => {
    try {
        const { invoiceId, amount, paymentDate, paymentMode, referenceNumber, remarks } = req.body;
        if (!invoiceId || !amount || !paymentDate || !paymentMode) {
            return res.status(400).json({ error: 'invoiceId, amount, paymentDate, and paymentMode are required.' });
        }

        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: { po: true }
        });
        if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });
        if (invoice.status !== 'APPROVED_FOR_PAYMENT') {
            return res.status(400).json({ error: 'Invoice must be approved for payment before recording a payment.' });
        }

        const payment = await prisma.$transaction(async (tx) => {
            const p = await tx.payment.create({
                data: {
                    invoiceId,
                    amount: parseFloat(amount),
                    paymentDate: new Date(paymentDate),
                    paymentMode,
                    referenceNumber: referenceNumber || null,
                    remarks: remarks || null,
                }
            });
            // Mark invoice as PAID
            await tx.invoice.update({ where: { id: invoiceId }, data: { status: 'PAID' } });
            // Close the PO
            await tx.purchaseOrder.update({ where: { id: invoice.poId }, data: { status: 'CLOSED' } });
            return p;
        });

        res.status(201).json({ payment, message: 'Payment recorded. PO is now CLOSED.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
