// stands.js helper (optional)
const fs = require('fs');
const path = require('path');
const DATA_FILE = path.join(__dirname, 'stands.json');

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

module.exports = { loadData, saveData, DATA_FILE };
