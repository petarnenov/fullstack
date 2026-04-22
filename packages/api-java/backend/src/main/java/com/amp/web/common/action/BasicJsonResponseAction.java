package com.amp.web.common.action;

import com.amp.util.GsonUtil;
import com.amp.web.common.StreamResult;
import lombok.Getter;
import lombok.Setter;
import org.apache.struts2.ServletActionContext;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.BufferedReader;
import java.nio.charset.StandardCharsets;

@Getter
@Setter
public class BasicJsonResponseAction extends BasicAction implements StreamResult {
    protected String response;

    @Override
    public byte[] getResultBytes() {
        if (response == null) {
            return new byte[0];
        }
        return response.getBytes(StandardCharsets.UTF_8);
    }

    /**
     * Writes an object as JSON body and returns the Struts result name.
     * HTTP status defaults to whatever the container chose (200) unless
     * {@link #status(int)} was called beforehand.
     */
    protected String json(Object data) {
        this.response = GsonUtil.objectToString(data);
        return "success";
    }

    /**
     * Writes an empty body with the given HTTP status. Used for 204 No Content.
     */
    protected String empty(int httpStatus) {
        status(httpStatus);
        this.response = null;
        return "success";
    }

    /**
     * Sets the HTTP response status. Must be called before the result writes.
     */
    protected void status(int httpStatus) {
        HttpServletResponse res = ServletActionContext.getResponse();
        if (res != null) res.setStatus(httpStatus);
    }

    /**
     * Writes an error JSON body matching the Node contract: { "error": "..." }.
     */
    protected String error(int httpStatus, String message) {
        status(httpStatus);
        this.response = GsonUtil.objectToString(new com.amp.util.jsontransfer.ErrorJTO(message));
        return "success";
    }

    /**
     * Reads the raw request body and deserializes it as JSON. Struts' own
     * param-binding only covers form fields; we prefer JSON bodies to mirror
     * the Node/Express contract, so we read the stream directly.
     */
    protected <T> T parseJsonBody(Class<T> clazz) {
        try {
            HttpServletRequest req = ServletActionContext.getRequest();
            StringBuilder sb = new StringBuilder();
            try (BufferedReader r = req.getReader()) {
                String line;
                while ((line = r.readLine()) != null) sb.append(line);
            }
            if (sb.length() == 0) return null;
            return GsonUtil.stringToObject(sb.toString(), clazz);
        } catch (Exception e) {
            return null;
        }
    }

    protected String extractBearerToken() {
        HttpServletRequest req = ServletActionContext.getRequest();
        String header = req.getHeader("Authorization");
        if (header == null) return null;
        if (!header.regionMatches(true, 0, "Bearer ", 0, 7)) return null;
        String token = header.substring(7).trim();
        return token.isEmpty() ? null : token;
    }
}
