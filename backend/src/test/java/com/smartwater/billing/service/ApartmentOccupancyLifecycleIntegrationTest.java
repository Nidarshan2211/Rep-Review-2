package com.smartwater.billing.service;

import com.smartwater.billing.common.entity.*;
import com.smartwater.billing.owner.dto.ApartmentDTOs.*;
import com.smartwater.billing.resident.dto.OccupancyDTOs.*;
import com.smartwater.billing.owner.entity.*;
import com.smartwater.billing.resident.entity.*;
import com.smartwater.billing.resident.entity.ApartmentOccupancy.OccupancyStatus;
import com.smartwater.billing.resident.entity.OccupancyRequest.RequestStatus;
import com.smartwater.billing.common.exception.BadRequestException;
import com.smartwater.billing.common.repository.*;
import com.smartwater.billing.owner.repository.*;
import com.smartwater.billing.resident.repository.*;
import com.smartwater.billing.common.service.AuthService;
import com.smartwater.billing.owner.service.ApartmentService;
import com.smartwater.billing.resident.service.OccupancyService;
import com.smartwater.billing.resident.service.ResidentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("h2")
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:apartment_occupancy_test_db;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE;MODE=MySQL;NON_KEYWORDS=MONTH,YEAR",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
    "spring.sql.init.mode=never",
    "spring.mail.host=localhost"
})
public class ApartmentOccupancyLifecycleIntegrationTest {

    @MockBean
    private JavaMailSender javaMailSender;

    @Autowired
    private ApartmentService apartmentService;

    @Autowired
    private OccupancyService occupancyService;

    @Autowired
    private AuthService authService;

    @Autowired
    private ResidentService residentService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BuildingOwnerRepository ownerRepository;

    @Autowired
    private BuildingRepository buildingRepository;

    @Autowired
    private ApartmentRepository apartmentRepository;

    @Autowired
    private ApartmentOccupancyRepository occupancyRepository;

    @Autowired
    private ResidentRepository residentRepository;

    @Autowired
    private WaterMeterRepository waterMeterRepository;

    @Autowired
    private BillRepository billRepository;

    @Autowired
    private WaterUsageRepository waterUsageRepository;

    @Autowired
    private ResidentInvitationRepository residentInvitationRepository;

    @Autowired
    private OccupancyRequestRepository occupancyRequestRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private HouseholdSizeHistoryRepository historyRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private BuildingOwner owner1;
    private BuildingOwner owner2;
    private Building building1;

    @BeforeEach
    void setUp() {
        notificationRepository.deleteAll();
        occupancyRequestRepository.deleteAll();
        billRepository.deleteAll();
        waterUsageRepository.deleteAll();
        residentInvitationRepository.deleteAll();
        historyRepository.deleteAll();
        occupancyRepository.deleteAll();
        waterMeterRepository.deleteAll();
        apartmentRepository.deleteAll();
        residentRepository.deleteAll();
        buildingRepository.deleteAll();
        ownerRepository.deleteAll();
        userRepository.deleteAll();

        // Setup Owner 1
        User u1 = User.builder()
                .name("Alice Owner")
                .email("owner.alice@test.com")
                .password(passwordEncoder.encode("Password@123"))
                .role(User.Role.BUILDING_OWNER)
                .status(User.UserStatus.ACTIVE)
                .build();

        owner1 = BuildingOwner.builder()
                .user(u1)
                .name("Alice Owner")
                .phone("1111111111")
                .approvalStatus(BuildingOwner.ApprovalStatus.APPROVED)
                .build();
        ownerRepository.save(owner1);

        building1 = Building.builder()
                .owner(owner1)
                .buildingName("Green Residency")
                .buildingNumber("B-GR")
                .totalFlats(10)
                .location("Bangalore")
                .build();
        buildingRepository.save(building1);

        // Setup Owner 2
        User u2 = User.builder()
                .name("Bob Owner")
                .email("owner.bob@test.com")
                .password(passwordEncoder.encode("Password@123"))
                .role(User.Role.BUILDING_OWNER)
                .status(User.UserStatus.ACTIVE)
                .build();

        owner2 = BuildingOwner.builder()
                .user(u2)
                .name("Bob Owner")
                .phone("2222222222")
                .approvalStatus(BuildingOwner.ApprovalStatus.APPROVED)
                .build();
        ownerRepository.save(owner2);
    }

