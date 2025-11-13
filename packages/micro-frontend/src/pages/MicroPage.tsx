import { useState } from "react";

export default function MicroPage() {
  const [count, setCount] = useState(0);

  return (
    <div className="micro-page">
      <h1>🎯 Micro Frontend Page</h1>
      <p>
        This page is loaded from a separate micro frontend application using
        Module Federation
      </p>

      <div style={{ marginBottom: "2rem" }}>
        <button onClick={() => setCount(count + 1)}>Counter: {count}</button>
      </div>

      <div className="micro-features">
        <div className="feature-card">
          <h3>🚀 Independent Deployment</h3>
          <p>
            This micro frontend can be deployed independently from the main
            application
          </p>
        </div>

        <div className="feature-card">
          <h3>🔄 Module Federation</h3>
          <p>
            Uses Webpack Module Federation to share code at runtime, not build
            time
          </p>
        </div>

        <div className="feature-card">
          <h3>⚛️ React 19 Shared</h3>
          <p>
            React and React DOM are shared as singletons between host and remote
          </p>
        </div>

        <div className="feature-card">
          <h3>🎨 Isolated Styles</h3>
          <p>
            CSS is scoped to this component and won't conflict with the main app
          </p>
        </div>
      </div>

      <div style={{ marginTop: "2rem", fontSize: "0.9rem", opacity: 0.8 }}>
        <p>
          <strong>Tech Stack:</strong> React 19 + Vite + TypeScript + Module
          Federation
        </p>
        <p>
          <strong>Port:</strong> 5174 (standalone) | Consumed by main app on
          5173
        </p>
      </div>
    </div>
  );
}
