import prisma from '../utils/db.js';

export const getVendors = async (req, res) => {
    try {
        const { includeInactive } = req.query;
        const vendors = await prisma.vendor.findMany({
            where: includeInactive === 'true' ? {} : { isActive: true },
            orderBy: { name: 'asc' }
        });
        res.json(vendors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createVendor = async (req, res) => {
    try {
        const { name, code, email, phone, address, gstin, pan, category } = req.body;
        if (!name?.trim() || !code?.trim() || !email?.trim()) {
            return res.status(400).json({ error: 'Name, code, and email are required.' });
        }
        const vendor = await prisma.vendor.create({
            data: {
                name: name.trim(),
                code: code.trim().toUpperCase(),
                email: email.trim().toLowerCase(),
                phone: phone?.trim() || null,
                address: address?.trim() || null,
                gstin: gstin?.trim().toUpperCase() || null,
                pan: pan?.trim().toUpperCase() || null,
                category: category || 'GOODS',
            }
        });
        res.status(201).json(vendor);
    } catch (error) {
        if (error.code === 'P2002') {
            const field = error.meta?.target?.includes('email') ? 'Email' : 'Code';
            return res.status(409).json({ error: `${field} already exists.` });
        }
        res.status(500).json({ error: error.message });
    }
};

export const updateVendor = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, address, gstin, pan, category, isActive } = req.body;
        const vendor = await prisma.vendor.update({
            where: { id },
            data: {
                ...(name && { name: name.trim() }),
                ...(phone !== undefined && { phone: phone?.trim() || null }),
                ...(address !== undefined && { address: address?.trim() || null }),
                ...(gstin !== undefined && { gstin: gstin?.trim().toUpperCase() || null }),
                ...(pan !== undefined && { pan: pan?.trim().toUpperCase() || null }),
                ...(category && { category }),
                ...(isActive !== undefined && { isActive }),
            }
        });
        res.json(vendor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteVendor = async (req, res) => {
    try {
        const { id } = req.params;
        // Soft-delete: just mark inactive
        await prisma.vendor.update({ where: { id }, data: { isActive: false } });
        res.json({ message: 'Vendor deactivated successfully.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
