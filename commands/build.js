var jenkins = require('jenkins');
var util = require('util');
var exec = require('child_process').exec;
var JenkinsLogStream = require('jenkins-log-stream');
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

async function triggerBuild(job)
{
    let queueId = await jenkins.job.build(job);
    let buildId = await waitOnQueue(queueId);
    return buildId;
}

async function main(argv)
{
    jenkins = jenkins({ baseUrl: `http://${argv.username}:${argv.password}@192.168.33.20:9000`, crumbIssuer: true, promisify: true });
    console.log('Triggering build.')
    let buildId = await triggerBuild(argv.name).catch( e => console.log(e));

    console.log(`Received ${buildId}`);
    let build = await getBuildStatus(argv.name, buildId);
    console.log( `Build result: ${build.result}` );

    console.log(`Build output`);

    var stream = new JenkinsLogStream({
     'baseUrl': `http://${argv.username}:${argv.password}@192.168.33.20:9000`,
     'job': argv.name,
     'build': 'lastBuild',
     'pollInterval': 1000
    });

    stream.pipe(process.stdout);

}

exports.command = '$0 build <name>';
exports.desc = 'build configuration server';
exports.builder = yargs => {
    yargs.positional('name', {
        type: 'string',
        describe: 'name of build.',
        demandOption: true,
    }).option('username', {
        alias: 'u',
        default: 'admin'
    }).option('password', {
        alias: 'p',
        default: 'admin'
    });
};

exports.handler = async argv => {
    (async () => {
        await main(argv);
    })();
};
