'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { ExamState } from '@/app/page'

interface QuizScreenProps {
  examState: ExamState
  setExamState: (state: ExamState) => void
  onContinue: () => void
}

const DIFFICULTY_CONFIG = {
  easy: { weight: 1, expectedTime: 30 },
  medium: { weight: 2, expectedTime: 60 },
  hard: { weight: 3, expectedTime: 120 },
}

export function QuizScreen({ examState, setExamState, onContinue }: QuizScreenProps) {
  const quizQuestions = examState.questions
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>(Array(quizQuestions.length).fill(null))
  const [showFeedback, setShowFeedback] = useState(false)
  const [questionTimes, setQuestionTimes] = useState<number[]>(Array(quizQuestions.length).fill(0))
  const [startTime, setStartTime] = useState<number>(Date.now())
  const [elapsedTime, setElapsedTime] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const currentQuestion = quizQuestions[currentQuestionIndex]
  const selectedAnswer = userAnswers[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / (quizQuestions.length || 1)) * 100
  
  const results = userAnswers.map((answer, idx) => {
    if (answer === null) return null
    const question = quizQuestions[idx]
    const isCorrect = answer === question.correctAnswer
    const timeTaken = questionTimes[idx]
    const config = DIFFICULTY_CONFIG[question.difficulty]
    const accuracy = isCorrect ? 1 : 0
    const speedScore = timeTaken > 0 ? config.expectedTime / timeTaken : 0
    const masteryScore = isCorrect ? (0.4 * accuracy) + (0.35 * Math.min(speedScore, 2)) + (0.25 * config.weight) : 0
    
    return {
      isCorrect,
      timeTaken,
      masteryScore,
      speedScore,
      topic: question.topic
    }
  })

  const correctCount = results.filter(r => r?.isCorrect).length
  const answeredCount = userAnswers.filter(a => a !== null).length
  const averageMastery = answeredCount > 0 
    ? results.filter(r => r !== null).reduce((acc, r) => acc + (r?.masteryScore || 0), 0) / answeredCount 
    : 0

  useEffect(() => {
    if (!showFeedback && currentQuestionIndex < quizQuestions.length) {
      setStartTime(Date.now())
      setElapsedTime(0)
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1)
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [currentQuestionIndex, showFeedback, quizQuestions.length])

  const handleSelectAnswer = (optionIndex: number) => {
    const timeTaken = Math.max(1, Math.floor((Date.now() - startTime) / 1000))
    const newTimes = [...questionTimes]
    newTimes[currentQuestionIndex] = timeTaken
    setQuestionTimes(newTimes)

    const newAnswers = [...userAnswers]
    newAnswers[currentQuestionIndex] = optionIndex
    setUserAnswers(newAnswers)
    setShowFeedback(true)
    
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const handleNext = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setShowFeedback(false)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
      setShowFeedback(false)
    }
  }

  const handleComplete = () => {
    // Map topic names to subjects
    const topicToSubject: Record<string, string> = {}
    examState.topics.forEach(t => {
      topicToSubject[t.name] = t.subject
    })

    // Calculate mean mastery for each topic
    const topicScores: Record<string, { total: number, count: number }> = {}
    
    results.forEach(r => {
      if (r) {
        if (!topicScores[r.topic]) topicScores[r.topic] = { total: 0, count: 0 }
        topicScores[r.topic].total += r.masteryScore
        topicScores[r.topic].count += 1
      }
    })

    const finalTopicMastery: Record<string, number> = { ...examState.topicMastery }
    Object.keys(topicScores).forEach(topic => {
      finalTopicMastery[topic] = topicScores[topic].total / topicScores[topic].count
    })

    // Calculate mean mastery for each subject
    const subjectScores: Record<string, { total: number, count: number }> = {}
    Object.keys(finalTopicMastery).forEach(topicName => {
      const subject = topicToSubject[topicName] || 'General'
      if (!subjectScores[subject]) subjectScores[subject] = { total: 0, count: 0 }
      subjectScores[subject].total += finalTopicMastery[topicName]
      subjectScores[subject].count += 1
    })

    const finalSubjectMastery: Record<string, number> = {}
    Object.keys(subjectScores).forEach(subject => {
      finalSubjectMastery[subject] = subjectScores[subject].total / subjectScores[subject].count
    })

    const currentAvgMastery = Object.values(finalTopicMastery).reduce((a, b) => a + b, 0) / (Object.keys(finalTopicMastery).length || 1)

    setExamState({
      ...examState,
      topicMastery: finalTopicMastery,
      subjectMastery: finalSubjectMastery,
      masteryHistory: [...examState.masteryHistory, { date: new Date().toISOString(), avgMastery: currentAvgMastery }],
      quizAttempts: examState.quizAttempts + 1
    })
    onContinue()
  }

  const handleRetake = () => {
    setCurrentQuestionIndex(0)
    setUserAnswers(Array(quizQuestions.length).fill(null))
    setShowFeedback(false)
    setQuestionTimes(Array(quizQuestions.length).fill(0))
    setStartTime(Date.now())
    setElapsedTime(0)
  }

  const isQuizComplete = userAnswers.every(answer => answer !== null)

  if (quizQuestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-muted-foreground">No questions available. Please set up your exam first.</p>
        <Button onClick={() => window.location.hash = 'setup'}>Go to Setup</Button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-base md:text-lg font-semibold">Attempt #{examState.quizAttempts + 1}</h3>
        <Button variant="ghost" size="sm" onClick={handleRetake} className="text-xs">Reset Attempt</Button>
      </div>
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] sm:text-sm">
          <span className="font-medium text-foreground">Question {currentQuestionIndex + 1} of {quizQuestions.length}</span>
          <div className="flex gap-2 sm:gap-4">
            <span className="text-muted-foreground">Time: {elapsedTime}s</span>
            <span className="text-muted-foreground">{Math.round(progress)}%</span>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question card */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] md:text-sm text-muted-foreground mb-1 md:mb-2">Question {currentQuestionIndex + 1} of {quizQuestions.length}</p>
              <h2 className="text-lg md:text-xl font-bold text-foreground leading-tight">{currentQuestion.question}</h2>
              <p className="text-xs md:text-sm text-muted-foreground mt-2">{currentQuestion.topic}</p>
            </div>
            <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 shrink-0">
              <div className={`px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-medium ${
                currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                currentQuestion.difficulty === 'medium' ? 'bg-accent/20 text-accent-foreground' :
                'bg-red-100 text-red-800'
              }`}>
                {currentQuestion.difficulty}
              </div>
              {showFeedback && results[currentQuestionIndex] && (
                <div className="text-[10px] md:text-xs font-semibold text-primary">
                  Mastery: {results[currentQuestionIndex]?.masteryScore.toFixed(2)}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6 space-y-4">
          {/* Answer options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = selectedAnswer === idx
              const isCorrect = idx === currentQuestion.correctAnswer
              const showCorrect = showFeedback && isCorrect
              const showIncorrect = showFeedback && isSelected && !isCorrect

              return (
                <button
                  key={idx}
                  onClick={() => !showFeedback && handleSelectAnswer(idx)}
                  disabled={showFeedback}
                  className={`w-full p-3 md:p-4 text-left rounded-lg border-2 transition-all ${
                    showCorrect ? 'border-study-strong bg-green-50 text-foreground' :
                    showIncorrect ? 'border-study-weak bg-red-50 text-foreground' :
                    isSelected && !showFeedback ? 'border-primary bg-primary/5' :
                    'border-border hover:border-primary'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 md:w-6 md:h-6 rounded border-2 mt-0.5 flex items-center justify-center flex-shrink-0 ${
                      showCorrect ? 'border-study-strong bg-study-strong text-white' :
                      showIncorrect ? 'border-study-weak bg-study-weak text-white' :
                      isSelected ? 'border-primary bg-primary text-primary-foreground' :
                      'border-border'
                    }`}>
                      {showCorrect ? '✓' : showIncorrect ? '✗' : ''}
                    </div>
                    <span className="text-sm md:font-medium">{option}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Feedback */}
          {showFeedback && (
            <div className={`p-3 md:p-4 rounded-lg space-y-2 ${
              selectedAnswer === currentQuestion.correctAnswer
                ? 'bg-green-50 border border-study-strong text-foreground'
                : 'bg-red-50 border border-study-weak text-foreground'
            }`}>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1">
                <p className="font-medium text-sm md:text-base">
                  {selectedAnswer === currentQuestion.correctAnswer ? '✓ Correct!' : '✗ Incorrect'}
                </p>
                <p className="text-[10px] md:text-xs text-muted-foreground">
                  Time: {questionTimes[currentQuestionIndex]}s (Expected: {DIFFICULTY_CONFIG[currentQuestion.difficulty].expectedTime}s)
                </p>
              </div>
              <p className="text-xs md:text-sm">
                {selectedAnswer === currentQuestion.correctAnswer
                  ? 'Great job!'
                  : `Correct answer: ${currentQuestion.options[currentQuestion.correctAnswer]}`}
              </p>
              <p className="text-xs italic border-t pt-2 leading-relaxed">
                {currentQuestion.explanation}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Score summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
            <p className="text-[10px] md:text-sm text-muted-foreground mb-1">Correct</p>
            <p className="text-lg md:text-2xl font-bold text-study-strong">{correctCount}/{answeredCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
            <p className="text-[10px] md:text-sm text-muted-foreground mb-1">Accuracy</p>
            <p className="text-lg md:text-2xl font-bold text-foreground">
              {answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
            <p className="text-[10px] md:text-sm text-muted-foreground mb-1">Avg Time</p>
            <p className="text-lg md:text-2xl font-bold text-foreground">
              {answeredCount > 0 ? Math.round(questionTimes.reduce((a, b) => a + b, 0) / answeredCount) : 0}s
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
            <p className="text-[10px] md:text-sm text-muted-foreground mb-1">Mastery</p>
            <p className="text-lg md:text-2xl font-bold text-primary">{averageMastery.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 justify-between pt-4">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
        >
          Previous
        </Button>
        {currentQuestionIndex === quizQuestions.length - 1 && isQuizComplete ? (
          <Button onClick={handleComplete}>
            View Study Plan
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={currentQuestionIndex === quizQuestions.length - 1 || selectedAnswer === null}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  )
}
