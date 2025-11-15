"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error) => ReactNode);
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Check if it's an abort signal error
    if (error.message?.includes('signal is aborted') || 
        error.message?.includes('aborted without reason') ||
        error.name === 'AbortError') {
      console.warn('Abort signal error caught by ErrorBoundary - this is usually safe to ignore');
      // Don't show error UI for abort signals, just log it
      this.setState({ hasError: false });
    }
  }

  public render() {
    if (this.state.hasError && this.state.error) {
      const { fallback } = this.props;
      if (fallback) {
        // Support both function and ReactNode fallbacks
        if (typeof fallback === 'function') {
          return fallback(this.state.error);
        }
        return fallback;
      }
      // Default fallback UI
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-red-600 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-4">
              {this.state.error.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo);
    
    // Check if it's an abort signal error
    if (error.message?.includes('signal is aborted') || 
        error.message?.includes('aborted without reason') ||
        error.name === 'AbortError') {
      console.warn('Abort signal error caught by useErrorHandler - this is usually safe to ignore');
      return; // Don't throw for abort signals
    }
    
    // Re-throw other errors
    throw error;
  };
}
