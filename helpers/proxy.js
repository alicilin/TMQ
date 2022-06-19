'use strict';
const https = require('https');
const http = require('http');
const { URL } = require('url');
const powered = 'TMQ Service Discovery';

async function proxy(sreq, sres, { target, auth }) {
    let url = new URL(target);
    let requester = url.protocol === 'https:' ? https : http;
    let hostname = url.hostname;
    let port = url.port;
    let path = url.pathname + url.search;
    let method = sreq.method;
    let protocol = url.protocol;
    let headers = { ...sreq.headers, host: url.hostname, 'x-powered-by': powered };
    let options = { protocol, hostname, port, path, method, headers, auth: auth || undefined };
    let rcb = res => {
        sres.writeHead(res.statusCode, { ...res.headers, 'x-powered-by': powered });
        res.pipe(sres, { end: true });
    }

    let ecb = err => {
        sres.writeHead(400, { 'content-type': 'application/json' });
        sres.end(`{"success": false, "message": "${err.message}"}`);
    }

    let proxy = requester.request(options, rcb);
    proxy.on('error', ecb);
    sreq.pipe(proxy, { end: true });
    return true;
}

module.exports = proxy;