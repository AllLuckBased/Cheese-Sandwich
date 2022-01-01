import { MessageEmbed } from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'

import membersDB from '../models/Member.js'
import { getLastUpdated } from '../index.js'

export const data = new SlashCommandBuilder()
	.setName('leaderboard')
	.setDescription('Displays the server chess leaderboard.')
    .addIntegerOption(option => option.setName('page')
        .setDescription('Which page of the leaderboard. 1 page = 10 members.')
        .setRequired(false)
    )
export async function execute(interaction) {
    await interaction.deferReply()
    let page = interaction.options.getInteger('page')
    if(page == null) page = 1
    
    const embed = new MessageEmbed()
    embed.setTitle(`Leaderboard:\nPage - ${page}`)
    if(page < 1) {
        embed.setDescription("Error: page ∉ ℕ")
        await interaction.editReply({embeds: [embed]})
        return
    }

    const leaderboard = await membersDB.find({serverRank: {$ne: null}})
        .sort('serverRank')
        .skip(10*(page-1))
        .limit(10)
    if(leaderboard.length == 0) embed.setDescription(`Page ${page} is not present!`)
    else {
        for(let i=0; i<leaderboard.length; i++) {
            const member = await interaction.guild.members.fetch(String(leaderboard[i]._id))
            embed.addField(`#${10*(page-1) + (i+1)}`, `${member.displayName} - ${leaderboard[i].serverRating}`, false)
        }
    }
    if(getLastUpdated() != null) {
        let timeValue = Math.round((Date.now() - getLastUpdated())/1000)
        if(timeValue >= 60) {
            timeValue = Math.round(timeValue/60)
            if(timeValue > 60) {
                timeValue = Math.round(timeValue/60)
                embed.setFooter(`Last Updated: ${timeValue} hour(s) ago`)
            } else embed.setFooter(`Last Updated: ${timeValue} minute(s) ago`)
        } else embed.setFooter(`Last Updated: ${timeValue} second(s) ago`)
    } else embed.setFooter(`Last Updated: ???`)
    await interaction.editReply({embeds: [embed]})
}

export async function getApproxRank(existingInfo) {
    if(existingInfo.serverRating == undefined) return -1
    const leaderboard = await membersDB.find({}).sort({serverRating: -1})
    for(var i = 0; i<leaderboard.length; i++) 
        if(leaderboard[i].serverRating <= existingInfo.serverRating) 
            return i + 1
    return i + 1
}