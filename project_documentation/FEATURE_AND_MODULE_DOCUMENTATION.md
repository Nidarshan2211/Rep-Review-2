# AquaFlow / AquaTrack: Feature & Module Documentation
## Exhaustive Feature Analysis with Full Frontend-to-Backend-to-Database Tracing

---

## Module 1: Public & Authentication Management

### Feature 1.1: Multi-Role Authentication Portal (Role Toggle Login)
- **What is the feature?**: A unified, secure login interface allowing Super Admins, Building Owners, and Residents to select their designated role card and authenticate using their email and password.
- **Why is it required?**: Ensures strict role segregation from the moment of access, providing role-tailored authentication guards and preventing cross-role privilege confusion.
- **Who uses it?**: All system actors (`SUPER_ADMIN`, `BUILDING_OWNER`, `RESIDENT`).
- **How does the user access it?**: Navigating to `/login` or clicking "Sign In" on the public landing page navbar.
- **What happens when the user performs an action?**:
  1. User selects a role card (e.g. "Building Owner").
  2. Enters email and password, clicks "Sign In as Building Owner".
  3. UI validates inputs and sends credentials to backend.
  4. Backend verifies role, BCrypt hash, and account status (`APPROVED` / `ACTIVE`).
  5. Upon success, returns JWT bearer token and user profile; frontend redirects to role-specific dashboard (`/admin/dashboard`, `/owner/dashboard`, or `/resident/dashboard`).
- **Frontend Component**: `frontend/src/shared/auth/LoginPage.jsx`
- **Backend API Called**: `POST /api/auth/login`
- **Controller & Service**: `AuthController.login()` $\rightarrow$ `AuthService.authenticateUser()`
- **Business Rules & Validations**:
  - Request body must include valid email format and non-empty password.
  - User status check:
    - Building Owners with status `PENDING` are blocked with error: *"Your account registration is pending Super Admin approval."*
    - Building Owners with status `REJECTED` are blocked with error: *"Your account registration has been rejected."*
    - Residents with account status `INACTIVE` or `PENDING` invitation are prompted to accept their invitation token first.
  - Role verification: The authenticated user's database role must match the `activeRole` chosen in the form.
- **Database Operations**:
  - `SELECT * FROM users WHERE email = ?`
  - Fetches associated `building_owners` or `residents` profile.
- **Response Displayed**: Sets `localStorage` and `AuthContext` state; renders targeted dashboard. If invalid, displays styled Bootstrap alert banner with specific failure explanation.

---

### Feature 1.2: Building Owner Self-Registration Workflow
- **What is the feature?**: Public registration form enabling commercial property managers and residential building owners to register their profile in the system.
- **Why is it required?**: Enables organic onboarding of new properties without requiring manual database seeding by developers.
- **Who uses it?**: Prospective Property Managers / Building Owners.
- **How does the user access it?**: Navigating to `/register-owner` or clicking "Register Property" on the login page.
- **What happens when the user performs an action?**:
  1. Owner enters full name, property company/display name, official email, phone number, and password.
  2. Clicks "Submit Registration".
  3. Backend checks email uniqueness, hashes password with BCrypt, creates user record with status `PENDING`, and logs an audit record.
  4. UI displays success confirmation stating approval is awaiting Super Admin verification.
- **Frontend Component**: `frontend/src/shared/auth/RegisterOwnerPage.jsx`
- **Backend API Called**: `POST /api/auth/register-owner`
- **Controller & Service**: `AuthController.registerOwner()` $\rightarrow$ `AuthService.registerOwner()`
- **Business Rules & Validations**:
  - Email uniqueness: Must not already exist in `users` table.
  - Password strength: Must be at least 6 characters.
  - Initial user status is locked to `PENDING`. Role is set to `BUILDING_OWNER`.
  - Owner approval status is set to `PENDING`.
- **Database Operations**:
  - `INSERT INTO users (name, email, password, role, status, created_at) VALUES (?, ?, ?, 'BUILDING_OWNER', 'PENDING', NOW())`
  - `INSERT INTO building_owners (user_id, name, phone, approval_status, created_at) VALUES (?, ?, ?, 'PENDING', NOW())`
  - `INSERT INTO owner_history (owner_id, owner_name, email, phone, event_type, details, actor, timestamp) VALUES (?, ?, ?, ?, 'OWNER_REGISTERED', 'Owner submitted self-registration', 'SYSTEM', NOW())`
- **Response Displayed**: Success card informing user that their account is queued for review by Super Admin.

---

