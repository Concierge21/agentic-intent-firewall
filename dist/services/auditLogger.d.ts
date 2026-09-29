export interface AuditEvent {
    eventType: 'CHECKOUT_ESCROWED' | 'TRANSACTION_EXECUTED' | 'TRANSACTION_ABORTED' | 'CHECKOUT_BLOCKED';
    transactionId: string;
    riskAssessment?: any;
    payload: any;
    timestamp?: string;
}
export declare function logAuditEvent(event: AuditEvent): void;
