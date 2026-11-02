package com.smartwater.billing.owner.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "owner_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OwnerHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_id")
    private Long ownerId;

    @Column(name = "owner_name", length = 150, nullable = false)
    private String ownerName;

    @Column(name = "email", length = 150)
    private String email;

    @Column(name = "phone", length = 50)
    private String phone;

    @Column(name = "event_type", length = 50, nullable = false)
    private String eventType;

    @Column(name = "details", length = 500)
    private String details;

    @Column(name = "actor", length = 100)
    private String actor;

    @Column(name = "timestamp", nullable = false)
    private LocalDateTime timestamp;
}

