package com.smartwater.billing.superadmin.service;

import com.smartwater.billing.common.dto.DashboardDTOs.*;
import com.smartwater.billing.common.entity.User;
import com.smartwater.billing.common.exception.ResourceNotFoundException;
import com.smartwater.billing.common.repository.*;
import com.smartwater.billing.owner.entity.Building;
import com.smartwater.billing.owner.entity.BuildingOwner;
import com.smartwater.billing.owner.repository.*;
import com.smartwater.billing.owner.service.BuildingOwnerService;
import com.smartwater.billing.resident.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import com.smartwater.billing.owner.entity.OwnerHistory;
import com.smartwater.billing.owner.repository.OwnerHistoryRepository;
import java.time.LocalDateTime;

import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SuperAdminService {

    private final BuildingOwnerRepository ownerRepository;
    private final BuildingRepository buildingRepository;
    private final ResidentRepository residentRepository;
    private final BillRepository billRepository;
    private final UserRepository userRepository;
    private final BuildingOwnerService buildingOwnerService;
    private final OwnerHistoryRepository ownerHistoryRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public SuperAdminService(
            BuildingOwnerRepository ownerRepository,
            BuildingRepository buildingRepository,
            ResidentRepository residentRepository,
            BillRepository billRepository,
            UserRepository userRepository,
            BuildingOwnerService buildingOwnerService,
            OwnerHistoryRepository ownerHistoryRepository
    ) {
        this.ownerRepository = ownerRepository;
        this.buildingRepository = buildingRepository;
        this.residentRepository = residentRepository;
        this.billRepository = billRepository;
        this.userRepository = userRepository;
        this.buildingOwnerService = buildingOwnerService;
        this.ownerHistoryRepository = ownerHistoryRepository;
    }

    public AdminDashboardStats getDashboardStats() {
        long totalOwners = ownerRepository.count();
        long pendingOwners = ownerRepository.findByApprovalStatus(BuildingOwner.ApprovalStatus.PENDING).size();
        long totalBuildings = buildingRepository.count();
        long totalResidents = residentRepository.count();
        Double totalRev = billRepository.getTotalSystemRevenue();
        double totalSystemRevenue = totalRev != null ? totalRev : 0.0;

        List<BuildingOwnerDTO> recentOwners = ownerRepository.findAll().stream()
                .map(this::convertToOwnerDTO)
                .collect(Collectors.toList());

        return AdminDashboardStats.builder()
                .totalOwners(totalOwners)
                .pendingOwners(pendingOwners)
                .totalBuildings(totalBuildings)
                .totalResidents(totalResidents)
                .totalSystemRevenue(totalSystemRevenue)
                .recentOwners(recentOwners)
                .build();
    }

    public List<BuildingOwnerDTO> getAllOwners() {
        return ownerRepository.findAll().stream()
                .map(this::convertToOwnerDTO)
                .collect(Collectors.toList());
    }

    public List<BuildingOwnerDTO> getPendingOwners() {
        return ownerRepository.findByApprovalStatus(BuildingOwner.ApprovalStatus.PENDING).stream()
                .map(this::convertToOwnerDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public BuildingOwnerDTO approveOwner(Long ownerId) {
        BuildingOwner owner = ownerRepository.findById(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Building Owner not found with id: " + ownerId));

        owner.setApprovalStatus(BuildingOwner.ApprovalStatus.APPROVED);
        User user = owner.getUser();
        if (user != null) {
            user.setStatus(User.UserStatus.APPROVED);
            userRepository.save(user);
        }
        ownerRepository.save(owner);

        return convertToOwnerDTO(owner);
    }

    @Transactional
    public BuildingOwnerDTO rejectOwner(Long ownerId) {
        BuildingOwner owner = ownerRepository.findById(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Building Owner not found with id: " + ownerId));

        owner.setApprovalStatus(BuildingOwner.ApprovalStatus.REJECTED);
        User user = owner.getUser();
        if (user != null) {
            user.setStatus(User.UserStatus.REJECTED);
            userRepository.save(user);
        }
        ownerRepository.save(owner);

        return convertToOwnerDTO(owner);
    }

    @Transactional
    public void deleteOwner(Long ownerId) {
        BuildingOwner owner = ownerRepository.findById(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Building Owner not found with id: " + ownerId));

        // 1. Log REMOVED event into owner_history table before deletion
        String email = owner.getUser() != null ? owner.getUser().getEmail() : "N/A";
        String phone = owner.getPhone() != null ? owner.getPhone() : "";
        try {
            ownerHistoryRepository.save(OwnerHistory.builder()
                    .ownerId(ownerId)
                    .ownerName(owner.getName())
                    .email(email)
                    .phone(phone)
                    .eventType("REMOVED")
                    .details("Building owner removed from platform by Super Admin.")
                    .actor("System Super Admin")
                    .timestamp(LocalDateTime.now())
                    .build());
        } catch (Exception ignored) {}

        try {
            entityManager.createNativeQuery("SET FOREIGN_KEY_CHECKS = 0").executeUpdate();

            // 2. Cascade delete all buildings owned by this owner
            List<Building> buildings = buildingRepository.findByOwner(owner);
            for (Building b : buildings) {
                buildingOwnerService.deleteBuildingCascade(b.getBuildingId());
            }

            // 3. Delete resident invitations issued by this owner
            entityManager.createNativeQuery("DELETE FROM resident_invitations WHERE invited_by_id = :ownerId")
                    .setParameter("ownerId", ownerId)
                    .executeUpdate();

            // 4. Delete building owner profile
            Long userId = owner.getUser() != null ? owner.getUser().getUserId() : null;
            entityManager.createNativeQuery("DELETE FROM building_owners WHERE owner_id = :ownerId")
                    .setParameter("ownerId", ownerId)
                    .executeUpdate();

            // 5. Delete user account if not super admin
            if (userId != null) {
                entityManager.createNativeQuery("UPDATE household_size_history SET changed_by_user_id = NULL WHERE changed_by_user_id = :uid")
                        .setParameter("uid", userId).executeUpdate();
                entityManager.createNativeQuery("DELETE FROM leak_feedback WHERE submitted_by_user_id = :uid")
                        .setParameter("uid", userId).executeUpdate();
                entityManager.createNativeQuery("DELETE FROM users WHERE user_id = :userId AND role != 'SUPER_ADMIN'")
                        .setParameter("userId", userId)
                        .executeUpdate();
            }
        } finally {
            entityManager.createNativeQuery("SET FOREIGN_KEY_CHECKS = 1").executeUpdate();
        }
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<SystemHistoryItemDTO> getSystemHistory() {
        List<SystemHistoryItemDTO> items = new ArrayList<>();

        // 1. Current / Joined Building Owners
        for (BuildingOwner owner : ownerRepository.findAll()) {
            String ts = owner.getCreatedAt() != null ? owner.getCreatedAt().toString() : "2026-10-14T00:00:00";
            String email = owner.getUser() != null ? owner.getUser().getEmail() : "N/A";
            String phone = owner.getPhone() != null && !owner.getPhone().isEmpty() ? owner.getPhone() : "Not provided";
            String status = owner.getApprovalStatus() == BuildingOwner.ApprovalStatus.APPROVED ? "JOINED" : owner.getApprovalStatus().name();
            items.add(new SystemHistoryItemDTO(
                    "JOIN-" + owner.getOwnerId(),
                    "JOINED",
                    "Building Owner Joined: " + owner.getName(),
                    "Owner account registered with email " + email + " and phone " + phone + " (Approval Status: " + owner.getApprovalStatus() + ")",
                    ts,
                    status,
                    owner.getName()
            ));
        }

        // 2. Removed / Left Building Owners from owner_history table
        try {
            List<OwnerHistory> histories = ownerHistoryRepository.findAllByOrderByTimestampDesc();
            for (OwnerHistory h : histories) {
                items.add(new SystemHistoryItemDTO(
                        "HIST-" + h.getId(),
                        h.getEventType() != null ? h.getEventType() : "REMOVED",
                        "Building Owner Removed: " + h.getOwnerName(),
                        h.getDetails() != null ? h.getDetails() : "Building owner removed from platform. Contact: " + h.getEmail() + " / " + h.getPhone(),
                        h.getTimestamp() != null ? h.getTimestamp().toString() : "2026-10-14T00:00:00",
                        "REMOVED",
                        h.getActor() != null ? h.getActor() : "System Super Admin"
                ));
            }
        } catch (Exception ignored) {}

        // Sort by timestamp descending
        items.sort((a, b) -> {
            if (a.getTimestamp() == null) return 1;
            if (b.getTimestamp() == null) return -1;
            return b.getTimestamp().compareTo(a.getTimestamp());
        });

        return items;
    }

    private BuildingOwnerDTO convertToOwnerDTO(BuildingOwner owner) {
        int totalBuildings = buildingRepository.findByOwner(owner).size();
        return BuildingOwnerDTO.builder()
                .ownerId(owner.getOwnerId())
                .userId(owner.getUser() != null ? owner.getUser().getUserId() : null)
                .name(owner.getName())
                .email(owner.getUser() != null ? owner.getUser().getEmail() : "")
                .phone(owner.getPhone())
                .approvalStatus(owner.getApprovalStatus().name())
                .totalBuildings(totalBuildings)
                .createdAt(owner.getCreatedAt() != null ? owner.getCreatedAt().toString() : "")
                .build();
    }
}
