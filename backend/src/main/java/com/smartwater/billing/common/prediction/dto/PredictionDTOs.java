package com.smartwater.billing.common.prediction.dto;

import java.time.LocalDateTime;
import java.util.List;

public class PredictionDTOs {

    public static class PredictionResponse {
        private Long residentId;
        private String residentName;
        private String apartmentNumber;
        private Integer predictionYear;
        private Integer predictionMonth;
        private String predictionMonthLabel;
        private Double predictedConsumptionLitres;
        private Double predictedConsumptionKl;
        private Double estimatedAmount;
        private Double previousMonthConsumptionKl;
        private Double previousMonthConsumptionLitres;
        private Double consumptionDeltaKl;
        private Double consumptionDeltaPercentage;
        private String trendDirection; // "INCREASE", "DECREASE", "STABLE"
        private String recommendation;
        private String modelName;
        private String modelVersion;
        private TierBreakdown tierBreakdown;
        private List<MonthlyHistoryPoint> historicalData;
        private LocalDateTime predictedAt;
        private Boolean isNewResident;
        private Integer historicalCyclesCount;
        private Integer householdSize;
        private String predictionType;

        public PredictionResponse() {}

        public Long getResidentId() { return residentId; }
        public void setResidentId(Long residentId) { this.residentId = residentId; }

        public String getResidentName() { return residentName; }
        public void setResidentName(String residentName) { this.residentName = residentName; }

        public String getApartmentNumber() { return apartmentNumber; }
        public void setApartmentNumber(String apartmentNumber) { this.apartmentNumber = apartmentNumber; }

        public Integer getPredictionYear() { return predictionYear; }
        public void setPredictionYear(Integer predictionYear) { this.predictionYear = predictionYear; }

        public Integer getPredictionMonth() { return predictionMonth; }
        public void setPredictionMonth(Integer predictionMonth) { this.predictionMonth = predictionMonth; }

        public String getPredictionMonthLabel() { return predictionMonthLabel; }
        public void setPredictionMonthLabel(String predictionMonthLabel) { this.predictionMonthLabel = predictionMonthLabel; }

        public Double getPredictedConsumptionLitres() { return predictedConsumptionLitres; }
        public void setPredictedConsumptionLitres(Double predictedConsumptionLitres) { this.predictedConsumptionLitres = predictedConsumptionLitres; }

        public Double getPredictedConsumptionKl() { return predictedConsumptionKl; }
        public void setPredictedConsumptionKl(Double predictedConsumptionKl) { this.predictedConsumptionKl = predictedConsumptionKl; }

        public Double getEstimatedAmount() { return estimatedAmount; }
        public void setEstimatedAmount(Double estimatedAmount) { this.estimatedAmount = estimatedAmount; }

        public Double getPreviousMonthConsumptionKl() { return previousMonthConsumptionKl; }
        public void setPreviousMonthConsumptionKl(Double previousMonthConsumptionKl) { this.previousMonthConsumptionKl = previousMonthConsumptionKl; }

        public Double getPreviousMonthConsumptionLitres() { return previousMonthConsumptionLitres; }
        public void setPreviousMonthConsumptionLitres(Double previousMonthConsumptionLitres) { this.previousMonthConsumptionLitres = previousMonthConsumptionLitres; }

        public Double getConsumptionDeltaKl() { return consumptionDeltaKl; }
        public void setConsumptionDeltaKl(Double consumptionDeltaKl) { this.consumptionDeltaKl = consumptionDeltaKl; }

        public Double getConsumptionDeltaPercentage() { return consumptionDeltaPercentage; }
        public void setConsumptionDeltaPercentage(Double consumptionDeltaPercentage) { this.consumptionDeltaPercentage = consumptionDeltaPercentage; }

        public String getTrendDirection() { return trendDirection; }
        public void setTrendDirection(String trendDirection) { this.trendDirection = trendDirection; }

        public String getRecommendation() { return recommendation; }
        public void setRecommendation(String recommendation) { this.recommendation = recommendation; }

        public String getModelName() { return modelName; }
        public void setModelName(String modelName) { this.modelName = modelName; }

        public String getModelVersion() { return modelVersion; }
        public void setModelVersion(String modelVersion) { this.modelVersion = modelVersion; }

