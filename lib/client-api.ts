export async function notificationApi<T>(headers: Record<string, string>, data?: unknown): Promise<T> {
  const response = await fetch("/api/notifications", {
    method: data === undefined ? "GET" : "POST",
    headers: { ...headers, ...(data === undefined ? {} : { "Content-Type": "application/json" }) },
    cache: "no-store",
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "That action could not be completed.");
  return result as T;
}
