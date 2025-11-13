export default function TypeSafetyNotes() {
  return (
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
  );
}
