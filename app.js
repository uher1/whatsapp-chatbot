// CHATBOT WHATSAPP UNTUK CATATAN HARIAN - UNIVERSAL VERSION (BUG FIXED)
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const moment = require('moment-timezone');
const sqlite3 = require('sqlite3').verbose();
const express = require('express');

console.log('🚀 Memulai Chatbot WhatsApp...');

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

console.log('📁 Database siap!');

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
    console.log('📲 Buka WhatsApp → Titik 3 → Perangkat Tertaut → Tautkan Perangkat');
});

// Event ketika client siap
client.on('ready', () => {
    console.log('✅ Chatbot siap digunakan!');
    console.log('💡 Kirim pesan "bantuan" dari nomor manapun untuk melihat perintah');
});

// Event ketika loading
client.on('loading_screen', (percent, message) => {
    console.log(`⏳ Loading: ${percent}% - ${message}`);
});

// Event ketika authenticated
client.on('authenticated', () => {
    console.log('🔐 Authenticated berhasil!');
});

// UNIVERSAL: Terima pesan dari semua nomor tanpa filter ketat
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
        
        // Anti-loop protection - jangan proses pesan yang sama dalam 5 detik
        const currentTime = Date.now();
        const messageKey = message.body.trim() + message.from;
        
        if (messageKey === lastProcessedMessage && (currentTime - lastProcessedTime) < 5000) {
            console.log('🔇 Skip: Duplikasi pesan dalam 5 detik');
            return;
        }
        
        lastProcessedMessage = messageKey;
        lastProcessedTime = currentTime;
        
        console.log(`📨 Pesan diterima: "${message.body}" dari ${message.from}`);
        console.log(`📊 fromMe: ${message.fromMe}, type: ${message.type}`);
        
        const pesan = message.body.toLowerCase().trim();
        const nomorPengirim = message.from;
        
        // UPDATED: Nomor WhatsApp Anda yang baru
        const nomorAnda = '6282213741911@c.us';
        
        // Waktu WIB
        const waktuWIB = moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss');
        const tanggalWIB = moment().tz('Asia/Jakarta').format('DD/MM/YYYY');
        const jamWIB = moment().tz('Asia/Jakarta').format('HH:mm');
        
        // Command untuk menyimpan catatan
        if (pesan.startsWith('catat ')) {
            const fullCatatan = message.body.substring(6).trim(); // Hapus "catat "
            
            if (fullCatatan === '') {
                message.reply('❌ Catatan kosong!\n\n📝 *Format yang didukung:*\n• catat Makan siang di kantin\n• catat 14:30 Meeting dengan client\n• catat 08:00 Sarapan nasi gudeg');
                return;
            }
            
            let waktuCustom = null;
            let catatanText = fullCatatan;
            let waktuSimpan = waktuWIB;
            let jamTampil = jamWIB;
            
            // Deteksi format waktu di depan (HH:MM)
            const timeRegex = /^(\d{1,2}):(\d{2})\s+(.+)$/;
            const match = fullCatatan.match(timeRegex);
            
            if (match) {
                const jam = parseInt(match[1]);
                const menit = parseInt(match[2]);
                catatanText = match[3].trim();
                
                // Validasi waktu
                if (jam >= 0 && jam <= 23 && menit >= 0 && menit <= 59) {
                    // Buat waktu custom dengan tanggal hari ini
                    const tanggalHariIni = moment().tz('Asia/Jakarta').format('YYYY-MM-DD');
                    waktuCustom = `${tanggalHariIni} ${jam.toString().padStart(2, '0')}:${menit.toString().padStart(2, '0')}:00`;
                    waktuSimpan = waktuCustom;
                    jamTampil = `${jam.toString().padStart(2, '0')}:${menit.toString().padStart(2, '0')}`;
                    
                    console.log(`⏰ Waktu custom dideteksi: ${jamTampil}`);
                } else {
                    message.reply('❌ Format waktu salah! Gunakan format HH:MM (contoh: 14:30)');
                    return;
                }
            }
            
            if (catatanText === '') {
                message.reply('❌ Deskripsi catatan kosong!\nContoh: catat 14:30 Meeting dengan client');
                return;
            }
            
            // Simpan ke database dengan info pengirim
            const catatanFinal = `${catatanText} [dari: ${nomorPengirim}]`;
            
            db.run(
                'INSERT INTO catatan (pesan, waktu_wib) VALUES (?, ?)',
                [catatanFinal, waktuSimpan],
                function(err) {
                    if (err) {
                        console.log('❌ Error:', err);
                        message.reply('❌ Gagal menyimpan catatan');
                    } else {
                        console.log('✅ Catatan tersimpan:', catatanText);
                        const statusWaktu = waktuCustom ? '🕐 (waktu manual)' : '🕐 (waktu sekarang)';
                        message.reply(`✅ Catatan tersimpan! ${statusWaktu}\n📅 ${tanggalWIB} | ⏰ ${jamTampil}\n📝 "${catatanText}"\n👤 Dari: ${nomorPengirim}`);
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
                        console.log('❌ Database error:', err);
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
                    console.log(`📋 Mengirim ${rows.length} catatan hari ini`);
                }
            );
        }
        
        // Command untuk melihat catatan minggu ini
        else if (pesan === 'catatan minggu ini' || pesan === 'minggu ini') {
            const awalMinggu = moment().tz('Asia/Jakarta').startOf('week').format('YYYY-MM-DD');
            const akhirMinggu = moment().tz('Asia/Jakarta').endOf('week').format('YYYY-MM-DD');
            
            db.all(
                'SELECT * FROM catatan WHERE DATE(waktu_wib) BETWEEN ? AND ? ORDER BY waktu_wib ASC',
                [awalMinggu, akhirMinggu],
                (err, rows) => {
                    if (err) {
                        console.log('❌ Database error:', err);
                        message.reply('❌ Gagal mengambil catatan');
                        return;
                    }
                    
                    if (rows.length === 0) {
                        message.reply('📝 Belum ada catatan minggu ini');
                        return;
                    }
                    
                    let response = `📋 *Catatan Minggu Ini*\n\n`;
                    let tanggalSebelumnya = '';
                    
                    rows.forEach((row) => {
                        const tanggal = moment(row.waktu_wib).format('DD/MM/YYYY');
                        const jam = moment(row.waktu_wib).format('HH:mm');
                        
                        if (tanggal !== tanggalSebelumnya) {
                            response += `\n📅 *${tanggal}*\n`;
                            tanggalSebelumnya = tanggal;
                        }
                        
                        response += `• [${jam}] ${row.pesan}\n`;
                    });
                    
                    message.reply(response);
                    console.log(`📋 Mengirim ${rows.length} catatan minggu ini`);
                }
            );
        }
        
        // Command untuk reminder dengan waktu spesifik (UPDATED dengan tanggal!)
        else if (pesan.startsWith('reminder ')) {
            const fullReminder = message.body.substring(9).trim(); // Hapus "reminder "
            
            if (fullReminder === '') {
                message.reply('❌ Reminder kosong!\n\n⏰ *Format yang didukung:*\n• reminder 14:30 Meeting hari ini\n• reminder 25/12 08:00 Natal\n• reminder 15/06/2025 10:00 Meeting penting');
                return;
            }
            
            let targetTime;
            let reminderText;
            let isDateSpecific = false;
            
            // Format 1: DD/MM/YYYY HH:MM [pesan]
            const fullDateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s+(.+)$/;
            const fullDateMatch = fullReminder.match(fullDateRegex);
            
            // Format 2: DD/MM HH:MM [pesan] (tahun ini)
            const shortDateRegex = /^(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})\s+(.+)$/;
            const shortDateMatch = fullReminder.match(shortDateRegex);
            
            // Format 3: HH:MM [pesan] (hari ini/besok)
            const timeOnlyRegex = /^(\d{1,2}):(\d{2})\s+(.+)$/;
            const timeOnlyMatch = fullReminder.match(timeOnlyRegex);
            
            if (fullDateMatch) {
                // Format: DD/MM/YYYY HH:MM [pesan]
                const tanggal = parseInt(fullDateMatch[1]);
                const bulan = parseInt(fullDateMatch[2]);
                const tahun = parseInt(fullDateMatch[3]);
                const jam = parseInt(fullDateMatch[4]);
                const menit = parseInt(fullDateMatch[5]);
                reminderText = fullDateMatch[6].trim();
                isDateSpecific = true;
                
                // Validasi
                if (tanggal < 1 || tanggal > 31 || bulan < 1 || bulan > 12 || 
                    jam < 0 || jam > 23 || menit < 0 || menit > 59) {
                    message.reply('❌ Format tanggal/waktu salah!\n\n✅ *Format yang benar:*\nreminder DD/MM/YYYY HH:MM [pesan]\n\n📝 *Contoh:*\n• reminder 25/12/2025 08:00 Natal\n• reminder 01/01/2026 00:00 Tahun baru');
                    return;
                }
                
                // Buat moment object
                targetTime = moment.tz(`${tahun}-${bulan.toString().padStart(2, '0')}-${tanggal.toString().padStart(2, '0')} ${jam.toString().padStart(2, '0')}:${menit.toString().padStart(2, '0')}:00`, 'Asia/Jakarta');
                
            } else if (shortDateMatch) {
                // Format: DD/MM HH:MM [pesan] (tahun ini)
                const tanggal = parseInt(shortDateMatch[1]);
                const bulan = parseInt(shortDateMatch[2]);
                const jam = parseInt(shortDateMatch[3]);
                const menit = parseInt(shortDateMatch[4]);
                reminderText = shortDateMatch[5].trim();
                isDateSpecific = true;
                
                // Validasi
                if (tanggal < 1 || tanggal > 31 || bulan < 1 || bulan > 12 || 
                    jam < 0 || jam > 23 || menit < 0 || menit > 59) {
                    message.reply('❌ Format tanggal/waktu salah!\n\n✅ *Format yang benar:*\nreminder DD/MM HH:MM [pesan]\n\n📝 *Contoh:*\n• reminder 25/12 08:00 Natal tahun ini\n• reminder 15/06 14:30 Meeting');
                    return;
                }
                
                // Gunakan tahun ini
                const tahunIni = moment().tz('Asia/Jakarta').year();
                targetTime = moment.tz(`${tahunIni}-${bulan.toString().padStart(2, '0')}-${tanggal.toString().padStart(2, '0')} ${jam.toString().padStart(2, '0')}:${menit.toString().padStart(2, '0')}:00`, 'Asia/Jakarta');
                
                // Jika tanggal sudah lewat tahun ini, set untuk tahun depan
                const now = moment().tz('Asia/Jakarta');
                if (targetTime.isBefore(now)) {
                    targetTime.add(1, 'year');
                }
                
            } else if (timeOnlyMatch) {
                // Format: HH:MM [pesan] (hari ini/besok)
                const jam = parseInt(timeOnlyMatch[1]);
                const menit = parseInt(timeOnlyMatch[2]);
                reminderText = timeOnlyMatch[3].trim();
                
                // Validasi waktu
                if (jam < 0 || jam > 23 || menit < 0 || menit > 59) {
                    message.reply('❌ Format waktu salah! Gunakan format HH:MM (contoh: 14:30)');
                    return;
                }
                
                // Buat waktu target hari ini
                const now = moment().tz('Asia/Jakarta');
                targetTime = moment().tz('Asia/Jakarta')
                    .hour(jam)
                    .minute(menit)
                    .second(0)
                    .millisecond(0);
                
                // Jika waktu sudah lewat hari ini, set untuk besok
                if (targetTime.isBefore(now)) {
                    targetTime.add(1, 'day');
                }
                
            } else {
                message.reply('❌ Format salah!\n\n✅ *Format yang didukung:*\n\n🕐 *Hari ini/besok:*\n• reminder 14:30 Meeting\n\n📅 *Tanggal spesifik:*\n• reminder 25/12 08:00 Natal\n• reminder 15/06/2025 10:00 Meeting penting\n\n📝 *Contoh lengkap:*\n• reminder 07:00 Bangun pagi\n• reminder 31/12 23:59 Countdown tahun baru\n• reminder 01/01/2026 00:00 Tahun baru 2026');
                return;
            }
            
            // Validasi bahwa targetTime valid
            if (!targetTime.isValid()) {
                message.reply('❌ Tanggal tidak valid! Pastikan tanggal yang Anda masukkan benar.');
                return;
            }
            
            const now = moment().tz('Asia/Jakarta');
            const delayMs = targetTime.diff(now);
            
            // Pastikan reminder tidak untuk masa lalu (kecuali sudah di-handle untuk besok/tahun depan)
            if (delayMs <= 0) {
                message.reply('❌ Waktu yang Anda masukkan sudah lewat! Gunakan waktu di masa depan.');
                return;
            }
            
            // Format tampilan
            const jamTampil = targetTime.format('HH:mm');
            const tanggalTampil = targetTime.format('DD/MM/YYYY');
            const hariTampil = targetTime.format('dddd');
            
            // Hitung durasi
            const duration = moment.duration(delayMs);
            const hari = Math.floor(duration.asDays());
            const jam = duration.hours();
            const menit = duration.minutes();
            
            let durasiText = '';
            if (hari > 0) durasiText += `${hari} hari `;
            if (jam > 0) durasiText += `${jam} jam `;
            if (menit > 0) durasiText += `${menit} menit`;
            if (durasiText === '') durasiText = 'kurang dari 1 menit';
            
            // Response message
            let responseText;
            if (isDateSpecific) {
                responseText = `⏰ Reminder diset untuk tanggal spesifik!\n📅 ${hariTampil}, ${tanggalTampil} | ⏰ ${jamTampil}\n📝 "${reminderText}"\n\n⏳ Akan aktif dalam ${durasiText.trim()}`;
            } else {
                const isToday = targetTime.isSame(now, 'day');
                const label = isToday ? 'HARI INI' : 'BESOK';
                responseText = `⏰ Reminder diset untuk ${label}!\n📅 ${tanggalTampil} | ⏰ ${jamTampil}\n📝 "${reminderText}"\n\n⏳ Akan aktif dalam ${durasiText.trim()}`;
            }
            
            message.reply(responseText);
            
            // Set timeout - BUG FIX: Kirim ke nomorPengirim, bukan nomorAnda
            setTimeout(() => {
                client.sendMessage(nomorPengirim, `🔔 *REMINDER*\n⏰ ${jamTampil} WIB\n📅 ${tanggalTampil} (${hariTampil})\n📝 ${reminderText}\n\n👤 Diset oleh: ${nomorPengirim}`);
                console.log(`🔔 Reminder terkirim ke ${nomorPengirim}: ${reminderText} (${tanggalTampil} ${jamTampil})`);
            }, delayMs);
            
            console.log(`⏰ Reminder diset untuk ${tanggalTampil} ${jamTampil}: ${reminderText} (delay: ${Math.round(delayMs / 60000)} menit) - Target: ${nomorPengirim}`);
        }
        
        // Command untuk reminder (1 jam) - TETAP ADA untuk kompatibilitas - BUG FIX
        else if (pesan.startsWith('ingatkan ')) {
            const reminder = message.body.substring(9).trim();
            
            if (reminder === '') {
                message.reply('❌ Reminder kosong! Contoh: ingatkan Beli susu');
                return;
            }
            
            message.reply(`⏰ Reminder diset: "${reminder}"\n🕐 Akan mengingatkan dalam 1 jam`);
            console.log(`⏰ Reminder diset: ${reminder} oleh ${nomorPengirim}`);
            
            // Set timeout untuk 1 jam (3600000 ms) - BUG FIX: Kirim ke nomorPengirim
            setTimeout(() => {
                client.sendMessage(nomorPengirim, `🔔 *REMINDER*\n${reminder}\n\n⏰ ${moment().tz('Asia/Jakarta').format('HH:mm')} WIB\n👤 Diset oleh: ${nomorPengirim}`);
                console.log(`🔔 Reminder terkirim ke ${nomorPengirim}: ${reminder}`);
            }, 3600000);
        }
        
        // Command untuk reminder 5 menit (untuk testing) - BUG FIX
        else if (pesan.startsWith('test reminder ')) {
            const reminder = message.body.substring(14).trim();
            
            if (reminder === '') {
                message.reply('❌ Test reminder kosong! Contoh: test reminder Tes dalam 5 menit');
                return;
            }
            
            message.reply(`⏰ Test reminder diset: "${reminder}"\n🕐 Akan mengingatkan dalam 5 menit`);
            console.log(`⏰ Test reminder diset: ${reminder} oleh ${nomorPengirim}`);
            
            // Set timeout untuk 5 menit (300000 ms) - BUG FIX: Kirim ke nomorPengirim
            setTimeout(() => {
                client.sendMessage(nomorPengirim, `🔔 *TEST REMINDER*\n${reminder}\n\n⏰ ${moment().tz('Asia/Jakarta').format('HH:mm')} WIB\n👤 Diset oleh: ${nomorPengirim}`);
                console.log(`🔔 Test reminder terkirim ke ${nomorPengirim}: ${reminder}`);
            }, 300000);
        }
        
        // Command bantuan
        else if (pesan === 'bantuan' || pesan === 'help') {
            const helpText = `🤖 *Chatbot Catatan Harian Universal*

📝 *Perintah yang tersedia:*

• *catat [pesan]* - Simpan catatan (waktu sekarang)
  Contoh: catat Makan siang di kantin

• *catat HH:MM [pesan]* - Simpan catatan dengan waktu manual
  Contoh: catat 14:30 Meeting dengan client
  Contoh: catat 08:00 Sarapan nasi gudeg

• *reminder HH:MM [pesan]* - Set reminder untuk jam spesifik hari ini/besok
  Contoh: reminder 07:00 Bangun pagi
  Contoh: reminder 22:00 Waktunya tidur

• *reminder DD/MM HH:MM [pesan]* - Set reminder untuk tanggal spesifik
  Contoh: reminder 25/12 08:00 Natal
  Contoh: reminder 15/06 14:30 Meeting penting

• *reminder DD/MM/YYYY HH:MM [pesan]* - Set reminder dengan tahun spesifik
  Contoh: reminder 01/01/2026 00:00 Tahun baru 2026
  Contoh: reminder 17/08/2025 10:00 Hari kemerdekaan

• *hari ini* - Lihat catatan hari ini

• *minggu ini* - Lihat catatan minggu ini

• *ingatkan [pesan]* - Set reminder 1 jam dari sekarang
  Contoh: ingatkan Beli susu

• *test reminder [pesan]* - Test reminder 5 menit

• *status* - Cek status chatbot

• *bantuan* - Tampilkan menu ini

• *hapus hari ini* - Hapus semua catatan hari ini

• *siapa* - Info akses chatbot

⏰ Semua waktu dalam zona WIB
🤖 Chatbot bisa digunakan dari nomor manapun!
👤 Nomor Anda: ${nomorPengirim}

💡 *Tips:* 
• Gunakan "catat HH:MM" untuk mencatat aktivitas masa lalu
• Gunakan "reminder HH:MM" untuk set alarm masa depan
• Jika waktu reminder sudah lewat, akan diset untuk besok!
• Reminder akan dikirim kembali ke nomor yang mengatur reminder

✅ *BUG FIX: Reminder sekarang dikirim ke nomor yang set reminder, bukan ke nomor utama!*`;
            
            message.reply(helpText);
            console.log(`📖 Mengirim menu bantuan ke ${nomorPengirim}`);
        }
        
        // Command untuk cek status
        else if (pesan === 'status') {
            const waktu = moment().tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss');
            message.reply(`✅ Chatbot aktif!\n⏰ Waktu sekarang: ${waktu} WIB\n📱 Nomor utama: ${nomorAnda}\n👤 Pengirim: ${nomorPengirim}\n🔄 fromMe: ${message.fromMe}\n\n✅ *BUG FIX: Reminder akan dikirim ke ${nomorPengirim}*`);
            console.log(`📊 Status diminta oleh ${nomorPengirim}`);
        }
        
        // Command untuk hapus catatan hari ini (hanya nomor utama)
        else if (pesan === 'hapus hari ini') {
            if (nomorPengirim !== nomorAnda) {
                message.reply('❌ Hanya nomor utama yang bisa menghapus catatan');
                return;
            }
            
            const tanggalHariIni = moment().tz('Asia/Jakarta').format('YYYY-MM-DD');
            
            db.run(
                'DELETE FROM catatan WHERE DATE(waktu_wib) = ?',
                [tanggalHariIni],
                function(err) {
                    if (err) {
                        console.log('❌ Error hapus:', err);
                        message.reply('❌ Gagal hapus catatan');
                    } else {
                        message.reply(`🗑️ ${this.changes} catatan hari ini berhasil dihapus`);
                        console.log(`🗑️ ${this.changes} catatan dihapus oleh ${nomorPengirim}`);
                    }
                }
            );
        }
        
        // Siapa yang bisa akses
        else if (pesan === 'siapa') {
            message.reply(`👥 *Info Akses Chatbot*\n\n✅ Semua orang bisa:\n• Kirim catatan\n• Lihat catatan hari ini/minggu ini\n• Set reminder\n• Cek status\n\n🔒 Hanya nomor utama (${nomorAnda}) yang bisa:\n• Hapus catatan\n\n👤 Nomor Anda: ${nomorPengirim}\n\n✅ *BUG FIX: Reminder akan dikirim kembali ke nomor Anda!*`);
        }
        
        // Log perintah tidak dikenali tanpa reply
        else {
            console.log(`❓ Perintah tidak dikenali dari ${nomorPengirim}: ${message.body}`);
            // Tidak ada reply otomatis untuk mencegah spam
        }
        
    } catch (error) {
        console.log('❌ Error dalam message handler:', error);
        // Jangan reply error otomatis untuk mencegah loop
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

// Setup web server sederhana untuk monitoring
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    const waktu = moment().tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss');
    res.send(`
        <h1>🤖 Chatbot WhatsApp Universal Aktif! (BUG FIXED)</h1>
        <p>⏰ Waktu: ${waktu} WIB</p>
        <p>📱 Status: Berjalan</p>
        <p>💡 Kirim "bantuan" dari nomor manapun untuk melihat perintah</p>
        
        <h2>🐛 BUG FIXES:</h2>
        <ul>
            <li>✅ <strong>Reminder fix:</strong> Sekarang dikirim ke nomor yang set reminder (bukan hard-coded ke 1911)</li>
            <li>✅ <strong>Multi-user support:</strong> Setiap orang dapat reminder ke nomor mereka sendiri</li>
            <li>✅ <strong>Test reminder fix:</strong> Test reminder juga dikirim ke pengirim</li>
            <li>✅ <strong>Improved logging:</strong> Log target nomor untuk debugging</li>
        </ul>
        
        <h2>📝 Perintah Tersedia:</h2>
        <ul>
            <li><strong>catat [pesan]</strong> - Simpan catatan dengan waktu sekarang</li>
            <li><strong>catat HH:MM [pesan]</strong> - Simpan catatan dengan waktu manual</li>
            <li><strong>reminder HH:MM [pesan]</strong> - Set reminder untuk jam spesifik</li>
            <li><strong>reminder DD/MM HH:MM [pesan]</strong> - Set reminder dengan tanggal</li>
            <li><strong>reminder DD/MM/YYYY HH:MM [pesan]</strong> - Set reminder dengan tahun</li>
            <li><strong>hari ini</strong> - Lihat catatan hari ini</li>
            <li><strong>minggu ini</strong> - Lihat catatan minggu ini</li>
            <li><strong>ingatkan [pesan]</strong> - Set reminder 1 jam dari sekarang</li>
            <li><strong>test reminder [pesan]</strong> - Test reminder 5 menit</li>
            <li><strong>status</strong> - Cek status</li>
            <li><strong>bantuan</strong> - Menu bantuan</li>
            <li><strong>siapa</strong> - Info akses chatbot</li>
            <li><strong>hapus hari ini</strong> - Hapus catatan (hanya nomor utama)</li>
        </ul>
        
        <h2>🌟 Fitur Universal:</h2>
        <p>✅ Terima pesan dari semua nomor WhatsApp<br>
        ✅ Catatan disimpan dengan info pengirim<br>
        ✅ Reminder dengan 3 format: HH:MM, DD/MM HH:MM, DD/MM/YYYY HH:MM<br>
        ✅ Auto-detect: hari ini, besok, tahun depan<br>
        ✅ Reminder jangka panjang (hari, bulan, tahun)<br>
        ✅ <strong>Multi-user reminder support (BUG FIXED!)</strong><br>
        🔒 Hapus catatan hanya untuk nomor utama</p>
        
        <h2>🔧 Technical Changes:</h2>
        <ul>
            <li>Line 362: client.sendMessage(nomorAnda, ...) → client.sendMessage(nomorPengirim, ...)</li>
            <li>Line 385: client.sendMessage(nomorAnda, ...) → client.sendMessage(nomorPengirim, ...)</li>
            <li>Line 398: client.sendMessage(nomorAnda, ...) → client.sendMessage(nomorPengirim, ...)</li>
            <li>Added target logging for debugging</li>
            <li>Updated help text to mention bug fix</li>
        </ul>
    `);
});

app.listen(PORT, () => {
    console.log(`🌐 Web server berjalan di http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Menutup chatbot...');
    client.destroy();
    db.close();
    process.exit();
});
