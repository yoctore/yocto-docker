'use strict';

var _   = require('lodash');
var fs = require('fs');
var timezone = require('moment-timezone');
var yaml = require('yamljs');


var nativeObject = yaml.load('./tasks/models/docker-compose-template.yml');
console.log(nativeObject);

//console.log(YAML.stringify(nativeObject, 4));

var timezone = require('moment-timezone');
console.log(timezone.tz.guess());
return 0;

var content = fs.readFileSync('./tasks/models/Dockerfile.template').toString();

var templateOps = {
  name : "test_application_name",
  description : "Lorem Ipsum Lorem Ipsum \n# Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum ",
  date : "01/12/2017 11:11:11",
  year : "2017",
  version : "1.0.0",
  author : "test",
  from : {
    name : "from_name",
    version : "from_version"
  },
  labels : [ {
    key : "maintainer_name",
    value : "maintainer name"
  },
  {
    key : "maintainer_email",
    value : "test@test.com"
  }],
  copyright : "Yocto SAS",
  environments : [ {
    key : "APPLICATION_NAME",
    value : "test"
  },
  {
    key : "DEBIAN_FRONTEND",
    value : "noninteractive"
  }],
  volumes : [
    "/my/volumes1",
    "/my/volumes2"
  ],
  argument : [ {
    key : "USER_UUID",
    value : "test"
  },
  {
    key : "ARG2",
    value : "noninteractive"
  }],
  commands : [ "efdfd", "ffdfd" ],
  entrypoints : [ "/bin/bash", "scripts/start-watcher.sh" ],
  customs : [
    {
      command : "RUN",
      value : 'mkdir ${FSFSD}',
      description : "Command description"
    },
   {
      command : "RUN",
      value : [ "apt-get install toto", "&&", "echo toto" ]
    },
   {
      command : "RUN",
      value : 'mkdir ${FSFSD}',
      description : "Command description"
    }
  ],
  ports : [ 10, 20, 80, 443 ],
  copy : [
    {
      source : "requirements.txt",
      destination : "/tmp/"
    },
   {
      source : "requirements2.txt",
      destination : "/tmp/"
    },
   {
      source : "requirements3.txt",
      destination : "/tmp/"
    }
  ],
  users : [
    {
      id : "mrobert",
      uid : 10
    },
    {
      id : "test",
      uid : 11
    }
  ],
  healthcheck : { 
    interval : {
      value : '10',
      unit  : 's'
    },
    timeout : {
      value : '20',
      unit  : 'm'
    },
    startPeriod : {
      value : '0',
      unit  : 's'
    },
    retries : '3',
    command : 'tptp'
  }
};

console.log(_.template(content)(templateOps));