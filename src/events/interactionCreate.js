import { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createSession, getSession, advanceSession, getCurrentNode, endSession } from '../utils/adventureManager.js';
import db from '../utils/database.js';
import logger from '../utils/logger.js';
import { items as itemData } from '../data/items.js';

async function handleAdventureNode(interaction, session) {
    const node = getCurrentNode(session.userId);

    if (!node) {
        // This is where the adventure ends successfully
        let finalDescription = 'You have completed your adventure. All rewards have been saved to your inventory!\n\n**You received:**\n';
        if (session.inventory.length === 0 && session.rewards.coins === 0) {
            finalDescription = 'You have completed your adventure, but you did not find anything.';
        } else {
            if (session.rewards.coins > 0) {
                db.updateUserWallet(session.userId, session.rewards.coins);
                finalDescription += `- ⏣ ${session.rewards.coins.toLocaleString()}\n`;
            }
            for (const item of session.inventory) {
                db.updateUserInventory(session.userId, item.item, item.quantity);
                finalDescription += `- ${item.quantity} ${itemData[item.item] || '📦'} ${item.item}\n`;
            }
        }

        const embed = new EmbedBuilder().setTitle('Adventure Ended!').setDescription(finalDescription).setColor('#ff0000');
        await interaction.editReply({ embeds: [embed], components: [] });
        endSession(session.userId);
        return;
    }

    let description = node.scenario;
    if (node.type === 'NON_INTERACTIVE') {
        description += `\n\n- ${node.options[0].outcomes[0].flavor}`;
    }

    const embed = new EmbedBuilder().setTitle('An Adventure!').setDescription(description).setColor('#0099ff');
    const row = new ActionRowBuilder();

    if (node.type === 'NON_INTERACTIVE') {
        row.addComponents(
            new ButtonBuilder().setCustomId('next_node').setLabel('Next →').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('view_backpack').setLabel('🎒 Backpack').setStyle(ButtonStyle.Secondary)
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

                let description = `${node.scenario}\n\n**You chose: \`${option.action}\`**\n${outcome.flavor}`;

                switch (outcome.type) {
                    case 'REWARD':
                        if (outcome.item) {
                            session.inventory.push({ item: outcome.item, quantity: outcome.quantity });
                            description += `\n\n- ${outcome.quantity} ${itemData[outcome.item] || '📦'} ${outcome.item}`;
                        } else if (outcome.amount) {
                            session.rewards.coins += outcome.amount;
                            description += `\n\n- ⏣ ${outcome.amount.toLocaleString()}`;
                        }
                        break;
                    case 'ITEM_LOSS':
                        const itemIndex = session.inventory.findIndex(i => i.item === outcome.item);
                        if (itemIndex > -1) {
                            session.inventory.splice(itemIndex, 1);
                            description += `\n\n- You lost your ${itemData[outcome.item] || '📦'} ${outcome.item}`;
                        } else {
                            description += `\n\n- Despite the intrigue, your situation remains unaffected.`;
                        }
                        break;
                    case 'ITEM_LOSS_ALL':
                        session.inventory = [];
                        description += `\n\n- You lost all items in your backpack.`;
                        break;
                    case 'NOTHING':
                        description += `\n\n- Despite the intrigue, your situation remains unaffected.`;
                        break;
                    case 'DESTROYED':
                        session.inventory = [];
                        session.rewards.coins = 0;
                        description += `\n\n- You lost all items in your backpack, all your rewards, and your adventure has ended.`;
                        endSession(session.userId);
                        break;
                    case 'ADVENTURE_ENDS':
                        description += `\n\n- Your adventure has ended.`;
                        endSession(session.userId);
                        break;
                }

                const embed = new EmbedBuilder().setTitle('An Adventure!').setDescription(description).setColor('#0099ff');
                const components = [];

                if (outcome.type !== 'DESTROYED' && outcome.type !== 'ADVENTURE_ENDS') {
                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('next_node').setLabel('Next →').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId('view_backpack').setLabel('🎒 Backpack').setStyle(ButtonStyle.Secondary)
                    );
                    components.push(row);
                }

                await interaction.editReply({ embeds: [embed], components });
            } else if (interaction.customId === 'next_node') {
                if (!session) return await interaction.editReply({ content: "This adventure has ended.", components: [] });
                advanceSession(interaction.user.id);
                await handleAdventureNode(interaction, session);
            } else if (interaction.customId === 'view_backpack') {
                if (!session) return await interaction.followUp({ content: "This adventure has ended.", ephemeral: true });
                const backpackList = session.inventory.length > 0 ? session.inventory.map(i => `${itemData[i.item] || '📦'} ${i.item} (x${i.quantity})`).join('\n') : "You have no items in your backpack.";
                await interaction.followUp({ content: `**Backpack:**\n${backpackList}`, ephemeral: true });
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
