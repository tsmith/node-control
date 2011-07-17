/*global require, exports, console, spawn: true */

var spawn = require('child_process').spawn,
    path = require('path'),
    Log = require('./log').Log,
    prototype = {};

// The id of a controller is its address (used by tasks system).
function id() {
    return this.address;
}
prototype.id = id;

// Initialize ssh and scp options to an array so config logic can assume an
// array exists when adding or removing options. 
prototype.sshOptions = [];
prototype.scpOptions = [];


// Support logging
function log(message, prefix) {
    if (!this.logger) {
        this.logger = new Log(this.address + ':', this.logPath, true);
    }

    this.logger.puts(message, prefix, this.logPath);
}
prototype.logPath = 'control.log'; // Default
prototype.log = log;

function logBuffer(prefix, buffer) {
    var message = buffer.toString();
    this.log(message, prefix);
}
prototype.logBuffer = logBuffer;


// Support custom listeners via controller.stdout.on(event, callback) pattern
prototype.stdout = {};
prototype.stdout.listeners = 'stdoutListeners'; 
prototype.stdout.controller = prototype;

prototype.stderr = {};
prototype.stderr.listeners = 'stderrListeners'; 
prototype.stderr.controller = prototype;

function on(evt, callback) {
    var listeners = this.listeners,
        controller = this.controller;
    controller[listeners] = controller[listeners] || {};
    controller[listeners][evt] = callback;
}
prototype.stdout.on = on;
prototype.stderr.on = on;


// Controller support for adding listeners to subprocess stream upon call
function addListenersToStream(listeners, stream) {
    var evt, callback;
    if (listeners) {
        for (evt in listeners) {
            if (listeners.hasOwnProperty(evt)) {
                callback = listeners[evt];
                stream.on(evt, callback);
            }
        }
    }
}

function addCustomListeners(child) {
    var stdoutListeners = this.stdoutListeners,
        stderrListeners = this.stderrListeners;

    // Clear custom listeners on each call
    this.stdoutListeners = {};
    this.stderrListeners = {};

    addListenersToStream(stdoutListeners, child.stdout);
    addListenersToStream(stderrListeners, child.stderr);
}
prototype.addCustomListeners = addCustomListeners;


function listen(child, callback, exitCallback) {
    var codes = '', controller = this;

    this.stdin = child.stdin;

    this.addCustomListeners(child);

    child.stdout.addListener('data', function (data) {
        controller.logBuffer('stdout: ', data);
    });

    child.stderr.addListener('data', function (data) {
        controller.logBuffer('stderr: ', data);
    });

    child.addListener('exit', function (code) {
        controller.logBuffer('exit: ', code);
        if (code === 0) {
            if (callback) {
                callback();
            }
        } else {
            if (exitCallback) {
                exitCallback(code);
            }
        }
    });
}
prototype.listen = listen;

function star(mask) {
    var stars = '',
        i, length;
    for (i = 0, length = mask.length; i < length; i += 1)  {
        stars += '*';
    }
    return stars;
}

function ssh(command, callback, exitCallback) {
    if (!command) { 
        throw new Error(this.address + ': No command to run');
    }

    var user = this.user,
        options = this.sshOptions,
        mask = this.logMask, stars, 
        args = ['-l' + user, this.address, "''" + command + "''"],
        child;

    if (options) {
        args = options.concat(args);
    }

    if (mask) {
        stars = star(mask);
        while (command.indexOf(mask) !== -1) {
            command = command.replace(mask, stars);
        }
    }

    this.log(user + ':ssh: ' + command);
    child = spawn('ssh', args); 
    this.listen(child, callback, exitCallback);
}
prototype.ssh = ssh;

function scp(local, remote, callback, exitCallback) {
    if (!local) { 
        throw new Error(this.address + ': No local file path');
    }

    if (!remote) { 
        throw new Error(this.address + ': No remote file path');
    }

    var controller = this,
        user = this.user,
        options = this.scpOptions,
        address = this.address;
    path.exists(local, function (exists) {
        if (exists) {
            var reference = user + '@' + address + ':' + remote,
                args = ['-r', local, reference],
                child;

            if (options) {
                args = options.concat(args);
            }

            controller.log(user + ':scp: ' + local + ' ' + reference);
            child = spawn('scp', args);
            controller.listen(child, callback, exitCallback);
        } else {
            throw new Error('Local: ' + local + ' does not exist');
        }
    });
}
prototype.scp = scp;

exports.prototype = prototype; 
