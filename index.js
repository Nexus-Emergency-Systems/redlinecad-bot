require('dotenv').config();

const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const {
  cmdCivilian, cmdPlate, cmdFine, cmdPay, cmdBalance,
  cmdDispatch, cmdStatus, cmdBolo, cmdUnits, cmdCalls, cmdHelp
} = require('./commands');

// ─── Bot Client ───────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ─── Ready ────────────────────────────────────────────────────────
client.once('ready', () => {
  console.log('RedLineCAD Bot is online as ' + client.user.tag);
  client.user.setActivity('RedLineCAD | /help', { type: 3 }); // Watching
});

// ─── Slash Command Handler ────────────────────────────────────────
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  console.log('Command received:', interaction.commandName);

  try {
    const handlers = {
      'civilian': () => cmdCivilian(interaction),
      'plate':    () => cmdPlate(interaction),
      'fine':     () => cmdFine(interaction),
      'pay':      () => cmdPay(interaction),
      'balance':  () => cmdBalance(interaction),
      'dispatch': () => cmdDispatch(interaction),
      'status':   () => cmdStatus(interaction),
      'bolo':     () => cmdBolo(interaction),
      'units':    () => cmdUnits(interaction),
      'calls':    () => cmdCalls(interaction),
      'help':     () => cmdHelp(interaction),
      'setup':    () => cmdSetup(interaction),
    };

    if (handlers[interaction.commandName]) {
      await handlers[interaction.commandName]();
    } else {
      await interaction.reply({ content: 'Unknown command.', ephemeral: true });
    }
  } catch (err) {
    console.error('Command error:', err);
    try {
      await interaction.reply({ content: 'An error occurred. Please try again.', ephemeral: true });
    } catch(e) {}
  }
});

// ─── Login ────────────────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN);

// ─── Register Commands ────────────────────────────────────────────
// Run "npm run register" to register slash commands
async function registerCommands() {
  const commands = [
    { name:'civilian', description:'Look up a civilian record',
      options:[{ name:'name', description:'Civilian name', type:3, required:true }] },
    { name:'plate', description:'Look up a vehicle by plate',
      options:[{ name:'plate', description:'License plate', type:3, required:true }] },
    { name:'fine', description:'Issue a fine to a player',
      options:[
        { name:'player', description:'Player name', type:3, required:true },
        { name:'amount', description:'Fine amount in dollars', type:10, required:true },
        { name:'reason', description:'Reason for fine', type:3, required:true }
      ]},
    { name:'pay', description:'Mark a fine as paid',
      options:[
        { name:'player', description:'Player name', type:3, required:true },
        { name:'amount', description:'Amount paid', type:10, required:true }
      ]},
    { name:'balance', description:'Check a player bank balance',
      options:[{ name:'player', description:'Player name', type:3, required:true }] },
    { name:'dispatch', description:'Create a new dispatch call',
      options:[
        { name:'title',    description:'Call title/type',  type:3, required:true },
        { name:'location', description:'Location',         type:3, required:true },
        { name:'priority', description:'Priority level',   type:3, required:false,
          choices:[
            { name:'High',   value:'High'   },
            { name:'Medium', value:'Medium' },
            { name:'Low',    value:'Low'    }
          ]}
      ]},
    { name:'status', description:'Update a unit status',
      options:[
        { name:'callsign', description:'Unit callsign', type:3, required:true },
        { name:'status',   description:'New status',    type:3, required:true,
          choices:[
            { name:'10-8 Available', value:'10-8'     },
            { name:'10-7 Offline',   value:'10-7'     },
            { name:'Busy',           value:'Busy'     },
            { name:'On Scene',       value:'On Scene' },
            { name:'En Route',       value:'En Route' }
          ]}
      ]},
    { name:'bolo', description:'Issue a BOLO alert',
      options:[
        { name:'subject',     description:'Person or vehicle to BOLO', type:3, required:true },
        { name:'description', description:'Description / details',     type:3, required:false }
      ]},
    { name:'units',    description:'View all active units' },
    { name:'calls',    description:'View all active calls' },
    { name:'help',     description:'Show all RedLineCAD bot commands' },
    { name:'setup',    description:'Setup RedLineCAD channels and roles (Admin only)' },
  ];

  const rest = new REST({ version:'10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_APP_ID, process.env.DISCORD_GUILD_ID),
      { body: commands }
    );
    console.log('Commands registered successfully!');
  } catch(err) {
    console.error('Failed to register commands:', err);
  }
}

// Auto-register on startup
registerCommands();
