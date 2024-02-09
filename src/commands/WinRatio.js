import { SlashCommandBuilder } from 'discord.js'
import axios from 'axios'
import { riotApiKey } from '../config'

export default {
    data: new SlashCommandBuilder()
        .setName('winrate')
        .setDescription('Calculate win rate over the last 20 games')
        .addStringOption((option) =>
            option
                .setName('nickname')
                .setDescription('Winratio of given player')
                .setRequired(true),
        ),

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
            const count = 20

            const matchHistoryUrl = `https://${winrateRegion}.api.riotgames.com/lol/match/v5/matches/by-puuid/${summonerPuuid}/ids?start=0&count=${count}`
            const matchHistoryResponse = await axios.get(matchHistoryUrl, {
                headers: {
                    'X-Riot-Token': riotApiKey,
                },
            })

            const matchIds = matchHistoryResponse.data
            if (matchIds.length > 0) {
                let wins = 0
                for (const matchId of matchIds) {
                    const matchUrl = `https://${winrateRegion}.api.riotgames.com/lol/match/v5/matches/${matchId}`
                    const matchResponse = await axios.get(matchUrl, {
                        headers: {
                            'X-Riot-Token': riotApiKey,
                        },
                    })

                    const participant =
                        matchResponse.data.info.participants.find(
                            (p) => p.puuid === summonerPuuid,
                        )

                    if (participant.win) {
                        wins++
                    }
                }

                const winRate = (wins / matchIds.length) * 100

                await interaction.editReply(
                    `- **${decodeURIComponent(summonerName)}'s last ${
                        matchIds.length
                    } games:** ${winRate.toFixed(2)}% WR`,
                )
            } else {
                console.error('No match IDs found.')
                await interaction.editReply('No matches found.')
            }
        } catch (error) {
            console.error('Error fetching data:', error.message)
            await interaction.followUp(
                'An error occurred while looking up winratio.',
            )
        }
    },
}
