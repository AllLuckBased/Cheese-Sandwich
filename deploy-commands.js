import { readdirSync } from 'fs'

import { Client } from 'discord.js'
import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v9'

import config from './config.js'

const commands = []
const commandFiles = readdirSync('./commands').filter(file => file.endsWith('.js'))

for (const file of commandFiles) {
	const command = await import(`./commands/${file}`)
	commands.push(command.data.toJSON())
}

const rest = new REST({ version: '9' }).setToken(config.token)

rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands })
	.then(() => console.log("Successfully deployed the commands."))
	.catch(console.error)

const client = new Client({ intents: ['GUILDS', 'GUILD_MEMBERS', 'GUILD_BANS', 'GUILD_EMOJIS_AND_STICKERS',
'GUILD_INTEGRATIONS', 'GUILD_WEBHOOKS', 'GUILD_INVITES', 'GUILD_VOICE_STATES', 'GUILD_PRESENCES', 'GUILD_MESSAGES',
'GUILD_MESSAGE_REACTIONS', 'GUILD_MESSAGE_TYPING']} )

client.once('ready', async () => {
	(await client.guilds.cache.get(config.guildId).commands.fetch()).each(async command => {
		const { getPerms } = await import(`./commands/${command.name}.js`)
		if(getPerms != undefined && !command.defaultPermission) command.permissions.set({ permissions: getPerms(client) })
	})

	await new Promise(resolve => setTimeout(resolve, 3000));
	console.log("Successfully set permissions.")
	process.exit()
})

client.login(config.token)