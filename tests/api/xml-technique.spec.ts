import { test, expect } from '@playwright/test';

const baseUrl = 'http://localhost:5002';
const headers = {
  'Content-Type': 'application/json',
  'x-api-key': 'demo-api-key-12345'
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function xmlToJson(xml: string): Record<string, string | number> {
  const result: Record<string, string | number> = {};

  const match = (tag: string) => {
    const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const m = xml.match(regex);
    return m ? m[1] : '';
  };

  const name = match('name');
  const gender = match('gender');
  const id = match('id');

  if (name) result.name = name.trim();
  if (gender) result.gender = gender.trim();
  if (id) result.id = Number(id.trim());

  return result;
}

function memberToXml(member: Record<string, any>): string {
  return `
    <member>
      <id>${member.id ?? ''}</id>
      <name>${escapeXml(String(member.name ?? ''))}</name>
      <gender>${escapeXml(String(member.gender ?? ''))}</gender>
    </member>
  `.trim();
}

function loginRequestToXml(username: string, password: string): string {
  return `
    <login>
      <username>${escapeXml(username)}</username>
      <password>${escapeXml(password)}</password>
    </login>
  `.trim();
}

function tokenResponseToXml(tokenResponse: Record<string, any>): string {
  return `
    <token>
      <token_type>${escapeXml(String(tokenResponse.token_type ?? ''))}</token_type>
      <access_token>${escapeXml(String(tokenResponse.access_token ?? ''))}</access_token>
      <expires_in>${escapeXml(String(tokenResponse.expires_in ?? ''))}</expires_in>
    </token>
  `.trim();
}

test.describe('XML-driven test technique without changing the REST API', () => {
  test('Create member request is authored in XML and the response is validated as XML in the test layer', async ({ request }) => {
    const xmlInput = `
      <member>
        <name>Jane Doe</name>
        <gender>male</gender>
      </member>
    `.trim();

    const jsonPayload = xmlToJson(xmlInput);

    const response = await request.post(`${baseUrl}/api/members`, {
      headers,
      data: jsonPayload
    });

    expect(response.status()).toBe(201);

    const createdMember = await response.json();
    const xmlOut = memberToXml(createdMember);

    expect(xmlOut).toContain('<name>Jane Doe</name>');
    expect(xmlOut).toContain('<gender>male</gender>');
    expect(xmlOut).toContain('<member>');
  });

  test('Login request can be authored as XML in the test layer and converted to JSON before calling the API', async ({ request }) => {
    const xmlInput = loginRequestToXml('admin', 'admin');
    const payload = xmlToJson(xmlInput);

    const response = await request.post(`${baseUrl}/api/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      data: payload
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    const xmlOut = tokenResponseToXml(body);

    expect(xmlOut).toContain('<token_type>Bearer</token_type>');
    expect(xmlOut).toContain('<access_token>');
    expect(xmlOut).toContain('<expires_in>');
  });

  test('XML assertions can validate values even when the server response is JSON', async ({ request }) => {
    const xmlInput = `
      <member>
        <name>Playwright XML</name>
        <gender>female</gender>
      </member>
    `.trim();

    const response = await request.post(`${baseUrl}/api/members`, {
      headers,
      data: xmlToJson(xmlInput)
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    const xmlOut = memberToXml(body);

    expect(xmlOut).toContain('<name>Playwright XML</name>');
    expect(xmlOut).toContain('<gender>female</gender>');
    expect(xmlOut).toMatch(/<id>\d+<\/id>/);
  });
});
