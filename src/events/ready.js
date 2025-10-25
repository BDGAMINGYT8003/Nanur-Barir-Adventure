import { Events } from 'discord.js';
import logger from '../utils/logger.js';

export default {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		logger.success(`Ready! Logged in as ${client.user.tag}`);
	},
};
