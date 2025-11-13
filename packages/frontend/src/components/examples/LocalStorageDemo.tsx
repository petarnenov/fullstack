import { useLocalStorage } from "../../utils/typeExamples";

export default function LocalStorageDemo() {
  const [settings, setSettings] = useLocalStorage<{
    notifications: boolean;
    language: string;
  }>("userSettings", { notifications: true, language: "en" });

  return (
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
      <p style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.5rem" }}>
        Settings are persisted in localStorage
      </p>
    </div>
  );
}
