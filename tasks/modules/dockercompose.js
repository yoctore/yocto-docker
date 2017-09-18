'use strict';

var _             = require('lodash');
var joi           = require('joi');
var yaml          = require('yamljs');
var path          = require('path');
var timezone      = require('moment-timezone');

/**
 * Main dockercompose factory. Process all action for dockercompose creation
 */
function DockerCompose () {
  /**
   * Default name
   */
  this.name = 'docker-compose';
}

/**
 * Get default schema for validation process
 *
 * @return {Object} validation schema to use for validation
 */
DockerCompose.prototype.getSchema = function () {
  // Default schema to use for validation
  return joi.object().required().keys({
    dockerfile : joi.object().required().keys({}).unknown(),
    compose    : joi.object().optional().keys({
      common      : joi.object().optional().keys({}).default({}).unknown(),
      development : joi.object().optional().keys({}).default({}).unknown(),
      qa          : joi.object().optional().keys({}).default({}).unknown(),
      staging     : joi.object().optional().keys({}).default({}).unknown(),
      production  : joi.object().optional().keys({}).default({}).unknown()
    }).unknown().default({
      common      : {},
      development : {},
      qa          : {},
      staging     : {},
      production  : {}
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
  // We need first validate the json format for dockerfile config
  var validate = joi.validate(config, this.getSchema());

  // Has error ?
  if (!_.isNull(validate.error)) {
    // Log an error message
    grunt.log.warn([
      'Cannot prepare config content for compose process :', validate.error
    ].join(' '));

    // Default invalid statement
    validate.value = false;
  }

  // Default statement
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
  // Log process message
  grunt.log.debug([ 'We try to process compose for', key, 'environment' ].join(' '));

  // We need first validate the json format for dockerfile config
  var validate = joi.validate(config, this.getSchema());

  // Result is valid ?
  if (!_.isNull(validate.error)) {
    // Log invalid message
    grunt.log.warn([
      'Cannot build the dockercompose for', key, 'becasue schema is invalid :', validate.error
    ].join(' '));

    // Invalid statement
    return false;
  }

  // Re use config
  config = validate.value;

  // No try to load template file
  var template = yaml.load(path.resolve([
    __dirname, [
      '../models/docker-compose', [ key !== 'common' ? '-overload' : '' ].join('-'),
      '.template' ].join('')
  ].join('/')));

  // Is development, staging or production key ? in this case we need to append default command
  if (key !== 'common') {
    // Ressign value
    _.set(template, 'services.service_name.command', [ '-', _.first(key) ].join(''));
  }

  // We do this only if is common process
  var item = _.get(template.services, 'service_name');

  // Now we try to set compose process
  if (key === 'common') {
    // Now set values
    _.set(item, 'image', _.compact([
      value.imagePrefix || false, _.kebabCase(grunt.config('pkg.name'))
    ]).join('/'));
    _.set(item, 'container_name', _.kebabCase(grunt.config('pkg.name')));
    _.set(item, 'environment.TZ', timezone.tz.guess());
  }

  // Only if item is valid
  if (!_.isUndefined(item) && _.isObject(item) && !_.isEmpty(item)) {
    // Reassign value
    _.set(template.services, 'service_name', item);

    // In normal/other case we try to merge given config from current
    _.mergeWith(template, value, function (objValue, srcValue) {
      // Is array ?
      if (_.isArray(objValue)) {
        // Refault statement
        return objValue.concat(srcValue);
      }

      // Default statement
      return _.get(template, 'undefined');
    });

    // Remap template with current key
    _.set(template.services,
      _.kebabCase(grunt.config('pkg.name')), _.get(template, 'services.service_name'));

    // And onlye keep needed value
    template.services = _.omit(template.services, [ 'service_name' ]);

    // Generate is enabled ?
    if (grunt.option('generate')) {
      // If we are here we need to try to save current composefile
      grunt.file.write(destination, yaml.stringify(template, 7, 2));

      // Default statement, and this must return true otherwise an error occured.
      return grunt.file.exists(destination);
    }

    // Log a warn message
    grunt.log.warn([
      'Feature build-compose is disabled.',
      'skipping the file generation process' ].join(' '));

    // In this case is a valid statement
    return true
  }

  // If we are here we need to process default labels to append
  return false;
};

// Default export
module.exports = new DockerCompose();
