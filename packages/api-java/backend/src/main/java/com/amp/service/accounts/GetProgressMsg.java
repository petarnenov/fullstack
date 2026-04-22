package com.amp.service.accounts;

import atomatron.worker.agent.message.Message;
import com.amp.service.Response;
import com.amp.util.jsontransfer.OnboardingProgressJTO;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GetProgressMsg extends Message {
    private static final long serialVersionUID = 1L;

    private Response response;
    private OnboardingProgressJTO progress;
}
