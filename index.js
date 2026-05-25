require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { fbGet, fbSet, fbPush, fbDelete, fbUpdate, getFirstServerId, getServerData, getServerEntries, findCivilian, findVehicle } = require('./firebase');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildPresences]
});

// ── Helpers ───────────────────────────────────────────────────────
const C = { red:0xCC0000, blue:0x1A6FFF, green:0x00CC66, gold:0xF5A623, orange:0xFF6600, purple:0x6A00CC, grey:0x555566 };
const ts = () => new Date().toLocaleString('en-US', { timeZone:'America/New_York' });
const id = () => Date.now().toString(36).toUpperCase();

function mkEmbed(title, desc, color=C.red, fields=[]) {
  const e = new EmbedBuilder().setColor(color).setTitle(title).setDescription(desc).setTimestamp().setFooter({ text:`RedLineCAD • ${ts()}` });
  fields.forEach(f => e.addFields({ name:f.name, value:String(f.value||'N/A'), inline:f.inline??true }));
  return e;
}
async function reply(i, title, desc, color=C.red, fields=[], ephemeral=false) {
  try {
    if (!i.replied && !i.deferred) await i.deferReply({ ephemeral });
    await i.editReply({ embeds:[mkEmbed(title, desc, color, fields)] });
  } catch(e) { console.error('reply err:', e.message); }
}
function civFields(c) {
  return [
    { name:'DOB', value:c.dateOfBirth||c.dob||'Unknown' },
    { name:'Gender', value:c.gender||'Unknown' },
    { name:'Occupation', value:c.occupation||c.employment||'Unknown' },
    { name:'Address', value:c.address||'Unknown' },
    { name:'License', value:c.licenseStatus||'Valid' },
    { name:'Priors', value:c.priorArrests ? String(c.priorArrests.length) : '0' },
    { name:'Wanted', value:c.wanted?'⚠️ YES':'✅ No' },
  ];
}
function plateBadge(v) {
  const flags = [];
  if (v.stolen) flags.push('🚨 STOLEN');
  if (v.wanted) flags.push('⚠️ WANTED');
  if (v.watchlist) flags.push('👁️ WATCHLIST');
  return flags.length ? flags.join(' | ') : '✅ Clear';
}

// ── Ready ─────────────────────────────────────────────────────────
client.once('ready', () => {
  console.log('✅ RedLineCAD Bot online as ' + client.user.tag);
  client.user.setActivity('RedLineCAD | /help all', { type:3 });
});

