package com.smartwater.billing.common.repository;


import com.smartwater.billing.common.entity.*;
import com.smartwater.billing.owner.entity.*;
import com.smartwater.billing.resident.entity.*;
import com.smartwater.billing.common.entity.Bill;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BillRepository extends JpaRepository<Bill, Long> {
    List<Bill> findByResidentResidentIdOrderByGeneratedAtDesc(Long residentId);
    Optional<Bill> findByResidentResidentIdAndBillMonthAndBillYear(Long residentId, Integer month, Integer year);
    Optional<Bill> findByBillingCycleIdAndResidentResidentId(Long billingCycleId, Long residentId);
    
    @Query("SELECT b FROM Bill b WHERE b.resident.building.owner.ownerId = :ownerId ORDER BY b.generatedAt DESC")
    List<Bill> findByOwnerId(@Param("ownerId") Long ownerId);

    @Query("SELECT b FROM Bill b WHERE b.resident.building.owner.ownerId = :ownerId ORDER BY b.generatedAt DESC")
    Page<Bill> findByOwnerIdPaged(@Param("ownerId") Long ownerId, Pageable pageable);

    @Query("SELECT SUM(b.amount) FROM Bill b WHERE b.resident.building.owner.ownerId = :ownerId AND b.status = 'PAID'")
    Double getTotalRevenueByOwner(@Param("ownerId") Long ownerId);

    @Query("SELECT SUM(b.amount) FROM Bill b WHERE b.status = 'PAID'")
    Double getTotalSystemRevenue();

    @Query("SELECT b FROM Bill b WHERE b.resident.building.owner.ownerId = :ownerId AND b.status IN ('UNPAID', 'OVERDUE')")
    List<Bill> findUnpaidBillsByOwnerId(@Param("ownerId") Long ownerId);
}
