import { useEffect, useCallback } from "react";
import { getVsCodeApi } from "../utils/vscodeApi";
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from "../shared/messages";
import { isExtToWebMessage } from "../shared/messages";

type MessageHandler = (message: ExtensionToWebviewMessage) => void;

export function useVscodeMessage(handler: MessageHandler) {
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      const message = event.data;
      if (isExtToWebMessage(message)) {
        handler(message);
      } else if (message && typeof message === "object" && "type" in message) {
        console.warn("[Momoc] Unknown or invalid message from extension:", message);
      }
    };

    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [handler]);
}

export function useSendMessage() {
  return useCallback((message: WebviewToExtensionMessage) => {
    getVsCodeApi().postMessage(message);
  }, []);
}
