package com.amp.util;

import com.google.gson.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class GsonUtil {
    // Nulls are dropped from the wire so the JSON matches the Node/Express
    // contract — the frontend doesn't expect {objectType, conversationUUID}
    // fields that leak from AbstractJTO when they're unset.
    private static final Gson gson = new GsonBuilder()
            .registerTypeAdapter(LocalDateTime.class, (JsonSerializer<LocalDateTime>)
                    (src, typeOfSrc, context) -> new JsonPrimitive(src.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)))
            .registerTypeAdapter(LocalDateTime.class, (JsonDeserializer<LocalDateTime>)
                    (json, typeOfT, context) -> LocalDateTime.parse(json.getAsString(), DateTimeFormatter.ISO_LOCAL_DATE_TIME))
            .create();

    public static String objectToString(Object obj) {
        return gson.toJson(obj);
    }

    public static <T> T stringToObject(String json, Class<T> clazz) {
        return gson.fromJson(json, clazz);
    }

    public static <T> T fromJson(JsonElement element, Class<T> clazz) {
        return gson.fromJson(element, clazz);
    }
}
