const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

export type DbJob = {
  id: number
  title: string
  company: string
  location: string
  level?: string | null
  skills: string[]
  accent: string
}

const ACCENT_COLORS = ['#5b5bd6', '#12805c', '#d97745', '#0284c7', '#7c3aed', '#db2777', '#ca8a04', '#0d9488']

export async function fetchRealJobs(): Promise<DbJob[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/interview/demo/options`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (Array.isArray(data.jobs) && data.jobs.length > 0) {
      return data.jobs.map((item: any, idx: number) => ({
        id: item.job_id,
        title: item.title,
        company: item.company_name || 'Doanh nghiệp Công nghệ',
        location: item.location || 'Việt Nam',
        level: item.level || null,
        accent: ACCENT_COLORS[idx % ACCENT_COLORS.length],
        skills: [
          item.level ? `Level: ${item.level.toUpperCase()}` : 'Toàn thời gian',
          item.location || 'Việt Nam',
          'Dữ liệu thực',
        ],
      }))
    }
  } catch (err) {
    console.warn('Cannot fetch real jobs, using fallback:', err)
  }
  return [
    { id: 1, title: 'Senior Frontend Developer', company: 'Northstar Labs', location: 'Hà Nội · Hybrid', level: 'Senior', accent: '#5b5bd6', skills: ['React', 'TypeScript', 'System Design'] },
    { id: 2, title: 'Backend Developer', company: 'Vertex Technology', location: 'TP. Hồ Chí Minh', level: 'Middle', accent: '#12805c', skills: ['Node.js', 'PostgreSQL', 'REST API'] },
    { id: 3, title: 'Product Designer', company: 'Design Co', location: 'Remote', level: 'Senior', accent: '#d97745', skills: ['Figma', 'UX Research', 'Design System'] },
  ]
}
