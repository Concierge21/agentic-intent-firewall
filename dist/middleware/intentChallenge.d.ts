import { Request, Response, NextFunction } from 'express';
export declare const intentChallengeMiddleware: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
