# Erase-a-Scene

**Erase-a-Scene** is a web-based background removal tool built with React, TypeScript, and Tailwind CSS. Users can upload an image (via file upload, URL, or clipboard paste) and the tool leverages the [Remove.bg](https://remove.bg) AI API to automatically isolate the subject — people, objects, pets, etc. — and strip the background. Results are shown through an interactive before/after comparison slider. Users can replace the background with a custom color or keep it transparent, choose a download format (PNG, WebP, JPG), rename the output file, and share or copy the result to clipboard. The app also includes dark mode, processing history with localStorage persistence, and keyboard shortcuts for a streamlined workflow. It's ideal for creating profile pictures, product photos, social media graphics, or any use case where you need a clean subject cutout.

## Features

- **Multiple upload methods** — File upload, image URL, drag-and-drop, or paste from clipboard (Ctrl/⌘+V)
- **Before/After slider** — Interactive drag comparison of original vs. processed image
- **Custom backgrounds** — Transparent checkerboard or pick any solid color
- **Download format options** — Export as PNG, WebP, or JPG
- **Custom file naming** — Rename the output file before downloading
- **Copy & Share** — Copy result to clipboard or share via native OS share sheet
- **Dark mode** — Toggle with persistent preference via localStorage
- **Processing history** — Browse, reload, or delete past results (stored locally)
- **Usage counter** — Track how many images you've processed
- **Keyboard shortcuts** — Ctrl/⌘+Z to reset, Ctrl/⌘+V to paste images
- **File size validation** — 12 MB limit enforced before API call with friendly error message
- **Responsive design** — Works on desktop and mobile

## Tech Stack

| Technology | Purpose |
|---|---|
| [React](https://react.dev) 18 | UI framework |
| [TypeScript](https://www.typescriptlang.org) | Type-safe development |
| [Tailwind CSS](https://tailwindcss.com) v4 | Utility-first styling |
| [Vite](https://vitejs.dev) | Build tool & dev server |
| [Lucide React](https://lucide.dev) | Icons |
| [Remove.bg API](https://www.remove.bg/tools-api) | AI background removal |

## Screenshots

![App Screenshot](https://i.ibb.co/rGqDT2W/sc-erasesc.png)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- A free [Remove.bg API key](https://www.remove.bg/api)

### Installation

```bash
git clone https://github.com/sewakgautam/Erase-a-scene.git
cd Erase-a-scene
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```
VITE_ACCESS_KEY = <your Remove.bg API key>
```

You can get a free key at [remove.bg/api](https://www.remove.bg/api).

### Run

```bash
npm run dev
```

### Build

```bash
npm run build
npm run preview
```

## Authors

- [@sewakgautam](https://www.github.com/sewakgautam)

## References

- [Remove.bg](https://remove.bg)
- [Remove.bg API docs](https://www.remove.bg/tools-api)

## Contributing

Contributions are always welcome! Feel free to open an issue or submit a pull request.

## License

Open source.


