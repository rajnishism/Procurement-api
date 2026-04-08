import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getNotifications = async (req, res) => {
    try {
        const userId = req.user?.id;
        const notifications = await prisma.notification.findMany({
            where: {
                OR: [
                    { userId: userId }, // Personal notifications
                    { userId: null }    // Global/Admin notifications
                ]
            },
            orderBy: { createdAt: 'desc' },
            take: 100 // Limit to latest 100
        });

        res.status(200).json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

export const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await prisma.notification.update({
            where: { id },
            data: { read: true }
        });
        res.status(200).json(notification);
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
};

export const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user?.id;
        await prisma.notification.updateMany({
            where: {
                userId: userId,
                read: false
            },
            data: { read: true }
        });

        // Also mark global as read for this user? 
        // NOTE: If global notifications are shared, marking them read for one user marks them read for all.
        // For a more advanced system, you'd want a separate table for UI read receipts per user.
        // For now, we only mark user-specific ones or global ones (if admin).

        res.status(200).json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error marking all as read:', error);
        res.status(500).json({ error: 'Failed to mark all as read' });
    }
};

export const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.notification.delete({
            where: { id }
        });
        res.status(200).json({ message: 'Notification deleted successfully' });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
};
