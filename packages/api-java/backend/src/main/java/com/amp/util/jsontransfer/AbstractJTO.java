package com.amp.util.jsontransfer;

import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;

@Getter
@Setter
public abstract class AbstractJTO implements Serializable {
    protected String objectType;
    private String conversationUUID;
}
