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
