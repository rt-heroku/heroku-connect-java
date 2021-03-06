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
    run: cli.command(co.wrap(generate))
  };
};

function* generate(context, heroku) {

  let appName = context.flags.app || context.args.app || context.app || process.env.HEROKU_APP
  let packageName = `${context.flags.package}`;
  let schema = context.flags.schema || 'salesforce';
  console.log('Initializing Git repo...')
  child.execSync(`git init`)
  console.log('Creating Java Project...')
  child.execSync(`curl https://start.spring.io/starter.tgz -d dependencies=web,data-jpa,security,devtools,postgresql,data-rest -d type=maven-project -d packageName=${context.flags.package} -d artifactId=${appName} -d groupId=${context.flags.package} | tar -xzvf -`);
  
  console.log('Downloading libraries ...')
  child.execSync(`git clone https://github.com/rt-heroku/rest-builder-bin.git bin`)

  console.log(`Attaching to existing Heroku app ... ${appName} `);
  child.execSync(`heroku git:remote -a ${appName}`) 

  var pom = fs.readFileSync('pom.xml', 'utf8');
  xml2js.parseString(pom, function (err, pomObj) {
    pomObj['project']['groupId'] = `${context.flags.package}`
    pomObj['project']['artifactId'] = `${appName}`
    pomObj['project']['name'] = `${appName}`

    pomObj['project']['dependencies'][0]['dependency'].push({
        'groupId': 'co.rtapps',
        'artifactId': 'security-db',
        'version' : '0.1.0.RELEASE'
    })

    pomObj['project']['repositories']=[{'repository':{
        'id': 'project.local',
        'name': 'project',
        'url' : 'file:repo'
    }}]

    var builder = new xml2js.Builder();
    var xml = builder.buildObject(pomObj);
    fs.writeFileSync('pom.xml', xml)

    console.log(`Adding libraries to project repo `);
    child.execSync(`mvn deploy:deploy-file -Durl=file:repo -Dfile=bin/security-db-0.1.0.RELEASE.jar -DgroupId=co.rtapps -DartifactId=security-db -Dpackaging=jar -Dversion=0.1.0.RELEASE`);

    if (context.flags.eclipse){
        console.log(`Adding eclipse support `);
        child.execSync(`mvn clean package install -DskipTests`);
        child.execSync(`mvn eclipse:clean eclipse:eclipse`);
    }

    console.log('Writing database config...');

    co(function*() {
          let configVars = yield heroku.get(`/apps/${context.app}/config-vars`);
          return configVars;
    }).then(function (cv) {
          console.log('Config variables:');
          console.log(util.inspect(cv, false, null));
 
        console.log(`Generating code`);
        child.execSync(`java -cp bin/rest-builder-1.0.jar co.rtapps.builder.CodeGenerator -a ${appName} -p ${packageName} -e ${packageName}.entities -D ${cv.DATABASE_URL} -s ${schema} `);
  
        console.log(`Pushing to Heroku`);
        child.execSync(`git add .`)
        child.execSync(`git commit -m "Add generated code"`)

        child.execSync(`git push heroku master`)

    });

  });

}
