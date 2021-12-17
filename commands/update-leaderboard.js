import { SlashCommandBuilder } from '@discordjs/builders'

import config from '../config.js'
import membersDB from '../models/Member.js'
import { restartInterval } from '../index.js'

export const data = new SlashCommandBuilder()
	.setName('update-leaderboard')
	.setDescription('Updates the leaderboard. Will run once everyday automatically.')
    .setDefaultPermission(false)
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
        {
            id: (client.guilds.cache.get(config.guildId).roles.cache.find(r => r.name == 'Moderator')).id.toString(),
            type: 'ROLE',
            permission: true,
        },
    ]
}
export async function execute(interaction) {
    await interaction.deferReply()
    updateLeaderboard()
    restartInterval()
    await interaction.editReply('Updated leaderboard with current data.')
}


export async function updateLeaderboard(guild = undefined) {
    let leaderboard = await membersDB.find({serverRating: {$ne: null}}).sort({serverRating: -1})
    for(let i=0; i<leaderboard.length; i++) {
        const member = leaderboard[i]
        if(guild != undefined) {
            try { 
                await guild.members.fetch(String(member._id))
            } catch(discordAPIError) {
                member.serverRank = null
                member.serverRating = null
                await member.save()
                continue
            }
        }
        if(member.serverRank != i + 1) {
            member.serverRank = i + 1
            await member.save()
        }
    }

    leaderboard = await membersDB.find({serverRating: null})
    for(let i=0; i<leaderboard.length; i++) {
        const member = leaderboard[i]
        if(member.serverRank != undefined) {
            member.serverRank = undefined
            await member.save()
        }
    }
}