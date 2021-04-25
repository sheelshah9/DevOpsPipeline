
const got    = require("got");
const chalk  = require('chalk');
const os     = require('os');
const fs = require('fs')
const scpSync = require('../lib/scp');

let config = {};
// Retrieve our api token from the environment variables.
config.token = '';

console.log(chalk.green(`Your token is: ${config.token.substring(0,4)}...`));

// Configure our headers to use our token when making REST api requests.

class DigitalOceanProvider
{
    async createDroplet (dropletName, region, imageName )
    {
        if( dropletName == "" || region == "" || imageName == "" )
        {
            console.log( chalk.red("You must provide non-empty parameters for createDroplet!") );
            return;
        }

        var data =
            {
                "name": dropletName,
                "region":region,
                "size":"s-1vcpu-1gb",
                "image":imageName,
                "ssh_keys": [process.env.FINGERPRINT], 
                "backups":false,
                "ipv6":false,
                "user_data":null,
                "private_networking":null
            };

        console.log("Attempting to create: "+ JSON.stringify(data) );

        var headers =
    	    {
        	'Content-Type':'application/json',
        	Authorization: 'Bearer ' + config.token
	    };

	let response = await got.post("https://api.digitalocean.com/v2/droplets",
            {
                headers:headers,
                json: data
            }).catch( err =>
            console.error(chalk.red(`createDroplet: ${err}`))
        );

        if( !response ) return;

        console.log(response.statusCode);
        let droplet = JSON.parse( response.body ).droplet;

        if(response.statusCode == 202)
        {
            console.log(chalk.green(`Created droplet id ${droplet.id}`));
        }
    } 

};
async function provision(argv)
{

     config.token = argv.API_TOKEN;

     if( !config.token )
	{
    		console.log(chalk.red`{red.bold pass Digital ocean API_TOKEN as an argument. See README or type --help for more information!}`);    		
    		process.exit(1);
	}

	let client = new DigitalOceanProvider();

     // #3 Create an droplet with the specified name, region, and image
     var names = ["checkbox", "iTrust", "monitoring"]
     for (var i = 0; i < names.length; i++) {
        var name = names[i]
        var region = "nyc1"; // Fill one in from #1
        var image = "debian-10-x64"; // Fill one in from #2
        await client.createDroplet(name, region, image);
     }
}

exports.command = '$0 prod <name>';
exports.desc = 'build configuration server';
exports.builder = yargs => {
    yargs.positional('up', {
        type: 'string',
        describe: 'provision the server.',
        demandOption: true,
    }).option('API_TOKEN', {
        alias: 'api-token',
    });
};


// Run workshop code...
exports.handler = async argv => {
    (async () => {
	await provision(argv);	
    })();
};
