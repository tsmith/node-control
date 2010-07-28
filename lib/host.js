/*global require, exports, spawn: true */

var spawn = require('child_process').spawn,
    path = require('path'),
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
        throw new Error(this.address + ': No command to run');
    }

    var log = this.logger,
        user = this.user,
        process = spawn('ssh', 
            ['-l' + user, this.address, "''" + command + "''"]);

    log.puts(user + ':ssh ' + command);
    listen(process, log, callback);
}

function scp(local, remote, callback) {
    if (!local) { 
        throw new Error(this.address + ': No local file path');
    }

    if (!remote) { 
        throw new Error(this.address + ': No remote file path');
    }

    var log = this.logger,
        user = this.user,
        address = this.address;
    path.exists(local, function (exists) {
        if (exists) {
            var reference = user + '@' + address + ':' + remote,
                args = [local, reference],
                process = spawn('scp', args);

            log.puts(user + ':scp: ' + local + ' ' + reference);
            listen(process, log, callback);
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
    // This function may get called with different config objects
    // during a single config task (see deployment example). Therefore
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

function host(config, address) {
    if (!config) {
        throw new Error("No config");
    }

    if (!address) {
        throw new Error("No remote host address");
    }

    var Host = hostConstructor(config);
    return new Host(address);
}


function hosts(config, addresses) {
    if (!config) {
        throw new Error("No config");
    }
    
    if (!addresses || !(addresses instanceof Array)) {
        throw new Error("No array of addresses");
    }

    var list = [], a, address, host, c,
        Host = hostConstructor(config);
    for (a in addresses) {
        if (addresses.hasOwnProperty(a)) {
            address = addresses[a];
            host = new Host(address);
            list.push(host);
        }
    }
    return list;
}

exports.host = host;
exports.hosts = hosts;
