package com.smartwater.billing.common.config;

import com.smartwater.billing.common.entity.*;
import com.smartwater.billing.common.repository.*;
import com.smartwater.billing.owner.entity.Tariff;
import com.smartwater.billing.owner.repository.*;
import com.smartwater.billing.resident.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DataInitializer {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final BuildingOwnerRepository ownerRepository;
    private final BuildingRepository buildingRepository;
    private final ResidentRepository residentRepository;
    private final WaterMeterRepository meterRepository;
    private final TariffRepository tariffRepository;
    private final WaterUsageRepository usageRepository;
    private final BillRepository billRepository;
    private final NotificationRepository notificationRepository;
    private final PasswordEncoder passwordEncoder;

    @PersistenceContext
    private EntityManager entityManager;

    public DataInitializer(
            UserRepository userRepository,
            BuildingOwnerRepository ownerRepository,
            BuildingRepository buildingRepository,
            ResidentRepository residentRepository,
            WaterMeterRepository meterRepository,
            TariffRepository tariffRepository,
            WaterUsageRepository usageRepository,
            BillRepository billRepository,
            NotificationRepository notificationRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.ownerRepository = ownerRepository;
        this.buildingRepository = buildingRepository;
        this.residentRepository = residentRepository;
        this.meterRepository = meterRepository;
        this.tariffRepository = tariffRepository;
        this.usageRepository = usageRepository;
        this.billRepository = billRepository;
        this.notificationRepository = notificationRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void initData() {
        String encodedPassword = passwordEncoder.encode("Admin@123456");

        // 1. Ensure ONLY one Super Admin exists
        User adminUser = userRepository.findByEmail("admin@smartwater.com").orElse(null);
        if (adminUser == null) {
            log.info("Creating Super Admin user (admin@smartwater.com)...");
            adminUser = User.builder()
                    .name("System Super Admin")
                    .email("admin@smartwater.com")
                    .password(encodedPassword)
                    .role(User.Role.SUPER_ADMIN)
                    .status(User.UserStatus.APPROVED)
                    .build();
            userRepository.save(adminUser);
        } else {
            adminUser.setName("System Super Admin");
            adminUser.setPassword(encodedPassword);
            adminUser.setRole(User.Role.SUPER_ADMIN);
            adminUser.setStatus(User.UserStatus.APPROVED);
            userRepository.save(adminUser);
        }

        // 2. Base Tariff rules for calculation engine
        if (tariffRepository.count() == 0) {
            tariffRepository.save(new Tariff(null, 0, 20, 2.50, 10.00));
            tariffRepository.save(new Tariff(null, 21, 50, 4.00, 15.00));
            tariffRepository.save(new Tariff(null, 51, 1000, 6.50, 25.00));
        }

        // 3. Ensure audit tables (owner_history and resident_history) exist
        try {
            org.hibernate.Session session = entityManager.unwrap(org.hibernate.Session.class);
            session.doWork(connection -> {
                String dbProduct = connection.getMetaData().getDatabaseProductName();
                try (java.sql.Statement stmt = connection.createStatement()) {
                    if ("PostgreSQL".equalsIgnoreCase(dbProduct)) {
                        stmt.execute("CREATE TABLE IF NOT EXISTS owner_history (" +
                                "id BIGSERIAL PRIMARY KEY, " +
                                "owner_id BIGINT, " +
                                "owner_name VARCHAR(150) NOT NULL, " +
                                "email VARCHAR(150), " +
                                "phone VARCHAR(50), " +
                                "event_type VARCHAR(50) NOT NULL, " +
                                "details VARCHAR(500), " +
                                "actor VARCHAR(100), " +
                                "timestamp TIMESTAMP NOT NULL)");

                        stmt.execute("CREATE TABLE IF NOT EXISTS resident_history (" +
                                "id BIGSERIAL PRIMARY KEY, " +
                                "owner_id BIGINT NOT NULL, " +
                                "building_id BIGINT, " +
                                "building_name VARCHAR(150), " +
                                "apartment_id BIGINT, " +
                                "apartment_name VARCHAR(150), " +
                                "room_number VARCHAR(50), " +
                                "resident_id BIGINT, " +
                                "resident_name VARCHAR(150) NOT NULL, " +
                                "resident_email VARCHAR(150), " +
                                "resident_phone VARCHAR(50), " +
                                "activity_type VARCHAR(50) NOT NULL, " +
                                "details VARCHAR(500), " +
                                "actor VARCHAR(100), " +
                                "timestamp TIMESTAMP NOT NULL)");

                        stmt.execute("SELECT setval('users_user_id_seq', COALESCE((SELECT MAX(user_id) FROM users), 1))");
                        stmt.execute("SELECT setval('building_owners_owner_id_seq', COALESCE((SELECT MAX(owner_id) FROM building_owners), 1))");
                        stmt.execute("SELECT setval('buildings_building_id_seq', COALESCE((SELECT MAX(building_id) FROM buildings), 1))");
                        stmt.execute("SELECT setval('residents_resident_id_seq', COALESCE((SELECT MAX(resident_id) FROM residents), 1))");
                        stmt.execute("SELECT setval('water_meters_meter_id_seq', COALESCE((SELECT MAX(meter_id) FROM water_meters), 1))");
                        stmt.execute("SELECT setval('water_usage_usage_id_seq', COALESCE((SELECT MAX(usage_id) FROM water_usage), 1))");
                        stmt.execute("SELECT setval('tariff_tariff_id_seq', COALESCE((SELECT MAX(tariff_id) FROM tariff), 1))");
                        stmt.execute("SELECT setval('bills_bill_id_seq', COALESCE((SELECT MAX(bill_id) FROM bills), 1))");
                        stmt.execute("SELECT setval('notifications_notification_id_seq', COALESCE((SELECT MAX(notification_id) FROM notifications), 1))");
                        log.info("PostgreSQL Sequences and Audit tables synchronized successfully!");
                    } else {
                        stmt.execute("CREATE TABLE IF NOT EXISTS owner_history (" +
                                "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                                "owner_id BIGINT, " +
                                "owner_name VARCHAR(150) NOT NULL, " +
                                "email VARCHAR(150), " +
                                "phone VARCHAR(50), " +
                                "event_type VARCHAR(50) NOT NULL, " +
                                "details VARCHAR(500), " +
                                "actor VARCHAR(100), " +
                                "timestamp DATETIME NOT NULL)");

                        stmt.execute("CREATE TABLE IF NOT EXISTS resident_history (" +
                                "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                                "owner_id BIGINT NOT NULL, " +
                                "building_id BIGINT, " +
                                "building_name VARCHAR(150), " +
                                "apartment_id BIGINT, " +
                                "apartment_name VARCHAR(150), " +
                                "room_number VARCHAR(50), " +
                                "resident_id BIGINT, " +
                                "resident_name VARCHAR(150) NOT NULL, " +
                                "resident_email VARCHAR(150), " +
                                "resident_phone VARCHAR(50), " +
                                "activity_type VARCHAR(50) NOT NULL, " +
                                "details VARCHAR(500), " +
                                "actor VARCHAR(100), " +
                                "timestamp DATETIME NOT NULL)");
                        log.info("MySQL History Audit tables verified and ready.");
                    }
                } catch (Exception ex) {
                    log.warn("Database initialization audit table check note: {}", ex.getMessage());
                }
            });
        } catch (Exception e) {
            log.debug("Database initialization note: {}", e.getMessage());
        }

        log.info("DataInitializer completed: Single Super Admin active (admin@smartwater.com / Admin@123456)");
    }
}
