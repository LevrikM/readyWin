# Code signing policy

Free code signing provided by [SignPath.io](https://signpath.io), certificate by
[SignPath Foundation](https://signpath.org).

ReadyWin is an open-source Windows application. Release executables are signed
with Authenticode when the SignPath signing job is configured for the
repository. The signature makes the publisher and file integrity visible in
Windows SmartScreen and the file properties dialog.

## Team roles

- **Maintainer / release approver:** [@LevrikM](https://github.com/LevrikM).
- **Committer and reviewer:** the project maintainer reviews every change before
  a release tag is created.
- Signing requests are approved only for builds produced from this public
  repository by the release workflow in `.github/workflows/release.yml`.

## Privacy policy

ReadyWin does not collect telemetry or personal data. The application stores
settings and logs locally under `%LOCALAPPDATA%\ReadyWin`. Network requests are
limited to the signed catalog on the project site and GitHub, the GitHub
Releases API for update checks, and winget for package operations. See the
project README for the exact data locations.

## Release integrity

Each release includes:

- `ReadyWin.exe` — the application, signed when SignPath is configured;
- `ReadyWin-<version>-windows-amd64.zip` — the portable archive;
- `ReadyWin.exe.sha256` — SHA256 for the executable;
- `ReadyWin-<version>-windows-amd64.zip.sha256` — SHA256 for the archive.

Verify a download in PowerShell:

```powershell
Get-FileHash .\ReadyWin.exe -Algorithm SHA256
Get-Content .\ReadyWin.exe.sha256
```

The values must match. The in-app updater also downloads only over HTTPS,
verifies the published SHA256, and refuses to start a file with a different
hash.

## SignPath setup

SignPath Foundation approval is external to this repository. Once approved,
configure these repository variables and secret:

- secret `SIGNPATH_API_TOKEN`;
- variable `SIGNPATH_ORGANIZATION_ID`;
- variable `SIGNPATH_PROJECT_SLUG`;
- variable `SIGNPATH_SIGNING_POLICY_SLUG`.

Install the SignPath GitHub App, upload
`.signpath/artifact-configuration.xml` as the project's artifact configuration,
and run the release workflow. Without these values the workflow still builds
and publishes checksums, but the executable is unsigned.
