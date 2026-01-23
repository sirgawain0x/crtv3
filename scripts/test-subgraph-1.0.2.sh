#!/bin/bash
# Test script to verify metokens/1.0.2 subgraph is working

echo "Testing metokens/1.0.2 subgraph endpoint..."
echo ""

curl -X POST https://api.goldsky.com/api/public/project_cmh0iv6s500dbw2p22vsxcfo6/subgraphs/metokens/1.0.2/gn \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ subscribes(first: 3) { id meToken hubId assetsDeposited blockTimestamp blockNumber transactionHash } }"
  }' | jq '.'

echo ""
echo "If you see data above, the subgraph is working correctly!"
echo "If you see errors, check the subgraph status in Goldsky dashboard."
