'use strict';

module.exports = function (grunt) {
  // Project configuration.
  grunt.initConfig({
    // Default package
    pkg : grunt.file.readJSON('package.json'),

    // Configuration to be run (and then tested).
    yoctodocker : {
      compose    : true,
      dockerfile : true,
      scripts    : true
    },
    yoctohint : {
      node : [
        'tasks/**/*.js',
        'Gruntfile.js'
      ]
    }
  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');
  grunt.loadNpmTasks('yocto-hint');

  // Register task
  grunt.registerTask('test', [ 'yoctodocker' ]);
  grunt.registerTask('hint', [ 'yoctohint' ]);
  grunt.registerTask('default', [ 'hint', 'test' ]);
};
