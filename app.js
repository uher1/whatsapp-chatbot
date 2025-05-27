// CHATBOT WHATSAPP DENGAN GROQ AI - 100% FREE FOREVER
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const moment = require('moment-timezone');
const sqlite3 = require('sqlite3').verbose();
const express = require('express');
const axios = require('axios');

console.log('🚀 Memulai Chatbot WhatsApp dengan Groq AI (100% FREE)...');

// KONFIGURASI GROQ AI - 100% GRATIS SELAMANYA
const GROQ_CONFIG = {
    enabled: true,
    apiKey: 'gsk_your-groq-api-key-here', // Get from console.groq.com - FREE!
    model: 'llama-3.1-70b-versatile', // Model terpintar yang gratis
    // Alternative free models:
    // model: 'llama-3.1-8b-instant', // Paling cepat
    // model: 'mixtral-8x7b-32768', // Good balance
    
    baseURL: 'https://api.groq.com/openai/v1',
    maxTokens: 1000,
    temperature: 0.7,
    systemMessage: `Anda adalah asisten WhatsApp yang cerdas dan membantu bernama "Groq Assistant". 

Kepribadian Anda:
- Ramah, helpful, dan responsif
- Berbicara dalam bahasa Indonesia yang natural dan mengalir
- Gunakan emoji yang sesuai untuk membuat percakapan lebih menarik
- Jawab dengan singkat namun informatif (maksimal 3-4 paragraf)
- Selalu berikan informasi yang akurat dan up-to-date

Anda powered by Groq - AI inference paling cepat di dunia, dan 100% GRATIS!

Anda bisa membantu dengan:
- Menjawab pertanyaan umum tentang berbagai topik
- Memberikan saran dan tips praktis
- Membantu dengan tugas sehari-hari dan akademis
- Menjelaskan konsep kompleks dengan cara yang mudah dipahami
- Membantu brainstorming ide dan creative thinking
- Memberikan rekomendasi yang relevan
- Analisis dan pemecahan masalah
- Coding assistance dan technical support

Khusus untuk User Ini:
- Bantu dengan tugas kuliah Universitas Terbuka
- Support untuk project development dan coding
- Research assistance untuk academic work
- Professional dan educational guidance

Gaya Response:
- Response yang engaging dan conversational
- Struktur yang jelas dengan bullet points jika perlu
- Emoji yang contextual dan professional
- Berikan insights tambahan yang valuable
- Proactive dalam memberikan follow-up suggestions

PENTING: Groq adalah platform AI gratis terbaik - super cepat dan tidak perlu bayar!`,
    
    conversationHistory: new Map(), // Store conversation per user
    
    // Free tier limits (very generous!)
    dailyLimit: 6000, // 6000 requests per day - FREE!
    requestCount: 0,
    lastReset: new Date().toDateString()
};

// Initialize Groq API client
let groqClient = null;

