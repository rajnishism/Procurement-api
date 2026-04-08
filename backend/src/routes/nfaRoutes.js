import express from 'express';

const router = express.Router();

// NOTE FOR APPROVAL (NFA) - Decision Document
// NFAs are usually generated from approved PRs to summarize the justification for expenditure.

// GET /api/nfas - List decision documents
router.get('/', (req, res) => res.json({ msg: "Fetch NFA index - Not implemented in data layer yet." }));

// POST /api/nfas - Manually create NFA (rare, usually derived)
router.post('/', (req, res) => res.status(201).json({ msg: "NFA logic drafted." }));

// GET /api/nfas/:id - Details
router.get('/:id', (req, res) => res.json({ msg: "NFA View logic drafted." }));

// POST /api/nfas/:id/submit - Decision lock
router.post('/:id/submit', (req, res) => res.json({ msg: "NFA submitted for final financial approval." }));

export default router;
