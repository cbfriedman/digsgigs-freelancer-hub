import React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error?: unknown;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // Keep this log — it helps debug blank-screen crashes.
    // eslint-disable-next-line no-console
    console.error("App crashed:", error, info);
  }

  private getErrorMessage() {
    if (!this.state.error) return "Unknown error";
    if (this.state.error instanceof Error) return this.state.error.message;
    try {
      return JSON.stringify(this.state.error);
    } catch {
      return String(this.state.error);
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-6 shadow-sm">
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The app hit a runtime error (this is why you saw a blank page). Reloading usually fixes it if it was a transient build issue.
            </p>

            <div className="mt-4 rounded-lg bg-muted p-3">
              <p className="text-xs font-mono text-foreground break-words">{this.getErrorMessage()}</p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button onClick={() => window.location.reload()}>Reload</Button>
              <Button
                variant="outline"
                onClick={() => {
                  this.setState({ hasError: false, error: undefined });
                }}
              >
                Try again
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }
}
