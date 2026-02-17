```markdown
# Local AI Chat CLI – Ultimate Edition

A beautiful, feature-rich **terminal chat interface** for local LLMs via Ollama.

Supports streaming responses, syntax highlighting for code blocks, multi-line input, save/load conversations, coding mode, temperature control, dynamic model switching, and auto-copy to clipboard.

## Features

- Real-time streaming responses
- Code syntax highlighting (using chalk)
- Multi-line input mode (`/multi` → finish with `/end`)
- Save & load chat history (`/save`, `/load`)
- Switch models on the fly (`/model llama3.2`)
- Adjust temperature (`/temp 0.9`)
- Toggle coding assistant mode (`/code`)
- Automatically copies last AI response to clipboard
- Clean, colorful terminal UI
- Works with any Ollama-compatible model

## Requirements

- Node.js ≥ 18
- Ollama running locally (default: http://localhost:11434)
- At least one model pulled (`ollama pull llama3.2`, `gemma2`, etc.)

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/local-ai-chat-cli.git
cd local-ai-chat-cli
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. (Optional) Make it globally available

```bash
npm link
# Now you can run it from anywhere with:
local-ai-chat
```

## Running with Docker (recommended for Ollama + GPU)

Create a `docker-compose.yml` file in your project root (or anywhere convenient):

```yaml
version: "3.9"

services:
  ollama:
    image: ollama/ollama:latest
    container_name: ollama-server
    restart: unless-stopped
    ports:
      - "11434:11434"
    volumes:
      - ollama-models:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]

volumes:
  ollama-models:
```

Start Ollama:

```bash
docker compose up -d
```

Pull a model (example):

```bash
docker exec -it ollama-server ollama pull gemma2:9b
# or
docker exec -it ollama-server ollama pull llama3.2:3b
# or
docker exec -it ollama-server ollama pull qwen2.5-coder:7b
```

Then run the CLI as usual:

```bash
npm start
# or
local-ai-chat
```

Your CLI will automatically connect to `http://localhost:11434/v1`.

## Quick Start (without Docker)

```bash
# Start Ollama server (if not using Docker)
ollama serve

# In another terminal - pull a model
ollama pull gemma2

# Run the chat
npm start
```

## Available Commands

| Command              | Description                                          |
|----------------------|------------------------------------------------------|
| `/clear`             | Clear current conversation                           |
| `/save [name]`       | Save chat (default: `conversation.json`)             |
| `/load [name]`       | Load saved chat                                      |
| `/model <name>`      | Switch model (e.g. `/model llama3.2:3b`)             |
| `/temp <0-2>`        | Set temperature (0 = deterministic, 2 = creative)    |
| `/code`              | Toggle coding mode (better code generation)          |
| `/multi`             | Start multi-line input (finish with `/end`)          |
| `/help`              | Show this help                                       |
| `exit`, `quit`, `bye`| Exit the program                                     |

Chats are saved in: `~/.local-ai-chat/`

## Configuration (optional)

You can override defaults using environment variables:

```bash
export OLLAMA_MODEL="llama3.2:3b"
export OLLAMA_BASE_URL="http://localhost:11434/v1"
```

## License

This project is licensed under the **MIT License**.

See the [LICENSE](./LICENSE) file for the full text.

## Contributing

Feel free to open issues or pull requests!

Made with ❤️ for local AI enthusiasts  
Pratik

```

### Next steps you might want to do now

1. Create an empty `LICENSE` file in the root with MIT content:

   You can copy the standard MIT text from here:  
   https://opensource.org/license/mit  
   or just run:

   ```bash
   echo -e "MIT License\n\nCopyright (c) $(date +%Y) Pratik\n\nPermission is hereby granted, free of charge, to any person obtaining a copy..." > LICENSE
   ```

