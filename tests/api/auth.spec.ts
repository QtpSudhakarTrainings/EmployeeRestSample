import { test, expect } from '@playwright/test';

const baseUrl = 'http://localhost:5002';
const protectedUrl = `${baseUrl}/api/members`;

function createBasicHeader(username: string, password: string) {
  return {
    Authorization: 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
  };
}

function createBearerHeader(token: string) {
  return {
    Authorization: `Bearer ${token}`
  };
}

function md5(value: string) {
  return require('crypto').createHash('md5').update(value).digest('hex');
}

function parseDigestChallenge(challengeHeader: string | null) {
  if (!challengeHeader) {
    throw new Error('Missing WWW-Authenticate header');
  }

  const parts = {} as Record<string, string>;
  const regex = /(\w+)=(?:"([^"]*)"|([^,]+))/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(challengeHeader)) !== null) {
    parts[match[1]] = match[2] ?? match[3];
  }

  return parts;
}

async function createDigestAuthHeader(request: any, method: string, path: string, username = 'admin', password = 'admin') {
  const challengeResponse = await request.get(protectedUrl, {
    headers: {}
  });

  const challengeHeader = challengeResponse.headers()['www-authenticate'] || challengeResponse.headers()['WWW-Authenticate'];
  const challenge = parseDigestChallenge(challengeHeader);
  const realm = challenge.realm;
  const nonce = challenge.nonce;
  const qop = challenge.qop;
  const nc = '00000001';
  const cnonce = require('crypto').randomBytes(8).toString('hex');
  const ha1 = md5(`${username}:${realm}:${password}`);
  const ha2 = md5(`${method.toUpperCase()}:${path}`);
  const responseHash = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);

  return `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${path}", response="${responseHash}", qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;
}

// Enable only one auth middleware in app.js, restart the server, and then run the matching block below.

test.describe('Basic Auth strategy', () => {
  test('POST /api/auth/login is available even when Basic Auth is active', async ({ request }) => {
    const response = await request.post(`${baseUrl}/api/auth/login`, {
      data: {
        username: 'admin',
        password: 'admin'
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.token_type).toBe('Bearer');
    expect(body.access_token).toBeTruthy();
  });

  test('Basic Auth accepts valid credentials', async ({ request }) => {
    const response = await request.get(protectedUrl, {
      headers: createBasicHeader('admin', 'admin')
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('Basic Auth rejects invalid credentials', async ({ request }) => {
    const response = await request.get(protectedUrl, {
      headers: createBasicHeader('admin', 'wrongpass')
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('unauthorized');
  });
});

test.describe('API Key strategy', () => {
  test('API Key accepts valid key', async ({ request }) => {
    const response = await request.get(protectedUrl, {
      headers: { 'x-api-key': 'demo-api-key-12345' }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('API Key rejects invalid key', async ({ request }) => {
    const response = await request.get(protectedUrl, {
      headers: { 'x-api-key': 'bad-key' }
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('unauthorized');
  });
});

test.describe('Bearer JWT strategy', () => {
  test('JWT token is issued and accepted by protected routes', async ({ request }) => {
    const loginResponse = await request.post(`${baseUrl}/api/auth/login`, {
      data: {
        username: 'admin',
        password: 'admin'
      }
    });

    expect(loginResponse.status()).toBe(200);
    const loginBody = await loginResponse.json();
    const token = loginBody.access_token;

    const protectedResponse = await request.get(protectedUrl, {
      headers: createBearerHeader(token)
    });

    expect(protectedResponse.status()).toBe(200);
    const body = await protectedResponse.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('JWT token rejects invalid token', async ({ request }) => {
    const response = await request.get(protectedUrl, {
      headers: createBearerHeader('invalid-token')
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('unauthorized');
  });
});

test.describe('OAuth2 Client Credentials strategy', () => {
  test('OAuth2 token endpoint issues access token', async ({ request }) => {
    const response = await request.post(`${baseUrl}/oauth/token`, {
      data: {
        grant_type: 'client_credentials',
        client_id: 'demo-client',
        client_secret: 'demo-secret'
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.token_type).toBe('Bearer');
    expect(body.access_token).toBeTruthy();
  });

  test('OAuth2 access token is accepted by protected routes', async ({ request }) => {
    const tokenResponse = await request.post(`${baseUrl}/oauth/token`, {
      data: {
        grant_type: 'client_credentials',
        client_id: 'demo-client',
        client_secret: 'demo-secret'
      }
    });

    const tokenBody = await tokenResponse.json();
    const response = await request.get(protectedUrl, {
      headers: createBearerHeader(tokenBody.access_token)
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('OAuth2 rejects invalid client credentials', async ({ request }) => {
    const response = await request.post(`${baseUrl}/oauth/token`, {
      data: {
        grant_type: 'client_credentials',
        client_id: 'demo-client',
        client_secret: 'wrong-secret'
      }
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('invalid_client');
  });
});

test.describe('Digest Auth strategy', () => {
  test('Digest Auth accepts valid challenge/response', async ({ request }) => {
    const authHeader = await createDigestAuthHeader(request, 'GET', '/api/members');
    const response = await request.get(protectedUrl, {
      headers: {
        Authorization: authHeader
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('Digest Auth rejects invalid credentials', async ({ request }) => {
    const challengeResponse = await request.get(protectedUrl, {
      headers: {}
    });
    const challengeHeader = challengeResponse.headers()['www-authenticate'] || challengeResponse.headers()['WWW-Authenticate'];
    const challenge = parseDigestChallenge(challengeHeader);
    const nonce = challenge.nonce;
    const realm = challenge.realm;
    const qop = challenge.qop;
    const nc = '00000001';
    const cnonce = require('crypto').randomBytes(8).toString('hex');
    const ha1 = md5(`admin:${realm}:wrongpass`);
    const ha2 = md5(`GET:/api/members`);
    const invalidResponse = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);

    const response = await request.get(protectedUrl, {
      headers: {
        Authorization: `Digest username="admin", realm="${realm}", nonce="${nonce}", uri="/api/members", response="${invalidResponse}", qop=${qop}, nc=${nc}, cnonce="${cnonce}"`
      }
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('unauthorized');
  });
});
