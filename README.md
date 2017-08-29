[![NPM](https://nodei.co/npm/yocto-docker.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/yocto-docker/)

![alt text](https://cdn.gruntjs.com/builtwith.png)
[![Node Required version](https://img.shields.io/badge/node-%3E%3D6.11.2-brightgreen.svg)]()
![alt text](https://david-dm.org/yoctore/yocto-docker.svg "Dependencies Status")
[![Build Status](https://travis-ci.org/yoctore/yocto-docker.svg?branch=master)](https://travis-ci.org/yoctore/yocto-docker)

## Motivation

All the time and for each project we need to rewrite our docker configuration files (dockerfile/compose/entrypoint), a lot of things are boring to write, so we decide to write this program.

## How to install ?

```shell
npm install yocto-docker --save-dev
```

## Generality

### Classic usage

To use all features you need configure your Gruntfile.js like this

```
'use strict';

module.exports = function (grunt) {
  // Project configuration.
  grunt.initConfig({
    // Default package
    pkg : grunt.file.readJSON('package.json'),

    // Configuration to be run (and then tested).
    yoctodocker : {}
  });

  // Actually load this plugin's task(s).
  grunt.loadNpmTasks('yocto-docker');

  grunt.registerTask('default', [ 'yoctodocker' ]);
};
``` 

### No property defined on Gruntfile ?

You don't need defined any property on Gruntfile, by default the grunt tasks append need configuration.

### How internal property works on task process ?

In your currrent <code>yoctodocker</code> tasks, three properties are defined by default.
This three properties provide a complete build of : 

- Dockerfile
- Compose files for each defined environment
- Bash scripts files to start a build for each defined environment 

Generally this three properties work together to process the complete build.

The property dependencies tree is : <code>dockerfile</code> > <code>compose</code> > <code>scripts</code>

## How to configure your docker rules

When you run your task for the first time, we copy a template file <code>.yocto-docker.json</code>on your project. This template contains the whole needed structure of your config file.

### How configure your project on <code>.yocto-docker.json</code>

#### Dockerfile properties

In this part you must defined all your dockerfile properties based on docker documentation.

##### FROM

To define on which package your application is based you can complete this property.

```
"from" : {
  "name": "node", // this is the default value of this object
  "version": "6.11.2" // it's the latest lts version of node by default 
}
```
By default is node with latest lts version is defined for from property you can can change it if you need.

*This property follow this validation schema :* 

```
 from : joi.object().required().keys({
   name : joi.string().required().empty(),
   version : joi.string().required().empty()
 })
```

##### LABELS

To defined labels on your docker process, you can complete this property.
By default we add property from your package.json (name, version, description, main, and other useful labels) on your final Dockerfile.

```
"labels": [],
```
By default this array is empty you can append new value on it if you defined and object like this : 

*This property follow this validation schema :* 

```
 labels : joi.array().optional().items(joi.object().optional().keys({
   key   : joi.string().required().empty(),
   value : joi.string().required().empty()
 })).default([])
```

##### ENVIRONMENTS

To defined environments values on your docker process, you can complete this property.
By default your application name and version is append on final Dockerfile

*This property follow this validation schema :* 

```
environments : joi.array().optional().items(joi.object().optional().keys({
    key   : joi.string().required().empty(),
    value : joi.string().required().empty(),
    comment : joi.string().optional().empty()
})).default([])
```

##### ARGUMENT

To defined args on your docker process, you can complete this property.

*This property follow this validation schema :* 

```
argument : joi.array().optional().items(joi.object().optional().keys({
    key   : joi.string().required().empty(),
    value : joi.string().required().empty()
})).default([])
```

##### COPY

To defined <code>COPY</code> instructions on your docker process, you can complete this property.

*This property follow this validation schema :* 

```
copy : joi.array().optional().items(joi.object().optional().keys({
    source   : joi.string().required().empty(),
    destination : joi.string().required().empty()
})).default([])
```

##### USER

To defined user on your docker process, you can complete this property.
By default we add an user <code>infra</code> with a random <code>UUID</code> between 1000 & 9999

*This property follow this validation schema :* 

```
user : joi.object().optional().keys({
    uuid   : joi.number().optional().min(1000).max(9999).default(_.random(1000, 9999)),
    id     : joi.string().optional().empty().default('infra')
}).default({ id : 'infra', uuid : _.random(1000, 9999) })
```

##### CUSTOMS

You can also defined custom command on your docker process. Only five command are allowed on your commands definition. These commands are :
- <code>WORKDIR</code>
- <code>RUN</code>
- <code>ONBUILD</code>
- <code>STOPSIGNAL</code>
- <code>SHELL</code>

*This property follow this validation schema :* 

```
customs : joi.array().optional().items(joi.object().optional().keys({
    comment : joi.string().required().empty(),
    command : joi.string().required().empty().valid([
      'WORKDIR', 'RUN', 'ONBUILD', 'STOPSIGNAL', 'SHELL'
    ]),
    value       : joi.string().required().empty()
})).default([])
```

To more details on each command, follow the online docker documentation.

##### MAINTAINERS

To defined maintainers user for you app, you can use this property.
By default the application append the current git user on maintainers list.

*This property follow this validation schema :* 

```
maintainers : joi.array().optional().items(joi.string().optional().empty()).default([]),
```

##### HEALTHCHECK

To defined healthcheck rules, you can use this property.
To more details on healcheck rules, visit online docker documentaiton our schema is based on the same schema.

*This property follow this validation schema :* 

```
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
}).default({})
```

##### PORTS

To define exposed ports, you can use this property.

*This property follow this validation schema :* 

```
ports : joi.array().optional().items(joi.number().optional().min(0)).default([]),
```

##### VOLUMES

To define exposed volumes, you can use this property.

*This property follow this validation schema :* 

```
volumes : joi.array().optional().items(joi.string().optional().empty()).default([]),
```

##### ENTRYPOINTS

To define entrypoints options, you can use this property.
By default the main entrypoint of the application is <code>[ /bin/bash', 'scripts/start-application.sh'] </code>, all extra value given if push at the end of this command.

*This property follow this validation schema :* 

```
entrypoints : joi.array().optional().items(joi.string().optional().empty()).default([]),
```

##### COMMANDS

To define customs command options, you can use this property.
By default the a list of commande is define : 

- <code> -d </code> : is used to start app on development mode
- <code> -s </code> : is used to start app on staging mode
- <code> -p </code> : is used to start app on production mode
- <code> -q </code> : is used to start app on test/quality test mode

**Each of this commnand is link with a defined env object on compose and scripts process**

*This property follow this validation schema :* 

```
entrypoints : joi.array().optional().items(joi.string().optional().empty()).default([]),
```


