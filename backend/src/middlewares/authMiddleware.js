import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * authenticate — verifies JWT from Authorization header.
 * Attaches req.user = { id, email, role, name }
 */
export const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        let token = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        } else if (req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({ error: 'Authentication required. No token provided.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, role: true, name: true, isActive: true, department: true, team: true }
        });

        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'User account is inactive or not found.' });
        }

        req.user = user;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired. Please login again.' });
        }
        return res.status(401).json({ error: 'Invalid token.' });
    }
};

/**
 * authorize(...roles) — checks if req.user.role is in the allowed list.
 * Must be called AFTER authenticate.
 */
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required.' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}` 
            });
        }
        next();
    };
};

/**
 * authorizeTeam(...teams) — checks if req.user.team is in the allowed list.
 * ADMIN role always bypasses team checks. GENERAL team has access to everything.
 * Must be called AFTER authenticate.
 */
export const authorizeTeam = (...teams) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required.' });
        }
        // ADMIN role and GENERAL team bypass team restrictions
        if (req.user.role === 'ADMIN' || req.user.team === 'GENERAL') {
            return next();
        }
        if (!teams.includes(req.user.team)) {
            return res.status(403).json({ 
                error: `Access denied. Required team(s): ${teams.join(', ')}. Your team: ${req.user.team}` 
            });
        }
        next();
    };
};
