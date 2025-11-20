const TelegramBot = require('node-telegram-bot-api');
const { instagramGetUrl } = require('instagram-url-direct');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Telegram bot token
const token = process.env.BOT_TOKEN || '8503840419:AAGy4jhdNVXpvE30cP2eAEXHCjleLXu-mpU';
const bot = new TelegramBot(token, { polling: true });

// Har bir foydalanuvchi uchun oxirgi linkni saqlash
const userLinks = new Map();

// Asosiy menyu tugmalari
const mainMenu = {
    reply_markup: {
        inline_keyboard: [
            [
                { text: "📥 Video", callback_data: "download_video" },
                { text: "🎵 Audio", callback_data: "download_audio" }
            ],
            [
                { text: "🎼 Faqat Musiqa", callback_data: "music_only_guide" }
            ],
            [{ text: "ℹ️ Help", callback_data: "help" }]
        ]
    }
};

// Instagram linkini tekshirish
function isInstagramLink(text) {
    const patterns = [
        /https?:\/\/(www\.)?instagram\.com\/p\/[A-Za-z0-9_-]+/,
        /https?:\/\/(www\.)?instagram\.com\/reel\/[A-Za-z0-9_-]+/,
        /https?:\/\/(www\.)?instagram\.com\/tv\/[A-Za-z0-9_-]+/
    ];
    return patterns.some(pattern => pattern.test(text));
}

// Link formatini tozalash
function cleanInstagramUrl(url) {
    return url.split('?')[0];
}

// Vaqtinchalik fayllarni tozalash
function cleanupFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Fayl o'chirildi: ${filePath}`);
        }
    } catch (error) {
        console.error('Faylni o\'chirishda xatolik:', error.message);
    }
}

// Bot ishga tushgani haqida xabar
console.log('✅ Bot ishga tushdi!');
console.log('🌍 Barcha foydalanuvchilar botdan foydalanishi mumkin!');
console.log('📥 Instagram Video: ✅');
console.log('🎵 Instagram Audio: ✅ (FFmpeg siz!)');
console.log('🎼 Faqat Musiqa: ℹ️ (Ko\'rsatma bilan)');

// /start komandasi
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || 'Foydalanuvchi';

    bot.sendMessage(chatId, 
`👋 Salom, ${firstName}!

Men InstaSaveBotman - Instagram yuklab olish boti.

📥 Video: To'liq video
🎵 Audio: Video + ovoz + musiqa (hamma)
🎼 Faqat Musiqa: Ovozni olib, faqat musiqa

🔗 Instagram linkini yuboring va kerakli formatni tanlang!

⚡ Tezkor, bepul va oson!`, mainMenu);
});

// /help komandasi
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, 
`📖 Foydalanish bo'yicha qo'llanma:

1️⃣ Instagram linkini nusxa oling
2️⃣ Menga yuboring
3️⃣ Formatni tanlang:
   📥 Video - To'liq video
   🎵 Audio - Ovoz + musiqa (hamma)
   🎼 Faqat Musiqa - Ko'rsatma

✅ Qo'llab-quvvatlanadigan linklar:
📸 instagram.com/p/ABC123/
📸 instagram.com/reel/XYZ456/
📸 instagram.com/tv/VIDEO123/

⚠️ Eslatma: 
• Faqat public (ommaviy) postlarni yuklab olish mumkin
• Audio faqat videolar uchun ishlaydi (rasmlar uchun emas)

💬 Savollar: @eosnwx`, mainMenu);
});

// /stats komandasi
bot.onText(/\/stats/, (msg) => {
    const chatId = msg.chat.id;
    const totalUsers = userLinks.size;

    bot.sendMessage(chatId, 
`📊 Bot statistikasi:

👥 Foydalanuvchilar: ${totalUsers}
🔗 Saqlanganlar: ${userLinks.size}
⚡ Status: Faol
📥 Video: ✅
🎵 Audio: ✅
🎼 Faqat Musiqa: ℹ️ (Ko'rsatma)`);
});

