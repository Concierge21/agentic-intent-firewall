import { Request, Response, NextFunction } from 'express';
export declare function circuitBreaker(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
