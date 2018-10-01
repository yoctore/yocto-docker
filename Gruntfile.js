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
    },
    yoctodoc : {
      options : {
        // Change your path destination
        destination    : './docs',
        copyExtraFiles : [ 'assets/**/*.md' ]
      },

      // Set all your file here
      all : [ 'tasks/*/*.js' ]
    }
  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');
  grunt.loadNpmTasks('yocto-hint');
  grunt.loadNpmTasks('yocto-doc');

  // Register task
  grunt.registerTask('test', [ 'yoctodocker' ]);
  grunt.registerTask('hint', [ 'yoctohint' ]);
  grunt.registerTask('doc', [ 'yoctodoc' ]);
  grunt.registerTask('default', [ 'hint', 'test', 'doc' ]);
};
