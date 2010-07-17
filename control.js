/*global require, exports */

var task = require('./lib/task'),
    host = require('./lib/host');

exports.task = task.task;
exports.begin = task.begin; 
exports.perform = task.perform;
exports.hosts = host.hosts;
exports.host = host.host
