import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';

const funFacts = [
    "The house was built on an ancient burial ground. Classic.",
    "The locals say the original owner of the house just vanished one day.",
    "The well in the backyard is rumored to be bottomless.",
    "The jungle is said to be home to a creature that walks without a head.",
    "The clocks in the house are all stopped at 3:13 AM, the 'devil's hour'.",
];

export default {
    data: new SlashCommandBuilder()
        .setName('adventure')
        .setDescription('Starts a new adventure!'),
    async execute(interaction) {
        const image = new AttachmentBuilder('assets/spooky.png');
        const embed = new EmbedBuilder()
            .setTitle('Choose an Adventure')
            .setDescription(
                '**The Haunting of Nanur Bari**\n' +
                'Depart with Moin, Oli, and Fakhruddin into a world filled with rural frights and family secrets!\n\n' +
                '**Possible Rewards**\n' +
                '<:GhostlyLantern:12345> <:HauntedRing:12345> <:AncientCoin:12345> <:Lifesaver:12345> <:CandyCorn:12345> <:Coin:1105833876032606350>'
            )
            .setImage('attachment://spooky.png')
            .setFooter({ text: `Fun Fact: ${funFacts[Math.floor(Math.random() * funFacts.length)]}` });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('start_adventure')
                    .setLabel('Start Adventure')
                    .setStyle(ButtonStyle.Primary),
            );

        await interaction.reply({ embeds: [embed], components: [row], files: [image] });
    },
};
