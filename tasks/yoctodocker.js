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
var async         = require('async');
var dockerfile    = require('./modules/dockerfile');
var dockercompose = require('./modules/dockercompose');
var dockerscripts = require('./modules/dockerscripts');

/**
 * Default export for grunt yocto-norme-plugin
 *
 * @param {string} grunt default grunt instance to use on current module
 */
module.exports = function (grunt) {
  // Require external module time grunt to get metrics on execution task
  timegrunt(grunt);

  // save and normalize rules to be in correct order
  var saved       = grunt.config().yoctodocker;
  var newOrderer  = {}; 

  // reset values
  _.set(newOrderer, 'dockerfile', _.get(saved, 'dockerfile'));
  _.set(newOrderer, 'compose', _.get(saved, 'compose'));
  _.set(newOrderer, 'scripts', _.get(saved, 'scripts'));

  // set new object
  grunt.config('yoctodocker', newOrderer);

  // Save current path
  var cwd = process.cwd();

  // Default yocto config for jshint and jscs code style
  var defaultOptions = {};

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

    console.log(cMsg);

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
    // Create an async process
    var done = this.async();

    // Do the main process on a try catch process

    try {
      // Build .dockerignore file
      var dockerignore = [ process.cwd(), '.dockerignore' ].join('/');

      // Docker ignore exits ?
      if (!grunt.file.exists(dockerignore)) {
        // LLog a message before create dockerignore file
        grunt.log.warn('.dockerignore doesn\'t exists. We try to create it.');

        // Write the dockerignore template
        grunt.file.write(dockerignore,
          fs.readFileSync([ __dirname, 'models/dockerignore.template' ].join('/')));

        // Docker ignore exits ?
        if (!grunt.file.exists(dockerignore)) {
          // Throw an exception
          throw new Error('Cannot create .dockerignore file.');
        } else {
          // Log a success message
          grunt.log.ok('Create .dockerignore was succeed.');
        }
      }

      // Get config file
      var config    = JSON.parse(fs.readFileSync(grunt.option('dconfig')));

      // Get builded config

      config = dockerfile.build(config, grunt);

      // Config is invalid
      if (config === false) {
        // Throw an exception
        throw new Error('Cannot process build of dockerfile. See error below.');
      }

      // Get template file for dockerfile
      var template  = fs.readFileSync([
        __dirname, 'models/Dockerfile.template'
      ].join('/')).toString();

      // Set dockerfile on grunt option to use on next process
      grunt.option('dockerfile', config);

      // Store destination path
      var destination = path.resolve([ process.cwd(), 'scripts', 'docker', 'Dockerfile' ].join('/'));

      // Write content
      grunt.file.write(destination, _.template(template)(config));

      // Log success message
      grunt.log.ok([ 'Dockerfile was properly created, and was store to', destination ].join(' '));

      // Call default callback
      done();
    } catch (e) {
      // Log error
      grunt.log.warn([ 'Cannot continue because an error occured :', e.message ].join(' '));

      // Call default callback
      done(false);
    }
  });

  // Create my main task to process dockerfile creation
  grunt.registerTask('yoctodocker:build-compose', 'Main compose creation process', function () {
    // Create an async process
    var done = this.async();

    // Do the main process on a try catch process
    try {
      // Get config file
      var config = grunt.option('dockerfile');

      // We need to prepare our config properly
      config = dockercompose.prepare(config, grunt);

      // Compose is defined ?
      if (_.has(config, 'compose')) {
        // Read each item and process the need action
        async.eachOf(config.compose, function (value, key, next) {
          // Prepare destination path
          var destination = path.resolve([ process.cwd(), 'scripts', 'docker', [
            'docker-compose', key !== 'common' ? [ '-', key, '.yml' ].join('') : '.yml' ].join('')
          ].join('/'));

          // Do the build process
          if (dockercompose.build(config, grunt, key, value, destination)) {
            // Change dockerfile property in grunt option
            grunt.option('dockerfile', config);

            // Log ok message
            grunt.log.ok([
              'Create compose file for', key, 'was processed and store on', destination
            ].join(' '));

            // Do the normal process
            return next();
          }

          // Default invalid statement
          return next(false);
        }, function (state) {
          // Call the default callback
          done(state);
        });
      } else {
        // Log nothing to process message
        grunt.log.ok('Compose has no rules defined. Skiping this process.');
        // continue
        done();
      }
    } catch (e) {
      // Log error
      grunt.log.warn(e);

      // Close async process
      done(false);
    }
  });

  // Create my main task to process dockerfile creation
  grunt.registerTask('yoctodocker:build-scripts', 'Main scripts creation process', function () {
    // Create an async process
    var done = this.async();

    // storage value for common process
    var storage = [];
    // final destination path
    var destination;
    // Do the main process on a try catch process
    try {
      // Get config file
      var config = grunt.option('dockerfile');

      // We need to prepare our config properly
      config = dockerscripts.prepare(config, grunt);

      // Compose is defined ?
      if (!_.isEmpty(config)) {
        // Read each item and process the need action
        async.each(config, function (value, next) {
          // Prepare destination path
          destination = path.resolve([ process.cwd(), 'scripts', 'docker',
            value.name !== 'common' ? [ 'build-compose', [ '-', value.name, '.sh' ].join('') ].join('') :
              'start-application.sh'
          ].join('/'));

          // Do main build process
          var build = dockerscripts.build(grunt, value, destination, storage);

          // Do the build process
          if (build) {
            // Log ok message
            grunt.log.ok([
              'Create script files for', value.name, 'was processed and store on', destination
            ].join(' '));
            // save on main storage for newt common process
            storage.push(build);
            // Do the normal process
            return next();
          }

          // Default invalid statement
          return next(false);
        }, function (state) {
          // Log message
          if (!state) {
            grunt.log.ok(
              'All data was processed. we need to build the main entrypoint of your application.');
          }

          // Call the default callback
          done(state);
        });
      } else {
        // Log nothing to process message
        grunt.log.ok('Compose has no rules defined for scripts part. Skiping this process.');
      }
    } catch (e) {
      // Log error
      grunt.log.warn(e);

      // Close async process
      done(false);
    }
  });

  // Register default plugin process
  grunt.registerMultiTask('yoctodocker', 'Manage and process code usage on yocto.', function () {
    // We nees to process an async process
    var done = this.async();

    // Defined path of yocto config file
    var config = [ process.cwd(), '.yocto-docker.json' ].join('/');

    /**
     * Internal build method to prcess all build process
     *
     * @param {Function} state if true we start the current process, otherwise we skip
     * @param {String} target current process name
     * @return {Function} current async callback
     */
    function build (state, target) {
      // Dispatch content
      if (state === true) {
        // Set options for current task
        grunt.option('dconfig', config);

        // Try to run given task
        if (grunt.task.run([ 'yoctodocker:build', target ].join('-'))) {
          // Default statement
          return done();
        }
      }

      // Log warn message
      grunt.log.warn([ 'Feature', target, 'is disabled. skipping this process' ].join(' '));

      // Call the default callback and keep the previous process keep the lead
      return done();
    }

    // Try to create create needed directory
    fs.ensureDirSync(path.resolve([ process.cwd(), 'scripts', 'docker' ].join('/')))

    // Log info message
    grunt.log.ok([ 'Preparing build for >>', this.target ].join(' '));

    // First we need to check if current config file is defined
    if (!grunt.file.exists(config)) {
      // Prompt message
      inquirer.prompt({
        message : 'Your docker config file doesn\'t exists. We will create it. Are you OK ?',
        name    : 'create',
        type    : 'confirm'
      }).then(function (answers) {
        // User is ok ?
        if (answers.create) {
          // Write
          grunt.file.write(config,
            fs.readFileSync([ __dirname, 'models/yocto-docker.template' ].join('/')));

          // Do the main process
          build.call(this, this.data, this.target);
        }

        // In other case return stop
        return done();
      }.bind(this))
    } else {
      // Do the main process
      build.call(this, this.data, this.target);
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
