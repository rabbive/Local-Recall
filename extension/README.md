# LocalRecall Chrome Extension

A browser extension that allows you to summarize web content and YouTube videos and save them to your LocalRecall knowledge base.

## Features

- One-click summarization of web pages and articles
- YouTube video summarization
- Options for concise or detailed summaries
- Key points extraction
- Save summaries to your LocalRecall knowledge base
- Add custom tags to organize your knowledge

## Installation

### Developer Mode

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top-right corner)
4. Click "Load unpacked" and select the `extension` folder from this repository

### From the Chrome Web Store (Coming Soon)

The extension will be available in the Chrome Web Store in the future.

## Usage

1. Make sure LocalRecall is running locally on your machine
2. Navigate to any website or YouTube video
3. Click the LocalRecall extension icon in your browser toolbar
4. Click "Concise Summary" or "Detailed Summary" to generate a summary
5. Review the summary and key points
6. Add tags if desired
7. Click the save button to store the content in your LocalRecall knowledge base

## Configuration

By default, the extension connects to LocalRecall at `http://localhost:3000`. You can change this setting by:

1. Right-clicking the extension icon
2. Selecting "Options"
3. Entering your LocalRecall server URL
4. Clicking "Save"

## Requirements

- Chrome browser (version 88 or later)
- LocalRecall running locally on your machine

## Development

To build the extension from source:

1. Clone this repository
2. Open the extension folder
3. Make your changes
4. Load the extension in developer mode as described in the Installation section

## License

MIT 