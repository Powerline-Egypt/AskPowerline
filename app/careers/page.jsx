"use client";

import { useState } from "react";
import PageShell from "@/components/PageShell";
import PageHero from "@/components/PageHero";
import { Reveal, Field } from "@/components/Primitives";
import { values, brand, formEmail, isValidEmail } from "@/lib/content";

const culture = [
  { t: "Engineer real impact", d: "Your work energises hospitals, communities and industries across the region — not slideware." },
  { t: "Learn from global leaders", d: "Work alongside ABB, Schneider Electric and Lucy Electric technology and standards every day." },
  { t: "Grow with us", d: "From two advanced facilities and a fast-growing portfolio, there's room to build a long career." },
];

export default function CareersPage() {
  const [status, setStatus] = useState("idle"); // idle | error | submitting | sent
  const [errors, setErrors] = useState({});
  const [fileName, setFileName] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const err = {};
    if (!data.get("name")?.trim()) err.name = "Please enter your name";
    if (!isValidEmail(data.get("email"))) err.email = "Enter a valid email";
    const cv = data.get("cv");
    if (!cv || !cv.name) err.cv = "Please attach your CV";
    setErrors(err);
    if (Object.keys(err).length) {
      setStatus("invalid");
      return;
    }
    setStatus("submitting");

    // Best-effort CRM lead capture — fire-and-forget (no CV; just the applicant
    // as a lead). Never blocks or breaks the email path.
    fetch("/api/crm-capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "careers",
        name: data.get("name"),
        email: data.get("email"),
        phone: data.get("phone"),
        message: [data.get("position") ? `Position: ${data.get("position")}` : null, data.get("message")]
          .filter(Boolean).join("\n\n"),
      }),
    }).catch(() => {});

    try {
      // FormSubmit's AJAX endpoint can't carry file attachments, so we post the
      // multipart form to the standard endpoint straight from the browser (a
      // real Referer is required — server-side fetch strips it). The response is
      // opaque under no-cors, so we can't read it — a completed request is
      // treated as success. (Delivery still requires the one-time FormSubmit
      // activation link sent to formEmail on the first submission.)
      data.append("_subject", `New job application — ${data.get("name")}`);
      data.append("_template", "table");
      data.append("_captcha", "false");
      // Deliver to info@ (URL) and also CC the careers lead.
      data.append("_cc", "omar.hazem@askpowerline.com");
      await fetch(`https://formsubmit.co/${formEmail}`, {
        method: "POST",
        mode: "no-cors",
        body: data,
      });
      setStatus("sent");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <PageShell>
      <PageHero
        eyebrow="Careers"
        title="Power your"
        accent="career"
        lead="We're a team of engineers and makers building reliable electrical solutions to international standards. If precision and progress drive you, you'll fit right in."
        img="/img/facility-1.webp"
      />

      <section className="careers">
        <div className="container">
          <div className="culture">
            {culture.map((c, i) => (
              <Reveal as="div" key={c.t} delay={i * 90}>
                <div className="cc">
                  <span className="cn">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{c.t}</h3>
                  <p>{c.d}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="values sec-head">
              <span className="eyebrow">How we work</span>
              <div className="vlist">
                {values.map((v) => (
                  <span className="vchip" key={v.title}>{v.title}</span>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Application form */}
          <Reveal>
            <div className="apply">
              <div className="apply-head">
                <span className="eyebrow">Join the team</span>
                <h2 className="section-title">Apply now</h2>
                <p>Send us your details and CV. When a role that fits opens up, you&apos;ll be first to hear from us.</p>
              </div>

              {status === "sent" ? (
                <div className="sent">
                  <div className="check">✓</div>
                  <h3>Application received</h3>
                  <p>Thank you{fileName ? `, we've got "${fileName}"` : ""}. Our team will review it and get back to you. For anything urgent, call <a href={`tel:${brand.phone}`}>{brand.phoneDisplay}</a>.</p>
                </div>
              ) : (
                <form onSubmit={onSubmit} noValidate>
                  <div className="row2">
                    <Field name="name" label="Full name *" error={errors.name} />
                    <Field name="email" label="Email *" type="email" error={errors.email} />
                  </div>
                  <div className="row2">
                    <Field name="phone" label="Phone" type="tel" autoComplete="tel" />
                    <Field name="position" label="Position of interest" placeholder="e.g. Panel Engineer" />
                  </div>
                  <label className="field">
                    <span>Message</span>
                    <textarea name="message" rows={4} placeholder="Tell us about yourself…" />
                  </label>

                  <label className="field">
                    <span>Upload CV * (PDF, DOC)</span>
                    <div className="file">
                      <input
                        type="file"
                        name="cv"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
                      />
                      <span className="file-btn">Choose file</span>
                      <span className="file-name">{fileName || "No file chosen"}</span>
                    </div>
                    {errors.cv && <em className="err">{errors.cv}</em>}
                  </label>

                  <button type="submit" className="btn btn-primary submit" disabled={status === "submitting"}>
                    {status === "submitting" ? "Sending…" : "Submit Application"}
                  </button>
                  {status === "invalid" && <p className="form-err" role="alert">Please fix the highlighted fields.</p>}
                  {status === "failed" && (
                    <p className="form-err" role="alert">
                      Sorry, we couldn&apos;t send your application just now. Please try again, or
                      email <a href={`mailto:${formEmail}`}>{formEmail}</a>.
                    </p>
                  )}
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      <style jsx>{`
        .careers { padding: clamp(3.5rem, 9vh, 6rem) 0 clamp(5rem, 12vh, 8rem); }
        .culture { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.3rem; }
        .cc { height: 100%; padding: 2rem 1.8rem; border: 1px solid var(--line); border-radius: 16px; background: var(--bg-2); transition: all 0.35s var(--ease); }
        .cc:hover { border-color: rgba(232, 114, 42, 0.5); transform: translateY(-5px); }
        .cn { color: var(--orange); font-family: var(--font-head); font-weight: 700; }
        .cc h3 { font-size: 1.3rem; text-transform: uppercase; margin: 0.9rem 0 0.6rem; }
        .cc p { color: var(--text-dim); font-size: 0.92rem; }
        .values { margin: 3rem 0; }
        .vlist { display: flex; flex-wrap: wrap; gap: 0.8rem; margin-top: 1rem; }
        .vchip { padding: 0.6rem 1.1rem; border: 1px solid var(--line); border-radius: 999px; font-size: 0.85rem; color: var(--text); background: var(--bg-2); }
        .apply { padding: clamp(2rem, 5vw, 3.5rem); border: 1px solid var(--line); border-radius: 20px; background: radial-gradient(130% 140% at 100% 0%, rgba(232,114,42,.14), transparent 55%), var(--bg-3); max-width: 53.75rem; }
        .apply-head { margin-bottom: 2rem; }
        .apply-head h2 { margin: 0.8rem 0 0.7rem; }
        .apply-head p { color: var(--text-dim); max-width: 56ch; }
        .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        /* .field / .err / .form-err are global (app/globals.css) so the shared
           <Field> primitive is styled — same look as the contact form. */
        /* file input (careers-only) */
        .file { position: relative; display: flex; align-items: center; gap: 0.9rem; border: 1px dashed var(--line); border-radius: 11px; padding: 0.7rem 0.9rem; background: var(--bg-2); }
        .file input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; }
        .file-btn { background: rgba(232,114,42,.15); color: var(--orange); border: 1px solid rgba(232,114,42,.4); padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.85rem; font-weight: 600; white-space: nowrap; }
        .file-name { color: var(--text-faint); font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .submit { margin-top: 0.6rem; }
        .sent { text-align: center; padding: 2.5rem 1rem; }
        .check { width: 60px; height: 60px; border-radius: 50%; background: var(--orange); color: #fff; display: grid; place-items: center; font-size: 1.6rem; margin: 0 auto 1.2rem; box-shadow: 0 0 30px rgba(232,114,42,.5); }
        .sent h3 { font-size: 1.6rem; text-transform: uppercase; }
        .sent p { color: var(--text-dim); margin-top: 0.7rem; }
        .sent a { color: var(--orange); }
        @media (max-width: 850px) {
          .culture { grid-template-columns: 1fr; }
          .row2 { grid-template-columns: 1fr; }
        }
      `}</style>
    </PageShell>
  );
}
