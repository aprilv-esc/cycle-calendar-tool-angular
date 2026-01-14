# Cycle Calendar Tool - Angular

This is an Angular v19 conversion of the Cycle Calendar Tool, featuring modern Angular features like Signals and standalone components, with an Express backend for API handling.

## Features

- **Angular v19** with Signals and standalone components
- **Express Backend** with Prisma ORM for database operations
- **Excel File Upload** with robust parsing logic
- **Tailwind CSS v4** for modern, responsive UI
- **Vercel-Ready** with serverless API configuration

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL database
- npm or yarn

### Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and add your DATABASE_URL
```

3. Generate Prisma client:
```bash
npx prisma generate
npx prisma db push
```

4. Start the backend server:
```bash
node server.js
```

5. Start the Angular dev server (in a new terminal):
```bash
npm run start
```

## Deployment

This project is configured for Vercel deployment. See the [walkthrough](docs/walkthrough.md) for detailed deployment instructions.

## GitHub Repository

https://github.com/aprilv-esc/cycle-calendar-tool-angular

## License

Internal tool - All rights reserved
