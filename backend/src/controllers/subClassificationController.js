import prisma from '../utils/db.js';

export const getSubClassifications = async (req, res) => {
    try {
        const subClassifications = await prisma.subClassification.findMany({
            include: {
                budgetHead: true
            }
        });
        res.json(subClassifications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createSubClassification = async (req, res) => {
    try {
        const { name, code, budgetHeadId } = req.body;
        const subClassification = await prisma.subClassification.create({
            data: { name, code, budgetHeadId }
        });
        res.json(subClassification);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
