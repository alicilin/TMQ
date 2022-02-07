/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.hasTable('locks').then(exists => {
        if (!exists) {
            return knex.schema.createTable('locks', table => {
                table.increments('id').primary();
                table.string('key', 100).notNull();
                table.integer('expired_at').notNull();
                
                table.unique('key');
                table.index('expired_at');
            })
        }
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable('locks');
};