### Feature 1.3: Tokenized Resident Invitation Acceptance
- **What is the feature?**: Cryptographically secured invitation acceptance page where invited residents finalize their account creation, review their assigned apartment details, and establish their private login password.
- **Why is it required?**: Prevents unauthorized users from registering as tenants in buildings. Only building owners who verify property lease agreements can issue invitation tokens.
- **Who uses it?**: Newly invited Residents.
- **How does the user access it?**: Following a tokenized link sent via email: `/accept-invitation?token=<secure_token>`.
- **What happens when the user performs an action?**:
  1. Frontend retrieves invitation details using the query token.
  2. Displays resident name, building name, assigned apartment number, and unit type.
  3. Resident inputs their chosen password and confirms.
  4. Backend verifies token validity, creates a `User` account with role `RESIDENT` and status `ACTIVE`, binds the `Resident` record to the user, updates `resident_invitations` to `ACCEPTED`, creates an active `apartment_occupancies` record, and issues an active session.
- **Frontend Component**: `frontend/src/shared/auth/AcceptInvitationPage.jsx`
- **Backend API Called**: `GET /api/residents/invitation-details?token=...` followed by `POST /api/auth/accept-invitation`
- **Controller & Service**: `AuthController.acceptInvitation()` $\rightarrow$ `AuthService.acceptInvitation()`
- **Business Rules & Validations**:
  - Invitation token must exist in `resident_invitations` and have status `PENDING`.
  - Token must not be expired (default 7 days validity).
  - Password must satisfy security constraints.
- **Database Operations**:
  - `SELECT * FROM resident_invitations WHERE token = ? AND status = 'PENDING'`
  - `INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, 'RESIDENT', 'ACTIVE')`
  - `UPDATE residents SET user_id = ?, account_status = 'ACTIVE', invitation_status = 'ACCEPTED' WHERE resident_id = ?`
  - `UPDATE resident_invitations SET status = 'ACCEPTED', accepted_at = NOW() WHERE token = ?`
  - `INSERT INTO apartment_occupancies (apartment_id, resident_id, start_date, status, household_size) VALUES (?, ?, NOW(), 'ACTIVE', ?)`
- **Response Displayed**: Confirmation banner and automatic redirection to `/resident/dashboard`.

---

## Module 2: Super Administrator Portal

### Feature 2.1: System Governance & Revenue KPI Dashboard
- **What is the feature?**: High-level executive dashboard aggregating platform-wide operational metrics, including total approved building owners, pending approval queues, registered buildings, active residents, and cumulative billing revenue.
- **Why is it required?**: Gives platform operators instant visibility into platform adoption, property expansion, and pending administrative bottlenecks.
- **Who uses it?**: System Super Administrators (`SUPER_ADMIN`).
- **How does the user access it?**: Navigating to `/admin/dashboard`.
- **What happens when the user performs an action?**:
  1. Component mounts and issues simultaneous asynchronous requests for system metrics and pending owner queues.
  2. Renders 4 primary KPI stat cards with trend indicators.
  3. Displays an interactive summary table of pending registrations with one-click quick action buttons.
- **Frontend Component**: `frontend/src/superadmin/pages/AdminDashboard.jsx`
- **Backend API Called**: `GET /api/admin/dashboard`
- **Controller & Service**: `SuperAdminController.getDashboardMetrics()` $\rightarrow$ `SuperAdminService.getMetrics()`
- **Business Rules & Validations**:
  - Endpoint restricted strictly to users with authority `ROLE_SUPER_ADMIN`.
  - Aggregates live records from `building_owners`, `buildings`, `residents`, and `bills`.
- **Database Operations**:
  - `SELECT COUNT(*) FROM building_owners WHERE approval_status = 'APPROVED'`
  - `SELECT COUNT(*) FROM building_owners WHERE approval_status = 'PENDING'`
  - `SELECT COUNT(*) FROM buildings`
  - `SELECT COUNT(*) FROM residents WHERE account_status = 'ACTIVE'`
  - `SELECT COALESCE(SUM(amount), 0) FROM bills WHERE status = 'PAID'`
- **Response Displayed**: Formatted metrics cards (Total Owners, Pending Approvals, Total Buildings, Total Residents, Total Platform Collections).

---

