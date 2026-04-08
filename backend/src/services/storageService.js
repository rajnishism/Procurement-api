import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_ROOT = path.join(__dirname, '../../uploads');

/**
 * Ensures a directory exists, creating it if necessary.
 */
export const ensureDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
    return dirPath;
};

/**
 * Gets the directory for a specific PR.
 */
export const getPrDir = (prNumber) => {
    // Sanitize prNumber for folder naming (replace / with -)
    const sanitized = prNumber.replace(/\//g, '-');
    return path.join(UPLOADS_ROOT, 'prs', sanitized);
};

/**
 * Gets the directory for a specific PO.
 */
export const getPoDir = (poNumber) => {
    const sanitized = poNumber.replace(/\//g, '-');
    return path.join(UPLOADS_ROOT, 'pos', sanitized);
};

/**
 * Gets the directory for a specific NFA.
 */
export const getNfaDir = (nfaNumber) => {
    const sanitized = nfaNumber.replace(/\//g, '-');
    return path.join(UPLOADS_ROOT, 'nfas', sanitized);
};

/**
 * Gets the directory for temporary uploads.
 */
export const getTempDir = () => {
    return path.join(UPLOADS_ROOT, 'temp');
};

/**
 * Moves a file from a source path to an entity-specific folder.
 */
export const moveToEntityFolder = (sourcePath, entityType, entityNumber, targetFileName) => {
    if (!fs.existsSync(sourcePath)) {
        console.warn(`[StorageService] Source file not found: ${sourcePath}`);
        return null;
    }

    let targetDir;
    switch (entityType.toUpperCase()) {
        case 'PR':
            targetDir = getPrDir(entityNumber);
            break;
        case 'PO':
            targetDir = getPoDir(entityNumber);
            break;
        case 'NFA':
            targetDir = getNfaDir(entityNumber);
            break;
        default:
            targetDir = path.join(UPLOADS_ROOT, entityType.toLowerCase(), entityNumber);
    }

    ensureDir(targetDir);
    const destination = path.join(targetDir, targetFileName);
    
    try {
        fs.renameSync(sourcePath, destination);
        console.log(`[StorageService] Moved file to: ${destination}`);
        
        // Return path relative to uploads/ for database storage
        return path.relative(UPLOADS_ROOT, destination);
    } catch (error) {
        console.error(`[StorageService] Failed to move file:`, error.message);
        return null;
    }
};

/**
 * Resolves a stored path to a full filesystem path.
 */
export const resolveUploadPath = (relativePath) => {
    return path.join(UPLOADS_ROOT, relativePath);
};
