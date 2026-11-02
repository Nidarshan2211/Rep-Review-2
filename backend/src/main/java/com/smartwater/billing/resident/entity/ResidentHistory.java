package com.smartwater.billing.resident.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "resident_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResidentHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_id", nullable = false)
    private Long ownerId;

    @Column(name = "building_id")
    private Long buildingId;

    @Column(name = "building_name", length = 150)
    private String buildingName;

    @Column(name = "apartment_id")
    private Long apartmentId;

    @Column(name = "apartment_name", length = 150)
    private String apartmentName;

    @Column(name = "room_number", length = 50)
    private String roomNumber;

    @Column(name = "resident_id")
    private Long residentId;

    @Column(name = "resident_name", length = 150, nullable = false)
    private String residentName;

    @Column(name = "resident_email", length = 150)
    private String residentEmail;

    @Column(name = "resident_phone", length = 50)
    private String residentPhone;

    @Column(name = "activity_type", length = 50, nullable = false)
    private String activityType;

    @Column(name = "details", length = 500)
    private String details;

    @Column(name = "actor", length = 100)
    private String actor;

    @Column(name = "timestamp", nullable = false)
    private LocalDateTime timestamp;
}

