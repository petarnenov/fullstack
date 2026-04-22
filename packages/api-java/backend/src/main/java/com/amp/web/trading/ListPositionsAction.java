package com.amp.web.trading;

import com.amp.service.trading.TradingManager;
import com.amp.web.common.action.AuthenticatedJsonAction;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ListPositionsAction extends AuthenticatedJsonAction {
    private String accountId;

    @Override
    protected String executeAuthenticated() {
        String q = (accountId == null || accountId.isBlank()) ? null : accountId;
        return json(TradingManager.getSole().listPositions(q));
    }
}
