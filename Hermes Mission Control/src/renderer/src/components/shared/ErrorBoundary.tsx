import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw, ChevronDown } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  /** If true, shows a minimal inline error instead of a full-page takeover */
  inline?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
  showDetails: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, showDetails: false }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught:', error, info.componentStack)
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null, showDetails: false })
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) return this.props.fallback

    if (this.props.inline) {
      return (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          <AlertTriangle size={14} className="shrink-0" />
          <span className="flex-1 truncate">{this.state.error?.message ?? 'Something went wrong'}</span>
          <button
            onClick={this.reset}
            className="shrink-0 p-1 rounded hover:bg-red-500/20 transition-colors"
            title="Retry"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      )
    }

    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
          <AlertTriangle size={28} className="text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Something went wrong</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          An unexpected error occurred in this panel. Your data is safe — this component crashed and needs to restart.
        </p>

        <div className="flex gap-3 mb-6">
          <button
            onClick={this.reset}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-all"
          >
            <RefreshCw size={14} />
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-secondary/50 transition-all"
          >
            Reload app
          </button>
        </div>

        {/* Stack trace (collapsible) */}
        {this.state.error && (
          <div className="w-full max-w-lg text-left">
            <button
              onClick={() => this.setState(s => ({ showDetails: !s.showDetails }))}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              <ChevronDown
                size={12}
                className={`transition-transform ${this.state.showDetails ? 'rotate-180' : ''}`}
              />
              Error details
            </button>
            {this.state.showDetails && (
              <pre className="text-[11px] font-mono text-red-400/80 bg-red-500/5 border border-red-500/10 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                {this.state.error.message}
                {this.state.error.stack && '\n\n' + this.state.error.stack}
              </pre>
            )}
          </div>
        )}
      </div>
    )
  }
}
