# Windows build notes

- Excel export uses the `xlsx` dependency already declared in `package.json`.
- Electron Builder is invoked with `--publish never`; there is intentionally no `publish: never` entry in `electron-builder.yml`.
- GitHub Actions uploads the generated NSIS installer as an artifact and does not require `GH_TOKEN`.
- Next.js uses standalone output so the Electron package contains the production server.
- Stripe is not required for the Windows build.
