import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import db from '../../utils/database.js';

const footerTexts = [
    "You're broke, aren't you?",
    "Don't spend it all in one place!",
    "I'm sure you're doing great.",
    "The rich get richer, and you just get... well, you.",
    "That's a lot of money! Or is it?",
];

export default {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription("Checks a user's balance.")
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check the balance of.')
                .setRequired(false)),
    async execute(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;
        const userData = db.getUser(user.id);
        const netWorth = userData.wallet + userData.bank;

        const embed = new EmbedBuilder()
            .setTitle(`${user.username}'s Balance`)
            .setThumbnail(user.displayAvatarURL())
            .setDescription(
                `<:Coins:1431696484088156190> **Wallet:** ${userData.wallet.toLocaleString()}\n` +
                `🏦 **Bank:** ${userData.bank.toLocaleString()} / ${userData.bank_capacity.toLocaleString()}\n` +
                `💰 **Net Worth:** ${netWorth.toLocaleString()}`
            )
            .setColor(5793266)
            .setTimestamp()
            .setFooter({ text: footerTexts[Math.floor(Math.random() * footerTexts.length)] });

        await interaction.reply({ embeds: [embed] });
    },
};
