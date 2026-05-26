import { z } from "zod";
import {
  ADMIN_SWAP_DECISIONS,
  SWAP_DECISIONS,
  SWAP_REQUEST_TYPES,
} from "./types";

export const createSwapRequestSchema = z.object({
  programId: z.string().uuid(),
  requesterRosterId: z.string().uuid(),
  recipientRosterId: z.string().uuid(),
  requesterCallId: z.string().uuid(),
  recipientCallId: z.string().uuid().nullable().optional(),
  requestType: z.enum(SWAP_REQUEST_TYPES).default("coverage_only"),
  requesterNote: z.string().trim().max(2000).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.requestType === "trade" && !value.recipientCallId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["recipientCallId"],
      message: "Trade requests require a return shift.",
    });
  }

  if (value.requestType === "coverage_only" && value.recipientCallId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["recipientCallId"],
      message: "Coverage-only requests cannot include a return shift.",
    });
  }
});

export const respondToSwapRequestSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(SWAP_DECISIONS),
  recipientNote: z.string().trim().max(2000).nullable().optional(),
});

export const adminSwapDecisionSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(ADMIN_SWAP_DECISIONS),
  adminNote: z.string().trim().max(2000).nullable().optional(),
});

export const cancelSwapRequestSchema = z.object({
  requestId: z.string().uuid(),
  cancelReason: z.string().trim().max(2000).nullable().optional(),
});
