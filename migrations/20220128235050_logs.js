/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.hasTable('logs').then(exists => {
        if (!exists) {
            return knex.schema.createTable('logs', table => {
                table.increments('id').primary();
                table.string('sender', 100).notNullable();
                table.string('receiver', 100).notNullable();
                table.string('channel', 100).notNullable();
                table.string('event', 100).notNullable();
                table.text('message').notNullable();
                table.text('data').notNullable();

                table.index('sender');
                table.index('receiver');
                table.index('channel');
                table.index('event');
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
