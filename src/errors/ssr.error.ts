export class SsrError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SsrError';
  }
}
