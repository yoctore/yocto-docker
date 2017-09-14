'use strict';

var _             = require('lodash');
var moment        = require('moment');
var gitUserInfo   = require('git-user-info');
var homedir       = require('homedir');
var joi           = require('joi');
var traefik       = require('./traefik');

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
 * Get default schema for validation process
 *
 * @return {Object} validation schema to use for validation
 */
Dockerfile.prototype.getSchema = function () {
  // Default schema to use for validation
  return joi.object().required().keys({
    dockerfile : joi.object().required().keys({
      from : joi.object().required().keys({
        name    : joi.string().required().empty(),
        version : joi.string().required().empty()
      }),
      labels : joi.array().optional().items(joi.object().optional().keys({
        key   : joi.string().required().empty(),
        value : joi.string().required().empty()
      })).default([]),
      environments : joi.array().optional().items(joi.object().optional().keys({
        key     : joi.string().required().empty(),
        value   : joi.string().required().empty(),
        comment : joi.string().optional().empty()
      })).default([]),
      argument : joi.array().optional().items(joi.object().optional().keys({
        key   : joi.string().required().empty(),
        value : joi.string().required().empty()
      })).default([]),
      copy : joi.array().optional().items(joi.object().optional().keys({
        source      : joi.string().required().empty(),
        destination : joi.string().required().empty()
      })).default([]),
      user : joi.object().optional().keys({
        uuid : joi.number().optional().min(1000).max(9999).default(_.random(1000, 9999)),
        id   : joi.string().optional().empty().default('infra')
      }).default({
        id   : 'infra',
        uuid : _.random(1000, 9999)
      }),
      customs : joi.array().optional().items(joi.object().optional().keys({
        comment : joi.string().required().empty(),
        command : joi.string().required().empty().valid([
          'WORKDIR', 'RUN', 'ONBUILD', 'STOPSIGNAL', 'SHELL'
        ]),
        value : joi.string().required().empty()
      })).default([]),
      maintainers : joi.array().optional().items(joi.string().optional().empty()).default([]),
      healthcheck : joi.object().optional().keys({
        interval : joi.object().optional().keys({
          value : joi.number().required().min(0),
          unit  : joi.string().required().empty().valid([ 's', 'm' ])
        }).default({
          value : 30,
          unit  : 's'
        }),
        timeout : joi.object().optional().keys({
          value : joi.number().required().min(0),
          unit  : joi.string().required().empty().valid([ 's', 'm' ])
        }).default({
          value : 30,
          unit  : 's'
        }),
        startPeriod : joi.object().optional().keys({
          value : joi.number().required().min(0),
          unit  : joi.string().required().empty().valid([ 's', 'm' ])
        }).default({
          value : 0,
          unit  : 's'
        }),
        retries : joi.number().optional().min(0).default(3),
        command : joi.string().optional().empty().default('NONE')
      }).default({}),
      ports       : joi.array().optional().items(joi.number().optional().min(0)).default([]),
      volumes     : joi.array().optional().items(joi.string().optional().empty()).default([]),
      entrypoints : joi.array().optional().items(joi.string().optional().empty()).default([]),
      commands    : joi.array().optional().items(joi.string().optional().empty()).default([]),
      runtime     : joi.object().optional().keys({
        nb_cores     : joi.number().optional().min(1).default(1),
        memory_limit : joi.number().optional().min(2048).default(2048)
      }).default({
        nb_cores     : 1,
        memory_limit : 2048
      }),
      proxy : joi.object().optional().keys({
        enable  : joi.boolean().optional().default(false),
        network : joi.string().optional().default('bridge').empty(),
        hosts   : joi.array().optional().items(
          joi.string().optional().uri({
            allowRelative : true
          }).empty()
        ).default([]),
        entrypointProcotol : joi.array().optional().default([ 'http', 'https' ]).empty(),
        backendProtocol    : joi.string().optional().default('http').empty(),
        loadbalancer       : joi.number().optional().default(0).min(0),
        sendHeader         : joi.boolean().optional().default(true),
        priority           : joi.number().optional().default(10),
        allowedIp          : joi.array().optional().items(
          joi.string().optional().ip().empty()
        ).default([])
      }).default({
        enable             : false,
        network            : 'bridge',
        hosts              : [],
        entrypointProcotol : [ 'http', 'https' ],
        backendProtocol    : 'http',
        loadbalancer       : 0,
        sendHeader         : true,
        priority           : 10,
        allowedIp          : []
      })
    })
  }).unknown();
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
  var validate = joi.validate(config, this.getSchema());

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
    config.dockerfile.commands.push('-d', '-s', '-p', '-q');

    // Do this array uniq
    config.dockerfile.commands = _.uniq(config.dockerfile.commands);

    // Add default script to entry point
    config.dockerfile.entrypoints = _.uniq(_.flatten([
      '/bin/bash', 'scripts/start-application.sh', config.dockerfile.entrypoints
    ]));

    config.dockerfile.labels.push(this.traefik.build(config));
    config.dockerfile.labels = _.flatten(config.dockerfile.labels);
  }

  // If we are here we need to process default labels to append
  return config;
};

// Default export
module.exports = new Dockerfile();

