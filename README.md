# EmployeeRestSample

This is a Demo API built using express and nodejs. It stores data into a JSON File stored under "database" folder with the name "PFMembers.json". There are two endpoints in this api.

1. ### Members - http://localhost:5002/api/members
    * GET ALL (/) - This will return all the members. You can also use query parameter to filter out based on gender.
    * GET (/ID) - You can retrieve a specific member based on it's ID.
    * POST (/) - You can POST a new members into PFMembers.json file.
    * PUT (/ID) - You can POST an existing member into PFMembers.json file.
    * DELETE (/ID) - You can DELETE an existing member into PFMembers.json file.
2. ### File Upload - http://localhost:5002/api/upload
    * POST (/) - You can POST a new FILE into fileuploads folder.
3. ### Swagger / API Documentation
    * Open http://localhost:5002/api-docs for the interactive Swagger UI
    * Open http://localhost:5002/api-docs.json for the raw OpenAPI JSON
4. ### Manually Verifying the REST API
    The easiest way to verify the API is working is to test the authentication endpoint using any HTTP client.
    
    **Prerequisites:**
    - Ensure **Basic Auth** is enabled in `app.js` by uncommenting the line:
      ```javascript
      app.use(basicAuth)                 // Basic Auth -> admin / admin
      ```
    - If another authentication strategy is active, comment it out and restart the server with `npm start`
    
    **Using cURL (Command Line):**
    ```bash
    # Basic Authentication
    curl -u admin:admin http://localhost:5002/api/auth/login
    
    # Or using Authorization header with Base64
    curl -H "Authorization: Basic YWRtaW46YWRtaW4=" http://localhost:5002/api/auth/login
    ```
    
    **Using Postman, Insomnia, or VS Code REST Client:**
    1. Open your HTTP client and create a new request
    2. Set the method to **GET**
    3. Set the URL to **http://localhost:5002/api/auth/login**
    4. Go to the **Authorization** tab and select **Basic Auth**
    5. Enter `username = admin` and `password = admin`
    6. Click **Send**
    
    **Expected Response:**
    ```json
    {
      "message": "Authentication successful",
      "user": {
        "username": "admin",
        "timestamp": "2026-11-03T07:30:00.000Z"
      }
    }
    ```
    
    **Verifying Other Endpoints with Authentication:**
    
    To test other endpoints (e.g., `/api/members`), use the same Basic Auth credentials:
    ```bash
    # List all members
    curl -u admin:admin http://localhost:5002/api/members
    
    # Get a specific member
    curl -u admin:admin http://localhost:5002/api/members/1
    ```
    
    If authentication fails, you'll receive a **401 Unauthorized** response. Make sure:
    - The API is running (`npm start`)
    - The server is on port 5002 (check `app.js` for custom ports)
    - Your credentials match the configured auth strategy (default is `admin:admin`)
    - The correct auth header is being sent

5. ### Playwright API Test Guide
    * See [docs/playwright-api-guide.md](docs/playwright-api-guide.md) for a complete API testing guide and sample request-based specs.
5. ### INSTALLATION STEPS
      * Install node.js
      * Install VS Code as IDE
      * Install nodemon globally by opening terminal and running the following command : -
         - **npm install nodemon -g**
      * Download this project on to your system
      * Open the Project in VS Code and in the integrated terminal of VS Code run the following command: -
         - **npm install**
      * To start the project type the following command in the integrated terminal of VS Code: -
         - **npm start** (or **npm run dev** for auto-restart on file changes via nodemon)
6. By default this project runs on PORT 5002; to change it kindly open app.js file and update the following line of code: -
    - **const PORT = process.env.PORT || 5002**
7. This project ships with **five interchangeable authentication strategies** for practicing different auth types, defined under `middleware/auth/` and configured in `middleware/auth/config.js`. Only one is active at a time — switch by commenting/uncommenting the relevant `app.use(...)` line near the bottom of `app.js`, then restart the server:
    - **Basic Auth** (default) — `username = admin`, `password = admin`
    - **API Key** — header `x-api-key: demo-api-key-12345`
    - **Bearer Token (JWT)** — obtain a token via `POST /api/auth/login` with `{ "username": "admin", "password": "admin" }`
    - **OAuth2 Client Credentials** — obtain a token via `POST /oauth/token` with `{ "grant_type": "client_credentials", "client_id": "demo-client", "client_secret": "demo-secret" }`
    - **Digest Auth** — `username = admin`, `password = admin`, using the standard challenge/response flow (nonce issued on a 401)

    `POST /api/auth/login` and `POST /oauth/token` are always available regardless of which strategy is active.
8. ### Testing the API with Playwright (TypeScript)
    This API is well suited for practicing API testing with Playwright's `request` fixture, since every endpoint requires Basic Authentication. Here's a minimal example:
    ```ts
    test("Demo Api Login Test with user name and password as admin", async ({ request }) => {

        const response = await request.get(
            'http://localhost:5002/api/members',
            {
                headers: { Authorization: 'Basic ' + Buffer.from(`admin:admin`).toString('base64') },
            }
        );

        console.log(await response.json());

    });
    ```
    For a full walkthrough — setup, an auth helper, and CRUD + validation test scenarios for every endpoint (`GET`/`POST`/`PUT`/`DELETE` on `/api/members` and file upload on `/api/upload`) — see [docs/api-testing-with-playwright.md](docs/api-testing-with-playwright.md).
9. ### Deploying to Railway
    The app reads `PORT` from the environment, so it runs on Railway without changes. `npm start` runs `node app.js` (production); `npm run dev` runs it under `nodemon` for local development.

    Persistence: `PFMembers.json` and uploaded files are written to disk under `DATA_DIR` (defaults to the repo root for local dev). Railway's filesystem is ephemeral, so to keep data across deploys/restarts, mount a **Volume** on the service and set `DATA_DIR` to its mount path (e.g. `/data`) as a Railway environment variable. The database file is seeded automatically from the repo's `database/PFMembers.json` the first time it's missing at `DATA_DIR`.

    Deploy with the Railway CLI:
    ```
    npm install -g @railway/cli
    railway login
    railway init
    railway up
    ```
    Then, in the Railway dashboard, add a Volume to the service (mount path e.g. `/data`) and set the `DATA_DIR` environment variable to that same path, and redeploy.
