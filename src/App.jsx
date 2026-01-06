import React, { useState, useEffect } from 'react';
import { 
  Users, Briefcase, FileText, MessageCircle, ChevronRight, 
  Sparkles, Clock, Upload, ArrowLeft, Send, XCircle, 
  LogOut, Plus, Link as LinkIcon, AlertCircle, Loader2,
  Trash2, Archive, RefreshCw, CheckCircle2, LayoutDashboard
} from 'lucide-react';

const API_BASE = 'https://ai-recruiting.onrender.com';

// --- UTILS ---
const apiRequest = async (endpoint, method = 'GET', body = null, isFormData = false) => {
  const headers = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  
  const config = { method, headers };

  if (body) {
    // Если это FormData (загрузка файла), браузер сам выставит нужные заголовки
    config.body = isFormData ? body : JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `Ошибка: ${response.status}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : {};
};

// --- UI COMPONENTS ---
const StatusBadge = ({ status }) => {
  const styles = {
    'New': 'bg-blue-50 text-blue-700 border-blue-200',
    'Interview': 'bg-purple-50 text-purple-700 border-purple-200',
    'Offer': 'bg-green-50 text-green-700 border-green-200',
    'Rejected': 'bg-red-50 text-red-700 border-red-200',
    'Active': 'bg-green-50 text-green-700 border-green-200',
    'Archived': 'bg-slate-100 text-slate-500 border-slate-200'
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles['New']}`}>
      {status}
    </span>
  );
};

