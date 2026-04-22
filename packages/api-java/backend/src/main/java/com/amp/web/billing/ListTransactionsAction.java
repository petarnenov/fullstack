package com.amp.web.billing;

import com.amp.service.billing.BillingManager;
import com.amp.web.common.action.AuthenticatedJsonAction;

public class ListTransactionsAction extends AuthenticatedJsonAction {
    @Override
    protected String executeAuthenticated() {
        return json(BillingManager.getSole().listTransactions());
    }
}
