package com.amp.service.auth;

import atomatron.worker.agent.message.Message;
import com.amp.service.Response;
import com.amp.util.jsontransfer.DemoCredentialJTO;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class DemoCredentialsMsg extends Message {
    private static final long serialVersionUID = 1L;

    private Response response;
    private List<DemoCredentialJTO> credentials;
}
