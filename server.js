const TelegramBot = require('node-telegram-bot-api');
const { instagramGetUrl } = require('instagram-url-direct');

// Telegram bot tokeningizni bu yerga yozing
const token = '8503840419:AAGy4jhdNVXpvE30cP2eAEXHCjleLXu-mpU';
const bot = new TelegramBot(token, { polling: true });

// Har bir foydalanuvchi uchun oxirgi linkni saqlash
const userLinks = new Map();

// Asosiy menyu tugmalari
const mainMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: "📥 Download", callback_data: "download_media" }],
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

// Bot ishga tushgani haqida xabar (faqat konsol)
console.log('✅ Bot ishga tushdi va GLOBAL rejimda ishlaydi!');
console.log('🌍 Barcha foydalanuvchilar botdan foydalanishi mumkin!');

// /start komandasi - BARCHA foydalanuvchilar uchun
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || 'Foydalanuvchi';

    bot.sendMessage(chatId, 
`👋 Salom, ${firstName}!

Men InstaSaveBotman - Instagram yuklab olish boti.

📥 Men Instagram post, Reels va TV videolarini yuklab bera olaman.

🔗 Shunchaki Instagram linkini yuboring va "Download" tugmasini bosing!

⚡ Tezkor, bepul va oson!`, mainMenu);
});

// /help komandasi - BARCHA foydalanuvchilar uchun
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, 
`📖 Foydalanish bo'yicha qo'llanma:

1️⃣ Instagram linkini nusxa oling
2️⃣ Menga yuboring
3️⃣ "Download" tugmasini bosing
4️⃣ Mediani yuklab oling!

✅ Qo'llab-quvvatlanadigan linklar:
• Post: instagram.com/p/ABC123/
• Reels: instagram.com/reel/XYZ456/
• TV: instagram.com/tv/VIDEO123/

⚠️ Eslatma: Faqat public (ommaviy) postlarni yuklab olish mumkin.

💬 Savollar: @your_support_username`, mainMenu);
});

// /stats komandasi - statistika (istalgan joyda)
bot.onText(/\/stats/, (msg) => {
    const chatId = msg.chat.id;
    const totalUsers = userLinks.size;

    bot.sendMessage(chatId, 
`📊 Bot statistikasi:

👥 Foydalanuvchilar: ${totalUsers}
🔗 Saqlanganlar: ${userLinks.size}
⚡ Status: Faol`);
});

// Instagram linkini qabul qilish - BARCHA foydalanuvchilar uchun
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const userId = msg.from.id;

    // Komandalarni o'tkazib yuborish
    if (text && text.startsWith('/')) return;

    if (text && isInstagramLink(text)) {
        const cleanedUrl = cleanInstagramUrl(text);
        
        // Har bir foydalanuvchi uchun linkni saqlash
        userLinks.set(userId, cleanedUrl);

        bot.sendMessage(chatId, 
`✅ Link qabul qilindi!

🔗 ${cleanedUrl}

"Download" tugmasini bosing 👇`, mainMenu);
    } else if (text) {
        bot.sendMessage(chatId, 
`❌ Iltimos, faqat Instagram linkini yuboring!

📝 To'g'ri format:
• https://www.instagram.com/p/ABC123/
• https://www.instagram.com/reel/XYZ456/

Qaytadan urinib ko'ring 👇`, mainMenu);
    }
});

// Inline tugmalarni boshqarish - BARCHA foydalanuvchilar uchun
bot.on('callback_query', async (callbackQuery) => {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;

    // Tugma bosilganini tasdiqlash
    bot.answerCallbackQuery(callbackQuery.id);

    switch (data) {
        case 'download_media':
            // Foydalanuvchining linkini olish
            const userLink = userLinks.get(userId);

            if (!userLink) {
                bot.sendMessage(chatId, "❌ Avval Instagram linkini yuboring!");
                return;
            }

            // Yuklab olish jarayonini boshlash
            const loadingMsg = await bot.sendMessage(chatId, "⏳ Yuklab olinmoqda...\n\nIltimos, kuting...");

            try {
                // Instagram media ma'lumotlarini olish
                console.log(`[User: ${userId}] Yuklab olinmoqda: ${userLink}`);
                const data = await instagramGetUrl(userLink);
                
                console.log(`[User: ${userId}] Ma'lumot olindi`);

                // Yuklanish xabarini o'chirish
                await bot.deleteMessage(chatId, loadingMsg.message_id);

                // Media turini aniqlash
                if (data && data.url_list && data.url_list.length > 0) {
                    
                    // Birinchi media URL
                    const mediaUrl = data.url_list[0];
                    
                    // Post ma'lumotlari
                    const caption = data.post_info ? 
                        `✅ Yuklab olindi!\n\n👤 @${data.post_info.owner_username}\n❤️ ${data.post_info.likes || 0} likes\n\n📲 @InstaSaveBot` : 
                        '✅ Yuklab olindi!\n\n📲 @InstaSaveBot';

                    // Media turini aniqlash
                    if (data.media_details && data.media_details.length > 0) {
                        const mediaType = data.media_details[0].type;
                        
                        if (mediaType === 'video') {
                            // Video yuborish
                            await bot.sendVideo(chatId, mediaUrl, { 
                                caption: caption,
                                supports_streaming: true 
                            });
                        } else {
                            // Rasm yuborish
                            await bot.sendPhoto(chatId, mediaUrl, { 
                                caption: caption 
                            });
                        }
                    } else {
                        // Agar turi aniqlanmasa, URL yuborish
                        await bot.sendMessage(chatId, `${caption}\n\n🔗 ${mediaUrl}`);
                    }

                    // Agar bir nechta rasm/video bo'lsa (maksimum 5 ta)
                    if (data.results_number > 1) {
                        await bot.sendMessage(chatId, 
                            `ℹ️ Bu postda ${data.results_number} ta media bor.`
                        );

                        // Qolgan medialarni yuborish (maksimum 5 ta)
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

                    console.log(`[User: ${userId}] Muvaffaqiyatli yuklandi`);

                } else {
                    await bot.sendMessage(chatId, 
                        "❌ Media topilmadi!\n\nIltimos:\n• Link to'g'ri ekanligini tekshiring\n• Post public (ommaviy) ekanligini tekshiring\n• Qaytadan urinib ko'ring"
                    );
                }

            } catch (error) {
                console.error(`[User: ${userId}] Download xatolik:`, error.message);
                
                // Yuklanish xabarini o'chirish
                try {
                    await bot.deleteMessage(chatId, loadingMsg.message_id);
                } catch (e) {}

                // Xatolik xabari
                await bot.sendMessage(chatId, 
                    `❌ Xatolik yuz berdi!\n\n💡 Sabablari:\n• Link noto'g'ri yoki mavjud emas\n• Post private (shaxsiy)\n• Instagram tizimida muammo\n\nIltimos qaytadan urinib ko'ring!`
                );
            }
            break;

        case 'help':
            bot.sendMessage(chatId, 
`📖 Foydalanish bo'yicha qo'llanma:

1️⃣ Instagram linkini nusxa oling
2️⃣ Menga yuboring
3️⃣ "Download" tugmasini bosing
4️⃣ Mediani yuklab oling!

✅ Qo'llab-quvvatlanadigan linklar:
• Post: instagram.com/p/ABC123/
• Reels: instagram.com/reel/XYZ456/
• TV: instagram.com/tv/VIDEO123/

⚠️ Eslatma: Faqat public (ommaviy) postlarni yuklab olish mumkin.

💬 Savollar: @your_support_username`, mainMenu);
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