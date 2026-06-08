"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

export class DashboardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`Dashboard Widget Crash [${this.props.name || "Unknown"}]:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-rose-950/10 border border-rose-950/40 rounded-xl p-5 text-center space-y-2.5 h-full flex flex-col items-center justify-center min-h-[140px] shadow-sm">
          <AlertTriangle className="h-6 w-6 text-rose-500 shrink-0" />
          <div>
            <h4 className="font-bold text-xs text-rose-300">Widget Load Failure</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              The <strong>{this.props.name || "requested"}</strong> widget failed to load. The rest of the control room is unaffected.
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="text-[9px] uppercase font-bold text-rose-400 hover:text-rose-300 border border-rose-950 bg-rose-950/20 hover:bg-rose-950/40 px-2.5 py-1 rounded transition-all"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
export default DashboardErrorBoundary;
