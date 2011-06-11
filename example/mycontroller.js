/*global require, process, console */

// Example with some advanced usage, like error callbacks, scpOptions,
// and config task command line arguments rewriting, using localhost as
// a 'remote' machine.

var control = require('../'),
    task = control.task,
    script = process.argv[1],
    scpTest = 'controlScpTest';

function configure(addresses) {
    var config;
    config = {
        user: process.env.USER,
        scpOptions: ['-v']
    };
    return control.hosts(config, addresses); 
}

task('mycluster', 'Config for my cluster', function () {
    return configure([ 'localhost' ]); // Expand array to create cluster
});

task('myhost', 'Config for a single host from command line', function (args) {
    return configure([args.shift()]); // From command line arguments rewriting
});

function doTest(host, code, callback, exitCallback) {
    code = code || 0; 
    host.ssh('node ' + script + ' mycluster arbexit ' + code,
            callback, exitCallback);
}

// Task to perform 'remote' call requesting 'remote' to exit arbitrarily
task('test', 'Test task', function (host, code) {

    function callback() {
        console.log('Regular callback activated for ' + host.address);
    }

    function exitCallback(exit) {
        console.log('Exit callback activated for ' + host.address +
        ' with exit code ' + exit);
    }

    doTest(host, code, callback, exitCallback);
});

// Task that will run on 'remote' to exit with an arbitrary code
task('arbexit', 'Arbitrary exit', function (host, code) {
    code = code || 0; 
    console.log("Exiting with code " + code);
    process.exit(code);
});

task('scp', 'Test scp options', function (host) {
    var flag = host.scpOptions.pop();
    host.scp(script, scpTest); // Quietly 
    host.scpOptions.push(flag);
    host.scp(script, scpTest); // Verbosely
});

task('clean', 'Remove file transferred in scp testing', function (host) {
    host.ssh('rm ' + scpTest); 
});

control.begin();

// Run like:
// node mycontroller.js mycluster test 0 
// node mycontroller.js mycluster test 64 
// node mycontroller.js mycluster scp
// node mycontroller.js mycluster clean
// node mycontroller.js myhost 127.0.0.1 test 0 
