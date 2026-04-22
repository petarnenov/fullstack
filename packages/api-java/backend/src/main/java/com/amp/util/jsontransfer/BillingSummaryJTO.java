package com.amp.util.jsontransfer;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BillingSummaryJTO extends AbstractJTO {
    private double outstandingBalance;
    private String currency;
    private int overdueCount;
    private int pendingCount;
    private double paidThisMonth;
}
