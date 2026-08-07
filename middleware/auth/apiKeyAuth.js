const { apiKey } = require('./config')

// Strategy: static API key sent in a custom header, e.g. "x-api-key: demo-api-key-12345"
const apiKeyAuth = (req, res, next) => {
    const key = req.headers[apiKey.headerName]
    if (key && apiKey.validKeys.includes(key)) {
        return next()
    }
    res.status(401).json({
        error: 'unauthorized',
        message: `Missing or invalid '${apiKey.headerName}' header`
    })
}

module.exports = apiKeyAuth
