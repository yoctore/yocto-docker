'use strict';

var _ = require('lodash');

/**
 * Main Utility class, to provide utility tools on main module
 * 
 * @module Utility
 */
function Utility () {
  // Path lists
  this.paths = [
    'dockerfile.labels',
    'dockerfile.ressources.memory',
    'dockerfile.ressources.cpus',
    'dockerfile.logging',
    'dockerfile.restart',
    'dockerfile.apparmor',
    'dockerfile.volumes',
    'proxy'
  ];
}

/**
 * Utility method to get all devined env for auto build process
 *
 * @param {Object} config current config object to prepare for build process
 * @return {Array} defined env
 */
Utility.prototype.getDefinedEnv = function (config) {
  // Parse all paths item and return needed data
  return _.uniq(_.flatten(_.map(this.paths, function (path) {
    // Default statement
    return _.map(_.get(config, path), function (item) {
      // Return env value
      return item.env;
    });
  })));
};

// Default export
module.exports = new Utility();
