const fs = require('fs');
const path = require('path');

function backupDatabase() {
    const dbFile = 'siberian_health.db';
    const backupDir = './backups';
    
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `siberian_health_${timestamp}.db`);
    
    fs.copyFileSync(dbFile, backupFile);
    console.log(`✅ Бэкап создан: ${backupFile}`);
    
    // Удаляем старые бэкапы (старше 30 дней)
    const files = fs.readdirSync(backupDir);
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    
    for (const file of files) {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > thirtyDays) {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Удалён старый бэкап: ${file}`);
        }
    }
}

// Запускаем бэкап
backupDatabase();

// Планируем ежедневный бэкап (опционально)
setInterval(backupDatabase, 24 * 60 * 60 * 1000);