package com.amp.util.jsontransfer;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LoginResponseJTO extends AbstractJTO {
    private String token;
    private AuthenticatedUserJTO user;
}
