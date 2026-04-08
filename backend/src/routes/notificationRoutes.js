import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import * as notificationController from '../controllers/notificationController.js';

const router = express.Router();

// GET all relevant notifications (requires login)
router.get('/', authenticate, notificationController.getNotifications);

// PATCH mark individual notification read
router.patch('/:id/read', authenticate, notificationController.markAsRead);

// POST mark all my notifications read
router.post('/read-all', authenticate, notificationController.markAllAsRead);

// DELETE notification
router.delete('/:id', authenticate, notificationController.deleteNotification);


export default router;
