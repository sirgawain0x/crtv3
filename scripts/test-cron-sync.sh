#!/bin/bash

# Test script for video view count cron job
# Usage: ./scripts/test-cron-sync.sh [environment]
# Example: ./scripts/test-cron-sync.sh local
# Example: ./scripts/test-cron-sync.sh production

ENVIRONMENT=${1:-local}

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing Video View Count Sync Cron Job${NC}"
echo "Environment: $ENVIRONMENT"
echo "-------------------------------------------"

# Determine URL based on environment
if [ "$ENVIRONMENT" = "local" ]; then
  URL="http://localhost:3000/api/video-assets/sync-views/cron"
  echo "URL: $URL"
  
  # Load local environment variables
  if [ -f .env.local ]; then
    export $(cat .env.local | grep CRON_SECRET | xargs)
  else
    echo -e "${RED}Error: .env.local not found${NC}"
    exit 1
  fi
elif [ "$ENVIRONMENT" = "production" ]; then
  # You'll need to set your production URL
  read -p "Enter your production URL (e.g., https://your-app.vercel.app): " PROD_URL
  URL="$PROD_URL/api/video-assets/sync-views/cron"
  
  read -sp "Enter your CRON_SECRET: " CRON_SECRET
  echo ""
else
  echo -e "${RED}Invalid environment. Use 'local' or 'production'${NC}"
  exit 1
fi

if [ -z "$CRON_SECRET" ]; then
  echo -e "${RED}Error: CRON_SECRET not found${NC}"
  echo "Make sure it's set in .env.local or passed as argument"
  exit 1
fi

echo -e "${YELLOW}Sending request...${NC}"
echo ""

# Make the request and capture response
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  "$URL")

# Extract status code (last line)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
# Extract body (everything except last line)
BODY=$(echo "$RESPONSE" | sed '$d')

# Display results
echo -e "${YELLOW}Response:${NC}"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

echo ""
echo -e "${YELLOW}HTTP Status Code:${NC} $HTTP_CODE"

# Check status
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ Success!${NC}"
  
  # Parse and display key metrics if response is JSON
  if command -v jq &> /dev/null; then
    echo ""
    echo -e "${YELLOW}Summary:${NC}"
    echo "Total Videos: $(echo "$BODY" | jq -r '.totalVideos // "N/A"')"
    echo "Success Count: $(echo "$BODY" | jq -r '.successCount // "N/A"')"
    echo "Updated Count: $(echo "$BODY" | jq -r '.updatedCount // "N/A"')"
    echo "Error Count: $(echo "$BODY" | jq -r '.errorCount // "N/A"')"
    echo "Duration: $(echo "$BODY" | jq -r '.duration // "N/A"')"
    echo "Timestamp: $(echo "$BODY" | jq -r '.timestamp // "N/A"')"
  fi
elif [ "$HTTP_CODE" = "401" ]; then
  echo -e "${RED}❌ Unauthorized - Check your CRON_SECRET${NC}"
  exit 1
elif [ "$HTTP_CODE" = "500" ]; then
  echo -e "${RED}❌ Server Error${NC}"
  exit 1
else
  echo -e "${RED}❌ Unexpected status code${NC}"
  exit 1
fi

