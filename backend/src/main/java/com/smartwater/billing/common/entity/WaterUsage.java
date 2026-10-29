package com.smartwater.billing.common.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "water_usage")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class WaterUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "usage_id")
    private Long usageId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meter_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "resident"})
    private WaterMeter meter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "billing_cycle_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "building"})
    private BillingCycle billingCycle;

    @Column(name = "`month`", nullable = false)
    private Integer month;

    @Column(name = "`year`", nullable = false)
    private Integer year;

    @Column(name = "previous_reading", nullable = false)
    private Double previousReading;

    @Column(name = "current_reading", nullable = false)
    private Double currentReading;

    @Column(name = "units_consumed", nullable = false)
    private Double unitsConsumed;

    @Column(name = "anomaly_status", length = 50)
    private String anomalyStatus;

    @Column(name = "recorded_at", updatable = false)
    private LocalDateTime recordedAt;

    public WaterUsage() {}

    public WaterUsage(Long usageId, WaterMeter meter, BillingCycle billingCycle, Integer month, Integer year,
                      Double previousReading, Double currentReading, Double unitsConsumed, String anomalyStatus,
                      LocalDateTime recordedAt) {
        this.usageId = usageId;
        this.meter = meter;
        this.billingCycle = billingCycle;
        this.month = month;
        this.year = year;
        this.previousReading = previousReading;
        this.currentReading = currentReading;
        this.unitsConsumed = unitsConsumed;
        this.anomalyStatus = anomalyStatus;
        this.recordedAt = recordedAt;
    }

    @PrePersist
    protected void onCreate() {
        if (recordedAt == null) {
            recordedAt = LocalDateTime.now();
        }
        if (unitsConsumed == null && currentReading != null && previousReading != null) {
            unitsConsumed = Math.max(0, currentReading - previousReading);
        }
        if (anomalyStatus == null) {
            anomalyStatus = "NORMAL";
        }
    }

    public Long getUsageId() { return usageId; }
    public void setUsageId(Long usageId) { this.usageId = usageId; }

    public WaterMeter getMeter() { return meter; }
    public void setMeter(WaterMeter meter) { this.meter = meter; }

    public BillingCycle getBillingCycle() { return billingCycle; }
    public void setBillingCycle(BillingCycle billingCycle) { this.billingCycle = billingCycle; }

    public Integer getMonth() { return month; }
    public void setMonth(Integer month) { this.month = month; }

    public Integer getYear() { return year; }
    public void setYear(Integer year) { this.year = year; }

    public Double getPreviousReading() { return previousReading; }
    public void setPreviousReading(Double previousReading) { this.previousReading = previousReading; }

    public Double getCurrentReading() { return currentReading; }
    public void setCurrentReading(Double currentReading) { this.currentReading = currentReading; }

    public Double getUnitsConsumed() { return unitsConsumed; }
    public void setUnitsConsumed(Double unitsConsumed) { this.unitsConsumed = unitsConsumed; }

    public String getAnomalyStatus() { return anomalyStatus; }
    public void setAnomalyStatus(String anomalyStatus) { this.anomalyStatus = anomalyStatus; }

    public LocalDateTime getRecordedAt() { return recordedAt; }
    public void setRecordedAt(LocalDateTime recordedAt) { this.recordedAt = recordedAt; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private Long usageId;
        private WaterMeter meter;
        private BillingCycle billingCycle;
        private Integer month;
        private Integer year;
        private Double previousReading;
        private Double currentReading;
        private Double unitsConsumed;
        private String anomalyStatus;
        private LocalDateTime recordedAt;

        public Builder usageId(Long usageId) { this.usageId = usageId; return this; }
        public Builder meter(WaterMeter meter) { this.meter = meter; return this; }
        public Builder billingCycle(BillingCycle billingCycle) { this.billingCycle = billingCycle; return this; }
        public Builder month(Integer month) { this.month = month; return this; }
        public Builder year(Integer year) { this.year = year; return this; }
        public Builder previousReading(Double previousReading) { this.previousReading = previousReading; return this; }
        public Builder currentReading(Double currentReading) { this.currentReading = currentReading; return this; }
        public Builder unitsConsumed(Double unitsConsumed) { this.unitsConsumed = unitsConsumed; return this; }
        public Builder anomalyStatus(String anomalyStatus) { this.anomalyStatus = anomalyStatus; return this; }
        public Builder recordedAt(LocalDateTime recordedAt) { this.recordedAt = recordedAt; return this; }

        public WaterUsage build() {
            return new WaterUsage(usageId, meter, billingCycle, month, year, previousReading, currentReading,
                    unitsConsumed, anomalyStatus, recordedAt);
        }
    }
}