// ── Command Handler ───────────────────────────────────────────────
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const cmd = interaction.commandName;
  const sub = interaction.options.getSubcommand(false);
  console.log(`CMD: /${cmd} ${sub||''}`);

  const str = (n, req=false) => interaction.options.getString(n, req) || '';
  const num = (n, req=false) => interaction.options.getNumber(n, req) || 0;

  try {
    const sid = await getFirstServerId();
    const basePath = sid ? `servers/${sid}` : null;

    // ── /civilian ─────────────────────────────────────────────────
    if (cmd === 'civilian') {
      const name = str('name', true);

      if (sub === 'lookup' || sub === 'profile') {
        const result = await findCivilian(name);
        if (!result) return reply(interaction, '👤 Not Found', `No civilian record found for **${name}**\nAdd them at redlinecad.app`, C.grey);
        const [,c] = result;
        return reply(interaction, `👤 ${c.name}`, `Civilian record found`, C.blue, civFields(c));
      }

      if (sub === 'priors') {
        const result = await findCivilian(name);
        if (!result) return reply(interaction, '📋 Not Found', `No record for **${name}**`, C.grey);
        const [,c] = result;
        const priors = c.priorArrests || [];
        return reply(interaction, `📋 Prior Record — ${c.name}`, priors.length ? `${priors.length} prior arrest(s) on file` : 'No prior arrests on file', priors.length ? C.orange : C.green,
          priors.slice(0,5).map((p,i) => ({ name:`Arrest #${i+1}`, value:p.charges||p.description||'See CAD', inline:false })));
      }

      if (sub === 'wanted') {
        const result = await findCivilian(name);
        if (!result) return reply(interaction, '⚠️ Not Found', `No record for **${name}**`, C.grey);
        const [,c] = result;
        const wanted = c.wanted || false;
        const warrants = c.warrants || [];
        return reply(interaction, wanted ? `🚨 WANTED — ${c.name}` : `✅ Clear — ${c.name}`,
          wanted ? `⚠️ Subject has active warrants` : `No active warrants or BOLOs`,
          wanted ? C.red : C.green,
          wanted ? [{ name:'Active Warrants', value:String(warrants.length||'Unknown'), inline:true }, { name:'BOLO', value:c.bolo?'🔴 Active':'None', inline:true }] : []);
      }

      if (sub === 'gang') {
        const result = await findCivilian(name);
        if (!result) return reply(interaction, '🔫 Not Found', `No record for **${name}**`, C.grey);
        const [,c] = result;
        return reply(interaction, `🔫 Gang Check — ${c.name}`, c.gangAffiliation ? `Subject affiliated with **${c.gangAffiliation}**` : 'No known gang affiliation', c.gangAffiliation ? C.orange : C.green,
          [{ name:'Affiliation', value:c.gangAffiliation||'None' }, { name:'Rank', value:c.gangRank||'N/A' }]);
      }

      if (sub === 'dob') {
        const result = await findCivilian(name);
        if (!result) return reply(interaction, '📅 Not Found', `No record for **${name}**`, C.grey);
        const [,c] = result;
        return reply(interaction, `📅 DOB — ${c.name}`, `Date of birth on file`, C.blue, [{ name:'DOB', value:c.dateOfBirth||c.dob||'Unknown' }, { name:'Age', value:c.age||'Unknown' }]);
      }

      if (sub === 'address') {
        const result = await findCivilian(name);
        if (!result) return reply(interaction, '🏠 Not Found', `No record for **${name}**`, C.grey);
        const [,c] = result;
        return reply(interaction, `🏠 Address — ${c.name}`, `Registered address on file`, C.blue, [{ name:'Address', value:c.address||'No address on file', inline:false }]);
      }

      if (sub === 'employment') {
        const result = await findCivilian(name);
        if (!result) return reply(interaction, '💼 Not Found', `No record for **${name}**`, C.grey);
        const [,c] = result;
        return reply(interaction, `💼 Employment — ${c.name}`, `Employment records`, C.blue, [{ name:'Employer', value:c.occupation||c.employment||'Unemployed' }, { name:'Job', value:c.job||'Unknown' }]);
      }

      if (sub === 'relationship') {
        const result = await findCivilian(name);
        if (!result) return reply(interaction, '❤️ Not Found', `No record for **${name}**`, C.grey);
        const [,c] = result;
        return reply(interaction, `❤️ Associates — ${c.name}`, `Known associates on file`, C.purple, [{ name:'Associates', value:c.associates||'None on file', inline:false }]);
      }

      if (sub === 'property') {
        const result = await findCivilian(name);
        if (!result) return reply(interaction, '🏠 Not Found', `No record for **${name}**`, C.grey);
        const [,c] = result;
        return reply(interaction, `🏠 Property — ${c.name}`, `Property holdings`, C.blue, [{ name:'Properties', value:c.properties||'None on file', inline:false }]);
      }

      if (sub === 'vehicle') {
        const result = await findCivilian(name);
        if (!result) return reply(interaction, '🚗 Not Found', `No record for **${name}**`, C.grey);
        const [,c] = result;
        const vehicles = await getServerData('vehicles');
        const civVehicles = vehicles.filter(v => v.owner?.toLowerCase().includes(name.toLowerCase()));
        return reply(interaction, `🚗 Vehicles — ${c.name}`, civVehicles.length ? `${civVehicles.length} vehicle(s) registered` : 'No vehicles registered', C.blue,
          civVehicles.slice(0,5).map(v => ({ name:v.plate||'Unknown', value:`${v.make||''} ${v.model||''} ${v.color||''}`.trim()||'Unknown', inline:true })));
      }

      if (sub === 'business') {
        const result = await findCivilian(name);
        if (!result) return reply(interaction, '🏪 Not Found', `No record for **${name}**`, C.grey);
        const [,c] = result;
        return reply(interaction, `🏪 Business — ${c.name}`, c.business||'No businesses on file', C.blue);
      }

      if (sub === 'pets') {
        const result = await findCivilian(name);
        if (!result) return reply(interaction, '🐾 Not Found', `No record for **${name}**`, C.grey);
        const [,c] = result;
        return reply(interaction, `🐾 Pets — ${c.name}`, c.pets||'No pets registered', C.blue);
      }

      if (sub === 'deceased') {
        const result = await findCivilian(name);
        if (!result) return reply(interaction, '💀 Not Found', `No record for **${name}**`, C.grey);
        const [,c] = result;
        return reply(interaction, `💀 Status — ${c.name}`, c.deceased ? '⚠️ Subject is deceased' : '✅ Subject is alive', c.deceased ? C.grey : C.green,
          [{ name:'Status', value:c.deceased?'Deceased':'Alive' }, { name:'Cause', value:c.causeOfDeath||'N/A' }]);
      }

      if (sub === 'medhistory') {
        const result = await findCivilian(name);
        if (!result) return reply(interaction, '🏥 Not Found', `No record for **${name}**`, C.grey);
        const [,c] = result;
        return reply(interaction, `🏥 Medical — ${c.name}`, 'Medical history on file', C.green,
          [{ name:'Blood Type', value:c.bloodType||'Unknown' }, { name:'Allergies', value:c.allergies||'None known' }, { name:'Conditions', value:c.medicalConditions||'None on file', inline:false }]);
      }

      if (sub === 'dnr') {
        const result = await findCivilian(name);
        if (!result) return reply(interaction, '📋 Not Found', `No record for **${name}**`, C.grey);
        const [,c] = result;
        return reply(interaction, `📋 DNR — ${c.name}`, c.dnr ? '⚠️ **DNR ON FILE** — Do Not Resuscitate' : '✅ No DNR on file', c.dnr ? C.orange : C.green);
      }

      if (sub === 'bloodtype') {
        const result = await findCivilian(name);
        if (!result) return reply(interaction, '🩸 Not Found', `No record for **${name}**`, C.grey);
        const [,c] = result;
        return reply(interaction, `🩸 Blood Type — ${c.name}`, `Blood type: **${c.bloodType||'Unknown'}**`, C.red);
      }

      if (sub === 'allergies') {
        const result = await findCivilian(name);
        if (!result) return reply(interaction, '⚠️ Not Found', `No record for **${name}**`, C.grey);
        const [,c] = result;
        return reply(interaction, `⚠️ Allergies — ${c.name}`, c.allergies||'No known allergies on file', C.orange);
      }
    }

    // ── /vehicle ──────────────────────────────────────────────────
    if (cmd === 'vehicle') {
      const plate = str('plate', true);

      if (sub === 'plate') {
        const result = await findVehicle(plate);
        if (!result) return reply(interaction, '🚗 Not Found', `Plate **${plate}** not in DMV records`, C.grey);
        const [,v] = result;
        return reply(interaction, `🚗 ${plate.toUpperCase()}`, plateBadge(v), v.stolen ? C.red : C.blue,
          [{ name:'Owner', value:v.owner||'Unknown' }, { name:'Make/Model', value:`${v.make||'?'} ${v.model||'?'}` }, { name:'Color', value:v.color||'Unknown' }, { name:'Year', value:v.year||'Unknown' }, { name:'Insurance', value:v.insurance||'Unknown' }, { name:'Registration', value:v.registration||'Valid' }]);
      }

      if (sub === 'stolen') {
        if (!basePath) return reply(interaction, '❌ Error', 'No server found', C.grey);
        const result = await findVehicle(plate);
        if (!result) return reply(interaction, '❌ Not Found', `Plate **${plate}** not found`, C.grey);
        const [key, v] = result;
        await fbUpdate(`${basePath}/vehicles/${key}`, { stolen:true, stolenAt:ts(), stolenBy:interaction.user.username });
        await fbPush(`${basePath}/bolos`, { subject:plate, description:`Stolen vehicle — ${v.make||''} ${v.model||''} ${v.color||''}`.trim(), type:'vehicle', plate, issuedBy:interaction.user.username, createdAt:ts(), active:true });
        return reply(interaction, '🚨 Vehicle Marked STOLEN', `**${plate.toUpperCase()}** flagged as stolen\nBOLO automatically issued`, C.red, [{ name:'Officer', value:interaction.user.username }, { name:'Time', value:ts() }]);
      }

      if (sub === 'recovered') {
        if (!basePath) return reply(interaction, '❌ Error', 'No server found', C.grey);
        const result = await findVehicle(plate);
        if (!result) return reply(interaction, '❌ Not Found', `Plate **${plate}** not found`, C.grey);
        const [key] = result;
        await fbUpdate(`${basePath}/vehicles/${key}`, { stolen:false, recoveredAt:ts(), recoveredBy:interaction.user.username });
        return reply(interaction, '✅ Vehicle Recovered', `**${plate.toUpperCase()}** marked as recovered`, C.green, [{ name:'Officer', value:interaction.user.username }]);
      }

      if (sub === 'impound') {
        if (!basePath) return reply(interaction, '❌ Error', 'No server found', C.grey);
        const result = await findVehicle(plate);
        if (!result) return reply(interaction, '❌ Not Found', `Plate **${plate}** not found`, C.grey);
        const [key, v] = result;
        await fbUpdate(`${basePath}/vehicles/${key}`, { impounded:true, impoundReason:str('reason')||'Impounded', impoundedAt:ts(), impoundedBy:interaction.user.username });
        await fbPush(`${basePath}/towSheets`, { plate, reason:str('reason')||'Impounded', officer:interaction.user.username, createdAt:ts(), vehicle:v });
        return reply(interaction, '🚛 Vehicle Impounded', `**${plate.toUpperCase()}** impounded\nReason: ${str('reason')||'Not specified'}\nTow sheet created in CAD`, C.orange, [{ name:'Officer', value:interaction.user.username }]);
      }

      if (sub === 'registration') {
        const result = await findVehicle(plate);
        if (!result) return reply(interaction, '📋 Not Found', `Plate **${plate}** not in DMV`, C.grey);
        const [,v] = result;
        return reply(interaction, `📋 Registration — ${plate.toUpperCase()}`, 'DMV registration record', C.blue, [{ name:'Owner', value:v.owner||'Unknown' }, { name:'Reg. Status', value:v.registration||'Valid' }, { name:'Expires', value:v.regExpiry||'Unknown' }, { name:'State', value:v.state||'LS' }]);
      }

      if (sub === 'tow') {
        if (!basePath) return reply(interaction, '❌ Error', 'No server found', C.grey);
        const result = await findVehicle(plate);
        const v = result ? result[1] : { plate };
        await fbPush(`${basePath}/towSheets`, { plate, location:str('location')||'Not specified', requestedBy:interaction.user.username, createdAt:ts(), status:'Pending', vehicle:v });
        return reply(interaction, '🚛 Tow Requested', `Tow request filed for **${plate.toUpperCase()}**\nLocation: ${str('location')||'Not specified'}`, C.orange, [{ name:'Officer', value:interaction.user.username }, { name:'Status', value:'Pending dispatch to tow company' }]);
      }

      if (sub === 'alpr') {
        const result = await findVehicle(plate);
        if (!result) return reply(interaction, '📡 No Hit', `ALPR scan — **${plate.toUpperCase()}** — No hits`, C.green);
        const [,v] = result;
        const flags = [];
        if (v.stolen) flags.push('🚨 STOLEN VEHICLE');
        if (v.wanted) flags.push('⚠️ WANTED');
        if (v.watchlist) flags.push('👁️ ON WATCHLIST');
        if (v.impounded) flags.push('🚛 PREVIOUSLY IMPOUNDED');
        return reply(interaction, `📡 ALPR HIT — ${plate.toUpperCase()}`, flags.length ? `**${flags.length} FLAG(S) FOUND**` : '✅ No flags', flags.length ? C.red : C.green,
          flags.length ? [{ name:'Flags', value:flags.join('\n'), inline:false }, { name:'Owner', value:v.owner||'Unknown' }] : [{ name:'Owner', value:v.owner||'Unknown' }, { name:'Status', value:'Clear' }]);
      }

      if (sub === 'watchlist') {
        if (!basePath) return reply(interaction, '❌ Error', 'No server found', C.grey);
        const result = await findVehicle(plate);
        if (result) {
          const [key] = result;
          await fbUpdate(`${basePath}/vehicles/${key}`, { watchlist:true, watchlistReason:str('reason')||'Under surveillance', watchlistBy:interaction.user.username });
        }
        await fbPush(`${basePath}/alprWatchlist`, { plate, reason:str('reason')||'Under surveillance', addedBy:interaction.user.username, createdAt:ts() });
        return reply(interaction, '👁️ Added to Watchlist', `**${plate.toUpperCase()}** on ALPR watchlist\nReason: ${str('reason')||'Not specified'}`, C.orange, [{ name:'Officer', value:interaction.user.username }]);
      }

      if (sub === 'insurance') {
        const result = await findVehicle(plate);
        if (!result) return reply(interaction, '🛡️ Not Found', `Plate **${plate}** not found`, C.grey);
        const [,v] = result;
        return reply(interaction, `🛡️ Insurance — ${plate.toUpperCase()}`, 'Insurance status', C.blue, [{ name:'Provider', value:v.insuranceProvider||'Unknown' }, { name:'Policy', value:v.insurancePolicy||'Unknown' }, { name:'Status', value:v.insurance||'Unknown' }, { name:'Expires', value:v.insuranceExpiry||'Unknown' }]);
      }
    }

    // ── /warrant ──────────────────────────────────────────────────
    if (cmd === 'warrant') {
      if (sub === 'issue') {
        if (!basePath) return reply(interaction, '❌ Error', 'No server found', C.grey);
        const name = str('name', true);
        const newWarrant = { subject:name, charges:str('charges')||'See CAD', issuedBy:interaction.user.username, createdAt:ts(), status:'Pending Approval', active:false, id:id() };
        await fbPush(`${basePath}/warrants`, newWarrant);
        const civResult = await findCivilian(name);
        if (civResult) { const [key] = civResult; await fbUpdate(`${basePath}/civilians/${key}`, { wanted:true }); }
        return reply(interaction, '⚖️ Warrant Issued', `Warrant filed for **${name}**\nCharges: ${str('charges')||'See CAD'}\nStatus: Pending Judicial Approval`, C.red, [{ name:'Officer', value:interaction.user.username }, { name:'Action Required', value:'Judicial approval needed in RedLineCAD' }]);
      }

      if (sub === 'check') {
        const name = str('name', true);
        const { entries } = await getServerEntries('warrants');
        const warrants = entries.filter(([,w]) => w.subject?.toLowerCase().includes(name.toLowerCase()) && w.active);
        return reply(interaction, `🔍 Warrants — ${name}`, warrants.length ? `**${warrants.length} active warrant(s)**` : 'No active warrants', warrants.length ? C.red : C.green,
          warrants.slice(0,5).map(([,w]) => ({ name:w.status||'Active', value:w.charges||'See CAD', inline:false })));
      }

      if (sub === 'approve') {
        if (!basePath) return reply(interaction, '❌ Error', 'No server found', C.grey);
        const name = str('name', true);
        const { entries } = await getServerEntries('warrants');
        const warrant = entries.find(([,w]) => w.subject?.toLowerCase().includes(name.toLowerCase()) && !w.active);
        if (!warrant) return reply(interaction, '❌ Not Found', `No pending warrant for **${name}**`, C.grey);
        const [key] = warrant;
        await fbUpdate(`${basePath}/warrants/${key}`, { active:true, status:'Active', approvedBy:interaction.user.username, approvedAt:ts() });
        return reply(interaction, '✅ Warrant Approved', `Warrant for **${name}** is now ACTIVE`, C.green, [{ name:'Judge', value:interaction.user.username }, { name:'Status', value:'ACTIVE — Units may execute' }]);
      }

      if (sub === 'expunge') {
        if (!basePath) return reply(interaction, '❌ Error', 'No server found', C.grey);
        const name = str('name', true);
        const civResult = await findCivilian(name);
        if (civResult) {
          const [key, c] = civResult;
          await fbUpdate(`${basePath}/civilians/${key}`, { wanted:false, priorArrests:[], warrants:[] });
        }
        const { entries } = await getServerEntries('warrants');
        for (const [key, w] of entries) {
          if (w.subject?.toLowerCase().includes(name.toLowerCase())) await fbUpdate(`${basePath}/warrants/${key}`, { active:false, expunged:true, expungedBy:interaction.user.username });
        }
        return reply(interaction, '🗑️ Record Expunged', `All records expunged for **${name}**`, C.green, [{ name:'Judge', value:interaction.user.username }]);
      }

      if (sub === 'deactivate') {
        if (!basePath) return reply(interaction, '❌ Error', 'No server found', C.grey);
        const name = str('name', true);
        const { entries } = await getServerEntries('warrants');
        const warrant = entries.find(([,w]) => w.subject?.toLowerCase().includes(name.toLowerCase()) && w.active);
        if (!warrant) return reply(interaction, '❌ Not Found', `No active warrant for **${name}**`, C.grey);
        const [key] = warrant;
        await fbUpdate(`${basePath}/warrants/${key}`, { active:false, status:'Deactivated', deactivatedBy:interaction.user.username });
        return reply(interaction, '⏸️ Warrant Deactivated', `Warrant for **${name}** deactivated`, C.grey, [{ name:'Officer', value:interaction.user.username }]);
      }

      if (sub === 'list') {
        const { entries } = await getServerEntries('warrants');
        const active = entries.filter(([,w]) => w.active);
        return reply(interaction, '📋 Active Warrants', active.length ? `**${active.length}** active warrant(s)` : 'No active warrants', active.length ? C.red : C.green,
          active.slice(0,8).map(([,w]) => ({ name:w.subject||'Unknown', value:w.charges||'See CAD', inline:true })));
      }
    }

    // ── /arrest ───────────────────────────────────────────────────
    if (cmd === 'arrest') {
      if (sub === 'log') {
        if (!basePath) return reply(interaction, '❌ Error', 'No server found', C.grey);
        const name = str('name', true);
        const arrest = { subject:name, charges:str('charges')||'See CAD', location:str('location')||'Unknown', officer:interaction.user.username, createdAt:ts(), status:'Booked', id:id() };
        await fbPush(`${basePath}/arrests`, arrest);
        const civResult = await findCivilian(name);
        if (civResult) {
          const [key, c] = civResult;
          const priors = c.priorArrests || [];
          priors.push(arrest);
          await fbUpdate(`${basePath}/civilians/${key}`, { priorArrests:priors });
        }
        return reply(interaction, '🔒 Arrest Logged', `**${name}** has been arrested\nCharges: ${str('charges')||'See CAD'}\nLocation: ${str('location')||'Unknown'}`, C.red, [{ name:'Arresting Officer', value:interaction.user.username }, { name:'Next Step', value:'File arrest report in RedLineCAD' }]);
      }

      if (sub === 'search') {
        const name = str('name', true);
        const { entries } = await getServerEntries('arrests');
        const arrests = entries.filter(([,a]) => a.subject?.toLowerCase().includes(name.toLowerCase()));
        return reply(interaction, `🔍 Arrest History — ${name}`, arrests.length ? `**${arrests.length}** arrest(s) on record` : 'No arrests on record', arrests.length ? C.orange : C.green,
          arrests.slice(0,5).map(([,a]) => ({ name:a.createdAt||'Unknown date', value:a.charges||'See CAD', inline:false })));
      }

      if (sub === 'booking') {
        if (!basePath) return reply(interaction, '❌ Error', 'No server found', C.grey);
        const name = str('name', true);
        const booking = { subject:name, charges:str('charges')||'See CAD', officer:interaction.user.username, bookedAt:ts(), status:'In Custody', id:id() };
        await fbPush(`${basePath}/bookings`, booking);
        return reply(interaction, '📋 Booking Logged', `**${name}** booked into custody\nCharges: ${str('charges')||'See CAD'}`, C.red, [{ name:'Officer', value:interaction.user.username }, { name:'Status', value:'In Custody' }]);
      }
    }

    // ── /fine ─────────────────────────────────────────────────────
    if (cmd === 'fine') {
      if (sub === 'issue') {
        if (!basePath) return reply(interaction, '❌ Error', 'No server found', C.grey);
        const player = str('player', true);
        const amount = num('amount', true);
        const fine = { subject:player, amount, reason:str('reason')||'Violation', issuedBy:interaction.user.username, createdAt:ts(), status:'Unpaid', id:id() };
        await fbPush(`${basePath}/citations`, fine);
        const civResult = await findCivilian(player);
        if (civResult) {
          const [key, c] = civResult;
          const balance = (c.bankBalance||0) - amount;
          await fbUpdate(`${basePath}/civilians/${key}`, { bankBalance:balance });
        }
        return reply(interaction, '💸 Fine Issued', `Fine issued to **${player}**\nAmount: **$${amount.toLocaleString()}**\nReason: ${str('reason')||'Violation'}`, C.orange, [{ name:'Officer', value:interaction.user.username }, { name:'Status', value:'Unpaid — 72 hour compliance window' }]);
      }

      if (sub === 'pay') {
        if (!basePath) return reply(interaction, '❌ Error', 'No server found', C.grey);
        const player = str('player', true);
        const amount = num('amount', true);
        const { entries } = await getServerEntries('citations');
        const fine = entries.find(([,f]) => f.subject?.toLowerCase().includes(player.toLowerCase()) && f.status === 'Unpaid');
        if (fine) await fbUpdate(`${basePath}/citations/${fine[0]}`, { status:'Paid', paidAt:ts(), paidAmount:amount });
        return reply(interaction, '✅ Fine Paid', `**${player}** paid **$${amount.toLocaleString()}**`, C.green, [{ name:'Processed by', value:interaction.user.username }]);
      }

      if (sub === 'check') {
        const player = str('player', true);
        const { entries } = await getServerEntries('citations');
        const fines = entries.filter(([,f]) => f.subject?.toLowerCase().includes(player.toLowerCase()) && f.status === 'Unpaid');
        const total = fines.reduce((sum, [,f]) => sum + (f.amount||0), 0);
        return reply(interaction, `🔍 Fines — ${player}`, fines.length ? `**${fines.length}** outstanding fine(s)\nTotal owed: **$${total.toLocaleString()}**` : 'No outstanding fines', fines.length ? C.orange : C.green,
          fines.slice(0,5).map(([,f]) => ({ name:`$${f.amount||0}`, value:f.reason||'See CAD', inline:true })));
      }

      if (sub === 'waive') {
        if (!basePath) return reply(interaction, '❌ Error', 'No server found', C.grey);
        const player = str('player', true);
        const { entries } = await getServerEntries('citations');
        const fine = entries.find(([,f]) => f.subject?.toLowerCase().includes(player.toLowerCase()) && f.status === 'Unpaid');
        if (fine) await fbUpdate(`${basePath}/citations/${fine[0]}`, { status:'Waived', waivedBy:interaction.user.username, waivedAt:ts(), waiveReason:str('reason')||'Not specified' });
        return reply(interaction, '🗑️ Fine Waived', `Fine waived for **${player}**\nReason: ${str('reason')||'Not specified'}`, C.green, [{ name:'Officer', value:interaction.user.username }]);
      }
    }

    // ── /bolo ─────────────────────────────────────────────────────
    if (cmd === 'bolo') {
      if (sub === 'issue' || sub === 'vehicle') {
        if (!basePath) return reply(interaction, '❌ Error', 'No server found', C.grey);
        const subject = sub === 'vehicle' ? str('plate', true) : str('subject', true);
        const bolo = { subject, description:str('description')||'Armed and dangerous', reason:str('reason')||'Not specified', plate:sub==='vehicle'?subject:'', type:sub==='vehicle'?'vehicle':'person', priority:str('priority')||'Standard', issuedBy:interaction.user.username, createdAt:ts(), active:true, id:id() };
        await fbPush(`${basePath}/bolos`, bolo);
        if (sub !== 'vehicle') {
          const civResult = await findCivilian(subject);
          if (civResult) { const [key] = civResult; await fbUpdate(`${basePath}/civilians/${key}`, { bolo:true }); }
        }
        return reply(interaction, `🚨 BOLO ISSUED`, `**BE ON THE LOOKOUT**\nSubject: **${subject}**\nDescription: ${str('description')||'Armed and dangerous'}\nPriority: ${str('priority')||'Standard'}`, C.red, [{ name:'Issued by', value:interaction.user.username }, { name:'Status', value:'🔴 ACTIVE — All units aware' }]);
      }

      if (sub === 'cancel') {
        if (!basePath) return reply(interaction, '❌ Error', 'No server found', C.grey);
        const subject = str('subject', true);
        const { entries } = await getServerEntries('bolos');
        const bolo = entries.find(([,b]) => b.subject?.toLowerCase().includes(subject.toLowerCase()) && b.active);
        if (!bolo) return reply(interaction, '❌ Not Found', `No active BOLO for **${subject}**`, C.grey);
        const [key] = bolo;
        await fbUpdate(`${basePath}/bolos/${key}`, { active:false, cancelledBy:interaction.user.username, cancelledAt:ts() });
        return reply(interaction, '✅ BOLO Cancelled', `BOLO for **${subject}** cancelled`, C.green, [{ name:'Cancelled by', value:interaction.user.username }]);
      }

      if (sub === 'list') {
        const { entries } = await getServerEntries('bolos');
        const active = entries.filter(([,b]) => b.active);
        return reply(interaction, '📋 Active BOLOs', active.length ? `**${active.length}** active BOLO(s)` : 'No active BOLOs', active.length ? C.red : C.green,
          active.slice(0,8).map(([,b]) => ({ name:b.subject||'Unknown', value:`${b.type||'person'} — ${b.description||'See CAD'}`, inline:false })));
      }
    }

    // ── /dispatch ─────────────────────────────────────────────────
    if (cmd === 'dispatch') {
      if (sub === 'call' || sub === '911') {
        if (!basePath) return reply(interaction, '❌ Error', 'No server found', C.grey);
        const callData = {
          title: sub==='911' ? '📞 911 CALL' : str('title', true),
          location: str('location', true),
          description: str('description')||str('nature')||'No details',
          priority: sub==='911' ? 'High' : (str('priority')||'Standard'),
          status: 'Pending', createdBy: interaction.user.username, createdAt: ts(), id: id(),
          type: sub==='911' ? '911' : 'Dispatch'
        };
        await fbPush(`${basePath}/activeCalls`, callData);
        const color = callData.priority==='High' ? C.red : callData.priority==='Medium' ? C.orange : C.blue;
        return reply(interaction, sub==='911'?'📞 911 CALL CREATED':'📡 DISPATCH CALL CREATED', `**${callData.title}**\n📍 ${callData.location}\n${callData.description}`, color,
          [{ name:'Priority', value:callData.priority }, { name:'By', value:interaction.user.username }, { name:'Status', value:'🟡 Pending — Awaiting unit assignment' }, { name:'CAD', value:'View in redlinecad.app → Dispatch' }]);
      }

      if (sub === 'close') {
        if (!basePath) return reply(interaction, '❌ Error', 'No server found', C.grey);
        const callId = str('callid', true);
        const { entries } = await getServerEntries('activeCalls');
        const call = entries.find(([,c]) => c.id?.toLowerCase()===callId.toLowerCase() || c.title?.toLowerCase().includes(callId.toLowerCase()));
        if (!call) return reply(interaction, '❌ Not Found', `Call **${callId}** not found`, C.grey);
        const [key, c] = call;
        await fbUpdate(`${basePath}/activeCalls/${key}`, { status:'Closed', disposition:str('disposition')||'Closed', closedBy:interaction.user.username, closedAt:ts() });
        return reply(interaction, '✅ Call Closed', `Call **${c.title||callId}** closed\nDisposition: ${str('disposition')||'See CAD'}`, C.green, [{ name:'Closed by', value:interaction.user.username }]);
      }

      if (sub === 'assign') {
        if (!basePath) return reply(interaction, '❌ Error', 'No server found', C.grey);
        const callId = str('callid', true);
        const unit = str('unit', true);
        const { entries } = await getServerEntries('activeCalls');
        const call = entries.find(([,c]) => c.id?.toLowerCase()===callId.toLowerCase() || c.title?.toLowerCase().includes(callId.toLowerCase()));
        if (call) {
          const [key, c] = call;
          const assigned = c.assignedUnits || [];
          assigned.push(unit);
          await fbUpdate(`${basePath}/activeCalls/${key}`, { assignedUnits:assigned, status:'Active' });
        }
        return reply(interaction, '📋 Unit Assigned', `**${unit}** assigned to call **${callId}**`, C.blue, [{ name:'Dispatcher', value:interaction.user.username }]);
      }

      if (sub === 'active') {
        const { entries } = await getServerEntries('activeCalls');
        const active = entries.filter(([,c]) => c.status !== 'Closed');
        return reply(interaction, '📡 Active Calls', active.length ? `**${active.length}** active call(s)` : 'No active calls', active.length ? C.blue : C.green,
          active.slice(0,8).map(([,c]) => ({ name:`${c.priority==='High'?'🔴':'🟡'} ${c.title||'Unknown'}`, value:`📍 ${c.location||'Unknown'} — ${c.status||'Pending'}`, inline:false })));
      }
    }

    // ── /unit ─────────────────────────────────────────────────────
    if (cmd === 'unit') {
      if (sub === 'status') {
        if (!basePath) return reply(interaction, '❌ Error', 'No server found', C.grey);
        const callsign = str('callsign', true);
        const status = str('status', true);
        const { entries } = await getServerEntries('activeUnits');
        const unit = entries.find(([,u]) => u.callsign?.toLowerCase() === callsign.toLowerCase());
        if (unit) {
          const [key] = unit;
          await fbUpdate(`${basePath}/activeUnits/${key}`, { status, lastUpdate:ts() });
        } else {
          await fbPush(`${basePath}/activeUnits`, { callsign, status, officer:interaction.user.username, lastUpdate:ts() });
        }
        return reply(interaction, '🔘 Status Updated', `**${callsign}** → **${status}**`, C.blue, [{ name:'Time', value:ts() }]);
      }

      if (sub === 'list' || sub === 'oncall') {
        const { entries } = await getServerEntries('activeUnits');
        const active = entries.filter(([,u]) => u.status !== '10-7');
        return reply(interaction, '🚔 Active Units', active.length ? `**${active.length}** unit(s) on duty` : 'No active units', C.blue,
          active.slice(0,10).map(([,u]) => ({ name:u.callsign||'Unknown', value:u.status||'Unknown', inline:true })));
      }

      if (sub === 'panic') {
        if (basePath) {
          await fbPush(`${basePath}/panicAlerts`, { callsign:str('callsign')||interaction.user.username, location:str('location')||'UNKNOWN', officer:interaction.user.username, createdAt:ts(), active:true });
        }
        return reply(interaction, '🚨 OFFICER PANIC', `**⚠️ OFFICER NEEDS HELP — ALL UNITS RESPOND ⚠️**\nUnit: **${str('callsign')||interaction.user.username}**\nLocation: ${str('location')||'UNKNOWN — PING UNIT IMMEDIATELY'}`, C.red,
          [{ name:'STATUS', value:'🔴 CODE 3 — RESPOND IMMEDIATELY' }]);
      }

      if (sub === 'offduty' || sub === 'onduty') {
        if (!basePath) return reply(interaction, '❌ Error', 'No server found', C.grey);
        const callsign = str('callsign', true);
        const newStatus = sub === 'offduty' ? '10-7' : '10-8';
        const { entries } = await getServerEntries('activeUnits');
        const unit = entries.find(([,u]) => u.callsign?.toLowerCase() === callsign.toLowerCase());
        if (unit) await fbUpdate(`${basePath}/activeUnits/${unit[0]}`, { status:newStatus, lastUpdate:ts() });
        else if (sub === 'onduty') await fbPush(`${basePath}/activeUnits`, { callsign, status:newStatus, officer:interaction.user.username, lastUpdate:ts() });
        return reply(interaction, sub==='offduty'?'⏹️ Off Duty':'▶️ On Duty', `**${callsign}** is now **${newStatus}**`, sub==='offduty'?C.grey:C.green, [{ name:'Time', value:ts() }]);
      }

      if (sub === 'assign') {
        if (!basePath) return reply(interaction, '❌ Error', 'No server found', C.grey);
        const callsign = str('callsign', true);
        const { entries } = await getServerEntries('activeUnits');
        const unit = entries.find(([,u]) => u.callsign?.toLowerCase() === callsign.toLowerCase());
        if (unit) await fbUpdate(`${basePath}/activeUnits/${unit[0]}`, { assignment:str('assignment', true), status:'Busy' });
        return reply(interaction, '📋 Unit Assigned', `**${callsign}** → ${str('assignment', true)}`, C.blue, [{ name:'Dispatcher', value:interaction.user.username }]);
      }

      if (sub === 'transfer') {
        if (!basePath) return reply(interaction, '❌ Error', 'No server found', C.grey);
        const callsign = str('callsign', true);
        const dept = str('department', true);
        const { entries } = await getServerEntries('activeUnits');
        const unit = entries.find(([,u]) => u.callsign?.toLowerCase() === callsign.toLowerCase());
        if (unit) await fbUpdate(`${basePath}/activeUnits/${unit[0]}`, { department:dept });
        return reply(interaction, '🔄 Transfer', `**${callsign}** → **${dept}**`, C.blue, [{ name:'By', value:interaction.user.username }]);
      }
    }

    // ── /leo ──────────────────────────────────────────────────────
    if (cmd === 'leo') {
      if (sub === 'ncic') {
        const name = str('name', true);
        const civResult = await findCivilian(name);
        const { entries: warrantEntries } = await getServerEntries('warrants');
        const { entries: boloEntries } = await getServerEntries('bolos');
        const activeWarrants = warrantEntries.filter(([,w]) => w.subject?.toLowerCase().includes(name.toLowerCase()) && w.active);
        const activeBolos = boloEntries.filter(([,b]) => b.subject?.toLowerCase().includes(name.toLowerCase()) && b.active);

        if (!civResult) return reply(interaction, '🔍 NCIC — No Record', `**${name}** not found in database\nWarrants: ${activeWarrants.length} | BOLOs: ${activeBolos.length}`, activeWarrants.length ? C.red : C.green);
        const [,c] = civResult;
        return reply(interaction, `🔍 NCIC — ${c.name}`, `Full NCIC results`, activeWarrants.length ? C.red : C.blue, [
          { name:'Warrants', value:activeWarrants.length ? `🔴 ${activeWarrants.length} ACTIVE` : '✅ None' },
          { name:'BOLOs', value:activeBolos.length ? `🔴 ${activeBolos.length} ACTIVE` : '✅ None' },
          { name:'License', value:c.licenseStatus||'Valid' },
          { name:'Priors', value:String(c.priorArrests?.length||0) },
          { name:'Gang', value:c.gangAffiliation||'None' },
          { name:'Wanted', value:c.wanted?'⚠️ YES':'✅ No' },
        ]);
      }

      if (sub === 'pursuit') {
        if (basePath) {
          await fbPush(`${basePath}/pursuits`, { callsign:str('callsign', true), vehicle:str('vehicle', true), direction:str('direction')||'Unknown', speed:str('speed')||'Unknown', officer:interaction.user.username, createdAt:ts(), active:true });
        }
        return reply(interaction, '🚔 PURSUIT IN PROGRESS', `Unit: **${str('callsign', true)}**\nVehicle: ${str('vehicle', true)}\nDirection: ${str('direction')||'Unknown'}\nSpeed: ${str('speed')||'Unknown'}`, C.red,
          [{ name:'STATUS', value:'🔴 CODE 3' }, { name:'All Units', value:'Prepare containment' }]);
      }

      if (sub === 'pursuitend') {
        if (basePath) {
          const { entries } = await getServerEntries('pursuits');
          const pursuit = entries.find(([,p]) => p.active);
          if (pursuit) await fbUpdate(`${basePath}/pursuits/${pursuit[0]}`, { active:false, outcome:str('outcome', true), endedBy:interaction.user.username, endedAt:ts() });
        }
        return reply(interaction, '✅ Pursuit Ended', `Outcome: **${str('outcome', true)}**`, C.green, [{ name:'Officer', value:interaction.user.username }]);
      }

      if (sub === 'evidence') {
        if (!basePath) return reply(interaction, '❌ Error', 'No server found', C.grey);
        await fbPush(`${basePath}/evidence`, { caseId:str('caseid', true), item:str('item', true), location:str('location')||'Unknown', loggedBy:interaction.user.username, createdAt:ts() });
        return reply(interaction, '🔬 Evidence Logged', `Case **${str('caseid', true)}** — ${str('item', true)}`, C.blue, [{ name:'Officer', value:interaction.user.username }]);
      }

      if (sub === 'caseload') {
        const { entries } = await getServerEntries('reports');
        const myCases = entries.filter(([,r]) => r.officer?.toLowerCase() === interaction.user.username.toLowerCase() && r.status !== 'Closed');
        return reply(interaction, '📂 Your Cases', myCases.length ? `**${myCases.length}** open case(s)` : 'No open cases', C.blue,
          myCases.slice(0,5).map(([,r]) => ({ name:r.title||'Untitled', value:r.status||'Open', inline:true })));
      }

      if (sub === 'mugshot') {
        const result = await findCivilian(str('name', true));
        if (!result) return reply(interaction, '📸 Not Found', `No record for **${str('name', true)}**`, C.grey);
        const [,c] = result;
        return reply(interaction, `📸 Mugshot — ${c.name}`, c.mugshot ? 'Mugshot on file' : 'No mugshot on file — see redlinecad.app', C.grey, [{ name:'DOB', value:c.dateOfBirth||'Unknown' }, { name:'Height', value:c.height||'Unknown' }, { name:'Weight', value:c.weight||'Unknown' }]);
      }

      if (sub === 'confidential') {
        if (!basePath) return reply(interaction, '❌ Error', 'No server found', C.grey);
        const result = await findCivilian(str('name', true));
        if (!result) return reply(interaction, '❌ Not Found', `No record for **${str('name', true)}**`, C.grey);
        const [key] = result;
        await fbUpdate(`${basePath}/civilians/${key}`, { confidential:true, confidentialBy:interaction.user.username });
        return reply(interaction, '🔒 Flagged Confidential', `Record for **${str('name', true)}** marked CONFIDENTIAL`, C.red, [{ name:'Officer', value:interaction.user.username }]);
      }

      if (sub === 'trackvehicle') {
        if (basePath) {
          const result = await findVehicle(str('plate', true));
          if (result) { const [key] = result; await fbUpdate(`${basePath}/vehicles/${key}`, { surveillance:true, surveillanceBy:interaction.user.username }); }
        }
        return reply(interaction, '👁️ Under Surveillance', `**${str('plate', true).toUpperCase()}** added to tracking`, C.orange, [{ name:'Officer', value:interaction.user.username }]);
      }

      if (sub === 'weapons') {
        const result = await findCivilian(str('name', true));
        if (!result) return reply(interaction, '🔫 Not Found', `No record for **${str('name', true)}**`, C.grey);
        const [,c] = result;
        return reply(interaction, `🔫 Weapons — ${c.name}`, c.weapons?.length ? `${c.weapons.length} weapon(s) registered` : 'No registered weapons', C.orange,
          (c.weapons||[]).slice(0,5).map(w => ({ name:w.type||'Weapon', value:w.serial||'Unknown serial', inline:true })));
      }

      if (sub === 'suspect') {
        if (!basePath) return reply(interaction, '❌ Error', 'No server found', C.grey);
        await fbPush(`${basePath}/suspects`, { name:str('name', true), caseId:str('caseid', true), addedBy:interaction.user.username, addedAt:ts() });
        return reply(interaction, '👤 Suspect Added', `**${str('name', true)}** → Case **${str('caseid', true)}**`, C.red, [{ name:'Officer', value:interaction.user.username }]);
      }

      if (sub === 'caseclose') {
        if (!basePath) return reply(interaction, '❌ Error', 'No server found', C.grey);
        const { entries } = await getServerEntries('reports');
        const rpt = entries.find(([,r]) => r.id?.toLowerCase()===str('caseid',true).toLowerCase() || r.title?.toLowerCase().includes(str('caseid',true).toLowerCase()));
        if (rpt) await fbUpdate(`${basePath}/reports/${rpt[0]}`, { status:'Closed', outcome:str('outcome')||'See CAD', closedBy:interaction.user.username, closedAt:ts() });
        return reply(interaction, '✅ Case Closed', `Case **${str('caseid', true)}** — ${str('outcome')||'Closed'}`, C.green, [{ name:'Officer', value:interaction.user.username }]);
      }

      if (sub === 'roadblock') { if (basePath) await fbPush(`${basePath}/roadblocks`, { location:str('location',true), officer:interaction.user.username, createdAt:ts(), active:true }); return reply(interaction, '🚧 ROADBLOCK', `Established at **${str('location', true)}**`, C.orange, [{ name:'Officer', value:interaction.user.username }]); }
      if (sub === 'perimeter') { if (basePath) await fbPush(`${basePath}/perimeters`, { location:str('location',true), officer:interaction.user.username, createdAt:ts() }); return reply(interaction, '📍 PERIMETER SET', `Around **${str('location', true)}**`, C.red, [{ name:'Officer', value:interaction.user.username }]); }
      if (sub === 'swat') { if (basePath) await fbPush(`${basePath}/swatRequests`, { location:str('location',true), situation:str('situation')||'High-risk', requestedBy:interaction.user.username, createdAt:ts() }); return reply(interaction, '🎯 SWAT REQUESTED', `Location: **${str('location',true)}**\n${str('situation')||'High-risk'}`, C.red, [{ name:'Requesting', value:interaction.user.username }, { name:'STATUS', value:'🔴 Awaiting supervisor approval' }]); }
      if (sub === 'k9') { if (basePath) await fbPush(`${basePath}/k9Deployments`, { location:str('location',true), purpose:str('purpose')||'Search', handler:str('handler')||interaction.user.username, createdAt:ts() }); return reply(interaction, '🐕 K9 DEPLOYED', `**${str('location',true)}**\nPurpose: ${str('purpose')||'Search'}\nHandler: ${str('handler')||interaction.user.username}`, C.blue); }
      if (sub === 'drone') { if (basePath) await fbPush(`${basePath}/droneDeployments`, { location:str('location',true), operator:interaction.user.username, createdAt:ts() }); return reply(interaction, '🚁 DRONE DEPLOYED', `Over **${str('location',true)}**`, C.blue, [{ name:'Operator', value:interaction.user.username }]); }
      if (sub === 'spike') { if (basePath) await fbPush(`${basePath}/spikeStrips`, { location:str('location',true), officer:interaction.user.username, deployedAt:ts() }); return reply(interaction, '⚠️ SPIKE STRIPS', `Deployed at **${str('location',true)}**`, C.orange, [{ name:'Officer', value:interaction.user.username }, { name:'WARNING', value:'Notify ALL units of strip location' }]); }
    }

    // ── /ems ──────────────────────────────────────────────────────
    if (cmd === 'ems') {
      if (sub === 'pcr') {
        if (!basePath) return reply(interaction, '❌ Error', 'No server found', C.grey);
        const pcr = { patient:str('patient',true), complaint:str('complaint')||'Unknown', medic:interaction.user.username, createdAt:ts(), id:id() };
        await fbPush(`${basePath}/pcrs`, pcr);
        return reply(interaction, '📋 PCR Filed', `Patient: **${str('patient',true)}**\nCC: ${str('complaint')||'See CAD'}`, C.green, [{ name:'Medic', value:interaction.user.username }, { name:'CAD', value:'Full PCR in redlinecad.app' }]);
      }
      if (sub === 'vitals') {
        if (!basePath) return reply(interaction, '❌ Error', 'No server found', C.grey);
        const vitals = { patient:str('patient',true), bp:str('bp'), hr:str('hr'), spo2:str('spo2'), rr:str('rr'), gcs:str('gcs'), medic:interaction.user.username, loggedAt:ts() };
        await fbPush(`${basePath}/vitals`, vitals);
        return reply(interaction, '❤️ Vitals Logged', `**${str('patient',true)}**\nBP: ${str('bp')||'?'} | HR: ${str('hr')||'?'} | SpO2: ${str('spo2')||'?'}%\nRR: ${str('rr')||'?'} | GCS: ${str('gcs')||'?'}`, C.green, [{ name:'Medic', value:interaction.user.username }]);
      }
      if (sub === 'hospital') {
        const data = await (basePath ? fbGet(`${basePath}/hospitalBoard`) : Promise.resolve(null));
        const beds = data || { emergency:{ available:12, total:20 }, trauma:{ available:3, total:8 } };
        return reply(interaction, '🏥 Hospital Status', 'Current bed availability', C.green, [
          { name:'Emergency', value:`${beds.emergency?.available||'?'}/${beds.emergency?.total||'?'} beds` },
          { name:'Trauma', value:`${beds.trauma?.available||'?'}/${beds.trauma?.total||'?'} beds` },
          { name:'Live Board', value:'redlinecad.app → Hospital' }
        ]);
      }
      if (sub === 'units') {
        const { entries } = await getServerEntries('activeUnits');
        const ems = entries.filter(([,u]) => u.department?.toLowerCase().includes('ems') || u.callsign?.toLowerCase().startsWith('m') || u.callsign?.toLowerCase().startsWith('ems'));
        return reply(interaction, '🚑 EMS Units', ems.length ? `**${ems.length}** EMS unit(s) active` : 'No EMS units on duty', C.green,
          ems.slice(0,8).map(([,u]) => ({ name:u.callsign||'Unknown', value:u.status||'Unknown', inline:true })));
      }
      if (sub === 'mci') { if (basePath) await fbPush(`${basePath}/mciEvents`, { location:str('location',true), patients:str('patients')||'Unknown', ic:interaction.user.username, createdAt:ts(), active:true }); return reply(interaction, '🚨 MCI DECLARED', `**MASS CASUALTY INCIDENT**\nLocation: **${str('location',true)}**\nEst. patients: ${str('patients')||'Unknown'}`, C.red, [{ name:'IC', value:interaction.user.username }, { name:'STATUS', value:'🔴 ALL EMS RESPOND — MCI Protocol ACTIVE' }]); }
      if (sub === 'mayday') { if (basePath) await fbPush(`${basePath}/maydays`, { name:str('name',true), location:str('location')||'UNKNOWN', air:str('air')||'Unknown', officer:interaction.user.username, createdAt:ts() }); return reply(interaction, '🚨 MAYDAY MAYDAY MAYDAY', `FF: **${str('name',true)}**\nLocation: ${str('location')||'**UNKNOWN**'}\nAir: ${str('air')||'Unknown'}`, C.red, [{ name:'STATUS', value:'🔴 RIT DEPLOY NOW — ALL STOP' }]); }
      if (sub === 'triage') {
        const tag = str('tag', true);
        const colors = { red:C.red, yellow:C.orange, green:C.green, black:C.grey };
        const desc = { red:'⚠️ IMMEDIATE — Life threatening', yellow:'⚠️ DELAYED — Serious but stable', green:'✅ MINOR — Walking wounded', black:'⛔ EXPECTANT — Expectant' };
        if (basePath) await fbPush(`${basePath}/triageTags`, { patient:str('patient',true), tag, medic:interaction.user.username, taggedAt:ts() });
        return reply(interaction, '🏷️ Triage Tag', `**${str('patient',true)}** → **${tag.toUpperCase()}**\n${desc[tag]||''}`, colors[tag]||C.blue, [{ name:'Medic', value:interaction.user.username }]);
      }
      if (sub === 'transport') { if (basePath) await fbPush(`${basePath}/patientTransports`, { patient:str('patient',true), condition:str('condition')||'See PCR', medic:interaction.user.username, transportedAt:ts() }); return reply(interaction, '🚑 Transport', `**${str('patient',true)}** en route\nCondition: ${str('condition')||'See PCR'}`, C.green, [{ name:'Medic', value:interaction.user.username }]); }
      if (sub === 'trauma') { if (basePath) await fbPush(`${basePath}/traumaActivations`, { patient:str('patient',true), eta:str('eta')||'Unknown', medic:interaction.user.username, createdAt:ts() }); return reply(interaction, '🚨 TRAUMA ACTIVATION', `Patient: **${str('patient',true)}**\nETA: ${str('eta')||'Unknown'} min`, C.red, [{ name:'Medic', value:interaction.user.username }]); }
      if (sub === 'cardiac') { if (basePath) await fbPush(`${basePath}/cardiacArrests`, { location:str('location',true), cpr:str('cpr')||'Yes', medic:interaction.user.username, createdAt:ts() }); return reply(interaction, '❤️ CARDIAC ARREST', `Location: **${str('location',true)}**\nCPR: ${str('cpr')||'Yes'}`, C.red, [{ name:'Medic', value:interaction.user.username }]); }
      if (sub === 'overdose') { if (basePath) await fbPush(`${basePath}/overdoseCalls`, { location:str('location',true), substance:str('substance')||'Unknown', medic:interaction.user.username, createdAt:ts() }); return reply(interaction, '💊 OVERDOSE', `Location: **${str('location',true)}**\nSubstance: ${str('substance')||'Unknown'}`, C.orange, [{ name:'Medic', value:interaction.user.username }]); }
      if (sub === 'handoff') { if (basePath) await fbPush(`${basePath}/patientHandoffs`, { patient:str('patient',true), room:str('room')||'ER', medic:interaction.user.username, handoffAt:ts() }); return reply(interaction, '🤝 Handoff', `**${str('patient',true)}** → Room: ${str('room')||'ER'}`, C.green, [{ name:'Medic', value:interaction.user.username }]); }
    }

    // ── /fire ─────────────────────────────────────────────────────
    if (cmd === 'fire') {
      if (sub === 'incident') { if (basePath) await fbPush(`${basePath}/fireIncidents`, { location:str('location',true), type:str('type')||'Structure', alarm:str('alarm')||'1st Alarm', ic:interaction.user.username, createdAt:ts(), active:true, id:id() }); return reply(interaction, '🔥 FIRE INCIDENT', `**WORKING FIRE**\n📍 ${str('location',true)}\nType: ${str('type')||'Structure'}\nAlarm: ${str('alarm')||'1st Alarm'}`, C.red, [{ name:'IC', value:interaction.user.username }, { name:'STATUS', value:'🔴 WORKING FIRE — Units responding' }]); }
      if (sub === 'out') { if (basePath) { const { entries } = await getServerEntries('fireIncidents'); const inc = entries.find(([,i]) => i.active && i.location?.includes(str('location',true))); if (inc) await fbUpdate(`${basePath}/fireIncidents/${inc[0]}`, { active:false, knockdown:ts(), ic:interaction.user.username }); } return reply(interaction, '✅ Fire Out', `**${str('location',true)}** — KNOCKDOWN\nTime: ${ts()}`, C.green, [{ name:'IC', value:interaction.user.username }]); }
      if (sub === 'par') { if (basePath) await fbPush(`${basePath}/parChecks`, { location:str('location',true), ic:interaction.user.username, checkedAt:ts() }); return reply(interaction, '👥 PAR COUNT', `**ALL UNITS ACCOUNT FOR YOURSELVES**\nLocation: **${str('location',true)}**`, C.orange, [{ name:'IC', value:interaction.user.username }]); }
      if (sub === 'hazmat') { if (basePath) await fbPush(`${basePath}/hazmatIncidents`, { location:str('location',true), substance:str('substance')||'Unknown', radius:str('radius')||'Unknown', ic:interaction.user.username, createdAt:ts() }); return reply(interaction, '☣️ HAZMAT DECLARED', `📍 ${str('location',true)}\nSubstance: ${str('substance')||'Unknown'}\nEvac radius: ${str('radius')||'See IC'}`, C.orange, [{ name:'IC', value:interaction.user.username }]); }
      if (sub === 'evacuation') { if (basePath) await fbPush(`${basePath}/evacuations`, { area:str('area',true), reason:str('reason')||'Emergency', ic:interaction.user.username, createdAt:ts() }); return reply(interaction, '🚨 EVACUATION ORDER', `**MANDATORY EVACUATION**\nArea: **${str('area',true)}**\nReason: ${str('reason')||'Emergency'}`, C.red, [{ name:'IC', value:interaction.user.username }]); }
      if (sub === 'rescue') { if (basePath) await fbPush(`${basePath}/rescueOps`, { location:str('location',true), type:str('type')||'Extrication', victims:str('victims')||'Unknown', ic:interaction.user.username, createdAt:ts() }); return reply(interaction, '🦺 RESCUE OPERATION', `Location: **${str('location',true)}**\nType: ${str('type')||'Extrication'}\nVictims: ${str('victims')||'Unknown'}`, C.orange, [{ name:'IC', value:interaction.user.username }]); }
      if (sub === 'exposure') { if (basePath) await fbPush(`${basePath}/exposures`, { number:str('number',true), address:str('address',true), status:str('status')||'Monitoring', ic:interaction.user.username, createdAt:ts() }); return reply(interaction, '🏢 EXPOSURE', `Exposure ${str('number',true)} — **${str('address',true)}**\nStatus: ${str('status')||'Monitoring'}`, C.orange, [{ name:'IC', value:interaction.user.username }]); }
      if (sub === 'waterops') { if (basePath) await fbPush(`${basePath}/waterOps`, { location:str('location',true), source:str('source')||'Hydrant', flow:str('flow')||'Established', engineer:interaction.user.username, createdAt:ts() }); return reply(interaction, '💧 WATER OPS', `Water established at **${str('location',true)}**\nSource: ${str('source')||'Hydrant'}`, C.blue, [{ name:'Engineer', value:interaction.user.username }]); }
    }

    // ── /corrections ──────────────────────────────────────────────
    if (cmd === 'corrections') {
      if (sub === 'booking') { if (basePath) { const booking = { subject:str('name',true), charges:str('charges')||'See CAD', sentence:str('sentence')||'Pending', officer:interaction.user.username, bookedAt:ts(), status:'In Custody', id:id() }; await fbPush(`${basePath}/jailRoster`, booking); } return reply(interaction, '📋 BOOKING', `**${str('name',true)}** booked\nCharges: ${str('charges')||'See CAD'}\nSentence: ${str('sentence')||'Pending'}`, C.red, [{ name:'Officer', value:interaction.user.username }]); }
      if (sub === 'release') { if (basePath) { const { entries } = await getServerEntries('jailRoster'); const prisoner = entries.find(([,p]) => p.subject?.toLowerCase().includes(str('name',true).toLowerCase()) && p.status==='In Custody'); if (prisoner) await fbUpdate(`${basePath}/jailRoster/${prisoner[0]}`, { status:'Released', releasedBy:interaction.user.username, releasedAt:ts(), releaseReason:str('reason')||'Sentence served' }); } return reply(interaction, '🔓 RELEASED', `**${str('name',true)}** released\nReason: ${str('reason')||'Sentence served'}`, C.green, [{ name:'Officer', value:interaction.user.username }]); }
      if (sub === 'sentence') { const { entries } = await getServerEntries('jailRoster'); const prisoner = entries.find(([,p]) => p.subject?.toLowerCase().includes(str('name',true).toLowerCase()) && p.status==='In Custody'); return reply(interaction, '⚖️ Sentence', prisoner ? `**${prisoner[1].subject}** — ${prisoner[1].sentence||'Unknown sentence'}` : `No active incarceration for **${str('name',true)}**`, prisoner ? C.blue : C.grey, prisoner ? [{ name:'Booked', value:prisoner[1].bookedAt||'Unknown' }, { name:'Charges', value:prisoner[1].charges||'See CAD', inline:false }] : []); }
      if (sub === 'addtime') { if (basePath) { const { entries } = await getServerEntries('jailRoster'); const prisoner = entries.find(([,p]) => p.subject?.toLowerCase().includes(str('name',true).toLowerCase()) && p.status==='In Custody'); if (prisoner) await fbUpdate(`${basePath}/jailRoster/${prisoner[0]}`, { sentence:`${prisoner[1].sentence||''} + ${str('time',true)} (${str('reason')||'Disciplinary'})` }); } return reply(interaction, '⏱️ Time Added', `**${str('name',true)}** — +${str('time',true)}\nReason: ${str('reason')||'Disciplinary'}`, C.red, [{ name:'Officer', value:interaction.user.username }]); }
      if (sub === 'cellcheck') { if (basePath) await fbPush(`${basePath}/cellChecks`, { prisoner:str('name',true), status:str('status')||'Clear', officer:interaction.user.username, checkedAt:ts() }); return reply(interaction, '✅ Cell Check', `**${str('name',true)}** — ${str('status')||'Clear'}`, C.green, [{ name:'Officer', value:interaction.user.username }]); }
      if (sub === 'contraband') { if (basePath) await fbPush(`${basePath}/contrabandLogs`, { prisoner:str('name',true), item:str('item',true), officer:interaction.user.username, foundAt:ts() }); return reply(interaction, '⚠️ CONTRABAND', `Found on **${str('name',true)}**: ${str('item',true)}`, C.red, [{ name:'Officer', value:interaction.user.username }]); }
      if (sub === 'transport') { if (basePath) await fbPush(`${basePath}/prisonerTransports`, { prisoner:str('name',true), from:str('from')||'Jail', to:str('to')||'Courthouse', officer:interaction.user.username, transportAt:ts() }); return reply(interaction, '🚌 Transport', `**${str('name',true)}** — ${str('from')||'Jail'} → ${str('to')||'Courthouse'}`, C.blue, [{ name:'Officer', value:interaction.user.username }]); }
      if (sub === 'visitation') { if (basePath) await fbPush(`${basePath}/visitations`, { prisoner:str('name',true), visitor:str('visitor',true), officer:interaction.user.username, visitAt:ts() }); return reply(interaction, '👥 Visitation', `**${str('name',true)}** — Visitor: ${str('visitor',true)}`, C.blue, [{ name:'Officer', value:interaction.user.username }]); }
      if (sub === 'prisoner') { const { entries } = await getServerEntries('jailRoster'); const prisoner = entries.find(([,p]) => p.subject?.toLowerCase().includes(str('name',true).toLowerCase())); return reply(interaction, '🔍 Prisoner Status', prisoner ? `**${prisoner[1].subject}** — ${prisoner[1].status||'Unknown'}` : `No record for **${str('name',true)}**`, prisoner ? C.blue : C.grey, prisoner ? [{ name:'Status', value:prisoner[1].status||'Unknown' }, { name:'Charges', value:prisoner[1].charges||'See CAD', inline:false }] : []); }
    }

    // ── /judicial ─────────────────────────────────────────────────
    if (cmd === 'judicial') {
      if (sub === 'sentence') { if (basePath) { await fbPush(`${basePath}/sentences`, { subject:str('name',true), sentence:str('sentence',true), charges:str('charges')||'See CAD', judge:interaction.user.username, sentencedAt:ts() }); const civResult = await findCivilian(str('name',true)); if (civResult) { const [key] = civResult; await fbUpdate(`${basePath}/civilians/${key}`, { sentence:str('sentence',true) }); } } return reply(interaction, '⚖️ Sentence Issued', `**${str('name',true)}** — ${str('sentence',true)}`, C.red, [{ name:'Judge', value:interaction.user.username }]); }
      if (sub === 'verdict') { if (basePath) await fbPush(`${basePath}/verdicts`, { subject:str('name',true), verdict:str('verdict',true), judge:interaction.user.username, issuedAt:ts() }); return reply(interaction, '⚖️ VERDICT', `**${str('name',true)}** — **${str('verdict',true).toUpperCase()}**`, str('verdict',true)==='guilty'?C.red:C.green, [{ name:'Judge', value:interaction.user.username }]); }
      if (sub === 'bail') { if (basePath) await fbPush(`${basePath}/bailOrders`, { subject:str('name',true), amount:num('amount',true), conditions:str('conditions')||'Standard', judge:interaction.user.username, issuedAt:ts() }); return reply(interaction, '💰 Bail Set', `**${str('name',true)}** — $${num('amount',true).toLocaleString()}\nConditions: ${str('conditions')||'Standard'}`, C.blue, [{ name:'Judge', value:interaction.user.username }]); }
      if (sub === 'plea') { if (basePath) await fbPush(`${basePath}/pleas`, { subject:str('name',true), plea:str('plea',true), judge:interaction.user.username, enteredAt:ts() }); return reply(interaction, '📋 Plea Entered', `**${str('name',true)}** — ${str('plea',true)}`, C.blue, [{ name:'Judge', value:interaction.user.username }]); }
      if (sub === 'courtdate') { if (basePath) await fbPush(`${basePath}/courtDates`, { subject:str('name',true), date:str('date',true), room:str('room')||'See CAD', judge:interaction.user.username, scheduledAt:ts() }); return reply(interaction, '📅 Court Date', `**${str('name',true)}** — ${str('date',true)}\nRoom: ${str('room')||'See CAD'}`, C.blue, [{ name:'Judge', value:interaction.user.username }]); }
      if (sub === 'expunge') { if (basePath) { const civResult = await findCivilian(str('name',true)); if (civResult) { const [key] = civResult; await fbUpdate(`${basePath}/civilians/${key}`, { priorArrests:[], wanted:false, warrants:[], sentence:'', expunged:true }); } } return reply(interaction, '🗑️ Expunged', `Record expunged for **${str('name',true)}**`, C.green, [{ name:'Judge', value:interaction.user.username }]); }
      if (sub === 'attorney') { if (basePath) await fbPush(`${basePath}/attorneys`, { defendant:str('name',true), attorney:str('attorney',true), assignedBy:interaction.user.username, assignedAt:ts() }); return reply(interaction, '👔 Attorney Assigned', `**${str('attorney',true)}** → **${str('name',true)}**`, C.blue, [{ name:'Judge', value:interaction.user.username }]); }
      if (sub === 'charge') { if (basePath) { const civResult = await findCivilian(str('name',true)); if (civResult) { const [key, c] = civResult; const charges = c.charges || []; charges.push(str('charge',true)); await fbUpdate(`${basePath}/civilians/${key}`, { charges }); } } return reply(interaction, '⚖️ Charge Added', `**${str('name',true)}** — ${str('charge',true)}`, C.red, [{ name:'Officer', value:interaction.user.username }]); }
    }

    // ── /economy ──────────────────────────────────────────────────
    if (cmd === 'economy') {
      if (sub === 'balance') {
        const player = str('player', true);
        const result = await findCivilian(player);
        if (!result) return reply(interaction, '💰 Not Found', `No economy record for **${player}**`, C.grey);
        const [,c] = result;
        return reply(interaction, `💰 Balance — ${c.name}`, `Current bank balance`, C.green, [{ name:'Cash', value:`$${(c.cashBalance||0).toLocaleString()}` }, { name:'Bank', value:`$${(c.bankBalance||0).toLocaleString()}` }, { name:'Total', value:`$${((c.cashBalance||0)+(c.bankBalance||0)).toLocaleString()}` }]);
      }
      if (sub === 'pay' || sub === 'transfer') {
        if (!basePath) return reply(interaction, '❌ Error', 'No server found', C.grey);
        const player = str('player', true);
        const amount = num('amount', true);
        const result = await findCivilian(player);
        if (result) { const [key, c] = result; await fbUpdate(`${basePath}/civilians/${key}`, { bankBalance:(c.bankBalance||0)+amount }); await fbPush(`${basePath}/transactions`, { from:interaction.user.username, to:player, amount, note:str('note')||'Transfer', createdAt:ts() }); }
        return reply(interaction, '💸 Payment Sent', `$${amount.toLocaleString()} → **${player}**`, C.green, [{ name:'From', value:interaction.user.username }]);
      }
      if (sub === 'salary') {
        const player = str('player')||interaction.user.username;
        const result = await findCivilian(player);
        if (!result) return reply(interaction, '📋 Not Found', `No salary record for **${player}**`, C.grey);
        const [,c] = result;
        return reply(interaction, `📋 Salary — ${c.name}`, 'Payroll information', C.green, [{ name:'Job', value:c.occupation||'Unemployed' }, { name:'Salary', value:`$${(c.salary||0).toLocaleString()}/hr` }, { name:'CAD', value:'redlinecad.app → Payroll' }]);
      }
      if (sub === 'citybudget') {
        const budget = basePath ? await fbGet(`${basePath}/cityBudget`) : null;
        return reply(interaction, '🏙️ City Budget', 'City treasury overview', C.gold, [{ name:'Treasury', value:`$${(budget?.total||0).toLocaleString()}` }, { name:'Revenue', value:`$${(budget?.revenue||0).toLocaleString()}/day` }, { name:'Expenses', value:`$${(budget?.expenses||0).toLocaleString()}/day` }]);
      }
      if (sub === 'tax') { const result = await findCivilian(str('player')||interaction.user.username); return reply(interaction, '🧾 Tax Status', result ? `Tax info for **${result[1].name}**` : 'No tax record found', C.gold, result ? [{ name:'Tax Rate', value:`${result[1].taxRate||'15'}%` }, { name:'Owed', value:`$${(result[1].taxOwed||0).toLocaleString()}`, inline:true }] : []); }
      if (sub === 'loan') { const result = await findCivilian(str('player')||interaction.user.username); return reply(interaction, '💳 Loans', result ? `Loan info for **${result[1].name}**` : 'No record', C.orange, result ? [{ name:'Active Loans', value:result[1].loans?String(result[1].loans.length):'None' }] : []); }
      if (sub === 'stocks') { const stocks = basePath ? await fbGet(`${basePath}/stocks`) : null; return reply(interaction, '📈 Stock Market', stocks ? 'Current prices' : 'No stock data — see redlinecad.app', C.green, stocks ? Object.entries(stocks).slice(0,5).map(([k,v]) => ({ name:k, value:`$${v.price||0}`, inline:true })) : []); }
      if (sub === 'insurance') { const result = await findCivilian(str('player')||interaction.user.username); return reply(interaction, '🛡️ Insurance', result ? `Policies for **${result[1].name}**` : 'No record', C.blue, result ? [{ name:'Health', value:result[1].healthInsurance||'None' }, { name:'Vehicle', value:result[1].vehicleInsurance||'None' }] : []); }
      if (sub === 'lottery') { const lottery = basePath ? await fbGet(`${basePath}/lottery`) : null; return reply(interaction, '🎰 Lottery', 'Current jackpot info', C.gold, [{ name:'Jackpot', value:`$${(lottery?.jackpot||0).toLocaleString()}` }, { name:'Next Draw', value:lottery?.nextDraw||'See redlinecad.app' }]); }
    }

    // ── /admin ────────────────────────────────────────────────────
    if (cmd === 'admin') {
      if (sub === 'announce') { if (basePath) await fbPush(`${basePath}/announcements`, { message:str('message',true), by:interaction.user.username, createdAt:ts() }); return reply(interaction, '📢 ANNOUNCEMENT', str('message',true), C.red, [{ name:'From', value:interaction.user.username }, { name:'Time', value:ts() }]); }
      if (sub === 'serverinfo') {
        const [units, calls, civs, bolos] = await Promise.all([getServerData('activeUnits'), getServerData('activeCalls'), getServerData('civilians'), getServerData('bolos')]);
        return reply(interaction, 'ℹ️ Server Info', 'Live RedLineCAD statistics', C.blue, [
          { name:'Active Units', value:String(units.filter(u=>u.status!=='10-7').length) },
          { name:'Active Calls', value:String(calls.filter(c=>c.status!=='Closed').length) },
          { name:'Civilians', value:String(civs.length) },
          { name:'Active BOLOs', value:String(bolos.filter(b=>b.active).length) },
          { name:'CAD', value:'redlinecad.app' }
        ]);
      }
      if (sub === 'kick') { if (basePath) await fbPush(`${basePath}/adminActions`, { type:'kick', target:str('player',true), reason:str('reason')||'Not specified', by:interaction.user.username, createdAt:ts() }); return reply(interaction, '👟 Removed', `**${str('player',true)}** removed\nReason: ${str('reason')||'Not specified'}`, C.orange, [{ name:'Admin', value:interaction.user.username }]); }
      if (sub === 'warn') { if (basePath) await fbPush(`${basePath}/warnings`, { target:str('player',true), reason:str('reason',true), by:interaction.user.username, createdAt:ts() }); return reply(interaction, '⚠️ Warning', `**${str('player',true)}** warned\n${str('reason',true)}`, C.orange, [{ name:'Admin', value:interaction.user.username }]); }
      if (sub === 'suspend') { if (basePath) await fbPush(`${basePath}/suspensions`, { target:str('player',true), duration:str('duration',true), reason:str('reason',true), by:interaction.user.username, createdAt:ts() }); return reply(interaction, '⏸️ SUSPENDED', `**${str('player',true)}** — ${str('duration',true)}\n${str('reason',true)}`, C.red, [{ name:'Admin', value:interaction.user.username }]); }
      if (sub === 'promote') { if (basePath) await fbPush(`${basePath}/promotions`, { target:str('player',true), rank:str('rank',true), by:interaction.user.username, createdAt:ts() }); return reply(interaction, '🏅 PROMOTION', `**${str('player',true)}** → **${str('rank',true)}**`, C.gold, [{ name:'Approved by', value:interaction.user.username }]); }
      if (sub === 'demote') { if (basePath) await fbPush(`${basePath}/demotions`, { target:str('player',true), rank:str('rank',true), by:interaction.user.username, createdAt:ts() }); return reply(interaction, '⬇️ Demotion', `**${str('player',true)}** → **${str('rank',true)}**`, C.orange, [{ name:'By', value:interaction.user.username }]); }
      if (sub === 'eas') { if (basePath) await fbPush(`${basePath}/easAlerts`, { message:str('message',true), by:interaction.user.username, createdAt:ts() }); return reply(interaction, '📡 EMERGENCY BROADCAST', `⚠️ **${str('message',true)}** ⚠️`, C.red, [{ name:'Source', value:'RedLineCAD EAS' }, { name:'By', value:interaction.user.username }]); }
      if (sub === 'audit') {
        const { entries } = await getServerEntries('adminActions');
        const player = str('player');
        const actions = player ? entries.filter(([,a]) => a.target?.toLowerCase().includes(player.toLowerCase())) : entries;
        return reply(interaction, '📜 Audit Log', player ? `Actions for **${player}**` : 'Recent admin actions', C.blue, actions.slice(0,8).map(([,a]) => ({ name:`${a.type||'Action'} — ${a.target||'Server'}`, value:`${a.reason||a.message||'See CAD'} — ${a.by||'Admin'}`, inline:false })));
      }
      if (sub === 'weather') { if (basePath) await fbSet(`${basePath}/settings/weather`, str('weather',true)); return reply(interaction, '🌤️ Weather Updated', `**${str('weather',true)}**`, C.blue, [{ name:'Set by', value:interaction.user.username }]); }
      if (sub === 'event') { if (basePath) await fbPush(`${basePath}/events`, { title:str('title',true), description:str('description')||'', date:str('date')||'TBD', host:interaction.user.username, createdAt:ts() }); return reply(interaction, '🎉 EVENT', `**${str('title',true)}**\n${str('description')||''}\nDate: ${str('date')||'TBD'}`, C.purple, [{ name:'Host', value:interaction.user.username }]); }
      if (sub === 'snapshot') { if (basePath) await fbPush(`${basePath}/snapshots`, { createdBy:interaction.user.username, createdAt:ts() }); return reply(interaction, '💾 Snapshot', `Backup created at ${ts()}`, C.green, [{ name:'By', value:interaction.user.username }]); }
      if (sub === 'roster') {
        const { entries } = await getServerEntries('activeUnits');
        const dept = str('department');
        const units = dept ? entries.filter(([,u]) => u.department?.toLowerCase().includes(dept.toLowerCase())) : entries;
        return reply(interaction, `👥 Roster${dept?` — ${dept}`:''}`, `${units.length} unit(s)`, C.blue, units.slice(0,10).map(([,u]) => ({ name:u.callsign||'Unknown', value:`${u.department||'Unknown'} — ${u.status||'Unknown'}`, inline:true })));
      }
      if (sub === 'commend') { if (basePath) await fbPush(`${basePath}/commendations`, { target:str('player',true), award:str('award',true), reason:str('reason',true), by:interaction.user.username, createdAt:ts() }); return reply(interaction, '🏅 COMMENDATION', `**${str('player',true)}** — ${str('award',true)}\n${str('reason',true)}`, C.gold, [{ name:'By', value:interaction.user.username }]); }
      if (sub === 'abusereport') { if (basePath) await fbPush(`${basePath}/abuseReports`, { target:str('player',true), reason:str('reason',true), by:interaction.user.username, createdAt:ts() }); return reply(interaction, '🚩 Abuse Report', `**${str('player',true)}**\n${str('reason',true)}`, C.red, [{ name:'By', value:interaction.user.username }, { name:'Action', value:'Admins will review shortly' }]); }
    }

    // ── /stats ────────────────────────────────────────────────────
    if (cmd === 'stats') {
      if (sub === 'mystats') {
        const user = interaction.user.username;
        const [arrests, citations, reports] = await Promise.all([getServerData('arrests'), getServerData('citations'), getServerData('reports')]);
        return reply(interaction, `📊 Stats — ${user}`, 'Your activity this session', C.blue, [
          { name:'Arrests', value:String(arrests.filter(a=>a.officer===user).length) },
          { name:'Citations', value:String(citations.filter(c=>c.issuedBy===user).length) },
          { name:'Reports', value:String(reports.filter(r=>r.officer===user).length) },
          { name:'CAD', value:'redlinecad.app → Profile' }
        ]);
      }
      if (sub === 'leaderboard') {
        const arrests = await getServerData('arrests');
        const counts = {};
        arrests.forEach(a => { counts[a.officer] = (counts[a.officer]||0)+1; });
        const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5);
        return reply(interaction, '🏆 Leaderboard', 'Top officers by arrests', C.gold, sorted.map(([name, count], i) => ({ name:`#${i+1} ${name}`, value:`${count} arrest(s)`, inline:true })));
      }
      if (sub === 'arrests') {
        const arrests = await getServerData('arrests');
        const counts = {};
        arrests.forEach(a => { counts[a.officer] = (counts[a.officer]||0)+1; });
        const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5);
        return reply(interaction, '🔒 Arrest Stats', `Total arrests: **${arrests.length}**`, C.blue, sorted.map(([n,c]) => ({ name:n, value:`${c} arrest(s)`, inline:true })));
      }
      if (sub === 'citations') {
        const cits = await getServerData('citations');
        const counts = {};
        cits.forEach(c => { counts[c.issuedBy] = (counts[c.issuedBy]||0)+1; });
        const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5);
        return reply(interaction, '📄 Citation Stats', `Total citations: **${cits.length}**`, C.blue, sorted.map(([n,c]) => ({ name:n, value:`${c} citation(s)`, inline:true })));
      }
      if (sub === 'activity') {
        const player = str('player')||interaction.user.username;
        const [arrests, citations, reports] = await Promise.all([getServerData('arrests'), getServerData('citations'), getServerData('reports')]);
        return reply(interaction, `📈 Activity — ${player}`, 'Full activity report', C.blue, [
          { name:'Arrests', value:String(arrests.filter(a=>a.officer?.includes(player)).length) },
          { name:'Citations', value:String(citations.filter(c=>c.issuedBy?.includes(player)).length) },
          { name:'Reports', value:String(reports.filter(r=>r.officer?.includes(player)).length) },
        ]);
      }
      if (sub === 'department') {
        const dept = str('department')||'All';
        const { entries } = await getServerEntries('activeUnits');
        const units = dept==='All' ? entries : entries.filter(([,u]) => u.department?.toLowerCase().includes(dept.toLowerCase()));
        return reply(interaction, `🏢 Department — ${dept}`, `${units.length} unit(s)`, C.blue, [{ name:'On Duty', value:String(units.filter(([,u])=>u.status!=='10-7').length) }, { name:'Off Duty', value:String(units.filter(([,u])=>u.status==='10-7').length) }]);
      }
      if (sub === 'economy') {
        const civs = await getServerData('civilians');
        const total = civs.reduce((sum, c) => sum + (c.bankBalance||0) + (c.cashBalance||0), 0);
        return reply(interaction, '💰 Economy Stats', 'Server economy overview', C.green, [{ name:'Total Money in Circulation', value:`$${total.toLocaleString()}` }, { name:'Players Tracked', value:String(civs.length) }]);
      }
      if (sub === 'crimestat') {
        const [arrests, citations, bolos] = await Promise.all([getServerData('arrests'), getServerData('citations'), getServerData('bolos')]);
        return reply(interaction, '🔍 Crime Stats', 'City-wide crime statistics', C.orange, [{ name:'Total Arrests', value:String(arrests.length) }, { name:'Total Citations', value:String(citations.length) }, { name:'Active BOLOs', value:String(bolos.filter(b=>b.active).length) }]);
      }
    }

    // ── /city ─────────────────────────────────────────────────────
    if (cmd === 'city') {
      if (sub === 'weather') { const w = basePath ? await fbGet(`${basePath}/settings/weather`) : null; return reply(interaction, '🌤️ Weather', w || 'No weather set — check redlinecad.app', C.blue); }
      if (sub === 'time') { return reply(interaction, '🕐 Server Time', `**${ts()}**`, C.blue); }
      if (sub === 'news') { const news = basePath ? await getServerData('newspaper') : []; return reply(interaction, '📰 City News', news.length ? 'Latest from the city paper' : 'No recent news — redlinecad.app → Newspaper', C.blue, news.slice(0,3).map(n => ({ name:n.title||'Article', value:n.summary||'See CAD', inline:false }))); }
      if (sub === 'mayor') { if (basePath) await fbPush(`${basePath}/mayorStatements`, { message:str('message',true), by:interaction.user.username, createdAt:ts() }); return reply(interaction, '🏛️ MAYORAL ANNOUNCEMENT', str('message',true), C.gold, [{ name:'Office of the Mayor', value:interaction.user.username }]); }
      if (sub === 'ordinance') { if (basePath) await fbPush(`${basePath}/ordinances`, { title:str('title',true), description:str('description',true), effective:str('date')||'Immediately', by:interaction.user.username, createdAt:ts() }); return reply(interaction, '📜 NEW ORDINANCE', `**${str('title',true)}**\n${str('description',true)}\nEffective: ${str('date')||'Immediately'}`, C.gold, [{ name:'Signed by', value:interaction.user.username }]); }
      if (sub === 'curfew') { if (basePath) await fbSet(`${basePath}/settings/curfew`, { start:str('start',true), end:str('end',true), reason:str('reason')||'Public safety', by:interaction.user.username }); return reply(interaction, '🌙 CURFEW', `${str('start',true)} – ${str('end',true)}\n${str('reason')||'Public safety'}`, C.red, [{ name:'Signed by', value:interaction.user.username }]); }
      if (sub === 'amber') { if (basePath) await fbPush(`${basePath}/amberAlerts`, { name:str('name',true), age:str('age')||'Unknown', location:str('location',true), vehicle:str('vehicle')||'Unknown', by:interaction.user.username, createdAt:ts() }); return reply(interaction, '🚨 AMBER ALERT', `Child: **${str('name',true)}**\nAge: ${str('age')||'?'} · Last seen: ${str('location',true)}\nVehicle: ${str('vehicle')||'Unknown'}`, C.red, [{ name:'CONTACT', value:'911 with any information' }]); }
      if (sub === 'silver') { if (basePath) await fbPush(`${basePath}/silverAlerts`, { name:str('name',true), location:str('location',true), description:str('description')||'Unknown', by:interaction.user.username, createdAt:ts() }); return reply(interaction, '🚨 SILVER ALERT', `**${str('name',true)}**\nLast seen: ${str('location',true)}\n${str('description')||''}`, C.orange, [{ name:'CONTACT', value:'911 with any information' }]); }
      if (sub === 'missing') { if (basePath) await fbPush(`${basePath}/missingPersons`, { name:str('name',true), age:str('age')||'Unknown', location:str('location',true), description:str('description')||'', by:interaction.user.username, createdAt:ts() }); return reply(interaction, '👤 MISSING PERSON', `**${str('name',true)}**\nAge: ${str('age')||'?'} · Last seen: ${str('location',true)}`, C.orange, [{ name:'Filed by', value:interaction.user.username }]); }
      if (sub === 'found') {
        if (basePath) {
          const { entries } = await getServerEntries('missingPersons');
          const person = entries.find(([,p]) => p.name?.toLowerCase().includes(str('name',true).toLowerCase()));
          if (person) await fbUpdate(`${basePath}/missingPersons/${person[0]}`, { status:'Found', condition:str('condition')||'Safe', foundBy:interaction.user.username, foundAt:ts() });
        }
        return reply(interaction, '✅ Person Located', `**${str('name',true)}** — ${str('condition')||'Safe'}`, C.green, [{ name:'Officer', value:interaction.user.username }]);
      }
      if (sub === 'press') { if (basePath) await fbPush(`${basePath}/pressReleases`, { message:str('message',true), by:interaction.user.username, createdAt:ts() }); return reply(interaction, '📰 PRESS RELEASE', `**Official LSPD Statement**\n${str('message',true)}`, C.blue, [{ name:'By', value:interaction.user.username }]); }
      if (sub === 'seizure') { if (basePath) await fbPush(`${basePath}/assetSeizures`, { subject:str('name',true), assets:str('assets',true), officer:interaction.user.username, seizedAt:ts() }); return reply(interaction, '💰 Asset Seizure', `**${str('name',true)}** — ${str('assets',true)}`, C.red, [{ name:'Officer', value:interaction.user.username }]); }
    }

    // ── /rp ───────────────────────────────────────────────────────
    if (cmd === 'rp') {
      if (sub === 'me')          return reply(interaction, '🎭 RP Action', `*${interaction.user.username} ${str('action',true)}*`, C.purple);
      if (sub === 'do')          return reply(interaction, '🌍 Scene', `*${str('description',true)}*`, C.purple, [{ name:'Narrator', value:interaction.user.username }]);
      if (sub === 'ooc')         return reply(interaction, '💬 OOC', `**${interaction.user.username}:** ${str('message',true)}`, C.grey);
      if (sub === 'roll')        { const r=Math.floor(Math.random()*100)+1; return reply(interaction, '🎲 Roll', `**${interaction.user.username}** rolled **${r}/100**`, r>=90?C.green:r<=10?C.red:C.blue, [{ name:'Outcome', value:r>=90?'🎉 Critical Success!':r<=10?'💀 Critical Fail':r>=60?'✅ Success':'⚠️ Partial' }]); }
      if (sub === 'coin')        { const h=Math.random()>0.5; return reply(interaction, '🪙 Coin Flip', `**${h?'HEADS':'TAILS'}**`, h?C.gold:C.grey); }
      if (sub === '8ball')       { const a=['Yes, definitely.','No way.','Ask again later.','Signs point to yes.','My sources say no.','Without a doubt.','Very doubtful.','It is certain.','Cannot predict now.','Outlook not so good.']; return reply(interaction,'🎱 Magic 8-Ball',`*${str('question',true)}*\n\n**${a[Math.floor(Math.random()*a.length)]}**`,C.purple); }
      if (sub === 'wanted')      { if (basePath) await fbPush(`${basePath}/wantedPosters`, { name:str('name',true), description:str('description')||'Armed and dangerous', reward:str('reward')||'Unknown', by:interaction.user.username, createdAt:ts() }); return reply(interaction, '🚨 WANTED POSTER', `⚠️ **WANTED** ⚠️\n**${str('name',true)}**\n${str('description')||'Armed and dangerous'}\nReward: **$${str('reward')||'See Dispatcher'}**`, C.red, [{ name:'Issued by', value:interaction.user.username }]); }
      if (sub === 'bounty')      { if (basePath) await fbPush(`${basePath}/bounties`, { name:str('name',true), amount:str('amount',true), reason:str('reason')||'Not specified', by:interaction.user.username, createdAt:ts() }); return reply(interaction, '💰 BOUNTY', `**${str('name',true)}** — $${str('amount',true)}\n${str('reason')||'Not specified'}`, C.gold, [{ name:'Posted by', value:interaction.user.username }]); }
      if (sub === 'scenario')    return reply(interaction, '🎭 RP Scenario', `Generating ${str('type')||'random'} scenario...\nUse /rp me to perform actions in the scene`, C.purple);
      if (sub === 'lore')        { const lore = basePath ? await getServerData('newspaper') : []; return reply(interaction, '📖 City Chronicle', lore.length ? lore[0].content||'See redlinecad.app → Chronicle' : 'No lore entries yet', C.purple); }
      if (sub === 'backstory')   return reply(interaction, '📖 Backstory', `Generating for **${str('name',true)}**\nView full AI tools at redlinecad.app → AI Tools`, C.purple);
      if (sub === 'heist')       { if (basePath) await fbPush(`${basePath}/heistAlerts`, { location:str('location',true), type:str('type')||'Unknown', reportedBy:interaction.user.username, createdAt:ts() }); return reply(interaction, '🔫 HEIST IN PROGRESS', `Location: **${str('location',true)}**\nType: ${str('type')||'Unknown'}`, C.red, [{ name:'Alert', value:'All available units respond' }]); }
      if (sub === 'tryaction')   { const s=Math.random()>0.4; return reply(interaction, '🎲 Action', `**${interaction.user.username}** tries: *${str('action',true)}*\n\n**${s?'✅ SUCCESS':'❌ FAILED'}**`, s?C.green:C.red); }
    }

    // ── /report ───────────────────────────────────────────────────
    if (cmd === 'report') {
      const reportBase = { officer:interaction.user.username, createdAt:ts(), status:'Pending Review', id:id() };
      if (sub === 'incident') { if (basePath) await fbPush(`${basePath}/reports`, { ...reportBase, type:'Incident', title:str('title',true), location:str('location',true), description:str('description')||'See CAD' }); return reply(interaction, '📋 Incident Report Filed', `**${str('title',true)}**\n📍 ${str('location',true)}`, C.blue, [{ name:'Officer', value:interaction.user.username }, { name:'Status', value:'Pending Review' }]); }
      if (sub === 'crash') { if (basePath) await fbPush(`${basePath}/reports`, { ...reportBase, type:'MVA', location:str('location',true), vehicles:str('vehicles')||'Unknown', injuries:str('injuries')||'None' }); return reply(interaction, '🚗 Crash Report Filed', `📍 ${str('location',true)}\nVehicles: ${str('vehicles')||'Unknown'}`, C.orange, [{ name:'Officer', value:interaction.user.username }]); }
      if (sub === 'missing') { if (basePath) await fbPush(`${basePath}/reports`, { ...reportBase, type:'Missing Person', subject:str('name',true), lastSeen:str('location')||'Unknown' }); return reply(interaction, '👤 Missing Person Report', `**${str('name',true)}**\nLast seen: ${str('location')||'Unknown'}`, C.orange, [{ name:'Filed by', value:interaction.user.username }]); }
      if (sub === 'dui') { if (basePath) await fbPush(`${basePath}/reports`, { ...reportBase, type:'DUI', subject:str('subject',true), bac:str('bac')||'Pending', location:str('location')||'Unknown' }); return reply(interaction, '🍺 DUI Report Filed', `Subject: **${str('subject',true)}**\nBAC: ${str('bac')||'Pending'}`, C.red, [{ name:'Officer', value:interaction.user.username }]); }
      if (sub === 'useofforce') { if (basePath) await fbPush(`${basePath}/uofReports`, { ...reportBase, subject:str('subject',true), forceType:str('force',true) }); return reply(interaction, '⚠️ Use of Force Report', `Subject: **${str('subject',true)}**\nForce: ${str('force',true)}\n⚠️ Supervisor review required`, C.red, [{ name:'Officer', value:interaction.user.username }]); }
      if (sub === 'supplement') { if (basePath) { const { entries } = await getServerEntries('reports'); const rpt = entries.find(([,r]) => r.id===str('caseid',true)); if (rpt) { const sups = rpt[1].supplements||[]; sups.push({ by:interaction.user.username, addedAt:ts() }); await fbUpdate(`${basePath}/reports/${rpt[0]}`, { supplements:sups }); } } return reply(interaction, '➕ Supplement Filed', `Supplement added to case **${str('caseid',true)}**`, C.blue, [{ name:'Officer', value:interaction.user.username }]); }
      if (sub === 'status') {
        const { entries } = await getServerEntries('reports');
        const myReports = entries.filter(([,r]) => r.officer?.toLowerCase()===interaction.user.username.toLowerCase());
        return reply(interaction, '📋 My Reports', `${myReports.length} report(s) found`, C.blue, myReports.slice(0,5).map(([,r]) => ({ name:r.type||'Report', value:r.status||'Unknown', inline:true })));
      }
    }

    // ── /license ──────────────────────────────────────────────────
    if (cmd === 'license') {
      if (sub === 'check') { const result = await findCivilian(str('name',true)); if (!result) return reply(interaction,'📋 Not Found',`No record for **${str('name',true)}**`,C.grey); const [,c]=result; return reply(interaction,`📋 License — ${c.name}`,'License status on file',C.blue,[{name:'DL Status',value:c.licenseStatus||'Valid'},{name:'Points',value:String(c.licensePoints||0)},{name:'Class',value:c.licenseClass||'Class C'},{name:'Expires',value:c.licenseExpiry||'Unknown'}]); }
      if (sub === 'points') { const result = await findCivilian(str('name',true)); if (!result) return reply(interaction,'📊 Not Found',`No record for **${str('name',true)}**`,C.grey); const [,c]=result; const pts=c.licensePoints||0; return reply(interaction,`📊 Points — ${c.name}`,`**${pts}/18 points**\n${pts>=18?'⛔ REVOKED':pts>=12?'🚫 SUSPENDED':pts>=8?'⚠️ WARNING':'✅ Clear'}`,pts>=12?C.red:pts>=8?C.orange:C.green,[{name:'Points',value:String(pts)},{name:'Status',value:pts>=18?'Revoked':pts>=12?'Suspended':pts>=8?'Warning':'Clear'}]); }
      if (sub === 'suspend') { if (!basePath) return reply(interaction,'❌ Error','No server found',C.grey); const result=await findCivilian(str('name',true)); if (!result) return reply(interaction,'❌ Not Found',`No record for **${str('name',true)}**`,C.grey); const [key]=result; await fbUpdate(`${basePath}/civilians/${key}`,{licenseStatus:'Suspended',licenseSuspendedBy:interaction.user.username,licenseSuspendedAt:ts(),licenseSuspendReason:str('reason')||'Points'}); return reply(interaction,'⛔ License Suspended',`**${str('name',true)}** — ${str('duration')||'30 days'}`,C.red,[{name:'Officer',value:interaction.user.username}]); }
      if (sub === 'reinstate') { if (!basePath) return reply(interaction,'❌ Error','No server found',C.grey); const result=await findCivilian(str('name',true)); if (!result) return reply(interaction,'❌ Not Found',`No record`,C.grey); const [key]=result; await fbUpdate(`${basePath}/civilians/${key}`,{licenseStatus:'Valid',licensePoints:0,licenseReinstatedBy:interaction.user.username}); return reply(interaction,'✅ License Reinstated',`**${str('name',true)}** — DL now valid`,C.green,[{name:'Officer',value:interaction.user.username}]); }
      if (sub === 'revoke') { if (!basePath) return reply(interaction,'❌ Error','No server found',C.grey); const result=await findCivilian(str('name',true)); if (!result) return reply(interaction,'❌ Not Found',`No record`,C.grey); const [key]=result; await fbUpdate(`${basePath}/civilians/${key}`,{licenseStatus:'Revoked',licenseRevokedBy:interaction.user.username,licenseRevokedAt:ts()}); return reply(interaction,'⛔ License REVOKED',`**${str('name',true)}** — DL permanently revoked`,C.red,[{name:'Officer',value:interaction.user.username}]); }
      if (sub === 'specialty') { const result=await findCivilian(str('name',true)); if (!result) return reply(interaction,'🎫 Not Found',`No record for **${str('name',true)}**`,C.grey); const [,c]=result; return reply(interaction,`🎫 Specialty Licenses — ${c.name}`,c.specialtyLicenses?.length?`${c.specialtyLicenses.length} license(s)`:'No specialty licenses',C.blue,(c.specialtyLicenses||[]).map(l=>({name:l.type||'License',value:l.status||'Valid',inline:true}))); }
      if (sub === 'issue') { if (!basePath) return reply(interaction,'❌ Error','No server found',C.grey); const result=await findCivilian(str('name',true)); if (!result) return reply(interaction,'❌ Not Found',`No record`,C.grey); const [key,c]=result; const specs=c.specialtyLicenses||[]; specs.push({type:str('type',true),issuedBy:interaction.user.username,issuedAt:ts(),status:'Valid'}); await fbUpdate(`${basePath}/civilians/${key}`,{specialtyLicenses:specs}); return reply(interaction,'✅ License Issued',`**${str('type',true)}** issued to **${str('name',true)}**`,C.green,[{name:'Officer',value:interaction.user.username}]); }
    }

    // ── /codes ────────────────────────────────────────────────────
    if (cmd === 'codes') {
      const CODE_DB = { '10-4':'Acknowledged / Message Received','10-7':'Out of Service / Off Duty','10-8':'In Service / Available','10-20':'Location','10-23':'Arrived at Scene','10-33':'Emergency — Clear All Traffic','10-50':'Traffic Accident','10-78':'Officer Needs Assistance','10-80':'Pursuit in Progress','10-99':'Wanted / Stolen Indicated','11-99':'Officer Needs Help — EMERGENCY','11-95':'Routine Traffic Stop','code-3':'Lights & Siren Response','code-4':'All Clear','code-7':'Meal Break' };
      if (sub === 'lookup') { const c=(str('code',true)||'').toLowerCase().replace(' ','-'); return reply(interaction,'📡 Code Lookup',`**${str('code',true).toUpperCase()}** — ${CODE_DB[c]||'Not found. See redlinecad.app → Codes Reference (294 codes)'}`,C.blue); }
      if (sub === 'common') return reply(interaction,'📡 Common Codes','Most used radio codes',C.blue,[{name:'10-4',value:'Acknowledged'},{name:'10-8',value:'Available'},{name:'10-7',value:'Off Duty'},{name:'10-20',value:'Location?'},{name:'10-33',value:'Emergency'},{name:'10-78',value:'Need Backup'},{name:'11-99',value:'OFFICER EMERGENCY'},{name:'Code 3',value:'Lights & Siren'},{name:'Code 4',value:'All Clear'}]);
      if (sub === 'phonetic') return reply(interaction,'🔤 Phonetic','NATO Phonetic Alphabet',C.blue,[{name:'A–E',value:'Alpha Bravo Charlie Delta Echo'},{name:'F–J',value:'Foxtrot Golf Hotel India Juliet'},{name:'K–O',value:'Kilo Lima Mike November Oscar'},{name:'P–T',value:'Papa Quebec Romeo Sierra Tango'},{name:'U–Z',value:'Uniform Victor Whiskey X-Ray Yankee Zulu'}]);
      if (sub === 'fire') return reply(interaction,'🔥 Fire Codes','Common fire codes',C.red,[{name:'PAR',value:'Personnel Accountability Report'},{name:'MAYDAY',value:'FF in distress'},{name:'Offensive',value:'Interior attack'},{name:'Defensive',value:'Exterior attack'},{name:'Knockdown',value:'Fire knocked down'}]);
      if (sub === 'ems') return reply(interaction,'🚑 EMS Codes','Common EMS codes',C.green,[{name:'Priority 1',value:'Critical'},{name:'Priority 2',value:'Emergent'},{name:'Priority 3',value:'Urgent'},{name:'Code 3',value:'Lights & siren'},{name:'ROSC',value:'Return of circulation'},{name:'VSA',value:'Vital signs absent'}]);
    }

    // ── /help ─────────────────────────────────────────────────────
    if (cmd === 'help') {
      if (!sub||sub==='all') return reply(interaction,'🚔 RedLineCAD Bot — Commands',`**Live Firebase connected** | redlinecad.app`,C.red,[
        {name:'👤 /civilian',value:'lookup•profile•priors•wanted•gang•dob•address•employment•relationship•property•vehicle•business•pets•deceased•medhistory•dnr•bloodtype•allergies',inline:false},
        {name:'🚗 /vehicle',value:'plate•stolen•recovered•impound•registration•tow•alpr•watchlist•insurance',inline:false},
        {name:'⚖️ /warrant',value:'issue•check•approve•expunge•deactivate•list',inline:false},
        {name:'🔒 /arrest',value:'log•search•booking',inline:false},
        {name:'💸 /fine',value:'issue•pay•check•waive',inline:false},
        {name:'🚨 /bolo',value:'issue•cancel•list•vehicle',inline:false},
        {name:'📡 /dispatch',value:'call•close•assign•active•911',inline:false},
        {name:'🔘 /unit',value:'status•list•oncall•panic•offduty•onduty•assign•transfer',inline:false},
        {name:'🚔 /leo',value:'ncic•pursuit•pursuitend•evidence•caseload•mugshot•confidential•trackvehicle•weapons•suspect•caseclose•roadblock•perimeter•swat•k9•drone•spike',inline:false},
        {name:'🚑 /ems',value:'pcr•vitals•hospital•units•mci•mayday•triage•transport•trauma•cardiac•overdose•handoff',inline:false},
        {name:'🔥 /fire',value:'incident•out•par•hazmat•evacuation•rescue•exposure•waterops',inline:false},
        {name:'🔒 /corrections',value:'booking•release•sentence•addtime•cellcheck•contraband•transport•visitation•prisoner',inline:false},
        {name:'⚖️ /judicial',value:'sentence•verdict•bail•plea•courtdate•expunge•attorney•charge',inline:false},
        {name:'💰 /economy',value:'balance•pay•salary•tax•loan•stocks•insurance•citybudget•lottery•transfer',inline:false},
        {name:'🛠️ /admin',value:'announce•serverinfo•kick•warn•suspend•promote•demote•eas•audit•weather•event•snapshot•roster•commend•abusereport',inline:false},
        {name:'📊 /stats',value:'mystats•leaderboard•arrests•citations•activity•department•economy•crimestat',inline:false},
        {name:'🌆 /city',value:'weather•time•news•mayor•ordinance•curfew•amber•silver•missing•found•press•seizure',inline:false},
        {name:'🎭 /rp',value:'me•do•ooc•roll•coin•8ball•wanted•bounty•scenario•lore•backstory•heist•tryaction',inline:false},
        {name:'📋 /report',value:'incident•crash•missing•dui•useofforce•supplement•status',inline:false},
        {name:'📋 /license',value:'check•points•suspend•reinstate•revoke•specialty•issue',inline:false},
        {name:'📡 /codes',value:'lookup•common•phonetic•fire•ems',inline:false},
        {name:'✅ Firebase',value:'All commands connected to live CAD data',inline:false},
      ],true);
      if (sub==='leo')   return reply(interaction,'🚔 LEO',`/leo ncic•pursuit•pursuitend•evidence•caseload•mugshot•confidential•trackvehicle•weapons•suspect•caseclose•roadblock•perimeter•swat•k9•drone•spike\n/warrant•/arrest•/bolo•/unit panic`,C.red);
      if (sub==='ems')   return reply(interaction,'🚑 EMS',`/ems pcr•vitals•hospital•units•mci•mayday•triage•transport•trauma•cardiac•overdose•handoff`,C.green);
      if (sub==='fire')  return reply(interaction,'🔥 Fire',`/fire incident•out•par•hazmat•evacuation•rescue•exposure•waterops`,C.red);
      if (sub==='admin') return reply(interaction,'🛠️ Admin',`/admin announce•serverinfo•kick•warn•suspend•promote•demote•eas•audit•weather•event•snapshot•roster•commend•abusereport`,C.blue);
    }

    return reply(interaction,'❓ Unknown',`Use **/help all** for the full list`,C.grey,[],true);

  } catch(err) {
    console.error('CMD ERR:', err);
    try {
      if (!interaction.replied&&!interaction.deferred) await interaction.reply({content:'⚠️ Error occurred.',ephemeral:true});
      else await interaction.editReply({content:'⚠️ Error occurred.'});
    } catch(e){}
  }
});

