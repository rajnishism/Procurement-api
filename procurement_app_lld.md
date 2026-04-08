# Low-Level System Design (LLD) - Procurement Application

This document outlines the detailed low-level technical design of the Procurement Application. 

## 1. Stack & Technologies

*   **Frontend**: React.js (Vite), Tailwind CSS, React Router, Recharts, Lucide React.
*   **Backend**: Node.js, Express.js.
*   **Database Engine**: PostgreSQL.
*   **ORM**: Prisma.
*   **Authentication**: Custom JWT-based authentication (Bcrypt hashing, `authController.js`).

---

## 2. Database Schema (Schema Mapping)

The database is built highly relationally using Prisma, effectively split into six distinct phases/domains.

### 2.1 Master Data & Budgets
*   **`Department`**: Core structural unit holding name and code.
*   **`Approver`**: Maintains approval authorities linked to departments, along with signature paths.
*   **`BudgetHead` & `SubClassification`**: Hierarchical classification for financial allocations.
*   **`MonthlyBudget`**: Tracks `allocated` vs `remaining` budget across budget heads/sub-classifications against a specific `month` and `year`.
*   **`WbsMaster`**: Work Breakdown Structure linking departments to budget heads.

### 2.2 Requisition Phase (PR)
*   **`Pr` (Purchase Requisition)**: Represents a request. Contains date, description, `totalValue`, `wbsCode`, and tracks paths for generated PDFs/Excel files.
*   **`Allocation`**: Sub-records of PRs that distribute the indent amount to `BudgetHeads`.
*   **`PrApproval`**: Workflow table capturing token-based sequential approvals (`INDENTOR`, `STAGE1`, `STAGE2`, `STAGE3`) with digital signatures.
*   **`TechnicalSpecification`**: Document meta-data for technical standards regarding a PR.

### 2.3 Sourcing & RFQ Phase
*   **`Vendor`**: Supplier entity, capturing GSTIN, PAN, and contact details.
*   **`RFQ`**: Ties back to PRs. Maintains a deadline and state machine (`DRAFT`, `FLOATED`, `VENDOR_SELECTED`).
*   **`RFQVendor`**: Linking table orchestrating tokens to vendor portal URLs.
*   **`Quotation` & `QuotationItem`**: Submissions by Vendors, tracking attachments, prices, taxes, and technical notes.
*   **`TechnicalReview`**: Maps Quotations vs RFQs, assessing compliance (`COMPLIANT`, `DEVIATION`, `NOT_FIT`) via reviewers.

### 2.4 Purchasing Phase (PO)
*   **`PurchaseOrder`**: Converts RFQ/PR to binding PO document. Contains amount, tax, addressing, and `status` (`DRAFT`, `ISSUED`, `DELIVERED`).
*   **`POLineItem`**: Granular item details on the PO.
*   **`PoApproval`**: Stage-based approval workflow for final PO issuance with tokens and decision history.

### 2.5 Goods Receipt (Shipments & GRN)
*   **`Shipment`**: Captures carrier and tracking mechanisms tracking order transit.
*   **`GRN` (Goods Receipt Note)**: Documents the physical receiving of goods at the delivery site.
*   **`GRNLineItem`**: Maps back to PO line items capturing `orderedQty`, `receivedQty`, and `rejectedQty`.

### 2.6 Financials & Payments
*   **`Invoice` & `InvoiceLineItem`**: Vendor billings linking POs & GRNs.
*   **`ThreeWayMatch`**: Crucial system comparing PO value, GRN recieved quantities, and Invoice values (`MATCHED`, `PARTIAL`, `MISMATCH`).
*   **`Payment`**: Captures final cash outflow tracking modes (`NEFT`, `UPI`, `CHEQUE`) and dates.

---

## 3. Backend Architecture

The backend follows an MVC-inspired Service-Controller-Route design pattern optimized for Express.

