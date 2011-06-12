/*global require, process, console */

var control = require('../'),
    config = {
        user: process.env.USER
    },
    hosts = control.hosts(config, ['localhost']),
    i, l, host;

for (i = 0, l = hosts.length; i < l; i += 1) {
    host = hosts[i];
    host.ssh('date');
}
