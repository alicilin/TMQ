'use strict';
const https = require('https');
const http = require('http');
const { URL } = require('url');

async function healthcheck({ target, auth}) {
    let url = new URL(target);
    let requester = url.protocol === 'https:' ? https : http;
    let hostname = url.hostname;
    let port = url.port;
    let path = url.pathname + url.search;
    let method = 'GET';
    let protocol = url.protocol;
    let options = {
        protocol: protocol,
        hostname: hostname,
        port: port,
        path: path,
        method: method,
        timeout: 2 * 1000,
        auth: auth || undefined
    }

    let pr = (resolve, reject) => {
        let requestcb = async res => {
            res.setEncoding('utf8');
            if (res.statusCode >= 300) {
                return reject('ERROR.INVALID_STATUS_CODE');
            }

            let chunks = '';
            for await (let chunk of res) {
                chunks += chunk;
            }

            resolve(chunks);
        }

        let req = requester.request(options, requestcb);
        req.on('error', e => reject(e.message));
    }

    return new Promise(pr);
}

module.exports = healthcheck;