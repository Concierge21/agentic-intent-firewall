"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.watchPolicy = exports.loadPolicy = exports.activePolicy = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Resolve the path to your existing config file
const policyPath = path_1.default.join(process.cwd(), 'src/config/policies.json');
// Default fallback policy matching your exact JSON structure
exports.activePolicy = {
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
const loadPolicy = () => {
    try {
        const data = fs_1.default.readFileSync(policyPath, 'utf8');
        exports.activePolicy = JSON.parse(data);
        console.log(`✅ [Policy Engine] Successfully loaded src/config/policies.json`);
    }
    catch (error) {
        console.error('❌ [Policy Engine] Failed to load policies.json, using defaults.', error);
    }
};
exports.loadPolicy = loadPolicy;
// Function to watch the file for live changes
const watchPolicy = () => {
    fs_1.default.watchFile(policyPath, { interval: 1000 }, (curr, prev) => {
        console.log('🔄 [Policy Engine] Detected changes in policies.json. Hot-reloading...');
        (0, exports.loadPolicy)();
    });
};
exports.watchPolicy = watchPolicy;
