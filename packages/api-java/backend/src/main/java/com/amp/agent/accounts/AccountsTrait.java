package com.amp.agent.accounts;

import atomatron.worker.agent.message.Message;
import com.amp.agent.GeowealthBasicManagerTrait;
import com.amp.service.Response;
import com.amp.service.accounts.AdvanceStepMsg;
import com.amp.service.accounts.CreateAccountMsg;
import com.amp.service.accounts.GetAccountMsg;
import com.amp.service.accounts.GetProgressMsg;
import com.amp.service.accounts.ListAccountsMsg;
import com.netfolio.agent.RetryReaction;

public class AccountsTrait extends GeowealthBasicManagerTrait {
    private static final long serialVersionUID = 1L;

    @Override
    public void prepareReactions() {
        when(ListAccountsMsg.class, new RetryReaction() {
            @Override
            public void react(Message aMessage) throws Throwable {
                ListAccountsMsg msg = (ListAccountsMsg) aMessage;
                try {
                    msg.setAccounts(AccountsProcess.list());
                    msg.setResponse(new Response());
                } catch (Exception ex) {
                    logAndThrow(ex, msg);
                }
            }
        });

        when(GetAccountMsg.class, new RetryReaction() {
            @Override
            public void react(Message aMessage) throws Throwable {
                GetAccountMsg msg = (GetAccountMsg) aMessage;
                try {
                    msg.setAccount(AccountsProcess.get(msg.getId()));
                    msg.setResponse(new Response());
                } catch (Exception ex) {
                    logAndThrow(ex, msg);
                }
            }
        });

        when(CreateAccountMsg.class, new RetryReaction() {
            @Override
            public void react(Message aMessage) throws Throwable {
                CreateAccountMsg msg = (CreateAccountMsg) aMessage;
                try {
                    msg.setAccount(AccountsProcess.create(
                            msg.getHolderName(), msg.getEmail(), msg.getProductType()));
                    msg.setResponse(new Response());
                } catch (Exception ex) {
                    logAndThrow(ex, msg);
                }
            }
        });

        when(AdvanceStepMsg.class, new RetryReaction() {
            @Override
            public void react(Message aMessage) throws Throwable {
                AdvanceStepMsg msg = (AdvanceStepMsg) aMessage;
                try {
                    AccountsProcess.AdvanceResult r =
                            AccountsProcess.advanceStep(msg.getId(), msg.getStep());
                    msg.setAccount(r.account);
                    msg.setNotFound(r.notFound);
                    msg.setInvalidStepReason(r.invalidStepReason);
                    msg.setResponse(new Response());
                } catch (Exception ex) {
                    logAndThrow(ex, msg);
                }
            }
        });

        when(GetProgressMsg.class, new RetryReaction() {
            @Override
            public void react(Message aMessage) throws Throwable {
                GetProgressMsg msg = (GetProgressMsg) aMessage;
                try {
                    msg.setProgress(AccountsProcess.getProgress());
                    msg.setResponse(new Response());
                } catch (Exception ex) {
                    logAndThrow(ex, msg);
                }
            }
        });
    }
}
