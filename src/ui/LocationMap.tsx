import React, { useEffect, useRef, useState } from "react";
import { WebView } from "react-native-webview";
import { Linking } from "react-native";
import { validCoordinates } from "../game/location";
import { LocationMapProps, mapHtml } from "./locationMapHtml";

export default function LocationMap({
  center,
  selected,
  onSelect,
  onError,
}: LocationMapProps) {
  const webview = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [source] = useState(() => ({
    html: mapHtml(center, selected),
    baseUrl: "https://github.com/NukeItGames/PlayTheDay-Portfolio/",
  }));
  useEffect(() => {
    if (ready && selected)
      webview.current?.injectJavaScript(
        `window.selectLocation(${JSON.stringify({ latitude: selected.latitude, longitude: selected.longitude })});true;`,
      );
  }, [ready, selected]);
  return (
    <WebView
      ref={webview}
      source={source}
      style={{ flex: 1 }}
      originWhitelist={["*"]}
      applicationNameForUserAgent="PlayTheDay/1.0"
      geolocationEnabled={false}
      setSupportMultipleWindows={false}
      onShouldStartLoadWithRequest={(request) => {
        if (request.url === "about:blank" || request.url === source.baseUrl)
          return true;
        if (request.url === "https://www.openstreetmap.org/copyright")
          void Linking.openURL(request.url).catch(() => {});
        return false;
      }}
      onError={() =>
        onError("Map could not load. Retry or select a search result.")
      }
      onMessage={(event) => {
        try {
          const message = JSON.parse(event.nativeEvent.data);
          if (message.type === "ready") setReady(true);
          if (message.type === "select" && validCoordinates(message.point))
            onSelect(message.point);
          if (message.type === "error" && typeof message.message === "string")
            onError(message.message);
        } catch {
          /* Ignore messages that are not map events. */
        }
      }}
    />
  );
}
