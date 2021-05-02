const chalk = require('chalk');
const path = require('path');
const os = require('os');
var request = require('request');


const got = require('got');
const http = require('http');
const httpProxy = require('http-proxy');

// exports.command = 'serve';
// exports.desc = 'Run traffic proxy.';
// exports.builder = yargs => {};

// exports.handler = async argv => {
//     const { } = argv;

 
// };

const BLUE  = 'http://192.168.33.31:3000/';
const GREEN = 'http://192.168.33.32:3000/';

class Production
{
    constructor()
    {
        this.TARGET = BLUE;
        setInterval( this.healthCheck.bind(this), 60000 );
    }

    // TASK 1: 
    proxy()
    {
        let options = {};
        let proxy   = httpProxy.createProxyServer(options);
        let self = this;
        // Redirect requests to the active TARGET (BLUE or GREEN)
        let server  = http.createServer(function(req, res)
        {
            // callback for redirecting requests.
            proxy.web( req, res, {target: self.TARGET }, function(e) {console.log("ERROR: ",e)} );
        });
        server.listen(3090);
   }

   failover()
   {
      this.TARGET = BLUE;
   }

   async healthCheck()
   {
      try 
      {
         if (this.TARGET == GREEN){
            console.log("Diverting traffic to ", chalk.blue("BLUE"));
            this.TARGET = BLUE;
         }
         else{
            console.log("Diverting traffic to ", chalk.green("GREEN"));
            this.TARGET = GREEN;
         }
      }
      catch (error) {
         console.log(error);
      }
   }
   
}

async function run() {

    console.log(chalk.keyword('pink')('Starting proxy on localhost:3090'));

    let prod = new Production();
    prod.proxy();

}

(async () => {

   await run( );

})();
