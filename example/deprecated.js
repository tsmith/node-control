/*global require, process */

// Example of deprecated control.hosts() usage

var control = require('../'),
    task = control.task;

task('myclusterdep', 'Deprecated array config for cluster of two', 
        function () {
    var config = {
        user: process.env.USER,
        scpOptions: ['-v']
    };
    
    return control.hosts(config, [ 'localhost', '127.0.0.1' ]); 
});

task('myclusterlogdep', 'Deprecated array config for cluster of two', 
        function () {
    var config = {
        user: process.env.USER,
        scpOptions: ['-v'],
        log: 'deprecated.log'
    };
    
    return control.hosts(config, [ 'localhost', '127.0.0.1' ]); 
});

require('./controls.js');
