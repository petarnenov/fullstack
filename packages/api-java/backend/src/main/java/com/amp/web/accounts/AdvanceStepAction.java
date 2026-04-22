package com.amp.web.accounts;

import com.amp.service.accounts.AccountsManager;
import com.amp.service.accounts.AdvanceStepMsg;
import com.amp.util.jsontransfer.AdvanceStepRequestJTO;
import com.amp.web.common.action.AuthenticatedJsonAction;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdvanceStepAction extends AuthenticatedJsonAction {
    private String accountId;

    @Override
    protected String executeAuthenticated() {
        AdvanceStepRequestJTO body = parseJsonBody(AdvanceStepRequestJTO.class);
        if (body == null || body.getStep() == null || body.getStep().isBlank()) {
            return error(400, "Invalid request");
        }
        AdvanceStepMsg result = AccountsManager.getSole().advanceStep(accountId, body.getStep());
        if (result.isNotFound()) return error(404, "Account " + accountId + " not found");
        if (result.getInvalidStepReason() != null) {
            return error(409, result.getInvalidStepReason());
        }
        return json(result.getAccount());
    }
}
