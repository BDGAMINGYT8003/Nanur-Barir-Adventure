import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import db from '../../utils/database.js';
import { items as itemData } from '../../data/items.js';

export default {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription("Checks a user's inventory.")
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check the inventory of.')
                .setRequired(false)),
    async execute(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;
        const inventory = db.getUserInventory(user.id);
        const itemsPerPage = 8;
        const totalPages = Math.ceil(inventory.length / itemsPerPage) || 1;
        let page = 0;

        const generateEmbed = (page) => {
            const start = page * itemsPerPage;
            const end = start + itemsPerPage;
            const currentItems = inventory.slice(start, end);

            const description = currentItems.map(item => {
                const emoji = itemData[item.item] || '📦';
                return `**${emoji} ${item.item}** ─ ${item.quantity}`;
            }).join('\n');

            return new EmbedBuilder()
                .setTitle(`${user.username}'s Inventory`)
                .setThumbnail(user.displayAvatarURL())
                .setDescription(description || 'This user has no items.')
                .setColor(5793266)
                .setTimestamp()
                .setFooter({ text: `Page ${page + 1} of ${totalPages}` });
        };

        const generateButtons = (page) => {
            return new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`inventory_prev_${user.id}_${page}`)
                        .setEmoji('⬅️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId(`inventory_next_${user.id}_${page}`)
                        .setEmoji('➡️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page >= totalPages - 1),
                );
        };

        const embed = generateEmbed(page);
        const row = generateButtons(page);

        await interaction.reply({ embeds: [embed], components: [row] });
    },
};
