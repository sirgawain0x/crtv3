// @vitest-environment jsdom

import React, { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreatorStockPickEditor } from "@/components/UserProfile/CreatorStockPickEditor";
import {
  stockPickEditorValueFromStored,
  type StockPickEditorValue,
} from "@/lib/creator-stock-picks/stock-pick-form-state";
import { parseCreatorStockPickFromRow } from "@/lib/creator-stock-picks/parse-stock-pick";

vi.mock("@/lib/creator-stock-picks/runtime-policy", () => ({
  isCreatorStockPicksRuntimeEnabled: () => true,
  getCreatorStockPicksBlocker: () => null,
}));

vi.mock("@/lib/creator-stock-picks/sepolia-stock-catalog", () => ({
  O1_BASE_SEPOLIA_STOCK_CATALOG: [
    {
      ticker: "TST",
      name: "Test Token",
      address: "0xabc",
      decimals: 8,
      chainId: 84532,
      evidenceUrl: "https://example.test/tst",
    },
  ],
}));

const STORED = {
  ticker: "TST",
  token_address: "0xabc",
  partner_url: "https://o1.exchange/swap?chainId=84532",
  note: "saved thesis",
  video_asset_id: "a1b2c3d4-e5f6-4789-a012-3456789abcde",
  chain_id: 84532,
};

/** Mirrors CreatorProfileManager cancel/save stock-pick state wiring. */
function StockPickManagerSessionHarness({
  onSave,
}: {
  onSave: (payload: StockPickEditorValue) => void;
}) {
  const parsed = parseCreatorStockPickFromRow(STORED);
  const [isEditing, setIsEditing] = useState(false);
  const [stockPickForm, setStockPickForm] = useState<StockPickEditorValue>(
    stockPickEditorValueFromStored(parsed),
  );

  const handleCancel = () => {
    setStockPickForm(stockPickEditorValueFromStored(parsed));
    setIsEditing(false);
  };

  const handleSave = () => {
    onSave(stockPickForm);
    setIsEditing(false);
  };

  return (
    <div>
      {isEditing ? (
        <>
          <CreatorStockPickEditor
            initial={parsed}
            onChange={setStockPickForm}
          />
          <button type="button" onClick={handleSave}>
            Save Profile
          </button>
          <button type="button" onClick={handleCancel}>
            Cancel
          </button>
        </>
      ) : (
        <button type="button" onClick={() => setIsEditing(true)}>
          Edit Profile
        </button>
      )}
    </div>
  );
}

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, React });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

function clickButton(label: string) {
  const buttons = Array.from(container.querySelectorAll("button"));
  const match = buttons.find((b) => b.textContent?.includes(label));
  expect(match).toBeTruthy();
  return act(async () => {
    (match as HTMLButtonElement).click();
  });
}

function setTextareaValue(id: string, value: string) {
  const el = document.getElementById(id) as HTMLTextAreaElement;
  expect(el).toBeTruthy();
  return act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value",
    )?.set;
    setter?.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

describe("CreatorProfileManager stock pick cancel (editor session)", () => {
  it("Cancel then Save does not persist draft stock pick note edits", async () => {
    const onSave = vi.fn();
    await act(async () => {
      root.render(<StockPickManagerSessionHarness onSave={onSave} />);
    });

    await clickButton("Edit Profile");
    await setTextareaValue("stock-pick-note", "draft thesis must not persist");
    await clickButton("Cancel");
    await clickButton("Edit Profile");
    await clickButton("Save Profile");

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      ticker: "TST",
      note: "saved thesis",
      video_asset_id: "a1b2c3d4-e5f6-4789-a012-3456789abcde",
    });
  });
});
