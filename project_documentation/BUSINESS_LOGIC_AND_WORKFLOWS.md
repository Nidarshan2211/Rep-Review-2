# AquaFlow / AquaTrack: Business Logic, Algorithms & Workflow Diagrams

---

## 1. Authentication & Role-Based Authorization Workflow

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Browser
    participant UI as React Frontend (LoginPage.jsx)
    participant AuthCtrl as AuthController
    participant AuthSvc as AuthService
    participant SpringSec as Spring Security (AuthenticationManager)
    participant UserRepo as UserRepository
    participant JWT as JwtUtils

    User->>UI: Selects Role (e.g. BUILDING_OWNER), Enters Email & Password
    UI->>AuthCtrl: POST /api/auth/login { email, password, role }
    AuthCtrl->>AuthSvc: authenticateUser(request)
    AuthSvc->>SpringSec: authenticate(UsernamePasswordAuthenticationToken)
    SpringSec->>UserRepo: findByEmail(email)
    UserRepo-->>SpringSec: User Entity (BCrypt hashed password, Role, Status)
    
    alt Password Mismatch
        SpringSec-->>AuthSvc: BadCredentialsException
        AuthSvc-->>UI: HTTP 401 Unauthorized ("Invalid credentials")
    else Account Status == PENDING / REJECTED
        AuthSvc-->>UI: HTTP 403 Forbidden ("Account is pending approval")
    else Role Mismatch
        AuthSvc-->>UI: HTTP 403 Forbidden ("Role mismatch for selected portal")
    else Credentials & Status Valid
        AuthSvc->>JWT: generateJwtToken(authentication)
        JWT-->>AuthSvc: Signed JWT Bearer Token (24h validity)
        AuthSvc-->>UI: HTTP 200 OK (token, userId, role, name, status)
        UI->>UI: Persist in localStorage, Set AuthContext
        UI->>User: Redirect to Role-specific Dashboard
    end
