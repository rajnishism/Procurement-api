import prisma from '../utils/db.js';

/**
 * Logs an activity/audit trail in the database.
 * 
 * @param {Object} params
 * @param {String} params.action - The action taken (e.g., 'CREATE_PR', 'APPROVE_PO', 'LOGIN')
 * @param {String} [params.entityType] - Type of entity modified (e.g., 'PurchaseOrder', 'User')
 * @param {String} [params.entityId] - The ID of the modified entity
 * @param {String} [params.actor] - User ID, email, or system identifier
 * @param {String} [params.ipAddress] - IP address of the requester
 * @param {Object} [params.details] - Additional contextual details structure
 */
export async function logAudit({ action, entityType, entityId, actor, ipAddress, details }) {
    try {
        await prisma.auditLog.create({
            data: {
                action,
                entityType,
                entityId,
                actor: actor || 'SYSTEM',
                ipAddress,
                details: details ? details : null,
            }
        });
    } catch (error) {
        console.error('[AuditService] Failed to record audit log:', error.message);
    }
}
