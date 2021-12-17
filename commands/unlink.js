import { SlashCommandBuilder } from '@discordjs/builders'

import { updateMember } from './update.js'
import membersDB from '../models/Member.js'
import { getProfileEmbed, getRatings } from './profile.js'

export const data = new SlashCommandBuilder()
	.setName('unlink')
	.setDescription('use to unlink your profile')
	.addStringOption(option => option.setName('website')
		.setDescription('The website which you want to unlink.')
		.setRequired(false)
		.addChoice('lichess', 'lichess')
		.addChoice('chesscom', 'chesscom')
	)
export async function execute(interaction) {
    await interaction.deferReply()

	let existingInfo = await membersDB.findById(member.id).exec()
	if (existingInfo == null)
		await interaction.editReply({ content: 'Unexpected error occurred! Please try again later.'})

	const website = interaction.options.getString('website')
    if(website == null || website == 'lichess') {
        if(existingInfo.lichessId != undefined) existingInfo.prevLichess.push(existingInfo.lichessId)
        existingInfo.lichessId = undefined
    }
    if(website == null || website == 'chesscom') {
        if(existingInfo.chesscomId != undefined) existingInfo.prevChesscom.push(existingInfo.chesscomId)
        existingInfo.chesscomId = undefined
    }

    await updateMember(member, existingInfo)

	const ratings = await getRatings(existingInfo.lichessId, existingInfo.chesscomId)
	const embed = await getProfileEmbed('Profile(s) unlinked successfully.', interaction.member, existingInfo, ratings)
    await interaction.editReply({embeds: [ embed ]})
}