package com.amp.service.trading;

import atomatron.worker.agent.message.Message;
import com.amp.service.Response;
import com.amp.util.jsontransfer.PositionJTO;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class ListPositionsMsg extends Message {
    private static final long serialVersionUID = 1L;

    /** Nullable — when null the manager returns positions for all accounts. */
    private final String accountId;
    private Response response;
    private List<PositionJTO> positions;

    public ListPositionsMsg(String accountId) {
        this.accountId = accountId;
    }
}
