import { useState, useEffect } from "react";
import { getVsCodeApi } from "../utils/vscodeApi";

function isRemoteUrl(src: string): boolean {
  return /^(https?:|data:|blob:)/i.test(src);
}

const resolvedCache = new Map<string, string>();
const pendingCallbacks = new Map<string, Set<(uri: string) => void>>();

let listenerAttached = false;

function attachListener() {
  if (listenerAttached) return;
  listenerAttached = true;
  window.addEventListener("message", (event) => {
    const msg = event.data;
    if (msg?.type === "resolve:imageUri:result") {
      const { src, uri } = msg.payload as { src: string; uri: string };
      resolvedCache.set(src, uri);
      const callbacks = pendingCallbacks.get(src);
      if (callbacks) {
        for (const cb of callbacks) cb(uri);
        pendingCallbacks.delete(src);
      }
    }
  });
}

export function useResolvedImageSrc(src: string): string {
  const [resolvedSrc, setResolvedSrc] = useState(() => {
    if (!src || isRemoteUrl(src)) return src;
    return resolvedCache.get(src) ?? "";
  });

  useEffect(() => {
    if (!src || isRemoteUrl(src)) {
      setResolvedSrc(src);
      return;
    }

    const cached = resolvedCache.get(src);
    if (cached) {
      setResolvedSrc(cached);
      return;
    }

    attachListener();

    if (!pendingCallbacks.has(src)) {
      pendingCallbacks.set(src, new Set());
    }
    pendingCallbacks.get(src)!.add(setResolvedSrc);

    getVsCodeApi().postMessage({
      type: "resolve:imageUri",
      payload: { src },
    });

    return () => {
      pendingCallbacks.get(src)?.delete(setResolvedSrc);
    };
  }, [src]);

  return resolvedSrc;
}
