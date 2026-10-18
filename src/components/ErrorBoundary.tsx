import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] w-full flex flex-col items-center justify-center p-6 text-center bg-zinc-950/20 border border-white/5 rounded-3xl space-y-4">
          <div className="h-12 w-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-black text-white uppercase tracking-wider">Breakthrough Interrupted</h3>
            <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
              Your cultivation flow has encountered a minor bottleneck. The spiritual energy (state) has fluctuated.
            </p>
            {this.state.error && (
              <pre className="text-[10px] bg-black/40 text-red-400/90 p-2.5 rounded-xl max-w-md overflow-x-auto border border-white/5 font-mono text-left select-text mx-auto mt-2">
                {this.state.error.message}
              </pre>
            )}
          </div>
          <div className="flex gap-3 pt-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleReset}
              className="rounded-xl border-white/10 hover:bg-white/5 text-xs font-bold gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset State
            </Button>
            <Button
              size="sm"
              onClick={() => { window.location.href = "/"; }}
              className="rounded-xl bg-primary hover:bg-primary/95 text-white text-xs font-black gap-1.5"
            >
              <Home className="h-3.5 w-3.5" />
              Go Home
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
