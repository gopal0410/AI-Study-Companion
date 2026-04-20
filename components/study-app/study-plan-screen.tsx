'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { ExamState } from '@/app/page'
import { getAIRecommendations } from '@/app/actions/recommendations'

interface StudyPlanScreenProps {
  examState: ExamState
  onContinue: () => void
}

function getPriority(mastery: number) {
  const normalized = (mastery / 1.85) * 100
  if (normalized < 40) return 'Very High'
  if (normalized < 65) return 'High'
  if (normalized < 85) return 'Medium'
  return 'Low'
}

function generateWeekData(topics: ExamState['topics'], mastery: Record<string, number>) {
  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const dates = ['Apr 21', 'Apr 22', 'Apr 23', 'Apr 24', 'Apr 25']

  // Sort topics by mastery score (ascending) to prioritize weak areas
  const sortedTopics = [...topics].sort((a, b) => {
    const masteryA = mastery[a.name] || 0
    const masteryB = mastery[b.name] || 0
    return masteryA - masteryB
  })

  return weekDays.map((day, dayIdx) => {
    // Weakest topics get first slots
    const sessions = sortedTopics.slice(0, 3).map((topic, sessionIdx) => {
      const topicMastery = mastery[topic.name] || 0
      const priority = getPriority(topicMastery)
      
      return {
        id: dayIdx * 3 + sessionIdx + 1,
        time: sessionIdx === 0 ? '09:00 - 11:00' : sessionIdx === 1 ? '14:00 - 16:00' : '19:00 - 21:00',
        subject: topic.subject,
        topic: topic.name,
        subtopic: topic.subtopics[dayIdx % topic.subtopics.length] || topic.subtopics[0],
        completed: false,
        priority: priority
      }
    })

    return {
      day,
      date: dates[dayIdx],
      sessions,
    }
  })
}

export function StudyPlanScreen({ examState, onContinue }: StudyPlanScreenProps) {
  const [completedSessions, setCompletedSessions] = useState<number[]>([])
  const [recommendation, setRecommendation] = useState<string>('Analyzing your study plan...')
  const weekData = generateWeekData(examState.topics, examState.topicMastery)

  useEffect(() => {
    const fetchRecommendation = async () => {
      try {
        const rec = await getAIRecommendations(examState)
        setRecommendation(rec)
      } catch (error) {
        setRecommendation('Focus on the topics with the lowest mastery scores first. We have prioritized them in your schedule.')
      }
    }
    fetchRecommendation()
  }, [examState])

  const toggleSessionCompletion = (sessionId: number) => {
    setCompletedSessions((prev) =>
      prev.includes(sessionId) ? prev.filter((id) => id !== sessionId) : [...prev, sessionId]
    )
  }

  const totalSessions = weekData.reduce((sum, day) => sum + day.sessions.length, 0)
  const completedCount = completedSessions.length
  const progressPercent = totalSessions > 0 ? (completedCount / totalSessions) * 100 : 0

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'Very High':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Medium':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-primary/10 text-primary border-primary/20'
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Progress summary */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-base md:text-lg">Weekly Progress (Personalized)</CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            <div>
              <p className="text-[10px] md:text-sm text-muted-foreground mb-1 md:mb-2 uppercase tracking-wide">Sessions</p>
              <p className="text-xl md:text-3xl font-bold text-foreground">{completedCount}/{totalSessions}</p>
            </div>
            <div className="hidden md:block">
              <p className="text-[10px] md:text-sm text-muted-foreground mb-1 md:mb-2 uppercase tracking-wide">Strategy</p>
              <p className="text-xl font-bold text-foreground">Adaptive</p>
            </div>
            <div>
              <p className="text-[10px] md:text-sm text-muted-foreground mb-1 md:mb-2 uppercase tracking-wide">Completion</p>
              <p className="text-xl md:text-3xl font-bold text-study-strong">{Math.round(progressPercent)}%</p>
            </div>
          </div>
          <div className="mt-4 w-full bg-border rounded-full h-2">
            <div
              className="bg-study-strong h-2 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Weekly schedule */}
      <div className="space-y-3">
        {weekData.map((dayData) => (
          <Card key={dayData.day}>
            <CardHeader className="p-4 md:pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground text-sm md:text-base">{dayData.day}</p>
                  <p className="text-xs text-muted-foreground">{dayData.date}</p>
                </div>
                <p className="text-xs font-medium text-muted-foreground">
                  {dayData.sessions.filter((s) => completedSessions.includes(s.id)).length}/{dayData.sessions.length} done
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-2 md:p-6 pt-0 md:pt-0 space-y-2">
              {dayData.sessions.map((session) => {
                const isCompleted = completedSessions.includes(session.id)
                return (
                  <div
                    key={session.id}
                    className={`flex items-start gap-3 md:gap-4 p-3 md:p-4 rounded-lg border transition-all ${
                      isCompleted
                        ? 'bg-green-50 border-study-strong/30'
                        : 'bg-background border-border'
                    }`}
                  >
                    <Checkbox
                      checked={isCompleted}
                      onCheckedChange={() => toggleSessionCompletion(session.id)}
                      className="w-4 h-4 md:w-5 md:h-5 mt-1 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[8px] md:text-[10px] uppercase tracking-wider font-bold text-muted-foreground truncate max-w-[100px]">
                          {session.subject}
                        </span>
                        <p className={`text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${getPriorityStyles(session.priority)}`}>
                          {session.priority}
                        </p>
                      </div>
                      <p className={`text-sm md:font-medium leading-tight ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {session.topic}
                      </p>
                      <p className="text-[10px] md:text-xs text-muted-foreground italic mt-1 line-clamp-1">Focus: {session.subtopic}</p>
                      <p className="text-[10px] md:text-xs font-medium text-muted-foreground mt-2">{session.time}</p>
                    </div>
                    {isCompleted && (
                      <div className="text-study-strong font-bold text-base md:text-lg shrink-0">✓</div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recommendation */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-foreground">AI Recommendation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-foreground prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
            {recommendation}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex gap-3 justify-end pt-4">
        <Button variant="outline">
          Modify Schedule
        </Button>
        <Button onClick={onContinue}>
          View Analytics
        </Button>
      </div>
    </div>
  )
}
