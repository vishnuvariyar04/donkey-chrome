# Donkey — Privacy Policy

_Last updated: 21 June 2026_

Donkey ("we", "us") is a browser extension that provides a persistent memory
layer across AI tools (Claude, ChatGPT, and Gemini). This policy explains what
data the extension handles and why.

## Summary
Donkey is local-first. The memories you save live in your own browser. We do
not require an account, we do not collect your name or email through the
extension, and we never sell your data.

## What the extension stores locally
When you use "@donkey save", the extension captures the relevant conversation
content and stores it **locally in your browser** (IndexedDB / extension
storage) on your device. This data stays on your machine and is not uploaded to
us, except as described in "Embeddings" below. You can delete it at any time
from the extension's Settings ("Delete all memory").

## Embeddings (semantic search)
To enable semantic search across your saved memories, the text you choose to
save — and your search queries — are sent to our processing service
(a Cloudflare Worker) to generate numerical embeddings. This text is used only
to produce the embedding and return it to your browser; the resulting
embeddings are stored locally on your device. Exact, name-based retrieval does
not send any text off your device.

## Anonymous usage analytics
To understand how the extension is used and improve it, we collect **anonymous**
product analytics via PostHog (PostHog Inc., US region). This includes:
- a random, anonymous installation identifier (not linked to your identity);
- product events such as install, memory saved, memory retrieved, reaching the
  free-tier limit, clicking upgrade, and activating a license;
- basic context such as which AI platform was used, the extension version, and
  counts.

We do **not** send your name, email, the content of your conversations, your
saved memories, or your search text to our analytics. Analytics data is
processed by PostHog under its own privacy terms.

## Payments
If you purchase a lifetime license, payment is processed by **Razorpay**. Your
payment details (name, email, payment information) are collected and processed
by Razorpay under Razorpay's privacy policy. We receive confirmation of payment
and a license key; we do not store your card details.

## What we do NOT do
- We do not sell or rent your data.
- We do not use your data for advertising.
- We do not collect health, financial (beyond the Razorpay payment flow),
  or location data.

## Data retention & deletion
Memories and settings live in your browser and are removed when you clear them
in Settings or uninstall the extension. To request deletion of anonymous
analytics associated with your installation identifier, contact us.

## Third-party services
- Cloudflare (embedding processing)
- PostHog (anonymous analytics, US)
- Razorpay (payments)

## Changes
We may update this policy; the "Last updated" date will reflect changes.

## Contact
[Your Company Name]
[contact@yourdomain.com]
