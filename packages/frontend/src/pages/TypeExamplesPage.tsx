import { useState } from "react";
import {
  BasicProps,
  User,
  Status,
  Theme,
  ApiResponse,
  useLocalStorage,
  useDebounce,
  usePrevious,
  useToggle,
  formatCurrency,
  formatDate,
  deepClone,
  groupBy,
  isValidEmail,
  generateId,
} from "../utils/typeExamples";

// ============================================================================
// EXAMPLE COMPONENTS - Demonstrating type-safe props
// ============================================================================

/**
 * Component with basic props
 */
interface BasicCardProps extends BasicProps {
  onToggle?: () => void;
}

function BasicCard({
  title,
  count,
  isActive,
  items,
  onToggle,
}: BasicCardProps) {
  return (
    <div className={`card ${isActive ? "active" : ""}`}>
      <h3>{title}</h3>
      <p>Count: {count}</p>
      <ul>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
      {onToggle && (
        <button onClick={onToggle}>
          {isActive ? "Deactivate" : "Activate"}
        </button>
      )}
    </div>
  );
}

/**
 * Component with union types
 */
interface StatusBadgeProps {
  status: Status;
  theme: Theme;
}

function StatusBadge({ status, theme }: StatusBadgeProps) {
  const statusColors: Record<Status, string> = {
    idle: "#gray",
    loading: "#blue",
    success: "#green",
    error: "#red",
  };

  const themeClass = theme === "dark" ? "dark-mode" : "light-mode";

  return (
    <span
      className={`badge ${themeClass}`}
      style={{ backgroundColor: statusColors[status] }}
    >
      {status.toUpperCase()}
    </span>
  );
}

/**
 * Component with generic props
 */
interface ApiResponseDisplayProps<T> {
  response: ApiResponse<T>;
  renderData: (data: T) => React.ReactNode;
}

function ApiResponseDisplay<T>({
  response,
  renderData,
}: ApiResponseDisplayProps<T>) {
  return (
    <div className="api-response">
      <div className="status">Status: {response.status}</div>
      {response.message && <div className="message">{response.message}</div>}
      <div className="data">{renderData(response.data)}</div>
    </div>
  );
}

/**
 * Component with complex object props
 */
interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
  onDelete?: (userId: string) => void;
}

