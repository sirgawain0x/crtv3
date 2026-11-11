import {
  frameworksApiToken,
  frameworksGraphqlUrl,
} from "./config";
import { VideoProviderNotConfiguredError } from "./errors";

type GraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

export async function frameworksGraphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const token = frameworksApiToken();
  if (!token) {
    throw new VideoProviderNotConfiguredError("frameworks");
  }

  const res = await fetch(frameworksGraphqlUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(extraHeaders ?? {}),
    },
    body: JSON.stringify({ query, variables }),
  });

  const body = (await res.json()) as GraphqlResponse<T>;
  if (!res.ok || body.errors?.length) {
    const message =
      body.errors?.map((e) => e.message).join("; ") ||
      `FrameWorks GraphQL HTTP ${res.status}`;
    throw new Error(message);
  }
  if (!body.data) {
    throw new Error("FrameWorks GraphQL returned empty data");
  }
  return body.data;
}
