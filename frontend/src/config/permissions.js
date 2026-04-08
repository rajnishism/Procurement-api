/**
 * Team-Based Permissions Configuration
 * 
 * Maps each UserTeam to the frontend paths they are allowed to access.
 * ADMIN role and GENERAL team bypass all restrictions.
 */

// Paths that every authenticated user can always access
const SHARED_PATHS = ['/', '/profile'];

// Team → allowed paths (in addition to SHARED_PATHS)
const TEAM_PERMISSIONS = {
    GENERAL: null, // null = full access (no restrictions)
    
    PR_TEAM: [
        '/budget', '/upload-pr', '/prs', '/pr-tracker',
    ],
    
    VENDOR_TEAM: [
        '/rfqs', '/ai-parser',
    ],
    
    PO_TEAM: [
        '/po-generator', '/pos', '/po-tracker',
        '/nfas', '/nfahistory', '/nfatracker',
    ],
    
    GRN_TEAM: [
        '/grns',
    ],
    
    INVOICE_TEAM: [
        '/invoices', '/payments',
    ],
    
    BUDGET_TEAM: [
        '/budget', '/expenses',
    ],
};

/**
 * Check if a user can access a given path.
 * @param {object} user - The user object from AuthContext (must have role and team)
 * @param {string} path - The frontend route path
 * @returns {boolean}
 */
export const canAccessPath = (user, path) => {
    if (!user) return false;

    // ADMIN always sees everything
    if (user.role === 'ADMIN') return true;

    // Shared paths are always accessible
    if (SHARED_PATHS.includes(path)) return true;

    // Admin-only paths (handled separately by role, not team)
    const adminOnlyPaths = ['/migration', '/users', '/audit-logs', '/master-data'];
    if (adminOnlyPaths.includes(path)) return false; // non-admin already filtered above

    const team = user.team || 'GENERAL';
    const allowed = TEAM_PERMISSIONS[team];

    // GENERAL team = no restrictions
    if (allowed === null || allowed === undefined) return true;

    return allowed.includes(path);
};

/**
 * Get all allowed paths for a user (used for sidebar filtering).
 * @param {object} user
 * @returns {string[]|null} - null means "show everything"
 */
export const getAllowedPaths = (user) => {
    if (!user) return [];
    if (user.role === 'ADMIN') return null; // null = show all
    
    const team = user.team || 'GENERAL';
    const allowed = TEAM_PERMISSIONS[team];
    
    if (allowed === null || allowed === undefined) return null; // GENERAL = show all
    
    return [...SHARED_PATHS, ...allowed];
};

export const TEAM_OPTIONS = [
    { value: 'GENERAL', label: 'General (Full Access)' },
    { value: 'PR_TEAM', label: 'PR Team (Purchase Requisitions)' },
    { value: 'VENDOR_TEAM', label: 'Vendor Team (Sourcing & RFQ)' },
    { value: 'PO_TEAM', label: 'PO Team (Purchase Orders)' },
    { value: 'GRN_TEAM', label: 'GRN Team (Goods Receipt)' },
    { value: 'INVOICE_TEAM', label: 'Invoice Team (Invoices & Payments)' },
    { value: 'BUDGET_TEAM', label: 'Budget Team (Finance & Budgets)' },
];

export default { canAccessPath, getAllowedPaths, TEAM_OPTIONS };
