import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "../api";
import { useState } from "react";
import type { Order } from "../api";

function OrdersTab() {
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");

  const {
    data: ordersResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["orders"],
    queryFn: ordersApi.getAll,
  });

  const orders = ordersResponse?.data;

  const createMutation = useMutation({
    mutationFn: ordersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setCustomerId("");
      setProductId("");
      setQuantity("1");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      customerId,
      productId,
      quantity: parseInt(quantity),
    });
  };

  if (isLoading) return <div className="tab-content loading">Loading...</div>;
  if (error)
    return <div className="tab-content error">Error loading orders</div>;

  const getStatusBadge = (status?: string) => {
    const badges: Record<string, string> = {
      pending: "warning",
      processing: "info",
      completed: "success",
      cancelled: "danger",
    };
    return badges[status || "pending"] || "info";
  };

  const getStatusText = (status?: string) => {
    const texts: Record<string, string> = {
      pending: "Pending",
      processing: "Processing",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return texts[status || "pending"] || status;
  };

  return (
    <div className="tab-content">
      <h2>🛒 Orders</h2>

      <div className="data-grid">
        {orders?.map((order: Order) => (
          <div key={order.id} className="card">
            <h3>Order #{order.id}</h3>
            <p>
              <span className="label">Customer ID:</span> {order.customerId}
            </p>
            <p>
              <span className="label">Product ID:</span> {order.productId}
            </p>
            <p>
              <span className="label">Quantity:</span> {order.quantity}
            </p>
            <p>
              <span className="label">Total:</span> ${order.total}
            </p>
            <p>
              <span className="label">Status:</span>{" "}
              <span className={`badge ${getStatusBadge(order.status)}`}>
                {getStatusText(order.status)}
              </span>
            </p>
          </div>
        ))}
      </div>

      <div className="form-section">
        <h3>Create New Order</h3>
        <form className="form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Customer ID:</label>
            <input
              type="text"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="1"
              required
            />
          </div>
          <div className="form-group">
            <label>Product ID:</label>
            <input
              type="text"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              placeholder="1"
              required
            />
          </div>
          <div className="form-group">
            <label>Quantity:</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="btn"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Create Order"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default OrdersTab;
