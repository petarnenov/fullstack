import { useState } from "react";
import {
  User,
  Status,
  Theme,
  ApiResponse,
  usePrevious,
  generateId,
  groupBy,
} from "../utils/typeExamples";
import BasicCard from "../components/examples/BasicCard";
import StatusBadge from "../components/examples/StatusBadge";
import ApiResponseDisplay from "../components/examples/ApiResponseDisplay";
import UserCard from "../components/examples/UserCard";
import LocalStorageDemo from "../components/examples/LocalStorageDemo";
import DebounceDemo from "../components/examples/DebounceDemo";
import ToggleDemo from "../components/examples/ToggleDemo";
import HelperFunctionsDemo from "../components/examples/HelperFunctionsDemo";
import TypeSafetyNotes from "../components/examples/TypeSafetyNotes";
import styles from "../App.module.css";

export default function TypeExamplesPage() {
  // ========== State Examples ==========
  const [count, setCount] = useState<number>(0);
  const [status, setStatus] = useState<Status>("idle");
  const [theme, setTheme] = useState<Theme>("light");
  const [isToggled, setIsToggled] = useState<boolean>(false);

  // ========== Custom Hooks Examples ==========
  const previousCount = usePrevious(count);

  // ========== Helper Functions Examples ==========
  const exampleUser: User = {
    id: generateId("user"),
    name: "John Doe",
    email: "john@example.com",
    role: "admin",
    metadata: {
      createdAt: new Date(),
      lastLogin: new Date(),
    },
  };

  const users: User[] = [
    { id: "1", name: "Alice", email: "alice@example.com", role: "admin" },
    { id: "2", name: "Bob", email: "bob@example.com", role: "user" },
    { id: "3", name: "Charlie", email: "charlie@example.com", role: "user" },
  ];

  const groupedUsers = groupBy(users, "role");

  const apiResponse: ApiResponse<User> = {
    data: exampleUser,
    status: 200,
    message: "User fetched successfully",
  };

  // ========== Event Handlers ==========
  const handleIncrement = () => {
    setCount((prev) => prev + 1);
    setStatus("loading");
    setTimeout(() => setStatus("success"), 1000);
  };

  const toggleActive = () => {
    setIsToggled((prev) => !prev);
  };

  const cycleTheme = () => {
    const themes: Theme[] = ["light", "dark", "auto"];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  return (
    <div className={styles.tabContent} style={{ padding: "2rem" }}>
      <h1>TypeScript Type Examples & Utilities</h1>
      <p style={{ color: "#666", marginBottom: "2rem" }}>
        This page demonstrates type-safe components, hooks, and helper functions
      </p>

      {/* ========== Basic Component Example ========== */}
      <section style={{ marginBottom: "3rem" }}>
        <h2>1. Basic Props Component</h2>
        <BasicCard
          title="Example Card"
          count={count}
          isActive={isToggled}
          items={["TypeScript", "React", "Vite", "Zod"]}
          onToggle={toggleActive}
        />
        <div style={{ marginTop: "1rem" }}>
          <button onClick={handleIncrement} style={{ marginRight: "0.5rem" }}>
            Increment Count
          </button>
          <button onClick={toggleActive}>Toggle Active</button>
        </div>
        <p style={{ marginTop: "1rem", fontSize: "0.875rem", color: "#666" }}>
          Previous count: {previousCount ?? "none"} | Current count: {count}
        </p>
      </section>

      {/* ========== Union Types Example ========== */}
      <section style={{ marginBottom: "3rem" }}>
        <h2>2. Union Types & Status Badge</h2>
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <StatusBadge status={status} theme={theme} />
          <StatusBadge status="idle" theme={theme} />
          <StatusBadge status="loading" theme={theme} />
          <StatusBadge status="success" theme={theme} />
          <StatusBadge status="error" theme={theme} />
        </div>
        <button onClick={cycleTheme} style={{ marginRight: "0.5rem" }}>
          Cycle Theme (Current: {theme})
        </button>
        <button onClick={() => setStatus("idle")}>Reset Status</button>
      </section>

      {/* ========== Generic Component Example ========== */}
      <section style={{ marginBottom: "3rem" }}>
        <h2>3. Generic Component (ApiResponse)</h2>
        <ApiResponseDisplay
          response={apiResponse}
          renderData={(user) => (
            <div>
              <strong>{user.name}</strong> - {user.email}
            </div>
          )}
        />
      </section>

      {/* ========== Complex Object Props Example ========== */}
      <section style={{ marginBottom: "3rem" }}>
        <h2>4. Complex Object Props (User Card)</h2>
        <UserCard
          user={exampleUser}
          onEdit={(user) => alert(`Editing user: ${user.name}`)}
          onDelete={(id) => alert(`Deleting user: ${id}`)}
        />
      </section>

      {/* ========== Custom Hooks Example ========== */}
      <section style={{ marginBottom: "3rem" }}>
        <h2>5. Custom Hooks</h2>
        <LocalStorageDemo />
        <DebounceDemo />
        <ToggleDemo />
      </section>

      {/* ========== Helper Functions Example ========== */}
      <section style={{ marginBottom: "3rem" }}>
        <h2>6. Helper Functions</h2>
        <HelperFunctionsDemo
          exampleUser={exampleUser}
          groupedUsers={groupedUsers}
        />
      </section>

      {/* ========== Type Safety Notes ========== */}
      <TypeSafetyNotes />
    </div>
  );
}
