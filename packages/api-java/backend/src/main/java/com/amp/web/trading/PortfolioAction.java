package com.amp.web.trading;

import com.amp.service.trading.TradingManager;
import com.amp.web.common.action.AuthenticatedJsonAction;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PortfolioAction extends AuthenticatedJsonAction {
    private String accountId;

    @Override
    protected String executeAuthenticated() {
        if (accountId == null || accountId.isBlank()) {
            return error(400, "Query param 'accountId' is required for portfolio summary");
        }
        return json(TradingManager.getSole().getPortfolio(accountId));
    }
}
