import { useState, useEffect } from "react";
import { emit, listen } from "@tauri-apps/api/event";
import ThreeJsBackground from "../components/ThreeJsBackground";
import Menu from "../components/Menu";
import { useAuth } from "../context/AuthContext";
import "../App.css";

interface Transfer {
  action: string;
  cid: string;
  data: string;
  error: string;
  id: string;
  size: number;
  timestamp: string;
}

function DataTransfers() {
  const { token } = useAuth();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [error, setError] = useState<string>("");

  async function updateTransfers() {
    try {
      const data: Transfer[] = await emit("get_transfers", { token });
      console.log("Fetched transfers:", data); // Debug log
      setTransfers(data);
      setError("");
    } catch (err) {
      console.error("emit error:", err); // Debug log
      setError(`Failed to fetch transfers: ${String(err)}`);
    }
  }

  useEffect(() => {
    if (token) {
      updateTransfers();
      let unlisten: (() => void) | null = null;
      listen("transfer-updated", () => {
        console.log("Transfer-updated event received"); // Debug log
        return updateTransfers();
      }).then((fn) => {
        unlisten = fn;
      }).catch((err) => {
        console.error("Listen error:", err); // Debug log
      });
      return () => {
        if (unlisten) unlisten();
      };
    }
  }, [token]);

  if (!token) {
    return (
      <main className="container">
        <ThreeJsBackground />
        <header className="game-title">
          <h1>Data Transfers</h1>
        </header>
        <p className="error">Please authenticate to view transfers.</p>
      </main>
    );
  }

  return (
    <main className="container">
      <ThreeJsBackground />
      <header className="game-title">
        <h1>Data Transfers</h1>
      </header>
      <Menu token={token} />
      <section className="table-container">
        <table>
          <thead>
            <tr>
              <th>Action</th>
              <th>CID</th>
              <th>Size (bytes)</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((t, index) => (
              <tr key={index}>
                <td>{t.action}</td>
                <td>{t.cid}</td>
                <td>{t.size}</td>
                <td>{t.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {error && <p className="error">{error}</p>}
      </section>
    </main>
  );
}

export default DataTransfers;