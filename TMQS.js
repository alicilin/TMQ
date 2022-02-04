'use strict';
const { Tserver } = require('@connectterou/tsock');
const knex = require('./loaders/knex');
const validators = require('./validators/server');
const moment = require('moment-timezone');
const { v4 } = require('uuid');
const sleep = require('./helpers/sleep');
const stc = require('./helpers/stc');
const { encode, decode } = require('msgpackr');
const _ = require('lodash');

async function services(socket, msg, res) {
    this.knex('services').then(x => res(x));
}

async function status(socket, msg, res) {
    let valid = await stc(() => validators.status.validateAsync(msg));
    if (_.isError(valid)) {
        return res({ success: false, message: valid.message });
    }

    socket.status = msg;
    socket.tunix = moment().unix();
    return res({ success: true });
}

async function publish(socket, msg, res) {
    let valid = await stc(() => validators.publish.validateAsync(msg));
    if (_.isError(valid)) {
        return res({ success: false, message: valid.message });
    }

    try {
        let s = null;
        if (_.isNil(msg['delay'])) {
            s = moment().subtract(10, 'minute').unix();
        }

        if (_.isInteger(msg['delay'])) {
            s = moment().add(msg['delay'], 'second').unix();
        }

        if (_.isString(msg['delay'])) {
            s = moment(msg['delay']).unix();
        }

        if (_.isDate(msg['delay'])) {
            s = moment(msg['delay']).unix();
        }

        if (!_.isInteger(s)) {
            return res({ success: false, message: 'DELAY_IS_NOT_DATE' });
        }

        let task = (
            _(_.create(null))
                .set('channel', socket['channel'])
                .set('sender', socket['name'])
                .set('receiver', msg['service'])
                .set('event', msg['event'])
                .set('data', encode(msg['data']))
                .set('uid', v4())
                .set('parent', msg['parent'])
                .set('delay', s)
                .set('priority', msg['priority'])
        );
        
        let [id] = await this.knex('tasks').insert(task.value());
        return res(_.merge({ id }, task.value()));
    } catch (error) {
        console.log(error);
        return res({ succes: false, message: error.message });
    }
}

async function pusher(task) {
    for await (let socket of this.tcp.filterSockets(`${task.receiver}:${task.channel}`)) {
        if (socket['status'] === 'loose' && _.includes(socket['events'], task.event)) {
            let locked = await stc(() => this.knex('locks').insert({ key: task.id }));
            if (_.isError(locked)) {
                return;
            }

            //-------------------------------------------------------------------------
            socket.emit('task', task);
            socket['status'] = 'busy';
            socket['tunix'] = moment().unix();
            //------------------------------------------------------------------------
            await this.knex('tasks').where('id', task.id).delete();
            await this.knex('locks').where('id', locked[0]).delete();
            return;
        }
    }

    return true;
}

async function taskloop() {
    do {
        try {
            let tknex = this.knex('tasks');
            //------------------------------------------------------
            tknex.where('delay', '<', moment().unix());
            tknex.orderBy('priority', 'desc');
            tknex.orderBy('delay', 'asc');
            tknex.orderBy('id', 'asc');
            tknex.select('id', 'priority', 'delay');
            //------------------------------------------------------
            let t1knex = this.knex({ t: tknex });
            //------------------------------------------------------
            t1knex.join('tasks as t1', 't1.id', 't.id');
            t1knex.groupBy(['t1.channel', 't1.receiver', 't1.event']);
            t1knex.select('t1.id');
            t1knex.limit(1000);
            //------------------------------------------------------
            let t2knex = this.knex({ t2: t1knex });
            t2knex.join('tasks as t3', 't3.id', 't2.id');
            //------------------------------------------------------
            let iterable = await t2knex.select('t3.*');
            let tasks = [];
            for await (let item of iterable) {
                item['data'] = decode(item['data']);
                tasks.push(pusher.call(this, item));
            }

            await Promise.all(tasks);
        } catch (error) {
            console.log(error);
        } finally {
            await sleep(1000);
        }
    } while (true);
}

async function log(socket, msg, res) {
    let valid = await stc(() => validators.log.validateAsync(msg));
    if (_.isError(valid)) {
        return res({ success: false, message: valid.message });
    }

    try {
        let log = (
            _(_.create(null))
                .set('sender', msg['sender'])
                .set('receiver', socket['name'])
                .set('channel', socket['channel'])
                .set('event', msg['event'])
                .set('message', msg['message'])
                .set('data', JSON.stringify(msg['data']))
        );
        
        await this.knex('logs').insert(log.value());
        return res({ success: true, message: 'ok' });
    } catch (error) {
        return res({ success: false, message: error.message });
    }
}

async function connection(socket) {
    socket.on('services', services.bind(this, socket));
    socket.on('status', status.bind(this, socket));
    socket.on('log', log.bind(this, socket));
    socket.on('publish', publish.bind(this, socket));
    socket.on('error', console.log);
}

async function auth(socket, next) {
    let credentials = _.first(await socket.onceAsync('credentials'));
    let isValid = await stc(() => validators.auth.validateAsync(credentials));
    if (_.isError(isValid) || credentials['secret'] !== this.secret) {
        return;
    }

    socket.join('services');
    socket.join(`${credentials['name']}:${credentials['channel']}`);
    socket.join(`service:${credentials['name']}`);
    socket.join(`channel:${credentials['channel']}`);
    socket['name'] = credentials['name'];
    socket['channel'] = credentials['channel'];
    socket['events'] = credentials['events'];
    socket['status'] = 'loose';

    if (credentials['http']) {
        let service = _.pick(credentials, ['name', 'http', 'auth']);
        await this.knex('services').insert(service).onConflict('name').merge();
    }

    if (!credentials['http']) {
        let service = _.pick(credentials, ['name']);
        await this.knex('services').insert(service).onConflict('name').ignore();
    }

    next();
}

async function socketloop() {
    do {
        try {
            for await (let socket of this.tcp.filterSockets('services')) {
                if (socket['tunix'] + this.lt < moment().unix()) {
                    socket['status'] = 'loose';
                    socket['tunix'] = moment().unix();
                }
                
                socket['events'] = await socket.emit('events', null, true);
            }
        } catch (error) {
            console.log(error);
        } finally {
            await sleep(1000);
        }
    } while (true);
}

class TMQS {
    constructor(options) {
        validators.constructor.validate(options);
        this.lt = options.locktimeout || 60;
        this.id = v4();
        this.port = options.port || 3000;
        this.secret = options.secret || 'ok';
        this.tcp = new Tserver(this.port);
        this.connection = options.connection;
        this.knex = knex(this.connection);
    }

    async listen() {
        this.tcp.use(auth.bind(this));
        this.tcp.on('connection', connection.bind(this));
        //-----------------------------------------------
        await this.knex.migrate.latest();
        await this.knex('locks').delete();
        await this.knex('services').delete();
        await this.tcp.listen();
        //----------------------------------------------
        setImmediate(taskloop.bind(this));
        setImmediate(socketloop.bind(this));
        if (this.connection['client'] === 'sqlite3') {
            setInterval(() => this.knex.raw('VACUUM').then(x => x), 10 * 1000);
        }
        
        return;
    }
    
}

module.exports = TMQS;