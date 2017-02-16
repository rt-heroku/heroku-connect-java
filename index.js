exports.topic =  { 
	name: 'connect', 
	description: 'Heroku connect' 
}


exports.commands = [
  require('./commands/connect-api/generate.js')('connect-api', 'generate'),
  require('./commands/connect-api/init.js')('connect-api', 'init'),
  require('./commands/connect-api/test.js')('connect-api', 'test')
]