const ScoreBadge = ({ score }) => {
  if (score === undefined || score === null) return null;
  const color = score >= 80 ? 'text-green-600 bg-green-50' : score >= 50 ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50';
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold ${color}`}>
      <Sparkles size={14} /> {score}%
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null); // { id, role, email }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState('auth'); // auth, dashboard, templates, job_detail, candidate_profile, search, upload, my_apps
  
  const [vacancies, setVacancies] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [aiData, setAiData] = useState(null);
  const [templates, setTemplates] = useState([]);
  
  const [formData, setFormData] = useState({});
  const [authMode, setAuthMode] = useState('login'); 
  const [authRole, setAuthRole] = useState('recruiter');

  // --- AUTH ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let endpoint = authMode === 'login' ? '/auth/login' : (authRole === 'recruiter' ? '/auth/recruiter/signup' : '/auth/candidate/signup');
      const res = await apiRequest(endpoint, 'POST', formData);
      
      const userData = {
        id: res.recruiter_id || res.candidate_id || res.id,
        email: formData.email,
        role: authMode === 'login' ? (res.recruiter_id ? 'recruiter' : 'candidate') : authRole
      };
      
      setUser(userData);
      if (userData.role === 'recruiter') {
        loadRecruiterDashboard(userData.id);
      } else {
        setView('search');
      }
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  // --- RECRUITER ACTIONS ---
  const loadRecruiterDashboard = async (userId) => {
    setLoading(true);
    setView('dashboard');
    try {
      const data = await apiRequest(`/vacancies/all?id=${userId || user.id}`);
      setVacancies(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleJobClick = async (job) => {
    setSelectedJob(job);
    setLoading(true);
    try {
      const apps = await apiRequest(`/vacancies/${job.id}/applications`);
      setApplications(apps);
      setView('job_detail');
    } catch (err) { setError("Ошибка загрузки откликов"); } finally { setLoading(false); }
  };

  const toggleArchive = async (job) => {
    const action = job.is_archived ? 'dearchive' : 'archive';
    try {
      await apiRequest(`/vacancies/${job.id}/${action}`, 'PATCH');
      loadRecruiterDashboard();
    } catch (err) { alert(err.message); }
  };

  const createVacancy = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/vacancies', 'POST', { ...formData, recruiter_id: user.id, is_archived: false });
      loadRecruiterDashboard();
      setFormData({});
    } catch (err) { alert(err.message); }
  };

  const handleCandidateClick = async (app) => {
    setSelectedApp(app);
    setLoading(true);
    setView('candidate_profile');
    try {
      const data = await apiRequest(`/applications/${app.id}/ai-data`);
      setAiData(data);
      const tmpls = await apiRequest(`/templates?recruiter_id=${user.id}`);
      setTemplates(tmpls);
    } catch (err) { setAiData(null); } finally { setLoading(false); }
  };

  const updateAppStatus = async (newStatus) => {
    try {
      await apiRequest(`/applications/${selectedApp.id}/status`, 'PATCH', { status: newStatus });
      setSelectedApp({...selectedApp, status: newStatus});
    } catch (err) { alert(err.message); }
  };

  // --- TEMPLATES ---
  const loadTemplates = async () => {
    setLoading(true);
    setView('templates');
    try {
      const data = await apiRequest(`/templates?recruiter_id=${user.id}`);
      setTemplates(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const saveTemplate = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/templates', 'POST', { ...formData, recruiter_id: user.id });
      loadTemplates();
    } catch (err) { alert(err.message); }
  };

  const deleteTemplate = async (id) => {
    if (!confirm("Удалить шаблон?")) return;
    try {
      await apiRequest(`/templates/${id}`, 'DELETE');
      loadTemplates();
    } catch (err) { alert(err.message); }
  };

  const generateTG = async (templateId) => {
    try {
      const res = await apiRequest(`/templates/${templateId}/generate`, 'POST', {
        candidate_name: selectedApp.candidate_name,
        telegram_username: aiData?.telegram_username || "username",
        vacancy_title: selectedJob.title
      });
      window.open(res.telegram_link, '_blank');
    } catch (err) { alert("Ошибка генерации ссылки"); }
  };

  // --- CANDIDATE ACTIONS ---
  const findVacancy = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const code = formData.search_code.split('/').pop();
      const job = await apiRequest(`/vacancies/link/${code}`);
      setSelectedJob(job);
      setView('upload');
    } catch (err) { setError("Вакансия не найдена"); } finally { setLoading(false); }
  };

  const uploadResume = async (file) => {
    setLoading(true);
    const fd = new FormData();
    fd.append('candidate_id', user.id);
    fd.append('vacancy_id', selectedJob.id);
    fd.append('resume', file);
    try {
      await apiRequest('/applications', 'POST', fd, true);
      alert("Резюме отправлено! ИИ начал анализ.");
      fetchMyApps();
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  const fetchMyApps = async () => {
    setLoading(true);
    setView('my_apps');
    try {
      const data = await apiRequest(`/my-applications?candidate_id=${user.id}`);
      setApplications(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  // --- RENDERS ---

  if (view === 'auth') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-xl border border-slate-100">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Sparkles size={32} />
            </div>
          </div>
          <h1 className="text-3xl font-black text-center text-slate-900 mb-2">Recruit AI</h1>
          <p className="text-slate-500 text-center mb-8">Будущее найма уже здесь</p>

          <div className="flex bg-slate-100 p-1.5 rounded-xl mb-6">
            <button onClick={() => setAuthRole('recruiter')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${authRole === 'recruiter' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Рекрутер</button>
            <button onClick={() => setAuthRole('candidate')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${authRole === 'candidate' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Кандидат</button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'signup' && authRole === 'recruiter' && (
              <input required placeholder="Название компании" className="w-full px-4 py-3 bg-slate-50 border rounded-xl" onChange={e => setFormData({...formData, company_name: e.target.value})}/>
            )}
            <input required type="email" placeholder="Email" className="w-full px-4 py-3 bg-slate-50 border rounded-xl" onChange={e => setFormData({...formData, email: e.target.value})}/>
            {authMode === 'signup' && authRole === 'candidate' && (
              <input required placeholder="Telegram @username" className="w-full px-4 py-3 bg-slate-50 border rounded-xl" onChange={e => setFormData({...formData, telegram_username: e.target.value})}/>
            )}
            <input required type="password" placeholder="Пароль" className="w-full px-4 py-3 bg-slate-50 border rounded-xl" onChange={e => setFormData({...formData, password: e.target.value})}/>
            <button className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100">
              {loading ? <Loader2 className="animate-spin mx-auto"/> : (authMode === 'login' ? 'Войти' : 'Создать аккаунт')}
            </button>
          </form>
          <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="w-full text-center mt-6 text-sm font-medium text-slate-500 hover:text-blue-600">
            {authMode === 'login' ? 'У меня еще нет аккаунта' : 'У меня уже есть аккаунт'}
          </button>
        </div>
      </div>
    );
  }

  const Sidebar = () => (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col fixed h-full shadow-sm">
      <div className="p-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white"><Sparkles size={20}/></div>
        <span className="font-black text-xl tracking-tight">RecruitAI</span>
      </div>
      <nav className="flex-1 px-4 space-y-1">
        <button onClick={() => loadRecruiterDashboard()} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${view === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}>
          <LayoutDashboard size={20}/> Вакансии
        </button>
        <button onClick={() => loadTemplates()} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${view === 'templates' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}>
          <FileText size={20}/> Шаблоны
        </button>
      </nav>
      <div className="p-6 border-t">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">{user?.email[0].toUpperCase()}</div>
          <div className="overflow-hidden"><p className="text-sm font-bold truncate">{user?.email}</p><p className="text-xs text-slate-400">Рекрутер</p></div>
        </div>
        <button onClick={() => setView('auth')} className="w-full flex items-center gap-2 text-red-500 font-bold text-sm px-4 py-2 hover:bg-red-50 rounded-lg transition"><LogOut size={18}/> Выйти</button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {user?.role === 'recruiter' && <Sidebar />}
      
      <main className={`${user?.role === 'recruiter' ? 'pl-72' : ''} p-8`}>
        {/* RECRUITER: DASHBOARD */}
        {view === 'dashboard' && (
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-3xl font-black text-slate-900">Мои вакансии</h2>
                <p className="text-slate-500">Управляйте вашими активными и архивными позициями</p>
              </div>
              <button onClick={() => setView('create_job')} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-blue-100 hover:scale-105 transition">
                <Plus size={20}/> Создать вакансию
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vacancies.map(job => (
                <div key={job.id} className={`bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition cursor-pointer group relative ${job.is_archived ? 'opacity-60' : ''}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition"><Briefcase size={24}/></div>
                    <StatusBadge status={job.is_archived ? 'Archived' : 'Active'} />
                  </div>
                  <h3 onClick={() => handleJobClick(job)} className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition">{job.title}</h3>
                  <p className="text-sm text-slate-400 mb-4 flex items-center gap-1"><LinkIcon size={14}/> {job.short_link}</p>
                  <div className="flex gap-2 border-t pt-4">
                    <button onClick={() => toggleArchive(job)} className="flex-1 py-2 text-xs font-bold rounded-lg border border-slate-100 hover:bg-slate-50">{job.is_archived ? 'Разархивировать' : 'В архив'}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RECRUITER: CREATE JOB */}
        {view === 'create_job' && (
          <div className="max-w-2xl mx-auto bg-white p-10 rounded-3xl shadow-sm">
            <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-slate-400 mb-6 font-bold hover:text-slate-600"><ArrowLeft size={18}/> Назад</button>
            <h2 className="text-3xl font-black mb-8">Новая вакансия</h2>
            <form onSubmit={createVacancy} className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-2">Название позиции</label>
                <input required placeholder="Напр. Senior Go Developer" className="w-full px-4 py-3 bg-slate-50 border rounded-xl" onChange={e => setFormData({...formData, title: e.target.value})}/>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">AI Фильтры (требования)</label>
                <textarea required placeholder="Опишите навыки, которые должен найти ИИ..." className="w-full px-4 py-3 bg-slate-50 border rounded-xl h-40" onChange={e => setFormData({...formData, ai_filters: e.target.value})}/>
              </div>
              <button className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-100">Опубликовать</button>
            </form>
          </div>
        )}

        {/* RECRUITER: JOB DETAIL (Applicants List) */}
        {view === 'job_detail' && (
          <div className="max-w-6xl mx-auto">
             <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-slate-400 mb-6 font-bold hover:text-slate-600"><ArrowLeft size={18}/> Все вакансии</button>
             <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 mb-8 flex justify-between items-center">
               <div>
                  <h2 className="text-3xl font-black">{selectedJob.title}</h2>
                  <p className="text-slate-400">Всего откликов: {applications.length}</p>
               </div>
               <div className="bg-blue-50 px-4 py-2 rounded-xl text-blue-600 font-bold text-sm flex items-center gap-2"><LinkIcon size={16}/> {selectedJob.short_link}</div>
             </div>

             <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-100">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase">Кандидат</th>
                      <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase">Статус</th>
                      <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase">AI Score</th>
                      <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase">Дата</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {applications.map(app => (
                      <tr key={app.id} onClick={() => handleCandidateClick(app)} className="hover:bg-slate-50 cursor-pointer transition">
                        <td className="px-8 py-6 font-bold">{app.candidate_name || "Кандидат"}</td>
                        <td className="px-8 py-6"><StatusBadge status={app.status}/></td>
                        <td className="px-8 py-6"><ScoreBadge score={app.ai_score}/></td>
                        <td className="px-8 py-6 text-slate-400 text-sm">{new Date(app.applied_at).toLocaleDateString()}</td>
                        <td className="px-8 py-6 text-right"><ChevronRight className="inline text-slate-300"/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {/* RECRUITER: CANDIDATE PROFILE & AI DATA */}
        {view === 'candidate_profile' && (
          <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-4">
                  <button onClick={() => setView('job_detail')} className="p-2 hover:bg-white rounded-full"><ArrowLeft/></button>
                  <h2 className="text-3xl font-black">{selectedApp.candidate_name}</h2>
                  <ScoreBadge score={selectedApp.ai_score}/>
               </div>
               <div className="flex gap-3">
                  <select value={selectedApp.status} onChange={(e) => updateAppStatus(e.target.value)} className="bg-white border rounded-xl px-4 font-bold text-sm outline-none">
                    <option value="New">Новый</option>
                    <option value="Interview">Интервью</option>
                    <option value="Offer">Оффер</option>
                    <option value="Rejected">Отказ</option>
                  </select>
               </div>
            </div>

            <div className="flex flex-1 gap-8 min-h-0">
               <div className="w-1/3 bg-white rounded-3xl p-8 shadow-sm border border-slate-100 overflow-y-auto">
                  <h3 className="flex items-center gap-2 font-black text-indigo-600 mb-6"><Sparkles size={20}/> Анализ ИИ</h3>
                  {aiData ? (
                    <div className="space-y-6">
                      <div className="bg-indigo-50 p-6 rounded-2xl text-indigo-900 leading-relaxed text-sm font-medium border border-indigo-100">
                        {aiData.ai_verdict}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-400 uppercase mb-3">Навыки из резюме</p>
                        <div className="flex flex-wrap gap-2">
                           {aiData.skills_detected?.split(',').map((s,i) => <span key={i} className="bg-slate-100 px-3 py-1 rounded-lg text-xs font-bold text-slate-600">{s.trim()}</span>)}
                        </div>
                      </div>
                      <div className="pt-6 border-t">
                        <p className="text-xs font-black text-slate-400 uppercase mb-4">Связаться через шаблоны</p>
                        <div className="space-y-2">
                           {templates.map(t => (
                             <button key={t.id} onClick={() => generateTG(t.id)} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-blue-600 hover:text-white rounded-2xl transition group text-left">
                               <span className="font-bold text-sm">{t.title}</span>
                               <MessageCircle size={16} className="text-slate-300 group-hover:text-white"/>
                             </button>
                           ))}
                        </div>
                      </div>
                    </div>
                  ) : <div className="text-center py-20 text-slate-300 font-bold">Данные ИИ загружаются...</div>}
               </div>
               <div className="flex-1 bg-slate-200/50 rounded-3xl p-10 overflow-y-auto flex flex-col items-center">
                  <FileText size={64} className="text-slate-300 mb-4"/>
                  <p className="font-black text-slate-400 mb-8">ТЕКСТ РЕЗЮМЕ</p>
                  <div className="bg-white p-12 rounded-2xl shadow-sm w-full max-w-2xl text-slate-700 leading-relaxed whitespace-pre-wrap font-serif">
                    {aiData?.parsed_text || "Распознавание текста..."}
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* RECRUITER: TEMPLATES */}
        {view === 'templates' && (
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-end mb-10">
              <div>
                <h2 className="text-3xl font-black">Шаблоны сообщений</h2>
                <p className="text-slate-500">Автоматизируйте общение с кандидатами в Telegram</p>
              </div>
              <button onClick={() => setView('create_template')} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2"><Plus size={20}/> Добавить</button>
            </div>
            <div className="space-y-4">
              {templates.map(t => (
                <div key={t.id} className="bg-white p-6 rounded-3xl border border-slate-100 flex justify-between items-center group shadow-sm hover:shadow-md transition">
                  <div>
                    <h3 className="font-black text-slate-900">{t.title}</h3>
                    <p className="text-slate-500 text-sm mt-1">{t.body_text.slice(0, 100)}...</p>
                  </div>
                  <button onClick={() => deleteTemplate(t.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition"><Trash2 size={20}/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RECRUITER: CREATE TEMPLATE */}
        {view === 'create_template' && (
          <div className="max-w-2xl mx-auto bg-white p-10 rounded-3xl shadow-sm">
            <button onClick={() => setView('templates')} className="flex items-center gap-2 text-slate-400 mb-6 font-bold hover:text-slate-600"><ArrowLeft size={18}/> Назад</button>
            <h2 className="text-3xl font-black mb-8">Создать шаблон</h2>
            <form onSubmit={saveTemplate} className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-2">Название шаблона</label>
                <input required placeholder="Напр. Приглашение на созвон" className="w-full px-4 py-3 bg-slate-50 border rounded-xl" onChange={e => setFormData({...formData, title: e.target.value})}/>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Текст сообщения</label>
                <textarea required placeholder="Используйте плейсхолдеры {name} и {job}..." className="w-full px-4 py-3 bg-slate-50 border rounded-xl h-40" onChange={e => setFormData({...formData, body_text: e.target.value})}/>
              </div>
              <button className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold">Сохранить</button>
            </form>
          </div>
        )}

        {/* CANDIDATE PORTAL: SEARCH */}
        {user?.role === 'candidate' && view === 'search' && (
           <div className="max-w-md mx-auto pt-20 text-center">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner"><LayoutDashboard size={40}/></div>
              <h2 className="text-3xl font-black mb-4">Найти вакансию</h2>
              <p className="text-slate-500 mb-10">Введите секретный код вакансии, чтобы подать резюме</p>
              <form onSubmit={findVacancy} className="relative">
                <input required placeholder="Код: xy7z9" className="w-full px-6 py-5 rounded-2xl border-2 border-slate-100 focus:border-blue-600 outline-none text-xl font-bold transition shadow-sm" onChange={e => setFormData({...formData, search_code: e.target.value})}/>
                <button className="absolute right-2 top-2 bottom-2 bg-blue-600 text-white px-6 rounded-xl hover:bg-blue-700 transition"><ChevronRight/></button>
              </form>
              <button onClick={() => fetchMyApps()} className="mt-12 text-blue-600 font-bold hover:underline flex items-center gap-2 justify-center mx-auto"><Clock size={18}/> Мои предыдущие отклики</button>
           </div>
        )}

        {/* CANDIDATE PORTAL: UPLOAD */}
        {user?.role === 'candidate' && view === 'upload' && (
          <div className="max-w-lg mx-auto pt-10">
             <button onClick={() => setView('search')} className="flex items-center gap-2 text-slate-400 mb-8 font-bold hover:text-slate-600"><ArrowLeft size={18}/> К поиску</button>
             <div className="bg-white p-8 rounded-3xl shadow-xl border border-blue-50 mb-8">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest mb-2"><CheckCircle2 size={14}/> Вакансия найдена</div>
                <h1 className="text-3xl font-black mb-4">{selectedJob.title}</h1>
                <div className="p-4 bg-slate-50 rounded-2xl text-slate-600 text-sm leading-relaxed mb-8">{selectedJob.ai_filters}</div>
                
                <div className="relative group border-4 border-dashed border-slate-100 rounded-3xl p-12 text-center hover:border-blue-200 transition">
                   <input type="file" accept=".pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => uploadResume(e.target.files[0])}/>
                   <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition"><Upload size={24}/></div>
                   <p className="font-black text-slate-900 mb-1">Загрузить PDF</p>
                   <p className="text-slate-400 text-sm">Нажмите или перетащите файл</p>
                </div>
             </div>
          </div>
        )}

        {/* CANDIDATE PORTAL: MY APPS */}
        {user?.role === 'candidate' && view === 'my_apps' && (
           <div className="max-w-2xl mx-auto pt-10">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-black">Мои отклики</h2>
                <button onClick={() => setView('search')} className="p-3 bg-white rounded-xl shadow-sm text-slate-400 hover:text-blue-600 transition"><Plus size={24}/></button>
              </div>
              <div className="space-y-4">
                {applications.length === 0 ? <p className="text-center text-slate-400 py-20 font-bold">Вы еще не подавали резюме</p> : 
                  applications.map(app => (
                    <div key={app.id} className="bg-white p-6 rounded-3xl border border-slate-100 flex justify-between items-center shadow-sm">
                       <div>
                         <p className="text-xs font-black text-slate-400 uppercase mb-1">ID ВАКАНСИИ: {app.vacancy_id.slice(0,8)}</p>
                         <p className="text-slate-500 text-sm flex items-center gap-1"><Clock size={12}/> {new Date(app.applied_at).toLocaleDateString()}</p>
                       </div>
                       <StatusBadge status={app.status}/>
                    </div>
                  ))
                }
              </div>
           </div>
        )}
      </main>
    </div>
  );
}