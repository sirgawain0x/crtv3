/** Posts a public status via Mastodon REST API (same flow as @reality.eth/mastodon-bot). */
export async function postMastodonStatus(status: string): Promise<void> {
  const instance = process.env.MASTODON_INSTANCE_URL?.trim().replace(/\/$/, "");
  const token = process.env.MASTODON_ACCESS_TOKEN?.trim();

  if (!instance || !token) {
    throw new Error("Mastodon credentials are not configured");
  }

  const response = await fetch(`${instance}/api/v1/statuses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status,
      visibility: "public",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Mastodon post failed (${response.status}): ${text.slice(0, 500)}`);
  }
}
