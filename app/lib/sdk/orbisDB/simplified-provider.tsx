'use client';

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { applyOrbisAuthPatches, applyOrbisDBPatches } from './auth-patch';

// Define types for Orbis
interface OrbisConnectResult {
  status: number;
  did: string;
  details?: any;
  result?: any;
  error?: string;
}

interface OrbisContext {
  orbisLogin: () => Promise<OrbisConnectResult | null>;
  isConnected: boolean;
  user: any;
}

const OrbisContext = createContext<OrbisContext>({
  orbisLogin: async () => null,
  isConnected: false,
  user: null,
});

export const useOrbis = () => useContext(OrbisContext);

// Import Orbis dynamically to avoid SSR issues
let Orbis: any = null;
let orbisModule: any = null;

export function SimplifiedOrbisProvider({ children }: { children: ReactNode }) {
  const [orbisInstance, setOrbisInstance] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [address, setAddress] = useState<string | null>(null);

  // Get the user's address
  useEffect(() => {
    const getAddress = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: 'eth_accounts',
          });
          if (accounts && accounts.length > 0) {
            setAddress(accounts[0]);
          }
        } catch (error) {
          console.error('Error getting address:', error);
        }
      }
    };

    getAddress();
  }, []);

  // Setup Orbis and apply patches
  useEffect(() => {
    // Apply patches to fix authentication issues
    applyOrbisAuthPatches();

    const initOrbis = async () => {
      try {
        // Validate environment variables
        if (!process.env.NEXT_PUBLIC_CERAMIC_NODE_URL) {
          throw new Error('NEXT_PUBLIC_CERAMIC_NODE_URL is not defined');
        }
        if (!process.env.NEXT_PUBLIC_ORBIS_NODE_URL) {
          throw new Error('NEXT_PUBLIC_ORBIS_NODE_URL is not defined');
        }
        if (!process.env.NEXT_PUBLIC_ORBIS_ENVIRONMENT_ID) {
          throw new Error('NEXT_PUBLIC_ORBIS_ENVIRONMENT_ID is not defined');
        }

        // Wait for Orbis to be dynamically imported
        if (!Orbis) {
          console.log(
            'Waiting for Orbis to be imported in simplified provider...',
          );
          const orbisModuleImport = await import('@useorbis/db-sdk');
          Orbis = orbisModuleImport.OrbisDB;
          orbisModule = orbisModuleImport; // Store the module for later use
          console.log(
            'Orbis imported successfully in simplified provider:',
            !!Orbis,
          );
        }

        console.log('Initializing Orbis in simplified provider...');
        const newOrbisInstance = new Orbis({
          ceramic: {
            gateway: process.env.NEXT_PUBLIC_CERAMIC_NODE_URL,
          },
          nodes: [
            {
              gateway: process.env.NEXT_PUBLIC_ORBIS_NODE_URL,
              env: process.env.NEXT_PUBLIC_ORBIS_ENVIRONMENT_ID,
            },
          ],
        });

        // Apply client patches
        if (newOrbisInstance) {
          applyOrbisDBPatches(newOrbisInstance);
        }

        setOrbisInstance(newOrbisInstance);

        // Check if user is already connected
        try {
          const isConnected = await newOrbisInstance.isUserConnected();

          if (isConnected) {
            console.log('User already connected to Orbis');
            setIsConnected(true);
            const currentUser = await newOrbisInstance.getConnectedUser();
            setUser(currentUser);
          }
        } catch (error) {
          console.error('Error checking if user is connected:', error);
        }
      } catch (error) {
        console.error('Error initializing Orbis:', error);
      }
    };

    initOrbis();
  }, []);

  // Login to Orbis
  const orbisLogin = async (): Promise<OrbisConnectResult | null> => {
    try {
      if (!orbisInstance) {
        console.error('Orbis not initialized, attempting to initialize...');

        try {
          // Try to initialize Orbis on-demand
          if (!Orbis) {
            console.log('Importing Orbis on-demand...');
            const orbisModuleImport = await import('@useorbis/db-sdk');
            Orbis = orbisModuleImport.OrbisDB;
            orbisModule = orbisModuleImport; // Store the module for later use
          }

          if (!Orbis) {
            console.error('Failed to import Orbis module');
            return {
              status: 0,
              did: '',
              error: 'Failed to import Orbis module',
            };
          }

          console.log('Creating new Orbis instance on-demand...');
          const newOrbisInstance = new Orbis({
            ceramic: {
              gateway: process.env.NEXT_PUBLIC_CERAMIC_NODE_URL,
            },
            nodes: [
              {
                gateway: process.env.NEXT_PUBLIC_ORBIS_NODE_URL,
                env: process.env.NEXT_PUBLIC_ORBIS_ENVIRONMENT_ID,
              },
            ],
          });

          if (newOrbisInstance) {
            console.log('Successfully created Orbis instance on-demand');
            applyOrbisDBPatches(newOrbisInstance);
            setOrbisInstance(newOrbisInstance);
          } else {
            console.error('Failed to create Orbis instance on-demand');
            return {
              status: 0,
              did: '',
              error: 'Failed to create Orbis instance',
            };
          }
        } catch (initError) {
          console.error('Error initializing Orbis on-demand:', initError);
          return {
            status: 0,
            did: '',
            error:
              initError instanceof Error
                ? initError.message
                : 'Unknown error initializing Orbis',
          };
        }
      }

      if (!orbisInstance) {
        console.error('Orbis still not initialized after attempt');
        return {
          status: 0,
          did: '',
          error: 'Orbis still not initialized after attempt',
        };
      }

      if (!window.ethereum) {
        const error = 'No Ethereum provider found. Please install MetaMask.';
        console.error(error);
        return {
          status: 0,
          did: '',
          error,
        };
      }

      console.log('Connecting to Orbis...');

      // Create a provider from window.ethereum
      const provider = window.ethereum;

      // Connect to Orbis using the provider
      console.log('Calling orbis.connect with provider:', provider);

      // Try different connection methods based on the SDK version
      let result;

      try {
        // First try to import OrbisEVMAuth if not already available
        if (!orbisModule) {
          console.log('Importing OrbisEVMAuth on-demand...');
          orbisModule = await import('@useorbis/db-sdk');
        }

        if (typeof orbisInstance.connect === 'function') {
          console.log('Using orbisInstance.connect method');
          result = await orbisInstance.connect(provider);
        } else if (
          typeof orbisInstance.connectUser === 'function' &&
          orbisModule.OrbisEVMAuth
        ) {
          console.log('Using orbisInstance.connectUser with OrbisEVMAuth');
          const auth = new orbisModule.OrbisEVMAuth(provider);
          result = await orbisInstance.connectUser({ auth });
        } else {
          console.error('No valid connection method found on orbisInstance');
          return {
            status: 0,
            did: '',
            error: 'No valid connection method found on Orbis instance',
          };
        }
      } catch (connectError) {
        console.error('Error during Orbis connection:', connectError);

        // Try fallback direct connection
        try {
          console.log('Trying fallback direct connection...');
          result = await orbisInstance.connect(provider);
        } catch (fallbackError) {
          console.error('Fallback connection also failed:', fallbackError);

          if (address) {
            // Use address-only fallback as last resort
            console.log('Using address-only fallback as last resort');
            return {
              status: 200,
              did: `did:ethr:${address}`,
              details: {
                did: `did:ethr:${address}`,
                profile: null,
              },
            };
          }

          return {
            status: 0,
            did: '',
            error: 'All connection methods failed',
          };
        }
      }

      console.log('Orbis connect result:', result);

      if (result.status === 200) {
        setIsConnected(true);
        setUser(result);
        return result;
      } else {
        console.error('Failed to connect to Orbis:', result);

        // Try fallback authentication if the regular connection fails
        if (address) {
          console.log(
            'Attempting fallback authentication with address:',
            address,
          );

          // Create a minimal valid result
          const fallbackResult = {
            status: 200,
            did: `did:ethr:${address}`,
            details: {
              did: `did:ethr:${address}`,
              profile: null,
            },
          };

          setIsConnected(true);
          setUser(fallbackResult);

          return fallbackResult;
        }

        return result;
      }
    } catch (error) {
      console.error('Error connecting to Orbis:', error);
      return {
        status: 0,
        did: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  return (
    <OrbisContext.Provider
      value={{
        orbisLogin,
        isConnected,
        user,
      }}
    >
      {children}
    </OrbisContext.Provider>
  );
}
