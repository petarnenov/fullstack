package com.amp.web.accounts;

import com.amp.service.accounts.AccountsManager;
import com.amp.util.jsontransfer.AccountJTO;
import com.amp.web.common.action.AuthenticatedJsonAction;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GetAccountAction extends AuthenticatedJsonAction {
    private String accountId;

    @Override
    protected String executeAuthenticated() {
        AccountJTO account = AccountsManager.getSole().get(accountId);
        if (account == null) return error(404, "Account not found");
        return json(account);
    }
}
