/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.hasTable('services').then(exists => {
        if (!exists) {
            return knex.schema.createTable('services', table => {
                table.increments('id').primary();
                table.string('name', 180).notNullable();
                table.string('http', 180);
                table.string('auth', 180);
                table.string('checkpath', 180);

                table.unique('name');
                table.unique('http');
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
