'use strict';

var _             = require('lodash');
var hooker        = require('hooker');
var chalk         = require('chalk');
var path          = require('path');
var semver        = require('semver');
var timegrunt     = require('time-grunt');
var treeify       = require('treeify');
var os            = require('os');
var inquirer      = require('inquirer');
var fs            = require('fs-extra');
var dockerfile    = require('./modules/dockerfile');

/**
 * Default export for grunt yocto-norme-plugin
 *
 * @param {string} grunt default grunt instance to use on current module
 * @return {function} hinter task module
 */
module.exports = function (grunt) {
  // Require external module time grunt to get metrics on execution task
  timegrunt(grunt);

  // Save current path
  var cwd = process.cwd();

  // Default yocto config for jshint and jscs code style
  var defaultOptions = {
  };

  // Define hooker for the last step of hinter
  hooker.hook(grunt.log.writeln(), [ 'success', 'fail' ], function (res) {
    // Check done or aborted
    var done    = res === 'Done, without errors.' || 'Done.';
    var warning = res === 'Done, but with warnings.';
    var aborted = res === 'Aborted due to warnings.';
    var error   = warning || aborted;
    var state   = error ? 'error' : 'success';
    var arts;
    var artPath;
    var sMsg;

    // Default message config
    var cMsg = {
      level : error ? 'warn' : 'ok',
      msg   : error ? 'Please correct your code !!! ' : 'Good Job. Padawan !!'
    };

    // Is finish ??
    if (done || error) {
      /*
      // Main try catch to any errors
      try {
        // Get file path of art path
        artPath = [ __dirname, 'art', 'art.json' ].join('/');

        // Getting file exists ?
        if (!grunt.file.exists(artPath)) {
          throw [ 'art config file"', artPath, '"not found.' ].join(' ');
        }

        // Select correct arts file content to print
        arts = JSON.parse(grunt.file.read(artPath));

        // Define end state
        sMsg = {
          color : error ? 'red' : 'green',
          file  : _.map(arts[state], function (art) {
            return [ __dirname, 'art', state, art ].join('/');
          })
        };

        // Build message file
        sMsg.file = sMsg.file[_.random(0, sMsg.file.length - 1)];

        // Log message to console
        console.log(chalk[sMsg.color](grunt.file.read(sMsg.file)));

        // Print grade
        console.log(chalk[sMsg.color]([ 'Your grade is : ', globalGrade, '/20' ].join('')));
      } catch (e) {
        // Log exeption, but it produces by art config
        grunt.log.warn([ 'Plugin error.', e ].join(' '));

        // Need to log end message with custom param
        grunt.log[cMsg.level](cMsg.msg);
      }*/
    }
  });

  // Create my main task to process dockerfile creation
  grunt.registerTask('yoctodocker:build-dockerfile', 'Main dockerfile creation process', function () {
    // Do the main process on a try catch process
    try {
      // Build .dockerignore file
      var dockerignore = [ process.cwd(), '.dockerignore' ].join('/');

      // Docker ignore exits ?
      if (!grunt.file.exists(dockerignore)) {
        // lLog a message before create dockerignore file
        grunt.log.warn('.dockerignore doesn\'t exists. We try to create it.');

        // create empty file for dockerignore
        fs.closeSync(fs.openSync(dockerignore, 'w'));

        // Write the dockerignore template
        fs.writeFileSync(dockerignore,
          fs.readFileSync([ __dirname, 'models/dockerignore.template' ].join('/')));

        // docker ignore exits ?
        if (!grunt.file.exists(dockerignore)) {
          // throw an exception
          throw 'Cannot create .dockerignore file.'; 
        } else {
          // log a success message
          grunt.log.ok('Create .dockerignore was succeed.');
        }
      }

      // get config file
      var config    = JSON.parse(fs.readFileSync(grunt.option('dconfig')));
      // get builded config
      config = dockerfile.build(config, grunt);

      // config is invalid
      if (config === false) {
        // throw an exception
        throw 'Cannot process build of dockerfile. See error below.';
      }

      // get template file for dockerfile
      var template  = fs.readFileSync([
        __dirname, 'models/Dockerfile.template'
      ].join('/')).toString();

      // store destination path
      var destination = path.resolve([ process.cwd(), 'scripts', 'docker', 'Dockerfile' ].join('/'));
      // Write content
      fs.writeFileSync(destination, _.template(template)(config));

      // log success message
      grunt.log.ok([ 'Dockerfile was properly created, and was store to', destination ].join(' '));
    } catch (e) {
      // log error
      grunt.log.warn([ 'Cannot continue because an error occured :', e ].join(' '));
    }
  });

  // Create my main task to process dockerfile creation
  grunt.registerTask('yoctodocker:build-compose', 'Main compose creation process', function (target) {
    console.log('yoctodocker:dockercompose');
    // Do the main process on a try catch process
    try {
      // get config file
      var config    = JSON.parse(fs.readFileSync(grunt.option('dconfig')));
    } catch (e) {
      // log error
      grunt.log.warn(e);
    }
  });

  // Create my main task to process dockerfile creation
  grunt.registerTask('yoctodocker:build-scripts', 'Main scripts creation process', function (target) {
    console.log('yoctodocker:startscripts');
    // Do the main process on a try catch process
    try {
      // get config file
      var config = JSON.parse(fs.readFileSync(grunt.option('dconfig')));
    } catch (e) {
      // log error
      grunt.log.warn([ 'Cannot continue, an error occured :', e ].join(' '));
    }
  });

  // Register default plugin process
  grunt.registerMultiTask('yoctodocker', 'Manage and process code usage on yocto.', function () {
    // Create an async process
    var done = this.async();

    // defined path of yocto config file
    var config = [ process.cwd(), '.yocto-docker.json' ].join('/');

    /**
     * Internal build method to prcess all build process
     *
     * @param {Function} done callback method to call at the end of process
     */
    function build (done, state, target) {
      // dispatch content
      if (state === true) {
        // set options for current task
        grunt.option('dconfig', config);
  
        // try to run given task
        if (grunt.task.run([ 'yoctodocker:build', target ].join('-'))) {
          // call callback to finish properly
          return done();
        }
      }
      // default statement
      return done();
    }

    // Try to create create needed directory
    fs.ensureDirSync(path.resolve([ process.cwd(), 'scripts', 'docker' ].join('/')))

    // first we need to check if current config file is defined
    if (!grunt.file.exists(config)) {
      // prompt message
      inquirer.prompt({
        message : 'Your docker config file doesn\'t exists. We will create it. Are you OK ?', 
        name    : 'create',
        type    : 'confirm'
      }).then(function (answers) {
        // user is ok ?
        if (answers.create) {
          // create empty file
          fs.closeSync(fs.openSync(config, 'w'));
          // write
          fs.writeFileSync(config,
            fs.readFileSync([ __dirname, 'models/yocto-docker.template' ].join('/')));
          // do the main process
          build.call(this, done, this.data, this.target);
        }
        // in other case return stop
        return done();
      }.bind(this))
    } else {
      // do the main process
      build.call(this, done, this.data, this.target);
    }
  });

  // Node version is lower than last node LTS version ?
  if (semver.lt(process.version, '6.0.0')) {
    // Logging message
    grunt.log.ok([ 'Changing cwd directory to load modules because version of node is',
      process.version ].join(' '));

    // Change path to yocto-hint modules
    process.chdir(path.normalize([ __dirname, '..' ].join('/')));
  }

  // Go to the initial path
  process.chdir(cwd);
};
