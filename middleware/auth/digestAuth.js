const crypto = require('crypto')
const { digest } = require('./config')
const { issueNonce, consumeNonce } = require('./digestNonceStore')

const md5 = (str) => crypto.createHash('md5').update(str).digest('hex')

const challenge = (res, stale = false) => {
    const nonce = issueNonce()
    const header = `Digest realm="${digest.realm}", qop="auth", nonce="${nonce}", opaque="${md5(digest.realm)}"${stale ? ', stale=true' : ''}`
    res.set('WWW-Authenticate', header)
    res.status(401).json({ error: 'unauthorized', message: 'Digest authentication required' })
}

// Parses the "Digest key=value, key="value", ..." header into an object.
const parseDigestHeader = (headerValue) => {
    const parts = {}
    const re = /(\w+)=("([^"]*)"|[^,]+)/g
    let match
    while ((match = re.exec(headerValue)) !== null) {
        parts[match[1]] = match[3] !== undefined ? match[3] : match[2]
    }
    return parts
}

// Strategy: HTTP Digest Auth (RFC 7616) - challenge/response using a
// server-issued nonce, so the password is never sent over the wire.
const digestAuth = (req, res, next) => {
    const authHeader = req.headers.authorization || ''
    if (!authHeader.startsWith('Digest ')) {
        return challenge(res)
    }

    const { username, realm, nonce, uri, qop, nc, cnonce, response } = parseDigestHeader(authHeader.slice(7))

    if (!username || !realm || !nonce || !uri || !response || username !== digest.username) {
        return challenge(res)
    }

    const { ok, reason } = consumeNonce(nonce, nc)
    if (!ok) {
        return challenge(res, reason === 'stale')
    }

    const ha1 = md5(`${username}:${realm}:${digest.password}`)
    const ha2 = md5(`${req.method}:${uri}`)
    const expected = qop
        ? md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
        : md5(`${ha1}:${nonce}:${ha2}`)

    if (expected !== response) {
        return challenge(res)
    }

    next()
}

module.exports = digestAuth
