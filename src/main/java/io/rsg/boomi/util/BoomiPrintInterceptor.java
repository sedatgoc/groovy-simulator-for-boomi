package io.rsg.boomi.util;

import java.io.*;

public class BoomiPrintInterceptor extends Writer {
    private final Writer target;
    private boolean atStartOfLine = true;
    private static final String PREFIX = "[PRINT] ";

    public BoomiPrintInterceptor(Writer target) {
        this.target = target;
    }

    @Override
    public void write(char[] cbuf, int off, int len) throws IOException {
        for (int i = 0; i < len; i++) {
            if (atStartOfLine) {
                target.write(PREFIX);
                atStartOfLine = false;
            }
            char c = cbuf[off + i];
            target.write(c);
            if (c == '\n') {
                atStartOfLine = true;
            }
        }
    }

    @Override
    public void flush() throws IOException { target.flush(); }

    @Override
    public void close() throws IOException { target.close(); }
}