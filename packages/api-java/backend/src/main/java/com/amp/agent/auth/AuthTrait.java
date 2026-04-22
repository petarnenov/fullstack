package com.amp.agent.auth;

import atomatron.worker.agent.message.Message;
import com.amp.agent.GeowealthBasicManagerTrait;
import com.amp.service.Response;
import com.amp.service.auth.DemoCredentialsMsg;
import com.amp.service.auth.IssuedSession;
import com.amp.service.auth.LoginMsg;
import com.amp.service.auth.LogoutMsg;
import com.amp.service.auth.MeMsg;
import com.amp.service.auth.RefreshMsg;
import com.amp.util.hibernate.HibernateSessionFactory;
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
                    IssuedSession result = AuthProcess.login(msg.getEmail(), msg.getPassword());
                    if (result == null) {
                        msg.setInvalidCredentials(true);
                    } else {
                        msg.setResult(result);
                    }
                    msg.setResponse(new Response());
                } catch (Exception ex) {
                    logAndThrow(ex, msg);
                } finally {
                    HibernateSessionFactory.closeSession();
                }
            }
        });

        when(RefreshMsg.class, new RetryReaction() {
            @Override
            public void react(Message aMessage) throws Throwable {
                RefreshMsg msg = (RefreshMsg) aMessage;
                try {
                    msg.setResult(AuthProcess.rotate(msg.getRefreshToken()));
                    msg.setResponse(new Response());
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
                    AuthProcess.revokeFamilyByRefreshToken(msg.getRefreshToken());
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
                    AuthProcess.SessionLookup lookup = AuthProcess.lookupSession(msg.getAccessToken());
                    if (lookup != null) {
                        msg.setUser(lookup.user);
                        msg.setCsrfToken(lookup.csrfToken);
                    }
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
