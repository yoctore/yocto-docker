'use strict';

module.exports = function (grunt) {
  // Project configuration.
  grunt.initConfig({
    // Default package
    pkg : grunt.file.readJSON('package.json'),

    // Configuration to be run (and then tested).
    yoctodocker : {
      dockerfile : true,
      compose    : true,
      scripts    : true
    }
  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  // Load npm task
  grunt.registerTask('test', [ 'yoctodocker' ]);
  grunt.registerTask('default', [ 'test' ]);
};
