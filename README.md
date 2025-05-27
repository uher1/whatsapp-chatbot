# 🤖 WhatsApp Chatbot dengan Groq AI - Secure Version

Chatbot WhatsApp yang terintegrasi dengan Groq AI untuk memberikan response cerdas dan cepat. Versi ini telah diperbaiki dengan fitur keamanan yang enhanced.

## 🆕 **VERSI TERBARU - SECURE v2.0**

### ✨ **Perbaikan Utama:**
- 🔐 **API Key Secured** - Tidak lagi hardcoded di kode
- 🛡️ **Rate Limiting** - Mencegah spam dan overload
- 🧹 **Memory Management** - Auto cleanup conversation history
- 📝 **Enhanced Logging** - Winston logging system
- ⚡ **Input Sanitization** - Validasi dan pembersihan input
- 🚫 **Anti-Loop Protection** - Mencegah bot merespon pesan sendiri
- 💾 **Database Error Handling** - Robust database operations
- 🔄 **Graceful Shutdown** - Proper cleanup saat shutdown

## 🚀 **Features**

### 🤖 **Groq AI Integration**
- ✅ Super fast AI responses (fastest in the world!)
- ✅ 6000 requests/day - FREE tier
- ✅ Conversation context memory
- ✅ Smart message filtering
- ✅ Multi-model support (Llama 3.1 70B, 8B, Mixtral)

### 📝 **Productivity Features**
- ✅ Smart note-taking dengan timestamp
- ✅ Flexible reminder system
- ✅ Auto-generated daily summaries
- ✅ Time-based note organization

### 🔐 **Security Features**
- ✅ Environment-based API key management
- ✅ Rate limiting per user (2s cooldown)
- ✅ Input length limiting (max 2000 chars)
- ✅ Anti-spam protection
- ✅ Comprehensive error logging
- ✅ Memory leak prevention

## 📋 **Prerequisites**

- Node.js 16+ 
- npm atau yarn
- Google Chrome/Chromium browser
- Groq API Key (gratis dari console.groq.com)

## 🛠️ **Installation & Setup**

### **Step 1: Clone dan Install Dependencies**

```bash
# Clone repository
git clone <your-repo-url>
cd whatsapp-groq-chatbot

# Install dependencies
npm install

# Atau menggunakan yarn
yarn install
```

### **Step 2: Setup Environment Variables** 🔐

1. Copy file `.env` template:
```bash
cp .env.example .env
```

2. Edit file `.env` dan isi dengan kredensial Anda:
```bash
# Groq AI Configuration
GROQ_API_KEY=gsk_your_groq_api_key_here

# Puppeteer Configuration  
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Server Configuration
PORT=3000
```

### **Step 3: Dapatkan Groq API Key** 🔑

