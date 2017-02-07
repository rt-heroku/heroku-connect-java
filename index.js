exports.topics = [
  { name: 'connect', description: 'Heroku connect' }
]

exports.commands = [
  require('./commands/connect/generate')('connect', 'generate'),
  require('./commands/connect/init')('connect', 'init')
]
