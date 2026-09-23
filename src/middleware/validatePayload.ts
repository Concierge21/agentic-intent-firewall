import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Strict payload contract for UCP checkout
export const checkoutSchema = z.object({
  action: z.string().min(1, "Action field is required"),
  items: z.array(
    z.object({
      sku: z.string().min(1, "SKU is required"),
      quantity: z.number().int().positive("Quantity must be a positive integer"),
    })
  ).min(1, "At least one item is required"),
});

// Middleware function
export const validateCheckoutPayload = (req: Request, res: Response, next: NextFunction) => {
  const result = checkoutSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: "SCHEMA_VALIDATION_FAILED",
      message: "Malformed agent payload rejected by firewall schema gate.",
      issues: result.error.issues.map((err) => ({
        path: err.path.join('.'),
        message: err.message
      }))
    });
  }

  next();
};