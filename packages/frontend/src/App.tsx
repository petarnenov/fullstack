import { Routes, Route, Link, useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import UsersTab from "./pages/UsersTab";
import ProductsTab from "./pages/ProductsTab";
import OrdersTab from "./pages/OrdersTab";
import TypeExamplesPage from "./pages/TypeExamplesPage";
import styles from "./App.module.css";

// Lazy load micro frontend component
const MicroPage = lazy(() => import("microFrontend/MicroPage"));

function App() {
  const location = useLocation();
  const currentTab = location.pathname.slice(1) || "users";

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1>🚀 Fullstack Monorepo - Proof of Concept</h1>
        <p className={styles.subtitle}>React 19.2 + Express + TypeScript</p>
      </header>

      <nav className={styles.tabs}>
        <Link
          to="/users"
          className={`${styles.tab} ${
            currentTab === "users" ? styles.active : ""
          }`}
        >
          👥 Users
        </Link>
        <Link
          to="/products"
          className={`${styles.tab} ${
            currentTab === "products" ? styles.active : ""
          }`}
        >
          📦 Products
        </Link>
        <Link
          to="/orders"
          className={`${styles.tab} ${
            currentTab === "orders" ? styles.active : ""
          }`}
        >
          🛒 Orders
        </Link>
        <Link
          to="/examples"
          className={`${styles.tab} ${
            currentTab === "examples" ? styles.active : ""
          }`}
        >
          🎯 Type Examples
        </Link>
        <Link
          to="/micro"
          className={`${styles.tab} ${
            currentTab === "micro" ? styles.active : ""
          }`}
        >
          🎨 Micro Frontend
        </Link>
      </nav>

      <main className={styles.content}>
        <Routes>
          <Route path="/" element={<UsersTab />} />
          <Route path="/users" element={<UsersTab />} />
          <Route path="/products" element={<ProductsTab />} />
          <Route path="/orders" element={<OrdersTab />} />
          <Route path="/examples" element={<TypeExamplesPage />} />
          <Route
            path="/micro"
            element={
              <Suspense fallback={<div>Loading Micro Frontend...</div>}>
                <MicroPage />
              </Suspense>
            }
          />
        </Routes>
      </main>

      <footer className={styles.footer}>
        <p>
          Types are automatically generated from Swagger and shared between FE
          and BE
        </p>
      </footer>
    </div>
  );
}

export default App;
