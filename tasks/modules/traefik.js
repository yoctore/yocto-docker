'use strict';

var _ = require('lodash');

/**
 * Main module to build traefik property
 * 
 * @module Traefik
 */
function Traefik () {
  // Default traefik prefix for default build process
  this.prefix = 'traefik';
}

/**
 * Build traefik configuration from given configuration
 *
 * @param {Object} config loaded config from dockerfile process
 * @return {Array} builded configuration for trafik rule
 */
Traefik.prototype.build = function (config) {
  // Proxy rules are enable ?
  var enable = _.get(config, 'proxy.enable') || false;

  // Default rules to appy
  var rules = [
    {
      key   : 'enable',
      value : enable
    }, {
      key  : 'backend',
      path : 'name'
    }, {
      key   : 'port',
      path  : 'dockerfile.ports',
      first : true
    }, {
      key  : 'protocol',
      path : 'proxy.backendProtocol'
    }, {
      key  : 'weight',
      path : 'proxy.loadbalancer'
    }, {
      key  : 'frontend.rule',
      path : 'proxy.hosts',
      join : true,
      pre  : 'Host:'
    }, {
      key  : 'frontend.passHostHeader',
      path : 'proxy.sendHeader'
    }, {
      key  : 'frontend.priority',
      path : 'proxy.priority'
    }, {
      key  : 'frontend.entryPoints',
      path : 'proxy.entrypointProcotol',
      join : true
    }, {
      key  : 'frontend.whitelistSourceRange',
      path : 'proxy.allowedIp',
      join : true
    }, {
      key  : 'docker.network',
      path : 'proxy.network'
    }
  ];

  // Remap value
  return enable ? _.compact(_.map(rules, function (rule) {
    // Get default value
    var value = rule.path ? _.get(config, rule.path) : rule.value || '';

    // Has join rule defined ?
    if (rule.join) {
      value = value.join(',');
    }

    // Value is not empty ?
    if ((_.isString(value) || _.isArray(value)) && _.isEmpty(value)) {
      // Return invalid statement
      return false;
    }

    // Has a pre rule defined ?
    if (rule.pre) {
      value = [ rule.pre, value ].join('')
    }

    // We need first port exposed
    if (rule.first) {
      value = _.first(value);

      // Specific process
      if (rule.path === 'dockerfile.ports') {
        // Get exposed value from port definition
        value = _.get(value, 'exposed');
      }
    }

    // Defaut remap statement
    return {
      key   : [ this.prefix, rule.key ].join('.'),
      value : value
    };
  }.bind(this))) : [];
};

// Default export
module.exports = new Traefik();
