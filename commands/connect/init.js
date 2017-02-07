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
  console.log('Initializing Git repo...')
  child.execSync(`git init`)
  console.log('Creating Java Project...')
  child.execSync(`curl https://start.spring.io/starter.tgz -d dependencies=web,data-jpa,security,devtools,postgresql,data-rest -d type=maven-project -d packageName=${context.flags.package} -d artifactId=${appName} -d groupId=${context.flags.package} | tar -xzvf -`);
  
  console.log(`Creating Heroku app ... ${appName} `);
  child.execSync(`heroku create -a ${appName} --addons heroku-postgresql`) // TODO `heroku git:remote` if it exists

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