### Feature 2.2: Building Owner Verification & Approval Workflow
- **What is the feature?**: Formal verification workflow allowing Super Admins to review owner profiles, check contact details, and execute an `APPROVE` or `REJECT` decision.
- **Why is it required?**: Enforces platform compliance and prevents fraudulent or unverified property listings from billing residents.
- **Who uses it?**: Super Administrators (`SUPER_ADMIN`).
- **How does the user access it?**: Navigating to `/admin/pending-owners` or `/admin/owners`.
- **What happens when the user performs an action?**:
  1. Admin clicks "Approve" (green button) or "Reject" (red button).
  2. A confirmation modal prompts for approval notes or rejection rationale.
  3. Backend updates both `building_owners` and `users` status.
  4. Writes an immutable event into `owner_history` logging the admin's identity, timestamp, and decision.
  5. UI dynamically removes the card from pending list and updates counters.
- **Frontend Component**: `frontend/src/superadmin/pages/AdminPendingOwnersPage.jsx` and `AdminOwnersPage.jsx`
- **Backend API Called**: `PUT /api/admin/owners/{id}/approve` or `PUT /api/admin/owners/{id}/reject`
- **Controller & Service**: `SuperAdminController.approveOwner()` / `rejectOwner()` $\rightarrow$ `SuperAdminService.updateOwnerStatus()`
- **Business Rules & Validations**:
  - Target owner ID must exist.
  - Current status must be `PENDING`.
  - Approving sets `users.status = 'APPROVED'` and `building_owners.approval_status = 'APPROVED'`.
  - Rejecting sets `users.status = 'REJECTED'` and `building_owners.approval_status = 'REJECTED'`.
- **Database Operations**:
  - `UPDATE building_owners SET approval_status = 'APPROVED' WHERE owner_id = ?`
  - `UPDATE users SET status = 'APPROVED' WHERE user_id = ?`
  - `INSERT INTO owner_history (owner_id, owner_name, email, phone, event_type, details, actor, timestamp) VALUES (?, ?, ?, ?, 'OWNER_APPROVED', 'Super Admin approved owner registration', 'admin@smartwater.com', NOW())`
- **Response Displayed**: Instant UI toast notification and reactive table refresh.

---

### Feature 2.3: Platform Audit History & Security Log
- **What is the feature?**: Comprehensive system audit log displaying chronological events across all property owners and residents.
- **Why is it required?**: Provides accountability, non-repudiation, and regulatory compliance for tenant disputes, billing events, and administrative decisions.
- **Who uses it?**: Super Administrators (`SUPER_ADMIN`).
- **How does the user access it?**: Navigating to `/admin/history`.
- **Frontend Component**: `frontend/src/superadmin/pages/AdminHistoryPage.jsx`
- **Backend API Called**: `GET /api/admin/history/all`
- **Controller & Service**: `SuperAdminController.getAllAuditHistory()` $\rightarrow$ `SuperAdminService.getAuditTrail()`
- **Database Operations**: `SELECT * FROM owner_history ORDER BY timestamp DESC` and `SELECT * FROM resident_history ORDER BY timestamp DESC`
- **Response Displayed**: Filterable, paginated audit table with badges for event types (`OWNER_REGISTERED`, `OWNER_APPROVED`, `OWNER_REJECTED`, `RESIDENT_INVITED`, etc.).

---

## Module 3: Building Owner & Property Management Portal

### Feature 3.1: Building & Apartment Inventory Management
- **What is the feature?**: Hierarchical property inventory manager allowing building owners to create buildings, specify total flats, configure floor numbers, room numbers, unit types (`1BHK`, `2BHK`, `3BHK`, `PENTHOUSE`), and associate digital water sub-meters.
- **Why is it required?**: Sub-meter water billing requires exact physical unit mapping. Flat configurations determine default household occupancy baselines for ML leak models.
- **Who uses it?**: Building Owners (`BUILDING_OWNER`).
- **How does the user access it?**: Navigating to `/owner/buildings`.
- **What happens when the user performs an action?**:
  1. Owner clicks "+ Add Building" or "+ Add Flat".
  2. Enters building name, building number, street address, and total units.
  3. Inside a building, clicks "Add Apartment", specifies floor number, flat room number, and unit type.
  4. Backend persists apartment, assigns a unique sub-meter identifier (`WM-<BuildingNumber>-<RoomNumber>`), and initializes meter state.
- **Frontend Component**: `frontend/src/owner/pages/OwnerBuildingsPage.jsx`
- **Backend API Called**: `POST /api/buildings`, `GET /api/buildings/{id}/apartments`, `POST /api/apartments`
- **Controller & Service**: `BuildingController` and `ApartmentController` $\rightarrow$ `BuildingOwnerService` and `ApartmentService`
- **Database Operations**:
  - `INSERT INTO buildings (owner_id, building_name, building_number, location, total_flats) VALUES (?, ?, ?, ?, ?)`
  - `INSERT INTO apartments (building_id, floor_number, apartment_name, room_number, unit_type, description) VALUES (?, ?, ?, ?, ?, ?)`
  - `INSERT INTO water_meters (building_id, apartment_id, meter_number, installation_date, status) VALUES (?, ?, ?, NOW(), 'ACTIVE')`
