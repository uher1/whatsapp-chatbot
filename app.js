// CHATBOT WHATSAPP DENGAN GOOGLE GEMINI INTEGRATION - FREE VERSION
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const moment = require('moment-timezone');
const sqlite3 = require('sqlite3').verbose();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

console.log('🚀 Memulai Chatbot WhatsApp dengan Google Gemini...');

// KONFIGURASI GOOGLE GEMINI
const GEMINI_CONFIG = {
    enabled: true,
    apiKey: 'AIzaSyDvZIeD2M-rLc41I1ja_w0FLSANhbJC_2s', // Ganti dengan API key Google AI Studio
    model: 'gemini-2.5-pro', // Model gratis terbaru
    maxOutputTokens: 1000,
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    systemInstruction: `Anda adalah asisten WhatsApp yang cerdas dan membantu bernama "Gemini Assistant". 

Kepribadian Anda:
- Ramah, helpful, dan responsif
- Berbicara dalam bahasa Indonesia yang natural
- Gunakan emoji yang sesuai untuk membuat percakapan lebih menarik
- Jawab dengan singkat namun informatif (maksimal 3-4 paragraf)
- Selalu berikan informasi yang akurat dan terkini

Anda bisa membantu dengan:
- Menjawab pertanyaan umum tentang berbagai topik
- Memberikan saran dan tips praktis
- Membantu dengan tugas sehari-hari
- Menjelaskan konsep complex dengan cara yang mudah dipahami
- Membantu brainstorming ide
- Memberikan rekomendasi
- Analisis dan pemecahan masalah

Anda juga terintegrasi dengan sistem reminder dan catatan harian, jadi bisa membantu user mengorganisir hidup mereka.

PENTING: Selalu jaga konteks percakapan dan berikan respon yang relevan dengan pertanyaan user.`,
    conversationHistory: new Map() // Store conversation per user
};

// Initialize Google Gemini
let genAI = null;
let model = null;

