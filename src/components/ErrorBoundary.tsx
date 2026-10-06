import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

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
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleReload = () => {
    try {
      window.location.reload();
    } catch {}
  };

  private handleResetState = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-stone-100 font-sans text-stone-900">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-stone-200 p-6 sm:p-8 text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-stone-950">應用程式載入遇到輕微問題</h2>
              <p className="text-xs text-stone-600 leading-relaxed">
                系統已自動保護您的資料，您可以直接重新整理頁面以恢復正常狀態。
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-left">
                <span className="text-[10px] font-mono text-stone-400 block mb-1">錯誤資訊：</span>
                <p className="text-xs font-mono text-amber-900 break-all line-clamp-3">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>重新整理</span>
              </button>
              <button
                type="button"
                onClick={this.handleResetState}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>修復並回首頁</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
