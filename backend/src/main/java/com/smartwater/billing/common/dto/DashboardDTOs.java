package com.smartwater.billing.common.dto;

import java.util.List;

public class DashboardDTOs {

    public static class AdminDashboardStats {
        private long totalOwners;
        private long pendingOwners;
        private long totalBuildings;
        private long totalResidents;
        private double totalSystemRevenue;
        private List<BuildingOwnerDTO> recentOwners;

        public AdminDashboardStats() {}
        public AdminDashboardStats(long totalOwners, long pendingOwners, long totalBuildings, long totalResidents, double totalSystemRevenue, List<BuildingOwnerDTO> recentOwners) {
            this.totalOwners = totalOwners;
            this.pendingOwners = pendingOwners;
            this.totalBuildings = totalBuildings;
            this.totalResidents = totalResidents;
            this.totalSystemRevenue = totalSystemRevenue;
            this.recentOwners = recentOwners;
        }

        public long getTotalOwners() { return totalOwners; }
        public void setTotalOwners(long totalOwners) { this.totalOwners = totalOwners; }

        public long getPendingOwners() { return pendingOwners; }
        public void setPendingOwners(long pendingOwners) { this.pendingOwners = pendingOwners; }

        public long getTotalBuildings() { return totalBuildings; }
        public void setTotalBuildings(long totalBuildings) { this.totalBuildings = totalBuildings; }

        public long getTotalResidents() { return totalResidents; }
        public void setTotalResidents(long totalResidents) { this.totalResidents = totalResidents; }

        public double getTotalSystemRevenue() { return totalSystemRevenue; }
        public void setTotalSystemRevenue(double totalSystemRevenue) { this.totalSystemRevenue = totalSystemRevenue; }

        public List<BuildingOwnerDTO> getRecentOwners() { return recentOwners; }
        public void setRecentOwners(List<BuildingOwnerDTO> recentOwners) { this.recentOwners = recentOwners; }

        public static Builder builder() { return new Builder(); }

        public static class Builder {
            private long totalOwners;
            private long pendingOwners;
            private long totalBuildings;
            private long totalResidents;
            private double totalSystemRevenue;
            private List<BuildingOwnerDTO> recentOwners;

            public Builder totalOwners(long totalOwners) { this.totalOwners = totalOwners; return this; }
            public Builder pendingOwners(long pendingOwners) { this.pendingOwners = pendingOwners; return this; }
            public Builder totalBuildings(long totalBuildings) { this.totalBuildings = totalBuildings; return this; }
            public Builder totalResidents(long totalResidents) { this.totalResidents = totalResidents; return this; }
            public Builder totalSystemRevenue(double totalSystemRevenue) { this.totalSystemRevenue = totalSystemRevenue; return this; }
            public Builder recentOwners(List<BuildingOwnerDTO> recentOwners) { this.recentOwners = recentOwners; return this; }

            public AdminDashboardStats build() {
                return new AdminDashboardStats(totalOwners, pendingOwners, totalBuildings, totalResidents, totalSystemRevenue, recentOwners);
            }
        }
    }

    public static class OwnerDashboardStats {
        private long totalBuildings;
        private long totalResidents;
        private long pendingInvitations;
        private long pendingRequests;
        private long totalBillsGenerated;
        private double totalRevenue;
        private double totalUnitsConsumed;

        public OwnerDashboardStats() {}
        public OwnerDashboardStats(long totalBuildings, long totalResidents, long pendingInvitations, long totalBillsGenerated, double totalRevenue, double totalUnitsConsumed) {
            this.totalBuildings = totalBuildings;
            this.totalResidents = totalResidents;
            this.pendingInvitations = pendingInvitations;
            this.pendingRequests = pendingInvitations;
            this.totalBillsGenerated = totalBillsGenerated;
            this.totalRevenue = totalRevenue;
            this.totalUnitsConsumed = totalUnitsConsumed;
        }

        public OwnerDashboardStats(long totalBuildings, long totalResidents, long pendingInvitations, long pendingRequests, long totalBillsGenerated, double totalRevenue, double totalUnitsConsumed) {
            this.totalBuildings = totalBuildings;
            this.totalResidents = totalResidents;
            this.pendingInvitations = pendingInvitations;
            this.pendingRequests = pendingRequests;
            this.totalBillsGenerated = totalBillsGenerated;
            this.totalRevenue = totalRevenue;
            this.totalUnitsConsumed = totalUnitsConsumed;
        }

