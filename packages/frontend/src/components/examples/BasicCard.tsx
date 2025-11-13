import { BasicProps } from "../../utils/typeExamples";

interface BasicCardProps extends BasicProps {
  onToggle?: () => void;
}

export default function BasicCard({
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
