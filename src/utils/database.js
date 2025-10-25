import Database from 'better-sqlite3';

const db = new Database('nanur-barir-adventure.db', { verbose: console.log });

// Create tables if they don't exist
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        balance INTEGER DEFAULT 0
    );
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS inventories (
        user_id TEXT,
        item TEXT,
        quantity INTEGER DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
`);

function getUser(id) {
    let user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
        db.prepare('INSERT INTO users (id) VALUES (?)').run(id);
        user = { id, balance: 0 };
    }
    return user;
}

function updateUserBalance(id, amount) {
    db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(amount, id);
}

function getUserInventory(id) {
    return db.prepare('SELECT item, quantity FROM inventories WHERE user_id = ?').all(id);
}

function updateUserInventory(id, item, quantity) {
    const existingItem = db.prepare('SELECT * FROM inventories WHERE user_id = ? AND item = ?').get(id, item);
    if (existingItem) {
        db.prepare('UPDATE inventories SET quantity = quantity + ? WHERE user_id = ? AND item = ?').run(quantity, id, item);
    } else {
        db.prepare('INSERT INTO inventories (user_id, item, quantity) VALUES (?, ?, ?)').run(id, item, quantity);
    }
}

function clearUserInventory(id) {
    db.prepare('DELETE FROM inventories WHERE user_id = ?').run(id);
}

export default { getUser, updateUserBalance, getUserInventory, updateUserInventory, clearUserInventory };
