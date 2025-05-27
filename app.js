// CHATBOT WHATSAPP DENGAN CHATGPT INTEGRATION - FREE VERSION
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const moment = require('moment-timezone');
const sqlite3 = require('sqlite3').verbose();
const express = require('express');
const OpenAI = require('openai');

console.log('🚀 Memulai Chatbot WhatsApp dengan ChatGPT...');

// KONFIGURASI CHATGPT
const CHATGPT_CONFIG = {
    enabled: true,
    apiKey: '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', // Ganti dengan OpenAI API key
    model: 'gpt-3.5-turbo', // Free model yang powerful
    // Alternative models:
    // model: 'gpt-4o-mini', // Super murah, very good
    // model: 'gpt-4', // Premium tapi excellent
    
    maxTokens: 1000,
    temperature: 0.7,
    systemMessage: `Anda adalah asisten WhatsApp yang cerdas dan membantu bernama "ChatGPT Assistant". 

Kepribadian Anda:
- Ramah, helpful, dan responsif
- Berbicara dalam bahasa Indonesia yang natural dan mengalir
- Gunakan emoji yang sesuai untuk membuat percakapan lebih menarik
- Jawab dengan singkat namun informatif (maksimal 3-4 paragraf)
- Selalu berikan informasi yang akurat dan up-to-date

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

PENTING: Selalu jaga konteks percakapan dan berikan respon yang relevan dengan pertanyaan user.`,
    
    conversationHistory: new Map() // Store conversation per user
};

// Initialize OpenAI
let openai = null;

