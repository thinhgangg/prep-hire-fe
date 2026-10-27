const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8002').replace(/\/$/, '')

export type TurnEvidenceScores = {
  answer_relevance: number
  technical_correctness: number
  expected_signal_coverage: number
  reasoning_quality: number
  evidence_quality: number
  clarity_conciseness: number
  consistency: number
}

export type InterviewQuestion = {
  question: string
  criterion: string
  stage: string
  question_source?: string
  difficulty?: number
}

export type InterviewSessionData = {
  session_id: string
  status: string
  current_turn_index: number
  max_questions: number
  current_question: InterviewQuestion | null
  turns: any[]
}

export async function createSessionWithUpload(params: {
  cvFile?: File | null
  cvId?: number | null
  jobId?: number | null
  jdFile?: File | null
  jdText?: string | null
  language?: string
  maxQuestions?: number
}): Promise<InterviewSessionData> {
  const form = new FormData()
  if (params.cvFile) form.append('cv_file', params.cvFile)
  if (params.cvId) form.append('cv_id', String(params.cvId))
  if (params.jobId && params.jobId > 0) form.append('job_id', String(params.jobId))
  if (params.jdFile) form.append('jd_file', params.jdFile)
  if (params.jdText) form.append('jd_text', params.jdText)
  form.append('language', params.language || 'vi')
  form.append('max_questions', String(params.maxQuestions || 5))
  form.append('allow_external_ai', 'true')

  const res = await fetch(`${API_BASE}/api/v1/interview/sessions/upload`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Khởi tạo phiên phỏng vấn thất bại: ${errorText}`)
  }
  return res.json()
}

export async function createStoredSession(jobId: number, cvId: number = 52, maxQuestions: number = 5): Promise<InterviewSessionData> {
  const res = await fetch(`${API_BASE}/api/v1/interview/demo/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      job_id: jobId,
      cv_id: cvId,
      language: 'vi',
      max_questions: maxQuestions,
      allow_external_ai: true,
    }),
  })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Tạo phiên phỏng vấn thất bại: ${errorText}`)
  }
  return res.json()
}

export async function createCustomSession(cvText: string, jdText: string, maxQuestions: number = 5): Promise<InterviewSessionData> {
  const res = await fetch(`${API_BASE}/api/v1/interview/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cv_text: cvText.length >= 30 ? cvText : cvText + ' '.repeat(35),
      jd_text: jdText.length >= 30 ? jdText : jdText + ' '.repeat(35),
      language: 'vi',
      max_questions: maxQuestions,
      allow_external_ai: true,
    }),
  })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Tạo phiên phỏng vấn tùy chỉnh thất bại: ${errorText}`)
  }
  return res.json()
}

export async function submitInterviewAnswer(sessionId: string, answer: string): Promise<InterviewSessionData> {
  const res = await fetch(`${API_BASE}/api/v1/interview/sessions/${sessionId}/answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answer: answer || 'Tôi chưa có câu trả lời cụ thể cho câu hỏi này.' }),
  })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Chấm điểm câu trả lời thất bại: ${errorText}`)
  }
  return res.json()
}

export async function getEvidenceSummary(sessionId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/v1/interview/sessions/${sessionId}/evidence-summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Không thể tạo báo cáo năng lực: ${errorText}`)
  }
  return res.json()
}
