package io.sedatgoc.groovysimulator.util;

import lombok.Getter;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;

public class BoomiUtil {
    List<Properties>  propList = new ArrayList<>();
    List<InputStream> streamList = new ArrayList<>();
    @Getter
    List<String> streamOutList = new ArrayList<>();
    @Getter
    List<Properties> propOutList = new ArrayList<>();

    public void addContext(Properties prop, InputStream is ){
        this.propList.add(prop);
        this.streamList.add(is);
    }

    public int getDataCount(){
        return streamList.size();
    }
    public Properties getProperties(int index){
       return propList.get(index);
    }
    public InputStream getStream(int index) throws IOException {
        streamList.get(index).reset();
        return streamList.get(index);
    }

    public void storeStream(InputStream is,Properties prop) throws IOException {
        this.streamOutList.add(new String(is.readAllBytes()));
        this.propOutList.add(prop);
    }
}
