import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  currentKeyId,
  getKey,
  open,
  seal,
  type SignoutCryptoScope,
} from "./crypto";

// Deterministic test keys via env — seal() reads env lazily on each call.
const CARD_KEY_2026_08 = randomBytes(32).toString("base64");
const ID_KEY_2026_08 = randomBytes(32).toString("base64");
const CARD_KEY_2026_09 = randomBytes(32).toString("base64");

process.env.SIGNOUT_KEY_ID = "2026-08";
process.env.SIGNOUT_KEY_CARD_2026_08 = CARD_KEY_2026_08;
process.env.SIGNOUT_KEY_IDENTIFIER_2026_08 = ID_KEY_2026_08;
process.env.SIGNOUT_KEY_CARD_2026_09 = CARD_KEY_2026_09;

// 1. Round-trip across scopes, including unicode and empty strings.
for (const scope of ["card", "identifier"] as SignoutCryptoScope[]) {
  for (const text of ["", "7W-12 R hip ORIF WBAT", "naïve · POD1 · ✓", "x".repeat(5000)]) {
    const sealed = seal(text, scope);
    assert.equal(sealed.keyId, "2026-08");
    assert.equal(sealed.nonce.length, 12);
    assert.equal(open(sealed.ct, sealed.nonce, sealed.keyId, scope), text);
  }
}

// 2. Ciphertext is not the plaintext, and two seals of the same text differ (fresh nonce).
const a = seal("compartment check q2h", "card");
const b = seal("compartment check q2h", "card");
assert.ok(!a.ct.toString("utf8").includes("compartment"));
assert.ok(!a.ct.equals(b.ct), "same plaintext must produce different ciphertext");
assert.ok(!a.nonce.equals(b.nonce), "each seal must use a fresh nonce");

// 3. Scope isolation: a card-key ciphertext must not open under the identifier key.
const cardSealed = seal("secret one-liner", "card");
assert.throws(
  () => open(cardSealed.ct, cardSealed.nonce, cardSealed.keyId, "identifier"),
  "card ciphertext must not decrypt under the identifier scope"
);

// 4. Tamper detection: flipping any ciphertext byte fails the auth tag.
const tampered = Buffer.from(cardSealed.ct);
tampered[0] ^= 0x01;
assert.throws(
  () => open(tampered, cardSealed.nonce, cardSealed.keyId, "card"),
  "a modified ciphertext must not decrypt"
);

// 5. Wrong nonce fails.
assert.throws(
  () => open(cardSealed.ct, randomBytes(12), cardSealed.keyId, "card"),
  "a wrong nonce must not decrypt"
);

// 6. Truncated ciphertext (shorter than the auth tag) is rejected cleanly.
assert.throws(
  () => open(Buffer.alloc(8), cardSealed.nonce, cardSealed.keyId, "card"),
  /too short/
);

// 7. Key rotation: rows written under an old key id still decrypt after the
//    current id advances; new writes pick up the new id.
const oldRow = seal("POD 1 NWB", "card"); // written under 2026-08
process.env.SIGNOUT_KEY_ID = "2026-09";
assert.equal(currentKeyId(), "2026-09");
const newRow = seal("POD 2 WBAT", "card");
assert.equal(newRow.keyId, "2026-09");
assert.equal(open(oldRow.ct, oldRow.nonce, oldRow.keyId, "card"), "POD 1 NWB");
assert.equal(open(newRow.ct, newRow.nonce, newRow.keyId, "card"), "POD 2 WBAT");
process.env.SIGNOUT_KEY_ID = "2026-08";

// 8. Missing key material is a clear error, not a silent misdecrypt.
assert.throws(() => getKey("card", "1999-01"), /Missing sign-out key/);

// 9. A key of the wrong length is rejected.
process.env.SIGNOUT_KEY_CARD_BADLEN = Buffer.alloc(16).toString("base64");
assert.throws(() => getKey("card", "BADLEN"), /must be 32 bytes/);

console.log("Sign-out crypto tests passed");
