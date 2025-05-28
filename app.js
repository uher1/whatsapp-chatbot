// CHATBOT WHATSAPP DENGAN GROQ AI - SECURE VERSION
require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const moment = require('moment-timezone');
const sqlite3 = require('sqlite3').verbose();
const express = require('express');
const axios = require('axios');
const winston = require('winston');

console.log('🚀 Memulai Chatbot WhatsApp dengan Groq AI (Secure Version)...');

// SETUP LOGGING
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.simple()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.Console()
    ]
});

// KONFIGURASI GROQ AI - SECURE VERSION
const GROQ_CONFIG = {
    enabled: true,
    apiKey: process.env.GROQ_API_KEY || '',
    model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
    baseURL: 'https://api.groq.com/openai/v1',
    maxTokens: 1000,
    temperature: 0.7,
    systemMessage: process.env.SYSTEM_MESSAGE || `Anda adalah SmartThesis VBA Pro Sales Bot - HANYA membahas produk SmartThesis VBA Pro template.

🚨 ATURAN KETAT:
- HANYA bahas SmartThesis VBA Pro shortcuts & features
- TOLAK SEMUA topik lain tanpa exception
- SELALU redirect ke SmartThesis VBA Pro
- TIDAK boleh bahas topik umum, hobi, teknologi, dll
- STRICT product-only conversations

✅ HANYA BOLEH BAHAS:
- SmartThesis VBA Pro shortcuts (Alt+1, Alt+2, Ctrl+Alt+G, dll)
- Troubleshooting SmartThesis template
- Keunggulan SmartThesis vs manual formatting
- Product benefits & time-saving features
- How to use SmartThesis functions

❌ TOLAK TOTAL:
- Hobi, olahraga, film, musik, teknologi umum
- Topik non-SmartThesis apapun
- General conversation
- Personal chat
- Academic topics bukan SmartThesis
- Permintaan bahas topik lain

🔧 RESPONSE PATTERN:
SELALU mulai dengan: "SmartThesis VBA Pro [benefit/feature]..."
JIKA ditanya topik lain: "Saya khusus membantu dengan SmartThesis VBA Pro saja. Mari bahas [SmartThesis feature]..."

CONTOH REJECTION:
User: "Bahas musik"
Bot: "Saya khusus membantu dengan SmartThesis VBA Pro saja. Mari bahas shortcut Alt+1 untuk insert BAB atau Alt+2 untuk sections - jauh lebih produktif!"

SALES FOCUS:
- Every response must promote SmartThesis
- Highlight speed & efficiency benefits
- Show professional formatting advantages
- Emphasize 120+ shortcuts available`,
    
    conversationHistory: new Map(),
    dailyLimit: 6000,
    requestCount: 0,
    lastReset: new Date().toDateString()
};

// Initialize Groq API client dengan validation
let groqClient = null;
if (GROQ_CONFIG.enabled && GROQ_CONFIG.apiKey && GROQ_CONFIG.apiKey.startsWith('gsk_')) {
    groqClient = axios.create({
        baseURL: GROQ_CONFIG.baseURL,
        headers: {
            'Authorization': `Bearer ${GROQ_CONFIG.apiKey}`,
            'Content-Type': 'application/json'
        },
        timeout: 30000
    });
    logger.info('🤖 Groq AI API initialized successfully');
    logger.info('🔐 API Key validated and secured');
} else {
    logger.warn('⚠️ Groq disabled - Invalid or missing API key');
    logger.warn('💡 Set GROQ_API_KEY in .env file');
}

// RATE LIMITING
const rateLimiter = new Map();
function isRateLimited(userId) {
    const now = Date.now();
    const lastRequest = rateLimiter.get(userId) || 0;
    const cooldown = 2000; // 2 seconds between requests
    
    if (now - lastRequest < cooldown) {
        return true;
    }
    
    rateLimiter.set(userId, now);
    return false;
}

