"use client";

import { useState } from "react";
import PageShell from "@/components/PageShell";
import PageHero from "@/components/PageHero";
import { Reveal, Field } from "@/components/Primitives";
import { brand, locations, productLines, formEmail, isValidEmail } from "@/lib/content";

export default function ContactPage() {
  const [status, setStatus] = useState("idle"); // idle | error | submitting | sent
  const [errors, setErrors] = useState({});

  const onSubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const err = {};
    if (!data.name?.trim()) err.name = "Please enter your name";
    if (!isValidEmail(data.email)) err.email = "Enter a valid email";
    if (!data.message?.trim()) err.message = "Tell us about your project";
    setErrors(err);
    if (Object.keys(err).length) {
      setStatus("invalid");
      return;
    }
    setStatus("submitting");

    // Best-effort CRM lead capture — fire-and-forget so it never blocks or
    // breaks the email path. The secret lives server-side in /api/crm-capture.
    fetch("/api/crm-capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "contact",
        name: data.name,
        company: data.company,
        email: data.email,
        phone: data.phone,
        message: [data.interest ? `Area of interest: ${data.interest}` : null, data.message]
          .filter(Boolean).join("\n\n"),
      }),
    }).catch(() => {});

    try {
      // Post straight to FormSubmit from the browser so a real Referer is
      // present — server-side fetch (Vercel/undici) strips it and FormSubmit
      // then rejects the request.
      const res = await fetch(`https://formsubmit.co/ajax/${formEmail}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: `New sales request — ${data.name}`,
          _template: "table",
          // Deliver to info@ (URL) and also CC the sales lead.
          _cc: "mohamed.yahia@askpowerline.com",
          Name: data.name,
          Company: data.company || "-",
          Email: data.email,
          Phone: data.phone || "-",
          "Area of interest": data.interest || "-",
          Message: data.message,
        }),
      });
      const out = await res.json().catch(() => ({}));
      // NOTE: FormSubmit returns success:"false" until the recipient inbox
      // (formEmail) has clicked the one-time "Activate Form" link it emails on
      // the first submission. Once activated this resolves to "true".
      setStatus(out.success === "true" || out.success === true ? "sent" : "failed");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <PageShell>
      <PageHero
        eyebrow="Contact"
        title="Let's talk"
        accent="power"
        lead="Send us your project details and our engineers will scope the right low or medium voltage solution and prepare a tailored quote."
      />

      <section className="contact">
        <div className="container grid">
          {/* Form */}
          <Reveal as="div" className="form-col">
            {status === "sent" ? (
              <div className="sent">
                <div className="check">✓</div>
                <h3>Thank you</h3>
                <p>
                  Your request has been received. Our team will get back to you
                  shortly. For anything urgent, call us at{" "}
                  <a href={`tel:${brand.phone}`}>{brand.phoneDisplay}</a>.
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate>
                <div className="row2">
                  <Field name="name" label="Full name *" error={errors.name} />
                  <Field name="company" label="Company" />
                </div>
                <div className="row2">
                  <Field name="email" label="Email *" type="email" error={errors.email} />
                  <Field name="phone" label="Phone" type="tel" />
                </div>
                <label className="field">
                  <span>Area of interest</span>
                  <select name="interest" defaultValue="">
                    <option value="" disabled>Select a line…</option>
                    {productLines.map((l) => (
                      <option key={l.key} value={l.title}>{l.title}</option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label className="field">
                  <span>Project details *</span>
                  <textarea name="message" rows={5} placeholder="Tell us what you're building…" />
                  {errors.message && <em className="err">{errors.message}</em>}
                </label>
                <button type="submit" className="btn btn-primary submit" disabled={status === "submitting"}>
                  {status === "submitting" ? "Sending…" : "Send Sales Request"}
                </button>
                {status === "invalid" && (
                  <p className="form-err" role="alert">Please fix the highlighted fields.</p>
                )}
                {status === "failed" && (
                  <p className="form-err" role="alert">
                    Sorry, we couldn&apos;t send your request just now. Please try again, or
                    email <a href={`mailto:${formEmail}`}>{formEmail}</a> or call{" "}
                    <a href={`tel:${brand.phone}`}>{brand.phoneDisplay}</a>.
                  </p>
                )}
              </form>
            )}
          </Reveal>

          {/* Info */}
          <Reveal as="aside" className="info-col" delay={120}>
            <div className="info-block">
              <span className="eyebrow">Call us</span>
              <a href={`tel:${brand.phone}`} className="phone">{brand.phoneDisplay}</a>
            </div>
            <div className="info-block">
              <span className="eyebrow">Visit us</span>
              {locations.map((l) => (
                <a key={l.name} href={l.maps} target="_blank" rel="noreferrer" className="loc">
                  <strong>{l.name}</strong>
                  <span>{l.address}</span>
                </a>
              ))}
            </div>
            <div className="info-block">
              <span className="eyebrow">Follow</span>
              <div className="socials">
                <a href={brand.facebook} target="_blank" rel="noreferrer">Facebook</a>
                <a href={brand.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <style jsx>{`
        .contact { padding: clamp(3.5rem, 9vh, 6rem) 0 clamp(5rem, 12vh, 8rem); }
        .grid { display: grid; grid-template-columns: 1.4fr 0.9fr; gap: clamp(2rem, 5vw, 4rem); }
        .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        /* .field / .err / .form-err styles are global (app/globals.css) so the
           shared <Field> primitive is styled here and on the careers page. */
        .submit { margin-top: 0.6rem; width: 100%; justify-content: center; }
        .sent { text-align: center; padding: 3rem 1rem; border: 1px solid var(--line); border-radius: 18px; background: var(--bg-2); }
        .check { width: 60px; height: 60px; border-radius: 50%; background: var(--orange); color: #fff; display: grid; place-items: center; font-size: 1.6rem; margin: 0 auto 1.2rem; box-shadow: 0 0 30px rgba(232,114,42,.5); }
        .sent h3 { font-size: 1.8rem; text-transform: uppercase; }
        .sent p { color: var(--text-dim); margin-top: 0.8rem; }
        .sent a { color: var(--orange); }
        .info-block { padding-bottom: 1.8rem; margin-bottom: 1.8rem; border-bottom: 1px solid var(--line); }
        .phone { display: block; font-family: var(--font-head); font-weight: 800; font-size: clamp(1.5rem, 3.5vw, 2.2rem); margin-top: 0.7rem; }
        .phone:hover { color: var(--orange); }
        .loc { display: block; margin-top: 1rem; }
        .loc strong { display: block; color: #fff; font-size: 0.95rem; }
        .loc span { font-size: 0.85rem; color: var(--text-faint); }
        .loc:hover strong { color: var(--orange); }
        .socials { display: flex; gap: 1.2rem; margin-top: 0.7rem; }
        .socials a { color: var(--text-dim); }
        .socials a:hover { color: var(--orange); }
        @media (max-width: 860px) {
          .grid { grid-template-columns: 1fr; }
          .row2 { grid-template-columns: 1fr; }
        }
      `}</style>
    </PageShell>
  );
}