    @Test
    @DisplayName("Building Owner can configure floors, apartments, and view inventory")
    void testOwnerApartmentManagementAndInventory() {
        // Owner 1 creates flat 101 on floor 1
        CreateApartmentRequest r101 = new CreateApartmentRequest();
        r101.setFloorNumber(1);
        r101.setApartmentName("Flat 101");
        r101.setRoomNumber("101");
        r101.setUnitType("2BHK");
        ApartmentResponse a101 = apartmentService.createApartment(owner1.getUser().getEmail(), building1.getBuildingId(), r101);
        assertNotNull(a101.getApartmentId());
        assertEquals("VACANT", a101.getOccupancyStatus());

        // Batch create flats 201, 202 on floor 2
        BatchCreateApartmentsRequest batchReq = new BatchCreateApartmentsRequest();
        batchReq.setBuildingId(building1.getBuildingId());
        batchReq.setFloorNumber(2);
        batchReq.setRoomNumbers(List.of("201", "202"));
        batchReq.setUnitType("3BHK");
        List<ApartmentResponse> batch = apartmentService.batchCreateApartments(owner1.getUser().getEmail(), batchReq);
        assertEquals(2, batch.size());

        // Query inventory
        BuildingInventoryResponse inventory = apartmentService.getBuildingInventory(owner1.getUser().getEmail(), building1.getBuildingId());
        assertEquals("Green Residency", inventory.getBuildingName());
        assertEquals(3, inventory.getConfiguredUnitsCount());
        assertEquals(3, inventory.getVacantCount());
        assertEquals(0, inventory.getOccupiedCount());
        assertEquals(2, inventory.getFloors().size());
    }

    @Test
    @DisplayName("Owner access control: Owner 2 cannot manage units in Owner 1's building")
    void testOwnerAccessControl_CannotManageOtherOwnersUnits() {
        CreateApartmentRequest req = new CreateApartmentRequest();
        req.setFloorNumber(1);
        req.setApartmentName("Hack Flat");
        req.setRoomNumber("999");

        assertThrows(BadRequestException.class, () -> {
            apartmentService.createApartment(owner2.getUser().getEmail(), building1.getBuildingId(), req);
        });
    }

    @Test
    @DisplayName("Resident self-registration and apartment claiming lifecycle")
    void testResidentRegistrationAndApartmentSelection() {
        // Create unit
        CreateApartmentRequest req = new CreateApartmentRequest();
        req.setFloorNumber(1);
        req.setApartmentName("Flat 101");
        req.setRoomNumber("101");
        ApartmentResponse apt = apartmentService.createApartment(owner1.getUser().getEmail(), building1.getBuildingId(), req);

        // Resident registers with mandatory building, apartment, and household details
        RegisterResidentRequest reg = new RegisterResidentRequest();
        reg.setName("John Resident");
        reg.setEmail("john.res@test.com");
        reg.setPassword("Secret@123");
        reg.setConfirmPassword("Secret@123");
        reg.setPhone("9876543210");
        reg.setBuildingId(building1.getBuildingId());
        reg.setApartmentId(apt.getApartmentId());
        reg.setHouseholdSize(2);
        reg.setChildrenCount(0);
        var loginResp = authService.registerResident(reg);
        assertNotNull(loginResp.getToken());
        assertEquals("RESIDENT", loginResp.getRole());

        // Occupancy request was created
        List<OccupancyRequestResponse> pending = occupancyService.getOwnerOccupancyRequests(owner1.getUser().getEmail(), OccupancyRequest.RequestStatus.PENDING);
        assertEquals(1, pending.size());
        assertEquals("John Resident", pending.get(0).getResidentName());

        // Owner approves request
        OccupancyRequestResponse approved = occupancyService.reviewOccupancyRequest(owner1.getUser().getEmail(), pending.get(0).getRequestId(), new ReviewOccupancyRequest(true, null));
        assertEquals("APPROVED", approved.getStatus());

        // Verify active occupancy
        OccupancyResponse occ = occupancyService.getCurrentOccupancy("john.res@test.com");
        assertNotNull(occ);
        assertEquals("ACTIVE", occ.getStatus());
        assertEquals("Green Residency", occ.getBuildingName());
        assertEquals("101", occ.getRoomNumber());

        // Verify apartment is no longer available in public listing
        List<AvailableApartmentResponse> availableAfter = apartmentService.getAvailableApartments(building1.getBuildingId(), null);
        assertEquals(0, availableAfter.size());

        // Verify owner inventory shows OCCUPIED with resident details
        BuildingInventoryResponse inv = apartmentService.getBuildingInventory(owner1.getUser().getEmail(), building1.getBuildingId());
        assertEquals(1, inv.getOccupiedCount());
        assertEquals(0, inv.getVacantCount());
        ApartmentResponse occupiedApt = inv.getFloors().get(0).getApartments().get(0);
        assertEquals("OCCUPIED", occupiedApt.getOccupancyStatus());
        assertEquals("John Resident", occupiedApt.getCurrentResidentName());
        assertEquals("john.res@test.com", occupiedApt.getCurrentResidentEmail());
    }

