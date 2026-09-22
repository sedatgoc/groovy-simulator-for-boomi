package io.rsg.boomi.model;

import java.util.List;
import java.util.Properties;

public class BoomiResponse {
    public String logs;
    public List<String> results;
    public List<Properties> outputPropsList;
    public Properties dynamicProcessProperty;

    public BoomiResponse(String logs, List<String> results, List<Properties> outputPropsList, Properties dynamicProcessProperty) {
        this.logs = logs;
        this.results = results;
        this.outputPropsList = outputPropsList;
        this.dynamicProcessProperty = dynamicProcessProperty;
    }
}
