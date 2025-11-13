import { useToggle } from "../../utils/typeExamples";

export default function ToggleDemo() {
  const [isToggled, toggle, setToggle] = useToggle(false);

  return (
    <div>
      <h3>useToggle Hook</h3>
      <button onClick={toggle} style={{ marginRight: "0.5rem" }}>
        Toggle (Current: {isToggled ? "ON" : "OFF"})
      </button>
      <button onClick={() => setToggle(true)} style={{ marginRight: "0.5rem" }}>
        Set ON
      </button>
      <button onClick={() => setToggle(false)}>Set OFF</button>
    </div>
  );
}
