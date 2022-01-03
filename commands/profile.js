import fetch from 'node-fetch'
import { MessageEmbed } from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'

import membersDB from '../models/Member.js'
import { getApproxRank } from './leaderboard.js'

export const data = new SlashCommandBuilder()
	.setName('profile')
	.setDescription('Displays your server chess profile.')
    .addMentionableOption(option => option.setName('mention')
        .setDescription('Ping someone to check their profile instead.')
        .setRequired(false)
    )
export async function execute(interaction) {
    await interaction.deferReply()
    let mention = interaction.options.getMentionable('mention')
    if(mention == null) mention = interaction.member
    
    const existingInfo = await membersDB.findById(mention.id).exec()
    if (existingInfo == null) {
        await interaction.editReply({ content: 'Unexpected error occurred! Please try again later.', ephemeral: true })
        return
    }

    const ratings = await getRatings(existingInfo.lichessId, existingInfo.chesscomId)
	await interaction.editReply({embeds: [
        await getProfileEmbed('Profile lookup successful', mention, existingInfo, ratings)
    ]})
}

/** 
 * Takes a user's lichessId & chesscomId to return his bullet, blitz and rapid rating & ultimately overall server rating:
 * Format: Array[ServerRating, lichess bullet, lichess blitz, lichess rapid, chesscom bullet, chesscom blitz, chesscom rapid]
 * --> If user does not have a rating for any time control that will contain as '??' in the array.
 * --> If rd > 75 there will be 1 '?' appended to the rating while if rd > 110 there will be 2 ? appended to the rating.
 * --> If rd > 110 that rating will not contribute in the calculation for overall server rating.
 * --> If error was encountered while fetching data this returns undefined.
*/
export async function getRatings(lichessId, chesscomId) {
    if(!lichessId && !chesscomId) return []

    let ratings = undefined
    let serverRating = 0
    if(lichessId != undefined) {
        let userData = await fetch(`https://lichess.org/api/user/${lichessId}`)
        if(userData.ok) {
            try {
                let lichessData = await userData.json()
                if(ratings == undefined) ratings = Array(7).fill('??')
                if(lichessData.hasOwnProperty('perfs')) {
                    const timeControls = ['bullet', 'blitz', 'rapid']
                    for(let timeControl of timeControls) {
                        if(lichessData['perfs'].hasOwnProperty(timeControl)) {
                            ratings[timeControls.indexOf(timeControl)+1] = lichessData['perfs'][timeControl]['rating']
                            if(lichessData['perfs'][timeControl]['rd'] >= 75) {
                                ratings[timeControls.indexOf(timeControl)+1] = ratings[timeControls.indexOf(timeControl)+1] + '?'
                                if(lichessData['perfs'][timeControl]['rd'] >= 110)
                                    ratings[timeControls.indexOf(timeControl)+1] = ratings[timeControls.indexOf(timeControl)+1] + '?'
                            }
                        }
                    }
        
                    for(let timeControl of ['blitz', 'rapid'])
                        if(lichessData['perfs'].hasOwnProperty(timeControl) && lichessData['perfs'][timeControl]['games'] >= 20 &&
                        lichessData['perfs'][timeControl]['rd'] < 110 && lichessData['perfs'][timeControl]['rating'] > serverRating)
                            serverRating = lichessData['perfs'][timeControl]['rating']
                }
            } catch (e) {
                console.log("Lichess JSON conversion error occurred on id: " + lichessId + "/n" + e)
            }
        } else console.log(userData.status + "error occurred while fetching lichess userdata for id: " + lichessId)   
    }
    if(chesscomId != undefined) {
        let userData = await fetch(`https://api.chess.com/pub/player/${chesscomId}/stats`)
        
        // Chess com api sucks thus we need to make sure we have the proper response.
        let i = 0
        while(!userData.ok && ++i < 100)
            userData = await fetch(`https://api.chess.com/pub/player/${chesscomId}/stats`)
        if(i < 100) {
            try {
                let chesscomData = await userData.json()
                if(ratings == undefined) ratings = Array(7).fill('??')
                const timeControls = ['chess_bullet', 'chess_blitz', 'chess_rapid']
                for(let timeControl of timeControls) {
                    if(chesscomData.hasOwnProperty(timeControl)) {
                        ratings[timeControls.indexOf(timeControl)+4] = chesscomData[timeControl]['last']['rating']
                        if(chesscomData[timeControl]['last']['rd'] >= 75) {
                            ratings[timeControls.indexOf(timeControl)+4] = ratings[timeControls.indexOf(timeControl)+4] + '?'
                            if(chesscomData[timeControl]['last']['rd'] >= 110) 
                                ratings[timeControls.indexOf(timeControl)+4] = ratings[timeControls.indexOf(timeControl)+4] + '?'
                        }
                    }
                }
        
                for(let timeControl of ['chess_blitz', 'chess_rapid']) {
                    if(!(chesscomData.hasOwnProperty(timeControl) && chesscomData[timeControl].hasOwnProperty('record') &&
                    chesscomData[timeControl].hasOwnProperty('last'))) continue
        
                    const record = chesscomData[timeControl]['record']
                    if(chesscomData.hasOwnProperty(timeControl) && (record['win'] + record['draw'] + record['loss']) >= 20 &&
                    chesscomData[timeControl]['last']['rd'] < 110 && (0.75 * (chesscomData[timeControl]['last']['rating']) + 650) > serverRating)
                        serverRating = 0.75 * (chesscomData[timeControl]['last']['rating']) + 650
                }
            } catch (e) {
                console.log("Chesscom JSON conversion error occurred on id" + chesscomId + "/n" + e)
            }
        } else console.log(userData.status + "error occurred while fetching chess com userdata for id: " + chesscomId)
    }

    if (ratings != undefined) {
        if(serverRating == 0) serverRating = undefined
        ratings[0] = serverRating
    }
    return ratings
} 

