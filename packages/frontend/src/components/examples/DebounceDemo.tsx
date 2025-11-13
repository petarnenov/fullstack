import { useState } from "react";
import { useDebounce } from "../../utils/typeExamples";

export default function DebounceDemo() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const debouncedSearch = useDebounce(searchTerm, 500);

  return (
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
  );
}
