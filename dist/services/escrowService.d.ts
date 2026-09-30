export declare function storeHold(hold: any): Promise<void>;
export declare function getAllHolds(): Promise<{
    transactionId: any;
    payload: any;
    assessment: any;
    status: any;
    createdAt: any;
}[]>;
export declare function resolveTransaction(transactionId: string, internalAction: string): Promise<boolean>;
