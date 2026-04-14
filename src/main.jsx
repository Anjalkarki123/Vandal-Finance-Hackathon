import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight:"100vh", background:"#0D0D1A", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"system-ui,sans-serif", color:"#F0F0FF", textAlign:"center" }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🛡️</div>
          <h2 style={{ fontWeight:800, fontSize:20, marginBottom:8, margin:"0 0 8px" }}>Something went wrong</h2>
          <p style={{ color:"#8B8BA8", fontSize:14, marginBottom:24, margin:"0 0 24px" }}>Please tap the button below to reload.</p>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{ padding:"14px 32px", background:"linear-gradient(135deg,#4F46E5,#818CF8)", border:"none", borderRadius:14, color:"#fff", fontSize:15, fontWeight:800, cursor:"pointer" }}>
            Clear & Reload
          </button>
          <details style={{ marginTop:24, color:"#3D3D5C", fontSize:10, maxWidth:320, wordBreak:"break-all", textAlign:"left" }}>
            <summary style={{ cursor:"pointer", color:"#8B8BA8" }}>Error details</summary>
            <pre style={{ marginTop:6, whiteSpace:"pre-wrap" }}>{String(this.state.error)}</pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)

// Unregister any existing service workers to prevent caching issues
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(r => r.unregister());
  });
}
