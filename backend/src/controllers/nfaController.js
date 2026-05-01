import prisma from '../utils/db.js';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import * as storageService from '../services/storageService.js';
import { parseNFA } from '../services/nfaParser.js';
import mammoth from 'mammoth';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const API_KEY = process.env.ANTHROPIC_API_KEY;

const generateNfaNumber = async () => {
    const count = await prisma.nfa.count();
    return `NFA-${String(count + 1).padStart(4, '0')}`;
};

// ── GET /api/nfas ─────────────────────────────────────────────────────────────
export const getNfas = async (req, res) => {
    try {
        const nfas = await prisma.nfa.findMany({
            include: {
                createdBy: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(nfas);
    } catch (error) {
        console.error('[NFA] GET error:', error);
        res.status(500).json({ error: error.message });
    }
};

// ── GET /api/nfas/:id ─────────────────────────────────────────────────────────
export const getNfaById = async (req, res) => {
    try {
        const nfa = await prisma.nfa.findUnique({
            where: { id: req.params.id },
            include: {
                createdBy: { select: { id: true, name: true, email: true } },
            },
        });
        if (!nfa) return res.status(404).json({ error: 'NFA not found.' });
        res.json(nfa);
    } catch (error) {
        console.error('[NFA] GET by ID error:', error);
        res.status(500).json({ error: error.message });
    }
};

// ── POST /api/nfas ────────────────────────────────────────────────────────────
export const createNfa = async (req, res) => {
    try {
        const data = req.body;

        if (!data.project) return res.status(400).json({ error: 'Project is required.' });
        if (!data.itemDescription) return res.status(400).json({ error: 'Item description is required.' });
        if (!data.nfaDate) return res.status(400).json({ error: 'NFA date is required.' });

        const nfaNumber = await generateNfaNumber();
        const nfaDir = storageService.getNfaDir(nfaNumber);
        storageService.ensureEntityDirs(nfaDir);

        // Move uploaded document into NFA's versions/ folder with canonical name
        let documentPath = null;
        if (req.file) {
            const ext = path.extname(req.file.originalname);
            const version = storageService.nextVersion(nfaDir);
            const canonicalName = storageService.buildFileName(
                nfaNumber, 'approval-note', version, ext
            );
            const moved = storageService.moveToVersions(req.file.path, nfaDir, canonicalName);
            if (moved) documentPath = moved; // full relative path e.g. nfas/NFA-0001/versions/NFA-0001_approval-note_v1_2026-04-11.docx
        }

        // Parse financials (sent as JSON string from FormData)
        let financials = {};
        if (data.financials) {
            financials = typeof data.financials === 'string'
                ? JSON.parse(data.financials)
                : data.financials;
        }

        // Parse wbsNumber array
        let wbsNumber = [];
        if (data.wbsNumber) {
            wbsNumber = typeof data.wbsNumber === 'string'
                ? JSON.parse(data.wbsNumber)
                : data.wbsNumber;
        }

        const nfa = await prisma.nfa.create({
            data: {
                nfaNumber,
                project: data.project,
                itemDescription: data.itemDescription,
                ntdRefNo: data.ntdRefNo || null,
                nfaDate: new Date(data.nfaDate),
                indentNo: data.indentNo || null,
                sapPrNo: data.sapPrNo || null,
                wbsNumber,
                totalBudget: financials.totalBudget ? Number(financials.totalBudget) : null,
                balance: financials.balance ? Number(financials.balance) : null,
                currentNFAValue: financials.currentNFAValue ? Number(financials.currentNFAValue) : null,
                estimatedBalance: financials.estimatedBalance ? Number(financials.estimatedBalance) : null,
                documentPath,
                status: 'DRAFT',
                createdById: req.user?.id || null,
            },
        });

        console.log(`[NFA] Created ${nfaNumber} by user ${req.user?.id}`);
        res.status(201).json(nfa);
    } catch (error) {
        console.error('[NFA] CREATE error:', error);
        res.status(500).json({ error: error.message });
    }
};

// ── POST /api/nfas/parse ──────────────────────────────────────────────────────
// Upload an NFA document and extract structured fields.
// Uses local parsing for DOCX and falls back to Claude AI for other formats.
export const parseNfaDocument = async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const filePath = req.file.path;
    const isDocx = req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        req.file.mimetype === 'application/msword' ||
        req.file.originalname.toLowerCase().endsWith('.docx') ||
        req.file.originalname.toLowerCase().endsWith('.doc');

    try {
        let extracted = null;

        // 1. Try Local Parsing first if it's a DOCX
        if (isDocx) {
            console.log('[NFA Parse] Using local parser for DOCX...');
            try {
                extracted = await parseNFA(filePath);
                console.log('[NFA Parse] Local parsing successful.');
            } catch (err) {
                console.warn('[NFA Parse] Local parser failed, falling back to AI:', err.message);
            }
        }

        // 2. Fallback to AI (Text Extraction approach)
        if (!extracted) {
            if (!API_KEY) throw new Error('Local parsing failed and Anthropic API key is not configured.');

            let textContent = '';
            let isImage = req.file.mimetype.startsWith('image/');

            if (isDocx) {
                console.log('[NFA Parse] Extracting text from DOC/DOCX using mammoth...');
                const result = await mammoth.extractRawText({ path: filePath });
                textContent = result.value;
            } else if (req.file.mimetype === 'application/pdf') {
                console.log('[NFA Parse] Extracting text from PDF using pdf-parse...');
                const dataBuffer = fs.readFileSync(filePath);
                const data = await pdf(dataBuffer);
                textContent = data.text;
            }

            console.log('[NFA Parse] Using AI extraction...');
            
            const messageContent = [
                {
                    type: 'text',
                    text: `Extract the following procurement fields from the provided text or document.
OUTPUT FORMAT: JSON only.
{
  "project": string | null,
  "itemDescription": string | null,
  "ntdRefNo": string | null,
  "nfaDate": string | null,
  "indentNo": string | null,
  "sapPrNo": string | null,
  "wbsNumber": string[] | [],
  "financials": {
    "totalBudget": number | null,
    "balance": number | null,
    "currentNFAValue": number | null,
    "estimatedBalance": number | null
  }
}`
                }
            ];

            if (textContent) {
                messageContent.push({
                    type: 'text',
                    text: `DOCUMENT CONTENT:\n${textContent}`
                });
            } else if (isImage) {
                messageContent.push({
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: req.file.mimetype,
                        data: fs.readFileSync(filePath).toString('base64'),
                    },
                });
            } else {
                 throw new Error(`Unsupported file type for AI extraction: ${req.file.mimetype}`);
            }

            const aiRes = await axios.post('https://api.anthropic.com/v1/messages', {
                model: 'claude-sonnet-4-6',
                max_tokens: 3000,
                temperature: 0,
                system: 'You are an expert procurement document analyst. Extract structured data accurately. If a field is not found, use null.',
                messages: [{
                    role: 'user',
                    content: messageContent
                }],
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': API_KEY,
                    'anthropic-version': '2023-06-01',
                },
            });

            const raw = aiRes.data.content[0].text;
            const clean = raw.replace(/```json\n?/g, '').replace(/```/g, '').trim();
            extracted = JSON.parse(clean);
        }

        // Move file to temp for final submission
        const tempDir = path.join(path.dirname(filePath), '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const tempDest = path.join(tempDir, req.file.filename);
        fs.renameSync(filePath, tempDest);

        res.json({ extracted, tempFilename: req.file.filename });

    } catch (error) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        console.error('[NFA Parse] Error:', error.response?.data || error.message);
        fs.writeFileSync('last_error.log', error.stack || error.message);
        res.status(500).json({ error: 'NFA extraction failed.', details: error.message });
    }
};
