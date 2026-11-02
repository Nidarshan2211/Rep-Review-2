package com.smartwater.billing.owner.repository;

import com.smartwater.billing.owner.entity.OwnerHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OwnerHistoryRepository extends JpaRepository<OwnerHistory, Long> {
    List<OwnerHistory> findAllByOrderByTimestampDesc();
}