if (CHATGPT_CONFIG.enabled && CHATGPT_CONFIG.apiKey !== 'sk-your-openai-api-key-here') {
    try {
        openai = new OpenAI({
            apiKey: CHATGPT_CONFIG.apiKey
        });
        console.log('🤖 OpenAI ChatGPT API initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing ChatGPT:', error.message);
        openai = null;
    }
} else {
    console.log('⚠️ ChatGPT disabled - API key belum diset');
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
        model_used TEXT DEFAULT 'gpt-3.5-turbo',
        tokens_used INTEGER DEFAULT 0,
        waktu DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

console.log('📁 Database siap!');

// FUNGSI CHATGPT AI
async function getChatGPTResponse(userMessage, nomorPengirim) {
    try {
        if (!openai) {
            return {
                success: false,
                error: 'ChatGPT belum dikonfigurasi. Set API key terlebih dahulu.'
            };
        }

        console.log(`🤖 Sending to ChatGPT: "${userMessage}" from ${nomorPengirim}`);

        // Get conversation history untuk context
        let chatHistory = CHATGPT_CONFIG.conversationHistory.get(nomorPengirim) || [];
        
        // Limit history to last 10 messages untuk avoid token limit
        if (chatHistory.length > 10) {
            chatHistory = chatHistory.slice(-10);
        }

        // Build messages array
        const messages = [
            { role: 'system', content: CHATGPT_CONFIG.systemMessage },
            ...chatHistory,
            { role: 'user', content: userMessage }
        ];

        // Send to ChatGPT
        const completion = await openai.chat.completions.create({
            model: CHATGPT_CONFIG.model,
            messages: messages,
            max_tokens: CHATGPT_CONFIG.maxTokens,
            temperature: CHATGPT_CONFIG.temperature,
        });

        const responseText = completion.choices[0].message.content;
        const tokensUsed = completion.usage.total_tokens;

        // Update conversation history
        chatHistory.push(
            { role: 'user', content: userMessage },
            { role: 'assistant', content: responseText }
        );
        CHATGPT_CONFIG.conversationHistory.set(nomorPengirim, chatHistory);

        // Save ke database
        db.run(
            'INSERT INTO ai_conversations (nomor_pengirim, user_message, ai_response, model_used, tokens_used) VALUES (?, ?, ?, ?, ?)',
            [nomorPengirim, userMessage, responseText, CHATGPT_CONFIG.model, tokensUsed]
        );

        console.log(`✅ ChatGPT response: "${responseText.substring(0, 100)}..."`);
        console.log(`💰 Tokens used: ${tokensUsed}`);

        return {
            success: true,
            response: responseText,
            tokensUsed: tokensUsed,
            model: CHATGPT_CONFIG.model
        };

    } catch (error) {
        console.error('❌ ChatGPT error:', error.message);
        
        let errorMessage = 'ChatGPT sedang bermasalah, coba lagi nanti';
        
        if (error.message.includes('API key')) {
            errorMessage = 'API key ChatGPT tidak valid';
        } else if (error.message.includes('quota') || error.message.includes('limit')) {
            errorMessage = 'Quota ChatGPT terlampaui, coba lagi nanti';
        } else if (error.message.includes('rate limit')) {
            errorMessage = 'Rate limit exceeded. Coba lagi dalam beberapa detik';
        } else if (error.message.includes('insufficient_quota')) {
            errorMessage = 'Credit ChatGPT habis, perlu top up di platform.openai.com';
        }
        
        return {
            success: false,
            error: errorMessage
        };
    }
}

// FUNGSI UNTUK CLEAR CONVERSATION HISTORY
function clearConversationHistory(nomorPengirim) {
    CHATGPT_CONFIG.conversationHistory.delete(nomorPengirim);
    console.log(`🧹 Conversation history cleared for ${nomorPengirim}`);
}

// FUNGSI UNTUK CHECK APAKAH PESAN BUTUH AI - FIXED VERSION
function shouldUseAI(message, nomorPengirim) {
    const pesan = message.toLowerCase().trim();
    
    // Skip bot's own messages (anti-loop)
    if (pesan.includes('❌ chatgpt error') || pesan.includes('🤖 powered by') || pesan.includes('quota chatgpt')) {
        console.log(`🚫 Skip bot's own message: ${pesan.substring(0, 50)}...`);
        return false;
    }
    
    // Skip jika pesan adalah command existing
    const existingCommands = [
        'catat ', 'reminder ', 'ingatkan ', 'test reminder ',
        'hari ini', 'minggu ini', 'bantuan', 'help', 'status',
        'hapus hari ini', 'siapa', 'setup', 'config', 
        'ai status', 'clear ai', 'reset ai', 'chatgpt status',
        'setup chatgpt', 'config chatgpt', 'catatan hari ini'
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
    console.log(`✅ ChatGPT akan proses: "${pesan}"`);
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
    console.log('✅ Chatbot dengan ChatGPT siap digunakan!');
    console.log('🤖 ChatGPT integration:', openai ? 'ACTIVE' : 'DISABLED');
    console.log('💡 Kirim pesan apapun untuk berinteraksi dengan ChatGPT AI');
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
        
        // CHATGPT AI COMMANDS
        else if (pesan === 'clear ai' || pesan === 'reset ai' || pesan === 'clear chatgpt') {
            clearConversationHistory(nomorPengirim);
            message.reply('🧹 Conversation history dengan ChatGPT telah direset!\n✨ Percakapan baru dimulai dari awal.');
        }
        
        else if (pesan === 'ai status' || pesan === 'chatgpt status') {
            const activeConversations = CHATGPT_CONFIG.conversationHistory.size;
            const aiStatus = openai ? '✅ ACTIVE' : '❌ DISABLED';
            
            // Get conversation stats from database
            db.get(
                'SELECT COUNT(*) as total, SUM(tokens_used) as total_tokens FROM ai_conversations WHERE nomor_pengirim = ?',
                [nomorPengirim],
                (err, stats) => {
                    const totalChats = stats ? stats.total : 0;
                    const totalTokens = stats ? stats.total_tokens : 0;
                    
                    message.reply(`🤖 *ChatGPT Status*\n\n🔌 API: ${aiStatus}\n📊 Model: ${CHATGPT_CONFIG.model}\n💬 Active conversations: ${activeConversations}\n📈 Your chats: ${totalChats}\n🎯 Your tokens: ${totalTokens}\n⚙️ Temperature: ${CHATGPT_CONFIG.temperature}\n\n💡 Gunakan "clear ai" untuk reset percakapan`);
                }
            );
        }
        
        else if (pesan.startsWith('setup chatgpt') || pesan === 'config chatgpt') {
            const setupGuide = `🔧 *SETUP CHATGPT API*

📝 **STEP 1: Dapatkan API Key**
1. Buka: https://platform.openai.com/api-keys
2. Sign up/Login
3. Click "Create new secret key"
4. Copy API key yang dihasilkan (sk-...)

📝 **STEP 2: Update Config**
Edit app.js:
\`\`\`javascript
apiKey: 'sk-your-actual-openai-api-key',
\`\`\`

📝 **STEP 3: Install Package**
\`\`\`bash
npm install openai
\`\`\`

📝 **STEP 4: Restart Bot**
\`\`\`bash
pm2 restart whatsapp-bot
\`\`\`

💰 **CHATGPT PRICING:**
✅ $5 free credit untuk new users
✅ GPT-3.5-turbo: GRATIS dengan rate limit
✅ GPT-4o-mini: $0.15/1M tokens (super murah!)
✅ GPT-4: $5/1M tokens (premium)
✅ No billing setup required untuk start

🧪 **Test Commands:**
• chatgpt status - Check ChatGPT status
• clear ai - Reset conversation
• [tanya apapun] - ChatGPT akan jawab otomatis!

🌟 **Keunggulan ChatGPT:**
• Setup super mudah vs Gemini
• Free tier generous
• Excellent bahasa Indonesia
• Stable dan reliable API
• Great for coding & analysis`;
            
            message.reply(setupGuide);
        }
        
        // BANTUAN COMMAND - UPDATED dengan ChatGPT features
        else if (pesan === 'bantuan' || pesan === 'help') {
            const aiStatusEmoji = openai ? '🤖✅' : '🤖❌';
            const helpText = `🤖 *Chatbot Universal dengan ChatGPT* ${aiStatusEmoji}

📝 *Perintah Catatan & Reminder:*
• *catat [pesan]* - Simpan catatan
• *catat HH:MM [pesan]* - Catatan dengan waktu
• *reminder HH:MM [pesan]* - Set reminder
• *test reminder [pesan]* - Test reminder 5 menit
• *hari ini* - Lihat catatan hari ini

🤖 *ChatGPT AI Features:*
• *[tanya apapun]* - ChatGPT akan menjawab otomatis
• *chatgpt status* - Status ChatGPT integration  
• *clear ai* - Reset conversation history
• *setup chatgpt* - Panduan setup API

📋 *Lainnya:*
• *status* - Status bot
• *bantuan* - Menu ini

💡 *Cara Pakai ChatGPT AI:*
• Tanya apapun dalam bahasa natural
• ChatGPT ingat konteks percakapan
• Support bahasa Indonesia excellent
• Bisa diskusi topic kompleks
• Free tier generous + $5 credit!

🔧 *Setup Status:*
${openai ? '✅ ChatGPT sudah aktif!' : '❌ Butuh ChatGPT API key (setup chatgpt)'}

🌟 *Contoh Pertanyaan ChatGPT:*
• "Jelaskan tentang AI dan dampaknya terhadap pekerjaan"
• "Buatkan rencana diet sehat untuk turun berat badan"
• "Bagaimana cara memulai bisnis online dari nol?"
• "Analisis keuntungan investasi saham vs emas"
• "Tips meningkatkan produktivitas kerja remote"
• "Bantuin coding JavaScript untuk website"

✨ *Keunggulan ChatGPT vs Gemini:*
• Setup jauh lebih mudah (no billing headache!)
• Free tier generous dengan $5 credit
• API lebih stable dan reliable
• Documentation lengkap dan clear
• Community support excellent`;
            
            message.reply(helpText);
        }
        
        // STATUS COMMAND - UPDATED
        else if (pesan === 'status') {
            const waktu = moment().tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss');
            const aiStatus = openai ? '✅ ACTIVE' : '❌ DISABLED';
            const conversationCount = CHATGPT_CONFIG.conversationHistory.size;
            
            message.reply(`✅ *Chatbot Status*\n⏰ ${waktu} WIB\n🤖 ChatGPT: ${aiStatus}\n💬 Active conversations: ${conversationCount}\n👤 Anda: ${nomorPengirim}\n\n💡 Bot siap menerima pertanyaan ChatGPT!\n✨ Free tier + $5 credit available!`);
        }
        
        // DEFAULT: CHATGPT AI RESPONSE
        else {
            // Check apakah pesan butuh AI response
            if (shouldUseAI(message.body, nomorPengirim)) {
                if (!openai) {
                    message.reply('🤖 ChatGPT belum dikonfigurasi.\n\n💡 Kirim "setup chatgpt" untuk panduan setup, atau "bantuan" untuk melihat perintah lain.\n\n✨ ChatGPT free tier + $5 credit available!');
                    return;
                }
                
                // Show processing indicator
                console.log(`🤖 Processing ChatGPT request: "${message.body}"`);
                
                // Get ChatGPT response
                const aiResult = await getChatGPTResponse(message.body, nomorPengirim);
                
                if (aiResult.success) {
                    // Send AI response dengan emoji dan branding
                    message.reply(`✨ ${aiResult.response}\n\n🤖 _Powered by ChatGPT_`);
                    console.log(`✅ ChatGPT response sent to ${nomorPengirim} (${aiResult.tokensUsed} tokens)`);
                } else {
                    // Send error message
                    message.reply(`❌ ChatGPT Error: ${aiResult.error}\n\n💡 Coba lagi nanti atau kirim "bantuan" untuk perintah lain.\n\n🔧 Jika terus error, coba "clear ai" untuk reset conversation.`);
                    console.log(`❌ ChatGPT error for ${nomorPengirim}: ${aiResult.error}`);
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
    const aiStatus = openai ? '✅ ACTIVE' : '❌ DISABLED';
    const conversationCount = CHATGPT_CONFIG.conversationHistory.size;
    
    res.send(`
        <h1>🤖✨ Chatbot WhatsApp dengan ChatGPT Integration</h1>
        <p>⏰ Waktu: ${waktu} WIB</p>
        <p>📱 Status: Aktif</p>
        <p>🤖 ChatGPT: ${aiStatus}</p>
        <p>📊 Model: ${CHATGPT_CONFIG.model}</p>
        <p>💬 Active Conversations: ${conversationCount}</p>
        
        <h2>✨ ChatGPT Features:</h2>
        <ul>
            <li><strong>FREE TIER</strong> - $5 credit + generous free usage</li>
            <li><strong>Easy Setup</strong> - No billing headache like Gemini!</li>
            <li><strong>Conversation Memory</strong> - AI ingat konteks percakapan</li>
            <li><strong>Bahasa Indonesia Excellent</strong> - Natural dan mengalir</li>
            <li><strong>Stable API</strong> - Reliable dan well-documented</li>
            <li><strong>Multiple Models</strong> - GPT-3.5-turbo (free) to GPT-4 (premium)</li>
        </ul>
        
        <h2>📝 Commands:</h2>
        <ul>
            <li><strong>[tanya apapun]</strong> - ChatGPT AI response otomatis</li>
            <li><strong>chatgpt status</strong> - Check ChatGPT status & usage</li>
            <li><strong>clear ai</strong> - Reset conversation history</li>
            <li><strong>setup chatgpt</strong> - Setup guide API key</li>
            <li><strong>catat [pesan]</strong> - Save notes</li>
            <li><strong>reminder HH:MM [pesan]</strong> - Set reminders</li>
            <li><strong>bantuan</strong> - Full help menu</li>
        </ul>
        
        <h2>🌟 Example ChatGPT Conversations:</h2>
        <div style="background: #f0f9ff; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #0ea5e9;">
            <p><strong>User:</strong> "Halo, apa kabar?"</p>
            <p><strong>ChatGPT:</strong> "✨ Halo! Saya baik-baik saja, terima kasih! 😊 Saya ChatGPT Assistant yang siap membantu..."</p>
        </div>
        
        <div style="background: #f0fdf4; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #22c55e;">
            <p><strong>User:</strong> "Jelaskan tentang machine learning dengan contoh praktis"</p>
            <p><strong>ChatGPT:</strong> "✨ Machine Learning adalah cabang AI yang memungkinkan komputer belajar pola..."</p>
        </div>
        
        <div style="background: #fefce8; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #eab308;">
            <p><strong>User:</strong> "Buatkan code JavaScript untuk calculator sederhana"</p>
            <p><strong>ChatGPT:</strong> "✨ Tentu! Berikut code calculator JavaScript yang simple dan fungsional..."</p>
        </div>
        
        <h2>⚙️ Technical Specs:</h2>
        <ul>
            <li>Model: ${CHATGPT_CONFIG.model}</li>
            <li>Max Tokens: ${CHATGPT_CONFIG.maxTokens}</li>
            <li>Temperature: ${CHATGPT_CONFIG.temperature}</li>
            <li>Memory: Conversation history per user (last 10 messages)</li>
            <li>API: OpenAI Platform</li>
            <li>Language: Indonesian + English optimized</li>
        </ul>
        
        <h2>💰 Pricing: Super Affordable!</h2>
        <div style="background: #dcfce7; padding: 15px; margin: 10px 0; border-radius: 8px;">
            <p><strong>✅ CHATGPT PRICING:</strong></p>
            <ul>
                <li><strong>$5 free credit</strong> untuk new users</li>
                <li><strong>GPT-3.5-turbo:</strong> GRATIS dengan rate limit</li>
                <li><strong>GPT-4o-mini:</strong> $0.15/1M tokens (super murah!)</li>
                <li><strong>GPT-4:</strong> $5/1M tokens (premium quality)</li>
                <li><strong>No billing setup</strong> required to start</li>
            </ul>
        </div>
        
        <h2>🆚 ChatGPT vs Gemini:</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
            <tr style="background: #f8fafc;">
                <th style="border: 1px solid #e2e8f0; padding: 10px;">Feature</th>
                <th style="border: 1px solid #e2e8f0; padding: 10px;">ChatGPT</th>
                <th style="border: 1px solid #e2e8f0; padding: 10px;">Gemini</th>
            </tr>
            <tr>
                <td style="border: 1px solid #e2e8f0; padding: 10px;">Setup Difficulty</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: green;">✅ SUPER EASY</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: red;">❌ Billing Headache</td>
            </tr>
            <tr>
                <td style="border: 1px solid #e2e8f0; padding: 10px;">Free Tier</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: green;">✅ $5 Credit + Rate Limited Free</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: orange;">⚠️ Complex Billing</td>
            </tr>
            <tr>
                <td style="border: 1px solid #e2e8f0; padding: 10px;">API Reliability</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: green;">✅ Very Stable</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: orange;">⚠️ Sometimes Issues</td>
            </tr>
            <tr>
                <td style="border: 1px solid #e2e8f0; padding: 10px;">Documentation</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: green;">✅ Excellent</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: orange;">⚠️ Good</td>
            </tr>
            <tr>
                <td style="border: 1px solid #e2e8f0; padding: 10px;">Indonesian Language</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: green;">✅ Excellent</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; color: green;">✅ Excellent</td>
            </tr>
        </table>
        
        <h2>🚀 Getting Started:</h2>
        <div style="background: #dbeafe; padding: 15px; margin: 10px 0; border-radius: 8px;">
            <p><strong>Ready to switch to ChatGPT?</strong></p>
            <ol>
                <li>Get free API key from platform.openai.com</li>
                <li>Update your config with the key</li>
                <li>Enjoy hassle-free AI integration!</li>
            </ol>
        </div>
    `);
});

app.listen(PORT, () => {
    console.log(`🌐 Web server berjalan di http://localhost:${PORT}`);
    console.log(`🤖 ChatGPT integration: ${openai ? 'READY' : 'NEED SETUP'}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Menutup chatbot...');
    client.destroy();
    db.close();
    process.exit();
});
