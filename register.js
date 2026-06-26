/**
 * register.js — RedLineCAD Slash Command Registration
 * Run once to register all CAD slash commands with Discord:
 *   node register.js
 * Requires env vars: DISCORD_TOKEN, DISCORD_APP_ID, DISCORD_GUILD_ID (optional)
 */
require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

const commands = [
  // ── /civilian ─────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName('civilian').setDescription('Civilian record commands')
    .addSubcommand(s => s.setName('lookup').setDescription('Look up a civilian record').addStringOption(o => o.setName('name').setDescription('Civilian name').setRequired(true)))
    .addSubcommand(s => s.setName('profile').setDescription('Full civilian profile').addStringOption(o => o.setName('name').setDescription('Civilian name').setRequired(true)))
    .addSubcommand(s => s.setName('priors').setDescription('View prior arrests').addStringOption(o => o.setName('name').setDescription('Civilian name').setRequired(true)))
    .addSubcommand(s => s.setName('vehicles').setDescription('View registered vehicles').addStringOption(o => o.setName('name').setDescription('Civilian name').setRequired(true)))
    .addSubcommand(s => s.setName('medical').setDescription('View medical history').addStringOption(o => o.setName('name').setDescription('Civilian name').setRequired(true)))
    .addSubcommand(s => s.setName('warrants').setDescription('View active warrants').addStringOption(o => o.setName('name').setDescription('Civilian name').setRequired(true)))
    .addSubcommand(s => s.setName('flags').setDescription('View civilian flags').addStringOption(o => o.setName('name').setDescription('Civilian name').setRequired(true))),

  // ── /plate ────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName('plate').setDescription('Vehicle plate lookup / management')
    .addSubcommand(s => s.setName('lookup').setDescription('Run a plate').addStringOption(o => o.setName('plate').setDescription('License plate').setRequired(true)))
    .addSubcommand(s => s.setName('stolen').setDescription('Flag vehicle as stolen').addStringOption(o => o.setName('plate').setDescription('License plate').setRequired(true)))
    .addSubcommand(s => s.setName('recover').setDescription('Mark vehicle as recovered').addStringOption(o => o.setName('plate').setDescription('License plate').setRequired(true)))
    .addSubcommand(s => s.setName('impound').setDescription('Impound a vehicle').addStringOption(o => o.setName('plate').setDescription('License plate').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason')))
    .addSubcommand(s => s.setName('watchlist').setDescription('Add vehicle to watchlist').addStringOption(o => o.setName('plate').setDescription('License plate').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason'))),

  // ── /warrant ──────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName('warrant').setDescription('Warrant management')
    .addSubcommand(s => s.setName('issue').setDescription('Issue a warrant').addStringOption(o => o.setName('name').setDescription('Subject name').setRequired(true)).addStringOption(o => o.setName('charges').setDescription('Charges').setRequired(true)))
    .addSubcommand(s => s.setName('approve').setDescription('Approve a warrant').addStringOption(o => o.setName('id').setDescription('Warrant ID').setRequired(true)))
    .addSubcommand(s => s.setName('clear').setDescription('Clear warrants for a person').addStringOption(o => o.setName('name').setDescription('Civilian name').setRequired(true)))
    .addSubcommand(s => s.setName('deactivate').setDescription('Deactivate a warrant').addStringOption(o => o.setName('id').setDescription('Warrant ID').setRequired(true)))
    .addSubcommand(s => s.setName('list').setDescription('List active warrants')),

  // ── /arrest ───────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName('arrest').setDescription('Arrest management')
    .addSubcommand(s => s.setName('log').setDescription('Log an arrest').addStringOption(o => o.setName('name').setDescription('Suspect name').setRequired(true)).addStringOption(o => o.setName('charges').setDescription('Charges')).addStringOption(o => o.setName('location').setDescription('Location')))
    .addSubcommand(s => s.setName('search').setDescription('Search arrest history').addStringOption(o => o.setName('name').setDescription('Name to search').setRequired(true)))
    .addSubcommand(s => s.setName('booking').setDescription('View booking details').addStringOption(o => o.setName('name').setDescription('Suspect name').setRequired(true))),

  // ── /bolo ─────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName('bolo').setDescription('BOLO alert management')
    .addSubcommand(s => s.setName('issue').setDescription('Issue a BOLO').addStringOption(o => o.setName('subject').setDescription('Subject name or plate').setRequired(true)).addStringOption(o => o.setName('description').setDescription('Description')))
    .addSubcommand(s => s.setName('cancel').setDescription('Cancel a BOLO').addStringOption(o => o.setName('id').setDescription('BOLO ID').setRequired(true)))
    .addSubcommand(s => s.setName('list').setDescription('List active BOLOs')),

  // ── /dispatch ─────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName('dispatch').setDescription('Dispatch call management')
    .addSubcommand(s => s.setName('create').setDescription('Create a dispatch call').addStringOption(o => o.setName('title').setDescription('Call title').setRequired(true)).addStringOption(o => o.setName('location').setDescription('Location').setRequired(true)).addStringOption(o => o.setName('priority').setDescription('Priority').addChoices({name:'High',value:'High'},{name:'Medium',value:'Medium'},{name:'Low',value:'Low'})))
    .addSubcommand(s => s.setName('close').setDescription('Close a call').addStringOption(o => o.setName('id').setDescription('Call ID').setRequired(true)).addStringOption(o => o.setName('disposition').setDescription('Disposition')))
    .addSubcommand(s => s.setName('assign').setDescription('Assign unit to call').addStringOption(o => o.setName('id').setDescription('Call ID').setRequired(true)).addStringOption(o => o.setName('callsign').setDescription('Unit callsign').setRequired(true)))
    .addSubcommand(s => s.setName('list').setDescription('View active calls')),

  // ── /unit ─────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName('unit').setDescription('Unit management')
    .addSubcommand(s => s.setName('onduty').setDescription('Go on duty').addStringOption(o => o.setName('callsign').setDescription('Your callsign').setRequired(true)).addStringOption(o => o.setName('department').setDescription('Department')))
    .addSubcommand(s => s.setName('offduty').setDescription('Go off duty').addStringOption(o => o.setName('callsign').setDescription('Your callsign').setRequired(true)))
    .addSubcommand(s => s.setName('status').setDescription('Update unit status').addStringOption(o => o.setName('callsign').setDescription('Callsign').setRequired(true)).addStringOption(o => o.setName('status').setDescription('Status').setRequired(true).addChoices({name:'10-8 Available',value:'10-8'},{name:'10-7 Off Duty',value:'10-7'},{name:'Busy',value:'Busy'},{name:'On Scene',value:'On Scene'},{name:'En Route',value:'En Route'})))
    .addSubcommand(s => s.setName('panic').setDescription('Trigger panic alarm'))
    .addSubcommand(s => s.setName('list').setDescription('View all active units')),

  // ── /fine ─────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName('fine').setDescription('Fine management')
    .addSubcommand(s => s.setName('issue').setDescription('Issue a fine').addStringOption(o => o.setName('player').setDescription('Player name').setRequired(true)).addNumberOption(o => o.setName('amount').setDescription('Amount').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true)))
    .addSubcommand(s => s.setName('pay').setDescription('Mark fine as paid').addStringOption(o => o.setName('player').setDescription('Player name').setRequired(true)).addNumberOption(o => o.setName('amount').setDescription('Amount paid').setRequired(true)))
    .addSubcommand(s => s.setName('waive').setDescription('Waive a fine').addStringOption(o => o.setName('player').setDescription('Player name').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason')))
    .addSubcommand(s => s.setName('balance').setDescription('Check balance').addStringOption(o => o.setName('player').setDescription('Player name').setRequired(true))),

  // ── /ems ──────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName('ems').setDescription('EMS commands')
    .addSubcommand(s => s.setName('pcr').setDescription('Patient care report').addStringOption(o => o.setName('patient').setDescription('Patient name').setRequired(true)).addStringOption(o => o.setName('condition').setDescription('Condition')))
    .addSubcommand(s => s.setName('vitals').setDescription('Log patient vitals').addStringOption(o => o.setName('patient').setDescription('Patient name').setRequired(true)))
    .addSubcommand(s => s.setName('hospital').setDescription('Hospital board'))
    .addSubcommand(s => s.setName('mci').setDescription('Declare MCI').addStringOption(o => o.setName('location').setDescription('Location').setRequired(true)))
    .addSubcommand(s => s.setName('cardiac').setDescription('Cardiac arrest call').addStringOption(o => o.setName('location').setDescription('Location').setRequired(true)).addStringOption(o => o.setName('cpr').setDescription('CPR in progress?'))),

  // ── /fire ─────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName('fire').setDescription('Fire department commands')
    .addSubcommand(s => s.setName('incident').setDescription('Log fire incident').addStringOption(o => o.setName('location').setDescription('Location').setRequired(true)).addStringOption(o => o.setName('type').setDescription('Incident type')))
    .addSubcommand(s => s.setName('out').setDescription('Mark fire as out').addStringOption(o => o.setName('id').setDescription('Incident ID').setRequired(true)))
    .addSubcommand(s => s.setName('hazmat').setDescription('Hazmat alert').addStringOption(o => o.setName('location').setDescription('Location').setRequired(true)).addStringOption(o => o.setName('substance').setDescription('Substance')))
    .addSubcommand(s => s.setName('evacuation').setDescription('Order evacuation').addStringOption(o => o.setName('area').setDescription('Area to evacuate').setRequired(true))),

  // ── /help ─────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName('help').setDescription('Show all RedLineCAD commands')
    .addSubcommand(s => s.setName('all').setDescription('Full command list'))
    .addSubcommand(s => s.setName('leo').setDescription('LEO commands'))
    .addSubcommand(s => s.setName('ems').setDescription('EMS commands'))
    .addSubcommand(s => s.setName('fire').setDescription('Fire commands'))
    .addSubcommand(s => s.setName('admin').setDescription('Admin commands')),

  // ── /status (legacy shorthand) ────────────────────────────────
  new SlashCommandBuilder()
    .setName('status').setDescription('Quick unit status update')
    .addStringOption(o => o.setName('callsign').setDescription('Your callsign').setRequired(true))
    .addStringOption(o => o.setName('status').setDescription('New status').setRequired(true)
      .addChoices({name:'10-8 Available',value:'10-8'},{name:'10-7 Off Duty',value:'10-7'},{name:'Busy',value:'Busy'},{name:'On Scene',value:'On Scene'},{name:'En Route',value:'En Route'})),

  // ── /units (legacy shorthand) ─────────────────────────────────
  new SlashCommandBuilder()
    .setName('units').setDescription('View all active units'),

  // ── /calls (legacy shorthand) ─────────────────────────────────
  new SlashCommandBuilder()
    .setName('calls').setDescription('View all active dispatch calls'),

].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    const guildId = process.env.DISCORD_GUILD_ID;
    const appId   = process.env.DISCORD_APP_ID;

    if (guildId) {
      // Guild-scoped registration (instant, use for testing)
      console.log(`Registering ${commands.length} commands to guild ${guildId}...`);
      await rest.put(Routes.applicationGuildCommands(appId, guildId), { body: commands });
      console.log(`✅ ${commands.length} guild commands registered!`);
    } else {
      // Global registration (takes up to 1 hour to propagate)
      console.log(`Registering ${commands.length} commands globally...`);
      await rest.put(Routes.applicationCommands(appId), { body: commands });
      console.log(`✅ ${commands.length} global commands registered!`);
    }
  } catch (err) {
    console.error('Command registration failed:', err);
    process.exit(1);
  }
})();