- **Response Displayed**: Interactive accordion showing buildings, flat grid cards with unit badges (`2BHK`, `3BHK`), occupancy status chips (`VACANT` / `OCCUPIED`), and meter links.

---

### Feature 3.2: Resident Directory & Tokenized Invitation Dispatch
- **What is the feature?**: Comprehensive resident directory providing owner tools to invite new residents to specific apartments, search/filter occupants, view invitation status (`PENDING`, `ACCEPTED`, `EXPIRED`), and resend invitation links.
- **Why is it required?**: Securely links physical apartments to verified resident identities, eliminating misallocated billing statements.
- **Who uses it?**: Building Owners (`BUILDING_OWNER`).
- **How does the user access it?**: Navigating to `/owner/residents`.
- **What happens when the user performs an action?**:
  1. Owner clicks "Invite Resident".
  2. Selects target building and vacant apartment number.
  3. Enters resident's full name, email, and phone number.
  4. Backend verifies that the apartment is not already actively occupied.
  5. Generates a secure cryptographic UUID invitation token.
  6. Creates a `resident_invitations` record with status `PENDING`.
  7. Pre-creates a `residents` profile with `invitation_status = 'PENDING'` and `account_status = 'INACTIVE'`.
  8. Generates tokenized URL (`/accept-invitation?token=<UUID>`).
- **Frontend Component**: `frontend/src/owner/pages/OwnerResidentsPage.jsx`
- **Backend API Called**: `POST /api/residents/invite`, `GET /api/owners/residents`
- **Controller & Service**: `OwnerResidentController.inviteResident()` $\rightarrow$ `ResidentService.createInvitation()`
- **Database Operations**:
  - `INSERT INTO residents (building_id, name, email, phone, apartment_number, invitation_token, invitation_status, account_status) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', 'INACTIVE')`
  - `INSERT INTO resident_invitations (resident_id, invited_by_id, token, status, expires_at) VALUES (?, ?, ?, 'PENDING', DATE_ADD(NOW(), INTERVAL 7 DAY))`
  - `INSERT INTO resident_history (owner_id, building_id, resident_name, activity_type, details, actor) VALUES (?, ?, ?, 'RESIDENT_INVITED', 'Invitation token dispatched', ?, NOW())`
- **Response Displayed**: Dynamic table with resident contact card, apartment badge, invitation status chip (`PENDING` with copyable link or `ACCEPTED`), and action dropdown.

---

### Feature 3.3: Dynamic Tanker Procurement & 3-Tier Tariff Plan Engine
- **What is the feature?**: Mathematical billing engine that records supplemental private water tanker deliveries (volume, supplier, total cost) and dynamically calculates the Weighted Average Procurement Cost ($WAPC$), Base Tariff, and tiered rate multipliers for an active billing cycle.
- **Why is it required?**: Solves the central economic challenge of multi-dwelling residential communities: volatile tanker water prices. Automatically protects society operating budgets while ensuring transparent, formulaic pricing for residents.
- **Who uses it?**: Building Owners (`BUILDING_OWNER`).
- **How does the user access it?**: Navigating to `/owner/billing`.
- **What happens when the user performs an action?**:
  1. Owner logs tanker purchases for the month (e.g. Cauvery Tankers, 12,000 L, \$600.00).
  2. Selects active Billing Cycle and enters Society Maintenance Markup (e.g. 20%).
  3. Clicks "Calculate & Generate Tariff Plan".
  4. Backend sums all tanker volumes and costs for the cycle:
     $$WAPC = \frac{\sum \text{Cost}_i}{\sum \text{Volume}_i}$$
     $$\text{Base Tariff} = WAPC \times \left(1 + \frac{\text{Markup } \%}{100}\right)$$
  5. Multiplies Base Tariff across the 3 consumption brackets:
     - Tier 1 ($0 - 20\text{ kL}$): $Base \times 1.00$
     - Tier 2 ($21 - 40\text{ kL}$): $Base \times 1.25$
     - Tier 3 ($41+\text{ kL}$): $Base \times 1.50$
  6. Persists the generated plan and associates it with the active cycle.
