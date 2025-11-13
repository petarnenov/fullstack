import { useState } from "react";
import OrderForm from "../components/OrderForm";

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

      {/* Order Creation Form */}
      <OrderForm />

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
            Uses Module Federation to share code at runtime, including the API
            client
          </p>
        </div>

        <div className="feature-card">
          <h3>⚛️ React 19 Shared</h3>
          <p>
            React and React DOM are shared as singletons between host and remote
          </p>
        </div>

        <div className="feature-card">
          <h3>🎨 Own API Client</h3>
          <p>
            Uses its own API client generated from Swagger - fully independent
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
