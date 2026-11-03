import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";

const require = createRequire(import.meta.url);
const OUT_DIR = "/opt/cursor/artifacts/screenshots/creator-pass-cancel-pr1";

const EXPIRATION = 1_900_000_000;

function formatPassExpirationDate(expirationSeconds) {
  return new Date(expirationSeconds * 1000).toISOString().split("T")[0];
}

function passAccessUntilMessage(expirationSeconds) {
  return `Your access runs until ${formatPassExpirationDate(expirationSeconds)}. No refund.`;
}

function passRow(passName) {
  return React.createElement(
    "div",
    {
      className:
        "flex flex-col gap-4 md:flex-row md:items-center md:justify-between p-4 border rounded-xl",
    },
    React.createElement(
      "div",
      { className: "space-y-1" },
      React.createElement("p", { className: "font-semibold text-lg" }, passName),
      React.createElement(
        "p",
        { className: "text-sm text-gray-600" },
        `Expires on ${formatPassExpirationDate(EXPIRATION)}`,
      ),
    ),
    React.createElement(
      "button",
      {
        type: "button",
        className:
          "inline-flex h-9 items-center rounded-md bg-red-600 px-3 text-sm text-white",
      },
      "Cancel pass",
    ),
  );
}

function buildHtml(bodyMarkup) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-white text-gray-900 font-sans">${bodyMarkup}</body></html>`;
}

function singlePassMarkup() {
  return renderToStaticMarkup(
    React.createElement(
      "div",
      { className: "p-6 max-w-2xl mx-auto" },
      passRow("Creative Creator Pass"),
    ),
  );
}

function multiPassMarkup() {
  return renderToStaticMarkup(
    React.createElement(
      "div",
      { className: "p-6 max-w-2xl mx-auto space-y-4" },
      passRow("Creative Creator Pass"),
      passRow("Creative Brand Pass"),
    ),
  );
}

function dialogMarkup() {
  const accessMessage = passAccessUntilMessage(EXPIRATION);
  return renderToStaticMarkup(
    React.createElement(
      "div",
      { className: "p-6 max-w-lg mx-auto relative min-h-[420px]" },
      React.createElement(
        "button",
        {
          type: "button",
          className:
            "inline-flex h-9 items-center rounded-md bg-red-600 px-3 text-sm text-white",
        },
        "Cancel pass",
      ),
      React.createElement(
        "div",
        {
          className:
            "fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4",
          role: "alertdialog",
        },
        React.createElement(
          "div",
          { className: "w-full max-w-lg rounded-lg border bg-white p-6 shadow-lg space-y-4" },
          React.createElement("h2", { className: "text-lg font-semibold" }, "Cancel this pass?"),
          React.createElement(
            "div",
            { className: "space-y-2 text-sm text-gray-600" },
            React.createElement(
              "p",
              null,
              "Creative passes are 30-day access passes. You buy again manually when you want continued access—nothing charges on its own.",
            ),
            React.createElement(
              "p",
              null,
              `Cancelling means you will not buy again for this pass when it expires. ${accessMessage}`,
            ),
          ),
          React.createElement(
            "div",
            { className: "flex justify-end gap-2" },
            React.createElement(
              "button",
              { type: "button", className: "rounded-md border px-4 py-2 text-sm" },
              "Keep pass",
            ),
            React.createElement(
              "button",
              {
                type: "button",
                className: "rounded-md bg-red-600 px-4 py-2 text-sm text-white",
              },
              "Yes, cancel pass",
            ),
          ),
        ),
      ),
    ),
  );
}

async function screenshot(browser, markup, fileName) {
  await mkdir(OUT_DIR, { recursive: true });
  const htmlPath = path.join(OUT_DIR, `${fileName}.html`);
  await writeFile(htmlPath, buildHtml(markup), "utf8");
  const page = await browser.newPage({ viewport: { width: 900, height: 720 } });
  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const pngPath = path.join(OUT_DIR, `${fileName}.png`);
  await page.screenshot({ path: pngPath, fullPage: true });
  await page.close();
  console.log(pngPath);
}

const playwright = require("playwright");
const browser = await playwright.chromium.launch();
try {
  await screenshot(browser, singlePassMarkup(), "single-pass-cancel-control");
  await screenshot(browser, multiPassMarkup(), "multi-pass-cancel-controls");
  await screenshot(browser, dialogMarkup(), "cancel-pass-confirm-dialog");
} finally {
  await browser.close();
}
