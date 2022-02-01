/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.hasTable('logs').then(exists => {
        if (!exists) {
            return knex.schema.createTable('logs', table => {
                table.increments('id').primary();
                table.string('sender', 100).notNull();
                table.string('receiver', 100).notNull();
                table.string('channel', 100).notNull();
                table.string('event', 100).notNull();
                table.text('message').notNull();
                table.text('data').notNull();

                table.index('sender');
                table.index('receiver');
                table.index('channel');
                table.index('event');
                table.index('message');
                table.index('data');
            })
        }
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable('logs');
};