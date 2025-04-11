#!/bin/bash

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

URL="http://localhost:3000/api/auth/test-rate-limit"
TOTAL_REQUESTS=15
DELAY=0 # No delay between requests

echo -e "\n${BLUE}🚀 Starting rate limit test...${NC}\n"

for i in $(seq 1 $TOTAL_REQUESTS); do
  # Format request number with padding
  printf -v REQ_NUM "%2d" $i
  
  # Make the request and capture headers
  RESPONSE=$(curl -si $URL)
  
  # Extract status code and headers
  STATUS=$(echo "$RESPONSE" | grep "HTTP/" | cut -d' ' -f2)
  REMAINING=$(echo "$RESPONSE" | grep -i "x-ratelimit-remaining:" | cut -d' ' -f2 | tr -d '\r')
  LIMIT=$(echo "$RESPONSE" | grep -i "x-ratelimit-limit:" | cut -d' ' -f2 | tr -d '\r')
  RESET=$(echo "$RESPONSE" | grep -i "x-ratelimit-reset:" | cut -d' ' -f2 | tr -d '\r')
  
  # Convert reset timestamp to readable format if it exists
  if [ ! -z "$RESET" ]; then
    RESET_TIME=$(date -r $(($RESET/1000)) "+%H:%M:%S")
  else
    RESET_TIME="N/A"
  fi
  
  # Choose color based on status
  if [ "$STATUS" = "200" ]; then
    COLOR=$GREEN
  else
    COLOR=$RED
  fi
  
  # Print formatted output with raw header values for debugging
  echo -e "${COLOR}Request #$REQ_NUM - Status: $STATUS${NC}"
  echo -e "${COLOR}Headers found: X-RateLimit-Remaining: '$REMAINING', X-RateLimit-Limit: '$LIMIT', Reset: '$RESET_TIME'${NC}"
  
  # If we get a 429, show the response body
  if [ "$STATUS" = "429" ]; then
    BODY=$(echo "$RESPONSE" | tail -n1)
    echo -e "${RED}Error: $BODY${NC}"
  fi
  
  # No delay between requests to ensure we hit the rate limit
done

echo -e "\n${BLUE}✨ Test completed${NC}\n" 