        public long getTotalBuildings() { return totalBuildings; }
        public void setTotalBuildings(long totalBuildings) { this.totalBuildings = totalBuildings; }

        public long getTotalResidents() { return totalResidents; }
        public void setTotalResidents(long totalResidents) { this.totalResidents = totalResidents; }

        public long getPendingInvitations() { return pendingInvitations; }
        public void setPendingInvitations(long pendingInvitations) { this.pendingInvitations = pendingInvitations; }

        public long getPendingRequests() { return pendingRequests; }
        public void setPendingRequests(long pendingRequests) { this.pendingRequests = pendingRequests; }

        public long getTotalBillsGenerated() { return totalBillsGenerated; }
        public void setTotalBillsGenerated(long totalBillsGenerated) { this.totalBillsGenerated = totalBillsGenerated; }

        public double getTotalRevenue() { return totalRevenue; }
        public void setTotalRevenue(double totalRevenue) { this.totalRevenue = totalRevenue; }

        public double getTotalUnitsConsumed() { return totalUnitsConsumed; }
        public void setTotalUnitsConsumed(double totalUnitsConsumed) { this.totalUnitsConsumed = totalUnitsConsumed; }

        public static Builder builder() { return new Builder(); }

        public static class Builder {
            private long totalBuildings;
            private long totalResidents;
            private long pendingInvitations;
            private long pendingRequests;
            private long totalBillsGenerated;
            private double totalRevenue;
            private double totalUnitsConsumed;

            public Builder totalBuildings(long totalBuildings) { this.totalBuildings = totalBuildings; return this; }
            public Builder totalResidents(long totalResidents) { this.totalResidents = totalResidents; return this; }
            public Builder pendingInvitations(long pendingInvitations) { this.pendingInvitations = pendingInvitations; return this; }
            public Builder pendingRequests(long pendingRequests) { this.pendingRequests = pendingRequests; return this; }
            public Builder totalBillsGenerated(long totalBillsGenerated) { this.totalBillsGenerated = totalBillsGenerated; return this; }
            public Builder totalRevenue(double totalRevenue) { this.totalRevenue = totalRevenue; return this; }
            public Builder totalUnitsConsumed(double totalUnitsConsumed) { this.totalUnitsConsumed = totalUnitsConsumed; return this; }

            public OwnerDashboardStats build() {
                return new OwnerDashboardStats(totalBuildings, totalResidents, pendingInvitations, pendingRequests, totalBillsGenerated, totalRevenue, totalUnitsConsumed);
            }
        }
    }

    public static class ResidentDashboardStats {
        private String residentName;
        private String buildingName;
        private String apartmentNumber;
        private String meterNumber;
        private Double currentMonthUsage;
        private Double activeBillAmount;
        private String activeBillStatus;
        private String activeBillDueDate;
        private long unreadNotificationsCount;
        private String currentBillingCycle;
        private String cycleStartDate;
        private String cycleEndDate;
        private Boolean hasActiveApartment;

        public ResidentDashboardStats() {}
        public ResidentDashboardStats(String residentName, String buildingName, String apartmentNumber, String meterNumber, Double currentMonthUsage, Double activeBillAmount, String activeBillStatus, String activeBillDueDate, long unreadNotificationsCount, String currentBillingCycle, String cycleStartDate, String cycleEndDate) {
            this(residentName, buildingName, apartmentNumber, meterNumber, currentMonthUsage, activeBillAmount, activeBillStatus, activeBillDueDate, unreadNotificationsCount, currentBillingCycle, cycleStartDate, cycleEndDate, true);
        }
        public ResidentDashboardStats(String residentName, String buildingName, String apartmentNumber, String meterNumber, Double currentMonthUsage, Double activeBillAmount, String activeBillStatus, String activeBillDueDate, long unreadNotificationsCount, String currentBillingCycle, String cycleStartDate, String cycleEndDate, Boolean hasActiveApartment) {
            this.residentName = residentName;
            this.buildingName = buildingName;
            this.apartmentNumber = apartmentNumber;
            this.meterNumber = meterNumber;
            this.currentMonthUsage = currentMonthUsage;
            this.activeBillAmount = activeBillAmount;
            this.activeBillStatus = activeBillStatus;
            this.activeBillDueDate = activeBillDueDate;
            this.unreadNotificationsCount = unreadNotificationsCount;
            this.currentBillingCycle = currentBillingCycle;
            this.cycleStartDate = cycleStartDate;
            this.cycleEndDate = cycleEndDate;
            this.hasActiveApartment = hasActiveApartment;
        }

