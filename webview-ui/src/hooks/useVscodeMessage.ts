import { useEffect, useCallback } from "react";
import { getVsCodeApi } from "../utils/vscodeApi";
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from "../shared/messages";

type MessageHandler = (message: ExtensionToWebviewMessage) => void;

export function useVscodeMessage(handler: MessageHandler) {
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      const message = event.data;
      if (message && typeof message.type === "string") {
        handler(message as ExtensionToWebviewMessage);
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
