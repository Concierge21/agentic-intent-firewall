import fs from 'fs';
import path from 'path';

// Resolve the path to your existing config file
const policyPath = path.join(process.cwd(), 'src/config/policies.json');

// Default fallback policy matching your exact JSON structure
export let activePolicy = {
  thresholds: {
    medium: 30,
    high: 50
  },
  rules: {
    highRiskSkus: ["SKU-999", "SKU-RESTRICTED-01"],
    maxQuantityThreshold: 5
  },
  weights: {
    highRiskSku: 30,
    excessQuantity: 30
  }
};

// Function to read and parse the policy file
export const loadPolicy = () => {
  try {
    const data = fs.readFileSync(policyPath, 'utf8');
    activePolicy = JSON.parse(data);
    console.log(`✅ [Policy Engine] Successfully loaded src/config/policies.json`);
  } catch (error) {
    console.error('❌ [Policy Engine] Failed to load policies.json, using defaults.', error);
  }
};

// Function to watch the file for live changes
export const watchPolicy = () => {
  fs.watchFile(policyPath, { interval: 1000 }, (curr, prev) => {
    console.log('🔄 [Policy Engine] Detected changes in policies.json. Hot-reloading...');
    loadPolicy();
  });
};

// Automatically initialize loading and watching on boot
loadPolicy();
watchPolicy();

// Policy Engine object containing the evaluate method required by server.ts
export const policyEngine = {
  evaluate(payload: any) {
    let score = 0;
    const triggeredRules: string[] = [];

    const rules = activePolicy.rules || {};
    const highRiskSkus = Array.isArray(rules.highRiskSkus) ? rules.highRiskSkus : ["SKU-999", "SKU-RESTRICTED-01"];
    const maxQuantityThreshold = rules.maxQuantityThreshold ?? 5;

    if (payload && payload.items && Array.isArray(payload.items)) {
      for (const item of payload.items) {
        if (highRiskSkus.includes(item.sku)) {
          score += activePolicy.weights?.highRiskSku || 30;
          triggeredRules.push(`HIGH_RISK_SKU_${item.sku}`);
        }

        if (item.quantity > maxQuantityThreshold) {
          score += activePolicy.weights?.excessQuantity || 30;
          triggeredRules.push(`EXCESS_QUANTITY_${item.quantity}`);
        }
      }
    }

    const highThreshold = activePolicy.thresholds?.high || 50;
    const decision = score >= highThreshold ? 'ESCROW' : 'ALLOW';

    return {
      decision,
      score,
      triggeredRules
    };
  }
};