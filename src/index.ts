import { App, ExpressReceiver, SayFn } from '@slack/bolt';
import { config } from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

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

// Shortcut event type
interface ShortcutEvent {
  message: {
    text: string;
  };
  user: {
    id: string;
  };
  channel: {
    id: string;
  };
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

// Extract URLs from text
function extractUrls(text: string): string[] {
  console.debug('Extracting URLs from text:', text);
  const urls: string[] = [];
  
  // Try to match Slack's labeled links <url|label>
  const labeledLinkPattern = /<([^|>]+)(?:\|[^>]+)?>/g;
  const labeledMatches = text.matchAll(labeledLinkPattern);
  for (const match of labeledMatches) {
    const url = match[1].replace(/%[0-9A-Fa-f]{2}$/, '');
    urls.push(url);
  }
  
  return urls;
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

// Open URL in browser
async function openUrlInBrowser(url: string, browser: 'chrome' | 'edge', profile: string, say?: SayFn): Promise<void> {
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
    throw error;
  }
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

// Handle message shortcut
app.shortcut('open_link_in_profile', async ({ shortcut, ack, say }) => {
  await ack();
  
  const { message, user, channel } = shortcut as unknown as ShortcutEvent;
  const urls = extractUrls(message.text);
  
  if (urls.length === 0) {
    if (say) {
      await say('No URLs found in the selected message.');
    }
    return;
  }
  
  // Get channel-specific preferences
  const channelPrefs = userPreferences[channel.id] || {};
  const preferences = channelPrefs[user.id];
  
  if (!preferences) {
    if (say) {
      await say('Please set your browser profile first using `/set-browser <browser> <profile-name>`');
    }
    return;
  }
  
  const { browser, profile } = preferences;
  
  // If there's only one link, open it directly
  if (urls.length === 1) {
    await openUrlInBrowser(urls[0], browser, profile, say);
    return;
  }
  
  // For multiple links, show buttons
  if (say) {
    await say({
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Found ${urls.length} links in the message. Click a button below to open one in your ${browser} ${profile} profile:`
          }
        },
        {
          type: 'actions',
          elements: urls.map((url, index) => ({
            type: 'button',
            text: {
              type: 'plain_text',
              text: `Open Link ${index + 1}`,
              emoji: true
            },
            value: JSON.stringify({ url, browser, profile }),
            action_id: `open_link_${index}`
          }))
        }
      ]
    });
  }
});

// Handle button clicks
app.action(/^open_link_\d+$/, async ({ ack, body, say }) => {
  await ack();
  
  const actionBody = body as unknown as ActionEvent;
  const { url, browser, profile } = JSON.parse(actionBody.actions[0].value);
  
  await openUrlInBrowser(url, browser, profile, say);
});

// Start the app
(async () => {
  await app.start();
  console.log('⚡️ Bolt app is running!');
})(); 