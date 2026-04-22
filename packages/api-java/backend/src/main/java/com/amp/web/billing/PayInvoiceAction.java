package com.amp.web.billing;

import com.amp.service.billing.BillingManager;
import com.amp.util.jsontransfer.InvoiceJTO;
import com.amp.util.jsontransfer.PayInvoiceRequestJTO;
import com.amp.web.common.action.AuthenticatedJsonAction;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PayInvoiceAction extends AuthenticatedJsonAction {
    private String invoiceId;

    @Override
    protected String executeAuthenticated() {
        PayInvoiceRequestJTO body = parseJsonBody(PayInvoiceRequestJTO.class);
        if (body == null || body.getPaymentMethodId() == null
                || body.getPaymentMethodId().isBlank()) {
            return error(400, "Invalid payment request");
        }
        InvoiceJTO invoice = BillingManager.getSole()
                .payInvoice(invoiceId, body.getPaymentMethodId());
        if (invoice == null) return error(404, "Invoice not found");
        return json(invoice);
    }
}
