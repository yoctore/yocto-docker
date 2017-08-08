'use strict';

var _             = require('lodash');
var moment        = require('moment');
var joi           = require('joi');
var yaml          = require('yamljs');
var path          = require('path');
var timezone      = require('moment-timezone');

/**
 * Main dockercompose factory. Process all action for dockerfile creation
 */
function DockerCompose () {}

/**
 * Get default schema for validation process
 *
 * @return {Object} validation schema to use for validation
 */
DockerCompose.prototype.getSchema = function () {
  // Default schema to use for validation
  return joi.object().required().keys({
    dockerfile : joi.object().required().keys({}).unknown(),
    compose : joi.object().optional().keys({
      common : joi.object().optional().keys({}).default({}).unknown(),
      development : joi.object().optional().keys({}).default({}).unknown(),
      staging : joi.object().optional().keys({}).default({}).unknown(),
      production : joi.object().optional().keys({}).default({}).unknown()
    }).unknown().default({
      common : {},
      development : {},
      staging : {},
      production : {}
    })
  }).unknown();
};

/**
 * Prepare the main object to be on the correct format for build process
 *
 * @param {Object} config current config object to prepare for build process
 * @param {Object} grunt current grunt instance
 * @return {Boolean|Object} false in case of failure an object in case of success
 */
DockerCompose.prototype.prepare = function (config, grunt) {
  // we need first validate the json format for dockerfile config
  var validate = joi.validate(config, this.getSchema());

  // has error ?
  if (!_.isNull(validate.error)) {
    // log an error message
    grunt.log.warn([
      'Cannot prepare config content for compose process :', validate.error
    ].join(' '));
    // default invalid statement
    validate.value = false;
  }

  // default statement
  return validate.value;
}

/**
 * Build the current compose object, and store content on destination path
 *
 * @param {Object} config current config object to prepare for build process
 * @param {Object} grunt current grunt instance
 * @param {String} key current ressource name to process
 * @param {Object} value current overload ressrouce property to merge with the default values
 * @param {Object} destination destination path to store content
 * @return {Boolean} true in case of success, false otherwise
 */
DockerCompose.prototype.build = function (config, grunt, key, value, destination) {
  // log process message
  grunt.log.ok([ 'We try to process compose for', key, 'environment' ].join(' '));

  // we need first validate the json format for dockerfile config
  var validate = joi.validate(config, this.getSchema());

  // result is valid ?
  if (!_.isNull(validate.error)) {
    // log invalid message
    grunt.log.warn([
      'Cannot build the dockercompose for', key, 'becasue schema is invalid :', validate.error
    ].join(' '));

    // Invalid statement
    return false;
  }

  // re use config
  config = validate.value;

  // No try to load template file
  var template = yaml.load(path.resolve([
    process.cwd(), [
      'tasks/models/docker-compose', [ key !== 'common' ? '-overload' : '' ].join('-'),
    '.template' ].join('')
  ].join('/')));

  // is development, staging or production key ? in this case we need to append default command
  if (_.includes([ 'development', 'staging', 'production' ], key)) {
    // ressign value
    _.set(template, 'services.service_name.command', [ '-', _.first(key) ].join(''));
  }

  // We do this only if is common process
  var item = _.get(template.services, 'service_name');

  // Now we try to set compose process
  if (key === 'common') {
    // now set values
    _.set(item, 'image', _.compact([
      value.imagePrefix || false, _.kebabCase(grunt.config('pkg.name'))
    ]).join('/'));
    _.set(item, 'container_name', _.kebabCase(grunt.config('pkg.name')));
    _.set(item, 'environment.TZ', timezone.tz.guess());
  }

  // Only if item is valid
  if (!_.isUndefined(item) && _.isObject(item) && !_.isEmpty(item)) {
    // ressign value
    _.set(template.services, 'service_name', item);
    // In normal/other case we try to merge given config from current
    _.mergeWith(template, value, function (objValue, srcValue) {
      // is array ?
      if (_.isArray(objValue)) {
        // refault statement
        return objValue.concat(srcValue);
      }
    });

    // remap template with current key
    _.set(template.services,
      _.kebabCase(grunt.config('pkg.name')), _.get(template, 'services.service_name'));

    // And onlye keep needed value
    template.services = _.omit(template.services, [ 'service_name' ]);

    // If we are here we need to try to save current composefile
    grunt.file.write(destination, yaml.stringify(template, 7, 2));

    // default statement, and this must return true otherwise an error occured.
    return grunt.file.exists(destination);
  }

  // If we are here we need to process default labels to append
  return false;
};

// Default export
module.exports = new DockerCompose();

