import React, { useState, useEffect } from 'react';
import { 
  Users, Briefcase, FileText, MessageCircle, ChevronRight, 
  Sparkles, Clock, Upload, ArrowLeft, Send, XCircle, 
  LogOut, Plus, Link as LinkIcon, AlertCircle, Loader2,
  Trash2, Archive
} from 'lucide-react';

// URL вашего готового Golang бэкенда
const API_BASE = 'https://ai-recruiting.onrender.com';

// --- UTILS ---

// Универсальная функция для запросов к API
const apiRequest = async (endpoint, method = 'GET', body = null, token = null, isFormData = false) => {
  const headers = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  
  const config = {
    method,
    headers,
  };

  if (body) {
    config.body = isFormData ? body : JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Ошибка API: ${response.status}`);
    }
    // Обработка ответов без тела (например 201 Created или 204 No Content)
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

// --- UI COMPONENTS ---

const StatusBadge = ({ status }) => {
  const styles = {
    'New': 'bg-blue-50 text-blue-700 border-blue-200',
    'Interview': 'bg-purple-50 text-purple-700 border-purple-200',
    'Offer': 'bg-green-50 text-green-700 border-green-200',
    'Rejected': 'bg-slate-100 text-slate-500 border-slate-200',
    'Active': 'bg-green-50 text-green-700 border-green-200',
    'Archived': 'bg-gray-100 text-gray-500 border-gray-200',
    'AI Processing': 'bg-indigo-50 text-indigo-600 animate-pulse'
  };

  const label = {
    'New': 'Новый',
    'Interview': 'Интервью',
    'Offer': 'Оффер',
    'Rejected': 'Отказ',
    'Active': 'Активна',
    'Archived': 'В архиве',
    'AI Processing': 'Анализ...'
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles['New']}`}>
      {label[status] || status}
    </span>
  );
};

