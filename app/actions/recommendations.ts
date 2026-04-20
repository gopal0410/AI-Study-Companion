'use server'

import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'
import type { ExamState } from '@/app/page'

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

export async function getAIRecommendations(examState: ExamState): Promise<string> {
  if (!examState.topics.length) {
    return 'Please complete the exam setup to receive personalized AI recommendations.'
  }

  const topicsText = examState.topics
    .map((t) => `- ${t.name} (${t.estimatedHours}h): ${t.subtopics.join(', ')}`)
    .join('\n')

  const busyTimesText = examState.busyTimes.length 
    ? examState.busyTimes.map(bt => `- ${bt.day}: ${bt.startTime} to ${bt.endTime}`).join('\n')
    : 'None'

  const result = await generateText({
    model: openrouter('anthropic/claude-3-haiku'),
    system: `You are an expert study advisor. 
    
OUTPUT GUIDELINES:
1. Identify the most critical areas for improvement or focus based on the provided topics and exam name.
2. DO NOT include any introductory text, affirmations, or filler.
3. DO NOT provide a structured schedule, sleep times, or meal plans.
4. Output ONLY concise, actionable advice on which specific topics or subtopics to prioritize and why.
5. Use Markdown for formatting (bolding, lists).`,
    messages: [
      {
        role: 'user',
        content: `I am preparing for "${examState.examName}" on ${examState.examDate}.
        
STUDY TOPICS:
${topicsText}

Based on these topics, what are the most important areas I should focus on to succeed in this exam? Provide specific recommendations on topic prioritization.`,
      },
    ],
  })
  return result.text
}
