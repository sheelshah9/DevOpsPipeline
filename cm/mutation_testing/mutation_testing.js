const Random = require('random-js');
const fs = require('fs');
const path = require('path');
const spawnSync = require('child_process').spawnSync;
const rimraf = require("rimraf")

var iterations;
const srcDirectory = path.join("/home/vagrant/iTrust2-v8/iTrust2")

if (process.argv.length > 2) {
    iterations = process.argv[2]
}

class mutater {
    static random() {
        return mutater._random || mutater.seed(0)
    }

    static seed(kernel) {
        mutater._random = new Random.Random(Random.MersenneTwister19937.seed(kernel));
        return mutater._random;
    }

    static mutateStr(str) {
        let array = str.split("\n");
        let n = array.length
        let tenPercent = n / 10
        let rSet = new Set()
        while (rSet.size < tenPercent) {
            rSet.add(mutater._random.integer(0, array.length - 1))
        }
        let cp = [];
        for (var i = 0; i < array.length; i++) {
            let elem;
            if (rSet.has(i)) {

                elem = array[i]
                if (!isImportOrPackage(elem.trim())) {
                    // swap == with !=
                    elem = elem.replace(/==/g, ' != ')

                    // swap 0 with 1
                    elem = elem.replace(/0/g, '1')

                    // swap < with >
                    elem = elem.replace(/[^(List)|(Collection)|(Map)|(Set)|(SortedSet)|(Map.Entry)|(SortedMap)|(Enumeration)]</g, ">")

                    // 1) our own choice mutation replacing else if with if
                    elem = elem.replace(/else(\s*)if/gm, "if")

                    // 2) our own choice mutation replacing && with ||
                    elem = elem.replace(/&&/g, " || ")

                    // mutate string
                    if (elem.includes('\"')) {
                        elem = elem.replace(/"(.*?)"/g,
                            `"${mutater._random.string(mutater._random.integer(0, elem.length + 10))}"`);
                    }

                }
            } else {
                elem = array[i];
            }
            cp.push(elem)

        }
        return cp.join('\n')
    }

}

/*
Check if the string that we are trying to mutate is an import or package statement or any annotation or comment
 */

function isImportOrPackage(str) {
    if (str.startsWith("package") || str.startsWith("import")
        || str.startsWith("/*") || str.startsWith("*")
        || str.startsWith("//") || str.includes("@")) {

        return true;
    }
    return false;
}

