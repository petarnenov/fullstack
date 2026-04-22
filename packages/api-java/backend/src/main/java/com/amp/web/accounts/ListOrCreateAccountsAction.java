package com.amp.web.accounts;

import com.amp.service.accounts.AccountsManager;
import com.amp.util.jsontransfer.AccountJTO;
import com.amp.util.jsontransfer.CreateAccountRequestJTO;
import com.amp.web.common.action.AuthenticatedJsonAction;
import org.apache.struts2.ServletActionContext;

/**
 * Node router defines both GET / and POST / on the same path — we branch on
 * the HTTP method here rather than wiring two Struts actions at the same
 * name, which the default action mapper doesn't support.
 */
public class ListOrCreateAccountsAction extends AuthenticatedJsonAction {

    @Override
    protected String executeAuthenticated() {
        String method = ServletActionContext.getRequest().getMethod();
        if ("POST".equalsIgnoreCase(method)) {
            return handleCreate();
        }
        return json(AccountsManager.getSole().list());
    }

    private String handleCreate() {
        CreateAccountRequestJTO body = parseJsonBody(CreateAccountRequestJTO.class);
        if (body == null
                || isBlank(body.getHolderName())
                || isBlank(body.getEmail())
                || isBlank(body.getProductType())) {
            return error(400, "Invalid request");
        }
        AccountJTO created = AccountsManager.getSole()
                .create(body.getHolderName(), body.getEmail(), body.getProductType());
        status(201);
        return json(created);
    }

    private static boolean isBlank(String s) { return s == null || s.isBlank(); }
}
