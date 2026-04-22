package com.amp.util.jsontransfer;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class AccountJTO extends AbstractJTO {
    private String id;
    private String holderName;
    private String email;
    private String productType;
    private String status;
    private List<String> completedSteps;
    private String createdAt;
    private String updatedAt;
}
