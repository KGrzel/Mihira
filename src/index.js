import { Client, Events, GatewayIntentBits, REST, Routes } from 'discord.js'

import { TOKEN, CLIENT_ID, GUILD_ID } from './config.js'
import playerStats from './commands/PlayerStats.js'
import winRate from './commands/WinRatio.js'
import lastGame from './commands/LastGame.js'

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
})

client.on(Events.InteractionCreate, (interaction) => {
    if (!interaction.isChatInputCommand()) return
    const command = interaction.commandName.toLowerCase()

    if (command === 'player') {
        playerStats.execute(interaction)
    } else if (command === 'winrate') {
        winRate.execute(interaction)
    } else if (command === 'lastgame') {
        lastGame.execute(interaction)
    }
})

const discordCommands = []

const rest = new REST({ version: '10' }).setToken(TOKEN)

discordCommands.push(playerStats.data.toJSON())
discordCommands.push(winRate.data.toJSON())
discordCommands.push(lastGame.data.toJSON())

try {
    await rest
        .put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
            body: discordCommands,
        })
        .then((res) => {
            console.log(`Succesfully reloaded ${res.length} (/) commands`)
        })
} catch (error) {
    console.error(error)
}

client.login(TOKEN)
