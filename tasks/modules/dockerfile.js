'use strict';

var _             = require('lodash');
var moment        = require('moment');
var gitUserInfo   = require('git-user-info');
var homedir       = require('homedir');
var joi           = require('joi');
var traefik       = require('./traefik');
var schema        = require('./schema');
var utility       = require('./utility');

/**
 * Main dockerfile factory. Process all action for dockerfile creation
 */
function Dockerfile () {
  /**
   * Internal traefik instance
   */
  this.traefik = traefik;
}

/**
 * Build the current dockerfile object, and store content on destination path
 *
 * @param {Object} config current config object to prepare for build process
 * @param {Object} grunt current grunt instance
 * @return {Boolean} true in case of success, false otherwise
 */
Dockerfile.prototype.build = function (config, grunt) {
  // We need first validate the json format for dockerfile config
  var validate = joi.validate(config, schema.get());

  // Result is valid ?
  if (!_.isNull(validate.error)) {
    // Log invalid message
    grunt.log.warn([
      'Cannot build the dokerfile becasue schema is invalid :', validate.error
    ].join(' '));

    // Invalid statement
    return false;
  }

  // Re use config
  config = validate.value;

  // Get current user info
  var gitUser = (function () {
    // Get git info
    var user = gitUserInfo({
      path : [ homedir(), '.gitconfig' ].join('/')
    });

    // Default statement
    return [
      user.name || '', user.email ? [ '<', user.email, '>' ].join('') : ''
    ].join(user.name && user.email ? ' ': '')
  }());

  // If we are here we need to append default config content with package data
  _.set(config, 'name', _.kebabCase(grunt.config('pkg.name')));
  _.set(config, 'description', grunt.config('pkg.description'));
  _.set(config, 'version', grunt.config('pkg.version'));
  _.set(config, 'copyright', [
    '© Yocto SAS,',
    [ [ '2014', moment().format('YYYY') ].join('-'), '.' ].join(''),
    'All rights reserved.'
  ].join(' '));
  _.set(config, 'year', moment().format('YYYY'));
  _.set(config, 'date', moment().format('YYYY/MM/DD HH:mm:ss ZZ'));
  _.set(config, 'main', grunt.config('pkg.main') || 'index.js');

  // Only if author is not set
  if (config.dockerfile) {
    // Add author on list
    if (!_.has(config.dockerfile, 'author')) {
      // Set author
      _.set(config.dockerfile, 'author', gitUser);
    }

    // Set maintainers
    config.dockerfile.maintainers.push(gitUser);

    // Do the maintainers unique
    config.dockerfile.maintainers = _.uniq(config.dockerfile.maintainers);

    // By default we need to append -d -p -s -q command on docker file because it use on compose 
    // by default for build script
    if (grunt.option('generateScripts')) {
      // Add all commad list from define configuration
      _.each(utility.getDefinedEnv(config), function (env) {
        // Is not common env 
        if (env !== 'common') {
          // Add default command
          config.dockerfile.commands.push([ '-', _.first(env) ].join(''));
        }
      });

      // Do this array uniq
      config.dockerfile.commands = _.uniq(config.dockerfile.commands);

      // Add default script to entry point
      config.dockerfile.entrypoints = _.uniq(_.flatten([
        '/bin/bash', 'scripts/start-application.sh', config.dockerfile.entrypoints
      ]));
    }

    // Do last process
    config.dockerfile.labels.push(this.traefik.build(config));
    config.dockerfile.labels = _.flatten(config.dockerfile.labels);
  }

  // If we are here we need to process default labels to append
  return config;
};

// Default export
module.exports = new Dockerfile();

