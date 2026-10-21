"use client";

import { useState } from "react";
import PageShell from "@/components/PageShell";
import PageHero from "@/components/PageHero";
import { Reveal, Field } from "@/components/Primitives";
import { brand, formEmail, isValidEmail } from "@/lib/content";

const supplierTypes = [
  "Manufacturer",
  "Authorised distributor",
  "Trader / reseller",
  "Raw materials",
  "Components & parts",
  "Equipment & machinery",
  "Services / contracting",
  "Logistics & transport",
  "Other",
];

export default function SupplierOfferingsPage() {
  const [status, setStatus] = useState("idle"); // idle | invalid | submitting | sent | failed
  const [errors, setErrors] = useState({});

  const onSubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const err = {};
    if (!data.name?.trim()) err.name = "Please enter your name";
    if (!isValidEmail(data.email)) err.email = "Enter a valid email";
    if (!data.company?.trim()) err.company = "Enter your company name";
    if (!data.supplierType) err.supplierType = "Select a supplier type";
    if (!data.companyDescription?.trim()) err.companyDescription = "Tell us about your company";
    if (!data.offering?.trim()) err.offering = "Describe what you offer";
    setErrors(err);
    if (Object.keys(err).length) {
      setStatus("invalid");
      return;
    }
    setStatus("submitting");
    try {
      const res = await fetch(`https://formsubmit.co/ajax/${formEmail}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: `New supplier offering — ${data.company}`,
          _template: "table",
          // Deliver to info@ (URL) and also CC the procurement lead.
          _cc: "mohamed.abdelbaset@askpowerline.com",
          Name: data.name,
          Email: data.email,
          Phone: data.phone || "-",
          Company: data.company,
          Website: data.website || "-",
          Country: data.country || "-",
          "Supplier type": data.supplierType,
          "Company description": data.companyDescription,
          "What they offer": data.offering,
        }),
      });
      const out = await res.json().catch(() => ({}));
      setStatus(out.success === "true" || out.success === true ? "sent" : "failed");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <PageShell>
      <PageHero
        eyebrow="Suppliers"
        title="Supplier"
        accent="offerings"
        lead="Are you a manufacturer, distributor or service provider? Tell us about your company and what you supply — our procurement team reviews every offering and reaches out when there's a fit."
        img="/img/facility-2.webp"
      />

      <section className="sup">
        <div className="container">
          <Reveal>
            <div className="sup-card">
              <div className="sup-head">
                <span className="eyebrow">Register your offering</span>
                <h2 className="section-title">Become a supplier</h2>
                <p>Fields marked * are required. The more detail you share, the faster we can assess a fit.</p>
              </div>

              {status === "sent" ? (
                <div className="sent">
                  <div className="check">✓</div>
                  <h3>Offering received</h3>
                  <p>Thank you. Our procurement team will review your details and get in touch if there&apos;s a fit. For anything urgent, call <a href={`tel:${brand.phone}`}>{brand.phoneDisplay}</a>.</p>
                </div>
              ) : (
                <form onSubmit={onSubmit} noValidate>
                  <div className="row2">
                    <Field name="name" label="Your name *" error={errors.name} />
                    <Field name="email" label="Email *" type="email" error={errors.email} />
                  </div>
                  <div className="row2">
                    <Field name="phone" label="Phone" type="tel" autoComplete="tel" />
                    <Field name="company" label="Company name *" autoComplete="organization" error={errors.company} />
                  </div>
                  <div className="row2">
                    <Field name="website" label="Company website" type="url" autoComplete="url" placeholder="https://" />
                    <Field name="country" label="Country" autoComplete="country-name" />
                  </div>

                  <label className="field">
                    <span>Supplier type *</span>
                    <select name="supplierType" defaultValue="">
                      <option value="" disabled>Select a type…</option>
                      {supplierTypes.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    {errors.supplierType && <em className="err">{errors.supplierType}</em>}
                  </label>

                  <label className="field">
                    <span>Company description *</span>
                    <textarea name="companyDescription" rows={3} placeholder="What does your company do? Years in business, markets served, certifications…" />
                    {errors.companyDescription && <em className="err">{errors.companyDescription}</em>}
                  </label>

                  <label className="field">
                    <span>What are you offering? *</span>
                    <textarea name="offering" rows={4} placeholder="Products or services, brands represented, key specifications, standards/approvals, typical lead times…" />
                    {errors.offering && <em className="err">{errors.offering}</em>}
                  </label>

                  <button type="submit" className="btn btn-primary submit" disabled={status === "submitting"}>
                    {status === "submitting" ? "Sending…" : "Submit Offering"}
                  </button>
                  {status === "invalid" && <p className="form-err" role="alert">Please fix the highlighted fields.</p>}
                  {status === "failed" && (
                    <p className="form-err" role="alert">
                      Sorry, we couldn&apos;t send your offering just now. Please try again, or
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
        .sup { padding: clamp(3.5rem, 9vh, 6rem) 0 clamp(5rem, 12vh, 8rem); }
        .sup-card {
          max-width: 62rem;
          margin: 0 auto;
          padding: clamp(2rem, 5vw, 3.5rem);
          border: 1px solid var(--line);
          border-radius: 20px;
          background: radial-gradient(130% 140% at 100% 0%, rgba(232, 114, 42, 0.14), transparent 55%), var(--bg-3);
        }
        .sup-head { margin-bottom: 2rem; }
        .sup-head h2 { margin: 0.8rem 0 0.7rem; }
        .sup-head p { color: var(--text-dim); max-width: 56ch; font-size: 0.95rem; }
        .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .submit { margin-top: 0.6rem; width: 100%; justify-content: center; }
        .sent { text-align: center; padding: 2.5rem 1rem; }
        .check {
          width: 60px; height: 60px; border-radius: 50%; background: var(--orange); color: #fff;
          display: grid; place-items: center; font-size: 1.6rem; margin: 0 auto 1.2rem;
          box-shadow: 0 0 30px rgba(232, 114, 42, 0.5);
        }
        .sent h3 { font-size: 1.6rem; text-transform: uppercase; }
        .sent p { color: var(--text-dim); margin-top: 0.7rem; }
        .sent a { color: var(--orange); }
        @media (max-width: 720px) {
          .row2 { grid-template-columns: 1fr; }
        }
      `}</style>
    </PageShell>
  );
}
