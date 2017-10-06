'use strict';

var joi = require('joi');
var _   = require('lodash');


/**
 * This class store all defined shema
 */
function Schema () {
  // Define here allowed env value and the default value
  this.allowedEnv = _.split(process.env.DOCKER_ENV ||
    'development,staging,production,qa,common,ci', ',');

  // Define here default env
  this.defaultEnv = 'common';

  // Defined here builded env property for dynamic mapping
  this.buildEnv = {};

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
        ),
        env : joi.string().optional().empty().valid(this.allowedEnv).default(this.defaultEnv)
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
      ports : joi.array().items(joi.object().optional().keys({
        exposed : joi.number().required().min(0),
        bind    : joi.number().optional().min(0)
      })).default([]),
      volumes : joi.array().optional().items(joi.object().optional().keys({
        source  : joi.string().optional().empty(),
        target  : joi.string().required().empty(),
        rights  : joi.string().optional().empty().valid([ 'ro', 'rw' ]).default('ro'),
        env     : joi.string().optional().empty().valid(this.allowedEnv).default(this.defaultEnv),
        exposed : joi.boolean().optional().default(false)
      }).unknown()).default([]),
      entrypoints : joi.array().optional().items(joi.string().optional().empty()).default([]),
      commands    : joi.array().optional().items(joi.string().optional().empty()).default([]),
      privileged  : joi.boolean().optional().default(false),
      ressources  : joi.object().optional().keys({
        memory : joi.array().optional().items(joi.object().optional().keys({
          key   : joi.string().required().empty().valid([ 'mem_limit' ]),
          unit  : joi.string().required().empty().valid([ 'b', 'k', 'm', 'g' ]),
          value : joi.number().required().min(1),
          env   : joi.string().optional().empty().valid(this.allowedEnv).default(this.defaultEnv)
        })).default([ {
          key   : 'mem_limit',
          value : 4,
          unit  : 'm',
          env   : this.defaultEnv
        } ]),
        cpus : joi.array().optional().items(joi.object().optional().keys({
          key   : joi.string().required().empty().valid([ 'cpu_shares' ]),
          value : joi.number().required().min(1),
          env   : joi.string().optional().empty().valid(this.allowedEnv).default(this.defaultEnv)
        })).default([ {
          key   : 'cpu_shares',
          value : 90,
          env   : this.defaultEnv
        } ])
      }),
      logging : joi.array().required().min(1).items(joi.object().optional().keys({
        driver : joi.string().required().empty().valid([ 'json-file' ]),
        size   : joi.object().required().keys({
          value : joi.number().required().min(1).default(100),
          unit  : joi.string().optional().empty().valid([ 'm', 'g' ]).default('m')
        }),
        'max-file' : joi.number().optional().min(1).default(1),
        labels     : joi.array().optional().items(joi.string().optional().empty()).default([]),
        env        : joi.string().optional().empty().valid(this.allowedEnv).default(this.defaultEnv)
      })),
      restart : joi.array().required().min(1).items(joi.object().optional().keys({
        policy : joi.string().optional().empty().valid([
          'on-failure', 'unless-stopped', 'always'
        ]).default('on-failure'),
        retry : joi.number().optional().min(1).default(5),
        env   : joi.string().optional().empty().valid(this.allowedEnv).default(this.defaultEnv)
      })),
      security : joi.array().required().min(0).items(joi.object().optional().keys({
        rule : joi.string().required().empty(),
        env  : joi.string().optional().empty().valid(this.allowedEnv).default(this.defaultEnv)
      })).default([ {
        rule : 'no-new-privileges',
        env  : this.defaultEnv
      } ]),
      apparmor : joi.array().required().min(0).items(joi.object().optional().keys({
        rule : joi.string().required().empty(),
        env  : joi.string().optional().empty().valid(this.allowedEnv).default(this.defaultEnv)
      })).default([ {
        rule : 'docker-default',
        env  : this.defaultEnv
      } ])
    }).unknown()
  };

  // Build all defined env property
  _.each(this.allowedEnv, function (env) {
    _.set(this.buildEnv, _.trim(env), joi.object().optional().keys({}).default({}).unknown());
  }.bind(this));

  /**
   * Define default scripts schema
   */
  this.scripts = {
    scripts : joi.object().optional().keys(this.buildEnv)
  };

  /**
   * Define default compose schema
   */
  this.compose = {
    compose : joi.object().optional().keys(this.buildEnv)
  };

  /**
   * Default proxy schema
   */
  this.proxy = {
    proxy : joi.array().optional().items(joi.object().required().keys({
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
      ).default([]),
      env : joi.string().optional().empty().valid(this.allowedEnv).default(this.defaultEnv)
    })).default([ {
      enable             : false,
      network            : 'bridge',
      hosts              : [],
      entrypointProcotol : [ 'http', 'https' ],
      backendProtocol    : 'http',
      loadbalancer       : 0,
      sendHeader         : true,
      priority           : 10,
      allowedIp          : [],
      env                : this.defaultEnv
    } ])
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
