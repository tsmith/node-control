/*global require, exports, process */

var sys = require('sys');

var tasks = {},
    descriptions = {};

function perform(name, config) {
    if (!name) {
        throw new Error('Must specify a task name.');
    }

    var i,
        argsCount = arguments.length,
        args = [],
        task = tasks[name],
        log = " Performing " + name;

    if (config && config.id) {
        log += " for " + config.id;
    }
    sys.puts(log);


    if (!task) {
        throw new Error('No task named: ' + name);
    }

    // Get arguments to pass onto task function without task name.
    for (i = 1; i < arguments.length; i = i + 1) {
        args[i - 1] = arguments[i]; 
    }

    return task.apply(null, args);
}

function performAll(configs) {
    if (!configs || !(configs instanceof Array) || configs.length < 1) {
        throw new Error('Must have an arry of one or more configs.');
    }

    var i, config,
        argsCount = arguments.length,
        args = [], argsWithConfig;

    // Get arguments to pass onto task function without task name.
    for (i = 1; i < arguments.length; i = i + 1) {
        args[i - 1] = arguments[i]; 
    }

    for (i in configs) {
        if (configs.hasOwnProperty(i)) {
            config = configs[i];

            // Copy the arguments array for each config and insert the
            // config object as the first argument to the perform function
            // to use when calling the task.
            argsWithConfig = args.slice(0);
            argsWithConfig.splice(1, 0, config);

            perform.apply(null, argsWithConfig);
        }
    }
}

function task(name, description, callback) {
    tasks[name] = callback;
    descriptions[name] = description;
}

function list() {
    for (var i in tasks) {
        if (tasks.hasOwnProperty(i)) {
            sys.puts(i + ':  ' + descriptions[i]);
        }
    }
}

function begin() {
    var configTask = process.argv[2],
        configs = perform(configTask),
        taskWithArgs = process.argv.slice(3);
    if (taskWithArgs.length > 0) {
        taskWithArgs.unshift(configs);
        performAll.apply(null, taskWithArgs);
    }
}

task('list', 'List tasks', function () {
    list();
});

exports.task = task;
exports.begin = begin;
exports.perform = perform;
