# How to Set Up the Bot in Replit

To run this Discord bot in Replit, you need to configure two secret environment variables. Follow these steps:

1.  **Open the Secrets Pane:**
    *   In your Replit workspace, look for the "Tools" section in the left-hand sidebar.
    *   Click on the "Secrets" icon (it looks like a key).

2.  **Add the Bot Token:**
    *   In the "Secrets" pane, click the "Add new secret" button.
    *   For the **key**, enter `DISCORD_BOT_TOKEN`.
    *   For the **value**, paste your Discord bot's token.
    *   Click "Add new secret".

3.  **Add the Client ID:**
    *   Click "Add new secret" again.
    *   For the **key**, enter `CLIENT_ID`.
    *   For the **value**, paste your Discord bot's client ID.
    *   Click "Add new secret".

Once you have added these two secrets, you can run the bot by clicking the "Run" button at the top of the Replit workspace. The bot will automatically use these secrets to log in to Discord and register its slash commands.
