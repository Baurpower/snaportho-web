# SnapOrtho Anki add-on 1.0.7

## Learner sign-in fix

Learners (accounts without reviewer access) can now stay signed in. Previously, the
add-on treated the reviewer-gated account check as part of activation: after a
successful browser link, the expected `403` from the reviewer profile endpoint
revoked the device token and deleted the saved credential, so every retry failed
identically and the Master Deck kept showing Not linked.

Activation now treats the reviewer profile lookup as informational only. A linked
learner stays linked, keeps the saved Keychain/Credential Manager credential
across Anki restarts, and no longer sees "Sign in again" merely for lacking
reviewer access. Genuinely invalid tokens (401) still revoke and re-link as before.

## Upgrade

Install `snaportho-1.0.7.ankiaddon` from Anki's add-on manager and restart Anki.
If you are stuck in a sign-in loop on 1.0.6, install 1.0.7 first, then use
Tools → SnapOrtho → Sign In or Manage Account once. Existing credentials are reused.

## Support

If activation still fails, open **Tools → SnapOrtho → Safe Diagnostics** and share
that redacted output with support. Diagnostics never contain the device token,
link code, card content, or Anki profile name.
