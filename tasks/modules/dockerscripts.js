'use strict';

var _             = require('lodash');
var moment        = require('moment');
var joi           = require('joi');
var path          = require('path');
var timezone      = require('moment-timezone');
var fs            = require('fs');

/**
 * Main dockerscripts factory. Process all action for dockerscripts creation
 */
function DockerScripts () {}

/**
 * Get default schema for validation process
 *
 * @return {Object} validation schema to use for validation
 */
DockerScripts.prototype.getSchema = function () {
  // Default schema to use for validation
  return joi.object().required().keys({
    dockerfile : joi.object().required().keys({}).unknown(),
    compose : joi.object().required().keys({}).unknown(),
    scripts : joi.object().optional().keys({
      common : joi.object().optional().keys({}).default({}).unknown(),
      development : joi.object().optional().keys({}).default({}).unknown(),
      qa : joi.object().optional().keys({}).default({}).unknown(),
      staging : joi.object().optional().keys({}).default({}).unknown(),
      production : joi.object().optional().keys({}).default({}).unknown()
    }).unknown().default({
      common : {},
      development : {},
      qa : {},
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
DockerScripts.prototype.prepare = function (config, grunt) {
  // we need first validate the json format for dockerfile config
  var validate = joi.validate(config, this.getSchema());

  // has error ?
  if (!_.isNull(validate.error)) {
    // log an error message
    grunt.log.warn([
      'Cannot prepare config content for scripts process :', validate.error
    ].join(' '));
    // default invalid statement
    validate.value = false;
  }

  // default statement
  return _.sortBy(_.map(validate.value.scripts, function(value, key) {
    // default map statement
    return {
      name : key,
      value : value
    }
  }), function (order) {
    // default order statement
    return [ order.name === 'common', order.name === order.name ];
  });

  // default statement
  return validate.value;
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
  // log process message
  grunt.log.ok([
    'We try to process scripts for', value.name || 'unknown', 'environment'
  ].join(' '));

  // we need first validate the json format for dockerfile config
  var validate = joi.validate(value, joi.object().required().keys({
    name  : joi.string().required().empty(),
    value : joi.object().required().unknown()
  }));

  // result is valid ?
  if (!_.isNull(validate.error)) {
    // log invalid message
    grunt.log.warn([
      'Cannot build the dockerscripts for', value.name || 'unknown' ,
      'because schema is invalid :', validate.error
    ].join(' '));

    // Invalid statement
    return false;
  }

  // re use config
  //config = validate.value;

  // No try to load template file
  var template = fs.readFileSync(path.resolve([
    process.cwd(), 'tasks/models', [
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
  function remapObj(value) {
    // default statement
    return _.map(value, function (v, k) {
      // obj to use
      var obj = {}
      // set key
      _.set(obj, 'key', k);
      _.set(obj, 'value', v);
  
      // default statement
      return obj;
    });
  }

  // remap value
  validate.value.value = remapObj(value.value);

  // if is not common we need to do a specific process
  if (validate.value.name !== 'common') {
    // if we are here we need to build properly scripts file for each given env
    grunt.file.write(destination, _.template(template)(validate.value));

    // set command for scripts process
    _.set(validate.value, 'command', _.first(validate.value.name));

    // default process statement
    return grunt.file.exists(destination) ? validate.value : false;
  } else {
    // prepare all value for script build
    var all = _.flattenDeep(_.map(storage, function (s) {
      // default internal statement
      return _.map(s.value, function (v) {
        // default statement
        return v.key;
      })
    }));

    // push value
    var common = _.flattenDeep(_.map(validate.value.value, function (v) {
      // default statement
      return v.key;
    }));

    // get here difference key to be sure to have all key define on common property
    var difference = _.difference(all, common);

    // add difference key to commone value
    validate.value.value = _.flattenDeep([
      validate.value.value, _.map(difference, function (d) {
        // obj to use
        var obj = {}

        // set key
        _.set(obj, 'key', d);
        _.set(obj, 'value', '')

        // return build obj
        return obj;
      })
    ]);
    //console.log(validate.value);

    // normalize all storage
    all = _.flattenDeep(_.map(validate.value.value, function (v) {
      // default statement
      return [ v.key, '="${', v.key, '}"' ].join('');
    }));

    // save file on fs
    grunt.file.write(destination, _.template(template)({
      all     : all,
      common  : validate.value,
      env     : storage,
      main    : grunt.option('dockerfile').main,
      name    : grunt.option('dockerfile').name,
      runtime : grunt.option('dockerfile').runtime || {}
    }));
  }

  // default statement
  return validate.value;

};

// Default export
module.exports = new DockerScripts();