client.login(process.env.DISCORD_TOKEN);

// ── Register Commands (same as before) ────────────────────────────


// ════════════════════════════════════════════════════════════════
//  DISCORD-NATIVE ADMINISTRATION COMMANDS
//  These operate directly on the Discord server — members, roles,
//  channels, messages, and server settings.
// ════════════════════════════════════════════════════════════════

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const cmd = interaction.commandName;
  const sub = interaction.options.getSubcommand(false);
  if (!['mod','role','channel','server','userinfo','purge','slowmode','lockdown'].includes(cmd)) return;

  const str  = (n, req=false) => interaction.options.getString(n, req) || '';
  const int  = (n, req=false) => interaction.options.getInteger(n, req) || 0;
  const bool = (n, req=false) => interaction.options.getBoolean(n, req);
  const mem  = (n, req=false) => interaction.options.getMember(n, req);
  const usr  = (n, req=false) => interaction.options.getUser(n, req);
  const rol  = (n, req=false) => interaction.options.getRole(n, req);
  const cha  = (n, req=false) => interaction.options.getChannel(n, req);

  const guild = interaction.guild;

  async function modReply(title, desc, color=C.blue, fields=[]) {
    try {
      if (!interaction.replied && !interaction.deferred) await interaction.deferReply({ ephemeral:true });
      await interaction.editReply({ embeds:[mkEmbed(title, desc, color, fields)] });
    } catch(e) { console.error('modReply err:', e.message); }
  }

  try {

    // ── /mod ──────────────────────────────────────────────────────
    if (cmd === 'mod') {

      // Permission guard
      if (!interaction.member.permissions.has('ModerateMembers') &&
          !interaction.member.permissions.has('BanMembers') &&
          !interaction.member.permissions.has('KickMembers') &&
          !interaction.member.roles.cache.some(r => ['Admin','Mod','Staff','Supervisor'].includes(r.name))) {
        return modReply('❌ No Permission', 'You need Moderator permissions to use these commands.', C.red);
      }

      if (sub === 'kick') {
        const target = mem('target', true);
        const reason = str('reason') || 'No reason provided';
        if (!target.kickable) return modReply('❌ Cannot Kick', `I cannot kick **${target.user.username}** — they may have higher permissions than me.`, C.red);
        await target.kick(reason);
        if (basePath) await fbPush(`${basePath}/modActions`, { type:'kick', target:target.user.username, targetId:target.id, reason, by:interaction.user.username, createdAt:ts() });
        return modReply('👟 Member Kicked', `**${target.user.username}** has been kicked from the server\nReason: ${reason}`, C.orange,
          [{ name:'Kicked by', value:interaction.user.username }, { name:'Reason', value:reason, inline:false }]);
      }

      if (sub === 'ban') {
        const target = mem('target') || usr('target');
        const reason = str('reason') || 'No reason provided';
        const days   = int('deletedays') || 0;
        try {
          await guild.members.ban(target.id || target.user?.id || target, { reason, deleteMessageSeconds: days * 86400 });
          if (basePath) await fbPush(`${basePath}/modActions`, { type:'ban', target:target.user?.username||String(target), reason, by:interaction.user.username, createdAt:ts() });
          return modReply('🔨 Member Banned', `**${target.user?.username||'User'}** has been banned\nReason: ${reason}\nMessages deleted: ${days} day(s)`, C.red,
            [{ name:'Banned by', value:interaction.user.username }]);
        } catch(e) {
          return modReply('❌ Ban Failed', `Could not ban user: ${e.message}`, C.red);
        }
      }

      if (sub === 'unban') {
        const userId = str('userid', true);
        try {
          await guild.members.unban(userId, str('reason') || 'Unbanned by admin');
          return modReply('✅ Member Unbanned', `User **${userId}** has been unbanned`, C.green, [{ name:'Unbanned by', value:interaction.user.username }]);
        } catch(e) {
          return modReply('❌ Unban Failed', `Could not unban: ${e.message}`, C.red);
        }
      }

      if (sub === 'timeout') {
        const target = mem('target', true);
        const minutes = int('minutes', true);
        const reason = str('reason') || 'No reason provided';
        if (!target.moderatable) return modReply('❌ Cannot Timeout', `I cannot timeout **${target.user.username}**.`, C.red);
        await target.timeout(minutes * 60 * 1000, reason);
        if (basePath) await fbPush(`${basePath}/modActions`, { type:'timeout', target:target.user.username, duration:`${minutes}m`, reason, by:interaction.user.username, createdAt:ts() });
        return modReply('⏱️ Member Timed Out', `**${target.user.username}** timed out for **${minutes} minute(s)**\nReason: ${reason}`, C.orange,
          [{ name:'By', value:interaction.user.username }, { name:'Duration', value:`${minutes} min` }]);
      }

      if (sub === 'untimeout') {
        const target = mem('target', true);
        await target.timeout(null);
        return modReply('✅ Timeout Removed', `Timeout removed from **${target.user.username}**`, C.green, [{ name:'By', value:interaction.user.username }]);
      }

      if (sub === 'warn') {
        const target = usr('target', true);
        const reason = str('reason', true);
        if (basePath) await fbPush(`${basePath}/discordWarnings`, { userId:target.id, username:target.username, reason, by:interaction.user.username, createdAt:ts() });
        try { await target.send({ embeds:[mkEmbed('⚠️ Warning Received', `You have received a warning in **${guild.name}**\nReason: **${reason}**\nIssued by: ${interaction.user.username}`, C.orange)] }); } catch(e) {}
        return modReply('⚠️ Warning Issued', `**${target.username}** has been warned\nReason: ${reason}`, C.orange, [{ name:'By', value:interaction.user.username }]);
      }

      if (sub === 'warnings') {
        const target = usr('target', true);
        const { entries } = await getServerEntries('discordWarnings');
        const warns = entries.filter(([,w]) => w.userId === target.id);
        return modReply(`⚠️ Warnings — ${target.username}`, warns.length ? `**${warns.length}** warning(s) on record` : 'No warnings on record', warns.length ? C.orange : C.green,
          warns.slice(0,5).map(([,w]) => ({ name:w.createdAt||'Unknown', value:w.reason||'No reason', inline:false })));
      }

      if (sub === 'clearwarnings') {
        const target = usr('target', true);
        if (basePath) {
          const { entries, sid } = await getServerEntries('discordWarnings');
          for (const [key, w] of entries) {
            if (w.userId === target.id) await fbDelete(`servers/${sid}/discordWarnings/${key}`);
          }
        }
        return modReply('🗑️ Warnings Cleared', `All warnings cleared for **${target.username}**`, C.green, [{ name:'By', value:interaction.user.username }]);
      }

      if (sub === 'nick') {
        const target = mem('target', true);
        const nick = str('nickname');
        try {
          await target.setNickname(nick || null, `Set by ${interaction.user.username}`);
          return modReply('✏️ Nickname Updated', nick ? `**${target.user.username}** → **${nick}**` : `Nickname reset for **${target.user.username}**`, C.blue, [{ name:'By', value:interaction.user.username }]);
        } catch(e) {
          return modReply('❌ Failed', `Could not change nickname: ${e.message}`, C.red);
        }
      }

      if (sub === 'dm') {
        const target = usr('target', true);
        const message = str('message', true);
        try {
          await target.send({ embeds:[mkEmbed('📨 Message from Staff', `**${guild.name}** staff has a message for you:\n\n${message}`, C.blue, [{ name:'From', value:interaction.user.username }])] });
          return modReply('✅ DM Sent', `Message sent to **${target.username}**`, C.green);
        } catch(e) {
          return modReply('❌ DM Failed', `Could not DM **${target.username}** — they may have DMs disabled.`, C.red);
        }
      }

      if (sub === 'banlist') {
        try {
          const bans = await guild.bans.fetch();
          return modReply('🔨 Ban List', `**${bans.size}** banned member(s)`, C.red,
            bans.first(8).map(b => ({ name:b.user.username, value:b.reason||'No reason', inline:true })));
        } catch(e) {
          return modReply('❌ Error', `Could not fetch ban list: ${e.message}`, C.red);
        }
      }

      if (sub === 'history') {
        const target = usr('target', true);
        const { entries } = await getServerEntries('modActions');
        const actions = entries.filter(([,a]) => a.target?.toLowerCase() === target.username.toLowerCase());
        return modReply(`📋 Mod History — ${target.username}`, actions.length ? `**${actions.length}** action(s) on record` : 'No mod history', actions.length ? C.orange : C.green,
          actions.slice(0,6).map(([,a]) => ({ name:`${a.type||'Action'} — ${a.createdAt||'Unknown'}`, value:a.reason||'No reason', inline:false })));
      }
    }

    // ── /role ─────────────────────────────────────────────────────
    if (cmd === 'role') {

      if (!interaction.member.permissions.has('ManageRoles')) {
        return modReply('❌ No Permission', 'You need **Manage Roles** permission.', C.red);
      }

      if (sub === 'add') {
        const target = mem('target', true);
        const role = rol('role', true);
        if (role.position >= interaction.guild.members.me.roles.highest.position) return modReply('❌ Role Too High', `I cannot assign **${role.name}** — it is higher than my top role.`, C.red);
        await target.roles.add(role);
        return modReply('✅ Role Added', `**${role.name}** → **${target.user.username}**`, C.green, [{ name:'By', value:interaction.user.username }]);
      }

      if (sub === 'remove') {
        const target = mem('target', true);
        const role = rol('role', true);
        await target.roles.remove(role);
        return modReply('✅ Role Removed', `**${role.name}** removed from **${target.user.username}**`, C.orange, [{ name:'By', value:interaction.user.username }]);
      }

      if (sub === 'create') {
        const name = str('name', true);
        const color = str('color') || '#000000';
        const hoist = bool('hoist') || false;
        const mentionable = bool('mentionable') || false;
        try {
          const newRole = await guild.roles.create({ name, color, hoist, mentionable, reason:`Created by ${interaction.user.username}` });
          return modReply('✅ Role Created', `**${newRole.name}** (${newRole.id}) created`, C.green, [{ name:'Color', value:color }, { name:'Hoisted', value:String(hoist) }, { name:'Mentionable', value:String(mentionable) }]);
        } catch(e) {
          return modReply('❌ Failed', `Could not create role: ${e.message}`, C.red);
        }
      }

      if (sub === 'delete') {
        const role = rol('role', true);
        if (role.position >= interaction.guild.members.me.roles.highest.position) return modReply('❌ Role Too High', `I cannot delete **${role.name}**.`, C.red);
        const name = role.name;
        await role.delete(`Deleted by ${interaction.user.username}`);
        return modReply('🗑️ Role Deleted', `**${name}** has been deleted`, C.orange, [{ name:'By', value:interaction.user.username }]);
      }

      if (sub === 'list') {
        const roles = guild.roles.cache.sort((a,b) => b.position - a.position);
        return modReply('📋 Server Roles', `**${roles.size}** role(s)`, C.blue,
          roles.first(10).map(r => ({ name:r.name, value:`${r.members.size} member(s) — <@&${r.id}>`, inline:false })));
      }

      if (sub === 'info') {
        const role = rol('role', true);
        return modReply(`📋 Role Info — ${role.name}`, `Details for <@&${role.id}>`, C.blue, [
          { name:'Members', value:String(role.members.size) },
          { name:'Color', value:role.hexColor },
          { name:'Hoisted', value:String(role.hoist) },
          { name:'Mentionable', value:String(role.mentionable) },
          { name:'Position', value:String(role.position) },
          { name:'ID', value:role.id },
        ]);
      }

      if (sub === 'members') {
        const role = rol('role', true);
        const members = role.members;
        return modReply(`👥 Members with ${role.name}`, `**${members.size}** member(s)`, C.blue,
          members.first(10).map(m => ({ name:m.user.username, value:m.displayName, inline:true })));
      }

      if (sub === 'color') {
        const role = rol('role', true);
        const color = str('color', true);
        await role.setColor(color);
        return modReply('🎨 Role Color Updated', `**${role.name}** → **${color}**`, C.green, [{ name:'By', value:interaction.user.username }]);
      }

      if (sub === 'rename') {
        const role = rol('role', true);
        const newName = str('newname', true);
        const oldName = role.name;
        await role.setName(newName);
        return modReply('✏️ Role Renamed', `**${oldName}** → **${newName}**`, C.green, [{ name:'By', value:interaction.user.username }]);
      }

      if (sub === 'hoist') {
        const role = rol('role', true);
        const hoist = bool('hoist', true);
        await role.setHoist(hoist);
        return modReply('✅ Role Hoist Updated', `**${role.name}** — Hoisted: **${hoist}**`, C.green, [{ name:'By', value:interaction.user.username }]);
      }
    }

    // ── /channel ──────────────────────────────────────────────────
    if (cmd === 'channel') {

      if (!interaction.member.permissions.has('ManageChannels')) {
        return modReply('❌ No Permission', 'You need **Manage Channels** permission.', C.red);
      }

      if (sub === 'lock') {
        const channel = cha('channel') || interaction.channel;
        await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
        return modReply('🔒 Channel Locked', `**#${channel.name}** is now locked\nReason: ${str('reason')||'Not specified'}`, C.orange, [{ name:'By', value:interaction.user.username }]);
      }

      if (sub === 'unlock') {
        const channel = cha('channel') || interaction.channel;
        await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });
        return modReply('🔓 Channel Unlocked', `**#${channel.name}** is now unlocked`, C.green, [{ name:'By', value:interaction.user.username }]);
      }

      if (sub === 'slowmode') {
        const channel = cha('channel') || interaction.channel;
        const seconds = int('seconds', true);
        await channel.setRateLimitPerUser(seconds);
        return modReply('⏱️ Slowmode Set', `**#${channel.name}** — slowmode: **${seconds}s**`, C.blue, [{ name:'By', value:interaction.user.username }]);
      }

      if (sub === 'purge') {
        if (!interaction.member.permissions.has('ManageMessages')) return modReply('❌ No Permission', 'You need **Manage Messages** permission.', C.red);
        const amount = int('amount', true);
        if (amount < 1 || amount > 100) return modReply('❌ Invalid Amount', 'Amount must be between 1 and 100.', C.red);
        const channel = cha('channel') || interaction.channel;
        const deleted = await channel.bulkDelete(amount, true);
        return modReply('🗑️ Messages Purged', `**${deleted.size}** message(s) deleted from **#${channel.name}**`, C.orange, [{ name:'By', value:interaction.user.username }]);
      }

      if (sub === 'create') {
        const name = str('name', true);
        const type = str('type') || 'text';
        const category = str('category');
        const channelType = type === 'voice' ? 2 : type === 'announcement' ? 5 : 0;
        try {
          const opts = { name, type:channelType, reason:`Created by ${interaction.user.username}` };
          if (category) {
            const cat = guild.channels.cache.find(c => c.name.toLowerCase() === category.toLowerCase() && c.type === 4);
            if (cat) opts.parent = cat.id;
          }
          const newChan = await guild.channels.create(opts);
          return modReply('✅ Channel Created', `**#${newChan.name}** created`, C.green, [{ name:'Type', value:type }, { name:'By', value:interaction.user.username }]);
        } catch(e) {
          return modReply('❌ Failed', `Could not create channel: ${e.message}`, C.red);
        }
      }

      if (sub === 'delete') {
        const channel = cha('channel', true);
        const name = channel.name;
        await channel.delete(`Deleted by ${interaction.user.username}: ${str('reason')||'Admin action'}`);
        return modReply('🗑️ Channel Deleted', `**#${name}** has been deleted`, C.orange, [{ name:'By', value:interaction.user.username }]);
      }

      if (sub === 'rename') {
        const channel = cha('channel') || interaction.channel;
        const newName = str('newname', true);
        const oldName = channel.name;
        await channel.setName(newName);
        return modReply('✏️ Channel Renamed', `**#${oldName}** → **#${newName}**`, C.green, [{ name:'By', value:interaction.user.username }]);
      }

      if (sub === 'topic') {
        const channel = cha('channel') || interaction.channel;
        const topic = str('topic', true);
        await channel.setTopic(topic);
        return modReply('✏️ Topic Updated', `**#${channel.name}** topic set`, C.green, [{ name:'Topic', value:topic, inline:false }, { name:'By', value:interaction.user.username }]);
      }

      if (sub === 'nsfw') {
        const channel = cha('channel') || interaction.channel;
        const nsfw = bool('enabled') ?? true;
        await channel.setNSFW(nsfw);
        return modReply('🔞 NSFW Updated', `**#${channel.name}** — NSFW: **${nsfw}**`, C.orange, [{ name:'By', value:interaction.user.username }]);
      }

      if (sub === 'list') {
        const channels = guild.channels.cache.filter(c => c.type !== 4).sort((a,b) => a.rawPosition - b.rawPosition);
        const text = channels.filter(c => c.type === 0);
        const voice = channels.filter(c => c.type === 2);
        return modReply('📋 Channels', `**${channels.size}** total channel(s)`, C.blue, [
          { name:`💬 Text (${text.size})`, value:text.first(5).map(c=>`#${c.name}`).join(' | ') || 'None', inline:false },
          { name:`🔊 Voice (${voice.size})`, value:voice.first(5).map(c=>c.name).join(' | ') || 'None', inline:false },
        ]);
      }

      if (sub === 'info') {
        const channel = cha('channel') || interaction.channel;
        return modReply(`📋 #${channel.name}`, 'Channel information', C.blue, [
          { name:'Type', value:channel.type === 0 ? 'Text' : channel.type === 2 ? 'Voice' : String(channel.type) },
          { name:'ID', value:channel.id },
          { name:'Topic', value:channel.topic || 'No topic', inline:false },
          { name:'NSFW', value:String(channel.nsfw) },
          { name:'Slowmode', value:`${channel.rateLimitPerUser}s` },
          { name:'Created', value:channel.createdAt?.toDateString() || 'Unknown' },
        ]);
      }

      if (sub === 'clone') {
        const channel = cha('channel') || interaction.channel;
        const clone = await channel.clone({ reason:`Cloned by ${interaction.user.username}` });
        return modReply('✅ Channel Cloned', `**#${channel.name}** → **#${clone.name}**`, C.green, [{ name:'By', value:interaction.user.username }]);
      }
    }

    // ── /server ───────────────────────────────────────────────────
    if (cmd === 'server') {

      if (sub === 'info') {
        const owner = await guild.fetchOwner();
        return modReply(`🏠 ${guild.name}`, 'Server information', C.blue, [
          { name:'Owner', value:owner.user.username },
          { name:'Members', value:String(guild.memberCount) },
          { name:'Channels', value:String(guild.channels.cache.size) },
          { name:'Roles', value:String(guild.roles.cache.size) },
          { name:'Boost Level', value:`Level ${guild.premiumTier}` },
          { name:'Boosts', value:String(guild.premiumSubscriptionCount) },
          { name:'Created', value:guild.createdAt?.toDateString() || 'Unknown' },
          { name:'ID', value:guild.id },
        ]);
      }

      if (sub === 'members') {
        const members = await guild.members.fetch();
        const online = members.filter(m => m.presence?.status === 'online').size;
        const bots = members.filter(m => m.user.bot).size;
        return modReply('👥 Members', `**${guild.memberCount}** total members`, C.blue, [
          { name:'Total', value:String(guild.memberCount) },
          { name:'Online', value:String(online) },
          { name:'Bots', value:String(bots) },
          { name:'Humans', value:String(guild.memberCount - bots) },
        ]);
      }

      if (sub === 'roles') {
        const roles = guild.roles.cache.sort((a,b) => b.position - a.position);
        return modReply('🏷️ Roles', `**${roles.size}** role(s)`, C.blue, roles.first(10).map(r => ({ name:r.name, value:`${r.members.size} members`, inline:true })));
      }

      if (sub === 'channels') {
        const cats = guild.channels.cache.filter(c => c.type === 4);
        const text = guild.channels.cache.filter(c => c.type === 0);
        const voice = guild.channels.cache.filter(c => c.type === 2);
        return modReply('📋 Channels', `**${guild.channels.cache.size}** total`, C.blue, [
          { name:'Categories', value:String(cats.size) },
          { name:'Text', value:String(text.size) },
          { name:'Voice', value:String(voice.size) },
        ]);
      }

      if (sub === 'bans') {
        if (!interaction.member.permissions.has('BanMembers')) return modReply('❌ No Permission', 'You need **Ban Members** permission.', C.red);
        const bans = await guild.bans.fetch();
        return modReply('🔨 Ban List', `**${bans.size}** banned member(s)`, C.red,
          bans.first(8).map(b => ({ name:b.user.username, value:b.reason||'No reason', inline:true })));
      }

      if (sub === 'invites') {
        if (!interaction.member.permissions.has('ManageGuild')) return modReply('❌ No Permission', 'You need **Manage Server** permission.', C.red);
        const invites = await guild.invites.fetch();
        return modReply('🔗 Server Invites', `**${invites.size}** active invite(s)`, C.blue,
          invites.first(8).map(i => ({ name:i.code, value:`${i.uses}/${i.maxUses||'∞'} uses — created by ${i.inviter?.username||'Unknown'}`, inline:false })));
      }

      if (sub === 'icon') {
        const iconUrl = guild.iconURL({ size:1024, extension:'png' });
        return modReply(`🖼️ ${guild.name} Icon`, iconUrl ? 'Server icon:' : 'No server icon set', C.blue, iconUrl ? [{ name:'URL', value:iconUrl, inline:false }] : []);
      }

      if (sub === 'setname') {
        if (!interaction.member.permissions.has('ManageGuild')) return modReply('❌ No Permission', 'You need **Manage Server** permission.', C.red);
        const oldName = guild.name;
        await guild.setName(str('name', true));
        return modReply('✏️ Server Renamed', `**${oldName}** → **${str('name',true)}**`, C.green, [{ name:'By', value:interaction.user.username }]);
      }

      if (sub === 'audit') {
        if (!interaction.member.permissions.has('ViewAuditLog')) return modReply('❌ No Permission', 'You need **View Audit Log** permission.', C.red);
        const logs = await guild.fetchAuditLogs({ limit:8 });
        return modReply('📜 Audit Log', `Last ${logs.entries.size} action(s)`, C.blue,
          logs.entries.map(e => ({ name:`${e.action} — ${e.executor?.username||'Unknown'}`, value:e.reason||'No reason', inline:false })).slice(0,8));
      }
    }

    // ── /userinfo ─────────────────────────────────────────────────
    if (cmd === 'userinfo') {
      const target = mem('target') || interaction.member;
      const user = target.user;
      const roles = target.roles.cache.filter(r => r.id !== guild.id).sort((a,b) => b.position - a.position);
      return modReply(`👤 ${user.username}`, `User information`, C.blue, [
        { name:'Display Name', value:target.displayName },
        { name:'ID', value:user.id },
        { name:'Account Created', value:user.createdAt?.toDateString() || 'Unknown' },
        { name:'Joined Server', value:target.joinedAt?.toDateString() || 'Unknown' },
        { name:'Top Role', value:target.roles.highest?.name || 'None' },
        { name:'Roles', value:roles.first(5).map(r=>`@${r.name}`).join(' ') || 'None', inline:false },
        { name:'Bot', value:String(user.bot) },
        { name:'Avatar', value:`[Link](${user.displayAvatarURL()})` },
      ]);
    }

    // ── /purge ────────────────────────────────────────────────────
    if (cmd === 'purge') {
      if (!interaction.member.permissions.has('ManageMessages')) return modReply('❌ No Permission', 'You need **Manage Messages** permission.', C.red);
      const amount = int('amount', true);
      const user = usr('user');
      if (amount < 1 || amount > 100) return modReply('❌ Invalid', 'Amount must be 1-100.', C.red);
      await interaction.deferReply({ ephemeral:true });

      let messages = await interaction.channel.messages.fetch({ limit:100 });
      if (user) messages = messages.filter(m => m.author.id === user.id);
      messages = messages.first(amount);
      const deleted = await interaction.channel.bulkDelete(messages, true);
      await interaction.editReply({ embeds:[mkEmbed('🗑️ Messages Purged', `Deleted **${deleted.size}** message(s)${user?` from **${user.username}**`:''}`, C.orange, [{ name:'By', value:interaction.user.username }])] });
    }

    // ── /slowmode ─────────────────────────────────────────────────
    if (cmd === 'slowmode') {
      if (!interaction.member.permissions.has('ManageChannels')) return modReply('❌ No Permission', 'You need **Manage Channels** permission.', C.red);
      const seconds = int('seconds', true);
      await interaction.channel.setRateLimitPerUser(seconds);
      return modReply('⏱️ Slowmode', seconds === 0 ? `Slowmode **disabled** in #${interaction.channel.name}` : `Slowmode set to **${seconds}s** in #${interaction.channel.name}`, C.blue, [{ name:'By', value:interaction.user.username }]);
    }

    // ── /lockdown ─────────────────────────────────────────────────
    if (cmd === 'lockdown') {
      if (!interaction.member.permissions.has('ManageChannels')) return modReply('❌ No Permission', 'You need **Manage Channels** permission.', C.red);
      const lock = bool('enabled') ?? true;
      const reason = str('reason') || 'Server lockdown';
      const channels = guild.channels.cache.filter(c => c.type === 0);
      let count = 0;
      for (const [,channel] of channels) {
        try {
          await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: lock ? false : null });
          count++;
        } catch(e) {}
      }
      if (basePath) await fbPush(`${basePath}/lockdownLogs`, { action:lock?'lock':'unlock', reason, by:interaction.user.username, channels:count, createdAt:ts() });
      return modReply(lock ? '🔒 SERVER LOCKDOWN' : '🔓 LOCKDOWN LIFTED', lock ? `**${count}** channel(s) locked\nReason: ${reason}` : `**${count}** channel(s) unlocked`, lock ? C.red : C.green, [{ name:'By', value:interaction.user.username }]);
    }

  } catch(err) {
    console.error('Discord Admin CMD ERR:', err);
    try {
      if (!interaction.replied && !interaction.deferred) await interaction.reply({ content:'⚠️ Error: ' + err.message, ephemeral:true });
      else await interaction.editReply({ content:'⚠️ Error: ' + err.message });
    } catch(e) {}
  }
});


