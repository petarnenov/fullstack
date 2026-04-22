package com.amp.util.jsontransfer;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SymbolJTO extends AbstractJTO {
    private String ticker;
    private String name;
    private String sector;
    private double lastPrice;
    private double change24h;
}
