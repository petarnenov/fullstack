package com.amp.web.trading;

import com.amp.service.trading.TradingManager;
import com.amp.util.jsontransfer.DepositRequestJTO;
import com.amp.web.common.action.AuthenticatedJsonAction;

public class DepositAction extends AuthenticatedJsonAction {
    @Override
    protected String executeAuthenticated() {
        DepositRequestJTO body = parseJsonBody(DepositRequestJTO.class);
        if (body == null
                || body.getAccountId() == null
                || body.getAccountId().isBlank()
                || body.getAmount() <= 0) {
            return error(400, "Invalid deposit");
        }
        status(201);
        return json(TradingManager.getSole().deposit(body.getAccountId(), body.getAmount()));
    }
}
