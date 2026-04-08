import { PrismaClient } from '@prisma/client';
import emailService from '../services/emailService.js';

const prisma = new PrismaClient();

export const submitFeedback = async (req, res) => {
    try {
        const { type, subject, description, priority } = req.body;
        
        // We use req.user (from protect middleware)
        const submittedBy = req.user ? req.user.email : (req.body.email || 'ANONYMOUS');
        const userName = req.user ? req.user.name : 'Valued User';

        if (!subject || !description) {
            return res.status(400).json({ error: 'Subject and description are required' });
        }

        const ticket = await prisma.feedback.create({
            data: {
                type: type || 'FEEDBACK',
                subject,
                description,
                priority: priority || 'NORMAL',
                submittedBy
            }
        });

        // 1. Send Confirmation Auto-Reply to the User
        if (submittedBy !== 'ANONYMOUS') {
            await emailService.sendFeedbackConfirmationEmail({
                userEmail: submittedBy,
                userName: userName,
                type: ticket.type,
                ticketId: ticket.id
            });
        }
        
        // 2. Send Alert Notification to Admin/IT
        await emailService.sendFeedbackNotificationToAdminEmail({
            type: ticket.type,
            subject: ticket.subject,
            description: ticket.description,
            submittedBy: userName,
            priority: ticket.priority,
            ticketId: ticket.id
        });

        // 3. Create Internal System Notification (Admin/Global)
        await prisma.notification.create({
            data: {
                type: ticket.type === 'BUG' ? 'URGENT' : 'INFO',
                category: 'Feedback',
                title: `New ${ticket.type}: ${ticket.subject}`,
                message: `${userName} submitted a ${ticket.type.toLowerCase()} report: ${ticket.description.substring(0, 100)}...`,
                link: `/feedback`, // Assuming there's a feedback view page
                // userId: null // Global/Admin notification
            }
        });

        res.status(201).json({ message: 'Feedback submitted successfully', ticket });
    } catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({ error: 'Failed to submit feedback' });
    }
};

export const getFeedbackTickets = async (req, res) => {
    try {
        const tickets = await prisma.feedback.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(tickets);
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
};
