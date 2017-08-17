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

### <code>.yocto-docker.json</code> rules




