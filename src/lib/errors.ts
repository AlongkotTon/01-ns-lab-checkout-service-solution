/**
 * Errors that carry an HTTP status. The error handler reads `.status`;
 * anything else falls back to 400 (bad request).
 */
export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** 404 — a referenced entity (e.g. a SKU) does not exist. */
export class NotFoundError extends HttpError {
  constructor(message: string) {
    super(404, message);
  }
}

/** 409 — the request conflicts with current state (stock, idempotency reuse). */
export class ConflictError extends HttpError {
  constructor(message: string) {
    super(409, message);
  }
}
