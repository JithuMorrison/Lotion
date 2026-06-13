"use client";

import { Component, type ReactNode } from "react";

// Generic error boundary used around the block editor and each database view so
// a render crash (e.g. malformed blocksContent) doesn't take down the whole app.
export class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            Something went wrong rendering this content. The rest of the app is
            still usable.
          </div>
        )
      );
    }
    return this.props.children;
  }
}
