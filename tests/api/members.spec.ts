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
