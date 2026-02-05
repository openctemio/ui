"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ScopeErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ScopeErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary specifically for scope-related components.
 * Catches rendering errors and displays a fallback UI.
 *
 * Usage:
 * <ScopeErrorBoundary>
 *   <ScopeBadge match={match} />
 * </ScopeErrorBoundary>
 */
export class ScopeErrorBoundary extends Component<
  ScopeErrorBoundaryProps,
  ScopeErrorBoundaryState
> {
  constructor(props: ScopeErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ScopeErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging
    console.error("[ScopeErrorBoundary] Error caught:", error);
    console.error("[ScopeErrorBoundary] Component stack:", errorInfo.componentStack);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Render custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 p-3">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">
                Failed to load scope data
              </p>
              <p className="text-xs text-muted-foreground">
                {this.state.error?.message || "An unexpected error occurred"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleReset}
              className="h-7"
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Retry
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * Inline error boundary with minimal UI
 * Use for individual scope badges that shouldn't disrupt layout
 */
export class ScopeBadgeErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("[ScopeBadgeErrorBoundary] Error:", error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <AlertTriangle className="h-3 w-3" />
          Error
        </span>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap any scope component with error boundary
 */
export function withScopeErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function ScopeErrorBoundaryWrapper(props: P) {
    return (
      <ScopeErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ScopeErrorBoundary>
    );
  };
}
