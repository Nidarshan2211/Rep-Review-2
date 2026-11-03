# AquaFlow / AquaTrack: REST API Specification & Endpoint Catalog

---

## 1. Authentication & Identity APIs (`/api/auth`)

### 1.1 User Login
- **Endpoint**: `POST /api/auth/login`
- **Access**: Public (`permitAll()`)
- **Request Body**:
  ```json
  {
    "email": "owner.robert@gmail.com",
    "password": "Admin@123456",
    "role": "BUILDING_OWNER"
  }
  ```
- **Response Payload (`200 OK`)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "type": "Bearer",
    "userId": 2,
    "name": "Robert Fox",
    "email": "owner.robert@gmail.com",
    "role": "BUILDING_OWNER",
    "status": "APPROVED",
    "phone": "+91 9876543210"
  }
  ```
- **Error Codes**:
  - `401 Unauthorized`: Invalid credentials.
  - `403 Forbidden`: Account pending approval or role mismatch.

### 1.2 Owner Self-Registration
- **Endpoint**: `POST /api/auth/register-owner`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "name": "Sarah Connor",
    "email": "owner.sarah@gmail.com",
    "password": "Admin@123456",
    "phone": "+91 9876543211"
  }
  ```
- **Response Payload (`201 Created`)**:
  ```json
  {
    "message": "Building Owner registration submitted successfully. Your account is pending Super Admin approval.",
    "ownerId": 3,
    "status": "PENDING"
  }
  ```

