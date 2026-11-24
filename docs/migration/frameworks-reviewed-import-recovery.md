# Reviewed unfinished-upload recovery

The source `bd18c602-9323-4b6e-aa90-7f8e8065e416` failed during protected-session creation, before the importer received a session or uploaded any media parts. Its initial target IDs were absent. An exact, complete provider search identified the single unfinished object `202611241631464302d8bfdb5ddbae` / `mBdbNNDWgTBDqQfu`; its JWT policy was subsequently confirmed. The opaque upload session could not be recovered through the provider API.

This is a reviewed replacement, not a retry of that uncertain session. The original reservation remains ambiguous while a separate private recovery reservation is imported. Its original identities, checksum, size, reason and reviewer are immutable. The original provider object remains protected and retained.

Only the specific reviewed source and checksum are eligible. Preparation requires that its original provider object is still processing, lacks positive duration, and reconfirms JWT protection. The separate replacement uses the existing full checksum verification and upload state machine. An uncertain replacement cannot be automatically recreated.

Adoption requires a matching ready replacement, reconfirmed protection for both objects, and playable HLS. The database locks both records, checks source proof and original target identity, and refuses adoption if the original object has catalog or playback authority. Adoption atomically updates the migration mapping while preserving the original and replacement identities in the private audit. Repeated adoption validates the resulting mapping.

The operator is restricted to the existing signed platform admin in isolated QA. Public callers cannot read or mutate the recovery ledger, invoke its RPCs, or delete records. Apply `20261124183930_frameworks_import_reconciliation.sql` before deploying the operator. After adoption, include the source in the ordinary playback verification batch and final mapping export.
