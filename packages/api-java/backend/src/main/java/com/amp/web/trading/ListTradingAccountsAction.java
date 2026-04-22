package com.amp.web.trading;

import com.amp.service.trading.TradingManager;
import com.amp.web.common.action.AuthenticatedJsonAction;

public class ListTradingAccountsAction extends AuthenticatedJsonAction {
    @Override
    protected String executeAuthenticated() {
        return json(TradingManager.getSole().listTradingAccounts());
    }
}
