/*global require, exports, spawn: true */

var spawn = require('child_process').spawn,
    path = require('path'),
    Log = require('./log').Log;

function logBuffer(log, prefix, buffer) {
    var message = buffer.toString();
    log.puts(message, prefix);
}

function listen(subProcess, log, callback, exitCallback) {
    var codes = '';
    subProcess.stdout.addListener('data', function (data) {
        logBuffer(log, 'stdout: ', data);
    });

    subProcess.stderr.addListener('data', function (data) {
        logBuffer(log, 'stderr: ', data);
    });

    subProcess.addListener('exit', function (code) {
        logBuffer(log, 'exit: ', code);
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

    var log = this.logger,
        user = this.user,
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

    log.puts(user + ':ssh ' + command);
    subProcess = spawn('ssh', args); 
    listen(subProcess, log, callback, exitCallback);
}

function scp(local, remote, callback, exitCallback) {
    if (!local) { 
        throw new Error(this.address + ': No local file path');
    }

    if (!remote) { 
        throw new Error(this.address + ': No remote file path');
    }

    var log = this.logger,
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

            log.puts(user + ':scp: ' + local + ' ' + reference);
            subProcess = spawn('scp', args);
            listen(subProcess, log, callback, exitCallback);
        } else {
            throw new Error('Local: ' + local + ' does not exist');
        }
    });
}

function log(message) {
    this.logger.puts(' ' + message);
}

var defaultLogPath = 'hosts.log';

function hostConstructor(config) {

    // Initialize the sshOptions array here if not initialized in user-defined
    // config task instead of inside constructor so that the host object
    // sshOptions property points to a initially shared array in either case.
    config.sshOptions = config.sshOptions || [];

    // This function may get called with different config objects
    // during a single config task (see roles example in README). Therefore
    // we cannot define the constructor as a function declaration at module
    // scope and modify its prototype because the last config would become
    // the config for all hosts.
    function Host(address) {
        var logPath = config.log || defaultLogPath;
        this.address = address;
        this.logger = new Log(this.address + ':', logPath, true);
        this.log = log;
        this.ssh = ssh;
        this.scp = scp;

        // Allows task execution output to identify the host a task
        // is being executed for.
        this.id = address;

    }
    Host.prototype = config;
    return Host;
}

function hosts(config, addresses) {
    if (!config) {
        throw new Error("No config");
    }
    
    if (!addresses || !(addresses instanceof Array)) {
        throw new Error("No array of addresses");
    }

    var list = [], 
        i, length, address, host,
        Host = hostConstructor(config);
    for (i = 0, length = addresses.length; i < length; i += 1) {
        address = addresses[i];
        host = new Host(address);
        list.push(host);
    }
    return list;
}

exports.hosts = hosts;
