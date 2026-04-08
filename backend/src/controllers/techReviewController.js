import prisma from '../utils/db.js';
import { sendTechnicalReviewRequest } from '../services/emailService.js';

/**
 * POST /api/tech-reviews
 * Submit a technical observation review for a vendor quotation.
 * Body: { rfqId, quotationId, techStatus, remarks, risks, reviewedBy }
 */
export const submitTechReview = async (req, res) => {
    try {
        const { rfqId, quotationId, techStatus, remarks, risks, reviewedBy } = req.body;

        if (!rfqId || !quotationId || !techStatus) {
            return res.status(400).json({ error: 'rfqId, quotationId, and techStatus are required.' });
        }

        if (!['COMPLIANT', 'DEVIATION', 'NOT_FIT'].includes(techStatus)) {
            return res.status(400).json({ error: 'techStatus must be COMPLIANT, DEVIATION, or NOT_FIT.' });
        }

        const review = await prisma.technicalReview.upsert({
            where: {
                rfqId_quotationId: { rfqId, quotationId }
            },
            update: { techStatus, remarks: remarks || null, risks: risks || null, reviewedBy: reviewedBy || null },
            create: { rfqId, quotationId, techStatus, remarks: remarks || null, risks: risks || null, reviewedBy: reviewedBy || null }
        });

        res.status(201).json(review);
    } catch (error) {
        console.error('submitTechReview Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/tech-reviews/:rfqId
 * Fetch all technical reviews for an RFQ (for comparison matrix).
 */
export const getTechReviewsByRfq = async (req, res) => {
    try {
        const { rfqId } = req.params;
        const reviews = await prisma.technicalReview.findMany({
            where: { rfqId },
            include: {
                quotation: { include: { vendor: { select: { id: true, name: true, email: true } } } }
            },
            orderBy: { createdAt: 'asc' }
        });
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * POST /api/tech-reviews/trigger/:rfqId
 * Trigger technical review phase: set RFQ status to RESPONSES_RECEIVED
 * and email technical department with all vendor quote summaries.
 */
export const triggerTechnicalReview = async (req, res) => {
    try {
        const { rfqId } = req.params;
        const { techDeptEmail } = req.body;

        const rfq = await prisma.rFQ.findUnique({
            where: { id: rfqId },
            include: {
                quotations: { include: { vendor: true, lineItems: true } },
                pr: true
            }
        });

        if (!rfq) return res.status(404).json({ error: 'RFQ not found.' });
        if (rfq.quotations.length === 0) return res.status(400).json({ error: 'No quotations received yet.' });

        // Set RFQ status to RESPONSES_RECEIVED
        await prisma.rFQ.update({
            where: { id: rfqId },
            data: { status: 'RESPONSES_RECEIVED' }
        });

        // Send email to technical department
        const emailTarget = techDeptEmail || process.env.TECH_DEPT_EMAIL;
        if (emailTarget) {
            sendTechnicalReviewRequest({
                toEmail: emailTarget,
                rfqNumber: rfq.rfqNumber,
                rfqTitle: rfq.title,
                prNumber: rfq.pr.prNumber,
                quotations: rfq.quotations.map(q => ({
                    vendorName: q.vendor.name,
                    totalAmount: parseFloat(q.totalAmount),
                    deliveryDays: q.deliveryDays,
                    notes: q.notes
                }))
            }).catch(err => console.error('[Tech Review Email Failed]', err.message));
        }

        res.json({ message: 'Technical review phase triggered.', rfqStatus: 'RESPONSES_RECEIVED' });
    } catch (error) {
        console.error('triggerTechnicalReview Error:', error);
        res.status(500).json({ error: error.message });
    }
};
