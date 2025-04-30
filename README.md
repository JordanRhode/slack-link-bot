# Slack Link Profile Opener

This Slack integration allows you to open links in specific browser profiles for both Chrome and Microsoft Edge. It's particularly useful for managing different work contexts or separating personal and work browsing.

## Setup

1. Create a new Slack app at https://api.slack.com/apps
2. Enable Socket Mode in your app settings
3. Add the following bot token scopes:
   - `chat:write` - For sending messages
   - `commands` - For slash commands
   - `im:history` - For reading direct messages
   - `im:write` - For sending direct messages
   - `app_mentions:read` - For receiving mentions
   - `commands` - For slash commands
   - `message_shortcuts` - For message shortcuts

4. Create a slash command `/set-browser` in your app settings
5. Add a message shortcut named "Open Link in Profile"
6. Install the app to your workspace
7. Create a `.env` file with your Slack tokens:
   ```
   SLACK_BOT_TOKEN=xoxb-your-bot-token
   SLACK_APP_TOKEN=xapp-your-app-token
   ```

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the TypeScript code:
   ```bash
   npm run build
   ```
4. Run the application:
   ```bash
   npm start
   ```

For development, you can use:
```bash
npm run dev
```

## Usage

1. Set your preferred browser and profile:
   ```
   /set-browser chrome Work
   ```
   or
   ```
   /set-browser edge Personal
   ```
   (Replace "Work" or "Personal" with your desired profile name)

2. When you see a message with a link you want to open:
   - Click the three dots (more actions) menu on the message
   - Select "Open Link in Profile"
   - The bot will provide a button to open the link in your specified browser profile

## Finding Your Profile Name

1. Open your browser
2. Type `chrome://version` (for Chrome) or `edge://version` (for Edge) in the address bar
3. Look for "Profile Path" - the profile name is the last part (e.g., "Default", "Profile 1", etc.)

## Notes

- Supports both Chrome and Microsoft Edge browsers
- The profile name is used to identify which browser profile to use
- Browser paths are set to default Windows installation locations:
  - Chrome: `C:\Program Files\Google\Chrome\Application\chrome.exe`
  - Edge: `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`
- Settings are channel-specific, allowing different profiles for different channels
- Preferences are stored locally in `user_preferences.json` 