const ScoreBadge = ({ score }) => {
  if (score === undefined || score === null) return null;
  let colorClass = 'bg-red-100 text-red-700';
  if (score >= 80) colorClass = 'bg-green-100 text-green-700';
  else if (score >= 50) colorClass = 'bg-yellow-100 text-yellow-800';

  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-full font-bold text-sm ${colorClass}`}>
      <Sparkles size={14} />
      <span>{score}</span>
    </div>
  );
};

export default function App() {
  // --- STATE ---
  const [user, setUser] = useState(null); // { id, role, token, email }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Navigation
  const [view, setView] = useState('auth'); // auth, dashboard, templates, job_detail, candidate_profile, candidate_landing, upload, my_apps
  
  // Data State
  const [vacancies, setVacancies] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [aiData, setAiData] = useState(null);
  const [templates, setTemplates] = useState([]);
  
  // Forms & Modals State
  const [authMode, setAuthMode] = useState('login'); // login, signup
  const [authRole, setAuthRole] = useState('recruiter'); // recruiter, candidate
  const [formData, setFormData] = useState({});
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);

  // --- AUTH HANDLERS ---

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let endpoint = '';
      let body = {};

      if (authMode === 'login') {
        endpoint = '/auth/login';
        body = { email: formData.email, password: formData.password };
      } else {
        endpoint = authRole === 'recruiter' ? '/auth/recruiter/signup' : '/auth/candidate/signup';
        body = { ...formData };
      }

      const res = await apiRequest(endpoint, 'POST', body);
      
      // Нормализация данных пользователя из разных ответов API
      const userId = res.user_id || res.recruiter_id || res.candidate_id || res.id;
      // Если API логина не возвращает роль, берем из выбранного таба (для простоты)
      const userRole = res.role || authRole; 

      const userData = {
        role: userRole,
        token: res.token,
        id: userId,
        email: formData.email
      };

      setUser(userData);
      
      if (userData.role === 'recruiter') {
        setView('dashboard');
        fetchVacancies(userId);
      } else {
        setView('candidate_search');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setVacancies([]);
    setApplications([]);
    setView('auth');
    setFormData({});
  };

  // --- RECRUITER ACTIONS ---

  const fetchVacancies = async (userId) => {
    setLoading(true);
    try {
      const res = await apiRequest('/vacancies');
      // Фильтруем вакансии текущего рекрутера (если API возвращает все)
      const myVacancies = res.filter(v => v.recruiter_id === (userId || user.id)); 
      setVacancies(myVacancies);
    } catch (err) {
      console.error("Failed to fetch vacancies", err);
    } finally {
      setLoading(false);
    }
  };

  const createVacancy = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiRequest('/vacancies', 'POST', {
        title: formData.title,
        ai_filters: formData.ai_filters,
        recruiter_id: user.id,
        is_archived: false
      });
      setIsCreatingJob(false);
      fetchVacancies(user.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const archiveVacancy = async (vacancyId) => {
    if (!confirm('Вы уверены? Кандидаты больше не смогут откликаться.')) return;
    setLoading(true);
    try {
        await apiRequest(`/vacancies/${vacancyId}/archive`, 'PATCH');
        if (selectedJob && selectedJob.id === vacancyId) {
             setSelectedJob({...selectedJob, is_archived: true});
        }
        fetchVacancies(user.id);
    } catch (err) {
        alert("Ошибка архивации: " + err.message);
    } finally {
        setLoading(false);
    }
  };

  const handleJobSelect = async (job) => {
    setSelectedJob(job);
    setLoading(true);
    try {
      const apps = await apiRequest(`/vacancies/${job.id}/applications`);
      setApplications(apps);
      setView('job_detail');
    } catch (err) {
      setError("Не удалось загрузить кандидатов");
    } finally {
      setLoading(false);
    }
  };

  // --- TEMPLATE ACTIONS (UC-5) ---

  const fetchTemplates = async () => {
    setLoading(true);
    try {
        const tmpls = await apiRequest(`/templates?recruiter_id=${user.id}`);
        setTemplates(tmpls);
    } catch(err) {
        console.error("Templates error", err);
    } finally {
        setLoading(false);
    }
  };

  const createTemplate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
        await apiRequest('/templates', 'POST', {
            title: formData.template_title,
            body_text: formData.template_body,
            recruiter_id: user.id
        });
        setIsCreatingTemplate(false);
        fetchTemplates();
    } catch (err) {
        alert("Ошибка создания шаблона");
    } finally {
        setLoading(false);
    }
  };

  const deleteTemplate = async (id) => {
      if(!confirm("Удалить шаблон?")) return;
      try {
          await apiRequest(`/templates/${id}`, 'DELETE');
          fetchTemplates();
      } catch (err) {
          alert("Ошибка удаления");
      }
  };

  // --- APPLICATION ACTIONS ---

  const handleAppSelect = async (app) => {
    setSelectedApp(app);
    setLoading(true);
    try {
      // 1. Получаем данные AI
      const data = await apiRequest(`/applications/${app.id}/ai-data`);
      setAiData(data);
      
      // 2. Загружаем шаблоны для модалки связи
      const tmpls = await apiRequest(`/templates?recruiter_id=${user.id}`);
      setTemplates(tmpls);
      
      setView('candidate_profile');
    } catch (err) {
      console.error(err); 
      setAiData(null); // Если данных AI еще нет
      setView('candidate_profile');
    } finally {
      setLoading(false);
    }
  };

  const changeStatus = async (newStatus) => {
    try {
      await apiRequest(`/applications/${selectedApp.id}/status`, 'PATCH', { status: newStatus });
      setSelectedApp(prev => ({ ...prev, status: newStatus }));
      setApplications(prev => prev.map(a => a.id === selectedApp.id ? { ...a, status: newStatus } : a));
    } catch (err) {
      alert("Ошибка при обновлении статуса");
    }
  };

  const sendTelegramMessage = async () => {
    if (!selectedTemplate) return;
    setLoading(true);
    try {
      const res = await apiRequest(`/templates/${selectedTemplate.id}/generate`, 'POST', {
        candidate_name: selectedApp.candidate_name,
        telegram_username: aiData?.telegram_username || "username", 
        vacancy_title: selectedJob.title
      });
      
      if (res.telegram_link) {
         window.open(res.telegram_link, '_blank');
      } else {
         alert("Ссылка сгенерирована, но браузер заблокировал открытие окна. Проверьте консоль.");
         console.log(res);
      }
      setShowTemplateModal(false);
    } catch (err) {
      alert("Ошибка генерации: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- CANDIDATE ACTIONS ---

  const searchVacancyByLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Поддержка и полных ссылок, и просто кодов
      const shortLink = formData.search_link?.split('/').pop();
      const vacancy = await apiRequest(`/vacancies/link/${shortLink}`);
      setSelectedJob(vacancy);
      setView('upload');
    } catch (err) {
      setError("Вакансия не найдена или находится в архиве.");
    } finally {
      setLoading(false);
    }
  };

  const uploadResume = async (file) => {
    setLoading(true);
    // Используем FormData для отправки файла
    const data = new FormData();
    data.append('candidate_id', user.id);
    data.append('vacancy_id', selectedJob.id);
    data.append('resume', file);

    try {
      await apiRequest('/applications', 'POST', data, null, true);
      alert("Резюме успешно отправлено! ИИ приступил к анализу.");
      fetchMyApps();
      setView('my_apps');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyApps = async () => {
    setLoading(true);
    try {
      const apps = await apiRequest(`/my-applications?candidate_id=${user.id}`);
      setApplications(apps);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- VIEWS RENDER ---

  if (view === 'auth') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl text-blue-600 mb-4">
               <Sparkles />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">AI Recruiting</h1>
            <p className="text-slate-500">Система автоматизации найма</p>
          </div>

          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm flex items-center gap-2"><AlertCircle size={16}/> {error}</div>}

          <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
            <button onClick={() => { setAuthRole('recruiter'); setFormData({}); }} className={`flex-1 py-2 text-sm font-medium rounded-md transition ${authRole === 'recruiter' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Рекрутер</button>
            <button onClick={() => { setAuthRole('candidate'); setFormData({}); }} className={`flex-1 py-2 text-sm font-medium rounded-md transition ${authRole === 'candidate' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Соискатель</button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authRole === 'recruiter' && authMode === 'signup' && (
              <input 
                required 
                placeholder="Название компании" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={e => setFormData({...formData, company_name: e.target.value})}
              />
            )}
            <input 
              required 
              type="email" 
              placeholder="Email" 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
            {authRole === 'candidate' && authMode === 'signup' && (
              <input 
                required 
                placeholder="Telegram (@username)" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={e => setFormData({...formData, telegram_username: e.target.value})}
              />
            )}
            <input 
              required 
              type="password" 
              placeholder="Пароль" 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
            
            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 transition flex justify-center items-center">
              {loading ? <Loader2 className="animate-spin" /> : (authMode === 'login' ? 'Войти' : 'Создать аккаунт')}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-slate-500">{authMode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}</span>
            <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setError(null); }} className="ml-2 text-blue-600 font-medium hover:underline">
              {authMode === 'login' ? 'Зарегистрироваться' : 'Войти'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RECRUITER LAYOUT ---

  if (user?.role === 'recruiter') {
    return (
      <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
        <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col fixed h-full z-10">
          <div className="p-6 border-b border-slate-100 flex items-center gap-2">
            <Sparkles className="text-blue-600" size={24} />
            <span className="font-bold text-lg">AI Recruiter</span>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            <button onClick={() => { fetchVacancies(user.id); setView('dashboard'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Briefcase size={18} /> Вакансии
            </button>
            <button onClick={() => { fetchTemplates(); setView('templates'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === 'templates' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <FileText size={18} /> Шаблоны
            </button>
          </nav>
          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold uppercase">{user.email[0]}</div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">{user.email}</p>
                <p className="text-xs text-slate-500">Recruiter</p>
              </div>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 text-red-500 text-sm hover:text-red-700 w-full"><LogOut size={16}/> Выйти</button>
          </div>
        </aside>

        <main className="flex-1 md:ml-64 p-8">
          
          {/* DASHBOARD VIEW */}
          {view === 'dashboard' && (
            <div className="max-w-5xl mx-auto">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold">Вакансии</h2>
                <button onClick={() => setIsCreatingJob(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm flex items-center gap-2">
                  <Plus size={16} /> Создать
                </button>
              </div>

              {isCreatingJob && (
                <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-lg mb-8 animate-in slide-in-from-top-4">
                  <h3 className="font-bold mb-4">Новая вакансия</h3>
                  <form onSubmit={createVacancy} className="space-y-4">
                    <input required placeholder="Название (напр. Senior Backend)" className="w-full px-4 py-2 border rounded-lg" onChange={e => setFormData({...formData, title: e.target.value})}/>
                    <textarea required placeholder="ИИ-фильтры: Опишите навыки, опыт и требования..." className="w-full px-4 py-2 border rounded-lg h-24" onChange={e => setFormData({...formData, ai_filters: e.target.value})}/>
                    <div className="flex gap-2 justify-end">
                      <button type="button" onClick={() => setIsCreatingJob(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg">Отмена</button>
                      <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Опубликовать</button>
                    </div>
                  </form>
                </div>
              )}

              {loading && !isCreatingJob ? <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-blue-500"/></div> : (
                <div className="grid gap-4">
                  {vacancies.length === 0 ? <div className="text-center text-slate-400 py-10">Список вакансий пуст.</div> : 
                    vacancies.map(job => (
                      <div key={job.id} onClick={() => handleJobSelect(job)} className={`bg-white p-6 rounded-xl border shadow-sm hover:shadow-md transition cursor-pointer flex justify-between items-center group ${job.is_archived ? 'border-slate-100 opacity-70 bg-slate-50' : 'border-slate-200'}`}>
                        <div>
                          <div className="flex items-center gap-2">
                             <h3 className="text-lg font-semibold group-hover:text-blue-600 transition">{job.title}</h3>
                             {job.is_archived && <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded">Архив</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                             <LinkIcon size={12} />
                             <span className="truncate max-w-xs">{job.short_link}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-slate-400">
                           <ChevronRight />
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          )}

          {/* TEMPLATES VIEW (UC-5) */}
          {view === 'templates' && (
              <div className="max-w-4xl mx-auto">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold">Шаблоны сообщений</h2>
                    <button onClick={() => setIsCreatingTemplate(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                      <Plus size={16} /> Добавить
                    </button>
                  </div>

                  {isCreatingTemplate && (
                    <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-lg mb-8">
                      <form onSubmit={createTemplate} className="space-y-4">
                        <input required placeholder="Название (напр. Приглашение)" className="w-full px-4 py-2 border rounded-lg" onChange={e => setFormData({...formData, template_title: e.target.value})}/>
                        <textarea required placeholder="Текст сообщения (используйте {candidate_name} и {vacancy_title} как переменные)" className="w-full px-4 py-2 border rounded-lg h-32" onChange={e => setFormData({...formData, template_body: e.target.value})}/>
                        <div className="flex gap-2 justify-end">
                          <button type="button" onClick={() => setIsCreatingTemplate(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg">Отмена</button>
                          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Сохранить</button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="grid gap-4">
                      {templates.map(t => (
                          <div key={t.id} className="bg-white p-5 rounded-lg border border-slate-200 flex justify-between items-start">
                              <div>
                                  <h3 className="font-bold text-slate-800">{t.title}</h3>
                                  <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{t.body_text}</p>
                              </div>
                              <button onClick={() => deleteTemplate(t.id)} className="text-slate-300 hover:text-red-500 p-2"><Trash2 size={18}/></button>
                          </div>
                      ))}
                      {templates.length === 0 && !loading && <div className="text-center text-slate-400 py-10">Нет шаблонов. Создайте первый, чтобы ускорить работу.</div>}
                  </div>
              </div>
          )}

          {/* JOB DETAIL VIEW */}
          {view === 'job_detail' && selectedJob && (
            <div className="max-w-6xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center gap-4">
                     <button onClick={() => { fetchVacancies(user.id); setView('dashboard'); }} className="p-2 hover:bg-slate-200 rounded-full transition"><ArrowLeft size={20}/></button>
                     <div>
                       <h2 className="text-xl font-bold">{selectedJob.title}</h2>
                       <p className="text-sm text-slate-500">Код: {selectedJob.short_link}</p>
                     </div>
                 </div>
                 {!selectedJob.is_archived && (
                     <button onClick={() => archiveVacancy(selectedJob.id)} className="flex items-center gap-2 text-slate-500 hover:text-red-600 bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm transition">
                         <Archive size={16}/> В архив
                     </button>
                 )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h3 className="font-semibold text-slate-700">Отклики ({applications.length})</h3>
                </div>
                <div className="overflow-auto flex-1">
                   {loading ? <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto"/></div> : (
                     applications.length === 0 ? <div className="p-10 text-center text-slate-400">Пока нет откликов</div> : (
                       <table className="w-full text-left border-collapse">
                         <thead className="bg-slate-50 text-slate-500 text-xs uppercase sticky top-0">
                           <tr>
                             <th className="px-6 py-3">Кандидат</th>
                             <th className="px-6 py-3">Статус</th>
                             <th className="px-6 py-3">AI Score</th>
                             <th className="px-6 py-3">Дата</th>
                             <th className="px-6 py-3"></th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                           {applications.map(app => (
                             <tr key={app.id} onClick={() => handleAppSelect(app)} className="hover:bg-blue-50/50 cursor-pointer transition">
                               <td className="px-6 py-4 font-medium text-slate-900">{app.candidate_name || 'Без имени'}</td>
                               <td className="px-6 py-4"><StatusBadge status={app.status} /></td>
                               <td className="px-6 py-4"><ScoreBadge score={app.ai_score} /></td>
                               <td className="px-6 py-4 text-sm text-slate-500">{new Date(app.applied_at).toLocaleDateString()}</td>
                               <td className="px-6 py-4 text-right"><ChevronRight size={16} className="text-slate-300 inline"/></td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     )
                   )}
                </div>
              </div>
            </div>
          )}

          {/* CANDIDATE PROFILE (UC-3, UC-4) */}
          {view === 'candidate_profile' && selectedApp && (
             <div className="max-w-6xl mx-auto h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setView('job_detail')} className="p-2 hover:bg-slate-200 rounded-full"><ArrowLeft size={20}/></button>
                    <h2 className="text-xl font-bold">{selectedApp.candidate_name || 'Кандидат'}</h2>
                    <ScoreBadge score={selectedApp.ai_score} />
                  </div>
                  <div className="flex gap-3">
                     <select 
                       value={selectedApp.status} 
                       onChange={(e) => changeStatus(e.target.value)}
                       className="bg-white border border-slate-300 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                     >
                       <option value="New">Новый</option>
                       <option value="Interview">Интервью</option>
                       <option value="Offer">Оффер</option>
                       <option value="Rejected">Отказ</option>
                     </select>
                     <button onClick={() => setShowTemplateModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2">
                       <MessageCircle size={16}/> Написать в TG
                     </button>
                  </div>
                </div>

                <div className="flex flex-1 gap-6 overflow-hidden">
                   {/* AI Analysis Card */}
                   <div className="w-1/3 bg-white rounded-xl border border-indigo-100 shadow-sm p-6 overflow-auto">
                      <h3 className="text-sm font-bold text-indigo-900 mb-4 flex items-center gap-2">
                        <Sparkles size={16} className="text-indigo-500" /> Вердикт ИИ
                      </h3>
                      {loading ? <Loader2 className="animate-spin text-indigo-500"/> : (
                        aiData ? (
                          <div className="space-y-4">
                            <div className="p-3 bg-indigo-50 rounded-lg text-sm text-indigo-900 leading-relaxed">
                              {aiData.ai_verdict || "Нет описания вердикта."}
                            </div>
                            <div>
                               <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Навыки</h4>
                               <div className="flex flex-wrap gap-2">
                                  {aiData.skills_detected?.split(',').map((s, i) => (
                                    <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200">{s.trim()}</span>
                                  )) || <span className="text-xs text-slate-400">Не найдено</span>}
                               </div>
                            </div>
                            <div>
                               <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Контакты</h4>
                               <p className="text-sm">Telegram: <span className="text-blue-600 font-medium">{aiData.telegram_username || "Не найден"}</span></p>
                            </div>
                          </div>
                        ) : <div className="text-center text-slate-400 text-sm">Данные анализируются...</div>
                      )}
                   </div>

                   {/* Resume Text */}
                   <div className="flex-1 bg-slate-100 rounded-xl border border-slate-200 p-8 overflow-auto flex flex-col items-center">
                      <FileText size={48} className="text-slate-300 mb-4"/>
                      <h3 className="text-lg font-medium text-slate-600 mb-2">Распознанный текст резюме</h3>
                      <div className="bg-white p-6 rounded-lg shadow-sm w-full max-w-2xl text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                         {aiData?.parsed_text || "Текст резюме загружается..."}
                      </div>
                   </div>
                </div>
             </div>
          )}

          {/* Template Selection Modal */}
          {showTemplateModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg">Выбор шаблона</h3>
                    <button onClick={() => setShowTemplateModal(false)}><XCircle className="text-slate-400 hover:text-red-500"/></button>
                  </div>
                  
                  {templates.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-lg">
                        <p className="mb-2">Нет шаблонов</p>
                        <button onClick={() => {setShowTemplateModal(false); setView('templates');}} className="text-blue-600 font-medium hover:underline">Создать шаблон</button>
                    </div>
                  ) : (
                    <div className="space-y-2 mb-6 max-h-60 overflow-auto">
                       {templates.map(t => (
                         <div key={t.id} onClick={() => setSelectedTemplate(t)} className={`p-3 border rounded-lg cursor-pointer transition ${selectedTemplate?.id === t.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
                            <div className="font-medium text-sm">{t.title}</div>
                            <div className="text-xs text-slate-500 truncate">{t.body_text}</div>
                         </div>
                       ))}
                    </div>
                  )}

                  <button 
                    onClick={sendTelegramMessage} 
                    disabled={!selectedTemplate || loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     {loading ? <Loader2 className="animate-spin"/> : <><Send size={16}/> Открыть чат в Telegram</>}
                  </button>
               </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // --- CANDIDATE LAYOUT ---

  if (user?.role === 'candidate') {
     return (
       <div className="min-h-screen bg-white flex flex-col font-sans text-slate-900">
          <header className="px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
             <div className="flex items-center gap-2 font-bold text-blue-600">
               <Briefcase size={20}/> Portal
             </div>
             <div className="flex items-center gap-4">
                <button onClick={() => { fetchMyApps(); setView('my_apps'); }} className={`text-sm font-medium transition ${view === 'my_apps' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>Мои отклики</button>
                <button onClick={() => setView('candidate_search')} className={`text-sm font-medium transition ${view === 'candidate_search' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>Поиск</button>
                <button onClick={handleLogout} className="text-slate-400 hover:text-red-500"><LogOut size={18}/></button>
             </div>
          </header>

          <main className="flex-1 p-6 max-w-lg mx-auto w-full">
             {view === 'candidate_search' && (
               <div className="mt-10 text-center animate-in fade-in zoom-in duration-300">
                  <h2 className="text-2xl font-bold mb-2">Поиск вакансии</h2>
                  <p className="text-slate-500 mb-8">Введите код вакансии, который вы получили от рекрутера.</p>
                  
                  <form onSubmit={searchVacancyByLink} className="relative">
                    <input 
                      required
                      placeholder="Код (например: xy7z9)" 
                      className="w-full pl-4 pr-12 py-4 border-2 border-slate-200 rounded-xl text-lg focus:border-blue-500 outline-none transition"
                      onChange={e => setFormData({...formData, search_link: e.target.value})}
                    />
                    <button type="submit" disabled={loading} className="absolute right-2 top-2 bottom-2 bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700 transition flex items-center">
                      {loading ? <Loader2 className="animate-spin"/> : <ChevronRight />}
                    </button>
                  </form>
                  {error && <p className="text-red-500 mt-4 text-sm bg-red-50 p-2 rounded">{error}</p>}
               </div>
             )}

             {view === 'upload' && selectedJob && (
               <div className="mt-6 animate-in slide-in-from-right duration-300">
                  <button onClick={() => setView('candidate_search')} className="text-slate-400 hover:text-slate-600 mb-6 flex items-center gap-1 text-sm"><ArrowLeft size={16}/> Назад</button>
                  
                  <div className="bg-blue-50 p-6 rounded-2xl mb-8 border border-blue-100">
                     <h1 className="text-2xl font-bold text-blue-900 mb-1">{selectedJob.title}</h1>
                     <div className="flex items-center gap-2 text-blue-600 text-sm opacity-80 mb-4">
                        <Briefcase size={14} /> ID: {selectedJob.id.slice(0,8)}
                     </div>
                     <p className="text-sm text-blue-800 leading-relaxed bg-white/50 p-3 rounded-lg shadow-sm">
                       {selectedJob.ai_filters || "Требования к кандидату стандартные."}
                     </p>
                  </div>

                  <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition cursor-pointer relative group">
                     <input 
                       type="file" 
                       accept="application/pdf"
                       onChange={(e) => uploadResume(e.target.files[0])}
                       className="absolute inset-0 opacity-0 cursor-pointer z-10"
                       disabled={loading}
                     />
                     {loading ? (
                       <div className="py-4">
                          <Loader2 className="animate-spin text-blue-600 mb-2 mx-auto" size={32}/>
                          <p className="font-bold text-slate-700">ИИ анализирует резюме...</p>
                          <p className="text-xs text-slate-400">Пожалуйста, подождите</p>
                       </div>
                     ) : (
                       <>
                         <div className="w-16 h-16 bg-blue-100 group-hover:bg-blue-200 transition rounded-full flex items-center justify-center text-blue-600 mb-4">
                           <Upload size={28} />
                         </div>
                         <h3 className="font-bold text-slate-900">Загрузите PDF резюме</h3>
                         <p className="text-sm text-slate-500 mt-1">Перетащите или кликните</p>
                       </>
                     )}
                  </div>
               </div>
             )}

             {view === 'my_apps' && (
               <div className="mt-6">
                 <h2 className="text-xl font-bold mb-6">Мои отклики</h2>
                 {loading && applications.length === 0 ? <Loader2 className="animate-spin mx-auto"/> : (
                   <div className="space-y-4">
                     {applications.length === 0 ? <div className="text-center text-slate-400 py-10 bg-slate-50 rounded-xl">История откликов пуста</div> : 
                       applications.map(app => (
                         <div key={app.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center hover:shadow-md transition">
                            <div>
                               <div className="font-bold text-slate-900 flex items-center gap-2">
                                  <Briefcase size={14} className="text-slate-400"/>
                                  Вакансия: {app.vacancy_id.slice(0,8)}...
                               </div>
                               <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                 <Clock size={10} /> {new Date(app.applied_at).toLocaleDateString()}
                               </div>
                            </div>
                            <StatusBadge status={app.status} />
                         </div>
                       ))
                     }
                   </div>
                 )}
               </div>
             )}
          </main>
       </div>
     );
  }

  return <div className="flex items-center justify-center h-screen bg-slate-100"><Loader2 className="animate-spin text-slate-400"/></div>;
}