import { SlashCommandBuilder } from '@discordjs/builders'

import membersDB from '../models/Member.js'

export let currentInterval, lastUpdated
export function restartInterval() {
	lastUpdated = Date.now()
	clearTimeout(currentInterval)
    import(`../index.js`).then(data => setTimeout(data.regularUpdate, 14400000))
}

export const data = new SlashCommandBuilder()
	.setName('update-leaderboard')
	.setDescription('Updates the leaderboard. Will run once everyday automatically.')
    .setDefaultMemberPermissions(0)

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