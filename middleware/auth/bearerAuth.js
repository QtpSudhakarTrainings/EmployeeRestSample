const { verify } = require('./jwtService')

// Strategy: Bearer Token (JWT) - "Authorization: Bearer <token>"
// Obtain a token first via POST /api/auth/login (see routes/auth.js)
const bearerAuth = (req, res, next) => {
    const [scheme, token] = (req.headers.authorization || '').split(' ')

    if (scheme !== 'Bearer' || !token) {
        res.set('WWW-Authenticate', 'Bearer realm="EmployeeAPI"')
        return res.status(401).json({ error: 'unauthorized', message: 'Missing Bearer token' })
    }

    try {
        req.user = verify(token)
        next()
    } catch (err) {
        res.set('WWW-Authenticate', 'Bearer error="invalid_token"')
        res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired token' })
    }
}

module.exports = bearerAuth
