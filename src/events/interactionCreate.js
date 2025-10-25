import { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createSession, getSession, advanceSession, getCurrentNode, endSession } from '../utils/adventureManager.js';
import db from '../utils/database.js';
import logger from '../utils/logger.js';
import { items as itemData } from '../data/items.js';

async function getNextAdventureNode(interaction, session) {
    const node = getCurrentNode(session.userId);

    if (!node) {
        // Adventure ends
        const inventory = db.getUserInventory(session.userId);
        const inventoryList = inventory.map(i => `📦 ${i.item} (x${i.quantity})`).join('\n- ');
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
    if (node.options.length === 1 && node.options[0].action === 'Next') {
        // Non-interactive node
        const outcome = node.options[0].outcomes[0];
        if (outcome.result.startsWith('⏣')) {
            const amount = parseInt(outcome.result.split(' ')[1].replace(/,/g, ''));
            db.updateUserWallet(session.userId, amount);
        } else if (outcome.result !== 'Nothing Happens') {
            db.updateUserInventory(session.userId, outcome.result, 1);
        }

        if (outcome.result !== 'Nothing Happens') {
            embed.addFields({ name: 'You received', value: `📦 ${outcome.result}` });
        }

        row.addComponents(
            new ButtonBuilder()
                .setCustomId('next_node')
                .setLabel('Next →')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('view_inventory')
                .setLabel('🎒 Inventory')
                .setStyle(ButtonStyle.Secondary),
        );
    } else {
        // Interactive node
        node.options.forEach((option, index) => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`adventure_option_${index}`)
                    .setLabel(option.action)
                    .setStyle(ButtonStyle.Primary),
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

            if (!command) {
                logger.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                logger.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                }
            }
        } else if (interaction.isButton()) {
            await interaction.deferUpdate();
            if (interaction.customId === 'start_adventure') {
                const session = createSession(interaction.user.id);
                await getNextAdventureNode(interaction, session);
            } else if (interaction.customId.startsWith('adventure_option_')) {
                const optionIndex = parseInt(interaction.customId.split('_').pop());
                const session = getSession(interaction.user.id);
                if (!session) {
                    await interaction.editReply({ content: "This adventure has ended.", components: [] });
                    return;
                }
                const node = getCurrentNode(session.userId);
                const option = node.options[optionIndex];

                // Determine outcome
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

                // Update inventory
                if (outcome.result.startsWith('⏣')) {
                    const amount = parseInt(outcome.result.split(' ')[1].replace(/,/g, ''));
                    db.updateUserWallet(session.userId, amount);
                } else if (outcome.result === 'Lose your items') {
                    db.clearUserInventory(session.userId);
                } else if (outcome.result.includes('Lifesaver') || outcome.result.includes('Energy Drink') || outcome.result.includes('Padlock')) {
                    const item = outcome.result.split('x ').pop();
                    const quantity = parseInt(outcome.result.split('x ')[0]);
                    db.updateUserInventory(session.userId, item, quantity);
                } else if (outcome.result !== 'Nothing Happens' && outcome.result !== 'Adventure Ends' && !outcome.result.startsWith('Adventure Ends')) {
                    db.updateUserInventory(session.userId, outcome.result, 1);
                }

                if (outcome.result.startsWith('Adventure Ends')) {
                    const embed = new EmbedBuilder()
                        .setTitle('Adventure Ended!')
                        .setDescription(outcome.text || 'Your adventure has come to an abrupt end.')
                        .setColor('#ff0000');
                    await interaction.editReply({ embeds: [embed], components: [] });
                    endSession(session.userId);
                    return;
                }

                const embed = new EmbedBuilder()
                    .setTitle('An Adventure!')
                    .setDescription(`${node.scenario}\n\n**You chose: ${option.action}**\n${outcome.text || '...'}`)
                    .setColor('#0099ff');

                if (outcome.result !== 'Nothing Happens' && outcome.result !== 'Adventure Ends' && !outcome.result.startsWith('Adventure Ends') && outcome.result !== 'Lose your items') {
                    embed.addFields({ name: 'You received', value: `📦 ${outcome.result}` });
                }

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('next_node')
                            .setLabel('Next →')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId('view_inventory')
                            .setLabel('🎒 Inventory')
                            .setStyle(ButtonStyle.Secondary),
                    );
                await interaction.editReply({ embeds: [embed], components: [row] });
            } else if (interaction.customId === 'next_node') {
                const session = advanceSession(interaction.user.id);
                if (session) {
                    await getNextAdventureNode(interaction, session);
                } else {
                    const inventory = db.getUserInventory(interaction.user.id);
                    const inventoryList = inventory.map(i => `📦 ${i.item} (x${i.quantity})`).join('\n- ');
                    const embed = new EmbedBuilder()
                        .setTitle('Adventure Ended!')
                        .setDescription(`You have completed your adventure. Here is what you found:\n- ${inventoryList}`)
                        .setColor('#ff0000');
                    await interaction.editReply({ embeds: [embed], components: [] });
                }
            } else if (interaction.customId === 'view_inventory') {
                const session = getSession(interaction.user.id);
                if (!session) {
                    await interaction.followUp({ content: "This adventure has ended.", ephemeral: true });
                    return;
                }
                const inventory = db.getUserInventory(session.userId);
                const inventoryList = inventory.length > 0 ? `- ${inventory.map(i => `📦 ${i.item} (x${i.quantity})`).join('\n- ')}` : "You have no items.";
                await interaction.followUp({ content: `**Inventory:**\n${inventoryList}`, ephemeral: true });
            } else if (interaction.customId.startsWith('inventory_')) {
                const [action, userId, pageStr] = interaction.customId.split('_').slice(1);
                let page = parseInt(pageStr);

                if (interaction.user.id !== userId) {
                    await interaction.followUp({ content: "You cannot control another user's inventory.", ephemeral: true });
                    return;
                }

                if (action === 'next') {
                    page++;
                } else if (action === 'prev') {
                    page--;
                }

                const user = await interaction.client.users.fetch(userId);
                const inventory = db.getUserInventory(user.id);
                const itemsPerPage = 8;
                const totalPages = Math.ceil(inventory.length / itemsPerPage) || 1;

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

                await interaction.editReply({ embeds: [embed], components: [row] });
            }
        }
    },
};
