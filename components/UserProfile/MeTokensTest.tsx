'use client';

import { useEffect, useState } from 'react';
import { meTokensSubgraph, MeToken } from '@/lib/sdk/metokens/subgraph';

export default function MeTokensTest() {
  const [meTokens, setMeTokens] = useState<MeToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testSubgraphConnection = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Test fetching all MeTokens
      const tokens = await meTokensSubgraph.getAllMeTokens(10, 0);
      setMeTokens(tokens);
      console.log('MeTokens fetched successfully:', tokens);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to fetch MeTokens:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testSubgraphConnection();
  }, []);

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">MeTokens Subgraph Test</h3>
      
      {loading && <p>Loading MeTokens...</p>}
      
      {error && (
        <div className="text-red-600 mb-4">
          <p className="font-medium">Error:</p>
          <p>{error}</p>
          <button 
            onClick={testSubgraphConnection}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      )}
      
      {!loading && !error && (
        <div>
          <p className="text-green-600 mb-4">✅ MeTokens subgraph connection successful!</p>
          <p>Found {meTokens.length} MeTokens:</p>
          <div className="mt-2 space-y-2">
            {meTokens.slice(0, 5).map((token) => (
              <div key={token.id} className="text-sm p-2 bg-gray-100 rounded">
                <p><strong>ID:</strong> {token.id}</p>
                <p><strong>Owner:</strong> {token.owner}</p>
                <p><strong>Hub ID:</strong> {token.hubId}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
