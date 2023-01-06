import fetch from 'node-fetch'
import { EmbedBuilder } from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'

import config from '../config.js'
import membersDB from '../models/Member.js'
import { updateMember } from './update.js'
import { getProfileEmbed } from './profile.js'

export const data = new SlashCommandBuilder()
	.setName('link')
	.setDescription('Use to link your profile')
	.addStringOption(option => option.setName('website')
		.setDescription('The website where you have the chess account.')
		.setRequired(true)
		.addChoices(
            {name: 'lichess', value: 'lichess'},
		    {name: 'chesscom', value: 'chesscom'}
    ))
	.addStringOption(option => option.setName('username')
		.setDescription('Your username on that particular website.')
		.setRequired(true)
	)
export async function execute(interaction) {
	await interaction.deferReply()
	const existingInfo = await membersDB.findById(interaction.member.id).exec()
	if (existingInfo == null) {
		await interaction.editReply('Unexpected error occurred! Please try again later.')
		return
	}

	const website = interaction.options.getString('website')
	const username = interaction.options.getString('username')

	if ((website == 'lichess' && existingInfo.lichessId == username) || existingInfo.chesscomId == username) {
		await interaction.editReply('Account is already linked!')
		return
	}

	if (website == 'lichess')
		lichess(interaction, existingInfo, username)
	else
		chesscom(interaction, existingInfo, username)
}

export async function lichess(interaction, existingInfo, username) {
	const getVerifyOwnershipEmbed = function() {
		const embed = new EmbedBuilder()
		embed.setTitle('Additional verification steps required.')
		embed.setDescription(`In your lichess profile, please paste your Discord tag ${interaction.user.tag} \
		into the Location field temporarily to verify you have ownership of the account and re-run the command.\
		After linking your account, you can revert your Location back to any value.`)
		embed.addFields({ name: 'You can set your chess.com Location here:', value: 'https://lichess.org/account/profile' })
		embed.setImage('https://i.imgur.com/YwoptCk.png')
		return embed
	}

	if(!existingInfo.prevLichess.includes(username)) {
		let userData = await fetch(`https://lichess.org/api/user/${username}`)
		if(userData.status != 200) {
			await interaction.editReply(`Could not locate lichess user ${username}.`)
			return
		}

		userData = await userData.json()

		let location = ''
		if(userData.hasOwnProperty('profile') && userData['profile'].hasOwnProperty('location'))
			location = userData['profile']['location']

		if(location != interaction.user.tag) {
			await interaction.editReply({embeds: [getVerifyOwnershipEmbed()]})
			return
		}

		if(existingInfo.lichessId != undefined && existingInfo.prevLichess.indexOf(username) > -1) 
			existingInfo.prevLichess.push(existingInfo.lichessId)
	}
	
	existingInfo.lichessId = username

	const ratings = await updateMember(interaction.member, existingInfo)
	
	await interaction.editReply({embeds: [
		await getProfileEmbed('Lichess profile linked successfully', interaction.member, existingInfo, ratings)
	]})
}

export async function chesscom(interaction, existingInfo, username) {
	const getVerifyOwnershipEmbed = function() {
		const embed = new EmbedBuilder()
		embed.setTitle('Additional verification steps required.')
		embed.setDescription(`In your chess.com profile, please paste your Discord tag ${interaction.user.tag} \
		into the Location field temporarily to verify you have ownership of the account and re-run the command.\
		After linking your account, you can revert your Location back to any value.`)
		embed.addFields({ name: 'You can set your chess.com Location here:', value: 'https://www.chess.com/settings' })
		embed.setImage('https://i.imgur.com/IoAWrk4.png')
		return embed
	}

	if(!existingInfo.prevChesscom.includes(username)) {
		let userData = await fetch(`https://api.chess.com/pub/player/${username}`)
		if(userData.status != 200) {
			await interaction.editReply(`Could not locate chesscom user ${username}.`)
			return
		}

		userData = await userData.json()

		let location = ''
		if(userData.hasOwnProperty('location'))
			location = userData['location']
		
		if(location != interaction.user.tag) {
			await interaction.editReply({embeds: [getVerifyOwnershipEmbed()]})
			return
		}

		if(existingInfo.chesscomId != undefined && existingInfo.prevChesscom.indexOf(username) > -1) existingInfo.prevChesscom.push(existingInfo.chesscomId)
	}

	existingInfo.chesscomId = username
	
	const ratings = await updateMember(interaction.member, existingInfo)
	
	await interaction.editReply({embeds: [
		await getProfileEmbed('Chess.com profile linked successfully!', interaction.member, existingInfo, ratings)
	]})
}