import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';

// --- CONFIGURATION ---
const API_BASE = "https://ai-recruiting.onrender.com";

// --- AUTH CONTEXT ---
const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const login = (data) => { setUser(data); localStorage.setItem('user', JSON.stringify(data)); };
  const logout = () => { setUser(null); localStorage.removeItem('user'); };
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- COMPONENTS ---

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  return (
    <nav className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg">
      <Link to="/" className="text-xl font-bold tracking-tight">AI Recruiting <span className="text-blue-400">Pro</span></Link>
      <div className="space-x-4">
        {user ? (
          <>
            <span className="text-gray-400 text-sm">{user.email}</span>
            <button onClick={logout} className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded transition">Logout</button>
          </>
        ) : (
          <Link to="/login" className="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded transition">Login</Link>
        )}
      </div>
    </nav>
  );
};

// --- PAGES ---

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('candidate'); // 'candidate' or 'recruiter'
  const [form, setForm] = useState({ email: '', password: '', company_name: '', telegram_username: '' });
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    let url = `${API_BASE}/auth/login`;
    if (!isLogin) {
      url = role === 'recruiter' ? `${API_BASE}/auth/recruiter/signup` : `${API_BASE}/auth/candidate/signup`;
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        // Normalizing IDs because Swagger shows recruiter_id or candidate_id
        const userObj = { 
          ...data, 
          id: data.recruiter_id || data.candidate_id || data.id,
          role: role || (data.recruiter_id ? 'recruiter' : 'candidate')
        };
        login(userObj);
        navigate('/');
      } else {
        alert(data.error || "Authentication failed");
      }
    } catch (err) { alert("Server error"); }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-xl shadow-2xl border border-gray-100">
      <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
      <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
        <button className={`flex-1 py-2 rounded-md ${isLogin ? 'bg-white shadow' : ''}`} onClick={() => setIsLogin(true)}>Login</button>
        <button className={`flex-1 py-2 rounded-md ${!isLogin ? 'bg-white shadow' : ''}`} onClick={() => setIsLogin(false)}>Sign Up</button>
      </div>

      {!isLogin && (
        <select className="w-full mb-4 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={role} onChange={e => setRole(e.target.value)}>
          <option value="candidate">I am a Candidate</option>
          <option value="recruiter">I am a Recruiter</option>
        </select>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && role === 'recruiter' && (
          <input className="w-full p-3 border rounded-lg" placeholder="Company Name" onChange={e => setForm({...form, company_name: e.target.value})} required />
        )}
        {!isLogin && role === 'candidate' && (
          <input className="w-full p-3 border rounded-lg" placeholder="Telegram Username (without @)" onChange={e => setForm({...form, telegram_username: e.target.value})} required />
        )}
        <input className="w-full p-3 border rounded-lg" type="email" placeholder="Email Address" onChange={e => setForm({...form, email: e.target.value})} required />
        <input className="w-full p-3 border rounded-lg" type="password" placeholder="Password" onChange={e => setForm({...form, password: e.target.value})} required />
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-bold transition duration-200">
          {isLogin ? 'Sign In' : 'Register Now'}
        </button>
      </form>
    </div>
  );
};

