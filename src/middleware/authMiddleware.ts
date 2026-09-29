import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

// FIX: Point directly to the root src/config folder
const agentsFilePath = path.join(process.cwd(), 'src/config/agents.json');

function getAuthorizedAgents() {
  try {
    const data = fs.readFileSync(agentsFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('⚠️ [Auth Error] Could not load agents.json at:', agentsFilePath);
    return {};
  }
}

export function authenticateAgent(req: Request, res: Response, next: NextFunction) {
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

  (req as any).agent = agent;
  console.log(`🔑 [AUTH SUCCESS] Agent Verified: ${agent.name} (${agent.role})`);
  next();
}