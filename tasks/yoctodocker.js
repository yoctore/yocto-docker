'use strict';

var _             = require('lodash');
var hooker        = require('hooker');
var chalk         = require('chalk');
var path          = require('path');
var semver        = require('semver');
var timegrunt     = require('time-grunt');
var treeify       = require('treeify');
var inquirer      = require('inquirer');
var fs            = require('fs-extra');
var async         = require('async');
var request       = require('request');
var rimraf        = require('rimraf');
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

  // Default config property
  var defaultConfig = {};

  // Define main directory where script was store
  var mainDestDirectory = path.resolve([ process.cwd(), 'scripts', 'docker' ].join('/'));

  // Onlye if exists OoO
  if (fs.existsSync(mainDestDirectory)) {
    rimraf.sync(mainDestDirectory);
  }

  // Get value
  var dockerfileState = _.get(grunt.config('yoctodocker'), 'dockerfile');
  var composeState    = _.get(grunt.config('yoctodocker'), 'compose');
  var scriptState     = _.get(grunt.config('yoctodocker'), 'scripts');

  // Normalize these value
  dockerfileState = !_.isBoolean(dockerfileState) ? true : dockerfileState;
  composeState = !_.isBoolean(composeState) ? true : composeState;
  scriptState = !_.isBoolean(scriptState) ? true : scriptState;

  // Append value to process item on correct order
  _.set(defaultConfig, 'dockerfile', dockerfileState);
  _.set(defaultConfig, 'compose', composeState);
  _.set(defaultConfig, 'scripts', scriptState);

  // Update grunt configuration
  grunt.option('generateDockerfile', dockerfileState);
  grunt.option('generateCompose', composeState);
  grunt.option('generateScripts', scriptState);

  // Storage for treeify render on the last step
  var gstorage =  {};

  // Append value to process item on correct order
  _.set(gstorage, 'dockerfile', {});
  _.set(gstorage, 'compose', {});
  _.set(gstorage, 'scripts', {});

  // Enabled all features
  grunt.config('yoctodocker', defaultConfig);

  // Save current path
  var cwd = process.cwd();

  /**
   * Utility function to store item on storage
   *
   * @param {String} source property wanted for push data
   * @param {String} path string property key to use on source property
   * @param {Boolean} value true in case of success false otherwise
   */
  function storeForTree (source, path, value) {
    // global process
    gstorage[source][path] = value === true ? chalk.green('✓') : chalk.red('✖');
  }

  // Define hooker for the last step of hinter
  hooker.hook(grunt.log.writeln(), [ 'success', 'fail' ], function () {
    // Only on this case
    if (grunt.hookname === 'yocto-docker') {
      console.log(chalk.underline('Tree view state of generated file'));
      console.log(treeify.asTree(gstorage, true));
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

      // Generate is enabled ?
      if (grunt.option('generateDockerfile')) {
        // Write content
        grunt.file.write(destination, _.template(template)(config));

        // File exists && file is not empty ?
        var state = grunt.file.exists(destination) &&
          !_.isEmpty(fs.readFileSync(destination).toString());

        // Log success message
        grunt.log.ok([
          'Dockerfile was', state ? '' : 'not', 'properly created, and was store to', destination
        ].join(' '));

        // Store dockerfile path to storage process
        storeForTree('dockerfile', destination, state);
      } else {
        grunt.log.warn([
          'Feature build-dockerfile is disabled.',
          'skipping the file generation process' ].join(' '));
      }

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

            // Only if genrate is enabled
            if (grunt.option('generateCompose')) {
              // Log ok message
              grunt.log.ok([
                'Create compose file for', key, 'was processed and store on', destination
              ].join(' '));

              // Store compose path to storage process
              storeForTree('compose', destination, true);
            }

            // Do the normal process
            return next();
          }

          // Store compose path to storage process
          storeForTree('compose', destination, false);

          // Default invalid statement
          return next(false);
        }, function (state) {
          // Call the default callback
          done(state);
        });
      } else {
        // Log nothing to process message
        grunt.log.ok('Compose has no rules defined. Skiping this process.');

        // Continue
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

    // Storage value for common process
    var storage = [];

    // Final destination path
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
          // If (value.name !== 'common)

          // Prepare destination path
          destination = path.resolve([ process.cwd(), 'scripts', 'docker',
            value.name !== 'common' ? [ 'build-compose', [ '-', value.name, '.sh' ].join('') ].join('') :
              'start-application.sh'
          ].join('/'));

          // Do main build process
          var build = dockerscripts.build(grunt, value, destination, storage);

          // Do the build process
          if (build) {
            // Only if generate is enable
            if (grunt.option('generateScripts')) {
              // Log ok message
              grunt.log.ok([
                'Create script files for', value.name, 'was processed and store on', destination
              ].join(' '));

              // Store scripts path to storage process
              storeForTree('scripts', destination, true);
            } else {
              grunt.log.warn([
                'Feature build-scripts is disabled.',
                'skipping the file generation process' ].join(' '));
            }

            // Save on main storage for newt common process
            storage.push(build);

            // Do the normal process
            return next();
          }

          // Only if generate is enable
          if (grunt.option('generateScripts')) {
            // Store scripts path to storage process
            storeForTree('scripts', destination, true);
          }

          // Default invalid statement
          return next(false);
        }, function (state) {
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
      // Set current hookname
      grunt.hookname = 'yocto-docker';

      // Set needed option for next process
      grunt.option('dconfig', config);

      // Call target and run needed process
      grunt.task.run([ 'yoctodocker:build', target ].join('-'));

      // Call the default callback and keep the previous process keep the lead
      return done();
    }

    // Try to create create needed directory
    fs.ensureDirSync(mainDestDirectory);

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
          // Log info message
          grunt.log.ok('Please wait we try to retreive node version from nodejs repository');

          // Get the manifest from node repository
          return request.get('https://nodejs.org/dist/index.json', function (error, response, body) {
            // Has error ?
            if (error) {
              // In this case we log an error message
              grunt.log.warn([
                'Cannot retreive nodejs version from nodejs repository :', error, response
              ].join(''));
            } else {
              // Update version values
              grunt.option('nodeversion', _.first(_.compact(_.map(JSON.parse(body), function (item) {
                // In case of item is not an LTS version
                if (_.isBoolean(item.lts)) {
                  // Break the map process
                  return false;
                }

                // Default statement
                return item.version.replace('v', '')
              }))));
            }

            // Get content
            var content = JSON.parse(fs.readFileSync([
              __dirname, 'models/yocto-docker.template'
            ].join('/')).toString());

            // Change node version
            content.dockerfile.from.version = grunt.option('nodeversion') || '';

            // Write new content
            grunt.file.write(config, JSON.stringify(content, null, 2));

            // Do the main process
            build.call(this, this.data, this.target);

            // Default statement
            return done();
          }.bind(this));
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
