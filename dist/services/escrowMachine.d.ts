export type EscrowState = 'PENDING' | 'ESCROWED' | 'EXECUTED' | 'DENIED' | 'ABORTED' | 'EXPIRED';
export interface EscrowTransaction {
    id: string;
    state: EscrowState;
    payload: any;
    riskAssessment: any;
    createdAt: number;
    expiresAt: number;
    timer?: NodeJS.Timeout;
}
declare class EscrowStateMachine {
    private transactions;
    create(id: string, payload: any, riskAssessment: any, ttlSeconds?: number): EscrowTransaction;
    get(id: string): EscrowTransaction | undefined;
    getAll(): EscrowTransaction[];
    transition(id: string, targetState: EscrowState): EscrowTransaction | null;
    private expire;
}
export declare const escrowManager: EscrowStateMachine;
export {};