const RecruiterDashboard = () => {
  const { user } = useContext(AuthContext);
  const [vacancies, setVacancies] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newVac, setNewVac] = useState({ title: '', ai_filters: '', recruiter_id: user.id });

  useEffect(() => { fetchVacancies(); }, []);

  const fetchVacancies = async () => {
    const res = await fetch(`${API_BASE}/vacancies`);
    const data = await res.json();
    // Filter locally if API returns all
    setVacancies(data.flat().filter(v => v.recruiter_id === user.id && !v.is_archived));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    await fetch(`${API_BASE}/vacancies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newVac)
    });
    setShowCreate(false);
    fetchVacancies();
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Active Vacancies</h1>
        <button onClick={() => setShowCreate(true)} className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition shadow-md">+ Create Vacancy</button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreate} className="bg-white p-8 rounded-xl w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4 text-gray-800">New Vacancy</h2>
            <input className="w-full p-3 border rounded-lg mb-4" placeholder="Job Title" onChange={e => setNewVac({...newVac, title: e.target.value})} required />
            <textarea className="w-full p-3 border rounded-lg mb-4" placeholder="AI Filters (e.g. Must have 3 years React experience)" rows="4" onChange={e => setNewVac({...newVac, ai_filters: e.target.value})} required />
            <div className="flex gap-3">
              <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg">Publish</button>
              <button type="button" onClick={() => setShowCreate(false)} className="flex-1 bg-gray-200 py-2 rounded-lg">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vacancies.map(v => (
          <div key={v.id} className="bg-white border border-gray-100 p-6 rounded-xl shadow-sm hover:shadow-md transition">
            <h3 className="text-xl font-bold text-blue-900 mb-2">{v.title}</h3>
            <p className="text-sm text-gray-500 mb-4 truncate">Link: {v.short_link}</p>
            <div className="flex justify-between items-center">
               <Link to={`/vacancy/${v.id}/applications`} className="text-blue-600 font-medium hover:underline">View Applicants</Link>
               <button className="text-red-400 hover:text-red-600 text-sm">Archive</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ApplicationsList = () => {
  const { id } = useParams();
  const [apps, setApps] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/vacancies/${id}/applications`)
      .then(res => res.json())
      .then(data => setApps(data));
  }, [id]);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Candidates for this Position</h2>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-semibold">Candidate</th>
              <th className="p-4 font-semibold">AI Score</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {apps.map(app => (
              <tr key={app.id} className="border-b hover:bg-gray-50">
                <td className="p-4">{app.candidate_name || 'Anonymous Candidate'}</td>
                <td className="p-4">
                  <span className={`font-bold ${app.ai_score > 70 ? 'text-green-600' : 'text-orange-600'}`}>
                    {app.ai_score}%
                  </span>
                </td>
                <td className="p-4"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs uppercase">{app.status || 'New'}</span></td>
                <td className="p-4"><Link to={`/application/${app.id}/ai`} className="text-blue-600 hover:underline">Open AI View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AIDataView = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/applications/${id}/ai-data`)
      .then(res => res.json())
      .then(d => { setData(d); setLoading(false); });
  }, [id]);

  const updateStatus = async (status) => {
    await fetch(`${API_BASE}/applications/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    alert("Status Updated to: " + status);
  };

  if (loading) return <div className="text-center mt-20">Analysing Resume with AI...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">AI Verdict</h2>
            <p className="text-slate-400">Application ID: {id}</p>
          </div>
          <div className="text-4xl font-bold text-green-400">{data.ai_score || 0}/100</div>
        </div>
        
        <div className="p-8">
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Analysis Summary</h3>
            <div className="bg-blue-50 p-4 rounded-lg text-blue-900 border border-blue-100">
              {data.verdict || "No verdict available"}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Key Highlights</h3>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">{data.analysis || "Candidate matches key requirements mentioned in the job description."}</p>
          </div>

          <div className="flex flex-wrap gap-4 border-t pt-8">
            <button onClick={() => updateStatus('Interview')} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold">Invite to Interview</button>
            <button onClick={() => updateStatus('Offer')} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold">Send Offer</button>
            <button onClick={() => updateStatus('Rejected')} className="bg-red-100 text-red-600 px-6 py-2 rounded-lg font-bold">Reject</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CandidatePortal = () => {
  const { user } = useContext(AuthContext);
  const [vacancies, setVacancies] = useState([]);
  const [myApps, setMyApps] = useState([]);
  const [applyingTo, setApplyingTo] = useState(null);
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/vacancies`).then(res => res.json()).then(d => setVacancies(d.flat()));
    fetch(`${API_BASE}/my-applications?candidate_id=${user.id}`).then(res => res.json()).then(d => setMyApps(d));
  }, []);

  const handleApply = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('candidate_id', user.id);
    formData.append('vacancy_id', applyingTo.id);
    formData.append('resume', file);

    const res = await fetch(`${API_BASE}/applications`, { method: 'POST', body: formData });
    if (res.ok) {
      alert("Application Submitted Successfully!");
      setApplyingTo(null);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <h2 className="text-2xl font-bold mb-6">Open Vacancies</h2>
        <div className="space-y-4">
          {vacancies.map(v => (
            <div key={v.id} className="bg-white p-6 rounded-xl border flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">{v.title}</h3>
                <p className="text-gray-500">ID: {v.short_link}</p>
              </div>
              <button onClick={() => setApplyingTo(v)} className="bg-blue-600 text-white px-6 py-2 rounded-lg">Apply Now</button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-6">My Applications</h2>
        <div className="space-y-4">
          {myApps.map(app => (
            <div key={app.id} className="bg-gray-50 p-4 rounded-lg border">
              <div className="font-bold">{app.vacancy_title || "Job Application"}</div>
              <div className="text-sm text-blue-600 uppercase font-bold mt-1">{app.status || 'Processing'}</div>
            </div>
          ))}
        </div>
      </div>

      {applyingTo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleApply} className="bg-white p-8 rounded-xl w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Apply for {applyingTo.title}</h2>
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Resume (PDF only)</label>
            <input type="file" accept=".pdf" className="w-full mb-6" onChange={e => setFile(e.target.files[0])} required />
            <div className="flex gap-3">
              <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg">Submit</button>
              <button type="button" onClick={() => setApplyingTo(null)} className="flex-1 bg-gray-200 py-2 rounded-lg">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// --- MAIN APP ---

const App = () => {
  const { user } = useContext(AuthContext);
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <Navbar />
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/" element={
          !user ? <AuthPage /> : (user.role === 'recruiter' ? <RecruiterDashboard /> : <CandidatePortal />)
        } />
        <Route path="/vacancy/:id/applications" element={<ApplicationsList />} />
        <Route path="/application/:id/ai" element={<AIDataView />} />
      </Routes>
    </div>
  );
};

export default function Root() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  );
}