// deploy-commands.js
const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [
  {
    name: "attack",
    description: "Stand system commands",
    options: [
      {
        name: "add",
        description: "Create a new stand",
        type: 1,
        options: [
          { name: "stand_name", type: 3, description: "Stand name", required: true }
        ]
      },
      {
        name: "place",
        description: "Place a stand in this channel",
        type: 1,
        options: [
          { name: "stand_name", type: 3, description: "Stand name", required: true }
        ]
      },
      {
        name: "adjust",
        description: "Adjust a stand's stock. Use +N or -N (e.g. +5 or -1)",
        type: 1,
        options: [
          { name: "amount", type: 3, description: "Amount like +5 or -1", required: true },
          { name: "stand_name", type: 3, description: "Stand name", required: true }
        ]
      },
      {
        name: "remove",
        description: "Delete a stand and remove all placements",
        type: 1,
        options: [
          { name: "stand_name", type: 3, description: "Stand name", required: true }
        ]
      }
    ]
  }
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("Registering slash commands...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log("✅ Slash commands registered globally.");
  } catch (err) {
    console.error("Failed to register slash commands:", err);
    process.exit(1);
  }
})();
