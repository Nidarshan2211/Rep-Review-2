package com.smartwater.billing.common.ml;

import com.smartwater.billing.common.dto.LeakDTOs.*;
import com.smartwater.billing.common.entity.*;
import com.smartwater.billing.common.exception.BadRequestException;
import com.smartwater.billing.common.exception.ResourceNotFoundException;
import com.smartwater.billing.common.repository.*;
import com.smartwater.billing.owner.entity.Apartment;
import com.smartwater.billing.owner.entity.Building;
import com.smartwater.billing.owner.repository.ApartmentRepository;
import com.smartwater.billing.owner.repository.BuildingRepository;
import com.smartwater.billing.resident.entity.ApartmentOccupancy;
import com.smartwater.billing.resident.entity.ApartmentOccupancy.OccupancyStatus;
import com.smartwater.billing.resident.entity.Resident;
import com.smartwater.billing.resident.repository.ApartmentOccupancyRepository;
import com.smartwater.billing.resident.repository.ResidentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class LeakReportService {

    private static final Logger log = LoggerFactory.getLogger(LeakReportService.class);

    private final WaterUsageRepository usageRepository;
    private final WaterMeterRepository meterRepository;
    private final ResidentRepository residentRepository;
    private final ApartmentOccupancyRepository occupancyRepository;
    private final ApartmentRepository apartmentRepository;
    private final BillingCycleRepository billingCycleRepository;
    private final BuildingRepository buildingRepository;
    private final LeakIncidentRepository incidentRepository;
    private final LeakFeedbackRepository feedbackRepository;
    private final LeakDetectionService leakDetectionService;
    private final HouseholdProperties householdProperties;
    private final UserRepository userRepository;

    public LeakReportService(WaterUsageRepository usageRepository,
                              WaterMeterRepository meterRepository,
                              ResidentRepository residentRepository,
                              ApartmentOccupancyRepository occupancyRepository,
                              ApartmentRepository apartmentRepository,
                              BillingCycleRepository billingCycleRepository,
                              BuildingRepository buildingRepository,
                              LeakIncidentRepository incidentRepository,
                              LeakFeedbackRepository feedbackRepository,
                              LeakDetectionService leakDetectionService,
                              HouseholdProperties householdProperties,
                              UserRepository userRepository) {
        this.usageRepository = usageRepository;
        this.meterRepository = meterRepository;
        this.residentRepository = residentRepository;
        this.occupancyRepository = occupancyRepository;
        this.apartmentRepository = apartmentRepository;
        this.billingCycleRepository = billingCycleRepository;
        this.buildingRepository = buildingRepository;
        this.incidentRepository = incidentRepository;
        this.feedbackRepository = feedbackRepository;
        this.leakDetectionService = leakDetectionService;
        this.householdProperties = householdProperties;
        this.userRepository = userRepository;
    }

    /**
     * Resolves the leak status, risk score, expected range, and history for the logged-in resident.
     */
    @Transactional(readOnly = true)
    public ResidentLeakStatusResponse getResidentLeakStatus(String residentEmail) {
        Resident resident = residentRepository.findByUserEmail(residentEmail)
                .or(() -> residentRepository.findByEmailIgnoreCase(residentEmail))
                .orElseThrow(() -> new ResourceNotFoundException("Resident record not found for email: " + residentEmail));

        ApartmentOccupancy occ = occupancyRepository.findActiveByResidentEmail(residentEmail, OccupancyStatus.ACTIVE).orElse(null);
        Apartment apt = (occ != null) ? occ.getApartment() : null;

        WaterMeter meter = meterRepository.findFirstByResidentResidentId(resident.getResidentId())
                .or(() -> meterRepository.findByResidentResidentId(resident.getResidentId()))
                .orElse(null);

        if (meter == null && apt != null) {
            meter = meterRepository.findFirstByApartmentApartmentId(apt.getApartmentId()).orElse(null);
        }

        if (meter == null) {
            return ResidentLeakStatusResponse.builder()
                    .anomalyStatus("INSUFFICIENT_HISTORY")
                    .anomalyScore(0.0)
                    .anomalyReason("No water meter assigned to this residence.")
                    .anomalyConfidence("LOW")
                    .anomalyPattern("NORMAL")
                    .unitsConsumed(0.0)
                    .expectedMin(0.0)
                    .expectedMax(15.0)
                    .estimatedExtraCost(0.0)
                    .householdSize(occ != null ? occ.getHouseholdSize() : 3)
                    .householdSizeConfirmed(occ != null && occ.getHouseholdSizeConfirmed())
                    .recentHistory(Collections.emptyList())
                    .build();
        }

        List<WaterUsage> usageHistory = usageRepository.findByMeterMeterIdOrderByYearDescMonthDesc(meter.getMeterId());
        WaterUsage latestUsage = usageHistory.isEmpty() ? null : usageHistory.get(0);

        final int defaultHh = (occ != null && occ.getHouseholdSize() != null && occ.getHouseholdSize() > 0)
                ? occ.getHouseholdSize()
                : 2;

        final boolean isFirstMonth = (usageHistory.size() <= 1);

        List<ResidentLeakHistoryItem> historyItems = usageHistory.stream().limit(12).map(u -> {
            Optional<LeakFeedback> uFb = feedbackRepository.findFirstByUsageUsageIdOrderByCreatedAtDesc(u.getUsageId());
            Double minVal = u.getExpectedMin();
            Double maxVal = u.getExpectedMax();
            if (minVal == null || maxVal == null || (minVal == 0.0 && maxVal == 0.0)) {
                minVal = Math.round((defaultHh * 0.10 * 30) * 10.0) / 10.0;
                maxVal = Math.round((defaultHh * 0.25 * 30) * 10.0) / 10.0;
            }
            Double medVal = Math.round(((minVal + maxVal) / 2.0) * 10.0) / 10.0;
            String st = u.getAnomalyStatus();
            if (st == null || st.isBlank()) {
                st = isFirstMonth ? "INSUFFICIENT_HISTORY" : "NORMAL";
            }
            return ResidentLeakHistoryItem.builder()
                    .usageId(u.getUsageId())
                    .month(u.getMonth())
                    .year(u.getYear())
                    .unitsConsumed(u.getUnitsConsumed())
                    .expectedMin(minVal)
                    .expectedMax(maxVal)
                    .expectedUsage(medVal)
                    .anomalyPattern(u.getAnomalyPattern() != null ? u.getAnomalyPattern() : "NORMAL")
                    .anomalyStatus(st)
                    .anomalyScore(u.getAnomalyScore() != null ? u.getAnomalyScore() : 0.0)
                    .hasFeedback(false)
                    .latestFeedback(null)
                    .isFirstMonth(isFirstMonth)
                    .build();
        }).collect(Collectors.toList());

        if (latestUsage == null) {
            return ResidentLeakStatusResponse.builder()
                    .apartmentId(apt != null ? apt.getApartmentId() : null)
                    .apartmentNumber(apt != null ? apt.getRoomNumber() : resident.getApartmentNumber())
                    .anomalyStatus("INSUFFICIENT_HISTORY")
                    .anomalyScore(0.0)
                    .anomalyReason("No meter readings have been imported yet.")
                    .anomalyConfidence("LOW")
                    .anomalyPattern("NORMAL")
                    .unitsConsumed(0.0)
                    .expectedMin(0.0)
                    .expectedMax(15.0)
                    .estimatedExtraCost(0.0)
                    .householdSize(occ != null ? occ.getHouseholdSize() : 3)
                    .householdSizeConfirmed(occ != null && occ.getHouseholdSizeConfirmed())
                    .hasFeedback(false)
                    .latestFeedback(null)
                    .recentHistory(historyItems)
                    .build();
        }

        double extraCost = leakDetectionService.calculateEstimatedExtraCost(latestUsage);

        String incidentStatus = null;
        Long incidentId = latestUsage.getIncidentId();
        if (incidentId != null) {
            incidentStatus = incidentRepository.findById(incidentId).map(LeakIncident::getStatus).orElse(null);
        } else if (apt != null) {
            Optional<LeakIncident> openInc = incidentRepository.findFirstByApartmentApartmentIdAndStatusOrderByOpenedAtDesc(apt.getApartmentId(), "OPEN");
            if (openInc.isPresent()) {
                incidentId = openInc.get().getId();
                incidentStatus = openInc.get().getStatus();
            }
        }

        // Check feedback for latest usage
        Optional<LeakFeedback> fbOpt = feedbackRepository.findFirstByUsageUsageIdOrderByCreatedAtDesc(latestUsage.getUsageId());
        boolean hasFeedback = fbOpt.isPresent();
        String latestFeedback = fbOpt.map(LeakFeedback::getFeedback).orElse(null);
        String feedbackNote = fbOpt.map(LeakFeedback::getNote).orElse(null);
        LocalDateTime feedbackCreatedAt = fbOpt.map(LeakFeedback::getCreatedAt).orElse(null);

        Double currentMin = latestUsage.getExpectedMin();
        Double currentMax = latestUsage.getExpectedMax();
        if (currentMin == null || currentMax == null || (currentMin == 0.0 && currentMax == 0.0)) {
            currentMin = Math.round((defaultHh * 0.10 * 30) * 10.0) / 10.0;
            currentMax = Math.round((defaultHh * 0.25 * 30) * 10.0) / 10.0;
        }
        Double currentMedian = Math.round(((currentMin + currentMax) / 2.0) * 10.0) / 10.0;

        String status = latestUsage.getAnomalyStatus();
        if (status == null || status.isBlank()) {
            status = isFirstMonth ? "INSUFFICIENT_HISTORY" : "NORMAL";
        }

        String reason = latestUsage.getAnomalyReason();
        if (reason == null || reason.isBlank()) {
            if (isFirstMonth) {
                reason = String.format(java.util.Locale.US,
                    "First billing cycle: Establishing initial baseline. Normal range (%.1f - %.1f kL) is an initial benchmark calibrated from your %d-person household profile (100-250 L/person/day). Personalized ML pattern learning requires at least 2 billing cycles.",
                    currentMin, currentMax, defaultHh);
            } else {
                reason = "Consumption appears normal based on historical patterns.";
            }
        }

        Double score = latestUsage.getAnomalyScore();
        if (isFirstMonth && (score == null || score == 0.0)) {
            score = 0.0;
        }

        return ResidentLeakStatusResponse.builder()
                .usageId(latestUsage.getUsageId())
                .apartmentId(apt != null ? apt.getApartmentId() : null)
                .apartmentNumber(apt != null ? apt.getRoomNumber() : resident.getApartmentNumber())
                .billingCycleId(latestUsage.getBillingCycle() != null ? latestUsage.getBillingCycle().getId() : null)
                .month(latestUsage.getMonth())
                .year(latestUsage.getYear())
                .unitsConsumed(latestUsage.getUnitsConsumed())
                .expectedMin(currentMin)
                .expectedMax(currentMax)
                .expectedUsage(currentMedian)
                .anomalyScore(score)
                .anomalyStatus(status)
                .anomalyReason(reason)
                .anomalyConfidence(latestUsage.getAnomalyConfidence() != null ? latestUsage.getAnomalyConfidence() : (isFirstMonth ? "LOW" : "MEDIUM"))
                .anomalyPattern(latestUsage.getAnomalyPattern() != null ? latestUsage.getAnomalyPattern() : "NORMAL")
                .estimatedExtraCost(extraCost)
                .incidentId(incidentId)
                .incidentStatus(incidentStatus)
                .householdSize(occ != null ? occ.getHouseholdSize() : 3)
                .householdSizeConfirmed(occ != null && occ.getHouseholdSizeConfirmed())
                .hasFeedback(false)
                .latestFeedback(null)
                .recentHistory(historyItems)
                .isFirstMonth(isFirstMonth)
                .baselineSource(isFirstMonth ? "HOUSEHOLD_PROFILE_CALIBRATION" : "QUANTILE_REGRESSION_ML")
                .build();
    }

    /**
     * Resolves building-level leak detection summary and per-flat items for the owner dashboard.
     */
    @Transactional(readOnly = true)
    public OwnerLeakSummaryResponse getOwnerLeakSummary(String ownerEmail, Long buildingId, Long cycleId) {
        verifyOwnerAccess(ownerEmail, buildingId);

        Building building = buildingRepository.findById(buildingId)
                .orElseThrow(() -> new ResourceNotFoundException("Building not found with id: " + buildingId));

        BillingCycle cycle;
        if (cycleId != null) {
            cycle = billingCycleRepository.findById(cycleId)
                    .orElseThrow(() -> new ResourceNotFoundException("Billing cycle not found with id: " + cycleId));
        } else {
            List<BillingCycle> cycles = billingCycleRepository.findByBuildingBuildingIdOrderByStartDateDesc(buildingId);
            cycle = cycles.isEmpty() ? null : cycles.get(0);
        }

        if (cycle == null) {
            return OwnerLeakSummaryResponse.builder()
                    .buildingId(buildingId)
                    .buildingName(building.getBuildingName())
                    .totalFlats(apartmentRepository.findByBuildingBuildingId(buildingId).size())
                    .flatsScored(0)
                    .leaksDetectedCount(0)
                    .lowRiskCount(0)
                    .medRiskCount(0)
                    .highRiskCount(0)
                    .totalExcessWaterKl(0.0)
                    .estimatedWaterLossCost(0.0)
                    .activeIncidentsCount(0)
                    .items(Collections.emptyList())
                    .build();
        }

        List<Apartment> apartments = apartmentRepository.findByBuildingBuildingIdOrderByRoomNumberAsc(buildingId);
        List<WaterUsage> cycleUsages = usageRepository.findByBillingCycleId(cycle.getId());

        Map<Long, WaterUsage> usageByAptId = new HashMap<>();
        for (WaterUsage u : cycleUsages) {
            if (u.getMeter() != null && u.getMeter().getApartment() != null) {
                usageByAptId.put(u.getMeter().getApartment().getApartmentId(), u);
            }
        }

        int leaksDetected = 0;
        int lowRisk = 0;
        int medRisk = 0;
        int highRisk = 0;
        double totalExcessKl = 0.0;
        double totalLossCost = 0.0;
        List<FlatLeakItemResponse> flatItems = new ArrayList<>();

        for (Apartment apt : apartments) {
            WaterUsage usage = usageByAptId.get(apt.getApartmentId());
            Optional<ApartmentOccupancy> occOpt = occupancyRepository.findFirstByApartmentApartmentIdAndStatus(apt.getApartmentId(), OccupancyStatus.ACTIVE);

            String resName = "-";
            String resEmail = "-";
            Integer hhSize = householdProperties.getDefaultSizeForUnitType(apt.getUnitType());

            if (occOpt.isPresent()) {
                ApartmentOccupancy occ = occOpt.get();
                if (occ.getResident() != null) {
                    resName = occ.getResident().getName();
                    resEmail = occ.getResident().getEmail();
                }
                if (occ.getHouseholdSize() != null) {
                    hhSize = occ.getHouseholdSize();
                }
            }

            if (usage != null) {
                String status = usage.getAnomalyStatus() != null ? usage.getAnomalyStatus() : "NORMAL";
                Double score = usage.getAnomalyScore() != null ? usage.getAnomalyScore() : 0.0;
                Double units = usage.getUnitsConsumed() != null ? usage.getUnitsConsumed() : 0.0;
                Double expMin = usage.getExpectedMin();
                Double expMax = usage.getExpectedMax();

                // 1. Guard against null or 0.0 expectedMin / expectedMax
                if (expMin == null || expMax == null || (expMin == 0.0 && expMax == 0.0)) {
                    int people = (hhSize != null && hhSize > 0) ? hhSize : 2;
                    int days = 30;
                    expMin = Math.round((people * 0.10 * days) * 10.0) / 10.0;
                    expMax = Math.round((people * 0.25 * days) * 10.0) / 10.0;
                }

                // 2. Guard against missing anomalyScore
                if (score == 0.0) {
                    if ("POTENTIAL_LEAK".equalsIgnoreCase(status) || (expMax != null && units > expMax)) {
                        score = Math.min(0.99, 0.75 + Math.min(0.24, ((units - expMax) / Math.max(1.0, expMax * 2.0))));
                    } else if (units < expMin) {
                        score = 0.05;
                    } else {
                        score = 0.15;
                    }
                }

                if ("POTENTIAL_LEAK".equalsIgnoreCase(status) || score >= 0.75) {
                    leaksDetected++;
                    highRisk++;
                } else if (score >= 0.50) {
                    medRisk++;
                } else {
                    lowRisk++;
                }

                double extraCost = leakDetectionService.calculateEstimatedExtraCost(usage);
                if (expMax != null && units > expMax) {
                    totalExcessKl += (units - expMax);
                    totalLossCost += extraCost;
                }

                String reason = usage.getAnomalyReason();
                String pattern = usage.getAnomalyPattern();
                if (reason == null || reason.isBlank()) {
                    if ("POTENTIAL_LEAK".equalsIgnoreCase(status) || score >= 0.75) {
                        reason = "High consumption (" + units + " kL) significantly exceeds expected household threshold (" + expMin + " - " + expMax + " kL). Possible fixture leak or burst pipe.";
                        pattern = (pattern == null || pattern.isBlank()) ? "SUDDEN_SPIKE" : pattern;
                    } else {
                        reason = "Consumption (" + units + " kL) is within the expected normal range (" + expMin + " - " + expMax + " kL).";
                        pattern = (pattern == null || pattern.isBlank()) ? "NORMAL" : pattern;
                    }
                }

                String incidentStatus = null;
                if (usage.getIncidentId() != null) {
                    incidentStatus = incidentRepository.findById(usage.getIncidentId()).map(LeakIncident::getStatus).orElse(null);
                }

                // Check feedback
                Optional<LeakFeedback> fbOpt = feedbackRepository.findFirstByUsageUsageIdOrderByCreatedAtDesc(usage.getUsageId());
                boolean hasFb = fbOpt.isPresent();
                String latestFb = fbOpt.map(LeakFeedback::getFeedback).orElse(null);

                flatItems.add(FlatLeakItemResponse.builder()
                        .usageId(usage.getUsageId())
                        .apartmentId(apt.getApartmentId())
                        .apartmentNumber(apt.getRoomNumber())
                        .floorNumber(apt.getFloorNumber())
                        .residentName(resName)
                        .residentEmail(resEmail)
                        .householdSize(hhSize)
                        .unitsConsumed(units)
                        .expectedMin(expMin)
                        .expectedMax(expMax)
                        .expectedUsage(Math.round(((expMin + expMax) / 2.0) * 10.0) / 10.0)
                        .anomalyScore(score)
                        .anomalyStatus(status)
                        .anomalyReason(reason)
                        .anomalyConfidence(usage.getAnomalyConfidence() != null ? usage.getAnomalyConfidence() : (score >= 0.75 ? "HIGH" : "MEDIUM"))
                        .anomalyPattern(pattern)
                        .incidentId(usage.getIncidentId())
                        .incidentStatus(incidentStatus)
                        .estimatedExtraCost(extraCost)
                        .hasFeedback(false)
                        .latestFeedback(null)
                        .build());
            } else {
                // Flat has not been billed / no meter reading in this cycle
                flatItems.add(FlatLeakItemResponse.builder()
                        .apartmentId(apt.getApartmentId())
                        .apartmentNumber(apt.getRoomNumber())
                        .floorNumber(apt.getFloorNumber())
                        .residentName(resName)
                        .residentEmail(resEmail)
                        .householdSize(hhSize)
                        .unitsConsumed(0.0)
                        .anomalyStatus("INSUFFICIENT_HISTORY")
                        .anomalyScore(0.0)
                        .anomalyReason("No meter reading imported for this cycle.")
                        .anomalyConfidence("LOW")
                        .anomalyPattern("NORMAL")
                        .estimatedExtraCost(0.0)
                        .hasFeedback(false)
                        .build());
            }
        }

        // Active incidents for building
        int activeIncidents = incidentRepository.findByApartmentBuildingBuildingIdAndStatusOrderByOpenedAtDesc(buildingId, "OPEN").size();

        return OwnerLeakSummaryResponse.builder()
                .buildingId(buildingId)
                .buildingName(building.getBuildingName())
                .billingCycleId(cycle.getId())
                .cycleMonth(cycle.getStartDate() != null ? cycle.getStartDate().getMonthValue() : null)
                .cycleYear(cycle.getStartDate() != null ? cycle.getStartDate().getYear() : null)
                .totalFlats(apartments.size())
                .flatsScored(cycleUsages.size())
                .leaksDetectedCount(leaksDetected)
                .lowRiskCount(lowRisk)
                .medRiskCount(medRisk)
                .highRiskCount(highRisk)
                .totalExcessWaterKl(Math.round(totalExcessKl * 100.0) / 100.0)
                .estimatedWaterLossCost(Math.round(totalLossCost * 100.0) / 100.0)
                .activeIncidentsCount(activeIncidents)
                .items(flatItems)
                .build();
    }

    private void verifyOwnerAccess(String ownerEmail, Long buildingId) {
        Building b = buildingRepository.findById(buildingId)
                .orElseThrow(() -> new ResourceNotFoundException("Building not found with id: " + buildingId));

        if (b.getOwner() == null || b.getOwner().getUser() == null ||
                !b.getOwner().getUser().getEmail().equalsIgnoreCase(ownerEmail)) {
            User user = userRepository.findByEmail(ownerEmail).orElse(null);
            if (user == null || user.getRole() != User.Role.SUPER_ADMIN) {
                throw new BadRequestException("Access denied: You do not have permission to view building #" + buildingId);
            }
        }
    }
}