        public String getResidentName() { return residentName; }
        public void setResidentName(String residentName) { this.residentName = residentName; }

        public String getBuildingName() { return buildingName; }
        public void setBuildingName(String buildingName) { this.buildingName = buildingName; }

        public String getApartmentNumber() { return apartmentNumber; }
        public void setApartmentNumber(String apartmentNumber) { this.apartmentNumber = apartmentNumber; }

        public String getMeterNumber() { return meterNumber; }
        public void setMeterNumber(String meterNumber) { this.meterNumber = meterNumber; }

        public Double getCurrentMonthUsage() { return currentMonthUsage; }
        public void setCurrentMonthUsage(Double currentMonthUsage) { this.currentMonthUsage = currentMonthUsage; }

        public Double getActiveBillAmount() { return activeBillAmount; }
        public void setActiveBillAmount(Double activeBillAmount) { this.activeBillAmount = activeBillAmount; }

        public String getActiveBillStatus() { return activeBillStatus; }
        public void setActiveBillStatus(String activeBillStatus) { this.activeBillStatus = activeBillStatus; }

        public String getActiveBillDueDate() { return activeBillDueDate; }
        public void setActiveBillDueDate(String activeBillDueDate) { this.activeBillDueDate = activeBillDueDate; }

        public long getUnreadNotificationsCount() { return unreadNotificationsCount; }
        public void setUnreadNotificationsCount(long unreadNotificationsCount) { this.unreadNotificationsCount = unreadNotificationsCount; }

        public String getCurrentBillingCycle() { return currentBillingCycle; }
        public void setCurrentBillingCycle(String currentBillingCycle) { this.currentBillingCycle = currentBillingCycle; }

        public String getCycleStartDate() { return cycleStartDate; }
        public void setCycleStartDate(String cycleStartDate) { this.cycleStartDate = cycleStartDate; }

        public String getCycleEndDate() { return cycleEndDate; }
        public void setCycleEndDate(String cycleEndDate) { this.cycleEndDate = cycleEndDate; }

        public Boolean getHasActiveApartment() { return hasActiveApartment; }
        public void setHasActiveApartment(Boolean hasActiveApartment) { this.hasActiveApartment = hasActiveApartment; }

        public static Builder builder() { return new Builder(); }

        public static class Builder {
            private String residentName;
            private String buildingName;
            private String apartmentNumber;
            private String meterNumber;
            private Double currentMonthUsage;
            private Double activeBillAmount;
            private String activeBillStatus;
            private String activeBillDueDate;
            private long unreadNotificationsCount;
            private String currentBillingCycle;
            private String cycleStartDate;
            private String cycleEndDate;
            private Boolean hasActiveApartment = true;

            public Builder residentName(String residentName) { this.residentName = residentName; return this; }
            public Builder buildingName(String buildingName) { this.buildingName = buildingName; return this; }
            public Builder apartmentNumber(String apartmentNumber) { this.apartmentNumber = apartmentNumber; return this; }
            public Builder meterNumber(String meterNumber) { this.meterNumber = meterNumber; return this; }
            public Builder currentMonthUsage(Double currentMonthUsage) { this.currentMonthUsage = currentMonthUsage; return this; }
            public Builder activeBillAmount(Double activeBillAmount) { this.activeBillAmount = activeBillAmount; return this; }
            public Builder activeBillStatus(String activeBillStatus) { this.activeBillStatus = activeBillStatus; return this; }
            public Builder activeBillDueDate(String activeBillDueDate) { this.activeBillDueDate = activeBillDueDate; return this; }
            public Builder unreadNotificationsCount(long unreadNotificationsCount) { this.unreadNotificationsCount = unreadNotificationsCount; return this; }
            public Builder currentBillingCycle(String currentBillingCycle) { this.currentBillingCycle = currentBillingCycle; return this; }
            public Builder cycleStartDate(String cycleStartDate) { this.cycleStartDate = cycleStartDate; return this; }
            public Builder cycleEndDate(String cycleEndDate) { this.cycleEndDate = cycleEndDate; return this; }
            public Builder hasActiveApartment(Boolean hasActiveApartment) { this.hasActiveApartment = hasActiveApartment; return this; }

