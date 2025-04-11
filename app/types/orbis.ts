import { OrbisAuthResult, OrbisUserProfile } from '@app/lib/sdk/orbisDB/types';
import { type OrbisDB } from '@useorbis/db-sdk';

// SDK types
export interface OrbisSDKConnectResult {
  did: string;
  details?: {
    did: string;
    profile?: any;
  };
}

// Our application types
export interface OrbisConnectResult {
  success: boolean;
  did: string;
  details?: {
    did: string;
    profile?: any;
  };
  user?: {
    did: string;
    address?: string;
    profile?: any;
  };
  status?: number;
  result?: any;
}

export function isValidOrbisResult(
  result: unknown,
): result is OrbisConnectResult {
  if (typeof result !== 'object' || result === null) return false;

  const r = result as Partial<OrbisConnectResult>;
  return (
    r.success === true &&
    typeof r.did === 'string' &&
    r.details !== undefined &&
    typeof r.details === 'object' &&
    r.details !== null &&
    typeof r.details.did === 'string'
  );
}

export function normalizeOrbisResult(
  result: OrbisConnectResult,
): OrbisAuthResult {
  return {
    did: result.did,
    details: {
      did: result.details?.did ?? result.did,
      profile: result.details?.profile,
    },
  };
}

export interface OrbisContextType {
  orbis: OrbisDB | null;
  isConnected: boolean;
  session: OrbisConnectResult | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export interface OrbisProviderProps {
  children: React.ReactNode;
}
