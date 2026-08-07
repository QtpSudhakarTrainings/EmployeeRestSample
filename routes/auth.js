const express = require('express')
const router = express.Router()
const { jwt: jwtConfig, oauth2 } = require('../middleware/auth/config')
const jwtService = require('../middleware/auth/jwtService')
const oauth2TokenStore = require('../middleware/auth/oauth2TokenStore')

// Issues a JWT for the Bearer Token strategy (middleware/auth/bearerAuth.js).
// Not protected by any auth middleware - this IS how you get credentials.
router.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body || {}
    if (username !== jwtConfig.username || password !== jwtConfig.password) {
        return res.status(401).json({ error: 'invalid_credentials', message: 'Invalid username or password' })
    }
    res.json({
        token_type: 'Bearer',
        access_token: jwtService.sign({ sub: username }),
        expires_in: jwtConfig.expiresIn
    })
})

// Issues an access token for the OAuth2 Client Credentials strategy
// (middleware/auth/oauth2Auth.js). Standard OAuth2 token endpoint shape.
router.post('/oauth/token', (req, res) => {
    const { grant_type, client_id, client_secret } = req.body || {}
    if (grant_type !== 'client_credentials') {
        return res.status(400).json({ error: 'unsupported_grant_type' })
    }
    if (client_id !== oauth2.clientId || client_secret !== oauth2.clientSecret) {
        return res.status(401).json({ error: 'invalid_client' })
    }
    res.json({
        token_type: 'Bearer',
        access_token: oauth2TokenStore.issueToken(client_id),
        expires_in: oauth2.expiresInSeconds
    })
})

module.exports = router
