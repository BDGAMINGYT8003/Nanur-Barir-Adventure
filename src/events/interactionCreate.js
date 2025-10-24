import { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createSession, getSession, advanceSession, getCurrentNode, endSession, updateUserInventory, getUserInventory } from '../utils/adventureManager.js';

function getNextAdventureNode(interaction, session) {
    const node = getCurrentNode(session.userId);

    if (!node) {
        // Adventure ends
        const embed = new EmbedBuilder()
            .setTitle('Adventure Ended!')
            .setDescription(`You have completed your adventure. Here is what you found:\n- ${session.inventory.join('\n- ')}`)
            .setColor('#ff0000');
        interaction.update({ embeds: [embed], components: [] });
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

    interaction.update({ embeds: [embed], components: [row] });
}

export default {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                }
            }
        } else if (interaction.isButton()) {
            if (interaction.customId === 'start_adventure') {
                const session = createSession(interaction.user.id);
                getNextAdventureNode(interaction, session);
            } else if (interaction.customId.startsWith('adventure_option_')) {
                const optionIndex = parseInt(interaction.customId.split('_').pop());
                const session = getSession(interaction.user.id);
                if (!session) {
                    interaction.reply({ content: "This adventure has ended.", ephemeral: true });
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
                    session.inventory.push(outcome.result);
                } else if (outcome.result === 'Lose your items') {
                    session.inventory = [];
                } else if (outcome.result.includes('Lifesaver') || outcome.result.includes('Energy Drink') || outcome.result.includes('Padlock')) {
                    session.inventory.push(outcome.result);
                } else if (outcome.result !== 'Nothing Happens' && outcome.result !== 'Adventure Ends' && !outcome.result.startsWith('Adventure Ends')) {
                    session.inventory.push(outcome.result);
                }

                updateUserInventory(session.userId, session.inventory);

                if (outcome.result.startsWith('Adventure Ends')) {
                    const embed = new EmbedBuilder()
                        .setTitle('Adventure Ended!')
                        .setDescription(outcome.text)
                        .setColor('#ff0000');
                    interaction.update({ embeds: [embed], components: [] });
                    endSession(session.userId);
                    return;
                }

                const embed = new EmbedBuilder()
                    .setTitle('An Adventure!')
                    .setDescription(`${node.scenario}\n\n**You chose: ${option.action}**\n${outcome.text}`)
                    .setColor('#0099ff');

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
                interaction.update({ embeds: [embed], components: [row] });
            } else if (interaction.customId === 'next_node') {
                const session = advanceSession(interaction.user.id);
                if (session) {
                    getNextAdventureNode(interaction, session);
                } else {
                    const inventory = getUserInventory(interaction.user.id);
                    const embed = new EmbedBuilder()
                        .setTitle('Adventure Ended!')
                        .setDescription(`You have completed your adventure. Here is what you found:\n- ${inventory.join('\n- ')}`)
                        .setColor('#ff0000');
                    interaction.update({ embeds: [embed], components: [] });
                }
            } else if (interaction.customId === 'view_inventory') {
                const session = getSession(interaction.user.id);
                if (!session) {
                    interaction.reply({ content: "This adventure has ended.", ephemeral: true });
                    return;
                }
                const inventory = session.inventory.length > 0 ? `- ${session.inventory.join('\n- ')}` : "You have no items.";
                interaction.reply({ content: `**Inventory:**\n${inventory}`, ephemeral: true });
            }
        }
    },
};
