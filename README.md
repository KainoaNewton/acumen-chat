# Acumen Chat

A modern AI chat application built with Next.js, Tailwind CSS, and shadcn/ui. This application allows you to chat with various AI models from different providers, manage your API keys, and save your chat history locally.

## Features

- 💬 Chat with multiple AI models (GPT-4, GPT-3.5 Turbo, Claude 3 Opus, Claude 3 Sonnet)
- 🔑 Manage API keys for different providers
- ⭐ Favorite specific models for quick access
- 💾 Local storage for chat history and settings
- 🎨 Modern UI with Tailwind CSS and shadcn/ui
- ⚡ Real-time streaming responses
- 📱 Responsive design

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/yourusername/acumen-chat.git
cd acumen-chat
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file in the root directory and add your API keys:

```env
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Click "New Chat" to start a new conversation
2. Select your preferred AI model from the dropdown menu
3. Type your message and press Enter or click the send button
4. Access settings to manage your API keys and favorite models
5. Your chat history is automatically saved locally

## Technologies Used

- Next.js 14
- TypeScript
- Tailwind CSS
- shadcn/ui
- Vercel AI SDK
- OpenAI API
- Anthropic API
- Local Storage

## License

MIT
