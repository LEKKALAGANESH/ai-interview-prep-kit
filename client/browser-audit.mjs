import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    const page = await browser.newPage({ viewport });
    await page.goto("http://127.0.0.1:3000", { waitUntil: "networkidle" });
    await page.getByText("Generate interview kit").waitFor();
    await page.getByLabel("Job description").fill("Frontend engineer");
    await page.getByLabel("Company website").fill("https://example.com");
    const provider = page.getByRole("button", { name: /Google Gemini/ });
    await provider.focus();
    await provider.press("Enter");
    await provider.press("ArrowDown");
    await provider.press("Home");
    await provider.press("End");
    await provider.press("Escape");
    await page.getByRole("button", { name: "Generate interview kit" }).isVisible();
    if (viewport.width <= 640) {
      const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      if (horizontalOverflow) throw new Error("Mobile viewport has horizontal overflow");
    }
    await page.close();
  }
  console.log("Browser audit passed at 390x844 and 1440x900");
} finally {
  await browser.close();
}
