import { logAudit } from '../services/auditService.js';

/**
 * Express middleware to automatically log critical API mutations (POST, PUT, PATCH, DELETE)
 */
const actionMap = {
    'POST_PRS': 'CREATED PR',
    'PUT_PRS': 'UPDATED PR',
    'PATCH_PRS': 'MODIFIED PR',
    'DELETE_PRS': 'DELETED PR',
    'POST_PURCHASE-ORDERS': 'CREATED PO',
    'PUT_PURCHASE-ORDERS': 'UPDATED PO',
    'PATCH_PURCHASE-ORDERS': 'MODIFIED PO',
    'DELETE_PURCHASE-ORDERS': 'DELETED PO',
    'POST_PO-APPROVALS': 'SUBMITTED PO APPROVAL',
    'PATCH_PO-APPROVALS': 'UPDATED PO APPROVAL',
    'POST_APPROVALS': 'SUBMITTED PR APPROVAL',
    'PATCH_APPROVALS': 'UPDATED PR APPROVAL',
    'POST_USERS': 'CREATED USER',
    'PUT_USERS': 'UPDATED USER',
    'DELETE_USERS': 'DELETED USER',
    'POST_AUTH': 'AUTHENTICATION ACTION',
    'POST_RFQS': 'CREATED RFQ',
    'POST_QUOTATIONS': 'SUBMITTED QUOTATION',
    'POST_INVOICES': 'CREATED INVOICE',
    'POST_PAYMENTS': 'LOGGED PAYMENT',
    'POST_GRNS': 'LOGGED GRN'
};

export const auditMiddleware = (req, res, next) => {
    // We primarily want to log mutations, skip heavy GET request logging unless critical.
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        
        // We defer execution slightly so we can capture the response status code
        const originalSend = res.send;
        res.send = function (body) {
            res.send = originalSend;

            const actor = req.user ? (req.user.email || req.user.id) : (req.body?.email || 'ANONYMOUS');
            const entityType = req.baseUrl ? req.baseUrl.split('/api/')[1] || 'UNKNOWN' : 'UNKNOWN';
            
            const rawAction = `${req.method}_${entityType.toUpperCase()}`;
            
            // Translate generic REST into plain English, or fallback to auto-formatting
            let action = actionMap[rawAction];
            if (!action) {
                const methodVerb = req.method === 'POST' ? 'CREATED' : (req.method === 'PUT' || req.method === 'PATCH') ? 'UPDATED' : req.method === 'DELETE' ? 'DELETED' : req.method;
                action = `${methodVerb} ${entityType.toUpperCase().replace(/-/g, ' ')}`;
            }

            // Clean big payloads like passwords or files
            const sanitizedBody = { ...req.body };
            if (sanitizedBody.password) delete sanitizedBody.password;
            if (sanitizedBody.file) delete sanitizedBody.file;

            logAudit({
                action: action,
                entityType: entityType,
                entityId: req.params?.id || req.body?.id || null,
                actor: actor,
                ipAddress: req.ip || req.connection.remoteAddress,
                details: {
                    endpoint: req.originalUrl,
                    status: res.statusCode,
                    payload: sanitizedBody
                }
            });

            return res.send(body);
        };
    }
    
    next();
};