            public ResidentDashboardStats build() {
                return new ResidentDashboardStats(residentName, buildingName, apartmentNumber, meterNumber, currentMonthUsage, activeBillAmount, activeBillStatus, activeBillDueDate, unreadNotificationsCount, currentBillingCycle, cycleStartDate, cycleEndDate, hasActiveApartment);
            }
        }
    }

    public static class ResidentComparisonResponse {
        private Double householdUsage;
        private Double apartmentAverage;
        private Double similarHouseholdAverage;
        private Double differenceFromApartmentAverage;
        private Double percentageDifference;
        private String message;

        public ResidentComparisonResponse() {}
        public ResidentComparisonResponse(Double householdUsage, Double apartmentAverage, Double similarHouseholdAverage, Double differenceFromApartmentAverage, Double percentageDifference, String message) {
            this.householdUsage = householdUsage;
            this.apartmentAverage = apartmentAverage;
            this.similarHouseholdAverage = similarHouseholdAverage;
            this.differenceFromApartmentAverage = differenceFromApartmentAverage;
            this.percentageDifference = percentageDifference;
            this.message = message;
        }

        public Double getHouseholdUsage() { return householdUsage; }
        public void setHouseholdUsage(Double householdUsage) { this.householdUsage = householdUsage; }

        public Double getApartmentAverage() { return apartmentAverage; }
        public void setApartmentAverage(Double apartmentAverage) { this.apartmentAverage = apartmentAverage; }

        public Double getSimilarHouseholdAverage() { return similarHouseholdAverage; }
        public void setSimilarHouseholdAverage(Double similarHouseholdAverage) { this.similarHouseholdAverage = similarHouseholdAverage; }

        public Double getDifferenceFromApartmentAverage() { return differenceFromApartmentAverage; }
        public void setDifferenceFromApartmentAverage(Double differenceFromApartmentAverage) { this.differenceFromApartmentAverage = differenceFromApartmentAverage; }

        public Double getPercentageDifference() { return percentageDifference; }
        public void setPercentageDifference(Double percentageDifference) { this.percentageDifference = percentageDifference; }

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }

        public static Builder builder() { return new Builder(); }

        public static class Builder {
            private Double householdUsage;
            private Double apartmentAverage;
            private Double similarHouseholdAverage;
            private Double differenceFromApartmentAverage;
            private Double percentageDifference;
            private String message;

            public Builder householdUsage(Double householdUsage) { this.householdUsage = householdUsage; return this; }
            public Builder apartmentAverage(Double apartmentAverage) { this.apartmentAverage = apartmentAverage; return this; }
            public Builder similarHouseholdAverage(Double similarHouseholdAverage) { this.similarHouseholdAverage = similarHouseholdAverage; return this; }
            public Builder differenceFromApartmentAverage(Double differenceFromApartmentAverage) { this.differenceFromApartmentAverage = differenceFromApartmentAverage; return this; }
            public Builder percentageDifference(Double percentageDifference) { this.percentageDifference = percentageDifference; return this; }
            public Builder message(String message) { this.message = message; return this; }

