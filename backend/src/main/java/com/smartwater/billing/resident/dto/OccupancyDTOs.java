package com.smartwater.billing.resident.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

public class OccupancyDTOs {

    public static class RegisterResidentRequest {
        @NotBlank(message = "Full name is required")
        private String name;

        @NotBlank(message = "Email address is required")
        @Email(message = "Invalid email format")
        private String email;

        @NotBlank(message = "Password is required")
        @Size(min = 6, message = "Password must be at least 6 characters")
        private String password;

        private String confirmPassword;
        private String phone;

        @NotNull(message = "Building selection is required")
        private Long buildingId;

        @NotNull(message = "Apartment unit selection is required")
        private Long apartmentId;

        private String invitationToken;

        @NotNull(message = "Total people (household size) is required")
        @Min(value = 1, message = "Total people must be between 1 and 15")
        @Max(value = 15, message = "Total people must be between 1 and 15")
        private Integer householdSize;

        @NotNull(message = "Children count (under 12) is required")
        @Min(value = 0, message = "Children count cannot be negative")
        private Integer childrenCount;

        @AssertTrue(message = "Children count cannot exceed total people")
        public boolean isChildrenValid() {
            if (householdSize == null || childrenCount == null) return true;
            return childrenCount <= householdSize;
        }

        public RegisterResidentRequest() {}

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }

        public String getConfirmPassword() { return confirmPassword; }
        public void setConfirmPassword(String confirmPassword) { this.confirmPassword = confirmPassword; }

        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }

        public Long getBuildingId() { return buildingId; }
        public void setBuildingId(Long buildingId) { this.buildingId = buildingId; }

        public Long getApartmentId() { return apartmentId; }
        public void setApartmentId(Long apartmentId) { this.apartmentId = apartmentId; }

        public String getInvitationToken() { return invitationToken; }
        public void setInvitationToken(String invitationToken) { this.invitationToken = invitationToken; }

        public Integer getHouseholdSize() { return householdSize; }
        public void setHouseholdSize(Integer householdSize) { this.householdSize = householdSize; }

        public Integer getChildrenCount() { return childrenCount; }
        public void setChildrenCount(Integer childrenCount) { this.childrenCount = childrenCount; }
    }

    public static class SelectApartmentRequest {
        @NotNull(message = "Apartment ID is required")
        private Long apartmentId;

        public SelectApartmentRequest() {}

        public SelectApartmentRequest(Long apartmentId) {
            this.apartmentId = apartmentId;
        }

        public Long getApartmentId() { return apartmentId; }
        public void setApartmentId(Long apartmentId) { this.apartmentId = apartmentId; }
    }

    public static class MoveOutRequest {
        @NotNull(message = "Confirmation must be explicitly agreed to")
        private Boolean confirm;

        private String reason;

        public MoveOutRequest() {}

        public Boolean getConfirm() { return confirm; }
        public void setConfirm(Boolean confirm) { this.confirm = confirm; }

        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }

    public static class OccupancyResponse {
        private Long occupancyId;
        private Long apartmentId;
        private String apartmentName;
        private String roomNumber;
        private Integer floorNumber;
        private String unitType;
        private Long buildingId;
        private String buildingName;
        private String buildingNumber;
        private String buildingLocation;
        private String ownerName;
        private Long meterId;
        private String meterNumber;
        private LocalDateTime startDate;
        private LocalDateTime endDate;
        private String status; // ACTIVE, ENDED, PENDING_APPROVAL
        private String notes;

        public OccupancyResponse() {}

        public Long getOccupancyId() { return occupancyId; }
        public void setOccupancyId(Long occupancyId) { this.occupancyId = occupancyId; }

        public Long getApartmentId() { return apartmentId; }
        public void setApartmentId(Long apartmentId) { this.apartmentId = apartmentId; }

        public String getApartmentName() { return apartmentName; }
        public void setApartmentName(String apartmentName) { this.apartmentName = apartmentName; }

        public String getRoomNumber() { return roomNumber; }
        public void setRoomNumber(String roomNumber) { this.roomNumber = roomNumber; }

        public Integer getFloorNumber() { return floorNumber; }
        public void setFloorNumber(Integer floorNumber) { this.floorNumber = floorNumber; }

        public String getUnitType() { return unitType; }
        public void setUnitType(String unitType) { this.unitType = unitType; }

        public Long getBuildingId() { return buildingId; }
        public void setBuildingId(Long buildingId) { this.buildingId = buildingId; }

        public String getBuildingName() { return buildingName; }
        public void setBuildingName(String buildingName) { this.buildingName = buildingName; }

        public String getBuildingNumber() { return buildingNumber; }
        public void setBuildingNumber(String buildingNumber) { this.buildingNumber = buildingNumber; }

        public String getBuildingLocation() { return buildingLocation; }
        public void setBuildingLocation(String buildingLocation) { this.buildingLocation = buildingLocation; }

        public String getOwnerName() { return ownerName; }
        public void setOwnerName(String ownerName) { this.ownerName = ownerName; }

        public Long getMeterId() { return meterId; }
        public void setMeterId(Long meterId) { this.meterId = meterId; }

        public String getMeterNumber() { return meterNumber; }
        public void setMeterNumber(String meterNumber) { this.meterNumber = meterNumber; }

        public LocalDateTime getStartDate() { return startDate; }
        public void setStartDate(LocalDateTime startDate) { this.startDate = startDate; }

        public LocalDateTime getEndDate() { return endDate; }
        public void setEndDate(LocalDateTime endDate) { this.endDate = endDate; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }

        public static Builder builder() { return new Builder(); }

        public static class Builder {
            private Long occupancyId;
            private Long apartmentId;
            private String apartmentName;
            private String roomNumber;
            private Integer floorNumber;
            private String unitType;
            private Long buildingId;
            private String buildingName;
            private String buildingNumber;
            private String buildingLocation;
            private String ownerName;
            private Long meterId;
            private String meterNumber;
            private LocalDateTime startDate;
            private LocalDateTime endDate;
            private String status;
            private String notes;

            public Builder occupancyId(Long id) { this.occupancyId = id; return this; }
            public Builder apartmentId(Long id) { this.apartmentId = id; return this; }
            public Builder apartmentName(String n) { this.apartmentName = n; return this; }
            public Builder roomNumber(String r) { this.roomNumber = r; return this; }
            public Builder floorNumber(Integer f) { this.floorNumber = f; return this; }
            public Builder unitType(String t) { this.unitType = t; return this; }
            public Builder buildingId(Long id) { this.buildingId = id; return this; }
            public Builder buildingName(String n) { this.buildingName = n; return this; }
            public Builder buildingNumber(String n) { this.buildingNumber = n; return this; }
            public Builder buildingLocation(String l) { this.buildingLocation = l; return this; }
            public Builder ownerName(String n) { this.ownerName = n; return this; }
            public Builder meterId(Long id) { this.meterId = id; return this; }
            public Builder meterNumber(String m) { this.meterNumber = m; return this; }
            public Builder startDate(LocalDateTime d) { this.startDate = d; return this; }
            public Builder endDate(LocalDateTime d) { this.endDate = d; return this; }
            public Builder status(String s) { this.status = s; return this; }
            public Builder notes(String n) { this.notes = n; return this; }

            public OccupancyResponse build() {
                OccupancyResponse r = new OccupancyResponse();
                r.setOccupancyId(occupancyId);
                r.setApartmentId(apartmentId);
                r.setApartmentName(apartmentName);
                r.setRoomNumber(roomNumber);
                r.setFloorNumber(floorNumber);
                r.setUnitType(unitType);
                r.setBuildingId(buildingId);
                r.setBuildingName(buildingName);
                r.setBuildingNumber(buildingNumber);
                r.setBuildingLocation(buildingLocation);
                r.setOwnerName(ownerName);
                r.setMeterId(meterId);
                r.setMeterNumber(meterNumber);
                r.setStartDate(startDate);
                r.setEndDate(endDate);
                r.setStatus(status);
                r.setNotes(notes);
                return r;
            }
        }
    }

    public static class MoveOutResponse {
        private boolean success;
        private String message;
        private String buildingName;
        private String apartmentName;
        private String roomNumber;
        private LocalDateTime moveOutDate;

        public MoveOutResponse() {}

        public MoveOutResponse(boolean success, String message, String buildingName, String apartmentName, String roomNumber, LocalDateTime moveOutDate) {
            this.success = success;
            this.message = message;
            this.buildingName = buildingName;
            this.apartmentName = apartmentName;
            this.roomNumber = roomNumber;
            this.moveOutDate = moveOutDate;
        }

        public boolean isSuccess() { return success; }
        public void setSuccess(boolean success) { this.success = success; }

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }

        public String getBuildingName() { return buildingName; }
        public void setBuildingName(String buildingName) { this.buildingName = buildingName; }

        public String getApartmentName() { return apartmentName; }
        public void setApartmentName(String apartmentName) { this.apartmentName = apartmentName; }

        public String getRoomNumber() { return roomNumber; }
        public void setRoomNumber(String roomNumber) { this.roomNumber = roomNumber; }

        public LocalDateTime getMoveOutDate() { return moveOutDate; }
        public void setMoveOutDate(LocalDateTime moveOutDate) { this.moveOutDate = moveOutDate; }
    }

    public static class AvailableApartmentResponse {
        private Long apartmentId;
        private Long buildingId;
        private String buildingName;
        private String buildingNumber;
        private String location;
        private Integer floorNumber;
        private String apartmentName;
        private String roomNumber;
        private String unitType;
        private String description;
        private Long meterId;
        private String meterNumber;

        public AvailableApartmentResponse() {}

        public Long getApartmentId() { return apartmentId; }
        public void setApartmentId(Long apartmentId) { this.apartmentId = apartmentId; }

        public Long getBuildingId() { return buildingId; }
        public void setBuildingId(Long buildingId) { this.buildingId = buildingId; }

        public String getBuildingName() { return buildingName; }
        public void setBuildingName(String buildingName) { this.buildingName = buildingName; }

        public String getBuildingNumber() { return buildingNumber; }
        public void setBuildingNumber(String buildingNumber) { this.buildingNumber = buildingNumber; }

        public String getLocation() { return location; }
        public void setLocation(String location) { this.location = location; }

        public Integer getFloorNumber() { return floorNumber; }
        public void setFloorNumber(Integer floorNumber) { this.floorNumber = floorNumber; }

        public String getApartmentName() { return apartmentName; }
        public void setApartmentName(String apartmentName) { this.apartmentName = apartmentName; }

        public String getRoomNumber() { return roomNumber; }
        public void setRoomNumber(String roomNumber) { this.roomNumber = roomNumber; }

        public String getUnitType() { return unitType; }
        public void setUnitType(String unitType) { this.unitType = unitType; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public Long getMeterId() { return meterId; }
        public void setMeterId(Long meterId) { this.meterId = meterId; }

        public String getMeterNumber() { return meterNumber; }
        public void setMeterNumber(String meterNumber) { this.meterNumber = meterNumber; }

        public static Builder builder() { return new Builder(); }

        public static class Builder {
            private Long apartmentId;
            private Long buildingId;
            private String buildingName;
            private String buildingNumber;
            private String location;
            private Integer floorNumber;
            private String apartmentName;
            private String roomNumber;
            private String unitType;
            private String description;
            private Long meterId;
            private String meterNumber;

            public Builder apartmentId(Long id) { this.apartmentId = id; return this; }
            public Builder buildingId(Long id) { this.buildingId = id; return this; }
            public Builder buildingName(String n) { this.buildingName = n; return this; }
            public Builder buildingNumber(String n) { this.buildingNumber = n; return this; }
            public Builder location(String l) { this.location = l; return this; }
            public Builder floorNumber(Integer f) { this.floorNumber = f; return this; }
            public Builder apartmentName(String n) { this.apartmentName = n; return this; }
            public Builder roomNumber(String r) { this.roomNumber = r; return this; }
            public Builder unitType(String t) { this.unitType = t; return this; }
            public Builder description(String d) { this.description = d; return this; }
            public Builder meterId(Long id) { this.meterId = id; return this; }
            public Builder meterNumber(String m) { this.meterNumber = m; return this; }

            public AvailableApartmentResponse build() {
                AvailableApartmentResponse r = new AvailableApartmentResponse();
                r.setApartmentId(apartmentId);
                r.setBuildingId(buildingId);
                r.setBuildingName(buildingName);
                r.setBuildingNumber(buildingNumber);
                r.setLocation(location);
                r.setFloorNumber(floorNumber);
                r.setApartmentName(apartmentName);
                r.setRoomNumber(roomNumber);
                r.setUnitType(unitType);
                r.setDescription(description);
                r.setMeterId(meterId);
                r.setMeterNumber(meterNumber);
                return r;
            }
        }
    }

    public static class SubmitOccupancyRequest {
        @NotNull(message = "Apartment ID is required")
        private Long apartmentId;

        private String notes;

        private Integer householdSize;

        private Integer childrenCount;

        public SubmitOccupancyRequest() {}

        public SubmitOccupancyRequest(Long apartmentId, String notes) {
            this.apartmentId = apartmentId;
            this.notes = notes;
        }

        public SubmitOccupancyRequest(Long apartmentId, String notes, Integer householdSize, Integer childrenCount) {
            this.apartmentId = apartmentId;
            this.notes = notes;
            this.householdSize = householdSize;
            this.childrenCount = childrenCount;
        }

        public Long getApartmentId() { return apartmentId; }
        public void setApartmentId(Long apartmentId) { this.apartmentId = apartmentId; }

        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }

        public Integer getHouseholdSize() { return householdSize; }
        public void setHouseholdSize(Integer householdSize) { this.householdSize = householdSize; }

        public Integer getChildrenCount() { return childrenCount; }
        public void setChildrenCount(Integer childrenCount) { this.childrenCount = childrenCount; }
    }

    public static class ReviewOccupancyRequest {
        @NotNull(message = "Approval decision is required")
        private Boolean approved;

        private String reason;

        public ReviewOccupancyRequest() {}

        public ReviewOccupancyRequest(Boolean approved, String reason) {
            this.approved = approved;
            this.reason = reason;
        }

        public Boolean getApproved() { return approved; }
        public void setApproved(Boolean approved) { this.approved = approved; }

        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }

    public static class OccupancyRequestResponse {
        private Long requestId;
        private Long apartmentId;
        private String apartmentName;
        private String roomNumber;
        private Integer floorNumber;
        private String unitType;
        private Long buildingId;
        private String buildingName;
        private String buildingNumber;
        private String buildingLocation;
        private Long ownerId;
        private String ownerName;
        private String ownerPhone;
        private Long residentId;
        private String residentName;
        private String residentEmail;
        private String residentPhone;
        private String meterNumber;
        private String status; // PENDING, APPROVED, REJECTED, CANCELLED
        private LocalDateTime requestDate;
        private LocalDateTime reviewedAt;
        private String reviewedBy;
        private String rejectionReason;
        private String notes;
        private Integer householdSize;
        private Integer childrenCount;

        public OccupancyRequestResponse() {}

        public Long getRequestId() { return requestId; }
        public void setRequestId(Long requestId) { this.requestId = requestId; }

        public Long getApartmentId() { return apartmentId; }
        public void setApartmentId(Long apartmentId) { this.apartmentId = apartmentId; }

        public String getApartmentName() { return apartmentName; }
        public void setApartmentName(String apartmentName) { this.apartmentName = apartmentName; }

        public String getRoomNumber() { return roomNumber; }
        public void setRoomNumber(String roomNumber) { this.roomNumber = roomNumber; }

        public Integer getFloorNumber() { return floorNumber; }
        public void setFloorNumber(Integer floorNumber) { this.floorNumber = floorNumber; }

        public String getUnitType() { return unitType; }
        public void setUnitType(String unitType) { this.unitType = unitType; }

        public Long getBuildingId() { return buildingId; }
        public void setBuildingId(Long buildingId) { this.buildingId = buildingId; }

        public String getBuildingName() { return buildingName; }
        public void setBuildingName(String buildingName) { this.buildingName = buildingName; }

        public String getBuildingNumber() { return buildingNumber; }
        public void setBuildingNumber(String buildingNumber) { this.buildingNumber = buildingNumber; }

        public String getBuildingLocation() { return buildingLocation; }
        public void setBuildingLocation(String buildingLocation) { this.buildingLocation = buildingLocation; }

        public Long getOwnerId() { return ownerId; }
        public void setOwnerId(Long ownerId) { this.ownerId = ownerId; }

        public String getOwnerName() { return ownerName; }
        public void setOwnerName(String ownerName) { this.ownerName = ownerName; }

        public String getOwnerPhone() { return ownerPhone; }
        public void setOwnerPhone(String ownerPhone) { this.ownerPhone = ownerPhone; }

        public Long getResidentId() { return residentId; }
        public void setResidentId(Long residentId) { this.residentId = residentId; }

        public String getResidentName() { return residentName; }
        public void setResidentName(String residentName) { this.residentName = residentName; }

        public String getResidentEmail() { return residentEmail; }
        public void setResidentEmail(String residentEmail) { this.residentEmail = residentEmail; }

        public String getResidentPhone() { return residentPhone; }
        public void setResidentPhone(String residentPhone) { this.residentPhone = residentPhone; }

        public String getMeterNumber() { return meterNumber; }
        public void setMeterNumber(String meterNumber) { this.meterNumber = meterNumber; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public LocalDateTime getRequestDate() { return requestDate; }
        public void setRequestDate(LocalDateTime requestDate) { this.requestDate = requestDate; }

        public LocalDateTime getReviewedAt() { return reviewedAt; }
        public void setReviewedAt(LocalDateTime reviewedAt) { this.reviewedAt = reviewedAt; }

        public String getReviewedBy() { return reviewedBy; }
        public void setReviewedBy(String reviewedBy) { this.reviewedBy = reviewedBy; }

        public String getRejectionReason() { return rejectionReason; }
        public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }

        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }

        public Integer getHouseholdSize() { return householdSize; }
        public void setHouseholdSize(Integer householdSize) { this.householdSize = householdSize; }

        public Integer getChildrenCount() { return childrenCount; }
        public void setChildrenCount(Integer childrenCount) { this.childrenCount = childrenCount; }
    }

    public static class PublicOwnerResponse {
        private Long ownerId;
        private String name;
        private String phone;
        private int totalBuildings;

        public PublicOwnerResponse() {}

        public PublicOwnerResponse(Long ownerId, String name, String phone, int totalBuildings) {
            this.ownerId = ownerId;
            this.name = name;
            this.phone = phone;
            this.totalBuildings = totalBuildings;
        }

        public Long getOwnerId() { return ownerId; }
        public void setOwnerId(Long ownerId) { this.ownerId = ownerId; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }

        public int getTotalBuildings() { return totalBuildings; }
        public void setTotalBuildings(int totalBuildings) { this.totalBuildings = totalBuildings; }
    }

    public static class PublicBuildingResponse {
        private Long buildingId;
        private String buildingName;
        private String buildingNumber;
        private String location;
        private Integer totalFlats;
        private int vacantCount;
        private String ownerName;

        public PublicBuildingResponse() {}

        public PublicBuildingResponse(Long buildingId, String buildingName, String buildingNumber, String location, Integer totalFlats, int vacantCount) {
            this.buildingId = buildingId;
            this.buildingName = buildingName;
            this.buildingNumber = buildingNumber;
            this.location = location;
            this.totalFlats = totalFlats;
            this.vacantCount = vacantCount;
        }

        public PublicBuildingResponse(Long buildingId, String buildingName, String buildingNumber, String location, Integer totalFlats, int vacantCount, String ownerName) {
            this.buildingId = buildingId;
            this.buildingName = buildingName;
            this.buildingNumber = buildingNumber;
            this.location = location;
            this.totalFlats = totalFlats;
            this.vacantCount = vacantCount;
            this.ownerName = ownerName;
        }

        public Long getBuildingId() { return buildingId; }
        public void setBuildingId(Long buildingId) { this.buildingId = buildingId; }

        public String getBuildingName() { return buildingName; }
        public void setBuildingName(String buildingName) { this.buildingName = buildingName; }

        public String getBuildingNumber() { return buildingNumber; }
        public void setBuildingNumber(String buildingNumber) { this.buildingNumber = buildingNumber; }

        public String getLocation() { return location; }
        public void setLocation(String location) { this.location = location; }

        public Integer getTotalFlats() { return totalFlats; }
        public void setTotalFlats(Integer totalFlats) { this.totalFlats = totalFlats; }

        public int getVacantCount() { return vacantCount; }
        public void setVacantCount(int vacantCount) { this.vacantCount = vacantCount; }

        public String getOwnerName() { return ownerName; }
        public void setOwnerName(String ownerName) { this.ownerName = ownerName; }
    }
}
