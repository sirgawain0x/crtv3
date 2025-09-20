'use client';

import { useEffect, useState } from 'react';
import { request } from 'graphql-request';

export default function MeTokensDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testSubgraphConnection = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Test 1: Simple introspection query to see what's available
      const introspectionQuery = `
        query IntrospectionQuery {
          __schema {
            types {
              name
              kind
            }
          }
        }
      `;

      const endpoint = typeof window !== 'undefined' 
        ? `${window.location.origin}/api/metokens-subgraph`
        : '/api/metokens-subgraph';

      console.log('Testing endpoint:', endpoint);
      
      const introspectionResult = await request(endpoint, introspectionQuery);
      console.log('Introspection result:', introspectionResult);

      // Test 2: Try a simple query to see what entities exist
      const simpleQuery = `
        query {
          __type(name: "Query") {
            fields {
              name
              type {
                name
                kind
              }
            }
          }
        }
      `;

      const simpleResult = await request(endpoint, simpleQuery);
      console.log('Simple query result:', simpleResult);

      setDebugInfo({
        introspection: introspectionResult,
        simple: simpleResult,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Debug failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testSubgraphConnection();
  }, []);

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">MeTokens Subgraph Debug</h3>
      
      {loading && <p>Loading debug info...</p>}
      
      {error && (
        <div className="text-red-600 mb-4">
          <p className="font-medium">Error:</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={testSubgraphConnection}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      )}
      
      {debugInfo && (
        <div className="space-y-4">
          <div>
            <h4 className="font-medium">Available Types:</h4>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(debugInfo.introspection, null, 2)}
            </pre>
          </div>
          
          <div>
            <h4 className="font-medium">Query Fields:</h4>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(debugInfo.simple, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
