import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";

export async function sha256FileOnDisk(
  absolutePath: string,
): Promise<{ sha256: string; sizeBytes: number }> {
  const hash = createHash("sha256");
  let sizeBytes = 0;
  const stream = createReadStream(absolutePath);
  for await (const chunk of stream) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    hash.update(buf);
    sizeBytes += buf.length;
  }
  return { sha256: hash.digest("hex"), sizeBytes };
}
