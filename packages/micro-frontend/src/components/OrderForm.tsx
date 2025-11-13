import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "../api";
import "./OrderForm.css";

export default function OrderForm() {
  const queryClient = useQueryClient();
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
    <div className="order-form-container">
      <div className="form-header">
        <h2>📝 Create New Order</h2>
        <p className="form-subtitle">
          Fill in the details below to create an order
        </p>
      </div>

      <form onSubmit={handleSubmit} className="order-form">
        <div className="form-group">
          <label htmlFor="customerId" className="form-label">
            <span className="label-icon">👤</span>
            Customer ID
          </label>
          <input
            id="customerId"
            type="text"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder="e.g., customer_123"
            className="form-input"
            disabled={createOrderMutation.isPending}
          />
        </div>

        <div className="form-group">
          <label htmlFor="productId" className="form-label">
            <span className="label-icon">📦</span>
            Product ID
          </label>
          <input
            id="productId"
            type="text"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            placeholder="e.g., product_456"
            className="form-input"
            disabled={createOrderMutation.isPending}
          />
        </div>

        <div className="form-group">
          <label htmlFor="quantity" className="form-label">
            <span className="label-icon">🔢</span>
            Quantity
          </label>
          <input
            id="quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="form-input"
            disabled={createOrderMutation.isPending}
          />
        </div>

        <button
          type="submit"
          disabled={createOrderMutation.isPending}
          className={`submit-button ${
            createOrderMutation.isPending ? "loading" : ""
          }`}
        >
          {createOrderMutation.isPending ? (
            <>
              <span className="spinner"></span>
              Creating...
            </>
          ) : (
            <>
              <span className="button-icon">✨</span>
              Create Order
            </>
          )}
        </button>
      </form>

      {message && (
        <div
          className={`message ${
            message.startsWith("✅") ? "success" : "error"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
