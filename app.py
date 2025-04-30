import os
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
from dotenv import load_dotenv
import webbrowser
import re
import subprocess
import logging
import json

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize the Slack app
app = App(token=os.environ.get("SLACK_BOT_TOKEN"))

# File path for storing user preferences
PREFERENCES_FILE = "user_preferences.json"

def load_preferences():
    """Load user preferences from JSON file"""
    try:
        if os.path.exists(PREFERENCES_FILE):
            with open(PREFERENCES_FILE, 'r') as f:
                return json.load(f)
    except Exception as e:
        logger.error(f"Error loading preferences: {e}")
    return {}

def save_preferences(preferences):
    """Save user preferences to JSON file"""
    try:
        with open(PREFERENCES_FILE, 'w') as f:
            json.dump(preferences, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving preferences: {e}")

# Load existing preferences
user_preferences = load_preferences()

def extract_url(text):
    logger.debug(f"Extracting URL from text: {text}")
    """Extract URL from text using regex and clean it"""
    # First try to match Slack's labeled links <url|label>
    labeled_link_pattern = r'<([^|>]+)(?:\|[^>]+)?>'
    labeled_match = re.search(labeled_link_pattern, text)
    if labeled_match:
        url = labeled_match.group(1)
        # Remove any URL-encoded characters at the end
        url = re.sub(r'%[0-9A-Fa-f]{2}$', '', url)
        return url
    
    # If no labeled link found, look for plain URLs
    url_pattern = r'https?://[^\s<>]+'
    match = re.search(url_pattern, text)
    if match:
        url = match.group(0)
        # Remove any trailing punctuation or special characters
        url = url.rstrip('.,;:<>()[]{}"\'|')
        # Remove any URL-encoded characters at the end
        url = re.sub(r'%[0-9A-Fa-f]{2}$', '', url)
        return url
    return None

def open_in_chrome(url, profile):
    """Open URL in Chrome with specified profile"""
    chrome_path = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    # Open in existing window by removing --new-window flag
    subprocess.Popen([chrome_path, f"--profile-directory={profile}", url])

def open_in_edge(url, profile):
    """Open URL in Edge with specified profile"""
    edge_path = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
    # Open in existing window by removing --new-window flag
    subprocess.Popen([edge_path, f"--profile-directory={profile}", url])

@app.command("/set-browser")
def handle_set_browser(ack, command, say):
    """Handle the /set-browser command to set user's preferred browser and profile"""
    logger.debug(f"Received set-browser command: {command}")
    ack()
    user_id = command["user_id"]
    channel_id = command["channel_id"]
    args = command["text"].strip().split()
    
    if len(args) < 2:
        say("""Please specify both browser and profile name. Example: `/set-browser chrome Default` or `/set-browser edge Profile 1`

To find your profile name:
1. Open your browser
2. Type `chrome://version` (for Chrome) or `edge://version` (for Edge) in the address bar
3. Look for "Profile Path" - the profile name is the last part (e.g., "Default", "Profile 1", etc.)""")
        return
    
    browser = args[0].lower()
    if browser not in ["chrome", "edge"]:
        say("Please specify either 'chrome' or 'edge' as the browser")
        return
    
    # Join all remaining arguments to handle profile names with spaces
    profile = " ".join(args[1:])
    if not profile:
        say("Please specify a profile name")
        return
    
    # Initialize channel preferences if not exists
    if channel_id not in user_preferences:
        user_preferences[channel_id] = {}
    
    user_preferences[channel_id][user_id] = {"browser": browser, "profile": profile}
    save_preferences(user_preferences)  # Save preferences after updating
    say(f"Your {browser} profile has been set to: {profile} for this channel")

@app.message(re.compile(r"https?://"))
def handle_link(message, say):
    """Handle messages containing URLs"""
    logger.debug(f"URL handler triggered for message: {message}")
    url = extract_url(message["text"])
    if not url:
        logger.debug("No URL found in message")
        return
    
    user_id = message["user"]
    channel_id = message["channel"]
    
    # Get channel-specific preferences
    channel_prefs = user_preferences.get(channel_id, {})
    preferences = channel_prefs.get(user_id)
    
    if preferences:
        browser = preferences["browser"]
        profile = preferences["profile"]
        
        # Create a button to open the URL
        say(
            blocks=[
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"Found a link in your message. Click the button below to open it in your {browser} {profile} profile:"
                    }
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": "Open Link",
                                "emoji": True
                            },
                            "value": json.dumps({
                                "url": url,
                                "browser": browser,
                                "profile": profile
                            }),
                            "action_id": "open_link"
                        }
                    ]
                }
            ]
        )
    else:
        logger.debug(f"No preferences found for user {user_id} in channel {channel_id}")
        say("Please set your browser profile first using `/set-browser <browser> <profile-name>`")

@app.action("open_link")
def handle_open_link(ack, body, logger, say):
    """Handle the button click to open the URL"""
    ack()
    value = json.loads(body["actions"][0]["value"])
    url = value["url"]
    browser = value["browser"]
    profile = value["profile"]
    
    logger.debug(f"Opening URL {url} in {browser} with profile {profile}")
    if browser == "chrome":
        open_in_chrome(url, profile)
    else:  # edge
        open_in_edge(url, profile)

if __name__ == "__main__":
    logger.info("Starting Slack bot...")
    logger.info(f"Bot token: {os.environ.get('SLACK_BOT_TOKEN')[:10]}...")
    logger.info(f"App token: {os.environ.get('SLACK_APP_TOKEN')[:10]}...")
    handler = SocketModeHandler(app_token=os.environ.get("SLACK_APP_TOKEN"), app=app)
    handler.start() 