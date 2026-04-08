import prisma from '../utils/db.js';

const generateInvoiceNumber = async () => {
    const count = await prisma.invoice.count();
    return `INV-${String(count + 1).padStart(4, '0')}`;
};

export const getInvoices = async (req, res) => {
    try {
        const invoices = await prisma.invoice.findMany({
            include: {
                vendor: { select: { name: true } },
                po: { select: { poNumber: true } },
                grn: { select: { grnNumber: true } },
                threeWayMatch: true,
                _count: { select: { payments: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getInvoiceById = async (req, res) => {
    try {
        const { id } = req.params;
        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: {
                vendor: true,
                po: { include: { lineItems: true } },
                grn: { include: { lineItems: true } },
                lineItems: true,
                threeWayMatch: true,
                payments: true,
            }
        });
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
        res.json(invoice);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createInvoice = async (req, res) => {
    try {
        const { vendorId, poId, grnId, amount, taxAmount, invoiceDate, dueDate, lineItems } = req.body;
        if (!vendorId || !poId || !amount || !invoiceDate) {
            return res.status(400).json({ error: 'vendorId, poId, amount, and invoiceDate are required.' });
        }
        const invoiceNumber = await generateInvoiceNumber();
        const invoice = await prisma.invoice.create({
            data: {
                invoiceNumber,
                vendorId,
                poId,
                grnId: grnId || null,
                amount: parseFloat(amount),
                taxAmount: parseFloat(taxAmount || 0),
                invoiceDate: new Date(invoiceDate),
                dueDate: dueDate ? new Date(dueDate) : null,
                lineItems: lineItems?.length ? {
                    create: lineItems.map(item => ({
                        description: item.description,
                        qty: parseFloat(item.qty),
                        unitPrice: parseFloat(item.unitPrice),
                        totalPrice: parseFloat(item.qty) * parseFloat(item.unitPrice),
                    }))
                } : undefined
            },
            include: { lineItems: true }
        });
        res.status(201).json(invoice);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// POST /api/invoices/:id/match — Run 3-Way Match Logic
export const runThreeWayMatch = async (req, res) => {
    try {
        const { id } = req.params;
        const { tolerancePct = 2 } = req.body; // default 2% tolerance

        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: {
                po: { include: { lineItems: true } },
                grn: { include: { lineItems: true } },
            }
        });
        if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });
        if (!invoice.grn) return res.status(400).json({ error: 'Invoice must be linked to a GRN before matching.' });

        const poAmount = parseFloat(invoice.po.totalAmount);
        const invoiceAmount = parseFloat(invoice.amount);
        const tolerance = poAmount * (tolerancePct / 100);
        const amountDiff = Math.abs(invoiceAmount - poAmount);

        // Calculate GRN received qty percentage
        let totalOrdered = 0, totalReceived = 0;
        for (const grnItem of invoice.grn.lineItems) {
            totalOrdered += parseFloat(grnItem.orderedQty);
            totalReceived += parseFloat(grnItem.receivedQty);
        }
        const grnReceivedQtyPct = totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0;

        const discrepancies = [];
        if (amountDiff > tolerance) discrepancies.push(`Invoice amount ₹${invoiceAmount.toLocaleString('en-IN')} differs from PO amount ₹${poAmount.toLocaleString('en-IN')} by ₹${amountDiff.toFixed(2)} (exceeds ${tolerancePct}% tolerance).`);
        if (grnReceivedQtyPct < 100) discrepancies.push(`Only ${grnReceivedQtyPct.toFixed(1)}% of ordered goods received.`);

        let result;
        if (discrepancies.length === 0) result = 'MATCHED';
        else if (grnReceivedQtyPct >= 50 && amountDiff <= poAmount * 0.1) result = 'PARTIAL';
        else result = 'MISMATCH';

        // Upsert ThreeWayMatch record
        const match = await prisma.threeWayMatch.upsert({
            where: { invoiceId: id },
            create: { invoiceId: id, poId: invoice.poId, grnId: invoice.grnId, poAmount, grnReceivedQtyPct, invoiceAmount, result, discrepancyNotes: discrepancies.join(' ') },
            update: { poAmount, grnReceivedQtyPct, invoiceAmount, result, discrepancyNotes: discrepancies.join(' '), checkedAt: new Date() }
        });

        // Update invoice status
        const newStatus = result === 'MATCHED' ? 'MATCHED' : 'DISPUTED';
        await prisma.invoice.update({ where: { id }, data: { status: newStatus } });

        res.json({ match, invoiceStatus: newStatus });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const approveInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const invoice = await prisma.invoice.update({
            where: { id },
            data: { status: 'APPROVED_FOR_PAYMENT' }
        });
        res.json(invoice);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
