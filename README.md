# node-control

## Description

Define tasks for system administration or code deployment, then execute them on
one or many remote machines simultaneously. Strong logging creates a complete
audit trail of commands executed on remote machines in logs easily analyzed by
standard text manipulation tools.

node-control depends only on OpenSSH and Node on the local control machine.
Remote machines simply need a standard sshd daemon.

## Quick example

If you want to control remote machines from individual scripts without the
tasks system, see **Quick example without tasks**. Otherwise, to get the current
date from the two machines listed in the 'mycluster' config with a single
command:

``` javascript
var control = require('control'),
    task = control.task;

task('mycluster', 'Config for my cluster', function () {
    var config = {
        'a.domain.com': {
            user: 'alogin'
        },
        'b.domain.com': {
            user: 'blogin',
            sshOptions: ['-p 44'] // sshd daemon on non-standard port
        }
    };

    return control.controllers(config);
});


task('date', 'Get date', function (controller) {
    controller.ssh('date');
});

control.begin();
```

If saved in a file named `controls.js`, run with:

``` bash
node controls.js mycluster date
```

Each machine is contacted in parallel, date is executed, and the output from
the remote machine is printed to the console. Example console output:

```
 Performing mycluster
 Performing date for a.domain.com
a.domain.com:alogin:ssh: date
 Performing date for b.domain.com
b.domain.com:blogin:ssh: date
a.domain.com:stdout: Sun Jul 18 13:30:50 UTC 2010
b.domain.com:stdout: Sun Jul 18 13:30:51 UTC 2010
a.domain.com:exit: 0
b.domain.com:exit: 0
```

Each line of output is labeled with the address of the machine the command was
executed on. The actual command sent and the user used to send it is
displayed. stdout and stderr output of the remote process is identified
as well as the final exit code of the local ssh command. Each command, stdout,
stderr, and exit line also appears timestamped in a control.log file in the
current working directory.

See **Code deployment example** for an example of deploying an application to
remote servers.

## Installation

If you use npm:

``` bash
npm install control
```

If you do not use npm, clone this repository with git or download the latest
version using the GitHub repository Downloads link. Then use as a standard Node
module by requiring the node-control directory.

## Example controls

As you read this documentation, you may find it useful to refer to the
example/controls.js file. Its work tasks cover a variety of advanced usage. The
config tasks use your local machine as a mock remote machine or cluster, so if
you run an sshd daemon locally, you can run the controls against your own
machine to experiment.

## Config tasks

When using tasks, you always identify two tasks on the command line for remote
operations. The first task is the config task and the second task is the work
task. Config tasks have a name, description, and function that will be called
once:

``` javascript
task('mycluster', 'Config for my cluster', function () {
```

The config task function must return an array of controllers (objects that
extend the control.controller prototype, described further in **Controllers**).
Each controller in the array controls a single machine and optionally has its
own properties.

Config tasks enable definition of reusable work tasks independent of the
machines they will control. For example, if you have a staging environment with
different machines than your production environment, you can create two
different config tasks, each returning controllers for machines in the
respective environment, yet use the same deploy work task:

```bash
node controls.js stage deploy ~/myapp/releases/myapp-1.0.tgz

node controls.js production deploy ~/myapp/releases/myapp-1.0.tgz
```

If all the machines in a cluster share common properties, you can extend the
control.controller prototype and pass the new prototype into controllers() as
the second argument. For example, if all the machines in your cluster run sshd
on a non-standard port instead of just one as in **Quick example**:

``` javascript
task('mycluster', 'Config for my cluster', function () {
    var shared = Object.create(control.controller),
        config = {
            'a.domain.com': {
                user: 'alogin'
            },
            'b.domain.com': {
                user: 'blogin'
            }
        };

    shared.sshOptions = ['-p 44'];

    return control.controllers(config, shared);
});
```

`controllers()` will return an array of controllers that prototypically inherit
from the shared prototype instead of the base prototype, each having
controller-specific properties as defined in the JSON notation. In this case,
both controllers will effectively have `sshOptions = ['-p 44']`, but different
user names.

