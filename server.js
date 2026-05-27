// server.js - полный сервер с API
const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Инициализация БД
const db = new Database('siberian_health.db');

// Создаём таблицы
function initDatabase() {
  // Таблица товаров
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      image TEXT,
      volume TEXT,
      price INTEGER,
      isNew INTEGER DEFAULT 0,
      promoLabel TEXT,
      stock TEXT DEFAULT 'В наличии',
      description TEXT,
      isPopular INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Таблица заказов
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      fullname TEXT NOT NULL,
      phone TEXT NOT NULL,
      delivery TEXT NOT NULL,
      address TEXT,
      subtotal INTEGER NOT NULL,
      discount INTEGER DEFAULT 0,
      total INTEGER NOT NULL,
      date TEXT NOT NULL,
      status TEXT DEFAULT 'new',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Таблица товаров в заказе
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      category TEXT,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );
  `);

  // Таблица сообщений
  db.exec(`
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT NOT NULL,
      date TEXT NOT NULL,
      isRead INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Таблица для сессий/токенов админа (опционально)
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE,
      expiresAt TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✅ База данных инициализирована');
}

// ========== API ТОВАРОВ ==========

// Получить все товары
app.get('/api/products', (req, res) => {
  try {
    const products = db.prepare('SELECT * FROM products ORDER BY createdAt DESC').all();
    res.json(products);
  } catch (error) {
    console.error('Ошибка получения товаров:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить популярные товары (для главной)
app.get('/api/products/popular', (req, res) => {
  try {
    const products = db.prepare('SELECT * FROM products WHERE isPopular = 1 LIMIT 8').all();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить один товар
app.get('/api/products/:id', (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Товар не найден' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Добавить товар
app.post('/api/products', (req, res) => {
  try {
    const { id, name, category, price, volume, image, stock, description, isPopular, promoLabel } = req.body;
    
    const stmt = db.prepare(`
      INSERT INTO products (id, name, category, price, volume, image, stock, description, isPopular, promoLabel)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id, name, category, price, volume, image, 
      stock, description, isPopular ? 1 : 0, promoLabel || ''
    );
    
    res.json({ success: true, message: 'Товар добавлен', id });
  } catch (error) {
    console.error('Ошибка добавления товара:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить товар
app.put('/api/products/:id', (req, res) => {
  try {
    const { stock, isPopular, price, name, description } = req.body;
    const id = req.params.id;
    
    const updates = [];
    const params = [];
    
    if (stock !== undefined) {
      updates.push('stock = ?');
      params.push(stock);
    }
    if (isPopular !== undefined) {
      updates.push('isPopular = ?');
      params.push(isPopular ? 1 : 0);
    }
    if (price !== undefined) {
      updates.push('price = ?');
      params.push(price);
    }
    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    
    updates.push('updatedAt = CURRENT_TIMESTAMP');
    params.push(id);
    
    const stmt = db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...params);
    
    res.json({ success: true, message: 'Товар обновлён' });
  } catch (error) {
    console.error('Ошибка обновления товара:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удалить товар
app.delete('/api/products/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM products WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true, message: 'Товар удалён' });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ========== API ЗАКАЗОВ ==========

// Получить все заказы
app.get('/api/orders', (req, res) => {
  try {
    const orders = db.prepare('SELECT * FROM orders ORDER BY date DESC').all();
    
    // Добавляем товары к каждому заказу
    for (const order of orders) {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
      order.items = items;
    }
    
    res.json(orders);
  } catch (error) {
    console.error('Ошибка получения заказов:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать заказ
app.post('/api/orders', (req, res) => {
  try {
    const { id, fullname, phone, delivery, address, subtotal, discount, total, date, items } = req.body;
    
    // Начинаем транзакцию
    const insertOrder = db.transaction(() => {
      // Добавляем заказ
      const orderStmt = db.prepare(`
        INSERT INTO orders (id, fullname, phone, delivery, address, subtotal, discount, total, date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      orderStmt.run(id, fullname, phone, delivery, address || '', subtotal, discount, total, date);
      
      // Добавляем товары заказа
      const itemStmt = db.prepare(`
        INSERT INTO order_items (order_id, product_id, name, price, quantity, category)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      for (const item of items) {
        itemStmt.run(id, item.id, item.name, item.price, item.quantity, item.category);
      }
    });
    
    insertOrder();
    
    res.json({ success: true, message: 'Заказ создан', id });
  } catch (error) {
    console.error('Ошибка создания заказа:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить статус заказа
app.patch('/api/orders/:id', (req, res) => {
  try {
    const { status } = req.body;
    const stmt = db.prepare('UPDATE orders SET status = ? WHERE id = ?');
    stmt.run(status, req.params.id);
    res.json({ success: true, message: 'Статус заказа обновлён' });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ========== API ОБРАТНОЙ СВЯЗИ ==========

// Получить все сообщения
app.get('/api/feedback', (req, res) => {
  try {
    const messages = db.prepare('SELECT * FROM feedback ORDER BY date DESC').all();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Добавить сообщение
app.post('/api/feedback', (req, res) => {
  try {
    const { id, name, email, message, date } = req.body;
    
    const stmt = db.prepare(`
      INSERT INTO feedback (id, name, email, message, date)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, name, email, message, date);
    
    res.json({ success: true, message: 'Сообщение отправлено', id });
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Отметить сообщение как прочитанное
app.patch('/api/feedback/:id', (req, res) => {
  try {
    const stmt = db.prepare('UPDATE feedback SET isRead = 1 WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ========== СТАТИСТИКА ==========

// Получить статистику для админ-панели
app.get('/api/stats', (req, res) => {
  try {
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get();
    const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get();
    const totalFeedback = db.prepare('SELECT COUNT(*) as count FROM feedback').get();
    const totalRevenue = db.prepare('SELECT SUM(total) as sum FROM orders').get();
    const recentOrders = db.prepare('SELECT COUNT(*) as count FROM orders WHERE date > datetime("now", "-7 days")').get();
    
    res.json({
      products: totalProducts.count,
      orders: totalOrders.count,
      feedback: totalFeedback.count,
      revenue: totalRevenue.sum || 0,
      recentOrders: recentOrders.count
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ========== МИГРАЦИЯ ДАННЫХ ИЗ db.json ==========

function migrateData() {
  try {
    if (fs.existsSync('db.json')) {
      const data = JSON.parse(fs.readFileSync('db.json', 'utf8'));
      
      // Проверяем, есть ли уже данные
      const existingProducts = db.prepare('SELECT COUNT(*) as count FROM products').get();
      
      if (existingProducts.count === 0 && data.products && data.products.length > 0) {
        console.log('🔄 Миграция данных из db.json...');
        
        const insertProduct = db.prepare(`
          INSERT OR REPLACE INTO products 
          (id, name, category, image, volume, price, isNew, promoLabel, stock, description, isPopular)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const product of data.products) {
          insertProduct.run(
            product.id,
            product.name,
            product.category,
            product.image,
            product.volume,
            product.price,
            product.isNew ? 1 : 0,
            product.promoLabel || '',
            product.stock,
            product.description,
            product.isPopular ? 1 : 0
          );
        }
        
        // Миграция заказов
        if (data.orders && data.orders.length > 0) {
          const insertOrder = db.prepare(`
            INSERT OR REPLACE INTO orders (id, fullname, phone, delivery, address, subtotal, discount, total, date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          for (const order of data.orders) {
            insertOrder.run(
              order.id, order.fullname, order.phone, order.delivery,
              order.address || '', order.subtotal, order.discount, order.total, order.date
            );
            
            if (order.items) {
              const insertItem = db.prepare(`
                INSERT INTO order_items (order_id, product_id, name, price, quantity, category)
                VALUES (?, ?, ?, ?, ?, ?)
              `);
              
              for (const item of order.items) {
                insertItem.run(order.id, item.id, item.name, item.price, item.quantity, item.category);
              }
            }
          }
        }
        
        // Миграция сообщений
        if (data.feedback && data.feedback.length > 0) {
          const insertFeedback = db.prepare(`
            INSERT OR REPLACE INTO feedback (id, name, email, message, date)
            VALUES (?, ?, ?, ?, ?)
          `);
          
          for (const msg of data.feedback) {
            insertFeedback.run(msg.id, msg.name, msg.email, msg.message, msg.date);
          }
        }
        
        console.log('✅ Миграция данных завершена!');
      }
    }
  } catch (error) {
    console.error('Ошибка миграции:', error);
  }
}

// ========== ЗАПУСК СЕРВЕРА ==========

initDatabase();
migrateData();

// Запуск сервера на всех интерфейсах (нужно для Render)
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║   🍃 Сибирское здоровье - Сервер     ║
  ╠═══════════════════════════════════════╣
  ║   📡 Порт: ${PORT}                       ║
  ║   💾 База: SQLite (siberian_health.db) ║
  ╚═══════════════════════════════════════╝
  `);
});