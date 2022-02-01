/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.hasTable('services').then(exists => {
        if (!exists) {
            return knex.schema.createTable('services', table => {
                table.increments('id').primary();
                table.string('name', 100).notNull();
                table.string('http', 100);
                table.string('auth', 100);

                table.unique('name');
                table.index('http');
            })
        }
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable('services');
};
