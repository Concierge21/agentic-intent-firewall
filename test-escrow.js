const crypto = require('crypto');

async function testFirewall() {
    const url = 'http://localhost:3000/ucp/v1/checkout';
    
    // Formatted to pass the Day 12 Zod Schema with the required 'sku' and 'item' fields
    // High quantity (30) and amount (1500) will trigger the Day 13 Escrow Vault
    const payload = { 
        action: "PURCHASE",
        agentId: "agent-007",
        items: [
            { 
                sku: "GPU-COMP-01", 
                item: "Bulk GPU Compute", 
                quantity: 30, 
                amount: 1500 
            }
        ]
    };

    console.log("🤖 Agent: Initiating high-risk transaction...");

    // 1. Initial request to get the challenge nonce
    let res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    let data = await res.json();
    const nonce = data.challenge?.nonce;

    if (!nonce) {
        console.log("No nonce received. Server response:", data);
        return;
    }

    console.log(`🔐 Agent: Received nonce challenge: ${nonce.substring(0, 15)}...`);

    // 2. Sign the nonce (using the standard firewall secret)
    const secretKey = process.env.AIF_SECRET_KEY || 'super-secret-key'; 
    const signedToken = crypto.createHmac('sha256', secretKey).update(nonce).digest('hex');

    // 3. Send the final request with the signed token
    console.log("🚀 Agent: Submitting signed payload...");
    res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-aif-intent-token': signedToken
        },
        body: JSON.stringify(payload)
    });

    const finalResult = await res.json();
    console.log("\n🛡️ Firewall Decision:", finalResult);
}

testFirewall();