if (GROQ_CONFIG.enabled && GROQ_CONFIG.apiKey !== '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') {
    groqClient = axios.create({
        baseURL: GROQ_CONFIG.baseURL,
        headers: {
            'Authorization': `Bearer ${GROQ_CONFIG.apiKey}`,
            'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
    });
    console.log('🤖 Groq AI API initialized successfully');
    console.log('💰 100% FREE - No payment required ever!');
} else {
    console.log('⚠️ Groq disabled - API key belum diset');
}

// Anti-loop protection
let lastProcessedMessage = '';
let lastProcessedTime = 0;

// Setup database
const db = new sqlite3.Database('catatan.db');

// Buat tabel jika belum ada
db.run(`
    CREATE TABLE IF NOT EXISTS catatan (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pesan TEXT NOT NULL,
        waktu DATETIME DEFAULT CURRENT_TIMESTAMP,
        waktu_wib TEXT
    )
`);

// Tabel untuk menyimpan conversation dengan AI
db.run(`
    CREATE TABLE IF NOT EXISTS ai_conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nomor_pengirim TEXT NOT NULL,
        user_message TEXT NOT NULL,
        ai_response TEXT NOT NULL,
        model_used TEXT DEFAULT 'llama-3.1-70b-versatile',
        tokens_used INTEGER DEFAULT 0,
        waktu DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

console.log('📁 Database siap!');

// FUNGSI GROQ AI - 100% FREE
async function getGroqResponse(userMessage, nomorPengirim) {
    try {
        if (!groqClient) {
            return {
                success: false,
                error: 'Groq AI belum dikonfigurasi. Set API key terlebih dahulu.'
            };
        }

        // Check daily limit reset
        const today = new Date().toDateString();
        if (today !== GROQ_CONFIG.lastReset) {
            GROQ_CONFIG.requestCount = 0;
            GROQ_CONFIG.lastReset = today;
        }

        // Check daily limit (generous 6000/day!)
        if (GROQ_CONFIG.requestCount >= GROQ_CONFIG.dailyLimit) {
            return {
                success: false,
                error: 'Daily limit tercapai (6000 requests). Reset besok pagi.'
            };
        }

        console.log(`🤖 Sending to Groq: "${userMessage}" from ${nomorPengirim}`);

        // Get conversation history untuk context
        let chatHistory = GROQ_CONFIG.conversationHistory.get(nomorPengirim) || [];
        
        // Limit history to last 8 messages untuk optimize performance
        if (chatHistory.length > 8) {
            chatHistory = chatHistory.slice(-8);
        }

        // Build messages array
        const messages = [
            { role: 'system', content: GROQ_CONFIG.systemMessage },
            ...chatHistory,
            { role: 'user', content: userMessage }
        ];

        // Send to Groq
        const response = await groqClient.post('/chat/completions', {
            model: GROQ_CONFIG.model,
            messages: messages,
            max_tokens: GROQ_CONFIG.maxTokens,
            temperature: GROQ_CONFIG.temperature,
            stream: false
        });

        const responseText = response.data.choices[0].message.content;
        const tokensUsed = response.data.usage.total_tokens;

        // Update conversation history
        chatHistory.push(
            { role: 'user', content: userMessage },
            { role: 'assistant', content: responseText }
        );
        GROQ_CONFIG.conversationHistory.set(nomorPengirim, chatHistory);

        // Increment request count
        GROQ_CONFIG.requestCount++;

        // Save ke database
        db.run(
            'INSERT INTO ai_conversations (nomor_pengirim, user_message, ai_response, model_used, tokens_used) VALUES (?, ?, ?, ?, ?)',
            [nomorPengirim, userMessage, responseText, GROQ_CONFIG.model, tokensUsed]
        );

        console.log(`✅ Groq response: "${responseText.substring(0, 100)}..."`);
        console.log(`💰 Tokens used: ${tokensUsed} | Daily count: ${GROQ_CONFIG.requestCount}/${GROQ_CONFIG.dailyLimit}`);

        return {
            success: true,
            response: responseText,
            tokensUsed: tokensUsed,
            model: GROQ_CONFIG.model,
            dailyCount: GROQ_CONFIG.requestCount
        };

    } catch (error) {
        console.error('❌ Groq error:', error.message);
        
        let errorMessage = 'Groq AI sedang bermasalah, coba lagi nanti';
        
        if (error.response) {
            const status = error.response.status;
            const errorData = error.response.data;
            
            if (status === 401) {
                errorMessage = 'API key Groq tidak valid';
            } else if (status === 429) {
                errorMessage = 'Rate limit Groq terlampaui, coba lagi dalam beberapa detik';
            } else if (status === 400) {
                errorMessage = 'Request tidak valid, coba pertanyaan yang berbeda';
            } else {
                errorMessage = `Groq error: ${errorData.error?.message || 'Unknown error'}`;
            }
        } else if (error.code === 'ECONNABORTED') {
            errorMessage = 'Request timeout, coba lagi';
        }
        
        return {
            success: false,
            error: errorMessage
        };
    }
}

// FUNGSI UNTUK CLEAR CONVERSATION HISTORY
function clearConversationHistory(nomorPengirim) {
    GROQ_CONFIG.conversationHistory.delete(nomorPengirim);
    console.log(`🧹 Conversation history cleared for ${nomorPengirim}`);
}

// FUNGSI UNTUK CHECK APAKAH PESAN BUTUH AI
function shouldUseAI(message, nomorPengirim) {
    const pesan = message.toLowerCase().trim();
    
    // Skip bot's own messages (anti-loop)
    if (pesan.includes('❌ groq error') || pesan.includes('🤖 powered by') || pesan.includes('daily limit tercapai')) {
        console.log(`🚫 Skip bot's own message: ${pesan.substring(0, 50)}...`);
        return false;
    }
    
    // Skip jika pesan adalah command existing
    const existingCommands = [
        'catat ', 'reminder ', 'ingatkan ', 'test reminder ',
        'hari ini', 'minggu ini', 'bantuan', 'help', 'status',
        'hapus hari ini', 'siapa', 'setup', 'config', 
        'ai status', 'clear ai', 'reset ai', 'groq status',
        'setup groq', 'config groq', 'catatan hari ini'
    ];
    
    for (const cmd of existingCommands) {
        if (pesan.startsWith(cmd) || pesan === cmd.trim()) {
            console.log(`🚫 Skip command: ${pesan}`);
            return false;
        }
    }
    
    // Skip jika pesan kosong atau hanya whitespace
    if (pesan.length === 0) {
        console.log(`🚫 Skip empty message`);
        return false;
    }
    
    // Skip jika pesan hanya emoji atau karakter khusus (tanpa huruf/angka)
    if (!/[a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF]/.test(pesan)) {
        console.log(`🚫 Skip special chars only: ${pesan}`);
        return false;
    }
    
    // PERMISSIVE MODE: Allow semua greeting & conversation
    // Skip HANYA jika single digit atau accident
    if (pesan.length === 1 && /^[0-9\.\?\!]$/.test(pesan)) {
        console.log(`🚫 Skip single char: ${pesan}`);
        return false;
    }
    
    // Skip common accident patterns
    const skipPatterns = ['..', '???', '!!!', 'hm', 'hmm'];
    if (skipPatterns.includes(pesan)) {
        console.log(`🚫 Skip pattern: ${pesan}`);
        return false;
    }
    
    // SEMUA YANG LAIN KIRIM KE AI (termasuk "halo", "hai", greeting, dll)
    console.log(`✅ Groq akan proses: "${pesan}"`);
    return true;
}

