# MeTokens Subgraph Pipeline Deployment Guide

This guide explains how to deploy pipelines that sync data from the MeTokens subgraph to PostgreSQL.

## Overview

These pipelines sync different entities from the MeTokens subgraph into separate PostgreSQL tables:

1. **subscribes** - MeToken creation events
2. **mints** - MeToken minting events  
3. **burns** - MeToken burning events
4. **hub** - Hub information

## Prerequisites

1. **Subgraph must be working** - The subgraph must be properly indexed and working. Check the Goldsky dashboard to ensure there are no "Failed to transact block operations" errors.

2. **PostgreSQL Secret** - You need a PostgreSQL secret configured in Goldsky:
   ```bash
   goldsky secret create --name POSTGRES_SECRET_CMJIQCIFZ0 --value '{
     "type": "jdbc",
     "protocol": "postgresql",
     "host": "your-db-host.com",
     "port": 5432,
     "databaseName": "your-database",
     "user": "your-user",
     "password": "your-password"
   }'
   ```

3. **PostgreSQL Permissions** - Ensure the database user has the required permissions:
   ```sql
   CREATE ROLE goldsky_writer WITH LOGIN PASSWORD 'your-password';
   GRANT CREATE ON DATABASE your_database TO goldsky_writer;
   GRANT USAGE, CREATE ON SCHEMA public TO goldsky_writer;
   ```

## Pipeline Configuration Options

You have two options:

### Option 1: Combined Pipeline (Recommended)
**Single pipeline with all entities** (`pipeline-metokens-all.yaml`)

- **One pipeline** manages all four entities
- **More efficient** - single pipeline to monitor and manage
- **Easier deployment** - deploy once instead of four times
- **All entities sync together**

### Option 2: Separate Pipelines
**Four separate pipelines** (one per entity)

- **Individual control** - start/stop each entity independently
- **Better isolation** - if one entity fails, others continue
- **Easier debugging** - isolate issues to specific entities
- **Flexible resource allocation** - different sizes per entity

### Pipeline Files

#### Combined Pipeline
- **`pipeline-metokens-all.yaml`** - All entities in one pipeline
  - `subscribes` → `metoken_subscribes` table
  - `mints` → `metoken_mints` table
  - `burns` → `metoken_burns` table
  - `hub` → `metoken_hubs` table

#### Separate Pipelines
- **`pipeline-metokens-subscribes.yaml`** - Subscribes entity only
  - **Entity**: `subscribes`
  - **Table**: `metoken_subscribes`
  - **Data**: MeToken creation events with fields like `meToken`, `hubId`, `assetsDeposited`, `blockTimestamp`, etc.

- **`pipeline-metokens-mints.yaml`** - Mints entity only
  - **Entity**: `mints`
  - **Table**: `metoken_mints`
  - **Data**: Minting events with fields like `meToken`, `user`, `collateralAmount`, `meTokenAmount`, `timestamp`, etc.

- **`pipeline-metokens-burns.yaml`** - Burns entity only
  - **Entity**: `burns`
  - **Table**: `metoken_burns`
  - **Data**: Burning events with fields like `meToken`, `user`, `meTokenAmount`, `collateralAmount`, `timestamp`, etc.

- **`pipeline-metokens-hubs.yaml`** - Hubs entity only
  - **Entity**: `hub`
  - **Table**: `metoken_hubs`
  - **Data**: Hub information with fields like `id`, `asset`, `vault`, `owner`, etc.

## Deployment Steps

### Option 1: Deploy Combined Pipeline (Recommended)

To deploy all entities in a single pipeline:

```bash
goldsky pipeline apply pipeline-metokens-all.yaml --status ACTIVE
```

This creates one pipeline that syncs all four entities to their respective tables.

### Option 2: Deploy Separate Pipelines

To deploy each entity as a separate pipeline:

```bash
# Deploy subscribes pipeline
goldsky pipeline apply pipeline-metokens-subscribes.yaml --status ACTIVE

# Deploy mints pipeline
goldsky pipeline apply pipeline-metokens-mints.yaml --status ACTIVE

# Deploy burns pipeline
goldsky pipeline apply pipeline-metokens-burns.yaml --status ACTIVE

# Deploy hubs pipeline
goldsky pipeline apply pipeline-metokens-hubs.yaml --status ACTIVE
```

