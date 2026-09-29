import { Request, Response, NextFunction } from 'express';
export declare function authenticateAgent(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
