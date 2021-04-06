const esprima = require("esprima");
const options = {tokens:true, tolerant: true, loc: true, range: true };
const fs = require("fs");
const chalk = require('chalk');
var path = require('path');
const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require("constants");
const maxLOC = 100;
const maxMessageChain = 10;
const maxNestingDepth = 5;
var violations = 0;

function main()
{
	var args = process.argv.slice(2);

	if( args.length == 0 )
	{
		// default value is self if no other script is provided.
		args = ['analysis.js'];
	}
	var filePath = args[0];

	function searchDir(startPath,filter){
	
		if (!fs.existsSync(startPath)){
			console.log("no dir ",startPath);
			return;
		}
	
		var files=fs.readdirSync(startPath);
		for(var i=0;i<files.length;i++){
			var filename=path.join(startPath,files[i]);
			var stat = fs.lstatSync(filename);
			if (stat.isDirectory() && filename.indexOf("node_modules")<0){
				searchDir(filename,filter); //recurse
			}
			else if (filename.match(/.*\.(js)\b/ig)) {
				// console.log( "Parsing ast and running static analysis...");
				var builders = {};
				complexity(filename, builders);
				// console.log( "Complete.");


				// Report
				var temp = 0;
				var current_violations = violations;
				for( var node in builders ){
					var builder = builders[node];
					if (temp==0) builder.report();
					var flag = false;
					if (builder.Length>maxLOC){
						console.log(chalk`{red.underline Violation:} Long method detected`);
						flag = true;
						violations++;
					}
					if (builder.MaxMessageChain>maxMessageChain ){
						console.log(chalk`{red.underline Violation:} Long message chain detected`);
						flag = true;
						violations++;
					}
					if (builder.MaxNestingDepth>maxNestingDepth){
						console.log(chalk`{red.underline Violation:} Max nesting depth exceeded`);
						flag = true;
						violations++;
					}
					if (flag){
						builder.report();
					}
					temp++;
				}

				if (violations==current_violations){
					console.log("No violations detected\n");
				}
			};
		};
	};
	
	searchDir(filePath,'.js');

	if (violations>0){
		throw Error(violations+" violations detected. Failing build...");
	}
	

}



function complexity(filePath, builders)
{
	var buf = fs.readFileSync(filePath, "utf8");
	var ast = esprima.parse(buf, options);

	var i = 0;

	// Initialize builder for file-level information
	var fileBuilder = new FileBuilder();
	fileBuilder.FileName = filePath;
	builders[filePath] = fileBuilder;

	// Traverse program with a function visitor.
	traverseWithParents(ast, function (node) 
	{
		// File level calculations

		if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') 
		{
			var builder = new FunctionBuilder();

			builder.FunctionName = functionName(node);
			builder.StartLine    = node.loc.start.line;
			// Calculate length of function
			builder.Length = node.loc.end.line - node.loc.start.line;

			builders[builder.FunctionName] = builder;


		    // functiont for Max Chain calculation

			let current_chain_count = 0
			traverseWithParents(node, (nodeChild) =>{

				if(nodeChild.type == 'MemberExpression'){
						traverseWithParents(nodeChild, (nodeChildChild) =>{
							if(nodeChildChild.type == 'MemberExpression'){
								current_chain_count += 1;
							}
						})
				}

				builder.MaxMessageChain = Math.max(builder.MaxMessageChain, current_chain_count);
				//update current_chain_count to 0 in order to calculate chain for next function
				current_chain_count = 0;
            })


			 //Max Nesting Depth Calculation
            let maximum_nesting_depth;
			let subtract;
			traverseWithParents(node, (nodeChild) => {
				//checking the "if" condition 
				if (nodeChild.type == 'IfStatement') {
					traverseWithParents(nodeChild, (nodeChildChild) => {
						if (nodeChildChild.type == 'IfStatement') {

							if(nodeChildChild.nextSibling){
								subtract += 1;
							}
							maximum_nesting_depth += 1;
						}
					})
					maximum_nesting_depth -= subtract;
					subtract = 0;
					if (maximum_nesting_depth > builder.MaxNestingDepth) {
						builder.MaxNestingDepth = maximum_nesting_depth;
                    }
				}
			    maximum_nesting_depth = 0;
			})

			}

	});

}

// Represent a reusable "class" following the Builder pattern.
class FunctionBuilder
{
	constructor() {
		this.StartLine = 0;
		this.FunctionName = "";
		// The number of lines.
		this.Length = 0;
		// The max depth of scopes (nested ifs, loops, etc)
		this.MaxNestingDepth    = 0;
		
		this.MaxMessageChain = 0;
	}

	threshold() {

        const thresholds = {
            MaxNestingDepth: [{t: maxNestingDepth, color: 'red'}, {t: 3, color: 'yellow'}],
            MaxMessageChain: [{t: maxMessageChain, color: 'red'}, {t: 7, color: 'yellow'}],
            Length: [{t: maxLOC, color: 'red'}, {t: 70, color: 'yellow'} ]
        }

        const showScore = (id, value) => {
            let scores = thresholds[id];
            const lowestThreshold = {t: 0, color: 'green'};
            const score = scores.sort( (a,b) => {a.t - b.t}).find(score => score.t <= value) || lowestThreshold;
            return score.color;
        };

        this.MaxMessageChain = chalk`{${showScore('MaxMessageChain', this.MaxMessageChain)} ${this.MaxMessageChain}}`;
        this.Length = chalk`{${showScore('Length', this.Length)} ${this.Length}}`;
        
	}

	report()
	{
		this.threshold();

		console.log(
chalk`{blue.underline ${this.FunctionName}}(): at line #${this.StartLine}
Length: ${this.Length}
MaxMessageChain: ${this.MaxMessageChain}
MaxDepth: ${this.MaxNestingDepth}\n`
);
	}
};

// A builder for storing file level information.
function FileBuilder()
{
	this.FileName = "";

	this.report = function()
	{
		console.log (
			chalk`File name: {magenta.underline ${this.FileName}}`);

	}
}

// A function following the Visitor pattern.
// Annotates nodes with parent objects.
function traverseWithParents(object, visitor)
{
    var key, child;

    visitor.call(null, object);

    for (key in object) {
        if (object.hasOwnProperty(key)) {
            child = object[key];
            if (typeof child === 'object' && child !== null && key != 'parent') 
            {
            	child.parent = object;
					traverseWithParents(child, visitor);
            }
        }
    }
}

// Helper function for counting children of node.
function childrenLength(node)
{
	var key, child;
	var count = 0;
	for (key in node) 
	{
		if (node.hasOwnProperty(key)) 
		{
			child = node[key];
			if (typeof child === 'object' && child !== null && key != 'parent') 
			{
				count++;
			}
		}
	}	
	return count;
}


// Helper function for checking if a node is a "decision type node"
function isDecision(node)
{
	if( node.type == 'IfStatement' || node.type == 'ForStatement' || node.type == 'WhileStatement' ||
		 node.type == 'ForInStatement' || node.type == 'DoWhileStatement')
	{
		return true;
	}
	return false;
}

// Helper function for printing out function name.
function functionName( node )
{
	if( node.id )
	{
		return node.id.name;
	}
	return "anon function @" + node.loc.start.line;
}

main();
exports.main = main;
