import { SlashCommandBuilder } from 'discord.js'
import axios from 'axios'
import { riotApiKey } from '../config'

export default {
    data: new SlashCommandBuilder()
        .setName('player')
        .setDescription('Shows stats')
        .addStringOption((option) =>
            option
                .setName('nickname')
                .setDescription('The summoner name to search for')
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

            const summonerId = summonerResponse.data.id

            // Get stats for Solo/Duo
            const soloDuoStatsUrl = `https://${region}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}?queue=RANKED_SOLO_5x5`
            const soloDuoStatsResponse = await axios.get(soloDuoStatsUrl, {
                headers: {
                    'X-Riot-Token': riotApiKey,
                },
            })
            const soloDuoStatsData = soloDuoStatsResponse.data.find(
                (entry) => entry.queueType === 'RANKED_SOLO_5x5',
            )

            // Get stats for Flex
            const flexStatsUrl = `https://${region}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}?queue=RANKED_FLEX_SR`
            const flexStatsResponse = await axios.get(flexStatsUrl, {
                headers: {
                    'X-Riot-Token': riotApiKey,
                },
            })
            const flexStatsData = flexStatsResponse.data.find(
                (entry) => entry.queueType === 'RANKED_FLEX_SR',
            )

            const profileUrl = `https://${region}.api.riotgames.com/lol/summoner/v4/summoners/${summonerId}`
            const profileResponse = await axios.get(profileUrl, {
                headers: {
                    'X-Riot-Token': riotApiKey,
                },
            })
            const profileData = profileResponse.data

            const soloDuoStatsMessage = soloDuoStatsData
                ? `**Solo/Duo Queue Stats:** ${soloDuoStatsData.tier} ${soloDuoStatsData.rank}, ${soloDuoStatsData.wins} wins, ${soloDuoStatsData.losses} losses`
                : '**Solo/Duo Queue Stats:** No ranked stats found'

            const flexStatsMessage = flexStatsData
                ? `**Flex Queue Stats:** ${flexStatsData.tier} ${flexStatsData.rank}, ${flexStatsData.wins} wins, ${flexStatsData.losses} losses`
                : '**Flex Queue Stats:** No ranked stats found'

            const messageContent = `

           - **Summoner Name:** ${decodeURIComponent(summonerName)}
- ${soloDuoStatsMessage}
- ${flexStatsMessage}
- **Account Level:** ${profileData.summonerLevel}
            `
            await interaction.followUp(messageContent)
        } catch (error) {
            console.error('Error fetching data:', error.message)
            await interaction.followUp('No player found.')
        }
    },
}
