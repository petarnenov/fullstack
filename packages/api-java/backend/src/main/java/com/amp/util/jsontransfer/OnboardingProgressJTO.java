package com.amp.util.jsontransfer;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OnboardingProgressJTO extends AbstractJTO {
    private int totalAccounts;
    private int draft;
    private int kycPending;
    private int verified;
    private int rejected;
    private int averageCompletion;
}
