const { basic } = require('./config')

// Strategy: HTTP Basic Auth - "Authorization: Basic base64(username:password)"
const basicAuth = (req, res, next) => {
    const b64auth = (req.headers.authorization || '').split(' ')[1] || ''
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':')
    if (login && password && login === basic.username && password === basic.password) {
        return next()
    }
    res.set('WWW-Authenticate', 'Basic realm="401"')
    res.status(401).json({ error: 'unauthorized' })
}

module.exports = basicAuth
