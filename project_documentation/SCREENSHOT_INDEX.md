# AquaFlow / AquaTrack: Screenshot Catalog & Visual Index

This index catalogs all **31 authentic high-resolution screenshots** captured directly from the live, running instance of the application at `http://localhost:5173`.

---

## 1. Public & Authentication Screenshots (`screenshots/public/`)

| # | Filename | Relative Path | Target Route | Role Context | Key Visual & Functional Elements Displayed | Relevant PPT Slide |
| :- | :--- | :--- | :--- | :--- | :--- | :---: |
| **01** | `01_landing_page.png` | `project_documentation/screenshots/public/01_landing_page.png` | `/` | Anonymous | Modern landing hero banner, value proposition, feature grid, architecture badges, call-to-action buttons. | **Slide 1** |
| **02** | `02_login_page_superadmin.png` | `project_documentation/screenshots/public/02_login_page_superadmin.png` | `/login` | Public / Admin | 3-Role selector card with "Super Admin" active, system admin credential input fields, security badges. | **Slide 4** |
| **03** | `03_login_page_owner.png` | `project_documentation/screenshots/public/03_login_page_owner.png` | `/login` | Public / Owner | 3-Role selector card with "Building Owner" active, property manager subtitle, "Register Property" link. | **Slide 4** |
| **04** | `04_login_page_resident.png` | `project_documentation/screenshots/public/04_login_page_resident.png` | `/login` | Public / Resident | 3-Role selector card with "Resident" active, tenant login fields, "Create Resident Account" link. | **Slide 4** |
| **05** | `05_register_owner.png` | `project_documentation/screenshots/public/05_register_owner.png` | `/register-owner` | Prospective Owner | Owner self-registration form: property company name, email, phone, password, terms and conditions. | **Slide 5** |
| **06** | `06_register_resident.png` | `project_documentation/screenshots/public/06_register_resident.png` | `/register-resident` | Prospective Resident | Resident self-registration interface with notice directing users to request owner invitations. | **Slide 7** |
| **07** | `07_accept_invitation.png` | `project_documentation/screenshots/public/07_accept_invitation.png` | `/accept-invitation` | Invited Resident | Tokenized invitation acceptance form, password establishment, account activation button. | **Slide 7** |

---

## 2. Super Administrator Portal Screenshots (`screenshots/superadmin/`)

| # | Filename | Relative Path | Target Route | Role Context | Key Visual & Functional Elements Displayed | Relevant PPT Slide |
| :- | :--- | :--- | :--- | :--- | :--- | :---: |
| **08** | `01_admin_dashboard.png` | `project_documentation/screenshots/superadmin/01_admin_dashboard.png` | `/admin/dashboard` | Super Admin | 4 Executive stat cards (Total Owners, Pending Approvals, Total Buildings, Revenue), quick action panel. | **Slide 5** |
| **09** | `02_admin_owners_directory.png`| `project_documentation/screenshots/superadmin/02_admin_owners_directory.png` | `/admin/owners` | Super Admin | Full directory of property owners, contact details, properties count, approval status badges. | **Slide 5** |
| **10** | `03_admin_pending_approvals.png`| `project_documentation/screenshots/superadmin/03_admin_pending_approvals.png` | `/admin/pending-owners` | Super Admin | Pending owner verification queue, property details review, green Approve & red Reject buttons. | **Slide 5** |
| **11** | `04_admin_audit_history.png` | `project_documentation/screenshots/superadmin/04_admin_audit_history.png` | `/admin/history` | Super Admin | System-wide audit trail table, actor identifiers, event types (`OWNER_REGISTERED`, `OWNER_APPROVED`), timestamps. | **Slide 5** |
| **12** | `05_admin_profile.png` | `project_documentation/screenshots/superadmin/05_admin_profile.png` | `/admin/profile` | Super Admin | Super administrator account settings, security credentials, contact details. | **Slide 5** |

---

## 3. Building Owner & Property Management Screenshots (`screenshots/owner/`)