// Inisialisasi WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './session_data'
    }),
    puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection'
        ]
    }
});

// Event ketika QR code siap
client.on('qr', (qr) => {
    console.log('📱 Scan QR code berikut dengan WhatsApp:');
    console.log('');
    qrcode.generate(qr, { small: true });
    console.log('');
    console.log('⬆️ Scan QR code di atas dengan WhatsApp di HP Anda');
});

// Event ketika client siap
client.on('ready', () => {
    console.log('✅ Chatbot dengan Groq AI siap digunakan!');
    console.log('🤖 Groq integration:', groqClient ? 'ACTIVE' : 'DISABLED');
    console.log('💰 100% FREE - 6000 requests/day limit');
    console.log('💡 Kirim pesan apapun untuk berinteraksi dengan Groq AI');
});

// Event ketika loading
client.on('loading_screen', (percent, message) => {
    console.log(`⏳ Loading: ${percent}% - ${message}`);
});

// Event ketika authenticated
client.on('authenticated', () => {
    console.log('🔐 Authenticated berhasil!');
});

// MAIN MESSAGE HANDLER
client.on('message_create', async (message) => {
    try {
        // Filter minimal - hanya proses pesan text biasa
        if (message.type !== 'chat') {
            return;
        }
        
        // Skip pesan kosong
        if (!message.body || message.body.trim() === '') {
            return;
        }
        
        // Anti-loop protection
        const currentTime = Date.now();
        const messageKey = message.body.trim() + message.from;
        
        if (messageKey === lastProcessedMessage && (currentTime - lastProcessedTime) < 5000) {
            console.log('🔇 Skip: Duplikasi pesan dalam 5 detik');
            return;
        }
        
        lastProcessedMessage = messageKey;
        lastProcessedTime = currentTime;
        
        console.log(`📨 Pesan diterima: "${message.body}" dari ${message.from}`);
        
        const pesan = message.body.toLowerCase().trim();
        const nomorPengirim = message.from;
        const nomorAnda = '6282213741911@c.us';
        
        const waktuWIB = moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss');
        const tanggalWIB = moment().tz('Asia/Jakarta').format('DD/MM/YYYY');
        const jamWIB = moment().tz('Asia/Jakarta').format('HH:mm');
        
        // EXISTING COMMANDS (catatan, reminder, dll) - TIDAK BERUBAH
        if (pesan.startsWith('catat ')) {
            const fullCatatan = message.body.substring(6).trim();
            
            if (fullCatatan === '') {
                message.reply('❌ Catatan kosong!\n\n📝 *Format yang didukung:*\n• catat Makan siang di kantin\n• catat 14:30 Meeting dengan client');
                return;
            }
            
            let waktuCustom = null;
            let catatanText = fullCatatan;
            let waktuSimpan = waktuWIB;
            let jamTampil = jamWIB;
            
            const timeRegex = /^(\d{1,2}):(\d{2})\s+(.+)$/;
            const match = fullCatatan.match(timeRegex);
            
            if (match) {
                const jam = parseInt(match[1]);
                const menit = parseInt(match[2]);
                catatanText = match[3].trim();
                
                if (jam >= 0 && jam <= 23 && menit >= 0 && menit <= 59) {
                    const tanggalHariIni = moment().tz('Asia/Jakarta').format('YYYY-MM-DD');
                    waktuCustom = `${tanggalHariIni} ${jam.toString().padStart(2, '0')}:${menit.toString().padStart(2, '0')}:00`;
                    waktuSimpan = waktuCustom;
                    jamTampil = `${jam.toString().padStart(2, '0')}:${menit.toString().padStart(2, '0')}`;
                } else {
                    message.reply('❌ Format waktu salah! Gunakan format HH:MM');
                    return;
                }
            }
            
            if (catatanText === '') {
                message.reply('❌ Deskripsi catatan kosong!');
                return;
            }
            
            const catatanFinal = `${catatanText} [dari: ${nomorPengirim}]`;
            
            db.run(
                'INSERT INTO catatan (pesan, waktu_wib) VALUES (?, ?)',
                [catatanFinal, waktuSimpan],
                function(err) {
                    if (err) {
                        message.reply('❌ Gagal menyimpan catatan');
                    } else {
                        const statusWaktu = waktuCustom ? '🕐 (waktu manual)' : '🕐 (waktu sekarang)';
                        message.reply(`✅ Catatan tersimpan! ${statusWaktu}\n📅 ${tanggalWIB} | ⏰ ${jamTampil}\n📝 "${catatanText}"`);
                    }
                }
            );
        }
        
        // Command untuk melihat catatan hari ini
        else if (pesan === 'catatan hari ini' || pesan === 'hari ini') {
            const tanggalHariIni = moment().tz('Asia/Jakarta').format('YYYY-MM-DD');
            
            db.all(
                'SELECT * FROM catatan WHERE DATE(waktu_wib) = ? ORDER BY waktu_wib ASC',
                [tanggalHariIni],
                (err, rows) => {
                    if (err) {
                        message.reply('❌ Gagal mengambil catatan');
                        return;
                    }
                    
                    if (rows.length === 0) {
                        message.reply('📝 Belum ada catatan hari ini');
                        return;
                    }
                    
                    let response = `📋 *Catatan Hari Ini (${tanggalWIB})*\n\n`;
                    rows.forEach((row, index) => {
                        const jam = moment(row.waktu_wib).format('HH:mm');
                        response += `${index + 1}. [${jam}] ${row.pesan}\n`;
                    });
                    
                    message.reply(response);
                }
            );
        }
        
        // Command untuk reminder dengan waktu spesifik
        else if (pesan.startsWith('reminder ')) {
            const fullReminder = message.body.substring(9).trim();
            
            if (fullReminder === '') {
                message.reply('❌ Reminder kosong!\n\n⏰ *Format yang didukung:*\n• reminder 14:30 Meeting\n• reminder 25/12 08:00 Natal');
                return;
            }
            
            let targetTime;
            let reminderText;
            
            // Simple parsing untuk demo (bisa diperluas)
            const timeOnlyRegex = /^(\d{1,2}):(\d{2})\s+(.+)$/;
            const timeOnlyMatch = fullReminder.match(timeOnlyRegex);
            
            if (timeOnlyMatch) {
                const jam = parseInt(timeOnlyMatch[1]);
                const menit = parseInt(timeOnlyMatch[2]);
                reminderText = timeOnlyMatch[3].trim();
                
                if (jam < 0 || jam > 23 || menit < 0 || menit > 59) {
                    message.reply('❌ Format waktu salah! Gunakan HH:MM');
                    return;
                }
                
                const now = moment().tz('Asia/Jakarta');
                targetTime = moment().tz('Asia/Jakarta')
                    .hour(jam)
                    .minute(menit)
                    .second(0)
                    .millisecond(0);
                
                if (targetTime.isBefore(now)) {
                    targetTime.add(1, 'day');
                }
                
                const delayMs = targetTime.diff(now);
                const jamTampil = targetTime.format('HH:mm');
                const tanggalTampil = targetTime.format('DD/MM/YYYY');
                
                message.reply(`⏰ Reminder diset!\n📅 ${tanggalTampil} | ⏰ ${jamTampil}\n📝 "${reminderText}"`);
                
                // Set timeout - BUG FIX: Kirim ke nomorPengirim
                setTimeout(() => {
                    client.sendMessage(nomorPengirim, `🔔 *REMINDER*\n⏰ ${jamTampil} WIB\n📝 ${reminderText}`);
                    console.log(`🔔 Reminder terkirim ke ${nomorPengirim}: ${reminderText}`);
                }, delayMs);
                
            } else {
                message.reply('❌ Format salah! Gunakan: reminder HH:MM [pesan]\nContoh: reminder 14:30 Meeting');
            }
        }
        
        // Test reminder untuk testing
        else if (pesan.startsWith('test reminder ')) {
            const reminder = message.body.substring(14).trim();
            
            if (reminder === '') {
                message.reply('❌ Test reminder kosong! Contoh: test reminder Tes dalam 5 menit');
                return;
            }
            
            message.reply(`⏰ Test reminder diset: "${reminder}"\n🕐 Akan mengingatkan dalam 5 menit`);
            console.log(`⏰ Test reminder diset: ${reminder} oleh ${nomorPengirim}`);
            
            // Set timeout untuk 5 menit - BUG FIX: Kirim ke nomorPengirim
            setTimeout(() => {
                client.sendMessage(nomorPengirim, `🔔 *TEST REMINDER*\n${reminder}\n\n⏰ ${moment().tz('Asia/Jakarta').format('HH:mm')} WIB\n👤 Diset oleh: ${nomorPengirim}`);
                console.log(`🔔 Test reminder terkirim ke ${nomorPengirim}: ${reminder}`);
            }, 300000);
        }
        
        // GROQ AI COMMANDS
        else if (pesan === 'clear ai' || pesan === 'reset ai' || pesan === 'clear groq') {
            clearConversationHistory(nomorPengirim);
            message.reply('🧹 Conversation history dengan Groq telah direset!\n✨ Percakapan baru dimulai dari awal.');
        }
        
        else if (pesan === 'ai status' || pesan === 'groq status') {
            const activeConversations = GROQ_CONFIG.conversationHistory.size;
            const aiStatus = groqClient ? '✅ ACTIVE' : '❌ DISABLED';
            
            // Check daily limit reset
            const today = new Date().toDateString();
            if (today !== GROQ_CONFIG.lastReset) {
                GROQ_CONFIG.requestCount = 0;
                GROQ_CONFIG.lastReset = today;
            }
            
            // Get conversation stats from database
            db.get(
                'SELECT COUNT(*) as total, SUM(tokens_used) as total_tokens FROM ai_conversations WHERE nomor_pengirim = ?',
                [nomorPengirim],
                (err, stats) => {
                    const totalChats = stats ? stats.total : 0;
                    const totalTokens = stats ? stats.total_tokens : 0;
                    
                    message.reply(`🤖 *Groq AI Status - 100% FREE*\n\n🔌 API: ${aiStatus}\n📊 Model: ${GROQ_CONFIG.model}\n💬 Active conversations: ${activeConversations}\n📈 Your chats: ${totalChats}\n🎯 Your tokens: ${totalTokens}\n⚙️ Temperature: ${GROQ_CONFIG.temperature}\n\n📊 *Daily Usage:*\n🚀 Requests today: ${GROQ_CONFIG.requestCount}/${GROQ_CONFIG.dailyLimit}\n💰 Remaining: ${GROQ_CONFIG.dailyLimit - GROQ_CONFIG.requestCount}\n🔄 Reset: Tomorrow\n\n💡 Gunakan "clear ai" untuk reset percakapan`);
                }
            );
        }
        
        else if (pesan.startsWith('setup groq') || pesan === 'config groq') {
            const setupGuide = `🔧 *SETUP GROQ AI - 100% FREE*

📝 **STEP 1: Dapatkan API Key GRATIS**
1. Buka: https://console.groq.com
2. Sign up/Login dengan Google
3. Go to API Keys
4. Click "Create API Key"
5. Copy API key yang dihasilkan (gsk-...)

📝 **STEP 2: Update Config**
Edit app.js:
\`\`\`javascript
apiKey: 'gsk-your-actual-groq-api-key',
\`\`\`

📝 **STEP 3: Install Package**
\`\`\`bash
npm install axios
\`\`\`

📝 **STEP 4: Restart Bot**
\`\`\`bash
pm2 restart whatsapp-bot
\`\`\`

💰 **GROQ FREE TIER - PALING GENEROUS:**
✅ 6,000 requests per day - 100% GRATIS
✅ Super fast inference (fastest in the world!)
✅ No credit card required EVER
✅ Llama 3.1 70B model - very smart
✅ No billing setup headache
✅ Unlimited usage within daily limit

🧪 **Test Commands:**
• groq status - Check Groq status & daily usage
• clear ai - Reset conversation
• [tanya apapun] - Groq akan jawab super cepat!

🌟 **Keunggulan Groq:**
• 100% gratis selamanya (no payment ever!)
• Super cepat - fastest AI inference
• Smart Llama models available free
• Simple setup, no billing nightmare
• 6000 requests/day = very generous
• Perfect untuk personal use & development

🚀 **Models Available FREE:**
• llama-3.1-70b-versatile (terpintar)
• llama-3.1-8b-instant (tercepat)  
• mixtral-8x7b-32768 (balanced)`;
            
            message.reply(setupGuide);
        }
        
        // BANTUAN COMMAND - UPDATED dengan Groq features
        else if (pesan === 'bantuan' || pesan === 'help') {
            const aiStatusEmoji = groqClient ? '🤖✅' : '🤖❌';
            const helpText = `🤖 *Chatbot Universal dengan Groq AI - 100% FREE* ${aiStatusEmoji}

📝 *Perintah Catatan & Reminder:*
• *catat [pesan]* - Simpan catatan
• *catat HH:MM [pesan]* - Catatan dengan waktu
• *reminder HH:MM [pesan]* - Set reminder
• *test reminder [pesan]* - Test reminder 5 menit
• *hari ini* - Lihat catatan hari ini

🤖 *Groq AI Features - 100% GRATIS:*
• *[tanya apapun]* - Groq AI jawab super cepat
• *groq status* - Status & daily usage tracker
• *clear ai* - Reset conversation history
• *setup groq* - Panduan setup API

📋 *Lainnya:*
• *status* - Status bot
• *bantuan* - Menu ini

💡 *Cara Pakai Groq AI:*
• Tanya apapun dalam bahasa natural
• Groq ingat konteks percakapan
• Super fast response - fastest AI in the world!
• Support bahasa Indonesia excellent
• 6000 requests/day = very generous!
• 100% GRATIS SELAMANYA!

🔧 *Setup Status:*
${groqClient ? '✅ Groq AI sudah aktif!' : '❌ Butuh Groq API key (setup groq)'}

🌟 *Contoh Pertanyaan Groq:*
• "Halo, bagaimana cara belajar programming?"
• "Jelaskan tentang AI dan machine learning"
• "Buatkan rencana belajar untuk mahasiswa IT"
• "Tips meningkatkan produktivitas kerja"
• "Analisis tren teknologi 2025"
• "Bantuin coding website sederhana"

✨ *Keunggulan Groq vs Lainnya:*
• 100% GRATIS tanpa hidden cost
• Fastest AI inference di dunia
• 6000 requests/day (sangat generous!)
• No credit card, no billing setup
• Smart Llama 3.1 models
• Simple API, reliable performance

💰 *Cost Comparison:*
• Groq: 100% FREE forever
• ChatGPT: $20/month + usage costs
• Gemini: Complex billing + quotas
• Claude: Limited free tier

🚀 *Daily Usage Status:*
• Requests today: ${GROQ_CONFIG.requestCount}/${GROQ_CONFIG.dailyLimit}
• Remaining: ${GROQ_CONFIG.dailyLimit - GROQ_CONFIG.requestCount}
• Reset: Tomorrow morning`;
            
            message.reply(helpText);
        }
        
        // STATUS COMMAND - UPDATED
        else if (pesan === 'status') {
            const waktu = moment().tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss');
            const aiStatus = groqClient ? '✅ ACTIVE' : '❌ DISABLED';
            const conversationCount = GROQ_CONFIG.conversationHistory.size;
            
            message.reply(`✅ *Chatbot Status*\n⏰ ${waktu} WIB\n🤖 Groq AI: ${aiStatus}\n💬 Active conversations: ${conversationCount}\n👤 Anda: ${nomorPengirim}\n\n💡 Bot siap menerima pertanyaan Groq AI!\n💰 100% GRATIS - ${GROQ_CONFIG.dailyLimit - GROQ_CONFIG.requestCount} requests remaining today!`);
        }
        
        // DEFAULT: GROQ AI RESPONSE
        else {
            // Check apakah pesan butuh AI response
            if (shouldUseAI(message.body, nomorPengirim)) {
                if (!groqClient) {
                    message.reply('🤖 Groq AI belum dikonfigurasi.\n\n💡 Kirim "setup groq" untuk panduan setup, atau "bantuan" untuk melihat perintah lain.\n\n✨ Groq 100% GRATIS dengan 6000 requests/day!');
                    return;
                }
                
                // Show processing indicator
                console.log(`🤖 Processing Groq request: "${message.body}"`);
                
                // Get Groq response
                const aiResult = await getGroqResponse(message.body, nomorPengirim);
                
                if (aiResult.success) {
                    // Send AI response dengan emoji dan branding
                    message.reply(`✨ ${aiResult.response}\n\n🤖 _Powered by Groq AI - 100% FREE_`);
                    console.log(`✅ Groq response sent to ${nomorPengirim} (${aiResult.tokensUsed} tokens, daily: ${aiResult.dailyCount}/${GROQ_CONFIG.dailyLimit})`);
                } else {
                    // Send error message
                    message.reply(`❌ Groq Error: ${aiResult.error}\n\n💡 Coba lagi nanti atau kirim "bantuan" untuk perintah lain.\n\n🔧 Jika terus error, coba "clear ai" untuk reset conversation.`);
                    console.log(`❌ Groq error for ${nomorPengirim}: ${aiResult.error}`);
                }
            } else {
                // Pesan terlalu pendek atau tidak jelas, tidak perlu AI response
                console.log(`❓ Pesan tidak dikenali dari ${nomorPengirim}: ${message.body}`);
            }
        }
        
    } catch (error) {
        console.log('❌ Error dalam message handler:', error);
    }
});

