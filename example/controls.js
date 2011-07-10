/*global require, process, console */

// Example with some advanced usage (advanced configuration, error
// callbacks, scpOptions, and config task command line arguments rewriting)
// using localhost as a 'remote' machine and this script recursively to
// simulate exit code returns on the 'remote' machine.

// Run like:
// node mycontroller.js myhost test 0 
// node mycontroller.js myhost test 64 
// node mycontroller.js mycluster test 0 
// node mycontroller.js mycluster test 64 
// node mycontroller.js mycluster scp
// node mycontroller.js mycluster clean
// node mycontroller.js myclusterarray test 0
// node mycontroller.js myclusterjson test 0
// node mycontroller.js mymachine 127.0.0.1 test 0 

var control = require('../'),
    task = control.task,
    script = process.argv[1],
    scpTest = 'controlScpTest';

task('mycluster', 'Prototype config for cluster of two or more', function () {
    var controllers = [], 
        local, controller; 

    local = Object.create(control.controller);

    // Tags to demonstrate chaining prototype usage
    local.user = process.env.USER;
    local.tags = ['local'];

    controller = Object.create(local);
    controller.address = 'localhost';    
    controller.scpOptions = ['-v'];
    controller.tags = controller.tags.concat(['dns']);
    controllers.push(controller);

    controller = Object.create(local);
    controller.address = '127.0.0.1';    
    controller.tags = controller.tags.concat(['ip']);
    controllers.push(controller);

    return controllers;
});

task('myclusterarray', 'Array config for cluster of two or more', function () {
    var controller = Object.create(control.controller);
    controller.user = process.env.USER;
    controller.scpOptions = ['-v'];

    return control.controllers(['localhost', '127.0.0.1'], controller);
});

task('myclusterjson', 'JSON Config for my cluster of two or more', function () {

    // Demonstrates JSON configuration usage
    var addresses = {
        'localhost': {
            user: process.env.USER,
            scpOptions: ['-v'],
            tags: ['local', 'dns']
        },
        '127.0.0.1': {
            user: process.env.USER,
            tags: ['local', 'ip']
        }
    };
    return control.controllers(addresses);
});

function configure(address) {
    var controller = Object.create(control.controller);

    controller.user = process.env.USER;
    controller.scpOptions = ['-v'];
    controller.address = address;    

    return [controller];
}

task('myhost', 'Config for cluster of one', function () {
    return configure('localhost');
});

task('mymachine', 'Config for single host from command line', function (args) {
    return configure([args.shift()]); // From command line arguments rewriting
});

function doTest(controller, code, callback, exitCallback) {
    code = code || 0; 
    controller.ssh('node ' + script + ' mycluster arbexit ' + code,
            callback, exitCallback);
}

// Task to perform 'remote' call requesting 'remote' to exit arbitrarily
task('test', 'Test task', function (controller, code) {
    if (controller.tags) {
        console.log('  Tags for ' + controller.address + ' are: ' + 
                controller.tags);
    }

    function callback() {
        console.log('  Regular callback activated for ' + controller.address);
    }

    function exitCallback(exit) {
        console.log('  Exit callback activated for ' + controller.address +
        ' with exit code ' + exit);
    }

    doTest(controller, code, callback, exitCallback);
});

// Task that will run on 'remote' to exit with an arbitrary code
task('arbexit', 'Arbitrary exit', function (controller, code) {
    code = code || 0; 
    console.log('  Exiting with code ' + code);
    process.exit(code);
});

task('scp', 'Test scp options', function (controller) {
    controller.scp(script, scpTest);
});

task('clean', 'Remove file transferred in scp testing', function (controller) {
    controller.ssh('rm ' + scpTest); 
});

control.begin();