    @Test
    @DisplayName("Double occupancy prevention: Cannot claim an already occupied apartment")
    void testDoubleOccupancyPrevention() {
        CreateApartmentRequest req = new CreateApartmentRequest();
        req.setFloorNumber(1);
        req.setApartmentName("Flat 101");
        req.setRoomNumber("101");
        ApartmentResponse apt = apartmentService.createApartment(owner1.getUser().getEmail(), building1.getBuildingId(), req);

        // Resident 1 registers and is approved
        RegisterResidentRequest reg1 = new RegisterResidentRequest();
        reg1.setName("Resident One");
        reg1.setEmail("r1@test.com");
        reg1.setPassword("Secret@123");
        reg1.setConfirmPassword("Secret@123");
        reg1.setBuildingId(building1.getBuildingId());
        reg1.setApartmentId(apt.getApartmentId());
        reg1.setHouseholdSize(2);
        reg1.setChildrenCount(0);
        authService.registerResident(reg1);

        List<OccupancyRequestResponse> pending = occupancyService.getOwnerOccupancyRequests(owner1.getUser().getEmail(), OccupancyRequest.RequestStatus.PENDING);
        occupancyService.reviewOccupancyRequest(owner1.getUser().getEmail(), pending.get(0).getRequestId(), new ReviewOccupancyRequest(true, null));

        // Resident 2 registers and attempts to choose the occupied unit
        RegisterResidentRequest reg2 = new RegisterResidentRequest();
        reg2.setName("Resident Two");
        reg2.setEmail("r2@test.com");
        reg2.setPassword("Secret@123");
        reg2.setConfirmPassword("Secret@123");
        reg2.setBuildingId(building1.getBuildingId());
        reg2.setApartmentId(apt.getApartmentId());
        reg2.setHouseholdSize(2);
        reg2.setChildrenCount(0);

        assertThrows(BadRequestException.class, () -> {
            authService.registerResident(reg2);
        });
    }

