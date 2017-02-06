'use strict';

const cli = require('heroku-cli-util');
const co = require('co');
const path = require('path');
const fs = require('fs');
const xml2js = require('xml2js');
const child = require('child_process');

module.exports = function(topic, command) {
  return {
    topic: topic,
    command: command,
    flags: [],
    variableArgs: true,
    usage: `${topic}:${command}`,
    description: 'Generates a Java app from a Heroku Connect datastore.',
    needsApp: false,
    needsAuth: true,
    run: cli.command(co.wrap(generate))
  };
};

function* generate(context, heroku) {
  console.log('Cloning Git repo...')
  child.execSync(`git clone https://github.com/rt-heroku/secure-db-api connect-java`)
  process.chdir('connect-java');

  console.log('Creating Heroku app...');
  child.execSync(`heroku create --addons heroku-postgresql`) // TODO `heroku git:remote` if it exists

  console.log('Reading pom.xml...');
  var pom = fs.readFileSync('pom.xml', 'utf8');
  xml2js.parseString(pom, function (err, pomObj) {
    pomObj['project']['groupId'] = 'com.example'
    pomObj['project']['artifactId'] = 'sushi' // TODO get the app name from the one generate above
    pomObj['project']['name'] = 'sushi'

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
    fs.readFile('TelosysTools/databases.dbcfg', 'utf8', function (err, dbcfg) {

      // let configVars = yield heroku.get(`/apps/${context.app}/config-vars`)
      var configVars = {
        'JDBC_DATABASE_URL': 'TODO',
        'JDBC_DATABASE_USERNAME': 'TODO',
        'JDBC_DATABASE_PASSWORD': 'TODO',
      }

      dbcfg = dbcfg.replace('JDBC_DATABASE_URL', configVars['JDBC_DATABASE_URL'])
      dbcfg = dbcfg.replace('JDBC_DATABASE_USERNAME', configVars['JDBC_DATABASE_USERNAME'])
      dbcfg = dbcfg.replace('JDBC_DATABASE_PASSWORD', configVars['JDBC_DATABASE_PASSWORD'])
      fs.writeFileSync('TelosysTools/databases.dbcfg', dbcfg)

      // TODO do the Telosys stuff?
    });
  });
}
