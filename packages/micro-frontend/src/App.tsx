import MicroPage from "./pages/MicroPage";

function App() {
  return (
    <div>
      <h1>Micro Frontend - Standalone Mode</h1>
      <p>
        This micro frontend can run standalone or be consumed by the main app
      </p>
      <MicroPage />
    </div>
  );
}

export default App;