            public ResidentComparisonResponse build() {
                return new ResidentComparisonResponse(householdUsage, apartmentAverage, similarHouseholdAverage, differenceFromApartmentAverage, percentageDifference, message);
            }
        }
    }

    public static class OwnerHouseholdUsageDTO {
        private Long residentId;
        private Long apartmentId;
        private Integer floorNumber;
        private String apartmentNumber;
        private String residentName;
        private String meterNumber;
        private Double unitsConsumed;
        private String status;
        private Double apartmentAverage;
        private Boolean isOccupied;

        public OwnerHouseholdUsageDTO() {}
        public OwnerHouseholdUsageDTO(Long residentId, String apartmentNumber, String residentName, String meterNumber, Double unitsConsumed, String status, Double apartmentAverage) {
            this(residentId, null, null, apartmentNumber, residentName, meterNumber, unitsConsumed, status, apartmentAverage, residentId != null);
        }

        public OwnerHouseholdUsageDTO(Long residentId, Long apartmentId, Integer floorNumber, String apartmentNumber, String residentName, String meterNumber, Double unitsConsumed, String status, Double apartmentAverage, Boolean isOccupied) {
            this.residentId = residentId;
            this.apartmentId = apartmentId;
            this.floorNumber = floorNumber;
            this.apartmentNumber = apartmentNumber;
            this.residentName = residentName;
            this.meterNumber = meterNumber;
            this.unitsConsumed = unitsConsumed;
            this.status = status;
            this.apartmentAverage = apartmentAverage;
            this.isOccupied = isOccupied;
        }

        public Long getResidentId() { return residentId; }
        public void setResidentId(Long residentId) { this.residentId = residentId; }

        public Long getApartmentId() { return apartmentId; }
        public void setApartmentId(Long apartmentId) { this.apartmentId = apartmentId; }

        public Integer getFloorNumber() { return floorNumber; }
        public void setFloorNumber(Integer floorNumber) { this.floorNumber = floorNumber; }

        public String getApartmentNumber() { return apartmentNumber; }
        public void setApartmentNumber(String apartmentNumber) { this.apartmentNumber = apartmentNumber; }

        public String getResidentName() { return residentName; }
        public void setResidentName(String residentName) { this.residentName = residentName; }

        public String getMeterNumber() { return meterNumber; }
        public void setMeterNumber(String meterNumber) { this.meterNumber = meterNumber; }

        public Double getUnitsConsumed() { return unitsConsumed; }
        public void setUnitsConsumed(Double unitsConsumed) { this.unitsConsumed = unitsConsumed; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public Double getApartmentAverage() { return apartmentAverage; }
        public void setApartmentAverage(Double apartmentAverage) { this.apartmentAverage = apartmentAverage; }

        public Boolean getIsOccupied() { return isOccupied; }
        public void setIsOccupied(Boolean isOccupied) { this.isOccupied = isOccupied; }

        public static Builder builder() { return new Builder(); }

        public static class Builder {
            private Long residentId;
            private Long apartmentId;
            private Integer floorNumber;
            private String apartmentNumber;
            private String residentName;
            private String meterNumber;
            private Double unitsConsumed;
            private String status;
            private Double apartmentAverage;
            private Boolean isOccupied;

            public Builder residentId(Long residentId) { this.residentId = residentId; return this; }
            public Builder apartmentId(Long apartmentId) { this.apartmentId = apartmentId; return this; }
            public Builder floorNumber(Integer floorNumber) { this.floorNumber = floorNumber; return this; }
            public Builder apartmentNumber(String apartmentNumber) { this.apartmentNumber = apartmentNumber; return this; }
            public Builder residentName(String residentName) { this.residentName = residentName; return this; }
            public Builder meterNumber(String meterNumber) { this.meterNumber = meterNumber; return this; }
            public Builder unitsConsumed(Double unitsConsumed) { this.unitsConsumed = unitsConsumed; return this; }
            public Builder status(String status) { this.status = status; return this; }
            public Builder apartmentAverage(Double apartmentAverage) { this.apartmentAverage = apartmentAverage; return this; }
            public Builder isOccupied(Boolean isOccupied) { this.isOccupied = isOccupied; return this; }

            public OwnerHouseholdUsageDTO build() {
                return new OwnerHouseholdUsageDTO(residentId, apartmentId, floorNumber, apartmentNumber, residentName, meterNumber, unitsConsumed, status, apartmentAverage, isOccupied != null ? isOccupied : (residentId != null));
            }
        }
    }

    public static class OwnerUsageComparisonResponse {
        private Long buildingId;
        private String buildingName;
        private Double buildingAverage;
        private Long billingCycleId;
        private String billingMonth;
        private Integer totalApartments;
        private Integer activeApartments;
        private List<OwnerHouseholdUsageDTO> households;

        public OwnerUsageComparisonResponse() {}
        public OwnerUsageComparisonResponse(Long buildingId, String buildingName, Double buildingAverage, List<OwnerHouseholdUsageDTO> households) {
            this(buildingId, buildingName, buildingAverage, null, null, households != null ? households.size() : 0, null, households);
        }

        public OwnerUsageComparisonResponse(Long buildingId, String buildingName, Double buildingAverage, Long billingCycleId, String billingMonth, Integer totalApartments, Integer activeApartments, List<OwnerHouseholdUsageDTO> households) {
            this.buildingId = buildingId;
            this.buildingName = buildingName;
            this.buildingAverage = buildingAverage;
            this.billingCycleId = billingCycleId;
            this.billingMonth = billingMonth;
            this.totalApartments = totalApartments;
            this.activeApartments = activeApartments;
            this.households = households;
        }

        public Long getBuildingId() { return buildingId; }
        public void setBuildingId(Long buildingId) { this.buildingId = buildingId; }

        public String getBuildingName() { return buildingName; }
        public void setBuildingName(String buildingName) { this.buildingName = buildingName; }

        public Double getBuildingAverage() { return buildingAverage; }
        public void setBuildingAverage(Double buildingAverage) { this.buildingAverage = buildingAverage; }

        public Long getBillingCycleId() { return billingCycleId; }
        public void setBillingCycleId(Long billingCycleId) { this.billingCycleId = billingCycleId; }

        public String getBillingMonth() { return billingMonth; }
        public void setBillingMonth(String billingMonth) { this.billingMonth = billingMonth; }

        public Integer getTotalApartments() { return totalApartments; }
        public void setTotalApartments(Integer totalApartments) { this.totalApartments = totalApartments; }

        public Integer getActiveApartments() { return activeApartments; }
        public void setActiveApartments(Integer activeApartments) { this.activeApartments = activeApartments; }

        public List<OwnerHouseholdUsageDTO> getHouseholds() { return households; }
        public void setHouseholds(List<OwnerHouseholdUsageDTO> households) { this.households = households; }

        public static Builder builder() { return new Builder(); }

        public static class Builder {
            private Long buildingId;
            private String buildingName;
            private Double buildingAverage;
            private Long billingCycleId;
            private String billingMonth;
            private Integer totalApartments;
            private Integer activeApartments;
            private List<OwnerHouseholdUsageDTO> households;

            public Builder buildingId(Long buildingId) { this.buildingId = buildingId; return this; }
            public Builder buildingName(String buildingName) { this.buildingName = buildingName; return this; }
            public Builder buildingAverage(Double buildingAverage) { this.buildingAverage = buildingAverage; return this; }
            public Builder billingCycleId(Long billingCycleId) { this.billingCycleId = billingCycleId; return this; }
            public Builder billingMonth(String billingMonth) { this.billingMonth = billingMonth; return this; }
            public Builder totalApartments(Integer totalApartments) { this.totalApartments = totalApartments; return this; }
            public Builder activeApartments(Integer activeApartments) { this.activeApartments = activeApartments; return this; }
            public Builder households(List<OwnerHouseholdUsageDTO> households) { this.households = households; return this; }

            public OwnerUsageComparisonResponse build() {
                return new OwnerUsageComparisonResponse(buildingId, buildingName, buildingAverage, billingCycleId, billingMonth, totalApartments, activeApartments, households);
            }
        }
    }

    public static class BuildingOwnerDTO {
        private Long ownerId;
        private Long userId;
        private String name;
        private String email;
        private String phone;
        private String approvalStatus;
        private int totalBuildings;
        private String createdAt;

        public BuildingOwnerDTO() {}
        public BuildingOwnerDTO(Long ownerId, Long userId, String name, String email, String phone, String approvalStatus, int totalBuildings, String createdAt) {
            this.ownerId = ownerId;
            this.userId = userId;
            this.name = name;
            this.email = email;
            this.phone = phone;
            this.approvalStatus = approvalStatus;
            this.totalBuildings = totalBuildings;
            this.createdAt = createdAt;
        }

        public Long getOwnerId() { return ownerId; }
        public void setOwnerId(Long ownerId) { this.ownerId = ownerId; }

        public Long getUserId() { return userId; }
        public void setUserId(Long userId) { this.userId = userId; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }

        public String getApprovalStatus() { return approvalStatus; }
        public void setApprovalStatus(String approvalStatus) { this.approvalStatus = approvalStatus; }

        public int getTotalBuildings() { return totalBuildings; }
        public void setTotalBuildings(int totalBuildings) { this.totalBuildings = totalBuildings; }

        public String getCreatedAt() { return createdAt; }
        public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

        public static Builder builder() { return new Builder(); }

        public static class Builder {
            private Long ownerId;
            private Long userId;
            private String name;
            private String email;
            private String phone;
            private String approvalStatus;
            private int totalBuildings;
            private String createdAt;

            public Builder ownerId(Long ownerId) { this.ownerId = ownerId; return this; }
            public Builder userId(Long userId) { this.userId = userId; return this; }
            public Builder name(String name) { this.name = name; return this; }
            public Builder email(String email) { this.email = email; return this; }
            public Builder phone(String phone) { this.phone = phone; return this; }
            public Builder approvalStatus(String approvalStatus) { this.approvalStatus = approvalStatus; return this; }
            public Builder totalBuildings(int totalBuildings) { this.totalBuildings = totalBuildings; return this; }
            public Builder createdAt(String createdAt) { this.createdAt = createdAt; return this; }

            public BuildingOwnerDTO build() {
                return new BuildingOwnerDTO(ownerId, userId, name, email, phone, approvalStatus, totalBuildings, createdAt);
            }
        }
    }

    public static class SystemHistoryItemDTO {
        private String id;
        private String category;
        private String title;
        private String description;
        private String timestamp;
        private String status;
        private String actor;

        public SystemHistoryItemDTO() {}
        public SystemHistoryItemDTO(String id, String category, String title, String description, String timestamp, String status, String actor) {
            this.id = id;
            this.category = category;
            this.title = title;
            this.description = description;
            this.timestamp = timestamp;
            this.status = status;
            this.actor = actor;
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public String getTimestamp() { return timestamp; }
        public void setTimestamp(String timestamp) { this.timestamp = timestamp; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public String getActor() { return actor; }
        public void setActor(String actor) { this.actor = actor; }
    }

    public static class ResidentHistoryItemDTO {
        private String id;
        private String activityType; // "JOINED", "LEFT"
        private String residentName;
        private String residentEmail;
        private String residentPhone;
        private String buildingName;
        private String apartmentName;
        private String roomNumber;
        private String details;
        private String actor;
        private String timestamp;

        public ResidentHistoryItemDTO() {}
        public ResidentHistoryItemDTO(String id, String activityType, String residentName, String residentEmail, String residentPhone, String buildingName, String apartmentName, String roomNumber, String details, String actor, String timestamp) {
            this.id = id;
            this.activityType = activityType;
            this.residentName = residentName;
            this.residentEmail = residentEmail;
            this.residentPhone = residentPhone;
            this.buildingName = buildingName;
            this.apartmentName = apartmentName;
            this.roomNumber = roomNumber;
            this.details = details;
            this.actor = actor;
            this.timestamp = timestamp;
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getActivityType() { return activityType; }
        public void setActivityType(String activityType) { this.activityType = activityType; }

        public String getResidentName() { return residentName; }
        public void setResidentName(String residentName) { this.residentName = residentName; }

        public String getResidentEmail() { return residentEmail; }
        public void setResidentEmail(String residentEmail) { this.residentEmail = residentEmail; }

        public String getResidentPhone() { return residentPhone; }
        public void setResidentPhone(String residentPhone) { this.residentPhone = residentPhone; }

        public String getBuildingName() { return buildingName; }
        public void setBuildingName(String buildingName) { this.buildingName = buildingName; }

        public String getApartmentName() { return apartmentName; }
        public void setApartmentName(String apartmentName) { this.apartmentName = apartmentName; }

        public String getRoomNumber() { return roomNumber; }
        public void setRoomNumber(String roomNumber) { this.roomNumber = roomNumber; }

        public String getDetails() { return details; }
        public void setDetails(String details) { this.details = details; }

        public String getActor() { return actor; }
        public void setActor(String actor) { this.actor = actor; }

        public String getTimestamp() { return timestamp; }
        public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
    }
}

