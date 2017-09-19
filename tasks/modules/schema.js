'use strict';

var joi = require('joi');
var _   = require('lodash');


/**
 * This class store all defined shema
 */
function Schema () {
  /**
   * Define default dockerfile schema
   */
  this.dockerfile = {
    dockerfile : joi.object().required().keys({
      from : joi.object().required().keys({
        name    : joi.string().required().empty(),
        version : joi.string().required().empty()
      }),
      labels : joi.array().optional().items(joi.object().optional().keys({
        key   : joi.string().required().empty(),
        value : joi.alternatives().try(
          joi.string().required().empty(),
          joi.number().required().min(0),
          joi.boolean().required()
        )
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
      privileged  : joi.boolean().optional().default(false)
    }).unknown()
  };

  /**
   * Define default scripts schema
   */
  this.scripts = {
    scripts : joi.object().optional().keys({
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
  };

  /**
   * Define default compose schema
   */
  this.compose = {
    compose : joi.object().optional().keys({
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
  };

  /**
   * Default proxy schema
   */
  this.proxy = {
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
  };

  /**
   * Default runtime schema
   */
  this.runtime = {
    runtime : joi.object().optional().keys({
      nb_cores     : joi.number().optional().min(1).default(1),
      memory_limit : joi.number().optional().min(2048).default(2048)
    }).default({
      nb_cores     : 1,
      memory_limit : 2048
    })
  };
}

/**
 * Main function to get all needed schema
 *
 * @return {Object} builded joi object
 */
Schema.prototype.get = function () {
  // Default all storage object
  var all = {};

  // Parse all key
  _.each(this, function (item) {
    _.merge(all, item);
  });

  // Default statement
  return joi.object().required().keys(all).unknown();
};

// Default export
module.exports = new Schema();
