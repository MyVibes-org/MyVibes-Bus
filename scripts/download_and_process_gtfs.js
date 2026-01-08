const fs = require('fs');
const path = require('path');
const https = require('https');
const AdmZip = require('adm-zip');
const csv = require('csv-parser');
const { pipeline } = require('stream');
const { promisify } = require('util');

const streamPipeline = promisify(pipeline);

const DATA_DIR = path.join(__dirname, '../public/data');
const TEMP_DIR = path.join(__dirname, '../temp_gtfs');
const ROUTES_OUTPUT_DIR = path.join(DATA_DIR, 'routes');

if (!fs.existsSync(ROUTES_OUTPUT_DIR)) {
  fs.mkdirSync(ROUTES_OUTPUT_DIR, { recursive: true });
}

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const CATEGORIES = ['rapid-bus-kl', 'rapid-bus-mrtfeeder'];

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function processGtfs() {
  const allRoutes = {};

  for (const category of CATEGORIES) {
    console.log(`Processing ${category}...`);
    const zipPath = path.join(TEMP_DIR, `${category}.zip`);
    const extractPath = path.join(TEMP_DIR, category);

    // Download
    console.log(`Downloading ${category}...`);
    await downloadFile(`https://api.data.gov.my/gtfs-static/prasarana?category=${category}`, zipPath);

    // Extract
    console.log(`Extracting ${category}...`);
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractPath, true);

    // Parsing will happen here...
    console.log(`Extracted to ${extractPath}`);
  }
}

processGtfs().catch(console.error);
