'use client'

import { useState } from 'react'
import { differenceInDays, startOfDay } from 'date-fns'
import { ExamSetupScreen } from '@/components/study-app/exam-setup-screen'
import { QuizScreen } from '@/components/study-app/quiz-screen'
import { StudyPlanScreen } from '@/components/study-app/study-plan-screen'
import { DashboardScreen } from '@/components/study-app/dashboard-screen'
import { generateQuestionsFromTopics } from '@/app/actions/generate-questions'

export type Screen = 'setup' | 'quiz' | 'plan' | 'dashboard'

export interface Topic {
  id: string
  name: string
  subject: string
  subtopics: string[]
  estimatedHours: number
}

export interface QuizQuestion {
  id: string
  topic: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface BusyTimeSlot {
  day: string // 'Monday', 'Tuesday', etc.
  startTime: string // 'HH:MM'
  endTime: string // 'HH:MM'
}

export interface ExamState {
  examName: string
  examDate: string
  syllabus: string
  topics: Topic[]
  questions: QuizQuestion[]
  busyTimes: BusyTimeSlot[]
  topicMastery: Record<string, number> // topic name -> mastery score
  subjectMastery: Record<string, number> // subject name -> mastery score
  masteryHistory: { date: string, avgMastery: number }[]
  quizAttempts: number
}

export default function HomePage() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('setup')
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [examState, setExamState] = useState<ExamState>({
    examName: '',
    examDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    syllabus: '',
    topics: [],
    questions: [],
    busyTimes: [],
    topicMastery: {},
    subjectMastery: {},
    masteryHistory: [],
    quizAttempts: 0,
  })

  const handleRetakeQuiz = async () => {
    if (examState.topics.length === 0) return
    
    setIsRegenerating(true)
    try {
      const result = await generateQuestionsFromTopics(examState.examName, examState.topics)
      setExamState(prev => ({
        ...prev,
        questions: result.questions
      }))
      setCurrentScreen('quiz')
    } catch (error) {
      console.error("Failed to regenerate questions:", error)
    } finally {
      setIsRegenerating(false)
    }
  }

  const daysLeft = Math.max(0, differenceInDays(new Date(examState.examDate), startOfDay(new Date())))

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border p-6 flex flex-col">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">StudyAI</h1>
          <p className="text-sm text-muted-foreground mt-1">Exam Preparation</p>
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { id: 'setup', label: 'Setup Exam', icon: '⚙️' },
            { id: 'quiz', label: 'Take Quiz', icon: '📚' },
            { id: 'plan', label: 'Study Plan', icon: '📋' },
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentScreen(item.id as Screen)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm ${
                currentScreen === item.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Active Exam</p>
          <div className="text-sm space-y-1">
            <p className="font-medium text-foreground">{examState.examName || 'New Exam'}</p>
            <p className="text-muted-foreground">{daysLeft} days left</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="bg-card border-b border-border px-8 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            {currentScreen === 'setup' && 'Exam Setup'}
            {currentScreen === 'quiz' && 'Take Quiz'}
            {currentScreen === 'plan' && 'Weekly Study Plan'}
            {currentScreen === 'dashboard' && 'Dashboard'}
          </h2>
          <div className="text-sm text-muted-foreground">
            {currentScreen === 'quiz' && 'Question 5 of 15'}
            {currentScreen === 'plan' && 'Week of April 21, 2026'}
            {currentScreen === 'dashboard' && '4 weeks of data'}
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto p-8">
          {currentScreen === 'setup' && (
            <ExamSetupScreen
              examState={examState}
              setExamState={setExamState}
              onContinue={() => setCurrentScreen('quiz')}
            />
          )}
          {currentScreen === 'quiz' && (
            <QuizScreen 
              examState={examState} 
              setExamState={setExamState} 
              onContinue={() => setCurrentScreen('plan')} 
            />
          )}
          {currentScreen === 'plan' && (
            <StudyPlanScreen examState={examState} onContinue={() => setCurrentScreen('dashboard')} />
          )}
          {currentScreen === 'dashboard' && (
            <DashboardScreen 
              examState={examState} 
              onBackToSetup={() => setCurrentScreen('setup')} 
              onRetakeQuiz={handleRetakeQuiz}
              isRegenerating={isRegenerating}
            />
          )}
        </div>
      </main>
    </div>
  )
}
