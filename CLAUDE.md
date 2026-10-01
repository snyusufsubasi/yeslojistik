# YES Lojistik: Rules for working with Claude

## Working style (GitHub = live site)
- Work directly on `main`. Don't open side branches or PRs unless the user asks.
- After every completed step:
  1. run the tests;
  2. commit;
  3. `git pull --rebase origin main`;
  4. `git push origin HEAD:main`.
- Render (yeslojistik.onrender.com) automatically redeploys whatever lands on `main`. So everything pushed goes live: additions and deletions alike. Never push untested code.
- Several sessions (this computer + the cloud) may be working on the same repo at once. Before starting, run `git pull --rebase origin main`, and never leave work unpushed.
- Keep `docs/PRATIKORTAM-GECIS.md` and `docs/GELISTIRME-PLANI.md` current: what's done and what's next.

## Communication
- The user doesn't write code. Explain things in plain Turkish, in short form.
- Before starting a job, say in a few lines what you'll do, then get to work. Ask only for risky or irreversible steps: writing or deleting live data, or anything that can't be undone.

## Checks before pushing
- Server: `cd server && dotnet test` (needs a local PostgreSQL, user/password postgres).
- Client: `cd client && npm run lint && npm run build`.

## Data and security
- Data from pratikortam (customers, VKN numbers, amounts, files) never goes into the repo. Only code and docs do.
- Never write passwords or tokens into a file or command. The user enters them as environment variables in their own terminal.
- Take a backup before any operation that writes to live data, and get the user's approval.
