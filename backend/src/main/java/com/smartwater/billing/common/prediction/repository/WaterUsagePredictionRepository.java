package com.smartwater.billing.common.prediction.repository;

import com.smartwater.billing.common.prediction.entity.WaterUsagePrediction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WaterUsagePredictionRepository extends JpaRepository<WaterUsagePrediction, Long> {
    
    Optional<WaterUsagePrediction> findTopByResidentResidentIdOrderByPredictionYearDescPredictionMonthDesc(Long residentId);

    Optional<WaterUsagePrediction> findByResidentResidentIdAndPredictionYearAndPredictionMonth(Long residentId, Integer predictionYear, Integer predictionMonth);

    List<WaterUsagePrediction> findByResidentResidentIdOrderByPredictionYearDescPredictionMonthDesc(Long residentId);
}
