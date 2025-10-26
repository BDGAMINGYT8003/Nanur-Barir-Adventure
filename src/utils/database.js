import Database from 'better-sqlite3';

const db = new Database('nanur-barir-adventure.db');

const tableInfo = db.prepare("PRAGMA table_info(users)").all();
const columns = tableInfo.map(column => column.name);

// Migrations
if (columns.includes('balance')) {
    db.exec('ALTER TABLE users RENAME COLUMN balance TO wallet');
}
if (!columns.includes('bank')) {
    db.exec('ALTER TABLE users ADD COLUMN bank INTEGER DEFAULT 0');
}
if (!columns.includes('bank_capacity')) {
    db.exec('ALTER TABLE users ADD COLUMN bank_capacity INTEGER DEFAULT 10000');
}
if (!columns.includes('last_adventure')) {
    db.exec("ALTER TABLE users ADD COLUMN last_adventure TEXT DEFAULT 'spooky_adventure'");
}


db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        wallet INTEGER DEFAULT 0,
        bank INTEGER DEFAULT 0,
        bank_capacity INTEGER DEFAULT 10000,
        last_adventure TEXT DEFAULT 'spooky_adventure'
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
        user = { id, wallet: 0, bank: 0, bank_capacity: 10000, last_adventure: 'spooky_adventure' };
    }
    return user;
}

function updateUserWallet(id, amount) {
    db.prepare('UPDATE users SET wallet = wallet + ? WHERE id = ?').run(amount, id);
}

function updateUserLastAdventure(id, adventure) {
    db.prepare('UPDATE users SET last_adventure = ? WHERE id = ?').run(adventure, id);
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

export default { getUser, updateUserWallet, getUserInventory, updateUserInventory, removeUserItem, clearUserInventory, updateUserLastAdventure };
