import { SlashCommandBuilder } from 'discord.js'
import axios from 'axios'
import { riotApiKey } from '../config'

export default {
    data: new SlashCommandBuilder()
        .setName('lastgame')
        .setDescription('Display stats for the last game of a given player')
        .addStringOption((option) =>
            option
                .setName('nickname')
                .setDescription('Summoner name for the last game')
                .setRequired(true),
        ),
    // fetch for the last game in next free requests
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: false })

            const summonerName = encodeURIComponent(
                interaction.options.getString('nickname'),
            )
            const region = 'EUN1'

            const summonerUrl = `https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${summonerName}`
            const summonerResponse = await axios.get(summonerUrl, {
                headers: {
                    'X-Riot-Token': riotApiKey,
                },
            })

            const summonerPuuid = summonerResponse.data.puuid

            const winrateRegion = 'europe'
            const count = 1

            const matchHistoryUrl = `https://${winrateRegion}.api.riotgames.com/lol/match/v5/matches/by-puuid/${summonerPuuid}/ids?start=0&count=${count}`
            const matchHistoryResponse = await axios.get(matchHistoryUrl, {
                headers: {
                    'X-Riot-Token': riotApiKey,
                },
            })

            if (matchHistoryResponse.status === 403) {
                throw new Error(
                    '403 Forbidden: Check your Riot API key and permissions.',
                )
            }

            const matchIds = matchHistoryResponse.data
            if (matchIds.length > 0) {
                const matchId = matchIds[0]
                console.log(matchId)
                const matchUrl = `https://${winrateRegion}.api.riotgames.com/lol/match/v5/matches/${matchId}`
                const matchResponse = await axios.get(matchUrl, {
                    headers: {
                        'X-Riot-Token': riotApiKey,
                    },
                })

                // Process match data and create a text response
                const textResponse = createTextResponse(
                    matchResponse.data,
                    summonerPuuid,
                    summonerName,
                )

                const allParticipants = getAllPlayers(
                    matchResponse.data,
                    summonerPuuid,
                )

                // Split players into two teams
                const blueTeamPlayers = allParticipants
                    .filter((player) => player.teamId === 100)
                    .map((player) => {
                        return `- **${player.summonerName}** Champion: **${player.championName}**`
                    })

                const redTeamPlayers = allParticipants
                    .filter((player) => player.teamId === 200)
                    .map((player) => {
                        return `- **${player.summonerName}** Champion: **${player.championName}**`
                    })

                // Final response combining textResponse and playersResponse
                const finalResponse = `${textResponse}\n\n**Blue Team:**\n${blueTeamPlayers.join(
                    '\n',
                )}\n\n**Red Team:**\n${redTeamPlayers.join('\n')}
                `

                await interaction.followUp(finalResponse)
            } else {
                console.error('No match IDs found.')
                await interaction.followUp('No match IDs found.')
            }
        } catch (error) {
            console.error('Error fetching data:', error.message)
            await interaction.followUp(
                'An error occurred while fetching the last game data.',
            )
        }
    },
}

function getAllPlayers(matchData, summonerPuuid) {
    const { participants } = matchData.info

    // Check if PUUID is in the participants array
    const summonerStats = participants.find(
        (participant) => participant.puuid === summonerPuuid,
    )

    if (!summonerStats) {
        return 'Summoner data not found in the match.'
    }

    // Extract information for all players
    const allPlayers = participants.map((participant) => {
        const { summonerName, championName, puuid, teamId } = participant
        const isSummoner = puuid === summonerPuuid

        return {
            summonerName,
            championName: championName || 'Unknown Champion',
            isSummoner,
            teamId,
        }
    })
    return allPlayers
}

function createTextResponse(matchData, summonerPuuid, summonerName) {
    const { gameDuration, gameType, participants } = matchData.info

    // Check if PUUID is in the participants array
    const summonerStats = participants.find(
        (participant) => participant.puuid === summonerPuuid,
    )

    if (!summonerStats) {
        return 'Summoner data not found in the match.'
    }

    const summonerKills = summonerStats.kills || 0
    const summonerDeaths = summonerStats.deaths || 0
    const summonerAssists = summonerStats.assists || 0

    const gameDurationMinutes = Math.floor(gameDuration / 60)
    const remainingSeconds = gameDuration % 60

    // Extract information from summonerStats
    const summonerChampion = summonerStats.championName || 'Unknown Champion'
    const championLevel = summonerStats.champLevel || 'Unknown Level'
    const formattedGameType =
        gameType === 'MATCHED_GAME' ? 'RANKED SOLO/DUO' : gameType

    const textResponse = `
**Last Game Stats**
- **Game Duration:** ${gameDurationMinutes} minutes and ${remainingSeconds} seconds
- **Game Type:** ${formattedGameType}

**${decodeURIComponent(
        summonerName,
    )}'s (KDA):** ${summonerKills}/${summonerDeaths}/${summonerAssists} - **${
        (summonerKills + summonerAssists) / summonerDeaths
    }**
- **Champion:** ${summonerChampion}
- **Champion Level:** ${championLevel}
    `

    return textResponse.trim()
}
