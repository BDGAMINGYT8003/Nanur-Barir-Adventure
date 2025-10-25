import db from './database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const nodesPath = path.join(__dirname, '../data/nodes.json');
const nodes = JSON.parse(fs.readFileSync(nodesPath, 'utf8'));

const interactiveNodes = nodes.filter(n => n.type === 'INTERACTIVE');
const nonInteractiveNodes = nodes.filter(n => n.type === 'NON_INTERACTIVE');

const sessions = new Map();

function createSession(userId) {
    db.getUser(userId);

    const interactiveCount = Math.floor(Math.random() * 5) + 8; // 8-12
    const nonInteractiveCount = 20 - interactiveCount;

    const sessionNodes = [];

    // Get random interactive nodes
    const interactiveShuffled = [...interactiveNodes].sort(() => 0.5 - Math.random());
    sessionNodes.push(...interactiveShuffled.slice(0, interactiveCount));

    // Get random non-interactive nodes
    const nonInteractiveShuffled = [...nonInteractiveNodes].sort(() => 0.5 - Math.random());
    sessionNodes.push(...nonInteractiveShuffled.slice(0, nonInteractiveCount));

    // Shuffle the final list of nodes
    sessionNodes.sort(() => 0.5 - Math.random());

    const session = {
        userId,
        progress: 0,
        inventory: [],
        rewards: {
            coins: 0,
        },
        lostItems: [],
        ended: false,
        nodes: sessionNodes,
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
        session.ended = true;
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
