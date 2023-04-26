# GPT Chat Wrapper

A next.js app to create command based gpt wrapper for Whatsapp.

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Roadmap

- Create integration with Whatsapp ✅
- Create integration with OpenAI ✅
- Add commands functions ✅
- Add integration to text-generation-web-ui
- Add way to AI reply to the reply messages
- Add Integration with Auto-gpt
- Create analize pdf command
- Create analize Youtube video command
- Create analize webpage command

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/api-routes/introduction) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Whatsapp

For Whatsapp integration this projet uses [`pedroslopez/whatsapp-web.js`](https://github.com/pedroslopez/whatsapp-web.js) to create a headless Whatsapp Web Browser app.

### Configuration

After runing the server, go to `/config` page to connect to whattapp client. chosse a name and click em Create Client, read the QRCODE within whatsapp to setup the configuration.

### Usage

Send message to the configurated contact starting with '/' to create a command. Send `/help` to list all commands available.
