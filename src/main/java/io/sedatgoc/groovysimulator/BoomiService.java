package io.sedatgoc.groovysimulator;

import com.boomi.execution.ExecutionUtil;
import groovy.lang.Binding;
import groovy.lang.GroovyShell;
import groovy.transform.ThreadInterrupt;
import io.sedatgoc.groovysimulator.model.BoomiModel;
import io.sedatgoc.groovysimulator.model.BoomiResponse;
import io.sedatgoc.groovysimulator.util.BoomiPrintInterceptor;
import io.sedatgoc.groovysimulator.util.BoomiUtil;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.codehaus.groovy.control.CompilerConfiguration;
import org.codehaus.groovy.control.customizers.ASTTransformationCustomizer;
import org.codehaus.groovy.control.customizers.ImportCustomizer;
import org.codehaus.groovy.control.customizers.SecureASTCustomizer;

import javax.script.Bindings;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.Properties;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicLong;

@Path("/boomi")
public class BoomiService {

    private static final long SCRIPT_TIMEOUT_SECONDS = 10;

    private static final ExecutorService SCRIPT_EXECUTOR = Executors.newFixedThreadPool(4, new java.util.concurrent.ThreadFactory() {
        private final AtomicLong idx = new AtomicLong();
        @Override public Thread newThread(Runnable r) {
            Thread t = new Thread(r, "boomi-script-" + idx.incrementAndGet());
            t.setDaemon(true);
            return t;
        }
    });

