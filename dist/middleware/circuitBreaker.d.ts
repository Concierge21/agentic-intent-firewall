import { Request, Response, NextFunction } from 'express';
export declare function recordFailure(agentName: string): void;
export declare function resetBreaker(agentName: string): void;
export declare function circuitBreakerMiddleware(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
export declare const circuitBreaker: typeof circuitBreakerMiddleware;
