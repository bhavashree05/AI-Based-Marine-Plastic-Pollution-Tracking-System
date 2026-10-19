import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('MarineGuard Uncaught React Error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="marine-card p-8 max-w-lg w-full text-center space-y-4 border-rose-500/30">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white font-['Outfit']">
              Application View Encountered an Error
            </h3>
            <p className="text-xs text-slate-300">
              {this.state.error?.message ||
                'An unexpected error occurred while rendering this module. All saved observations and database records remain safe.'}
            </p>
            <div className="pt-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 inline-flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-teal-500/20"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Application Module</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
