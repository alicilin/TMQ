/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.hasTable('tasks').then(exists => {
        if (!exists) {
            return knex.schema.createTable('tasks', table => {
                table.increments('id').primary();
                table.string('uid', 100).notNull();
                table.string('parent', 100);
                table.string('channel', 100).notNull();
                table.string('sender', 100).notNull();
                table.string('receiver', 100).notNull();
                table.string('event', 100).notNull();
                table.binary('data', 100);
                table.bigInteger('delay').notNull();
                table.integer('priority').defaultTo(knex.raw('1'));

                table.unique('uid');
                table.index('channel');
                table.index('sender');
                table.index('receiver');
                table.index('event');
                table.index('delay');
                table.index(['channel', 'receiver', 'event'], 'tasks_group_composite_index');
                table.index([knex.raw('priority desc'), 'delay', knex.raw('id asc')], 'tasks_sorting_composite_index');
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
