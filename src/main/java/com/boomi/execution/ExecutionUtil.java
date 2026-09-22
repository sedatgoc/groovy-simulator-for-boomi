package com.boomi.execution;

import java.util.Properties;
import java.util.logging.*;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

public class ExecutionUtil {

    private static final ThreadLocal<Properties> propsTL = ThreadLocal.withInitial(Properties::new);
    private static final ThreadLocal<ByteArrayOutputStream> logStreamTL = new ThreadLocal<>();
    private static final ThreadLocal<Logger> loggerTL = new ThreadLocal<>();

    // Bind request-scoped state to the current thread. Call once from the request
    // thread and again from any worker thread that will evaluate user scripts, so
    // both threads see the same Properties instance and log-capture stream.
    public static void bindThread(Properties props, ByteArrayOutputStream logStream) {
        propsTL.set(props);
        logStreamTL.set(logStream);
        loggerTL.set(buildLogger(logStream));
    }

    public static void unbindThread() {
        propsTL.remove();
        logStreamTL.remove();
        loggerTL.remove();
    }

    private static Logger buildLogger(ByteArrayOutputStream logStream) {
        Logger logger = Logger.getAnonymousLogger();
        logger.setUseParentHandlers(false);
        logger.setLevel(Level.ALL);
        if (logStream != null) {
            StreamHandler sh = new StreamHandler(logStream, new Formatter() {
                @Override
                public String format(LogRecord record) {
                    String level = record.getLevel().toString();
                    if (level.equals("SEVERE")) level = "ERROR";
                    return "[" + level + "] " + record.getMessage() + "\n";
                }
            }) {
                @Override
                public synchronized void publish(LogRecord record) {
                    super.publish(record);
                    flush();
                }
            };
            sh.setLevel(Level.ALL);
            logger.addHandler(sh);
        }
        return logger;
    }

    public static Logger getBaseLogger() {
        Logger logger = loggerTL.get();
        return logger != null ? logger : buildLogger(null);
    }

    public static String drainLogs() {
        ByteArrayOutputStream baos = logStreamTL.get();
        return baos != null ? baos.toString(StandardCharsets.UTF_8) : "";
    }

    public static Properties getProps() {
        return propsTL.get();
    }

    public static void setDynamicProcessProperty(String key, String value, Boolean persist) {
        getBaseLogger().info("Setting Property: " + key + " = " + value);
        propsTL.get().put(key, value);
    }

    public static String getDynamicProcessProperty(String key) {
        return propsTL.get().getProperty(key);
    }
}
