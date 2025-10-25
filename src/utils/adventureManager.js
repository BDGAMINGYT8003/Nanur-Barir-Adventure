import db from './database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const nodesPath = path.join(__dirname, '../data/nodes.json');
const nodes = JSON.parse(fs.readFileSync(nodesPath, 'utf8'));

const sessions = new Map();

function createSession(userId) {
    db.getUser(userId);
    const session = {
        userId,
        progress: 0,
        inventory: db.getUserInventory(userId).map(i => `${i.item} (x${i.quantity})`),
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
    sessions.delete(userId);
}

function getCurrentNode(userId) {
    const session = getSession(userId);
    if (!session) return null;
    return session.nodes[session.progress];
}

export { createSession, getSession, advanceSession, endSession, getCurrentNode };
