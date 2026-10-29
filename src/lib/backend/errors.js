export class BackendError extends Error {
  /** @param {'stale'|'forbidden'|'invalid'|'auth'|'failed'} code */
  constructor(code, message, detail) {
    super(message);
    this.code = code;
    this.detail = detail;
  }
}