// Handle error events
client.on('auth_failure', msg => {
    console.log('❌ Authentikasi gagal:', msg);
});

client.on('disconnected', (reason) => {
    console.log('📱 Client terputus:', reason);
});

// Jalankan client
console.log('🔄 Menginisialisasi WhatsApp client...');
client.initialize();

// Setup web server untuk monitoring
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    const waktu = moment().tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss');
    const aiStatus = groqClient ? '✅ ACTIVE' : '❌ DISABLED';
    const conversationCount = GROQ_CONFIG.conversationHistory.size;
    
    // Check daily limit reset
    const today = new Date().toDateString();
    if (today !== GROQ_CONFIG.lastReset) {
        GROQ_CONFIG.requestCount = 0;
        GROQ_CONFIG.lastReset = today;
    }
    
    res.send(`
        <h1>🤖✨ Chatbot WhatsApp dengan Groq AI - 100% FREE FOREVER</h1>
        <p>⏰ Waktu: ${waktu} WIB</p>
        <p>📱 Status: Aktif</p>
        <p>🤖 Groq AI: ${aiStatus}</p>
        <p>📊 Model: ${GROQ_CONFIG.model}</p>
        <p>💬 Active Conversations: ${conversationCount}</p>
        
        <h2>💰 Daily Usage Status:</h2>
        <div style="background: #dcfce7; padding: 15px; margin: 10px 0; border-radius: 8px;">
            <p><strong>📊 Today's Usage:</strong></p>
            <ul>
                <li><strong>Requests made:</strong> ${GROQ_CONFIG.requestCount}</li>
                <li><strong>Daily limit:</strong> ${GROQ_CONFIG.dailyLimit}</li>
                <li><strong>Remaining:</strong> ${GROQ_CONFIG.dailyLimit - GROQ_CONFIG.requestCount}</li>
                <li><strong>Reset:</strong> Tomorrow morning</li>
            </ul>
        </div>
        
        <h2>✨ Groq AI Features - 100% FREE:</h2>
        <ul>
            <li><strong>COMPLETELY FREE</strong> - No payment ever required!</li>
            <li><strong>Super Fast</strong> - Fastest AI inference in the world</li>
            <li><strong>Generous Limits</strong> - 6000 requests per day</li>
            <li><strong>Smart Models</strong> - Llama 3.1 70B available free</li>
            <li><strong>No Billing Setup</strong> - Unlike ChatGPT/Gemini!</li>
            <li><strong>Excellent Indonesian</strong> - Natural conversation</li>
        </ul>
        
        <h2>📝 Commands:</h2>
        <ul>
            <li><strong>[tanya apapun]</strong> - Groq AI response super cepat</li>
            <li><strong>groq status</strong> - Check status & daily usage</li>
            <li><strong>clear ai</strong> - Reset conversation history</li>
            <li><strong>setup groq</strong> - Setup guide API key</li>
            <li><strong>catat [pesan]</strong> - Save notes</li>
            <li><strong>reminder HH:MM [pesan]</strong> - Set reminders</li>
            <li><strong>bantuan</strong> - Full help menu</li>
        </ul>
        
        <h2>🌟 Example Groq Conversations:</h2>
        <div style="background: #f0f9ff; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #0ea5e9;">
            <p><strong>User:</strong> "Halo, apa kabar?"</p>
            <p><strong>Groq:</strong> "✨ Halo! Saya baik-baik saja, terima kasih! 😊 Saya Groq Assistant yang super cepat..."</p>
        </div>
        
        <div style="background: #f0fdf4; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #22c55e;">
            <p><strong>User:</strong> "Jelaskan tentang machine learning"</p>
            <p><strong>Groq:</strong> "✨ Machine Learning adalah subset dari AI yang memungkinkan komputer belajar..."</p>
        </div>
        
        <div style="background: #fefce8; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #eab308;">
            <p><strong>User:</strong> "Buatkan code calculator JavaScript"</p>
            <p><strong>Groq:</strong> "✨ Tentu! Berikut calculator JavaScript yang simple dan fungsional..."</p>
        </div>
        
        <h2>⚙️ Technical Specs:</h2>
        <ul>
            <li>Model: ${GROQ_CONFIG.model}</li>
            <li>Max Tokens: ${GROQ_CONFIG.maxTokens}</li>
            <li>Temperature: ${GROQ_CONFIG.temperature}</li>
            <li>Memory: Conversation history per user (last 8 messages)</li>
            <li>API: Groq Platform</li>
            <li>Daily Limit: ${GROQ_CONFIG.dailyLimit} requests</li>
            <li>Language: Indonesian + English optimized</li>
        </ul>
        
        <h2>💰 Cost: 100% FREE FOREVER!</h2>
        <div style="background: #dcfce7; padding: 15px; margin: 10px 0; border-radius: 8px;">
            <p><strong>✅ GROQ FREE TIER:</strong></p>
            <ul>
                <li><strong>6,000 requests per day</strong> - very generous!</li>
                <li><strong>Fastest AI inference</strong> in the world</li>
                <li><strong>No credit card</strong> required ever</li>
                <li><strong>No billing setup</strong> nightmare</li>
                <li><strong>Smart Llama 3.1 models</strong> available</li>
                <li><strong>Perfect for personal</strong> and development use</li>
            </ul>
        </div>
        
        <h2>🆚 Groq vs Competitors:</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
            <tr style="background: #f8fafc;">
                <th style="border: 1px solid #e2e8f0; padding: 10px;">Feature</th>
                <th style="border: 1px solid #e2e8f0; padding: 10px;">Groq</th>
                <th style="border: 1px solid #e2e8f0; padding: 10px;">ChatGPT</th>
                <th style="border: 1px solid #e2e8f0; padding: 10px;">Gemini</th>
            </tr>
            <tr>
                <td style="border: 1px solid #e2e8f0; padding: 10px;">Cost</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: green;">✅ 100% FREE</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: red;">❌ $20/month</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: orange;">⚠️ Complex billing</td>
            </tr>
            <tr>
                <td style="border: 1px solid #e2e8f0; padding: 10px;">Setup</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: green;">✅ Super Easy</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: orange;">⚠️ Credit card needed</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: red;">❌ Billing nightmare</td>
            </tr>
            <tr>
                <td style="border: 1px solid #e2e8f0; padding: 10px;">Speed</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: green;">✅ FASTEST</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: orange;">⚠️ Good</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: orange;">⚠️ Good</td>
            </tr>
            <tr>
                <td style="border: 1px solid #e2e8f0; padding: 10px;">Daily Limit</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: green;">✅ 6000 requests</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: orange;">⚠️ Rate limited</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: red;">❌ Complex quotas</td>
            </tr>
            <tr>
                <td style="border: 1px solid #e2e8f0; padding: 10px;">Indonesian</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: green;">✅ Excellent</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: green;">✅ Excellent</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: green;">✅ Excellent</td>
            </tr>
        </table>
        
        <h2>🚀 Getting Started:</h2>
        <div style="background: #dbeafe; padding: 15px; margin: 10px 0; border-radius: 8px;">
            <p><strong>Switch to Groq in 2 minutes:</strong></p>
            <ol>
                <li>Get free API key from console.groq.com</li>
                <li>Update your config with the key</li>
                <li>Enjoy super fast AI for FREE forever!</li>
            </ol>
            <p><strong>No credit card, no billing, no headaches!</strong></p>
        </div>
    `);
});

app.listen(PORT, () => {
    console.log(`🌐 Web server berjalan di http://localhost:${PORT}`);
    console.log(`🤖 Groq integration: ${groqClient ? 'READY' : 'NEED SETUP'}`);
    console.log(`💰 Daily usage: ${GROQ_CONFIG.requestCount}/${GROQ_CONFIG.dailyLimit} requests`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Menutup chatbot...');
    client.destroy();
    db.close();
    process.exit();
});
