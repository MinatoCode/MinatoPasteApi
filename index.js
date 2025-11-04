const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Load multiple API keys from Vercel env
let API_KEYS = [];
if (process.env.MINATO_API_KEYS) {
try {
API_KEYS = JSON.parse(process.env.MINATO_API_KEYS); // expects JSON array: ["key1","key2"]
} catch (e) {
console.error("Invalid MINATO_API_KEYS env variable:", e.message);
}
}

// GitHub configuration
const GITHUB_USER = 'MinatoCode';
const GITHUB_REPO = 'MinatoPasteApi';
const GITHUB_BRANCH = 'main';
const GITHUB_FOLDER = 'pastes';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // must be set in Vercel env

// Helper: generate random alphanumeric ID
function generateId(length = 8) {
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
let result = '';
for (let i = 0; i < length; i++) {
result += chars.charAt(Math.floor(Math.random() * chars.length));
}
return result;
}

// POST /upload
app.post('/upload', async (req, res) => {
const { code, api_key, owner } = req.body;

if (!code) return res.status(400).json({ success: false, error: 'Code is required' });
if (!api_key || !API_KEYS.includes(api_key)) return res.status(403).json({ success: false, error: 'Invalid API key' });
if (!owner || owner.toLowerCase() !== 'minato') return res.status(403).json({ success: false, error: 'Invalid owner' });

try {
const id = generateId();
const filename = `${id}.txt`;
const filePath = `${GITHUB_FOLDER}/${filename}`;
const contentBase64 = Buffer.from(code, 'utf-8').toString('base64');


// Upload to GitHub
await axios.put(
  `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${filePath}`,
  {
    message: `Add paste ${filename}`,
    content: contentBase64,
    branch: GITHUB_BRANCH
  },
  {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'User-Agent': 'MinatoPasteAPI'
    }
  }
);

const rawUrl = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${filePath}`;
res.json({ success: true, owner, id, url: rawUrl });

} catch (err) {
console.error(err.response?.data || err.message);
res.status(500).json({ success: false, error: 'GitHub upload failed', details: err.response?.data?.message || err.message });
}
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MinatoPaste API running on port ${PORT}`));
    
