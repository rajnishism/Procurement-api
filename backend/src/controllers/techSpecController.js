import prisma from '../utils/db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * POST /api/tech-specs
 * Create or update a Technical Specification for a PR.
 * Accepts optional file upload via multer (field: 'file').
 */
export const createTechSpec = async (req, res) => {
    try {
        const { prId, notes, uploadedBy, tags } = req.body;
        if (!prId) return res.status(400).json({ error: 'prId is required.' });

        const pr = await prisma.pr.findUnique({ where: { id: prId, deletedAt: null } });
        if (!pr) return res.status(404).json({ error: 'PR not found.' });
        if (pr.status !== 'APPROVED') return res.status(400).json({ error: 'Technical specs can only be uploaded for APPROVED PRs.' });

        let filePath = null;
        if (req.file) {
            const outputDir = path.join(__dirname, '../../uploads/tech-specs');
            if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
            const destPath = path.join(outputDir, req.file.filename);
            // File is already saved by multer via diskStorage; just record filename
            filePath = req.file.filename;
        }

        const tagsArray = tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [];

        const spec = await prisma.technicalSpecification.upsert({
            where: { prId },
            update: {
                notes: notes || null,
                uploadedBy: uploadedBy || null,
                tags: tagsArray,
                ...(filePath && { filePath }),
            },
            create: {
                prId,
                notes: notes || null,
                uploadedBy: uploadedBy || null,
                filePath: filePath || null,
                tags: tagsArray,
            }
        });

        res.status(201).json(spec);
    } catch (error) {
        console.error('createTechSpec Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/tech-specs/:prId
 * Fetch technical spec for a given PR.
 */
export const getTechSpecByPrId = async (req, res) => {
    try {
        const { prId } = req.params;
        const spec = await prisma.technicalSpecification.findUnique({
            where: { prId },
        });
        if (!spec) return res.status(404).json({ error: 'No technical spec found for this PR.' });
        res.json(spec);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
