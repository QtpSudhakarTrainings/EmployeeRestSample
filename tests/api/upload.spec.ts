import { test, expect } from '@playwright/test';
import { getBasicAuthHeader } from '../../fixtures/apiClient';

test.describe('Upload API', () => {
  const baseUrl = 'http://localhost:5002';
  const headers = getBasicAuthHeader('admin', 'admin');

  test('POST /api/upload accepts valid PNG file', async ({ request }) => {
    const response = await request.post(`${baseUrl}/api/upload`, {
      headers,
      multipart: {
        file: {
          name: 'sample.png',
          mimeType: 'image/png',
          buffer: Buffer.from('fake-image-content')
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
