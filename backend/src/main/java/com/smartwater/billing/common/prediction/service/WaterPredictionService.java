package com.smartwater.billing.common.prediction.service;

import com.smartwater.billing.common.entity.WaterUsage;
import com.smartwater.billing.owner.entity.Tariff;
import com.smartwater.billing.common.exception.ResourceNotFoundException;
import com.smartwater.billing.common.prediction.client.PredictionMlClient;
import com.smartwater.billing.common.prediction.dto.PredictionDTOs.*;
import com.smartwater.billing.common.prediction.entity.WaterUsagePrediction;
import com.smartwater.billing.common.prediction.repository.WaterUsagePredictionRepository;
import com.smartwater.billing.common.repository.WaterUsageRepository;
import com.smartwater.billing.owner.entity.Apartment;
import com.smartwater.billing.owner.entity.TariffPlan;
import com.smartwater.billing.owner.repository.ApartmentRepository;
import com.smartwater.billing.owner.repository.TariffPlanRepository;
import com.smartwater.billing.owner.repository.TariffRepository;
import com.smartwater.billing.resident.entity.ApartmentOccupancy;
import com.smartwater.billing.resident.entity.Resident;
import com.smartwater.billing.resident.repository.ApartmentOccupancyRepository;
import com.smartwater.billing.resident.repository.ResidentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class WaterPredictionService {

    private static final Logger log = LoggerFactory.getLogger(WaterPredictionService.class);

    private final ResidentRepository residentRepository;
    private final WaterUsageRepository usageRepository;
    private final ApartmentOccupancyRepository occupancyRepository;
    private final ApartmentRepository apartmentRepository;
    private final TariffPlanRepository tariffPlanRepository;
    private final TariffRepository tariffRepository;
    private final WaterUsagePredictionRepository predictionRepository;
    private final PredictionMlClient mlClient;

    public WaterPredictionService(
            ResidentRepository residentRepository,
            WaterUsageRepository usageRepository,
            ApartmentOccupancyRepository occupancyRepository,
            ApartmentRepository apartmentRepository,
            TariffPlanRepository tariffPlanRepository,
            TariffRepository tariffRepository,
            WaterUsagePredictionRepository predictionRepository,
            PredictionMlClient mlClient
    ) {
        this.residentRepository = residentRepository;
        this.usageRepository = usageRepository;
        this.occupancyRepository = occupancyRepository;
        this.apartmentRepository = apartmentRepository;
        this.tariffPlanRepository = tariffPlanRepository;
        this.tariffRepository = tariffRepository;
        this.predictionRepository = predictionRepository;
        this.mlClient = mlClient;
    }

    @Transactional
    public PredictionResponse predictNextMonthBill(String userEmail) {
        log.info("Generating next-month water consumption and bill prediction for user: {}", userEmail);

        // 1. Resolve Resident
        Resident resident = residentRepository.findByUserEmail(userEmail)
                .or(() -> residentRepository.findByEmail(userEmail))
                .orElseThrow(() -> new ResourceNotFoundException("Resident profile not found for user: " + userEmail));

        // 2. Resolve Active Apartment & Occupancy for Household Size
        Apartment apartment = null;
        Integer householdSize = 3; // Default baseline

        Optional<ApartmentOccupancy> activeOccupancyOpt = occupancyRepository.findFirstByResidentResidentIdAndStatus(
                resident.getResidentId(), ApartmentOccupancy.OccupancyStatus.ACTIVE);

        if (activeOccupancyOpt.isPresent()) {
            ApartmentOccupancy activeOccupancy = activeOccupancyOpt.get();
            apartment = activeOccupancy.getApartment();
            if (activeOccupancy.getHouseholdSize() != null && activeOccupancy.getHouseholdSize() > 0) {
                householdSize = activeOccupancy.getHouseholdSize();
            }
        } else if (resident.getApartmentNumber() != null && resident.getBuilding() != null) {
            apartment = apartmentRepository.findByBuildingBuildingIdAndRoomNumber(
                    resident.getBuilding().getBuildingId(), resident.getApartmentNumber()).orElse(null);
        }

        // 3. Retrieve Historical Water Usages
        List<WaterUsage> rawHistory = usageRepository.findByResidentId(resident.getResidentId());
        // Sort chronologically (oldest to newest)
        List<WaterUsage> history = new ArrayList<>(rawHistory);
        history.sort((a, b) -> {
            int cmp = a.getYear().compareTo(b.getYear());
            return cmp != 0 ? cmp : a.getMonth().compareTo(b.getMonth());
        });

        // 4. Determine Target Prediction Month & Year
        int targetYear = LocalDate.now().getYear();
        int targetMonth = LocalDate.now().getMonthValue() + 1;
        if (targetMonth > 12) {
            targetMonth = 1;
            targetYear += 1;
        }

        if (!history.isEmpty()) {
            WaterUsage latest = history.get(history.size() - 1);
            targetMonth = latest.getMonth() + 1;
            targetYear = latest.getYear();
            if (targetMonth > 12) {
                targetMonth = 1;
                targetYear += 1;
            }
        }

        // 5. Construct 7 Lag Features in Litres (1 kL = 1000 L)
        double lag1Litres;
        double lag2Litres;
        double lag3Litres;
        double defaultMonthLitres = householdSize * 4500.0; // ~150 L/person/day * 30 days

        int histSize = history.size();
        if (histSize >= 3) {
            lag1Litres = history.get(histSize - 1).getUnitsConsumed() * 1000.0;
            lag2Litres = history.get(histSize - 2).getUnitsConsumed() * 1000.0;
            lag3Litres = history.get(histSize - 3).getUnitsConsumed() * 1000.0;
        } else if (histSize == 2) {
            lag1Litres = history.get(histSize - 1).getUnitsConsumed() * 1000.0;
            lag2Litres = history.get(histSize - 2).getUnitsConsumed() * 1000.0;
            lag3Litres = defaultMonthLitres;
        } else if (histSize == 1) {
            lag1Litres = history.get(0).getUnitsConsumed() * 1000.0;
            lag2Litres = defaultMonthLitres;
            lag3Litres = defaultMonthLitres;
        } else {
            lag1Litres = defaultMonthLitres;
            lag2Litres = defaultMonthLitres;
            lag3Litres = defaultMonthLitres;
        }

        double avg3Litres = (lag1Litres + lag2Litres + lag3Litres) / 3.0;
        double trendLitres = lag1Litres - lag3Litres;

        // 6. Invoke Python FastAPI Microservice
        FastApiPredictRequest apiReq = new FastApiPredictRequest(
                resident.getResidentId(),
                round(lag1Litres),
                round(lag2Litres),
                round(lag3Litres),
                round(avg3Litres),
                householdSize,
                targetMonth,
                round(trendLitres)
        );

        FastApiPredictResponse mlRes = mlClient.predict(apiReq);
        double predictedLitres = mlRes.getPredicted_consumption_litres();
        double predictedKl = round(predictedLitres / 1000.0);

        // 7. Read-Only Estimated Bill Calculation Using Existing Tariff Slabs
        Long buildingId = resident.getBuilding() != null ? resident.getBuilding().getBuildingId() : null;
        TierBreakdown tierBreakdown = calculateEstimatedBill(buildingId, predictedKl);
        double totalEstimatedAmount = round(tierBreakdown.getTier1Amount() + 
                                            tierBreakdown.getTier2Amount() + 
                                            tierBreakdown.getTier3Amount() + 
                                            tierBreakdown.getFixedCharge());

        // 8. Trend & Recommendation Formulation
        double prevKl = round(lag1Litres / 1000.0);
        double deltaKl = round(predictedKl - prevKl);
        double deltaPct = prevKl > 0 ? round((deltaKl / prevKl) * 100.0) : 0.0;
        String trendDirection = deltaKl > 0.5 ? "INCREASE" : (deltaKl < -0.5 ? "DECREASE" : "STABLE");

        String recommendation;
        if (deltaPct > 12.0) {
            recommendation = String.format("Predicted consumption is projected to rise by %.1f%% (+%.2f kL). Consider checking for concealed toilet flapper leaks, optimizing laundry loads, and installing low-flow aerators.", deltaPct, deltaKl);
        } else if (deltaPct < -8.0) {
            recommendation = String.format("Excellent conservation trend! Your predicted consumption is %.1f%% lower than last month. Continue your current water-saving habits.", Math.abs(deltaPct));
        } else {
            recommendation = "Your predicted consumption is consistent with your household's baseline usage. Maintain regular fixture inspections to prevent hidden leaks.";
        }

        // 9. Persist Prediction Result
        WaterUsagePrediction predictionEntity = predictionRepository
                .findByResidentResidentIdAndPredictionYearAndPredictionMonth(resident.getResidentId(), targetYear, targetMonth)
                .orElse(new WaterUsagePrediction());

        predictionEntity.setResident(resident);
        predictionEntity.setApartment(apartment);
        predictionEntity.setPredictionYear(targetYear);
        predictionEntity.setPredictionMonth(targetMonth);
        predictionEntity.setPredictedConsumptionLitres(predictedLitres);
        predictionEntity.setPredictedConsumptionKl(predictedKl);
        predictionEntity.setEstimatedAmount(totalEstimatedAmount);
        predictionEntity.setModelName(mlRes.getModel_name());
        predictionEntity.setModelVersion(mlRes.getModel_version());
        predictionEntity.setPredictionStatus(mlRes.getPrediction_status());
        predictionEntity.setRecommendation(recommendation);
        predictionEntity.setCreatedAt(LocalDateTime.now());
        predictionRepository.save(predictionEntity);

        // 10. Assemble Response DTO
        PredictionResponse response = new PredictionResponse();
        response.setResidentId(resident.getResidentId());
        response.setResidentName(resident.getName());
        response.setApartmentNumber(resident.getApartmentNumber() != null ? resident.getApartmentNumber() : "N/A");
        response.setPredictionYear(targetYear);
        response.setPredictionMonth(targetMonth);
        response.setPredictionMonthLabel(getMonthName(targetMonth) + " " + targetYear);
        response.setPredictedConsumptionLitres(predictedLitres);
        response.setPredictedConsumptionKl(predictedKl);
        response.setEstimatedAmount(totalEstimatedAmount);
        response.setPreviousMonthConsumptionKl(prevKl);
        response.setPreviousMonthConsumptionLitres(round(lag1Litres));
        response.setConsumptionDeltaKl(deltaKl);
        response.setConsumptionDeltaPercentage(deltaPct);
        response.setTrendDirection(trendDirection);
        response.setRecommendation(recommendation);
        response.setModelName(mlRes.getModel_name());
        response.setModelVersion(mlRes.getModel_version());
        response.setTierBreakdown(tierBreakdown);
        response.setPredictedAt(LocalDateTime.now());

        // Assemble historical data points for Recharts bar visualization
        List<MonthlyHistoryPoint> chartPoints = new ArrayList<>();
        int startIdx = Math.max(0, history.size() - 5);
        for (int i = startIdx; i < history.size(); i++) {
            WaterUsage u = history.get(i);
            chartPoints.add(new MonthlyHistoryPoint(
                    u.getYear(),
                    u.getMonth(),
                    getMonthName(u.getMonth()) + " " + u.getYear(),
                    round(u.getUnitsConsumed()),
                    round(u.getUnitsConsumed() * 1000.0),
                    false
            ));
        }
        // Add predicted point
        chartPoints.add(new MonthlyHistoryPoint(
                targetYear,
                targetMonth,
                getMonthName(targetMonth) + " " + targetYear + " (Predicted)",
                predictedKl,
                predictedLitres,
                true
        ));
        response.setHistoricalData(chartPoints);

        return response;
    }

    @Transactional(readOnly = true)
    public List<WaterUsagePrediction> getPredictionHistory(String userEmail) {
        Resident resident = residentRepository.findByUserEmail(userEmail)
                .or(() -> residentRepository.findByEmail(userEmail))
                .orElseThrow(() -> new ResourceNotFoundException("Resident profile not found for user: " + userEmail));

        return predictionRepository.findByResidentResidentIdOrderByPredictionYearDescPredictionMonthDesc(resident.getResidentId());
    }

    /**
     * Executes read-only 3-tier tariff calculation strictly without committing bills or modifying billing cycles.
     */
    private TierBreakdown calculateEstimatedBill(Long buildingId, double units) {
        BigDecimal t1Limit = new BigDecimal("20.00");
        BigDecimal t1Rate = new BigDecimal("2.50");
        BigDecimal t2Limit = new BigDecimal("40.00");
        BigDecimal t2Rate = new BigDecimal("4.00");
        BigDecimal t3Rate = new BigDecimal("6.00");
        BigDecimal fixedCharge = new BigDecimal("10.00");

        if (buildingId != null) {
            List<TariffPlan> plans = tariffPlanRepository.findByBuildingBuildingIdOrderByCreatedAtDesc(buildingId);
            if (!plans.isEmpty()) {
                TariffPlan tp = plans.get(0);
                if (tp.getTier1Limit() != null) t1Limit = tp.getTier1Limit();
                if (tp.getTier1Rate() != null && tp.getTier1Rate().compareTo(BigDecimal.ZERO) > 0) t1Rate = tp.getTier1Rate();
                if (tp.getTier2Limit() != null) t2Limit = tp.getTier2Limit();
                if (tp.getTier2Rate() != null && tp.getTier2Rate().compareTo(BigDecimal.ZERO) > 0) t2Rate = tp.getTier2Rate();
                if (tp.getTier3Rate() != null && tp.getTier3Rate().compareTo(BigDecimal.ZERO) > 0) t3Rate = tp.getTier3Rate();
                if (tp.getFixedCharge() != null) fixedCharge = tp.getFixedCharge();
            }
        }

        BigDecimal unitsBd = BigDecimal.valueOf(units);
        BigDecimal tier1Units = unitsBd.min(t1Limit);
        BigDecimal tier2Units = unitsBd.subtract(t1Limit).max(BigDecimal.ZERO).min(t2Limit.subtract(t1Limit));
        BigDecimal tier3Units = unitsBd.subtract(t2Limit).max(BigDecimal.ZERO);

        BigDecimal tier1Amount = tier1Units.multiply(t1Rate).setScale(2, RoundingMode.HALF_UP);
        BigDecimal tier2Amount = tier2Units.multiply(t2Rate).setScale(2, RoundingMode.HALF_UP);
        BigDecimal tier3Amount = tier3Units.multiply(t3Rate).setScale(2, RoundingMode.HALF_UP);

        return new TierBreakdown(
                round(tier1Units.doubleValue()),
                round(t1Rate.doubleValue()),
                round(tier1Amount.doubleValue()),
                round(tier2Units.doubleValue()),
                round(t2Rate.doubleValue()),
                round(tier2Amount.doubleValue()),
                round(tier3Units.doubleValue()),
                round(t3Rate.doubleValue()),
                round(tier3Amount.doubleValue()),
                round(fixedCharge.doubleValue())
        );
    }

    private static double round(double val) {
        return Math.round(val * 100.0) / 100.0;
    }

    private static String getMonthName(int m) {
        String[] months = {"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};
        return (m >= 1 && m <= 12) ? months[m - 1] : String.valueOf(m);
    }
}
