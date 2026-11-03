export class NotificationError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "NotificationError";
  }
}