**Note**: You can mix and match - use the combined pipeline for some entities and separate pipelines for others if needed.

### Monitor Pipeline Status

To monitor a pipeline:

**Combined pipeline:**
```bash
goldsky pipeline monitor pipeline-metokens-all
```

**Separate pipelines:**
```bash
goldsky pipeline monitor pipeline-metokens-subscribes
goldsky pipeline monitor pipeline-metokens-mints
goldsky pipeline monitor pipeline-metokens-burns
goldsky pipeline monitor pipeline-metokens-hubs
```

Or check the dashboard:
- Go to https://app.goldsky.com/dashboard/pipelines
- Find your pipeline(s) in the list
- Click to view details and monitor progress

## Expected Database Tables

After deployment, you should see these tables created in your PostgreSQL database:

- `metoken_subscribes` - MeToken creation events
- `metoken_mints` - Minting events
- `metoken_burns` - Burning events
- `metoken_hubs` - Hub information

## Important Notes

### 1. Fix Subgraph Errors First
**Before deploying pipelines**, ensure the subgraph is working correctly. If you see "Failed to transact block operations" errors in the Goldsky dashboard:
- Check the subgraph deployment status
- Review subgraph logs for errors
- Reset or redeploy the subgraph if needed
- Pipelines will not work if the subgraph is failing

### 2. Pipeline Independence (Separate Pipelines Only)

If using separate pipelines, each runs independently:
- You can start/stop them individually
- They can have different resource sizes
- They write to separate tables
- Monitoring and debugging is easier

If using the combined pipeline:
- All entities sync together
- Single pipeline to monitor and manage
- More efficient resource usage
- All entities share the same resource size

### 3. Resource Sizing
All pipelines are configured with `resource_size: s` (small). You can increase this if needed:
- `s` - Small (default)
- `m` - Medium
- `l` - Large
- `xl` - Extra Large

### 4. Automatic Table Creation
Goldsky will automatically create the tables if they don't exist. The schema will match the subgraph entity structure.

### 5. Data Deduplication
By default, pipelines deduplicate data on the `id` field, keeping only the latest version of each entity. If you need historical data, you can modify the pipeline to use `vid` as the primary key.

## Troubleshooting

### Pipeline Fails to Start
- Check that the subgraph is working
- Verify the PostgreSQL secret is correct
- Ensure database permissions are set correctly
- Check pipeline logs in the Goldsky dashboard

### No Data in Tables
- Verify the subgraph has data for that entity
- Check pipeline status (should be `ACTIVE`)
- Review pipeline logs for errors
- Ensure the pipeline has processed some blocks

### Pipeline Stuck
- Check pipeline status: `goldsky pipeline get pipeline-name`
- Review logs for errors
- Try restarting: `goldsky pipeline restart pipeline-name --from-snapshot last`

## Updating Pipelines

To update a pipeline configuration:

```bash
goldsky pipeline apply pipeline-metokens-subscribes.yaml --from-snapshot last
```

The `--from-snapshot last` flag uses the last successful snapshot, avoiding re-processing all data.

## Pausing/Stopping Pipelines

To pause a pipeline (saves progress):
```bash
goldsky pipeline pause pipeline-metokens-subscribes
```

To stop a pipeline:
```bash
goldsky pipeline stop pipeline-metokens-subscribes
```

To restart:
```bash
goldsky pipeline start pipeline-metokens-subscribes
```

## Support Resources

- **Goldsky Documentation**: https://docs.goldsky.com/
- **Pipeline Reference**: https://docs.goldsky.com/reference/config-file/pipeline
- **Subgraph Entity Source**: https://docs.goldsky.com/mirror/sources/subgraph-entity
- **PostgreSQL Sink**: https://docs.goldsky.com/mirror/sinks/postgres

---

**Last Updated**: 2025-01-11
**Subgraph**: metokens/v0.0.1
**Project ID**: project_cmh0iv6s500dbw2p22vsxcfo6
