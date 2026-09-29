"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateAgent = authenticateAgent;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// FIX: Point directly to the root src/config folder
const agentsFilePath = path_1.default.join(process.cwd(), 'src/config/agents.json');
function getAuthorizedAgents() {
    try {
        const data = fs_1.default.readFileSync(agentsFilePath, 'utf8');
        return JSON.parse(data);
    }
    catch (error) {
        console.error('⚠️ [Auth Error] Could not load agents.json at:', agentsFilePath);
        return {};
    }
}
function authenticateAgent(req, res, next) {
    const apiKey = req.header('x-api-key');
    if (!apiKey) {
        console.log(`🔒 [AUTH BLOCKED] Missing API Key from IP: ${req.ip}`);
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Missing x-api-key header.' });
    }
    const agents = getAuthorizedAgents();
    const agent = agents[apiKey];
    if (!agent) {
        console.log(`🔒 [AUTH BLOCKED] Invalid API Key attempted: ${apiKey.substring(0, 8)}...`);
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Invalid API Key.' });
    }
    req.agent = agent;
    console.log(`🔑 [AUTH SUCCESS] Agent Verified: ${agent.name} (${agent.role})`);
    next();
}
