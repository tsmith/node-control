/*global require, process, console */

// Example with some advanced usage:
//   advanced configuration
//   error callbacks
//   scpOptions 
//   config task command line arguments rewriting
//   custom listeners
//   stdin writing 
//
// Uses localhost as a 'remote' machine and this script recursively to simulate
// exit code returns, stderr and stout output, and stdin reading on the
// 'remote' machine.

// Run like:
// node controls.js myhost test 0 
// node controls.js myhost test 64 
// node controls.js mycluster test 0 
// node controls.js mycluster test 64 
// node controls.js mycluster scp
// node controls.js mycluster clean
// node controls.js myhost listeners
// node controls.js myhost stdin
// node controls.js myclusterarray test 0
// node controls.js myclusterjson test 0
// node controls.js mymachine 127.0.0.1 test 0 

var control = require('../'),
    task = control.task,
    script = process.argv[1],
    scpTest = 'controlScpTest';

task('mycluster', 'Prototype config for cluster of two', function () {
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

task('myclusterarray', 'Array config for cluster of two', function () {
    var controller = Object.create(control.controller);
    controller.user = process.env.USER;
    controller.scpOptions = ['-v'];

    return control.controllers(['localhost', '127.0.0.1'], controller);
});

task('myclusterjson', 'JSON Config for my cluster of two', function () {

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

// note that many sshd configs default to a low number of allowed connections
// run like: node controls.js many 5 test 
task('many', 'Config n controllers', function (args) {
    var controllers = [], shared, controller, i, l = args.shift();

    shared = Object.create(control.controller);
    shared.user = process.env.USER;
    
    for (i = 0; i < l; i += 1) {
        controller = Object.create(shared);
        controller.address = 'localhost';
        controllers.push(controller);
    }

    return controllers;
});

function doTest(controller, code, callback, exitCallback) {
    code = code || 0; 
    controller.ssh('node ' + script + ' myhost arbexit ' + code,
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
    console.log('  (stdout) Exiting with code ' + code);
    console.error('  (stderr) Exiting with code ' + code);
    process.exit(code);
});

task('scp', 'Test scp options', function (controller) {
    controller.scp(script, scpTest);
});

task('clean', 'Remove file transferred in scp testing', function (controller) {
    controller.ssh('rm ' + scpTest); 
});

task('listeners', 'Custom listener example', function (controller) {
    var stdout, stderr;

    controller.stdout.on('data', function (data) {
        console.log('  Custom stdout listerner called for ' + 
                controller.address);
        
        stdout = stdout || '';
        stdout = stdout += data.toString();
    });

    controller.stderr.on('data', function (data) {
        console.log('  Custom stderr listerner called for ' + 
                controller.address);
        stderr = stderr || '';
        stderr = stderr += data.toString();
    });

    doTest(controller, 0, function () {
        console.log('  Response gathered by custom stdout listener for ' + 
                controller.id() + ': \n' + stdout);
        console.log('  Response gatehered by custom stderr listener for ' + 
                controller.id() + ': \n' + stderr);
        doTest(controller, 0); // Custom listeners are now cleared
    });
});

task('echo', 'Stdin to stdout echo until "end"', function (controller) {
    console.log('Enter data to echo ("end" to stop echoing): ');
    process.stdin.resume();

    process.stdin.on('data', function (chunk) {
        process.stdout.write(chunk);
        chunk = chunk.toString();
        if (chunk.match('end')) {
            process.stdin.pause();
        }
    });
});

task('stdin', 'Test controller stdin usage', function (controller) {
    var stdout;

    controller.stdout.on('data', function (chunk) {
        chunk = chunk.toString();
        if (chunk.match('^Enter data')) {
            controller.stdin.write('hello\n');
            controller.stdin.write('end');
        }
    });

    controller.ssh('node ' + script + ' myhost echo');
});

task('ondate', 'Different logic paths based on date', function (controller) {
    var datestring = '';

    controller.stdout.on('data', function (chunk) {
        datestring += chunk.toString();
    });

    controller.ssh('date', function () {
        console.log('  Date string is ' + datestring);
        // Further logic dependent on value of datestring
    });
});

task('logchange', 'Call date two times, changing log path before second call', 
        function (controller) {
    controller.ssh('date', function () {
        controller.logPath = 'alt.log';
        controller.ssh('date -r 1');
    });
});

control.begin();
