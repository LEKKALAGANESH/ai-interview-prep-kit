import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    // The app redirects visitors without a session to /login, so sign up a throwaway user first (cookie lands in this context).
    // Use "localhost" everywhere: the site calls the API at localhost:4000, and a cookie for 127.0.0.1 would not be sent there.
    const context = await browser.newContext({ viewport });
    const signup = await context.request.post("http://localhost:4000/api/auth/register", {
      data: { email: `audit-${Date.now()}-${viewport.width}@example.com`, password: "audit-password-123" },
    });
    if (!signup.ok()) throw new Error(`Audit sign-up failed: HTTP ${signup.status()} (is SESSION_SECRET set on the API?)`);
    const page = await context.newPage();
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
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
    await context.close();
  }
  console.log("Browser audit passed at 390x844 and 1440x900");
} finally {
  await browser.close();
}
