import { CapacitorHttp, type HttpOptions } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { COULD_NOT_REACH_GITHUB, friendlyError } from '../lib/errors';
import { asString, isRecord } from '../lib/guards';
import { asTokenResponse, parseHttpData } from '../lib/httpBody';
import type { DeviceFlowResponse, GitHubUser, TokenResponse } from '../types';

const CLIENT_ID = 'Iv23ctaY9RgSDdphWZmJ';
const REPO = 'pruthvi895/studio-cloud';
const TOKEN_KEY = 'github_token';
const USER_AGENT = 'CasebookStudio';

const DEVICE_CODE_URL = 'https://github.com/login/device/code';
const ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';

export class GitHubService {
  private static token: string | null = null;
  private static authListeners = new Set<() => void>();

  static onAuthLost(listener: () => void): () => void {
    this.authListeners.add(listener);
    return () => {
      this.authListeners.delete(listener);
    };
  }

  static async initialize(): Promise<void> {
    const { value } = await Preferences.get({ key: TOKEN_KEY });
    this.token = value && value.trim() ? value : null;
  }

  static async startDeviceFlow(): Promise<DeviceFlowResponse> {
    try {
      const response = await CapacitorHttp.post(
        formRequest(DEVICE_CODE_URL, { client_id: CLIENT_ID })
      );

      if (response.status !== 200) {
        throw new Error('GitHub could not start sign-in. Try again.');
      }

      return asDeviceFlow(parseHttpData(response.data));
    } catch (error) {
      throw new Error(friendlyError(error, COULD_NOT_REACH_GITHUB));
    }
  }

  static async pollForToken(deviceCode: string): Promise<TokenResponse> {
    try {
      const response = await CapacitorHttp.post(
        formRequest(ACCESS_TOKEN_URL, {
          client_id: CLIENT_ID,
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        })
      );

      const body = asTokenResponse(response.data);
      if ((response.status < 200 || response.status >= 300) && !body.access_token && !body.error) {
        throw new Error(COULD_NOT_REACH_GITHUB);
      }
      return body;
    } catch (error) {
      throw new Error(friendlyError(error, COULD_NOT_REACH_GITHUB));
    }
  }

  static async verifyAndStoreToken(accessToken: string): Promise<GitHubUser> {
    try {
      return await this.readAndStoreUser(accessToken);
    } catch (error) {
      throw new Error(friendlyError(error, 'Could not verify the account.'));
    }
  }

  private static async readAndStoreUser(accessToken: string): Promise<GitHubUser> {
    const token = accessToken.trim();
    if (!token) throw new Error('Invalid token');

    const response = await CapacitorHttp.get({
      url: 'https://api.github.com/user',
      headers: apiHeaders(token),
      params: {},
    });

    const parsed = parseHttpData(response.data);
    if (response.status !== 200 || !isRecord(parsed) || typeof parsed.login !== 'string' || !parsed.login) {
      throw new Error('Invalid token');
    }

    if (parsed.login !== 'pruthvi895') {
      throw new Error('This app is private to pruthvi895');
    }

    const avatar = asString(parsed.avatar_url);
    const name = asString(parsed.name);
    const id = typeof parsed.id === 'number' ? parsed.id : Number(parsed.id) || 0;
    await Preferences.set({ key: TOKEN_KEY, value: token });
    this.token = token;

    return {
      login: parsed.login,
      id,
      avatar_url: avatar,
      ...(name ? { name } : {}),
    };
  }

  static installSmokeSession(): void {
    if (import.meta.env.VITE_SMOKE !== 'true') return;
    this.token = 'smoke-sample';
  }

  static async signOut(): Promise<void> {
    this.token = null;
    try {
      await Preferences.remove({ key: TOKEN_KEY });
    } catch {
      // The in-memory session is already gone. A failed disk delete must not
      // keep the signed-in shell on screen.
    }
  }

  static getToken(): string | null {
    return this.token;
  }

  static isAuthenticated(): boolean {
    return this.token != null && this.token.trim() !== '';
  }

  static async fetchFile(path: string): Promise<unknown> {
    if (!this.isAuthenticated() || !this.token) {
      throw new Error('Not authenticated');
    }

    const response = await CapacitorHttp.get({
      url: `https://api.github.com/repos/${REPO}/contents/${path}`,
      headers: {
        ...apiHeaders(this.token),
        Accept: 'application/vnd.github.raw+json',
      },
      params: {},
    });

    if (response.status === 401) {
      await this.loseAuth();
      throw new Error('Authentication failed');
    }

    if (response.status === 404) {
      return null;
    }

    if (response.status !== 200) {
      throw new Error(`Failed to fetch ${path}`);
    }

    return parseHttpData(response.data);
  }

  static async writeFile(path: string, content: unknown, message: string): Promise<void> {
    if (!this.isAuthenticated() || !this.token) {
      throw new Error('Not authenticated');
    }

    const contentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(content))));

    const response = await CapacitorHttp.put({
      url: `https://api.github.com/repos/${REPO}/contents/${path}`,
      headers: {
        ...apiHeaders(this.token),
        'Content-Type': 'application/json',
      },
      params: {},
      data: {
        message,
        content: contentBase64,
      },
    });

    if (response.status === 401) {
      await this.loseAuth();
      throw new Error('Authentication failed');
    }

    if (response.status !== 201 && response.status !== 200) {
      throw new Error(`Failed to write ${path}`);
    }
  }

  private static async loseAuth(): Promise<void> {
    this.token = null;
    try {
      await Preferences.remove({ key: TOKEN_KEY });
    } catch {
      // Still tell the UI. The token is no longer usable.
    }
    for (const listener of this.authListeners) listener();
  }
}

function formRequest(url: string, data: Record<string, string>): HttpOptions {
  return {
    url,
    headers: formHeaders(),
    // Always an object. The Capacitor 3 community HTTP plugin calls params.keys()
    // and rejects with the message "NullPointerException" when this field is omitted.
    params: {},
    data,
  };
}

function formHeaders(): Record<string, string> {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': USER_AGENT,
  };
}

function apiHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': USER_AGENT,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function asDeviceFlow(data: unknown): DeviceFlowResponse {
  if (!isRecord(data)) throw new Error('GitHub did not return a device code.');
  const userCode = asString(data.user_code);
  const deviceCode = asString(data.device_code);
  if (!userCode || !deviceCode) throw new Error('GitHub did not return a device code.');
  const interval = Number(data.interval);
  const expires = Number(data.expires_in);
  const verification = asString(data.verification_uri) || 'https://github.com/login/device';
  const complete = asString(data.verification_uri_complete);
  return {
    device_code: deviceCode,
    user_code: userCode,
    verification_uri: verification,
    ...(complete ? { verification_uri_complete: complete } : {}),
    expires_in: Number.isFinite(expires) && expires > 0 ? expires : 900,
    interval: Number.isFinite(interval) && interval > 0 ? interval : 5,
  };
}
