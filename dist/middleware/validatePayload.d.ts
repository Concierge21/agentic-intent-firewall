import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
export declare const checkoutSchema: z.ZodObject<{
    action: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
        sku: z.ZodString;
        quantity: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const validateCheckoutPayload: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
