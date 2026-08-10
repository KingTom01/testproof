# TestProof

TestProof is a privacy-first browser tool that turns test steps and screenshots
into reproducible Markdown bug reports. Everything stays on the user's device:
there is no account, upload, analytics service, or backend.

## Features

- Structured bug summary, severity, environment, steps, expected, and actual result
- Drag-and-drop screenshot previews with ordering controls
- Live Markdown preview
- One-click copy and `.md` download
- Responsive, keyboard-accessible interface
- Local-only image processing

## Run locally

Requires Node.js 22.13 or newer.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Build and test

```bash
pnpm build
pnpm test
```

## Privacy

Screenshots are represented with temporary browser object URLs. TestProof does
not transmit or persist report content. Closing or refreshing the page clears
the working report.

## Roadmap

- Screenshot annotation and redaction
- GitHub Issue and Jira export formats
- Playwright report import
- Additional languages
- Downloadable evidence bundles

## Contributing

Bug reports and small, focused pull requests are welcome. Please avoid including
real credentials, customer information, or private workplace screenshots in
issues and examples.

## License

MIT
