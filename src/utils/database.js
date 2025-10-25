import Database from 'better-sqlite3';

const db = new Database('nanur-barir-adventure.db');

// Check if the balance column exists, if so, rename it to wallet
const tableInfo = db.prepare("PRAGMA table_info(users)").all();
if (tableInfo.some(column => column.name === 'balance')) {
    db.exec('ALTER TABLE users RENAME COLUMN balance TO wallet');
}

// Add bank and bank_capacity columns if they don't exist
const columns = tableInfo.map(column => column.name);
if (!columns.includes('bank')) {
    db.exec('ALTER TABLE users ADD COLUMN bank INTEGER DEFAULT 0');
}
if (!columns.includes('bank_capacity')) {
    db.exec('ALTER TABLE users ADD COLUMN bank_capacity INTEGER DEFAULT 10000');
}


db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        wallet INTEGER DEFAULT 0,
        bank INTEGER DEFAULT 0,
        bank_capacity INTEGER DEFAULT 10000
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
        user = { id, wallet: 0, bank: 0, bank_capacity: 10000 };
    }
    return user;
}

function updateUserWallet(id, amount) {
    db.prepare('UPDATE users SET wallet = wallet + ? WHERE id = ?').run(amount, id);
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

function removeUserItem(id, item, quantity) {
    const existingItem = db.prepare('SELECT * FROM inventories WHERE user_id = ? AND item = ?').get(id, item);
    if (existingItem) {
        if (existingItem.quantity > quantity) {
            db.prepare('UPDATE inventories SET quantity = quantity - ? WHERE user_id = ? AND item = ?').run(quantity, id, item);
        } else {
            db.prepare('DELETE FROM inventories WHERE user_id = ? AND item = ?').run(id, item);
        }
    }
}

function clearUserInventory(id) {
    db.prepare('DELETE FROM inventories WHERE user_id = ?').run(id);
}

export default { getUser, updateUserWallet, getUserInventory, updateUserInventory, removeUserItem, clearUserInventory };