- **Frontend Component**: `frontend/src/owner/pages/OwnerBillingPage.jsx`
- **Backend API Called**: `POST /api/tariff-plans/calculate/{cycleId}`, `GET /api/water-purchases/cycle/{cycleId}`, `POST /api/water-purchases`
- **Controller & Service**: `TariffPlanController` and `WaterPurchaseController` $\rightarrow$ `TariffCalculationService` and `WaterPurchaseService`
- **Database Operations**:
  - `INSERT INTO water_purchases (building_id, billing_cycle_id, purchase_date, supplier, volume, unit_cost, total_cost) VALUES (?, ?, ?, ?, ?, ?, ?)`
  - `SELECT * FROM water_purchases WHERE billing_cycle_id = ?`
  - `INSERT INTO tariff_plans (building_id, billing_cycle_id, average_procurement_cost, markup_percentage, base_tariff, tier1_limit, tier1_rate, tier2_limit, tier2_rate, tier3_rate, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`
- **Response Displayed**: Visual 3-slab tariff breakdown cards displaying calculated per-unit rates, procurement cost summary, and locked confirmation.

---

### Feature 3.4: Automated Bulk Billing & CSV Ingestion Pipeline
- **What is the feature?**: High-speed batch billing pipeline that ingests building-wide meter reading CSV spreadsheets, executes server-side validation against previous cycle readings, previews bill estimations, and commits usages, bills, and PDF invoices in an atomic transaction.
- **Why is it required?**: Manually entering 50–500 apartment meter readings each month is error-prone and time-consuming. Bulk CSV ingestion automates the entire billing cycle in seconds.
- **Who uses it?**: Building Owners (`BUILDING_OWNER`).
- **How does the user access it?**: Navigating to `/owner/bulk-billing`.
- **What happens when the user performs an action?**:
  1. Owner downloads pre-populated CSV template containing all building meters and authoritative previous readings.
  2. Enters current meter readings and uploads CSV.
  3. Clicks "Preview & Validate".
  4. Backend parses CSV, validates resident IDs, compares current vs previous reading ($\Delta = \text{Current} - \text{Previous}$), flags any negative consumption or duplicates, calculates slab charges, and returns row-by-row validation status.
  5. Owner inspects preview table; if verified, clicks "Commit & Generate Invoices".
  6. Backend creates `water_usage`, `bills`, `invoices`, and triggers background asynchronous ML leak detection.
- **Frontend Component**: `frontend/src/owner/pages/BulkBillingPage.jsx`
- **Backend API Called**: `POST /api/billing/bulk-preview` and `POST /api/billing/bulk-commit`
- **Controller & Service**: `BulkBillingController` $\rightarrow$ `BulkBillingService`
- **Business Rules & Validations**:
  - CSV must contain required headers: `resident_id`, `meter_number`, `current_reading`.
  - Current reading must be strictly $\ge$ Previous reading ($\text{Units Consumed} \ge 0$).
  - Prevents double billing: Flags residents already billed in the specified cycle.
- **Database Operations**:
  - `INSERT INTO water_usage (meter_id, billing_cycle_id, month, year, previous_reading, current_reading, units_consumed, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`
  - `INSERT INTO bills (resident_id, billing_cycle_id, usage_id, bill_month, bill_year, units, amount, status, tier1_units, tier1_amount, ...) VALUES (...)`
  - `INSERT INTO invoices (resident_id, billing_cycle_id, usage_units, base_charge, extra_charge, total_amount, status, due_date) VALUES (...)`
- **Response Displayed**: Interactive preview data grid with validation badges (`VALID`, `ERROR`, `ALREADY_BILLED`), total revenue summary, and completion modal.

---

### Feature 3.5: ML Leak Incident Monitoring & Anomaly Radar
- **What is the feature?**: Real-time property-wide leak detection dashboard displaying results from the LightGBM Quantile ML model, highlighting flats with suspected leaks, high anomaly scores, continuous background flows, and unresolved plumbing incidents.
- **Why is it required?**: Eliminates water wastage and alerts management to pipe ruptures or overflowing fixtures before severe structural damage or tenant disputes occur.
- **Who uses it?**: Building Owners (`BUILDING_OWNER`).
- **How does the user access it?**: Navigating to `/owner/leak-monitoring`.
- **What happens when the user performs an action?**:
  1. Dashboard displays radar cards: Total Active Incidents, High Risk Flats, Unresolved Leak Count, Estimated Water Loss (kL).
  2. Tabulated flat-by-flat breakdown showing apartment room number, resident name, recorded units, expected normal range ($q_{10} - q_{90}$), anomaly score ($0.0 - 1.0$), and incident status (`OPEN`, `INVESTIGATING`, `CONFIRMED_LEAK`, `RESOLVED`).
  3. Owner can click an incident to log maintenance notes or mark resolved.
