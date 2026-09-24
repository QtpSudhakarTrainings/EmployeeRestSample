# Playwright API Test Automation Guide

This guide explains how to automate tests for the Employee REST API using Playwright request-based tests. It is designed for both manual validation and automated regression checks.

## Scope

The API under test includes:

- GET /api/members
- GET /api/members/:id
- POST /api/members
- PUT /api/members/:id
- DELETE /api/members/:id
- POST /api/auth/login
- POST /oauth/token
- POST /api/upload

The project uses Basic Auth by default. For automation, the request fixture is the simplest and most stable way to test the API because the endpoints are HTTP-based and do not require browser UI interaction.

## Install Playwright

From the project root:

```bash
npm install --save-dev @playwright/test
npx playwright install
```

If you want to run the example tests from this project, the package.json includes the script:

```bash
npm run test:e2e
```

## Recommended project structure

```text
playwright.config.ts
fixtures/
  apiClient.ts
tests/
  api/
    members.spec.ts
    auth.spec.ts
    upload.spec.ts
```

## Base configuration

Create `playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5002',
    extraHTTPHeaders: {
      Accept: 'application/json'
    }
  },
  reporter: [['list'], ['html', { open: 'never' }]]
});
```

## Shared helper for auth

Create a small helper to build auth headers consistently. This avoids repetition across tests and keeps the automation maintainable.

```ts
export function getBasicAuthHeader(username: string, password: string) {
  return {
    Authorization: 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
  };
}

export function getBearerAuthHeader(token: string) {
  return {
    Authorization: `Bearer ${token}`
  };
}
```

## Example API tests

Create `tests/api/members.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { getBasicAuthHeader } from '../../fixtures/apiClient';

test.describe('Members API', () => {
  const baseUrl = 'http://localhost:5002';
  const headers = getBasicAuthHeader('admin', 'admin');

  test('GET /api/members returns list of members', async ({ request }) => {
    const response = await request.get(`${baseUrl}/api/members`, { headers });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toHaveProperty('id');
    expect(body[0]).toHaveProperty('name');
    expect(body[0]).toHaveProperty('gender');
  });

  test('POST /api/members creates a member with valid payload', async ({ request }) => {
    const uniqueName = `Playwright_${Date.now()}`;

    const response = await request.post(`${baseUrl}/api/members`, {
      headers,
      data: {
        name: uniqueName,
        gender: 'male'
      }
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({
      name: uniqueName,
      gender: 'male'
    });
    expect(body.id).toBeGreaterThan(0);
  });

  test('POST /api/members rejects invalid gender', async ({ request }) => {
    const response = await request.post(`${baseUrl}/api/members`, {
      headers,
      data: {
        name: 'ValidName',
        gender: 'unknown'
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('msg');
  });

  test('GET /api/members/:id returns a matching employee', async ({ request }) => {
    const response = await request.get(`${baseUrl}/api/members/1`, { headers });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body[0].id).toBe(1);
  });

  test('PUT /api/members/:id updates a record', async ({ request }) => {
    const createResponse = await request.post(`${baseUrl}/api/members`, {
      headers,
      data: {
        name: `Patch_${Date.now()}`,
        gender: 'female'
      }
    });

    const created = await createResponse.json();

    const updateResponse = await request.put(`${baseUrl}/api/members/${created.id}`, {
      headers,
      data: {
        name: 'UpdatedName'
      }
    });

    expect(updateResponse.status()).toBe(200);
    const body = await updateResponse.json();
    expect(body.member.name).toBe('UpdatedName');
  });

  test('DELETE /api/members/:id removes the record', async ({ request }) => {
    const createResponse = await request.post(`${baseUrl}/api/members`, {
      headers,
      data: {
        name: `Delete_${Date.now()}`,
        gender: 'male'
      }
    });

    const created = await createResponse.json();
    const response = await request.delete(`${baseUrl}/api/members/${created.id}`, { headers });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.msg).toContain('deleted successfully');
  });
});
```

## Auth tests

Create `tests/api/auth.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('Authentication endpoints', () => {
  const baseUrl = 'http://localhost:5002';

  test('POST /api/auth/login returns JWT when credentials are valid', async ({ request }) => {
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

  test('POST /api/auth/login rejects invalid credentials', async ({ request }) => {
    const response = await request.post(`${baseUrl}/api/auth/login`, {
      data: {
        username: 'admin',
        password: 'wrongpass'
      }
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });
});
```

## File upload tests

Create `tests/api/upload.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { getBasicAuthHeader } from '../../fixtures/apiClient';
import fs from 'fs';

test.describe('Upload API', () => {
  const baseUrl = 'http://localhost:5002';
  const headers = getBasicAuthHeader('admin', 'admin');

  test('POST /api/upload accepts valid PNG file', async ({ request }) => {
    const fileBuffer = Buffer.from('fake-image-content');

    const response = await request.post(`${baseUrl}/api/upload`, {
      headers,
      multipart: {
        file: {
          name: 'sample.png',
          mimeType: 'image/png',
          buffer: fileBuffer
        }
      }
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.success).toBeTruthy();
    expect(body.message).toContain('successfully');
  });

  test('POST /api/upload rejects unsupported extension', async ({ request }) => {
    const response = await request.post(`${baseUrl}/api/upload`, {
      headers,
      multipart: {
        file: {
          name: 'sample.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('hello')
        }
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBeFalsy();
  });
});
```

## Fixtures for cleaner reuse

Create `fixtures/apiClient.ts`:

```ts
export function getBasicAuthHeader(username: string, password: string) {
  return {
    Authorization: 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
  };
}

export function getBearerAuthHeader(token: string) {
  return {
    Authorization: `Bearer ${token}`
  };
}
```

## Test execution steps

1. Start the API server:

```bash
npm start
```

2. Run the suite:

```bash
npx playwright test
```

3. Open report:

```bash
npx playwright show-report
```

## Important API-specific validation notes

These are the issues that should be explicitly covered in tests based on the current implementation:

- `GET /api/members?gender=male` does not behave consistently in all cases
- `GET /api/members/:id` returns an array, not a single object
- `POST /api/upload` returns a URL that may not correspond to the actual saved file
- `POST /oauth/token` requires the exact grant type `client_credentials`
- Only one auth strategy is enabled at a time in `app.js`

## Best practices

- Prefer request-based tests for API validation instead of browser automation
- Use unique names for create/update/delete scenarios to avoid collisions with persisted JSON data
- Assert both HTTP status and JSON contract
- Verify negative paths as part of the test suite, not only happy paths
- Keep credentials in a config or helper file rather than hardcoding them in every test

## Recommended test matrix

| Area | Scenario | Expected |
|------|----------|----------|
| Auth | Valid Basic Auth | 200 |
| Auth | Invalid password | 401 |
| Auth | Valid login | 200 + access_token |
| CRUD | List members | 200 |
| CRUD | Create member | 201 |
| CRUD | Invalid name | 400 |
| CRUD | Invalid gender | 400 |
| CRUD | Get by ID | 200 |
| CRUD | Update member | 200 |
| CRUD | Delete member | 200 |
| Upload | Valid image | 201 |
| Upload | Invalid extension | 400 |
| Upload | File too large | 400 |

## Conclusion

Playwright is a strong fit for this API because the logic is request-driven and the service is stable enough for automated request verification. The best automation pattern here is to use the Playwright request API plus a small shared auth helper, validate JSON payloads thoroughly, and include negative test cases for auth and validation failures.