// INPUT SANITIZATION
function sanitizeInput(text) {
    if (!text || typeof text !== 'string') return '';
    return text
        .trim()
        .replace(/\s+/g, ' ')
        .substring(0, 2000);
}

// Anti-loop protection
let lastProcessedMessage = '';
let lastProcessedTime = 0;

// Setup database dengan error handling
const db = new sqlite3.Database('catatan.db', (err) => {
    if (err) {
        logger.error('❌ Database connection error:', err);
    } else {
        logger.info('📁 Database connected successfully');
    }
});

// Database error handling
db.on('error', (err) => {
    logger.error('❌ Database error:', err);
});

// Buat tabel jika belum ada
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS catatan (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pesan TEXT NOT NULL,
            waktu DATETIME DEFAULT CURRENT_TIMESTAMP,
            waktu_wib TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS ai_conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nomor_pengirim TEXT NOT NULL,
            user_message TEXT NOT NULL,
            ai_response TEXT NOT NULL,
            model_used TEXT DEFAULT 'llama-3.1-8b-instant',
            tokens_used INTEGER DEFAULT 0,
            waktu DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

logger.info('📁 Database tables ready!');

// MEMORY CLEANUP - Cleanup old conversations periodically
setInterval(() => {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();
    
    for (const [userId, history] of GROQ_CONFIG.conversationHistory) {
        if (history.length === 0 || (now - (history[history.length - 1].timestamp || 0)) > maxAge) {
            GROQ_CONFIG.conversationHistory.delete(userId);
            logger.info(`🧹 Cleaned up conversation for ${userId}`);
        }
    }
    
    // Cleanup rate limiter
    for (const [userId, lastTime] of rateLimiter) {
        if (now - lastTime > 60000) { // 1 minute
            rateLimiter.delete(userId);
        }
    }
}, 60 * 60 * 1000); // Run every hour

// FUNGSI GROQ AI - IMPROVED VERSION
async function getGroqResponse(userMessage, nomorPengirim) {
    try {
        if (!groqClient) {
            return {
                success: false,
                error: 'Groq AI belum dikonfigurasi. Set GROQ_API_KEY terlebih dahulu.'
            };
        }

        // Sanitize input
        const sanitizedMessage = sanitizeInput(userMessage);
        if (!sanitizedMessage) {
            return {
                success: false,
                error: 'Pesan kosong atau tidak valid'
            };
        }

        // Check daily limit reset
        const today = new Date().toDateString();
        if (today !== GROQ_CONFIG.lastReset) {
            GROQ_CONFIG.requestCount = 0;
            GROQ_CONFIG.lastReset = today;
            logger.info('🔄 Daily limit reset');
        }

        // Check daily limit
        if (GROQ_CONFIG.requestCount >= GROQ_CONFIG.dailyLimit) {
            return {
                success: false,
                error: 'Daily limit tercapai (6000 requests). Reset besok pagi.'
            };
        }

        logger.info(`🤖 Sending to Groq: "${sanitizedMessage.substring(0, 50)}..." from ${nomorPengirim}`);

        // Get conversation history untuk context
        let chatHistory = GROQ_CONFIG.conversationHistory.get(nomorPengirim) || [];
        
        // Limit history to last 8 messages untuk optimize performance
        if (chatHistory.length > 8) {
            chatHistory = chatHistory.slice(-8);
        }

        // Build messages array
        const messages = [
            { role: 'system', content: GROQ_CONFIG.systemMessage },
            ...chatHistory.map(h => ({ role: h.role, content: h.content })),
            { role: 'user', content: sanitizedMessage }
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

        // Update conversation history dengan timestamp
        chatHistory.push(
            { role: 'user', content: sanitizedMessage, timestamp: Date.now() },
            { role: 'assistant', content: responseText, timestamp: Date.now() }
        );
        GROQ_CONFIG.conversationHistory.set(nomorPengirim, chatHistory);

        // Increment request count
        GROQ_CONFIG.requestCount++;

        // Save ke database dengan error handling
        db.run(
            'INSERT INTO ai_conversations (nomor_pengirim, user_message, ai_response, model_used, tokens_used) VALUES (?, ?, ?, ?, ?)',
            [nomorPengirim, sanitizedMessage, responseText, GROQ_CONFIG.model, tokensUsed],
            (err) => {
                if (err) {
                    logger.error('❌ Database insert error:', err);
                }
            }
        );

        logger.info(`✅ Groq response: "${responseText.substring(0, 100)}..."`);
        logger.info(`💰 Tokens used: ${tokensUsed} | Daily count: ${GROQ_CONFIG.requestCount}/${GROQ_CONFIG.dailyLimit}`);

        return {
            success: true,
            response: responseText,
            tokensUsed: tokensUsed,
            model: GROQ_CONFIG.model,
            dailyCount: GROQ_CONFIG.requestCount
        };

    } catch (error) {
        logger.error('❌ Groq error:', error.message);
        
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
    logger.info(`🧹 Conversation history cleared for ${nomorPengirim}`);
}

// FUNGSI UNTUK CHECK APAKAH PESAN BUTUH AI
function shouldUseAI(message, nomorPengirim) {
    const pesan = message.toLowerCase().trim();
    
    // SUPER STRICT Anti-loop protection
    const botSignatures = [
        '🤖 powered by groq ai',
        'powered by groq ai',
        'groq ai - secure',
        '✨ selamat datang',
        '✨ saya senang',
        'selamat datang! saya senang',
        'saya senang membantu anda',
        'vba advanced development',
        'smartthesis vba pro',
        'word api',
        'office automation',
        'apakah anda memiliki pertanyaan',
        'silakan bertanya',
        'saya akan menyediakan',
        'maaf, saya khusus membantu'
    ];
    
    // Skip bot's own messages - VERY STRICT
    for (const signature of botSignatures) {
        if (pesan.includes(signature)) {
            logger.info(`🚫 Skip bot's own message: ${signature}`);
            return false;
        }
    }
    
    // Additional protection - Skip long messages (likely bot responses)
    if (pesan.length > 200) {
        logger.info(`🚫 Skip long message (${pesan.length} chars): ${pesan.substring(0, 50)}...`);
        return false;
    }
    
    // Skip messages with multiple emojis (bot pattern)
    const emojiCount = (pesan.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) || []).length;
    if (emojiCount > 3) {
        logger.info(`🚫 Skip emoji-heavy message (${emojiCount} emojis): ${pesan.substring(0, 50)}...`);
        return false;
    }
    
    // Skip error messages
    if (pesan.includes('❌ groq error') || pesan.includes('daily limit tercapai')) {
        logger.info(`🚫 Skip error message: ${pesan.substring(0, 50)}...`);
        return false;
    }
    
    // Skip commands
    const existingCommands = [
        'catat ', 'reminder ', 'ingatkan ', 'test reminder ',
        'hari ini', 'minggu ini', 'bantuan', 'help', 'status',
        'hapus hari ini', 'siapa', 'setup', 'config', 
        'ai status', 'clear ai', 'reset ai', 'groq status',
        'setup groq', 'config groq', 'catatan hari ini'
    ];
    
    for (const cmd of existingCommands) {
        if (pesan.startsWith(cmd) || pesan === cmd.trim()) {
            logger.info(`🚫 Skip command: ${pesan}`);
            return false;
        }
    }
    
    // Skip very short or empty messages
    if (pesan.length === 0 || pesan.length < 2) {
        logger.info(`🚫 Skip empty/short message`);
        return false;
    }
    
    // Skip emoji-only messages
    if (!/[a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF]/.test(pesan)) {
        logger.info(`🚫 Skip special chars only: ${pesan}`);
        return false;
    }
    
    // Skip common patterns
    const skipPatterns = ['..', '???', '!!!', 'hm', 'hmm', 'ok', 'oke', 'ya', 'iya'];
    if (skipPatterns.includes(pesan)) {
        logger.info(`🚫 Skip pattern: ${pesan}`);
        return false;
    }
    
    logger.info(`✅ Groq akan proses: "${pesan}"`);
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
    logger.info('📱 Scan QR code berikut dengan WhatsApp:');
    console.log('');
    qrcode.generate(qr, { small: true });
    console.log('');
    logger.info('⬆️ Scan QR code di atas dengan WhatsApp di HP Anda');
});

// Event ketika client siap
client.on('ready', () => {
    logger.info('✅ Chatbot dengan Groq AI siap digunakan!');
    logger.info('🤖 Groq integration:', groqClient ? 'ACTIVE' : 'DISABLED');
    logger.info('💰 6000 requests/day limit');
    logger.info('💡 Kirim pesan apapun untuk berinteraksi dengan Groq AI');
});

// Event ketika loading
client.on('loading_screen', (percent, message) => {
    logger.info(`⏳ Loading: ${percent}% - ${message}`);
});

// Event ketika authenticated
client.on('authenticated', () => {
    logger.info('🔐 Authenticated berhasil!');
});

// MAIN MESSAGE HANDLER - IMPROVED
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
            logger.info('🔇 Skip: Duplikasi pesan dalam 5 detik');
            return;
        }
        
        lastProcessedMessage = messageKey;
        lastProcessedTime = currentTime;
        
        // Rate limiting check
        if (isRateLimited(message.from)) {
            logger.info(`⏰ Rate limited: ${message.from}`);
            return;
        }
        
        logger.info(`📨 Pesan diterima: "${message.body}" dari ${message.from}`);
        
        const pesan = message.body.toLowerCase().trim();
        const nomorPengirim = message.from;
        
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
                        logger.error('❌ Database error:', err);
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
                        logger.error('❌ Database error:', err);
                        message.reply('❌ Gagal mengambil catatan');
                        return;
                    }
                    
                    if (rows.length === 0) {
                        message.reply('📝 Belum ada catatan hari ini');
                        return;
                    }
                    
                    let response = `📋 Catatan Hari Ini (${tanggalWIB})\n\n`;
                    rows.forEach((row, index) => {
                        const jam = moment(row.waktu_wib).format('HH:mm');
                        response += `${index + 1}. [${jam}] ${row.pesan}\n`;
                    });
                    
                    message.reply(response);
                }
            );
        }
        
        // IMPROVED REMINDER dengan error handling
        else if (pesan.startsWith('reminder ')) {
            const fullReminder = message.body.substring(9).trim();
            
            if (fullReminder === '') {
                message.reply('❌ Reminder kosong!\n\n⏰ *Format yang didukung:*\n• reminder 14:30 Meeting\n• reminder 25/12 08:00 Natal');
                return;
            }
            
            let targetTime;
            let reminderText;
            
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
                
                // IMPROVED TIMEOUT dengan error handling
                setTimeout(() => {
                    if (client.info && client.info.wid) {
                        client.sendMessage(nomorPengirim, `🔔 REMINDER\n⏰ ${jamTampil} WIB\n📝 ${reminderText}`)
                            .then(() => logger.info(`🔔 Reminder terkirim ke ${nomorPengirim}: ${reminderText}`))
                            .catch(err => logger.error(`❌ Gagal kirim reminder: ${err.message}`));
                    }
                }, delayMs);
                
            } else {
                message.reply('❌ Format salah! Gunakan: reminder HH:MM [pesan]\nContoh: reminder 14:30 Meeting');
            }
        }
        
        // Test reminder untuk testing - IMPROVED
        else if (pesan.startsWith('test reminder ')) {
            const reminder = message.body.substring(14).trim();
            
            if (reminder === '') {
                message.reply('❌ Test reminder kosong! Contoh: test reminder Tes dalam 5 menit');
                return;
            }
            
            message.reply(`⏰ Test reminder diset: "${reminder}"\n🕐 Akan mengingatkan dalam 5 menit`);
            logger.info(`⏰ Test reminder diset: ${reminder} oleh ${nomorPengirim}`);
            
            // IMPROVED TIMEOUT dengan error handling
            setTimeout(() => {
                if (client.info && client.info.wid) {
                    client.sendMessage(nomorPengirim, `🔔 TEST REMINDER\n${reminder}\n\n⏰ ${moment().tz('Asia/Jakarta').format('HH:mm')} WIB`)
                        .then(() => logger.info(`🔔 Test reminder terkirim ke ${nomorPengirim}: ${reminder}`))
                        .catch(err => logger.error(`❌ Gagal kirim test reminder: ${err.message}`));
                }
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
                    if (err) {
                        logger.error('❌ Database error:', err);
                        message.reply('❌ Error mengambil statistik');
                        return;
                    }
                    
                    const totalChats = stats ? stats.total : 0;
                    const totalTokens = stats ? stats.total_tokens : 0;
                    
                    message.reply(`🤖 *Groq AI Status - FREE TIER*\n\n🔌 API: ${aiStatus}\n📊 Model: ${GROQ_CONFIG.model}\n💬 Active conversations: ${activeConversations}\n📈 Your chats: ${totalChats}\n🎯 Your tokens: ${totalTokens}\n⚙️ Temperature: ${GROQ_CONFIG.temperature}\n\n📊 *Daily Usage:*\n🚀 Requests today: ${GROQ_CONFIG.requestCount}/${GROQ_CONFIG.dailyLimit}\n💰 Remaining: ${GROQ_CONFIG.dailyLimit - GROQ_CONFIG.requestCount}\n🔄 Reset: Tomorrow\n\n💡 Gunakan "clear ai" untuk reset percakapan`);
                }
            );
        }
        
        else if (pesan.startsWith('setup groq') || pesan === 'config groq') {
            const setupGuide = `🔧 *SETUP GROQ AI - FREE TIER*

📝 **STEP 1: Dapatkan API Key GRATIS**
1. Buka: https://console.groq.com
2. Sign up/Login dengan Google
3. Go to API Keys
4. Click "Create API Key"
5. Copy API key yang dihasilkan (gsk-...)

📝 **STEP 2: Setup Environment**
1. Buat file .env di root folder:
\`\`\`
GROQ_API_KEY=gsk_your_api_key_here
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
PORT=3000
\`\`\`

📝 **STEP 3: Install Dependencies**
\`\`\`bash
npm install dotenv winston
\`\`\`

📝 **STEP 4: Restart Bot**
\`\`\`bash
pm2 restart whatsapp-bot
\`\`\`

💰 **GROQ FREE TIER:**
✅ 6,000 requests per day - 100% GRATIS
✅ Super fast inference
✅ No credit card required
✅ Llama 3.1 70B model
✅ No billing setup
✅ Secure API key handling

🧪 **Test Commands:**
• groq status - Check status & usage
• clear ai - Reset conversation
• [tanya apapun] - Groq response

🔐 **Security Features:**
• API key dari environment variable
• Input sanitization
• Rate limiting
• Error logging
• Memory management`;
            
            message.reply(setupGuide);
        }
        
        // BANTUAN COMMAND - UPDATED
        else if (pesan === 'bantuan' || pesan === 'help') {
            const aiStatusEmoji = groqClient ? '🤖✅' : '🤖❌';
            const helpText = `🤖 *Chatbot Universal dengan Groq AI - SECURE VERSION* ${aiStatusEmoji}

📝 *Perintah Catatan & Reminder:*
• *catat [pesan]* - Simpan catatan
• *catat HH:MM [pesan]* - Catatan dengan waktu
• *reminder HH:MM [pesan]* - Set reminder
• *test reminder [pesan]* - Test reminder 5 menit
• *hari ini* - Lihat catatan hari ini

🤖 *Groq AI Features - SECURE:*
• *[tanya apapun]* - Groq AI response
• *groq status* - Status & usage tracker
• *clear ai* - Reset conversation
• *setup groq* - Setup guide

📋 *Lainnya:*
• *status* - Status bot
• *bantuan* - Menu ini

🔐 *Security Features:*
✅ API key dari environment variable
✅ Rate limiting (2s cooldown)
✅ Input sanitization
✅ Memory cleanup
✅ Error logging
✅ Anti-loop protection

🔧 *Setup Status:*
${groqClient ? '✅ Groq AI aktif dan secure!' : '❌ Butuh setup environment (.env file)'}

💰 *Daily Usage:*
• Requests today: ${GROQ_CONFIG.requestCount}/${GROQ_CONFIG.dailyLimit}
• Remaining: ${GROQ_CONFIG.dailyLimit - GROQ_CONFIG.requestCount}`;
            
            message.reply(helpText);
        }
        
        // STATUS COMMAND - UPDATED
        else if (pesan === 'status') {
            const waktu = moment().tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss');
            const aiStatus = groqClient ? '✅ ACTIVE' : '❌ DISABLED';
            const conversationCount = GROQ_CONFIG.conversationHistory.size;
            
            message.reply(`✅ *Chatbot Status - SECURE VERSION*\n⏰ ${waktu} WIB\n🤖 Groq AI: ${aiStatus}\n💬 Active conversations: ${conversationCount}\n👤 Anda: ${nomorPengirim}\n🔐 Security: ENHANCED\n\n💡 Bot siap dengan keamanan tinggi!\n💰 ${GROQ_CONFIG.dailyLimit - GROQ_CONFIG.requestCount} requests remaining today!`);
        }
        
        // DEFAULT: GROQ AI RESPONSE - IMPROVED
        else {
            // Check apakah pesan butuh AI response
            if (shouldUseAI(message.body, nomorPengirim)) {
                if (!groqClient) {
                    message.reply('🤖 Groq AI belum dikonfigurasi.\n\n💡 Kirim "setup groq" untuk panduan setup, atau "bantuan" untuk melihat perintah lain.\n\n🔐 Setup secure dengan environment variables!');
                    return;
                }
                
                // Show processing indicator
                logger.info(`🤖 Processing Groq request: "${message.body.substring(0, 50)}..."`);
                
                // Get Groq response
                const aiResult = await getGroqResponse(message.body, nomorPengirim);
                
                if (aiResult.success) {
                    // Send AI response dengan branding
                    message.reply(`✨ ${aiResult.response}\n\n🤖 *Powered by Groq AI - Secure & Fast*`);
                    logger.info(`✅ Groq response sent to ${nomorPengirim} (${aiResult.tokensUsed} tokens, daily: ${aiResult.dailyCount}/${GROQ_CONFIG.dailyLimit})`);
                } else {
                    // Send error message
                    message.reply(`❌ Groq Error: ${aiResult.error}\n\n💡 Coba lagi nanti atau kirim "bantuan" untuk perintah lain.\n\n🔧 Jika terus error, coba "clear ai" untuk reset conversation.`);
                    logger.error(`❌ Groq error for ${nomorPengirim}: ${aiResult.error}`);
                }
            } else {
                // Pesan tidak memerlukan response
                logger.info(`❓ Pesan diabaikan dari ${nomorPengirim}: ${message.body.substring(0, 50)}...`);
            }
        }
        
    } catch (error) {
        logger.error('❌ Error dalam message handler:', error);
        // Jangan reply error ke user untuk menghindari spam
    }
});