- **Frontend Component**: `frontend/src/owner/pages/OwnerLeakMonitoringPage.jsx`
- **Backend API Called**: `GET /api/leak/owner/incidents/cycle/{cycleId}`, `PUT /api/leak/incidents/{id}/status`
- **Controller & Service**: `OwnerLeakController` $\rightarrow$ `LeakIncidentService` and `LeakDetectionService`
- **Database Operations**:
  - `SELECT * FROM leak_incidents WHERE building_id = ? AND billing_cycle_id = ?`
  - `UPDATE leak_incidents SET status = ?, resolution_notes = ?, resolved_at = NOW() WHERE id = ?`
- **Response Displayed**: Visual risk gauges, severity badges (`CRITICAL`, `WARNING`, `NORMAL`), and incident management modal.

---

### Feature 3.6: Invoices & Dispute-Proof PDF Generation
- **What is the feature?**: Central invoice management module enabling owners to review all generated monthly resident invoices, inspect tiered charge breakdowns, and download printable iText PDF statements.
- **Why is it required?**: Provides legally compliant, dispute-proof utility statements for accounting, property audits, and tenant billing clarity.
- **Who uses it?**: Building Owners (`BUILDING_OWNER`) and Residents (`RESIDENT`).
- **How does the user access it?**: Navigating to `/owner/invoices`.
- **What happens when the user performs an action?**:
  1. Displays filterable list of all cycle invoices by building, status (`PENDING`, `PAID`, `OVERDUE`), or resident name.
  2. Clicking "Download PDF" invokes the backend PDF streaming endpoint.
  3. Backend compiles bill details, resident data, meter delta, and tiered price breakdown into an iText document and streams `application/pdf`.
- **Frontend Component**: `frontend/src/owner/pages/InvoicesPage.jsx`
- **Backend API Called**: `GET /api/invoices/owner/building/{buildingId}`, `GET /api/bills/{billId}/pdf`
- **Controller & Service**: `InvoicesController` and `BillController` $\rightarrow$ `PdfService.generateBillPdf()`
- **Database Operations**: `SELECT * FROM invoices WHERE resident_id = ? AND billing_cycle_id = ?`
- **Response Displayed**: In-browser PDF stream / automatic download of formatted invoice statement.

---

## Module 4: Resident Self-Service Portal

### Feature 4.1: Resident Dashboard & ML Water Consumption Forecasting
- **What is the feature?**: Comprehensive resident dashboard featuring personal monthly consumption overview, active bill status, tiered tariff progress bars, and the **AI Next-Month Consumption & Bill Forecaster** card.
- **Why is it required?**: Empowers residents to monitor their water footprint, anticipate next month's utility costs, and take conservation actions before receiving an unexpected bill.
- **Who uses it?**: Residents (`RESIDENT`).
- **How does the user access it?**: Navigating to `/resident/dashboard`.
- **What happens when the user performs an action?**:
  1. Dashboard loads current month's usage, bill due dates, and alerts.
  2. `<WaterPredictionCard />` automatically calls the forecasting engine.
  3. Spring Boot extracts resident's 3 past consumption periods, calculates trend and moving average, fetches confirmed household size, and queries the Python FastAPI microservice (`POST http://localhost:8000/predict`).
  4. FastAPI applies the Random Forest Regressor to forecast consumption in Litres.
  5. Spring Boot runs the forecasted volume through the active 3-tier tariff engine and returns predicted consumption (kL) and estimated monetary charge ($).
- **Frontend Component**: `frontend/src/resident/pages/ResidentDashboard.jsx` and `WaterPredictionCard.jsx`
- **Backend API Called**: `GET /api/water-prediction/next-month`, `GET /api/resident/dashboard`
- **Controller & Service**: `WaterPredictionController` $\rightarrow$ `WaterPredictionService` $\rightarrow$ `PredictionMlClient`
- **Database Operations**:
  - `SELECT * FROM water_usage WHERE resident_id = ? ORDER BY year DESC, month DESC`
  - `SELECT * FROM apartment_occupancies WHERE resident_id = ? AND status = 'ACTIVE'`
  - `INSERT INTO water_usage_predictions (resident_id, prediction_month, prediction_year, predicted_consumption_litres, estimated_amount, confidence_score) VALUES (...)`
- **Response Displayed**: Visual AI Forecast Card displaying predicted consumption (e.g. `24.5 kL`), estimated bill amount (e.g. `₹ 634.00`), tier distribution, and personalized conservation tips.

---

