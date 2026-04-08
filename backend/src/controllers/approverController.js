import prisma from '../utils/db.js';

/** GET /api/approvers/email/:email  — find one by email */
export const getApproverByEmail = async (req, res) => {
    try {
        const { email } = req.params;
        const approver = await prisma.approver.findUnique({
            where: { email: email.toLowerCase() },
            include: { department: true }
        });
        if (!approver) return res.status(404).json({ error: 'No profile found for this email.' });
        res.json(approver);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/** GET /api/approvers  — list all approvers */
export const getApprovers = async (req, res) => {
    try {
        const approvers = await prisma.approver.findMany({
            include: { department: { select: { id: true, name: true } } },
            orderBy: { name: 'asc' }
        });
        res.json(approvers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/** POST /api/approvers  — create a new approver */
export const createApprover = async (req, res) => {
    try {
        const { name, email, departmentId } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: 'name and email are required' });
        }

        const approver = await prisma.approver.create({
            data: {
                name,
                email,
                departmentId: departmentId || null,
            },
            include: { department: { select: { id: true, name: true } } }
        });
        res.status(201).json(approver);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'An approver with this email already exists.' });
        }
        res.status(500).json({ error: error.message });
    }
};

/** DELETE /api/approvers/:id  — remove an approver */
export const deleteApprover = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.approver.delete({ where: { id } });
        res.json({ message: 'Approver deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/** PUT /api/approvers/:id — update profile (signature) */
export const updateApprover = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, departmentId } = req.body;
        
        const data = {};
        if (name) data.name = name;
        if (departmentId) data.departmentId = departmentId;
        
        if (req.file) {
            data.signaturePath = req.file.filename;
        }

        const approver = await prisma.approver.update({
            where: { id },
            data,
            include: { department: true }
        });

        res.json({ message: 'Profile updated successfully', approver });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
