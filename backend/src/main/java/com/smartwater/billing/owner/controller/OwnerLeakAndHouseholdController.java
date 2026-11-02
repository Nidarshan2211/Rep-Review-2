package com.smartwater.billing.owner.controller;

import com.smartwater.billing.common.dto.LeakDTOs.LeakFeedbackRequest;
import com.smartwater.billing.common.dto.LeakDTOs.LeakFeedbackResponse;
import com.smartwater.billing.common.dto.LeakDTOs.OwnerLeakSummaryResponse;
import com.smartwater.billing.common.ml.LeakFeedbackService;
import com.smartwater.billing.common.ml.LeakReportService;
import com.smartwater.billing.resident.dto.HouseholdDTOs.BuildingHouseholdStatusResponse;
import com.smartwater.billing.resident.dto.HouseholdDTOs.HouseholdDetailResponse;
import com.smartwater.billing.resident.dto.HouseholdDTOs.HouseholdUpdateRequest;
import com.smartwater.billing.resident.service.HouseholdService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import com.smartwater.billing.common.entity.BillingCycle;
import com.smartwater.billing.common.ml.LeakDetectionService;
import com.smartwater.billing.common.repository.BillingCycleRepository;

@RestController
@RequestMapping
public class OwnerLeakAndHouseholdController {

    private final LeakReportService leakReportService;
    private final HouseholdService householdService;
    private final LeakFeedbackService leakFeedbackService;
    private final LeakDetectionService leakDetectionService;
    private final BillingCycleRepository billingCycleRepository;

    public OwnerLeakAndHouseholdController(LeakReportService leakReportService,
                                           HouseholdService householdService,
                                           LeakFeedbackService leakFeedbackService,
                                           LeakDetectionService leakDetectionService,
                                           BillingCycleRepository billingCycleRepository) {
        this.leakReportService = leakReportService;
        this.householdService = householdService;
        this.leakFeedbackService = leakFeedbackService;
        this.leakDetectionService = leakDetectionService;
        this.billingCycleRepository = billingCycleRepository;
    }

    /**
     * Building-wide leak monitoring dashboard for owner.
     */
    @GetMapping({"/owner/buildings/{buildingId}/leak-monitoring", "/api/owner/buildings/{buildingId}/leak-monitoring"})
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'BUILDING_OWNER')")
    public ResponseEntity<OwnerLeakSummaryResponse> getBuildingLeakMonitoring(
            Authentication authentication,
            @PathVariable("buildingId") Long buildingId,
            @RequestParam(value = "cycleId", required = false) Long cycleId
    ) {
        return ResponseEntity.ok(leakReportService.getOwnerLeakSummary(authentication.getName(), buildingId, cycleId));
    }

    /**
     * Building-wide household confirmation status for owner.
     */
    @GetMapping({"/owner/buildings/{buildingId}/residents/household-status", "/api/owner/buildings/{buildingId}/residents/household-status"})
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'BUILDING_OWNER')")
    public ResponseEntity<List<BuildingHouseholdStatusResponse>> getBuildingHouseholdStatuses(
            Authentication authentication,
            @PathVariable("buildingId") Long buildingId
    ) {
        return ResponseEntity.ok(householdService.getBuildingHouseholdStatuses(authentication.getName(), buildingId));
    }

    /**
     * Owner overrides/updates household size for an apartment.
     */
    @RequestMapping(value = {"/owner/apartments/{apartmentId}/household", "/api/owner/apartments/{apartmentId}/household"}, method = {RequestMethod.POST, RequestMethod.PUT})
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'BUILDING_OWNER')")
    public ResponseEntity<HouseholdDetailResponse> updateApartmentHousehold(
            Authentication authentication,
            @PathVariable("apartmentId") Long apartmentId,
            @Valid @RequestBody HouseholdUpdateRequest request
    ) {
        return ResponseEntity.ok(householdService.ownerUpdateHousehold(authentication.getName(), apartmentId, request));
    }

    /**
     * Owner submits feedback on a flat's leak alert.
     */
    @PostMapping({"/owner/leak-feedback", "/api/owner/leak-feedback"})
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'BUILDING_OWNER')")
    public ResponseEntity<LeakFeedbackResponse> submitOwnerFeedback(
            Authentication authentication,
            @RequestParam("usageId") Long usageId,
            @Valid @RequestBody LeakFeedbackRequest request
    ) {
        return ResponseEntity.ok(leakFeedbackService.submitFeedback(authentication.getName(), usageId, request));
    }

    /**
     * Owner triggers machine learning re-scoring for a building / cycle.
     */
    @PostMapping({"/owner/buildings/{buildingId}/leak-monitoring/rescore", "/api/owner/buildings/{buildingId}/leak-monitoring/rescore"})
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'BUILDING_OWNER')")
    public ResponseEntity<Map<String, Object>> rescoreBuildingLeaks(
            Authentication authentication,
            @PathVariable("buildingId") Long buildingId,
            @RequestParam(value = "cycleId", required = false) Long cycleId
    ) {
        Long targetCycleId = cycleId;
        if (targetCycleId == null) {
            List<BillingCycle> cycles = billingCycleRepository.findByBuildingBuildingIdOrderByStartDateDesc(buildingId);
            if (!cycles.isEmpty()) {
                targetCycleId = cycles.get(0).getId();
            }
        }
        if (targetCycleId != null) {
            leakDetectionService.scoreBillingCycle(buildingId, targetCycleId);
        }
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Cycle scoring completed successfully!",
                "cycleId", targetCycleId != null ? targetCycleId : 0
        ));
    }
}