| # | Filename | Relative Path | Target Route | Role Context | Key Visual & Functional Elements Displayed | Relevant PPT Slide |
| :- | :--- | :--- | :--- | :--- | :--- | :---: |
| **13** | `01_owner_dashboard.png` | `project_documentation/screenshots/owner/01_owner_dashboard.png` | `/owner/dashboard` | Building Owner | Property manager dashboard: total buildings, flats, occupancy rate, current cycle status, collections. | **Slide 6** |
| **14** | `02_owner_buildings_flats.png`| `project_documentation/screenshots/owner/02_owner_buildings_flats.png` | `/owner/buildings` | Building Owner | Building inventory accordion, flat cards, floor numbers, unit type badges (`2BHK`), sub-meter links. | **Slide 6** |
| **15** | `03_owner_residents_invitations.png`| `project_documentation/screenshots/owner/03_owner_residents_invitations.png`| `/owner/residents` | Building Owner | Resident directory, apartment badges, invitation status chips (`PENDING`, `ACCEPTED`), invite modal button. | **Slide 7** |
| **16** | `04_owner_meter_readings.png` | `project_documentation/screenshots/owner/04_owner_meter_readings.png` | `/owner/usage` | Building Owner | Individual meter reading logging interface, previous reading display, current reading input, consumption delta. | **Slide 9** |
| **17** | `05_owner_usage_comparison.png`| `project_documentation/screenshots/owner/05_owner_usage_comparison.png` | `/owner/usage-comparison` | Building Owner | Recharts visual analytics comparing water consumption across flats, floors, and billing cycles. | **Slide 9** |
| **18** | `06_owner_billing_tariff_engine.png`| `project_documentation/screenshots/owner/06_owner_billing_tariff_engine.png`| `/owner/billing` | Building Owner | Tanker purchase logs, WAPC calculator, society markup input, 3-tier tariff preview cards. | **Slide 8** |
| **19** | `07_owner_bulk_billing_csv.png`| `project_documentation/screenshots/owner/07_owner_bulk_billing_csv.png` | `/owner/bulk-billing` | Building Owner | Batch CSV uploader, server-side pre-validation table, error badges, revenue estimation preview. | **Slide 9** |
| **20** | `08_owner_invoices_management.png`| `project_documentation/screenshots/owner/08_owner_invoices_management.png` | `/owner/invoices` | Building Owner | Itemized invoices directory, status badges (`PENDING`, `PAID`), tiered charge breakdown, PDF download. | **Slide 11** |
| **21** | `09_owner_leak_incident_monitoring.png`| `project_documentation/screenshots/owner/09_owner_leak_incident_monitoring.png`| `/owner/leak-monitoring`| Building Owner | Real-time ML leak radar: 3-quantile regression limits (q10, q50, q95), risk score meter, pattern diagnosis. | **Slide 10** |
| **22** | `10_owner_audit_history.png` | `project_documentation/screenshots/owner/10_owner_audit_history.png` | `/owner/history` | Building Owner | Property-level audit log: resident invitations dispatched, bills committed, tanker purchases logged. | **Slide 5** |
| **23** | `11_owner_profile.png` | `project_documentation/screenshots/owner/11_owner_profile.png` | `/owner/profile` | Building Owner | Property manager profile, contact phone, managed complex portfolio. | **Slide 6** |

---

## 4. Resident Self-Service Portal Screenshots (`screenshots/resident/`)

| # | Filename | Relative Path | Target Route | Role Context | Key Visual & Functional Elements Displayed | Relevant PPT Slide |
| :- | :--- | :--- | :--- | :--- | :--- | :---: |
| **24** | `01_resident_dashboard.png` | `project_documentation/screenshots/resident/01_resident_dashboard.png` | `/resident/dashboard` | Resident | Tenant dashboard: current month usage, bill due dates, active notifications, quick pay button. | **Slide 12** |
| **25** | `02_resident_ml_prediction_card.png`| `project_documentation/screenshots/resident/02_resident_ml_prediction_card.png`| `/resident/dashboard` | Resident | **AI Water Usage Forecast Card**: predicted consumption (kL), estimated bill amount, tier progression, saving tips. | **Slide 12** |
| **26** | `03_resident_leak_alert_center.png` | `project_documentation/screenshots/resident/03_resident_leak_alert_center.png` | `/resident/leak-status` | Resident | Resident leak center: 3-quantile regression limits (q10, q50, q95), zero feedback overhead, 0% risk. | **Slide 13** |
| **27** | `03b_resident_leak_chart_hover.png` | `project_documentation/screenshots/resident/03b_resident_leak_chart_hover.png` | `/resident/leak-status` | Resident | Tooltip inspection: shows Actual (88 kL) vs. q10 (9.00 kL), q50 (15.80 kL), q95 (22.50 kL), Pattern: NORMAL. | **Slide 13** |
| **28** | `04_resident_bills_payment.png` | `project_documentation/screenshots/resident/04_resident_bills_payment.png` | `/resident/bills` | Resident | Utility billing statement view, status chips (`PENDING`, `PAID`), "Pay Now" modal trigger, PDF invoice download. | **Slide 14** |
| **29** | `05_resident_usage_comparison.png` | `project_documentation/screenshots/resident/05_resident_usage_comparison.png` | `/resident/comparison` | Resident | Recharts interactive analytics comparing personal monthly consumption against the residential building average. | **Slide 12** |
| **30** | `06_resident_notification_center.png`| `project_documentation/screenshots/resident/06_resident_notification_center.png`| `/resident/notifications`| Resident | System notification center: bill generated alerts, payment receipts, leak incident warnings. | **Slide 13** |
| **31** | `07_resident_profile.png` | `project_documentation/screenshots/resident/07_resident_profile.png` | `/resident/profile` | Resident | Resident profile: confirmed household size, children count, "Declare Away Period" vacation calendar. | **Slide 12** |