if (GEMINI_CONFIG.enabled && GEMINI_CONFIG.apiKey !== 'your-gemini-api-key-here') {
    try {
        genAI = new GoogleGenerativeAI(GEMINI_CONFIG.apiKey);
        model = genAI.getGenerativeModel({ 
            model: GEMINI_CONFIG.model,
            systemInstruction: GEMINI_CONFIG.systemInstruction,
            generationConfig: {
                maxOutputTokens: GEMINI_CONFIG.maxOutputTokens,
                temperature: GEMINI_CONFIG.temperature,
                topP: GEMINI_CONFIG.topP,
                topK: GEMINI_CONFIG.topK,
            }
        });
        console.log('🤖 Google Gemini API initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing Gemini:', error.message);
        model = null;
    }
} else {
    console.log('⚠️ Gemini disabled - API key belum diset');
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
        model_used TEXT DEFAULT 'gemini-1.5-flash',
        tokens_used INTEGER DEFAULT 0,
        waktu DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

console.log('📁 Database siap!');

// FUNGSI GOOGLE GEMINI AI
async function getGeminiResponse(userMessage, nomorPengirim) {
    try {
        if (!model) {
            return {
                success: false,
                error: 'Google Gemini belum dikonfigurasi. Set API key terlebih dahulu.'
            };
        }

        console.log(`🤖 Sending to Gemini: "${userMessage}" from ${nomorPengirim}`);

        // Get conversation history untuk context
        let chatHistory = GEMINI_CONFIG.conversationHistory.get(nomorPengirim);
        
        if (!chatHistory) {
            // Start new chat session
            chatHistory = model.startChat({
                history: [],
                generationConfig: {
                    maxOutputTokens: GEMINI_CONFIG.maxOutputTokens,
                    temperature: GEMINI_CONFIG.temperature,
                    topP: GEMINI_CONFIG.topP,
                    topK: GEMINI_CONFIG.topK,
                }
            });
            GEMINI_CONFIG.conversationHistory.set(nomorPengirim, chatHistory);
        }

        // Send message to Gemini
        const result = await chatHistory.sendMessage(userMessage);
        const response = result.response;
        const responseText = response.text();

        // Estimate token usage (Gemini doesn't provide exact count in free tier)
        const estimatedTokens = Math.ceil((userMessage.length + responseText.length) / 3);

        // Save ke database
        db.run(
            'INSERT INTO ai_conversations (nomor_pengirim, user_message, ai_response, tokens_used) VALUES (?, ?, ?, ?)',
            [nomorPengirim, userMessage, responseText, estimatedTokens]
        );

        console.log(`✅ Gemini response: "${responseText.substring(0, 100)}..."`);
        console.log(`💰 Estimated tokens: ${estimatedTokens}`);

        return {
            success: true,
            response: responseText,
            tokensUsed: estimatedTokens,
            model: GEMINI_CONFIG.model
        };

    } catch (error) {
        console.error('❌ Gemini error:', error.message);
        
        let errorMessage = 'Gemini sedang bermasalah, coba lagi nanti';
        
        if (error.message.includes('API key')) {
            errorMessage = 'API key Gemini tidak valid';
        } else if (error.message.includes('quota') || error.message.includes('limit')) {
            errorMessage = 'Quota Gemini terlampaui, coba lagi nanti';
        } else if (error.message.includes('blocked') || error.message.includes('safety')) {
            errorMessage = 'Pesan diblokir oleh safety filter Gemini. Coba pertanyaan yang berbeda';
        } else if (error.message.includes('rate limit')) {
            errorMessage = 'Rate limit exceeded. Coba lagi dalam beberapa detik';
        }
        
        return {
            success: false,
            error: errorMessage
        };
    }
}

// FUNGSI UNTUK CLEAR CONVERSATION HISTORY
function clearConversationHistory(nomorPengirim) {
    GEMINI_CONFIG.conversationHistory.delete(nomorPengirim);
    console.log(`🧹 Conversation history cleared for ${nomorPengirim}`);
}

// FUNGSI UNTUK CHECK APAKAH PESAN BUTUH AI
function shouldUseAI(message, nomorPengirim) {
    const pesan = message.toLowerCase().trim();
    
    // Skip jika pesan adalah command existing
    const existingCommands = [
        'catat ', 'reminder ', 'ingatkan ', 'test reminder ',
        'hari ini', 'minggu ini', 'bantuan', 'help', 'status',
        'hapus hari ini', 'siapa', 'setup', 'config', 'gemini',
        'ai status', 'clear ai', 'reset ai'
    ];
    
    for (const cmd of existingCommands) {
        if (pesan.startsWith(cmd) || pesan === cmd.trim()) {
            return false;
        }
    }
    
    // Skip jika pesan terlalu pendek (likely command typo)
    if (pesan.length < 3) {
        return false;
    }
    
    // Skip jika pesan hanya emoji atau karakter khusus
    if (!/[a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF]/.test(pesan)) {
        return false;
    }
    
    // Skip one word responses that might be greetings without context
    const words = pesan.split(' ').filter(word => word.length > 2);
    if (words.length === 1 && ['hai', 'halo', 'hello', 'hi', 'ok', 'oke', 'ya', 'tidak', 'iya'].includes(words[0])) {
        return false;
    }
    
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
    console.log('✅ Chatbot dengan Google Gemini siap digunakan!');
    console.log('🤖 Gemini integration:', model ? 'ACTIVE' : 'DISABLED');
    console.log('💡 Kirim pesan apapun untuk berinteraksi dengan AI');
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
        
        // GOOGLE GEMINI AI COMMANDS
        else if (pesan === 'clear ai' || pesan === 'reset ai' || pesan === 'clear gemini') {
            clearConversationHistory(nomorPengirim);
            message.reply('🧹 Conversation history dengan Gemini telah direset!\n✨ Percakapan baru dimulai dari awal.');
        }
        
        else if (pesan === 'ai status' || pesan === 'gemini status') {
            const activeConversations = GEMINI_CONFIG.conversationHistory.size;
            const aiStatus = model ? '✅ ACTIVE' : '❌ DISABLED';
            
            // Get conversation stats from database
            db.get(
                'SELECT COUNT(*) as total, SUM(tokens_used) as total_tokens FROM ai_conversations WHERE nomor_pengirim = ?',
                [nomorPengirim],
                (err, stats) => {
                    const totalChats = stats ? stats.total : 0;
                    const totalTokens = stats ? stats.total_tokens : 0;
                    
                    message.reply(`🤖 *Google Gemini Status*\n\n🔌 API: ${aiStatus}\n📊 Model: ${GEMINI_CONFIG.model}\n💬 Active conversations: ${activeConversations}\n📈 Your chats: ${totalChats}\n🎯 Your tokens: ${totalTokens}\n⚙️ Temperature: ${GEMINI_CONFIG.temperature}\n\n💡 Gunakan "clear ai" untuk reset percakapan`);
                }
            );
        }
        
        else if (pesan.startsWith('setup gemini') || pesan === 'config gemini') {
            const setupGuide = `🔧 *SETUP GOOGLE GEMINI API*

📝 **STEP 1: Dapatkan API Key**
1. Buka: https://aistudio.google.com/app/apikey
2. Login dengan akun Google
3. Click "Create API Key"
4. Choose "Create API key in new project"
5. Copy API key yang dihasilkan

📝 **STEP 2: Update Config**
Edit app.js baris ~20:
\`\`\`javascript
apiKey: 'your-actual-gemini-api-key-here',
\`\`\`

📝 **STEP 3: Install Package**
\`\`\`bash
npm install @google/generative-ai
\`\`\`

📝 **STEP 4: Restart Bot**
\`\`\`bash
pm2 restart whatsapp-bot
\`\`\`

💰 **FREE TIER GEMINI:**
✅ 1 million tokens/month GRATIS
✅ 15 requests/minute
✅ No credit card required
✅ Gemini 1.5 Flash model
✅ Conversation memory

🧪 **Test Commands:**
• gemini status - Check Gemini status
• clear ai - Reset conversation
• [tanya apapun] - AI akan jawab otomatis!

🌟 **Keunggulan Gemini:**
• Lebih natural dalam bahasa Indonesia
• Context window sangat besar
• Multimodal support (text, image)
• Gratis dengan limit generous`;
            
            message.reply(setupGuide);
        }
        
        // BANTUAN COMMAND - UPDATED dengan Gemini features
        else if (pesan === 'bantuan' || pesan === 'help') {
            const aiStatusEmoji = model ? '🤖✅' : '🤖❌';
            const helpText = `🤖 *Chatbot Universal dengan Google Gemini* ${aiStatusEmoji}

📝 *Perintah Catatan & Reminder:*
• *catat [pesan]* - Simpan catatan
• *catat HH:MM [pesan]* - Catatan dengan waktu
• *reminder HH:MM [pesan]* - Set reminder
• *test reminder [pesan]* - Test reminder 5 menit
• *hari ini* - Lihat catatan hari ini

🤖 *Google Gemini AI Features:*
• *[tanya apapun]* - AI Gemini akan menjawab otomatis
• *gemini status* - Status Gemini integration  
• *clear ai* - Reset conversation history
• *setup gemini* - Panduan setup API

📋 *Lainnya:*
• *status* - Status bot
• *bantuan* - Menu ini

💡 *Cara Pakai Gemini AI:*
• Tanya apapun dalam bahasa natural
• Gemini ingat konteks percakapan panjang
• Support bahasa Indonesia excellent
• Bisa diskusi topic kompleks
• Gratis 1 million tokens/month!

🔧 *Setup Status:*
${model ? '✅ Google Gemini sudah aktif!' : '❌ Butuh Gemini API key (setup gemini)'}

🌟 *Contoh Pertanyaan Gemini:*
• "Jelaskan tentang AI dan dampaknya terhadap pekerjaan"
• "Buatkan rencana diet sehat untuk turun berat badan"
• "Bagaimana cara memulai bisnis online dari nol?"
• "Analisis keuntungan investasi saham vs emas"
• "Tips meningkatkan produktivitas kerja remote"

✨ *Keunggulan Gemini vs ChatGPT:*
• 100% GRATIS dengan limit sangat generous
• Lebih natural dalam bahasa Indonesia  
• Context window lebih besar
• Lebih up-to-date dengan informasi terkini`;
            
            message.reply(helpText);
        }
        
        // STATUS COMMAND - UPDATED
        else if (pesan === 'status') {
            const waktu = moment().tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss');
            const aiStatus = model ? '✅ ACTIVE' : '❌ DISABLED';
            const conversationCount = GEMINI_CONFIG.conversationHistory.size;
            
            message.reply(`✅ *Chatbot Status*\n⏰ ${waktu} WIB\n🤖 Google Gemini: ${aiStatus}\n💬 Active conversations: ${conversationCount}\n👤 Anda: ${nomorPengirim}\n\n💡 Bot siap menerima pertanyaan AI!\n✨ Gratis 1 million tokens/month!`);
        }
        
        // DEFAULT: GOOGLE GEMINI AI RESPONSE
        else {
            // Check apakah pesan butuh AI response
            if (shouldUseAI(message.body, nomorPengirim)) {
                if (!model) {
                    message.reply('🤖 Google Gemini belum dikonfigurasi.\n\n💡 Kirim "setup gemini" untuk panduan setup, atau "bantuan" untuk melihat perintah lain.\n\n✨ Gemini 100% GRATIS dengan 1 million tokens/month!');
                    return;
                }
                
                // Show processing indicator
                console.log(`🤖 Processing Gemini request: "${message.body}"`);
                
                // Get Gemini response
                const aiResult = await getGeminiResponse(message.body, nomorPengirim);
                
                if (aiResult.success) {
                    // Send AI response dengan emoji dan branding
                    message.reply(`✨ ${aiResult.response}\n\n🤖 _Powered by Google Gemini_`);
                    console.log(`✅ Gemini response sent to ${nomorPengirim} (${aiResult.tokensUsed} estimated tokens)`);
                } else {
                    // Send error message
                    message.reply(`❌ Gemini Error: ${aiResult.error}\n\n💡 Coba lagi nanti atau kirim "bantuan" untuk perintah lain.\n\n🔧 Jika terus error, coba "clear ai" untuk reset conversation.`);
                    console.log(`❌ Gemini error for ${nomorPengirim}: ${aiResult.error}`);
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
    const aiStatus = model ? '✅ ACTIVE' : '❌ DISABLED';
    const conversationCount = GEMINI_CONFIG.conversationHistory.size;
    
    res.send(`
        <h1>🤖✨ Chatbot WhatsApp dengan Google Gemini Integration</h1>
        <p>⏰ Waktu: ${waktu} WIB</p>
        <p>📱 Status: Aktif</p>
        <p>🤖 Google Gemini: ${aiStatus}</p>
        <p>💬 Active Conversations: ${conversationCount}</p>
        
        <h2>✨ Google Gemini Features:</h2>
        <ul>
            <li><strong>100% FREE</strong> - 1 million tokens/month gratis</li>
            <li><strong>Natural Language Processing</strong> - Tanya apapun dalam bahasa natural</li>
            <li><strong>Conversation Memory</strong> - AI ingat konteks percakapan panjang</li>
            <li><strong>Bahasa Indonesia Excellence</strong> - Lebih natural dibanding ChatGPT</li>
            <li><strong>Large Context Window</strong> - Bisa diskusi topik kompleks</li>
            <li><strong>Up-to-date Information</strong> - Informasi lebih terkini</li>
        </ul>
        
        <h2>📝 Commands:</h2>
        <ul>
            <li><strong>[tanya apapun]</strong> - Gemini AI response otomatis</li>
            <li><strong>gemini status</strong> - Check Gemini status & usage</li>
            <li><strong>clear ai</strong> - Reset conversation history</li>
            <li><strong>setup gemini</strong> - Setup guide API key</li>
            <li><strong>catat [pesan]</strong> - Save notes</li>
            <li><strong>reminder HH:MM [pesan]</strong> - Set reminders</li>
            <li><strong>bantuan</strong> - Full help menu</li>
        </ul>
        
        <h2>🌟 Example Gemini Conversations:</h2>
        <div style="background: #f0f9ff; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #0ea5e9;">
            <p><strong>User:</strong> "Jelaskan tentang teknologi blockchain dan cryptocurrency"</p>
            <p><strong>Gemini:</strong> "✨ Blockchain adalah teknologi revolutionary yang mengubah cara kita menyimpan data..."</p>
        </div>
        
        <div style="background: #f0fdf4; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #22c55e;">
            <p><strong>User:</strong> "Buatkan rencana bisnis untuk toko online"</p>
            <p><strong>Gemini:</strong> "✨ Rencana Bisnis Toko Online yang Komprehensif: 1. Market Research..."</p>
        </div>
        
        <div style="background: #fefce8; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #eab308;">
            <p><strong>User:</strong> "Tips hidup sehat untuk orang sibuk"</p>
            <p><strong>Gemini:</strong> "✨ Tips Hidup Sehat untuk Profesional Sibuk: 💪 Olahraga Efisien..."</p>
        </div>
        
        <h2>⚙️ Technical Specs:</h2>
        <ul>
            <li>Model: ${GEMINI_CONFIG.model}</li>
            <li>Max Output Tokens: ${GEMINI_CONFIG.maxOutputTokens}</li>
            <li>Temperature: ${GEMINI_CONFIG.temperature}</li>
            <li>Memory: Full conversation history per user</li>
            <li>API: Google AI Studio</li>
            <li>Language: Indonesian + English optimized</li>
        </ul>
        
        <h2>💰 Cost: 100% FREE!</h2>
        <div style="background: #dcfce7; padding: 15px; margin: 10px 0; border-radius: 8px;">
            <p><strong>✅ FREE TIER LIMITS:</strong></p>
            <ul>
                <li>1,000,000 tokens per month (sangat generous!)</li>
                <li>15 requests per minute</li>
                <li>No credit card required</li>
                <li>Perfect untuk personal/small business use</li>
            </ul>
        </div>
        
        <h2>🆚 Gemini vs ChatGPT:</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
            <tr style="background: #f8fafc;">
                <th style="border: 1px solid #e2e8f0; padding: 10px;">Feature</th>
                <th style="border: 1px solid #e2e8f0; padding: 10px;">Google Gemini</th>
                <th style="border: 1px solid #e2e8f0; padding: 10px;">ChatGPT</th>
            </tr>
            <tr>
                <td style="border: 1px solid #e2e8f0; padding: 10px;">Cost</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: green;">✅ FREE (1M tokens/month)</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: red;">❌ PAID ($0.002/1K tokens)</td>
            </tr>
            <tr>
                <td style="border: 1px solid #e2e8f0; padding: 10px;">Indonesian Language</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: green;">✅ Excellent</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: orange;">⚠️ Good</td>
            </tr>
            <tr>
                <td style="border: 1px solid #e2e8f0; padding: 10px;">Context Window</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: green;">✅ Very Large</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: orange;">⚠️ Medium</td>
            </tr>
            <tr>
                <td style="border: 1px solid #e2e8f0; padding: 10px;">Setup Complexity</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: green;">✅ Simple</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: orange;">⚠️ Need Credit Card</td>
            </tr>
        </table>
    `);
});

app.listen(PORT, () => {
    console.log(`🌐 Web server berjalan di http://localhost:${PORT}`);
    console.log(`🤖 Google Gemini integration: ${model ? 'READY' : 'NEED SETUP'}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Menutup chatbot...');
    client.destroy();
    db.close();
    process.exit();
});
