# LocalRecall

A local-first personal knowledge base that helps you organize content, extract insights, and build connections. LocalRecall processes and stores your data locally, offering offline capabilities and privacy.

## Features

- **Local-First Architecture**: Store all your knowledge locally with IndexedDB
- **Versatile Content Integration**: Import content from websites, YouTube videos, or create your own notes
- **AI-Powered Summarization**: Generate concise summaries, key points, and detailed insights 
- **Knowledge Graph**: Visualize connections between your knowledge cards and explore relationships
- **Multi-Provider AI Support**: Connect to various AI services:
  - Local models through Ollama
  - OpenAI (GPT-3.5, GPT-4)
  - Google Gemini
  - Anthropic Claude
- **Privacy-Focused**: Keep your data private with client-side processing
- **Full Offline Support**: Use and access your knowledge base even without internet access

## Getting Started

### Prerequisites

- Node.js v18 or higher
- npm or yarn
- (Optional) Ollama for local AI capabilities

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/localrecall.git
   cd localrecall
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Start the development server
   ```
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### AI Provider Configuration

LocalRecall supports multiple AI providers for flexible use:

1. **Ollama (Local)**: 
   - Download and install [Ollama](https://ollama.ai)
   - Run a compatible model like `ollama run gemma:2b`
   - LocalRecall will connect to Ollama at http://localhost:11434 by default

2. **OpenAI**:
   - Get an API key from [OpenAI Platform](https://platform.openai.com/account/api-keys)
   - Enter the API key in Settings → AI Provider → OpenAI

3. **Google Gemini**:
   - Get an API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Enter the API key in Settings → AI Provider → Gemini

4. **Anthropic Claude**:
   - Get an API key from [Anthropic Console](https://console.anthropic.com/settings/keys)
   - Enter the API key in Settings → AI Provider → Claude

## Usage

1. **Import Content**: Add content from websites, YouTube, or create your own notes
2. **Explore the Knowledge Base**: View, filter, and search your knowledge cards
3. **Generate Insights**: Use AI to summarize content and extract key points
4. **Visualize Connections**: Explore the knowledge graph to see relationships

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Summary Feedback System

LocalRecall includes a powerful feedback system for content summaries, allowing users to:

1. **Rate summaries**: Users can rate summaries on a 1-5 scale to indicate quality
2. **Provide qualitative feedback**: Comment field allows detailed feedback on summary quality
3. **View analytics**: Admins can analyze summary quality by content type and prompt format

### Features

- **Client-side storage**: Feedback is stored locally with IndexedDB for immediate access
- **Server-side analytics**: Aggregated feedback data helps improve summary quality
- **Summary mode toggles**: Switch between brief summaries, detailed summaries, and key points
- **Prompt optimization**: Feedback helps tune prompts for different content types

### Technical Implementation

- Custom feedback API endpoint: `/api/feedback`
- Feedback display component: `SummaryFeedback.tsx`
- Analytics dashboard: `/dashboard/analytics`
- Toggle UI for summary modes: `SummaryToggle.tsx`

### Usage

To view feedback analytics:

1. Navigate to the Dashboard
2. Click "Summary Analytics" in the Quick Actions section
3. Review overall feedback metrics and prompt performance

To submit feedback on a summary:

1. View any content in the knowledge base
2. Use the star rating system at the bottom of the summary section
3. Optionally add comments about the summary quality
4. Submit feedback

### Future Improvements

- Machine learning-based prompt optimization based on feedback patterns
- A/B testing of different prompt formats for content types
- User-specific summary preferences based on past feedback
- Export of feedback analytics data