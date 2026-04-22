package com.amp.web.common.action;

import com.opensymphony.xwork2.ActionSupport;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BasicAction extends ActionSupport {
    private String loggedUser;
    private String firmContext;
}
