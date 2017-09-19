'use strict';

var _             = require('lodash');
var joi           = require('joi');
var path          = require('path');
var fs            = require('fs');
var schema        = require('./schema');

/**
 * Main dockerscripts factory. Process all action for dockerscripts creation
 */
function DockerScripts () {
  /**
   * Default name
   */
  this.name = 'docker-scripts';
}

/**
 * Prepare the main object to be on the correct format for build process
 *
 * @param {Object} config current config object to prepare for build process
 * @param {Object} grunt current grunt instance
 * @return {Boolean|Object} false in case of failure an object in case of success
 */
DockerScripts.prototype.prepare = function (config, grunt) {
  // We need first validate the json format for dockerfile config
  var validate = joi.validate(config, schema.get());

  // Has error ?
  if (!_.isNull(validate.error)) {
    // Log an error message
    grunt.log.warn([
      'Cannot prepare config content for scripts process :', validate.error
    ].join(' '));

    // Default invalid statement
    validate.value = false;
  }

  // Default statement
  return _.sortBy(_.map(validate.value.scripts, function (value, key) {
    // Default map statement
    return {
      name  : key,
      value : value
    }
  }), function (order) {
    // Default order statement
    return [ order.name === 'common' ];
  });
}

/**
 * Build the current script object, and store content on destination path
 *
 * @param {Object} grunt current grunt instance
 * @param {Object} value current overload ressrouce property to merge with the default values
 * @param {Object} destination destination path to store content
 * @param {Object} storage data to use on common process on the last step of process
 * @return {Boolean} true in case of success, false otherwise
 */
DockerScripts.prototype.build = function (grunt, value, destination, storage) {
  // Log process message
  grunt.log.debug([
    'We try to process scripts for', value.name || 'unknown', 'environment'
  ].join(' '));

  // We need first validate the json format for dockerfile config
  var validate = joi.validate(value, joi.object().required().keys({
    name  : joi.string().required().empty(),
    value : joi.object().required().unknown()
  }));

  // Result is valid ?
  if (!_.isNull(validate.error)) {
    // Log invalid message
    grunt.log.warn([
      'Cannot build the dockerscripts for', value.name || 'unknown' ,
      'because schema is invalid :', validate.error
    ].join(' '));

    // Invalid statement
    return false;
  }

  // Re use config
  // config = validate.value;

  // No try to load template file
  var template = fs.readFileSync(path.resolve([
    __dirname, '../models', [
      validate.value.name !== 'common' ? 'scripts-build-compose' : 'scripts-start-application',
      '.sh.template'
    ].join('')
  ].join('/')));


  /**
   * Remap utility method
   *
   * @param {Object} value value to remap
   * @return {Object} remapped object
   */
  function remapObj (value) {
    // Default statement
    return _.map(value, function (v, k) {
      // Obj to use
      var obj = {}

      // Set key
      _.set(obj, 'key', k);
      _.set(obj, 'value', v);

      // Default statement
      return obj;
    });
  }

  // Remap value
  validate.value.value = remapObj(value.value);

  // If is not common we need to do a specific process
  if (validate.value.name !== 'common') {
    // Only if genrate is enabled
    if (grunt.option('generateScripts')) {
      // If we are here we need to build properly scripts file for each given env
      grunt.file.write(destination, _.template(template)(validate.value));
    }

    // Set command for scripts process
    _.set(validate.value, 'command', _.first(validate.value.name));
  } else {
    // Prepare all value for script build
    var all = _.flattenDeep(_.map(storage, function (s) {
      // Default internal statement
      return _.map(s.value, function (v) {
        // Default statement
        return v.key;
      })
    }));

    // Push value
    var common = _.flattenDeep(_.map(validate.value.value, function (v) {
      // Default statement
      return v.key;
    }));

    // Get here difference key to be sure to have all key define on common property
    var difference = _.difference(all, common);

    // Add difference key to commone value
    validate.value.value = _.uniqBy(_.flattenDeep([
      validate.value.value, _.map(difference, function (d) {
        // Obj to use
        var obj = {}

        // Set key
        _.set(obj, 'key', d);
        _.set(obj, 'value', '')

        // Return build obj
        return obj;
      })
    ]), 'key');

    // Normalize all storage
    all = _.flattenDeep(_.map(validate.value.value, function (v) {
      // Default statement
      return [ v.key, '="${', v.key, '}"' ].join('');
    }));

    // Only if genrate is enabled
    if (grunt.option('generateScripts') && grunt.option('generateDockerfile')) {
      // Save file on fs
      grunt.file.write(destination, _.template(template)({
        all     : all,
        common  : validate.value,
        env     : storage,
        main    : grunt.option('allconfig').main,
        name    : grunt.option('allconfig').name,
        runtime : grunt.option('allconfig').runtime || {}
      }));
    }
  }

  // Only if genrate is enabled
  if (grunt.option('generateScripts') && grunt.option('generateDockerfile')) {
    // In all case ce change the mode of destination file
    fs.chmodSync(destination, '744');

    // Default process statement
    return grunt.file.exists(destination) ? validate.value : false;
  }

  // In all other case we return a valid statement
  return true;
};

// Default export
module.exports = new DockerScripts();

