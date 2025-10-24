import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('adventure')
        .setDescription('Starts a new adventure!'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('A New Adventure Begins!')
            .setDescription('You find yourself in a mysterious place, filled with untold dangers and treasures. Do you have what it takes to survive?')
            .setColor('#0099ff');

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('start_adventure')
                    .setLabel('Start Adventure')
                    .setStyle(ButtonStyle.Primary),
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    },
};
