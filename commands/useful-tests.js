const child = require('child_process');
const chalk = require('chalk');
const path = require('path');
const os = require('os');

const scpSync = require('../lib/scp');
const sshSync = require('../lib/ssh');
const { string } = require('yargs');

exports.command = 'useful-tests';
exports.desc = 'Find useful tests by running mutation test suite';
exports.builder = yargs => {
    yargs.options({
        privateKey: {
            describe: 'Install the provided private key on the configuration server',
            type: 'string'
        }
    }).positional('c', {
        describe: 'Number of iterations',
        type: 'integer',
        nargs: 1
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
    const { privateKey, c, GH_USER, GH_PASS } = argv;

    (async () => {

        await run( privateKey, c, GH_USER, GH_PASS );

    })();

};

async function run(privateKey, c, GH_USER, GH_PASS) {

    console.log(chalk.blueBright('Running init script...'));
    result = sshSync(`git clone https://${GH_USER}:${GH_PASS}@github.ncsu.edu/engr-csc326-staff/iTrust2-v8`,'vagrant@192.168.33.20')
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    result = sshSync(`cp /bakerx/cm/roles/prerequisites/templates/application.yml ./iTrust2-v8/iTrust2/src/main/resources/`,'vagrant@192.168.33.20')
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    result = sshSync(`node /bakerx/cm/mutation_testing/mutation_testing.js ${c}`,'vagrant@192.168.33.20');
    if( result.error ) { console.log(result.error); process.exit( result.status ); }


}
