import { useState } from "react";
import OrderForm from "../components/OrderForm";
import styles from "./MicroPage.module.css";

export default function MicroPage() {
  const [count, setCount] = useState(0);

  return (
    <div className={styles.microPage}>
      <h1>🎯 Micro Frontend Page</h1>
      <p>
        This page is loaded from a separate micro frontend application using
        Module Federation
      </p>

      <div className={styles.counterSection}>
        <button
          onClick={() => setCount(count + 1)}
          className={styles.counterButton}
        >
          Counter: {count}
        </button>
      </div>

      {/* Order Creation Form */}
      <OrderForm />

      <div className={styles.microFeatures}>
        <div className={styles.featureCard}>
          <h3>🚀 Independent Deployment</h3>
          <p>
            This micro frontend can be deployed independently from the main
            application
          </p>
        </div>

        <div className={styles.featureCard}>
          <h3>🔄 Module Federation</h3>
          <p>
            Uses Module Federation to share code at runtime, including the API
            client
          </p>
        </div>

        <div className={styles.featureCard}>
          <h3>⚛️ React 19 Shared</h3>
          <p>
            React and React DOM are shared as singletons between host and remote
          </p>
        </div>

        <div className={styles.featureCard}>
          <h3>🎨 Own API Client</h3>
          <p>
            Uses its own API client generated from Swagger - fully independent
          </p>
        </div>
      </div>

      <div className={styles.techStack}>
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