    @Test
    @DisplayName("Resident Leave Apartment / Move-Out lifecycle: Vacates unit, detaches meter, preserves history")
    void testResidentMoveOutLifecycle() {
        CreateApartmentRequest req = new CreateApartmentRequest();
        req.setFloorNumber(1);
        req.setApartmentName("Flat 101");
        req.setRoomNumber("101");
        ApartmentResponse apt = apartmentService.createApartment(owner1.getUser().getEmail(), building1.getBuildingId(), req);

        RegisterResidentRequest reg = new RegisterResidentRequest();
        reg.setName("Moving Resident");
        reg.setEmail("mover@test.com");
        reg.setPassword("Secret@123");
        reg.setConfirmPassword("Secret@123");
        reg.setBuildingId(building1.getBuildingId());
        reg.setApartmentId(apt.getApartmentId());
        reg.setHouseholdSize(2);
        reg.setChildrenCount(0);
        authService.registerResident(reg);

        List<OccupancyRequestResponse> pending = occupancyService.getOwnerOccupancyRequests(owner1.getUser().getEmail(), OccupancyRequest.RequestStatus.PENDING);
        occupancyService.reviewOccupancyRequest(owner1.getUser().getEmail(), pending.get(0).getRequestId(), new ReviewOccupancyRequest(true, null));

        // Record a bill to verify history preservation
        Resident resident = residentRepository.findByEmailIgnoreCase("mover@test.com").orElseThrow();
        Bill bill = Bill.builder()
                .resident(resident)
                .billMonth(10)
                .billYear(2026)
                .units(15.0)
                .amount(450.0)
                .status(Bill.BillStatus.PAID)
                .dueDate(LocalDate.now().plusDays(10))
                .build();
        billRepository.save(bill);

        // Perform Move-Out
        MoveOutRequest moveOutReq = new MoveOutRequest();
        moveOutReq.setConfirm(true);
        moveOutReq.setReason("Job relocation");
        MoveOutResponse resp = occupancyService.moveOut("mover@test.com", moveOutReq);
        assertTrue(resp.isSuccess());
        assertEquals("Green Residency", resp.getBuildingName());
        assertEquals("101", resp.getRoomNumber());

        // Verify active occupancy is ended
        assertNull(occupancyService.getCurrentOccupancy("mover@test.com"));
        List<ApartmentOccupancy> history = occupancyRepository.findAllByResidentEmail("mover@test.com");
        assertEquals(1, history.size());
        assertEquals(OccupancyStatus.ENDED, history.get(0).getStatus());
        assertEquals("Job relocation", history.get(0).getMoveOutReason());

        // Verify unit is vacant in owner inventory
        BuildingInventoryResponse inv = apartmentService.getBuildingInventory(owner1.getUser().getEmail(), building1.getBuildingId());
        assertEquals(1, inv.getVacantCount());
        assertEquals(0, inv.getOccupiedCount());

        // Verify water meter detached from former resident
        WaterMeter meter = waterMeterRepository.findByBuildingBuildingId(building1.getBuildingId()).get(0);
        assertNull(meter.getResident());

        // Verify historical bill is preserved!
        List<Bill> bills = billRepository.findByResidentResidentIdOrderByGeneratedAtDesc(resident.getResidentId());
        assertEquals(1, bills.size());
        assertEquals(450.0, bills.get(0).getAmount());

        // Verify duplicate move-out attempt throws error
        assertThrows(BadRequestException.class, () -> {
            occupancyService.moveOut("mover@test.com", moveOutReq);
        });

        // Verify new tenant can now register for the vacated unit
        RegisterResidentRequest regNew = new RegisterResidentRequest();
        regNew.setName("New Tenant");
        regNew.setEmail("newtenant@test.com");
        regNew.setPassword("Secret@123");
        regNew.setConfirmPassword("Secret@123");
        regNew.setBuildingId(building1.getBuildingId());
        regNew.setApartmentId(apt.getApartmentId());
        regNew.setHouseholdSize(3);
        regNew.setChildrenCount(1);
        authService.registerResident(regNew);

        List<OccupancyRequestResponse> newPending = occupancyService.getOwnerOccupancyRequests(owner1.getUser().getEmail(), OccupancyRequest.RequestStatus.PENDING);
        occupancyService.reviewOccupancyRequest(owner1.getUser().getEmail(), newPending.get(0).getRequestId(), new ReviewOccupancyRequest(true, null));
        OccupancyResponse newOcc = occupancyService.getCurrentOccupancy("newtenant@test.com");
        assertEquals("ACTIVE", newOcc.getStatus());
    }

