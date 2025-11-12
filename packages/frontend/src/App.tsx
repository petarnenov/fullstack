import { Routes, Route, Link, useLocation } from "react-router-dom";
import UsersTab from "./components/UsersTab";
import ProductsTab from "./components/ProductsTab";
import OrdersTab from "./components/OrdersTab";
import "./App.css";

function App() {
  const location = useLocation();
  const currentTab = location.pathname.slice(1) || "users";

  return (
    <div className="app">
      <header className="header">
        <h1>🚀 Fullstack Monorepo - Proof of Concept</h1>
        <p className="subtitle">React 19.2 + Express + TypeScript</p>
      </header>

      <nav className="tabs">
        <Link
          to="/users"
          className={`tab ${currentTab === "users" ? "active" : ""}`}
        >
          👥 Users
        </Link>
        <Link
          to="/products"
          className={`tab ${currentTab === "products" ? "active" : ""}`}
        >
          📦 Products
        </Link>
        <Link
          to="/orders"
          className={`tab ${currentTab === "orders" ? "active" : ""}`}
        >
          🛒 Orders
        </Link>
      </nav>

      <main className="content">
        <Routes>
          <Route path="/" element={<UsersTab />} />
          <Route path="/users" element={<UsersTab />} />
          <Route path="/products" element={<ProductsTab />} />
          <Route path="/orders" element={<OrdersTab />} />
        </Routes>
      </main>

      <footer className="footer">
        <p>
          Types are automatically generated from Swagger and shared between FE
          and BE
        </p>
      </footer>
    </div>
  );
}

export default App;
