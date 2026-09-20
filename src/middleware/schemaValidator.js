"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCheckoutPayload = void 0;
const validateCheckoutPayload = (req, res, next) => {
    const { action, items } = req.body;
    if (!action || typeof action !== 'string') {
        return res.status(400).json({
            error: "Bad Request",
            message: "AIF Schema Violation: Missing or invalid 'action' field."
        });
    }
    const allowedActions = ["initiate_checkout", "update_checkout", "complete_checkout"];
    if (!allowedActions.includes(action)) {
        return res.status(400).json({
            error: "Bad Request",
            message: `AIF Schema Violation: Action '${action}' is not supported by this endpoint.`
        });
    }
    if (items) {
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                error: "Bad Request",
                message: "AIF Schema Violation: 'items' must be a non-empty array."
            });
        }
        for (const item of items) {
            if (!item.sku || typeof item.sku !== 'string') {
                return res.status(400).json({
                    error: "Bad Request",
                    message: "AIF Schema Violation: Each item must contain a valid string 'sku'."
                });
            }
            if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
                return res.status(400).json({
                    error: "Bad Request",
                    message: "AIF Schema Violation: Item quantity must be a positive number."
                });
            }
        }
    }
    next();
};
exports.validateCheckoutPayload = validateCheckoutPayload;
