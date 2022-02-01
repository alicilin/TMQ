# @connectterou/tmq

TCP based Message Queue server & Client for Node.js

## Installation

Use the package manager npm to install @connectterou/tmq

```bash
npm i @connectterou/tmq
```

## Usage

```javascript
'use strict';
const TMQS = require('@connectterou/tmq/TMQS'); // T Message Queue Server
const TMQC = require('@connectterou/tmq/TMQC'); // T Message Queue Client

async function main() {
    // listening on port 8080, if path parameter is set to :memory: it stores data in ram
    await (new TMQS({ port: 8080, secret: '1234.', path: __dirname + '/data/db.db' })).listen();
    
    // create service
    let mqc1 = new TMQC({ service: 'test', channel: 'channel-test', ip: '127.0.0.1', port: 8080, secret: '1234.' }); 
    let mqc2 = new TMQC({ service: 'test2', channel: 'channel-test', ip: '127.0.0.1', port: 8080, secret: '1234.' });
    let mqc3 = new TMQC({ service: 'test3', channel: 'channel-test', ip: '127.0.0.1', port: 8080, secret: '1234.' });
    let mqc4 = new TMQC({ service: 'test4', channel: 'channel-test', ip: '127.0.0.1', port: 8080, secret: '1234.' });
    let mqc5 = new TMQC({ service: 'test5', channel: 'channel-test', ip: '127.0.0.1', port: 8080, secret: '1234.' });

    // event => worked, receiver => test2, channel => channel-test
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
    await mqc1.connect();
    await mqc2.connect();
    await mqc3.connect();
    await mqc4.connect();
    await mqc5.connect();

    // list services
    setTimeout(() => mqc2.services().then(console.log), 1000);

    for (let i = 0; i < 1000; i++) {
        //assigns task to process
        await mqc1.publish({ service: 'test2', event: 'worked', data: 'holaaa mqc1 > mqc2 - ' + i });
        await mqc1.publish({ service: 'test5', event: 'workedx', data: 'holaaa mqc1 > mqc5 - ' + i });
        await mqc3.publish({ service: 'test4', event: 'worked', data: 'holaaa mqc3 > mqc4 - ' + i });
    }
}

main();

```

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License
[MIT](https://choosealicense.com/licenses/mit/)