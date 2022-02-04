'use strict';
const { resolve } = require('path');
const { default: Knex } = require('knex');
const _ = require('lodash');
const mdir = resolve(__dirname, '../', 'migrations');

module.exports = options => Knex(_.set(options, 'migrations.directory', mdir));;