'use strict';

const cli = require('heroku-cli-util');
const co = require('co');
const path = require('path');
const fs = require('fs');
const xml2js = require('xml2js');
const child = require('child_process');
const util = require('util');


module.exports = function(topic, command) {
  return {
    topic: topic,
    command: command,
/* TURN ON FLAG if needsApp = false*/
    flags: [/*{name: 'app', char: 'a', hasValue: true, description: 'the Heroku app to use'}*/
    {name: 'package', char: 'p', hasValue: true, description: 'Java package'}],
    variableArgs: true,
    usage: `${topic}:${command}`,
    description: 'Generates Java code from a Heroku Connect datastore.',
    needsApp: true,
    needsAuth: true,
    run: cli.command(co.wrap(generate))
  };
};

function* generate(context, heroku) {

  let appName = context.flags.app || context.args.app || context.app || process.env.HEROKU_APP
  console.log(`Configuring app: ${appName}`);
  //console.log(`Configuring app (flag): ${appName}`);
  //console.log(util.inspect(context, false, null))

  console.log('Reading pom.xml...');
  var pom = fs.readFileSync('pom.xml', 'utf8');
  xml2js.parseString(pom, function (err, pomObj) {
    pomObj['project']['groupId'] = `${context.flags.package}`
    pomObj['project']['artifactId'] = `${appName}` // TODO get the app name from the one generate above
    pomObj['project']['name'] = `${appName}`

    pomObj['project']['dependencies'][0]['dependency'].push({
        'groupId': 'com.github.jkutner',
        'artifactId': 'heroku-connect-java-auth0',
        'version' : '0.1.0'
    })

    var builder = new xml2js.Builder();
    var xml = builder.buildObject(pomObj);
    fs.writeFileSync('pom.xml', xml)

    console.log('Committing pom.xml changes...');
    child.execSync(`git add .`)
    child.execSync(`git commit -m "Add Security dependencies"`)

    console.log('Writing database config...');
 //   fs.readFile('TelosysTools/databases.dbcfg', 'utf8', function (err, dbcfg) {
      // dbcfg = dbcfg.replace('JDBC_DATABASE_URL', configVars['JDBC_DATABASE_URL'])
      // dbcfg = dbcfg.replace('JDBC_DATABASE_USERNAME', configVars['JDBC_DATABASE_USERNAME'])
      // dbcfg = dbcfg.replace('JDBC_DATABASE_PASSWORD', configVars['JDBC_DATABASE_PASSWORD'])
      // fs.writeFileSync('TelosysTools/databases.dbcfg', dbcfg)

      // TODO do the Telosys stuff?
//    });

  co(function*() {
        let configVars = yield heroku.get(`/apps/${context.app}/config-vars`);
        // var configVars = {
        //   'JDBC_DATABASE_URL': 'TODO',
        //   'JDBC_DATABASE_USERNAME': 'TODO',
        //   'JDBC_DATABASE_PASSWORD': 'TODO',
        // }
        return configVars;
  }).then(function (cv) {
        console.log('Config variables:');
        console.log(util.inspect(cv, false, null));

  });

  });

}