// RedLineCAD Server Setup Command
// Creates all categories, channels, and roles for a GTA RP server

async function cmdSetup(interaction) {
  // Defer reply since this takes a moment
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;

  try {
    await interaction.editReply('Setting up your RedLineCAD server... This may take a moment.');

    // ─── Create Roles ──────────────────────────────────────────
    const roleData = [
      { name: 'Server Owner',    color: 0xff0000, hoist: true, position: 10 },
      { name: 'Head Admin',      color: 0xff4400, hoist: true, position: 9  },
      { name: 'Admin',           color: 0xff8800, hoist: true, position: 8  },
      { name: 'Moderator',       color: 0xffcc00, hoist: true, position: 7  },
      { name: 'Chief of Police', color: 0x1a6fff, hoist: true, position: 6  },
      { name: 'Police Officer',  color: 0x4488ff, hoist: true, position: 5  },
      { name: 'Sheriff Deputy',  color: 0x3366cc, hoist: true, position: 5  },
      { name: 'State Trooper',   color: 0x2244aa, hoist: true, position: 5  },
      { name: 'Fire Captain',    color: 0xff3300, hoist: true, position: 4  },
      { name: 'Firefighter',     color: 0xff6633, hoist: true, position: 4  },
      { name: 'EMS Supervisor',  color: 0x00cc66, hoist: true, position: 3  },
      { name: 'Paramedic',       color: 0x00aa44, hoist: true, position: 3  },
      { name: 'Dispatcher',      color: 0xaa44ff, hoist: true, position: 2  },
      { name: 'Civilian',        color: 0x888888, hoist: true, position: 1  },
      { name: 'Whitelisted',     color: 0x444444, hoist: false              },
      { name: 'CAD Access',      color: 0x336699, hoist: false              },
      { name: 'On Duty',         color: 0x00ff88, hoist: false              },
      { name: 'Off Duty',        color: 0x555555, hoist: false              },
    ];

    const createdRoles = {};
    for (const role of roleData) {
      try {
        const r = await guild.roles.create({
          name: role.name,
          color: role.color,
          hoist: role.hoist || false,
          mentionable: true,
          reason: 'RedLineCAD Setup'
        });
        createdRoles[role.name] = r;
      } catch(e) {
        console.log('Role already exists or error:', role.name);
      }
    }

    await interaction.editReply('Roles created! Building channels...');

    // ─── Channel Structure ─────────────────────────────────────
    const structure = [
      // ── WELCOME & INFO ──
      {
        category: '📋 WELCOME & INFO',
        channels: [
          { name: 'welcome',           type: 'text', topic: 'Welcome to the server! Read the rules before doing anything.' },
          { name: 'rules',             type: 'text', topic: 'Server rules and guidelines.' },
          { name: 'announcements',     type: 'text', topic: 'Server announcements.' },
          { name: 'server-info',       type: 'text', topic: 'Server information, IP, links.' },
          { name: 'cad-link',          type: 'text', topic: 'Link to RedLineCAD.' },
          { name: 'patch-notes',       type: 'text', topic: 'Updates and patch notes.' },
        ]
      },
      // ── GENERAL ──
      {
        category: '💬 GENERAL',
        channels: [
          { name: 'general-chat',      type: 'text',  topic: 'General conversation.' },
          { name: 'introductions',     type: 'text',  topic: 'Introduce yourself!' },
          { name: 'media',             type: 'text',  topic: 'Share screenshots and clips.' },
          { name: 'suggestions',       type: 'text',  topic: 'Server suggestions.' },
          { name: 'off-topic',         type: 'text',  topic: 'Off topic chat.' },
          { name: 'General',           type: 'voice'  },
          { name: 'AFK',               type: 'voice'  },
        ]
      },
      // ── APPLICATIONS ──
      {
        category: '📝 APPLICATIONS',
        channels: [
          { name: 'how-to-apply',      type: 'text', topic: 'How to apply for departments.' },
          { name: 'leo-applications',  type: 'text', topic: 'Apply for Law Enforcement.' },
          { name: 'fire-applications', type: 'text', topic: 'Apply for Fire Department.' },
          { name: 'ems-applications',  type: 'text', topic: 'Apply for EMS.' },
          { name: 'staff-applications',type: 'text', topic: 'Apply for staff.' },
          { name: 'application-status',type: 'text', topic: 'Check your application status.' },
        ]
      },
      // ── DISPATCH ──
      {
        category: '📡 DISPATCH',
        channels: [
          { name: 'dispatch-log',      type: 'text',  topic: 'Live dispatch log.' },
          { name: 'active-calls',      type: 'text',  topic: 'Active CAD calls.' },
          { name: 'bolo-alerts',       type: 'text',  topic: 'Active BOLOs.' },
          { name: 'unit-status',       type: 'text',  topic: 'Unit status board.' },
          { name: 'Dispatch',          type: 'voice'  },
        ]
      },
      // ── LAW ENFORCEMENT ──
      {
        category: '🚔 LAW ENFORCEMENT',
        channels: [
          { name: 'leo-announcements', type: 'text',  topic: 'LEO department announcements.' },
          { name: 'leo-general',       type: 'text',  topic: 'LEO general chat.' },
          { name: 'arrest-reports',    type: 'text',  topic: 'File and view arrest reports.' },
          { name: 'citation-log',      type: 'text',  topic: 'Issued citations log.' },
          { name: 'warrant-board',     type: 'text',  topic: 'Active warrants.' },
          { name: 'evidence-locker',   type: 'text',  topic: 'Evidence log.' },
          { name: 'leo-roster',        type: 'text',  topic: 'Active LEO roster.' },
          { name: 'leo-training',      type: 'text',  topic: 'Training schedules and notes.' },
          { name: 'LSPD Patrol',       type: 'voice'  },
          { name: 'BCSO Patrol',       type: 'voice'  },
          { name: 'SAHP Patrol',       type: 'voice'  },
          { name: 'Pursuit Channel',   type: 'voice'  },
        ]
      },
      // ── FIRE DEPARTMENT ──
      {
        category: '🚒 FIRE DEPARTMENT',
        channels: [
          { name: 'fire-announcements',type: 'text',  topic: 'Fire department announcements.' },
          { name: 'fire-general',      type: 'text',  topic: 'Fire department general chat.' },
          { name: 'incident-reports',  type: 'text',  topic: 'Fire incident reports.' },
          { name: 'fire-roster',       type: 'text',  topic: 'Active fire roster.' },
          { name: 'fire-training',     type: 'text',  topic: 'Training schedules.' },
          { name: 'Station 1',         type: 'voice'  },
          { name: 'Station 2',         type: 'voice'  },
          { name: 'Fire Command',      type: 'voice'  },
        ]
      },
      // ── EMS ──
      {
        category: '🚑 EMS',
        channels: [
          { name: 'ems-announcements', type: 'text',  topic: 'EMS announcements.' },
          { name: 'ems-general',       type: 'text',  topic: 'EMS general chat.' },
          { name: 'patient-log',       type: 'text',  topic: 'Patient intake log.' },
          { name: 'ems-roster',        type: 'text',  topic: 'Active EMS roster.' },
          { name: 'ems-training',      type: 'text',  topic: 'Training schedules.' },
          { name: 'EMS Unit 1',        type: 'voice'  },
          { name: 'EMS Unit 2',        type: 'voice'  },
          { name: 'Hospital',          type: 'voice'  },
        ]
      },
      // ── CIVILIAN ──
      {
        category: '👤 CIVILIAN',
        channels: [
          { name: 'civilian-general',  type: 'text',  topic: 'Civilian chat.' },
          { name: 'business-board',    type: 'text',  topic: 'Business advertisements.' },
          { name: 'job-listings',      type: 'text',  topic: 'Available jobs.' },
          { name: 'classified-ads',    type: 'text',  topic: 'Buy/sell vehicles and items.' },
          { name: 'crime-reports',     type: 'text',  topic: 'Report crimes IC.' },
          { name: 'Civilian Hangout',  type: 'voice'  },
        ]
      },
      // ── STAFF ──
      {
        category: '⚙️ STAFF',
        channels: [
          { name: 'staff-announcements',type:'text',  topic: 'Staff announcements.' },
          { name: 'staff-chat',        type: 'text',  topic: 'Staff only chat.' },
          { name: 'mod-log',           type: 'text',  topic: 'Moderation action log.' },
          { name: 'ban-log',           type: 'text',  topic: 'Ban log.' },
          { name: 'reports',           type: 'text',  topic: 'Player reports.' },
          { name: 'appeals',           type: 'text',  topic: 'Ban appeals.' },
          { name: 'staff-todo',        type: 'text',  topic: 'Staff to-do list.' },
          { name: 'Staff Meeting',     type: 'voice'  },
          { name: 'Admin Room',        type: 'voice'  },
        ]
      },
      // ── BOT ──
      {
        category: '🤖 BOT',
        channels: [
          { name: 'bot-commands',      type: 'text',  topic: 'Use bot commands here.' },
          { name: 'cad-log',           type: 'text',  topic: 'Automated CAD activity log.' },
          { name: 'fine-log',          type: 'text',  topic: 'Automated fine log.' },
          { name: 'dispatch-alerts',   type: 'text',  topic: 'Automated dispatch alerts.' },
        ]
      },
    ];

    // ─── Create Categories & Channels ─────────────────────────
    const createdChannels = {};
    for (const cat of structure) {
      // Create category
      const category = await guild.channels.create({
        name: cat.category,
        type: 4, // Category
        reason: 'RedLineCAD Setup'
      });

      // Create channels under category
      for (const ch of cat.channels) {
        try {
          const channel = await guild.channels.create({
            name: ch.name,
            type: ch.type === 'voice' ? 2 : 0, // 2 = voice, 0 = text
            parent: category.id,
            topic: ch.topic || '',
            reason: 'RedLineCAD Setup'
          });
          createdChannels[ch.name] = channel;

          // Small delay to avoid rate limits
          await new Promise(r => setTimeout(r, 300));
        } catch(e) {
          console.log('Channel error:', ch.name, e.message);
        }
      }

      await interaction.editReply('Created category: ' + cat.category + '...');
    }

    // ─── Final Message ────────────────────────────────────────
    await interaction.editReply({
      content: [
        '**RedLineCAD Server Setup Complete!**',
        '',
        'Created:',
        '- ' + Object.keys(createdRoles).length + ' roles',
        '- ' + structure.length + ' categories',
        '- ' + structure.reduce((a,c) => a + c.channels.length, 0) + ' channels',
        '',
        'Next steps:',
        '1. Set role permissions on restricted channels (Staff, LEO, Fire, EMS)',
        '2. Pin your CAD link in `#cad-link`',
        '3. Write your rules in `#rules`',
        '4. Set your welcome message in `#welcome`',
        '',
        'Your server is ready to go!'
      ].join('\n')
    });

  } catch(err) {
    console.error('Setup error:', err);
    await interaction.editReply('Setup failed: ' + err.message + '. Make sure the bot has Administrator permission.');
  }
}

module.exports = { cmdSetup };
