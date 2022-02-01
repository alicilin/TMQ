module.exports = {
    development: {
        client: 'sqlite3',
        migrations: {
            directory: './migrations'
        },
        connection: {
            filename: './data/db.db'
        },
        useNullAsDefault: true
    },
    production: {
        client: 'sqlite3',
        migrations: {
            directory: './migrations'
        },
        connection: {
            filename: './data/db.db'
        },
        useNullAsDefault: true
    }
};
