const child = require('child_process');
const chalk = require('chalk');
const path = require('path');
const os = require('os');

const scpSync = require('../lib/scp');
const sshSync = require('../lib/ssh');
const { string } = require('yargs');

exports.command = 'setup';
exports.desc = 'Provision and configure the configuration server';
exports.builder = yargs => {
    yargs.options({
        privateKey: {
            describe: 'Install the provided private key on the configuration server',
            type: 'string'
        }
    }).positional('GH_USER', {
        alias: 'gh-user',
        describe: 'Github username',
        type: 'string',
        nargs: 1
    }).positional('GH_PASS', {
        alias: 'gh-pass',
        describe: 'Github password',
        type: 'string',
        nargs: 1
    });
};


exports.handler = async argv => {
    const { privateKey, GH_USER, GH_PASS } = argv;

    (async () => {

        await run( privateKey, GH_USER, GH_PASS );

    })();

};

async function run(privateKey, GH_USER, GH_PASS) {

    let filePath = '/bakerx/cm/playbook_config_srv.yml';
    let inventoryPath = '/bakerx/cm/inventory.ini';

    console.log(chalk.greenBright('Installing configuration server!'));

    console.log(chalk.blueBright('Provisioning configuration server...'));
    let result = child.spawnSync(`bakerx`, `run config-srv focal --ip 192.168.33.20 --memory 4096 --sync`.split(' '), {shell:true, stdio: 'inherit'} );
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.blueBright('Running init script...'));
    result = sshSync('/bakerx/cm/server-init.sh', 'vagrant@192.168.33.20');
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.blueBright('Running ansible script to install jenkins...'));
    result = sshSync(`/bakerx/cm/run-ansible.sh ${filePath} ${inventoryPath} ${GH_USER} ${GH_PASS}`, 'vagrant@192.168.33.20');
    if( result.error ) { process.exit( result.status ); }



}
