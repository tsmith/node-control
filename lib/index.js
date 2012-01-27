/*global require, exports */

var task = require('./task'),
    controller = require('./controller'),
    configurator = require('./configurator'),
    util = require ('util');

function begin() {
    try {
        task.begin();
    } catch (e) {
        if (e.name === 'TypeError' && e.message ===
                "Property 'log' of object #<Object> is not a function") {
            console.log('!! Set logPath instead of log on controllers.');
        }
        throw e;
    }
}

exports.task = task.task;
exports.perform = task.perform;
exports.controller = controller.prototype;
exports.hosts = configurator.hosts;
exports.controllers = configurator.controllers;
exports.begin = begin;
