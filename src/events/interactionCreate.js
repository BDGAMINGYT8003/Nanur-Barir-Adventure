import { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createSession, getSession, advanceSession, getCurrentNode, endSession } from '../utils/adventureManager.js';
import db from '../utils/database.js';
import logger from '../utils/logger.js';
import { items as itemData } from '../data/items.js';

async function handleAdventureNode(interaction, session) {
    const node = getCurrentNode(session.userId);

    if (!node) {
        const inventory = db.getUserInventory(session.userId);
        const inventoryList = inventory.map(i => `${itemData[i.item] || '📦'} ${i.item} (x${i.quantity})`).join('\n- ');
        const embed = new EmbedBuilder()
            .setTitle('Adventure Ended!')
            .setDescription(`You have completed your adventure. Here is what you found:\n- ${inventoryList}`)
            .setColor('#ff0000');
        await interaction.editReply({ embeds: [embed], components: [] });
        endSession(session.userId);
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle('An Adventure!')
        .setDescription(node.scenario)
        .setColor('#0099ff');

    const row = new ActionRowBuilder();
    if (node.type === 'NON_INTERACTIVE') {
        embed.setDescription(`${node.scenario}\n- ${node.options[0].outcomes[0].flavor}`);
        row.addComponents(
            new ButtonBuilder().setCustomId('next_node').setLabel('Next →').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('view_inventory').setLabel('🎒 Inventory').setStyle(ButtonStyle.Secondary)
        );
    } else {
        node.options.forEach((option, index) => {
            row.addComponents(
                new ButtonBuilder().setCustomId(`adventure_option_${index}`).setLabel(option.action).setStyle(ButtonStyle.Primary)
            );
        });
    }

    await interaction.editReply({ embeds: [embed], components: [row] });
}

export default {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return logger.error(`No command matching ${interaction.commandName} was found.`);
            try {
                await command.execute(interaction);
            } catch (error) {
                logger.error(error);
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        } else if (interaction.isButton()) {
            await interaction.deferUpdate();
            const session = getSession(interaction.user.id);

            if (interaction.customId === 'start_adventure') {
                const newSession = createSession(interaction.user.id);
                await handleAdventureNode(interaction, newSession);
            } else if (interaction.customId.startsWith('adventure_option_')) {
                if (!session) return await interaction.editReply({ content: "This adventure has ended.", components: [] });

                const optionIndex = parseInt(interaction.customId.split('_').pop());
                const node = getCurrentNode(session.userId);
                const option = node.options[optionIndex];

                const random = Math.random() * 100;
                let cumulativeChance = 0;
                let outcome;
                for (const o of option.outcomes) {
                    cumulativeChance += o.chance;
                    if (random < cumulativeChance) {
                        outcome = o;
                        break;
                    }
                }

                let description = `${node.scenario}\n\n**You chose: \`${option.action}\`**\n${outcome.flavor}\n\n`;

                switch (outcome.type) {
                    case 'REWARD':
                        if (outcome.item) {
                            db.updateUserInventory(session.userId, outcome.item, outcome.quantity);
                            description += `- ${outcome.quantity} ${itemData[outcome.item] || '📦'} ${outcome.item}`;
                        } else if (outcome.amount) {
                            db.updateUserWallet(session.userId, outcome.amount);
                            description += `- ⏣ ${outcome.amount.toLocaleString()}`;
                        }
                        break;
                    case 'ITEM_LOSS':
                        db.removeUserItem(session.userId, outcome.item, outcome.quantity);
                        description += `- You lost your ${itemData[outcome.item] || '📦'} ${outcome.item}`;
                        break;
                    case 'ITEM_LOSS_ALL':
                        db.clearUserInventory(session.userId);
                        description += `- You lost all items in your backpack.`;
                        break;
                    case 'NOTHING':
                        description += `- Despite the intrigue, your situation remains unaffected.`;
                        break;
                    case 'DESTROYED':
                        db.clearUserInventory(session.userId);
                        description += `- You lost all items in your backpack, all your rewards, and your adventure has ended.`;
                        endSession(session.userId);
                        break;
                    case 'ADVENTURE_ENDS':
                        description += `- Your adventure has ended.`;
                        endSession(session.userId);
                        break;
                }

                const embed = new EmbedBuilder().setTitle('An Adventure!').setDescription(description).setColor('#0099ff');
                const row = new ActionRowBuilder();

                if (outcome.type !== 'DESTROYED' && outcome.type !== 'ADVENTURE_ENDS') {
                    row.addComponents(
                        new ButtonBuilder().setCustomId('next_node').setLabel('Next →').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId('view_inventory').setLabel('🎒 Inventory').setStyle(ButtonStyle.Secondary)
                    );
                }

                await interaction.editReply({ embeds: [embed], components: [row] });
            } else if (interaction.customId === 'next_node') {
                if (!session) return await interaction.editReply({ content: "This adventure has ended.", components: [] });
                advanceSession(interaction.user.id);
                await handleAdventureNode(interaction, session);
            } else if (interaction.customId === 'view_inventory') {
                if (!session) return await interaction.followUp({ content: "This adventure has ended.", ephemeral: true });
                const inventory = db.getUserInventory(session.userId);
                const inventoryList = inventory.length > 0 ? inventory.map(i => `${itemData[i.item] || '📦'} ${i.item} (x${i.quantity})`).join('\n') : "You have no items.";
                await interaction.followUp({ content: `**Inventory:**\n${inventoryList}`, ephemeral: true });
            } else if (interaction.customId.startsWith('inventory_')) {
                const [action, userId, pageStr] = interaction.customId.split('_').slice(1);
                let page = parseInt(pageStr);

                if (interaction.user.id !== userId) return await interaction.followUp({ content: "You cannot control another user's inventory.", ephemeral: true });

                if (action === 'next') page++;
                else if (action === 'prev') page--;

                const user = await interaction.client.users.fetch(userId);
                const inventory = db.getUserInventory(user.id);
                const itemsPerPage = 8;
                const totalPages = Math.ceil(inventory.length / itemsPerPage) || 1;
                const currentItems = inventory.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
                const description = currentItems.map(item => `**${itemData[item.item] || '📦'} ${item.item}** ─ ${item.quantity}`).join('\n');

                const embed = new EmbedBuilder()
                    .setTitle(`${user.username}'s Inventory`)
                    .setThumbnail(user.displayAvatarURL())
                    .setDescription(description || 'This user has no items.')
                    .setColor(5793266)
                    .setTimestamp()
                    .setFooter({ text: `Page ${page + 1} of ${totalPages}` });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`inventory_prev_${user.id}_${page}`).setEmoji('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
                    new ButtonBuilder().setCustomId(`inventory_next_${user.id}_${page}`).setEmoji('➡️').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1)
                );

                await interaction.editReply({ embeds: [embed], components: [row] });
            }
        }
    }
};
