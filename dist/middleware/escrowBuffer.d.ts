import { Request, Response, NextFunction } from 'express';
export declare const escrowMiddleware: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
export declare const undoTransaction: (req: Request, res: Response) => Response<any, Record<string, any>>;
