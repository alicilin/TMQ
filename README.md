# @connectterou/tmq

TCP based, scalable Message Queue server & Client / Http Based Service Registry for Node.js

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
const connection = {
    client: 'mysql2', // npm install mysql2
    connection: {
        host: 'localhost',
        user: 'root',
        password: 'test123',
        database: 'TMQ'
    }
}

// const connection = {
//     client: 'sqlite3', //npm install @vscode/sqlite3
//     connection: {
//         filename: __dirname + '/data/db.db'
//     }
//     useNullAsDefault: true
// }

async function main() {
    // listening on port 8080, listening on http port : 8081
    await (new TMQS({ port: 8080, hport: 8081 secret: '1234.', connection })).listen();
    
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

    //or

    for await ( let [msg, unlock] of mqc2.onAsync('worked')) {
        console.log(msg.data);
        await unlock();
    }

    mqc4.on('worked', (msg, unlock) => {
        console.log(msg.data);
        unlock();
    });


    mqc5.on('worked', (msg, unlock) => {
        console.log(msg.data);
        unlock();
    });

    // list services
    setTimeout(() => mqc2.services().then(console.log), 1000);

    for (let i = 0; i < 1000; i++) {
        //assigns task to process
        await mqc1.publish({ service: 'test2', event: 'worked', data: 'holaaa mqc1 > mqc2 - ' + i, delay: 60 }); //Works after 60 seconds
        await mqc1.publish({ service: /^test/i, event: 'worked', data: 'holaaa mqc1 > mqc2 - ' + i }); // Sends to all workers containing the word 'test'
        await mqc1.publish({ service: 'test5', event: 'workedx', data: 'holaaa mqc1 > mqc5 - ' + i });
        await mqc3.publish({ service: 'test4', event: 'worked', data: 'holaaa mqc3 > mqc4 - ' + i });
    }

    
    //***************************SERVICE REGISTRY *****************************
    const axios = require('axios').default;
    
    // register service
    axios.post(
        'http://[server ip or domain]:[server port]/register', 
        { 
            name: 'my_service', 
            http: 'http://myservice', 
            auth: 'test:pass', 
            checkpath: '/health-check' 
        }, 
        { 
            headers: { 
                'X-SECRET': '1234.' 
            } 
        }
    ); 
    // name: my service, 
    // http: http ip or domain of my service, 
    // auth: my service access credentials
    // checkpath: path to check if my service is up (The server will request a get. It should get OK as response)
    // return: { success: true, service: service information } or { succes: false, message: error message }

    //-------------------------------------------------------------------------------------------------------------------------

    // service list
    axios.get('http://[server ip or domain]:[server port]/services', { headers: { 'X-SECRET': '1234.' } }); 
    // return: array of service list  or { succes: false, message: error message }

    //-------------------------------------------------------------------------------------------------------------------------

    // request to another service without ip or domain
    axios.get('http://[server ip or domain]:[server port]/request/[service name]/param1/param2/param3', { headers: { 'X-SECRET': '1234.' } }); 
    // return: response from other service or  { success: false, message: error message }
    // important! 
    //    1) other service must be registered.
    //    2) The other service must be able to respond to http requests. e.g; must be written in express
    //    3) accepts all http methods
    //    4) The endpoint specified in the "checkpath" parameter of the other service must be operational
    //-------------------------------------------------------------------------------------------------------------------------
}

main();

```

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License
[MIT](https://choosealicense.com/licenses/mit/)