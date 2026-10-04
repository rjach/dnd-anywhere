import { useState } from "react";
import { createRoot } from "react-dom/client";

function App() {
  const [names, setNames] = useState("");
  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <label className="btn" htmlFor="file">
        Add attachment
      </label>
      <input
        id="file"
        type="file"
        hidden
        onChange={(event) =>
          setNames([...(event.target.files ?? [])].map((file) => file.name).join(","))
        }
      />
      <p id="result">{names}</p>
    </form>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