// Instagram linkni qabul qilish
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const userId = msg.from.id;

    // Komandalarni o'tkazib yuborish
    if (!text || text.startsWith('/')) return;

    if (isInstagramLink(text)) {
        const cleanedUrl = cleanInstagramUrl(text);
        
        // Har bir foydalanuvchi uchun linkni saqlash
        userLinks.set(userId, cleanedUrl);

        bot.sendMessage(chatId, 
`✅ Link qabul qilindi!

📸 ${cleanedUrl}

Formatni tanlang 👇
📥 Video - To'liq video
🎵 Audio - Ovoz + musiqa
🎼 Faqat Musiqa - Ko'rsatma`, mainMenu);
    } else {
        bot.sendMessage(chatId, 
`❌ Iltimos, faqat Instagram linkini yuboring!

📝 To'g'ri format:
• https://www.instagram.com/p/ABC123/
• https://www.instagram.com/reel/XYZ456/

Qaytadan urinib ko'ring 👇`, mainMenu);
    }
});

// Instagram Video yuklab olish
async function downloadInstagramVideo(chatId, userId, userLink) {
    const loadingMsg = await bot.sendMessage(chatId, "⏳ Video yuklab olinmoqda...\n\nIltimos, kuting...");

    try {
        console.log(`[User: ${userId}] Instagram video yuklab olinmoqda: ${userLink}`);
        const data = await instagramGetUrl(userLink);
        
        console.log(`[User: ${userId}] Ma'lumot olindi`);

        await bot.deleteMessage(chatId, loadingMsg.message_id);

        if (data && data.url_list && data.url_list.length > 0) {
            const mediaUrl = data.url_list[0];
            
            const caption = data.post_info ? 
                `✅ Video yuklab olindi!\n\n👤 @${data.post_info.owner_username}\n❤️ ${data.post_info.likes || 0} likes\n\n📲 @InstaSaveBot` : 
                '✅ Video yuklab olindi!\n\n📲 @InstaSaveBot';

            if (data.media_details && data.media_details.length > 0) {
                const mediaType = data.media_details[0].type;
                
                if (mediaType === 'video') {
                    await bot.sendVideo(chatId, mediaUrl, { 
                        caption: caption,
                        supports_streaming: true 
                    });
                } else {
                    await bot.sendPhoto(chatId, mediaUrl, { 
                        caption: caption 
                    });
                }
            } else {
                await bot.sendMessage(chatId, `${caption}\n\n🔗 ${mediaUrl}`);
            }

            // Agar bir nechta media bo'lsa
            if (data.results_number > 1) {
                await bot.sendMessage(chatId, 
                    `ℹ️ Bu postda ${data.results_number} ta media bor.`
                );

                for (let i = 1; i < Math.min(data.url_list.length, 5); i++) {
                    const url = data.url_list[i];
                    const detail = data.media_details[i];

                    if (detail.type === 'video') {
                        await bot.sendVideo(chatId, url, { 
                            caption: `${i + 1}/${data.results_number}\n\n📲 @InstaSaveBot` 
                        });
                    } else {
                        await bot.sendPhoto(chatId, url, { 
                            caption: `${i + 1}/${data.results_number}\n\n📲 @InstaSaveBot` 
                        });
                    }
                }
            }

            console.log(`[User: ${userId}] Video muvaffaqiyatli yuklandi`);

        } else {
            await bot.sendMessage(chatId, 
                "❌ Media topilmadi!\n\nIltimos:\n• Link to'g'ri ekanligini tekshiring\n• Post public (ommaviy) ekanligini tekshiring\n• Qaytadan urinib ko'ring"
            );
        }

    } catch (error) {
        console.error(`[User: ${userId}] Video download xatolik:`, error.message);
        
        try {
            await bot.deleteMessage(chatId, loadingMsg.message_id);
        } catch (e) {}

        await bot.sendMessage(chatId, 
            `❌ Xatolik yuz berdi!\n\n💡 Sabablari:\n• Link noto'g'ri yoki mavjud emas\n• Post private (shaxsiy)\n• Instagram tizimida muammo\n\nIltimos qaytadan urinib ko'ring!`
        );
    }
}

