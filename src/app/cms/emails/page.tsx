import { redirect } from "next/navigation";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import { emailFromAddress, emailReplyToAddress, isEmailConfigured } from "@/lib/email";
import { EMAIL_SAMPLES } from "@/lib/emails/samples";
import { defaultEmailContext } from "@/lib/emails/templates";

export const dynamic = "force-dynamic";

export default async function CmsEmailsPage() {
  if (!(await isCmsAuthenticated())) redirect("/cms");
  const context = defaultEmailContext();
  const configured = isEmailConfigured();

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-accent">Readers</p>
        <h1 className="font-display mt-2 text-display text-heading">Emails</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted md:text-base">
          Every email the site sends, shown with sample data. Open one on its own
          to screenshot it or check the plain-text version.
        </p>
        <dl className="mt-4 grid max-w-2xl gap-1 text-sm text-text">
          <div>
            <dt className="inline font-semibold text-heading">Sending: </dt>
            <dd className="inline">{configured ? "On" : "Off (emails are skipped until the Resend key is set)"}</dd>
          </div>
          <div>
            <dt className="inline font-semibold text-heading">From: </dt>
            <dd className="inline">{emailFromAddress()}</dd>
          </div>
          <div>
            <dt className="inline font-semibold text-heading">Replies go to: </dt>
            <dd className="inline">{emailReplyToAddress()}</dd>
          </div>
        </dl>
      </div>

      <div className="grid gap-6">
        {EMAIL_SAMPLES.map((sample) => {
          const rendered = sample.render(context);
          const href = `/api/cms/emails/preview?id=${encodeURIComponent(sample.id)}`;
          return (
            <section key={sample.id} className="panel p-4 md:p-6" id={sample.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-ds-title font-bold text-heading">{sample.label}</h2>
                <div className="flex gap-3 text-sm font-semibold">
                  <a className="text-accent hover:text-accent-deep" href={href} target="_blank" rel="noreferrer">
                    Open
                  </a>
                  <a className="text-accent hover:text-accent-deep" href={`${href}&format=text`} target="_blank" rel="noreferrer">
                    Plain text
                  </a>
                </div>
              </div>
              <p className="mt-1 text-sm text-muted">{sample.when}</p>
              <p className="mt-2 text-sm text-text">
                <span className="font-semibold text-heading">Subject:</span> {rendered.subject}
              </p>
              <iframe
                title={`${sample.label} preview`}
                srcDoc={rendered.html}
                sandbox=""
                className="mt-4 h-[720px] w-full rounded-lg border border-border bg-white"
              />
            </section>
          );
        })}
      </div>
    </div>
  );
}
