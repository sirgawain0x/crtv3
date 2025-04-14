export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401,
    public details?: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
