package atomatron.worker.agent.message;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.io.Serializable;

@Getter
@RequiredArgsConstructor
public class Problem implements Serializable {
    private static final long serialVersionUID = 1L;
    private final String description;
    private final Throwable cause;

    public Problem(String description) {
        this(description, null);
    }
}
