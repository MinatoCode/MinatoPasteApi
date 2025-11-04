const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
app.use(express.json());

// Load API keys
const apiKeysData = JSON.parse(fs.readFileSync(path.join(__dirname, 'api_key.json'), 'utf-8'));
const API_KEYS = apiKeysData.keys;

// GitHub config from environment variables
const GITHUB_USER = 'MinatoCode';          // your GitHub username
const GITHUB_REPO = 'MinatoPasteApi';                 // your repo name
const GITHUB_BRANCH = 'main';
const GITHUB_FOLDER = 'pastes';            // folder in repo
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // PAT in Vercel env

// Helper: generate random alphanumeric ID (like Pastebin)
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
    let id = generateId();
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
    res.json({
      success: true,
      owner,
      id,
      url: rawUrl
    });

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({
      success: false,
      error: 'GitHub upload failed',
      details: err.response?.data?.message || err.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`GitHub Pastebin API running on port ${PORT}`));
  
