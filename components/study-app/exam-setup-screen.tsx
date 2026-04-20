'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { deconstructSyllabus } from '@/app/actions/syllabus-ai'
import { generateQuestionsFromTopics } from '@/app/actions/generate-questions'
import type { ExamState, Topic, BusyTimeSlot } from '@/app/page'
import Tesseract from 'tesseract.js'

// Import pdfjs-dist dynamically only on client
const getPdfjsLib = async () => {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
  return pdfjsLib
}

interface ExamSetupScreenProps {
  examState: ExamState
  setExamState: (state: ExamState) => void
  onContinue: () => void
}

export function ExamSetupScreen({ examState, setExamState, onContinue }: ExamSetupScreenProps) {
  const [hasMounted, setHasMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isOcrProcessing, setIsOcrProcessing] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  const handleExamNameChange = (name: string) => {
    setExamState({ ...examState, examName: name })
  }

  const handleExamDateChange = (date: string) => {
    setExamState({ ...examState, examDate: date })
  }

  const handleSyllabusChange = (syllabus: string) => {
    setExamState({ ...examState, syllabus })
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsOcrProcessing(true)
    setError('')
    try {
      if (file.type === 'application/pdf') {
        // Handle PDF files
        const pdfjsLib = await getPdfjsLib()
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        let extractedText = ''

        for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
          try {
            const page = await pdf.getPage(i)
            const textContent = await page.getTextContent()
            const pageText = textContent.items
              .map((item: any) => {
                if (typeof item.str === 'string') {
                  return item.str
                }
                return ''
              })
              .join(' ')
              .trim()

            if (pageText) {
              extractedText += pageText + '\n'
            }
          } catch (pageError) {
            console.error(`Failed to process page ${i}:`, pageError)
          }
        }

        if (!extractedText.trim()) {
          setError('No text found in PDF. The PDF may be image-based or encrypted.')
          setIsOcrProcessing(false)
          return
        }

        setExamState({ ...examState, syllabus: extractedText })
      } else {
        // Handle image files with OCR
        const reader = new FileReader()
        reader.onload = async (e) => {
          try {
            const imageData = e.target?.result as string
            const result = await Tesseract.recognize(imageData)
            const extractedText = result.data.text

            if (!extractedText.trim()) {
              setError('No text detected in image. Try a clearer image.')
              return
            }

            setExamState({ ...examState, syllabus: extractedText })
          } catch (ocrError) {
            setError('Failed to extract text from image. Please try again.')
            console.error(ocrError)
          } finally {
            setIsOcrProcessing(false)
          }
        }
        reader.readAsDataURL(file)
        return
      }
    } catch (err) {
      setError(
        file.type === 'application/pdf'
          ? 'Failed to process PDF. The file may be corrupted or not a valid PDF.'
          : 'Failed to extract text from image. Please try again.'
      )
      console.error(err)
    } finally {
      setIsOcrProcessing(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleProcessSyllabus = async () => {
    if (!examState.syllabus.trim()) {
      setError('Please enter syllabus content')
      return
    }

    setIsLoading(true)
    setError('')
    try {
      // Step 1: Deconstruct syllabus into topics
      const topicsResult = await deconstructSyllabus(examState.examName, examState.syllabus)
      const newExamState = {
        ...examState,
        topics: topicsResult.topics as Topic[],
      }

      // Step 2: Generate questions from topics
      const questionsResult = await generateQuestionsFromTopics(examState.examName, topicsResult.topics)
      newExamState.questions = questionsResult.questions

      setExamState(newExamState)
    } catch (err) {
      setError('Failed to process syllabus. Please try again.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const totalHours = examState.topics.reduce((sum, topic) => sum + topic.estimatedHours, 0)
  const daysLeft = hasMounted
    ? Math.ceil((new Date(examState.examDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0

  if (!hasMounted) {
    return (
      <div className="max-w-3xl space-y-6">
        <Card className="animate-pulse">
          <div className="h-64 bg-muted rounded-lg" />
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Exam Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Exam Name</label>
            <Input
              value={examState.examName}
              onChange={(e) => handleExamNameChange(e.target.value)}
              className="w-full"
              placeholder="Enter exam name"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Exam Date</label>
            <Input
              type="date"
              value={examState.examDate}
              onChange={(e) => handleExamDateChange(e.target.value)}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground mt-2">{daysLeft} days remaining</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Busy Times</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add your busy times (work, classes, etc.) so the study plan avoids scheduling sessions during these periods.
          </p>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {examState.busyTimes.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No busy times added yet</p>
            ) : (
              examState.busyTimes.map((slot, idx) => (
                <div key={idx} className="p-3 border border-border rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      {slot.day}: {slot.startTime} - {slot.endTime}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const updated = examState.busyTimes.filter((_, i) => i !== idx)
                      setExamState({ ...examState, busyTimes: updated })
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-3 border-t border-border">
            <select
              defaultValue=""
              onChange={(e) => {
                const day = e.target.value
                if (day) {
                  const form = e.currentTarget.parentElement?.parentElement
                  const startInput = form?.querySelector('input[placeholder="Start time"]') as HTMLInputElement
                  const endInput = form?.querySelector('input[placeholder="End time"]') as HTMLInputElement
                  if (startInput?.value && endInput?.value) {
                    const newSlot: typeof examState.busyTimes[0] = {
                      day,
                      startTime: startInput.value,
                      endTime: endInput.value,
                    }
                    setExamState({ ...examState, busyTimes: [...examState.busyTimes, newSlot] })
                    startInput.value = ''
                    endInput.value = ''
                    e.target.value = ''
                  }
                }
              }}
              className="px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground"
            >
              <option value="">Select day</option>
              <option value="Monday">Monday</option>
              <option value="Tuesday">Tuesday</option>
              <option value="Wednesday">Wednesday</option>
              <option value="Thursday">Thursday</option>
              <option value="Friday">Friday</option>
              <option value="Saturday">Saturday</option>
              <option value="Sunday">Sunday</option>
            </select>

            <input
              type="time"
              placeholder="Start time"
              className="px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground"
            />

            <input
              type="time"
              placeholder="End time"
              className="px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground"
            />

            <Button
              onClick={(e) => {
                const form = e.currentTarget.parentElement
                const daySelect = form?.querySelector('select') as HTMLSelectElement
                const startInput = form?.querySelector('input[type="time"]:first-of-type') as HTMLInputElement
                const endInput = form?.querySelector('input[type="time"]:last-of-type') as HTMLInputElement

                const day = daySelect?.value
                const startTime = startInput?.value
                const endTime = endInput?.value

                if (day && startTime && endTime) {
                  if (startTime >= endTime) {
                    setError('End time must be after start time')
                    return
                  }

                  const newSlot: typeof examState.busyTimes[0] = {
                    day,
                    startTime,
                    endTime,
                  }
                  setExamState({ ...examState, busyTimes: [...examState.busyTimes, newSlot] })
                  daySelect.value = ''
                  startInput.value = ''
                  endInput.value = ''
                  setError('')
                } else {
                  setError('Please fill in all busy time fields')
                }
              }}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Add Time
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Syllabus Input</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Upload Syllabus Image (OCR)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                disabled={isOcrProcessing}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isOcrProcessing}
                className="w-full"
              >
                {isOcrProcessing ? 'Extracting Text...' : 'Upload Image or PDF'}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Upload a photo or scan of your syllabus
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Or Paste Syllabus Text
              </label>
              <Button
                variant="outline"
                onClick={() => setExamState({ ...examState, syllabus: '' })}
                className="w-full"
              >
                Paste Text Directly
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Paste from text editor or document
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Syllabus Content
            </label>
            <textarea
              value={examState.syllabus}
              onChange={(e) => handleSyllabusChange(e.target.value)}
              placeholder="Your syllabus content will appear here after uploading an image or pasting text..."
              className="w-full h-48 p-3 border border-border rounded-lg font-mono text-sm resize-none bg-background text-foreground"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Our AI will analyze your syllabus and create focused study topics
            </p>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button
            onClick={handleProcessSyllabus}
            disabled={isLoading || isOcrProcessing || !examState.syllabus.trim()}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isLoading ? 'Processing Syllabus...' : 'Generate Study Topics with AI'}
          </Button>
        </CardContent>
      </Card>

      {examState.topics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Study Topics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {examState.topics.map((topic) => (
                <div key={topic.id} className="p-4 border border-border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-foreground">{topic.name}</h3>
                    <span className="text-sm bg-muted px-2 py-1 rounded text-muted-foreground">
                      {topic.estimatedHours}h
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {topic.subtopics.map((subtopic, idx) => (
                      <span key={idx} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                        {subtopic}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total Study Time</p>
                <p className="text-2xl font-bold text-foreground">{totalHours} hours</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {totalHours > 0
                    ? `About ${Math.ceil(totalHours / Math.max(daysLeft, 1))} hours per day`
                    : 'Based on AI analysis'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3 justify-end pt-4">
        <Button variant="outline" className="px-6">
          Cancel
        </Button>
        <Button onClick={onContinue} disabled={examState.questions.length === 0} className="px-6">
          Continue to Quiz
        </Button>
      </div>
    </div>
  )
}
