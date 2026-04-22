package com.amp.web.billing;

import com.amp.service.billing.BillingManager;
import com.amp.util.jsontransfer.InvoiceJTO;
import com.amp.web.common.action.AuthenticatedJsonAction;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GetInvoiceAction extends AuthenticatedJsonAction {
    private String invoiceId;

    @Override
    protected String executeAuthenticated() {
        InvoiceJTO invoice = BillingManager.getSole().getInvoice(invoiceId);
        if (invoice == null) return error(404, "Invoice not found");
        return json(invoice);
    }
}
