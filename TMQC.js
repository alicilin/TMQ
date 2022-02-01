'use strict';
const { EventEmitter, on, once } = require('events');
const validators = require('./validators/client');
const { Tclient } = require('@connectterou/tsock');
const _ = require('lodash');

class TMQC extends EventEmitter {
    constructor(options) {
        super();
        validators.constructor.validate(options);
        this.channel = options.channel;
        this.service = options.service;
        this.ip = options.ip;
        this.http = options.http;
        this.auth = options.auth;
        this.port = options.port;
        this.secret = options.secret;
        this.socket = new Tclient(this.ip, this.port);
        this.setMaxListeners(0);
    }

    async status(msg = 'loose') {
        let resp = await this.socket.emit('status', msg, true);
        if (resp['success'] === false) {
            throw new Error(resp['message']);
        }

        return true;
    }

    async services() {
        return await this.socket.emit('services', null, true);
    }

    async publish(params) {
        try {
            let post = (
                _(_.create(null))
                    .set('service', params['service'])
                    .set('event', params['event'])
                    .set('data', params['data'] || {})
                    .set('parent', params['parent'] || null)
                    .set('delay', params['delay'] || null)
                    .set('priority', params['priority'] || 1)
            );

            await validators.publish.validateAsync(post.value());
            let resp = await this.socket.emit('publish', post.value(), true);
            if (_.has(resp, 'success') && resp['success'] === false) {
                throw new Error(resp['message']);
            }

            return resp;
        } catch (error) {
            throw error;
        }
    }

    async log(params) {
        try {
            let post = (
                _(_.create(null))
                    .set('sender', params['sender'])
                    .set('event', params['event'])
                    .set('message', params['message'])
                    .set('data', params['data'] || null)
            );

            await validators.log.validateAsync(post.value());
            let resp = await this.socket.emit('log', post.value(), true);
            if (_.has(resp, 'success') && resp['success'] === false) {
                throw new Error(resp['message']);
            }

            return true;
        } catch (error) {
            throw error;
        }
    }

    onAsync(event, signal = undefined) {
        return on(this, event, { signal });
    }

    onceAsync(event, signal = undefined) {
        return once(this, event, { signal });
    }

    async connect() {
        //------------------------------------------------
        let onconnect = () => {
            let credentials = (
                _(_.create(null))
                    .set('name', this.service)
                    .set('channel', this.channel)
                    .set('events', this.eventNames())
                    .set('http', this.http)
                    .set('auth', this.auth)
                    .set('secret', this.secret)
            );

            this.socket.emit('credentials', credentials.value());
        };
        //---------------------------------------------------------
        this.socket.on('connect', onconnect);
        this.socket.on('disconnect', () => this.socket.connect());
        this.socket.on('task', msg => super.emit(msg['event'], msg, () => this.status('loose')));
        this.socket.on('events', (msg, resp) => resp(this.eventNames()));
        //---------------------------------------------------------
        await this.socket.connect();
        return true;
    }
}

module.exports = TMQC;