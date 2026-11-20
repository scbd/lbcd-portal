# AGENTS.md

Guidance for AI coding agents (Claude Code, Codex, etc.) working in this repository.

> **Review due: 2027-11-20.** Written 2026-11-20 against SCBD Software Development Standards v0.3 (2026-06-08).
> When this date passes, re-check the commands, architecture notes and the standards summary below against the repo
> and the current standards document, then bump the date.

## What this is

Linking Biological and Cultural Diversity portal, served at https://www.cbd.int/lbcd/. A small Express server
(`server.js`) serves a legacy AngularJS 1.2 + RequireJS single-page app from `lbcd/app/` and proxies `/api/*` to the
SCBD API.

## Commands

Requires Node `^22.23.4 || ^24.22.1 || >=26.12.1` and `git` on the PATH (bower fetches client libraries from git).

```sh
npm install        # also runs `bower install` (postinstall) into lbcd/app/libs (gitignored)
npm test           # node:test smoke tests in test/*.test.js
npm start          # node server, default PORT=2030

# single test, by name
node --test --test-name-pattern="api proxy" test/smoke.test.js

# same as CI: build image, run tests inside it, probe the app
docker build -t lbcd-portal .
docker run --rm lbcd-portal npm test
docker run --rm -p 8000:8000 lbcd-portal   # then open http://localhost:8000/lbcd/
```

Environment variables:

| Variable  | Default               | Notes                                                                 |
| --------- | --------------------- | --------------------------------------------------------------------- |
| `PORT`    | `2030`                | `8000` in the Docker image                                            |
| `API_URL` | `https://api.cbd.int` | upstream for the `/api/*` proxy; use `https://api.cbddev.xyz` for dev |
| `VERSION` | unset                 | set in the image from the `VERSION` build arg (commit SHA in CI)      |

No linter is wired into `package.json` or CI; `.jshintrc` exists for editor use only.

## Testing notes

- `test/smoke.test.js` spawns `server.js` on `PORT=0` with `API_URL` pointing at an unreachable port, then checks
  that every route returns the SPA shell, that static assets (including bower libs) are served, that a missing
  `/lbcd/app/*` file returns `404`, and that the proxy returns `502` when upstream is down.
- Asset tests need `lbcd/app/libs` populated, so run `npm install` first.
- The "server log is clean" test fails if the server writes anything besides the `Server listening on` line before it
  runs. Do not add startup logging without updating it.
- The tests match the page `<title>` exactly, including the existing typo "Bioligical". Changing the title in
  `lbcd/app/template/template.html` requires changing the test too.
- When adding a route to `app_routes.js`, add it to the `pages` list in the smoke test.

## Architecture

### Server (`server.js`)

Route order matters:

1. `/lbcd/app/*` - static files from `lbcd/app/`; anything not found falls through to a plain-text `404`.
2. `/public/*` - always `404`.
3. `/api/*` - proxied to `API_URL` via `http-proxy` (`changeOrigin: true`, `secure: false`). Proxy errors return `502`.
4. `/lbcd*` - every other GET returns `lbcd/app/template/template.html` (the SPA shell; Angular uses HTML5 routing).

Only `lbcd/app/` is served. The root-level `js/` and `fonts/` folders and the `.php` files under `lbcd/app/views/` are
legacy and not reachable through the server.

### Client (`lbcd/app/`)

- **Boot chain:** `template.html` loads `libs/requirejs/require.js` with `data-main=js/boot.js` -> `boot.js`
  configures RequireJS paths to bower libs, sets `NG_DEFER_BOOTSTRAP` and loads `main.js` -> `main.js` loads `app`,
  `app_routes` and `template.html.js`, then Angular is bootstrapped manually.
- **Lazy registration:** `js/app.js` replaces `app.controller`, `app.directive`, `app.factory`, `app.filter` and
  `app.value` with the provider `register` functions, so modules loaded by RequireJS after bootstrap can still register.
  Always register through the `app` module returned by `define(['app'], ...)`.