### Feature 4.2: Resident Leak Alert Center & Feedback Loop
- **What is the feature?**: Interactive leak alert center where residents receive real-time notifications of abnormal water consumption, inspect their ML quantile expected range vs actual consumption, and submit feedback (`CONFIRMED_LEAK`, `FALSE_POSITIVE_GUESTS`, `LEAK_RESOLVED`).
- **Why is it required?**: Engages the resident directly in leak mitigation, provides transparency, and collects ground-truth labels for ML model refinement.
- **Who uses it?**: Residents (`RESIDENT`).
- **How does the user access it?**: Navigating to `/resident/leak-status`.
- **What happens when the user performs an action?**:
  1. Resident reviews the Risk Score Bar and Anomaly Status (`NORMAL`, `SUSPECTED_LEAK`, `CONFIRMED_LEAK`).
  2. If an anomaly exists, clicks "Report / Respond to Alert".
  3. Selects response category:
     - `CONFIRMED_LEAK`: Resident verified a leaking toilet or tap.
     - `FALSE_POSITIVE`: High usage was intentional (e.g. house guests, festival).
     - `PLUMBING_REPAIRED`: Fixture has been fixed.
  4. Enters optional comments and submits.
  5. Backend updates `leak_feedback`, adjusts the `leak_incidents` status, and notifies the building owner.
- **Frontend Component**: `frontend/src/resident/pages/ResidentLeakStatusPage.jsx` and `LeakFeedbackModal.jsx`
- **Backend API Called**: `GET /api/leak/resident/status`, `POST /api/leak/resident/feedback`
- **Controller & Service**: `ResidentLeakAndHouseholdController` $\rightarrow$ `LeakFeedbackService`
- **Database Operations**:
  - `INSERT INTO leak_feedback (incident_id, resident_id, feedback_type, comments, reported_at) VALUES (?, ?, ?, ?, NOW())`
  - `UPDATE leak_incidents SET resident_feedback = ?, status = 'INVESTIGATING' WHERE id = ?`
- **Response Displayed**: Success alert confirming feedback submission and visual update of the incident status pill.

---

### Feature 4.3: Resident Online Bill Settlement Gateway
- **What is the feature?**: Online bill payment portal allowing residents to view pending invoices, inspect tiered breakdowns (Tier 1, Tier 2, Tier 3 charges), simulate instant digital payment, and receive payment receipts.
- **Why is it required?**: Streamlines collections, eliminates manual cash/cheque handling, and provides immediate reconciliation.
- **Who uses it?**: Residents (`RESIDENT`).
- **How does the user access it?**: Navigating to `/resident/bills`.
- **What happens when the user performs an action?**:
  1. Resident selects a `PENDING` bill and clicks "Pay Now".
  2. Payment modal prompts for payment method simulation (Credit/Debit Card, UPI, Net Banking).
  3. Resident clicks "Confirm Payment".
  4. Backend verifies bill status is `PENDING`, updates `bills.status = 'PAID'`, updates corresponding `invoices.status = 'PAID'`, generates a transaction reference, creates a `payments` ledger record, and logs an audit entry.
- **Frontend Component**: `frontend/src/resident/pages/ResidentBillsPage.jsx`
- **Backend API Called**: `POST /api/resident/pay`
- **Controller & Service**: `ResidentController.payBill()` $\rightarrow$ `BillingEngineService.settleBillPayment()`
- **Business Rules & Validations**:
  - Bill must belong to the authenticated resident.
  - Bill status must be `PENDING` or `OVERDUE` (cannot repay a `PAID` bill).
- **Database Operations**:
  - `UPDATE bills SET status = 'PAID', paid_at = NOW() WHERE bill_id = ?`
  - `UPDATE invoices SET status = 'PAID' WHERE id = ?`
  - `INSERT INTO payments (bill_id, resident_id, amount, payment_method, transaction_reference, status, payment_date) VALUES (?, ?, ?, 'ONLINE_SIMULATED', UUID(), 'SUCCESS', NOW())`
- **Response Displayed**: Payment success dialogue with transaction reference number, status transition badge from red `PENDING` to green `PAID`, and one-click PDF receipt download button.

---

### Feature 4.4: Household Occupancy & Away Period Self-Service
- **What is the feature?**: Resident self-service configuration allowing tenants to specify their exact household size (adults and children) and declare planned away periods (vacations/travel).
- **Why is it required?**: Directly informs the ML leak detection model. If a resident registers an away period, any water usage during that window is immediately flagged as a high-confidence leak. Conversely, higher household occupancy prevents false-positive leak warnings.
- **Who uses it?**: Residents (`RESIDENT`).
- **How does the user access it?**: Navigating to `/resident/profile` and opening the Household or Away Period modal.
- **What happens when the user performs an action?**:
  1. Resident clicks "Update Household Size" or "Declare Away Period".
  2. Specifies total occupants or selects start and end travel dates.
  3. Backend updates `apartment_occupancies`, logs a `household_size_history` entry, or creates an `away_periods` record.
