import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import db from '../../utils/database.js';

export default {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('Checks your current inventory.'),
    async execute(interaction) {
        const inventory = db.getUserInventory(interaction.user.id);
        const inventoryList = inventory.length > 0 ? `- ${inventory.map(i => `📦 ${i.item} (x${i.quantity})`).join('\n- ')}` : "You have no items.";
        const embed = new EmbedBuilder()
            .setTitle('Your Inventory')
            .setDescription(inventoryList)
            .setColor('#0099ff');
        await interaction.reply({ embeds: [embed] });
    },
};
