/*global require, exports */

var util = require('util'),
    controller = require('./controller');

// Return a copy of a with prototype of b
function chain(a, b) {
    var prop, descriptor = {};
    for (prop in a) {
        if (a.hasOwnProperty(prop)) {
            descriptor[prop] = Object.getOwnPropertyDescriptor(a, prop);
        }
    }
    return Object.create(b, descriptor);
}

function configure(prototype, address, options) {
    if (controller.prototype !== prototype &&
            !controller.prototype.isPrototypeOf(prototype)) {
        throw new Error("Prototype is not a controller");
    }

    if (!address) {
        throw new Error("No address");
    }

    var configured;
    if (options) {
        configured = chain(options, prototype);
    } else {
        configured = Object.create(prototype);
    }
    configured.address = address;
    return configured;
}

function controllers(addresses, prototype) {
    if (!addresses) {
        throw new Error("No addresses");
    }

    if (!prototype) {
        prototype = controller.prototype;
    }

    var list = [],
        i, length, configured;
    if (Array.prototype.isPrototypeOf(addresses)) {
        for (i = 0, length = addresses.length; i < length; i += 1) {
            configured = configure(prototype, addresses[i]);
            list.push(configured);
        }
    } else {
        for (i in addresses) {
            if (addresses.hasOwnProperty(i)) {
                configured = configure(prototype, i, addresses[i]);
                list.push(configured);
            }
        }
    }
    return list;
}

// deprecated
function hosts(config, addresses) {
    console.log("!! hosts() is deprecated");

    if (!config) {
        throw new Error("No config");
    }

    if (!controller.prototype.isPrototypeOf(config)) {
        config = chain(config, controller.prototype);
    }
    return controllers(addresses, config);
}

exports.hosts = hosts;
exports.controllers = controllers;
