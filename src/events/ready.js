import { Events, REST, Routes } from 'discord.js';
import logger from '../utils/logger.js';

export default {
    name: Events.ClientReady,
    once: true,
    async execute(client, commands) {
        logger.success(`Ready! Logged in as ${client.user.tag}`);
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

        try {
            logger.info(`Started refreshing ${commands.length} application (/) commands.`);
            const data = await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: commands },
            );
            logger.success(`Successfully reloaded ${data.length} application (/) commands.`);
        } catch (error) {
            logger.error(error);
        }
    },
};
