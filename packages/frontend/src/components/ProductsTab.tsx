import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productsApi } from "../api";
import { useState } from "react";
import type { Product } from "../api";

function ProductsTab() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [inStock, setInStock] = useState(true);

  const {
    data: productsResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["products"],
    queryFn: productsApi.getAll,
  });

  const products = productsResponse?.data;

  const createMutation = useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setName("");
      setDescription("");
      setPrice("");
      setInStock(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name,
      description,
      price: parseFloat(price),
      inStock,
    });
  };

  if (isLoading) return <div className="tab-content loading">Loading...</div>;
  if (error)
    return <div className="tab-content error">Error loading products</div>;

  return (
    <div className="tab-content">
      <h2>📦 Products</h2>

      <div className="data-grid">
        {products?.map((product: Product) => (
          <div key={product.id} className="card">
            <h3>{product.name}</h3>
            {product.description && <p>{product.description}</p>}
            <p>
              <span className="label">Price:</span> ${product.price}
            </p>
            <p>
              <span className="label">Stock:</span>{" "}
              <span
                className={`badge ${product.inStock ? "success" : "danger"}`}
              >
                {product.inStock ? "In Stock" : "Out of Stock"}
              </span>
            </p>
          </div>
        ))}
      </div>

      <div className="form-section">
        <h3>Add New Product</h3>
        <form className="form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Description:</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Price:</label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => setInStock(e.target.checked)}
              />{" "}
              In Stock
            </label>
          </div>
          <button
            type="submit"
            className="btn"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Adding..." : "Add Product"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ProductsTab;
