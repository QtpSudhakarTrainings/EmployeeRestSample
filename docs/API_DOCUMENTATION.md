# Employee REST API Documentation

## Overview

This project exposes a lightweight Express-based employee management API backed by a JSON file store in the `database` folder. The base URL for local development is:

- http://localhost:5002

The API supports multiple authentication strategies, but only one strategy is enabled at a time in `app.js`.

## Current Architecture Summary

- App entry point: `app.js`
- Member management: `routes/api/members.js`
- Auth token endpoints: `routes/auth.js`
- File upload: `routes/api/fileupload.js`
- Persistence: `database/PFMembers.json`
- Auth configuration: `middleware/auth/config.js`

## Authentication Model

The API is configured to protect `/api/members` and `/api/upload` with exactly one middleware strategy at a time. The selection is controlled by uncommenting one of the lines near the bottom of `app.js`.

### Enabled by default

- Basic Auth
- Credentials: `admin / admin`
- Header format: `Authorization: Basic <base64(username:password)>`

### Alternative strategies supported

1. API Key
   - Header: `x-api-key: demo-api-key-12345`
2. Bearer Token (JWT)
   - Obtain token via `POST /api/auth/login`
3. OAuth2 Client Credentials
   - Obtain access token via `POST /oauth/token`
4. Digest Auth
   - Username/password challenge/response using `admin / admin`

> `POST /api/auth/login` and `POST /oauth/token` are intentionally exposed without protection so clients can obtain credentials before using the protected APIs.

## Common Request Headers

### For Basic Auth

```http
Authorization: Basic YWRtaW46YWRtaW4=
```

### For API Key Auth

```http
x-api-key: demo-api-key-12345
```

### For Bearer Auth

```http
Authorization: Bearer <token>
```

## Data Model

### Member Object

```json
{
  "id": 1,
  "name": "John Smith",
  "gender": "Male"
}
```

### Validation Rules

- `id`: integer, auto-generated
- `name`:
  - required
  - 4 to 25 characters
  - alphabetic and spaces only
- `gender`:
  - required
  - accepted values: `male` or `female` (case-insensitive)

## Endpoints

---

### 1) POST /api/auth/login

Generate a JWT for bearer-auth flows.

#### Request body

```json
{
  "username": "admin",
  "password": "admin"
}
```

#### Success response (200)

```json
{
  "token_type": "Bearer",
  "access_token": "<jwt-token>",
  "expires_in": "1h"
}
```

#### Error responses

- 401: invalid username/password

---

### 2) POST /oauth/token

Generate OAuth2 client-credentials token.

#### Request body

```json
{
  "grant_type": "client_credentials",
  "client_id": "demo-client",
  "client_secret": "demo-secret"
}
```

#### Success response (200)

```json
{
  "token_type": "Bearer",
  "access_token": "<token>",
  "expires_in": 3600
}
```

#### Error responses

- 400: unsupported grant type
- 401: invalid client credentials

---

### 3) GET /api/members

Returns all members sorted by `id` ascending.

#### Optional query filter

```http
GET /api/members?gender=male
```

#### Success response (200)

```json
[
  { "id": 1, "name": "John Smith", "gender": "Male" },
  { "id": 2, "name": "Mike Bax", "gender": "Male" }
]
```

#### Error response

- 404 if `gender` filter does not match any records

> Note: There is a known implementation issue where a non-match still falls through to the unconditional `res.json(members...)` call after the `404` branch, so test automation should treat this path as inconsistent and validate the live behavior before relying on it.

---

### 4) GET /api/members/:id

Returns the member with the matching integer ID.

#### Success response (200)

```json
[
  {
    "id": 5,
    "name": "John Doe",
    "gender": "Male"
  }
]
```

#### Error response

- 404

```json
{
  "msg": "Member with id 999 doesn't exist"
}
```

---

### 5) POST /api/members

Creates a new member.

#### Request body

```json
{
  "name": "John Doe",
  "gender": "male"
}
```

#### Success response (201)

```json
{
  "id": 34,
  "name": "John Doe",
  "gender": "male"
}
```

#### Validation failures

- 400: body contains more than `name` and `gender`
- 400: missing `name` or `gender`
- 400: `name` length is outside 4-25 characters
- 400: `gender` is not `male` or `female`
- 400: `name` includes non-letter characters

