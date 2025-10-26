import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } from 'discord.js';
import db from '../../utils/database.js';

const adventureDetails = {
    'spooky_adventure': {
        name: 'The Haunting of Nanur Bari',
        description: 'Depart with Moin, Oli, and Fakhruddin into a world filled with rural frights and family secrets!',
        rewards: '<:GhostlyLantern:1431694741313032284> <:HauntedRing:1431695057874063614> <:AncientCoin:1431695460808265780> <:Lifesaver:1431695902602432613> <:RareItem:1431696481080840212> <:Coins:1431696484088156190>',
        funFact: 'The real Nanur Bari is said to be haunted by a headless ghost. Spooky!',
        thumbnail: 'attachment://spooky.png'
    },
    'bandarban_adventure': {
        name: 'The Mystery of Meghaloy Bungalow',
        description: 'Join Nasir bhai and Ahsanul Mama on a thrilling investigation into a smuggling ring in the hills of Bandarban!',
        rewards: '<:EncodedDiary:123456789012345678> <:ChakmaScarf:123456789012345678> <:AncientTreasureBox:123456789012345678> <:SatellitePhone:123456789012345678> <:RareItem:1431696481080840212> <:Coins:1431696484088156190>',
        funFact: 'Bandarban is home to the highest peaks in Bangladesh, covered in dense, mysterious forests.',
        thumbnail: 'attachment://bandarban.png'
    }
};

function createAdventureEmbed(adventureId) {
    const details = adventureDetails[adventureId];
    const image = new AttachmentBuilder(`./assets/${adventureId === 'spooky_adventure' ? 'spooky.png' : 'bandarban.png'}`, { name: details.thumbnail.split('//')[1] });

    const embed = new EmbedBuilder()
        .setTitle('Choose an Adventure')
        .setDescription(
            `**${details.name}**\n${details.description}\n\n` +
            '**Possible Rewards**\n' +
            `${details.rewards}`
        )
        .setImage(details.thumbnail)
        .setFooter({ text: `Fun Fact: ${details.funFact}` });

    return { embed, image };
}

export default {
    data: new SlashCommandBuilder()
        .setName('adventure')
        .setDescription('Starts a new adventure!'),
    async execute(interaction) {
        const userData = db.getUser(interaction.user.id);
        const lastAdventure = userData.last_adventure || 'spooky_adventure';

        const { embed, image } = createAdventureEmbed(lastAdventure);

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
            ]);

        const startButton = new ButtonBuilder()
            .setCustomId(`start_adventure_button_${lastAdventure}`)
            .setLabel('Start Adventure')
            .setStyle(ButtonStyle.Primary);

        const row1 = new ActionRowBuilder().addComponents(selectMenu);
        const row2 = new ActionRowBuilder().addComponents(startButton);

        await interaction.reply({ embeds: [embed], components: [row1, row2], files: [image] });
    },
};

export { createAdventureEmbed };
