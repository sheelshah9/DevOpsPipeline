const child = require('child_process');
const chalk = require('chalk');
const path = require('path');
const os = require('os');
var util = require('util');
var exec = require('child_process').exec;
var JenkinsLogStream = require('jenkins-log-stream');
const { string } = require('yargs');
const sshSync = require('../lib/ssh');

async function getBuildStatus(job, id) {	
    return new Promise(async function(resolve, reject)
    {
        console.log(`Fetching ${job}: ${id}`);
        let result = await jenkins.build.get(job, id);
        resolve(result);
    });
}

async function waitOnQueue(id) {
    return new Promise(function(resolve, reject)
    {
        jenkins.queue.item(id, function(err, item) {
            if (err) throw err;
            // console.log('queue', item);
            if (item.executable) {
                console.log('number:', item.executable.number);
                resolve(item.executable.number);
            } else if (item.cancelled) {
                console.log('cancelled');
                reject('canceled');
            } else {
                setTimeout(async function() {
                    resolve(await waitOnQueue(id));
                }, 5000);
            }
        });
    });
}


async function main(argv)
{
    
    console.log(argv.name);
    if (argv.name == "checkbox.io"){

	let filePath = '/bakerx/cm/playbook_checkbox.yml';
    	let inventoryPath = '/bakerx/cm/'+argv.inventory;

	console.log(chalk.blueBright('Running ansible script to configure checkbox.io app deploy server'));	
        result = sshSync(`/bakerx/cm/run-ansible.sh ${filePath} ${inventoryPath}`, 'vagrant@192.168.33.20');
        if( result.error ) { process.exit( result.status ); }
     }

    else if(argv.name == "iTrust"){

        let filePath = '/bakerx/cm/playbook_itrust.yml';
        let inventoryPath = '/bakerx/cm/'+argv.inventory;

        console.log(chalk.blueBright('Running ansible script to configure checkbox.io app deploy server'));
        result = sshSync(`/bakerx/cm/run-ansible.sh ${filePath} ${inventoryPath}`, 'vagrant@192.168.33.20');
        if( result.error ) { process.exit( result.status ); }

    }
}

exports.command = 'deploy <name>';
exports.desc = 'configure deploy server';
exports.builder = yargs => {
    yargs.positional('name', {
        type: 'string',
        describe: 'name of build.',
        demandOption: true,
    }).option('inventory', {
        alias: 'i',
    });
};

exports.handler = async argv => {
    (async () => {
        await main(argv);
    })();
};
