// firebase-config.js
const firebaseConfig = {
  apiKey: "AIzaSyDNAyhui3Lc_IX0wuot7_Z6Vdf9Bw5A9mE",
  authDomain: "metro-new-85226.firebaseapp.com",
  databaseURL: "https://metro-new-85226-default-rtdb.firebaseio.com",
  projectId: "metro-new-85226",
  storageBucket: "metro-new-85226.firebasestorage.app",
  messagingSenderId: "905640751733",
  appId: "1:905640751733:web:f1ab3a1b119ca1e245fe3c"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);

// Экспорт сервисов
const auth = firebase.auth();
const database = firebase.database();
const storage = firebase.storage();

// Вспомогательные функции
function showMessage(message, type = 'info') {
    const msgDiv = document.createElement('div');
    msgDiv.className = `alert alert-${type}`;
    msgDiv.textContent = message;
    document.body.appendChild(msgDiv);
    setTimeout(() => msgDiv.remove(), 5000);
}

function getCurrentUser() {
    return auth.currentUser;
}

function isLoggedIn() {
    return !!auth.currentUser;
}

function isEmailVerified() {
    const user = auth.currentUser;
    return user && user.emailVerified;
}

function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Генерация случайного токена
function generateToken(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

// Проверка прав администратора
async function isAdmin() {
    const user = getCurrentUser();
    if (!user) return false;
    
    try {
        const userRef = database.ref('users/' + user.uid);
        const snapshot = await userRef.once('value');
        const userData = snapshot.val();
        return userData && userData.role === 'admin';
    } catch (error) {
        console.error('Ошибка проверки прав:', error);
        return false;
    }
}

// Отправка уведомления в Discord
async function sendDiscordNotification(ticketData, type = 'new_ticket') {
    const webhookUrl = 'https://discord.com/api/webhooks/1403319710002581534/XPtUxoDGASHH2KTi6K3sz4cT0pOKlr9xV_qWmTVXh91XdrsXbWrgXt6E8Wd3JouptUQx';
    
    let embed = {};
    
    switch(type) {
        case 'new_ticket':
            embed = {
                title: "🎫 НОВАЯ ЗАЯВКА",
                color: 0x0066CC,
                fields: [
                    { name: "Номер", value: ticketData.id, inline: true },
                    { name: "Пользователь", value: ticketData.userEmail, inline: true },
                    { name: "Тема", value: ticketData.subject.substring(0, 100), inline: false },
                    { name: "Категория", value: ticketData.category, inline: true },
                    { name: "Приоритет", value: ticketData.priority, inline: true }
                ],
                timestamp: new Date().toISOString()
            };
            break;
            
        case 'new_message':
            embed = {
                title: "💬 НОВОЕ СООБЩЕНИЕ",
                color: 0x28A745,
                fields: [
                    { name: "Заявка", value: ticketData.ticketId, inline: true },
                    { name: "От", value: ticketData.senderEmail, inline: true },
                    { name: "Тип", value: ticketData.senderType, inline: true },
                    { name: "Сообщение", value: ticketData.message.substring(0, 200), inline: false }
                ],
                timestamp: new Date().toISOString()
            };
            break;
    }
    
    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [embed] })
        });
    } catch (error) {
        console.log('Discord notification failed:', error);
    }
}

// Проверка входа при загрузке страницы
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('Пользователь вошел:', user.email);
        localStorage.setItem('userId', user.uid);
        localStorage.setItem('userEmail', user.email);
        
        // Обновление lastSeen
        database.ref('users/' + user.uid + '/lastSeen').set(Date.now());
    } else {
        console.log('Пользователь вышел');
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
    }
});
