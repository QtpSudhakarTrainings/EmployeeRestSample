const crypto = require('crypto')
const { digest } = require('./config')

// nonce -> { createdAt, usedNc: Set<string> }
const nonces = new Map()

const issueNonce = () => {
    const nonce = crypto.randomBytes(16).toString('hex')
    nonces.set(nonce, { createdAt: Date.now(), usedNc: new Set() })
    return nonce
}

// Validates a nonce is known, not expired, and its nonce-count (nc) hasn't
// been replayed. Returns { ok: true } or { ok: false, reason: 'stale'|'replay' }.
const consumeNonce = (nonce, nc) => {
    const entry = nonces.get(nonce)
    if (!entry) return { ok: false, reason: 'stale' }
    if (Date.now() - entry.createdAt > digest.nonceTtlMs) {
        nonces.delete(nonce)
        return { ok: false, reason: 'stale' }
    }
    if (entry.usedNc.has(nc)) {
        return { ok: false, reason: 'replay' }
    }
    entry.usedNc.add(nc)
    return { ok: true }
}

module.exports = { issueNonce, consumeNonce }