1. Kunjungi [console.groq.com](https://console.groq.com)
2. Sign up/Login dengan akun Google
3. Navigate ke **API Keys**
4. Klik **Create API Key**
5. Copy API key yang dihasilkan (dimulai dengan `gsk_`)
6. Paste ke file `.env` Anda

### **Step 4: Run the Bot** 🚀

```bash
# Development mode dengan auto-restart
npm run dev

# Production mode
npm start

# Atau menggunakan PM2 (recommended untuk production)
npm run pm2
```

### **Step 5: Scan QR Code** 📱

1. Bot akan generate QR code di terminal
2. Scan dengan WhatsApp di HP Anda
3. Tunggu hingga status menjadi "✅ Ready"

## 🎮 **Usage Commands**

### 📝 **Note & Reminder Commands**
```
catat [pesan]                    # Simpan catatan
catat 14:30 Meeting client       # Catatan dengan waktu spesifik
reminder 15:00 Call boss         # Set reminder
test reminder Tes 5 menit        # Test reminder (5 menit)
hari ini                         # Lihat catatan hari ini
```

### 🤖 **Groq AI Commands**
```
[tanya apapun]                   # Chat dengan Groq AI
groq status                      # Cek status dan usage
clear ai                         # Reset conversation history
setup groq                       # Panduan setup lengkap
```

### 📋 **Utility Commands**
```
bantuan                          # Menu bantuan lengkap
status                           # Status bot dan koneksi
```

### 💬 **Contoh Conversation dengan Groq AI**
```
You: Halo, bagaimana cara belajar programming?
Bot: ✨ Halo! Senang bisa membantu dengan journey programming kamu! 😊

Programming itu seperti belajar bahasa baru, butuh konsistensi dan praktek. Berikut roadmap yang aku rekomendasikan:

🚀 **Tahap Pemula:**
• Pilih satu bahasa dulu (Python bagus untuk pemula)
• Pelajari konsep dasar: variabel, loop, function
• Praktek dengan project kecil setiap hari

📚 **Resources Terbaik:**
• FreeCodeCamp untuk tutorial gratis
• LeetCode untuk problem solving
• GitHub untuk melihat code orang lain

💡 **Tips Penting:**
• Jangan terburu-buru, fokus pada pemahaman
• Build project nyata, bukan cuma tutorial
• Join komunitas developer untuk support

Mau fokus ke bidang tertentu? Web development, mobile, atau data science? 🤔

🤖 *Powered by Groq AI - Secure & Fast*
```

## 🔧 **Advanced Configuration**

### **Environment Variables Lengkap**

```bash
# Groq AI Settings
GROQ_API_KEY=gsk_your_api_key_here
GROQ_MODEL=llama-3.1-70b-versatile    # Optional: change model
GROQ_MAX_TOKENS=1000                   # Optional: response length
GROQ_TEMPERATURE=0.7                   # Optional: creativity level

# Puppeteer Settings
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
PUPPETEER_HEADLESS=true                # Optional: headless mode

# Server Settings
PORT=3000
NODE_ENV=production                    # Optional: environment

# Logging Settings
LOG_LEVEL=info                         # Optional: debug|info|warn|error
```

### **Custom Model Configuration**

Groq menyediakan beberapa model gratis:

```javascript
// Dalam konfigurasi GROQ_CONFIG
model: 'llama-3.1-70b-versatile',     // Terpintar (default)
model: 'llama-3.1-8b-instant',        // Tercepat
model: 'mixtral-8x7b-32768',          // Balanced
```

## 📊 **Monitoring & Logs**

### **Web Dashboard**
Akses `http://localhost:3000` untuk melihat:
- Real-time status bot
- Daily usage statistics  
- Active conversations count
- Security features status
- Health check information

### **Log Files**
```bash
error.log        # Error-level logs only
combined.log     # All logs
console          # Real-time console output
```

### **PM2 Monitoring** (Production)
```bash
# Lihat status
pm2 status

# Lihat logs real-time
npm run pm2-logs

# Restart bot
npm run pm2-restart

# Stop bot
npm run pm2-stop
```

## 🛡️ **Security Best Practices**

### ✅ **DO:**
- Selalu gunakan environment variables untuk API keys
- Regularly update dependencies: `npm audit fix`
- Monitor logs untuk aktivitas mencurigakan  
- Backup database secara berkala
- Use HTTPS in production environment
- Set proper file permissions (600 untuk .env)

### ❌ **DON'T:**
- Never commit .env file ke repository
- Jangan share API key di public channels
- Avoid running as root user in production
- Don't disable rate limiting in production
- Never expose database files publicly

## 🚨 **Troubleshooting**

### **Bot tidak connect ke WhatsApp**
```bash
# Hapus session lama
rm -rf session_data/

# Restart bot
npm run pm2-restart
```

### **Groq AI tidak response**
```bash
# Check API key validity
echo $GROQ_API_KEY

# Test dengan curl
curl -H "Authorization: Bearer $GROQ_API_KEY" https://api.groq.com/openai/v1/models

# Check logs
tail -f error.log
```

### **Database errors**
```bash
# Backup dan reset database
cp catatan.db catatan.db.backup
rm catatan.db

# Restart bot (akan auto-create tables)
npm run pm2-restart
```

### **Memory usage tinggi**
```bash
# Check conversation history size
# Reduce cleanup interval dalam kode jika perlu

# Monitor memory
pm2 monit
```

## 📈 **Performance Optimization**

### **Untuk High Traffic:**
```javascript
// Dalam konfigurasi bot
const GROQ_CONFIG = {
    // Reduce conversation history length
    maxHistoryLength: 4,  // Default: 8
    
    // Increase rate limiting
    rateLimitCooldown: 5000,  // 5 seconds
    
    // Reduce cleanup interval
    cleanupInterval: 30 * 60 * 1000,  // 30 minutes
};
```

### **Database Optimization:**
```sql
-- Add indexes untuk performance
CREATE INDEX idx_catatan_waktu ON catatan(waktu_wib);
CREATE INDEX idx_ai_conv_nomor ON ai_conversations(nomor_pengirim);
CREATE INDEX idx_ai_conv_waktu ON ai_conversations(waktu);
```

## 💰 **Cost Management**

### **Groq Free Tier Limits:**
- ✅ 6,000 requests per day
- ✅ No credit card required
- ✅ No billing surprises
- ✅ Fastest inference speed

### **Usage Monitoring:**
Bot secara otomatis track daily usage dan akan stop saat limit tercapai.

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Submit Pull Request

## 📞 **Support**

Jika mengalami masalah:

1. **Check logs** untuk error messages
2. **Verify .env file** configuration
3. **Test API key** dengan curl command
4. **Restart bot** dengan `npm run pm2-restart`
5. **Check disk space** dan memory usage

## 📄 **License**

MIT License - feel free to use for personal and commercial projects.

## 🙏 **Acknowledgments**

- [Groq](https://groq.com) untuk AI inference yang super cepat
- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) untuk WhatsApp integration
- [Winston](https://github.com/winstonjs/winston) untuk logging system

---

**🔐 Always remember: Keep your API keys secure and never commit them to version control!**

*Happy coding! 🚀*
