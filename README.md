# 🛡️ Agentic Intent Firewall (AIF)

Enterprise-grade intent validation, velocity tracking, rate-limiting, and escrow state machine firewall designed for AI agent commerce and automated workflows (UCP/ACP).

## 🚀 Core Features

* **Risk Scoring Engine:** Evaluates incoming agent intents based on custom policies (e.g., high-risk SKUs, excessive quantities) to assign dynamic threat scores.
* **Escrow State Machine (Human-in-the-Loop):** Automatically traps high-risk transactions (Score > 50) into an isolated `ESCROW_HOLD` buffer, requiring a human operator to approve or deny via the Operations Command Center.
* **Cryptographic Audit Logging:** Generates immutable SHA-256 ledger hashes for every human intervention, ensuring absolute accountability.
* **Circuit Breaker & Rate Limiter:** Protects downstream APIs from localized agent velocity attacks and cascading failures.
* **Live Webhooks:** Dispatches instant alerts for security intercepts.

## 🛠️ Tech Stack
* **Language:** TypeScript / Node.js
* **Framework:** Express.js
* **Validation:** Zod
* **Security:** Native Node Crypto (SHA-256)

## 📦 Quick Start

### Installation
\`\`\`bash
git clone https://github.com/Concierge21/agentic-intent-firewall.git
cd agentic-intent-firewall
npm install
\`\`\`

### Run the Server
\`\`\`bash
npm run build
node dist/server.js
\`\`\`

### Test the Firewall
Fire a high-risk payload to trigger the Escrow Machine:
\`\`\`bash
curl -X POST http://localhost:3000/api/checkout -H "Content-Type: application/json" -d "{\"action\":\"initiate_checkout\",\"items\":[{\"sku\":\"SKU-999\",\"quantity\":100}]}"
\`\`\`
Visit `http://localhost:3000` to view the Operations Command Center, approve the transaction, and view the generated cryptographic hash in the terminal.

## 📄 License
ISC