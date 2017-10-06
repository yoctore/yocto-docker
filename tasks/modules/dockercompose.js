'use strict';

var _             = require('lodash');
var joi           = require('joi');
var yaml          = require('yamljs');
var path          = require('path');
var timezone      = require('moment-timezone');
var schema        = require('./schema');
var utility       = require('./utility');

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
 * Prepare the main object to be on the correct format for build process
 *
 * @param {Object} config current config object to prepare for build process
 * @param {Object} grunt current grunt instance
 * @return {Boolean|Object} false in case of failure an object in case of success
 */
DockerCompose.prototype.prepare = function (config, grunt) {
  // We need first validate the json format for dockerfile config
  var validate = joi.validate(config, schema.get());

  // Has error ?
  if (!_.isNull(validate.error)) {
    // Log an error message
    grunt.log.warn([
      'Cannot prepare config content for compose process :', validate.error
    ].join(' '));

    // Default invalid statement
    validate.value = false;
  }

  // Build compose property
  _.each(utility.getDefinedEnv(config), function (item) {
    _.set(validate.value, [ 'compose', item ].join('.'), {});
  });

  // Default statement
  return validate.value;
}

/**
 * Utility method to build labels
 *
 * @param {String} key current env processed
 * @param {Object} config current used config
 * @return {Object} builded object
 */
DockerCompose.prototype.buildLabels = function (key, config) {
  // Default object to return
  var ressource  = {};

  // Storage labels
  var storageLabels = [];

  // Get ressources definition
  var ressources = _.get(config, 'dockerfile.labels');

  // Parse all labels value and do needed process
  _.each(ressources, function (item) {
    // Only in this case, if current is matching
    if (item.env === key) {
      // Store item on storage array
      storageLabels.push([ item.key, item.value ].join('='));
    }
  });

  // Ressource is not empty ? so build the rule
  if (!_.isEmpty(storageLabels)) {
    // Set security_opt
    _.set(ressource, 'labels', storageLabels);
  }

  // Default merge statement
  return ressource;
};

/**
 * Utility method to build ressource value for compose process for memory and cpu usage
 *
 * @param {String} key current env processed
 * @param {Object} config current used config
 * @return {Object} builded object
 */
DockerCompose.prototype.buildRessources = function (key, config) {
  // Default object to return
  var ressource  = {};

  // Get ressources definition
  var ressources = _.get(config, 'dockerfile.ressources');

  // Parse all memory ressources and do needed process
  _.each(ressources.memory, function (item) {
    // Only in this case, if current is matching
    if (item.env === key) {
      // Set memory usage
      _.set(ressource, 'mem_limit', [ item.value, item.unit ].join(''));
      _.set(ressource, 'memswap_limit', [ (item.value + item.value) / 2, item.unit ].join(''));
      _.set(ressource, 'mem_reservation', [ item.value / 2, item.unit ].join(''));
    }
  });

  // Parse all cpus ressources and do needed process
  _.each(ressources.cpus, function (item) {
    // Only in this case, if current is matching
    if (item.env === key) {
      _.set(ressource, item.key, [ item.value, item.unit ].join(''));
    }
  });

  // Default merge statement
  return ressource;
};

/**
 * Utility method to build ressource value for compose process for logging part
 *
 * @param {String} key current env processed
 * @param {Object} config current used config
 * @return {Object} builded object
 */
DockerCompose.prototype.buildLogging = function (key, config) {
  // Default object to return
  var ressource  = {};

  // Get ressources definition
  var ressources = _.get(config, 'dockerfile.logging');

  // Parse all cpus ressources and do needed process
  _.each(ressources, function (item) {
    // Only in this case, if current is matching
    if (item.env === key) {
      _.set(ressource, 'logging.driver', item.driver);
      _.set(ressource, 'logging.options.max-size', [ item.size.value, item.size.unit ].join(''));
      _.set(ressource, 'logging.options.max-file', _.get(item, 'max-file'));

      // Labels is empty ?
      if (!_.isEmpty(item.labels)) {
        _.set(ressource, 'logging.options.labels', item.labels.join(','));
      }
    }
  });

  // Default merge statement
  return ressource;
};

/**
 * Utility method to build restart policy
 *
 * @param {String} key current env processed
 * @param {Object} config current used config
 * @return {Object} builded object
 */
DockerCompose.prototype.buildRestartPolicy = function (key, config) {
  // Default object to return
  var ressource  = {};

  // Get ressources definition
  var ressources = _.get(config, 'dockerfile.restart');

  // Parse all cpus ressources and do needed process

  _.each(ressources, function (item) {
    // Only in this case, if current is matching
    if (item.env === key) {
      _.set(ressource, 'restart',
        item.policy === 'on-failure' ? [ item.policy, item.retry ].join(':') : item.policy);
    }
  });

  // Default merge statement
  return ressource;
};

