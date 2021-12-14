import { SlashCommandBuilder } from '@discordjs/builders'

import config from '../config.js'
import members from '../models/Member.js'
import { getRatings, getProfileEmbed } from './profile.js'

export const data = new SlashCommandBuilder()
	.setName('update')
	.setDescription('Updates your roles & rank on the server. This is done automatically once everyday.')
    
export async function execute(interaction) {
    await interaction.deferReply()
    const existingInfo = await members.findById(interaction.member.id).exec()
    if (existingInfo == null) {
		await interaction.editReply({ content: 'Unexpected error occurred! Please try again later.', ephemeral: true })
        return
    }

    if(!existingInfo.lichessId && !existingInfo.chesscomId) {
        await interaction.editReply("You dont have any account linked on this server. Use /link to link an account")
        return
    }

    const ratings = await getRatings(existingInfo.lichessId, existingInfo.chesscomId)
    existingInfo.serverRating = ratings[0]
    await existingInfo.save()

    await updateRatingRole(interaction.member, ratings)
    await interaction.editReply({embeds: [
        await getProfileEmbed('Profile updated successfully', interaction.member, existingInfo, ratings)
    ]})
}

export async function updateMember(member, existingInfo) {
    let ratings
    if(existingInfo.chesscomId || existingInfo.lichessId) {
        ratings = await getRatings(existingInfo.lichessId, existingInfo.chesscomId)
        existingInfo.serverRating = ratings[0]
    }

    await existingInfo.save()
    await updateRatingRole(member, ratings)
}

export async function updateRatingRole(member, ratings) {
    if(ratings == undefined) {
        if(member.roles.cache.has(config.unratedRole))
            await member.roles.remove(config.unratedRole)
        for(let i = 2; i<14; i++) {
            if(member.roles.cache.has(config.ratingRoles[i]))
                await member.roles.remove(config.ratingRoles[i])
        }
        return
    }

    let reqRatingRole
    if(ratings[0] == undefined) reqRatingRole = config.unratedRole
    else {
        const lowestRatingBar = config.ratingRoles[0]
        const ratingRangeSize = config.ratingRoles[1]
        reqRatingRole = config.ratingRoles[Math.max(0, Math.ceil((ratings[0]-lowestRatingBar +1)/ratingRangeSize)) + 2]
    }
    
    if(!member.roles.cache.has(reqRatingRole)) {
        if(member.roles.cache.has(config.unratedRole))
            await member.roles.remove(config.unratedRole)
        for(let i = 2; i<14; i++) {
            if(member.roles.cache.has(config.ratingRoles[i]))
                await member.roles.remove(config.ratingRoles[i])
        }
        await member.roles.add(reqRatingRole)
    }
}