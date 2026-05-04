#!/usr/bin/env bash
set -euo pipefail

if [ -z "${GRAPH_STUDIO_DEPLOY_KEY:-}" ]; then
  echo "GRAPH_STUDIO_DEPLOY_KEY is required"
  exit 1
fi

VERSION_LABEL="${VERSION_LABEL:-v0.0.1}"

cd subgraphs/creative-platform
yarn install
npx graph auth --studio "$GRAPH_STUDIO_DEPLOY_KEY"
npx graph codegen
npx graph build
npx graph deploy --studio creative-platform --version-label "$VERSION_LABEL"

echo "Deployed creative-platform with version label: $VERSION_LABEL"
