export type SongCupAgentConfig = {
  enabled: boolean;
  agentId: string | null;
  baseUrl: string | null;
  gatewayToken: string | null;
};

const PINATA_AGENT_HOST_SUFFIX = ".agents.pinata.cloud";

function resolveSongCupAgentBaseUrl(): string | null {
  const explicit = process.env.SONG_CUP_PINATA_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const agentId = process.env.SONG_CUP_PINATA_AGENT_ID?.trim();
  if (!agentId) return null;

  return `https://${agentId}${PINATA_AGENT_HOST_SUFFIX}`;
}

/**
 * Server-only Pinata agent routing for the Song Cup page search bar.
 * Set `SONG_CUP_PINATA_AGENT_ID` (or `SONG_CUP_PINATA_BASE_URL`) plus
 * `SONG_CUP_PINATA_GATEWAY_TOKEN` from the agent Danger page or
 * `GET /v0/agents/{agentId}/gateway-token`.
 */
export function getSongCupAgentConfig(): SongCupAgentConfig {
  const agentId = process.env.SONG_CUP_PINATA_AGENT_ID?.trim() || null;
  const baseUrl = resolveSongCupAgentBaseUrl();
  const gatewayToken = process.env.SONG_CUP_PINATA_GATEWAY_TOKEN?.trim() || null;
  return {
    enabled: Boolean(baseUrl && gatewayToken),
    agentId,
    baseUrl,
    gatewayToken,
  };
}
