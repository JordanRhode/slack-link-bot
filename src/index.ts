import { App } from '@slack/bolt';
import { config } from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

// Load environment variables
config();

// Types
interface UserPreferences {
  browser: 'chrome' | 'edge';
  profile: string;
}

interface Preferences {
  [channelId: string]: {
    [userId: string]: UserPreferences;
  };
}

// Message event type
interface MessageEvent {
  text: string;
  user: string;
  channel: string;
}

// Action event type
interface ActionEvent {
  actions: Array<{
    value: string;
  }>;
}

// Constants
const PREFERENCES_FILE = 'user_preferences.json';
const execAsync = promisify(exec);

// Initialize the Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

// Load preferences from file
function loadPreferences(): Preferences {
  try {
    if (fs.existsSync(PREFERENCES_FILE)) {
      const data = fs.readFileSync(PREFERENCES_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading preferences:', error);
  }
  return {};
}

// Save preferences to file
function savePreferences(preferences: Preferences): void {
  try {
    fs.writeFileSync(PREFERENCES_FILE, JSON.stringify(preferences, null, 2));
  } catch (error) {
    console.error('Error saving preferences:', error);
  }
}

// Initialize preferences
let userPreferences: Preferences = loadPreferences();

// Extract URL from text
function extractUrl(text: string): string | null {
  console.debug('Extracting URL from text:', text);
  
  // Try to match Slack's labeled links <url|label>
  const labeledLinkPattern = /<([^|>]+)(?:\|[^>]+)?>/;
  const labeledMatch = text.match(labeledLinkPattern);
  if (labeledMatch) {
    const url = labeledMatch[1];
    return url.replace(/%[0-9A-Fa-f]{2}$/, '');
  }
  
  // If no labeled link found, look for plain URLs
  const urlPattern = /https?:\/\/[^\s<>]+/;
  const match = text.match(urlPattern);
  if (match) {
    const url = match[0];
    return url.replace(/[.,;:<>()\[\]{}"\'|]$/, '').replace(/%[0-9A-Fa-f]{2}$/, '');
  }
  
  return null;
}

// Open URL in Chrome
async function openInChrome(url: string, profile: string): Promise<void> {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  await execAsync(`"${chromePath}" --profile-directory="${profile}" "${url}"`);
}

// Open URL in Edge
async function openInEdge(url: string, profile: string): Promise<void> {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  await execAsync(`"${edgePath}" --profile-directory="${profile}" "${url}"`);
}

// Handle /set-browser command
app.command('/set-browser', async ({ ack, command, say }) => {
  await ack();
  
  const { user_id, channel_id, text } = command;
  const args = text.trim().split(' ');
  
  if (args.length < 2) {
    await say(`Please specify both browser and profile name. Example: \`/set-browser chrome Default\` or \`/set-browser edge Profile 1\`

To find your profile name:
1. Open your browser
2. Type \`chrome://version\` (for Chrome) or \`edge://version\` (for Edge) in the address bar
3. Look for "Profile Path" - the profile name is the last part (e.g., "Default", "Profile 1", etc.)`);
    return;
  }
  
  const browser = args[0].toLowerCase() as 'chrome' | 'edge';
  if (browser !== 'chrome' && browser !== 'edge') {
    await say('Please specify either "chrome" or "edge" as the browser');
    return;
  }
  
  const profile = args.slice(1).join(' ');
  if (!profile) {
    await say('Please specify a profile name');
    return;
  }
  
  // Initialize channel preferences if not exists
  if (!userPreferences[channel_id]) {
    userPreferences[channel_id] = {};
  }
  
  userPreferences[channel_id][user_id] = { browser, profile };
  savePreferences(userPreferences);
  
  await say(`Your ${browser} profile has been set to: ${profile} for this channel`);
});

// Handle messages containing URLs
app.message(/https?:\/\//, async ({ message, say }) => {
  const msg = message as unknown as MessageEvent;
  const url = extractUrl(msg.text);
  if (!url) return;
  
  const { user, channel } = msg;
  
  // Get channel-specific preferences
  const channelPrefs = userPreferences[channel] || {};
  const preferences = channelPrefs[user];
  
  if (preferences) {
    const { browser, profile } = preferences;
    
    await say({
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Found a link in your message. Click the button below to open it in your ${browser} ${profile} profile:`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Open Link',
                emoji: true
              },
              value: JSON.stringify({ url, browser, profile }),
              action_id: 'open_link'
            }
          ]
        }
      ]
    });
  } else {
    await say('Please set your browser profile first using `/set-browser <browser> <profile-name>`');
  }
});

// Handle button clicks
app.action('open_link', async ({ ack, body, say }) => {
  await ack();
  
  const actionBody = body as unknown as ActionEvent;
  const { url, browser, profile } = JSON.parse(actionBody.actions[0].value);
  
  try {
    if (browser === 'chrome') {
      await openInChrome(url, profile);
    } else {
      await openInEdge(url, profile);
    }
  } catch (error) {
    console.error('Error opening URL:', error);
    if (say) {
      await say('Sorry, there was an error opening the link.');
    }
  }
});

// Start the app
(async () => {
  await app.start();
  console.log('⚡️ Bolt app is running!');
})(); 