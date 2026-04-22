package com.amp.service.accounts;

import atomatron.worker.service.Service;
import com.amp.util.jsontransfer.AccountJTO;
import com.amp.util.jsontransfer.OnboardingProgressJTO;
import lombok.Getter;

import java.util.List;

public class AccountsManager extends Service {
    @Getter
    private static final AccountsManager sole = new AccountsManager("AccountsManager");

    private AccountsManager(String name) {
        super(name);
    }

    public List<AccountJTO> list() {
        ListAccountsMsg msg = new ListAccountsMsg();
        msg = (ListAccountsMsg) providerSendAndWait(msg);
        return msg.getAccounts();
    }

    public AccountJTO get(String id) {
        GetAccountMsg msg = new GetAccountMsg(id);
        msg = (GetAccountMsg) providerSendAndWait(msg);
        return msg.getAccount();
    }

    public AccountJTO create(String holderName, String email, String productType) {
        CreateAccountMsg msg = new CreateAccountMsg(holderName, email, productType);
        msg = (CreateAccountMsg) providerSendAndWait(msg);
        return msg.getAccount();
    }

    public AdvanceStepMsg advanceStep(String id, String step) {
        AdvanceStepMsg msg = new AdvanceStepMsg(id, step);
        msg = (AdvanceStepMsg) providerSendAndWait(msg);
        return msg;
    }

    public OnboardingProgressJTO getProgress() {
        GetProgressMsg msg = new GetProgressMsg();
        msg = (GetProgressMsg) providerSendAndWait(msg);
        return msg.getProgress();
    }
}
