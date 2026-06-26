const axios = require('axios');

const FIREBASE_URL = process.env.FIREBASE_URL;

async function fbGet(path) {
  try {
    const resp = await axios.get(FIREBASE_URL + '/' + path + '.json');
    return resp.data;
  } catch(e) {
    console.error('fbGet error:', e.message);
    return null;
  }
}

async function fbSet(path, data) {
  try {
    await axios.put(FIREBASE_URL + '/' + path + '.json', data);
    return true;
  } catch(e) {
    console.error('fbSet error:', e.message);
    return false;
  }
}

async function fbPush(path, data) {
  try {
    const resp = await axios.post(FIREBASE_URL + '/' + path + '.json', data);
    return resp.data;
  } catch(e) {
    console.error('fbPush error:', e.message);
    return null;
  }
}

async function fbDelete(path) {
  try {
    await axios.delete(FIREBASE_URL + '/' + path + '.json');
    return true;
  } catch(e) {
    console.error('fbDelete error:', e.message);
    return false;
  }
}

async function fbUpdate(path, data) {
  try {
    await axios.patch(FIREBASE_URL + '/' + path + '.json', data);
    return true;
  } catch(e) {
    console.error('fbUpdate error:', e.message);
    return false;
  }
}

async function getFirstServerId() {
  const servers = await fbGet('servers');
  if (!servers) return null;
  return Object.keys(servers)[0];
}

async function getServerData(collection) {
  const srvId = await getFirstServerId();
  if (!srvId) return [];
  const data = await fbGet('servers/' + srvId + '/' + collection);
  return data ? Object.values(data) : [];
}

async function getServerEntries(collection) {
  const srvId = await getFirstServerId();
  if (!srvId) return { srvId: null, entries: [] };
  const data = await fbGet('servers/' + srvId + '/' + collection);
  return { srvId, entries: data ? Object.entries(data) : [] };
}

// Returns [key, record] or null — used as: const [key, civ] = await findCivilian(name)
async function findCivilian(name) {
  const srvId = await getFirstServerId();
  if (!srvId) return null;
  const data = await fbGet('servers/' + srvId + '/civilians');
  if (!data) return null;
  const lower = name.toLowerCase();
  const entry = Object.entries(data).find(([, c]) =>
    c && c.name && c.name.toLowerCase().includes(lower)
  );
  return entry || null;
}

// Returns [key, record] or null — used as: const [key, veh] = await findVehicle(plate)
async function findVehicle(plate) {
  const srvId = await getFirstServerId();
  if (!srvId) return null;
  const data = await fbGet('servers/' + srvId + '/vehicles');
  if (!data) return null;
  const upper = plate.toUpperCase();
  const entry = Object.entries(data).find(([, v]) =>
    v && v.plate && v.plate.toUpperCase() === upper
  );
  return entry || null;
}

module.exports = {
  fbGet, fbSet, fbPush, fbDelete, fbUpdate,
  getFirstServerId, getServerData, getServerEntries,
  findCivilian, findVehicle
};
