// Custom error class so we can attach an HTTP status + a machine-readable code
// (matches the error codes table in contract.md) to any error we throw on purpose.
export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}