# connekt-hunter-app

Initial monorepo scaffolding for Connekt Hunter.

## Structure

- `apps/api`: backend API workspace
- `apps/worker`: background job workspace
- `apps/backoffice-web`: internal web workspace
- `apps/candidate-web`: candidate-facing web workspace
- `packages/*`: shared packages and tooling presets
- `infra/*`: local infrastructure and delivery scaffolding

## Getting started

```bash
npm install
npm run lint
npm run build
npm run test
```

## Local helper

```bash
./infra/scripts/setup.sh
```

## CI

GitHub Actions runs lint, build, and test on every pull request and on pushes to `main` and `copilot/**` branches.
