#!/bin/bash
# syncip.sh - Simple script to sync WiFi IP and start Expo server
 
set -e
 
# Configuration
PROJECT_DIR=~/coding/expo/MemoraApp/memora
PORT=8081
 
# Go to project directory
cd "$PROJECT_DIR" || { echo "❌ Directory not found: $PROJECT_DIR"; exit 1; }
 
echo "🔍 Getting WiFi IP address..."
 
# Get WiFi IP and aggressively remove ALL whitespace
WIFI_IP=$(ipconfig.exe | grep -oE '192\.168\.[0-9]{1}\.[0-9]+' | head -1)
 
# Fallback: try WSL gateway
if [ -z "$WIFI_IP" ]; then
    WIFI_IP=$(ip route show default | awk '{print $3}' | tr -d '[:space:]')
fi
 
# Manual input if auto-detection fails
if [ -z "$WIFI_IP" ]; then
    echo "⚠️  Auto-detection failed"
    read -p "Enter WiFi IP manually: " WIFI_IP
    WIFI_IP=$(echo "$WIFI_IP" | tr -d '[:space:]')
fi
 
# Validate IP format
if [[ ! $WIFI_IP =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
    echo "❌ Invalid IP address format: '$WIFI_IP'"
    exit 1
fi
 
echo "✅ WiFi IP: $WIFI_IP"
echo "✅ Port: $PORT"
 
# Update .env file
cat > .env << EOF
WIFI_IP=$WIFI_IP
PORT=$PORT
EXPO_PUBLIC_API_URL=http://$WIFI_IP:$PORT
API_URL=http://$WIFI_IP:$PORT
EXPO_PUBLIC_WEBSOCKET_URL=ws://$WIFI_IP:$PORT
EOF
 
echo "📝 Updated .env file"
 
# Generate and display QR code
EXPO_URL="exp://${WIFI_IP}:${PORT}"
 
echo ""
echo "📱 Expo Connection URL:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
 
if command -v qrencode &> /dev/null; then
    echo -n "$EXPO_URL" | qrencode -t ANSIUTF8 2>/dev/null || echo -n "$EXPO_URL" | qrencode -t ANSI
    echo ""
else
    echo "💡 Install qrencode for QR codes: sudo apt install qrencode"
fi
 
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔗 Manual URL: $EXPO_URL"
echo ""
 
# Start Expo server
echo "🚀 Starting Expo server..."
npm start