function mutationTesting(paths, iterations, path_mutation_dir) {

    var testResults = [];
    var tmpdirpath = path.join(srcDirectory, 'tmp');
    passedTests = 0;

    if (!fs.existsSync(path_mutation_dir)) {
        fs.mkdirSync(path_mutation_dir);
    } else {
        rimraf.sync(path_mutation_dir)
        fs.mkdirSync(path_mutation_dir);
    }


    //Run the mutation fnction multiple times
    for (var iter = 1; iter <= iterations; iter++) {
        //Create a tmp directory if it doesn't exists
        if (!fs.existsSync(tmpdirpath)) {
            fs.mkdirSync(tmpdirpath);
        }
        let iterDirPath = path.join(path_mutation_dir, iter.toString())
        if (!fs.existsSync(iterDirPath)) {
            fs.mkdirSync(iterDirPath);
        }
        let modfilescache = {};
        let filepath = paths[mutater._random.integer(0, paths.length - 1)];
        let filesplit = filepath.split(path.sep);
        let filename = filesplit[filesplit.length - 1];
        let src = fs.readFileSync(filepath, 'utf-8');
        let dstpath = path.join(tmpdirpath, filename);

        //If file already mutated, skip the file
        if (modfilescache.hasOwnProperty(dstpath))
            continue;

        //Store the path to modified files in a dict
        modfilescache[dstpath] = filepath;

        //Copy the original file to tmp folder
        try {
            fs.copyFileSync(filepath, dstpath)
        } catch (err) {
            throw err;
        }

        //Mutate the file
        mutatedString = mutater.mutateStr(src);

        //Write back the mutated file to original location
        fs.writeFileSync(filepath, mutatedString, (err) => {
            if (err) throw err;
        });
        let iterFilePath = path.join(iterDirPath, filename)
        fs.writeFileSync(iterFilePath, mutatedString, (err) => {
            if (err) throw err;
        });


        try {
            //Run the test suite
            let output = spawnSync(`cd ${srcDirectory} && mvn clean test verify org.apache.maven.plugins:maven-checkstyle-plugin:3.1.0:checkstyle`, {
                encoding: 'utf-8',
                stdio: 'pipe',
                shell: true
            });
            //Push the test results to the array
            testResults.push({input: iter, stack: output.stdout});
        } catch (e) {
            // If build fails restart iteration
            console.log("Build error: Restarting iteration\n" + e);
            iter--;
        }

        //Copy the original files back to the working directory
        revertfiles(modfilescache, tmpdirpath);
    }

    failedTests = {};
    // Get failed tests in each iteration
    let countFailed = 0

    for (var i = 0; i < testResults.length; i++) {
        let flag = false
        let failed = testResults[i];
        let msg = failed.stack.split("\n");

        let mainName = "FAILURE!"
        msg.filter(function (line) {
            if (line.includes("<<< FAILURE!") || line.includes("<<< ERROR!") || line.includes("FAILURE!") || line.includes("ERROR!")) {
                var temp = line.split(" ");
                var test = temp[1].substring(temp[1].indexOf("(") + 1, temp[1].indexOf(")")) + "." + temp[1].split("(")[0];
                let currDir = temp[temp.length - 1]
                if (currDir !== 'FAILURE!' && currDir !== 'ERROR!')
                    mainName = currDir
                test = mainName + test
                if (test in failedTests) {
                    let arr = failedTests[test]
                    arr.push(failed.input)
                    failedTests[test] = arr;
                } else
                    failedTests[test] = [failed.input]

                if (!flag) {
                    countFailed += 1
                    flag = true
                }
            }
        });
    }

    // Create items array
    let items = Object.keys(failedTests).map(function (key) {
        return [key, failedTests[key]];
    });

    // Sort the array based on the second element
    items.sort(function (first, second) {
        return second[1] - first[1];
    });

    //Print test results
    let percentage = (countFailed / iterations) * 100
    console.log(`Overall mutation coverage: ${countFailed}/${iterations} (${percentage}%) mutations caught by the test suite.`)
    console.log("Useful tests" + "\n" + "============")
    items.forEach(item => {
        let splitted = item[0].split(".")
        if (splitted[splitted.length - 1].substring(0, 4) === "test") {
            console.log(`${item[1].length}/${iterations} ` + item[0])
            let failedIter = item[1]
            for (var i = 0; i < failedIter.length; i++) {
                let filenames = fs.readdirSync("/home/vagrant/mutation_dir" + "/" + failedIter[i].toString())
                console.log(`\t- /home/vagrant/mutation_dir/${failedIter[i]}/${filenames[0]}`)
            }
        }
    });
}


function revertfiles(modfilescache, dirpath) {
    if (fs.existsSync(dirpath)) {
        fs.readdirSync(dirpath).forEach((file, index) => {
            const curPath = path.join(dirpath, file);
            try {
                fs.copyFileSync(curPath, modfilescache[curPath])
            } catch (err) {
                throw err
            }
            fs.unlinkSync(curPath);
        });
        fs.rmdirSync(dirpath);
    }
}

function getsourcepath() {
    var srcdirpath = path.join(srcDirectory, 'src', 'main', 'java');
    var srcpaths = [];
    //Get a list of source files
    traverseDir(srcdirpath, srcpaths);
    return srcpaths;
}

function traverseDir(dir, srcpaths) {
    fs.readdirSync(dir).forEach(file => {
        let fullPath = path.join(dir, file);
        if (fs.lstatSync(fullPath).isDirectory()) {
            traverseDir(fullPath, srcpaths);
        } else {
            let path_split = fullPath.split(".");
            if (path_split[path_split.length - 1] == 'java')
                srcpaths.push(fullPath);
        }
    });
}

function main() {
    mutater.seed(11);
    paths = getsourcepath();
    path_mutation_dir = "/home/vagrant/mutation_dir"
    mutationTesting(paths, iterations, path_mutation_dir);
}


exports.mutationTesting = mutationTesting;
exports.mutater = mutater;

if (require.main === module) {
    main();
}