export async function getProfileEmbed(header, member, existingInfo, ratings) {
    const embed = new MessageEmbed()
    if(ratings == undefined) {
        embed.setAuthor("Error")    
        embed.setDescription("Could not fetch ratings due to bad response from lichess/chesscom servers!")
        return embed
    }
    embed.setThumbnail(member.user.displayAvatarURL())

    if(existingInfo.lichessId == undefined && existingInfo.chesscomId == undefined) {
        embed.setAuthor("No account found!")    
        embed.setDescription("User has not linked any account on this server. Use /link to link an account.")
        return embed
    }

    embed.setAuthor(header)

    let title = `${member.user.tag} \nRating: ${ratings[0] == undefined? '??' : ratings[0]}`
    if(ratings[0] != undefined && existingInfo.serverRank == undefined) existingInfo.serverRank = await getApproxRank(existingInfo)
    if(existingInfo.serverRank != undefined) title = title + `\n  Rank: #${existingInfo.serverRank}`
    embed.setTitle(title)

    if(existingInfo.lichessId != undefined) {
        embed.addField('Lichess.org:horse:', `https://lichess.org/@/${existingInfo.lichessId} :white_check_mark:`)
        embed.addField('Bullet:boom:', `${ratings[1]}`, true)
        embed.addField('Blitz:zap:', `${ratings[2]}`, true)
        embed.addField('Rapid:stopwatch:', `${ratings[3]}`, true)
    }

    if(existingInfo.chesscomId != undefined) {
        embed.addField('Chess.com:chess_pawn:', `https://chess.com/member/${existingInfo.chesscomId} :white_check_mark:`)
        embed.addField('Bullet:boom:', `${ratings[4]}`, true)
        embed.addField('Blitz:zap:', `${ratings[5]}`, true)
        embed.addField('Rapid:stopwatch:', `${ratings[6]}`, true)
    }

    embed.setFooter(`For a rating at a time control to be eligible, both conditions must be true:
        - The rating must be non-provisional. (On Lichess, there must not be a ? after your rating.)
        - At least 20 rated games must have been completed at that time control.
    Main rating is calculated as the highest of blitz and rapid ratings across lichess.org and chess.com
    A linear formula is used to calculate a comparable Lichess rating from a Chess.com rating: Chess.com rating × 0.75 + 650 = Lichess.org rating equivalent.`)

    return embed
}