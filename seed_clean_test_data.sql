-- Disable foreign key checks for clean seed insertion
SET FOREIGN_KEY_CHECKS = 0;

-- Clear previous test data (retain admin)
DELETE FROM away_periods;
DELETE FROM household_size_history;
DELETE FROM payments;
DELETE FROM bills;
DELETE FROM invoices;
DELETE FROM notifications;
DELETE FROM water_usage;
DELETE FROM water_meters;
DELETE FROM occupancy_requests;
DELETE FROM resident_invitations;
DELETE FROM apartment_occupancies;
DELETE FROM residents;
DELETE FROM apartments;
DELETE FROM water_purchases;
DELETE FROM tariff_plans;
DELETE FROM billing_cycles;
DELETE FROM buildings;
DELETE FROM building_owners;
DELETE FROM users WHERE email <> 'admin@smartwater.com';

SET FOREIGN_KEY_CHECKS = 1;

-- 1. Building Owner User & Profile
INSERT INTO users (user_id, email, password, name, role, status, created_at)
VALUES (2, 'owner.robert@gmail.com', '$2a$10$ryAnzwwseChDRHzEF51unOxjCrie1eDctgN/QZJm.KL2CYMMN1jd2', 'Robert Fox', 'BUILDING_OWNER', 'APPROVED', NOW());

INSERT INTO building_owners (owner_id, user_id, name, phone, approval_status, created_at)
VALUES (1, 2, 'Robert Fox', '+91 9876543210', 'APPROVED', NOW());

-- 2. Building
INSERT INTO buildings (building_id, owner_id, building_name, building_number, location, total_flats, created_at)
VALUES (1, 1, 'Skyline Luxury Towers', 'B-101', '42 Palm Avenue, Bengaluru', 24, NOW());

-- 3. Apartments
INSERT INTO apartments (apartment_id, building_id, floor_number, apartment_name, room_number, unit_type, description, created_at)
VALUES 
(1, 1, 1, 'Apartment 101', '101', '2BHK', 'First floor standard 2BHK unit', NOW()),
(2, 1, 1, 'Apartment 102', '102', '2BHK', 'First floor corner 2BHK unit', NOW()),
(3, 1, 2, 'Apartment 201', '201', '3BHK', 'Second floor premium 3BHK unit', NOW()),
(4, 1, 2, 'Apartment 202', '202', '3BHK', 'Second floor pool-view 3BHK unit', NOW()),
(5, 1, 3, 'Apartment 301', '301', 'Penthouse', 'Third floor penthouse unit', NOW());

-- 4. Resident Users & Resident Profiles
INSERT INTO users (user_id, email, password, name, role, status, created_at) VALUES 
(3, 'michael.scott@gmail.com', '$2a$10$ryAnzwwseChDRHzEF51unOxjCrie1eDctgN/QZJm.KL2CYMMN1jd2', 'Michael Scott', 'RESIDENT', 'ACTIVE', NOW()),
(4, 'jim.halpert@gmail.com', '$2a$10$ryAnzwwseChDRHzEF51unOxjCrie1eDctgN/QZJm.KL2CYMMN1jd2', 'Jim Halpert', 'RESIDENT', 'ACTIVE', NOW()),
(5, 'ravi.kumar@gmail.com', '$2a$10$ryAnzwwseChDRHzEF51unOxjCrie1eDctgN/QZJm.KL2CYMMN1jd2', 'Ravi Kumar', 'RESIDENT', 'ACTIVE', NOW()),
(6, 'shubha.r@gmail.com', '$2a$10$ryAnzwwseChDRHzEF51unOxjCrie1eDctgN/QZJm.KL2CYMMN1jd2', 'Shubha R', 'RESIDENT', 'ACTIVE', NOW());