    @Test
    @DisplayName("Resident requests occupancy -> Owner reviews & approves -> Resident linked to apartment and meter")
    void testOccupancyRequestAndApprovalWorkflow() {
        // Owner 1 creates flat 301
        CreateApartmentRequest req = new CreateApartmentRequest();
        req.setFloorNumber(3);
        req.setApartmentName("Flat 301");
        req.setRoomNumber("301");
        ApartmentResponse apt = apartmentService.createApartment(owner1.getUser().getEmail(), building1.getBuildingId(), req);

        // Resident registers with flat 301 and household details
        RegisterResidentRequest reg = new RegisterResidentRequest();
        reg.setName("Grace Applicant");
        reg.setEmail("grace@test.com");
        reg.setPassword("Secret@123");
        reg.setConfirmPassword("Secret@123");
        reg.setPhone("9988776655");
        reg.setBuildingId(building1.getBuildingId());
        reg.setApartmentId(apt.getApartmentId());
        reg.setHouseholdSize(3);
        reg.setChildrenCount(1);
        authService.registerResident(reg);

        // Unit should not be available for other residents while request is pending
        List<AvailableApartmentResponse> available = apartmentService.getAvailableApartments(building1.getBuildingId(), null);
        assertTrue(available.stream().noneMatch(a -> a.getApartmentId().equals(apt.getApartmentId())));

        // Owner sees pending request in dashboard
        List<OccupancyRequestResponse> pendingList = occupancyService.getOwnerOccupancyRequests(owner1.getUser().getEmail(), OccupancyRequest.RequestStatus.PENDING);
        assertEquals(1, pendingList.size());
        assertEquals("Grace Applicant", pendingList.get(0).getResidentName());
        assertEquals("grace@test.com", pendingList.get(0).getResidentEmail());
        Long requestId = pendingList.get(0).getRequestId();

        // Unauthorized owner 2 cannot approve owner 1's request
        ReviewOccupancyRequest approveReq = new ReviewOccupancyRequest(true, null);
        assertThrows(BadRequestException.class, () -> {
            occupancyService.reviewOccupancyRequest(owner2.getUser().getEmail(), requestId, approveReq);
        });

        // Owner 1 approves request
        OccupancyRequestResponse approvedResp = occupancyService.reviewOccupancyRequest(owner1.getUser().getEmail(), requestId, approveReq);
        assertEquals("APPROVED", approvedResp.getStatus());

        // Grace now has active occupancy
        OccupancyResponse currentOcc = occupancyService.getCurrentOccupancy("grace@test.com");
        assertNotNull(currentOcc);
        assertEquals("ACTIVE", currentOcc.getStatus());
        assertEquals("301", currentOcc.getRoomNumber());
        assertEquals("Green Residency", currentOcc.getBuildingName());
        assertNotNull(currentOcc.getMeterNumber());

        // Owner inventory shows unit OCCUPIED by Grace
        BuildingInventoryResponse inv = apartmentService.getBuildingInventory(owner1.getUser().getEmail(), building1.getBuildingId());
        assertEquals(1, inv.getOccupiedCount());
        assertEquals(0, inv.getVacantCount());
    }

    @Test
    @DisplayName("Resident requests occupancy -> Owner rejects -> Unit reverts to VACANT")
    void testOccupancyRequestRejectionWorkflow() {
        // Owner 1 creates flat 401
        CreateApartmentRequest req = new CreateApartmentRequest();
        req.setFloorNumber(4);
        req.setApartmentName("Flat 401");
        req.setRoomNumber("401");
        ApartmentResponse apt = apartmentService.createApartment(owner1.getUser().getEmail(), building1.getBuildingId(), req);

        // Resident registers
        RegisterResidentRequest reg = new RegisterResidentRequest();
        reg.setName("Tom Applicant");
        reg.setEmail("tom@test.com");
        reg.setPassword("Secret@123");
        reg.setConfirmPassword("Secret@123");
        reg.setBuildingId(building1.getBuildingId());
        reg.setApartmentId(apt.getApartmentId());
        reg.setHouseholdSize(2);
        reg.setChildrenCount(0);
        authService.registerResident(reg);

        List<OccupancyRequestResponse> pendingList = occupancyService.getOwnerOccupancyRequests(owner1.getUser().getEmail(), OccupancyRequest.RequestStatus.PENDING);
        assertEquals(1, pendingList.size());
        Long reqId = pendingList.get(0).getRequestId();

        // Owner rejects with reason
        ReviewOccupancyRequest rejectReq = new ReviewOccupancyRequest(false, "Verification failed");
        OccupancyRequestResponse rejectedResp = occupancyService.reviewOccupancyRequest(owner1.getUser().getEmail(), reqId, rejectReq);
        assertEquals("REJECTED", rejectedResp.getStatus());
        assertEquals("Verification failed", rejectedResp.getRejectionReason());

        // Unit is once again available in public listings
        List<AvailableApartmentResponse> available = apartmentService.getAvailableApartments(building1.getBuildingId(), null);
        assertTrue(available.stream().anyMatch(a -> a.getApartmentId().equals(apt.getApartmentId())));

        // Tom has no active occupancy
        assertNull(occupancyService.getCurrentOccupancy("tom@test.com"));
    }

    // =========================================================================
    // DEDICATED SCENARIO TESTS: All 8 Required Validation Scenarios
    // =========================================================================

