import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Error boundary — shows error message instead of blank white screen
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight:"100vh", background:"#0D0D1A", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"system-ui,sans-serif", color:"#F0F0FF" }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🛡️</div>
          <h2 style={{ fontWeight:800, fontSize:20, marginBottom:8 }}>Budget Guardian</h2>
          <p style={{ color:"#8B8BA8", fontSize:14, marginBottom:20 }}>Something went wrong. Please reload the page.</p>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{ padding:"12px 28px", background:"linear-gradient(135deg,#4F46E5,#818CF8)", border:"none", borderRadius:12, color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer" }}>
            Clear Data &amp; Reload
          </button>
          <details style={{ marginTop:20, color:"#3D3D5C", fontSize:11, maxWidth:360, wordBreak:"break-all" }}>
            <summary style={{ cursor:"pointer" }}>Error details</summary>
            <pre style={{ marginTop:8 }}>{String(this.state.error)}</pre>
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

// Register service worker for PWA / iOS install support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/Vandal-Finance-Hackathon/sw.js')
      .catch(() => {})
  })
}