---

### 6) PUT /api/members/:id

Updates an existing member. Partial updates are accepted.

#### Request body examples

```json
{
  "name": "Jane Doe"
}
```

or

```json
{
  "gender": "female"
}
```

#### Success response (200)

```json
{
  "msg": "Member with id 5 is updated successfully",
  "member": {
    "id": 5,
    "name": "Jane Doe",
    "gender": "female"
  }
}
```

#### Error responses

- 404: member not found
- 400: invalid validation conditions

---

### 7) DELETE /api/members/:id

Deletes a specific member.

#### Success response (200)

```json
{
  "msg": "Member with id 5 is deleted successfully",
  "members": [
    { "id": 1, "name": "John Smith", "gender": "Male" }
  ]
}
```

#### Error response

- 404: member not found

---

### 8) POST /api/upload

Uploads an image file. This endpoint accepts multipart form data with a field named `file`.

#### Accepted file types

- png
- jpeg
- jpg
- gif

#### Limits

- Maximum size: 5 MB

#### Request example

```bash
curl -X POST http://localhost:5002/api/upload \
  -F "file=@sample.png"
```

#### Success response (201)

```json
{
  "success": true,
  "message": "File uploaded successfully!",
  "url": "http://localhost:5002/fileuploads/sample.png"
}
```

#### Failure responses

- 400 for unsupported extension or size >5 MB
- 500 for server-side errors

> Important: the upload code writes files to a hashed name (`md5 + extension`) but returns the original filename in the `url` field. This is a mismatch and should be treated as an API contract defect for automation and manual testing.

## Known Issues / Test Risks

This API is useful for API learning and automation practice, but it has several contract and reliability issues worth documenting before test automation is built:

1. `GET /api/members?gender=...` has inconsistent 404/200 behavior.
2. `GET /api/members/:id` returns an array instead of a single object.
3. File upload `url` does not match the actual saved file name or the static file route.
4. Static file serving is not enabled for uploaded images.
5. There is no OpenAPI/Swagger specification, making automation and manual validation harder.
6. Data is persisted to a JSON file, not a database, so concurrency and scale are limited.
7. The authentication strategy is changeable by editing source code rather than config or environment variables.

## Recommended Swagger/OpenAPI Strategy

To enable automation, the project should expose a formal contract via OpenAPI 3.0. The recommended approach is:

- Define all endpoints in `openapi.yaml`
- Provide request/response schemas for Member, AuthToken, and FileUpload
- Add a security scheme for Basic, API Key, JWT, and OAuth2
- Add examples for success, validation failure, and 401/404 responses
- Use the spec as the source of truth for Postman, Playwright, and manual test design

## Test Automation Guidance

For Playwright or Postman automation, the following should be built around the documented contract:

- Prefer a shared base URL: `http://localhost:5002`
- Reuse a helper for auth headers
- Use a seeded member set for deterministic CRUD tests
- Validate response status and JSON schema, not only success text
- Include negative-path tests for invalid authentication, invalid body, and invalid IDs
- Cover file upload validation for extension and size constraints

## Suggested Next Implementation Plan

1. Add a formal OpenAPI 3.0 spec for all live routes.
2. Fix the known contract mismatches before using the API as a stable automation target.
3. Add a dedicated test dataset or reset endpoint for repeatable automation.
4. Add static file serving for uploaded content if the response URL is expected to work in browsers.
5. Standardize response shape across CRUD operations.
6. Review auth strategy defaults to ensure one strategy is clearly selected in config rather than by uncommenting code.

## Example Manual Test Flow

### Basic auth flow

```bash
curl -u admin:admin http://localhost:5002/api/members
```

### Create member flow

```bash
curl -u admin:admin -X POST http://localhost:5002/api/members \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","gender":"male"}'
```

### Login flow

```bash
curl -X POST http://localhost:5002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

## Implementation Notes

This API is an excellent demo API for practicing API test automation because it covers:

- CRUD operations
- Auth variations
- Validation rules
- File upload constraints
- JSON persistence on disk

It is not yet a production-grade API contract because it has inconsistent response shapes and undocumented behaviors.
