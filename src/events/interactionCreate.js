import { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } from 'discord.js';
import { createSession, getSession, advanceSession, getCurrentNode, endSession } from '../utils/adventureManager.js';
import db from '../utils/database.js';
import logger from '../utils/logger.js';
import { items as itemData } from '../data/items.js';
import { createAdventureEmbed } from '../commands/adventure/adventure.js';

const adventureNames = {
    'spooky_adventure': 'The Haunting of Nanur Bari',
    'bandarban_adventure': 'The Mystery of Meghaloy Bungalow',
    'himalayan_adventure': 'The Himalayan Heist',
};

async function showAdventureSummary(interaction, session) {
    const { image } = createAdventureEmbed(session.adventure);
    let backpack = '';
    if (session.rewards.coins > 0) {
        db.updateUserWallet(session.userId, session.rewards.coins);
        backpack += `- <:Coins:1431696484088156190> ${session.rewards.coins.toLocaleString()}\n`;
    }
    if (session.inventory.length > 0) {
        for (const item of session.inventory) {
            db.updateUserInventory(session.userId, item.item, item.quantity);
            backpack += `- ${item.quantity} ${itemData[item.item] || '📦'} ${item.item}\n`;
        }
    }
    if (backpack === '') {
        backpack = 'Nothing!';
    }

    let lostItems = 'Nothing!';
    if (session.lostItems.length > 0) {
        lostItems = `- ${session.lostItems.map(i => `${i.quantity} ${itemData[i.item] || '📦'} ${i.item}`).join('\n- ')}`;
    }

    const embed = new EmbedBuilder()
        .setTitle('Adventure Complete!')
        .setDescription(
            `**Name:**\n${adventureNames[session.adventure]}\n\n` +
            `**Interactions**\n${session.progress + 1}\n\n` +
            `**Backpack**\n${backpack}\n\n` +
            `**Lost Items**\n${lostItems}`
        )
        .setImage(image.attachment.name)
        .setFooter({ text: 'Better luck next time!' });

    await interaction.editReply({ embeds: [embed], components: [], files: [image] });
    endSession(session.userId);
}

