import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, AttachmentBuilder } from 'discord.js';

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
                'Select an adventure from the dropdown menu below. Each adventure has unique stories, items, and risks!\n\n' +
                '**Adventures Available:**\n' +
                '- The Haunting of Nanur Bari\n' +
                '- The Mystery of Meghaloy Bungalow\n\n' +
                '**Possible Rewards**\n' +
                '<:GhostlyLantern:1431694741313032284> <:HauntedRing:1431695057874063614> <:AncientCoin:1431695460808265780> <:Lifesaver:1431695902602432613> <:RareItem:1431696481080840212> <:Coins:1431696484088156190>'
            )
            .setImage('attachment://spooky.png')
            .setFooter({ text: `Fun Fact: ${funFacts[Math.floor(Math.random() * funFacts.length)]}` });

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('select_adventure')
                    .setPlaceholder('Select an adventure...')
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
                    ]),
            );

        await interaction.reply({ embeds: [embed], components: [row], files: [image] });
    },
};
