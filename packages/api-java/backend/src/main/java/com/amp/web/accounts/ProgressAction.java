package com.amp.web.accounts;

import com.amp.service.accounts.AccountsManager;
import com.amp.web.common.action.AuthenticatedJsonAction;

public class ProgressAction extends AuthenticatedJsonAction {
    @Override
    protected String executeAuthenticated() {
        return json(AccountsManager.getSole().getProgress());
    }
}
