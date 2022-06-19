/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.hasTable('tasks').then(exists => {
        if (!exists) {
            return knex.schema.createTable('tasks', table => {
                table.increments('id').primary();
                table.string('uid', 100).notNullable();
                table.string('parent', 100);
                table.string('channel', 100).notNullable();
                table.string('sender', 100).notNullable();
                table.string('receiver', 100).notNullable();
                table.string('event', 100).notNullable();
                table.integer('priority').defaultTo(knex.raw('1'));
                table.bigInteger('delay').notNullable();
                table.binary('data');

                table.unique('uid');
                table.index(['channel', 'receiver', 'event', knex.raw('priority desc'), 'delay', 'id'], 'tasks_sorting_index');
                table.index(['delay', 'channel', 'receiver', 'event'], 'tasks_group_index');
            })
        }
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable('tasks');
};
