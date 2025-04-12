import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import Menu from "./components/Menu";
import ThreeJsBackground from "./components/ThreeJsBackground";
import { AuthProvider } from "./context/AuthContext";
import "./App.css";

function App() {
  const [cid, setCid] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");
  const navigate = useNavigate();

  async function authenticate() {
    try {
      const authToken: string = await invoke("authenticate", { cid });
      setToken(authToken);
      setAuthError("");
      navigate("/data-transfers");
    } catch (error) {
      setAuthError(`Authentication failed: ${String(error)}`);
    }
  }

  return (
    <AuthProvider token={token} setToken={setToken}>
      <main className="container">
        <ThreeJsBackground />
        <header className="game-title">
          <h1>Creative AI Master</h1>
        </header>
        <Menu token={token} />
        <section className="auth-section">
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              authenticate();
            }}
          >
            <input
              id="cid-input"
              value={cid}
              onChange={(e) => setCid(e.target.value)}
              placeholder="Enter your CID or DID..."
            />
            <button type="submit">Authenticate</button>
          </form>
          {authError && <p className="error">{authError}</p>}
        </section>
      </main>
    </AuthProvider>
  );
}

export default App;