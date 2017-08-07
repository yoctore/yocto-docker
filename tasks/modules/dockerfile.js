'use strict';

var _             = require('lodash');
var moment        = require('moment');
var gitUserInfo   = require('git-user-info');
var homedir       = require('homedir');
var joi           = require('joi');

/**
 * Main dockerfile factory. Process all action for dockerfile creation
 */
function Dockerfile () {}

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
        name : joi.string().required().empty(),
        version : joi.string().required().empty()
      }),
      labels : joi.array().optional().items(joi.object().optional().keys({
        key   : joi.string().required().empty(),
        value : joi.string().required().empty()
      })).default([]),
      environments : joi.array().optional().items(joi.object().optional().keys({
        key   : joi.string().required().empty(),
        value : joi.string().required().empty(),
        comment : joi.string().optional().empty()
      })).default([]),
      argument : joi.array().optional().items(joi.object().optional().keys({
        key   : joi.string().required().empty(),
        value : joi.string().required().empty()
      })).default([]),
      copy : joi.array().optional().items(joi.object().optional().keys({
        source   : joi.string().required().empty(),
        destination : joi.string().required().empty()
      })).default([]),
      user : joi.object().optional().keys({
        uuid   : joi.number().optional().min(1000).max(9999).default(_.random(1000, 9999)),
        id     : joi.string().optional().empty().default('infra')
      }).default({ id : 'infra', uuid : _.random(1000, 9999) }),
      customs : joi.array().optional().items(joi.object().optional().keys({
        comment : joi.string().required().empty(),
        command : joi.string().required().empty().valid([
          'WORKDIR', 'RUN', 'ONBUILD', 'STOPSIGNAL', 'SHELL'
        ]),
        value       : joi.string().required().empty()
      })).default([]),
      maintainers : joi.array().optional().items(joi.string().optional().empty()).default([]),
      healthcheck : joi.object().optional().keys({
        interval : joi.object().optional().keys({
          value : joi.number().required().min(0),
          unit  : joi.string().required().empty().valid([ 's', 'm' ])
        }).default({ value : 30, unit : 's' }),
        timeout : joi.object().optional().keys({
          value : joi.number().required().min(0),
          unit  : joi.string().required().empty().valid([ 's', 'm' ])
        }).default({ value : 30, unit : 's' }),
        startPeriod : joi.object().optional().keys({
          value : joi.number().required().min(0),
          unit  : joi.string().required().empty().valid([ 's', 'm' ])
        }).default({ value : 0, unit : 's' }),
        retries : joi.number().optional().min(0).default(3),
        command : joi.string().optional().empty().default('NONE')
      }).default({}),
      ports : joi.array().optional().items(joi.number().optional().min(0)).default([]),
      volumes : joi.array().optional().items(joi.string().optional().empty()).default([]),
      entrypoints : joi.array().optional().items(joi.string().optional().empty()).default([]),
      commands : joi.array().optional().items(joi.string().optional().empty()).default([]),
    })
  }).unknown();
}

Dockerfile.prototype.build = function (config, grunt) {
  // we need first validate the json format for dockerfile config
  var validate = joi.validate(config,  this.getSchema());

  // result is valid ?
  if (!_.isNull(validate.error)) {
    // log invalid message
    grunt.log.warn([
      'Cannot build the dokerfile becasue schema is invalid :', validate.error
    ].join(' '));

    // Invalid statement
    return false;
  }

  // re use config
  config = validate.value;

  // get current user info
  var gitUser = (function () {
    // get git info
    var user = gitUserInfo({ path : [ homedir(), '.gitconfig' ].join('/') });
    // default statement
    return [
      user.name || '', user.email ? [ '<', user.email, '>' ].join('') : ''
    ].join(user.name && user.email ? ' ': '')
  })();

  // If we are here we need to append default config content with package data
  _.set(config, 'name', grunt.config('pkg.name'));
  _.set(config, 'description', grunt.config('pkg.description'));
  _.set(config, 'version', grunt.config('pkg.version'));
  _.set(config, 'copyright', [
    '© Yocto SAS,',
    [ [ '2014', moment().format('YYYY') ].join('-'), '.' ].join(''),
    'All rights reserved.'
  ].join(' '));
  _.set(config, 'year', moment().format('YYYY'));
  _.set(config, 'date', moment().format('YYYY/MM/DD HH:mm:ss ZZ'));

  // only if author is not set
  if (config.dockerfile) {

    // Add author on list
    if (!_.has(config.dockerfile, 'author')) {
      // set author
      _.set(config.dockerfile, 'author', gitUser);
    }

    // set maintainers
    config.dockerfile.maintainers.push(gitUser);

    // do the maintainers unique
    config.dockerfile.maintainers = _.uniq(config.dockerfile.maintainers);
  }

  // If we are here we need to process default labels to append
  return config;
};

// Default export
module.exports = new Dockerfile();

