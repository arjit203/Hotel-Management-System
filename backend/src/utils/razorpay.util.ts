// 7 Vachan - Razorpay payment utility (order creation + signature verification + refunds)
// Shared utility — not Hotel-specific — future Hall/Restaurant modules should
// import these same functions rather than re-implementing payment logic,
// per AI_INSTRUCTIONS.md #15 (shared logic lives once).

import Razorpay from "razorpay";
import crypto from "crypto";
import { ApiError } from "./apiError.util";

function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

// Lazy instantiation (same reasoning as config/cloudinary.ts): env vars must
// be read only when actually used, never at module-import time, because
// server.ts calls dotenv.config() AFTER its own imports resolve.
function getRazorpayInstance(): Razorpay {
  if (!isRazorpayConfigured()) {
    throw new ApiError(500, "Payment gateway is not configured on the server. Contact the administrator.");
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID as string,
    key_secret: process.env.RAZORPAY_KEY_SECRET as string,
  });
}

export interface RazorpayOrderResult {
  id: string;
  amount: number; // in paise
  currency: string;
}

export interface RazorpayRefundResult {
  id: string;
  status: string; // "pending" | "processed" | "failed" (Razorpay's own values)
  amount: number; // in paise
}

// amountInRupees is converted to paise here (Razorpay's API expects the
// smallest currency unit) so callers always pass a normal rupee amount.
export async function createRazorpayOrder(
  amountInRupees: number,
  receipt: string
): Promise<RazorpayOrderResult> {
  const instance = getRazorpayInstance();
  const order = await instance.orders.create({
    amount: Math.round(amountInRupees * 100),
    currency: "INR",
    receipt,
    // Supports UPI, Cards, Net Banking, Wallets by default — Razorpay's
    // Checkout widget offers all enabled payment methods on the account;
    // nothing method-specific needs to be configured here.
  });
  return { id: order.id, amount: Number(order.amount), currency: order.currency };
}

// Verifies the signature Razorpay's Checkout returns after a successful
// payment, proving the payment_id/order_id pair wasn't forged client-side.
// This is the ONLY trustworthy way to confirm a payment succeeded — never
// mark a booking as paid based on a client-side "success" callback alone.
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  if (!process.env.RAZORPAY_KEY_SECRET) {
    throw new ApiError(500, "Payment gateway is not configured on the server. Contact the administrator.");
  }
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expected === signature;
}

export async function createRazorpayRefund(
  paymentId: string,
  amountInRupees: number
): Promise<RazorpayRefundResult> {
  const instance = getRazorpayInstance();
  const refund = await instance.payments.refund(paymentId, {
    amount: Math.round(amountInRupees * 100),
  });
  return { id: refund.id, status: refund.status as string, amount: Number(refund.amount) };
}
