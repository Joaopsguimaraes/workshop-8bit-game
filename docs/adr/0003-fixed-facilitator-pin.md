# Fixed Facilitator PIN, with a session secret derived from it

The PIN that opens `/facilitador` is the fixed value `4321`, defined in code (`FACILITATOR_PIN` in `lib/facilitator/session.ts`), and no longer read from the `FACILITADOR_PIN` environment variable. The session secret that signs the Facilitator cookie is derived from that PIN with SHA-256, so it is the same in every process.

Before this, the PIN came from an environment variable and the secret was random per process. On Vercel, the login request and the page request can run in different serverless instances. The cookie issued by one instance then failed signature validation on another, so the Facilitator logged in and was sent back to the PIN screen.

## Considered Options

- **Keep the PIN in an environment variable and share the secret through another variable** (`FACILITADOR_SECRET`): fixes the instance mismatch, but adds configuration that has to be kept in sync on every environment, and the workshop wants one known PIN.
- **Keep a random secret and store sessions in the database**: correct, but adds state and a table for a gate that only protects a single screen.
- **Fixed PIN in code with a secret derived from it** (chosen): every instance agrees with no configuration and no state. The cost is that the PIN is visible to anyone who reads the repository, and the cookie is only as strong as the PIN. That is acceptable here because the Facilitator screen only steers a workshop and the decision was to use a known PIN.

## Consequences

- The `FACILITADOR_PIN` variable is no longer read. It can be removed from `.env`, `.env.example`, and the Vercel project.
- Anyone who knows the repository can open `/facilitador` and forge a session. Changing the PIN means changing the constant and deploying.
- Sessions survive restarts and instance changes, because the secret no longer depends on the process.