    private static void runWithTimeout(Callable<Void> task) throws Exception {
        Future<Void> future = SCRIPT_EXECUTOR.submit(task);
        try {
            future.get(SCRIPT_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        } catch (TimeoutException te) {
            future.cancel(true);
            throw new RuntimeException("Script exceeded " + SCRIPT_TIMEOUT_SECONDS + "s execution timeout");
        } catch (ExecutionException ee) {
            Throwable cause = ee.getCause();
            if (cause instanceof Exception) throw (Exception) cause;
            throw new RuntimeException(cause);
        }
    }

    @POST
    @Path("/groovy")
    @Produces(MediaType.APPLICATION_JSON)
    @Consumes(MediaType.APPLICATION_JSON)
    public Response parseBoomiScript(BoomiModel boomiModel) {

        Properties requestProps = new Properties();
        ByteArrayOutputStream logStream = new ByteArrayOutputStream();
        ExecutionUtil.bindThread(requestProps, logStream);

        StringWriter scriptConsole = new StringWriter();
        BoomiPrintInterceptor interceptor = new BoomiPrintInterceptor(scriptConsole);
        PrintWriter scriptWriter = new PrintWriter(interceptor);

        try {
            for (String propKey : boomiModel.getDynamicProcessProperty().keySet()) {
                ExecutionUtil.setDynamicProcessProperty(propKey, boomiModel.getDynamicProcessProperty().get(propKey), false);
            }

            // Decode Script
            byte[] decodedBytes = Base64.getDecoder().decode(boomiModel.getScript());
            String decodedScript = new String(decodedBytes, StandardCharsets.UTF_8);

            // Prepare Groovy Environment
            ClassLoader classLoader = Thread.currentThread().getContextClassLoader();
            Binding binding = new Binding();

            // Redirect 'println' to our StringWriter
            binding.setProperty("out", scriptWriter);
            binding.setVariable("executionUtil",ExecutionUtil.class);
            binding.setVariable("logger",ExecutionUtil.getBaseLogger());
            // Auto-imports
            ImportCustomizer importCustomizer = new ImportCustomizer();
            importCustomizer.addImports(
                    "groovy.xml.XmlSlurper", "groovy.json.JsonSlurper", "com.boomi.execution.ExecutionUtil");

            CompilerConfiguration config = new CompilerConfiguration();
            config.addCompilationCustomizers(importCustomizer);

            SecureASTCustomizer secure = new SecureASTCustomizer();
            secure.setReceiversBlackList(Arrays.asList(
                    System.class.getName(),
                    Runtime.class.getName()
            ));
            secure.setIndirectImportCheckEnabled(true);
            secure.setClosuresAllowed(true); // Usually needed for Boomi logic
            config.addCompilationCustomizers(secure);
            config.addCompilationCustomizers(new ASTTransformationCustomizer(ThreadInterrupt.class));
            // Setup Boomi Context
            BoomiUtil boomiUtil = new BoomiUtil();
            Properties properties = new Properties();
            if (boomiModel.getProps() != null) {
                properties.putAll(boomiModel.getProps());
            }

            // Handle null/empty payload safely
            String payload = boomiModel.getPayload() != null ? boomiModel.getPayload() : "";
            boomiUtil.addContext(properties, new ByteArrayInputStream(payload.getBytes(StandardCharsets.UTF_8)));

            // Execute Script
            GroovyShell shell = new GroovyShell(classLoader, binding, config);
            shell.setVariable("dataContext", boomiUtil);
            shell.setVariable("payload", payload); // Optional: friendly variable

            runWithTimeout(() -> {
                ExecutionUtil.bindThread(requestProps, logStream);
                try {
                    shell.evaluate(decodedScript);
                    return null;
                } finally {
                    ExecutionUtil.unbindThread();
                }
            });
            scriptWriter.flush();

            String combinedLogs = ExecutionUtil.drainLogs() + "\n" + scriptConsole.toString();

            List<String> results = boomiUtil.getStreamOutList();
            List<Properties> outputPropsList = boomiUtil.getPropOutList();

            BoomiResponse responseDto = new BoomiResponse(
                    combinedLogs.trim(),
                    results,
                    outputPropsList,
                    requestProps
            );

            return Response.ok(responseDto).build();

        } catch (Exception e) {
            String errorLogs = ExecutionUtil.drainLogs() + "\n" + scriptConsole.toString() + "\nERROR: " + e.getMessage();
            return Response.ok(new BoomiResponse(errorLogs, Collections.singletonList("Execution Failed"), Collections.emptyList(), null)).build();
        } finally {
            scriptWriter.close();
            ExecutionUtil.unbindThread();
        }
    }


    @POST
    @Path("/javascript")
    @Produces(MediaType.APPLICATION_JSON)
    @Consumes(MediaType.APPLICATION_JSON)
    public Response parseJavaScript(BoomiModel boomiModel) {
        Properties requestProps = new Properties();
        ByteArrayOutputStream logStream = new ByteArrayOutputStream();
        ExecutionUtil.bindThread(requestProps, logStream);

        StringWriter scriptConsole = new StringWriter();
        BoomiPrintInterceptor interceptor = new BoomiPrintInterceptor(scriptConsole);
        PrintWriter scriptWriter = new PrintWriter(interceptor);

        try {
            // Setup Dynamic Process Properties
            boomiModel.getDynamicProcessProperty().forEach((k, v) ->
                    ExecutionUtil.setDynamicProcessProperty(k, v, false));

            // 1. Decode Script
            byte[] decodedBytes = Base64.getDecoder().decode(boomiModel.getScript());
            String decodedScript = new String(decodedBytes, StandardCharsets.UTF_8);

            // 2. Initialize the Script Engine (Nashorn or GraalJS)
            ScriptEngineManager manager = new ScriptEngineManager();
            ScriptEngine engine = manager.getEngineByName("javascript");
            Bindings bindings = engine.createBindings();

            // Setup Boomi Context
            BoomiUtil boomiUtil = new BoomiUtil();
            Properties properties = new Properties();
            if (boomiModel.getProps() != null) {
                properties.putAll(boomiModel.getProps());
            }
            String payload = boomiModel.getPayload() != null ? boomiModel.getPayload() : "";
            boomiUtil.addContext(properties, new ByteArrayInputStream(payload.getBytes(StandardCharsets.UTF_8)));

            // Inject Variables (Boomi standard names)
            bindings.put("dataContext", boomiUtil);
            bindings.put("executionUtil", ExecutionUtil.class);
            bindings.put("logger", ExecutionUtil.getBaseLogger());
            bindings.put("out", scriptWriter);

            engine.eval("function println(msg) { out.println(msg); }", bindings);

            //Execute Script
            runWithTimeout(() -> {
                ExecutionUtil.bindThread(requestProps, logStream);
                try {
                    engine.eval(decodedScript, bindings);
                    return null;
                } finally {
                    ExecutionUtil.unbindThread();
                }
            });
            scriptWriter.flush();

            String combinedLogs = ExecutionUtil.drainLogs() + "\n" + scriptConsole.toString();

            List<String> results = boomiUtil.getStreamOutList();
            List<Properties> outputPropsList = boomiUtil.getPropOutList();

            return Response.ok(new BoomiResponse(
                    combinedLogs.trim(),
                    results,
                    outputPropsList,
                    requestProps
            )).build();

        } catch (Exception e) {
            String errorLogs = ExecutionUtil.drainLogs() + "\n" + scriptConsole.toString() + "\nERROR: " + e.getMessage();
            return Response.ok(new BoomiResponse(errorLogs, Collections.singletonList("JS Execution Failed"), Collections.emptyList(), null)).build();
        } finally {
            scriptWriter.close();
            ExecutionUtil.unbindThread();
        }
    }
}
