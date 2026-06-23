'use client';
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Komponen custom untuk ditampilkan saat error. Jika tidak diisi, pakai UI default. */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary untuk menangkap runtime error di subtree React.
 * Gunakan di sekeliling komponen yang berpotensi crash (halaman data, drawer besar, dll).
 *
 * @example
 * <ErrorBoundary>
 *   <KomponenBerisikoTinggi />
 * </ErrorBoundary>
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Di production, ini bisa dikirim ke Sentry / logging service
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', info.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-10 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center mb-5 border border-red-100">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h3 className="text-[17px] font-bold text-gray-800 mb-2">Terjadi Kesalahan</h3>
          <p className="text-[13px] text-gray-500 mb-6 max-w-[320px] leading-relaxed">
            Komponen ini mengalami error tak terduga. Coba muat ulang halaman atau hubungi administrator.
          </p>
          <button
            onClick={this.reset}
            className="px-6 py-2.5 bg-emerald-600 text-white text-[13px] font-bold rounded-xl hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-100"
          >
            Coba Lagi
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-6 text-left w-full max-w-[500px] bg-red-50 rounded-2xl p-4 border border-red-100">
              <summary className="text-[11px] font-bold text-red-500 uppercase tracking-wider cursor-pointer">
                Detail Error (Dev Mode)
              </summary>
              <pre className="text-[10px] text-red-600 mt-2 whitespace-pre-wrap break-all overflow-auto max-h-40">
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
