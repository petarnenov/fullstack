package com.amp.web.common;

import com.opensymphony.xwork2.ActionInvocation;
import com.opensymphony.xwork2.Result;

import javax.servlet.http.HttpServletResponse;

public class JsonResult implements Result {

    @Override
    public void execute(ActionInvocation invocation) throws Exception {
        StreamResult byteProducer = (StreamResult) invocation.getAction();
        HttpServletResponse response = (HttpServletResponse) invocation.getInvocationContext()
                .get("com.opensymphony.xwork2.dispatcher.HttpServletResponse");
        if (response == null) {
            response = org.apache.struts2.ServletActionContext.getResponse();
        }
        response.setContentType("application/json");
        byte[] resultBytes = byteProducer.getResultBytes();
        response.setContentLength(resultBytes.length);
        if (resultBytes.length > 0) {
            response.getOutputStream().write(resultBytes);
            response.getOutputStream().flush();
        }
    }
}
