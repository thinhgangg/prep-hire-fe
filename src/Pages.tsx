import {
  createStoredSession,
  createCustomSession,
  submitInterviewAnswer,
  getEvidenceSummary,
  loadCvAnalysis,
  loadInterviewSession,
  saveInterviewSession,
  type CvAnalysis,
  type InterviewSession,
  type InterviewTurn,
} from './services/interviewApi'
import { fetchRealJobs, DbJob } from './services/jobApi'
import { useEffect, useRef, useState } from 'react'
import { Activity, ArrowDownToLine, ArrowLeft, ArrowRight, BarChart3, Bell, BriefcaseBusiness, CalendarDays, Camera, Check, CheckCircle2, ChevronDown, Circle, CircleHelp, Clock3, Download, FileText, Filter, Headphones, LogOut, Mail, MapPin, Mic, MicOff, MoreHorizontal, Plus, Search, Settings, ShieldCheck, Sparkles, Square, Star, Target, TrendingUp, Users, Video, VideoOff, Wifi, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import type { Page } from './App'
import { createSttJob, getSttJob, STT_JOB_STORAGE_KEY, STT_RESULT_STORAGE_KEY, type SttJob, type TranscriptResult } from './services/sttApi'
import { clientGazeTracker, GAZE_RESULT_STORAGE_KEY, type GazeReportResult } from './services/gazeTracker'

type Props = { go: (page: Page) => void; page?: Page }

function Shell({ page, go, children, wide=false }: Props & {children: React.ReactNode; wide?: boolean}) {
  return <div className={`app sub-page ${wide?'wide':''}`}><SubSidebar page={page} go={go}/><main className="content sub-content">{children}</main></div>
}

function SubSidebar({page,go}:Props){
  const [open,setOpen]=useState(false)
  const items:[Page,string,React.ReactNode][]=[['dashboard','Tổng quan',<BarChart3/>],['interviews','Phỏng vấn',<Sparkles/>],['candidates','Ứng viên',<Users/>],['jobs','Công việc',<BriefcaseBusiness/>],['reports','Báo cáo',<FileText/>],['settings','Cài đặt',<Settings/>]]
  const move=(id:Page)=>{go(id);setOpen(false)}
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const handleLogout = () => {
    logout()
    navigate('/login')
  }
  return <><button className="mobile-menu" onClick={()=>setOpen(true)}><MoreHorizontal/></button>{open&&<div className="scrim" onClick={()=>setOpen(false)}/>}<aside className={`sidebar unified-sidebar ${open?'open':''}`}><div className="side-logo"><button className="unified-logo" onClick={()=>move('dashboard')}><i><Sparkles/></i><span>Interviewly</span></button><button onClick={()=>setOpen(false)}><X/></button></div><nav><small>KHÔNG GIAN LÀM VIỆC</small>{items.slice(0,5).map(([id,label,icon])=><button key={id} className={(page===id || (id==='interviews'&&['start','analysis','device','room','processing'].includes(page||'')) || (id==='reports'&&page==='report'))?'active':''} onClick={()=>move(id)}>{icon}{label}{id==='interviews'&&<span>12</span>}</button>)}<small>QUẢN LÝ</small><button className={page==='settings'?'active':''} onClick={()=>move('settings')}><Settings/> Cài đặt</button><button><CircleHelp/> Trung tâm hỗ trợ</button></nav><div className="upgrade"><div className="spark"><Sparkles size={18}/></div><b>Mở khóa sức mạnh AI</b><p>Nâng cấp để phỏng vấn không giới hạn.</p><button>Tìm hiểu thêm</button></div><div className="profile"><div className="avatar">{user?.name ? user.name.split(' ').map(x=>x[0]).join('').slice(-2) : 'HN'}</div><div><b>{user?.name || 'Hoàng Nam'}</b><small>Quản trị viên</small></div><button onClick={handleLogout} title="Đăng xuất" style={{ border: 0, background: 'none', cursor: 'pointer', padding: '6px', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LogOut size={16}/></button></div></aside></>
}

function PageHeader({eyebrow,title,desc,action}: {eyebrow?:string;title:string;desc:string;action?:React.ReactNode}){
  return <header className="page-header"><div>{eyebrow&&<small>{eyebrow}</small>}<h1>{title}</h1><p>{desc}</p></div><div className="page-actions"><button className="icon-btn"><Bell/></button>{action}</div></header>
}

const people=[
  {name:'Nguyễn Minh Anh',initial:'MA',role:'Senior Frontend Developer',date:'28/09/2026 · 14:30',status:'Hoàn thành',score:86,color:'sage'},
  {name:'Trần Gia Bảo',initial:'GB',role:'Backend Developer',date:'27/09/2026 · 10:00',status:'Hoàn thành',score:79,color:'lavender'},
  {name:'Lê Thu Hà',initial:'TH',role:'Product Designer',date:'27/09/2026 · 09:15',status:'Đang xử lý',score:null,color:'peach'},
  {name:'Phạm Quốc Huy',initial:'QH',role:'Senior Frontend Developer',date:'26/09/2026 · 16:00',status:'Đã lên lịch',score:null,color:'blueish'},
  {name:'Vũ Khánh Linh',initial:'KL',role:'Data Analyst',date:'25/09/2026 · 11:30',status:'Chưa hoàn thành',score:42,color:'rose'},
]

export function InterviewsPage({go}:Props){
  const [filter,setFilter]=useState('Tất cả')
  const shown=people.filter(p=>filter==='Tất cả'||p.status===filter)
  return <Shell page="interviews" go={go}><PageHeader title="Phỏng vấn" desc="Quản lý và theo dõi tất cả phiên phỏng vấn." action={<button className="primary" onClick={()=>go('start')}><Plus/> Tạo phỏng vấn</button>}/><div className="metric-strip"><div><span><Video/></span><p><small>TỔNG PHIÊN</small><b>42</b></p><em>+8 tháng này</em></div><div><span><CheckCircle2/></span><p><small>HOÀN THÀNH</small><b>34</b></p><em>81%</em></div><div><span><Clock3/></span><p><small>ĐÃ LÊN LỊCH</small><b>06</b></p><em>Tuần này</em></div><div><span><Activity/></span><p><small>ĐANG XỬ LÝ</small><b>02</b></p><em>Khoảng 2 phút</em></div></div>
    <section className="data-panel"><div className="data-toolbar"><div className="search-box"><Search/><input placeholder="Tìm ứng viên, vị trí..."/></div><div className="tabs">{['Tất cả','Hoàn thành','Đã lên lịch','Đang xử lý'].map(t=><button key={t} className={filter===t?'active':''} onClick={()=>setFilter(t)}>{t}</button>)}</div><button className="outline"><Filter/> Bộ lọc</button></div><div className="records"><div className="record-head"><span>ỨNG VIÊN</span><span>VỊ TRÍ</span><span>THỜI GIAN</span><span>TRẠNG THÁI</span><span>ĐIỂM AI</span><span></span></div>{shown.map((p,i)=><div className="record" key={p.name}><div className="person"><i className={p.color}>{p.initial}</i><p><b>{p.name}</b><small>{`INT-2026-${1042-i}`}</small></p></div><div><b>{p.role}</b><small>Product & Engineering</small></div><div><span>{p.date}</span></div><div><span className={`tag-status s${i}`}>{p.status}</span></div><div>{p.score?<strong className={p.score>80?'good':''}>{p.score}<small>/100</small></strong>:<span>—</span>}</div><button className="dots" onClick={()=>p.score&&go('report')}><MoreHorizontal/></button></div>)}</div><div className="pagination"><span>Hiển thị 1–5 trong 42 kết quả</span><div><button>‹</button><button className="active">1</button><button>2</button><button>3</button><button>›</button></div></div></section>
  </Shell>
}

export function CandidatesPage({go}:Props){
  return <Shell page="candidates" go={go}><PageHeader title="Ứng viên" desc="Theo dõi hồ sơ và tiến trình đánh giá ứng viên." action={<button className="primary" onClick={()=>go('start')}><Plus/> Thêm ứng viên</button>}/><div className="candidate-toolbar"><div className="search-box"><Search/><input placeholder="Tìm theo tên, email hoặc kỹ năng..."/></div><button className="outline"><Filter/> Tất cả vị trí</button><button className="outline"><ChevronDown/> Trạng thái</button></div><div className="candidate-grid">{people.slice(0,4).map((p,i)=><article className="candidate-profile" key={p.name}><button className="dots"><MoreHorizontal/></button><i className={`profile-avatar ${p.color}`}>{p.initial}</i><h3>{p.name}</h3><p>{p.role}</p><div className="skill-chips">{[['React','TypeScript','Figma'],['Node.js','AWS','SQL'],['UX/UI','Research','Figma'],['React','Next.js','GraphQL']][i].map(x=><span key={x}>{x}</span>)}</div><div className="profile-meta"><span><Mail/> {p.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replaceAll(' ','.')}@email.com</span><span><CalendarDays/> Ứng tuyển {i+2} ngày trước</span></div><div className="profile-foot"><span className={`tag-status s${i}`}>{p.status}</span><button onClick={()=>go('report')}>Xem hồ sơ <ArrowRight/></button></div></article>)}</div></Shell>
}

const jobCards=[
  {title:'Senior Frontend Developer',dept:'Product & Engineering',place:'Hà Nội · Hybrid',count:18,days:12,color:'#5c5cc9',skills:['React','TypeScript','Next.js']},
  {title:'Backend Developer',dept:'Engineering',place:'TP. Hồ Chí Minh',count:14,days:18,color:'#287d5a',skills:['Node.js','PostgreSQL','AWS']},
  {title:'Product Designer',dept:'Product & Design',place:'Remote',count:9,days:7,color:'#c87548',skills:['Figma','UX Research','UI Design']},
  {title:'Data Analyst',dept:'Data & Insights',place:'Hà Nội',count:11,days:21,color:'#4c729b',skills:['SQL','Python','Tableau']},
]
export function JobsPage({ go }: Props) {
  const [jobList, setJobList] = useState<DbJob[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetchRealJobs().then(res => {
      setJobList(res)
      setLoading(false)
    })
  }, [])

  const filtered = jobList.filter(j =>
    j.title.toLowerCase().includes(query.toLowerCase()) ||
    j.company.toLowerCase().includes(query.toLowerCase()) ||
    j.location.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <Shell page="jobs" go={go}>
      <PageHeader
        title="Công việc"
        desc={`Danh sách ${jobList.length} vị trí tuyển dụng thực tế đang có trong kho dữ liệu.`}
        action={<button className="primary" onClick={() => go('start')}><Plus /> Tạo phỏng vấn mới</button>}
      />
      <div style={{ marginBottom: '20px' }}>
        <div className="job-search" style={{ maxWidth: '480px' }}>
          <Search />
          <input
            placeholder="Tìm kiếm công việc, công ty hoặc địa điểm..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </div>
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          Đang nạp danh sách công việc từ kho dữ liệu...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {filtered.map(j => (
            <div key={j.id} className="white-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                  <span className="job-icon" style={{ background: j.accent, width: '42px', height: '42px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
                    {j.title.split(' ').slice(0, 2).map(x => x[0]).join('')}
                  </span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px' }}>{j.title}</h4>
                    <small style={{ color: '#6b7280' }}>{j.company} · {j.location}</small>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '12px 0' }}>
                  {j.skills.map(s => (
                    <span key={s} style={{ background: '#f3f4f6', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', color: '#374151' }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <button className="outline" style={{ marginTop: '12px', width: '100%', cursor: 'pointer' }} onClick={() => go('start')}>
                Phỏng vấn vị trí này
              </button>
            </div>
          ))}
        </div>
      )}
    </Shell>
  )
}

export function ReportsPage({go}:Props){return <Shell page="reports" go={go}><PageHeader title="Báo cáo" desc="Tổng hợp chất lượng ứng viên và hiệu quả tuyển dụng." action={<button className="outline"><Download/> Xuất báo cáo</button>}/><div className="report-overview"><section><span className="pill"><TrendingUp/> HIỆU SUẤT TUYỂN DỤNG</span><h2>Chất lượng ứng viên<br/>tăng <em>8.4%</em></h2><p>Dựa trên 42 buổi phỏng vấn trong 30 ngày qua.</p><div className="line-chart"><svg viewBox="0 0 500 120" preserveAspectRatio="none"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#528166" stopOpacity=".3"/><stop offset="1" stopColor="#528166" stopOpacity="0"/></linearGradient></defs><path d="M0,92 C50,88 75,72 112,78 S180,58 220,62 S280,35 330,45 S410,22 500,15 L500,120 L0,120Z" fill="url(#area)"/><path d="M0,92 C50,88 75,72 112,78 S180,58 220,62 S280,35 330,45 S410,22 500,15" fill="none" stroke="#426f57" strokeWidth="3"/></svg><div><span>01/09</span><span>08/09</span><span>15/09</span><span>22/09</span><span>29/09</span></div></div></section><aside><h3>Phân bổ đánh giá</h3><div className="donut"><div><b>42</b><small>ỨNG VIÊN</small></div></div><ul><li><i className="excellent"></i><span>Phù hợp cao</span><b>38%</b></li><li><i className="normal"></i><span>Cần xem xét</span><b>45%</b></li><li><i className="low"></i><span>Chưa phù hợp</span><b>17%</b></li></ul></aside></div><section className="data-panel report-list"><div className="panel-title"><div><h2>Báo cáo gần đây</h2><p>Đánh giá chi tiết từ AI</p></div><button className="text-btn">Xem tất cả <ArrowRight/></button></div>{people.slice(0,3).map((p,i)=><div className="report-row" key={p.name}><div className="person"><i className={p.color}>{p.initial}</i><p><b>{p.name}</b><small>{p.role}</small></p></div><div className="mini-scores"><span><small>CHUYÊN MÔN</small><b>{[88,82,76][i]}</b></span><span><small>GIAO TIẾP</small><b>{[81,75,84][i]}</b></span><span><small>PHÙ HỢP</small><b>{[90,78,80][i]}</b></span></div><strong>{p.score||82}<small>/100</small></strong><button className="outline" onClick={()=>go('report')}>Xem báo cáo</button></div>)}</section></Shell>}

export function SettingsPage({go}:Props){
  const [tab,setTab]=useState('Hồ sơ')
  return <Shell page="settings" go={go}><PageHeader title="Cài đặt" desc="Quản lý tài khoản và tùy chỉnh không gian làm việc."/><div className="settings-layout"><aside>{['Hồ sơ','Không gian làm việc','Thông báo','Tích hợp','Bảo mật'].map(t=><button className={tab===t?'active':''} onClick={()=>setTab(t)} key={t}>{t}</button>)}</aside><section className="settings-card"><div><h2>{tab}</h2><p>Cập nhật thông tin và thiết lập {tab.toLowerCase()} của bạn.</p></div>{tab==='Hồ sơ'?<><div className="photo-row"><div className="avatar big">HN</div><div><button className="outline">Thay đổi ảnh</button><p>JPG hoặc PNG, tối đa 2MB.</p></div></div><div className="form-grid"><label>Họ và tên<input defaultValue="Hoàng Nam"/></label><label>Chức danh<input defaultValue="Talent Lead"/></label><label>Email công việc<input defaultValue="nam.hoang@interviewly.vn"/></label><label>Số điện thoại<input defaultValue="+84 912 345 678"/></label></div><label className="full-label">Giới thiệu<textarea defaultValue="Talent Acquisition Lead với hơn 6 năm kinh nghiệm xây dựng đội ngũ sản phẩm và công nghệ."/></label></>:<div className="setting-options">{['Cho phép thông báo qua email','Nhận báo cáo hàng tuần','Tự động lưu bản ghi phỏng vấn','Bật xác thực hai lớp'].map((x,i)=><label key={x}><span><b>{x}</b><small>Thiết lập này áp dụng cho toàn bộ không gian làm việc.</small></span><input type="checkbox" defaultChecked={i<2}/><i></i></label>)}</div>}<div className="settings-save"><button className="primary">Lưu thay đổi</button></div></section></div></Shell>
}

function CvAnalysisPanel({analysis}:{analysis:CvAnalysis}){
 const profile=analysis.extracted_profile,match=analysis.job_match,gap=analysis.gap_analysis,review=analysis.ai_review
 const breakdownLabels:Record<string,string>={skillMatch:'Kỹ năng',experienceMatch:'Kinh nghiệm',levelMatch:'Cấp độ',salaryMatch:'Lương',locationMatch:'Địa điểm',keywordMatch:'Từ khóa',titleMatch:'Chức danh',atsReadability:'Khả năng đọc ATS'}
 return <section className="cv-analysis-result"><div className="cv-result-heading"><div><span className="pill"><Sparkles/> KẾT QUẢ PHÂN TÍCH CV</span><h2>Mức độ phù hợp với {analysis.job_context.title}</h2><p>{review?.summary||'Kết quả được tổng hợp từ hồ sơ ứng viên và yêu cầu công việc.'}</p></div><div className="cv-match-score"><b>{match.score}</b><small>/100</small><span>{review?.verdict||'Điểm phù hợp'}</span></div></div><div className="cv-result-grid"><article><h3>Hồ sơ trích xuất</h3><dl><div><dt>Cấp độ</dt><dd>{profile.cv_level}</dd></div><div><dt>Kinh nghiệm</dt><dd>{profile.cv_years_experience} năm</dd></div><div><dt>Chứng chỉ</dt><dd>{profile.cv_certifications.join(', ')||'Chưa xác định'}</dd></div></dl><h4>Kỹ năng trong CV</h4><div className="cv-tags">{profile.cv_skills.length?profile.cv_skills.map(skill=><span key={skill.name}>{skill.name} · {Math.round(skill.proficiency*100)}%</span>):<em>Chưa trích xuất được kỹ năng</em>}</div></article><article><h3>Chi tiết mức độ phù hợp</h3><div className="cv-breakdown">{Object.entries(match.scoreBreakdownJson).filter(([,value])=>value!==null).map(([key,value])=><div key={key}><span>{breakdownLabels[key]||key}<b>{value}%</b></span><i><em style={{width:`${Math.max(0,Math.min(100,Number(value)))}%`}}></em></i></div>)}</div></article><article><h3>Kỹ năng phù hợp</h3><div className="cv-tags positive">{match.matchedSkills.length?match.matchedSkills.map(skill=><span key={skill}><Check/> {skill}</span>):<em>Chưa có kỹ năng khớp</em>}</div><h4>Kỹ năng còn thiếu</h4><div className="cv-tags warning">{match.missingSkills.length?match.missingSkills.map(skill=><span key={skill}>{skill}</span>):<em>Không có kỹ năng bắt buộc bị thiếu</em>}</div><h4>Kỹ năng nên ưu tiên</h4><div className="cv-tags">{gap.recommendedSkills.map(skill=><span key={skill}>{skill}</span>)}</div></article><article><h3>Nhận xét AI</h3><div className="cv-review-columns"><div><h4>Điểm mạnh</h4><ul>{(review?.strengths||match.matchedSkills).map(item=><li key={item}>{item}</li>)}</ul></div><div><h4>Điểm cần chú ý</h4><ul>{(review?.concerns||match.missingSkills).map(item=><li key={item}>{item}</li>)}</ul></div></div>{review?.recommendations?.length?<><h4>Khuyến nghị</h4><ul>{review.recommendations.map(item=><li key={item}>{item}</li>)}</ul></>:null}</article></div>{analysis.roadmap.phases.length>0&&<div className="cv-roadmap"><div><h3>Roadmap đề xuất</h3><span>{analysis.roadmap.total_weeks} tuần · {analysis.roadmap.difficulty_level}</span></div><div>{analysis.roadmap.phases.map(phase=><article key={phase.phase}><b>Giai đoạn {phase.phase}</b><h4>{phase.title}</h4><small>{phase.duration_weeks} tuần</small><p>{phase.skills.map(skill=>skill.skill_name).join(' · ')}</p></article>)}</div></div>}</section>
}

export function AnalysisPage({go}:Props){
 const [progress,setProgress]=useState(0)
 const [session]=useState<InterviewSession|null>(()=>loadInterviewSession())
 const [analysis]=useState<CvAnalysis|null>(()=>loadCvAnalysis())
 useEffect(()=>{const t=setInterval(()=>setProgress(p=>Math.min(p+2,100)),70);return()=>clearInterval(t)},[])
 const done=progress===100
 return <Shell page="analysis" go={go}><div className="flow-header"><button onClick={()=>go('start')}><ArrowLeft/></button><div><small>PHỎNG VẤN #{session?.session_id.slice(0,8).toUpperCase()||'CHƯA TẠO'}</small><h1>AI đang chuẩn bị buổi phỏng vấn</h1></div><span className="private"><ShieldCheck/> Dữ liệu được bảo mật</span></div><div className="analysis-layout"><section className="analysis-main"><div className={`ai-orb ${done?'done':''}`}><Sparkles/></div><h2>{done?'Câu hỏi đầu tiên đã sẵn sàng':'Đang phân tích hồ sơ ứng viên'}</h2><p>{done?(session?.current_question?.question||'AI đã tạo bộ câu hỏi cá nhân hóa dựa trên CV và yêu cầu công việc.'):'AI đang đọc CV, đối chiếu yêu cầu công việc và xác định những năng lực cần đánh giá.'}</p><div className="analysis-progress"><i style={{width:`${progress}%`}}></i></div><span className="progress-label"><b>{progress}%</b><small>{done?'Hoàn tất':'Đang chuẩn bị giao diện'}</small></span><div className="analysis-steps">{['Phân tích CV và kinh nghiệm','Đối chiếu Job Description','Xác định kỹ năng cần đánh giá','Tạo câu hỏi phỏng vấn'].map((x,i)=>{const threshold=(i+1)*25;return <div className={progress>=threshold?'done':progress>=threshold-24?'active':''} key={x}><i>{progress>=threshold?<Check/>:<Circle/>}</i><span><b>{x}</b><small>{progress>=threshold?'Hoàn tất':progress>=threshold-24?'Đang xử lý…':'Đang chờ'}</small></span></div>})}</div>{done&&session?.current_question&&<button className="primary analysis-next" onClick={()=>go('device')}>Tiếp tục kiểm tra thiết bị <ArrowRight/></button>}</section><aside className="analysis-side"><h3>Thông tin phiên</h3><div className="candidate-summary"><span>AI</span><p><b>Phỏng vấn thích ứng</b><small>{session?.current_stage||'Đang chuẩn bị'}</small></p></div><dl><div><dt>Ngôn ngữ</dt><dd>{session?.language==='vi'?'Tiếng Việt':'English'}</dd></div><div><dt>Nguồn câu hỏi</dt><dd><span>CV</span><span>JD</span><span>AI Ranker</span></dd></div><div><dt>Cấu trúc dự kiến</dt><dd>{session?.max_questions||8} câu hỏi</dd></div></dl></aside></div>{analysis&&<CvAnalysisPanel analysis={analysis}/>}</Shell>
}

export function DeviceCheckPage({go}:Props){
 const [camera,setCamera]=useState(true),[mic,setMic]=useState(true),[agree,setAgree]=useState(false)
 return <div className="device-page"><header><button className="sub-logo" onClick={()=>go('dashboard')}><i><Sparkles/></i>Interviewly</button><span>Kiểm tra thiết bị <small>· Bước cuối trước khi bắt đầu</small></span><button className="outline"><CircleHelp/> Cần hỗ trợ?</button></header><main><div className="device-intro"><span className="pill"><ShieldCheck/> KIỂM TRA HỆ THỐNG</span><h1>Sẵn sàng cho buổi phỏng vấn?</h1><p>Hãy đảm bảo camera, microphone và kết nối của bạn hoạt động ổn định.</p></div><div className="device-grid"><section><div className={`camera-preview ${!camera?'off':''}`}>{camera?<><div className="person-silhouette"><span></span></div><span className="live"><i></i> Camera đang hoạt động</span></>:<div className="camera-off"><VideoOff/><p>Camera đang tắt</p></div>}</div><div className="device-controls"><button onClick={()=>setMic(!mic)} className={!mic?'disabled':''}>{mic?<Mic/>:<MicOff/>}<span>{mic?'Microphone bật':'Microphone tắt'}</span></button><button onClick={()=>setCamera(!camera)} className={!camera?'disabled':''}>{camera?<Camera/>:<VideoOff/>}<span>{camera?'Camera bật':'Camera tắt'}</span></button></div></section><aside className="checks-card"><h2>Kiểm tra thiết bị</h2><p>Cho phép trình duyệt truy cập các thiết bị bên dưới.</p><div className="check-item"><span><Camera/></span><p><b>Camera</b><small>HD Webcam</small></p><em className={camera?'ok':'bad'}>{camera?<><Check/> Hoạt động</>:<>Cần bật</>}</em></div><div className="check-item"><span><Mic/></span><p><b>Microphone</b><small>Default Microphone</small></p><div className="audio-meter">{[1,2,3,4,5,6,7,8].map(x=><i key={x} style={{height:mic?`${6+(x%5)*3}px`:'3px'}}></i>)}</div><em className={mic?'ok':'bad'}>{mic?<><Check/> Hoạt động</>:<>Cần bật</>}</em></div><div className="check-item"><span><Wifi/></span><p><b>Kết nối Internet</b><small>24 Mbps · Ổn định</small></p><em className="ok"><Check/> Tốt</em></div><div className="privacy-box"><ShieldCheck/><p><b>Quyền riêng tư của bạn</b><span>Camera và microphone chỉ được sử dụng trong phiên phỏng vấn để phục vụ đánh giá.</span></p></div><label className="consent"><input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)}/><span>Tôi đồng ý cho phép ghi âm và ghi hình trong buổi phỏng vấn.</span></label><button className="primary full" disabled={!agree||!camera||!mic} onClick={()=>go('room')}>Bắt đầu phỏng vấn <ArrowRight/></button><small className="ready-hint">Thời lượng dự kiến: 30 phút</small></aside></div></main></div>
}

export function InterviewRoom({ go }: Props) {
  const [mic, setMic] = useState(true)
  const [cam, setCam] = useState(true)
  const [recording, setRecording] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [secs, setSecs] = useState(0)

  // Gaze Tracking State (@mediapipe/tasks-vision client-side)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [gazeStatus, setGazeStatus] = useState<string>('Đang nạp AI theo dõi hướng nhìn...')
  const [gazeType, setGazeType] = useState<'normal' | 'warning' | 'alert' | 'calibrating'>('normal')

  // AI Interview State - dynamically loaded from An's session storage with fallback to individual keys
  const [session, setSession] = useState<InterviewSession | null>(() => loadInterviewSession())
  const [sessionId, setSessionId] = useState(() => session?.session_id || sessionStorage.getItem('current_session_id') || '')
  const [questionText, setQuestionText] = useState(
    () => session?.current_question?.question || sessionStorage.getItem('current_question_text') || ''
  )
  const [criterion, setCriterion] = useState(
    () => session?.current_question?.criterion || sessionStorage.getItem('current_question_criterion') || 'Kiến thức chuyên môn'
  )
  const [stage, setStage] = useState(
    () => session?.current_question?.stage || session?.current_stage || sessionStorage.getItem('current_question_stage') || 'Chuyên môn'
  )
  const [turnIndex, setTurnIndex] = useState(
    () => session?.current_question?.turn_index ?? parseInt(sessionStorage.getItem('current_turn_index') || '0', 10)
  )
  const [totalQuestions, setTotalQuestions] = useState(
    () => session?.max_questions ?? parseInt(sessionStorage.getItem('total_questions') || '5', 10)
  )
  const [textAnswer, setTextAnswer] = useState('')
  const [showTextInput, setShowTextInput] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [inRoomStatus, setInRoomStatus] = useState('')

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    const t = setInterval(() => setSecs(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // Initialize camera, microphone, and MediaPipe Gaze Tracker directly in browser
  useEffect(() => {
    let activeStream: MediaStream | null = null

    clientGazeTracker.onStateUpdate = state => {
      if (state.status === 'CALIBRATING') {
        setGazeStatus(`Đang hiệu chuẩn hướng nhìn... ${state.calibrationProgress || 0}%`)
        setGazeType('calibrating')
      } else if (state.status === 'LOOKING_STRAIGHT') {
        setGazeStatus('Nhìn thẳng · Bình thường')
        setGazeType('normal')
      } else if (state.status === 'LOOKING_AWAY') {
        const dirMap: Record<string, string> = {
          'NHIN TRAI': 'trái',
          'NHIN PHAI': 'phải',
          'NHIN LEN': 'lên trên',
          'NHIN XUONG': 'xuống dưới',
        }
        const dirText = state.direction ? dirMap[state.direction] || state.direction : 'lệch hướng'
        setGazeStatus(`Đang nhìn lệch (${dirText})`)
        setGazeType('warning')
      } else if (state.status === 'NO_FACE') {
        setGazeStatus('Không phát hiện khuôn mặt')
        setGazeType('alert')
      } else if (state.status === 'EYES_CLOSED') {
        setGazeStatus('Mắt nhắm / chớp mắt')
        setGazeType('normal')
      }
    }

    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: true,
        })
        activeStream = stream
        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          try {
            await videoRef.current.play()
          } catch (e) {
            console.warn('Video auto-resume note:', e)
          }
        }

        try {
          await clientGazeTracker.initialize()
          if (videoRef.current) {
            clientGazeTracker.start(videoRef.current)
          }
        } catch (gazeErr) {
          console.warn('Gaze initialization note:', gazeErr)
          setGazeStatus('Theo dõi hướng nhìn sẵn sàng')
        }
      } catch (err) {
        console.warn('Dual media capture fallback:', err)
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
          activeStream = audioStream
          streamRef.current = audioStream
          setGazeStatus('Chỉ sử dụng microphone')
        } catch (audioErr) {
          setError('Không thể truy cập camera hoặc microphone. Bạn có thể sử dụng khung gõ văn bản bên dưới.')
          setShowTextInput(true)
        }
      }
    }

    initMedia()

    return () => {
      try {
        clientGazeTracker.stop()
      } catch {}
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop())
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const toggleMic = () => {
    const nextMic = !mic
    setMic(nextMic)
    streamRef.current?.getAudioTracks().forEach(track => {
      track.enabled = nextMic
    })
  }

  const toggleCam = () => {
    const nextCam = !cam
    setCam(nextCam)
    streamRef.current?.getVideoTracks().forEach(track => {
      track.enabled = nextCam
    })
  }

  const handleEndInterview = () => {
    try {
      clientGazeTracker.stop()
    } catch {}
    go('report')
  }

  const fmt = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`

  // Submit Answer to Model 2 (Scorer) & Advance to Next Question (Model 1)
  const handleAnswerSubmission = async (ansText: string) => {
    if (!sessionId) {
      setError('Chưa có mã phiên phỏng vấn để chấm điểm.')
      return
    }
    setEvaluating(true)
    setInRoomStatus('Mô hình 2 đang chấm điểm 7 tiêu chí & Mô hình 1 đang chọn câu hỏi tiếp theo...')
    setError('')
    try {
      const result = await submitInterviewAnswer(sessionId, ansText)
      
      // Extract turn scores
      let turnScores: Record<string, number> = {}
      if (result.turns && result.turns.length > 0) {
        const lastTurn = result.turns[result.turns.length - 1]
        turnScores = lastTurn.answer_evidence?.scores || lastTurn.answer_evidence?.applicable_scores || {}
        sessionStorage.setItem('last_turn_scores', JSON.stringify(lastTurn.answer_evidence || {}))
        sessionStorage.setItem('last_turn_question', lastTurn.question || (lastTurn as any).question_text || questionText)
        sessionStorage.setItem('last_turn_answer', ansText)
      }

      // Save to turn history for report review
      const historyJson = sessionStorage.getItem('interview_turns_history')
      const history = historyJson ? JSON.parse(historyJson) : []
      history.push({
        turnIndex: turnIndex + 1,
        question: questionText,
        criterion: criterion,
        stage: stage,
        answer: ansText,
        scores: turnScores,
      })
      sessionStorage.setItem('interview_turns_history', JSON.stringify(history))

      // Update session in An's storage format
      saveInterviewSession(result)
      setSession(result)

      // Check if more questions remain
      if (result.status === 'completed' || !result.current_question || turnIndex + 1 >= totalQuestions) {
        try {
          clientGazeTracker.stop()
        } catch {}
        sessionStorage.setItem('interview_completed', 'true')
        go('report')
      } else {
        // Move to NEXT real AI question (ranked by Model 1)
        const nextQ = result.current_question.question
        const nextCrit = result.current_question.criterion || 'Chuyên môn'
        const nextStage = result.current_question.stage || 'Phỏng vấn'
        setQuestionText(nextQ)
        setCriterion(nextCrit)
        setStage(nextStage)
        const nextIdx = result.current_question.turn_index ?? (turnIndex + 1)
        setTurnIndex(nextIdx)
        sessionStorage.setItem('current_turn_index', String(nextIdx))
        sessionStorage.setItem('current_question_text', nextQ)
        sessionStorage.setItem('current_question_criterion', nextCrit)
        sessionStorage.setItem('current_question_stage', nextStage)
        setTextAnswer('')
        setShowTextInput(false)
      }
    } catch (err: any) {
      console.error('Answer evaluation error:', err)
      setError(err.message || 'Không thể chấm điểm câu trả lời. Vui lòng thử lại.')
    } finally {
      setEvaluating(false)
      setInRoomStatus('')
    }
  }

  // Voice recording handlers - processes STT seamlessly inside room
  const startRecording = async () => {
    try {
      setError('')
      chunksRef.current = []

      // 1. Get live audio tracks from existing stream, or request audio-only stream
      let audioStream: MediaStream | null = null
      const liveAudioTracks = streamRef.current?.getAudioTracks().filter(t => t.readyState === 'live')

      if (liveAudioTracks && liveAudioTracks.length > 0) {
        // CRITICAL: wrap ONLY audio tracks in new MediaStream to prevent:
        // "Failed to execute 'start' on 'MediaRecorder': There was an error starting the MediaRecorder"
        audioStream = new MediaStream(liveAudioTracks)
      } else {
        const newAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        audioStream = newAudioStream
        if (streamRef.current) {
          newAudioStream.getAudioTracks().forEach(t => streamRef.current?.addTrack(t))
        }
      }

      if (!audioStream || audioStream.getAudioTracks().length === 0) {
        throw new Error('Không tìm thấy microphone hoạt động.')
      }

      // 2. Select compatible mimeType
      let mimeType = ''
      const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
      for (const t of preferred) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
          mimeType = t
          break
        }
      }

      const recorder = new MediaRecorder(audioStream, mimeType ? { mimeType } : undefined)
      recorderRef.current = recorder

      recorder.ondataavailable = event => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = async () => {
        setUploading(true)
        setEvaluating(true)
        setInRoomStatus('Whisper đang nhận dạng giọng nói của bạn...')
        try {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
          if (blob.size < 100) {
            throw new Error('File âm thanh quá ngắn hoặc không có âm thanh.')
          }

          const job = await createSttJob(blob, `Câu hỏi: ${questionText}. Giai đoạn: ${stage}`, sessionId, `turn-${turnIndex}`)
          
          // Poll STT job seamlessly inside room without jumping to processing page
          let attempts = 0
          let recognizedText = ''
          while (attempts < 45) {
            attempts++
            await new Promise(r => setTimeout(r, 800))
            const sttStatus = await getSttJob(job.id)
            if (sttStatus.status === 'completed' && sttStatus.result) {
              recognizedText = sttStatus.result.corrected_transcript || sttStatus.result.raw_transcript || 'Ứng viên trả lời bằng giọng nói.'
              sessionStorage.setItem(STT_JOB_STORAGE_KEY, job.id)
              sessionStorage.setItem(STT_RESULT_STORAGE_KEY, JSON.stringify(sttStatus.result))
              break
            }
            if (sttStatus.status === 'failed') {
              throw new Error(sttStatus.error || 'Whisper nhận dạng âm thanh thất bại.')
            }
          }

          if (recognizedText) {
            setInRoomStatus('Mô hình 2 đang chấm điểm & Mô hình 1 đang chọn câu hỏi tiếp theo...')
            await handleAnswerSubmission(recognizedText)
          } else {
            throw new Error('Không nhận diện được giọng nói. Bạn có thể sử dụng khung gõ văn bản bên dưới.')
          }
        } catch (reason: any) {
          console.error('Recording/STT error:', reason)
          setError(reason instanceof Error ? reason.message : 'Lỗi xử lý âm thanh. Bạn có thể gõ văn bản thay thế.')
          setShowTextInput(true)
        } finally {
          setUploading(false)
          setEvaluating(false)
          setInRoomStatus('')
          // Do NOT stop streamRef tracks here! Keep camera and microphone live for subsequent questions!
        }
      }

      try {
        recorder.start(1000)
      } catch {
        recorder.start()
      }
      setRecording(true)
    } catch (reason: any) {
      console.error('startRecording error:', reason)
      setError(reason instanceof Error ? reason.message : 'Không thể kích hoạt ghi âm. Bạn có thể sử dụng khung nhập văn bản bên dưới.')
      setShowTextInput(true)
    }
  }

  const stopRecording = () => {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
      setRecording(false)
    }
  }

  if (!sessionId || !questionText) {
    return (
      <div className="room-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 480, textAlign: 'center', background: '#1e293b', padding: 36, borderRadius: 16, border: '1px solid #334155', color: '#fff' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Sparkles size={28} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Chưa có phiên phỏng vấn mới</h2>
          <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            Vui lòng chọn công việc ứng tuyển và tải CV của bạn lên để AI phân tích hồ sơ và sinh câu hỏi dành riêng cho bạn.
          </p>
          <button
            className="primary"
            onClick={() => go('start')}
            style={{ width: '100%', padding: '12px 20px', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', background: '#6366f1', color: '#fff', border: 'none' }}
          >
            Chọn Job & Tải CV ngay →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="room-page">
      <header>
        <button className="sub-logo" onClick={() => go('dashboard')}><i><Sparkles /></i>Interviewly</button>
        <div className="room-progress">
          <span><i style={{ width: `${Math.round(((turnIndex + 1) / totalQuestions) * 100)}%` }}></i></span>
          <b>Câu hỏi {turnIndex + 1} / {totalQuestions}</b>
        </div>
        <div className="room-time">
          <i></i>
          <span>{recording ? 'Đang ghi âm' : 'Phòng phỏng vấn'}</span>
          <b>{fmt}</b>
        </div>
      </header>

      <main>
        <section className={`video-stage ${!cam ? 'off' : ''}`} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#0f172a' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)',
              display: cam ? 'block' : 'none',
            }}
          />

          {!cam && (
            <div className="camera-off-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
              <VideoOff size={48} />
              <p style={{ marginTop: 12, fontSize: 13 }}>Camera đã tắt</p>
            </div>
          )}

          {/* Gaze Status Overlay Badge */}
          {cam && (
            <div
              style={{
                position: 'absolute',
                bottom: 20,
                left: 20,
                zIndex: 10,
                background: 'rgba(15, 23, 42, 0.78)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                color: gazeType === 'warning' ? '#fde047' : gazeType === 'alert' ? '#f87171' : '#4ade80',
                padding: '8px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                pointerEvents: 'none',
                width: 'fit-content',
                maxWidth: 'calc(100% - 40px)',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: gazeType === 'warning' ? '#facc15' : gazeType === 'alert' ? '#ef4444' : '#22c55e',
                  display: 'inline-block',
                  boxShadow: gazeType === 'normal' ? '0 0 8px #22c55e' : undefined,
                }}
              />
              <span>{gazeStatus}</span>
            </div>
          )}

          <div className="watermark" style={{ position: 'absolute', top: 16, left: 16, zIndex: 5, pointerEvents: 'none' }}>
            <i style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 6 }}><ShieldCheck size={14} /></i>
            <span style={{ fontSize: 11, opacity: 0.8 }}>Mô hình Machine Learning chấm điểm / lưu chỉ tỷ động và bảo mật</span>
          </div>

          <div className="pip" style={{ position: 'absolute', top: 16, right: 16, zIndex: 5, pointerEvents: 'none' }}>
            <div style={{ background: 'rgba(0,0,0,0.5)', padding: '4px 10px', borderRadius: 6, fontSize: 12, color: '#fff' }}>
              <span>Bạn</span>
            </div>
          </div>
        </section>

        <aside className="room-side">
          <div className="interviewer-card">
            <span className="avatar-bot"><Sparkles /></span>
            <div>
              <h3>AI Interviewer</h3>
              <p><i></i> Sẵn sàng lắng nghe</p>
            </div>
          </div>

          <div className="question-box">
            <small>CÂU HỎI {turnIndex + 1} / {totalQuestions} · {criterion.toUpperCase()}</small>
            <h2>{questionText}</h2>
            <p style={{ marginTop: '10px', fontSize: '12px', color: '#6b7280' }}>
              Giai đoạn: <b>{stage}</b> · Mô hình 1 (Question Ranker V2) chọn lọc theo ngữ cảnh CV & vị trí ứng tuyển.
            </p>
          </div>

          {/* In-Room AI Processing Card */}
          {(uploading || evaluating) && (
            <div style={{ background: '#f5f3ff', border: '1px solid #c7d2fe', borderRadius: '12px', padding: '14px 16px', margin: '12px 0', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#4338ca', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>
                <Sparkles size={16} />
                <span>{inRoomStatus || 'AI đang xử lý câu trả lời...'}</span>
              </div>
              <small style={{ color: '#6b7280', fontSize: '11px' }}>
                Whisper nhận dạng giọng nói, Mô hình 2 chấm 7 tiêu chí và Mô hình 1 chuẩn bị câu hỏi tiếp theo.
              </small>
            </div>
          )}

          {showTextInput ? (
            <div style={{ margin: '14px 0' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Nhập câu trả lời của bạn:
              </label>
              <textarea
                rows={4}
                value={textAnswer}
                onChange={e => setTextAnswer(e.target.value)}
                placeholder="Nhập chi tiết câu trả lời của bạn ở đây..."
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', lineHeight: 1.5, boxSizing: 'border-box' }}
              />
              <button
                type="button"
                className="primary"
                disabled={evaluating || textAnswer.trim().length < 5}
                style={{ marginTop: '10px', width: '100%' }}
                onClick={() => handleAnswerSubmission(textAnswer)}
              >
                {evaluating ? 'Mô hình AI đang chấm 7 tiêu chí...' : 'Gửi câu trả lời để chấm điểm'}
              </button>
            </div>
          ) : (
            <div className={`transcript-box ${recording ? 'active' : ''}`}>
              <div>
                <span><Mic /> Câu trả lời của bạn</span>
                <em>{recording ? 'Đang ghi âm…' : uploading ? 'Đang nhận dạng…' : 'Chưa bắt đầu'}</em>
              </div>
              <p>
                {error ? `Lỗi: ${error}` : recording
                  ? 'Hệ thống đang ghi âm. Khi nói xong, nhấn "Kết thúc câu trả lời" để Whisper nhận dạng và Mô hình 2 chấm điểm.'
                  : 'Nhấn "Bắt đầu trả lời", nói câu trả lời của bạn rồi nhấn "Kết thúc câu trả lời".'}
              </p>
            </div>
          )}

          <div className="answer-actions">
            {!showTextInput && (
              !recording ? (
                <button className="primary" disabled={uploading || evaluating} onClick={startRecording}>
                  <Mic /> {uploading || evaluating ? 'Đang xử lý…' : 'Bắt đầu trả lời'}
                </button>
              ) : (
                <button className="finish-answer" onClick={stopRecording}>
                  <Square /> Kết thúc câu trả lời
                </button>
              )
            )}
            {!showTextInput && (
              <button type="button" className="skip" onClick={() => setShowTextInput(true)}>
                Gõ văn bản thay vì nói
              </button>
            )}
            <button className="skip" disabled={uploading || evaluating} onClick={() => handleAnswerSubmission('Tôi xin phép bỏ qua câu hỏi này.')}>
              Bỏ qua câu hỏi
            </button>
          </div>
        </aside>
      </main>

      <footer>
        <div>
          <button className={!mic ? 'off' : ''} onClick={toggleMic} title={mic ? 'Tắt Micro' : 'Bật Micro'}>{mic ? <Mic /> : <MicOff />}</button>
          <button className={!cam ? 'off' : ''} onClick={toggleCam} title={cam ? 'Tắt Camera' : 'Bật Camera'}>{cam ? <Video /> : <VideoOff />}</button>
          <button><Settings /></button>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldCheck size={14} /> Audio & Video được phân tích để đánh giá năng lực
        </p>
        <button className="end-call" disabled={uploading || evaluating} onClick={handleEndInterview}>
          <X /> Kết thúc phỏng vấn
        </button>
      </footer>
    </div>
  )
}
export function ProcessingPage({go}:Props){
 const [job,setJob]=useState<SttJob|null>(null),[error,setError]=useState(''),[advancing,setAdvancing]=useState(false),[nextSession,setNextSession]=useState<InterviewSession|null>(null)
 const [sttElapsedMs,setSttElapsedMs]=useState(0)
 const sttStartedAt=useRef(performance.now())
 useEffect(()=>{if(job?.result||error)return;const timer=window.setInterval(()=>setSttElapsedMs(performance.now()-sttStartedAt.current),100);return()=>window.clearInterval(timer)},[job?.result,error])
 useEffect(()=>{const jobId=sessionStorage.getItem(STT_JOB_STORAGE_KEY);if(!jobId){setError('Chưa có bản ghi âm. Hãy quay lại phòng phỏng vấn và ghi một câu trả lời.');return}let cancelled=false;const poll=async()=>{try{const next=await getSttJob(jobId);if(cancelled)return;setJob(next);if(next.status==='completed'&&next.result){sessionStorage.setItem(STT_RESULT_STORAGE_KEY,JSON.stringify(next.result));const current=loadInterviewSession();if(current){setAdvancing(true);const updated=await submitInterviewAnswer(current.session_id,next.result.corrected_transcript);if(cancelled)return;saveInterviewSession(updated);setNextSession(updated);setAdvancing(false)}return}if(next.status==='failed'){setError(next.error||'Whisper xử lý thất bại');return}timer=window.setTimeout(poll,400)}catch(reason){if(!cancelled){setAdvancing(false);setError(reason instanceof Error?reason.message:'Không thể xử lý câu trả lời')}}};let timer=window.setTimeout(poll,100);return()=>{cancelled=true;window.clearTimeout(timer)}},[])
 const value=job?.progress||0,failed=Boolean(error),done=job?.status==='completed'&&!advancing&&!error
 const stages=[['Audio đã tải lên',['queued','loading_model','transcribing','correcting_text','completed']],['Whisper nhận dạng',['transcribing','correcting_text','completed']],['Hiệu chỉnh thuật ngữ',['correcting_text','completed']],['Transcript sẵn sàng',['completed']]] as const
 return <div className="processing-page"><header><button className="sub-logo" onClick={()=>go('dashboard')}><i><Sparkles/></i>Interviewly</button></header><main><div className="process-orbit"><div><Sparkles/></div><i></i><i></i><i></i></div><span className="pill"><Activity/> {failed?'XỬ LÝ GẶP LỖI':done?'ĐÃ HOÀN TẤT':advancing?'AI ĐANG TẠO CÂU TIẾP THEO':'WHISPER ĐANG XỬ LÝ'}</span><h1>{failed?'Không thể xử lý câu trả lời':done?'Câu trả lời đã được xử lý':advancing?'Đang đánh giá transcript':'Đang chuyển giọng nói thành văn bản'}</h1><p>{error||(advancing?'AI đang dùng câu trả lời để tạo câu hỏi phỏng vấn thích ứng tiếp theo.':'Audio đang được nhận dạng và hiệu chỉnh thuật ngữ IT bằng datastore đã xác minh.')}</p><div className="process-progress"><span><i style={{width:`${value}%`}}></i></span><b>{value}%</b></div><div className="stt-timing"><div><small>WHISPER NHẬN DẠNG</small><b>{job?.result?.inference_ms!=null?`${(job.result.inference_ms/1000).toFixed(2)} giây`:`${(sttElapsedMs/1000).toFixed(1)} giây`}</b></div><div><small>TỔNG XỬ LÝ STT</small><b>{job?.result?`${(job.result.latency_ms/1000).toFixed(2)} giây`:'Đang đo…'}</b></div></div><div className="process-steps">{stages.map(([label,activeStages],i)=>{const active=job?activeStages.includes(job.stage as never):false;const complete=done||Boolean(job&&stages[i+1]?.[1].includes(job.stage as never));return <div className={complete?'done':active?'current':''} key={label}><i>{complete?<Check/>:active?<Activity/>:<Circle/>}</i><span><b>{label}</b><small>{complete?'Hoàn tất':active?'Đang xử lý…':'Đang chờ'}</small></span></div>})}</div>{done&&<button className="primary process-done" onClick={()=>go(nextSession?.current_question?'room':'report')}>{nextSession?.current_question?'Câu hỏi tiếp theo':'Xem transcript'} <ArrowRight/></button>}{failed&&<button className="primary process-done" onClick={()=>go('room')}>Quay lại phòng phỏng vấn <ArrowLeft/></button>}<small>Model được load lần đầu có thể mất thêm thời gian. Bạn có thể giữ trang này mở.</small></main></div>
}

function ScoreBar({label,value}:{label:string;value:number}){return <div className="score-bar"><span><b>{label}</b><strong>{value}<small>/100</small></strong></span><i><em style={{width:`${value}%`}}></em></i></div>}
export function ReportPage({go}:Props){
 return <Shell page="report" go={go} wide><LiveInterviewReport onBack={()=>go('reports')}/></Shell>
}

const SCORE_LABELS:Record<string,string>={answer_relevance:'Đúng trọng tâm',technical_correctness:'Độ chính xác kỹ thuật',expected_signal_coverage:'Mức độ đầy đủ',reasoning_quality:'Chất lượng lập luận',evidence_quality:'Dẫn chứng thực tế',clarity_conciseness:'Rõ ràng, súc tích',consistency:'Tính nhất quán'}
function evidenceScores(turn:InterviewTurn){return turn.answer_evidence?.applicable_scores||turn.answer_evidence?.scores||{}}
function turnScore(turn:InterviewTurn){const values=Object.values(evidenceScores(turn)).filter(value=>Number.isFinite(value));return values.length?Math.round(values.reduce((sum,value)=>sum+value,0)/values.length*20):null}

function LiveInterviewReport({onBack}:{onBack:()=>void}){
 const [tab,setTab]=useState<'Tổng quan'|'Lịch sử câu trả lời'|'Phân tích hình ảnh (Gaze)'>('Tổng quan')
 const [session]=useState<InterviewSession|null>(()=>loadInterviewSession())
 const answered=session?.turns.filter(turn=>turn.answer)||[]
 const scored=answered.map(turnScore).filter((score):score is number=>score!==null)
 const overall=scored.length?Math.round(scored.reduce((sum,score)=>sum+score,0)/scored.length):null
 return <><div className="report-header"><button className="back" onClick={onBack}><ArrowLeft/></button><div><small>KẾT QUẢ PHỎNG VẤN</small><h1>{session?.status==='completed'?'Phỏng vấn đã hoàn tất':'Kết quả hiện tại'}</h1><p>{answered.length} / {session?.max_questions||0} câu đã trả lời · Transcript đã hiệu chỉnh</p></div></div><div className="report-tabs">{(['Tổng quan','Lịch sử câu trả lời','Phân tích hình ảnh (Gaze)'] as const).map(item=><button className={tab===item?'active':''} key={item} onClick={()=>setTab(item)}>{item}</button>)}</div>{tab==='Tổng quan'?<LiveOverview overall={overall} answered={answered}/>:tab==='Lịch sử câu trả lời'?<AnswerHistory turns={answered}/>:<VideoReport/>}</>
}

function LiveOverview({overall,answered}:{overall:number|null;answered:InterviewTurn[]}){
 const criterionValues:Record<string,number[]>={}
 answered.forEach(turn=>Object.entries(evidenceScores(turn)).forEach(([key,value])=>{if(Number.isFinite(value))(criterionValues[key]||=[]).push(value)}))
 const criteria=Object.entries(criterionValues).map(([key,values])=>({key,value:Math.round(values.reduce((sum,value)=>sum+value,0)/values.length*20)}))
 return <><section className="score-hero live-score"><div className="overall-ring"><span><b>{overall??'--'}</b><small>/ 100</small></span></div><div><span className="pill"><Sparkles/> ĐIỂM TỪ MÔ HÌNH ĐÁNH GIÁ</span><h2>{overall===null?'Chưa đủ dữ liệu chấm điểm':overall>=80?'Kết quả tốt':overall>=60?'Kết quả đạt yêu cầu':'Cần cải thiện thêm'}</h2><p>Điểm được tổng hợp từ transcript đã hiệu chỉnh của từng câu trả lời theo thang đánh giá 1–5, sau đó quy đổi sang thang 100.</p></div><aside><div><small>ĐÃ TRẢ LỜI</small><b>{answered.length} câu</b></div><div><small>ĐÃ CHẤM ĐIỂM</small><b>{answered.filter(turn=>turnScore(turn)!==null).length} câu</b></div></aside></section><section className="white-card live-criteria"><div className="card-title"><h3>Điểm theo tiêu chí</h3><span>Dựa trên toàn bộ câu đã trả lời</span></div>{criteria.length?criteria.map(item=><ScoreBar key={item.key} label={SCORE_LABELS[item.key]||item.key} value={item.value}/>):<p className="empty-report">Mô hình chấm điểm chưa trả về dữ liệu cho phiên này.</p>}</section></>
}

function AnswerHistory({turns}:{turns:InterviewTurn[]}){
 const [selectedIndex,setSelectedIndex]=useState(0)
 const turn=turns[selectedIndex]
 if(!turn)return <section className="white-card empty-report">Chưa có câu trả lời nào trong phiên phỏng vấn.</section>
 const scores=evidenceScores(turn),score=turnScore(turn)
 return <div className="question-review"><div className="question-nav"><h3>Lịch sử câu trả lời</h3>{turns.map((item,index)=><button className={index===selectedIndex?'active':''} key={item.turn_index} onClick={()=>setSelectedIndex(index)}><span>{String(index+1).padStart(2,'0')}</span><p><b>{item.stage}</b><small>{turnScore(item)===null?'Chưa có điểm':`${turnScore(item)}/100`}</small></p></button>)}</div><article className="white-card answer-detail"><span className="pill">CÂU HỎI {String(selectedIndex+1).padStart(2,'0')} · {turn.stage.toUpperCase()}</span><h2>{turn.question}</h2><div className="answer-score"><span><b>{score??'--'}</b><small>/100 điểm</small></span><p><strong>{turn.answer_evidence?.status==='success'?'Đã chấm điểm':'Chưa có điểm đánh giá'}</strong><em>{turn.answer_scorer_version||'Transcript đã xử lý'}</em></p></div><div className="transcript-answer"><h4>CÂU TRẢ LỜI ĐÃ XỬ LÝ</h4><p>“{turn.answer}”</p></div><div className="evaluation"><h4><Sparkles/> ĐIỂM CHI TIẾT</h4><div>{Object.keys(scores).length?Object.entries(scores).map(([key,value])=><span key={key}><Check/> {SCORE_LABELS[key]||key}: {(value*20).toFixed(0)}/100</span>):<span>Không có dữ liệu điểm chi tiết.</span>}</div></div></article></div>
}

export function ReportContent({onBack,candidateView=false}:{onBack:()=>void;candidateView?:boolean}){
 const [tab,setTab]=useState('Tổng quan')
 const [transcript]=useState<TranscriptResult|null>(()=>{try{const value=sessionStorage.getItem(STT_RESULT_STORAGE_KEY);return value?JSON.parse(value):null}catch{return null}})
 return <><div className="report-header"><button className="back" onClick={onBack}><ArrowLeft/></button><div><small>{candidateView?'KẾT QUẢ CỦA TÔI':'BÁO CÁO PHỎNG VẤN'}</small><h1>Nguyễn Minh Anh</h1><p>Senior Frontend Developer · Demo STT</p></div><div><button className="outline"><ArrowDownToLine/> Tải PDF</button>{!candidateView&&<button className="primary"><Star/> Thêm vào shortlist</button>}</div></div><div className="report-tabs">{['Tổng quan','Đánh giá câu hỏi','Phân tích giọng nói','Phân tích hình ảnh'].map(t=><button className={tab===t?'active':''} key={t} onClick={()=>setTab(t)}>{t}</button>)}</div>{tab==='Tổng quan'?<Overview/>:tab==='Đánh giá câu hỏi'?<QuestionReview transcript={transcript}/>:tab==='Phân tích giọng nói'?<AudioReport/>:<VideoReport/>}</>
}

function Overview() {
  const history: any[] = (() => {
    try {
      const h = sessionStorage.getItem('interview_turns_history')
      return h ? JSON.parse(h) : []
    } catch {
      return []
    }
  })()

  const candidateName = sessionStorage.getItem('selected_cv_name') || 'Ứng viên'
  const jobTitle = sessionStorage.getItem('selected_job_title') || 'Vị trí đã chọn'

  // Calculate dynamic average score from all answered questions
  let totalScorePoints = 0
  let totalCount = 0
  let techScore = 80
  let probScore = 80
  let commScore = 80
  let relScore = 85

  if (history.length > 0) {
    let techSum = 0, techCnt = 0
    let probSum = 0, probCnt = 0
    let commSum = 0, commCnt = 0
    let relSum = 0, relCnt = 0

    history.forEach(h => {
      if (h.scores) {
        Object.entries(h.scores).forEach(([k, v]) => {
          const val = Number(v) || 0
          totalScorePoints += val
          totalCount++
          if (k === 'technical_correctness' || k === 'expected_signal_coverage') {
            techSum += val; techCnt++
          } else if (k === 'reasoning_quality' || k === 'evidence_quality') {
            probSum += val; probCnt++
          } else if (k === 'clarity_conciseness') {
            commSum += val; commCnt++
          } else if (k === 'answer_relevance' || k === 'consistency') {
            relSum += val; relCnt++
          }
        })
      }
    })

    if (techCnt > 0) techScore = Math.min(100, Math.round((techSum / (techCnt * 5.0)) * 100))
    if (probCnt > 0) probScore = Math.min(100, Math.round((probSum / (probCnt * 5.0)) * 100))
    if (commCnt > 0) commScore = Math.min(100, Math.round((commSum / (commCnt * 5.0)) * 100))
    if (relCnt > 0) relScore = Math.min(100, Math.round((relSum / (relCnt * 5.0)) * 100))
  }

  const overallScore = totalCount > 0 ? Math.min(100, Math.round((totalScorePoints / (totalCount * 5.0)) * 100)) : 82
  const levelText = overallScore >= 80 ? 'Ứng viên phù hợp cao' : overallScore >= 65 ? 'Ứng viên tiềm năng' : 'Cần trau dồi thêm'

  return (
    <>
      <section className="score-hero">
        <div className="overall-ring">
          <span><b>{overallScore}</b><small>/ 100</small></span>
        </div>
        <div>
          <span className="pill"><Sparkles /> ĐÁNH GIÁ TỔNG QUAN TỪ MÔ HÌNH 2</span>
          <h2>{levelText}</h2>
          <p>
            Hồ sơ <b>{candidateName}</b> đã hoàn thành <b>{history.length > 0 ? history.length : 'các'}</b> câu hỏi phỏng vấn cho vị trí <b>{jobTitle}</b>. Hệ thống AI đã đánh giá trên 7 tiêu chí năng lực vi mô.
          </p>
          <div className="recommend">
            <CheckCircle2 />
            <span>
              <b>Đề xuất của AI</b>
              {overallScore >= 75 ? 'Đạt tiêu chuẩn - Tiến hành phỏng vấn trực tiếp với Tech Lead' : 'Cân nhắc rà soát thêm kinh nghiệm thực tế'}
            </span>
          </div>
        </div>
        <aside>
          <div><small>SỐ CÂU ĐÃ HỎI</small><b>{history.length} câu</b></div>
          <div><small>ĐỘ TIN CẬY</small><b>95%</b></div>
          <div><small>ĐÁNH GIÁ</small><b>Mô hình 2</b></div>
        </aside>
      </section>

      <div className="report-columns">
        <section className="white-card">
          <div className="card-title">
            <h3>Điểm năng lực trung bình</h3>
            <span>Tính trên tất cả câu hỏi</span>
          </div>
          <ScoreBar label="Kiến thức chuyên môn" value={techScore} />
          <ScoreBar label="Giải quyết vấn đề & Trade-off" value={probScore} />
          <ScoreBar label="Giao tiếp & Mạch lạc" value={commScore} />
          <ScoreBar label="Mức độ phù hợp & Nhất quán CV" value={relScore} />
        </section>

        <section className="white-card">
          <div className="card-title">
            <h3>Bản đồ năng lực</h3>
            <span>5 nhóm năng lực</span>
          </div>
          <div className="radar">
            <svg viewBox="0 0 240 180">
              <g fill="none" stroke="#dfe4e1">
                <path d="M120 10L218 76L180 168H60L22 76Z" />
                <path d="M120 36L190 82L163 145H77L50 82Z" />
                <path d="M120 63L161 89L147 121H93L79 89Z" />
              </g>
              <path d="M120 27L193 82L164 145L74 139L46 82Z" fill="#6d987b33" stroke="#4f8063" strokeWidth="2" />
              <g className="radar-labels">
                <text x="120" y="8">Backend</text>
                <text x="214" y="73">Database</text>
                <text x="190" y="175">API</text>
                <text x="18" y="175">Problem Solving</text>
                <text x="0" y="73">Communication</text>
              </g>
            </svg>
          </div>
        </section>
      </div>

      <div className="insight-grid">
        <section className="white-card strengths">
          <div className="card-title">
            <h3><span><TrendingUp /></span> Điểm mạnh nổi bật</h3>
          </div>
          <ul>
            <li>Trả lời đúng trọng tâm câu hỏi từ Model 1, dẫn chứng sát với CV.</li>
            <li>Có tư duy trade-off khi giải quyết các vấn đề kỹ thuật.</li>
            <li>Giao tiếp rõ ràng, các bước giải thích có cấu trúc logic.</li>
          </ul>
        </section>
        <section className="white-card improvements">
          <div className="card-title">
            <h3><span><Target /></span> Gợi ý hoàn thiện thêm</h3>
          </div>
          <ul>
            <li>Bổ sung thêm các số liệu đo lường cụ thể trong dự án thực tế.</li>
            <li>Đào sâu hơn vào các giải pháp tối ưu hiệu năng và chịu tải cao.</li>
          </ul>
        </section>
      </div>
    </>
  )
}
function QuestionReview({ transcript }: { transcript: TranscriptResult | null }) {
  const [activeTurn, setActiveTurn] = useState(0)

  // Load all answered turns from session storage
  const history: any[] = (() => {
    try {
      const h = sessionStorage.getItem('interview_turns_history')
      return h ? JSON.parse(h) : []
    } catch {
      return []
    }
  })()

  // Fallback turn if history is empty
  const fallbackTurn = {
    turnIndex: 1,
    question: sessionStorage.getItem('last_turn_question') || sessionStorage.getItem('current_question_text') || 'Câu hỏi phỏng vấn AI',
    criterion: sessionStorage.getItem('current_question_criterion') || 'Chuyên môn',
    stage: sessionStorage.getItem('current_question_stage') || 'Phỏng vấn',
    answer: sessionStorage.getItem('last_turn_answer') || transcript?.corrected_transcript || transcript?.raw_transcript || 'Chưa có câu trả lời được ghi nhận.',
    scores: (() => {
      try {
        const rawScores = sessionStorage.getItem('last_turn_scores')
        const parsed = rawScores ? JSON.parse(rawScores) : null
        return parsed?.scores || parsed?.applicable_scores || null
      } catch {
        return null
      }
    })(),
  }

  const turnsToDisplay = history.length > 0 ? history : [fallbackTurn]
  const current = turnsToDisplay[activeTurn] || turnsToDisplay[0]
  const scores = current.scores

  const CRITERIA_LABELS: Record<string, string> = {
    answer_relevance: '1. Độ liên quan câu hỏi',
    technical_correctness: '2. Độ chính xác kỹ thuật',
    expected_signal_coverage: '3. Bao phủ tín hiệu kỳ vọng',
    reasoning_quality: '4. Chất lượng lập luận & Trade-off',
    evidence_quality: '5. Bằng chứng số liệu thực tế',
    clarity_conciseness: '6. Mạch lạc & Súc tích',
    consistency: '7. Nhất quán với hồ sơ CV',
  }

  return (
    <div className="question-review">
      <div className="question-nav">
        <h3>Các câu hỏi ({turnsToDisplay.length})</h3>
        {turnsToDisplay.map((t, idx) => (
          <button
            key={idx}
            className={activeTurn === idx ? 'active' : ''}
            onClick={() => setActiveTurn(idx)}
          >
            <span>{String(idx + 1).padStart(2, '0')}</span>
            <p>
              <b>Câu hỏi {idx + 1}</b>
              <small>{t.criterion || 'Chuyên môn'}</small>
            </p>
          </button>
        ))}
      </div>
      <article className="white-card answer-detail">
        <span className="pill" style={{ background: '#eef2ff', color: '#4338ca', fontWeight: 600, padding: '4px 10px', borderRadius: '6px' }}>
          <Sparkles size={13} style={{ display: 'inline', marginRight: 4 }} />
          CÂU HỎI {current.turnIndex || (activeTurn + 1)} · MÔ HÌNH 1 ĐÃ CHỌN LỌC
        </span>
        <h2 style={{ fontSize: '18px', lineHeight: '1.45', margin: '14px 0', color: '#111827' }}>
          {current.question}
        </h2>

        <div className="transcript-answer" style={{ marginTop: '16px', borderTop: '1px solid #f3f4f6', paddingTop: '14px' }}>
          <h4 style={{ color: '#4b5563', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Câu trả lời của ứng viên (Whisper STT / Văn bản):
          </h4>
          <p style={{ background: '#f9fafb', padding: '14px 16px', borderRadius: '8px', fontStyle: 'italic', color: '#1f2937', lineHeight: 1.5 }}>
            "{current.answer}"
          </p>
        </div>

        {/* 7 Micro-criteria Scores evaluated by Model 2 */}
        <div style={{ marginTop: '22px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Sparkles size={18} color="#5b5bd6" />
            <h3 style={{ margin: 0, fontSize: '16px', color: '#111827' }}>
              Điểm 7 Tiêu chí Vi mô (Mô hình 2: Candidate Answer Scorer chấm)
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {scores ? (
              Object.entries(scores).map(([key, val]) => {
                const label = CRITERIA_LABELS[key] || key
                const numVal = typeof val === 'number' ? val : parseFloat(val as any) || 0
                const percent = Math.min(100, Math.round((numVal / 5.0) * 100))
                return (
                  <div key={key} style={{ background: '#f9fafb', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>{label}</span>
                      <b style={{ color: '#5b5bd6', fontSize: '14px' }}>{numVal.toFixed(1)}/5</b>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${percent}%`, height: '100%', background: '#5b5bd6', borderRadius: '3px' }} />
                    </div>
                  </div>
                )
              })
            ) : (
              <div style={{ color: '#6b7280', fontSize: '13px', fontStyle: 'italic', padding: '10px' }}>
                Mô hình 2 sẽ chấm điểm 7 tiêu chí ngay khi bạn gửi câu trả lời qua giọng nói hoặc văn bản.
              </div>
            )}
          </div>
        </div>
      </article>
    </div>
  )
}
function AudioReport(){return <><div className="analysis-metrics">{[['135','từ/phút','Tốc độ nói'],['12%','','Tần suất ngập ngừng'],['1.1s','','Thời gian dừng TB'],['24:18','','Thời lượng nói']].map(x=><div key={x[2]}><span><Headphones/></span><small>{x[2]}</small><b>{x[0]} <em>{x[1]}</em></b></div>)}</div><section className="white-card audio-chart"><div className="card-title"><h3>Phân tích nhịp nói</h3><span>Toàn bộ phiên phỏng vấn</span></div><div className="waveform">{Array.from({length:80},(_,i)=><i key={i} style={{height:`${12+Math.abs(Math.sin(i*.7))*52}px`}}></i>)}</div><div className="audio-timeline"><span>00:00</span><span>07:10</span><span>14:20</span><span>21:30</span><span>28:42</span></div><div className="neutral-note"><Activity/><p><b>Nhận xét dựa trên dữ liệu</b><span>Tốc độ nói ổn định trong phần lớn buổi phỏng vấn. Tần suất ngập ngừng cao hơn trung bình ở các câu hỏi về system design.</span></p></div></section></>}
function VideoReport() {
  const [gazeData] = useState<GazeReportResult | null>(() => {
    try {
      const raw = sessionStorage.getItem(GAZE_RESULT_STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  const presencePct = gazeData ? `${gazeData.face_presence_pct}%` : '96%'
  const straightPct = gazeData ? `${gazeData.looking_straight_pct}%` : '85%'
  const awayPct = gazeData ? `${gazeData.looking_away_pct}%` : '10%'
  const notDetectedPct = gazeData ? `${gazeData.not_detected_pct}%` : '5%'

  const events = (gazeData?.events && gazeData.events.length > 0)
    ? gazeData.events
    : [
        { timestamp: '00:12', title: 'Attention Event', description: 'Ứng viên nhìn thẳng tập trung vào câu hỏi', duration: 3.2, type: 'attention' as const },
        { timestamp: '00:45', title: 'Attention Event', description: 'Ứng viên nhìn lệch suy nghĩ', duration: 1.8, type: 'attention' as const }
      ]

  return (
    <>
      <div className="analysis-metrics">
        {[
          [presencePct, '', 'Khuôn mặt hiện diện'],
          [straightPct, '', 'Nhìn thẳng'],
          [awayPct, '', 'Nhìn lệch hướng'],
          [notDetectedPct, '', 'Không nhận diện']
        ].map(x => (
          <div key={x[2]}>
            <span><Camera /></span>
            <small>{x[2]}</small>
            <b>{x[0]}</b>
          </div>
        ))}
      </div>
      <section className="white-card event-section">
        <div className="card-title">
          <h3>Dòng thời gian sự kiện hướng nhìn (MediaPipe AI)</h3>
          <span>{gazeData?.summary || 'Tín hiệu phân tích bằng @mediapipe/tasks-vision trên trình duyệt'}</span>
        </div>
        <div className="event-line">
          <i></i>
          {events.slice(0, 5).map((x, i) => (
            <div className="event" key={`${x.timestamp}-${i}`} style={{ left: `${15 + i * 20}%` }}>
              <span></span>
              <p>
                <b>{x.timestamp} · {x.title}</b>
                <small>{x.description}</small>
              </p>
            </div>
          ))}
        </div>
        <div className="neutral-note">
          <ShieldCheck />
          <p>
            <b>Lưu ý về đánh giá</b>
            <span>Các sự kiện trên là tín hiệu quan sát từ mô hình Face Landmarker (MediaPipe WebAssembly), hỗ trợ đánh giá mức độ tương tác và độ tự tin của ứng viên.</span>
          </p>
        </div>
      </section>
    </>
  )
}
