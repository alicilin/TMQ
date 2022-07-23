'use strict';
const { Tserver } = require('@connectterou/tsock');
const knex = require('./loaders/knex');
const validators = require('./validators/server');
const moment = require('moment-timezone');
const { v4 } = require('uuid');
const sleep = require('./helpers/sleep');
const stc = require('./helpers/stc');
const { encode, decode } = require('msgpackr');
const express = require('express');
const proxy = require('./helpers/proxy');
const healthcheck = require('./helpers/health-check');
const parsers = [express.urlencoded({ extended: false }), express.json()];
const _ = require('lodash');

async function services(socket, msg, res) {
    this.knex('services')
        .then(x => res(x))
        .catch(x => res([]));
}

async function cancel(socket, msg, res) {
    let valid = await stc(() => validators.cancel.validateAsync(msg));
    if (_.isError(valid)) {
        return res({ success: false, message: valid.message });
    }

    await this.knex('tasks').where('uid', 'LIKE', msg).delete();
    return res({ success: true });
}

async function unlock(socket, msg, res) {
    let valid = await stc(() => validators.unlock.validateAsync(msg));
    if (_.isError(valid)) {
        return res({ success: false, message: valid.message });
    }

    socket['status'] = 'loose';
    socket['time'] = moment().unix();
    await this.knex('locks').where('key', msg).delete();
    return res({ success: true });
}

async function publish(socket, msg, res) {
    let valid = await stc(() => validators.publish.validateAsync(msg));
    if (_.isError(valid)) {
        return res({ success: false, message: valid.message });
    }

    try {
        let unixs = null;
        if (_.isNil(msg['delay'])) {
            unixs = moment().subtract(10, 'minute').unix();
        }

        if (_.isInteger(msg['delay'])) {
            unixs = moment().add(msg['delay'], 'second').unix();
        }

        if (_.isString(msg['delay'])) {
            unixs = moment(msg['delay']).unix();
        }

        if (_.isDate(msg['delay'])) {
            unixs = moment(msg['delay']).unix();
        }

        if (!_.isInteger(unixs)) {
            return res({ success: false, message: 'DELAY_IS_NOT_DATE' });
        }

        if (_.isArray(msg['service'])) {
            let trx = await this.knex.transaction();
            let matcher = new RegExp(...msg['service']);
            let response = [];
            try {
                let services = await this.knex('services').whereNull('http').select();
                for (let service of services) {
                    if (matcher.test(service['name'])) {
                        let task = (
                            _(_.create(null))
                                .set('channel', socket['channel'])
                                .set('sender', socket['name'])
                                .set('receiver', service['name'])
                                .set('event', msg['event'])
                                .set('data', encode(msg['data']))
                                .set('uid', `${msg['prefix'] || '#'}:${v4()}`)
                                .set('parent', msg['parent'])
                                .set('delay', unixs)
                                .set('priority', msg['priority'])
                        );
                        //---------------------------------------------------------------------------------
                        let inserting = this.knex('tasks').transacting(trx).insert(task.value());
                        let result = await (
                            _.includes(['pg', 'pg-native'], this.connection['client'])
                                ? inserting.returning('*')
                                : inserting
                        );
                        //---------------------------------------------------------------------------------
                        let id = _.isInteger(result[0]) ? _.first(result) : _.get(result, '[0].id');
                        if (unixs < moment().unix()) {
                            pusher.call(this, { id, ...task.value(), data: msg['data'] });
                        }

                        response.push({ id, ...task.value(), data: msg['data'] });
                    }
                }

                await trx.commit();
                return res(response);
            } catch (error) {
                trx.rollback();
                throw error;
            }
        }

        let task = (
            _(_.create(null))
                .set('channel', socket['channel'])
                .set('sender', socket['name'])
                .set('receiver', msg['service'])
                .set('event', msg['event'])
                .set('data', encode(msg['data']))
                .set('uid', `${msg['prefix'] || '#'}:${v4()}`)
                .set('parent', msg['parent'])
                .set('delay', unixs)
                .set('priority', msg['priority'])
        );
        //---------------------------------------------------------------------------------
        let inserting = this.knex('tasks').insert(task.value());
        let result = await (
            _.includes(['pg', 'pg-native'], this.connection['client'])
                ? inserting.returning('*')
                : inserting
        );
        //---------------------------------------------------------------------------------
        let id = _.isInteger(result[0]) ? _.first(result) : _.get(result, '[0].id');
        if (unixs < moment().unix()) {
            pusher.call(this, { id, ...task.value(), data: msg['data']});
        }

        //---------------------------------------------------------------------------------
        return res({ id, ...task.value(), data: msg['data'] });
    } catch (error) {
        console.log(error);
        return res({ succes: false, message: error.message });
    }
}

async function pusher(task) {
    try {
        for await (let socket of this.tcp.filterSockets(`${task['receiver']}:${task['channel']}`)) {
            if (socket['status'] === 'loose' && _.includes(socket['events'], task['event'])) {
                try {
                    let lock = { key: task['channel'], expired_at: moment().add(this.lt, 'second').unix() };
                    let locked = await stc(() => this.knex('locks').insert(lock));
                    if (_.isError(locked)) {
                        return;
                    }

                    //-------------------------------------------------------------------------
                    socket.emit('task', task).catch(console.log);
                    socket['status'] = 'busy';
                    socket['time'] = moment().unix();
                    //------------------------------------------------------------------------
                    await this.knex('tasks').where('id', task.id).delete();
                } catch (error) {
                    console.log(error);
                    continue;
                }

                return;
            }
        }

        return true;
    } catch (error) {
        console.error(error);
    }
}