If all machines in your cluster have the same properties, can you pass an array
of addresses as the first argument to `controllers()`. For example, if all the
machines your cluster run sshd on a non-standard port and you use the same
login on each:

``` javascript
task('mycluster', 'Config for my cluster', function () {
    var shared = Object.create(control.controller), 
        addresses = [ 'a.domain.com',
                      'b.domain.com',
                      'c.domain.com' ];
    shared.user = 'mylogin'; 
    shared.sshOptions = ['-p 44'];
    return control.controllers(addresses, shared);
});
```

Alternatively, you can build up your list of controllers without the use of
`controllers()`:

``` javascript
task('mycluster', 'Config for my cluster', function () {
    var controllers = [],
        shared = Object.create(control.controller), // Extend prototype
        a, b;

    shared.sshOptions = ['p 44'];

    a = Object.create(shared); // Extend shared prototype
    a.address = 'a.domain.com';
    a.user = 'alogin';
    controllers.push(a);

    b = Object.create(shared);
    b.address = 'b.domain.com';
    b.user = 'blogin';
    controllers.push(b);

    return controllers;
});
```

## Work tasks

Work tasks define logic to drive each controller returned by the config task.
They have a name, description, and a callback that will execute independently
and simultaneously for each controller:

``` javascript
task('date', 'Get date', function (controller) {
```

Arguments on the command line after the name of the work task become arguments
to the work task's function. With this task:

``` javascript
task('deploy', 'Deploy my app', function (controller, release) {
```

This command:

``` bash
node controls.js stage deploy ~/myapp/releases/myapp-1.0.tgz
```

Results in:

``` bash
release = '~/myapp/releases/myapp-1.0.tgz'
```

More than one argument is possible:

``` javascript
task('deploy', 'Deploy my app', function (controller, release, tag) {
```

## Task execution

to execute the tasks identified on the command line, use the `begin()` method
after you have defined all your config and work tasks:

``` javascript
var control = require('control');
... // Define tasks
control.begin();
```

`begin()` calls the first (config) task identified on the command line to get the
array of controllers, then calls the second (work) task with each of the
controllers. If you run a control script and nothing happens, check if the
script calls `begin()`.

## Controllers

node-control provides a base controller prototype as `control.controller`, which
all controllers must extend. To create controllers, use the `controllers()`
method described in **Config tasks** or extend the base controller prototype and
assign the controller a DNS or IP address, user if not the same as the local
user, and any other properties required by work tasks or further logic:

``` javascript
var controller = Object.create(control.controller);
controller.address = 'a.domain.com'; // Machine to control
controller.user = 'mylogin'; // Username on remote machine if not same as local
controller.ips = [ // Example of property used by work task or further logic 
        '10.2.136.23',
        '10.2.136.24',
        '10.2.136.25',
        '10.2.136.26',
        '10.2.136.27'
    ];
```

The base controller prototype provides `ssh()` and `scp()` methods for
communicating with a controller's assigned remote machine.

The `ssh()` method takes one argument - the command to be executed on the
remote machine. The `scp()` method takes two arguments - the local file path and the
remote file path.

Both `ssh()` and `scp()` methods are asynchronous and can additionally take a
callback function that is executed once the ssh or `scp` operation is complete.
This guarantees that the first operation completes before the next one begins
on that machine:

``` javascript
    controller.scp(release, remoteDir, function () {
        controller.ssh('tar xzvf ' + remotePath + ' -C ' + remoteDir,
                function () {
```

You can chain callbacks as far as necessary.

If a command returns a non-zero exit code, the `scp()` and `ssh()` methods will log
the exit and exit code, but will not call the callback, ending any further
operations on that machine. This avoids doing further harm where a callback may
assume a successful execution of a previous command. However, you can specify
an exit callback that will be called and receive the exit code if a non-zero
exit occurs:

``` javascript
function callback() { ... }
function exitCallback(code) { ... }

controller.ssh('date', callback, exitCallback);
```

You can make both callbacks the same callback function if you want to check the
exit code and handle both zero and non-zero exits within a single callback.

## Custom stdout & stderr listeners