INSERT INTO residents (resident_id, building_id, user_id, name, email, phone, apartment_number, account_status, invitation_status, created_at, accepted_at) VALUES 
(1, 1, 3, 'Michael Scott', 'michael.scott@gmail.com', '+91 9876500001', '101', 'ACTIVE', 'ACCEPTED', NOW(), NOW()),
(2, 1, 4, 'Jim Halpert', 'jim.halpert@gmail.com', '+91 9876500002', '102', 'ACTIVE', 'ACCEPTED', NOW(), NOW()),
(3, 1, 5, 'Ravi Kumar', 'ravi.kumar@gmail.com', '+91 9876500003', '201', 'ACTIVE', 'ACCEPTED', NOW(), NOW()),
(4, 1, 6, 'Shubha R', 'shubha.r@gmail.com', '+91 9876500004', '202', 'ACTIVE', 'ACCEPTED', NOW(), NOW());

-- 5. Apartment Occupancies
INSERT INTO apartment_occupancies (occupancy_id, apartment_id, resident_id, start_date, end_date, status, household_size, children_count, household_size_source, household_size_confirmed, created_at) VALUES 
(1, 1, 1, '2026-01-01 00:00:00', NULL, 'ACTIVE', 2, 0, 'RESIDENT_ONBOARDING', 1, NOW()),
(2, 2, 2, '2026-01-01 00:00:00', NULL, 'ACTIVE', 3, 1, 'RESIDENT_ONBOARDING', 1, NOW()),
(3, 3, 3, '2026-02-01 00:00:00', NULL, 'ACTIVE', 4, 2, 'RESIDENT_ONBOARDING', 1, NOW()),
(4, 4, 4, '2026-03-01 00:00:00', NULL, 'ACTIVE', 2, 0, 'RESIDENT_ONBOARDING', 1, NOW());

-- 6. Water Meters
INSERT INTO water_meters (meter_id, building_id, resident_id, apartment_id, meter_number, installation_date, status) VALUES 
(1, 1, 1, 1, 'WM-B-101-101', '2026-01-01', 'ACTIVE'),
(2, 1, 2, 2, 'WM-B-101-102', '2026-01-01', 'ACTIVE'),
(3, 1, 3, 3, 'WM-B-101-201', '2026-01-01', 'ACTIVE'),
(4, 1, 4, 4, 'WM-B-101-202', '2026-01-01', 'ACTIVE'),
(5, 1, NULL, 5, 'WM-B-101-301', '2026-01-01', 'ACTIVE');

-- 7. Billing Cycles
-- Cycle 1: September 2026 (Finalized baseline cycle)
INSERT INTO billing_cycles (id, building_id, billing_month, start_date, end_date, status, created_at)
VALUES (1, 1, '2026-09-01', '2026-09-01', '2026-09-30', 'FINALIZED', '2026-09-01 00:00:00');

-- Cycle 2: October 2026 (Current OPEN cycle for testing CSV validation & bill generation)
INSERT INTO billing_cycles (id, building_id, billing_month, start_date, end_date, status, created_at)
VALUES (2, 1, '2026-10-01', '2026-10-01', '2026-10-31', 'OPEN', '2026-10-01 00:00:00');

-- 8. Tariff Plans
INSERT INTO tariff_plans (id, building_id, billing_cycle_id, status, effective_from, effective_date, base_limit, base_rate, extra_rate, fixed_charge, tier1_limit, tier1_rate, tier1_multiplier, tier2_limit, tier2_rate, tier2_multiplier, tier3_rate, tier3_multiplier, average_procurement_cost, base_tariff, markup_percentage, created_at)
VALUES 
(1, 1, 1, 'EXPIRED', '2026-09-01', '2026-09-01', 15.00, 3.00, 6.00, 50.00, 15.00, 3.00, 1.00, 30.00, 5.00, 1.50, 8.00, 2.00, 2.50, 3.00, 20.00, '2026-09-01 00:00:00'),
(2, 1, 2, 'ACTIVE', '2026-10-01', '2026-10-01', 15.00, 3.50, 7.00, 50.00, 15.00, 3.50, 1.00, 30.00, 5.50, 1.50, 9.00, 2.00, 2.80, 3.50, 20.00, '2026-10-01 00:00:00');

