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

# Dictionary to store user preferences for browser profiles
user_preferences = {}

def extract_url(text):
    """Extract URL from text using regex and clean it"""
    url_pattern = r'https?://[^\s<>]+'
    match = re.search(url_pattern, text)
    if match:
        # Clean the URL by removing any trailing characters that aren't part of the URL
        url = match.group(0)
        # Remove any trailing punctuation or special characters
        url = url.rstrip('.,;:<>()[]{}"\'')
        return url
    return None

def open_in_chrome(url, profile):
    """Open URL in Chrome with specified profile"""
    chrome_path = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    # Use the --new-window flag and pass URL as a separate argument
    subprocess.Popen([chrome_path, f"--profile-directory={profile}", "--new-window", url])

def open_in_edge(url, profile):
    """Open URL in Edge with specified profile"""
    edge_path = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
    # Use the --new-window flag and pass URL as a separate argument
    subprocess.Popen([edge_path, f"--profile-directory={profile}", "--new-window", url])

@app.command("/set-browser")
def handle_set_browser(ack, command, say):
    """Handle the /set-browser command to set user's preferred browser and profile"""
    logger.debug(f"Received set-browser command: {command}")
    ack()
    user_id = command["user_id"]
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
    
    user_preferences[user_id] = {"browser": browser, "profile": profile}
    say(f"Your {browser} profile has been set to: {profile}")

@app.message(re.compile(r"https?://"))
def handle_link(message, say):
    """Handle messages containing URLs"""
    logger.debug(f"URL handler triggered for message: {message}")
    url = extract_url(message["text"])
    if not url:
        logger.debug("No URL found in message")
        return
    
    user_id = message["user"]
    preferences = user_preferences.get(user_id)
    
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
        logger.debug(f"No preferences found for user {user_id}")
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