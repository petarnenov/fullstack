package com.amp.bff.reporting.api;

import com.amp.bff.reporting.model.AccountReport;
import com.amp.bff.reporting.service.ReportAggregator;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/reporting")
public class ReportsController {

    private final ReportAggregator aggregator;

    public ReportsController(ReportAggregator aggregator) {
        this.aggregator = aggregator;
    }

    @GetMapping("/summary")
    public Mono<List<AccountReport>> summary(
        @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader
    ) {
        return aggregator.summarise(authHeader);
    }
}
