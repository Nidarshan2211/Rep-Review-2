package com.smartwater.billing.common.prediction.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.smartwater.billing.owner.entity.Apartment;
import com.smartwater.billing.resident.entity.Resident;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "water_usage_predictions", indexes = {
    @Index(name = "idx_pred_resident", columnList = "resident_id"),
    @Index(name = "idx_pred_apartment", columnList = "apartment_id"),
    @Index(name = "idx_pred_cycle", columnList = "prediction_year, prediction_month")
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class WaterUsagePrediction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "prediction_id")
    private Long predictionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resident_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "user"})
    private Resident resident;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "apartment_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Apartment apartment;

    @Column(name = "prediction_year", nullable = false)
    private Integer predictionYear;

    @Column(name = "prediction_month", nullable = false)
    private Integer predictionMonth;

    @Column(name = "predicted_consumption_litres", nullable = false)
    private Double predictedConsumptionLitres;

    @Column(name = "predicted_consumption_kl", nullable = false)
    private Double predictedConsumptionKl;

    @Column(name = "estimated_amount", nullable = false)
    private Double estimatedAmount;

    @Column(name = "model_name", nullable = false, length = 100)
    private String modelName;

    @Column(name = "model_version", nullable = false, length = 50)
    private String modelVersion;

    @Column(name = "prediction_status", nullable = false, length = 30)
    private String predictionStatus;

    @Column(name = "recommendation", length = 500)
    private String recommendation;

    @Column(name = "actual_consumption_litres")
    private Double actualConsumptionLitres;

    @Column(name = "prediction_error")
    private Double predictionError;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public WaterUsagePrediction() {}

    public Long getPredictionId() { return predictionId; }
    public void setPredictionId(Long predictionId) { this.predictionId = predictionId; }

    public Resident getResident() { return resident; }
    public void setResident(Resident resident) { this.resident = resident; }

    public Apartment getApartment() { return apartment; }
    public void setApartment(Apartment apartment) { this.apartment = apartment; }

    public Integer getPredictionYear() { return predictionYear; }
    public void setPredictionYear(Integer predictionYear) { this.predictionYear = predictionYear; }

    public Integer getPredictionMonth() { return predictionMonth; }
    public void setPredictionMonth(Integer predictionMonth) { this.predictionMonth = predictionMonth; }

    public Double getPredictedConsumptionLitres() { return predictedConsumptionLitres; }
    public void setPredictedConsumptionLitres(Double predictedConsumptionLitres) { this.predictedConsumptionLitres = predictedConsumptionLitres; }

    public Double getPredictedConsumptionKl() { return predictedConsumptionKl; }
    public void setPredictedConsumptionKl(Double predictedConsumptionKl) { this.predictedConsumptionKl = predictedConsumptionKl; }

    public Double getEstimatedAmount() { return estimatedAmount; }
    public void setEstimatedAmount(Double estimatedAmount) { this.estimatedAmount = estimatedAmount; }

    public String getModelName() { return modelName; }
    public void setModelName(String modelName) { this.modelName = modelName; }

    public String getModelVersion() { return modelVersion; }
    public void setModelVersion(String modelVersion) { this.modelVersion = modelVersion; }

    public String getPredictionStatus() { return predictionStatus; }
    public void setPredictionStatus(String predictionStatus) { this.predictionStatus = predictionStatus; }

    public String getRecommendation() { return recommendation; }
    public void setRecommendation(String recommendation) { this.recommendation = recommendation; }

    public Double getActualConsumptionLitres() { return actualConsumptionLitres; }
    public void setActualConsumptionLitres(Double actualConsumptionLitres) { this.actualConsumptionLitres = actualConsumptionLitres; }

    public Double getPredictionError() { return predictionError; }
    public void setPredictionError(Double predictionError) { this.predictionError = predictionError; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
