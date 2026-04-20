# AI Study Companion

A modern, AI-powered study application built with Next.js, featuring interactive dashboards, exam setups, and personalized study plans.

## Features

- **Dashboard**: Track your progress and manage your study materials.
- **Exam Setup**: Configure and generate practice exams.
- **AI Study Plans**: Get AI-generated recommendations and syllabi.
- **Interactive Quizzes**: Test your knowledge with dynamically generated questions.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **AI Integration**: [AI SDK](https://sdk.vercel.ai/) with OpenRouter

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/ai-study-companion.git
   cd ai-study-companion
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   pnpm install
   ```

3. Set up environment variables:
   Copy `.env.example` to `.env.local` and add your API keys.
   ```bash
   cp .env.example .env.local
   ```

### Running the Development Server

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## License

This project is licensed under the MIT License.
