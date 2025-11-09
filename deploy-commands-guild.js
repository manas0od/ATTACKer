// deploy-commands-guild.js (registers commands to one guild instantly)
const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = require('./deploy-commands.json');
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("Registering slash commands to guild...");
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
    console.log("✅ Guild commands registered.");
  } catch (err) {
    console.error("Failed to register guild commands:", err);
    process.exit(1);
  }
})();
