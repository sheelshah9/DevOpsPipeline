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
    }).positional('gh-user', {
        alias: 'GH_USER',
        describe: 'Github username',
        type: 'string',
        nargs: 1
    }).positional('gh-pass', {
        alias: 'GH_PASS',
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

    let filePath = '/bakerx/cm/playbook.yml';
    let inventoryPath = '/bakerx/cm/inventory.ini';

    console.log(chalk.greenBright('Installing configuration server!'));

    console.log(chalk.blueBright('Provisioning configuration server...'));
    let result = child.spawnSync(`bakerx`, `run config-srv focal --ip 192.168.33.20 --sync`.split(' '), {shell:true, stdio: 'inherit'} );
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.blueBright('Port forwarding...'));
    result = child.spawnSync(`VBoxManage controlvm 'config-srv' natpf1 'jenkins,tcp,,9000,,9000'`, {shell:true, stdio:'inherit'});
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.blueBright('Running init script...'));
    result = sshSync('/bakerx/cm/server-init.sh', 'vagrant@192.168.33.20');
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.blueBright('Running ansible script to install jenkins...'));
    result = sshSync(`/bakerx/cm/run-ansible.sh ${filePath} ${inventoryPath} ${GH_USER} ${GH_PASS}`, 'vagrant@192.168.33.20');
    if( result.error ) { process.exit( result.status ); }



}
