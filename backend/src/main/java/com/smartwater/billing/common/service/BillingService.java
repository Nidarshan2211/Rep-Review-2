package com.smartwater.billing.common.service;

import com.smartwater.billing.common.dto.BillingDTOs.*;
import com.smartwater.billing.common.entity.*;
import com.smartwater.billing.owner.entity.*;
import com.smartwater.billing.resident.entity.*;
import com.smartwater.billing.common.exception.BadRequestException;
import com.smartwater.billing.common.exception.ResourceNotFoundException;
import com.smartwater.billing.owner.service.BuildingOwnerService;
import com.smartwater.billing.common.repository.*;
import com.smartwater.billing.owner.repository.*;
import com.smartwater.billing.resident.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class BillingService {

    private final BillRepository billRepository;
    private final PaymentRepository paymentRepository;
    private final ResidentRepository residentRepository;
    private final WaterUsageRepository usageRepository;
    private final TariffRepository tariffRepository;
    private final InvoiceRepository invoiceRepository;
    private final NotificationRepository notificationRepository;
    private final BuildingOwnerService ownerService;
    private final UserRepository userRepository;

    public BillingService(BillRepository billRepository, PaymentRepository paymentRepository, ResidentRepository residentRepository, WaterUsageRepository usageRepository, TariffRepository tariffRepository, InvoiceRepository invoiceRepository, NotificationRepository notificationRepository, BuildingOwnerService ownerService, UserRepository userRepository) {
        this.billRepository = billRepository;
        this.paymentRepository = paymentRepository;
        this.residentRepository = residentRepository;
        this.usageRepository = usageRepository;
        this.tariffRepository = tariffRepository;
        this.invoiceRepository = invoiceRepository;
        this.notificationRepository = notificationRepository;
        this.ownerService = ownerService;
        this.userRepository = userRepository;
    }


    public Double calculateBillAmount(Double units) {
        List<Tariff> tariffs = tariffRepository.findAllByOrderByMinimumUnitsAsc();
        if (tariffs.isEmpty()) {
            return units * 3.0 + 10.0;
        }

        double totalAmount = 0.0;
        double fixedCharge = tariffs.get(0).getFixedCharge();

        for (Tariff t : tariffs) {
            if (units >= t.getMinimumUnits()) {
                double unitsInTier = Math.min(units, t.getMaximumUnits()) - t.getMinimumUnits() + 1;
                if (unitsInTier > 0) {
                    totalAmount += unitsInTier * t.getPricePerUnit();
                }
            }
        }

        return totalAmount + fixedCharge;
    }

    @Transactional
    public BillResponse generateBill(String ownerEmail, GenerateBillRequest request) {
        BuildingOwner owner = ownerService.getOwnerByUserEmail(ownerEmail);
        Resident resident = residentRepository.findById(request.getResidentId())
                .orElseThrow(() -> new ResourceNotFoundException("Resident not found with id: " + request.getResidentId()));

        if (!resident.getBuilding().getOwner().getOwnerId().equals(owner.getOwnerId())) {
            throw new BadRequestException("Unauthorized access to resident building!");
        }

        if (resident.getAccountStatus() != Resident.AccountStatus.ACTIVE 
                || resident.getApartmentNumber() == null 
                || resident.getApartmentNumber().toUpperCase().startsWith("FORMER-")
                || resident.getApartmentNumber().equalsIgnoreCase("Vacated")
                || resident.getApartmentNumber().equalsIgnoreCase("Removed")) {
            throw new BadRequestException("Cannot generate bill: Resident " + resident.getName() + " is no longer an active occupant in this building.");
        }

        WaterUsage usage = usageRepository.findById(request.getUsageId())
                .orElseThrow(() -> new ResourceNotFoundException("Usage record not found with id: " + request.getUsageId()));

        Double billAmount = calculateBillAmount(usage.getUnitsConsumed());

        Bill bill = Bill.builder()
                .resident(resident)
                .waterUsage(usage)
                .billMonth(usage.getMonth())
                .billYear(usage.getYear())
                .units(usage.getUnitsConsumed())
                .amount(billAmount)
                .dueDate(request.getDueDate())
                .status(Bill.BillStatus.UNPAID)
                .build();

        billRepository.save(bill);

        // Notify Resident
        Notification notification = Notification.builder()
                .resident(resident)
                .title("New Water Bill Generated")
                .message(String.format("A new water bill of ₹%.2f has been generated for %d/%d. Due Date: %s",
                        billAmount, usage.getMonth(), usage.getYear(), request.getDueDate()))
                .isRead(false)
                .build();
        notificationRepository.save(notification);

        return convertToBillResponse(bill);
    }

    public List<BillResponse> getOwnerBills(String ownerEmail) {
        User user = userRepository.findByEmail(ownerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + ownerEmail));
        if (user.getRole() == User.Role.SUPER_ADMIN) {
            return billRepository.findAll().stream()
                    .map(this::convertToBillResponse)
                    .collect(Collectors.toList());
        }
        BuildingOwner owner = ownerService.getOwnerByUserEmail(ownerEmail);
        return billRepository.findByOwnerId(owner.getOwnerId()).stream()
                .map(this::convertToBillResponse)
                .collect(Collectors.toList());
    }

    public List<BillResponse> getResidentBills(String residentEmail) {
        Resident resident = residentRepository.findByUserEmail(residentEmail)
                .or(() -> residentRepository.findByEmail(residentEmail))
                .orElseThrow(() -> new ResourceNotFoundException("Resident not found for email: " + residentEmail));

        return billRepository.findByResidentResidentIdOrderByGeneratedAtDesc(resident.getResidentId()).stream()
                .map(this::convertToBillResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public PaymentResponse processPayment(PaymentRequest request) {
        Bill bill = billRepository.findById(request.getBillId())
                .orElseThrow(() -> new ResourceNotFoundException("Bill not found with id: " + request.getBillId()));

        if (bill.getStatus() == Bill.BillStatus.PAID) {
            throw new BadRequestException("Bill #SWB-" + bill.getBillId() + " has already been paid!");
        }

        String txRef = request.getTransactionReference() != null && !request.getTransactionReference().trim().isEmpty()
                ? request.getTransactionReference().trim()
                : "rzp_pay_" + UUID.randomUUID().toString().replace("-", "").substring(0, 14);

        String method = request.getPaymentMethod() != null ? request.getPaymentMethod() : "RAZORPAY_PAYMENT";

        Payment payment = Payment.builder()
                .bill(bill)
                .amount(request.getAmount() != null ? request.getAmount() : bill.getAmount())
                .paymentDate(LocalDateTime.now())
                .paymentMethod(method)
                .transactionReference(txRef)
                .status(Payment.PaymentStatus.SUCCESS)
                .build();

        paymentRepository.save(payment);

        bill.setStatus(Bill.BillStatus.PAID);
        billRepository.save(bill);

        // Update corresponding invoice status if present
        if (bill.getBillingCycle() != null && bill.getResident() != null) {
            invoiceRepository.findByBillingCycleIdAndResidentResidentId(bill.getBillingCycle().getId(), bill.getResident().getResidentId())
                    .ifPresent(invoice -> {
                        invoice.setStatus(Invoice.InvoiceStatus.PAID);
                        invoiceRepository.save(invoice);
                    });
        }

        // Notify Resident of Razorpay Payment Receipt Confirmation
        Notification notification = Notification.builder()
                .resident(bill.getResident())
                .title("Razorpay Payment Confirmed")
                .message(String.format("Payment of ₹%.2f via %s received for Bill #SWB-%d. Razorpay Txn Ref: %s",
                        payment.getAmount(), method, bill.getBillId(), txRef))
                .isRead(false)
                .build();
        notificationRepository.save(notification);

        return PaymentResponse.builder()
                .paymentId(payment.getPaymentId())
                .billId(bill.getBillId())
                .amount(payment.getAmount())
                .paymentDate(payment.getPaymentDate())
                .paymentMethod(payment.getPaymentMethod())
                .transactionReference(payment.getTransactionReference())
                .status(payment.getStatus().name())
                .build();
    }

    public List<PaymentResponse> getResidentPayments(String residentEmail) {
        Resident resident = residentRepository.findByUserEmail(residentEmail)
                .or(() -> residentRepository.findByEmail(residentEmail))
                .orElseThrow(() -> new ResourceNotFoundException("Resident not found"));

        return paymentRepository.findByBillResidentResidentIdOrderByPaymentDateDesc(resident.getResidentId()).stream()
                .map(p -> PaymentResponse.builder()
                        .paymentId(p.getPaymentId())
                        .billId(p.getBill().getBillId())
                        .amount(p.getAmount())
                        .paymentDate(p.getPaymentDate())
                        .paymentMethod(p.getPaymentMethod())
                        .transactionReference(p.getTransactionReference())
                        .status(p.getStatus().name())
                        .build())
                .collect(Collectors.toList());
    }

    public Bill getBillById(Long billId) {
        return billRepository.findById(billId)
                .orElseThrow(() -> new ResourceNotFoundException("Bill not found with id: " + billId));
    }

    @Transactional
    public BillResponse updateBillStatus(Long billId, String status) {
        Bill bill = getBillById(billId);
        Bill.BillStatus newStatus = Bill.BillStatus.valueOf(status.toUpperCase().trim());
        bill.setStatus(newStatus);

        if (bill.getBillingCycle() != null && bill.getResident() != null) {
            invoiceRepository.findByBillingCycleIdAndResidentResidentId(bill.getBillingCycle().getId(), bill.getResident().getResidentId())
                    .ifPresent(inv -> {
                        inv.setStatus(Invoice.InvoiceStatus.valueOf(newStatus.name()));
                        invoiceRepository.save(inv);
                    });
        }

        if (newStatus == Bill.BillStatus.PAID && paymentRepository.findByBillBillId(billId).isEmpty()) {
            Payment payment = Payment.builder()
                    .bill(bill)
                    .amount(bill.getAmount())
                    .paymentDate(LocalDateTime.now())
                    .paymentMethod("OFFLINE_ADMIN")
                    .transactionReference("TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                    .status(Payment.PaymentStatus.SUCCESS)
                    .build();
            paymentRepository.save(payment);
        }

        billRepository.save(bill);
        return convertToBillResponse(bill);
    }

    public InvoiceDashboardSummary getInvoicesSummary(String userEmail, Long buildingId, Long billingCycleId, String status, String search) {
        List<BillResponse> all = getOwnerBills(userEmail);

        List<BillResponse> filtered = all.stream().filter(b -> {
            if (buildingId != null && (b.getBuildingId() == null || !b.getBuildingId().equals(buildingId))) {
                return false;
            }
            if (billingCycleId != null && (b.getBillingCycleId() == null || !b.getBillingCycleId().equals(billingCycleId))) {
                return false;
            }
            if (status != null && !status.equalsIgnoreCase("ALL") && !status.trim().isEmpty()) {
                if (!b.getStatus().equalsIgnoreCase(status.trim())) {
                    return false;
                }
            }
            if (search != null && !search.trim().isEmpty()) {
                String q = search.trim().toLowerCase();
                boolean matches = (b.getResidentName() != null && b.getResidentName().toLowerCase().contains(q)) ||
                        (b.getApartmentNumber() != null && b.getApartmentNumber().toLowerCase().contains(q)) ||
                        (b.getBuildingName() != null && b.getBuildingName().toLowerCase().contains(q)) ||
                        (String.valueOf(b.getBillId()).contains(q));
                if (!matches) return false;
            }
            return true;
        }).collect(Collectors.toList());

        double totalBilled = filtered.stream().mapToDouble(b -> b.getAmount() != null ? b.getAmount() : 0.0).sum();
        double totalPaid = filtered.stream().filter(b -> "PAID".equalsIgnoreCase(b.getStatus()))
                .mapToDouble(b -> b.getAmount() != null ? b.getAmount() : 0.0).sum();
        double totalUnpaid = filtered.stream().filter(b -> !"PAID".equalsIgnoreCase(b.getStatus()))
                .mapToDouble(b -> b.getAmount() != null ? b.getAmount() : 0.0).sum();
        double avgBilled = !filtered.isEmpty() ? (totalBilled / filtered.size()) : 0.0;
        int paidCount = (int) filtered.stream().filter(b -> "PAID".equalsIgnoreCase(b.getStatus())).count();
        int unpaidCount = (int) filtered.stream().filter(b -> !"PAID".equalsIgnoreCase(b.getStatus())).count();

        return new InvoiceDashboardSummary(
                totalBilled,
                totalPaid,
                totalUnpaid,
                avgBilled,
                filtered.size(),
                paidCount,
                unpaidCount,
                filtered
        );
    }

    public BillResponse convertToBillResponse(Bill bill) {
        Invoice invoice = null;
        if (bill.getBillingCycle() != null && bill.getResident() != null) {
            invoice = invoiceRepository.findByBillingCycleIdAndResidentResidentId(bill.getBillingCycle().getId(), bill.getResident().getResidentId()).orElse(null);
        }
        if (invoice == null && bill.getResident() != null) {
            invoice = invoiceRepository.findTopByResidentResidentIdOrderByCreatedAtDesc(bill.getResident().getResidentId()).orElse(null);
        }

        Double base = 0.0;
        if (bill.getTier1Amount() != null) {
            base = bill.getTier1Amount().doubleValue();
        } else if (invoice != null && invoice.getBaseCharge() != null) {
            base = invoice.getBaseCharge().doubleValue();
        }

        Double extra = 0.0;
        if (bill.getTier2Amount() != null || bill.getTier3Amount() != null) {
            double t2 = bill.getTier2Amount() != null ? bill.getTier2Amount().doubleValue() : 0.0;
            double t3 = bill.getTier3Amount() != null ? bill.getTier3Amount().doubleValue() : 0.0;
            extra = t2 + t3;
        } else if (invoice != null && invoice.getExtraCharge() != null) {
            extra = invoice.getExtraCharge().doubleValue();
        }

        Double shared = (invoice != null && invoice.getSharedWaterCharge() != null) ? invoice.getSharedWaterCharge().doubleValue() : 0.0;

        Double t1Units = bill.getTier1Units() != null ? bill.getTier1Units().doubleValue() : (invoice != null && invoice.getTier1Units() != null ? invoice.getTier1Units().doubleValue() : 0.0);
        Double t1Rate = bill.getTier1Rate() != null ? bill.getTier1Rate().doubleValue() : (invoice != null && invoice.getTier1Rate() != null ? invoice.getTier1Rate().doubleValue() : 0.0);
        Double t1Amount = bill.getTier1Amount() != null ? bill.getTier1Amount().doubleValue() : (invoice != null && invoice.getTier1Amount() != null ? invoice.getTier1Amount().doubleValue() : 0.0);

        Double t2Units = bill.getTier2Units() != null ? bill.getTier2Units().doubleValue() : (invoice != null && invoice.getTier2Units() != null ? invoice.getTier2Units().doubleValue() : 0.0);
        Double t2Rate = bill.getTier2Rate() != null ? bill.getTier2Rate().doubleValue() : (invoice != null && invoice.getTier2Rate() != null ? invoice.getTier2Rate().doubleValue() : 0.0);
        Double t2Amount = bill.getTier2Amount() != null ? bill.getTier2Amount().doubleValue() : (invoice != null && invoice.getTier2Amount() != null ? invoice.getTier2Amount().doubleValue() : 0.0);

        Double t3Units = bill.getTier3Units() != null ? bill.getTier3Units().doubleValue() : (invoice != null && invoice.getTier3Units() != null ? invoice.getTier3Units().doubleValue() : 0.0);
        Double t3Rate = bill.getTier3Rate() != null ? bill.getTier3Rate().doubleValue() : (invoice != null && invoice.getTier3Rate() != null ? invoice.getTier3Rate().doubleValue() : 0.0);
        Double t3Amount = bill.getTier3Amount() != null ? bill.getTier3Amount().doubleValue() : (invoice != null && invoice.getTier3Amount() != null ? invoice.getTier3Amount().doubleValue() : 0.0);

        Long bId = bill.getResident() != null && bill.getResident().getBuilding() != null ? bill.getResident().getBuilding().getBuildingId() : null;
        String bNum = bill.getResident() != null && bill.getResident().getBuilding() != null ? bill.getResident().getBuilding().getBuildingNumber() : "";
        Long cId = bill.getBillingCycle() != null ? bill.getBillingCycle().getId() : null;

        return BillResponse.builder()
                .billId(bill.getBillId())
                .residentId(bill.getResident() != null ? bill.getResident().getResidentId() : null)
                .residentName(bill.getResident() != null ? bill.getResident().getName() : "")
                .residentEmail(bill.getResident() != null ? bill.getResident().getEmail() : "")
                .apartmentNumber(bill.getResident() != null ? bill.getResident().getApartmentNumber() : "")
                .buildingName(bill.getResident() != null && bill.getResident().getBuilding() != null ? bill.getResident().getBuilding().getBuildingName() : "")
                .buildingId(bId)
                .buildingNumber(bNum)
                .billingCycleId(cId)
                .billMonth(bill.getBillMonth())
                .billYear(bill.getBillYear())
                .units(bill.getUnits() != null ? bill.getUnits() : 0.0)
                .amount(bill.getAmount() != null ? bill.getAmount() : 0.0)
                .baseCharge(base)
                .extraCharge(extra)
                .sharedWaterCharge(shared)
                .tier1Units(t1Units)
                .tier1Rate(t1Rate)
                .tier1Amount(t1Amount)
                .tier2Units(t2Units)
                .tier2Rate(t2Rate)
                .tier2Amount(t2Amount)
                .tier3Units(t3Units)
                .tier3Rate(t3Rate)
                .tier3Amount(t3Amount)
                .dueDate(bill.getDueDate())
                .status(bill.getStatus() != null ? bill.getStatus().name() : "UNPAID")
                .generatedAt(bill.getGeneratedAt())
                .build();
    }
}