        public TierBreakdown getTierBreakdown() { return tierBreakdown; }
        public void setTierBreakdown(TierBreakdown tierBreakdown) { this.tierBreakdown = tierBreakdown; }

        public List<MonthlyHistoryPoint> getHistoricalData() { return historicalData; }
        public void setHistoricalData(List<MonthlyHistoryPoint> historicalData) { this.historicalData = historicalData; }

        public LocalDateTime getPredictedAt() { return predictedAt; }
        public void setPredictedAt(LocalDateTime predictedAt) { this.predictedAt = predictedAt; }

        public Boolean getIsNewResident() { return isNewResident; }
        public void setIsNewResident(Boolean isNewResident) { this.isNewResident = isNewResident; }

        public Integer getHistoricalCyclesCount() { return historicalCyclesCount; }
        public void setHistoricalCyclesCount(Integer historicalCyclesCount) { this.historicalCyclesCount = historicalCyclesCount; }

        public Integer getHouseholdSize() { return householdSize; }
        public void setHouseholdSize(Integer householdSize) { this.householdSize = householdSize; }

        public String getPredictionType() { return predictionType; }
        public void setPredictionType(String predictionType) { this.predictionType = predictionType; }
    }

    public static class MonthlyHistoryPoint {
        private Integer year;
        private Integer month;
        private String label;
        private Double consumptionKl;
        private Double consumptionLitres;
        private Boolean isPredicted;

        public MonthlyHistoryPoint() {}

        public MonthlyHistoryPoint(Integer year, Integer month, String label, Double consumptionKl, Double consumptionLitres, Boolean isPredicted) {
            this.year = year;
            this.month = month;
            this.label = label;
            this.consumptionKl = consumptionKl;
            this.consumptionLitres = consumptionLitres;
            this.isPredicted = isPredicted;
        }

        public Integer getYear() { return year; }
        public void setYear(Integer year) { this.year = year; }

        public Integer getMonth() { return month; }
        public void setMonth(Integer month) { this.month = month; }

        public String getLabel() { return label; }
        public void setLabel(String label) { this.label = label; }

        public Double getConsumptionKl() { return consumptionKl; }
        public void setConsumptionKl(Double consumptionKl) { this.consumptionKl = consumptionKl; }

        public Double getConsumptionLitres() { return consumptionLitres; }
        public void setConsumptionLitres(Double consumptionLitres) { this.consumptionLitres = consumptionLitres; }

        public Boolean getIsPredicted() { return isPredicted; }
        public void setIsPredicted(Boolean isPredicted) { this.isPredicted = isPredicted; }
    }

    public static class TierBreakdown {
        private Double tier1Units;
        private Double tier1Rate;
        private Double tier1Amount;
        private Double tier2Units;
        private Double tier2Rate;
        private Double tier2Amount;
        private Double tier3Units;
        private Double tier3Rate;
        private Double tier3Amount;
        private Double fixedCharge;

        public TierBreakdown() {}

        public TierBreakdown(Double tier1Units, Double tier1Rate, Double tier1Amount, Double tier2Units, Double tier2Rate, Double tier2Amount, Double tier3Units, Double tier3Rate, Double tier3Amount, Double fixedCharge) {
            this.tier1Units = tier1Units;
            this.tier1Rate = tier1Rate;
            this.tier1Amount = tier1Amount;
            this.tier2Units = tier2Units;
            this.tier2Rate = tier2Rate;
            this.tier2Amount = tier2Amount;
            this.tier3Units = tier3Units;
            this.tier3Rate = tier3Rate;
            this.tier3Amount = tier3Amount;
            this.fixedCharge = fixedCharge;
        }

        public Double getTier1Units() { return tier1Units; }
        public void setTier1Units(Double tier1Units) { this.tier1Units = tier1Units; }

        public Double getTier1Rate() { return tier1Rate; }
        public void setTier1Rate(Double tier1Rate) { this.tier1Rate = tier1Rate; }

        public Double getTier1Amount() { return tier1Amount; }
        public void setTier1Amount(Double tier1Amount) { this.tier1Amount = tier1Amount; }

        public Double getTier2Units() { return tier2Units; }
        public void setTier2Units(Double tier2Units) { this.tier2Units = tier2Units; }

        public Double getTier2Rate() { return tier2Rate; }
        public void setTier2Rate(Double tier2Rate) { this.tier2Rate = tier2Rate; }