### 1.3 Accept Resident Invitation
- **Endpoint**: `POST /api/auth/accept-invitation`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "token": "d748f2a1-89b4-4b5c-a579-3c72b2cf6791",
    "password": "Admin@123456"
  }
  ```
- **Response Payload (`200 OK`)**:
  ```json
  {
    "token": "eyJhbGciOi...",
    "type": "Bearer",
    "userId": 7,
    "name": "Michael Scott",
    "role": "RESIDENT",
    "status": "ACTIVE"
  }
  ```

---

## 2. Super Administrator APIs (`/api/admin`)

### 2.1 System Dashboard Metrics
- **Endpoint**: `GET /api/admin/dashboard`
- **Access**: `ROLE_SUPER_ADMIN`
- **Response Payload (`200 OK`)**:
  ```json
  {
    "totalOwners": 4,
    "pendingOwners": 1,
    "totalBuildings": 2,
    "totalResidents": 4,
    "totalRevenue": 2784.00,
    "activeCycles": 1
  }
  ```

### 2.2 Approve Building Owner
- **Endpoint**: `PUT /api/admin/owners/{id}/approve`
- **Access**: `ROLE_SUPER_ADMIN`
- **Response Payload (`200 OK`)**:
  ```json
  {
    "message": "Owner #2 approved successfully.",
    "ownerId": 2,
    "status": "APPROVED"
  }
  ```

### 2.3 Reject Building Owner
- **Endpoint**: `PUT /api/admin/owners/{id}/reject`
- **Access**: `ROLE_SUPER_ADMIN`
- **Response Payload (`200 OK`)**:
  ```json
  {
    "message": "Owner #3 has been rejected.",
    "ownerId": 3,
    "status": "REJECTED"
  }
  ```

---

## 3. Building, Apartment & Meter APIs

### 3.1 Fetch Owner Buildings
- **Endpoint**: `GET /api/buildings`
- **Access**: `ROLE_BUILDING_OWNER`
- **Response Payload (`200 OK`)**:
  ```json
  [
    {
      "buildingId": 1,
      "buildingName": "Skyline Luxury Towers",
      "buildingNumber": "B-101",
      "location": "42 Palm Avenue, Bengaluru",
      "totalFlats": 24,
      "occupiedFlats": 4
    }
  ]
  ```

### 3.2 Fetch Apartments for Building
- **Endpoint**: `GET /api/buildings/{buildingId}/apartments`
- **Access**: `ROLE_BUILDING_OWNER`
- **Response Payload (`200 OK`)**:
  ```json
  [
    {
      "apartmentId": 1,
      "floorNumber": 1,
      "apartmentName": "Apartment 101",
      "roomNumber": "101",
      "unitType": "2BHK",
      "meterNumber": "WM-B-101-101",
      "isOccupied": true,
      "residentName": "Michael Scott"
    }
  ]
  ```

---

## 4. Tanker Procurement & Tariff Plan APIs

### 4.1 Record Water Tanker Purchase
- **Endpoint**: `POST /api/water-purchases`
- **Access**: `ROLE_BUILDING_OWNER`
- **Request Body**:
  ```json
  {
    "buildingId": 1,
    "billingCycleId": 2,
    "purchaseDate": "2026-10-05",
    "supplier": "Cauvery Water Tankers",
    "volume": 12000.00,
    "unitCost": 0.05,
    "totalCost": 600.00
  }
  ```
- **Response Payload (`201 Created`)**:
  ```json
  {
    "id": 1,
    "supplier": "Cauvery Water Tankers",
    "volume": 12000.00,
    "totalCost": 600.00
  }
  ```

### 4.2 Compute Dynamic Cycle Tariff Plan
- **Endpoint**: `POST /api/tariff-plans/calculate/{cycleId}`
- **Access**: `ROLE_BUILDING_OWNER`
- **Request Params**: `markupOverride=20.00`
- **Response Payload (`200 OK`)**:
  ```json
  {
    "id": 2,
    "billingCycleId": 2,
    "averageProcurementCost": 2.80,
    "markupPercentage": 20.00,
    "baseTariff": 3.36,
    "tier1Limit": 20.00,
    "tier1Rate": 3.36,
    "tier1Multiplier": 1.00,
    "tier2Limit": 40.00,
    "tier2Rate": 4.20,
    "tier2Multiplier": 1.25,
    "tier3Rate": 5.04,
    "tier3Multiplier": 1.50,
    "status": "ACTIVE"
  }
  ```

---

## 5. Bulk Billing & CSV Ingestion APIs

### 5.1 Preview & Validate Meter Readings CSV
- **Endpoint**: `POST /api/billing/bulk-preview`
- **Access**: `ROLE_BUILDING_OWNER`
- **Request Type**: `multipart/form-data`
  - `file`: CSV file with columns `resident_id`, `meter_number`, `current_reading`
  - `cycleId`: `2`
- **Response Payload (`200 OK`)**:
  ```json
  {
    "totalRows": 4,
    "validCount": 4,
    "errorCount": 0,
    "totalEstimatedUnits": 383.00,
    "totalEstimatedAmount": 2784.00,
    "previewRows": [
      {
        "rowNumber": 2,
        "residentId": 1,
        "residentName": "Michael Scott",
        "apartmentNumber": "101",
        "meterNumber": "WM-B-101-101",
        "previousReading": 0.00,
        "currentReading": 95.00,
        "unitsConsumed": 95.00,
        "estimatedAmount": 690.00,
        "status": "VALID",
        "errorMessage": null
      }
    ]
  }
  ```

### 5.2 Commit Bulk Readings & Generate Invoices
- **Endpoint**: `POST /api/billing/bulk-commit`
- **Access**: `ROLE_BUILDING_OWNER`
- **Request Body**:
  ```json
  {
    "cycleId": 2,
    "readings": [
      { "residentId": 1, "meterId": 1, "previousReading": 0.0, "currentReading": 95.0 }
    ]
  }
  ```
- **Response Payload (`200 OK`)**:
  ```json
  {
    "message": "Bulk billing committed successfully. Invoices generated.",
    "cycleId": 2,
    "billsGenerated": 4,
    "totalAmount": 2784.00,
    "asyncLeakScoringTriggered": true
  }
  ```

---

## 6. AI Machine Learning & Prediction APIs

### 6.1 Predict Next-Month Bill (`Spring Boot`)
- **Endpoint**: `GET /api/water-prediction/next-month`
- **Access**: `ROLE_RESIDENT`
- **Response Payload (`200 OK`)**:
  ```json
  {
    "residentId": 1,
    "residentName": "Michael Scott",
    "predictionMonth": 11,
    "predictionYear": 2026,
    "predictedConsumptionLitres": 24500.0,
    "predictedUnitsKl": 24.50,
    "estimatedAmount": 634.00,
    "tier1Amount": 45.00,
    "tier2Amount": 75.00,
    "tier3Amount": 514.00,
    "confidenceScore": 0.85,
    "modelEngine": "Random Forest Regressor (Lag-7 Features)"
  }
  ```

### 6.2 Raw Consumption Forecast (`Python FastAPI :8000`)
- **Endpoint**: `POST /predict`
- **Header**: `X-API-Key: test-ml-secret-key-aqua-flow-2026`
- **Request Body**:
  ```json
  {
    "resident_id": 1,
    "lag1_litres": 95000.0,
    "lag2_litres": 88000.0,
    "lag3_litres": 124000.0,
    "avg3_litres": 102333.3,
    "household_size": 3,
    "target_month": 11,
    "trend_litres": -29000.0
  }
  ```
- **Response Payload (`200 OK`)**:
  ```json
  {
    "resident_id": 1,
    "predicted_consumption_litres": 24500.0,
    "model_version": "v1.0.0",
    "timestamp": "2026-11-03T02:00:00"
  }
  ```

### 6.3 Quantile Leak Scoring Batch (`Python FastAPI :8000`)
- **Endpoint**: `POST /v1/leak/score`
- **Header**: `X-API-Key: test-ml-secret-key-aqua-flow-2026`
- **Request Body**:
  ```json
  {
    "building_id": 1,
    "cycle_id": 2,
    "flats": [
      {
        "usage_id": 1,
        "apartment_id": 1,
        "room_number": "101",
        "units_consumed": 95.0,
        "household_size": 2,
        "away_days": 0,
        "lag1_units": 0.0,
        "lag2_units": 0.0,
        "avg3_units": 0.0
      }
    ]
  }
  ```
- **Response Payload (`200 OK`)**:
  ```json
  {
    "results": [
      {
        "usage_id": 1,
        "anomaly_score": 0.28,
        "anomaly_status": "NORMAL",
        "expected_min": 40.0,
        "expected_max": 110.0,
        "anomaly_confidence": "HIGH",
        "anomaly_pattern": "NORMAL"
      }
    ]
  }
  ```

---

## 7. Invoices, PDF & Payment APIs

### 7.1 Download Invoice PDF
- **Endpoint**: `GET /api/bills/{billId}/pdf`
- **Access**: `ROLE_BUILDING_OWNER` or `ROLE_RESIDENT`
- **Response**: Binary stream `application/pdf` with iText rendered invoice.

### 7.2 Resident Online Bill Settlement
- **Endpoint**: `POST /api/resident/pay`
- **Access**: `ROLE_RESIDENT`
- **Request Body**:
  ```json
  {
    "billId": 1,
    "paymentMethod": "ONLINE_CARD"
  }
  ```
- **Response Payload (`200 OK`)**:
  ```json
  {
    "paymentId": 1,
    "billId": 1,
    "amount": 690.00,
    "transactionReference": "TXN-9F42-88B1-C940",
    "paymentDate": "2026-11-03T02:00:00",
    "status": "SUCCESS"
  }
  ```