async function handleAdventureNode(interaction, session) {
    if (session.ended) {
        await showAdventureSummary(interaction, session);
        return;
    }

    const node = getCurrentNode(session.userId);

    if (!node) {
        await showAdventureSummary(interaction, session);
        return;
    }

    let description = node.scenario;
    if (node.type === 'NON_INTERACTIVE') {
        description = `> ${description.replace(/\n/g, '\n> ')}\n\n- ${node.options[0].outcomes[0].flavor}`;
    }

    const embed = new EmbedBuilder().setTitle(adventureNames[session.adventure]).setDescription(description).setColor('#0099ff');
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

    await interaction.editReply({ embeds: [embed], components: [row], files: [] });
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
        } else if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'select_adventure_menu') {
                await interaction.deferUpdate();
                const adventureId = interaction.values[0];
                const { embed, image } = createAdventureEmbed(adventureId);

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_adventure_menu')
                    .setPlaceholder('Select an adventure to view details...')
                    .addOptions([
                        {
                            label: 'The Haunting of Nanur Bari',
                            description: 'A spooky adventure in a haunted ancestral home.',
                            value: 'spooky_adventure',
                        },
                        {
                            label: 'The Mystery of Meghaloy Bungalow',
                            description: 'A thrilling mystery in the hills of Bandarban.',
                            value: 'bandarban_adventure',
                        },
                        {
                            label: 'The Himalayan Heist',
                            description: 'A high-altitude smuggling mystery.',
                            value: 'himalayan_adventure',
                        },
                    ]);

                const startButton = new ButtonBuilder()
                    .setCustomId(`start_adventure_button_${adventureId}`)
                    .setLabel('Start Adventure')
                    .setStyle(ButtonStyle.Primary);

                const row1 = new ActionRowBuilder().addComponents(selectMenu);
                const row2 = new ActionRowBuilder().addComponents(startButton);

                await interaction.editReply({ embeds: [embed], components: [row1, row2], files: [image] });
            }
        } else if (interaction.isButton()) {
            await interaction.deferUpdate();
            const session = getSession(interaction.user.id);

            if (interaction.customId.startsWith('start_adventure_button_')) {
                const adventureId = interaction.customId.split('_').slice(3).join('_');
                db.updateUserLastAdventure(interaction.user.id, adventureId);
                const newSession = createSession(interaction.user.id, adventureId);
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

                let description = `> ${node.scenario.replace(/\n/g, '\n> ')}\n\n**You chose: \`${option.action}\`**\n${outcome.flavor}`;

                switch (outcome.type) {
                    case 'REWARD':
                        if (outcome.item) {
                            session.inventory.push({ item: outcome.item, quantity: outcome.quantity });
                            description += `\n\n- ${outcome.quantity} ${itemData[outcome.item] || '📦'} ${outcome.item}`;
                        } else if (outcome.amount) {
                            session.rewards.coins += outcome.amount;
                            description += `\n\n- <:Coins:1431696484088156190> ${outcome.amount.toLocaleString()}`;
                        }
                        break;
                    case 'ITEM_LOSS_ONE':
                        if (session.inventory.length > 0) {
                            const randomIndex = Math.floor(Math.random() * session.inventory.length);
                            const lostItem = session.inventory.splice(randomIndex, 1)[0];
                            session.lostItems.push(lostItem);
                            description += `\n\n- You lost your ${itemData[lostItem.item] || '📦'} ${lostItem.item}`;
                        } else {
                            description += `\n\n- Despite the intrigue, your situation remains unaffected.`;
                        }
                        break;
                    case 'ITEM_LOSS_ALL':
                        if (session.inventory.length > 0) {
                            session.lostItems.push(...session.inventory);
                            session.inventory = [];
                            description += `\n\n- You lost all items in your backpack.`;
                        } else {
                            description += `\n\n- Despite the intrigue, your situation remains unaffected.`;
                        }
                        break;
                    case 'NOTHING':
                        description += `\n\n- Despite the intrigue, your situation remains unaffected.`;
                        break;
                    case 'DESTROYED':
                        if (session.inventory.length > 0 || session.rewards.coins > 0) {
                            session.lostItems.push(...session.inventory);
                            session.inventory = [];
                            session.rewards.coins = 0;
                            description += `\n\n- You lost all items in your backpack, all your rewards, and your adventure has ended.`;
                        } else {
                            description += `\n\n- Your adventure has ended.`;
                        }
                        session.ended = true;
                        break;
                    case 'ADVENTURE_ENDS':
                        description += `\n\n- Your adventure has ended.`;
                        session.ended = true;
                        break;
                }

                const embed = new EmbedBuilder().setTitle(adventureNames[session.adventure]).setDescription(description).setColor('#0099ff');
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('next_node').setLabel('Next →').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('view_backpack').setLabel('🎒 Backpack').setStyle(ButtonStyle.Secondary)
                );

                await interaction.editReply({ embeds: [embed], components: [row], files: [] });
            } else if (interaction.customId === 'next_node') {
                if (!session) return await interaction.editReply({ content: "This adventure has ended.", components: [] });
                if (session.ended) {
                    await showAdventureSummary(interaction, session);
                    return;
                }
                advanceSession(interaction.user.id);
                await handleAdventureNode(interaction, session);
            } else if (interaction.customId === 'view_backpack') {
                if (!session) return await interaction.followUp({ content: "This adventure has ended.", ephemeral: true });
                const backpackList = session.inventory.length > 0 ? session.inventory.map(i => `**${itemData[i.item] || '📦'} ${i.item}** ─ ${i.quantity}`).join('\n') : "You have no items in your backpack.";
                const embed = new EmbedBuilder()
                    .setTitle(`${interaction.user.username}'s Backpack`)
                    .setThumbnail(interaction.user.displayAvatarURL())
                    .setDescription(backpackList)
                    .setColor(5793266)
                    .setTimestamp()
                    .setFooter({ text: "Items collected in this adventure." });
                await interaction.followUp({ embeds: [embed], ephemeral: true });
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