    @Test
    @DisplayName("Scenario 1: No building selected -> Registration rejected")
    void testScenario1_NoBuildingSelected_ThrowsBadRequest() {
        CreateApartmentRequest req = new CreateApartmentRequest();
        req.setFloorNumber(1);
        req.setApartmentName("Flat 501");
        req.setRoomNumber("501");
        ApartmentResponse apt = apartmentService.createApartment(owner1.getUser().getEmail(), building1.getBuildingId(), req);

        RegisterResidentRequest reg = new RegisterResidentRequest();
        reg.setName("User S1");
        reg.setEmail("s1@test.com");
        reg.setPassword("Secret@123");
        reg.setBuildingId(null); // Missing building
        reg.setApartmentId(apt.getApartmentId());
        reg.setHouseholdSize(2);
        reg.setChildrenCount(0);

        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.registerResident(reg));
        assertTrue(ex.getMessage().contains("Building selection is required"));
    }

    @Test
    @DisplayName("Scenario 2: No apartment selected -> Registration rejected")
    void testScenario2_NoApartmentSelected_ThrowsBadRequest() {
        RegisterResidentRequest reg = new RegisterResidentRequest();
        reg.setName("User S2");
        reg.setEmail("s2@test.com");
        reg.setPassword("Secret@123");
        reg.setBuildingId(building1.getBuildingId());
        reg.setApartmentId(null); // Missing apartment
        reg.setHouseholdSize(2);
        reg.setChildrenCount(0);

        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.registerResident(reg));
        assertTrue(ex.getMessage().contains("Apartment unit selection is required"));
    }

    @Test
    @DisplayName("Scenario 3: No household details -> Registration rejected")
    void testScenario3_NoHouseholdDetails_ThrowsBadRequest() {
        CreateApartmentRequest req = new CreateApartmentRequest();
        req.setFloorNumber(1);
        req.setApartmentName("Flat 503");
        req.setRoomNumber("503");
        ApartmentResponse apt = apartmentService.createApartment(owner1.getUser().getEmail(), building1.getBuildingId(), req);

        RegisterResidentRequest reg = new RegisterResidentRequest();
        reg.setName("User S3");
        reg.setEmail("s3@test.com");
        reg.setPassword("Secret@123");
        reg.setBuildingId(building1.getBuildingId());
        reg.setApartmentId(apt.getApartmentId());
        reg.setHouseholdSize(null); // Missing household size
        reg.setChildrenCount(null); // Missing children count

        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.registerResident(reg));
        assertTrue(ex.getMessage().contains("Total people (household size) is required"));
    }

    @Test
    @DisplayName("Scenario 4: Total People = 0 -> Registration rejected")
    void testScenario4_TotalPeopleZero_ThrowsBadRequest() {
        CreateApartmentRequest req = new CreateApartmentRequest();
        req.setFloorNumber(1);
        req.setApartmentName("Flat 504");
        req.setRoomNumber("504");
        ApartmentResponse apt = apartmentService.createApartment(owner1.getUser().getEmail(), building1.getBuildingId(), req);

        RegisterResidentRequest reg = new RegisterResidentRequest();
        reg.setName("User S4");
        reg.setEmail("s4@test.com");
        reg.setPassword("Secret@123");
        reg.setBuildingId(building1.getBuildingId());
        reg.setApartmentId(apt.getApartmentId());
        reg.setHouseholdSize(0); // 0 is invalid (min is 1)
        reg.setChildrenCount(0);

        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.registerResident(reg));
        assertTrue(ex.getMessage().contains("Total people must be between 1 and 15"));
    }

    @Test
    @DisplayName("Scenario 5: Total People = 16 -> Registration rejected")
    void testScenario5_TotalPeopleSixteen_ThrowsBadRequest() {
        CreateApartmentRequest req = new CreateApartmentRequest();
        req.setFloorNumber(1);
        req.setApartmentName("Flat 505");
        req.setRoomNumber("505");
        ApartmentResponse apt = apartmentService.createApartment(owner1.getUser().getEmail(), building1.getBuildingId(), req);

        RegisterResidentRequest reg = new RegisterResidentRequest();
        reg.setName("User S5");
        reg.setEmail("s5@test.com");
        reg.setPassword("Secret@123");
        reg.setBuildingId(building1.getBuildingId());
        reg.setApartmentId(apt.getApartmentId());
        reg.setHouseholdSize(16); // 16 is invalid (max is 15)
        reg.setChildrenCount(0);

        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.registerResident(reg));
        assertTrue(ex.getMessage().contains("Total people must be between 1 and 15"));
    }

    @Test
    @DisplayName("Scenario 6: Children greater than Total People -> Registration rejected")
    void testScenario6_ChildrenGreaterThanTotalPeople_ThrowsBadRequest() {
        CreateApartmentRequest req = new CreateApartmentRequest();
        req.setFloorNumber(1);
        req.setApartmentName("Flat 506");
        req.setRoomNumber("506");
        ApartmentResponse apt = apartmentService.createApartment(owner1.getUser().getEmail(), building1.getBuildingId(), req);

        RegisterResidentRequest reg = new RegisterResidentRequest();
        reg.setName("User S6");
        reg.setEmail("s6@test.com");
        reg.setPassword("Secret@123");
        reg.setBuildingId(building1.getBuildingId());
        reg.setApartmentId(apt.getApartmentId());
        reg.setHouseholdSize(2);
        reg.setChildrenCount(3); // 3 children > 2 total people!

        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.registerResident(reg));
        assertTrue(ex.getMessage().contains("Children count cannot exceed total people"));
    }

    @Test
    @DisplayName("Scenario 7: Apartment already occupied -> Registration rejected")
    void testScenario7_ApartmentAlreadyOccupied_ThrowsBadRequest() {
        CreateApartmentRequest req = new CreateApartmentRequest();
        req.setFloorNumber(1);
        req.setApartmentName("Flat 507");
        req.setRoomNumber("507");
        ApartmentResponse apt = apartmentService.createApartment(owner1.getUser().getEmail(), building1.getBuildingId(), req);

        // Occupy the apartment first
        RegisterResidentRequest firstTenant = new RegisterResidentRequest();
        firstTenant.setName("Tenant Prime");
        firstTenant.setEmail("prime@test.com");
        firstTenant.setPassword("Secret@123");
        firstTenant.setBuildingId(building1.getBuildingId());
        firstTenant.setApartmentId(apt.getApartmentId());
        firstTenant.setHouseholdSize(3);
        firstTenant.setChildrenCount(1);
        authService.registerResident(firstTenant);

        List<OccupancyRequestResponse> pending = occupancyService.getOwnerOccupancyRequests(owner1.getUser().getEmail(), OccupancyRequest.RequestStatus.PENDING);
        occupancyService.reviewOccupancyRequest(owner1.getUser().getEmail(), pending.get(0).getRequestId(), new ReviewOccupancyRequest(true, null));

        // Attempt second registration for already occupied unit
        RegisterResidentRequest secondTenant = new RegisterResidentRequest();
        secondTenant.setName("Second Tenant");
        secondTenant.setEmail("second@test.com");
        secondTenant.setPassword("Secret@123");
        secondTenant.setBuildingId(building1.getBuildingId());
        secondTenant.setApartmentId(apt.getApartmentId());
        secondTenant.setHouseholdSize(1);
        secondTenant.setChildrenCount(0);

        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.registerResident(secondTenant));
        assertTrue(ex.getMessage().contains("is already occupied"));
    }

    @Test
    @DisplayName("Scenario 8: All fields valid -> Account created successfully")
    void testScenario8_AllFieldsValid_AccountCreatedSuccessfully() {
        CreateApartmentRequest req = new CreateApartmentRequest();
        req.setFloorNumber(2);
        req.setApartmentName("Flat 508");
        req.setRoomNumber("508");
        ApartmentResponse apt = apartmentService.createApartment(owner1.getUser().getEmail(), building1.getBuildingId(), req);

        RegisterResidentRequest reg = new RegisterResidentRequest();
        reg.setName("Valid Resident");
        reg.setEmail("valid.res@test.com");
        reg.setPassword("Secret@123");
        reg.setConfirmPassword("Secret@123");
        reg.setPhone("9988776655");
        reg.setBuildingId(building1.getBuildingId());
        reg.setApartmentId(apt.getApartmentId());
        reg.setHouseholdSize(4);
        reg.setChildrenCount(2);

        var response = authService.registerResident(reg);
        assertNotNull(response);
        assertNotNull(response.getToken());
        assertEquals("RESIDENT", response.getRole());
        assertEquals("valid.res@test.com", response.getEmail());

        // Verify pending occupancy request was registered with correct household details
        var pending = occupancyService.getResidentPendingRequest("valid.res@test.com");
        assertNotNull(pending);
        assertEquals("PENDING", pending.getStatus());
        assertEquals(apt.getApartmentId(), pending.getApartmentId());
        assertEquals(4, pending.getHouseholdSize());
        assertEquals(2, pending.getChildrenCount());
    }
}
