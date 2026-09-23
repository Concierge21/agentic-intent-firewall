"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCheckoutPayload = exports.checkoutSchema = void 0;
const zod_1 = require("zod");
// Strict payload contract for UCP checkout
exports.checkoutSchema = zod_1.z.object({
    action: zod_1.z.string().min(1, "Action field is required"),
    items: zod_1.z.array(zod_1.z.object({
        sku: zod_1.z.string().min(1, "SKU is required"),
        quantity: zod_1.z.number().int().positive("Quantity must be a positive integer"),
    })).min(1, "At least one item is required"),
});
// Middleware function
const validateCheckoutPayload = (req, res, next) => {
    const result = exports.checkoutSchema.safeParse(req.body);
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
exports.validateCheckoutPayload = validateCheckoutPayload;
