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

  var pom = fs.readFileSync('pom.xml', 'utf8');
  xml2js.parseString(pom, function (err, pomObj) {
    pomObj['project']['groupId'] = `${context.flags.package}`
    pomObj['project']['artifactId'] = `${appName}` // TODO get the app name from the one generate above
    pomObj['project']['name'] = `${appName}`

    pomObj['project']['dependencies'][0]['dependency'].push({
        'groupId': 'co.rtapps',
        'artifactId': 'security-db',
        'version' : '0.0.1.RELEASE'
    })
    pomObj['project']['repositories']=[{'repository':{
        'id': 'project.local',
        'name': 'project',
        'url' : 'file:${project.basedir}/bin'
    }}]

    var builder = new xml2js.Builder();
    var xml = builder.buildObject(pomObj);
    fs.writeFileSync('pom.xml', xml)
    // child.execSync(`mvn clean package install -DskipTests`);
    // child.execSync(`mvn eclipse:clean eclipse:eclipse`);

    // console.log('Committing pom.xml changes...');
    // child.execSync(`git add .`)
    // child.execSync(`git commit -m "Add Security dependencies"`)

    // console.log('Writing database config...');


//GENERATES TABLES BASED ON THE REPO



 //   fs.readFile('TelosysTools/databases.dbcfg', 'utf8', function (err, dbcfg) {
      // dbcfg = dbcfg.replace('JDBC_DATABASE_URL', configVars['JDBC_DATABASE_URL'])
      // dbcfg = dbcfg.replace('JDBC_DATABASE_USERNAME', configVars['JDBC_DATABASE_USERNAME'])
      // dbcfg = dbcfg.replace('JDBC_DATABASE_PASSWORD', configVars['JDBC_DATABASE_PASSWORD'])
      // fs.writeFileSync('TelosysTools/databases.dbcfg', dbcfg)

      // TODO do the Telosys stuff?
//    });

  co(function*() {
        let configVars = yield heroku.get(`/apps/${context.app}/config-vars`);
        return configVars;
  }).then(function (cv) {
        console.log('Config variables:');
        var dbConfig = parseDbUrl(cv.DATABASE_URL);
        console.log(util.inspect(dbConfig, false, null));


        jdbc:postgresql://ec2-54-225-119-223.compute-1.amazonaws.com:5432/d5emo02322448m?user=cgpmwzrnfjfyhg&password=79cb7a64e4e4499d26b0cde4a790cd1bade39fe4942f71731dbbba1b479a1bd4&

        dbConfig.user 
        dbConfig.password
        dbConfig.database
        var jdbc = 'jdbc:postgresql://' + dbConfig.host + ':' + dbConfig.port + '/' + dbConfig.database + '?sslmode=require&user=' + dbConfig.user + '&password=' + dbConfig.password;
        console.log('jdbc=' + jdbc);

  });

  });

}
