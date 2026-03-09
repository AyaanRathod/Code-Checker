import { useState } from "react";
import SubmitAssignmentPage from "./pages/SubmitAssignmentPage";
import CreateAssignmentPage from "./pages/CreateAssignmentPage";

function App() {
  const [page, setPage] = useState<"submit" | "create">("submit");

  return (
    <>
      <div style={{ padding: "10px", display: "flex", gap: "10px" }}>
        <button onClick={() => setPage("submit")}>Submit Page</button>
        <button onClick={() => setPage("create")}>Create Assignment Page</button>
      </div>

      {page === "submit" ? <SubmitAssignmentPage /> : <CreateAssignmentPage />}
    </>
  );
}

export default App;