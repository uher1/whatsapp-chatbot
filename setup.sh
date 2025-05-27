#!/bin/bash

# WhatsApp Groq Chatbot - Quick Setup Script
# Secure Version v2.0

echo "🚀 Setting up WhatsApp Groq Chatbot - Secure Version..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}💡 $1${NC}"
}

# Check if Node.js is installed
echo "🔍 Checking prerequisites..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 16+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js version 16+ required. Current version: $(node --version)"
    exit 1
fi

print_status "Node.js $(node --version) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_status "npm $(npm --version) detected"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
if npm install; then
    print_status "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Create .env file if it doesn't exist
echo ""
echo "🔧 Setting up environment configuration..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        print_status ".env file created from template"
    else
        print_warning ".env.example not found, creating basic .env"
        cat > .env << EOL
# Groq AI Configuration
GROQ_API_KEY=gsk_your_groq_api_key_here

# Puppeteer Configuration  
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Server Configuration
PORT=3000
EOL
    fi
else
    print_warning ".env file already exists, skipping creation"
fi

# Check for Chrome/Chromium
echo ""
echo "🌐 Checking browser installation..."
CHROME_PATHS=(
    "/usr/bin/google-chrome"
    "/usr/bin/chromium-browser" 
    "/usr/bin/chromium"
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    "/Applications/Chromium.app/Contents/MacOS/Chromium"
)

CHROME_FOUND=""
for path in "${CHROME_PATHS[@]}"; do
    if [ -f "$path" ]; then
        CHROME_FOUND="$path"
        break
    fi
done

if [ -n "$CHROME_FOUND" ]; then
    print_status "Browser found: $CHROME_FOUND"
    # Update .env with correct path
    sed -i.bak "s|PUPPETEER_EXECUTABLE_PATH=.*|PUPPETEER_EXECUTABLE_PATH=$CHROME_FOUND|" .env
    print_status "Updated .env with browser path"
else
    print_warning "Chrome/Chromium not found in common locations"
    print_info "Please install Google Chrome or Chromium browser"
    print_info "Then update PUPPETEER_EXECUTABLE_PATH in .env file"
fi

# Create necessary directories
echo ""
echo "📁 Creating directories..."
mkdir -p logs
mkdir -p session_data
print_status "Directories created"

# Set proper permissions for .env
echo ""
echo "🔐 Setting secure permissions..."
chmod 600 .env
print_status "Secure permissions set for .env file"

# Install PM2 globally if not present
echo ""
echo "🔄 Checking PM2 installation..."
if ! command -v pm2 &> /dev/null; then
    print_info "Installing PM2 for process management..."
    if npm install -g pm2; then
        print_status "PM2 installed successfully"
    else
        print_warning "Failed to install PM2 globally, you can still run with 'npm start'"
    fi
else
    print_status "PM2 already installed"
fi

# Final instructions
echo ""
echo "🎉 Setup completed successfully!"
echo ""
print_info "Next steps:"
echo "1. Get your free Groq API key from: https://console.groq.com"
echo "2. Edit .env file and replace 'gsk_your_groq_api_key_here' with your actual API key"
echo "3. Run the bot with one of these commands:"
echo ""
echo "   📱 Development mode (with auto-restart):"
echo "   ${GREEN}npm run dev${NC}"
echo ""
echo "   🚀 Production mode:"
echo "   ${GREEN}npm start${NC}"
echo ""
echo "   🔄 With PM2 (recommended for production):"
echo "   ${GREEN}npm run pm2${NC}"
echo ""
print_warning "SECURITY REMINDER:"
echo "- Never commit your .env file to version control"
echo "- Keep your API key secret and secure"
echo "- The .env file is already added to .gitignore"
echo ""
print_info "For help and troubleshooting, check README.md"
echo ""
echo "🔐 Happy coding with secure WhatsApp Groq Chatbot!"
