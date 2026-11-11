# Forensic contracts — the code that explains itself

Every critical function in the Fanal codebase obeys this discipline,
so that the future forensic engineer understands the system in hours,
not weeks.

## The 5-line contract (above every critical function)

/**
 * @fanal-forensic-contract
 * @id FN-SEC-004 (the function's stable identifier)
 * @origin Argon-CoDesigned-With-Founder (the provenance)
 * @invariant (the law the function must never break)
 * @blast-radius (what it reads/writes; what is forbidden)
 * @golden-test (the input → the expected output)
 */

## The scanner-before-commit rule

Run tools/forensic-code-auditor.js before every commit. The forbidden
patterns: eval(), new Function(), nodeIntegration:true,
contextIsolation:false, raw child_process exec — and the unveiled
fetch outside the whitelist. A critical finding blocks the commit.

## The 7-file deterministic cage

The LLM exists ONLY in the brain router; everything leaving it passes
the deterministic validators (the veil, the registry, the signature).
The math and the cryptography are pure functions: an object in, an
object out, zero network. A violation of the cage is a CRITICAL.

## The doctrine

The future specialist receives: the scanner (one command), the map of
the 7 files, and the contracts on every wall. The code must explain
itself — that is the gift we leave to the human who will audit us.
