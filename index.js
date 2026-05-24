require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ]
});

// ── Helpers ───────────────────────────────────────────────────────
const COLORS = { red:0xCC0000, blue:0x1A6FFF, green:0x00CC66, gold:0xF5A623, orange:0xFF6600, purple:0x6A00CC, grey:0x555566 };
const ts = () => new Date().toLocaleString('en-US', { timeZone:'America/New_York' });

function embed(title, desc, color=COLORS.red, fields=[]) {
  const e = new EmbedBuilder().setColor(color).setTitle(title).setDescription(desc).setTimestamp().setFooter({ text:'RedLineCAD • ' + ts() });
  fields.forEach(f => e.addFields({ name:f.name, value:String(f.value||'N/A'), inline:f.inline??true }));
  return e;
}

async function reply(interaction, title, desc, color=COLORS.red, fields=[], ephemeral=false) {
  try {
    if (!interaction.replied && !interaction.deferred) await interaction.deferReply({ ephemeral });
    await interaction.editReply({ embeds:[embed(title, desc, color, fields)] });
  } catch(e) { console.error('Reply error:', e); }
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
  console.log(`CMD: /${cmd}${sub?' '+sub:''}`);

  const str  = (n,req=false) => interaction.options.getString(n,req)||'';
  const num  = (n,req=false) => interaction.options.getNumber(n,req)||0;

  try {

    // ── /civilian ─────────────────────────────────────────────────
    if (cmd==='civilian') {
      const name = str('name',true);
      if (sub==='lookup')       return reply(interaction,'👤 Civilian Lookup',`Searching for **${name}**`,COLORS.blue,[{name:'CAD',value:'redlinecad.app → Civilians'}]);
      if (sub==='profile')      return reply(interaction,'👤 Civilian Profile',`Full profile for **${name}**`,COLORS.blue,[{name:'CAD',value:'redlinecad.app → Civilians'}]);
      if (sub==='priors')       return reply(interaction,'📋 Prior Record',`Prior history for **${name}**`,COLORS.orange,[{name:'CAD',value:'redlinecad.app → Civilians'}]);
      if (sub==='wanted')       return reply(interaction,'⚠️ Wanted Check',`Checking if **${name}** is wanted`,COLORS.red,[{name:'NCIC',value:'Checking warrants & BOLOs...'}]);
      if (sub==='gang')         return reply(interaction,'🔫 Gang Check',`Gang affiliation for **${name}**`,COLORS.orange,[{name:'Result',value:'Checking gang database...'}]);
      if (sub==='dob')          return reply(interaction,'📅 Date of Birth',`DOB for **${name}**`,COLORS.blue,[{name:'Result',value:'Querying civilian record...'}]);
      if (sub==='address')      return reply(interaction,'🏠 Address',`Address for **${name}**`,COLORS.blue,[{name:'Result',value:'Querying address database...'}]);
      if (sub==='employment')   return reply(interaction,'💼 Employment',`Employment for **${name}**`,COLORS.blue,[{name:'Result',value:'Querying employment records...'}]);
      if (sub==='relationship') return reply(interaction,'❤️ Associates',`Known associates of **${name}**`,COLORS.purple,[{name:'Result',value:'Querying relationship database...'}]);
      if (sub==='property')     return reply(interaction,'🏠 Property',`Properties owned by **${name}**`,COLORS.blue,[{name:'CAD',value:'redlinecad.app → Civilians'}]);
      if (sub==='vehicle')      return reply(interaction,'🚗 Vehicles',`Vehicles registered to **${name}**`,COLORS.blue,[{name:'CAD',value:'redlinecad.app → DMV'}]);
      if (sub==='business')     return reply(interaction,'🏪 Business',`Businesses owned by **${name}**`,COLORS.blue,[{name:'CAD',value:'redlinecad.app → Businesses'}]);
      if (sub==='pets')         return reply(interaction,'🐾 Pets',`Pets registered to **${name}**`,COLORS.blue);
      if (sub==='deceased')     return reply(interaction,'💀 Death Status',`Death check for **${name}**`,COLORS.grey,[{name:'Result',value:'Checking death registry...'}]);
      if (sub==='medhistory')   return reply(interaction,'🏥 Medical History',`Medical records for **${name}**`,COLORS.green,[{name:'CAD',value:'redlinecad.app → EMS'}]);
      if (sub==='dnr')          return reply(interaction,'📋 DNR Status',`DNR check for **${name}**`,COLORS.orange,[{name:'Result',value:'Checking DNR registry...'}]);
      if (sub==='bloodtype')    return reply(interaction,'🩸 Blood Type',`Blood type for **${name}**`,COLORS.red,[{name:'Result',value:'Querying medical database...'}]);
      if (sub==='allergies')    return reply(interaction,'⚠️ Allergies',`Allergies for **${name}**`,COLORS.orange,[{name:'Result',value:'Querying medical database...'}]);
    }

    // ── /vehicle ──────────────────────────────────────────────────
    if (cmd==='vehicle') {
      const plate = str('plate',true);
      if (sub==='plate')        return reply(interaction,'🚗 Plate Lookup',`Running **${plate}**`,COLORS.blue,[{name:'Status',value:'Querying DMV & NCIC...'},{name:'CAD',value:'redlinecad.app'}]);
      if (sub==='stolen')       return reply(interaction,'🚨 Vehicle STOLEN',`**${plate}** marked STOLEN`,COLORS.red,[{name:'Alert',value:'BOLO issued to all units'},{name:'Officer',value:interaction.user.username}]);
      if (sub==='recovered')    return reply(interaction,'✅ Vehicle Recovered',`**${plate}** recovered`,COLORS.green,[{name:'Officer',value:interaction.user.username}]);
      if (sub==='impound')      return reply(interaction,'🚛 Impounded',`**${plate}** impounded\nReason: ${str('reason')||'Not specified'}`,COLORS.orange,[{name:'Officer',value:interaction.user.username},{name:'CAD',value:'Tow sheet filed in RedLineCAD'}]);
      if (sub==='registration') return reply(interaction,'📋 Registration',`Registration for **${plate}**`,COLORS.blue,[{name:'Result',value:'Querying DMV...'}]);
      if (sub==='tow')          return reply(interaction,'🚛 Tow Requested',`Tow for **${plate}**\nLocation: ${str('location')||'Not specified'}`,COLORS.orange,[{name:'Officer',value:interaction.user.username}]);
      if (sub==='alpr')         return reply(interaction,'📡 ALPR Scan',`ALPR on **${plate}**`,COLORS.blue,[{name:'Hits',value:'Checking warrants, stolen, watchlist...'},{name:'Officer',value:interaction.user.username}]);
      if (sub==='watchlist')    return reply(interaction,'👁️ Watchlist Added',`**${plate}** on ALPR watchlist\nReason: ${str('reason')||'Not specified'}`,COLORS.orange,[{name:'Officer',value:interaction.user.username}]);
      if (sub==='insurance')    return reply(interaction,'🛡️ Insurance',`Insurance for **${plate}**`,COLORS.blue,[{name:'Result',value:'Querying insurance database...'}]);
    }

    // ── /warrant ──────────────────────────────────────────────────
    if (cmd==='warrant') {
      if (sub==='issue')       return reply(interaction,'⚖️ Warrant Issued',`Warrant for **${str('name',true)}**\nCharges: ${str('charges')||'See CAD'}\nStatus: Pending Judicial Approval`,COLORS.red,[{name:'Officer',value:interaction.user.username},{name:'Action',value:'Judicial approval needed in RedLineCAD'}]);
      if (sub==='check')       return reply(interaction,'🔍 Warrant Check',`Warrants for **${str('name',true)}**`,COLORS.blue,[{name:'Result',value:'Querying active warrants...'}]);
      if (sub==='approve')     return reply(interaction,'✅ Warrant Approved',`Warrant for **${str('name',true)}** approved`,COLORS.green,[{name:'Judge',value:interaction.user.username},{name:'Status',value:'ACTIVE — Units may execute'}]);
      if (sub==='expunge')     return reply(interaction,'🗑️ Record Expunged',`Record expunged for **${str('name',true)}**`,COLORS.green,[{name:'Judge',value:interaction.user.username}]);
      if (sub==='deactivate')  return reply(interaction,'⏸️ Warrant Deactivated',`Warrant deactivated for **${str('name',true)}**`,COLORS.grey,[{name:'Officer',value:interaction.user.username}]);
      if (sub==='list')        return reply(interaction,'📋 Active Warrants',`View all warrants at redlinecad.app`,COLORS.red);
    }

    // ── /arrest ───────────────────────────────────────────────────
    if (cmd==='arrest') {
      if (sub==='log')         return reply(interaction,'🔒 Arrest Logged',`**${str('name',true)}** arrested\nCharges: ${str('charges')||'See CAD'}\nLocation: ${str('location')||'Not specified'}`,COLORS.red,[{name:'Officer',value:interaction.user.username},{name:'Next Step',value:'File arrest report in RedLineCAD'}]);
      if (sub==='search')      return reply(interaction,'🔍 Arrest History',`History for **${str('name',true)}**`,COLORS.blue,[{name:'CAD',value:'redlinecad.app → Civilians'}]);
      if (sub==='booking')     return reply(interaction,'📋 Booking Logged',`**${str('name',true)}** booked\nCharges: ${str('charges')||'See CAD'}`,COLORS.red,[{name:'Officer',value:interaction.user.username}]);
    }

    // ── /fine ─────────────────────────────────────────────────────
    if (cmd==='fine') {
      if (sub==='issue')       return reply(interaction,'💸 Fine Issued',`Fine for **${str('player',true)}**\nAmount: **$${num('amount',true)}**\nReason: ${str('reason')||'Violation'}`,COLORS.orange,[{name:'Officer',value:interaction.user.username}]);
      if (sub==='pay')         return reply(interaction,'✅ Fine Paid',`**${str('player',true)}** paid **$${num('amount',true)}**`,COLORS.green,[{name:'Processed by',value:interaction.user.username}]);
      if (sub==='check')       return reply(interaction,'🔍 Fine Check',`Fines for **${str('player',true)}**`,COLORS.blue,[{name:'CAD',value:'redlinecad.app → Economy'}]);
      if (sub==='waive')       return reply(interaction,'🗑️ Fine Waived',`Fine waived for **${str('player',true)}**\nReason: ${str('reason')||'Not specified'}`,COLORS.green,[{name:'Officer',value:interaction.user.username}]);
    }

    // ── /bolo ─────────────────────────────────────────────────────
    if (cmd==='bolo') {
      if (sub==='issue')       return reply(interaction,'🚨 BOLO ISSUED',`**BE ON THE LOOKOUT**\nSubject: **${str('subject',true)}**\nDescription: ${str('description')||'Armed and dangerous'}\nReason: ${str('reason')||'Not specified'}`,COLORS.red,[{name:'Issued by',value:interaction.user.username},{name:'Priority',value:str('priority')||'Standard'},{name:'Status',value:'🔴 ACTIVE'}]);
      if (sub==='cancel')      return reply(interaction,'✅ BOLO Cancelled',`BOLO for **${str('subject',true)}** cancelled`,COLORS.green,[{name:'Cancelled by',value:interaction.user.username}]);
      if (sub==='list')        return reply(interaction,'📋 Active BOLOs',`View all BOLOs at redlinecad.app`,COLORS.red);
      if (sub==='vehicle')     return reply(interaction,'🚗 Vehicle BOLO',`**VEHICLE BOLO**\nPlate: **${str('plate',true)}**\nDescription: ${str('description')||'Not specified'}`,COLORS.red,[{name:'Issued by',value:interaction.user.username},{name:'Status',value:'🔴 ACTIVE'}]);
    }

    // ── /dispatch ─────────────────────────────────────────────────
    if (cmd==='dispatch') {
      if (sub==='call')        return reply(interaction,'📡 DISPATCH CALL',`**${str('title',true)}**\n📍 ${str('location',true)}\n${str('description')||'No additional details'}`,str('priority')==='High'?COLORS.red:str('priority')==='Medium'?COLORS.orange:COLORS.blue,[{name:'Priority',value:str('priority')||'Standard'},{name:'Dispatched by',value:interaction.user.username},{name:'Status',value:'🟡 Pending — Awaiting unit'}]);
      if (sub==='close')       return reply(interaction,'✅ Call Closed',`Call **${str('callid',true)}** closed\nDisposition: ${str('disposition')||'See CAD'}`,COLORS.green,[{name:'Closed by',value:interaction.user.username}]);
      if (sub==='assign')      return reply(interaction,'📋 Unit Assigned',`**${str('unit',true)}** assigned to **${str('callid',true)}**`,COLORS.blue,[{name:'Dispatcher',value:interaction.user.username}]);
      if (sub==='active')      return reply(interaction,'📡 Active Calls',`View live calls at redlinecad.app`,COLORS.blue);
      if (sub==='911')         return reply(interaction,'📞 911 CALL',`**EMERGENCY 911 CALL**\n📍 ${str('location',true)}\n${str('description',true)}`,COLORS.red,[{name:'Nature',value:str('nature')||'Unknown'},{name:'Priority',value:'🔴 HIGH'}]);
    }

    // ── /unit ─────────────────────────────────────────────────────
    if (cmd==='unit') {
      const callsign = str('callsign');
      if (sub==='status')      return reply(interaction,'🔘 Status Updated',`**${callsign||interaction.user.username}** → ${str('status',true)}`,COLORS.blue,[{name:'Time',value:ts()}]);
      if (sub==='list')        return reply(interaction,'🚔 Active Units',`View all units at redlinecad.app`,COLORS.blue);
      if (sub==='oncall')      return reply(interaction,'📋 On-Duty Units',`View roster at redlinecad.app`,COLORS.blue);
      if (sub==='panic')       return reply(interaction,'🚨 OFFICER PANIC',`**⚠️ OFFICER NEEDS HELP — ALL UNITS RESPOND ⚠️**\nUnit: **${callsign||interaction.user.username}**\nLocation: ${str('location')||'UNKNOWN — PING UNIT NOW'}`,COLORS.red,[{name:'STATUS',value:'🔴 CODE 3 — RESPOND IMMEDIATELY'}]);
      if (sub==='offduty')     return reply(interaction,'⏹️ Off Duty',`**${callsign||interaction.user.username}** is 10-7`,COLORS.grey,[{name:'Time',value:ts()}]);
      if (sub==='onduty')      return reply(interaction,'▶️ On Duty',`**${callsign||interaction.user.username}** is 10-8`,COLORS.green,[{name:'Time',value:ts()}]);
      if (sub==='assign')      return reply(interaction,'📋 Unit Assigned',`**${callsign}** assigned to ${str('assignment',true)}`,COLORS.blue,[{name:'Dispatcher',value:interaction.user.username}]);
      if (sub==='transfer')    return reply(interaction,'🔄 Unit Transferred',`**${callsign}** → ${str('department',true)}`,COLORS.blue,[{name:'By',value:interaction.user.username}]);
    }

    // ── /leo ──────────────────────────────────────────────────────
    if (cmd==='leo') {
      if (sub==='ncic')        return reply(interaction,'🔍 NCIC LOOKUP',`Full NCIC on **${str('name',true)}**`,COLORS.blue,[{name:'Warrants',value:'Checking...'},{name:'License',value:'Checking...'},{name:'Vehicles',value:'Checking...'},{name:'BOLOs',value:'Checking...'},{name:'CAD',value:'redlinecad.app'}]);
      if (sub==='pursuit')     return reply(interaction,'🚔 PURSUIT IN PROGRESS',`Unit: **${str('callsign',true)}**\nVehicle: ${str('vehicle',true)}\nDirection: ${str('direction')||'Unknown'}`,COLORS.red,[{name:'STATUS',value:'🔴 CODE 3'},{name:'All Units',value:'Prepare containment'}]);
      if (sub==='pursuitend')  return reply(interaction,'✅ Pursuit Ended',`Outcome: ${str('outcome',true)}`,COLORS.green,[{name:'Officer',value:interaction.user.username}]);
      if (sub==='evidence')    return reply(interaction,'🔬 Evidence Logged',`Case **${str('caseid',true)}** — ${str('item',true)}`,COLORS.blue,[{name:'Officer',value:interaction.user.username}]);
      if (sub==='caseload')    return reply(interaction,'📂 Case Load',`View cases at redlinecad.app`,COLORS.blue);
      if (sub==='mugshot')     return reply(interaction,'📸 Mugshot',`Pulling mugshot for **${str('name',true)}**`,COLORS.grey,[{name:'CAD',value:'redlinecad.app → Civilians'}]);
      if (sub==='confidential')return reply(interaction,'🔒 Flagged Confidential',`Record for **${str('name',true)}** — CONFIDENTIAL`,COLORS.red,[{name:'Officer',value:interaction.user.username}]);
      if (sub==='trackvehicle')return reply(interaction,'👁️ Under Surveillance',`**${str('plate',true)}** added to surveillance`,COLORS.orange,[{name:'Officer',value:interaction.user.username}]);
      if (sub==='weapons')     return reply(interaction,'🔫 Weapons Check',`Weapons for **${str('name',true)}**`,COLORS.orange,[{name:'Result',value:'Querying weapons registry...'}]);
      if (sub==='suspect')     return reply(interaction,'👤 Suspect Added',`**${str('name',true)}** → Case **${str('caseid',true)}**`,COLORS.red,[{name:'Officer',value:interaction.user.username}]);
      if (sub==='caseclose')   return reply(interaction,'✅ Case Closed',`Case **${str('caseid',true)}** — ${str('outcome')||'See CAD'}`,COLORS.green,[{name:'Officer',value:interaction.user.username}]);
      if (sub==='roadblock')   return reply(interaction,'🚧 ROADBLOCK',`Roadblock at **${str('location',true)}**`,COLORS.orange,[{name:'Officer',value:interaction.user.username}]);
      if (sub==='perimeter')   return reply(interaction,'📍 PERIMETER SET',`Perimeter around **${str('location',true)}**`,COLORS.red,[{name:'Officer',value:interaction.user.username}]);
      if (sub==='swat')        return reply(interaction,'🎯 SWAT REQUESTED',`Location: **${str('location',true)}**\n${str('situation')||'High-risk'}`,COLORS.red,[{name:'Requesting',value:interaction.user.username}]);
      if (sub==='k9')          return reply(interaction,'🐕 K9 DEPLOYED',`**${str('location',true)}**\nHandler: ${str('handler')||interaction.user.username}`,COLORS.blue,[{name:'Purpose',value:str('purpose')||'Search'}]);
      if (sub==='drone')       return reply(interaction,'🚁 DRONE DEPLOYED',`Over **${str('location',true)}**`,COLORS.blue,[{name:'Operator',value:interaction.user.username}]);
      if (sub==='spike')       return reply(interaction,'⚠️ SPIKE STRIPS',`Deployed at **${str('location',true)}**`,COLORS.orange,[{name:'Officer',value:interaction.user.username},{name:'Warning',value:'Notify ALL units of location'}]);
    }

    // ── /ems ──────────────────────────────────────────────────────
    if (cmd==='ems') {
      if (sub==='pcr')         return reply(interaction,'📋 PCR Filed',`Patient: **${str('patient',true)}**\nCC: ${str('complaint')||'See CAD'}`,COLORS.green,[{name:'Medic',value:interaction.user.username}]);
      if (sub==='vitals')      return reply(interaction,'❤️ Vitals',`**${str('patient',true)}**\nBP: ${str('bp')||'?'} | HR: ${str('hr')||'?'} | SpO2: ${str('spo2')||'?'}%\nRR: ${str('rr')||'?'} | GCS: ${str('gcs')||'?'}`,COLORS.green,[{name:'Medic',value:interaction.user.username}]);
      if (sub==='hospital')    return reply(interaction,'🏥 Hospital Status',`View live board at redlinecad.app`,COLORS.green);
      if (sub==='units')       return reply(interaction,'🚑 EMS Units',`View all EMS units at redlinecad.app`,COLORS.green);
      if (sub==='mci')         return reply(interaction,'🚨 MCI DECLARED',`**MASS CASUALTY INCIDENT**\nLocation: **${str('location',true)}**\nEst. patients: ${str('patients')||'Unknown'}`,COLORS.red,[{name:'IC',value:interaction.user.username},{name:'STATUS',value:'🔴 ALL EMS RESPOND'}]);
      if (sub==='mayday')      return reply(interaction,'🚨 MAYDAY MAYDAY MAYDAY',`FF: **${str('name',true)}**\nLocation: ${str('location')||'UNKNOWN'}\nAir: ${str('air')||'Unknown'}`,COLORS.red,[{name:'STATUS',value:'🔴 RIT DEPLOY NOW'}]);
      if (sub==='triage') {
        const tag = str('tag',true);
        const tagColors = {red:COLORS.red,yellow:COLORS.orange,green:COLORS.green,black:COLORS.grey};
        const tagDesc = {red:'⚠️ IMMEDIATE — Life threatening',yellow:'⚠️ DELAYED — Serious but stable',green:'✅ MINOR — Walking wounded',black:'⛔ EXPECTANT — Do not treat'};
        return reply(interaction,'🏷️ Triage Tag',`**${str('patient',true)}** → **${tag.toUpperCase()}**\n${tagDesc[tag]||''}`,tagColors[tag]||COLORS.blue,[{name:'Medic',value:interaction.user.username}]);
      }
      if (sub==='transport')   return reply(interaction,'🚑 Transport',`**${str('patient',true)}** en route to hospital\nCondition: ${str('condition')||'See PCR'}`,COLORS.green,[{name:'Medic',value:interaction.user.username}]);
      if (sub==='trauma')      return reply(interaction,'🚨 TRAUMA ACTIVATION',`Patient: **${str('patient',true)}**\nETA: ${str('eta')||'Unknown'} min`,COLORS.red,[{name:'Medic',value:interaction.user.username}]);
      if (sub==='cardiac')     return reply(interaction,'❤️ CARDIAC ARREST',`Location: **${str('location',true)}**\nCPR in progress: ${str('cpr')||'Yes'}`,COLORS.red,[{name:'Medic',value:interaction.user.username}]);
      if (sub==='overdose')    return reply(interaction,'💊 OVERDOSE',`Location: **${str('location',true)}**\nSubstance: ${str('substance')||'Unknown'}`,COLORS.orange,[{name:'Medic',value:interaction.user.username}]);
      if (sub==='handoff')     return reply(interaction,'🤝 Handoff Complete',`**${str('patient',true)}** handed off\nRoom: ${str('room')||'ER'}`,COLORS.green,[{name:'Medic',value:interaction.user.username}]);
    }

    // ── /fire ─────────────────────────────────────────────────────
    if (cmd==='fire') {
      if (sub==='incident')    return reply(interaction,'🔥 FIRE INCIDENT',`**WORKING FIRE**\n📍 ${str('location',true)}\nType: ${str('type')||'Structure'}\nAlarm: ${str('alarm')||'1st Alarm'}`,COLORS.red,[{name:'IC',value:interaction.user.username},{name:'STATUS',value:'🔴 WORKING FIRE'}]);
      if (sub==='out')         return reply(interaction,'✅ Fire Out',`Fire at **${str('location',true)}** — KNOCKDOWN\nTime: ${ts()}`,COLORS.green,[{name:'IC',value:interaction.user.username}]);
      if (sub==='par')         return reply(interaction,'👥 PAR COUNT',`**ALL UNITS — ACCOUNT FOR YOURSELVES**\nLocation: **${str('location',true)}**`,COLORS.orange,[{name:'IC',value:interaction.user.username}]);
      if (sub==='hazmat')      return reply(interaction,'☣️ HAZMAT',`**HAZMAT DECLARED**\n📍 ${str('location',true)}\nSubstance: ${str('substance')||'Unknown'}\nEvac radius: ${str('radius')||'See IC'}`,COLORS.orange,[{name:'IC',value:interaction.user.username}]);
      if (sub==='evacuation')  return reply(interaction,'🚨 EVACUATION ORDER',`**MANDATORY EVACUATION**\nArea: **${str('area',true)}**\nReason: ${str('reason')||'Emergency'}`,COLORS.red,[{name:'IC',value:interaction.user.username}]);
      if (sub==='rescue')      return reply(interaction,'🦺 RESCUE OPERATION',`Location: **${str('location',true)}**\nType: ${str('type')||'Extrication'}\nVictims: ${str('victims')||'Unknown'}`,COLORS.orange,[{name:'IC',value:interaction.user.username}]);
      if (sub==='exposure')    return reply(interaction,'🏢 EXPOSURE',`Exposure ${str('number',true)} — **${str('address',true)}**\nStatus: ${str('status')||'Monitoring'}`,COLORS.orange,[{name:'IC',value:interaction.user.username}]);
      if (sub==='waterops')    return reply(interaction,'💧 WATER OPS',`Water established at **${str('location',true)}**\nSource: ${str('source')||'Hydrant'}`,COLORS.blue,[{name:'Engineer',value:interaction.user.username}]);
    }

    // ── /corrections ──────────────────────────────────────────────
    if (cmd==='corrections') {
      if (sub==='booking')     return reply(interaction,'📋 BOOKING',`**${str('name',true)}** booked\nCharges: ${str('charges')||'See CAD'}\nSentence: ${str('sentence')||'Pending'}`,COLORS.red,[{name:'Officer',value:interaction.user.username}]);
      if (sub==='release')     return reply(interaction,'🔓 RELEASED',`**${str('name',true)}** released\nReason: ${str('reason')||'Sentence served'}`,COLORS.green,[{name:'Officer',value:interaction.user.username}]);
      if (sub==='sentence')    return reply(interaction,'⚖️ Sentence',`Sentence for **${str('name',true)}**`,COLORS.blue,[{name:'CAD',value:'redlinecad.app → Corrections'}]);
      if (sub==='addtime')     return reply(interaction,'⏱️ Time Added',`**${str('name',true)}** — +${str('time',true)}\nReason: ${str('reason')||'Disciplinary'}`,COLORS.red,[{name:'Officer',value:interaction.user.username}]);
      if (sub==='cellcheck')   return reply(interaction,'✅ Cell Check',`**${str('name',true)}** — ${str('status')||'Clear'}`,COLORS.green,[{name:'Officer',value:interaction.user.username}]);
      if (sub==='contraband')  return reply(interaction,'⚠️ CONTRABAND',`Found on **${str('name',true)}**: ${str('item',true)}`,COLORS.red,[{name:'Officer',value:interaction.user.username}]);
      if (sub==='transport')   return reply(interaction,'🚌 Transport',`**${str('name',true)}** — ${str('from')||'Jail'} → ${str('to')||'Courthouse'}`,COLORS.blue,[{name:'Officer',value:interaction.user.username}]);
      if (sub==='visitation')  return reply(interaction,'👥 Visitation',`**${str('name',true)}** — Visitor: ${str('visitor',true)}`,COLORS.blue,[{name:'Officer',value:interaction.user.username}]);
      if (sub==='prisoner')    return reply(interaction,'🔍 Prisoner Status',`Status for **${str('name',true)}**`,COLORS.blue,[{name:'CAD',value:'redlinecad.app → Corrections'}]);
    }

    // ── /judicial ─────────────────────────────────────────────────
    if (cmd==='judicial') {
      if (sub==='sentence')    return reply(interaction,'⚖️ Sentence Issued',`**${str('name',true)}** — ${str('sentence',true)}\nCharges: ${str('charges')||'See CAD'}`,COLORS.red,[{name:'Judge',value:interaction.user.username}]);
      if (sub==='verdict')     return reply(interaction,'⚖️ VERDICT',`**${str('name',true)}** — ${(str('verdict',true)||'').toUpperCase()}`,str('verdict')==='guilty'?COLORS.red:COLORS.green,[{name:'Judge',value:interaction.user.username}]);
      if (sub==='bail')        return reply(interaction,'💰 Bail Set',`**${str('name',true)}** — $${num('amount',true)}\nConditions: ${str('conditions')||'Standard'}`,COLORS.blue,[{name:'Judge',value:interaction.user.username}]);
      if (sub==='plea')        return reply(interaction,'📋 Plea Entered',`**${str('name',true)}** — ${str('plea',true)}`,COLORS.blue,[{name:'Judge',value:interaction.user.username}]);
      if (sub==='courtdate')   return reply(interaction,'📅 Court Date',`**${str('name',true)}** — ${str('date',true)}\nRoom: ${str('room')||'See CAD'}`,COLORS.blue,[{name:'Judge',value:interaction.user.username}]);
      if (sub==='expunge')     return reply(interaction,'🗑️ Expunged',`Record expunged for **${str('name',true)}**`,COLORS.green,[{name:'Judge',value:interaction.user.username}]);
      if (sub==='attorney')    return reply(interaction,'👔 Attorney Assigned',`**${str('attorney',true)}** → **${str('name',true)}**`,COLORS.blue,[{name:'Judge',value:interaction.user.username}]);
      if (sub==='charge')      return reply(interaction,'⚖️ Charge Added',`**${str('name',true)}** — ${str('charge',true)}`,COLORS.red,[{name:'Officer',value:interaction.user.username}]);
    }

    // ── /economy ──────────────────────────────────────────────────
    if (cmd==='economy') {
      if (sub==='balance')     return reply(interaction,'💰 Balance',`Balance for **${str('player',true)}**`,COLORS.green,[{name:'CAD',value:'redlinecad.app → Economy'}]);
      if (sub==='pay')         return reply(interaction,'💸 Payment Sent',`$${num('amount',true)} → **${str('player',true)}**`,COLORS.green,[{name:'From',value:interaction.user.username}]);
      if (sub==='salary')      return reply(interaction,'📋 Salary',`Payroll for **${str('player')||interaction.user.username}**`,COLORS.green,[{name:'CAD',value:'redlinecad.app → Payroll'}]);
      if (sub==='tax')         return reply(interaction,'🧾 Tax Status',`Tax info at redlinecad.app`,COLORS.gold);
      if (sub==='loan')        return reply(interaction,'💳 Loan Status',`Loan info at redlinecad.app`,COLORS.orange);
      if (sub==='stocks')      return reply(interaction,'📈 Stock Market',`View live prices at redlinecad.app → Stocks`,COLORS.green);
      if (sub==='insurance')   return reply(interaction,'🛡️ Insurance',`Policies at redlinecad.app → Insurance`,COLORS.blue);
      if (sub==='citybudget')  return reply(interaction,'🏙️ City Budget',`Treasury at redlinecad.app → City Budget`,COLORS.gold);
      if (sub==='lottery')     return reply(interaction,'🎰 Lottery',`Jackpot info at redlinecad.app → Casino`,COLORS.gold);
      if (sub==='transfer')    return reply(interaction,'💸 Transfer',`$${num('amount',true)} → **${str('player',true)}**`,COLORS.green,[{name:'From',value:interaction.user.username}]);
    }

    // ── /admin ────────────────────────────────────────────────────
    if (cmd==='admin') {
      if (sub==='announce')    return reply(interaction,'📢 ANNOUNCEMENT',str('message',true),COLORS.red,[{name:'From',value:interaction.user.username},{name:'Time',value:ts()}]);
      if (sub==='serverinfo')  return reply(interaction,'ℹ️ Server Info',`View stats at redlinecad.app → Admin Panel`,COLORS.blue);
      if (sub==='kick')        return reply(interaction,'👟 Removed',`**${str('player',true)}** removed\nReason: ${str('reason')||'Not specified'}`,COLORS.orange,[{name:'Admin',value:interaction.user.username}]);
      if (sub==='warn')        return reply(interaction,'⚠️ Warning Issued',`**${str('player',true)}** warned\nReason: ${str('reason',true)}`,COLORS.orange,[{name:'Admin',value:interaction.user.username}]);
      if (sub==='suspend')     return reply(interaction,'⏸️ SUSPENDED',`**${str('player',true)}** — ${str('duration',true)}\nReason: ${str('reason',true)}`,COLORS.red,[{name:'Admin',value:interaction.user.username}]);
      if (sub==='promote')     return reply(interaction,'🏅 PROMOTION',`**${str('player',true)}** → **${str('rank',true)}**`,COLORS.gold,[{name:'Approved by',value:interaction.user.username}]);
      if (sub==='demote')      return reply(interaction,'⬇️ Demotion',`**${str('player',true)}** → **${str('rank',true)}**`,COLORS.orange,[{name:'By',value:interaction.user.username}]);
      if (sub==='eas')         return reply(interaction,'📡 EMERGENCY BROADCAST',`⚠️ **${str('message',true)}** ⚠️`,COLORS.red,[{name:'Source',value:'RedLineCAD EAS'},{name:'By',value:interaction.user.username}]);
      if (sub==='audit')       return reply(interaction,'📜 Audit Log',`Audit for **${str('player')||'All Members'}**\nView full log at redlinecad.app`,COLORS.blue);
      if (sub==='weather')     return reply(interaction,'🌤️ Weather Set',`**${str('weather',true)}**`,COLORS.blue,[{name:'Set by',value:interaction.user.username}]);
      if (sub==='event')       return reply(interaction,'🎉 EVENT',`**${str('title',true)}**\n${str('description')||''}\nDate: ${str('date')||'TBD'}`,COLORS.purple,[{name:'Host',value:interaction.user.username}]);
      if (sub==='snapshot')    return reply(interaction,'💾 Snapshot Created',`Backup created at ${ts()}`,COLORS.green,[{name:'By',value:interaction.user.username}]);
      if (sub==='roster')      return reply(interaction,'👥 Roster',`**${str('department')||'All Departments'}**\nView at redlinecad.app → Members`,COLORS.blue);
      if (sub==='commend')     return reply(interaction,'🏅 COMMENDATION',`**${str('player',true)}** — ${str('award',true)}\n${str('reason',true)}`,COLORS.gold,[{name:'By',value:interaction.user.username}]);
      if (sub==='abusereport') return reply(interaction,'🚩 Abuse Report',`Reported: **${str('player',true)}**\n${str('reason',true)}`,COLORS.red,[{name:'By',value:interaction.user.username}]);
    }

    // ── /stats ────────────────────────────────────────────────────
    if (cmd==='stats') {
      if (sub==='mystats')     return reply(interaction,'📊 My Stats',`Stats for **${interaction.user.username}**\nView at redlinecad.app → Profile`,COLORS.blue);
      if (sub==='leaderboard') return reply(interaction,'🏆 Leaderboard',`Top officers — view at redlinecad.app`,COLORS.gold);
      if (sub==='arrests')     return reply(interaction,'🔒 Arrest Stats',`Top arrests — view at redlinecad.app`,COLORS.blue);
      if (sub==='citations')   return reply(interaction,'📄 Citation Stats',`Top citations — view at redlinecad.app`,COLORS.blue);
      if (sub==='activity')    return reply(interaction,'📈 Activity',`**${str('player')||interaction.user.username}** — view at redlinecad.app`,COLORS.blue);
      if (sub==='department')  return reply(interaction,'🏢 Dept Stats',`**${str('department')||'All Depts'}** — view at redlinecad.app`,COLORS.blue);
      if (sub==='economy')     return reply(interaction,'💰 Economy Stats',`Economy overview at redlinecad.app`,COLORS.green);
      if (sub==='crimestat')   return reply(interaction,'🔍 Crime Stats',`City crime stats at redlinecad.app`,COLORS.orange);
    }

    // ── /city ─────────────────────────────────────────────────────
    if (cmd==='city') {
      if (sub==='weather')     return reply(interaction,'🌤️ Weather',`Current weather — check redlinecad.app`,COLORS.blue);
      if (sub==='time')        return reply(interaction,'🕐 Server Time',`**${ts()}**`,COLORS.blue);
      if (sub==='news')        return reply(interaction,'📰 City News',`Latest news at redlinecad.app → Newspaper`,COLORS.blue);
      if (sub==='mayor')       return reply(interaction,'🏛️ MAYORAL ANNOUNCEMENT',str('message',true),COLORS.gold,[{name:'Office of the Mayor',value:interaction.user.username}]);
      if (sub==='ordinance')   return reply(interaction,'📜 NEW ORDINANCE',`**${str('title',true)}**\n${str('description',true)}\nEffective: ${str('date')||'Immediately'}`,COLORS.gold,[{name:'Signed by',value:interaction.user.username}]);
      if (sub==='curfew')      return reply(interaction,'🌙 CURFEW',`${str('start',true)} – ${str('end',true)}\nReason: ${str('reason')||'Public safety'}`,COLORS.red,[{name:'Signed by',value:interaction.user.username}]);
      if (sub==='amber')       return reply(interaction,'🚨 AMBER ALERT',`Child: **${str('name',true)}**\nAge: ${str('age')||'?'}\nLast seen: ${str('location',true)}\nVehicle: ${str('vehicle')||'Unknown'}`,COLORS.red,[{name:'CONTACT',value:'911 with any information'}]);
      if (sub==='silver')      return reply(interaction,'🚨 SILVER ALERT',`**${str('name',true)}** — Last seen: ${str('location',true)}\n${str('description')||''}`,COLORS.orange,[{name:'CONTACT',value:'911 with any information'}]);
      if (sub==='missing')     return reply(interaction,'👤 MISSING PERSON',`**${str('name',true)}**\nAge: ${str('age')||'?'} · Last seen: ${str('location',true)}\n${str('description')||''}`,COLORS.orange,[{name:'Filed by',value:interaction.user.username}]);
      if (sub==='found')       return reply(interaction,'✅ Person Located',`**${str('name',true)}** — ${str('condition')||'Safe'}`,COLORS.green,[{name:'Officer',value:interaction.user.username}]);
      if (sub==='press')       return reply(interaction,'📰 PRESS RELEASE',`**Official LSPD Statement**\n${str('message',true)}`,COLORS.blue,[{name:'By',value:interaction.user.username}]);
      if (sub==='seizure')     return reply(interaction,'💰 Asset Seizure',`**${str('name',true)}** — ${str('assets',true)}`,COLORS.red,[{name:'Officer',value:interaction.user.username}]);
    }

    // ── /rp ───────────────────────────────────────────────────────
    if (cmd==='rp') {
      if (sub==='me')          return reply(interaction,'🎭 RP Action',`*${interaction.user.username} ${str('action',true)}*`,COLORS.purple);
      if (sub==='do')          return reply(interaction,'🌍 Scene Description',`*${str('description',true)}*`,COLORS.purple,[{name:'Narrator',value:interaction.user.username}]);
      if (sub==='ooc')         return reply(interaction,'💬 OOC',`**${interaction.user.username}:** ${str('message',true)}`,COLORS.grey);
      if (sub==='roll')        { const r=Math.floor(Math.random()*100)+1; return reply(interaction,'🎲 Roll',`**${interaction.user.username}** rolled **${r}/100**`,r>=90?COLORS.green:r<=10?COLORS.red:COLORS.blue,[{name:'Outcome',value:r>=90?'🎉 Critical Success!':r<=10?'💀 Critical Fail':r>=60?'✅ Success':'⚠️ Partial'}]); }
      if (sub==='coin')        { const h=Math.random()>0.5; return reply(interaction,'🪙 Coin Flip',`**${h?'HEADS':'TAILS'}**`,h?COLORS.gold:COLORS.grey); }
      if (sub==='8ball')       { const a=['Yes, definitely.','No way.','Ask again later.','Signs point to yes.','My sources say no.','Without a doubt.','Very doubtful.','It is certain.','Cannot predict now.','Outlook not so good.']; return reply(interaction,'🎱 Magic 8-Ball',`*${str('question',true)}*\n\n**${a[Math.floor(Math.random()*a.length)]}**`,COLORS.purple); }
      if (sub==='wanted')      return reply(interaction,'🚨 WANTED POSTER',`⚠️ **WANTED** ⚠️\n**${str('name',true)}**\n${str('description')||'Armed and dangerous'}\nReward: **$${str('reward')||'See Dispatcher'}**`,COLORS.red,[{name:'Issued by',value:interaction.user.username}]);
      if (sub==='bounty')      return reply(interaction,'💰 BOUNTY',`**${str('name',true)}** — $${str('amount',true)}\nReason: ${str('reason')||'Not specified'}`,COLORS.gold,[{name:'Posted by',value:interaction.user.username}]);
      if (sub==='scenario')    return reply(interaction,'🎭 RP Scenario',`Generating ${str('type')||'random'} scenario...\nUse /rp me to perform actions`,COLORS.purple);
      if (sub==='lore')        return reply(interaction,'📖 City Chronicle',`Latest lore at redlinecad.app → Chronicle`,COLORS.purple);
      if (sub==='backstory')   return reply(interaction,'📖 Backstory',`Generating for **${str('name',true)}** — check redlinecad.app → AI Tools`,COLORS.purple);
      if (sub==='heist')       return reply(interaction,'🔫 HEIST IN PROGRESS',`Location: **${str('location',true)}**\nType: ${str('type')||'Unknown'}`,COLORS.red,[{name:'Alert',value:'All available units respond'}]);
      if (sub==='tryaction')   { const s=Math.random()>0.4; return reply(interaction,'🎲 Action Attempt',`**${interaction.user.username}** tries: *${str('action',true)}*\n\n**${s?'✅ SUCCESS':'❌ FAILED'}**`,s?COLORS.green:COLORS.red); }
    }

    // ── /report ───────────────────────────────────────────────────
    if (cmd==='report') {
      if (sub==='incident')    return reply(interaction,'📋 Incident Report',`**${str('title',true)}**\n📍 ${str('location',true)}\n${str('description')||'See CAD'}`,COLORS.blue,[{name:'Officer',value:interaction.user.username},{name:'CAD',value:'File full report at redlinecad.app'}]);
      if (sub==='crash')       return reply(interaction,'🚗 Crash Report',`📍 ${str('location',true)}\nVehicles: ${str('vehicles')||'Unknown'}\nInjuries: ${str('injuries')||'None'}`,COLORS.orange,[{name:'Officer',value:interaction.user.username}]);
      if (sub==='missing')     return reply(interaction,'👤 Missing Person',`**${str('name',true)}**\nLast seen: ${str('location')||'Unknown'}`,COLORS.orange,[{name:'Filed by',value:interaction.user.username}]);
      if (sub==='dui')         return reply(interaction,'🍺 DUI Report',`Subject: **${str('subject',true)}**\nBAC: ${str('bac')||'Pending'}\n📍 ${str('location')||'See CAD'}`,COLORS.red,[{name:'Officer',value:interaction.user.username}]);
      if (sub==='useofforce')  return reply(interaction,'⚠️ Use of Force',`Subject: **${str('subject',true)}**\nForce: ${str('force',true)}\nSupervisor review required`,COLORS.red,[{name:'Officer',value:interaction.user.username}]);
      if (sub==='supplement')  return reply(interaction,'➕ Supplement Filed',`Supplement → Case **${str('caseid',true)}**`,COLORS.blue,[{name:'Officer',value:interaction.user.username}]);
      if (sub==='status')      return reply(interaction,'📋 Report Status',`View reports at redlinecad.app → Reports`,COLORS.blue);
    }

    // ── /license ──────────────────────────────────────────────────
    if (cmd==='license') {
      if (sub==='check')       return reply(interaction,'📋 License Check',`Status for **${str('name',true)}**`,COLORS.blue,[{name:'CAD',value:'redlinecad.app → License System'}]);
      if (sub==='points')      return reply(interaction,'📊 License Points',`Points for **${str('name',true)}**`,COLORS.orange,[{name:'CAD',value:'redlinecad.app → License System'}]);
      if (sub==='suspend')     return reply(interaction,'⛔ License Suspended',`**${str('name',true)}** — ${str('duration')||'30 days'}\nReason: ${str('reason')||'Points threshold'}`,COLORS.red,[{name:'Officer',value:interaction.user.username}]);
      if (sub==='reinstate')   return reply(interaction,'✅ License Reinstated',`**${str('name',true)}** — DL valid`,COLORS.green,[{name:'Officer',value:interaction.user.username}]);
      if (sub==='revoke')      return reply(interaction,'⛔ License REVOKED',`**${str('name',true)}** — DL permanently revoked`,COLORS.red,[{name:'Officer',value:interaction.user.username}]);
      if (sub==='specialty')   return reply(interaction,'🎫 Specialty Licenses',`Licenses for **${str('name',true)}**`,COLORS.blue,[{name:'CAD',value:'redlinecad.app → License System'}]);
      if (sub==='issue')       return reply(interaction,'✅ License Issued',`**${str('type',true)}** → **${str('name',true)}**`,COLORS.green,[{name:'Officer',value:interaction.user.username}]);
    }

    // ── /codes ────────────────────────────────────────────────────
    if (cmd==='codes') {
      const CODE_DB = { '10-4':'Acknowledged','10-7':'Out of Service','10-8':'In Service / Available','10-20':'Location','10-23':'Arrived at Scene','10-33':'Emergency — Clear All Traffic','10-50':'Traffic Accident','10-78':'Officer Needs Assistance','10-80':'Pursuit in Progress','10-99':'Wanted / Stolen Indicated','11-99':'Officer Needs Help — EMERGENCY','11-95':'Routine Traffic Stop','code-3':'Lights & Siren Response','code-4':'All Clear','code-7':'Meal Break','signal-0':'Officer Needs Help Immediately','signal-4':'All Clear','signal-33':'Mental Subject','mayday':'Firefighter in Distress' };
      if (sub==='lookup') {
        const c = (str('code',true)||'').toLowerCase().replace(' ','-');
        return reply(interaction,'📡 Code Lookup',`**${(str('code',true)||'').toUpperCase()}** — ${CODE_DB[c]||'Not found. See redlinecad.app → Codes Reference for all 294 codes.'}`,COLORS.blue);
      }
      if (sub==='common')     return reply(interaction,'📡 Common Codes',`Most used radio codes`,COLORS.blue,[{name:'10-4',value:'Acknowledged'},{name:'10-8',value:'Available'},{name:'10-7',value:'Off Duty'},{name:'10-20',value:'Location?'},{name:'10-33',value:'Emergency'},{name:'10-78',value:'Need Backup'},{name:'11-99',value:'OFFICER EMERGENCY'},{name:'Code 3',value:'Lights & Siren'},{name:'Code 4',value:'All Clear'}]);
      if (sub==='phonetic')   return reply(interaction,'🔤 Phonetic Alphabet',`NATO Phonetic`,COLORS.blue,[{name:'A–E',value:'Alpha Bravo Charlie Delta Echo'},{name:'F–J',value:'Foxtrot Golf Hotel India Juliet'},{name:'K–O',value:'Kilo Lima Mike November Oscar'},{name:'P–T',value:'Papa Quebec Romeo Sierra Tango'},{name:'U–Z',value:'Uniform Victor Whiskey X-Ray Yankee Zulu'}]);
      if (sub==='fire')       return reply(interaction,'🔥 Fire Codes',`Common fire codes`,COLORS.red,[{name:'PAR',value:'Personnel Accountability Report'},{name:'MAYDAY',value:'FF in distress — RIT DEPLOY'},{name:'Offensive',value:'Interior attack'},{name:'Defensive',value:'Exterior attack'},{name:'All Hands',value:'All units working'},{name:'Knockdown',value:'Fire knocked down'}]);
      if (sub==='ems')        return reply(interaction,'🚑 EMS Codes',`Common EMS codes`,COLORS.green,[{name:'Priority 1',value:'Critical — life threatening'},{name:'Priority 2',value:'Emergent'},{name:'Priority 3',value:'Urgent'},{name:'Code 3',value:'Lights & siren response'},{name:'ROSC',value:'Return of spontaneous circulation'},{name:'VSA',value:'Vital signs absent'}]);
    }

    // ── /help ─────────────────────────────────────────────────────
    if (cmd==='help') {
      if (!sub||sub==='all') return reply(interaction,'🚔 RedLineCAD Bot — Full Command Reference',`**${interaction.guild?.name||'RedLineCAD'}** | redlinecad.app`,COLORS.red,[
        {name:'👤 /civilian',value:'lookup • profile • priors • wanted • gang • dob • address • employment • relationship • property • vehicle • business • pets • deceased • medhistory • dnr • bloodtype • allergies',inline:false},
        {name:'🚗 /vehicle',value:'plate • stolen • recovered • impound • registration • tow • alpr • watchlist • insurance',inline:false},
        {name:'⚖️ /warrant',value:'issue • check • approve • expunge • deactivate • list',inline:false},
        {name:'🔒 /arrest',value:'log • search • booking',inline:false},
        {name:'💸 /fine',value:'issue • pay • check • waive',inline:false},
        {name:'🚨 /bolo',value:'issue • cancel • list • vehicle',inline:false},
        {name:'📡 /dispatch',value:'call • close • assign • active • 911',inline:false},
        {name:'🔘 /unit',value:'status • list • oncall • panic • offduty • onduty • assign • transfer',inline:false},
        {name:'🚔 /leo',value:'ncic • pursuit • pursuitend • evidence • caseload • mugshot • confidential • trackvehicle • weapons • suspect • caseclose • roadblock • perimeter • swat • k9 • drone • spike',inline:false},
        {name:'🚑 /ems',value:'pcr • vitals • hospital • units • mci • mayday • triage • transport • trauma • cardiac • overdose • handoff',inline:false},
        {name:'🔥 /fire',value:'incident • out • par • hazmat • evacuation • rescue • exposure • waterops',inline:false},
        {name:'🔒 /corrections',value:'booking • release • sentence • addtime • cellcheck • contraband • transport • visitation • prisoner',inline:false},
        {name:'⚖️ /judicial',value:'sentence • verdict • bail • plea • courtdate • expunge • attorney • charge',inline:false},
        {name:'💰 /economy',value:'balance • pay • salary • tax • loan • stocks • insurance • citybudget • lottery • transfer',inline:false},
        {name:'🛠️ /admin',value:'announce • serverinfo • kick • warn • suspend • promote • demote • eas • audit • weather • event • snapshot • roster • commend • abusereport',inline:false},
        {name:'📊 /stats',value:'mystats • leaderboard • arrests • citations • activity • department • economy • crimestat',inline:false},
        {name:'🌆 /city',value:'weather • time • news • mayor • ordinance • curfew • amber • silver • missing • found • press • seizure',inline:false},
        {name:'🎭 /rp',value:'me • do • ooc • roll • coin • 8ball • wanted • bounty • scenario • lore • backstory • heist • tryaction',inline:false},
        {name:'📋 /report',value:'incident • crash • missing • dui • useofforce • supplement • status',inline:false},
        {name:'📋 /license',value:'check • points • suspend • reinstate • revoke • specialty • issue',inline:false},
        {name:'📡 /codes',value:'lookup • common • phonetic • fire • ems',inline:false},
        {name:'🌐 CAD',value:'**redlinecad.app**',inline:false},
      ],true);
      if (sub==='leo')   return reply(interaction,'🚔 LEO Commands',`/leo ncic • pursuit • pursuitend • evidence • caseload • mugshot • confidential • trackvehicle • weapons • suspect • caseclose • roadblock • perimeter • swat • k9 • drone • spike\n/warrant issue|check|approve|expunge\n/arrest log|search|booking\n/bolo issue|cancel|list|vehicle\n/unit panic|status|onduty|offduty`,COLORS.red);
      if (sub==='ems')   return reply(interaction,'🚑 EMS Commands',`/ems pcr|vitals|hospital|units|mci|mayday|triage|transport|trauma|cardiac|overdose|handoff`,COLORS.green);
      if (sub==='fire')  return reply(interaction,'🔥 Fire Commands',`/fire incident|out|par|hazmat|evacuation|rescue|exposure|waterops`,COLORS.red);
      if (sub==='admin') return reply(interaction,'🛠️ Admin Commands',`/admin announce|serverinfo|kick|warn|suspend|promote|demote|eas|audit|weather|event|snapshot|roster|commend|abusereport`,COLORS.blue);
    }

    // Fallback
    return reply(interaction,'❓ Unknown Command',`Use **/help all** for the full list or visit **redlinecad.app**`,COLORS.grey,[],true);

  } catch(err) {
    console.error('Command error:', err);
    try {
      if (!interaction.replied&&!interaction.deferred) await interaction.reply({content:'⚠️ An error occurred.',ephemeral:true});
      else await interaction.editReply({content:'⚠️ An error occurred.'});
    } catch(e){}
  }
});

