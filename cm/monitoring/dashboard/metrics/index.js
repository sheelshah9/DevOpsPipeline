const redis = require('redis');
const got = require('got');
const fs = require('fs');
const path = require('path');
var mwu = require('./mann-whitney-utest');

var request = require('request');

const BLUE_SRV = '192.168.33.31';
const GREEN_SRV = '192.168.33.32';

const BLUE_END = 'http://'+BLUE_SRV+':3000/preview';
const GREEN_END = 'http://'+GREEN_SRV+':3000/preview';

var current_time = 0;
let client = undefined;
var ans_anlysis = {};
var mwu = require('mann-whitney-utest');

var blue_stats = {
	"memory": [],
	"cpu": [],
	"latency": [],
	"status": []
};

var green_stats = {
	"memory": [],
	"cpu": [],
	"latency": [],
	"status": []
};

var TARGET = BLUE_END;

/// Servers data being monitored.
var servers = 
[
	{name: "blue-srv",url: 'http://'+BLUE_SRV+':3000', status: "#cccccc",  scoreTrend : [0]},
	{name: "green-srv",url: 'http://'+GREEN_SRV+':3000', status: "#cccccc",  scoreTrend : [0]},
];


function start(app)
{
	//console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$");
	////////////////////////////////////////////////////////////////////////////////////////
	// DASHBOARD
	////////////////////////////////////////////////////////////////////////////////////////
	// const io = require('socket.io')(3000);
	// // Force websocket protocol, otherwise some browsers may try polling.
	// io.set('transports', ['websocket']);
	// // Whenever a new page/client opens a dashboard, we handle the request for the new socket.
	// io.on('connection', function (socket) {
    //     console.log(`Received connection id ${socket.id} connected ${socket.connected}`);

	// 	if( socket.connected )
	// 	{
	// 		//// Broadcast heartbeat event over websockets ever 1 second
	// 		var heartbeatTimer = setInterval( function () 
	// 		{
	// 			socket.emit("heartbeat", servers);
	// 		}, 1000);

	// 		//// If a client disconnects, we will stop sending events for them.
	// 		socket.on('disconnect', function (reason) {
	// 			console.log(`closing connection ${reason}`);
	// 			clearInterval(heartbeatTimer);
	// 		});
	// 	}
	// });

	/////////////////////////////////////////////////////////////////////////////////////////
	// REDIS SUBSCRIPTION
	/////////////////////////////////////////////////////////////////////////////////////////
	
	// We subscribe to all the data being published by the server's metric agent.
	client = redis.createClient(6379, 'localhost', {});
	for( var server of servers )
	{
		// The name of the server is the name of the channel to recent published events on redis.
		client.subscribe(server.name);
	}
	// When an agent has published information to a channel, we will receive notification here.
	client.on("message", function (channel, message) 
	{
		for( var server of servers )
		{
			// Update our current snapshot for a server's metrics.
			// console.log(server.name, channel);
			if( server.name == channel)
			{
				let payload = JSON.parse(message);
				server.memoryLoad = payload.memoryLoad;
				server.cpu = payload.cpu;
				updateHealth(server);
			}
		}
	});

	// LATENCY CHECK
	var latency = setInterval( function () 
	{
		for( var server of servers )
		{
			if( server.url )
			{
				let now = Date.now();

				// Bind a new variable in order to for it to be properly captured inside closure.
				let captureServer = server;

				// Make request to server we are monitoring.
				got(server.url, {timeout: 5000, throwHttpErrors: false}).then(function(res)
				{
					// TASK 2
					captureServer.statusCode = res.statusCode;
					captureServer.latency = res.timings.end - now;
					// console.log("-------------------", res.timings.end, now, captureServer.latency);
				}).catch( e => 
				{
					// console.log(e);
					captureServer.statusCode = e.code;
					captureServer.latency = 5000;
				});
			}
		}
	}, 100);

	siege = setInterval( function (){
		
		var switching = true;
		try 
		{
  
		  var options = {
			  uri: TARGET,
			  method: 'POST',
			  json:{
				"markdown":"\n{NumberQuestions:true}\n-----------\nStart with header for global options:\n\n    {NumberQuestions:true}\n    -----------\n\n### Multiple Choice Question (Check all that apply)\n\nA *description* for question.  \nQuestions are created with headers (level 3) `### Multiple Choice Question (Check all that apply)`.\n\n* Choice A\n* Choice B\n* Choice C\n\n### Single Choice Question\n\nMarkdown is great for including questions about code snippets:\n```\n$(document).ready( function()\n{\n    ko.applyBindings(new TaskViewModel());\n\tvar converter = new Markdown.Converter();\n\tdocument.write(converter.makeHtml(\"**I am bold**\"));\n});\n```\n\n1. Choice\n2. Choice\n3. Choice\n\n### Ranking/Rating Table\n\nThe first column has the description.  [Use github flavored markdown for table formatting](https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet#wiki-tables).\n\n|                       | Do not Want | Sometimes | Always |\n| --------------------- | ----------- | --------- | ------ | \n| Search terms used in IDE\t                      |  |  |  |\n| Code that did not work out and was deleted.     |  |  |  |\n| Time spent on particular edits\t              |  |  |  |\n| Code and files viewed\t                          |  |  |  |\n"
				}
  
			};
			
			request(options, function (error, response, body) {
			  if (response.statusCode == 200 && !error) {
				if(TARGET == BLUE_END){
					switching = false;
					blue_stats.status.push(0);
				}else{
					switching = true;
					green_stats.status.push(0);
				}
			  }else{
				if(TARGET == BLUE_END){
					switching = false;
					blue_stats.status.push(1);
				}else{
					switching = true;
					green_stats.status.push(1);
				}
			  }
			});

		}
		catch (error) {
		   console.log(error);
		}
  
		current_time += 100;
		if(current_time == 60000){
		  TARGET = GREEN_END;
		}
  
		else if(current_time == 120000){
			clearInterval(latency);
			clearInterval(siege);

			console.log(blue_stats);
			console.log(green_stats);
		}
	}, 100);
}

