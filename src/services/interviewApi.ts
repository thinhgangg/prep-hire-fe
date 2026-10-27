const AI_API_BASE = (import.meta.env.VITE_AI_API_BASE_URL || 'http://localhost:9001').replace(/\/$/, '')

export type InterviewQuestion = {
  turn_index: number
  stage: string
  question: string
}

export type InterviewTurn = InterviewQuestion & {
  answer: string | null
  question_source: string
  provider_name?: string | null
  model_name?: string | null
  generation_latency_ms?: number
  answer_scoring_latency_ms?: number
  answer_scorer_version?: string | null
  answer_evidence?: {
    status?: string
    scores?: Record<string, number>
    applicable_scores?: Record<string, number>
    applicable_criteria?: string[]
    error?: string
  } | null
}

export type InterviewSession = {
  session_id: string
  status: string
  language: string
  max_questions: number
  current_stage: string
  current_question: InterviewQuestion | null
  turns: InterviewTurn[]
}

export type CvAnalysis = {
  analysis_result_id?: number | null
  extracted_profile: {
    cv_level: string
    cv_years_experience: number
    preferred_locations: string[]
    cv_certifications: string[]
    cv_skills: { name: string; proficiency: number; years_of_experience: number }[]
  }
  job_context: {
    job_id: number
    title: string
    source_url: string
    job_level: string
    job_years_required: number
    job_location?: string | null
    job_is_remote: boolean
    job_skills: { name: string; importance: number; required_proficiency: number }[]
  }
  job_match: {
    score: number
    scoreBreakdownJson: Record<string, number | null>
    missingSkills: string[]
    matchedSkills: string[]
  }
  gap_analysis: {
    skillGap: {
      missing: { skill: string; importance: string; reason: string }[]
      weak: { skill: string; current_proficiency: number; required_proficiency: number; gap: number }[]
    }
    experienceGap: { required_years: number; current_years: number; gap_weeks: number }
    levelGap: { cv_level: string; job_level: string; gap_levels: number }
    certificationGap: { required: string[]; have: string[]; missing: string[] }
    recommendedSkills: string[]
  }
  roadmap: {
    phases: {
      phase: number
      duration_weeks: number
      title: string
      skills: { skill_name: string; priority: number; estimated_weeks: number }[]
    }[]
    total_weeks: number
    estimated_completion: string
    difficulty_level: string
  }
  ai_review?: {
    summary: string
    strengths: string[]
    concerns: string[]
    recommendations: string[]
    verdict: string
    source: string
  } | null
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) return response.json() as Promise<T>
  let message = `HTTP ${response.status}`
  try {
    const body = await response.json()
    message = typeof body.detail === 'string' ? body.detail : message
  } catch {
    // Keep the HTTP status when the server did not return JSON.
  }
  throw new Error(message)
}

export async function createInterviewSession(
  cvFile: File,
  jdText: string,
  maxQuestions = 8,
): Promise<InterviewSession> {
  const form = new FormData()
  form.append('cv_file', cvFile)
  form.append('jd_text', jdText)
  form.append('language', 'vi')
  form.append('max_questions', String(maxQuestions))
  form.append('allow_external_ai', 'true')
  form.append('research_consent', 'false')

  const response = await fetch(`${AI_API_BASE}/api/v1/interview/sessions/files`, {
    method: 'POST',
    body: form,
  })
  return parseResponse<InterviewSession>(response)
}

export async function createInterviewSessionFromText(
  cvText: string,
  jdText: string,
  maxQuestions = 8,
): Promise<InterviewSession> {
  const response = await fetch(`${AI_API_BASE}/api/v1/interview/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cv_text: cvText,
      jd_text: jdText,
      language: 'vi',
      max_questions: maxQuestions,
      allow_external_ai: true,
      research_consent: false,
    }),
  })
  return parseResponse<InterviewSession>(response)
}

export async function analyzeCv(cvFile: File, jdText: string): Promise<CvAnalysis> {
  const form = new FormData()
  form.append('cv_file', cvFile)
  form.append('jd_text', jdText)
  form.append('timeframe_weeks', '0')
  form.append('max_skills_per_phase', '4')

  const response = await fetch(`${AI_API_BASE}/api/v1/cv/scan-upload`, {
    method: 'POST',
    body: form,
  })
  return parseResponse<CvAnalysis>(response)
}

export async function submitInterviewAnswer(
  sessionId: string,
  answer: string,
): Promise<InterviewSession> {
  const response = await fetch(`${AI_API_BASE}/api/v1/interview/sessions/${sessionId}/answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answer }),
  })
  return parseResponse<InterviewSession>(response)
}

export const INTERVIEW_SESSION_STORAGE_KEY = 'pbl6-ai-interview-session'
export const CV_ANALYSIS_STORAGE_KEY = 'pbl6-cv-analysis'

export function saveInterviewSession(session: InterviewSession): void {
  sessionStorage.setItem(INTERVIEW_SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function loadInterviewSession(): InterviewSession | null {
  try {
    const value = sessionStorage.getItem(INTERVIEW_SESSION_STORAGE_KEY)
    return value ? JSON.parse(value) as InterviewSession : null
  } catch {
    return null
  }
}

export function saveCvAnalysis(analysis: CvAnalysis): void {
  sessionStorage.setItem(CV_ANALYSIS_STORAGE_KEY, JSON.stringify(analysis))
}

export function clearCvAnalysis(): void {
  sessionStorage.removeItem(CV_ANALYSIS_STORAGE_KEY)
}

export function loadCvAnalysis(): CvAnalysis | null {
  try {
    const value = sessionStorage.getItem(CV_ANALYSIS_STORAGE_KEY)
    return value ? JSON.parse(value) as CvAnalysis : null
  } catch {
    return null
  }
}