```

---

## 2. Tokenized Resident Invitation & Onboarding Lifecycle

```mermaid
flowchart TD
    Start([Owner Initiates Invitation]) --> Step1[Owner selects Building & Apartment]
    Step1 --> Step2[Enters Resident Name, Email & Phone]
    Step2 --> PostReq[POST /api/residents/invite]
    PostReq --> CheckOccupancy{Apartment currently occupied?}
    
    CheckOccupancy -- Yes --> ErrOcc[Throw 400 Bad Request: Flat Already Occupied]
    CheckOccupancy -- No --> GenToken[Generate Cryptographic UUID Token]
    
    GenToken --> SaveInvite[INSERT resident_invitations: status = PENDING, expires_at = +7 Days]
    SaveInvite --> SaveRes[INSERT residents: invitation_status = PENDING, account_status = INACTIVE]
    SaveRes --> LogAudit[INSERT resident_history: RESIDENT_INVITED]
    LogAudit --> ReturnLink[Return Tokenized URL: /accept-invitation?token=UUID]
    
    ReturnLink --> EmailSim[Email dispatched to Resident Inbox]
    EmailSim --> ResClicks[Resident opens link in browser]
    ResClicks --> GetDetails[GET /api/residents/invitation-details?token=UUID]
    GetDetails --> ShowReview[UI displays Building, Flat #, and Unit Type]
    
    ShowReview --> ResInputs[Resident sets password & clicks Confirm]
    ResInputs --> PostAccept[POST /api/auth/accept-invitation]
    
    PostAccept --> CheckExpiry{Token valid & unexpired?}
    CheckExpiry -- Expired/Invalid --> ErrExp[Throw 400: Invitation Expired]
    CheckExpiry -- Valid --> CreateUser[INSERT users: role = RESIDENT, status = ACTIVE]
    CreateUser --> LinkRes[UPDATE residents: user_id = user.id, status = ACTIVE, accepted_at = NOW()]
    LinkRes --> UpdateInvite[UPDATE resident_invitations: status = ACCEPTED]
    UpdateInvite --> CreateOcc[INSERT apartment_occupancies: status = ACTIVE, start_date = NOW()]
    CreateOcc --> IssueJWT[Generate JWT Session Token]
    IssueJWT --> Finish([Resident redirected to Resident Dashboard])
```

---

## 3. Dynamic Tanker Procurement Tariff Plan Engine

### 3.1 Business Algorithm & Mathematical Formulation
Traditional water billing systems utilize static rates that fail to reflect fluctuating water tanker procurement expenses. AquaFlow introduces a dynamic, formulaic tariff engine.

#### Step 1: Aggregate Cycle Procurement
During an active billing cycle $C$, multiple water tanker purchases $P_1, P_2, \dots, P_n$ are recorded:
$$\text{Total Volume } (V_{\text{total}}) = \sum_{i=1}^{n} \text{Volume}_i \quad (\text{in Litres or kL})$$
$$\text{Total Procurement Cost } (K_{\text{total}}) = \sum_{i=1}^{n} \text{TotalCost}_i \quad (\text{in Currency Units})$$

#### Step 2: Weighted Average Procurement Cost ($WAPC$)
$$WAPC = \begin{cases} 
\frac{K_{\text{total}}}{V_{\text{total}}}, & \text{if } V_{\text{total}} > 0 \\
0.00, & \text{if zero tanker purchases}
\end{cases}$$

#### Step 3: Base Tariff with Society Maintenance Markup
Building owners define a society maintenance markup percentage $M$ (default $20.0\%$):
$$\text{Markup Multiplier} = 1 + \frac{M}{100}$$
$$\text{Base Tariff} = WAPC \times \text{Markup Multiplier}$$

#### Step 4: Tier Multipliers & Bracket Apportioning
To incentivize water conservation, progressive consumption multipliers are applied:
- **Tier 1 (Base Lifeline: $0 - 20\text{ kL}$)**: Multiplier $= 1.00 \times \text{Base Tariff}$ (Fallback floor: \$2.50 / kL)
- **Tier 2 (Standard Usage: $21 - 40\text{ kL}$)**: Multiplier $= 1.25 \times \text{Base Tariff}$ (Fallback floor: \$4.00 / kL)
- **Tier 3 (High Consumption: $41+\text{ kL}$)**: Multiplier $= 1.50 \times \text{Base Tariff}$ (Fallback floor: \$6.00 / kL)

```mermaid
flowchart LR
    Purchases["Tanker Inflows\n(Cauvery Tankers: 12,000L @ $600\nAquaPure: 15,000L @ $750)"] --> WAPC["Calculate WAPC\nTotal Cost / Total Volume\n= $0.05 / L ($50 / kL)"]
    WAPC --> Markup["Apply Society Markup\n+20% Operational Cost"]
    Markup --> Base["Base Tariff Determined\n$60.00 / kL"]
    Base --> Tier1["Tier 1 (0 - 20 kL)\n1.0x Base = $60.00/kL"]
    Base --> Tier2["Tier 2 (21 - 40 kL)\n1.25x Base = $75.00/kL"]
    Base --> Tier3["Tier 3 (41+ kL)\n1.50x Base = $90.00/kL"]
```

---

## 4. Automated Bulk Billing & CSV Ingestion Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Building Owner
    participant UI as React UI (BulkBillingPage.jsx)
    participant Ctrl as BulkBillingController
    participant Svc as BulkBillingService
    participant Csv as CsvHelper
    participant DB as MySQL Database
    participant ML as LeakDetectionService (Async)

    Owner->>UI: Uploads Meter Reading CSV File
    Owner->>UI: Clicks "Preview & Validate"
    UI->>Ctrl: POST /api/billing/bulk-preview (Multipart CSV, Cycle ID)
    Ctrl->>Svc: previewBulkReadings(file, cycleId)
    Svc->>Csv: parseCsv(file)
    Csv-->>Svc: List<List<String>> rows
    
    loop For each apartment row
        Svc->>Svc: Verify resident_id exists in building
        Svc->>Svc: Check for duplicate row in same CSV
        Svc->>DB: Query getTrustedPreviousReading(meterId, cycleId)
        DB-->>Svc: Previous Reading (e.g. 100.0)
        Svc->>Svc: Calculate Delta = CurrentReading - PreviousReading
        alt CurrentReading < PreviousReading
            Svc->>Svc: Mark Status = INVALID (Negative Consumption)
        else Resident Already Billed in Cycle
            Svc->>Svc: Mark Status = ALREADY_BILLED
        else Valid Reading
            Svc->>Svc: Calculate Estimated Slab Charges (Tiers 1, 2, 3)
            Svc->>Svc: Mark Status = VALID
        end
    end
    
    Svc-->>Ctrl: BulkReadingUploadResponse (Summary counts & preview rows)
    Ctrl-->>UI: HTTP 200 OK (Render validation grid & review modal)
    
    Owner->>UI: Clicks "Commit & Generate Invoices"
    UI->>Ctrl: POST /api/billing/bulk-commit (Cycle ID, Valid Rows)
    Ctrl->>Svc: commitBulkReadings(cycleId, rows)
    
    rect rgb(240, 248, 255)
        note right of Svc: ATOMIC TRANSACTION START
        Svc->>DB: Batch INSERT into water_usage
        Svc->>DB: Batch INSERT into bills (Tiered amounts, status = PENDING)
        Svc->>DB: Batch INSERT into invoices (status = PENDING, due_date)
        Svc->>DB: Batch INSERT into notifications (Resident bill alerts)
        note right of Svc: ATOMIC TRANSACTION COMMIT
    end
    
    Svc->>ML: scoreBillingCycleAsync(buildingId, cycleId) (Decoupled Background Task)
    Svc-->>Ctrl: Batch Success Summary
    Ctrl-->>UI: HTTP 200 OK
    UI->>Owner: Display Confirmation & Direct Links to Generated Invoices
```

---

## 5. Machine Learning Quantile Leak Anomaly Radar

### 5.1 Quantile Anomaly Formulation
The LightGBM quantile regression engine predicts conditional consumption distributions:
- $q_{0.10}(x)$: Expected lower consumption bound.
- $q_{0.50}(x)$: Expected median consumption for the household.
- $q_{0.90}(x)$: Expected upper consumption boundary given household parameters.

Feature vector $x$:
$$x = [\text{HouseholdSize}, \text{AwayDays}, \text{UnitTypeFloorFactor}, \text{Lag1Usage}, \text{Lag2Usage}, \text{Avg3Rolling}, \text{PerCapitaConsumption}]$$

If actual units $U$ exceed the upper quantile boundary $q_{0.90}$:
$$\text{Anomaly Score } S = \min\left(1.0, \frac{U - q_{0.90}}{\max(q_{0.90} - q_{0.50}, 1.0)}\right)$$

```mermaid
stateDiagram-v2
    [*] --> IngestReading: Meter Reading Logged
    
    IngestReading --> FeatureExtraction: Extract Occupancy, Away Days & Lag Features
    FeatureExtraction --> FastAPIQuery: POST /v1/leak/score (Batch Request)
    
    state FastAPIQuery {
        [*] --> CheckAPIKey: Verify X-API-Key
        CheckAPIKey --> EvalQuantiles: LightGBM q10, q50, q90 Regressors
        EvalQuantiles --> ComputeScore: Anomaly Score S Formulation
        ComputeScore --> [*]
    }
    
    FastAPIQuery --> ScoreEvaluation: Receive Anomaly Scores & Expected Range
    
    ScoreEvaluation --> NormalUsage: S < 0.50
    ScoreEvaluation --> SuspectedLeak: 0.50 <= S < 0.75
    ScoreEvaluation --> ConfirmedLeak: S >= 0.75
    
    NormalUsage --> SaveDB: Update water_usage (anomaly_status = NORMAL)
    
    SuspectedLeak --> CreateIncident: Create leak_incidents (SEVERITY_MEDIUM)
    ConfirmedLeak --> CreateIncident: Create leak_incidents (SEVERITY_HIGH)
    
    CreateIncident --> DispatchAlert: AlertEngine dispatches In-App & Email Warnings
    DispatchAlert --> ResidentReview: Resident opens /resident/leak-status
    
    ResidentReview --> ResidentFeedback: Submits LeakFeedbackModal
    ResidentFeedback --> OwnerNotified: Owner investigates & coordinates repair
    OwnerNotified --> IncidentResolved: Owner marks incident RESOLVED
    IncidentResolved --> [*]
```

---

## 6. AI Next-Month Consumption & Cost Forecasting Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Resident as Resident Tenant
    participant Card as WaterPredictionCard.jsx
    participant Ctrl as WaterPredictionController
    participant Svc as WaterPredictionService
    participant DB as MySQL Database
    participant FastAPIEngine as FastAPI Microservice (:8000 /predict)
    participant TariffSvc as TariffCalculationService

    Resident->>Card: Opens Resident Dashboard (/resident/dashboard)
    Card->>Ctrl: GET /api/water-prediction/next-month (Bearer Token)
    Ctrl->>Svc: predictNextMonthBill(userEmail)
    Svc->>DB: Resolve Resident & Active ApartmentOccupancy
    DB-->>Svc: Resident Profile, Confirmed Household Size (e.g. 3)
    Svc->>DB: Query 3 Past Water Usages (lag1, lag2, lag3)
    DB-->>Svc: Usage Records (e.g. 95 kL, 88 kL, 102 kL)
    
    Svc->>Svc: Compute 7 Lag Features in Litres (lag1, lag2, lag3, avg3, trend, household_size, target_month)
    Svc->>FastAPIEngine: POST /predict { resident_id, lag1_litres, lag2_litres, ..., household_size }
    FastAPIEngine->>FastAPIEngine: Random Forest Regressor Inference
    FastAPIEngine-->>Svc: { predicted_consumption_litres: 24500 L, model_version: "v1.0.0" }
    
    Svc->>Svc: Convert Litres to Units: 24.50 kL
    Svc->>TariffSvc: Get Active Tariff Plan for next cycle
    TariffSvc-->>Svc: Tier 1 ($2.50), Tier 2 ($4.00), Tier 3 ($6.50)
    Svc->>Svc: Apportion 24.50 kL across Slabs:
    Note over Svc: Tier 1 (20 kL * $2.50 = $50.00)<br/>Tier 2 (4.5 kL * $4.00 = $18.00)<br/>Fixed Charge: $10.00<br/>Total Estimated: $78.00
    
    Svc->>DB: Cache record in water_usage_predictions
    Svc-->>Ctrl: PredictionResponse (Units, Amount, Tier Breakdown, Tips)
    Ctrl-->>Card: HTTP 200 OK
    Card->>Resident: Renders Interactive Gauge, Cost Forecast, and Savings Tips
```

---

## 7. Online Bill Payment & PDF Invoice Settlement Flow

```mermaid
sequenceDiagram
    autonumber
    actor Resident as Resident
    participant UI as ResidentBillsPage.jsx
    participant ResCtrl as ResidentController
    participant BillSvc as BillingEngineService
    participant DB as MySQL Database
    participant PdfEngine as PdfService (iText)

    Resident->>UI: Views Bills, clicks "Pay Now" on Pending Bill #101
    UI->>UI: Displays Payment Modal with Amount & Payment Methods
    Resident->>UI: Confirms Payment (Simulated Gateway)
    UI->>ResCtrl: POST /api/resident/pay { billId: 101, paymentMethod: "ONLINE_CARD" }
    
    ResCtrl->>BillSvc: settleBillPayment(residentId, billId, method)
    BillSvc->>DB: SELECT * FROM bills WHERE bill_id = 101
    
    rect rgb(245, 255, 250)
        note right of BillSvc: PAYMENT SETTLEMENT TRANSACTION
        BillSvc->>DB: UPDATE bills SET status = 'PAID', paid_at = NOW() WHERE bill_id = 101
        BillSvc->>DB: UPDATE invoices SET status = 'PAID' WHERE resident_id = ? AND cycle_id = ?
        BillSvc->>DB: INSERT INTO payments (bill_id, resident_id, amount, status, txn_ref, payment_date)
        BillSvc->>DB: INSERT INTO resident_history (activity_type = 'BILL_PAID')
        note right of BillSvc: TRANSACTION COMMITTED
    end
    
    BillSvc-->>ResCtrl: PaymentConfirmationDTO (txnRef, paidAt, status: "SUCCESS")
    ResCtrl-->>UI: HTTP 200 OK
    UI->>Resident: Display Success Toast with Transaction Reference & "Download Receipt"
    
    Resident->>UI: Clicks "Download PDF Invoice"
    UI->>ResCtrl: GET /api/bills/101/pdf
    ResCtrl->>PdfEngine: generateBillPdf(billId)
    PdfEngine->>DB: Fetch bill, meter reading, resident name, building details
    PdfEngine->>PdfEngine: Render Header, Customer Info, Meter Readings Table, Tier Charges, Paid Stamp
    PdfEngine-->>ResCtrl: byte[] PDF Stream (application/pdf)
    ResCtrl-->>UI: Binary PDF Stream
    UI->>Resident: Browser prompts Save/Print "AquaFlow_Invoice_101.pdf"
```
