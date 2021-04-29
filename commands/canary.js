const child = require('child_process');
const chalk = require('chalk');
const path = require('path');
const os = require('os');

const scpSync = require('../lib/scp');
const sshSync = require('../lib/ssh');
const { string } = require('yargs');

const PROXY = '192.168.33.1';
const BLUE = '192.168.33.2';
const GREEN = '192.168.33.3';

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
    result = sshSync(`if [ -d "/home/vagrant/checkbox.io-micro-preview" ]; then rm -rf "/home/vagrant/checkbox.io-micro-preview"; fi; git clone -b ${blue} https://github.com/chrisparnin/checkbox.io-micro-preview`, `vagrant@${BLUE}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.greenBright('Cloning checbox.io in GREEN server...'));
    result = sshSync(`if [ -d "/home/vagrant/checkbox.io-micro-preview" ]; then rm -rf "/home/vagrant/checkbox.io-micro-preview"; fi; git clone -b ${green} https://github.com/chrisparnin/checkbox.io-micro-preview`, `vagrant@${GREEN}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }
    
    console.log(chalk.blueBright('Run checbox.io in BLUE server...'));
    result = sshSync(`cd /home/vagrant/checkbox.io-micro-preview; sudo npm install; sudo npm install pm2 -g; pm2 start index.js`, `vagrant@${BLUE}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.blueBright('Run checbox.io in GREEN server...'));
    result = sshSync(`cd /home/vagrant/checkbox.io-micro-preview; sudo npm install; sudo npm install pm2 -g; pm2 start index.js`, `vagrant@${GREEN}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

}