import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "../api";

export default function MicroPage() {
  const queryClient = useQueryClient();
  const [count, setCount] = useState(0);
  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [message, setMessage] = useState("");

  const createOrderMutation = useMutation({
    mutationFn: ordersApi.create,
    onSuccess: (response) => {
      // Invalidate orders query to refresh the list in OrdersTab
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setMessage(
        `✅ Order created successfully! Order ID: ${response.data?.id || "N/A"}`
      );
      setCustomerId("");
      setProductId("");
      setQuantity("1");
      setTimeout(() => setMessage(""), 5000);
    },
    onError: (error: Error) => {
      setMessage(`❌ Error: ${error.message}`);
      setTimeout(() => setMessage(""), 5000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !productId) {
      setMessage("❌ Please fill in all fields");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    createOrderMutation.mutate({
      customerId,
      productId,
      quantity: parseInt(quantity),
    });
  };

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
      <div
        style={{
          marginTop: "2rem",
          padding: "1.5rem",
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: "8px",
          backdropFilter: "blur(10px)",
        }}
      >
        <h2 style={{ marginTop: 0 }}>📝 Create Order (Using Host API)</h2>
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            textAlign: "left",
          }}
        >
          <div>
            <label
              htmlFor="customerId"
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
              }}
            >
              Customer ID:
            </label>
            <input
              id="customerId"
              type="text"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="e.g., user_123"
              style={{
                width: "100%",
                padding: "0.6rem",
                borderRadius: "4px",
                border: "1px solid rgba(255, 255, 255, 0.5)",
                background: "rgba(0, 0, 0, 0.3)",
                color: "white",
                fontSize: "1rem",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="productId"
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
              }}
            >
              Product ID:
            </label>
            <input
              id="productId"
              type="text"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              placeholder="e.g., prod_456"
              style={{
                width: "100%",
                padding: "0.6rem",
                borderRadius: "4px",
                border: "1px solid rgba(255, 255, 255, 0.5)",
                background: "rgba(0, 0, 0, 0.3)",
                color: "white",
                fontSize: "1rem",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="quantity"
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
              }}
            >
              Quantity:
            </label>
            <input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              style={{
                width: "100%",
                padding: "0.6rem",
                borderRadius: "4px",
                border: "1px solid rgba(255, 255, 255, 0.5)",
                background: "rgba(0, 0, 0, 0.3)",
                color: "white",
                fontSize: "1rem",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={createOrderMutation.isPending}
            style={{
              padding: "0.8rem 1.5rem",
              borderRadius: "6px",
              border: "none",
              background: createOrderMutation.isPending
                ? "rgba(150, 150, 150, 0.5)"
                : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: createOrderMutation.isPending ? "not-allowed" : "pointer",
              transition: "all 0.3s",
              boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
            }}
          >
            {createOrderMutation.isPending ? "Creating..." : "Create Order"}
          </button>
        </form>

        {message && (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.8rem",
              borderRadius: "4px",
              background: message.startsWith("✅")
                ? "rgba(76, 175, 80, 0.3)"
                : "rgba(244, 67, 54, 0.3)",
              fontSize: "0.95rem",
            }}
          >
            {message}
          </div>
        )}
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
