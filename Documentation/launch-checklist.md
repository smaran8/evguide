# EVGuide Launch Checklist

This is the minimum founder-friendly checklist to get EVGuide into a safer, more investor-friendly launch state.

## 1. Production URLs

- Confirm production domain and set `NEXT_PUBLIC_SITE_URL`.
- If you keep the Vercel subdomain live, confirm the expected public URL is `https://evguide.vercel.app`.
- Add your custom domain in Vercel before public launch if you want a cleaner trust signal.

## 2. Company Details

Fill these values in Vercel environment variables and your local `.env.local`:

- `NEXT_PUBLIC_BRAND_NAME`
- `NEXT_PUBLIC_COMPANY_NAME`
- `NEXT_PUBLIC_SUPPORT_EMAIL`
- `NEXT_PUBLIC_PRIVACY_EMAIL`
- `NEXT_PUBLIC_COMPANY_ADDRESS`
- `NEXT_PUBLIC_LEGAL_JURISDICTION`

Do not launch with placeholder company identity data.

## 3. Legal Surface

Verify these public pages are live and correct:

- `/privacy`
- `/cookies`
- `/terms`
- `/support`

Review the copy with a UK solicitor before public launch.

## 4. Tracking and Consent

- Confirm the cookie banner appears for first-time visitors.
- Confirm analytics events do not fire until consent is granted.
- Add a persistent privacy/settings entry later so users can revisit consent.

## 5. Finance Risk

- Keep finance language strictly illustrative unless you have regulatory advice.
- Do not present live lender offers, broker claims, or regulated wording without FCA review.
- If you plan real introductions to lenders or dealers, get legal/regulatory advice before enabling that flow.

## 6. Product Quality

- Check homepage, blog, compare, finance, AI Match, and vehicle pages on mobile and desktop.
- Confirm no broken footer/legal/support links.
- Confirm no placeholder content, unrealistic prices, or dummy lender labels remain where they should not.

## 7. Infrastructure

- Set production env vars in Vercel.
- Confirm Supabase production project keys are correct.
- Confirm Resend domain and sender identity are verified.
- Apply any required database migrations before launch.

## 8. Investor Readiness

- Replace placeholders with your real company and brand domain.
- Prepare a short one-pager explaining:
  - what the product does
  - what is live
  - what is still illustrative
  - what legal/compliance work is already in place
- Keep a clear changelog of launch fixes and compliance improvements.

## 9. Final Go/No-Go

Go live only if:

- production build succeeds
- production URL reflects the latest commit
- env vars are set
- legal pages are filled with real company details
- finance flows match your actual regulatory position
