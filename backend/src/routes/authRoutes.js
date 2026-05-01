import { Router } from 'express';
import { login, logout, getMe, register, listUsers, updateUser, updateProfile, uploadSignature, listManagers, searchUsers, requestPasswordReset, resetPassword } from '../controllers/authController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const signatureDir = path.join(__dirname, '../../uploads/signatures');
if (!fs.existsSync(signatureDir)) {
    fs.mkdirSync(signatureDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, signatureDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `SIG-U-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

import { imageFilter } from '../utils/fileUploadSecurity.js';

const upload = multer({ 
    storage,
    fileFilter: imageFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit for signatures
});

const router = Router();

// Public
router.post('/login', login);
router.post('/logout', logout);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);

// Authenticated
router.get('/me', authenticate, getMe);
router.get('/profile', authenticate, getMe); // Alias or use dedicated if logic differs
router.put('/profile', authenticate, updateProfile);
router.post('/signature', authenticate, upload.single('signature'), uploadSignature);
router.get('/managers', authenticate, listManagers);
router.get('/search-users', authenticate, searchUsers);

// Admin only
router.post('/register', authenticate, authorize('ADMIN'), register);
router.get('/users', authenticate, authorize('ADMIN'), listUsers);
router.patch('/users/:id', authenticate, authorize('ADMIN'), updateUser);

export default router;
