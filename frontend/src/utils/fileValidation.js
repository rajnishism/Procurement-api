export const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.sh', '.msi', '.com', '.cmd', '.scr', '.vbs', '.js', '.ts'];
export const ALLOWED_DOC_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt'];
export const ALLOWED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.bmp'];

/**
 * Validates a file for security and type.
 * @param {File} file 
 * @param {Object} options 
 * @returns {string|null} Error message or null if valid
 */
export const validateFile = (file, options = {}) => {
    if (!file) return 'No file selected';
    
    const { 
        maxSize = 10 * 1024 * 1024, 
        allowedTypes = [...ALLOWED_DOC_EXTENSIONS, ...ALLOWED_IMAGE_EXTENSIONS],
        isImageOnly = false 
    } = options;

    const fileName = file.name.toLowerCase();
    const extension = fileName.substring(fileName.lastIndexOf('.'));

    // Check blocked extensions
    if (BLOCKED_EXTENSIONS.includes(extension)) {
        return `Security Alert: File type ${extension} is strictly prohibited.`;
    }

    // Check if image only
    if (isImageOnly) {
        if (!ALLOWED_IMAGE_EXTENSIONS.includes(extension) && !file.type.startsWith('image/')) {
            return `Only image files are allowed (${ALLOWED_IMAGE_EXTENSIONS.join(', ')}).`;
        }
    } else {
        // Check allowed extensions
        if (!allowedTypes.includes(extension) && !file.type.startsWith('image/')) {
            return `Invalid file type. Allowed: ${allowedTypes.join(', ')}`;
        }
    }

    // Check size
    if (file.size > maxSize) {
        const sizeMB = (maxSize / (1024 * 1024)).toFixed(0);
        return `File size exceeds the maximum limit of ${sizeMB}MB.`;
    }

    return null;
};
