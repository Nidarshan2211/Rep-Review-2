package com.smartwater.billing.common.prediction.client;

import com.smartwater.billing.common.prediction.dto.PredictionDTOs.FastApiPredictRequest;
import com.smartwater.billing.common.prediction.dto.PredictionDTOs.FastApiPredictResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class PredictionMlClient {

    private static final Logger log = LoggerFactory.getLogger(PredictionMlClient.class);

    private final String baseUrl;
    private final RestClient restClient;

    public PredictionMlClient(@Value("${ml.base-url:http://localhost:8000}") String baseUrl) {
        this.baseUrl = baseUrl;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5000);
        requestFactory.setReadTimeout(5000);

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();

        log.info("PredictionMlClient initialized targeting: {}/predict (timeout: 5000ms)", baseUrl);
    }

    public FastApiPredictResponse predict(FastApiPredictRequest request) {
        try {
            log.info("Dispatching prediction request to FastAPI for household #{}, prediction month: {}", 
                     request.getHousehold_id(), request.getPrediction_month());

            FastApiPredictResponse response = restClient.post()
                    .uri("/predict")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(FastApiPredictResponse.class);

            if (response != null && response.getPredicted_consumption_litres() != null) {
                log.info("Received prediction response: {} L (Status: {})", 
                         response.getPredicted_consumption_litres(), response.getPrediction_status());
                return response;
            }
        } catch (RestClientException rce) {
            log.error("PredictionMlClient HTTP failure calling {}/predict: {}", baseUrl, rce.getMessage());
        } catch (Exception ex) {
            log.error("Unexpected error in PredictionMlClient: {}", ex.getMessage(), ex);
        }

        // Return graceful fallback prediction based on historical average and residents count
        log.warn("Falling back to local heuristic estimate due to ML microservice unavailability.");
        FastApiPredictResponse fallback = new FastApiPredictResponse();
        fallback.setHousehold_id(request.getHousehold_id());
        fallback.setPrediction_month(request.getPrediction_month());
        
        double baseEst = request.getThree_month_average() != null && request.getThree_month_average() > 0 ?
                         request.getThree_month_average() :
                         (request.getResidents_count() != null ? request.getResidents_count() * 4500.0 : 15000.0);
        
        fallback.setPredicted_consumption_litres(Math.round(baseEst * 100.0) / 100.0);
        fallback.setModel_name("Random Forest Regressor (Fallback Heuristic)");
        fallback.setModel_version("1.0.0-fallback");
        fallback.setPrediction_status("FALLBACK_ESTIMATE");
        return fallback;
    }
}
