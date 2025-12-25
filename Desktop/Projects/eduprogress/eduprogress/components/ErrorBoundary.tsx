import React, { ReactNode } from 'react';
import Button from './ui/Button';
import { logAction } from '../services/audit';
import { db } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';

interface Props {
  children: ReactNode;
  scope?: string; // 'global' or 'dashboard', 'aiusage', etc.
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console
    console.error('ErrorBoundary caught:', error, errorInfo);

    // Update state
    this.setState({
      errorInfo,
    });

    // Log to Firestore for debugging
    this.logErrorToFirestore(error, errorInfo);
  }

  private logErrorToFirestore = async (error: Error, errorInfo: React.ErrorInfo) => {
    try {
      await addDoc(collection(db, 'errorLogs'), {
        scope: this.props.scope || 'unknown',
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      });
    } catch (logError) {
      console.error('Failed to log error to Firestore:', logError);
    }
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        this.props.fallback || (
          <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <div className="max-w-md w-full space-y-6 text-center">
              <div>
                <h1 className="text-4xl font-bold text-destructive mb-2">Oops!</h1>
                <p className="text-lg text-muted-foreground">
                  Something went wrong. Our team has been notified.
                </p>
              </div>

              <div className="bg-muted p-4 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Error Details:</strong>
                </p>
                <details className="cursor-pointer">
                  <summary className="text-xs text-destructive hover:text-red-600">
                    Click to view error
                  </summary>
                  <pre className="mt-2 text-xs bg-background p-2 rounded overflow-auto max-h-48 text-left">
                    {this.state.error?.toString()}
                    {'\n\n'}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              </div>

              <div className="flex gap-3 justify-center">
                <Button onClick={this.handleReset} className="flex-1">
                  Go to Dashboard
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                  className="flex-1"
                >
                  Reload Page
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Scope: {this.props.scope || 'global'}  Time: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
