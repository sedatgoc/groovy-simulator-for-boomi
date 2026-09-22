package io.rsg.boomi.model;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
public class BoomiModel {
    private String script;
    private Map<String, String> props;
    private Map<String, String> dynamicProcessProperty;
    private String payload;
}
