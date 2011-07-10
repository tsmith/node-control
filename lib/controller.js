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

function log(message, prefix) {

    // TODO Modify Log module to support passing a filename with puts() 
    // so logger only opens a new WriteStream if logPath changes. 
    var logger = new Log(this.address + ':', this.logPath, true);
    logger.puts(message, prefix);
}
prototype.logPath = 'control.log'; // Default
prototype.log = log;

function logBuffer(prefix, buffer) {
    var message = buffer.toString();
    this.log(message, prefix);
}
prototype.logBuffer = logBuffer;

function listen(subProcess, callback, exitCallback) {
    var codes = '', controller = this;
    subProcess.stdout.addListener('data', function (data) {
        controller.logBuffer('stdout: ', data);
    });

    subProcess.stderr.addListener('data', function (data) {
        controller.logBuffer('stderr: ', data);
    });

    subProcess.addListener('exit', function (code) {
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
        subProcess;

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
    subProcess = spawn('ssh', args); 
    this.listen(subProcess, callback, exitCallback);
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
                subProcess;

            if (options) {
                args = options.concat(args);
            }

            controller.log(user + ':scp: ' + local + ' ' + reference);
            subProcess = spawn('scp', args);
            controller.listen(subProcess, callback, exitCallback);
        } else {
            throw new Error('Local: ' + local + ' does not exist');
        }
    });
}
prototype.scp = scp;

exports.prototype = prototype; 