- **View + controller pairing:** routes in `js/app_routes.js` point `templateUrl` at `views/<name>.html`. Routes with
  `resolveDependencies()` load `<templateUrl>.js` (e.g. `views/find.html.js`) before the view renders; that file
  defines the view's controller. Partials follow the same `*.partial.html` / `*.partial.html.js` pattern.
- **Auth:** every route resolves `user` via the `authentication` service (`js/authentication.js`), which calls
  `/api/v2013/authentication/user`. A hidden iframe in `template.html` talks to `https://accounts.cbd.int`.
- **API access:** client code calls relative `/api/v2013/...` paths (documents, thesaurus, index search, workflows);
  `js/storage.js` and `js/workflows.js` wrap the document and workflow APIs.
- **Client libraries** come from `bower.json` and are installed to `lbcd/app/libs` (see `.bowerrc`). They are not
  committed. Versions are pinned to what shipped in release `2021.46.1`; Angular is held at `1.2.16`.

### CI/CD (`.github/workflows/ci.yml`)

GitHub Actions, adapted from the `scbd/www.cbd.int` workflow. Every push and every PR to `master` or `dev` builds the
Docker image, runs `npm test` inside it and probes `/lbcd/` with `wget`. On pushes to `scbd/lbcd-portal`, images are
pushed to Docker Hub as `scbd/lbcd-portal:<branch>` for `master`, `dev` and `stg`, `release-<name>` for
`release/<name>` branches, and `<tag>` plus `latest` for version tags (a leading `v` is stripped). Other builds are not
pushed. Needs the org-level `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` secrets.

## SCBD software development standards

Source: https://github.com/scbd/documentation/blob/master/devops/software-development-standards.md (private repo;
read it with `gh api repos/scbd/documentation/contents/devops/software-development-standards.md -H "Accept: application/vnd.github.raw"`).
Read the full document before larger changes. The points that apply here:

**Git**

- GitHub Flow: branch from a Jira ticket, open a PR to `master`, squash and merge, delete the branch.
- Branch name: `({user})/(<type>)/<ticket-id>-<short-description>`, with `<type>` one of `feature`, `bugfix`,
  `hotfix`, `release`, `chore`, `docs`, `test`, `spike` (user and type optional). Example:
  `feature/JIRA-123-user-authentication`.
- Commit subject: `(<scope>) <subject>` - scope optional, imperative mood, lowercase, no trailing period, max 72
  characters. Body explains what and why; footer references issues.
- Small atomic commits; each commit builds and passes tests. No commented-out code, debug statements or WIP commits on
  shared branches.
- Version tags: `<year>.<weekOfYear>.<patch>`, e.g. `2025.14.0`. This repo's existing tags use a `v` prefix
  (`v2019.28.1`); CI accepts both.
- PR title follows the commit format. Merging to `master` needs 2 approvals (1 senior) and passing CI.

**Code**

- Naming: camelCase for variables, functions and parameters; PascalCase for classes; UPPER_SNAKE_CASE for constants
  and env vars; kebab-case for new files and directories. Booleans use `is`/`has` and positive wording.
- Function prefixes: `get` returns a record or throws, `find` returns a record or `null`, `lookup` maps a code to an
  id or `null`, `search`/`list`/plural `get` return arrays. Optional parameters go in a destructured `options` object.
- Prefer early returns over nested conditionals.
- Style is semistandard for JavaScript, 120-character lines. Comments only for "why"; JSDoc for function docs.
- README must cover how to build, run and debug, and the required and optional env vars with sample values.

**Where this repo differs (legacy code)**

- Existing files use PascalCase and dotted names (`CountryController.js`, `find.html.js`) and the code is not
  semistandard-formatted. Follow the standards for new code, but do not rename or reformat existing files unless the
  task is to do that; the `*.html.js` naming is load-bearing (see View + controller pairing).
- The standards' sample `.gitignore` ignores `package-lock.json`. Do not apply that here: the Dockerfile runs
  `npm ci`, which requires the lockfile.
