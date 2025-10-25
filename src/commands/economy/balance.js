import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import db from '../../utils/database.js';

export default {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Checks your current balance.'),
    async execute(interaction) {
        const user = db.getUser(interaction.user.id);
        const embed = new EmbedBuilder()
            .setTitle('Your Balance')
            .setDescription(`You have ⏣ ${user.balance.toLocaleString()}.`)
            .setColor('#0099ff');
        await interaction.reply({ embeds: [embed] });
    },
};
