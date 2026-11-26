import {
  assertStreamSnapshot,
  type StreamSnapshot,
} from "./stream-replacements";
const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;
/** The artifact contains public snapshots only; both ingest keys are read inside the transaction. */
export function renderStreamCutoverSql(
  snapshots: StreamSnapshot[],
  mode: "apply" | "rollback",
) {
  if (
    !snapshots.length ||
    snapshots.length > 50 ||
    new Set(snapshots.map((s) => s.id)).size !== snapshots.length
  )
    throw new Error("A unique reviewed channel catalog is required");
  snapshots.forEach(assertStreamSnapshot);
  const ids = snapshots.map((s) => `${literal(s.id)}::uuid`).join(",");
  const blocks = snapshots
    .map(
      (snapshot) => `DO $channel$
DECLARE s public.streams%ROWTYPE; r public.frameworks_stream_replacements%ROWTYPE; e public.streams%ROWTYPE;
BEGIN
 SELECT * INTO STRICT s FROM public.streams WHERE id=${literal(snapshot.id)}::uuid FOR UPDATE;
 SELECT * INTO STRICT r FROM public.frameworks_stream_replacements WHERE stream_row_id=s.id FOR UPDATE;
 SELECT * INTO e FROM jsonb_populate_record(NULL::public.streams,${literal(JSON.stringify(snapshot))}::jsonb);
 IF r.source_snapshot IS DISTINCT FROM ${literal(JSON.stringify(snapshot))}::jsonb THEN RAISE EXCEPTION 'Channel reservation snapshot changed'; END IF;
 IF s.creator_id IS DISTINCT FROM e.creator_id OR s.is_live OR s.save_recording IS DISTINCT FROM e.save_recording OR s.requires_metoken IS DISTINCT FROM e.requires_metoken OR s.metoken_price IS DISTINCT FROM e.metoken_price THEN RAISE EXCEPTION 'Channel owner, live state or access settings changed'; END IF;
 ${
   mode === "apply"
     ? `
 IF r.state='applied' THEN
  IF s.provider IS DISTINCT FROM 'frameworks' OR s.stream_id IS DISTINCT FROM r.frameworks_stream_id OR s.playback_id IS DISTINCT FROM r.frameworks_playback_id OR s.stream_key IS DISTINCT FROM r.frameworks_stream_key THEN RAISE EXCEPTION 'Applied channel identity drift'; END IF;
 ELSE
  IF r.state<>'ready' OR s.stream_id IS DISTINCT FROM e.stream_id OR s.playback_id IS DISTINCT FROM e.playback_id OR s.updated_at IS DISTINCT FROM e.updated_at OR s.stream_key IS DISTINCT FROM r.source_stream_key OR s.provider IS DISTINCT FROM r.source_provider THEN RAISE EXCEPTION 'Channel is not ready or source identity changed'; END IF;
  UPDATE public.streams SET provider='frameworks',
   livepeer_stream_id=CASE WHEN e.stream_id=r.frameworks_stream_id THEN livepeer_stream_id ELSE e.stream_id END,
   livepeer_playback_id=CASE WHEN e.playback_id=r.frameworks_playback_id THEN livepeer_playback_id ELSE e.playback_id END,
   stream_id=r.frameworks_stream_id,playback_id=r.frameworks_playback_id,stream_key=r.frameworks_stream_key,
   frameworks_stream_id=r.frameworks_stream_id,frameworks_playback_id=r.frameworks_playback_id,updated_at=now() WHERE id=s.id;
  UPDATE public.frameworks_stream_replacements SET state='applied',updated_at=now() WHERE stream_row_id=s.id;
 END IF;`
     : `
 IF r.state<>'applied' OR s.provider IS DISTINCT FROM 'frameworks' OR s.stream_id IS DISTINCT FROM r.frameworks_stream_id OR s.playback_id IS DISTINCT FROM r.frameworks_playback_id OR s.stream_key IS DISTINCT FROM r.frameworks_stream_key THEN RAISE EXCEPTION 'Channel rollback identity changed'; END IF;
 UPDATE public.streams SET provider=r.source_provider,stream_id=e.stream_id,playback_id=e.playback_id,stream_key=r.source_stream_key,updated_at=now() WHERE id=s.id;
 -- Advance only the reservation timestamp to the exact restored row version.
 -- A later attempt requires a fresh reviewed snapshot; prior artifacts stay stale.
 UPDATE public.frameworks_stream_replacements SET state='ready',source_snapshot=jsonb_set(source_snapshot,'{updated_at}',to_jsonb(now())),updated_at=now() WHERE stream_row_id=s.id;`
 }
END $channel$;`,
    )
    .join("\n");
  return `BEGIN;\nLOCK TABLE public.streams,public.frameworks_stream_replacements IN SHARE ROW EXCLUSIVE MODE;\nDO $catalog$ BEGIN IF EXISTS(SELECT 1 FROM public.streams WHERE id NOT IN (${ids})) OR (SELECT count(*) FROM public.streams)<>${snapshots.length} THEN RAISE EXCEPTION 'Reviewed channel catalog changed'; END IF; END $catalog$;\n${blocks}\nCOMMIT;\n`;
}
