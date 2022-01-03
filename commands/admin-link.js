import fetch from 'node-fetch'
import { SlashCommandBuilder } from '@discordjs/builders'

import config from '../config.js'
import membersDB from '../models/Member.js'
import { getProfileEmbed } from './profile.js'
import { updateMember } from './update.js'

export const data = new SlashCommandBuilder()
	.setName('admin-link')
	.setDescription('Links account without location checks.')
    .setDefaultPermission(false)
	.addStringOption(option => option.setName('website')
		.setDescription('The website of the chess account.')
		.setRequired(true)
		.addChoice('lichess', 'lichess')
		.addChoice('chesscom', 'chesscom')
	)
	.addStringOption(option => option.setName('username')
		.setDescription('Your username on that particular website.')
		.setRequired(true)
	)
    .addMentionableOption(option => option.setName('mention')
        .setDescription('The user whose account is being linked.')
        .setRequired(true)
    )
export const getPerms = client => {
    return [
        {
            id: client.guilds.cache.get(config.guildId).ownerId,
            type: 'USER',
            permission: true,
        },
        {
            id: (client.guilds.cache.get(config.guildId).roles.cache.find(r => r.name == 'Admin')).id.toString(),
            type: 'ROLE',
            permission: true,
        },
    ]
}
export async function execute(interaction) {
    await interaction.deferReply()
    const website = interaction.options.getString('website')
    const username = interaction.options.getString('username')
    const mention = interaction.options.getMentionable('mention')

    const existingInfo = await membersDB.findById(mention.user.id).exec()
    if (existingInfo == null) {
        await interaction.editReply({ content: 'Unexpected error occurred! Please try again later.'})
        return
    }

    if ((website == 'lichess' && existingInfo.lichessId == username) || existingInfo.chesscomId == username) {
        await interaction.editReply({ content: 'Account is already linked!'})
        return
    }

    if (website == 'lichess') {
        let userData = await fetch(`https://lichess.org/api/user/${username}`)
        if(userData.status != 200) {
            await interaction.editReply({content: `Could not locate lichess user ${username}.`})
            return
        }

        userData = await userData.json()
        if(existingInfo.lichessId != undefined && existingInfo.prevLichess.indexOf(lichessId) > -1) 
            existingInfo.prevLichess.push(existingInfo.lichessId)
        existingInfo.lichessId = username
        
        const ratings = await updateMember(mention, existingInfo)

        await interaction.editReply({embeds: [
            await getProfileEmbed('Lichess profile linked successfully', mention, existingInfo, ratings)
        ]})
    } else {
        let userData = await fetch(`https://api.chess.com/pub/player/${username}`)
        if(userData.status != 200) {
            await interaction.editReply({content: `Could not locate chesscom user ${username}.`})
            return
        }

        userData = await userData.json()

        if(existingInfo.chesscomId != undefined && existingInfo.prevChesscom.indexOf(chesscomId) > -1) 
            existingInfo.prevChesscom.push(existingInfo.chesscomId)
        existingInfo.chesscomId = username
        
        const ratings = await updateMember(mention, existingInfo)

        await interaction.editReply({embeds: [
            await getProfileEmbed('Chess.com profile linked successfully!', mention, existingInfo, ratings)
        ]})
    }
}