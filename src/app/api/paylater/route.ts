import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { emiReviews, orders, paymentRecords } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-utils";
import { calculateDemoTrustScore, getPayLaterEligibility, PAYLATER_HISTORY_DAYS, PAYLATER_SPEND_TARGET } from "@/lib/paylater-eligibility";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const history = await db.select({ id: orders.id, placedAt: orders.placedAt, deliveredAt: orders.deliveredAt, updatedAt: orders.updatedAt, total: orders.total, subtotal: orders.subtotal, discount: orders.discount, refundAmount: orders.refundAmount, status: orders.status, paymentStatus: orders.paymentStatus })
    .from(orders).where(eq(orders.userId, session.userId)).orderBy(asc(orders.placedAt));
  const result = getPayLaterEligibility(history.filter((order) => order.status === "delivered"));
  const [savedReview] = await db.select().from(emiReviews).where(eq(emiReviews.userId, session.userId)).limit(1);
  const payments = await db.select().from(paymentRecords).where(eq(paymentRecords.userId, session.userId));

  return jsonOk({
    mode: "DEMO",
    targetSpend: PAYLATER_SPEND_TARGET,
    historyDays: PAYLATER_HISTORY_DAYS,
    eligibility: {
      status: savedReview ? "Under Review" : result.status,
      qualifyingSpend: result.spend,
      amountRemaining: result.amountRemaining,
      orderCount: result.qualifying.length,
      firstQualifyingAt: result.first,
      daysComplete: Math.min(result.elapsedDays, PAYLATER_HISTORY_DAYS),
      daysRemaining: result.daysRemaining,
      spendProgressPercent: Math.min(100, Math.round(result.spend / PAYLATER_SPEND_TARGET * 100)),
      timeProgressPercent: Math.min(100, Math.round(result.elapsedDays / PAYLATER_HISTORY_DAYS * 100)),
      spendMet: result.spendMet,
      timeMet: result.timeMet,
    },
    review: savedReview ? {
      status: "under_review",
      trustScore: savedReview.trustScore,
      reviewedAt: savedReview.reviewedAt,
      ruleSummary: savedReview.ruleSummary,
    } : null,
    partnerStatus: "not_configured",
    availableLimit: null,
    outstandingBalance: null,
    installments: [],
    payments,
    transactions: history.map(({ id, total, status, paymentStatus, placedAt, deliveredAt, refundAmount }) => ({ id, total, status, paymentStatus, placedAt, deliveredAt, refundAmount })),
  });
}

export async function POST() {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const history = await db.select({ id: orders.id, deliveredAt: orders.deliveredAt, updatedAt: orders.updatedAt, total: orders.total, subtotal: orders.subtotal, discount: orders.discount, refundAmount: orders.refundAmount, paymentStatus: orders.paymentStatus, status: orders.status })
    .from(orders).where(and(eq(orders.userId, session.userId), eq(orders.status, "delivered"))).orderBy(asc(orders.placedAt));
  const result = getPayLaterEligibility(history);
  if (!result.spendMet) return jsonError(`You need ₹${result.amountRemaining.toFixed(2)} more in qualifying completed grocery purchases before requesting a review.`, 422);
  if (!result.timeMet) return jsonError(`Your 30-day history period is still in progress (${result.daysRemaining} days remaining).`, 422);
  const [existing] = await db.select().from(emiReviews).where(eq(emiReviews.userId, session.userId)).limit(1);
  if (existing) return jsonOk({ review: { status: "under_review", trustScore: existing.trustScore, reviewedAt: existing.reviewedAt, ruleSummary: existing.ruleSummary }, alreadyReviewed: true });

  const allOrders = await db.select({ status: orders.status, paymentStatus: orders.paymentStatus }).from(orders).where(eq(orders.userId, session.userId));
  const cancellations = allOrders.filter((order) => order.status === "cancelled").length;
  const failedPayments = allOrders.filter((order) => order.paymentStatus === "failed").length;
  // Transparent demo score only. It does not decide eligibility, approve credit,
  // create a limit, or substitute for a lender's underwriting.
  const score = calculateDemoTrustScore({ orderCount: result.qualifying.length, spend: result.spend, cancellations, failedPayments });
  const ruleSummary = {
    model: "QuickBasket transparent demo score v1",
    formula: "clamp(50 + min(qualifying delivered orders, 5)×5 + min(floor(net spend/₹1,000), 5)×2 − cancellations×8 − failed payments×10, 0, 100)",
    qualifyingDeliveredOrders: result.qualifying.length,
    netQualifyingSpend: result.spend,
    cancellations,
    failedPayments,
    meaning: "Illustrative only; this score does not approve or decline credit, provide a limit, or create a loan. No lender is connected.",
  };
  const [review] = await db.insert(emiReviews).values({
    userId: session.userId,
    historyStartAt: result.first!,
    status: "under_review",
    trustScore: score,
    demoLimit: "0.00",
    ruleSummary,
  }).onConflictDoNothing({ target: emiReviews.userId }).returning();
  if (!review) {
    const [saved] = await db.select().from(emiReviews).where(eq(emiReviews.userId, session.userId)).limit(1);
    return jsonOk({ review: { status: "under_review", trustScore: saved.trustScore, reviewedAt: saved.reviewedAt, ruleSummary: saved.ruleSummary }, alreadyReviewed: true });
  }
  return jsonOk({ review: { status: "under_review", trustScore: review.trustScore, reviewedAt: review.reviewedAt, ruleSummary: review.ruleSummary }, mode: "DEMO" }, 201);
}
