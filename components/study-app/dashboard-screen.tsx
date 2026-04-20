'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { ExamState } from '@/app/page'
import { getAIRecommendations } from '@/app/actions/recommendations'

interface DashboardScreenProps {
  examState?: ExamState
  onBackToSetup: () => void
  onRetakeQuiz: () => void
  isRegenerating?: boolean
}

const studyHoursData = [
  { day: 'Mon', hours: 4 },
  { day: 'Tue', hours: 5 },
  { day: 'Wed', hours: 3 },
  { day: 'Thu', hours: 4.5 },
  { day: 'Fri', hours: 6 },
  { day: 'Sat', hours: 2 },
  { day: 'Sun', hours: 3.5 },
]

function getAcronym(name: string) {
  const words = name.split(/[\s-]+/)
  if (words.length === 1) return name.slice(0, 3).toUpperCase()
  return words
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

export function DashboardScreen({ examState, onBackToSetup, onRetakeQuiz, isRegenerating }: DashboardScreenProps) {
  const [recommendation, setRecommendation] = useState<string>('Generating personal insights...')

  useEffect(() => {
    const fetchRecommendation = async () => {
      if (!examState) return
      try {
        const rec = await getAIRecommendations(examState)
        setRecommendation(rec)
      } catch (error) {
        setRecommendation('Focus on maintaining your study consistency for all topics.')
      }
    }
    fetchRecommendation()
  }, [examState])

  // Generate performance trend from actual history
  const performanceTrend = examState?.masteryHistory.map((entry, i) => ({
    attempt: `Quiz ${i + 1}`,
    score: Math.min(Math.round((entry.avgMastery / 1.85) * 100), 100),
  })) || []

  // Derive subject strength from actual subject masteries
  const finalSubjectData = Object.entries(examState?.subjectMastery || {}).map(([subject, mastery]) => {
    const normalizedMastery = Math.min(Math.round((mastery / 1.85) * 100), 100)
    return {
      name: subject,
      shortName: getAcronym(subject),
      value: normalizedMastery,
    }
  })

  // If no subject mastery yet, show subjects with 0%
  if (finalSubjectData.length === 0 && examState?.topics) {
    const uniqueSubjects = Array.from(new Set(examState.topics.map(t => t.subject)))
    uniqueSubjects.forEach(subject => {
      finalSubjectData.push({
        name: subject,
        shortName: getAcronym(subject),
        value: 0
      })
    })
  }
  
  const totalQuizzes = examState?.quizAttempts || 0
  const masteryValues = Object.values(examState?.topicMastery || {})
  const avgMastery = masteryValues.length > 0 
    ? masteryValues.reduce((a, b) => a + b, 0) / masteryValues.length 
    : 0
  const totalScore = Math.min(Math.round((avgMastery / 1.85) * 100), 100)
  
  // Calculate trend
  const lastScore = performanceTrend[performanceTrend.length - 1]?.score || 0
  const prevScore = performanceTrend[performanceTrend.length - 2]?.score || 0
  const scoreDiff = lastScore - prevScore
  const isImproving = scoreDiff > 0

  const totalHours = examState?.topics.reduce((sum, t) => sum + t.estimatedHours, 0) || 0
  const daysUntilExam = examState ? Math.ceil((new Date(examState.examDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0

  return (
    <div className="space-y-6">
      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 px-4">
            <p className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-2">Score</p>
            <p className="text-2xl md:text-3xl font-bold text-study-strong">{totalScore}%</p>
            {totalQuizzes > 1 && (
              <p className={`text-[10px] md:text-xs mt-1 md:mt-2 ${isImproving ? 'text-green-600' : 'text-red-600'}`}>
                {isImproving ? '↑' : '↓'} {Math.abs(scoreDiff)}%
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 px-4">
            <p className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-2">Quizzes</p>
            <p className="text-2xl md:text-3xl font-bold text-foreground">{totalQuizzes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 px-4">
            <p className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-2">Hours</p>
            <p className="text-2xl md:text-3xl font-bold text-foreground">{totalHours}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 px-4">
            <p className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-2">Days Left</p>
            <p className="text-2xl md:text-3xl font-bold text-foreground">{daysUntilExam}</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 1: Performance Trend and Subject Mastery */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="w-full overflow-hidden">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-base md:text-lg">Performance Trend</CardTitle>
          </CardHeader>
          <CardContent className="p-2 md:p-6">
            <div className="h-[250px] md:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceTrend} margin={{ right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="attempt" stroke="var(--muted-foreground)" fontSize={10} />
                  <YAxis stroke="var(--muted-foreground)" domain={[0, 100]} fontSize={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', fontSize: '12px' }}
                    labelStyle={{ color: 'var(--foreground)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#4CAF50"
                    strokeWidth={3}
                    dot={{ fill: '#4CAF50', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Mastery %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full overflow-hidden">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-base md:text-lg">Subject Mastery</CardTitle>
          </CardHeader>
          <CardContent className="p-2 md:p-6">
            <div className="h-[250px] md:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={finalSubjectData} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={10} />
                  <YAxis dataKey="shortName" type="category" stroke="var(--muted-foreground)" width={40} fontSize={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', fontSize: '12px' }}
                    labelStyle={{ color: 'var(--foreground)' }}
                    formatter={(value: any, name: any, props: any) => [`${value}%`, props.payload.name]}
                  />
                  <Bar dataKey="value" name="Mastery %" fill="#4CAF50" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Study Hours Distribution */}
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Study Hours Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={studyHoursData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
                    labelStyle={{ color: 'var(--foreground)' }}
                  />
                  <Bar dataKey="hours" fill="#4CAF50" name="Hours" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Performance Breakdown */}
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Detailed Subject Performance Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {finalSubjectData.map((item, index) => {
                const mastery = item.value
                return (
                  <div key={index}>
                    <div className="flex justify-between mb-1 items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded">{item.shortName}</span>
                        <p className="font-medium text-foreground text-sm truncate max-w-[400px]">{item.name}</p>
                      </div>
                      <p className="text-sm font-semibold">{Math.round(mastery)}%</p>
                    </div>
                    <div className="w-full bg-border rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-study-strong" style={{ width: `${mastery}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-foreground">AI Insights & Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-foreground prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
            {recommendation}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex gap-3 justify-end pt-4">
        <Button variant="outline" onClick={onBackToSetup}>
          Start New Session
        </Button>
        <Button 
          onClick={onRetakeQuiz} 
          disabled={isRegenerating}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isRegenerating ? 'Regenerating Questions...' : 'Retake Quiz'}
        </Button>
        <Button>
          Export Report
        </Button>
      </div>
    </div>
  )
}
