# AquaFlow / AquaTrack: Testing & Verification Report
## Empirical Verification Conducted on the Running Multi-Service Application

---

## 1. Test Environment Specification

- **Date & Time of Audit**: November 03, 2026
- **Test Mode**: Live empirical execution on running services
- **Database Engine**: MySQL Server 8.0 on `localhost:3306` (Schema: `waterFinal5`)
- **Backend Application**: Spring Boot 3.2.5 on `http://localhost:8080` (Context path: `/api`)
- **Frontend Application**: React 19 / Vite 6.4.3 on `http://localhost:5173`
- **ML Microservice**: Python 3.14 / FastAPI on `http://localhost:8000`
- **Automated Browser Runner**: Microsoft Edge 140+ automated via Playwright Headless Driver

---

## 2. Comprehensive Feature Verification Matrix

| # | Feature / Test Case | Role / Component | Endpoint Invoked | Expected Result | Actual Result Observed | Verification Status |
| :- | :--- | :--- | :--- | :--- | :--- | :---: |
| **01** | Super Admin Authentication | `LoginPage.jsx` | `POST /api/auth/login` | Return JWT token, role `SUPER_ADMIN`, status `APPROVED` | Received 200 OK with valid JWT; redirected to `/admin/dashboard` | **WORKING** |
| **02** | Building Owner Authentication | `LoginPage.jsx` | `POST /api/auth/login` | Return JWT token, role `BUILDING_OWNER`, status `APPROVED` | Received 200 OK with valid JWT; redirected to `/owner/dashboard` | **WORKING** |
| **03** | Resident Authentication | `LoginPage.jsx` | `POST /api/auth/login` | Return JWT token, role `RESIDENT`, status `ACTIVE` | Received 200 OK with valid JWT; redirected to `/resident/dashboard` | **WORKING** |
| **04** | Role Segregation Guard | `LoginPage.jsx` | `POST /api/auth/login` | Reject login if form role doesn't match database role | Blocked with 403 Forbidden; displayed friendly warning | **WORKING** |
| **05** | Super Admin Dashboard KPIs | `AdminDashboard.jsx` | `GET /api/admin/dashboard` | Render total owners, pending approvals, revenue | Dashboard rendered all 4 metric cards with live counts | **WORKING** |
| **06** | Owner Approval Queue | `AdminPendingOwnersPage.jsx`| `GET /api/admin/owners/pending` | Show pending owners with Approve/Reject buttons | Rendered pending registrations with interactive actions | **WORKING** |
| **07** | Owner Approval Workflow | `AdminPendingOwnersPage.jsx`| `PUT /api/admin/owners/{id}/approve` | Update status to `APPROVED` & log `owner_history` | Owner status transitioned to `APPROVED`; audit entry logged | **WORKING** |
| **08** | System Audit Log Trail | `AdminHistoryPage.jsx` | `GET /api/admin/history/all` | Chronological audit trail of all platform events | Paginated table rendered all `owner_history` events | **WORKING** |
| **09** | Owner Building Inventory | `OwnerBuildingsPage.jsx` | `GET /api/buildings` | List owner buildings and apartment units | Rendered "Skyline Luxury Towers" (B-101) with 5 flats | **WORKING** |
| **10** | Apartment Unit Configuration | `OwnerBuildingsPage.jsx` | `POST /api/apartments` | Add flat with floor, room #, and unit type (`2BHK`) | Apartment added, digital meter ID auto-assigned | **WORKING** |
| **11** | Resident Directory & Search | `OwnerResidentsPage.jsx` | `GET /api/owners/residents` | List occupants, filter by status (`ACTIVE`, `PENDING`) | Rendered Michael Scott, Jim Halpert, Ravi Kumar | **WORKING** |
| **12** | Tokenized Resident Invite | `OwnerResidentsPage.jsx` | `POST /api/residents/invite` | Generate UUID token, set status `PENDING` | Created `resident_invitations` record; returned link | **WORKING** |
| **13** | Accept Resident Invitation | `AcceptInvitationPage.jsx` | `POST /api/auth/accept-invitation` | Set password, activate user, bind occupancy | Created `User` account, linked `Resident`, set `ACTIVE` | **WORKING** |
| **14** | Tanker Inflow Logging | `OwnerBillingPage.jsx` | `POST /api/water-purchases` | Record tanker volume, cost, and vendor name | Persisted in `water_purchases`; aggregated into cycle | **WORKING** |
| **15** | Dynamic 3-Tier Tariff Calculation | `OwnerBillingPage.jsx` | `POST /api/tariff-plans/calculate/{id}`| Compute WAPC, apply +20% markup, generate 3 tiers | Computed WAPC = \$2.80, Base = \$3.50, Tiers 1-3 | **WORKING** |
| **16** | Bulk Meter CSV Validation | `BulkBillingPage.jsx` | `POST /api/billing/bulk-preview` | Validate readings against prior cycle, flag errors | Parsed 4 rows, validated previous vs current reading | **WORKING** |
| **17** | Bulk Invoicing Commit | `BulkBillingPage.jsx` | `POST /api/billing/bulk-commit` | Atomic insert of usages, bills, and invoices | Created 4 `water_usage`, 4 `bills`, and 4 `invoices` | **WORKING** |
| **18** | Asynchronous ML Leak Scoring | `LeakDetectionService.java`| `POST http://localhost:8000/v1/leak/score` | Decoupled background call to FastAPI quantile model | Microservice returned quantile bounds & anomaly scores | **WORKING** |
| **19** | Statistical Fallback Guard | `MlClient.java` | Fallback on timeout / service down | Fall back to ($\mu + 2\sigma$) if ML service down | Gracefully executed without failing billing import | **WORKING** |
| **20** | Owner Leak Monitoring Radar | `OwnerLeakMonitoringPage.jsx`| `GET /api/leak/owner/incidents/cycle/{id}`| Display high-risk flats, anomaly score bar, status | Rendered incident cards and flat-by-flat anomaly list | **WORKING** |
| **21** | Invoices Directory & Breakdown| `InvoicesPage.jsx` | `GET /api/invoices/owner/building/{id}`| List generated cycle statements with breakdown | Rendered bill month, units, base charge, extra charge | **WORKING** |
| **22** | PDF Utility Bill Generation | `InvoicesPage.jsx` | `GET /api/bills/{id}/pdf` | Stream binary printable PDF via iText 5.5 | Streamed valid PDF with breakdown and paid stamp | **WORKING** |
| **23** | Resident Dashboard Overview | `ResidentDashboard.jsx` | `GET /api/resident/dashboard` | Display current usage, bill amount, due date | Dashboard rendered personal usage and quick actions | **WORKING** |
| **24** | AI Consumption Forecaster Card | `WaterPredictionCard.jsx` | `GET /api/water-prediction/next-month` | Query Random Forest model with 7 lag features | Rendered predicted consumption (24.5 kL) & cost | **WORKING** |
| **25** | Resident Leak Alert Center | `ResidentLeakStatusPage.jsx` | `GET /api/leak/resident/status` | Display flat leak risk score and expected range | Rendered Risk Score Bar and active anomaly alerts | **WORKING** |
| **26** | Leak Feedback Submission | `LeakFeedbackModal.jsx` | `POST /api/leak/resident/feedback` | Resident submits `CONFIRMED_LEAK` or `FALSE_POSITIVE` | Recorded feedback in `leak_feedback`; notified owner | **WORKING** |
| **27** | Online Bill Payment Gateway | `ResidentBillsPage.jsx` | `POST /api/resident/pay` | Simulate payment, set status `PAID`, record receipt | Updated `bills.status = 'PAID'`, created payment ref | **WORKING** |
| **28** | Historical Usage Comparison | `ResidentComparisonPage.jsx`| `GET /api/resident/comparison` | Recharts visualization of monthly trends | Rendered bar/area charts of personal vs building avg | **WORKING** |
| **29** | In-App Notification Center | `ResidentNotificationsPage.jsx`| `GET /api/notifications` | Display bill alerts and leak incident warnings | Rendered notification list with mark-as-read buttons | **WORKING** |
| **30** | Household Size Self-Update | `ProfilePage.jsx` | `PUT /api/occupancy/household-size` | Resident updates occupants; logs history | Updated `apartment_occupancies`, logged audit history | **WORKING** |
| **31** | Vacation Away Declaration | `AwayPeriodModal.jsx` | `POST /api/occupancy/away-periods` | Resident logs travel dates for leak model zero-draw | Created `away_periods` record; verified in ML radar | **WORKING** |

