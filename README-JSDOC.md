## Motivation

All the time and for each project we need to rewrite our docker configuration files (dockerfile/compose/entrypoint), a lot of things are boring to write, so we decide to write this program.

**This program can be use only to build a container for a node app based on pm2**

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

You don't need defined any property on Gruntfile, by default the `yocto-docker` tasks append need configuration.

### Ok but if we dont need all feature ?

So is this case it's possible to disable file generation for no needed process, for example, maybe you dont need compose or script generation part. Do do this just set to `true`or `false` on your `Gruntfile`  for each property like below : 

```
'use strict';

module.exports = function (grunt) {
  // Project configuration.
  grunt.initConfig({
    // Default package
    pkg : grunt.file.readJSON('package.json'),

    // Configuration to be run (and then tested).
    yoctodocker : {
      compose : true, // or false
      scripts : true, // or false,
      dockerfile : true // or false
    }
  });

  // Actually load this plugin's task(s).
  grunt.loadNpmTasks('yocto-docker');

  grunt.registerTask('default', [ 'yoctodocker' ]);
};
``` 

### How this program works ?

Use use a template config file  <code>.yocto-docker.json</code> and transform each for each build process.

This program build a `Dockerfile`, all needed `docker-compose` file based on all needed environment, and all needed `scripts` based on needed environment too.

The tree property dependencies is : <code>dockerfile</code> > <code>compose</code> > <code>scripts</code>

### What we need to write  ?

The main entrypoint to edit your configuration file is to edit the `dockerfile`property part.

If you need `compose`part, keep cool, data are automatically used and builded by defined environment.  

And for the script part, it's the same.

## So ok, how to configure your docker rules ?

*When you run your task for the first time, a copy of default template file <code>.yocto-docker.json</code>on your project is created. This template contains the whole needed structure of your config file.*

The first things to understand is how to to defined and write all listed property.
To see defined schema for all defined property click [here](https://github.com/yoctore/yocto-docker/blob/master/tasks/modules/schema.js)  

Now let's go list and understand all property.

#### Dockerfile properties

##### FROM

It's used to define on which package your application is based you can complete this property.

##### LABELS

It's used to defined labels on your docker process.

*By default we automatically add property from your package.json (name, version, description, main, and other useful labels) on labels on your final Dockerfile, so don't rewrite it*

##### ENVIRONMENTS

It's used to environments values on your docker process

*By default your application name and version is append on final Dockerfile*

##### ARGUMENT

It's used to  defined args on your docker process

##### COPY

It's used to defined <code>COPY</code> instructions on your docker process

##### USER

It's used to defined user on on your container

*By default we add an user <code>infra</code> with a random <code>UUID</code> between 1000 & 9999*

##### CUSTOMS

It's used to defined custom command on your docker build process. 

*Only five command are allowed on your commands definition, please check schema definition.*
 
*And for more details on each command, follow the online docker documentation :*

 - [WORKDIR](https://docs.docker.com/engine/reference/builder/#workdir)
 - [RUN](https://docs.docker.com/engine/reference/builder/#run)
 - [ONBUILD](https://docs.docker.com/engine/reference/builder/#onbu)
 - [STOPSIGNAL](https://docs.docker.com/engine/reference/builder/#stopsignal)
 - [SHELL](https://docs.docker.com/engine/reference/builder/#shell)

##### MAINTAINERS

It's used to defined maintainers user for you application on your container 

*By default the application append the current git user on maintainers list.*

##### HEALTHCHECK

It's used to defined healthcheck rules on your container

*And for more details on healthcheck rules, visit [online docker documentaiton](https://docs.docker.com/engine/reference/buil) our schema is based on the same schema.*

##### PORTS

It's used to define exposed ports on your container

##### VOLUMES

It's used to define exposed volumes on your container

##### ENTRYPOINTS

It's used to define entrypoints options on your container

*By default the main entrypoint of the application is <code>[ /bin/bash', 'scripts/start-application.sh'] </code>, all extra value given if push at the end of this command.*

##### COMMANDS

It's used to define customs command options on your container

##### PRIVILEGED

It's used to define privileged rights on your container

##### RESSOURCES

It's used to define ressources limitation on your container

##### LOGGING

It's used to define logging options on your container

##### RESTART

It's used to define restart policy options on your container

##### SECURITY

It's used to define security option policy on your container

##### APPARMOR

It's used to define `apparmor`  configuration policy on your container

#### Docker Compose properties

All needed compose data are picked from `dockerfile`definition part and build properly for each environment. 

#### Scripts properties

It's possible to add custom property for you `bash`script for each defined environment.

Do do that, for example : 

```
"scripts": {
    "qa": {
      "FOO" : "BAR"
    },
    "production": {
      "FOO2" : "BAR2"
    },
    "staging": {}
}
```

#### Extra parameters

By default this docker generation process is for a node application base on process manager `pm2` .
To defined pm2 limitation the the <code>runtime</code> properties define on the root scope of your <code>.yocto-docker.json</code>

##### RUNTIME

Here we define config value for pm2 process use in default entrypoint.
It's possible to defined cpu core limit and memory limit.

##### PROXY

If you build a docker microservice app, maybe you need to use a reverse proxy.
For this we have implemented a basic configuration for [Traefik a modern reverve proxy](https://traefik.io).

This property is defined on the root scope of your <code>.yocto-docker.json</code>

See below matching between traefik properties and our properties.

| Namespace  	| Proxy property           	| Traefik property                     	| Comments                                                                  	|
|------------	|--------------------------	|--------------------------------------	|---------------------------------------------------------------------------	|
| dockerfile 	| proxy.enable             	| traefik.enable                       	|                                                                           	|
| -          	| name                     	| traefik.backend                      	|                                                                           	|
| dockerfile 	| ports                    	| traefik.port                         	| We only take the first define port                                        	|
| dockerfile 	| proxy.backendProtocol    	| traefik.protocol                     	|                                                                           	|
| dockerfile 	| proxy.loadbalancer       	| traefik.weight                       	|                                                                           	|
| dockerfile 	| proxy.hosts              	| traefik.frontend.rule                	| we take all defined hosts and join it with "," and prefix it with "Host:" 	|
| dockerfile 	| proxy.sendHeader         	| traefik.passHostHeader               	|                                                                           	|
| dockerfile 	| proxy.priority           	| traefik.frontend.priority            	|                                                                           	|
| dockerfile 	| proxy.entrypointProcotol 	| traefik.frontend.entryPoints         	| we take all defined value and join it with ","                            	|
| dockerfile 	| proxy.allowedIp          	| traefik.frontend.whitelistSourceRang 	| we take all defined value and join it with ","                            	|
| dockerfile 	| proxy.network            	| traefik.docker.network               	|                                                                           	|

For more defails on each traefik property, online documentation is available [here](https://docs.traefik.io)


## But we talk about rules defined by specific environment, how to use it ?

On each property described on definition schema, is defined a `env` property. So it's very simple juste write your env name in this property and the app will compile all defined environment.

### Can we really defined all needed environment value ?

Yes, by default the app expose these values : 

 - development
 - staging
 - production
 - qa
 - common (default env)
 - ci

To override these value juste set the node argument `DOCKER_ENV` separate by comma, when your start your grunt tasks. For example : 

`DOCKER_ENV="my_new_env, my_other_env, my_last_env" grunt docker` 