When running a command with `ssh()` on a remote device, controller objects listen
to the stdout and stderr of the process running on the remote device through
the local ssh process, printing what is heard to console and log. You can
attach your own listeners to these stdout and stderr streams to gather data to
use in your callback function:

``` javascript
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
```

Refer to Node's ReadableStream and EventEmitter documentation if the
`stdout.on()` pattern looks unfamiliar. Controllers also provide a `stderr.on()`
for attaching custom listeners to the stderr stream.

You can respond to prompts and errors as they happen in the remote process
through the remote process stdin stream, similar to expect. An example of
responding to a prompt through the stdin of the remote process:

``` javascript
task('stdin', 'Test controller stdin usage', function (controller) {
    var stdout;

    controller.stdout.on('data', function (chunk) {
        chunk = chunk.toString(); // Assumes chunks come in full lines
        if (chunk.match('^Enter data')) { // Assumes command uses this prompt
            controller.stdin.write('hello\n');
        }
    });

    controller.ssh('acommand');
});
```

The controller only uses custom listeners for the next `ssh()` or `scp()` call.
Further `ssh()` or `scp()` calls will not attach the custom listener unless it is
reattached via `controller.stdout.on()` or `controller.stderr.on()` before the next
call. This avoids unanticipated usage of one-off listeners, such as filling the
datestring variable in the first example with the output of every subsequent
`ssh()` command executed by the controller.

## Performing multiple tasks

A task can call other tasks using `perform()` and optionally pass arguments to
them:

``` javascript
var perform = require('control').perform;

task('mytask', 'My task description', function (controller, argument) {
    perform('anothertask', controller, argument);
```

`perform()` requires only the task name and the controller. Arguments are
optional. If the other task supports it, optionally pass a callback function as
one of the arguments:

``` javascript
    perform('anothertask', controller, function () {
```

Tasks that support asynchronous performance should call the callback function
when done doing their own work. For example:

``` javascript
task('anothertask', 'My other task', function (controller, callback) {
    controller.ssh('date', function () {
        if (callback) {
            callback();
        }
    });
});
```

The `peform()` call can occur anywhere in a task, not just at the beginning.

## Listing tasks

To list all defined tasks with descriptions:

``` bash
node controls.js mycluster list
```

## Namespaces

Use a colon, dash, or similar convention when naming if you want to group tasks
by name. For example:

``` javascript
task('bootstrap:tools', 'Bootstrap tools', function (controller) {
...
task('bootstrap:compilers', 'Bootstrap compilers', function (controller) {
```

## Sudo

To use sudo, just include sudo as part of your command:

``` javascript
controller.ssh('sudo date');
```

This requires that sudo be installed on the remote machine and have requisite
permissions setup.

## Roles

Some other frameworks like Capistrano provide the notion of roles for different
machines. node-control does not employ a separate roles construct. Since
controllers can have any properties defined on them in a config task, a
possible pattern for roles if needed:

``` javascript
task('mycluster', 'Config for my cluster', function () {
    var dbs = Object.create(control.controller),
        apps = Object.create(control.controller);

    dbs = {
        user: 'dbuser',
        role: 'db'
    };

    apps = {
        user: 'appuser',
        role: 'app'
    };

    dbs = control.controllers(['db1.domain.com', 'db2.domain.com'], dbs);
    apps = control.controllers(['app1.domain.com', 'app2.domain.com'], apps);

    return dbs.concat(apps);
});

task('deploy', 'Deploy my system', function (controller, release) {
    if (controller.role === 'db') {
        // Do db deploy work
    }

    if (controller.role === 'app') {
        // Do app deploy work
    }
});
```

## Logs

