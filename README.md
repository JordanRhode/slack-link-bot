# Slack Link Profile Opener

This Slack integration allows you to open links in specific browser profiles for both Chrome and Microsoft Edge. It's particularly useful for managing different work contexts or separating personal and work browsing.

## Setup

1. Create a new Slack app at https://api.slack.com/apps
2. Enable Socket Mode in your app settings
3. Add the following bot token scopes:
   - `chat:write`
   - `commands`
4. Create a slash command `/set-browser` in your app settings
5. Install the app to your workspace
6. Create a `.env` file with your Slack tokens:
   ```
   SLACK_BOT_TOKEN=xoxb-your-bot-token
   SLACK_APP_TOKEN=xapp-your-app-token
   ```

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the application:
   ```bash
   python app.py
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

2. Share any URL in a channel where the bot is present
3. The bot will automatically open the link in your specified browser profile

## Notes

- Supports both Chrome and Microsoft Edge browsers
- The profile name is used to identify which browser profile to use
- Make sure your browser is installed in the default location:
  - Chrome: `C:\Program Files\Google\Chrome\Application\chrome.exe`
  - Edge: `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`
- The bot needs to be present in the channel where you want to use it 