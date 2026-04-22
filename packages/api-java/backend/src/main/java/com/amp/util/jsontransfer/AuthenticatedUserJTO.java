package com.amp.util.jsontransfer;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AuthenticatedUserJTO extends AbstractJTO {
    private String id;
    private String email;
    private String fullName;
    private String role;
    private String tenantId;
}
