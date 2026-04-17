import OnboardingProgressWidget from "./widgets/OnboardingProgressWidget";
import OpenAccountPage from "./pages/OpenAccountPage";

export default function App() {
  return (
    <div
      style={{
        padding: "2rem 2.5rem",
        maxWidth: 1200,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "1.25rem",
          maxWidth: 360,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: "var(--text-muted)",
            marginBottom: "0.75rem",
          }}
        >
          OnboardingProgressWidget (standalone preview)
        </div>
        <OnboardingProgressWidget />
      </div>

      <OpenAccountPage />
    </div>
  );
}
