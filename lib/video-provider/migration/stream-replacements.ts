import type { CreatedStream } from "../types";
export type StreamSnapshot = {
  id: string;
  creator_id: string;
  stream_id: string;
  playback_id: string;
  is_live: boolean;
  save_recording: boolean | null;
  requires_metoken: boolean | null;
  metoken_price: number | null;
  updated_at: string;
};
export type Replacement = {
  stream_row_id: string;
  source_snapshot: StreamSnapshot;
  source_provider: string | null;
  source_stream_key: string;
  state: "prepared" | "creating" | "ready" | "ambiguous" | "applied";
  frameworks_stream_id: string | null;
  frameworks_playback_id: string | null;
  frameworks_stream_key: string | null;
};
export type ReplacementLedger = {
  find: (id: string) => Promise<Replacement | null>;
  reserve: (snapshot: StreamSnapshot) => Promise<Replacement>;
  claim: (id: string) => Promise<boolean>;
  ready: (id: string, target: CreatedStream) => Promise<void>;
  ambiguous: (id: string) => Promise<void>;
};
export function isFrameworksStreamId(id: string) {
  const decoded = Buffer.from(id, "base64").toString("utf8");
  return (
    Buffer.from(decoded).toString("base64") === id &&
    /^Stream:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      decoded,
    )
  );
}
export function assertStreamSnapshot(
  value: unknown,
): asserts value is StreamSnapshot {
  const s = value as StreamSnapshot;
  const fields = [
    "id",
    "creator_id",
    "stream_id",
    "playback_id",
    "is_live",
    "save_recording",
    "requires_metoken",
    "metoken_price",
    "updated_at",
  ];
  if (
    !s ||
    Object.keys(s).length !== fields.length ||
    Object.keys(s).some((key) => !fields.includes(key))
  )
    throw new Error("A reviewed offline channel snapshot is required");
  if (
    !s ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.id) ||
    !/^0x[0-9a-f]{40}$/i.test(s.creator_id) ||
    typeof s.stream_id !== "string" ||
    !s.stream_id ||
    typeof s.playback_id !== "string" ||
    !s.playback_id ||
    s.is_live !== false ||
    !Number.isFinite(Date.parse(s.updated_at)) ||
    ![true, false, null].includes(s.save_recording) ||
    ![true, false, null].includes(s.requires_metoken) ||
    !(
      s.metoken_price === null ||
      (typeof s.metoken_price === "number" &&
        Number.isFinite(s.metoken_price) &&
        s.metoken_price >= 0)
    )
  )
    throw new Error("A reviewed offline channel snapshot is required");
}
/** Reserve before any upstream creation; all uncertain outcomes require reconciliation. */
export async function prepareStreamReplacement(input: {
  snapshot: StreamSnapshot;
  ledger: ReplacementLedger;
  create: () => Promise<CreatedStream>;
  verifyExisting: (record: Replacement) => Promise<CreatedStream>;
}) {
  assertStreamSnapshot(input.snapshot);
  const record =
    (await input.ledger.find(input.snapshot.id)) ??
    (await input.ledger.reserve(input.snapshot));
  const keys = Object.keys(input.snapshot) as Array<keyof StreamSnapshot>;
  if (keys.some((key) => record.source_snapshot[key] !== input.snapshot[key]))
    throw new Error("Channel snapshot differs from its reservation");
  if (record.state === "ready" || record.state === "applied")
    return {
      state: record.state,
      streamId: record.frameworks_stream_id,
      playbackId: record.frameworks_playback_id,
    };
  if (
    record.state !== "prepared" ||
    !(await input.ledger.claim(record.stream_row_id))
  )
    throw new Error(
      "Channel needs reconciliation; no creation retry was attempted",
    );
  try {
    const target = isFrameworksStreamId(record.source_snapshot.stream_id)
      ? await input.verifyExisting(record)
      : await input.create();
    if (
      !isFrameworksStreamId(target.streamId) ||
      !target.playbackId ||
      !target.streamKey
    )
      throw new Error("Provider returned incomplete channel identity");
    await input.ledger.ready(record.stream_row_id, target);
    return {
      state: "ready" as const,
      streamId: target.streamId,
      playbackId: target.playbackId,
    };
  } catch {
    await input.ledger.ambiguous(record.stream_row_id);
    throw new Error(
      "Channel preparation is uncertain; inspect its reservation before continuing",
    );
  }
}
