import { readdirSync } from 'fs'

import mongoose from 'mongoose'
import { Client, Collection } from 'discord.js'

import config from './config.js'
import members from './models/Member.js'
import { updateMember } from './commands/update.js'
import { updateLeaderboard } from './commands/update-leaderboard.js'

const client = new Client({ intents: ['GUILDS', 'GUILD_MEMBERS', 'GUILD_BANS', 'GUILD_EMOJIS_AND_STICKERS',
	'GUILD_INTEGRATIONS', 'GUILD_WEBHOOKS', 'GUILD_INVITES', 'GUILD_VOICE_STATES', 'GUILD_PRESENCES', 'GUILD_MESSAGES',
	'GUILD_MESSAGE_REACTIONS', 'GUILD_MESSAGE_TYPING']} )
client.commands = new Collection()

const dbURI = `mongodb+srv://${config.mongoDB_uname}:${config.mongoDB_pwd}@cluster0.oovjw.mongodb.net/${config.mongoDB_namespace}?retryWrites=true&w=majority`
mongoose.connect(dbURI, {useNewUrlParser: true, useUnifiedTopology: true})
   	.then(() => console.log('Connected Successfully!'))
	.catch((err) => console.log(err))

const commandFiles = readdirSync('./commands').filter(file => file.endsWith('.js'))
for (const file of commandFiles)
	import(`./commands/${file}`).then(command => client.commands.set(command.data.name, command))

let currentInterval, lastUpdated
export function getLastUpdated() { return lastUpdated }

async function regularUpdate() {
	client.guilds.cache.get(config.guildId).members.cache.map( async member => {
		if (!member.user.bot) {
			let existingInfo = await members.findById(member.id).exec()
			if (existingInfo == null) {
				await members.create({ _id: member.id })
				console.log(`${member.id} successfully added to the database.`)
			} else await updateMember(member, existingInfo)
		}
	})
	await updateLeaderboard(client.guilds.cache.get(config.guildId))
	
	restartInterval()
	console.log('Auto update complete')
}

client.once('ready', async () => {
	client.guilds.cache.get(config.guildId).members.cache.map(async member => {
		if (!member.user.bot) {
			let existingInfo = await members.findById(member.id).exec()
			if (existingInfo == null) {
				await members.create({ _id: member.id })
				console.log(`${member.id} successfully added to the database.`)
			}
		}
	})
	
	regularUpdate()
})

export function restartInterval() {
	lastUpdated = Date.now()
	clearTimeout(currentInterval)
	currentInterval = setTimeout(regularUpdate, 14400000)
}

client.on('guildMemberAdd', async member => {
	if(member.user.bot) return

	const channel = await member.guild.channels.fetch(config.welcomeChannelID)
	const existingInfo = await members.findById(member.id).exec()
	if (existingInfo == null) {
		await members.create({ _id: member.id })
		console.log(`${member.id} successfully added to the database.`)
		await channel.send(`Welcome to Chess Sandwich <@${member.id}>. Hope you have a fun time here :)`)
	} else {
		await updateMember(member, existingInfo)
		await channel.send(`Welcome back <@${member.id}>. Long time no see :D`)
	}

	const memberRole = await client.guilds.cache.get(config.guildId).roles.fetch(config.memberRoleId)
	await member.roles.add(memberRole)
})

client.on('messageCreate', message => {
	if(message.content.substring(0, 5) == '.say ')
		message.channel.send(message.content.substring(5))
})

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return

	const command = client.commands.get(interaction.commandName)

	if (!command) 
		return interaction.followUp({content: "This command no longer exists"}) && client.commands.delete(interaction.commandName)
	try {
		await command.execute(interaction)
	} catch (error) {
		console.error(error)
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true })
	}
})

client.login(config.token)