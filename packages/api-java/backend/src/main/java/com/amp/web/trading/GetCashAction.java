package com.amp.web.trading;

import com.amp.service.trading.TradingManager;
import com.amp.web.common.action.AuthenticatedJsonAction;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GetCashAction extends AuthenticatedJsonAction {
    private String accountId;

    @Override
    protected String executeAuthenticated() {
        return json(TradingManager.getSole().getCash(accountId));
    }
}
