import { useState, useEffect } from 'react';
import { emit } from '@tauri-apps/api/event';
import ThreeJsBackground from '../components/ThreeJsBackground';
import Menu from '../components/Menu';
import { useAuth } from '../context/AuthContext';
import '../App.css';

interface Pod {
  name: string;
  namespace: string;
  status: string;
}

function KubernetesDashboard() {
  const { token } = useAuth();
  const [pods, setPods] = useState<Pod[]>([]);
  const [error, setError] = useState<string>('');

  async function fetchPods() {
    try {
      const data: Pod[] = await emit('get_kubernetes_pods', { token });
      setPods(data);
      setError('');
    } catch (err) {
      setError(`Failed to fetch pods: ${String(err)}`);
    }
  }

  useEffect(() => {
    if (token) fetchPods();
  }, [token]);

  if (!token) {
    return (
      <main className="container">
        <ThreeJsBackground />
        <header className="game-title">
          <h1>Kubernetes Dashboard</h1>
        </header>
        <p className="error">
          Please authenticate to view Kubernetes resources.
        </p>
      </main>
    );
  }

  return (
    <main className="container">
      <ThreeJsBackground />
      <header className="game-title">
        <h1>Kubernetes Dashboard</h1>
      </header>
      <Menu token={token} />
      <section className="table-container">
        <h2>Pods</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Namespace</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {pods.map((pod, index) => (
              <tr key={index}>
                <td>{pod.name}</td>
                <td>{pod.namespace}</td>
                <td>{pod.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {error && <p className="error">{error}</p>}
      </section>
    </main>
  );
}

export default KubernetesDashboard;