-- 9. Water Purchases for October (Tankers)
INSERT INTO water_purchases (id, building_id, billing_cycle_id, purchase_date, supplier, quantity, volume, unit_cost, total_cost, created_at)
VALUES 
(1, 1, 2, '2026-10-05', 'Cauvery Water Tankers', 12000.00, 12000.00, 0.05, 600.00, NOW()),
(2, 1, 2, '2026-10-15', 'AquaPure Fresh Supply', 15000.00, 15000.00, 0.05, 750.00, NOW());

-- 10. Historical Usages for Cycle 1 (September) to establish trusted meter baseline
INSERT INTO water_usage (usage_id, meter_id, billing_cycle_id, month, year, previous_reading, current_reading, units_consumed, recorded_at)
VALUES 
(1, 1, 1, 9, 2026, 0.00, 95.00, 95.00, '2026-09-30 23:59:59'),
(2, 2, 1, 9, 2026, 0.00, 88.00, 88.00, '2026-09-30 23:59:59'),
(3, 3, 1, 9, 2026, 0.00, 124.00, 124.00, '2026-09-30 23:59:59'),
(4, 4, 1, 9, 2026, 0.00, 76.00, 76.00, '2026-09-30 23:59:59');

-- 11. Past Bills and Invoices for Cycle 1 (PAID)
INSERT INTO bills (bill_id, resident_id, billing_cycle_id, usage_id, bill_month, bill_year, units, amount, status, due_date, generated_at, tier1_units, tier1_rate, tier1_amount, tier2_units, tier2_rate, tier2_amount, tier3_units, tier3_rate, tier3_amount)
VALUES 
(1, 1, 1, 1, 9, 2026, 95.00, 690.00, 'PAID', '2026-10-10', '2026-09-30 23:59:59', 15.00, 3.00, 45.00, 15.00, 5.00, 75.00, 65.00, 8.00, 520.00),
(2, 2, 1, 2, 9, 2026, 88.00, 634.00, 'PAID', '2026-10-10', '2026-09-30 23:59:59', 15.00, 3.00, 45.00, 15.00, 5.00, 75.00, 58.00, 8.00, 464.00),
(3, 3, 1, 3, 9, 2026, 124.00, 922.00, 'PAID', '2026-10-10', '2026-09-30 23:59:59', 15.00, 3.00, 45.00, 15.00, 5.00, 75.00, 94.00, 8.00, 752.00),
(4, 4, 1, 4, 9, 2026, 76.00, 538.00, 'PAID', '2026-10-10', '2026-09-30 23:59:59', 15.00, 3.00, 45.00, 15.00, 5.00, 75.00, 46.00, 8.00, 368.00);

INSERT INTO invoices (id, resident_id, billing_cycle_id, usage_units, base_charge, extra_charge, shared_water_charge, total_amount, status, due_date, created_at, tier1_units, tier1_rate, tier1_amount, tier2_units, tier2_rate, tier2_amount, tier3_units, tier3_rate, tier3_amount)
VALUES 
(1, 1, 1, 95.00, 45.00, 595.00, 50.00, 690.00, 'PAID', '2026-10-10', '2026-09-30 23:59:59', 15.00, 3.00, 45.00, 15.00, 5.00, 75.00, 65.00, 8.00, 520.00),
(2, 2, 1, 88.00, 45.00, 539.00, 50.00, 634.00, 'PAID', '2026-10-10', '2026-09-30 23:59:59', 15.00, 3.00, 45.00, 15.00, 5.00, 75.00, 58.00, 8.00, 464.00),
(3, 3, 1, 124.00, 45.00, 827.00, 50.00, 922.00, 'PAID', '2026-10-10', '2026-09-30 23:59:59', 15.00, 3.00, 45.00, 15.00, 5.00, 75.00, 94.00, 8.00, 752.00),
(4, 4, 1, 76.00, 45.00, 443.00, 50.00, 538.00, 'PAID', '2026-10-10', '2026-09-30 23:59:59', 15.00, 3.00, 45.00, 15.00, 5.00, 75.00, 46.00, 8.00, 368.00);