// ── Register Discord Admin Commands ───────────────────────────────
async function registerDiscordAdminCommands() {
  const { REST: R2, Routes: RT2 } = require('discord.js');
  const { SlashCommandBuilder: SC2 } = require('@discordjs/builders');

  const adminCmds = [
    new SC2().setName('mod').setDescription('Member moderation commands')
      .addSubcommand(s=>s.setName('kick').setDescription('Kick a member').addUserOption(o=>o.setName('target').setDescription('Member to kick').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason')))
      .addSubcommand(s=>s.setName('ban').setDescription('Ban a member').addUserOption(o=>o.setName('target').setDescription('Member to ban').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason')).addIntegerOption(o=>o.setName('deletedays').setDescription('Days of messages to delete (0-7)').setMinValue(0).setMaxValue(7)))
      .addSubcommand(s=>s.setName('unban').setDescription('Unban a user').addStringOption(o=>o.setName('userid').setDescription('User ID to unban').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason')))
      .addSubcommand(s=>s.setName('timeout').setDescription('Timeout a member').addUserOption(o=>o.setName('target').setDescription('Member').setRequired(true)).addIntegerOption(o=>o.setName('minutes').setDescription('Duration in minutes').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason')))
      .addSubcommand(s=>s.setName('untimeout').setDescription('Remove timeout').addUserOption(o=>o.setName('target').setDescription('Member').setRequired(true)))
      .addSubcommand(s=>s.setName('warn').setDescription('Issue a warning').addUserOption(o=>o.setName('target').setDescription('Member').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason').setRequired(true)))
      .addSubcommand(s=>s.setName('warnings').setDescription('View warnings for a member').addUserOption(o=>o.setName('target').setDescription('Member').setRequired(true)))
      .addSubcommand(s=>s.setName('clearwarnings').setDescription('Clear all warnings').addUserOption(o=>o.setName('target').setDescription('Member').setRequired(true)))
      .addSubcommand(s=>s.setName('nick').setDescription('Change nickname').addUserOption(o=>o.setName('target').setDescription('Member').setRequired(true)).addStringOption(o=>o.setName('nickname').setDescription('New nickname (empty to reset)')))
      .addSubcommand(s=>s.setName('dm').setDescription('DM a member').addUserOption(o=>o.setName('target').setDescription('Member').setRequired(true)).addStringOption(o=>o.setName('message').setDescription('Message').setRequired(true)))
      .addSubcommand(s=>s.setName('banlist').setDescription('View all banned members'))
      .addSubcommand(s=>s.setName('history').setDescription('View mod history for a member').addUserOption(o=>o.setName('target').setDescription('Member').setRequired(true))),

    new SC2().setName('role').setDescription('Role management commands')
      .addSubcommand(s=>s.setName('add').setDescription('Add role to member').addUserOption(o=>o.setName('target').setDescription('Member').setRequired(true)).addRoleOption(o=>o.setName('role').setDescription('Role').setRequired(true)))
      .addSubcommand(s=>s.setName('remove').setDescription('Remove role from member').addUserOption(o=>o.setName('target').setDescription('Member').setRequired(true)).addRoleOption(o=>o.setName('role').setDescription('Role').setRequired(true)))
      .addSubcommand(s=>s.setName('create').setDescription('Create a new role').addStringOption(o=>o.setName('name').setDescription('Role name').setRequired(true)).addStringOption(o=>o.setName('color').setDescription('Hex color e.g. #FF0000')).addBooleanOption(o=>o.setName('hoist').setDescription('Show separately in member list')).addBooleanOption(o=>o.setName('mentionable').setDescription('Allow anyone to mention')))
      .addSubcommand(s=>s.setName('delete').setDescription('Delete a role').addRoleOption(o=>o.setName('role').setDescription('Role to delete').setRequired(true)))
      .addSubcommand(s=>s.setName('list').setDescription('List all server roles'))
      .addSubcommand(s=>s.setName('info').setDescription('Role information').addRoleOption(o=>o.setName('role').setDescription('Role').setRequired(true)))
      .addSubcommand(s=>s.setName('members').setDescription('Members with a role').addRoleOption(o=>o.setName('role').setDescription('Role').setRequired(true)))
      .addSubcommand(s=>s.setName('color').setDescription('Change role color').addRoleOption(o=>o.setName('role').setDescription('Role').setRequired(true)).addStringOption(o=>o.setName('color').setDescription('Hex color e.g. #FF0000').setRequired(true)))
      .addSubcommand(s=>s.setName('rename').setDescription('Rename a role').addRoleOption(o=>o.setName('role').setDescription('Role').setRequired(true)).addStringOption(o=>o.setName('newname').setDescription('New name').setRequired(true)))
      .addSubcommand(s=>s.setName('hoist').setDescription('Toggle role hoist').addRoleOption(o=>o.setName('role').setDescription('Role').setRequired(true)).addBooleanOption(o=>o.setName('hoist').setDescription('Hoist on/off').setRequired(true))),

    new SC2().setName('channel').setDescription('Channel management commands')
      .addSubcommand(s=>s.setName('lock').setDescription('Lock a channel').addChannelOption(o=>o.setName('channel').setDescription('Channel (default: current)')).addStringOption(o=>o.setName('reason').setDescription('Reason')))
      .addSubcommand(s=>s.setName('unlock').setDescription('Unlock a channel').addChannelOption(o=>o.setName('channel').setDescription('Channel (default: current)')))
      .addSubcommand(s=>s.setName('slowmode').setDescription('Set channel slowmode').addIntegerOption(o=>o.setName('seconds').setDescription('Seconds (0 to disable)').setRequired(true).setMinValue(0).setMaxValue(21600)).addChannelOption(o=>o.setName('channel').setDescription('Channel')))
      .addSubcommand(s=>s.setName('purge').setDescription('Delete messages in bulk').addIntegerOption(o=>o.setName('amount').setDescription('Number of messages (1-100)').setRequired(true).setMinValue(1).setMaxValue(100)).addChannelOption(o=>o.setName('channel').setDescription('Channel')))
      .addSubcommand(s=>s.setName('create').setDescription('Create a new channel').addStringOption(o=>o.setName('name').setDescription('Channel name').setRequired(true)).addStringOption(o=>o.setName('type').setDescription('Channel type').addChoices({name:'Text',value:'text'},{name:'Voice',value:'voice'},{name:'Announcement',value:'announcement'})).addStringOption(o=>o.setName('category').setDescription('Category name')))
      .addSubcommand(s=>s.setName('delete').setDescription('Delete a channel').addChannelOption(o=>o.setName('channel').setDescription('Channel to delete').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason')))
      .addSubcommand(s=>s.setName('rename').setDescription('Rename a channel').addStringOption(o=>o.setName('newname').setDescription('New name').setRequired(true)).addChannelOption(o=>o.setName('channel').setDescription('Channel (default: current)')))
      .addSubcommand(s=>s.setName('topic').setDescription('Set channel topic').addStringOption(o=>o.setName('topic').setDescription('New topic').setRequired(true)).addChannelOption(o=>o.setName('channel').setDescription('Channel (default: current)')))
      .addSubcommand(s=>s.setName('nsfw').setDescription('Toggle NSFW').addBooleanOption(o=>o.setName('enabled').setDescription('NSFW on/off').setRequired(true)).addChannelOption(o=>o.setName('channel').setDescription('Channel')))
      .addSubcommand(s=>s.setName('list').setDescription('List all channels'))
      .addSubcommand(s=>s.setName('info').setDescription('Channel information').addChannelOption(o=>o.setName('channel').setDescription('Channel (default: current)')))
      .addSubcommand(s=>s.setName('clone').setDescription('Clone a channel').addChannelOption(o=>o.setName('channel').setDescription('Channel to clone (default: current)'))),

    new SC2().setName('server').setDescription('Server management commands')
      .addSubcommand(s=>s.setName('info').setDescription('Server information'))
      .addSubcommand(s=>s.setName('members').setDescription('Member statistics'))
      .addSubcommand(s=>s.setName('roles').setDescription('List all roles'))
      .addSubcommand(s=>s.setName('channels').setDescription('Channel overview'))
      .addSubcommand(s=>s.setName('bans').setDescription('View ban list'))
      .addSubcommand(s=>s.setName('invites').setDescription('View active invites'))
      .addSubcommand(s=>s.setName('icon').setDescription('Server icon URL'))
      .addSubcommand(s=>s.setName('setname').setDescription('Rename the server').addStringOption(o=>o.setName('name').setDescription('New server name').setRequired(true)))
      .addSubcommand(s=>s.setName('audit').setDescription('View Discord audit log')),

    new SC2().setName('userinfo').setDescription('View information about a user')
      .addUserOption(o=>o.setName('target').setDescription('User (default: yourself)')),

    new SC2().setName('purge').setDescription('Bulk delete messages in current channel')
      .addIntegerOption(o=>o.setName('amount').setDescription('Number of messages (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
      .addUserOption(o=>o.setName('user').setDescription('Only delete messages from this user')),

    new SC2().setName('slowmode').setDescription('Set slowmode for current channel')
      .addIntegerOption(o=>o.setName('seconds').setDescription('Seconds (0 to disable)').setRequired(true).setMinValue(0).setMaxValue(21600)),

    new SC2().setName('lockdown').setDescription('Lock or unlock ALL server channels')
      .addBooleanOption(o=>o.setName('enabled').setDescription('Lock (true) or unlock (false)').setRequired(true))
      .addStringOption(o=>o.setName('reason').setDescription('Reason for lockdown')),

  ].map(c => c.toJSON());

  const rest = new R2({ version:'10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log(`Registering ${adminCmds.length} Discord admin commands...`);
    await rest.put(
      RT2.applicationGuildCommands(process.env.DISCORD_APP_ID, process.env.DISCORD_GUILD_ID),
      { body: adminCmds }
    );
    console.log(`✅ ${adminCmds.length} Discord admin commands registered!`);
  } catch(err) {
    console.error('Discord admin cmd registration failed:', err);
  }
}

registerDiscordAdminCommands();
