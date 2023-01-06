import { readdirSync } from 'fs'
import { REST, Routes } from 'discord.js';
import config from './config.js'

const commands = []
const commandFiles = readdirSync('./commands').filter(file => file.endsWith('.js'))

for (const file of commandFiles) {
	const command = await import(`./commands/${file}`)
	commands.push(command.data.toJSON())
}

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');
	await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
	console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();