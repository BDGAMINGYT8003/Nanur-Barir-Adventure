import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodes from '../data/nodes.json' assert { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const inventoriesPath = path.join(__dirname, '../data/inventories.json');

const sessions = new Map();

function loadInventories() {
    try {
        const data = fs.readFileSync(inventoriesPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

function saveInventories(inventories) {
    fs.writeFileSync(inventoriesPath, JSON.stringify(inventories, null, 4));
}

function updateUserInventory(userId, inventory) {
    const inventories = loadInventories();
    inventories[userId] = inventory;
    saveInventories(inventories);
}

function getUserInventory(userId) {
    const inventories = loadInventories();
    return inventories[userId] || [];
}

function createSession(userId) {
    const session = {
        userId,
        progress: 0,
        inventory: getUserInventory(userId),
        nodes: [...nodes].sort(() => Math.random() - 0.5).slice(0, 20),
    };
    sessions.set(userId, session);
    return session;
}

function getSession(userId) {
    return sessions.get(userId);
}

function advanceSession(userId) {
    const session = getSession(userId);
    if (!session) return null;

    session.progress++;
    if (session.progress >= session.nodes.length) {
        endSession(userId);
        return null;
    }
    return session;
}

function endSession(userId) {
    const session = getSession(userId);
    if (session) {
        updateUserInventory(userId, session.inventory);
        sessions.delete(userId);
    }
}

function getCurrentNode(userId) {
    const session = getSession(userId);
    if (!session) return null;
    return session.nodes[session.progress];
}

export { createSession, getSession, advanceSession, endSession, getCurrentNode, updateUserInventory, getUserInventory };
