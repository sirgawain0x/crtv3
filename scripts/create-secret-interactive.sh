#!/bin/bash

# Interactive script to create the Goldsky secret
# This will guide you through the interactive process

echo "🔐 Creating Goldsky Secret for Supabase"
echo "========================================"
echo ""
echo "This will start an interactive process."
echo "Follow these steps:"
echo ""
echo "1. When prompted 'Select a secret type', use arrow keys to select 'jdbc' and press Enter"
echo "2. When prompted for the secret name, enter: SUPABASE_CONNECTION"
echo "3. When prompted for the JDBC connection string, enter:"
echo "   postgresql://postgres:WQWvx9tfg5pny@db.zdeiezfoemibjgrkyzvs.supabase.co:5432/postgres"
echo ""
read -p "Press Enter to start the interactive secret creation..."
echo ""

goldsky secret create

