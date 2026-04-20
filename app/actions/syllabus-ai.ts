'use server'

import { generateText } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { z } from 'zod'

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

const topicsSchema = z.object({
  topics: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      subject: z.string(),
      subtopics: z.array(z.string()),
      estimatedHours: z.number(),
    })
  ),
})

export async function deconstructSyllabus(
  examName: string,
  syllabus: string
): Promise<{ topics: Array<{ id: string; name: string; subject: string; subtopics: string[]; estimatedHours: number }> }> {
  const result = await generateText({
    model: openrouter('anthropic/claude-3-haiku'),
    ...({ mode: 'json' } as any),
    system: `You are an expert exam preparation assistant. When given a syllabus, you deconstruct it into focused study topics grouped by subject, with subtopics and estimated study hours.
    
CRITICAL: When estimating hours, be realistic. Assume the student is human and needs 8 hours of sleep, meal breaks, and rest. Do not suggest more than 4-6 hours of intense study per day.

CRITICAL: Extract the 'subject' names directly from the major headings or categories present in the syllabus. Do NOT use generic names like 'CSIT' unless it is a specific, explicitly named section in the text.

Format the response as JSON matching this structure exactly:
{
  "topics": [
    {
      "id": "unique-string-id",
      "name": "Topic Name",
      "subject": "Subject Name from Syllabus",
      "subtopics": ["Subtopic 1", "Subtopic 2"],
      "estimatedHours": 5
    }
  ]
}
Ensure topics are practical for quiz-based learning. Group related topics under the appropriate subject heading found in the syllabus.`,
    messages: [
      {
        role: 'user',
        content: `Please deconstruct the following syllabus for "${examName}" into study topics grouped by their actual subjects:

${syllabus}

Provide 5-8 main topics, each with 2-4 subtopics. Identify the 'subject' (category) for each topic based strictly on the syllabus structure.`,
      },
    ],
  })

  try {
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
      const match = sanitizedJson.match(/\{[\s\S]*\}/)
      if (match) {
        rawParsed = JSON.parse(match[0])
      } else {
        throw e
      }
    }
    
    // Resilient mapping
    const topicsArray = Array.isArray(rawParsed) ? rawParsed : (rawParsed.topics || [])
    const mappedTopics = topicsArray.map((topic: any, index: number) => ({
      id: String(topic.id || `topic-${index}`),
      name: String(topic.name || 'Untitled Topic'),
      subject: String(topic.subject || 'General'),
      subtopics: Array.isArray(topic.subtopics) ? topic.subtopics.map(String) : [],
      estimatedHours: Number(topic.estimatedHours || topic.study_hours || topic.hours || 2)
    }))

    return { topics: mappedTopics }
  } catch (error) {
    console.error('Parsing Error:', error)
    throw new Error('Failed to generate topics from syllabus')
  }
}
