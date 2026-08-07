const express = require('express')
const path = require('path')
const logger = require('./middleware/logger')
const fileUpload = require('express-fileupload')

const basicAuth = require('./middleware/auth/basicAuth')
const apiKeyAuth = require('./middleware/auth/apiKeyAuth')
const bearerAuth = require('./middleware/auth/bearerAuth')
const oauth2Auth = require('./middleware/auth/oauth2Auth')
const digestAuth = require('./middleware/auth/digestAuth')

const app = express()
const PORT = process.env.PORT || 5002

// Middleware
// Moved to a separate folder

// Init middleware
// app.use(logger)

// STEP 1
// app.get('/', (req, res) => {
//     // res.send('<h1>Hello World</h1>')
//     res.sendFile(path.join(__dirname, 'public', 'index.html'))
// })

//Set Static Folder
// app.use(express.static(path.join(__dirname, 'public')))

// Body Parser Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
// app.use(express.text())
app.use(fileUpload())

// Public routes that ISSUE credentials - mounted before the auth middleware
// below, otherwise you could never obtain a token in the first place.
// - POST /api/auth/login -> used by the Bearer Token (JWT) strategy
// - POST /oauth/token    -> used by the OAuth2 Client Credentials strategy
app.use(require('./routes/auth'))

// ============================================================================
// Authentication strategy - uncomment exactly ONE line below, then restart
// the server (npm start), to switch which auth type protects /api/members
// and /api/upload. See docs/api-testing-with-playwright.md for how to test
// each one with Playwright.
// ============================================================================
app.use(basicAuth)                 // Basic Auth         -> admin / admin
// app.use(apiKeyAuth)              // API Key            -> header 'x-api-key: demo-api-key-12345'
// app.use(bearerAuth)              // Bearer Token (JWT) -> POST /api/auth/login first
// app.use(oauth2Auth)              // OAuth2 Client Creds-> POST /oauth/token first
// app.use(digestAuth)              // Digest Auth        -> admin / admin, challenge/response

// API Members - persistence
app.use('/api/members', require('./routes/api/members'))

// API File Upload
app.use('/api/upload', require('./routes/api/fileupload'))

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`)
})