import { describe, expect, it } from "vitest";
import {
  CAMPAIGN_GATE_PRICE,
  DECISION_GATE_RECIPIENT,
  DECISION_GATE_X402_ENDPOINT,
  PREDICTION_GATE_PRICE,
  paymentRequiredBody,
} from "./billing";

describe("paymentRequiredBody", () => {
  it("returns campaign-gate price and shared x402 metadata", () => {
    const body = paymentRequiredBody("campaign-gate");
    expect(body).toEqual({
      error: "Payment proof is required for AI review.",
      code: "PAYMENT_REQUIRED",
      service: "campaign-gate",
      amount: CAMPAIGN_GATE_PRICE,
      recipient: DECISION_GATE_RECIPIENT,
      endpoint: DECISION_GATE_X402_ENDPOINT,
    });
    expect(body.amount).toBe("10000");
  });

  it("returns prediction-gate price ($0.005 USDC)", () => {
    const body = paymentRequiredBody("prediction-gate");
    expect(body.code).toBe("PAYMENT_REQUIRED");
    expect(body.service).toBe("prediction-gate");
    expect(body.amount).toBe(PREDICTION_GATE_PRICE);
    expect(body.amount).toBe("5000");
    expect(body.recipient).toBe(DECISION_GATE_RECIPIENT);
  });
});
