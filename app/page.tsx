'use client'

import { useState } from 'react'
import { differenceInDays, startOfDay } from 'date-fns'
import { Menu, Settings, BookOpen, ClipboardList, LayoutDashboard } from 'lucide-react'
import { ExamSetupScreen } from '@/components/study-app/exam-setup-screen'
import { QuizScreen } from '@/components/study-app/quiz-screen'
import { StudyPlanScreen } from '@/components/study-app/study-plan-screen'
import { DashboardScreen } from '@/components/study-app/dashboard-screen'
import { generateQuestionsFromTopics } from '@/app/actions/generate-questions'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
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

  const navItems = [
    { id: 'setup' as Screen, label: 'Setup Exam', icon: <Settings className="w-4 h-4" /> },
    { id: 'quiz' as Screen, label: 'Take Quiz', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'plan' as Screen, label: 'Study Plan', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'dashboard' as Screen, label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  ]

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="mb-8 px-2">
        <h1 className="text-2xl font-bold text-foreground">StudyAI</h1>
        <p className="text-sm text-muted-foreground mt-1">Exam Preparation</p>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setCurrentScreen(item.id)
              setIsMobileMenuOpen(false)
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm ${
              currentScreen === item.id
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-muted'
            }`}
          >
            <span>{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="pt-6 border-t border-border mt-auto px-2">
        <p className="text-xs text-muted-foreground mb-2">Active Exam</p>
        <div className="text-sm space-y-1">
          <p className="font-medium text-foreground truncate">{examState.examName || 'New Exam'}</p>
          <p className="text-muted-foreground">{daysLeft} days left</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-card border-r border-border p-6 flex-col">
        <SidebarContent />
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top header */}
        <header className="bg-card border-b border-border px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Trigger */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-6">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            
            <h2 className="text-lg md:text-xl font-semibold text-foreground truncate">
              {currentScreen === 'setup' && 'Exam Setup'}
              {currentScreen === 'quiz' && 'Take Quiz'}
              {currentScreen === 'plan' && 'Weekly Study Plan'}
              {currentScreen === 'dashboard' && 'Dashboard'}
            </h2>
          </div>
          
          <div className="text-xs md:text-sm text-muted-foreground hidden sm:block">
            {currentScreen === 'quiz' && 'Active Quiz'}
            {currentScreen === 'plan' && 'Study Roadmap'}
            {currentScreen === 'dashboard' && 'Analytics'}
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto w-full">
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
        </div>
      </main>
    </div>
  )
}