// ── Login ─────────────────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN);

// ── Register Commands ─────────────────────────────────────────────
async function registerCommands() {
  const commands = [
    new SlashCommandBuilder().setName('civilian').setDescription('Civilian record commands')
      .addSubcommand(s=>s.setName('lookup').setDescription('Look up a civilian').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('profile').setDescription('Full civilian profile').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('priors').setDescription('Prior arrest history').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('wanted').setDescription('Check if wanted/BOLO').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('gang').setDescription('Gang affiliation check').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('dob').setDescription('Date of birth').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('address').setDescription('Registered address').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('employment').setDescription('Employment info').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('relationship').setDescription('Known associates').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('property').setDescription('Property holdings').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('vehicle').setDescription('Registered vehicles').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('business').setDescription('Business ownership').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('pets').setDescription('Registered pets').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('deceased').setDescription('Death status').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('medhistory').setDescription('Medical history').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('dnr').setDescription('DNR status').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('bloodtype').setDescription('Blood type').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('allergies').setDescription('Known allergies').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true))),

    new SlashCommandBuilder().setName('vehicle').setDescription('Vehicle commands')
      .addSubcommand(s=>s.setName('plate').setDescription('Plate lookup').addStringOption(o=>o.setName('plate').setDescription('Plate').setRequired(true)))
      .addSubcommand(s=>s.setName('stolen').setDescription('Mark stolen').addStringOption(o=>o.setName('plate').setDescription('Plate').setRequired(true)))
      .addSubcommand(s=>s.setName('recovered').setDescription('Mark recovered').addStringOption(o=>o.setName('plate').setDescription('Plate').setRequired(true)))
      .addSubcommand(s=>s.setName('impound').setDescription('Impound vehicle').addStringOption(o=>o.setName('plate').setDescription('Plate').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason')))
      .addSubcommand(s=>s.setName('registration').setDescription('Check registration').addStringOption(o=>o.setName('plate').setDescription('Plate').setRequired(true)))
      .addSubcommand(s=>s.setName('tow').setDescription('Request tow').addStringOption(o=>o.setName('plate').setDescription('Plate').setRequired(true)).addStringOption(o=>o.setName('location').setDescription('Location')))
      .addSubcommand(s=>s.setName('alpr').setDescription('ALPR scan').addStringOption(o=>o.setName('plate').setDescription('Plate').setRequired(true)))
      .addSubcommand(s=>s.setName('watchlist').setDescription('Add to watchlist').addStringOption(o=>o.setName('plate').setDescription('Plate').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason')))
      .addSubcommand(s=>s.setName('insurance').setDescription('Insurance check').addStringOption(o=>o.setName('plate').setDescription('Plate').setRequired(true))),

    new SlashCommandBuilder().setName('warrant').setDescription('Warrant commands')
      .addSubcommand(s=>s.setName('issue').setDescription('Issue warrant').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)).addStringOption(o=>o.setName('charges').setDescription('Charges')))
      .addSubcommand(s=>s.setName('check').setDescription('Check warrants').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('approve').setDescription('Approve warrant').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('expunge').setDescription('Expunge record').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('deactivate').setDescription('Deactivate warrant').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('list').setDescription('List active warrants')),

    new SlashCommandBuilder().setName('arrest').setDescription('Arrest commands')
      .addSubcommand(s=>s.setName('log').setDescription('Log arrest').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)).addStringOption(o=>o.setName('charges').setDescription('Charges')).addStringOption(o=>o.setName('location').setDescription('Location')))
      .addSubcommand(s=>s.setName('search').setDescription('Arrest history').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('booking').setDescription('Log booking').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)).addStringOption(o=>o.setName('charges').setDescription('Charges'))),

    new SlashCommandBuilder().setName('fine').setDescription('Fine commands')
      .addSubcommand(s=>s.setName('issue').setDescription('Issue fine').addStringOption(o=>o.setName('player').setDescription('Player').setRequired(true)).addNumberOption(o=>o.setName('amount').setDescription('Amount').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason')))
      .addSubcommand(s=>s.setName('pay').setDescription('Mark fine paid').addStringOption(o=>o.setName('player').setDescription('Player').setRequired(true)).addNumberOption(o=>o.setName('amount').setDescription('Amount').setRequired(true)))
      .addSubcommand(s=>s.setName('check').setDescription('Check fines').addStringOption(o=>o.setName('player').setDescription('Player').setRequired(true)))
      .addSubcommand(s=>s.setName('waive').setDescription('Waive fine').addStringOption(o=>o.setName('player').setDescription('Player').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason'))),

    new SlashCommandBuilder().setName('bolo').setDescription('BOLO commands')
      .addSubcommand(s=>s.setName('issue').setDescription('Issue BOLO').addStringOption(o=>o.setName('subject').setDescription('Subject').setRequired(true)).addStringOption(o=>o.setName('description').setDescription('Description')).addStringOption(o=>o.setName('reason').setDescription('Reason')).addStringOption(o=>o.setName('priority').setDescription('Priority').addChoices({name:'High',value:'High'},{name:'Standard',value:'Standard'},{name:'Low',value:'Low'})))
      .addSubcommand(s=>s.setName('cancel').setDescription('Cancel BOLO').addStringOption(o=>o.setName('subject').setDescription('Subject').setRequired(true)))
      .addSubcommand(s=>s.setName('list').setDescription('List active BOLOs'))
      .addSubcommand(s=>s.setName('vehicle').setDescription('Vehicle BOLO').addStringOption(o=>o.setName('plate').setDescription('Plate').setRequired(true)).addStringOption(o=>o.setName('description').setDescription('Description'))),

    new SlashCommandBuilder().setName('dispatch').setDescription('Dispatch commands')
      .addSubcommand(s=>s.setName('call').setDescription('Create dispatch call').addStringOption(o=>o.setName('title').setDescription('Call type').setRequired(true)).addStringOption(o=>o.setName('location').setDescription('Location').setRequired(true)).addStringOption(o=>o.setName('description').setDescription('Details')).addStringOption(o=>o.setName('priority').setDescription('Priority').addChoices({name:'High',value:'High'},{name:'Medium',value:'Medium'},{name:'Low',value:'Low'})))
      .addSubcommand(s=>s.setName('close').setDescription('Close a call').addStringOption(o=>o.setName('callid').setDescription('Call ID').setRequired(true)).addStringOption(o=>o.setName('disposition').setDescription('Disposition')))
      .addSubcommand(s=>s.setName('assign').setDescription('Assign unit to call').addStringOption(o=>o.setName('unit').setDescription('Unit').setRequired(true)).addStringOption(o=>o.setName('callid').setDescription('Call ID').setRequired(true)))
      .addSubcommand(s=>s.setName('active').setDescription('View active calls'))
      .addSubcommand(s=>s.setName('911').setDescription('Emergency 911').addStringOption(o=>o.setName('location').setDescription('Location').setRequired(true)).addStringOption(o=>o.setName('description').setDescription('Description').setRequired(true)).addStringOption(o=>o.setName('nature').setDescription('Nature'))),

    new SlashCommandBuilder().setName('unit').setDescription('Unit commands')
      .addSubcommand(s=>s.setName('status').setDescription('Update status').addStringOption(o=>o.setName('callsign').setDescription('Callsign').setRequired(true)).addStringOption(o=>o.setName('status').setDescription('Status').setRequired(true).addChoices({name:'10-8 Available',value:'10-8'},{name:'10-7 Offline',value:'10-7'},{name:'On Scene',value:'On Scene'},{name:'En Route',value:'En Route'},{name:'Busy',value:'Busy'},{name:'Transport',value:'Transport'},{name:'At Hospital',value:'At Hospital'})))
      .addSubcommand(s=>s.setName('list').setDescription('View active units'))
      .addSubcommand(s=>s.setName('oncall').setDescription('View on-duty units'))
      .addSubcommand(s=>s.setName('panic').setDescription('OFFICER PANIC').addStringOption(o=>o.setName('callsign').setDescription('Callsign')).addStringOption(o=>o.setName('location').setDescription('Location')))
      .addSubcommand(s=>s.setName('offduty').setDescription('Go off duty').addStringOption(o=>o.setName('callsign').setDescription('Callsign').setRequired(true)))
      .addSubcommand(s=>s.setName('onduty').setDescription('Go on duty').addStringOption(o=>o.setName('callsign').setDescription('Callsign').setRequired(true)))
      .addSubcommand(s=>s.setName('assign').setDescription('Assign unit').addStringOption(o=>o.setName('callsign').setDescription('Callsign').setRequired(true)).addStringOption(o=>o.setName('assignment').setDescription('Assignment').setRequired(true)))
      .addSubcommand(s=>s.setName('transfer').setDescription('Transfer unit').addStringOption(o=>o.setName('callsign').setDescription('Callsign').setRequired(true)).addStringOption(o=>o.setName('department').setDescription('Department').setRequired(true))),

    new SlashCommandBuilder().setName('leo').setDescription('LEO-specific commands')
      .addSubcommand(s=>s.setName('ncic').setDescription('Full NCIC lookup').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('pursuit').setDescription('Log pursuit').addStringOption(o=>o.setName('callsign').setDescription('Callsign').setRequired(true)).addStringOption(o=>o.setName('vehicle').setDescription('Vehicle').setRequired(true)).addStringOption(o=>o.setName('direction').setDescription('Direction')).addStringOption(o=>o.setName('speed').setDescription('Speed')))
      .addSubcommand(s=>s.setName('pursuitend').setDescription('End pursuit').addStringOption(o=>o.setName('outcome').setDescription('Outcome').setRequired(true)).addStringOption(o=>o.setName('callsign').setDescription('Callsign')))
      .addSubcommand(s=>s.setName('evidence').setDescription('Log evidence').addStringOption(o=>o.setName('caseid').setDescription('Case ID').setRequired(true)).addStringOption(o=>o.setName('item').setDescription('Item').setRequired(true)).addStringOption(o=>o.setName('location').setDescription('Location')))
      .addSubcommand(s=>s.setName('caseload').setDescription('View case load'))
      .addSubcommand(s=>s.setName('mugshot').setDescription('Pull mugshot').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('confidential').setDescription('Flag confidential').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('trackvehicle').setDescription('Surveillance watch').addStringOption(o=>o.setName('plate').setDescription('Plate').setRequired(true)))
      .addSubcommand(s=>s.setName('weapons').setDescription('Weapons check').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('suspect').setDescription('Add suspect to case').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)).addStringOption(o=>o.setName('caseid').setDescription('Case ID').setRequired(true)))
      .addSubcommand(s=>s.setName('caseclose').setDescription('Close case').addStringOption(o=>o.setName('caseid').setDescription('Case ID').setRequired(true)).addStringOption(o=>o.setName('outcome').setDescription('Outcome')))
      .addSubcommand(s=>s.setName('roadblock').setDescription('Establish roadblock').addStringOption(o=>o.setName('location').setDescription('Location').setRequired(true)))
      .addSubcommand(s=>s.setName('perimeter').setDescription('Set perimeter').addStringOption(o=>o.setName('location').setDescription('Location').setRequired(true)))
      .addSubcommand(s=>s.setName('swat').setDescription('Request SWAT').addStringOption(o=>o.setName('location').setDescription('Location').setRequired(true)).addStringOption(o=>o.setName('situation').setDescription('Situation')))
      .addSubcommand(s=>s.setName('k9').setDescription('Deploy K9').addStringOption(o=>o.setName('location').setDescription('Location').setRequired(true)).addStringOption(o=>o.setName('purpose').setDescription('Purpose')).addStringOption(o=>o.setName('handler').setDescription('Handler')))
      .addSubcommand(s=>s.setName('drone').setDescription('Deploy drone').addStringOption(o=>o.setName('location').setDescription('Location').setRequired(true)))
      .addSubcommand(s=>s.setName('spike').setDescription('Deploy spike strips').addStringOption(o=>o.setName('location').setDescription('Location').setRequired(true))),

    new SlashCommandBuilder().setName('ems').setDescription('EMS commands')
      .addSubcommand(s=>s.setName('pcr').setDescription('Patient care report').addStringOption(o=>o.setName('patient').setDescription('Patient').setRequired(true)).addStringOption(o=>o.setName('complaint').setDescription('Chief complaint')))
      .addSubcommand(s=>s.setName('vitals').setDescription('Log vitals').addStringOption(o=>o.setName('patient').setDescription('Patient').setRequired(true)).addStringOption(o=>o.setName('bp').setDescription('BP')).addStringOption(o=>o.setName('hr').setDescription('HR')).addStringOption(o=>o.setName('spo2').setDescription('SpO2')).addStringOption(o=>o.setName('rr').setDescription('RR')).addStringOption(o=>o.setName('gcs').setDescription('GCS')))
      .addSubcommand(s=>s.setName('hospital').setDescription('Hospital status'))
      .addSubcommand(s=>s.setName('units').setDescription('Active EMS units'))
      .addSubcommand(s=>s.setName('mci').setDescription('Declare MCI').addStringOption(o=>o.setName('location').setDescription('Location').setRequired(true)).addStringOption(o=>o.setName('patients').setDescription('Est. patients')))
      .addSubcommand(s=>s.setName('mayday').setDescription('FF MAYDAY').addStringOption(o=>o.setName('name').setDescription('FF name').setRequired(true)).addStringOption(o=>o.setName('location').setDescription('Location')).addStringOption(o=>o.setName('air').setDescription('Air remaining')))
      .addSubcommand(s=>s.setName('triage').setDescription('Triage tag').addStringOption(o=>o.setName('patient').setDescription('Patient').setRequired(true)).addStringOption(o=>o.setName('tag').setDescription('Tag').setRequired(true).addChoices({name:'🔴 RED - Immediate',value:'red'},{name:'🟡 YELLOW - Delayed',value:'yellow'},{name:'🟢 GREEN - Minor',value:'green'},{name:'⚫ BLACK - Expectant',value:'black'})))
      .addSubcommand(s=>s.setName('transport').setDescription('Patient transport').addStringOption(o=>o.setName('patient').setDescription('Patient').setRequired(true)).addStringOption(o=>o.setName('condition').setDescription('Condition')))
      .addSubcommand(s=>s.setName('trauma').setDescription('Trauma activation').addStringOption(o=>o.setName('patient').setDescription('Patient').setRequired(true)).addStringOption(o=>o.setName('eta').setDescription('ETA')))
      .addSubcommand(s=>s.setName('cardiac').setDescription('Cardiac arrest').addStringOption(o=>o.setName('location').setDescription('Location').setRequired(true)).addStringOption(o=>o.setName('patient').setDescription('Patient')).addStringOption(o=>o.setName('cpr').setDescription('CPR in progress?')))
      .addSubcommand(s=>s.setName('overdose').setDescription('Overdose call').addStringOption(o=>o.setName('location').setDescription('Location').setRequired(true)).addStringOption(o=>o.setName('substance').setDescription('Substance')).addStringOption(o=>o.setName('patient').setDescription('Patient')))
      .addSubcommand(s=>s.setName('handoff').setDescription('Patient handoff').addStringOption(o=>o.setName('patient').setDescription('Patient').setRequired(true)).addStringOption(o=>o.setName('room').setDescription('Room'))),

    new SlashCommandBuilder().setName('fire').setDescription('Fire department commands')
      .addSubcommand(s=>s.setName('incident').setDescription('Report fire').addStringOption(o=>o.setName('location').setDescription('Location').setRequired(true)).addStringOption(o=>o.setName('type').setDescription('Type')).addStringOption(o=>o.setName('alarm').setDescription('Alarm level')))
      .addSubcommand(s=>s.setName('out').setDescription('Fire knocked down').addStringOption(o=>o.setName('location').setDescription('Location').setRequired(true)))
      .addSubcommand(s=>s.setName('par').setDescription('PAR count').addStringOption(o=>o.setName('location').setDescription('Location').setRequired(true)))
      .addSubcommand(s=>s.setName('hazmat').setDescription('Hazmat incident').addStringOption(o=>o.setName('location').setDescription('Location').setRequired(true)).addStringOption(o=>o.setName('substance').setDescription('Substance')).addStringOption(o=>o.setName('radius').setDescription('Evac radius')))
      .addSubcommand(s=>s.setName('evacuation').setDescription('Evacuation order').addStringOption(o=>o.setName('area').setDescription('Area').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason')))
      .addSubcommand(s=>s.setName('rescue').setDescription('Technical rescue').addStringOption(o=>o.setName('location').setDescription('Location').setRequired(true)).addStringOption(o=>o.setName('type').setDescription('Type')).addStringOption(o=>o.setName('victims').setDescription('Victims')))
      .addSubcommand(s=>s.setName('exposure').setDescription('Log exposure').addStringOption(o=>o.setName('number').setDescription('Exposure #').setRequired(true)).addStringOption(o=>o.setName('address').setDescription('Address').setRequired(true)).addStringOption(o=>o.setName('status').setDescription('Status')))
      .addSubcommand(s=>s.setName('waterops').setDescription('Water operations').addStringOption(o=>o.setName('location').setDescription('Location').setRequired(true)).addStringOption(o=>o.setName('source').setDescription('Source')).addStringOption(o=>o.setName('flow').setDescription('Flow'))),

    new SlashCommandBuilder().setName('corrections').setDescription('Corrections commands')
      .addSubcommand(s=>s.setName('booking').setDescription('Log booking').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)).addStringOption(o=>o.setName('charges').setDescription('Charges')).addStringOption(o=>o.setName('sentence').setDescription('Sentence')))
      .addSubcommand(s=>s.setName('release').setDescription('Release prisoner').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason')))
      .addSubcommand(s=>s.setName('sentence').setDescription('Check sentence').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('addtime').setDescription('Add sentence time').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)).addStringOption(o=>o.setName('time').setDescription('Time').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason')))
      .addSubcommand(s=>s.setName('cellcheck').setDescription('Cell welfare check').addStringOption(o=>o.setName('name').setDescription('Prisoner').setRequired(true)).addStringOption(o=>o.setName('status').setDescription('Status')))
      .addSubcommand(s=>s.setName('contraband').setDescription('Log contraband').addStringOption(o=>o.setName('name').setDescription('Prisoner').setRequired(true)).addStringOption(o=>o.setName('item').setDescription('Item').setRequired(true)))
      .addSubcommand(s=>s.setName('transport').setDescription('Prisoner transport').addStringOption(o=>o.setName('name').setDescription('Prisoner').setRequired(true)).addStringOption(o=>o.setName('from').setDescription('From')).addStringOption(o=>o.setName('to').setDescription('To')))
      .addSubcommand(s=>s.setName('visitation').setDescription('Log visitation').addStringOption(o=>o.setName('name').setDescription('Prisoner').setRequired(true)).addStringOption(o=>o.setName('visitor').setDescription('Visitor').setRequired(true)))
      .addSubcommand(s=>s.setName('prisoner').setDescription('Prisoner lookup').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true))),

    new SlashCommandBuilder().setName('judicial').setDescription('Judicial commands')
      .addSubcommand(s=>s.setName('sentence').setDescription('Issue sentence').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)).addStringOption(o=>o.setName('sentence').setDescription('Sentence').setRequired(true)).addStringOption(o=>o.setName('charges').setDescription('Charges')))
      .addSubcommand(s=>s.setName('verdict').setDescription('Issue verdict').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)).addStringOption(o=>o.setName('verdict').setDescription('Verdict').setRequired(true).addChoices({name:'Guilty',value:'guilty'},{name:'Not Guilty',value:'not guilty'},{name:'Dismissed',value:'dismissed'})))
      .addSubcommand(s=>s.setName('bail').setDescription('Set bail').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)).addNumberOption(o=>o.setName('amount').setDescription('Amount').setRequired(true)).addStringOption(o=>o.setName('conditions').setDescription('Conditions')))
      .addSubcommand(s=>s.setName('plea').setDescription('Enter plea').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)).addStringOption(o=>o.setName('plea').setDescription('Plea').setRequired(true).addChoices({name:'Guilty',value:'Guilty'},{name:'Not Guilty',value:'Not Guilty'},{name:'No Contest',value:'No Contest'})))
      .addSubcommand(s=>s.setName('courtdate').setDescription('Schedule court date').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)).addStringOption(o=>o.setName('date').setDescription('Date').setRequired(true)).addStringOption(o=>o.setName('room').setDescription('Room')))
      .addSubcommand(s=>s.setName('expunge').setDescription('Expunge record').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('attorney').setDescription('Assign attorney').addStringOption(o=>o.setName('name').setDescription('Defendant').setRequired(true)).addStringOption(o=>o.setName('attorney').setDescription('Attorney').setRequired(true)))
      .addSubcommand(s=>s.setName('charge').setDescription('Add charge').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)).addStringOption(o=>o.setName('charge').setDescription('Charge').setRequired(true))),

    new SlashCommandBuilder().setName('economy').setDescription('Economy commands')
      .addSubcommand(s=>s.setName('balance').setDescription('Check balance').addStringOption(o=>o.setName('player').setDescription('Player').setRequired(true)))
      .addSubcommand(s=>s.setName('pay').setDescription('Send payment').addStringOption(o=>o.setName('player').setDescription('Player').setRequired(true)).addNumberOption(o=>o.setName('amount').setDescription('Amount').setRequired(true)).addStringOption(o=>o.setName('note').setDescription('Note')))
      .addSubcommand(s=>s.setName('salary').setDescription('Check salary').addStringOption(o=>o.setName('player').setDescription('Player')))
      .addSubcommand(s=>s.setName('tax').setDescription('Tax status').addStringOption(o=>o.setName('player').setDescription('Player')))
      .addSubcommand(s=>s.setName('loan').setDescription('Loan status').addStringOption(o=>o.setName('player').setDescription('Player')))
      .addSubcommand(s=>s.setName('stocks').setDescription('Stock prices'))
      .addSubcommand(s=>s.setName('insurance').setDescription('Insurance policies').addStringOption(o=>o.setName('player').setDescription('Player')))
      .addSubcommand(s=>s.setName('citybudget').setDescription('City treasury'))
      .addSubcommand(s=>s.setName('lottery').setDescription('Lottery info'))
      .addSubcommand(s=>s.setName('transfer').setDescription('Transfer funds').addStringOption(o=>o.setName('player').setDescription('Recipient').setRequired(true)).addNumberOption(o=>o.setName('amount').setDescription('Amount').setRequired(true))),

    new SlashCommandBuilder().setName('admin').setDescription('Admin commands')
      .addSubcommand(s=>s.setName('announce').setDescription('Server announcement').addStringOption(o=>o.setName('message').setDescription('Message').setRequired(true)))
      .addSubcommand(s=>s.setName('serverinfo').setDescription('Server statistics'))
      .addSubcommand(s=>s.setName('kick').setDescription('Remove from duty').addStringOption(o=>o.setName('player').setDescription('Player').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason')))
      .addSubcommand(s=>s.setName('warn').setDescription('Issue warning').addStringOption(o=>o.setName('player').setDescription('Player').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason').setRequired(true)))
      .addSubcommand(s=>s.setName('suspend').setDescription('Suspend member').addStringOption(o=>o.setName('player').setDescription('Player').setRequired(true)).addStringOption(o=>o.setName('duration').setDescription('Duration').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason').setRequired(true)))
      .addSubcommand(s=>s.setName('promote').setDescription('Promote member').addStringOption(o=>o.setName('player').setDescription('Player').setRequired(true)).addStringOption(o=>o.setName('rank').setDescription('Rank').setRequired(true)))
      .addSubcommand(s=>s.setName('demote').setDescription('Demote member').addStringOption(o=>o.setName('player').setDescription('Player').setRequired(true)).addStringOption(o=>o.setName('rank').setDescription('Rank').setRequired(true)))
      .addSubcommand(s=>s.setName('eas').setDescription('Emergency broadcast').addStringOption(o=>o.setName('message').setDescription('Message').setRequired(true)))
      .addSubcommand(s=>s.setName('audit').setDescription('View audit log').addStringOption(o=>o.setName('player').setDescription('Player')))
      .addSubcommand(s=>s.setName('weather').setDescription('Set weather').addStringOption(o=>o.setName('weather').setDescription('Weather').setRequired(true)))
      .addSubcommand(s=>s.setName('event').setDescription('Announce event').addStringOption(o=>o.setName('title').setDescription('Title').setRequired(true)).addStringOption(o=>o.setName('description').setDescription('Description')).addStringOption(o=>o.setName('date').setDescription('Date')))
      .addSubcommand(s=>s.setName('snapshot').setDescription('Create backup'))
      .addSubcommand(s=>s.setName('roster').setDescription('Department roster').addStringOption(o=>o.setName('department').setDescription('Department')))
      .addSubcommand(s=>s.setName('commend').setDescription('Issue commendation').addStringOption(o=>o.setName('player').setDescription('Player').setRequired(true)).addStringOption(o=>o.setName('award').setDescription('Award').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason').setRequired(true)))
      .addSubcommand(s=>s.setName('abusereport').setDescription('Report a player').addStringOption(o=>o.setName('player').setDescription('Player').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason').setRequired(true))),

    new SlashCommandBuilder().setName('stats').setDescription('Statistics commands')
      .addSubcommand(s=>s.setName('mystats').setDescription('Your stats'))
      .addSubcommand(s=>s.setName('leaderboard').setDescription('Top officers'))
      .addSubcommand(s=>s.setName('arrests').setDescription('Arrest leaderboard'))
      .addSubcommand(s=>s.setName('citations').setDescription('Citation leaderboard'))
      .addSubcommand(s=>s.setName('activity').setDescription('Activity report').addStringOption(o=>o.setName('player').setDescription('Player')))
      .addSubcommand(s=>s.setName('department').setDescription('Department stats').addStringOption(o=>o.setName('department').setDescription('Department')))
      .addSubcommand(s=>s.setName('economy').setDescription('Economy overview'))
      .addSubcommand(s=>s.setName('crimestat').setDescription('Crime statistics')),

    new SlashCommandBuilder().setName('city').setDescription('City commands')
      .addSubcommand(s=>s.setName('weather').setDescription('Current weather'))
      .addSubcommand(s=>s.setName('time').setDescription('Server time'))
      .addSubcommand(s=>s.setName('news').setDescription('City newspaper'))
      .addSubcommand(s=>s.setName('mayor').setDescription('Mayoral announcement').addStringOption(o=>o.setName('message').setDescription('Message').setRequired(true)))
      .addSubcommand(s=>s.setName('ordinance').setDescription('New ordinance').addStringOption(o=>o.setName('title').setDescription('Title').setRequired(true)).addStringOption(o=>o.setName('description').setDescription('Description').setRequired(true)).addStringOption(o=>o.setName('date').setDescription('Effective date')))
      .addSubcommand(s=>s.setName('curfew').setDescription('City curfew').addStringOption(o=>o.setName('start').setDescription('Start').setRequired(true)).addStringOption(o=>o.setName('end').setDescription('End').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason')))
      .addSubcommand(s=>s.setName('amber').setDescription('Amber Alert').addStringOption(o=>o.setName('name').setDescription('Child name').setRequired(true)).addStringOption(o=>o.setName('location').setDescription('Last seen').setRequired(true)).addStringOption(o=>o.setName('age').setDescription('Age')).addStringOption(o=>o.setName('vehicle').setDescription('Vehicle')))
      .addSubcommand(s=>s.setName('silver').setDescription('Silver Alert').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)).addStringOption(o=>o.setName('location').setDescription('Last seen').setRequired(true)).addStringOption(o=>o.setName('description').setDescription('Description')))
      .addSubcommand(s=>s.setName('missing').setDescription('Missing person').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)).addStringOption(o=>o.setName('location').setDescription('Last seen').setRequired(true)).addStringOption(o=>o.setName('age').setDescription('Age')).addStringOption(o=>o.setName('description').setDescription('Description')))
      .addSubcommand(s=>s.setName('found').setDescription('Person found').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)).addStringOption(o=>o.setName('condition').setDescription('Condition')))
      .addSubcommand(s=>s.setName('press').setDescription('Press release').addStringOption(o=>o.setName('message').setDescription('Message').setRequired(true)))
      .addSubcommand(s=>s.setName('seizure').setDescription('Asset seizure').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)).addStringOption(o=>o.setName('assets').setDescription('Assets').setRequired(true))),

    new SlashCommandBuilder().setName('rp').setDescription('Roleplay tools')
      .addSubcommand(s=>s.setName('me').setDescription('RP action').addStringOption(o=>o.setName('action').setDescription('Action').setRequired(true)))
      .addSubcommand(s=>s.setName('do').setDescription('Scene description').addStringOption(o=>o.setName('description').setDescription('Description').setRequired(true)))
      .addSubcommand(s=>s.setName('ooc').setDescription('Out of character').addStringOption(o=>o.setName('message').setDescription('Message').setRequired(true)))
      .addSubcommand(s=>s.setName('roll').setDescription('Roll dice 1-100'))
      .addSubcommand(s=>s.setName('coin').setDescription('Flip a coin'))
      .addSubcommand(s=>s.setName('8ball').setDescription('Magic 8-ball').addStringOption(o=>o.setName('question').setDescription('Question').setRequired(true)))
      .addSubcommand(s=>s.setName('wanted').setDescription('Wanted bulletin').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)).addStringOption(o=>o.setName('description').setDescription('Description')).addStringOption(o=>o.setName('reward').setDescription('Reward')))
      .addSubcommand(s=>s.setName('bounty').setDescription('Post bounty').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)).addStringOption(o=>o.setName('amount').setDescription('Amount').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason')))
      .addSubcommand(s=>s.setName('scenario').setDescription('Generate RP scenario').addStringOption(o=>o.setName('type').setDescription('Type')))
      .addSubcommand(s=>s.setName('lore').setDescription('City chronicle lore'))
      .addSubcommand(s=>s.setName('backstory').setDescription('Character backstory').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('heist').setDescription('Heist in progress').addStringOption(o=>o.setName('location').setDescription('Location').setRequired(true)).addStringOption(o=>o.setName('type').setDescription('Type')))
      .addSubcommand(s=>s.setName('tryaction').setDescription('Roll for action outcome').addStringOption(o=>o.setName('action').setDescription('Action').setRequired(true))),

    new SlashCommandBuilder().setName('report').setDescription('Quick report filing')
      .addSubcommand(s=>s.setName('incident').setDescription('Incident report').addStringOption(o=>o.setName('title').setDescription('Title').setRequired(true)).addStringOption(o=>o.setName('location').setDescription('Location').setRequired(true)).addStringOption(o=>o.setName('description').setDescription('Details')))
      .addSubcommand(s=>s.setName('crash').setDescription('Crash report').addStringOption(o=>o.setName('location').setDescription('Location').setRequired(true)).addStringOption(o=>o.setName('vehicles').setDescription('Vehicles')).addStringOption(o=>o.setName('injuries').setDescription('Injuries')))
      .addSubcommand(s=>s.setName('missing').setDescription('Missing person').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)).addStringOption(o=>o.setName('location').setDescription('Last seen')))
      .addSubcommand(s=>s.setName('dui').setDescription('DUI report').addStringOption(o=>o.setName('subject').setDescription('Subject').setRequired(true)).addStringOption(o=>o.setName('bac').setDescription('BAC')).addStringOption(o=>o.setName('location').setDescription('Location')))
      .addSubcommand(s=>s.setName('useofforce').setDescription('Use of force').addStringOption(o=>o.setName('subject').setDescription('Subject').setRequired(true)).addStringOption(o=>o.setName('force').setDescription('Force type').setRequired(true)))
      .addSubcommand(s=>s.setName('supplement').setDescription('Supplemental report').addStringOption(o=>o.setName('caseid').setDescription('Case ID').setRequired(true)))
      .addSubcommand(s=>s.setName('status').setDescription('Check report statuses')),

    new SlashCommandBuilder().setName('license').setDescription('License commands')
      .addSubcommand(s=>s.setName('check').setDescription('License status').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('points').setDescription('License points').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('suspend').setDescription('Suspend license').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)).addStringOption(o=>o.setName('duration').setDescription('Duration')).addStringOption(o=>o.setName('reason').setDescription('Reason')))
      .addSubcommand(s=>s.setName('reinstate').setDescription('Reinstate license').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('revoke').setDescription('Revoke license').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('specialty').setDescription('Specialty licenses').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)))
      .addSubcommand(s=>s.setName('issue').setDescription('Issue specialty license').addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true)).addStringOption(o=>o.setName('type').setDescription('Type').setRequired(true).addChoices({name:'Boating',value:'Boating'},{name:'Hunting',value:'Hunting'},{name:'Fishing',value:'Fishing'},{name:'Firearms',value:'Firearms'},{name:'CDL',value:'CDL'},{name:'Motorcycle',value:'Motorcycle'}))),

    new SlashCommandBuilder().setName('codes').setDescription('Radio codes reference')
      .addSubcommand(s=>s.setName('lookup').setDescription('Look up a code').addStringOption(o=>o.setName('code').setDescription('Code e.g. 10-4, 11-99').setRequired(true)))
      .addSubcommand(s=>s.setName('common').setDescription('Common codes'))
      .addSubcommand(s=>s.setName('phonetic').setDescription('NATO phonetic alphabet'))
      .addSubcommand(s=>s.setName('fire').setDescription('Fire department codes'))
      .addSubcommand(s=>s.setName('ems').setDescription('EMS priority codes')),

    new SlashCommandBuilder().setName('help').setDescription('RedLineCAD bot help')
      .addSubcommand(s=>s.setName('all').setDescription('Full command list'))
      .addSubcommand(s=>s.setName('leo').setDescription('LEO commands'))
      .addSubcommand(s=>s.setName('ems').setDescription('EMS commands'))
      .addSubcommand(s=>s.setName('fire').setDescription('Fire commands'))
      .addSubcommand(s=>s.setName('admin').setDescription('Admin commands')),

  ].map(c=>c.toJSON());

  const rest = new REST({ version:'10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log(`Registering ${commands.length} top-level commands with subcommands...`);
    await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_APP_ID, process.env.DISCORD_GUILD_ID),
      { body: commands }
    );
    const total = commands.reduce((sum,c)=>sum+(c.options?.filter(o=>o.type===1).length||0),0);
    console.log(`✅ ${commands.length} commands registered — ${total} total subcommands!`);
  } catch(err) {
    console.error('Failed to register:', err);
  }
}

registerCommands();
