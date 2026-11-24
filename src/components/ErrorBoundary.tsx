import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('Steadfast ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#F6F7F8] dark:bg-[#0B1118] text-[#172026] dark:text-[#ECF1F4]">
          <div className="max-w-md w-full rounded-2xl bg-white dark:bg-[#121A24] border border-slate-200 dark:border-slate-800 p-8 space-y-4">
            <h1 className="font-serif text-2xl font-semibold">Something interrupted your session</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Your local journal entries and check-ins remain safely stored. Try reloading to continue.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#1B5E53] text-white text-sm font-medium hover:bg-[#144840] transition-colors"
            >
              Reload Steadfast
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
