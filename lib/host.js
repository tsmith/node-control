/*global require, exports, spawn: true */

var spawn = require('child_process').spawn,
    path = require('path'),
    sys = require('sys'),
    Log = require('./log').Log;

function logBuffer(log, prefix, buffer) {
    var message = buffer.toString();
    log.puts(message, prefix);
}

function listen(process, log, callback) {
    var codes = '';
    process.stdout.addListener('data', function (data) {
        logBuffer(log, 'stdout: ', data);
    });

    process.stderr.addListener('data', function (data) {
        logBuffer(log, 'stderr: ', data);
    });

    process.addListener('exit', function (code) {
        logBuffer(log, 'exit: ', code);
        if (code === 0 && callback) {
            callback(this);
        }
    });
}

function ssh(command, callback) {
    if (!command) { 
        throw new Error(this.address + ': Must specify command to run.');
    }

    var log = this.logger,
        user = this.user,
        process = spawn('ssh', 
            ['-l' + user, this.address, "''" + command + "''"]);

    log.puts(user + ': ' + command);
    listen(process, log, callback);
}

function scp(local, remote, callback) {
    if (!local) { 
        throw new Error(this.address + ': Must specify local file to scp.');
    }

    if (!remote) { 
        throw new Error(this.address + 
                ': Must specify remote path to scp.');
    }

    var log = this.logger,
        user = this.user,
        address = this.address;
    path.exists(local, function (exists) {
        if (exists) {
            var args = [local, user + '@' + address + ':' + remote ],
                process = spawn('scp', args);

            log.puts(user + ': [scp] ' + args);
            listen(process, log, callback);
        } else {
            log.puts('Local: ' + local + ' does not exist');
        }
    });
}

function log(message) {
    this.logger.puts(' ' + message);
}

var defaultLogPath = 'hosts.log';
function host(config, address) {
    if (!address) {
        throw new Error("Must specify an address for remote host.");
    }
    
    if (!config) {
        throw new Error("Must specify a config object literal.");
    }

    var Host = function () {
        var logPath = config.log || defaultLogPath;
        this.address = address;
        this.logger = new Log(this.address + ':', logPath, true);
        this.log = log;
        this.ssh = ssh;
        this.scp = scp;

        // Allows task execution output to identify the host a task
        // is being executed for.
        this.id = address;

    };
    Host.prototype = config;
    return new Host(address);
}

function hosts(config, addresses) {
    var list = [], a, address, newHost, c;
    for (a in addresses) {
        if (addresses.hasOwnProperty(a)) {
            address = addresses[a];
            newHost = host(config, address);
            list.push(newHost);
        }
    }
    return list;
}

exports.host = host;
exports.hosts = hosts;
