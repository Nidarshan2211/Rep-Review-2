package com.smartwater.billing.common.prediction.controller;

import com.smartwater.billing.common.prediction.dto.PredictionDTOs.PredictionResponse;
import com.smartwater.billing.common.prediction.entity.WaterUsagePrediction;
import com.smartwater.billing.common.prediction.service.WaterPredictionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/resident/prediction", "/resident/prediction"})
public class WaterPredictionController {

    private final WaterPredictionService predictionService;

    public WaterPredictionController(WaterPredictionService predictionService) {
        this.predictionService = predictionService;
    }

    @GetMapping("/next-month")
    @PreAuthorize("hasAnyRole('RESIDENT', 'SUPER_ADMIN')")
    public ResponseEntity<PredictionResponse> predictNextMonth(Authentication authentication) {
        return ResponseEntity.ok(predictionService.predictNextMonthBill(authentication.getName()));
    }

    @PostMapping("/recalculate")
    @PreAuthorize("hasAnyRole('RESIDENT', 'SUPER_ADMIN')")
    public ResponseEntity<PredictionResponse> recalculatePrediction(Authentication authentication) {
        return ResponseEntity.ok(predictionService.predictNextMonthBill(authentication.getName()));
    }

    @GetMapping("/history")
    @PreAuthorize("hasAnyRole('RESIDENT', 'SUPER_ADMIN')")
    public ResponseEntity<List<WaterUsagePrediction>> getPredictionHistory(Authentication authentication) {
        return ResponseEntity.ok(predictionService.getPredictionHistory(authentication.getName()));
    }
}
