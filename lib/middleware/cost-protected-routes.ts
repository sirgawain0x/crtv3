/** Shared route inventory: server access guards and Basic BotID browser instrumentation. */
export const COST_PROTECTED_ROUTES = [
  { path: "/api/payments/x402", method: "POST", resource: "feature.payment" },
  {
    "path": "/api/internal/playback-info",
    "method": "GET",
    "resource": "playback.info"
  },
  {
    "path": "/api/internal/sign-jwt",
    "method": "POST",
    "resource": "playback.sign"
  },
  {
    "path": "/api/story/rpc-proxy",
    "method": "POST",
    "resource": "rpc.story"
  },
  {
    "path": "/api/membership",
    "method": "POST",
    "resource": "membership.lookup"
  },
  {
    "path": "/api/market/tokens",
    "method": "GET",
    "resource": "market.tokens"
  },
  {
    "path": "/api/market/tokens/*/fresh",
    "method": "GET",
    "resource": "market.fresh"
  },
  {
    "path": "/api/market/tokens/*/price-history",
    "method": "GET",
    "resource": "market.history"
  },
  {
    "path": "/api/metokens-subgraph",
    "method": "POST",
    "resource": "subgraph.metokens"
  },
  {
    "path": "/api/reality-eth-subgraph",
    "method": "POST",
    "resource": "subgraph.predictions"
  },
  {
    "path": "/api/metokens/*/stats",
    "method": "GET",
    "resource": "metokens.stats"
  },
  {
    "path": "/api/metokens/*/transactions",
    "method": "GET",
    "resource": "metokens.transactions"
  },
  {
    "path": "/api/metokens",
    "method": "GET",
    "resource": "metokens.list"
  },
  {
    "path": "/api/metokens/*",
    "method": "GET",
    "resource": "metokens.info"
  },
  {
    "path": "/api/metokens/by-id/*",
    "method": "GET",
    "resource": "metokens.info"
  },
  {
    "path": "/api/predictions/claim-status",
    "method": "GET",
    "resource": "predictions.claim-status"
  },
  {
    "path": "/api/predictions/stake-stats",
    "method": "GET",
    "resource": "predictions.stake-stats"
  },
  {
    "path": "/api/predictions/by-video",
    "method": "GET",
    "resource": "predictions.by-video"
  },
  {
    "path": "/api/predictions/precog",
    "method": "GET",
    "resource": "predictions.precog"
  },
  {
    "path": "/api/earn/position",
    "method": "GET",
    "resource": "earn.position"
  },
  {
    "path": "/api/earn/vault",
    "method": "GET",
    "resource": "earn.vault"
  },
  {
    "path": "/api/story/ip-status",
    "method": "GET",
    "resource": "story.ip-status"
  },
  {
    "path": "/api/story/wip-price",
    "method": "GET",
    "resource": "story.wip-price"
  },
  {
    "path": "/api/story/license-terms",
    "method": "GET",
    "resource": "story.license-terms"
  },
  {
    "path": "/api/livepeer/views/creator",
    "method": "GET",
    "resource": "views.creator"
  },
  {
    "path": "/api/livepeer/views/realtime/*",
    "method": "GET",
    "resource": "views.realtime"
  },
  {
    "path": "/api/livepeer/asset/*",
    "method": "GET",
    "resource": "video.asset"
  },
  {
    "path": "/api/streams/*/live-status",
    "method": "GET",
    "resource": "streams.status"
  },
  {
    "path": "/api/streams/access/*",
    "method": "GET",
    "resource": "streams.access"
  },
  {
    "path": "/api/streams/creator/*",
    "method": "GET",
    "resource": "streams.creator"
  },
  {
    "path": "/api/twin/chat",
    "method": "POST",
    "resource": "agent.twin"
  },
  {
    "path": "/api/video-assets/published",
    "method": "GET",
    "resource": "videos.published"
  },
  {
    "path": "/api/video-assets/by-asset-id/*/playback",
    "method": "GET",
    "resource": "playback.resolve"
  },
  {
    "path": "/api/livepeer/playback-info",
    "method": "GET",
    "resource": "playback.info"
  },
  {
    "path": "/api/livepeer/views/*",
    "method": "GET",
    "resource": "views.metrics"
  },
  {
    "path": "/api/campaigns",
    "method": "POST",
    "resource": "agent.access"
  },
  {
    "path": "/api/agent/creative-guide",
    "method": "POST",
    "resource": "agent.access"
  },
  {
    "path": "/api/agent/creative-tv",
    "method": "POST",
    "resource": "agent.access"
  },
  {
    "path": "/api/livepeer/clips",
    "method": "POST",
    "resource": "agent.access"
  },
  {
    "path": "/api/predictions/gate",
    "method": "POST",
    "resource": "agent.access"
  },
  {
    "path": "/api/song-cup/agent/chat",
    "method": "POST",
    "resource": "agent.access"
  },
  {
    "path": "/api/streams/recordings/finalize",
    "method": "POST",
    "resource": "agent.access"
  },
  {
    "path": "/api/livepeer/stream/*/recording",
    "method": "POST",
    "resource": "agent.access"
  }
] as const;

const compiledRoutes = COST_PROTECTED_ROUTES.map((route) => ({
  route,
  pattern: new RegExp(`^${route.path.split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^/]+')}/?$`),
}));

export function getCostProtectedRoute(pathname: string, method: string) {
  return compiledRoutes.find(({ route, pattern }) =>
    (method === 'OPTIONS' || route.method === method) && pattern.test(pathname),
  )?.route;
}

export function isCostProtectedRoute(pathname: string, method: string): boolean {
  return Boolean(getCostProtectedRoute(pathname, method));
}
