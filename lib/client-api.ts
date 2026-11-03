export async function api(path: string, data?: unknown) {
  const response = await fetch(`/api/notifications/${path}`, {
    method: data === undefined ? "GET" : "POST",
    headers: data === undefined ? {} : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "That action could not be completed.");
  return result;
}
