# English Listings — FDA Contract-Manufacturer Dataset (copy-paste ready)

> For 13-A demand validation. Two channels: **Datarade** (data marketplace, passive/standing — primary under Profile A) and **Kaggle** (free dataset for visibility + demand signal, not revenue).
> Accuracy guardrails baked in: ~65,000 universe, **1,654 cleaned sample**, openFDA / **CC0 public domain**, single-source (not cross-verified), monthly refresh. Don't overstate "verified."

---

## 1) Datarade — data product listing

**Product name**
> FDA-Registered Medical Device Contract Manufacturers — Cleaned & Deduplicated (CSV / API, monthly refresh)

**Short description (1–2 lines)**
> A normalized, deduplicated directory of FDA-registered medical device **contract manufacturers** — product codes, 510(k)s, device class, specialty, country, registration number — built from openFDA (public domain). One canonical record per manufacturer, refreshed monthly.

**Full description**
> The U.S. FDA publishes device establishment registration & listing data through openFDA (public domain / CC0), but it's tedious to actually use at scale: the API's `skip` paging caps out around 25,000 records, the same establishment appears across many listing documents, and product codes / device names are nested.
>
> This dataset solves that. We pull the **contract-manufacturer slice (~65,000 establishment registrations)**, **merge duplicate registrations into one canonical record per manufacturer**, and structure each into a single ready-to-use row:
>
> - Company name, full address, country, state/region
> - FDA registration number (FEI)
> - Product codes (all, unioned across the manufacturer's listings)
> - Device names & device class
> - Medical specialty
> - 510(k) numbers (where present)
>
> **Delivered as:** a one-time CSV snapshot, a **monthly-refreshed subscription**, or **API access**. The value is in the cleaning, de-duplication, completeness, and freshness — not in data you couldn't otherwise get (the source is public).

**Categories / tags**
> Healthcare & Medical Data · Company Data · Manufacturing · Regulatory / Compliance · B2B Sourcing · Firmographics

**Use cases**
> - Medical-device sourcing & supplier discovery (find contract manufacturers by product code / device type)
> - Regulatory & supply-chain mapping (RA/QA teams)
> - Sales lead lists for service providers selling into device manufacturers
> - Market & competitive research

**Coverage / freshness**
> United States FDA registry (manufacturers worldwide that register with FDA). ~65,000 contract-manufacturer registrations in the universe. Refreshed monthly from openFDA.

**Pricing**
> Snapshot CSV **$29** · Monthly subscription **$49/mo** · API access **$99/mo**.

**Sample**
> 25-row sample CSV available on request (`sample-fda-device-mfg-teaser.csv`).

**Licensing note (for the marketplace's compliance field)**
> Source: openFDA, U.S. public domain (CC0) — commercial redistribution permitted. Business/establishment information only; no personal data. Not an official FDA product; provided "as is" without warranty.

---

## 2) Kaggle — dataset card

> Publish the **1,654-row cleaned sample** for free as a visibility + demand signal (track downloads / comments / "is the full set available?" questions). Link the landing for the full + maintained version. Free ≠ revenue — this is signal.

**Title**
> FDA Medical Device Contract Manufacturers (Cleaned & Deduplicated)

**Subtitle**
> ~1,654 canonical contract manufacturers from openFDA — product codes, 510(k), device class, country

**Description (markdown)**
> ## Overview
> A cleaned, deduplicated sample of **FDA-registered medical device contract manufacturers**, derived from openFDA's device registration & listing data. Each row is one canonical manufacturer with its product codes, device names, device class, medical specialty, 510(k) numbers, country, and FDA registration number.
>
> ## Provenance & license
> - **Source:** openFDA `device/registrationlisting` (`establishment_type = "Manufacture Medical Device for Another Party (Contract Manufacturer)"`).
> - **License:** U.S. public domain (**CC0**). Business/establishment information only — no personal data.
> - Not affiliated with or endorsed by the FDA. Provided as-is.
>
> ## Methodology
> 1. Fetched the contract-manufacturer slice from openFDA.
> 2. **Deduplicated**: the same establishment appears across many listing documents; these are merged into one canonical record (product codes / device classes / specialties / 510(k)s unioned).
> 3. Normalized fields and structured into a flat table.
>
> ## Columns
> | column | description |
> |---|---|
> | `name` | manufacturer name |
> | `country`, `region` | ISO country, state/region |
> | `address` | full registered address |
> | `reg_no` | FDA registration / FEI number |
> | `product_codes` | FDA product codes (semicolon-separated) |
> | `services` / `device_names` | device names produced |
> | `device_classes` | FDA device class (1/2/3) |
> | `specialties` | medical specialty |
> | `k_numbers` | 510(k) clearance numbers (where present) |
> | `sources` | data source (openfda) |
>
> ## Caveats (honest)
> - **Single source** (openFDA) — not yet cross-verified against a second registry.
> - This is a **sample**; the full ~65,000-establishment set + monthly refresh is maintained separately ([landing link]).
> - Registry data can lag reality; verify before relying on it for compliance decisions.
>
> ## Tags
> `healthcare` `medical-devices` `manufacturing` `regulatory` `companies` `fda` `open-data`

---

## Posting checklist
- [ ] Datarade listing live (primary, passive)
- [ ] Kaggle dataset published with sample + landing link
- [ ] Landing `COLLECTOR_URL` wired so requests are captured
- [ ] Watch `/count` for `pass:true` (sample≥5 OR presale≥1) over 1–2 weeks → record in `../../LEARNING-GATES.md` Gate II
