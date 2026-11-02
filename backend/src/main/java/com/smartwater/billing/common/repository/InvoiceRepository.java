package com.smartwater.billing.common.repository;


import com.smartwater.billing.common.entity.*;
import com.smartwater.billing.owner.entity.*;
import com.smartwater.billing.resident.entity.*;
import com.smartwater.billing.common.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    List<Invoice> findByResidentResidentIdOrderByCreatedAtDesc(Long residentId);
    List<Invoice> findByBillingCycleId(Long billingCycleId);
    Optional<Invoice> findTopByResidentResidentIdOrderByCreatedAtDesc(Long residentId);
    Optional<Invoice> findByBillingCycleIdAndResidentResidentId(Long billingCycleId, Long residentId);

    @Query("SELECT i FROM Invoice i WHERE i.resident.building.owner.ownerId = :ownerId AND i.status IN ('UNPAID', 'OVERDUE')")
    List<Invoice> findUnpaidInvoicesByOwnerId(@Param("ownerId") Long ownerId);
}