/**
 * Utility method to build security option
 *
 * @param {String} key current env processed
 * @param {Object} config current used config
 * @return {Object} builded object
 */
DockerCompose.prototype.buildSecurityOptions = function (key, config) {
  // Default object to return
  var ressource  = {};

  // Defaut storage ressources
  var storageRessource = [];

  // Get ressources definition
  var ressources = _.get(config, 'dockerfile.security');

  // Only in this case we auto append security rule on list
  if (_.get(config, 'dockerfile.privileged') === false) {
    // Push data
    ressources.push({
      rule : 'no-new-privileges',
      env  : 'common'
    });
  }

  // Parse all cpus ressources and do needed process
  _.each(ressources, function (item) {
    // Only in this case, if current is matching
    if (item.env === key) {
      // Push item
      storageRessource.push(item.rule);
    }
  });

  // Parse all cpus ressources and do needed process
  _.each(_.get(config, 'dockerfile.apparmor'), function (item) {
    // Only in this case, if current is matching
    if (item.env === key) {
      // Push item
      storageRessource.push([ 'apparmor', item.rule ].join(':'));
    }
  });

  // Ressource is not empty ? so build the rule
  if (!_.isEmpty(storageRessource)) {
    // Set security_opt
    _.set(ressource, 'security_opt', storageRessource);
  }

  // Set privileged value
  _.set(ressource, 'privileged', _.get(config, 'dockerfile.privileged'));

  // Default merge statement
  return ressource;
};

/**
 * Utility method to build volumes property
 *
 * @param {String} key current env processed
 * @param {Object} config current used config
 * @return {Object} builded object
 */
DockerCompose.prototype.buildVolumes = function (key, config) {
  // Default object to return
  var ressource  = {};

  // Default volumes storage
  var volumes = [];

  // Process volumes configuration
  _.each(_.get(config, 'dockerfile.volumes'), function (item) {
    // Only if is the correct env
    if (item.env === key) {
      // Do normal push way
      volumes.push(
        _.has(item, 'source') && _.has(item, 'rights') ?
          [ item.source, item.target, item.rights ].join(':') : item.target
      );
    }
  });

  // Volumes is empty ?
  if (!_.isEmpty(volumes)) {
    _.set(ressource, 'volumes', volumes);
  }

  // Default merge statement
  return ressource;
};

/**
 * Build the current compose object, and store content on destination path
 *
 * @param {Object} config current config object to prepare for build process
 * @param {Object} grunt current grunt instance
 * @param {String} key current ressource name to process
 * @param {Object} destination destination path to store content
 * @return {Boolean} true in case of success, false otherwise
 */
DockerCompose.prototype.build = function (config, grunt, key, destination) {
  // Log process message
  grunt.log.debug([ 'We try to process compose for', key, 'environment' ].join(' '));

  // We need first validate the json format for dockerfile config
  var validate = joi.validate(config, schema.get());

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

  // If dockerfile is not needed remove no need property
  if (!grunt.option('generateDockerfile')) {
    // Omit no needed key
    item = _.omit(item, 'build.dockerfile');
  }

  // Build default labels ressources
  var ressources  = this.buildLabels(key, config);

  // Now merge system ressources
  _.merge(ressources, this.buildRessources(key, config));

  // Now merge logging ressources
  _.merge(ressources, this.buildLogging(key, config));

  // Now merge restart policy ressources
  _.merge(ressources, this.buildRestartPolicy(key, config));

  // Now merge security options
  _.merge(ressources, this.buildSecurityOptions(key, config));

  // Now merge volumes configuration
  _.merge(ressources, this.buildVolumes(key, config));

  // Now we try to set default compose process
  if (key === 'common') {
    // Now set values
    _.set(item, 'image', [ _.kebabCase(grunt.config('pkg.name')), grunt.config('pkg.version') ].join(':'));
    _.set(item, 'container_name', _.kebabCase(grunt.config('pkg.name')));
    _.set(item, 'environment.TZ', timezone.tz.guess());
  }

  // Append ressoures value
  if (_.isObject(ressources) && !_.isEmpty(ressources)) {
    // Merge builded ressources values 
    _.merge(item, ressources);
  }

  // Only if item is valid
  if (!_.isUndefined(item) && _.isObject(item) && !_.isEmpty(item)) {
    _.set(template.services, 'service_name', item);

    // Remap template with current key
    _.set(template.services,
      _.kebabCase(grunt.config('pkg.name')), _.get(template, 'services.service_name'));

    // And onlye keep needed value
    template.services = _.omit(template.services, [ 'service_name' ]);

    // Generate is enabled ?
    if (grunt.option('generateCompose')) {
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