// Instagram Audio yuklab olish (FFmpeg siz!)
async function downloadInstagramAudio(chatId, userId, userLink) {
    const loadingMsg = await bot.sendMessage(chatId, "⏳ Audio yuklab olinmoqda...\n\nIltimos, kuting...");

    let videoPath = null;

    try {
        console.log(`[User: ${userId}] Instagram audio yuklab olinmoqda: ${userLink}`);
        const data = await instagramGetUrl(userLink);
        
        console.log(`[User: ${userId}] Ma'lumot olindi`);

        if (!data || !data.url_list || data.url_list.length === 0) {
            await bot.deleteMessage(chatId, loadingMsg.message_id);
            await bot.sendMessage(chatId, "❌ Media topilmadi!");
            return;
        }

        // Faqat video uchun audio ajratish
        if (!data.media_details || data.media_details[0].type !== 'video') {
            await bot.deleteMessage(chatId, loadingMsg.message_id);
            await bot.sendMessage(chatId, 
                "❌ Bu rasm! Audio faqat videolar uchun mavjud.\n\nIltimos, video bo'lgan Reel yoki post linkini yuboring."
            );
            return;
        }

        const videoUrl = data.url_list[0];
        
        // Vaqtinchalik fayl nomi
        videoPath = path.join(__dirname, `temp_video_${userId}_${Date.now()}.mp4`);

        // Videoni yuklab olish
        console.log(`[User: ${userId}] Video yuklab olinmoqda...`);
        const response = await axios({
            method: 'GET',
            url: videoUrl,
            responseType: 'stream',
            timeout: 60000
        });

        const writer = fs.createWriteStream(videoPath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        console.log(`[User: ${userId}] Video saqlandi, audio sifatida yuborilmoqda...`);

        // Yuklanish xabarini o'chirish
        await bot.deleteMessage(chatId, loadingMsg.message_id);

        // Video faylni audio sifatida yuborish
        const caption = data.post_info ? 
            `🎵 Audio yuklab olindi!\n\n👤 @${data.post_info.owner_username}\n❤️ ${data.post_info.likes || 0} likes\n\n⚠️ Bu to'liq audio (ovoz + musiqa)\n\n💡 Faqat musiqa kerakmi?\n🎼 "Faqat Musiqa" tugmasini bosing!\n\n📲 @InstaSaveBot` : 
            '🎵 Audio yuklab olindi!\n\n⚠️ Bu to\'liq audio (ovoz + musiqa)\n\n💡 Faqat musiqa kerakmi?\n🎼 "Faqat Musiqa" tugmasini bosing!\n\n📲 @InstaSaveBot';

        await bot.sendAudio(chatId, videoPath, {
            caption: caption,
            title: data.post_info ? `Audio from @${data.post_info.owner_username}` : 'Instagram Audio',
            performer: data.post_info ? `@${data.post_info.owner_username}` : 'Instagram'
        });

        console.log(`[User: ${userId}] Audio muvaffaqiyatli yuklandi`);

        // Faylni o'chirish
        cleanupFile(videoPath);

    } catch (error) {
        console.error(`[User: ${userId}] Audio download xatolik:`, error.message);
        
        try {
            await bot.deleteMessage(chatId, loadingMsg.message_id);
        } catch (e) {}

        if (videoPath) cleanupFile(videoPath);

        await bot.sendMessage(chatId, 
            `❌ Xatolik yuz berdi!\n\n💡 Sabablari:\n• Link noto'g'ri yoki mavjud emas\n• Post private (shaxsiy)\n• Video formatida emas\n• Fayl juda katta\n\nIltimos qaytadan urinib ko'ring!`
        );
    }
}

// Faqat musiqa uchun ko'rsatma
async function sendMusicOnlyGuide(chatId) {
    const guideMessage = `🎼 Faqat Musiqa ajratish

⚠️ Ovozni olib, faqat musiqani qoldirish uchun maxsus dasturlar kerak.

📱 Quyidagi BEPUL online servislardan foydalaning:

1️⃣ 🌐 vocalremover.org
   • Eng sodda va tezkor
   • Ovozni avtomatik olib tashlaydi
   • Sifati: Yaxshi ✅

2️⃣ 🌐 lalal.ai
   • Professional sifat
   • Bepul: 10 daqiqa/oyda
   • Sifati: A'lo ⭐⭐⭐

3️⃣ 🌐 moises.ai
   • Musiqiy asboblarni ham ajratadi
   • Bepul trial mavjud
   • Sifati: Professional 🎵

📋 Qanday qilish kerak:

1️⃣ Avval mendan 🎵 Audio formatda yuklab oling
2️⃣ Yuqoridagi saytlardan biriga kiring
3️⃣ Audio faylni yuklang
4️⃣ "Remove Vocals" yoki "Instrumental" ni tanlang
5️⃣ Tayyor musiqani yuklab oling! 🎉

💡 Maslahat: 
• vocalremover.org - Tez va oson
• lalal.ai - Eng yaxshi sifat

Savol bo'lsa @eosnwx ga murojaat qiling! 😊`;

    await bot.sendMessage(chatId, guideMessage, mainMenu);
}

// Inline tugmalarni boshqarish
bot.on('callback_query', async (callbackQuery) => {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;

    bot.answerCallbackQuery(callbackQuery.id);

    switch (data) {
        case 'download_video':
            const videoLink = userLinks.get(userId);

            if (!videoLink) {
                bot.sendMessage(chatId, "❌ Avval Instagram linkini yuboring!");
                return;
            }

            await downloadInstagramVideo(chatId, userId, videoLink);
            break;

        case 'download_audio':
            const audioLink = userLinks.get(userId);

            if (!audioLink) {
                bot.sendMessage(chatId, "❌ Avval Instagram linkini yuboring!");
                return;
            }

            await downloadInstagramAudio(chatId, userId, audioLink);
            break;

        case 'music_only_guide':
            await sendMusicOnlyGuide(chatId);
            break;

        case 'help':
            bot.sendMessage(chatId, 
`📖 Foydalanish bo'yicha qo'llanma:

1️⃣ Instagram linkini nusxa oling
2️⃣ Menga yuboring
3️⃣ Formatni tanlang:
   📥 Video - To'liq video
   🎵 Audio - Ovoz + musiqa (hamma)
   🎼 Faqat Musiqa - Ko'rsatma

✅ Qo'llab-quvvatlanadigan linklar:
📸 instagram.com/p/ABC123/
📸 instagram.com/reel/XYZ456/
📸 instagram.com/tv/VIDEO123/

⚠️ Eslatma: 
• Faqat public (ommaviy) postlarni yuklab olish mumkin
• Audio faqat videolar uchun ishlaydi (rasmlar uchun emas)
• Faqat musiqa uchun online servislardan foydalaning

💬 Savollar: @eosnwx`, mainMenu);
            break;

        default:
            bot.sendMessage(chatId, "❌ Noma'lum tugma bosildi");
    }
});

// Xatolarni boshqarish
bot.on('polling_error', (error) => {
    console.error('Polling xatolik:', error.message);
});

bot.on('error', (error) => {
    console.error('Bot xatolik:', error.message);
});

// Yangi foydalanuvchi kirganini log qilish
bot.on('message', (msg) => {
    if (msg.text && msg.text.startsWith('/start')) {
        console.log(`🆕 Yangi foydalanuvchi: ${msg.from.first_name} (@${msg.from.username || 'username yo\'q'}) - ID: ${msg.from.id}`);
    }
});