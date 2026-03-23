import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AppProvider } from './store/AppContext'

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding: '40px', color: '#fca5a5', background: '#0f1115', height: '100vh', fontFamily: 'sans-serif'}}>
          <h2>런타임 에러가 발생했습니다 (Crash)</h2>
          <pre style={{whiteSpace: 'pre-wrap', background: 'rgba(255,0,0,0.1)', padding: '20px', borderRadius: '8px'}}>
            {this.state.error?.toString() || 'Unknown Error'}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppProvider>
        <App />
      </AppProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
