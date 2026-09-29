export type EscrowState = 'RECEIVED' | 'ESCROW_HOLD' | 'CLEARED' | 'ABORTED';
export interface EscrowTransaction {
    transactionId: string;
    payload: any;
    assessment?: any;
    expiresAt: number;
    status: EscrowState;
    createdAt?: number;
}
export declare const holdTransaction: (transactionId: string, payload: any, holdTimeMs?: number) => void;
export declare const storeHold: (hold: {
    transactionId: string;
    payload: any;
    assessment?: any;
    status?: string;
    createdAt?: number;
}) => void;
export declare const resolveTransaction: (transactionId: string, action: 'CLEAR' | 'ABORT') => boolean;
export declare const getTransaction: (transactionId: string) => EscrowTransaction | undefined;
export declare const getAllHolds: () => EscrowTransaction[];
