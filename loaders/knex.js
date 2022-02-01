'use strict';
const { resolve } = require('path');
const { default: Knex } = require('knex');
async function afterCreate(conn, cb) {
    await new Promise(r => conn.run('PRAGMA FOREIGN_KEYS = ON', r))
        .then(() => new Promise(r => conn.run('PRAGMA TEMP_STORE = ON', r)))
        .then(() => new Promise(r => conn.run('PRAGMA synchronous = FULL', r)))
        .then(() => new Promise(r => conn.run('PRAGMA LOCKING_MODE = Exclusive', r)))
        .then(() => new Promise(r => conn.run('PRAGMA CACHE_SIZE = 100000', r)))
        .then(() => new Promise(r => conn.run('PRAGMA PAGE_SIZE = 655350', r)))
        .then(() => new Promise(r => conn.run('PRAGMA journal_mode = WAL', r)))
        .then(() => new Promise(r => conn.run('PRAGMA temp_store = memory', r)))
        .then(() => new Promise(r => conn.run('PRAGMA mmap_size = 30000000000', r)));
    
    cb();
}

module.exports = filename => (
    Knex(
        {
            client: 'sqlite3',
            connection: {
                filename,
            },
            migrations: {
                directory: resolve(__dirname, '../', 'migrations')
            },
            useNullAsDefault: true,
            pool: {
                afterCreate: afterCreate
            }
        }
    )
);