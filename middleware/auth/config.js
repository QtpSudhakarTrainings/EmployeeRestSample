// Central place for demo credentials/settings used by every auth strategy.
// These are intentionally simple/static since this is a practice API.
module.exports = {
    basic: {
        username: 'admin',
        password: 'admin'
    },
    apiKey: {
        headerName: 'x-api-key',
        validKeys: ['demo-api-key-12345']
    },
    jwt: {
        secret: 'employee-api-demo-secret',
        expiresIn: '1h',
        username: 'admin',
        password: 'admin'
    },
    oauth2: {
        clientId: 'demo-client',
        clientSecret: 'demo-secret',
        expiresInSeconds: 3600
    },
    digest: {
        username: 'admin',
        password: 'admin',
        realm: 'EmployeeAPI',
        nonceTtlMs: 5 * 60 * 1000
    }
}
