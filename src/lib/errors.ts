export const COULD_NOT_REACH_GITHUB = 'Could not reach GitHub. Check the connection and try again.';

const RAW_EXCEPTION = /(?:^|[^A-Za-z0-9_])(?:[a-z_][\w$]*\.)*(?:[A-Z][A-Za-z0-9_]*)?(?:Exception|Error)\b/;

export function friendlyError(error: unknown, fallback: string): string {
  const message = readErrorMessage(error);
  if (!message || isRawException(message)) return fallback;
  return message;
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.trim();
  if (typeof error === 'string') return error.trim();
  return '';
}

function isRawException(message: string): boolean {
  if (/^(null|undefined)$/i.test(message)) return true;
  return RAW_EXCEPTION.test(` ${message}`);
}

export function summarizeErrors(errors: string[]): string | null {
  const unique: string[] = [];
  for (const error of errors) {
    const message = error.trim();
    if (!message || unique.includes(message)) continue;
    unique.push(message);
  }
  if (unique.length === 0) return null;
  if (unique.length === 1) return unique[0];
  return `${unique[0]} (+${unique.length - 1} more)`;
}
