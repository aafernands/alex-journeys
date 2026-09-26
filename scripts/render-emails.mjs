/**
 * Render every email template with sample data to HTML + text files.
 *
 *   node --experimental-strip-types --import ./scripts/alias-register.mjs \
 *     scripts/render-emails.mjs [outDir]
 *
 * Default outDir: ./email-previews (git-ignored scratch). Open the .html
 * files in a browser to screenshot them. The CMS has the same previews at
 * /cms/emails.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { EMAIL_SAMPLES } from "../src/lib/emails/samples.ts";

const outDir = resolve(process.argv[2] || "email-previews");
mkdirSync(outDir, { recursive: true });
const context = {
  siteUrl: process.env.EMAIL_PREVIEW_SITE_URL || "https://www.alexjourneys.com",
  supportEmail: process.env.SUPPORT_EMAIL || "support@alexjourneys.com",
};
for (const sample of EMAIL_SAMPLES) {
  const out = sample.render(context);
  writeFileSync(join(outDir, `${sample.id}.html`), out.html);
  writeFileSync(join(outDir, `${sample.id}.txt`), `Subject: ${out.subject}\n\n${out.text}\n`);
  console.log(`${sample.id}: ${out.subject}`);
}
console.log(`Wrote ${EMAIL_SAMPLES.length} templates to ${outDir}`);
