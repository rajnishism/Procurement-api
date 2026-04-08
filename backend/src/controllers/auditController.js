import prisma from '../utils/db.js';

export const getAuditLogs = async (req, res) => {
    try {
        const { limit = 50, offset = 0, entityType, search } = req.query;
        
        const filter = {};
        if (entityType && entityType !== 'ALL') {
            filter.entityType = entityType;
        }
        if (search) {
            filter.OR = [
                { action: { contains: search, mode: 'insensitive' } },
                { actor: { contains: search, mode: 'insensitive' } },
                { entityId: { contains: search, mode: 'insensitive' } }
            ];
        }

        const logs = await prisma.auditLog.findMany({
            where: filter,
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset)
        });
        
        const total = await prisma.auditLog.count({ where: filter });
        
        res.json({ logs, total });
    } catch (error) {
        console.error('[AuditController] Error fetching logs:', error.message);
        res.status(500).json({ error: 'Failed to fetch audit logs.' });
    }
};
