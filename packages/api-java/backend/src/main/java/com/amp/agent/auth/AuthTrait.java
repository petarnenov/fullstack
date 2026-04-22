package com.amp.agent.auth;

import atomatron.worker.agent.message.Message;
import com.amp.agent.GeowealthBasicManagerTrait;
import com.amp.service.Response;
import com.amp.service.auth.DemoCredentialsMsg;
import com.amp.service.auth.LoginMsg;
import com.amp.service.auth.LogoutMsg;
import com.amp.service.auth.MeMsg;
import com.amp.util.hibernate.HibernateSessionFactory;
import com.amp.util.jsontransfer.AuthenticatedUserJTO;
import com.amp.util.jsontransfer.LoginResponseJTO;
import com.netfolio.agent.RetryReaction;

public class AuthTrait extends GeowealthBasicManagerTrait {
    private static final long serialVersionUID = 1L;

    @Override
    public void prepareReactions() {
        when(LoginMsg.class, new RetryReaction() {
            @Override
            public void react(Message aMessage) throws Throwable {
                LoginMsg msg = (LoginMsg) aMessage;
                try {
                    Response response = new Response();
                    LoginResponseJTO result = AuthProcess.login(msg.getEmail(), msg.getPassword());
                    if (result == null) {
                        msg.setInvalidCredentials(true);
                    } else {
                        msg.setResult(result);
                    }
                    msg.setResponse(response);
                } catch (Exception ex) {
                    logAndThrow(ex, msg);
                } finally {
                    HibernateSessionFactory.closeSession();
                }
            }
        });

        when(LogoutMsg.class, new RetryReaction() {
            @Override
            public void react(Message aMessage) throws Throwable {
                LogoutMsg msg = (LogoutMsg) aMessage;
                try {
                    AuthProcess.logout(msg.getToken());
                    msg.setResponse(new Response());
                } catch (Exception ex) {
                    logAndThrow(ex, msg);
                } finally {
                    HibernateSessionFactory.closeSession();
                }
            }
        });

        when(MeMsg.class, new RetryReaction() {
            @Override
            public void react(Message aMessage) throws Throwable {
                MeMsg msg = (MeMsg) aMessage;
                try {
                    AuthenticatedUserJTO user = AuthProcess.findUserByToken(msg.getToken());
                    msg.setUser(user);
                    msg.setResponse(new Response());
                } catch (Exception ex) {
                    logAndThrow(ex, msg);
                } finally {
                    HibernateSessionFactory.closeSession();
                }
            }
        });

        when(DemoCredentialsMsg.class, new RetryReaction() {
            @Override
            public void react(Message aMessage) throws Throwable {
                DemoCredentialsMsg msg = (DemoCredentialsMsg) aMessage;
                try {
                    msg.setCredentials(AuthProcess.listDemoCredentials());
                    msg.setResponse(new Response());
                } catch (Exception ex) {
                    logAndThrow(ex, msg);
                } finally {
                    HibernateSessionFactory.closeSession();
                }
            }
        });
    }
}
