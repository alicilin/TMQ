'use strict';
const TMQS = require('./TMQS'); // T Message Queue Server
const TMQC = require('./TMQC'); // T Message Queue Client

async function main() {
    // listening on port 8080, if path parameter is set to :memory: it stores data in ram
    await (new TMQS({ port: 8080, secret: '1234.', path: __dirname + '/data/db.db' })).listen();
    
    // create service
    let mqc1 = new TMQC({ service: 'test', channel: 'channel-test', ip: '127.0.0.1', port: 8080, secret: '1234.' }); 
    let mqc2 = new TMQC({ service: 'test2', channel: 'channel-test', ip: '127.0.0.1', port: 8080, secret: '1234.' });
    let mqc3 = new TMQC({ service: 'test3', channel: 'channel-test', ip: '127.0.0.1', port: 8080, secret: '1234.' });
    let mqc4 = new TMQC({ service: 'test4', channel: 'channel-test', ip: '127.0.0.1', port: 8080, secret: '1234.' });
    let mqc5 = new TMQC({ service: 'test5', channel: 'channel-test', ip: '127.0.0.1', port: 8080, secret: '1234.' });

    // event => worker, receiver => test2, channel => channel-test
    mqc2.on('worked', async (msg, unlock) => {
        // received data
        console.log(msg.data);
        //unlocks the channel to process the next task
        unlock(); 
    });

    mqc4.on('worked', (msg, unlock) => {
        console.log(msg.data);
        unlock();
    });


    mqc5.on('worked', (msg, unlock) => {
        console.log(msg.data);
        unlock();
    });


    // connect to server
    
    // list services
    setTimeout(() => mqc2.services().then(console.log), 1000);
    //assigns task to process
    for (let i = 1; i < 10; i++) {
        await mqc1.publish({ service: 'test2', event: 'worked', data: 'holaaa mqc1 > mqc2 - ' + i });
        await mqc1.publish({ service: 'test5', event: 'workedx', data: 'holaaa mqc1 > mqc5. olmayan event - ' + i });
        await mqc3.publish({ service: 'test4', event: 'worked', data: 'holaaa mqc3 > mqc4 - ' + i });
    }
}

main();