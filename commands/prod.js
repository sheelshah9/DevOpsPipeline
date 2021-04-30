
const got    = require("got");
const chalk  = require('chalk');
const os     = require('os');
const fs = require('fs')
const scpSync = require('../lib/scp');

let config = {};

config.token = '';
var count= 0;

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
                JSON.stringify({
                        "name":dropletName,
                        "region":region,
                        "size":"s-1vcpu-1gb",
                        "image":imageName,
                        "ssh_keys": [process.env.FINGERPRINT ],
                        "backups":false,
                        "ipv6":false,
                        "user_data":null,
                        "private_networking":null
                });

                console.log("Attempting to create: "+ JSON.stringify(data) );
           
		 var headers =
                {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + config.token
                };

	       let response = await got.post("https://api.digitalocean.com/v2/droplets",
                {
                        headers:headers,
                        body: data,
                        json: true
                }).catch( err =>
                        console.error(chalk.red(`createDroplet: ${err}`)) );
               

        	if( !response ) return;

        	console.log(response.statusCode);
        	let droplet = response.body.droplet; // JSON.parse( response.body ).droplet;

        	if(response.statusCode == 202)
        	{
         	   console.log(chalk.green(`Created droplet id ${droplet.id}`));
        	}
        
        	await this.dropletInfo(dropletName, droplet.id);
    }

    async dropletInfo (name, id)
    {
	var ip;
        if( typeof id != "number" )
        {
            console.log( chalk.red("You must provide an integer id for your droplet!") );
            return;
        }
        var headers =
	{
                'Content-Type':'application/json',
                Authorization: 'Bearer ' + config.token
        };

     
        var ping = setInterval(async function(){
			let response = await got('https://api.digitalocean.com/v2/droplets/' + id, { headers: headers, responseType: 'json' })
			.catch(err => console.error(`dropletinfo ${err}`));
                       
			if( !response ) return;

			if( JSON.parse(response.body).droplet )
			{
				let droplet = JSON.parse(response.body).droplet;

				if(droplet.status == "active"){
					console.log(`${name} VM active`);
					// Print out IP address
					ip = droplet.networks.v4[1].ip_address
					console.log(`IP Address: ${ip}`);

					if(name == "checkbox"){
						writeFile("checkbox", ip);
					}else if(name == "itrust"){
						writeFile("itrust", ip);
					}else if(name == "monitor"){
						writeFile("monitor", ip);
					}
					clearInterval(ping);
				}
			}

		}, 1000);
    }
};


async function provision(argv)
{

       fs.writeFile('inventory.ini', '', function (err) {
		if (err) throw err;
		console.log('Reset Inventory File');
	})

       config.token = argv.API_TOKEN;
	if( !config.token )
	{
    		console.log(chalk.red`{red.bold pass Digital ocean API_TOKEN as an argument. See README or type --help for more information!}`);
    		process.exit(1);
	}
    
	let client = new DigitalOceanProvider();
    
	// Create an droplet with the specified name, region, and image
	var names = ["checkbox", "itrust", "monitor"]
	for (var i = 0; i < names.length; i++) {
		var name = names[i]
		var region = "nyc3"; // Fill one in from #1
		var image = "ubuntu-20-04-x64"; // Fill one in from #2
		await client.createDroplet(name, region, image);
	}
    
}

exports.command = 'prod <name>';
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

function writeFile(name, ip){
	var inventory = "[" + name + "]\n" + ip + "   ansible_ssh_private_key_file=/home/vagrant/.ssh/private_key    ansible_user=root\n\n["+ name+ ":vars]\nansible_ssh_common_args='-o StrictHostKeyChecking=no'\n\n";

	fs.appendFile('inventory.ini', inventory, function (err) {
		if (err) throw err;
		console.log(`Added IP Address for ${name} to inventory file`);
		count += 1;

		if (count == 3){
                         var temp =  scpSync("./inventory.ini", "vagrant@192.168.33.20:/bakerx/cm/");
        	}
	})
}


// Run workshop code...
exports.handler = async argv => {
    (async () => {
	await provision(argv);
    })();
};
