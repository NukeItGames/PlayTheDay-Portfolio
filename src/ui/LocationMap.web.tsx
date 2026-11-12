import React, { useEffect, useRef, useState } from "react";
import { validCoordinates } from "../game/location";
import { LocationMapProps, mapHtml } from "./locationMapHtml";

export default function LocationMap({
  center,
  selected,
  onSelect,
  onError,
}: LocationMapProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [html] = useState(() => mapHtml(center, selected));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      try {
        const message = JSON.parse(event.data);
        if (message.type === "ready") setReady(true);
        if (message.type === "select" && validCoordinates(message.point))
          onSelect(message.point);
        if (message.type === "error" && typeof message.message === "string")
          onError(message.message);
      } catch {
        /* Ignore non-map messages. */
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [onSelect, onError]);
  useEffect(() => {
    if (ready && selected)
      frame.current?.contentWindow?.postMessage(
        JSON.stringify({ type: "select", point: selected }),
        "*",
      );
  }, [ready, selected]);
  return (
    <iframe
      ref={frame}
      title="Location map"
      srcDoc={html}
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      style={{ width: "100%", height: "100%", border: 0 }}
    />
  );
}
