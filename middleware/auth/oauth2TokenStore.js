const crypto = require('crypto')
const { oauth2 } = require('./config')

// In-memory opaque access tokens, keyed by token string. Unlike a JWT, an
// opaque token carries no information itself - validity must be looked up.
const tokens = new Map()

const issueToken = (clientId) => {
    const token = crypto.randomBytes(24).toString('hex')
    tokens.set(token, { clientId, expiresAt: Date.now() + oauth2.expiresInSeconds * 1000 })
    return token
}

const isValid = (token) => {
    const entry = tokens.get(token)
    if (!entry) return false
    if (Date.now() > entry.expiresAt) {
        tokens.delete(token)
        return false
    }
    return true
}

module.exports = { issueToken, isValid }
