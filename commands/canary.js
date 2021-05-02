const child = require('child_process');
const chalk = require('chalk');
const path = require('path');
const os = require('os');

const scpSync = require('../lib/scp');
const sshSync = require('../lib/ssh');
const { string } = require('yargs');

const PROXY = '192.168.33.30';
const BLUE = '192.168.33.31';
const GREEN = '192.168.33.32';
const CONFIG = '192.168.33.20';

exports.command = 'canary <blue> <green>';
exports.desc = 'red-black deployment with canary analysis of a microservice';
exports.builder = yargs => {
    yargs.options({
        privateKey: {
            describe: 'Install the provided private key on the configuration server',
            type: 'string'
        }
    });
};


exports.handler = async argv => {
    const { privateKey, blue, green } = argv;

    (async () => {

        await run( privateKey, blue, green );

    })();

};

async function run(privateKey, blue, green) {

    console.log(chalk.greenBright('Installing configuration server!'));

    console.log(chalk.blueBright('Provisioning BLUE server for canary analysis...'));
    let result = child.spawnSync(`bakerx`, `run blue-srv queues --ip ${BLUE} --sync`.split(' '), {shell:true, stdio: 'inherit'} );
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.greenBright('Provisioning GREEN server for canary analysis...'));
    result = child.spawnSync(`bakerx`, `run green-srv queues --ip ${GREEN} --sync`.split(' '), {shell:true, stdio: 'inherit'} );
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.redBright('Provisioning PROXY server for canary analysis...'));
    result = child.spawnSync(`bakerx`, `run proxy-srv queues --ip ${PROXY} --sync`.split(' '), {shell:true, stdio: 'inherit'} );
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.blueBright('Cloning checbox.io in BLUE server...'));
    result = sshSync(`sudo git clone -b ${blue} https://github.com/chrisparnin/checkbox.io-micro-preview`, `vagrant@${BLUE}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.greenBright('Cloning checbox.io in GREEN server...'));
    result = sshSync(`sudo git clone -b ${green} https://github.com/chrisparnin/checkbox.io-micro-preview`, `vagrant@${GREEN}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }
    
    console.log(chalk.blueBright('Run checbox.io in BLUE server...'));
    result = sshSync(`cd /home/vagrant/checkbox.io-micro-preview; sudo npm install; sudo npm install pm2 -g; pm2 start index.js`, `vagrant@${BLUE}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.blueBright('Run checbox.io in GREEN server...'));
    result = sshSync(`cd /home/vagrant/checkbox.io-micro-preview; sudo npm install; sudo npm install pm2 -g; pm2 start index.js`, `vagrant@${GREEN}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.redBright('Run load balancing in proxy server...'));
    result = sshSync(`cd /bakerx/cm/canary_analysis; sudo npm install; sudo npm install pm2 -g; pm2 start serve.js`, `vagrant@${PROXY}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.redBright('Run REDIS client in blue server...'));
    result = sshSync(`"cd /bakerx/cm/monitoring/agent; sudo npm install; pm2 start 'node index.js blue-srv' --name agent"`, `vagrant@${BLUE}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.redBright('Run REDIS client in green server...'));
    result = sshSync(`"cd /bakerx/cm/monitoring/agent; sudo npm install; pm2 start 'node index.js green-srv' --name agent"`, `vagrant@${GREEN}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.redBright('Run Dashboard in proxy server...'));
    result = sshSync(`cd /bakerx/cm/monitoring/dashboard; npm install ; node app.js`, `vagrant@${PROXY}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }



    console.log(chalk.redBright('Deleting servers...'));
    const { exec } = require("child_process");
    exec("bakerx delete vm blue-srv", (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });
    
    exec("bakerx delete vm green-srv", (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });

    exec("bakerx delete vm proxy-srv", (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });

}