- **Frontend Component**: `frontend/src/shared/pages/ProfilePage.jsx`, `HouseholdSizeModal.jsx`, and `AwayPeriodModal.jsx`
- **Backend API Called**: `PUT /api/occupancy/household-size`, `POST /api/occupancy/away-periods`
- **Controller & Service**: `OccupancyController` $\rightarrow$ `OccupancyService` and `AwayPeriodService`
- **Database Operations**:
  - `UPDATE apartment_occupancies SET household_size = ?, children_count = ? WHERE resident_id = ?`
  - `INSERT INTO household_size_history (occupancy_id, previous_size, new_size, reason, changed_at) VALUES (?, ?, ?, 'RESIDENT_SELF_UPDATE', NOW())`
  - `INSERT INTO away_periods (apartment_id, occupancy_id, start_date, end_date, notes) VALUES (?, ?, ?, ?, ?)`
- **Response Displayed**: Toast notification and updated profile badge displaying verified occupancy count.

---

### Feature 4.5: Resident Leak Diagnostics & 3-Quantile Regression Engine (Autonomous AI Pattern Detection)
- **What is the feature?**: Autonomous water anomaly and leak diagnostics dashboard providing multi-quantile consumption corridors ($q_{10}, q_{50}, q_{95}$), pattern diagnosis, and risk scoring ($0\% - 100\%$) without requiring manual feedback.
- **Why is it required?**: Rather than relying on fragile manual feedback forms to adjust models, the system deploys an autonomous **3-Quantile Regression Architecture**:
  1. **Stage 1 (Month 1 - Demographic Baseline)**: Derives the expected consumption band directly from municipal per-capita benchmarks calibrated to the flat's verified household size ($100 / 150 / 250\text{ Liters/person/day} \times 30\text{ days}$). For a 3-person flat, this yields $q_{10} = 9.00\text{ kL}$, $q_{50} = 15.80\text{ kL}$, and $q_{95} = 22.50\text{ kL}$. The UI labels this `Initial Baseline Band (Month 1)` with status `Baseline Profile Building`.
  2. **Stage 2 (Month 2+ - LightGBM Quantile Regression)**: Once consecutive billing cycles exist, the FastAPI LightGBM microservice predicts three distinct percentiles:
     - $q_{10}$: Lower expected consumption threshold.
     - $q_{50}$: Median expected normal consumption.
     - $q_{95}$: Upper anomaly trigger boundary.
  3. **Autonomous Usage Pattern Detection**: Classifies consumption behavior into `NORMAL`, `SUDDEN_SPIKE`, `GRADUAL_DRIFT`, `STEP_CHANGE`, or `AWAY_USAGE` based on time-series telemetry and away periods.
- **Who uses it?**: Residents (`RESIDENT`) and Building Owners (`BUILDING_OWNER`).
- **How does the user access it?**: Navigating to `/resident/leak-status` or `/owner/leak-monitoring`.
- **What happens when the user performs an action?**:
  1. Component calls `GET /api/resident/leak-status`.
  2. `LeakReportService` resolves usage metrics, quantile bounds ($q_{10}, q_{50}, q_{95}$), pattern diagnosis, and risk score.
  3. Recharts renders the full quantile envelope with Lower Limit, Median Normal, and Upper Limit lines.
- **Frontend Component**: `frontend/src/resident/pages/ResidentLeakStatusPage.jsx` and `frontend/src/shared/components/UsageRangeChart.jsx`
- **Backend API Called**: `GET /api/resident/leak-status`, `POST /api/resident/household/confirm`
- **Controller & Service**: `ResidentController` $\rightarrow$ `LeakReportService` and `LeakDetectionService`
- **Database Operations**:
  - `SELECT * FROM water_usage WHERE meter_id = ? ORDER BY year DESC, month DESC`
  - `SELECT * FROM apartment_occupancies WHERE resident_id = ?`
- **Response Displayed**: Clear status banner (`Baseline Profile Building` or `Potential Leak`), metric cards (`Initial Baseline Band: 9.00 – 22.50 kL`, `Expected Normal (q50): 15.80 kL`), Recharts interactive corridor chart with 3-quantile boundaries, and leak troubleshooting checklists.
