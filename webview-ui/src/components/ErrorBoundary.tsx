import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<object>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<object>) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[Momoc] Unhandled render error:", error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            padding: "24px",
            fontFamily: "var(--vscode-font-family, sans-serif)",
            color: "var(--vscode-foreground, #ccc)",
            backgroundColor: "var(--vscode-editor-background, #1e1e1e)",
          }}
        >
          <h2 style={{ margin: "0 0 12px", fontSize: "18px" }}>
            An unexpected error occurred
          </h2>
          <pre
            style={{
              maxWidth: "600px",
              padding: "12px",
              overflow: "auto",
              fontSize: "13px",
              borderRadius: "4px",
              backgroundColor: "var(--vscode-textBlockQuote-background, #252526)",
              color: "var(--vscode-errorForeground, #f48771)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {this.state.error?.message ?? "Unknown error"}
          </pre>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              marginTop: "16px",
              padding: "8px 16px",
              fontSize: "13px",
              cursor: "pointer",
              border: "none",
              borderRadius: "4px",
              color: "var(--vscode-button-foreground, #fff)",
              backgroundColor: "var(--vscode-button-background, #0e639c)",
            }}
          >
            Reload Editor
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
