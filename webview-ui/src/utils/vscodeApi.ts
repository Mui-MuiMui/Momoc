interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

let api: VsCodeApi | undefined;

export function getVsCodeApi(): VsCodeApi {
  if (!api) {
    try {
      api = acquireVsCodeApi();
    } catch {
      api = {
        postMessage: (msg) => console.log("[mock vscode] postMessage:", msg),
        getState: () => ({}),
        setState: (state) =>
          console.log("[mock vscode] setState:", state),
      };
    }
  }
  return api;
}
