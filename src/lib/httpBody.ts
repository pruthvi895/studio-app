import { asString, isRecord } from './guards';
import type { TokenResponse } from '../types';

export function parseHttpData(data: unknown): unknown {
  if (typeof data !== 'string') return data;
  const trimmed = data.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return trimmed;
  }
}

export function asTokenResponse(data: unknown): TokenResponse {
  const parsed = parseHttpData(data);
  if (typeof parsed === 'string') return tokenFromForm(parsed);
  if (!isRecord(parsed)) return {};
  const token = asString(parsed.access_token);
  const error = asString(parsed.error) || asString(parsed.pending);
  const description = asString(parsed.error_description);
  return {
    ...(token ? { access_token: token } : {}),
    ...(error ? { error } : {}),
    ...(description ? { error_description: description } : {}),
  };
}

function tokenFromForm(body: string): TokenResponse {
  const params = new URLSearchParams(body);
  const token = params.get('access_token') ?? '';
  const error = params.get('error') ?? '';
  const description = params.get('error_description') ?? '';
  return {
    ...(token ? { access_token: token } : {}),
    ...(error ? { error } : {}),
    ...(description ? { error_description: description } : {}),
  };
}