// Handle error events
client.on('auth_failure', msg => {
    logger.error('❌ Authentikasi gagal:', msg);
});

client.on('disconnected', (reason) => {
    logger.warn('📱 Client terputus:', reason);
});

// Jalankan client
logger.info('🔄 Menginisialisasi WhatsApp client...');
client.initialize();

// Setup web server untuk monitoring - IMPROVED
const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        groq: groqClient ? 'connected' : 'disconnected',
        whatsapp: client.info ? 'connected' : 'disconnected',
        version: 'secure-v2.0'
    });
});

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
        <h1>🤖✨ Chatbot WhatsApp dengan Groq AI - SECURE VERSION</h1>
        
        <h2>📊 Status Dashboard</h2>
        <p><strong>⏰ Waktu:</strong> ${waktu} WIB</p>
        <p><strong>📱 WhatsApp:</strong> ${client.info ? '✅ Connected' : '❌ Disconnected'}</p>
        <p><strong>🤖 Groq AI:</strong> ${aiStatus}</p>
        <p><strong>📊 Model:</strong> ${GROQ_CONFIG.model}</p>
        <p><strong>💬 Active Conversations:</strong> ${conversationCount}</p>
        
        <h2>🔐 Security Features</h2>
        <ul>
            <li>✅ API key secured in environment variables</li>
            <li>✅ Rate limiting (2s cooldown per user)</li>
            <li>✅ Input sanitization (max 2000 chars)</li>
            <li>✅ Memory cleanup (24h auto-cleanup)</li>
            <li>✅ Comprehensive error logging</li>
            <li>✅ Anti-loop protection</li>
            <li>✅ Database error handling</li>
        </ul>
        
        <h2>📊 Daily Usage Status</h2>
        <ul>
            <li><strong>Requests made:</strong> ${GROQ_CONFIG.requestCount}</li>
            <li><strong>Daily limit:</strong> ${GROQ_CONFIG.dailyLimit}</li>
            <li><strong>Remaining:</strong> ${GROQ_CONFIG.dailyLimit - GROQ_CONFIG.requestCount}</li>
            <li><strong>Reset:</strong> Tomorrow morning</li>
        </ul>
        
        <h2>✨ Groq AI Features - SECURE</h2>
        <ul>
            <li>🔐 Secure API key handling</li>
            <li>⚡ Super fast inference</li>
            <li>🎯 Smart conversation context</li>
            <li>🧹 Automatic memory management</li>
            <li>📊 Usage tracking & limits</li>
            <li>🛡️ Input validation & sanitization</li>
        </ul>
        
        <h2>🚀 Version Info</h2>
        <p><strong>Version:</strong> Secure v2.0</p>
        <p><strong>Security Level:</strong> Enhanced</p>
        <p><strong>API Protection:</strong> Environment-based</p>
        <p><strong>Rate Limiting:</strong> Active</p>
        
        <footer>
            <p>💰 <strong>100% FREE</strong> - Powered by Groq AI</p>
            <p>🔐 Secure, Fast, and Reliable</p>
        </footer>
    `);
});

app.listen(PORT, () => {
    logger.info(`🌐 Web server berjalan di http://localhost:${PORT}`);
    logger.info(`🤖 Groq integration: ${groqClient ? 'READY' : 'NEED SETUP'}`);
    logger.info(`🔐 Security: ENHANCED`);
    logger.info(`💰 Daily usage: ${GROQ_CONFIG.requestCount}/${GROQ_CONFIG.dailyLimit} requests`);
});

// Graceful shutdown - IMPROVED
process.on('SIGINT', async () => {
    logger.info('\n🛑 Menutup chatbot...');
    try {
        if (client) {
            await client.destroy();
            logger.info('📱 WhatsApp client closed');
        }
        
        if (db) {
            db.close((err) => {
                if (err) {
                    logger.error('❌ Error closing database:', err);
                } else {
                    logger.info('📁 Database closed');
                }
                process.exit(0);
            });
        } else {
            process.exit(0);
        }
    } catch (error) {
        logger.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});