async function taskloop() {
    do {
        try {
            let ts = this.knex('tasks');
            //------------------------------------------------
            ts.where('delay', '<', moment().unix());
            ts.groupBy(['channel', 'receiver', 'event']);
            //-----------------------------------------------
            let rows = await ts.select('channel', 'receiver', 'event');
            let mapper = where => (
                this.knex('tasks')
                    .where(where)
                    .orderBy('priority', 'desc')
                    .orderBy('delay', 'asc')
                    .orderBy('id', 'asc')
                    .first('*')
            );

            let tasks = await Promise.all(_.map(rows, mapper));
            for (let task of tasks) {
                task['data'] = decode(task['data']);
                await pusher.call(this, task);
            }
        } catch (error) {
            console.log(error);
        } finally {
            await sleep(this.loops.task || 1000);
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
    socket.on('unlock', unlock.bind(this, socket));
    socket.on('cancel', cancel.bind(this, socket));
    socket.on('log', log.bind(this, socket));
    socket.on('publish', publish.bind(this, socket));
    socket.on('error', console.log);
}

async function auth(socket, next) {
    try {
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
        //---------------------------------------------------------------
        let service = { name: credentials['name'], http: null, auth: null, checkpath: null };
        await this.knex('services').insert(service).onConflict('name').ignore();
        next();
    } catch (error) {
        console.error(error);
        return;
    }
}

async function socketloop() {
    do {
        try {
            for await (let socket of this.tcp.filterSockets('services')) {
                if (socket['time'] + this.lt < moment().unix()) {
                    socket['status'] = 'loose';
                    socket['time'] = moment().unix();
                }
                
                socket['events'] = await socket.emit('events', null, true);
            }
        } catch (error) {
            console.log(error);
        } finally {
            await sleep(this.loops.socket || 2000);
        }
    } while (true);
}

async function httpAuth(req, res, next) {
    let message = { success: false, message: 'ERROR.INVALID_SECRET' };
    return (
        req.get('X-SECRET') !== this.secret
            ? res.status(400).send(message)
            : next()
    );
}

function httpServices(req, res) {
    this.knex('services')
        .then(x => res.status(200).send(x))
        .catch(x => res.status(500).send({ success: false, message: x.message }));
}

async function httpRequest(req, res) {
    try {
        let first = req.url.indexOf('/');
        let second = req.url.indexOf('/', first + 1);
        let service = req.url.slice(first + 1, second === -1 ? undefined : second);
        let path = req.url.slice(service.length + 1) || '/';
        if (_.isNil(service) || service === '') {
            return res.status(400).send({ success: false, message: 'ERROR.SERVICE_NOT_RESOLVED' });
        }

        let services = _.shuffle((await this.knex('services').whereLike('name', `${service}_http_%`).select()));
        if (_.size(services) === 0) {
            return res.status(500).send({ success: false, message: 'ERROR.NO_ACCESSIBLE_SERVICE_FOUND' });
        }

        for (let { http, auth, checkpath } of services) {
            try {
                await healthcheck({ target: http + checkpath, auth: auth || undefined });
                return proxy(req, res, { target: http + path, auth: auth || undefined });
            } catch (error) {
                console.error(error.message);
            }
        }

        return res.status(500).send({ success: false, message: 'ERROR.NO_ACCESSIBLE_SERVICE_FOUND' });
    } catch (error) {
        res.status(500).send({ success: false, message: error.message });
    }
}

async function httpRegister(req, res) {
    try {
        let isValid = await stc(() => validators.register.validateAsync(req['body']));
        if (_.isError(isValid)) {
            throw new Error(isValid.message);
        }

        //-------------------------------------------------------------------------------------------
        let { http, checkpath, auth, name } = req['body'];
        let insert = { ...req['body'], name: `${name.replace(/(_http_([a-z0-9-_]+))/ig, '')}_http_${v4()}` };
        await healthcheck({ target: http + checkpath, auth: auth || undefined });
        await this.knex('services').insert(insert).onConflict('http').ignore();
        res.status(200).send({ success: true, service: insert });
    } catch (error) {
        res.status(500).send({ success: false, message: error.message });
    }
}

class TMQS {
    constructor(options) {
        validators.constructor.validate(options);
        this.lt = options.locktimeout || 60;
        this.id = v4();
        this.port = options.port || 3000;
        this.hport = options.hport || 3001;
        this.secret = options.secret || 'ok';
        this.tcp = new Tserver(this.port);
        this.connection = options.connection;
        this.loops = options.loops || { };
        this.knex = knex(this.connection);
        this.http = express();
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
        //----------------------------------------------
        let clear = () => (
            this.knex('locks')
                .where('expired_at', '<', moment().unix())
                .delete().then(x => x).catch(x => x)
        );

        setInterval(clear, 3000);
        //----------------------------------------------
        if (this.connection['client'] === 'sqlite3') {
            setInterval(() => this.knex.raw('VACUUM').then(x => x).catch(x => x), 10 * 1000);
        }

        //---------------------------------------------
        this.http.use('/', httpAuth.bind(this));
        this.http.get('/services', httpServices.bind(this));
        this.http.all('/request', httpRequest.bind(this));
        this.http.post('/register', parsers, httpRegister.bind(this));
        this.http.listen(this.hport);
        //---------------------------------------------
        return;
    }
    
}

module.exports = TMQS;