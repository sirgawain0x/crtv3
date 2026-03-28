# Schema Alignment Notes

## Existing Supabase Table Schema

The `metoken_subscribes` table already exists with the following schema (from old subgraph pipeline):

- `vid` (bigint) - Version ID (auto-managed by Goldsky)
- `block` (integer) - Block number
- `id` (bytea) - Primary key (transaction hash as bytes)
- `me_token` (bytea) - MeToken contract address
- `owner` (bytea) - Owner address
- `minted` (numeric) - MeTokens minted
- `asset` (bytea) - Asset address
- `assets_deposited` (numeric) - Assets deposited
- `name` (text) - MeToken name
- `symbol` (text) - MeToken symbol
- `hub_id` (numeric) - Hub ID
- `block_number` (numeric) - Block number
- `block_timestamp` (numeric) - Unix timestamp (seconds)
- `transaction_hash` (bytea) - Transaction hash
- `_gs_chain` (text) - Chain identifier (auto-managed)
- `_gs_gid` (text) - Goldsky ID (auto-managed)

## Pipeline Output Schema

The Turbo pipeline outputs data matching this schema:

1. **ID**: Uses `transaction_hash` formatted as `\x...` (PostgreSQL bytea format, one Subscribe event per transaction)
2. **Addresses**: All addresses (`me_token`, `owner`, `asset`, `transaction_hash`) formatted as `\x...` strings
   - Format: `\x` + hex without `0x` prefix (e.g., `0x1234...` becomes `\x1234...`)
   - PostgreSQL sink should recognize this format and convert to bytea automatically
3. **Timestamps**: `block_timestamp` as numeric (Unix timestamp in seconds)
4. **Numeric fields**: All numeric fields (`minted`, `assets_deposited`, `hub_id`, `block_number`) as NUMERIC
5. **Text fields**: `name` and `symbol` as text
6. **Block**: `block` as integer (extracted from `block_number`)

## Bytea Conversion Approach

Since `_gs_hex_to_byte()` and `unhex()` are not available in Turbo SQL transforms, the pipeline uses TypeScript to format hex strings in PostgreSQL's bytea format:

- Input: `0x1234abcd...` (hex string with 0x prefix)
- Output: `\x1234abcd...` (PostgreSQL bytea format without 0x prefix)

PostgreSQL should automatically recognize this format and convert to bytea. If this doesn't work, we may need to:
1. Create a PostgreSQL function/trigger to handle conversion
2. Use a database view that converts on read
3. Alter the table schema (not recommended if other systems depend on bytea)

## Key Differences from Original Plan

1. **ID Format**: Changed from composite string (`tx_hash-log_index`) to `transaction_hash` as bytea
   - Reason: Matches existing schema
   - Assumption: One Subscribe event per transaction (valid for MeToken creation)

2. **Missing `log_index`**: Not included in output
   - Reason: Column doesn't exist in existing schema
   - Impact: If multiple Subscribe events exist in same transaction, only one will be stored

3. **Bytea Columns**: All addresses stored as bytea instead of text
   - Reason: Matches existing schema
   - Impact: Application code must convert bytea back to hex strings when reading

## Application Code Updates

The `getSubscribeEvents()` method in `lib/sdk/supabase/metokens.ts` has been updated to:

1. **Convert bytea to hex**: All bytea columns are converted back to hex strings with `0x` prefix
2. **Convert numeric timestamps**: Unix timestamps are converted to ISO strings
3. **Handle missing log_index**: Defaults to 0 if not present

## Filtering Considerations

When filtering by `meToken`:
- The `me_token` column is bytea
- Supabase PostgREST may auto-convert hex strings to bytea
- If auto-conversion doesn't work, we may need to use:
  - RPC function with raw SQL
  - Direct SQL query via Supabase client
  - Convert hex to bytea format manually

## Testing Required

After deployment, verify:

1. ✅ Data writes correctly to bytea columns
2. ✅ Data reads correctly (bytea → hex conversion works)
3. ✅ Filtering by meToken works (bytea comparison)
4. ✅ Sorting by block_timestamp works (numeric comparison)
5. ✅ Pagination works correctly

## Potential Issues

1. **Multiple events per transaction**: If multiple Subscribe events exist in the same transaction, only one will be stored (ID collision)
   - Solution: Monitor for this case and adjust ID strategy if needed

2. **Bytea filtering**: If Supabase doesn't auto-convert hex to bytea for filtering:
   - Solution: Create an RPC function or use raw SQL queries

3. **Timestamp format**: Application expects ISO strings but database stores numeric
   - Solution: Conversion handled in `getSubscribeEvents()` method
