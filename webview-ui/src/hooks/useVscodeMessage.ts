import { useEffect, useCallback } from "react";
import { getVsCodeApi } from "../utils/vscodeApi";

type MessageHandler = (message: { type: string; payload?: unknown }) => void;

export function useVscodeMessage(handler: MessageHandler) {
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      const message = event.data;
      if (message && typeof message.type === "string") {
        handler(message);
      }
    };

    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [handler]);
}

export function useSendMessage() {
  return useCallback((type: string, payload?: unknown) => {
    getVsCodeApi().postMessage({ type, payload });
  }, []);
}
