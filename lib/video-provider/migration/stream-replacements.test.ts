import { expect, it, vi } from "vitest";
import {
  prepareStreamReplacement,
  type Replacement,
  type ReplacementLedger,
  type StreamSnapshot,
} from "./stream-replacements";
const snapshot: StreamSnapshot = {
  id: "11111111-1111-4111-8111-111111111111",
  creator_id: `0x${"a".repeat(40)}`,
  stream_id: "old-stream",
  playback_id: "old-play",
  is_live: false,
  save_recording: true,
  requires_metoken: false,
  metoken_price: null,
  updated_at: "2026-11-24T00:00:00Z",
};
const target = {
  streamId: Buffer.from(`Stream:${snapshot.id}`).toString("base64"),
  playbackId: "New_Play",
  streamKey: "PRIVATE_NEW_KEY",
};
function fixture(state: Replacement["state"] = "prepared") {
  const record: Replacement = {
    stream_row_id: snapshot.id,
    source_snapshot: snapshot,
    source_provider: null,
    source_stream_key: "PRIVATE_OLD_KEY",
    state,
    frameworks_stream_id: null,
    frameworks_playback_id: null,
    frameworks_stream_key: null,
  };
  const ledger: ReplacementLedger = {
    find: vi.fn(async () => record),
    reserve: vi.fn(async () => record),
    claim: vi.fn(async () => true),
    ready: vi.fn(async () => {}),
    ambiguous: vi.fn(async () => {}),
  };
  return {
    ledger,
    create: vi.fn(async () => target),
    verifyExisting: vi.fn(async () => target),
    snapshot,
  };
}
it("claims before creation and never returns either ingest key", async () => {
  const input = fixture();
  const result = await prepareStreamReplacement(input);
  expect(result).toEqual({
    state: "ready",
    streamId: target.streamId,
    playbackId: target.playbackId,
  });
  expect(input.ledger.claim).toHaveBeenCalledOnce();
  expect(input.ledger.ready).toHaveBeenCalledWith(snapshot.id, target);
  expect(
    vi.mocked(input.ledger.claim).mock.invocationCallOrder[0],
  ).toBeLessThan(input.create.mock.invocationCallOrder[0]);
  expect(JSON.stringify(result)).not.toContain("PRIVATE");
});
it.each(["creating", "ambiguous"] as const)(
  "never recreates a %s reservation",
  async (state) => {
    const input = fixture(state);
    await expect(prepareStreamReplacement(input)).rejects.toThrow(
      "reconciliation",
    );
    expect(input.create).not.toHaveBeenCalled();
  },
);
it("does not create after losing the atomic claim", async () => {
  const input = fixture();
  vi.mocked(input.ledger.claim).mockResolvedValue(false);
  await expect(prepareStreamReplacement(input)).rejects.toThrow(
    "reconciliation",
  );
  expect(input.create).not.toHaveBeenCalled();
});
it("marks uncertain creation ambiguous and sanitizes the error", async () => {
  const input = fixture();
  input.create.mockRejectedValue(new Error("PRIVATE_PROVIDER_URL"));
  await expect(prepareStreamReplacement(input)).rejects.toThrow(
    "Channel preparation is uncertain",
  );
  expect(input.ledger.ambiguous).toHaveBeenCalledWith(snapshot.id);
  expect(input.create).toHaveBeenCalledOnce();
});
it("rejects live channels and changed source snapshots before creation", async () => {
  const input = fixture();
  await expect(
    prepareStreamReplacement({
      ...input,
      snapshot: { ...snapshot, is_live: true },
    }),
  ).rejects.toThrow("offline");
  await expect(
    prepareStreamReplacement({
      ...input,
      snapshot: { ...snapshot, creator_id: `0x${"b".repeat(40)}` },
    }),
  ).rejects.toThrow("differs");
  expect(input.create).not.toHaveBeenCalled();
});
it("verifies an existing FrameWorks channel instead of rotating its key", async () => {
  const input = fixture();
  input.snapshot = { ...snapshot, stream_id: target.streamId };
  vi.mocked(input.ledger.find).mockResolvedValue({
    ...((await input.ledger.find(snapshot.id)) as Replacement),
    source_snapshot: input.snapshot,
  });
  await prepareStreamReplacement(input);
  expect(input.verifyExisting).toHaveBeenCalledOnce();
  expect(input.create).not.toHaveBeenCalled();
});
