import prisma from '../utils/db.js';
import { sendInAppApprovalEmail } from '../services/emailService.js';
console.log('--- Initializing InAppApprovalController ---');
console.log('Prisma Models available:', Object.keys(prisma).filter(k => !k.startsWith('_')));
// ─────────────────────────────────────────────────────────────────────────────
// Helper: check if all steps in a request are approved
// ─────────────────────────────────────────────────────────────────────────────
function isFullyApproved(steps) {
  return steps.length > 0 && steps.every(step => step.status === "APPROVED");
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: given a request id, advance levels if current level is complete
// ─────────────────────────────────────────────────────────────────────────────
async function advanceWorkflow(approvalRequestId) {
  const request = await prisma.approvalRequest.findUnique({
    where: { id: approvalRequestId },
    include: { 
      steps: { 
        orderBy: { level: 'asc' },
        include: { approver: { select: { id: true, name: true, email: true } } }
      } 
    },
  });
  if (!request) return;

  // Group steps by level
  const levelMap = {};
  for (const step of request.steps) {
    if (!levelMap[step.level]) levelMap[step.level] = [];
    levelMap[step.level].push(step);
  }

  const levels = Object.keys(levelMap).map(Number).sort((a, b) => a - b);

  for (const level of levels) {
    const steps = levelMap[level];

    // If any step at this level was REJECTED → reject the whole request
    const anyRejected = steps.some((s) => s.status === 'REJECTED');
    if (anyRejected) {
      await prisma.approvalRequest.update({
        where: { id: approvalRequestId },
        data: { status: 'REJECTED' },
      });

      // Synchronize with parent entity
      if (request.requestType === 'PR') {
        await prisma.pr.update({
          where: { id: request.entityId },
          data: { status: 'REJECTED' },
        }).catch(err => console.error('Failed to update PR status on rejection:', err));
      } else if (request.requestType === 'PO') {
        await prisma.purchaseOrder.update({
          where: { id: request.entityId },
          data: { status: 'REJECTED' },
        }).catch(err => console.error('Failed to update PO status on rejection:', err));
      }
      return;
    }

    const mode = steps[0].approvalMode; // ALL levels share same mode value
    const allApproved = steps.every((s) => s.status === 'APPROVED');
    const anyApproved = steps.some((s) => s.status === 'APPROVED');

    const levelComplete = mode === 'ALL' ? allApproved : anyApproved;

    if (!levelComplete) {
      // This level is still pending — make sure all its steps are PENDING (not WAITING)
      await prisma.approvalStep.updateMany({
        where: {
          approvalRequestId,
          level,
          status: 'WAITING',
        },
        data: { status: 'PENDING' },
      });
      return; // Wait here — don't advance
    }

    // Level is complete — find the next level
    const nextLevel = levels.find((l) => l > level);
    if (!nextLevel) {
      // All levels done → double check if TRULY all steps are approved (idempotency/safeguard)
      const allSteps = request.steps; // These are already fetched
      if (isFullyApproved(allSteps)) {
        // Find the latest actedAt timestamp for the approval date
        const latestStep = [...allSteps].sort((a, b) => 
          new Date(b.actedAt || 0) - new Date(a.actedAt || 0)
        )[0];

        await prisma.approvalRequest.update({
          where: { id: approvalRequestId },
          data: { status: 'APPROVED' },
        });

        // Synchronize with parent entity
        const approvalDate = latestStep?.actedAt || new Date();

        if (request.requestType === 'PR') {
          // Check current status to avoid redundant updates
          const currentPr = await prisma.pr.findUnique({ where: { id: request.entityId } });
          if (currentPr && currentPr.status !== 'APPROVED') {
            await prisma.pr.update({
              where: { id: request.entityId },
              data: { 
                status: 'APPROVED',
                dateOfApproval: approvalDate
              },
            }).catch(err => console.error('Failed to update PR status on approval:', err));
          }
        } else if (request.requestType === 'PO') {
          const currentPo = await prisma.purchaseOrder.findUnique({ where: { id: request.entityId } });
          if (currentPo && currentPo.status !== 'APPROVED') {
            await prisma.purchaseOrder.update({
              where: { id: request.entityId },
              data: { status: 'APPROVED' },
            }).catch(err => console.error('Failed to update PO status on approval:', err));
          }
        }
      }
      return;
    }

    // Unlock next level
    const nextSteps = levelMap[nextLevel];
    for (const step of nextSteps) {
      if (step.status === 'WAITING') {
        await prisma.approvalStep.update({
          where: { id: step.id },
          data: { status: 'PENDING' },
        });

        // Fire a notification for the next approver
        await prisma.notification.create({
          data: {
            userId: step.approverId,
            type: 'INFO',
            title: 'Action Required — Approval Pending',
            message: `A new ${request.requestType} (${request.requestId}) requires your approval.`,
            link: `/approvals/${approvalRequestId}`,
          },
        }).catch(() => {}); // Silently skip if notification schema differs
        
        // Send email
        if (step.approver?.email) {
          sendInAppApprovalEmail({
            approverName: step.approver.name,
            approverEmail: step.approver.email,
            requestType: request.requestType,
            requestId: request.requestId,
            title: request.title,
            appUrl: `${process.env.APP_URL || 'http://localhost:5173'}/approvals/${approvalRequestId}`,
          }).catch((err) => console.error('Failed to send approval email:', err));
        }
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/in-approvals
// Create a new ApprovalRequest with its steps
// Body: { requestId, requestType, entityId, title?, steps: [{ approverId, level, approvalMode? }] }
// ─────────────────────────────────────────────────────────────────────────────
export const createApprovalRequest = async (req, res) => {
  try {
    const { requestId, requestType, entityId, title, steps } = req.body;
    const createdById = req.user?.id;

    if (!requestId || !requestType || !entityId || !steps?.length) {
      return res.status(400).json({ error: 'requestId, requestType, entityId and steps are required.' });
    }

    // Find the minimum level to make PENDING immediately
    const minLevel = Math.min(...steps.map((s) => s.level));

    const approvalRequest = await prisma.approvalRequest.create({
      data: {
        requestId,
        requestType,
        entityId,
        title: title || `${requestType} — ${requestId}`,
        status: 'PENDING',
        createdById,
        steps: {
          create: steps.map((s) => ({
            approverId: s.approverId,
            level: s.level,
            approvalMode: s.approvalMode || 'ANY',
            status: s.level === minLevel ? 'PENDING' : 'WAITING',
          })),
        },
      },
      include: { steps: { include: { approver: { select: { id: true, name: true, role: true, email: true } } } } },
    });

    // Fire notifications for first-level approvers
    for (const step of approvalRequest.steps.filter((s) => s.level === minLevel)) {
      await prisma.notification.create({
        data: {
          userId: step.approverId,
          type: 'INFO',
          title: 'Action Required — Approval Pending',
          message: `${requestType} (${requestId}) is awaiting your approval.`,
          link: `/approvals/${approvalRequest.id}`,
        },
      }).catch(() => {});
      
      if (step.approver?.email) {
        sendInAppApprovalEmail({
          approverName: step.approver.name,
          approverEmail: step.approver.email,
          requestType: approvalRequest.requestType,
          requestId: approvalRequest.requestId,
          title: approvalRequest.title,
          appUrl: `${process.env.APP_URL || 'http://localhost:5173'}/approvals/${approvalRequest.id}`,
        }).catch((err) => console.error('Failed to send approval email:', err));
      }
    }

    res.status(201).json(approvalRequest);
  } catch (err) {
    console.error('createApprovalRequest error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/in-approvals/my
// Return all PENDING steps assigned to the logged-in user (with request info)
// ─────────────────────────────────────────────────────────────────────────────
export const getMyApprovals = async (req, res) => {
  try {
    const approverId = req.user.id;

    const steps = await prisma.approvalStep.findMany({
      where: {
        approverId,
      },
      include: {
        approvalRequest: {
          include: {
            steps: {
              include: {
                approver: { select: { id: true, name: true, role: true, designation: true } },
              },
              orderBy: { level: 'asc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(steps);
  } catch (err) {
    console.error('getMyApprovals error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/in-approvals/:id
// Single approval request with all steps (for the Approval Detail page)
// ─────────────────────────────────────────────────────────────────────────────
export const getApprovalRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.id;

    const request = await prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        steps: {
          include: {
            approver: {
              select: { id: true, name: true, email: true, role: true, designation: true, signaturePath: true },
            },
          },
          orderBy: [{ level: 'asc' }, { createdAt: 'asc' }],
        },
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });

    if (!request) {
      return res.status(404).json({ error: 'Approval request not found.' });
    }

    // ── Access control: only the creator OR an assigned approver can view ──
    const isCreator = request.createdById != null && request.createdById === requestingUserId;
    const isApprover = request.steps.some(s => s.approverId === requestingUserId);
    const isAdmin = req.user.role === 'ADMIN';

    console.log(`[ApprovalAccess] request=${id} requester=${requestingUserId} isCreator=${isCreator} isApprover=${isApprover} isAdmin=${isAdmin}`);

    if (!isCreator && !isApprover && !isAdmin) {
      console.log(`[ApprovalAccess] DENIED for user ${requestingUserId} on request ${id}`);
      return res.status(403).json({ error: 'Access denied. You are not an approver or creator of this request.' });
    }

    res.json(request);
  } catch (err) {
    console.error('getApprovalRequestById error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/in-approvals/:id/action
// Logged-in user approves/rejects their step
// Body: { action: 'APPROVED' | 'REJECTED', remarks? }
// ─────────────────────────────────────────────────────────────────────────────
export const submitApprovalAction = async (req, res) => {
  try {
    const { id } = req.params; // approvalRequestId
    const actorId = req.user.id;
    const { action, remarks } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return res.status(400).json({ error: 'action must be APPROVED or REJECTED.' });
    }

    // Find the PENDING step for this user in this request
    const step = await prisma.approvalStep.findFirst({
      where: {
        approvalRequestId: id,
        approverId: actorId,
        status: 'PENDING',
      },
    });

    if (!step) {
      return res.status(403).json({
        error: 'No pending approval step found for you on this request, or it is not your turn.',
      });
    }

    // Update the step
    await prisma.approvalStep.update({
      where: { id: step.id },
      data: {
        status: action,
        remarks: remarks || null,
        actedAt: new Date(),
      },
    });

    // Advance the workflow
    await advanceWorkflow(id);

    // Fetch updated request to return
    const updated = await prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        steps: {
          include: {
            approver: { select: { id: true, name: true, role: true, designation: true } },
          },
          orderBy: [{ level: 'asc' }],
        },
      },
    });

    res.json(updated);
  } catch (err) {
    console.error('submitApprovalAction error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/in-approvals  (Admin view — all requests)
// ─────────────────────────────────────────────────────────────────────────────
export const getAllApprovalRequests = async (req, res) => {
  try {
    const { status, requestType } = req.query;

    const where = {};
    if (status) where.status = status;
    if (requestType) where.requestType = requestType;

    const requests = await prisma.approvalRequest.findMany({
      where,
      include: {
        steps: {
          include: {
            approver: { select: { id: true, name: true, role: true } },
          },
          orderBy: { level: 'asc' },
        },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(requests);
  } catch (err) {
    console.error('getAllApprovalRequests error:', err);
    res.status(500).json({ error: err.message });
  }
};
