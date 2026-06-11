import axios from 'axios';
import {config} from '@/config';

export type GmailTokenExchangeResult = {
  accessToken: string;
  expiresInSec: number;
  scope?: string;
  refreshToken?: string;
};

export type GmailRefreshResult = {
  accessToken: string;
  expiresInSec: number;
  scope?: string;
};

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

function getGmailOauthClientCreds() {
  const clientId = String((config as any).googleGmailClientId || config.googleClientId || '').trim();
  const clientSecret = String((config as any).googleGmailClientSecret || config.googleClientSecret || '').trim();
  return {clientId, clientSecret};
}

export class GmailOauthService {
  async exchangeCode(params: {code: string; redirectUri: string}): Promise<GmailTokenExchangeResult> {
    const code = String(params?.code || '').trim();
    const redirectUri = String(params?.redirectUri || '').trim();
    if (!code) throw new Error('Missing code');
    if (!redirectUri) throw new Error('Missing redirectUri');
    const {clientId, clientSecret} = getGmailOauthClientCreds();

    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const resp = await axios.post(TOKEN_URL, body.toString(), {
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      timeout: 15_000,
    });

    const data: any = resp?.data || {};
    const accessToken = String(data?.access_token || '').trim();
    const refreshToken = String(data?.refresh_token || '').trim() || undefined;
    const expiresInSec = Math.max(0, Math.round(Number(data?.expires_in || 0)));
    const scope = String(data?.scope || '').trim() || undefined;

    if (!accessToken) throw new Error('Google token exchange failed (missing access_token)');
    if (!expiresInSec) throw new Error('Google token exchange failed (missing expires_in)');

    return {accessToken, refreshToken, expiresInSec, scope};
  }

  async refreshAccessToken(params: {refreshToken: string}): Promise<GmailRefreshResult> {
    const refreshToken = String(params?.refreshToken || '').trim();
    if (!refreshToken) throw new Error('Missing refresh token');
    const {clientId, clientSecret} = getGmailOauthClientCreds();

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const resp = await axios.post(TOKEN_URL, body.toString(), {
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      timeout: 15_000,
    });

    const data: any = resp?.data || {};
    const accessToken = String(data?.access_token || '').trim();
    const expiresInSec = Math.max(0, Math.round(Number(data?.expires_in || 0)));
    const scope = String(data?.scope || '').trim() || undefined;

    if (!accessToken) throw new Error('Google token refresh failed (missing access_token)');
    if (!expiresInSec) throw new Error('Google token refresh failed (missing expires_in)');

    return {accessToken, expiresInSec, scope};
  }
}
