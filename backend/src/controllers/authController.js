import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

/**
 * POST /api/auth/login
 */
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        if (typeof email !== 'string') {
            return res.status(400).json({ error: 'Email must be a string.' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        
        if (!user) {
            console.log(`[Auth] User not found: ${normalizedEmail}`);
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        
        if (!user.isActive) {
            console.log(`[Auth] User is deactivated: ${normalizedEmail}`);
            return res.status(403).json({ error: 'Account is deactivated. Contact your administrator.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log(`[Auth] Password mismatch for: ${normalizedEmail}`);
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Update last login
        try {
            await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
        } catch (updateErr) {
            console.error('[Auth] Failed to update lastLogin:', updateErr.message);
            // Non-critical, continue login
        }

        const token = generateToken(user);
        res.json({
            token,
            user: { 
                id: user.id, 
                name: user.name, 
                email: user.email, 
                role: user.role, 
                team: user.team, 
                department: user.department,
                phoneNumber: user.phoneNumber,
                designation: user.designation,
                location: user.location,
                employeeId: user.employeeId,
                signaturePath: user.signaturePath
            }
        });
    } catch (err) {
        console.error('[Auth] CRITICAL LOGIN ERROR:', err);
        res.status(500).json({ error: `Internal server error: ${err.message}` });
    }
};

/**
 * GET /api/auth/me
 */
export const getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                reportingManager: { select: { id: true, name: true, email: true } }
            }
        });
        if (!user) return res.status(404).json({ error: 'User not found.' });

        // Calculate Stats
        const [totalPrs, approvedPrs, pendingPrs, manager, pendingApprovalsCount, trendRaw] = await Promise.all([
            prisma.pr.count({ where: { createdById: user.id, deletedAt: null } }),
            prisma.pr.count({ where: { createdById: user.id, status: 'APPROVED', deletedAt: null } }),
            prisma.pr.count({ where: { createdById: user.id, status: 'PENDING', deletedAt: null } }),
            user.reportingManagerId ? prisma.user.findUnique({ where: { id: user.reportingManagerId }, select: { name: true, email: true } }) : null,
            prisma.prApproval.count({
                where: {
                    status: 'PENDING',
                    approver: { email: user.email }
                }
            }),
            prisma.pr.groupBy({
                 by: ['month', 'year'],
                 where: { createdById: user.id, deletedAt: null },
                 _count: { id: true },
                 orderBy: [ { year: 'desc' }, { month: 'desc' } ],
                 take: 6
            })
        ]);

        // Format trend for charts
        const trend = trendRaw.map(t => ({
             month: `${t.month}/${t.year}`,
             count: t._count.id
        })).reverse();

        const profileData = {
            ...user,
            reportingManager: manager,
            stats: {
                totalPrs,
                approvedPrs,
                pendingPrs,
                pendingApprovals: pendingApprovalsCount,
                lastActivity: user.updatedAt,
                trend
            }
        };
        delete profileData.password;
        res.json(profileData);
    } catch (err) {
        console.error('[Auth] Get me error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * POST /api/auth/register — Admin only
 */
export const register = async (req, res) => {
    try {
        const { name, email, password, role, team, department } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required.' });
        }

        const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
        if (existing) {
            return res.status(409).json({ error: 'A user with this email already exists.' });
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await prisma.user.create({
            data: {
                name: name.trim(),
                email: email.toLowerCase().trim(),
                password: hashedPassword,
                role: role || 'INDENTOR',
                team: team || 'GENERAL',
                department: department || null,
            },
            select: { id: true, name: true, email: true, role: true, team: true, department: true, createdAt: true }
        });

        res.status(201).json(user);
    } catch (err) {
        console.error('[Auth] Register error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * GET /api/auth/users — Admin only
 */
export const listUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, name: true, email: true, role: true, team: true, department: true, isActive: true, lastLogin: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (err) {
        console.error('[Auth] List users error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * PATCH /api/auth/users/:id — Admin only
 */
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, role, team, department, isActive, password } = req.body;

        const data = {};
        if (name !== undefined) data.name = name.trim();
        if (role !== undefined) data.role = role;
        if (team !== undefined) data.team = team;
        if (department !== undefined) data.department = department;
        if (isActive !== undefined) data.isActive = isActive;
        if (password) {
            const salt = await bcrypt.genSalt(12);
            data.password = await bcrypt.hash(password, salt);
        }

        const user = await prisma.user.update({
            where: { id },
            data,
            select: { id: true, name: true, email: true, role: true, team: true, department: true, isActive: true }
        });

        res.json(user);
    } catch (err) {
        console.error('[Auth] Update user error:', err);
        res.status(500).json({ error: 'Failed to update user.' });
    }
};
/**
 * PUT /api/auth/profile
 * Update current user's profile (basic info only)
 */
export const updateProfile = async (req, res) => {
    try {
        const { name, email, phoneNumber, designation, location, employeeId, department, reportingManagerId } = req.body;
        
        const data = {};
        if (name !== undefined) data.name = name.trim();
        if (email !== undefined) data.email = email.toLowerCase().trim();
        if (phoneNumber !== undefined) data.phoneNumber = phoneNumber;
        if (designation !== undefined) data.designation = designation;
        if (location !== undefined) data.location = location;
        if (employeeId !== undefined) data.employeeId = employeeId;
        if (department !== undefined) data.department = department;
        if (reportingManagerId !== undefined) data.reportingManagerId = reportingManagerId || null;

        const user = await prisma.user.update({
            where: { id: req.user.id },
            data,
            select: { id: true, name: true, email: true, phoneNumber: true, designation: true, location: true, employeeId: true, department: true, reportingManagerId: true }
        });

        // 🟢 SYNC WITH APPROVER TABLE
        // If name or email changed, update the corresponding record in Approver table (if it exists)
        if (name !== undefined || email !== undefined) {
             const approver = await prisma.approver.findUnique({
                where: { email: req.user.email.toLowerCase() } // Use old email from token to find it
            });

            if (approver) {
                await prisma.approver.update({
                    where: { id: approver.id },
                    data: {
                        name: user.name,
                        email: user.email
                    }
                });
            }
        }

        res.json({ message: 'Profile updated successfully', user });
    } catch (err) {
        console.error('[Auth] Update profile error:', err);
        if (err.code === 'P2002') {
            return res.status(409).json({ error: 'This email or employee ID is already in use.' });
        }
        res.status(500).json({ error: 'Failed to update profile.' });
    }
};

/**
 * POST /api/auth/signature
 * Upload signature for current user
 */
export const uploadSignature = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: { signaturePath: req.file.filename },
            select: { id: true, signaturePath: true }
        });

        // Also update the Approver table if a matching email exists
        const approver = await prisma.approver.findUnique({
            where: { email: req.user.email.toLowerCase() }
        });

        if (approver) {
            await prisma.approver.update({
                where: { id: approver.id },
                data: { signaturePath: req.file.filename }
            });
        }

        res.json({ message: 'Signature updated successfully', signaturePath: user.signaturePath });
    } catch (err) {
        console.error('[Auth] Upload signature error:', err);
        res.status(500).json({ error: 'Failed to upload signature.' });
    }
};

/**
 * GET /api/auth/managers
 * List users available to be reporting managers
 */
export const listManagers = async (req, res) => {
    try {
        const managers = await prisma.user.findMany({
            where: {
                role: { in: ['ADMIN', 'APPROVER', 'PROCUREMENT'] },
                isActive: true
            },
            select: { id: true, name: true, email: true, designation: true },
            orderBy: { name: 'asc' }
        });
        res.json(managers);
    } catch (err) {
        console.error('[Auth] List managers error:', err);
        res.status(500).json({ error: 'Failed to fetch managers.' });
    }
};
