/** Thrown when a webhook handler should fail so FrameWorks can retry (do not dedupe). */
export class FrameworksWebhookRetryableError extends Error {
  readonly code = "FRAMEWORKS_WEBHOOK_RETRYABLE" as const;

  constructor(message: string) {
    super(message);
    this.name = "FrameworksWebhookRetryableError";
  }
}
