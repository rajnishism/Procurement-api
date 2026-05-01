import path from 'path';

export const ALLOWED_EXTENSIONS = [
    // Documents
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt',
    // Images
    '.png', '.jpg', '.jpeg', '.gif', '.bmp'
];

export const BLOCKED_EXTENSIONS = [
    '.exe', '.bat', '.sh', '.msi', '.com', '.cmd', '.scr', '.vbs', '.js', '.ts'
];

export const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (BLOCKED_EXTENSIONS.includes(ext)) {
        return cb(new Error(`Security Alert: File type ${ext} is strictly prohibited.`), false);
    }
    
    if (ALLOWED_EXTENSIONS.includes(ext) || file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`), false);
    }
};

export const imageFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedImages = ['.png', '.jpg', '.jpeg', '.gif', '.bmp'];
    
    if (allowedImages.includes(ext) || file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error(`Only image files are allowed (${allowedImages.join(', ')})`), false);
    }
};