// TASK 3
function updateHealth(server)
{
	if(server.name == 'blue-srv'){
		blue_stats["cpu"].push(server.cpu);
		blue_stats["latency"].push(server.latency);
		blue_stats["memory"].push(server.memoryLoad);

	}else if(server.name == 'green-srv'){
		green_stats["cpu"].push(server.cpu);
		green_stats["latency"].push(server.latency);
		green_stats["memory"].push(server.memoryLoad);
	}

	if(current_time == 120000){
		client.quit();
		get_Canary_Analysis();
	}
}

function get_Canary_Analysis(){
	console.log("\tCanary Analysis ---> Blue AND Green Servers");

	var test_pass = 0;

	var temp = [];
	for (var latency in blue_stats["latency"]){
		if (latency!=undefined){
			temp.push(latency);
		}
	}

	blue_stats["latency"] = temp; 

	temp = [];
	for (var latency in green_stats["latency"]){
		if (latency!=undefined){
			temp.push(latency);
		}
	}

	green_stats["latency"] = temp;

	var res = mwu.test([blue_stats["cpu"], green_stats["cpu"]]);
	console.log("CPU: ", res);

	significant = mwu.significant(res, [blue_stats["cpu"], green_stats["cpu"]]);
	if(significant){
		ans_anlysis["cpu"] = " ===> FAIL <=== Data has significant difference";
	}else {
		ans_anlysis["cpu"] = " ===> PASS <=== No significant difference found in data";
		test_pass++;
	}

	
	res = mwu.test([blue_stats["memory"], green_stats["memory"]]);
	console.log("Memory: ", res);

	var significant = mwu.significant(res, [blue_stats["memory"], green_stats["memory"]]);
	if(significant){
		ans_anlysis["memory"] = " ===> FAIL <=== Data has significant difference";
	}else {
		ans_anlysis["memory"] = " ===> PASS <=== No significant difference found in data";
		test_pass++;
	}

	var avg_blue_status = 0
	var avg_green_status = 0

	var total = blue_stats["status"].reduce((sum, num) => sum + num, 0);
	avg_blue_status = (total / blue_stats.status.length) * 100;

	total = green_stats["status"].reduce((sum, num) => sum + num, 0);
	avg_green_status = (total / green_stats.status.length) * 100;
	// console.log("AVG GREEN STATUS", avg_green_status, total, green_stats["status"].length);


	if( Math.abs(avg_blue_status - avg_green_status) > 20){
		ans_anlysis["status"] = " ===> FAIL <=== Data has significant difference";
	} else {
		ans_anlysis["status"] = " ===> PASS <=== No significant difference found in data";
		test_pass++;
	}

	res = mwu.test([blue_stats["latency"], green_stats["latency"]]);
	console.log("LATENCY: ", res);

	significant = mwu.significant(res, [blue_stats["latency"], green_stats["latency"]]);
	if(significant){
		ans_anlysis["latency"] = " ===> FAIL <=== Data has significant difference";
	}else {
		ans_anlysis["latency"] = " ===> PASS <=== No significant difference found in data";
		test_pass++;
	}

	ans_anlysis["canary_score"] = (test_pass/4)*100;
	//
	//console.log("Canary score => ", ans_anlysis["canary_score"])
	var outcome = "";
	if (ans_anlysis["canary_score"] >= 90) //as given in req
	{
		outcome = "PASS";
	}
	else{
		outcome = "FAIL";
	}
	ans_anlysis["outcome"] = outcome;
	
	console.log("\n\n\t****************** CANARY ANALYSIS REPORT ***********************\n\n\n");
	console.log(`\tMemory\t=>\t${ans_anlysis["memory"]}`);
	console.log(`\tCPU\t=>\t ${ans_anlysis["cpu"]}`);
	console.log(`\tLatency exp  =>${ans_anlysis["latency"]}`);
	console.log(`\tStatus \t=>\t${ans_anlysis["status"]}`);

	console.log(`\n\n\n\tFinal CANARY SCORE\t => \t ${ans_anlysis["canary_score"]}`);
	if(ans_anlysis["outcome"] == "PASS"){
		console.log(`\t Result of CANARY ANALYSIS\t => \t${ans_anlysis["outcome"]}`)
		console.log('\n\t Satisfies the threshold of 90 percent');
	} else {
		console.log(`\t Result of CANARY ANALYSIS\t => \t${ans_anlysis["outcome"]}`)
		console.log('\n\t Did not Satisfy the threshold of 90 percent\n');
	}
}

function score2color(score)
{
	if (score <= 0.25) return "#ff0000";
	if (score <= 0.50) return "#ffcc00";
	if (score <= 0.75) return "#00cc00";
	return "#00ff00";
}

module.exports.start = start;