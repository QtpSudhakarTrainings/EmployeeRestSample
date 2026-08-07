const { isValid } = require('./oauth2TokenStore')

// Strategy: OAuth2 Client Credentials - "Authorization: Bearer <access_token>"
// Obtain an access token first via POST /oauth/token (see routes/auth.js)
const oauth2Auth = (req, res, next) => {
    const [scheme, token] = (req.headers.authorization || '').split(' ')

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'invalid_request', message: 'Missing Bearer access token' })
    }
    if (!isValid(token)) {
        return res.status(401).json({ error: 'invalid_token', message: 'Access token is invalid or expired' })
    }
    next()
}

module.exports = oauth2Auth
