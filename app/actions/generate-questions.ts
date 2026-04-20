'use server'

import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'
import { z } from 'zod'
import type { Topic, QuizQuestion } from '@/app/page'

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

const questionsSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string(),
      topic: z.string(),
      question: z.string(),
      options: z.array(z.string()).length(4),
      correctAnswer: z.number().min(0).max(3),
      explanation: z.string(),
      difficulty: z.enum(['easy', 'medium', 'hard']),
    })
  ),
})

export async function generateQuestionsFromTopics(
  examName: string,
  topics: Topic[]
): Promise<{ questions: QuizQuestion[] }> {
  const topicsText = topics
    .map((t) => `- ${t.name}: ${t.subtopics.join(', ')}`)
    .join('\n')

  const result = await generateText({
    model: openrouter('anthropic/claude-3-haiku'),
    ...({ mode: 'json' } as any),
    system: `You are an expert exam question generator. Your goal is to test the student's foundational knowledge of the subject.

GUIDELINES:
1. Generate clear, well-structured questions that cover the core concepts of the "${examName}" exam.
2. Focus on fundamental principles, definitions, and essential understanding.
3. Provide clear, educational explanations.
4. CRITICAL: Your response must be a single, valid JSON object. 
5. CRITICAL: Do NOT use actual newlines inside JSON string values. Use "\\n" for line breaks within the explanation or question text.

Format the response as JSON matching this structure exactly:
{
  "questions": [
    {
      "id": "q1",
      "topic": "Topic Name",
      "question": "Question text?",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "Clear explanation\\n\\nwith escaped newlines.",
      "difficulty": "medium"
    }
  ]
}
`,
    messages: [
      {
        role: 'user',
        content: `Generate 10 foundational quiz questions for the "${examName}" exam.

Topics to cover:
${topicsText}

Requirements:
1. Questions should focus on core, fundamental knowledge.
2. Include 4 multiple choice options with exactly 1 correct answer.
3. Provide helpful explanations for each answer.`,
      },
    ],
  })

  try {
    console.log('AI Questions Response:', result.text)
    let jsonText = result.text.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json/, '').replace(/```$/, '').trim()
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```/, '').replace(/```$/, '').trim()
    }
    
    // Replace all control characters (0-31), including newlines and tabs, with spaces.
    // This ensures that raw newlines inside strings don't crash JSON.parse,
    // and since structural whitespace in JSON is optional, it remains valid.
    const sanitizedJson = jsonText.replace(/[\u0000-\u001F]+/g, ' ')

    let rawParsed: any
    try {
      rawParsed = JSON.parse(sanitizedJson)
    } catch (e) {
      // Try to extract JSON if there's preamble
      const match = sanitizedJson.match(/\{[\s\S]*\}/)
      if (match) {
        rawParsed = JSON.parse(match[0])
      } else {
        throw e
      }
    }
    
    // Resilient mapping
    const questionsArray = Array.isArray(rawParsed) ? rawParsed : (rawParsed.questions || [])
    const mappedQuestions = questionsArray.map((q: any, index: number) => ({
      id: String(q.id || `q-${index}`),
      topic: String(q.topic || q.subject || 'General'),
      question: String(q.question || ''),
      options: Array.isArray(q.options) ? q.options.map(String).slice(0, 4) : ['N/A', 'N/A', 'N/A', 'N/A'],
      correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
      explanation: String(q.explanation || q.reason || ''),
      difficulty: String(q.difficulty || 'medium').toLowerCase()
    }))

    // Ensure we have exactly 4 options for each
    mappedQuestions.forEach((q: any) => {
      while (q.options.length < 4) q.options.push('N/A')
    })

    return { questions: mappedQuestions }
  } catch (error) {
    console.error('Questions Parsing/Validation Error:', error)
    throw new Error('Failed to generate questions from topics')
  }
}
