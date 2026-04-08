import prisma from '../utils/db.js';
import { getDepartments as getDeptNames } from '../config/wbsCodes.js';
import { ensureDepartmentExists } from '../utils/wbsSync.js';

export const getDepartments = async (req, res) => {
    try {
        const deptNames = getDeptNames();
        
        // Sync config names to DB and get real IDs
        const syncedDepts = [];
        for (const name of deptNames) {
            const id = await ensureDepartmentExists(name);
            syncedDepts.push({ id, name, code: name.substring(0, 3).toUpperCase() });
        }

        // Also fetch any other depts already in DB not in config? 
        // For now, return what's in DB to include UUIDs and consistency.
        const departments = await prisma.department.findMany({
            include: { budgetHeads: true }
        });
        
        res.json(departments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createDepartment = async (req, res) => {
    try {
        console.log('Creating Department:', req.body);
        const { name, code } = req.body;

        if (!name || !code) {
            return res.status(400).json({ error: 'Name and Code are required' });
        }

        const department = await prisma.department.create({
            data: { name, code }
        });
        res.json(department);
    } catch (error) {
        console.error('Create Department Error:', error);
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Department with this name or code already exists' });
        }
        res.status(500).json({ error: error.message });
    }
};

export const deleteDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.department.delete({
            where: { id }
        });
        res.json({ message: 'Department deleted successfully' });
    } catch (error) {
        console.error('Delete Department Error:', error);
        res.status(500).json({ error: error.message });
    }
};