        public Double getTier2Amount() { return tier2Amount; }
        public void setTier2Amount(Double tier2Amount) { this.tier2Amount = tier2Amount; }

        public Double getTier3Units() { return tier3Units; }
        public void setTier3Units(Double tier3Units) { this.tier3Units = tier3Units; }

        public Double getTier3Rate() { return tier3Rate; }
        public void setTier3Rate(Double tier3Rate) { this.tier3Rate = tier3Rate; }

        public Double getTier3Amount() { return tier3Amount; }
        public void setTier3Amount(Double tier3Amount) { this.tier3Amount = tier3Amount; }

        public Double getFixedCharge() { return fixedCharge; }
        public void setFixedCharge(Double fixedCharge) { this.fixedCharge = fixedCharge; }
    }

    public static class FastApiPredictRequest {
        private Long household_id;
        private Double previous_month_consumption;
        private Double two_months_ago_consumption;
        private Double three_months_ago_consumption;
        private Double three_month_average;
        private Integer residents_count;
        private Integer prediction_month;
        private Double previous_consumption_trend;

        public FastApiPredictRequest() {}

        public FastApiPredictRequest(Long household_id, Double previous_month_consumption, Double two_months_ago_consumption, Double three_months_ago_consumption, Double three_month_average, Integer residents_count, Integer prediction_month, Double previous_consumption_trend) {
            this.household_id = household_id;
            this.previous_month_consumption = previous_month_consumption;
            this.two_months_ago_consumption = two_months_ago_consumption;
            this.three_months_ago_consumption = three_months_ago_consumption;
            this.three_month_average = three_month_average;
            this.residents_count = residents_count;
            this.prediction_month = prediction_month;
            this.previous_consumption_trend = previous_consumption_trend;
        }

        public Long getHousehold_id() { return household_id; }
        public void setHousehold_id(Long household_id) { this.household_id = household_id; }

        public Double getPrevious_month_consumption() { return previous_month_consumption; }
        public void setPrevious_month_consumption(Double previous_month_consumption) { this.previous_month_consumption = previous_month_consumption; }

        public Double getTwo_months_ago_consumption() { return two_months_ago_consumption; }
        public void setTwo_months_ago_consumption(Double two_months_ago_consumption) { this.two_months_ago_consumption = two_months_ago_consumption; }

        public Double getThree_months_ago_consumption() { return three_months_ago_consumption; }
        public void setThree_months_ago_consumption(Double three_months_ago_consumption) { this.three_months_ago_consumption = three_months_ago_consumption; }

        public Double getThree_month_average() { return three_month_average; }
        public void setThree_month_average(Double three_month_average) { this.three_month_average = three_month_average; }

        public Integer getResidents_count() { return residents_count; }
        public void setResidents_count(Integer residents_count) { this.residents_count = residents_count; }

        public Integer getPrediction_month() { return prediction_month; }
        public void setPrediction_month(Integer prediction_month) { this.prediction_month = prediction_month; }

        public Double getPrevious_consumption_trend() { return previous_consumption_trend; }
        public void setPrevious_consumption_trend(Double previous_consumption_trend) { this.previous_consumption_trend = previous_consumption_trend; }
    }

    public static class FastApiPredictResponse {
        private Long household_id;
        private Integer prediction_month;
        private Double predicted_consumption_litres;
        private String model_name;
        private String model_version;
        private String prediction_status;

        public FastApiPredictResponse() {}

        public Long getHousehold_id() { return household_id; }
        public void setHousehold_id(Long household_id) { this.household_id = household_id; }

        public Integer getPrediction_month() { return prediction_month; }
        public void setPrediction_month(Integer prediction_month) { this.prediction_month = prediction_month; }

        public Double getPredicted_consumption_litres() { return predicted_consumption_litres; }
        public void setPredicted_consumption_litres(Double predicted_consumption_litres) { this.predicted_consumption_litres = predicted_consumption_litres; }

        public String getModel_name() { return model_name; }
        public void setModel_name(String model_name) { this.model_name = model_name; }

        public String getModel_version() { return model_version; }
        public void setModel_version(String model_version) { this.model_version = model_version; }

        public String getPrediction_status() { return prediction_status; }
        public void setPrediction_status(String prediction_status) { this.prediction_status = prediction_status; }
    }
}
