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
    // create an async process
    var done = this.async();
    // Do the main process on a try catch process

    try {
      // Build .dockerignore file
      var dockerignore = [ process.cwd(), '.dockerignore' ].join('/');

      // Docker ignore exits ?
      if (!grunt.file.exists(dockerignore)) {
        // lLog a message before create dockerignore file
        grunt.log.warn('.dockerignore doesn\'t exists. We try to create it.');

        // Write the dockerignore template
        grunt.file.write(dockerignore,
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

      // set dockerfile on grunt option to use on next process
      grunt.option('dockerfile', config);

      // store destination path
      var destination = path.resolve([ process.cwd(), 'scripts', 'docker', 'Dockerfile' ].join('/'));
      // Write content
      grunt.file.write(destination, _.template(template)(config));

      // log success message
      grunt.log.ok([ 'Dockerfile was properly created, and was store to', destination ].join(' '));

      // call default callback
      done();
    } catch (e) {
      // log error
      grunt.log.warn([ 'Cannot continue because an error occured :', e ].join(' '));

      // call default callback
      done(false);
    }
  });

  // Create my main task to process dockerfile creation
  grunt.registerTask('yoctodocker:build-compose', 'Main compose creation process', function () {
     // create an async process
    var done = this.async();

    // Do the main process on a try catch process
    try {
      // get config file
      var config = grunt.option('dockerfile');

      // we need to prepare our config properly
      config = dockercompose.prepare(config, grunt);

      // compose is defined ?
      if (_.has(config, 'compose')) {
        // read each item and process the need action
        async.eachOf(config.compose, function (value, key, next) {
          // prepare destination path
          var destination = path.resolve([ process.cwd(), 'scripts', 'docker', [
            'docker-compose', key !== 'common' ? [ '-', key, '.yml' ].join('') : '.yml' ].join('')
          ].join('/'));

          // do the build process
          if (dockercompose.build(config, grunt, key, value, destination)) {
            // log ok message
            grunt.log.ok([
              'Create file for', key, 'was processed and store on', destination
            ].join(' '));
            // do the normal process
            return next();
          }
          // default invalid statement
          return next(false);
        }, function (state) {
          // call the default callback
          done(state);
        });
      } else {
        // log nothing to process message
        grunt.log.ok('Compose has no rules defined. Skiping this process.');
      }
    } catch (e) {
      // log error
      grunt.log.warn(e);
      // close async process
      done(false);
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
    // we nees to process an async process
    var done = this.async();
    // defined path of yocto config file
    var config = [ process.cwd(), '.yocto-docker.json' ].join('/');

    /**
     * Internal build method to prcess all build process
     *
     * @param {Function} done callback method to call at the end of process
     */
    function build (state, target) {
      // dispatch content
      if (state === true) {
        // set options for current task
        grunt.option('dconfig', config);

        // try to run given task
        grunt.task.run([ 'yoctodocker:build', target ].join('-'));
        // call the default callback and keep the previous process keep the lead
        return done();
      }
    }

    // Try to create create needed directory
    fs.ensureDirSync(path.resolve([ process.cwd(), 'scripts', 'docker' ].join('/')))

    // log info message
    grunt.log.ok([ 'Preparing build for >>', this.target ].join(' '));

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
          // write
          grunt.file.write(config,
            fs.readFileSync([ __dirname, 'models/yocto-docker.template' ].join('/')));
          // do the main process
          build.call(this, this.data, this.target);
        }
        // in other case return stop
        return done();
      }.bind(this))
    } else {
      // do the main process
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