### 3.1 Routing Layer (`/src/routes`)
Maps logical URLs to Controllers and applies token authentication middleware.
*   **System Routes**: `authRoutes.js`, `aiRoutes.js`, `migrationRoutes.js`
*   **Master Data**: `departmentRoutes.js`, `vendorRoutes.js`, `wbsRoutes.js`, `budgetHeadRoutes.js`
*   **Transactions**: `prRoutes.js`, `poRoutes.js`, `grnRoutes.js`, `invoiceRoutes.js`, `paymentRoutes.js`
*   **Workflows**: `approvalRoutes.js`, `poApprovalRoutes.js`, `documentRoutes.js`

### 3.2 Controller Layer (`/src/controllers`)
Processes business logic, validates inputs, and directly interacts with the Prisma Client for CRUD operations.
*   *Key Data Integrators*: `prController.js`, `poController.js`, `rfqController.js` manage the state machines of standard workflow entities.
*   *Workflow Facilitators*: `poApprovalController.js` and `approvalController.js` orchestrate token generation, stage transitions, and sequential handovers.
*   *Smart Capabilities*: `aiController.js` interfaces with AI modules (e.g. parsing unstructured quotations).

### 3.3 Service Layer (`/src/services`)
Contains heavy processing functions, abstracted away from routing.
*   **`budgetService.js`**: Functions `deductBudgetForPO` and `reverseBudgetForPO` control automatic balance updates in the `MonthlyBudget` entries dynamically.
*   **`emailService.js`**: Integration with SMTP clients to push interactive approval tokens and notifications to internal Approvers and external Vendors.
*   **`generateTemplate.js` / `generatePOTemplate.js`**: Handlers for programmatic document generation (writing dynamic data, injecting digital signatures in cells, outputting PDFs/Excels).
*   **`pdfService.js`**: Extracting or manipulating coordinates inside PDF artifacts.
*   **`allocationService.js`**: Complex processing for WBS spreading and validations against budget capacity.

---

## 4. Frontend Architecture

A modern React functional component setup employing heavy local State (`useState`/`useContext`) communicating through Axios interceptors.

### 4.1 Structural Components
*   **`Layout.jsx`**: Global layout boundary handling App sidebars, navigation context, and top bars.
*   **`ProtectedRoute.jsx`**: Security wrapper verifying JWT authentication state before rendering operational pages.
*   **`Toast.jsx`**: Global feedback notification utility.

### 4.2 Application Pages (`/src/pages`)
Modules split strictly by functional workflow stages matching the DB phases.
*   **PR Generation**: 
    *   `PrUpload.jsx`: Interface for manual entry or parsing documents.
    *   `PrTracking.jsx`: Master dashboard for status mapping of PRs.
*   **Vendor Sourcing**:
    *   `RFQManagement.jsx`: Creating RFQs from PRs, setting deadlines, floating to vendors.
    *   `VendorPortal.jsx`: Unique token-enabled interface for vendors to submit Quotations.
    *   `AiQuotationParser.jsx`: Upload portal extracting vendor details visually.
*   **Management & Issuance**:
    *   `POGenerator.jsx` & `POManagement.jsx`: Translating quotations into POs.
*   **Execution**:
    *   `GRNManagement.jsx`: Receiving shipments from POs & verifying partial/full metrics.
    *   `InvoiceManagement.jsx`: 3-way matching resolution against PO & GRN.
    *   `PaymentManagement.jsx`: Marking completed stages.
    *   `BudgetOverview.jsx`: Visual representation mapping BudgetHeads graphically (Recharts charts).

### 4.3 Workflows via Tokenized Invites
The application relies heavily on token links for external entity engagement. 
*   **Approver Links**: Ex: `/po-approval/:token`. Handled by `PoApprovalAction.jsx` & `ApprovalAction.jsx` which fetch current metadata transparently without deep system authentication.

## 5. Security & Error Handling Strategies
*   **Database Constraints**: Strict Prisma schema constraints (Cascade deletes, Unique index combinations, Enum strict matching).
*   **Sequential Approval Check**: Code-level arrays dictate the flow (`PREPARER` -> `STAGE1` -> ... ). If index skips or if user bypasses, API immediately halts transaction.
*   **Budget Synchronization**: Budget deducts exist within controlled service promises ensuring no mathematical leaks. If a PO is rejected, asynchronous reversal commands immediately execute returning funds uniformly across WBS Allocations.
