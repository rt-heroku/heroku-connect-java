'use strict';

const cli = require('heroku-cli-util');
const co = require('co');
const path = require('path');
const fs = require('fs');
const xml2js = require('xml2js');
const child = require('child_process');
const util = require('util');
const parseDbUrl = require("parse-database-url");

module.exports = function(topic, command) {
  return {
    topic: topic,
    command: command,
/* TURN ON FLAG if needsApp = false*/
    flags: [/*{name: 'app', char: 'a', hasValue: true, description: 'the Heroku app to use'}*/
    {name: 'package', char: 'p', hasValue: true, description: 'Java package'},
    {name: 'eclipse', char: 'e', hasValue: false, description: 'Adds eclipse support'},
    {name: 'schema', char: 's', hasValue: true, description: 'Schema where the connect tables are'}],
    variableArgs: true,
    usage: `${topic}:${command}`,
    description: 'Generates Java code from a Heroku Connect datastore.',
    needsApp: true,
    needsAuth: true,
    run: cli.command(co.wrap(test))
  };
};

function* test(context, heroku) {

  let appName = context.flags.app || context.args.app || context.app || process.env.HEROKU_APP
  let packageName = `${context.flags.package}`;
  let schema = context.flags.schema || 'salesforce';

  console.log('#package: ' + packageName)
  console.log(`#eclipse: ${context.flags.eclipse}`)
  console.log('#schema: ' + schema)

  console.log(`git init`)
  console.log(`curl https://start.spring.io/starter.tgz -d dependencies=web,data-jpa,security,devtools,postgresql,data-rest -d type=maven-project -d packageName=${context.flags.package} -d artifactId=${appName} -d groupId=${context.flags.package} | tar -xzvf -`);
  console.log(`git clone https://github.com/rt-heroku/rest-builder-bin.git bin`)
  console.log(`heroku git:remote -a ${appName}`) // TODO `heroku git:remote` if it exists

  console.log(`mvn clean package install -DskipTests`);
  console.log(`mvn eclipse:clean eclipse:eclipse`);

  co(function*() {
      let configVars = yield heroku.get(`/apps/${context.app}/config-vars`);
      return configVars;
  }).then(function (cv) {
      console.log(`java -cp bin/rest-builder-1.0.jar co.rtapps.builder.CodeGenerator -a ${appName} -p ${packageName} -e ${packageName}.entities -D ${cv.DATABASE_URL} -s ${schema}`);
      console.log(`git add .`)
      console.log(`git commit -m "Add generated code"`)
      console.log(`git push heroku master`)
    });
}