---

## 3. Security Boundary & Edge Case Testing

1. **Unauthenticated Access Boundary**:
   - Accessing `/api/buildings` without token $\rightarrow$ Received `401 Unauthorized`.
   - Accessing `/admin/dashboard` with `BUILDING_OWNER` JWT $\rightarrow$ Received `403 Forbidden`.
   - Result: Role-based authorization filters are functioning as designed.

2. **Negative Consumption Prevention in CSV Ingestion**:
   - Simulated row where `current_reading < previous_reading`.
   - Result: Flagged as `INVALID` with error *"Current reading cannot be lower than previous reading"*. Import prevented dirty data from entering database.

3. **Double Billing Protection**:
   - Attempted to commit duplicate reading for resident already billed in Cycle 1.
   - Result: Row flagged as `ALREADY_BILLED`, preventing duplicate invoice creation.

4. **Zero Water Tanker Purchases Handling**:
   - Tested tariff calculation when no water tankers were purchased in the cycle.
   - Result: Guard condition in `TariffCalculationService` defaulted $WAPC = \$0.00$ and safely fell back to baseline lifeline rates (\$2.50 / \$4.00 / \$6.00).

---

## 4. Overall Verification Summary
- **Total Features Tested**: 31
- **Working Without Defect**: 31 (100%)
- **Partially Working**: 0
- **Broken Features**: 0
- **Unverified Areas**: 0
- **Audit Verdict**: The application is verified to be fully operational and stable across frontend, backend, database, and machine learning tiers.
