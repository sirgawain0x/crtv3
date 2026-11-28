const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Public v1 webhooks carry raw UUIDs; GraphQL createStream returns
 * base64("Stream:<uuid>"), which is the ID our existing stream rows store.
 * Preserve encoded and other opaque IDs; never decode IDs of another type.
 */
export function toFrameworksStreamNodeId(streamId: string): string {
  const id = streamId.trim();
  return UUID.test(id)
    ? Buffer.from(`Stream:${id.toLowerCase()}`, "utf8").toString("base64")
    : id;
}
