# Complexity

In this workshop, you'll be implementing a simple static analysis for validating basic properties of code.

``` | {type:'youtube'}
https://www.youtube.com/embed/VqBZT7dmGd0
```

## Setup

### Before you get started

Import this as a notebook or clone this repo locally. Also, ensure you [install latest version of docable](https://github.com/ottomatica/docable-notebooks/blob/master/docs/install.md)!

```bash
docable-server import https://github.com/CSC-DevOps/Complexity
```

Install dependencies for our code.

```bash | {type: 'command', failed_when: 'exitCode!=0'}
npm install
```

## Static Analysis Concepts

### Why regex isn't enough?

For the same reason [why parsing html with regex is problematic](https://stackoverflow.com/a/1732454/547112).

> will ins​tantly transport a programmer's consciousness into a world of ceaseless screaming, he comes, the pestilent slithy regex-infection wil​l devour your HT​ML parser, application and existence for all time like Visual Basic only worse he comes he comes do not fi​ght he com̡e̶s, ̕h̵i​s un̨ho͞ly radiańcé destro҉ying all enli̍̈́̂̈́ghtenment, HTML tags lea͠ki̧n͘g fr̶ǫm ̡yo​͟ur eye͢s̸ ̛l̕ik͏e liq​uid pain, the song of re̸gular exp​ression parsing will exti​nguish the voices of mor​tal man from the sp​here I can see it can you see ̲͚̖͔̙î̩́t̲͎̩̱͔́̋̀ it is beautiful t​he final snuffing of the lie​s of Man ALL IS LOŚ͖̩͇̗̪̏̈́T ALL I​S LOST the pon̷y he comes he c̶̮omes he comes the ich​or permeates all MY FACE MY FACE ᵒh god no NO NOO̼O​O NΘ stop the an​*̶͑̾̾​̅ͫ͏̙̤g͇̫͛͆̾ͫ̑͆l͖͉̗̩̳̟̍ͫͥͨe̠̅s ͎a̧͈͖r̽̾̈́͒͑e n​ot rè̑ͧ̌aͨl̘̝̙̃ͤ͂̾̆ ZA̡͊͠͝LGΌ ISͮ̂҉̯͈͕̹̘̱ TO͇̹̺ͅƝ̴ȳ̳ TH̘Ë͖́̉ ͠P̯͍̭O̚​N̐Y̡ H̸̡̪̯ͨ͊̽̅̾̎Ȩ̬̩̾͛ͪ̈́̀́͘ ̶̧̨̱̹̭̯ͧ̾ͬC̷̙̲̝͖ͭ̏ͥͮ͟Oͮ͏̮̪̝͍M̲̖͊̒ͪͩͬ̚̚͜Ȇ̴̟̟͙̞ͩ͌͝S̨̥̫͎̭ͯ̿̔̀ͅ


For example, what if we just simply used a regex to detect [message chains](https://relishapp.com/rspec/rspec-mocks/docs/working-with-legacy-code/message-chains) in code? Here is a simple example that illustrates where things could go wrong.

```js | {type: 'script'}
let file = `
a.fairly.long.message.chains.with.lots.of.data.accessors;

message.
    b.
    c.
    d.
    z.
    t.
    chains();

console.log("Waiting.................");
`;

for( var line of file.split(/\n/g) )
{
    if( line.includes('.') ) {
        let mc = line.split(/[.]/g);
        if( mc.length > 4 ) {
            console.log(`[BUILD FAILED] Message chain detected with length ${mc.length}: ${line}` );
        }
    }
}
```

While we can detect one message chain, we miss one, and falsely detect another.

The short answer is that any implementation of a static analysis that results in *both* high false positives and high false negatives is going to incite an angry mob of programmers, who will insist the tool be removed from the CI pipeline.

We need a technique that is more sound, more precise, and frankly often easier to implement than a basket of regex. See [A Few Billion Lines of Code Later: Using Static Analysis to Find Bugs in the Real World](https://cacm.acm.org/magazines/2010/2/69354-a-few-billion-lines-of-code-later/fulltext)

### Parsing

```js | {type: 'script'}
const esprima = require('esprima');
let ast = esprima.parse('var a = 6 * 7;');
console.log( JSON.stringify(ast, null, 3) );
```

Instead of treating code as a string of characters, by using a lexer and parser, we will turn those characters into tokens, and organize those tokens into a representation called an abstract syntax tree.

While is possible to [write a lexer and parser by-hand](https://github.com/CSC-DevOps/Parsing/blob/master/main.js), we can take advantage of a well-built parser for javascript, called [esprima](https://esprima.org/).

If you have not already watched this video, you can get more background about Esprima here:
Watch [5:00-14:30,28:00-34:00](https://www.youtube.com/watch?v=ACYZFkvq0Sk).

### Interactive AST

We will be inspecting some simple code, and understanding its corresponding AST.

<iframe id="serviceFrameSend" src="https://esprima.org/demo/parse.html?code=function%20functionName(%20node%20)%0A%7B%0A%09if(%20node.id%20)%0A%09%7B%0A%09%09return%20node.id.name%3B%0A%09%7D%0A%09return%20%22anon%20function%20%40%22%20%2B%20node.loc.start.line%3B%0A%7D" width="800" height="600"  frameborder="1"></iframe>

If you want to play with esprima in another browser tab, check out: http://esprima.org/demo/parse.html.

## Code Walkthrough

We will explore the template code used for performing our static analysis.

### Design Patterns 

While ASTs are powerful representations, without any tools, reasoning over ASTs can be unwieldly. Two design patterns are of importance here:

* A [Visitor pattern](https://en.wikipedia.org/wiki/Visitor_pattern), which is used to abstract the process of visiting a data structure such as our abstract syntax tree (AST).

* A [Builder pattern](https://en.wikipedia.org/wiki/Builder_pattern), which is used to build up state and then finally emit. Meaning, we can incrementally calculate results as with process the AST.


### AST Visitor

Imagine you wanted to write a simple script that could detect whether a method exceeded a certain number of lines. Trying to process and handle all the different tokens and tree structures of code would quickly get complex.

This is where the visitor pattern comes in. The function `traverseWithParents(ast, function)` is implementing a vistor pattern for the AST. What it will essentially do, is visit each node inside the AST, and repeatly callback the given function with each node of the tree. What this enables in short is a way for us to pay attention or selectively "visit" nodes of interest, while ignoring the others and without any knowledge of traversal.

```js | {type: 'info', range: {start: 1, end: 2}}
function printFunctionLengths(ast) {

   traverseWithParents(ast, function (node)  {
      if (node.type === 'FunctionDeclaration') 
      {
         let length = node.loc.end.line - node.loc.start.line;
         console.log( `Function: ${functionName(node)} with ${length} lines` );
      }
   });
}
```

This results in suprisingly powerful and compact code.

### Builder

As we're collecting information incrementally as we visit AST nodes, we need a way to store these partial results, before making a final analysis decision.

```js
// A builder for storing file level information.
function FileBuilder()
{
	this.FileName = "";
	// Number of strings in a file.
	this.Strings = 0;
	// Number of imports in a file.
	this.ImportCount = 0;

	this.report = function()
	{
		console.log (
			( "{0}\n" +
			  "~~~~~~~~~~~~\n"+
			  "ImportCount {1}\t" +
			  "Strings {2}\n"
			).format( this.FileName, this.ImportCount, this.Strings ));
	}
}
```

## Workshop

For the workshop, we will extend the analysis code to compute and validate several properties of the code.
Let's first see what the code runs by default:

``` bash | {type: 'command'}
node analysis.js test/code.js
```


### File Properties

1. We will start off with calculations a few simple properties of code.

   * **StringCount:** The number of string literals in the entire code file.  
     *Note:* That esprima does not use different tokens for integers and strings, you'll have to use a construct, like `typeof`, to accurately count the number of strings.

   * **PackageComplexity:** The number of imports used in the file.  
     *Note:* There is no _require_ token&mdash;you will have to find another way.

To help visualize the AST structure and identify relevant node types for your code, you use the interactive AST component above, or your can type in a quick expression and run the following script:

```js | {type: 'script'}
const esprima = require('esprima');
let ast = esprima.parse(`var dye = "yellow #";
var num = 5;
console.log("Message:" + dye + num);
`);
console.log( JSON.stringify(ast, null, 3) );
```

### Function Properties

2. We will extend our work to calculate additional properties of functions.

   * **ParameterCount**: The number of parameters in a function.
   * **MethodLength**: The number of lines in a function.

### Complexity Metrics

3. We will be calculating two well-known measures of code complexity. What's interesting, is that this will require using multiple visitors!

   * **SimpleCyclomaticComplexity**: The number of decision statements + 1.  
     _Note:_ You can use the helper method `isDecision(node)`, to check if a node is a if statement, loop, etc.).
   * **SimpleHalstead**: The number of unique symbols and operators in a function.
     _Note:_ For the purposes of the workshop, you can simply count the number of unique `Identifier` and `BinaryExpression` nodes in a function.

### Advanced Metrics

4. We will be calculating more advanced properties of code (This is optional for workshop, but will be useful for milestone).

   * **MaxConditions**: The max number of conditions (boolean predicates inside decision node) in one if statement.
   * **MaxNestingDepth**: The max depth of scopes (nested ifs, loops, etc).  
     Note: The suggested strategy is to:
     - Visit nodes until reaching a leaf node: `childrenLength(node) == 0`.
     - Tranverse up the tree from the leaf using `node.parent`.
     - Count the number of parents that are decision nodes.
     - Stop when reaching the top of FunctionDeclaration.
     - Keep the max depth.

``` | {type: 'terminal'}
```

Given the following function:

```js
function demo(a,b,c) {
   if( c && b ) { c = b * b; }
   else if( a )
   {
      if( b )
      {
         if( c )
         {
            console.log( a + b + c );
         }
      }
   }

   if( a || b || c )
   {
      return 0;
   }
   return 1;
}
```

The expected results include:

| Method Length | Parameters | MaxConditions | MaxNesting | Halstead Complexity | Cyclomatic Complexity | 
| ------------- | ---------- | ------------  | -----------| -------- | ------------------   |
| 18            |  3         | 3             | 3          | 9 (5 identifiers + 4 binaryexpressions )| 6 (5 decisions + 1)  |
