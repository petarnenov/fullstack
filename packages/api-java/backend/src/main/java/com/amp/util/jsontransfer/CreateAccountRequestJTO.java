package com.amp.util.jsontransfer;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateAccountRequestJTO {
    private String holderName;
    private String email;
    private String productType;
}
