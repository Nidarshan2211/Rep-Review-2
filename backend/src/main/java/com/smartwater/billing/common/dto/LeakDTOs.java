package com.smartwater.billing.common.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

public class LeakDTOs {

    // -------------------------------------------------------------------------
    // Resident Leak Status DTOs
    // -------------------------------------------------------------------------

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ResidentLeakStatusResponse {
        private Long usageId;
        private Long apartmentId;
        private String apartmentNumber;
        private Long billingCycleId;
        private Integer month;
        private Integer year;
        private Double unitsConsumed;
        private Double expectedMin;
        private Double expectedMax;
        private Double expectedUsage;
        private Double anomalyScore;
        private String anomalyStatus;
        private String anomalyReason;
        private String anomalyConfidence;
        private String anomalyPattern;
        private Double estimatedExtraCost;
        private Long incidentId;
        private String incidentStatus;
        private Integer householdSize;
        private Boolean householdSizeConfirmed;
        private Boolean hasFeedback;
        private String latestFeedback;
        private String feedbackNote;
        private LocalDateTime feedbackCreatedAt;
        private List<ResidentLeakHistoryItem> recentHistory;
        private Boolean isFirstMonth;
        private String baselineSource;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ResidentLeakHistoryItem {
        private Long usageId;
        private Integer month;
        private Integer year;
        private Double unitsConsumed;
        private Double expectedMin;
        private Double expectedMax;
        private Double expectedUsage;
        private String anomalyPattern;
        private String anomalyStatus;
        private Double anomalyScore;
        private Boolean hasFeedback;
        private String latestFeedback;
        private Boolean isFirstMonth;
    }

    // -------------------------------------------------------------------------
    // Leak Feedback DTOs
    // -------------------------------------------------------------------------

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LeakFeedbackRequest {
        @NotBlank(message = "Feedback category is required")
        private String feedback; // REAL_LEAK_CONFIRMED, FALSE_ALARM, PLUMBING_WORK, GUESTS_VISITING, OTHER

        private String note;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LeakFeedbackResponse {
        private Long id;
        private Long usageId;
        private Long apartmentId;
        private Long submittedByUserId;
        private String submitterRole;
        private String feedback;
        private String note;
        private LocalDateTime createdAt;
    }

    // -------------------------------------------------------------------------
    // Owner Leak Monitoring DTOs
    // -------------------------------------------------------------------------

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OwnerLeakSummaryResponse {
        private Long buildingId;
        private String buildingName;
        private Long billingCycleId;
        private Integer cycleMonth;
        private Integer cycleYear;
        private Integer totalFlats;
        private Integer flatsScored;
        private Integer leaksDetectedCount;
        private Integer lowRiskCount;
        private Integer medRiskCount;
        private Integer highRiskCount;
        private Double totalExcessWaterKl;
        private Double estimatedWaterLossCost;
        private Integer activeIncidentsCount;
        private List<FlatLeakItemResponse> items;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FlatLeakItemResponse {
        private Long usageId;
        private Long apartmentId;
        private String apartmentNumber;
        private Integer floorNumber;
        private String residentName;
        private String residentEmail;
        private Integer householdSize;
        private Double unitsConsumed;
        private Double expectedMin;
        private Double expectedMax;
        private Double expectedUsage;
        private Double anomalyScore;
        private String anomalyStatus;
        private String anomalyReason;
        private String anomalyConfidence;
        private String anomalyPattern;
        private Long incidentId;
        private String incidentStatus;
        private Double estimatedExtraCost;
        private Boolean hasFeedback;
        private String latestFeedback;
        private Boolean isFirstMonth;
    }

    // -------------------------------------------------------------------------
    // ML Service Communication DTOs (Jackson snake_case mapping)
    // -------------------------------------------------------------------------

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MlScoreRequest {
        @JsonProperty("cycle_id")
        private String cycleId;

        @JsonProperty("building_id")
        private Long buildingId;

        @JsonProperty("items")
        private List<MlFlatInputItem> items;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MlFlatInputItem {
        @JsonProperty("apartment_id")
        private Long apartmentId;

        @JsonProperty("usage_id")
        private Long usageId;

        @JsonProperty("units_consumed")
        private Double unitsConsumed;

        @JsonProperty("household_size")
        private Integer householdSize;

        @JsonProperty("children_count")
        private Integer childrenCount;

        @JsonProperty("unit_type")
        private String unitType;

        @JsonProperty("floor_number")
        private Integer floorNumber;

        @JsonProperty("away_days_in_cycle")
        private Integer awayDaysInCycle;

        @JsonProperty("cycle_days")
        private Integer cycleDays;

        @JsonProperty("billing_month")
        private Integer billingMonth;

        @JsonProperty("billing_year")
        private Integer billingYear;

        @JsonProperty("historical_units")
        private List<Double> historicalUnits;

        @JsonProperty("peer_median_units")
        private Double peerMedianUnits;

        @JsonProperty("peer_p90_units")
        private Double peerP90Units;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MlScoreResponse {
        @JsonProperty("cycle_id")
        private String cycleId;

        @JsonProperty("model_version")
        private String modelVersion;

        @JsonProperty("scored_at")
        private String scoredAt;

        @JsonProperty("results")
        private List<MlScoreResultItem> results;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MlScoreResultItem {
        @JsonProperty("apartment_id")
        private Long apartmentId;

        @JsonProperty("usage_id")
        private Long usageId;

        @JsonProperty("anomaly_status")
        private String anomalyStatus;

        @JsonProperty("anomaly_score")
        private Double anomalyScore;

        @JsonProperty("expected_min")
        private Double expectedMin;

        @JsonProperty("expected_max")
        private Double expectedMax;

        @JsonProperty("expected_usage")
        private Double expectedUsage;

        @JsonProperty("expected_kl")
        private Double expectedKl;

        @JsonProperty("anomaly_reason")
        private String anomalyReason;

        @JsonProperty("anomaly_confidence")
        private String anomalyConfidence;

        @JsonProperty("anomaly_pattern")
        private String anomalyPattern;

        @JsonProperty("data_quality_flag")
        private String dataQualityFlag;

        @JsonProperty("model_version")
        private String modelVersion;
    }
}
