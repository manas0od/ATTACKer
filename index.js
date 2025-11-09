// index.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client, GatewayIntentBits, Partials, EmbedBuilder, PermissionsBitField } = require('discord.js');

const DATA_FILE = path.join(__dirname, 'stands.json');

// Keep-alive server
const app = express();
app.get('/', (req, res) => res.send('Attack Bot is running'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Keep-alive server listening on ${PORT}`));

// Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel]
});

// Persistence helpers
function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    console.error('Failed to load stands.json:', e);
    return {};
  }
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to save stands.json:', e);
  }
}

if (!fs.existsSync(DATA_FILE)) saveData({});

function makeStandEmbed(standName, stock) {
  return new EmbedBuilder()
    .setTitle(`🛒 ${standName} STOCK`)
    .setDescription(`**${standName} stock is,**\n**currently : ${stock}**\n\n*P. S : stocks can change per marketing.*`)
    .setColor(0x00ff9d)
    .setFooter({ text: 'Stand System' })
    .setTimestamp();
}

function isAllowed(member) {
  if (!member) return false;
  return member.permissions.has(PermissionsBitField.Flags.ManageGuild);
}

client.on('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.commandName;
  if (command !== 'attack') return;

  if (!isAllowed(interaction.member)) {
    return interaction.reply({ content: '⛔ You don\'t have permission to run this command.', ephemeral: true });
  }

  const sub = interaction.options.getSubcommand();
  const data = loadData();

  if (sub === 'add') {
    const standNameRaw = interaction.options.getString('stand_name');
    const key = standNameRaw.toLowerCase();

    if (data[key]) {
      return interaction.reply({ content: `⚠️ Stand "${standNameRaw}" already exists.`, ephemeral: true });
    }

    data[key] = {
      name: standNameRaw,
      stock: 0,
      placements: []
    };
    saveData(data);
    return interaction.reply({ content: `✅ Stand "${standNameRaw}" created with stock = 0.`, ephemeral: true });
  }

  if (sub === 'place') {
    const standNameRaw = interaction.options.getString('stand_name');
    const key = standNameRaw.toLowerCase();

    if (!data[key]) {
      return interaction.reply({ content: `❌ Stand "${standNameRaw}" does not exist. Create it with /attack add.`, ephemeral: true });
    }

    const stand = data[key];
    const embed = makeStandEmbed(stand.name, stand.stock);

    try {
      const sent = await interaction.channel.send({ embeds: [embed] });
      stand.placements.push({
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        messageId: sent.id
      });
      saveData(data);
      return interaction.reply({ content: `📌 Placed "${stand.name}" in this channel.`, ephemeral: true });
    } catch (err) {
      console.error('Failed to place stand:', err);
      return interaction.reply({ content: `❌ Failed to place stand (missing permission to send/embed messages).`, ephemeral: true });
    }
  }

  if (sub === 'adjust') {
    const amountStr = interaction.options.getString('amount');
    const standNameRaw = interaction.options.getString('stand_name');
    const key = standNameRaw.toLowerCase();

    if (!data[key]) {
      return interaction.reply({ content: `❌ Stand "${standNameRaw}" not found.`, ephemeral: true });
    }

    let sign = 1;
    let s = amountStr.trim();
    if (s.startsWith('+')) s = s.slice(1);
    else if (s.startsWith('-')) { sign = -1; s = s.slice(1); }

    if (!/^\d+$/.test(s)) {
      return interaction.reply({ content: '❌ Invalid amount. Use +N or -N (e.g. +5 or -1).', ephemeral: true });
    }

    const delta = sign * parseInt(s, 10);
    const stand = data[key];
    stand.stock = Number(stand.stock || 0) + delta;
    if (stand.stock < 0) stand.stock = 0;
    saveData(data);

    const newPlacements = [];
    let updated = 0, removed = 0;
    for (const p of stand.placements) {
      try {
        const guild = client.guilds.cache.get(p.guildId) || await client.guilds.fetch(p.guildId).catch(()=>null);
        if (!guild) { removed++; continue; }
        const channel = guild.channels.cache.get(p.channelId) || await guild.channels.fetch(p.channelId).catch(()=>null);
        if (!channel || !channel.isTextBased()) { removed++; continue; }
        const msg = await channel.messages.fetch(p.messageId).catch(()=>null);
        if (!msg) { removed++; continue; }
        await msg.edit({ embeds: [makeStandEmbed(stand.name, stand.stock)] }).catch(()=>null);
        updated++;
        newPlacements.push(p);
      } catch (err) {
        console.warn('Error updating placement:', err);
        newPlacements.push(p);
      }
    }
    stand.placements = newPlacements;
    saveData(data);

    return interaction.reply({ content: `✅ "${stand.name}" stock adjusted by ${delta}. Now: ${stand.stock}. Updated ${updated} placement(s). Removed ${removed} stale placement(s).`, ephemeral: true });
  }

  if (sub === 'remove') {
    const standNameRaw = interaction.options.getString('stand_name');
    const key = standNameRaw.toLowerCase();
    if (!data[key]) return interaction.reply({ content: `❌ Stand "${standNameRaw}" not found.`, ephemeral: true });

    const stand = data[key];
    let deleted = 0, failed = 0;
    for (const p of stand.placements) {
      try {
        const guild = client.guilds.cache.get(p.guildId) || await client.guilds.fetch(p.guildId).catch(()=>null);
        if (!guild) { failed++; continue; }
        const channel = guild.channels.cache.get(p.channelId) || await guild.channels.fetch(p.channelId).catch(()=>null);
        if (!channel || !channel.isTextBased()) { failed++; continue; }
        const msg = await channel.messages.fetch(p.messageId).catch(()=>null);
        if (!msg) { continue; }
        await msg.delete().catch(()=>{ failed++; });
        deleted++;
      } catch (err) {
        console.warn('Failed to delete placement:', err);
        failed++;
      }
    }

    delete data[key];
    saveData(data);

    return interaction.reply({ content: `✅ Stand "${standNameRaw}" removed. Deleted ${deleted} message(s). Failed to delete ${failed}.`, ephemeral: true });
  }

  return interaction.reply({ content: '⚠️ Unknown subcommand.', ephemeral: true });
});

client.login(process.env.TOKEN);
