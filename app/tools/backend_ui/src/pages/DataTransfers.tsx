import { useState, useEffect } from "react";
import { invoke, listen } from "@tauri-apps/api";
import ThreeJsBackground from "../components/ThreeJsBackground";
import Menu from "../components/Menu";
import { useAuth } from "../context/AuthContext";
import "../App.css";

interface Transfer {
  action: string;
  cid: string;
  size: number;
  timestamp: string;
}

function DataTransfers() {
  const { token } = useAuth();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [error, setError] = useState<string>("");

  async function updateTransfers() {
    try {
      const data: Transfer[] = await invoke("get_transfers", { token });
      setTransfers(data);
      setError("");
    } catch (err) {
      setError(`Failed to fetch transfers: ${String(err)}`);
    }
  }

  useEffect(() => {
    if (token) {
      updateTransfers();
      let unlisten: (() => void) | null = null;
      listen("transfer-updated", updateTransfers).then((fn) => {
        unlisten = fn;
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