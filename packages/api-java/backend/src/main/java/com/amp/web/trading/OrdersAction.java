package com.amp.web.trading;

import com.amp.service.trading.PlaceOrderMsg;
import com.amp.service.trading.TradingManager;
import com.amp.util.jsontransfer.PlaceOrderRequestJTO;
import com.amp.web.common.action.AuthenticatedJsonAction;
import lombok.Getter;
import lombok.Setter;
import org.apache.struts2.ServletActionContext;

/**
 * `GET /api/trading/orders?accountId=...` returns the order log,
 * `POST /api/trading/orders` places a new order. Same URL — we branch on
 * HTTP method rather than registering two actions at the same Struts path.
 */
@Getter
@Setter
public class OrdersAction extends AuthenticatedJsonAction {
    /** Struts parameter binding requires a matching setter; the field is only
     *  used for the GET list filter. POST bodies are read as raw JSON. */
    private String accountId;

    @Override
    protected String executeAuthenticated() {
        String method = ServletActionContext.getRequest().getMethod();
        if ("POST".equalsIgnoreCase(method)) return handlePlace();
        return handleList();
    }

    private String handleList() {
        String q = (accountId == null || accountId.isBlank()) ? null : accountId;
        return json(TradingManager.getSole().listOrders(q));
    }

    private String handlePlace() {
        PlaceOrderRequestJTO body = parseJsonBody(PlaceOrderRequestJTO.class);
        if (body == null
                || isBlank(body.getAccountId())
                || isBlank(body.getTicker())
                || isBlank(body.getSide())
                || body.getQuantity() <= 0) {
            return error(400, "Invalid order");
        }
        PlaceOrderMsg result = TradingManager.getSole()
                .placeOrder(body.getAccountId(), body.getTicker(), body.getSide(), body.getQuantity());
        if (result.isSymbolNotFound()) {
            return error(404, "Unknown ticker " + body.getTicker());
        }
        status("rejected".equals(result.getOrder().getStatus()) ? 409 : 201);
        return json(result.getOrder());
    }

    private static boolean isBlank(String s) { return s == null || s.isBlank(); }
}
