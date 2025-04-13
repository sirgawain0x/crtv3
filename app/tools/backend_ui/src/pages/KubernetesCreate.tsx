import { useState } from 'react';
import { emit } from '@tauri-apps/api/event';
import ThreeJsBackground from '../components/ThreeJsBackground';
import Menu from '../components/Menu';
import { useAuth } from '../context/AuthContext';
import '../App.css';

function KubernetesCreate() {
  const { token } = useAuth();
  const [resourceType, setResourceType] = useState<string>('wordpress');
  const [response, setResponse] = useState<string>('');
  const [error, setError] = useState<string>('');

  async function createResource(e: React.FormEvent) {
    e.preventDefault();
    try {
      const result: string = await emit('create_kubernetes_resource', {
        token,
        resourceType,
      });
      setResponse(result);
      setError('');
    } catch (err) {
      setError(`Failed to create resource: ${String(err)}`);
    }
  }

  if (!token) {
    return (
      <main className="container">
        <ThreeJsBackground />
        <header className="game-title">
          <h1>Create Kubernetes Resource</h1>
        </header>
        <p className="error">Please authenticate to create resources.</p>
      </main>
    );
  }

  return (
    <main className="container">
      <ThreeJsBackground />
      <header className="game-title">
        <h1>Create Kubernetes Resource</h1>
      </header>
      <Menu token={token} />
      <section className="form-container">
        <form className="row" onSubmit={createResource}>
          <select
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
          >
            <option value="wordpress">WordPress</option>
            <option value="static-site">Static Site</option>
          </select>
          <button type="submit">Create</button>
        </form>
        {response && <p className="response">{response}</p>}
        {error && <p className="error">{error}</p>}
      </section>
    </main>
  );
}

export default KubernetesCreate;
