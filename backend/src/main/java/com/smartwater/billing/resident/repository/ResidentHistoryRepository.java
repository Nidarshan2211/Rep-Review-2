package com.smartwater.billing.resident.repository;

import com.smartwater.billing.resident.entity.ResidentHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResidentHistoryRepository extends JpaRepository<ResidentHistory, Long> {
    List<ResidentHistory> findByOwnerIdOrderByTimestampDesc(Long ownerId);
    List<ResidentHistory> findAllByOrderByTimestampDesc();
}

