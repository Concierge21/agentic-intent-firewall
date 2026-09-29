export declare let activePolicy: {
    thresholds: {
        medium: number;
        high: number;
    };
    rules: {
        highRiskSkus: string[];
        maxQuantityThreshold: number;
    };
    weights: {
        highRiskSku: number;
        excessQuantity: number;
    };
};
export declare const loadPolicy: () => void;
export declare const watchPolicy: () => void;
export declare const policyEngine: {
    evaluate(payload: any): {
        decision: string;
        score: number;
        triggeredRules: string[];
    };
};
