package com.amp.util.jsontransfer;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PlaceOrderRequestJTO {
    private String accountId;
    private String ticker;
    private String side;
    private double quantity;
}