All commands sent and responses received are logged with timestamps (from the
control machine's clock). By default, logging goes to a control.log file in the
working directory of the node process. However, you can override this in your
control script:

``` javascript
task('mycluster', 'Config for my cluster', function () {
    var shared, addresses;
    shared = {
        user: 'mylogin',
        logPath: '~/mycluster-control.log'
    };
    addresses = [ 'a.domain.com',
                  'b.domain.com',
                  'c.domain.com' ];
    return control.controllers(addresses, shared);
});
```

Since each controller gets its own log property, every controller could
conceivably have its own log fie. However, every line in the log file has a
prefix that includes the controller's address so, for example:

``` bash
grep a.domain.com control.log | less
```

Would allow paging the log and seeing only lines pertaining to
a.domain.com.

If you send something you do not want to get logged (like a password) in a
command, use the log mask:

``` javascript
controller.logMask = secret;
controller.ssh('echo ' + secret + ' > file.txt');
```

The console and command log file will show the masked text as asterisks instead
of the actual text.

## SSH

To avoid repeatedly entering passwords across possibly many machines, use
standard ssh keypair authentication.

Each `controller.ssh()` call requires a new connection to the remote machine. To
configure ssh to reuse a single connection, place this:

```
Host *
ControlMaster auto
ControlPath ~/.ssh/master-%r@%h:%p
```

In your ssh config file (create if it does not exist):

```
~/.ssh/config
```

To pass options to the ssh command when using `ssh()`, add the option or options
as an array to the sshOptions property of the controller or controllers'
prototype:

``` javascript
controller.sshOptions = [ '-2', '-p 44' ];
```

Use `scpOptions` in the same manner for `scp()`.

## Config task command line arguments rewriting

config tasks receive a reference to the array of remaining arguments on the
command line after the config task name is removed. Therefore, config tasks
can rewrite the command line arguments other than the config task name. Example:

``` javascript
function configure(addresses) {
    var shared;
    shared = {
        user: 'mylogin'
    };
    return control.controllers(addresses, shared);
}

task('mycluster', 'Config for my cluster', function () {
    var addresses = [ 'a.domain.com',
                      'b.domain.com',
                      'c.domain.com' ];
    return configure(addresses);
});

task('mymachine', 'Config for one machine from command line', function (args) {
    return configure([args.shift()]); // From command line arguments rewriting
});
```

With this set of config tasks, if there is an ad hoc need to run certain tasks
against a single machine in the cluster, but otherwise have identical
configuration as when run as part of the cluster, the machine address can be
specified on the command line:

``` bash
node controls.js mymachine b.domain.com mytask x
```

In that case, the mymachine config task receives as args:

``` javascript
['b.domain.com', 'mytask', 'x']
```

This is generally not necessary since you can edit the config task in the
control file at any time, but is available if config tasks need to have command
line arguments or rewrite the work task name and its arguments on the fly.

## Code deployment example

A task that will upload a local compressed tar file containing a release of a
node application to a remote machine, untar it, and start the node application.

``` javascript
var path = require('path');

task('deploy', 'Deploy my app', function (controller, release) {
    var basename = path.basename(release),
        remoteDir = '/apps/',
        remotePath = path.join(remoteDir, basename),
        remoteAppDir = path.join(remoteDir, 'myapp');
    controller.scp(release, remoteDir, function () {
        controller.ssh('tar xzvf ' + remotePath + ' -C ' + remoteDir, 
                function () {
            controller.ssh("sh -c 'cd " + remoteAppDir + " && node myapp.js'"); 
        });
    });
});
```

Execute as follows, for example:

``` bash
node controls.js mycluster deploy ~/myapp/releases/myapp-1.0.tgz
```

A full deployment solution would shut down the existing application and have
different directory conventions. node-control does not assume a particular
style or framework. It provides tools to build a custom deployment strategy for
your application, system, or framework.

## Quick example without tasks

You can create scripts to run individually instead of through the tasks system
by using `controllers()` to create an array of controllers and then using
the controllers directly:

``` javascript
var control = require('../'),
    shared = Object.create(control.controller),
    i, l, controller, controllers;

shared.user = 'mylogin';
controllers = control.controllers(['a.domain.com', 'b.domain.com'], shared);

for (i = 0, l = controllers.length; i < l; i += 1) {
    controller = controllers[i];
    controller.ssh('date');
}
```

If saved in a file named 'controls.js', run with:

``` bash
node controls.js
```

See `example/taskless.js` for a working example you can run against your local
machine if running a local sshd.

## Contributors

* [David Pratt](https://github.com/fairwinds)

## Feedback

Welcome at node@thomassmith.com or the Node mailing list.
