#!/bin/bash
# Chrome AI External Drive Setup for Mac
# Usage: ./setup-chrome-external.sh [drive-name]

set -e

echo "🚀 Chrome AI External Drive Setup for Mac"
echo "========================================"

# Get drive name from argument or ask user
if [ "$1" ]; then
    DRIVE_NAME="$1"
else
    echo "📁 Available external drives:"
    ls /Volumes/ | grep -v "Macintosh HD" | sed 's/^/   - /'
    echo ""
    read -p "Enter external drive name: " DRIVE_NAME
fi

EXTERNAL_DRIVE="/Volumes/$DRIVE_NAME"
CHROME_PROFILE="$EXTERNAL_DRIVE/Chrome-AI-Profile"

# Validation
if [ ! -d "$EXTERNAL_DRIVE" ]; then
    echo "❌ External drive '$DRIVE_NAME' not found at $EXTERNAL_DRIVE"
    echo "Available drives:"
    ls -1 /Volumes/
    exit 1
fi

# Check available space
echo "💾 Checking storage space..."
AVAILABLE_GB=$(df -g "$EXTERNAL_DRIVE" | tail -1 | awk '{print $4}')
echo "   Available space: ${AVAILABLE_GB}GB"

if [ "$AVAILABLE_GB" -lt 25 ]; then
    echo "❌ Insufficient space. Need at least 25GB, found ${AVAILABLE_GB}GB"
    exit 1
fi

echo "✅ Sufficient space available"

# Close Chrome
echo "🛑 Closing Chrome..."
osascript -e 'quit app "Google Chrome"' 2>/dev/null || true
sleep 2

# Kill any remaining Chrome processes
pkill -f "Google Chrome" 2>/dev/null || true
sleep 1

# Create external Chrome profile directory
echo "📁 Creating Chrome profile on external drive..."
mkdir -p "$CHROME_PROFILE"

# Copy existing Chrome profile if it exists
EXISTING_PROFILE="/Users/$(whoami)/Library/Application Support/Google/Chrome"
if [ -d "$EXISTING_PROFILE" ]; then
    echo "📋 Copying existing Chrome profile..."
    cp -R "$EXISTING_PROFILE"/* "$CHROME_PROFILE/" 2>/dev/null || true
fi

# Create launch script
LAUNCH_SCRIPT="$HOME/launch-chrome-ai.sh"
echo "📝 Creating launch script at $LAUNCH_SCRIPT..."

cat > "$LAUNCH_SCRIPT" << EOF
#!/bin/bash
# Chrome AI Launch Script
EXTERNAL_DRIVE="$EXTERNAL_DRIVE"
CHROME_PROFILE="$CHROME_PROFILE"

# Check if external drive is mounted
if [ ! -d "\$EXTERNAL_DRIVE" ]; then
    echo "❌ External drive not connected!"
    echo "Please connect '$DRIVE_NAME' and try again"
    osascript -e 'display dialog "External drive not connected!\n\nPlease connect '\''$DRIVE_NAME'\'' and try again." buttons {"OK"} default button "OK"'
    exit 1
fi

echo "🚀 Launching Chrome with AI profile on external drive..."
echo "📁 Profile: \$CHROME_PROFILE"

# Launch Chrome with external profile
open -a "Google Chrome" --args --user-data-dir="\$CHROME_PROFILE" --enable-features=BuiltInAIAPI

echo "✅ Chrome launched with external AI profile"
echo "💡 Install your PolyglotReader extension and enjoy 22GB+ AI models!"
EOF

chmod +x "$LAUNCH_SCRIPT"

# Create desktop shortcut
DESKTOP_SHORTCUT="$HOME/Desktop/Chrome AI (External).command"
cp "$LAUNCH_SCRIPT" "$DESKTOP_SHORTCUT"
chmod +x "$DESKTOP_SHORTCUT"

# Create dock shortcut
APPLICATIONS_SHORTCUT="/Applications/Chrome AI External.app"
mkdir -p "$APPLICATIONS_SHORTCUT/Contents/MacOS"
cp "$LAUNCH_SCRIPT" "$APPLICATIONS_SHORTCUT/Contents/MacOS/Chrome AI External"

# Create Info.plist for the app
cat > "$APPLICATIONS_SHORTCUT/Contents/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>Chrome AI External</string>
    <key>CFBundleIdentifier</key>
    <string>com.local.chrome-ai-external</string>
    <key>CFBundleName</key>
    <string>Chrome AI External</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
</dict>
</plist>
EOF

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "Your Chrome AI setup is ready with external storage:"
echo ""
echo "📁 Profile Location: $CHROME_PROFILE"
echo "🚀 Launch Script: $LAUNCH_SCRIPT"
echo "🖥️  Desktop Shortcut: ~/Desktop/Chrome AI (External).command"
echo "📱 Applications: /Applications/Chrome AI External.app"
echo ""
echo "🔥 Next Steps:"
echo "1. Double-click 'Chrome AI (External).command' on Desktop"
echo "2. Install PolyglotReader extension in the new Chrome window"
echo "3. Select text on any webpage to test AI features!"
echo ""
echo "💡 Tips:"
echo "- Always connect '$DRIVE_NAME' before launching"
echo "- First AI model download may take 5-10 minutes"
echo "- Check chrome://components/ for download progress"
echo ""
echo "✅ You now have access to 22GB+ AI models on external storage!"