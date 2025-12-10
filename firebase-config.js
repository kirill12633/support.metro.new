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

// Проверяем, есть ли сохраненная сессия
const savedUser = localStorage.getItem('metroUser');

// Вспомогательные функции
function showMessage(message, type = 'info') {
    const msgDiv = document.createElement('div');
    msgDiv.className = `alert alert-${type}`;
    msgDiv.textContent = message;
    document.body.appendChild(msgDiv);
    setTimeout(() => msgDiv.remove(), 5000);
}

// Асинхронная функция для получения текущего пользователя
async function getCurrentUser() {
    return new Promise((resolve) => {
        // Проверяем localStorage сначала для быстрого ответа
        if (localStorage.getItem('metroUser')) {
            try {
                const savedUser = JSON.parse(localStorage.getItem('metroUser'));
                if (savedUser && savedUser.uid) {
                    resolve({
                        uid: savedUser.uid,
                        email: savedUser.email,
                        emailVerified: savedUser.emailVerified || false,
                        ...savedUser
                    });
                    return;
                }
            } catch (e) {
                console.log('Error parsing saved user:', e);
            }
        }
        
        // Если нет в localStorage, ждем Firebase
        const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();
            if (user) {
                // Сохраняем в localStorage
                const userData = {
                    uid: user.uid,
                    email: user.email,
                    emailVerified: user.emailVerified,
                    displayName: user.displayName
                };
                localStorage.setItem('metroUser', JSON.stringify(userData));
                localStorage.setItem('userId', user.uid);
                localStorage.setItem('userEmail', user.email);
            } else {
                // Очищаем localStorage если пользователь вышел
                localStorage.removeItem('metroUser');
                localStorage.removeItem('userId');
                localStorage.removeItem('userEmail');
            }
            resolve(user);
        });
    });
}

function isLoggedIn() {
    return !!localStorage.getItem('metroUser');
}

function isEmailVerified() {
    const userData = localStorage.getItem('metroUser');
    if (!userData) return false;
    
    try {
        const user = JSON.parse(userData);
        return user.emailVerified || false;
    } catch (e) {
        return false;
    }
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
    const user = await getCurrentUser();
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

// Автоматическое обновление последнего входа
auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log('Пользователь вошел:', user.email);
        
        // Сохраняем в localStorage
        const userData = {
            uid: user.uid,
            email: user.email,
            emailVerified: user.emailVerified,
            displayName: user.displayName
        };
        localStorage.setItem('metroUser', JSON.stringify(userData));
        localStorage.setItem('userId', user.uid);
        localStorage.setItem('userEmail', user.email);
        
        try {
            // Обновление lastSeen в базе данных
            const userRef = database.ref('users/' + user.uid);
            await userRef.update({
                lastSeen: firebase.database.ServerValue.TIMESTAMP,
                emailVerified: user.emailVerified
            });
            
            // Обновляем emailVerified если изменилось
            const userDataSnapshot = await userRef.once('value');
            const userDataFromDB = userDataSnapshot.val();
            
            if (userDataFromDB) {
                // Сохраняем дополнительные данные из базы
                const updatedUserData = {
                    ...userData,
                    username: userDataFromDB.username,
                    role: userDataFromDB.role
                };
                localStorage.setItem('metroUser', JSON.stringify(updatedUserData));
            }
        } catch (error) {
            console.error('Ошибка обновления lastSeen:', error);
        }
    } else {
        console.log('Пользователь вышел');
        localStorage.removeItem('metroUser');
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
    }
});

// Функция для ожидания инициализации пользователя
async function waitForUser(timeout = 5000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const checkUser = () => {
            const user = auth.currentUser;
            if (user) {
                resolve(user);
            } else if (Date.now() - startTime > timeout) {
                reject(new Error('Timeout waiting for user'));
            } else {
                setTimeout(checkUser, 100);
            }
        };
        
        checkUser();
    });
}

// Функция для защиты страниц (использовать в начале скрипта каждой защищенной страницы)
async function protectPage(requireEmailVerification = false, redirectTo = 'login.html') {
    try {
        // Ждем инициализацию Firebase
        const user = await getCurrentUser();
        
        if (!user) {
            showMessage('Пожалуйста, войдите в систему', 'error');
            setTimeout(() => {
                window.location.href = redirectTo;
            }, 1500);
            return null;
        }
        
        if (requireEmailVerification && !user.emailVerified) {
            showMessage('Пожалуйста, подтвердите ваш email', 'warning');
            return null;
        }
        
        return user;
    } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
        showMessage('Ошибка авторизации', 'error');
        setTimeout(() => {
            window.location.href = redirectTo;
        }, 1500);
        return null;
    }
}

// Функция для обновления данных пользователя на всех страницах
function updateUserInfoOnPage() {
    const userInfoElements = document.querySelectorAll('#userInfo');
    
    if (userInfoElements.length > 0) {
        getCurrentUser().then(user => {
            userInfoElements.forEach(element => {
                if (user) {
                    element.innerHTML = `
                        <span>${user.email}</span>
                        <button onclick="logout()" class="btn btn-secondary">
                            <i class="fas fa-sign-out-alt"></i>
                            Выйти
                        </button>
                    `;
                } else {
                    element.innerHTML = `
                        <a href="login.html" class="nav-link">Войти</a>
                        <a href="register.html" class="btn">Регистрация</a>
                    `;
                }
            });
        });
    }
}

// Функция выхода
function logout() {
    auth.signOut().then(() => {
        // Очищаем localStorage
        localStorage.removeItem('metroUser');
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
        
        showMessage('Вы вышли из системы', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }).catch((error) => {
        console.error('Ошибка выхода:', error);
        showMessage('Ошибка при выходе', 'error');
    });
}

// Автоматическое обновление информации о пользователе при загрузке страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(updateUserInfoOnPage, 100); // Небольшая задержка для Firebase
    });
} else {
    setTimeout(updateUserInfoOnPage, 100);
}
