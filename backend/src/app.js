import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Import Route Handlers
import authRoutes from './routes/authRoutes.js';
import prRoutes from './routes/prRoutes.js';
import nfaRoutes from './routes/nfaRoutes.js';
import purchaseOrderRoutes from './routes/purchaseOrderRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import approvalRoutes from './routes/approvalRoutes.js';
import masterDataRoutes from './routes/masterDataRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import monthlyBudgetRoutes from './routes/monthlyBudgetRoutes.js';
import migrationRoutes from './routes/migrationRoutes.js';
import poApprovalRoutes from './routes/poApprovalRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';


// Legacy/Internal support (keeping for now, but will migrate)
import rfqRoutes from './routes/rfqRoutes.js';
import quotationRoutes from './routes/quotationRoutes.js';
import grnRoutes from './routes/grnRoutes.js';
import techSpecRoutes from './routes/techSpecRoutes.js';
import techReviewRoutes from './routes/techReviewRoutes.js';

// Auth Middleware
import { authenticate, authorize } from './middlewares/authMiddleware.js';
import { auditMiddleware } from './middlewares/auditMiddleware.js';

app.use(cors());
app.use(express.json());
// app.use(auditMiddleware);

// Global Request Logger
app.use((req, res, next) => {
  console.log(`[ERP-SYS] ${req.method} ${req.url}`);
  next();
});

// --- PUBLIC ROUTES (no auth required) ---

// 0. Auth (login is public, register/users require auth internally)
app.use('/api/auth', authRoutes);
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));

// External token-based routes (email approval links & vendor portal)
app.use('/api/approvals', approvalRoutes);
app.use('/api/po-approvals', poApprovalRoutes);

// --- PROTECTED ROUTES (require JWT) ---
app.use('/api', authenticate);

// Static Assets (Protected)
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));

// 1. Documents & AI Parsing (Centralized File Handling)
app.use('/api/documents', documentRoutes);

// 2. Purchase Requisitions (PR)
app.use('/api/prs', prRoutes);

// 3. Note for Approval (NFA)
app.use('/api/nfas', nfaRoutes);

// 4. Purchase Orders (PO)
app.use('/api/purchase-orders', purchaseOrderRoutes);

// 5. Invoices & GRNs
app.use('/api/invoices', invoiceRoutes);
app.use('/api/grns', grnRoutes);

// 6. Payments
app.use('/api/payments', paymentRoutes);

// 7. Financials & Budgets
app.use('/api/budgets', monthlyBudgetRoutes);

// 8. Master Data (Admin/Manager access enforced at route level)
app.use('/api/master-data', masterDataRoutes);

// 9. System Maintenance (Admin only enforced at route level)
app.use('/api/migration', migrationRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/notifications', notificationRoutes);

// Legacy RFQ/Quotation support (until PR -> NFA -> PO logic is fully converted)
app.use('/api/rfqs', rfqRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/tech-specs', techSpecRoutes);
app.use('/api/tech-reviews', techReviewRoutes);

app.get('/', (req, res) => {
  res.send('Procurement Operating System API is active.');
});

app.listen(PORT, () => {
  console.log(`Enterprise ERP Server running on port ${PORT}`);
});

export default app;
