import { Status, Theme } from "../../utils/typeExamples";

interface StatusBadgeProps {
  status: Status;
  theme: Theme;
}

export default function StatusBadge({ status, theme }: StatusBadgeProps) {
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