function UserCard({ user, onEdit, onDelete }: UserCardProps) {
  return (
    <div className="user-card">
      <h4>{user.name}</h4>
      <p>Email: {user.email}</p>
      <p>Role: {user.role}</p>
      {user.metadata?.createdAt && (
        <p>Created: {formatDate(user.metadata.createdAt)}</p>
      )}
      {user.metadata?.lastLogin && (
        <p>Last Login: {formatDate(user.metadata.lastLogin, "full")}</p>
      )}
      <div className="actions">
        {onEdit && <button onClick={() => onEdit(user)}>Edit</button>}
        {onDelete && <button onClick={() => onDelete(user.id)}>Delete</button>}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN EXAMPLES PAGE COMPONENT
// ============================================================================

export default function TypeExamplesPage() {
  // ========== State Examples ==========
  const [count, setCount] = useState<number>(0);
  const [status, setStatus] = useState<Status>("idle");
  const [theme, setTheme] = useState<Theme>("light");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // ========== Custom Hooks Examples ==========
  const [settings, setSettings] = useLocalStorage<{
    notifications: boolean;
    language: string;
  }>("userSettings", { notifications: true, language: "en" });

  const debouncedSearch = useDebounce(searchTerm, 500);
  const previousCount = usePrevious(count);
  const [isToggled, toggle, setToggle] = useToggle(false);

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

  const clonedUser = deepClone(exampleUser);

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

  const handleEmailValidation = (email: string) => {
    return isValidEmail(email) ? "Valid email" : "Invalid email";
  };

  const cycleTheme = () => {
    const themes: Theme[] = ["light", "dark", "auto"];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  return (
    <div className="type-examples-page" style={{ padding: "2rem" }}>
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
          onToggle={toggle}
        />
        <div style={{ marginTop: "1rem" }}>
          <button onClick={handleIncrement} style={{ marginRight: "0.5rem" }}>
            Increment Count
          </button>
          <button onClick={toggle}>Toggle Active</button>
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

        <div style={{ marginBottom: "1.5rem" }}>
          <h3>useLocalStorage Hook</h3>
          <div>
            <label>
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={(e) =>
                  setSettings({ ...settings, notifications: e.target.checked })
                }
              />
              Enable Notifications
            </label>
          </div>
          <div>
            <label>
              Language:
              <select
                value={settings.language}
                onChange={(e) =>
                  setSettings({ ...settings, language: e.target.value })
                }
                style={{ marginLeft: "0.5rem" }}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
            </label>
          </div>
          <p
            style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.5rem" }}
          >
            Settings are persisted in localStorage
          </p>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <h3>useDebounce Hook</h3>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type to search (debounced 500ms)"
            style={{ padding: "0.5rem", width: "300px" }}
          />
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem" }}>
            Immediate: <strong>{searchTerm}</strong>
          </p>
          <p style={{ fontSize: "0.875rem" }}>
            Debounced: <strong>{debouncedSearch}</strong>
          </p>
        </div>

        <div>
          <h3>useToggle Hook</h3>
          <button onClick={toggle} style={{ marginRight: "0.5rem" }}>
            Toggle (Current: {isToggled ? "ON" : "OFF"})
          </button>
          <button
            onClick={() => setToggle(true)}
            style={{ marginRight: "0.5rem" }}
          >
            Set ON
          </button>
          <button onClick={() => setToggle(false)}>Set OFF</button>
        </div>
      </section>

      {/* ========== Helper Functions Example ========== */}
      <section style={{ marginBottom: "3rem" }}>
        <h2>6. Helper Functions</h2>

        <div style={{ marginBottom: "1rem" }}>
          <strong>formatCurrency:</strong> {formatCurrency(1234.56)} |{" "}
          {formatCurrency(9999.99, "EUR")}
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <strong>formatDate:</strong> {formatDate(new Date(), "short")} |{" "}
          {formatDate(new Date(), "long")} | {formatDate(new Date(), "full")}
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <strong>isValidEmail:</strong>{" "}
          {handleEmailValidation("test@example.com")} |{" "}
          {handleEmailValidation("invalid-email")}
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <strong>generateId:</strong> {generateId("example")}
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <strong>deepClone:</strong> User cloned ={" "}
          {clonedUser.id === exampleUser.id ? "same ID" : "different ID"} (
          {clonedUser === exampleUser
            ? "same reference"
            : "different reference"}
          )
        </div>

        <div>
          <strong>groupBy:</strong>
          <pre
            style={{
              background: "#f5f5f5",
              padding: "1rem",
              borderRadius: "4px",
            }}
          >
            {JSON.stringify(groupedUsers, null, 2)}
          </pre>
        </div>
      </section>

      {/* ========== Type Safety Notes ========== */}
      <section
        style={{
          marginTop: "3rem",
          padding: "1.5rem",
          background: "#f0f9ff",
          borderRadius: "8px",
          border: "1px solid #bae6fd",
        }}
      >
        <h2>📝 Type Safety Features</h2>
        <ul style={{ lineHeight: "1.8" }}>
          <li>✅ All components have fully typed props</li>
          <li>✅ Custom hooks maintain type safety across returns</li>
          <li>✅ Helper functions preserve generic types</li>
          <li>✅ Union types ensure valid values only</li>
          <li>✅ Optional props with proper handling</li>
          <li>✅ Type guards for runtime validation</li>
          <li>✅ No 'any' types used anywhere</li>
        </ul>
      </section>
    </div>
  );
}
