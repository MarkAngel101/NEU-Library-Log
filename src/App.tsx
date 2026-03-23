import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './lib/supabase';
import { 
  LogOut, 
  User as UserIcon, 
  Shield, 
  PlusCircle, 
  BarChart3, 
  Users, 
  School, 
  Moon,
  Sun,
  Download,
  Loader2,
  Edit,
  Trash2,
  X,
  Calendar,
  ChevronDown
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
type EmployeeStatus = 'Professor' | 'Staff' | 'Student';

interface VisitorLog {
  id: string;
  name: string;
  college: string;
  reason: string;
  employee_status: EmployeeStatus;
  visit_date: string;
  created_at: string;
}

const COLLEGES = [
  'College of Arts and Sciences',
  'College of Business Administration',
  'College of Computer Studies',
  'College of Education',
  'College of Engineering and Architecture',
  'College of Nursing',
  'College of Criminology',
  'Graduate School'
];

const REASONS = [
  'Research',
  'Study',
  'Borrowing/Returning Books',
  'Internet Access',
  'Meeting',
  'Other'
];

const ADMIN_EMAIL = 'jcesperanza@neu.edu.ph';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<VisitorLog[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasLoggedVisit, setHasLoggedVisit] = useState(false);
  
  // Auth States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  
  // Modals
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<VisitorLog | null>(null);

  // Filters
  const [filterReason, setFilterReason] = useState<string>('All');
  const [filterCollege, setFilterCollege] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [dateFilterType, setDateFilterType] = useState<'today' | 'week' | 'custom'>('today');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: format(startOfWeek(new Date()), 'yyyy-MM-dd'),
    end: format(endOfWeek(new Date()), 'yyyy-MM-dd')
  });

  useEffect(() => {
    // Check session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchLogs();
    }
  }, [user]);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('visitor_logs')
      .select('*')
      .order('visit_date', { ascending: false });

    if (error) {
      console.error('Error fetching logs:', error);
    } else {
      setLogs(data || []);
    }
  };

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) alert(error.message);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: email.split('@')[0],
            }
          }
        });
        if (error) throw error;
        
        if (data.session) {
          // Auto-login successful, onAuthStateChange will handle the redirect
        } else {
          alert('Account created! You can now sign in (if email confirmation is required, please check your inbox first).');
          setIsSignUp(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const submitLog = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    const newLog = {
      name: formData.get('name'),
      college: formData.get('college'),
      reason: formData.get('reason'),
      employee_status: formData.get('employee_status'),
      visit_date: new Date().toISOString(),
    };

    const { error } = await supabase.from('visitor_logs').insert([newLog]);

    if (error) {
      alert('Error saving log: ' + error.message);
    } else {
      setIsLogModalOpen(false);
      setHasLoggedVisit(true);
      fetchLogs();
    }
    setIsSubmitting(false);
  };

  const updateLog = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingLog) return;
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    const updates = {
      name: formData.get('name'),
      college: formData.get('college'),
      reason: formData.get('reason'),
      employee_status: formData.get('employee_status'),
    };

    const { error } = await supabase.from('visitor_logs').update(updates).eq('id', editingLog.id);

    if (error) {
      alert('Error updating log. Note: You may need to add UPDATE policies in Supabase RLS. Details: ' + error.message);
    } else {
      alert('Log updated successfully!');
      setEditingLog(null);
      fetchLogs();
    }
    setIsSubmitting(false);
  };

  const deleteLog = async (id: string) => {
    if (!confirm('Are you sure you want to delete this log?')) return;
    const { error } = await supabase.from('visitor_logs').delete().eq('id', id);
    if (error) {
      alert('Error deleting log. Note: You may need to add DELETE policies in Supabase RLS. Details: ' + error.message);
    } else {
      fetchLogs();
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesReason = filterReason === 'All' || log.reason === filterReason;
      const matchesCollege = filterCollege === 'All' || log.college === filterCollege;
      const matchesStatus = filterStatus === 'All' || log.employee_status === filterStatus;
      
      const logDate = parseISO(log.visit_date);
      let matchesDate = false;
      const now = new Date();

      if (dateFilterType === 'today') {
        matchesDate = isWithinInterval(logDate, { start: startOfDay(now), end: endOfDay(now) });
      } else if (dateFilterType === 'week') {
        matchesDate = isWithinInterval(logDate, { start: startOfWeek(now), end: endOfWeek(now) });
      } else {
        matchesDate = isWithinInterval(logDate, {
          start: startOfDay(parseISO(dateRange.start)),
          end: endOfDay(parseISO(dateRange.end))
        });
      }

      return matchesReason && matchesCollege && matchesStatus && matchesDate;
    });
  }, [logs, filterReason, filterCollege, filterStatus, dateRange, dateFilterType]);

  const stats = useMemo(() => {
    const total = filteredLogs.length;
    const byCollege = COLLEGES.map(college => ({
      name: college,
      value: filteredLogs.filter(l => l.college === college).length
    })).filter(c => c.value > 0);

    const byReason = REASONS.map(reason => ({
      name: reason,
      value: filteredLogs.filter(l => l.reason === reason).length
    })).filter(r => r.value > 0);

    const byStatus = {
      Professor: filteredLogs.filter(l => l.employee_status === 'Professor').length,
      Staff: filteredLogs.filter(l => l.employee_status === 'Staff').length,
      Student: filteredLogs.filter(l => l.employee_status === 'Student').length,
    };

    return { total, byCollege, byReason, byStatus };
  }, [filteredLogs]);

  const exportCSV = () => {
    const headers = ['Name', 'College', 'Reason', 'Status', 'Date'];
    const rows = filteredLogs.map(l => [
      l.name,
      l.college,
      l.reason,
      l.employee_status,
      format(parseISO(l.visit_date), 'yyyy-MM-dd HH:mm')
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `visitor_logs_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={cn("min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-500", darkMode ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900")}>
        <div className={cn("w-full max-w-md p-10 rounded-[2.5rem] shadow-2xl border transition-colors duration-500", darkMode ? "bg-slate-900/80 border-slate-800 backdrop-blur-xl" : "bg-white border-slate-100")}>
          <div className="flex flex-col items-center mb-10">
            <div className="w-24 h-24 bg-white rounded-[1.5rem] flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20 transform hover:scale-105 transition-transform duration-300 overflow-hidden border border-slate-100 dark:border-slate-800">
              <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQNBBXhSu53Go1-ZkzM3nQc2eUzl7vrZ3HyAA&s" alt="NEU Logo" className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
            </div>
            <h1 className="text-3xl font-extrabold text-center tracking-tight">NEU Library Visitor Log</h1>
          </div>
          
          <form onSubmit={handleEmailAuth} className="w-full space-y-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Email</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className={cn("w-full px-4 py-3 rounded-xl border font-medium transition-all focus:ring-2 focus:ring-indigo-500/50 outline-none", 
                  darkMode ? "bg-slate-800/50 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Password</label>
              <input 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className={cn("w-full px-4 py-3 rounded-xl border font-medium transition-all focus:ring-2 focus:ring-indigo-500/50 outline-none", 
                  darkMode ? "bg-slate-800/50 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white")}
              />
            </div>
            <button 
              type="submit"
              disabled={authLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isSignUp ? 'Sign Up' : 'Sign In')}
            </button>
          </form>
          
          <div className="text-center mb-6">
            <button 
              type="button" 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
            </button>
          </div>
          
          <div className="relative flex items-center py-2 mb-6">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-medium uppercase tracking-wider">Or continue with</span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
          </div>
          
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 font-semibold py-3.5 px-4 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-300 shadow-sm hover:shadow active:scale-[0.98] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Sign in with Google
          </button>
          
          <div className="mt-10 pt-6 border-t border-slate-200/60 dark:border-slate-800/60 text-center">
            <p className="text-sm font-medium text-slate-400">
              Authorized access only. Use your institutional email.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (user && !hasLoggedVisit) {
    return (
      <div className={cn("min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-500", darkMode ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900")}>
        <div className="absolute top-4 right-4 flex items-center gap-4">
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className={cn("p-2.5 rounded-xl transition-all duration-300", darkMode ? "hover:bg-slate-800 text-yellow-400" : "hover:bg-slate-200 text-slate-500 hover:text-slate-700")}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button 
            onClick={handleLogout}
            className={cn("p-2.5 rounded-xl transition-all duration-300", darkMode ? "hover:bg-slate-800 text-slate-400 hover:text-red-400" : "hover:bg-slate-200 text-slate-500 hover:text-red-600")}
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        
        <div className={cn("w-full max-w-md p-10 rounded-[2.5rem] shadow-2xl border transition-colors duration-500", darkMode ? "bg-slate-900/80 border-slate-800 backdrop-blur-xl" : "bg-white border-slate-100")}>
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20 overflow-hidden border border-slate-100 dark:border-slate-800">
              <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQNBBXhSu53Go1-ZkzM3nQc2eUzl7vrZ3HyAA&s" alt="NEU Logo" className="w-full h-full object-contain p-1.5" referrerPolicy="no-referrer" />
            </div>
            <h2 className="text-2xl font-extrabold text-center tracking-tight">Log Your Visit</h2>
            <p className={cn("text-center mt-2 font-medium text-sm", darkMode ? "text-slate-400" : "text-slate-500")}>Please record your visit before continuing.</p>
          </div>
          
          <form onSubmit={submitLog} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-bold ml-1">Full Name</label>
              <input 
                type="text" 
                name="name" 
                required 
                defaultValue={user.user_metadata?.full_name || ''}
                className={cn("w-full px-4 py-3 rounded-xl border font-medium transition-all focus:ring-2 focus:ring-indigo-500/50 outline-none", darkMode ? "bg-slate-800/50 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white")}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold ml-1">College</label>
              <select 
                name="college" 
                required 
                className={cn("w-full px-4 py-3 rounded-xl border font-medium transition-all focus:ring-2 focus:ring-indigo-500/50 outline-none appearance-none", darkMode ? "bg-slate-800/50 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white")}
              >
                <option value="">Select College</option>
                {COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold ml-1">Visitor Type</label>
              <select 
                name="employee_status" 
                required 
                className={cn("w-full px-4 py-3 rounded-xl border font-medium transition-all focus:ring-2 focus:ring-indigo-500/50 outline-none appearance-none", darkMode ? "bg-slate-800/50 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white")}
              >
                <option value="">Select Type</option>
                <option value="Student">Student</option>
                <option value="Professor">Professor</option>
                <option value="Staff">Staff/Employee</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold ml-1">Reason for Visit</label>
              <select 
                name="reason" 
                required 
                className={cn("w-full px-4 py-3 rounded-xl border font-medium transition-all focus:ring-2 focus:ring-indigo-500/50 outline-none appearance-none", darkMode ? "bg-slate-800/50 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white")}
              >
                <option value="">Select Reason</option>
                {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit & Continue'}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <button 
              onClick={() => setHasLoggedVisit(true)} 
              className="text-sm font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              Skip to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = user.email === ADMIN_EMAIL;

  return (
    <div className={cn("min-h-screen transition-colors duration-500 font-sans", darkMode ? "bg-[#0B1120] text-slate-100" : "bg-[#F8FAFC] text-slate-900")}>
      {/* Header */}
      <header className={cn("sticky top-0 z-50 border-b backdrop-blur-xl transition-colors duration-500", darkMode ? "bg-[#0B1120]/80 border-slate-800/50" : "bg-white/80 border-slate-200/60")}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/10 overflow-hidden border border-slate-100 dark:border-slate-800">
              <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQNBBXhSu53Go1-ZkzM3nQc2eUzl7vrZ3HyAA&s" alt="NEU Logo" className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
            </div>
            <span className="font-extrabold text-xl tracking-tight hidden sm:inline">NEU Library</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-5">
            <button 
              onClick={() => setIsLogModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Log Visit</span>
            </button>

            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={cn("p-2.5 rounded-xl transition-all duration-300", darkMode ? "hover:bg-slate-800 text-yellow-400" : "hover:bg-slate-100 text-slate-500 hover:text-slate-700")}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-4 pl-2 sm:pl-4 border-l border-slate-200 dark:border-slate-800">
              <div className="hidden md:block text-right">
                <p className="text-sm font-bold leading-none tracking-tight">{user.user_metadata?.full_name || 'User'}</p>
                <p className="text-xs font-medium text-slate-500 mt-1.5">{user.email}</p>
              </div>
              <button 
                onClick={handleLogout}
                className={cn("p-2.5 rounded-xl transition-all duration-300 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20")}
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="space-y-10">
          
          {/* Hero / Greeting Section */}
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-10 md:p-14 text-white shadow-xl shadow-indigo-500/10">
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">Welcome to NEU Library!</h2>
              <p className="text-indigo-100/90 max-w-2xl text-lg font-medium leading-relaxed">
                {isAdmin 
                  ? "You have full access to manage visitor statistics, export data, and edit records." 
                  : "View real-time library visitor statistics, trends, and daily activity below."}
              </p>
            </div>
            <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4 pointer-events-none grayscale">
              <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQNBBXhSu53Go1-ZkzM3nQc2eUzl7vrZ3HyAA&s" alt="NEU Logo" className="w-96 h-96 object-contain" referrerPolicy="no-referrer" />
            </div>
          </div>

          {/* Controls Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h3 className="text-2xl font-extrabold tracking-tight">Visitor Statistics</h3>
              <p className={cn("mt-1.5 font-medium", darkMode ? "text-slate-400" : "text-slate-500")}>Filter and analyze library visits.</p>
            </div>
            {isAdmin && (
              <button 
                onClick={exportCSV}
                className={cn("flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 shadow-sm hover:shadow-md", 
                  darkMode ? "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700" : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200")}
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            )}
          </div>

          {/* Filters Panel */}
          <div className={cn("p-6 rounded-[2rem] border transition-all duration-500 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6", 
            darkMode ? "bg-slate-900/50 border-slate-800/80 backdrop-blur-xl" : "bg-white border-slate-200/60 shadow-sm")}>
            
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Date Range</label>
              <div className={cn("flex p-1 rounded-xl", darkMode ? "bg-slate-800/50" : "bg-slate-100")}>
                <button 
                  onClick={() => setDateFilterType('today')}
                  className={cn("flex-1 text-xs py-2 rounded-lg font-bold transition-all duration-300", 
                    dateFilterType === 'today' ? (darkMode ? "bg-slate-700 text-white shadow-sm" : "bg-white text-indigo-600 shadow-sm") : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}
                >
                  Today
                </button>
                <button 
                  onClick={() => setDateFilterType('week')}
                  className={cn("flex-1 text-xs py-2 rounded-lg font-bold transition-all duration-300", 
                    dateFilterType === 'week' ? (darkMode ? "bg-slate-700 text-white shadow-sm" : "bg-white text-indigo-600 shadow-sm") : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}
                >
                  This Week
                </button>
                <button 
                  onClick={() => setDateFilterType('custom')}
                  className={cn("flex-1 text-xs py-2 rounded-lg font-bold transition-all duration-300", 
                    dateFilterType === 'custom' ? (darkMode ? "bg-slate-700 text-white shadow-sm" : "bg-white text-indigo-600 shadow-sm") : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}
                >
                  Custom
                </button>
              </div>
              {dateFilterType === 'custom' && (
                <div className="flex items-center gap-2 mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <input 
                    type="date" 
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className={cn("w-full px-3 py-2 rounded-xl border text-sm font-medium transition-colors outline-none focus:ring-2 focus:ring-indigo-500/50", darkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200")}
                  />
                  <span className="text-slate-400 font-medium">-</span>
                  <input 
                    type="date" 
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className={cn("w-full px-3 py-2 rounded-xl border text-sm font-medium transition-colors outline-none focus:ring-2 focus:ring-indigo-500/50", darkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200")}
                  />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Visitor Type</label>
              <div className="relative">
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className={cn("w-full px-4 py-2.5 rounded-xl border text-sm font-medium transition-all focus:ring-2 focus:ring-indigo-500/50 outline-none appearance-none", 
                    darkMode ? "bg-slate-800/50 border-slate-700 hover:bg-slate-800" : "bg-slate-50 border-slate-200 hover:bg-slate-100")}
                >
                  <option value="All">All Types</option>
                  <option value="Student">Students</option>
                  <option value="Professor">Professors</option>
                  <option value="Staff">Staff/Employees</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Reason</label>
              <div className="relative">
                <select 
                  value={filterReason}
                  onChange={(e) => setFilterReason(e.target.value)}
                  className={cn("w-full px-4 py-2.5 rounded-xl border text-sm font-medium transition-all focus:ring-2 focus:ring-indigo-500/50 outline-none appearance-none", 
                    darkMode ? "bg-slate-800/50 border-slate-700 hover:bg-slate-800" : "bg-slate-50 border-slate-200 hover:bg-slate-100")}
                >
                  <option value="All">All Reasons</option>
                  {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">College</label>
              <div className="relative">
                <select 
                  value={filterCollege}
                  onChange={(e) => setFilterCollege(e.target.value)}
                  className={cn("w-full px-4 py-2.5 rounded-xl border text-sm font-medium transition-all focus:ring-2 focus:ring-indigo-500/50 outline-none appearance-none", 
                    darkMode ? "bg-slate-800/50 border-slate-700 hover:bg-slate-800" : "bg-slate-50 border-slate-200 hover:bg-slate-100")}
                >
                  <option value="All">All Colleges</option>
                  {COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className={cn("p-6 rounded-[2rem] border transition-all duration-300 hover:shadow-lg hover:-translate-y-1", darkMode ? "bg-slate-900/50 border-slate-800/80" : "bg-white border-slate-200/60 shadow-sm")}>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Users className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full">Total</span>
              </div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Total Visitors</p>
              <h3 className="text-4xl font-extrabold mt-2 tracking-tight">{stats.total}</h3>
            </div>

            <div className={cn("p-6 rounded-[2rem] border transition-all duration-300 hover:shadow-lg hover:-translate-y-1", darkMode ? "bg-slate-900/50 border-slate-800/80" : "bg-white border-slate-200/60 shadow-sm")}>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <School className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/10 px-3 py-1.5 rounded-full">Academic</span>
              </div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Colleges Represented</p>
              <h3 className="text-4xl font-extrabold mt-2 tracking-tight">{stats.byCollege.length}</h3>
            </div>

            <div className={cn("p-6 rounded-[2rem] border transition-all duration-300 hover:shadow-lg hover:-translate-y-1", darkMode ? "bg-slate-900/50 border-slate-800/80" : "bg-white border-slate-200/60 shadow-sm")}>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/10 px-3 py-1.5 rounded-full">Activity</span>
              </div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Top Reason</p>
              <h3 className="text-2xl font-extrabold mt-2 tracking-tight truncate">
                {stats.byReason.sort((a, b) => b.value - a.value)[0]?.name || 'N/A'}
              </h3>
            </div>

            <div className={cn("p-6 rounded-[2rem] border transition-all duration-300 hover:shadow-lg hover:-translate-y-1", darkMode ? "bg-slate-900/50 border-slate-800/80" : "bg-white border-slate-200/60 shadow-sm")}>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400">
                  <UserIcon className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-500/10 px-3 py-1.5 rounded-full">Staff/Faculty</span>
              </div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Employees</p>
              <h3 className="text-4xl font-extrabold mt-2 tracking-tight">{stats.byStatus.Professor + stats.byStatus.Staff}</h3>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className={cn("p-8 rounded-[2rem] border transition-all duration-500", darkMode ? "bg-slate-900/50 border-slate-800/80" : "bg-white border-slate-200/60 shadow-sm")}>
              <h4 className="text-xl font-extrabold mb-8 tracking-tight">Visitors by College</h4>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.byCollege} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={darkMode ? "#334155" : "#f1f5f9"} />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={160} 
                      tick={{ fontSize: 11, fill: darkMode ? "#94a3b8" : "#64748b", fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      cursor={{ fill: darkMode ? '#1e293b' : '#f8fafc' }}
                      contentStyle={{ 
                        backgroundColor: darkMode ? "#0f172a" : "#fff", 
                        borderColor: darkMode ? "#334155" : "#e2e8f0",
                        color: darkMode ? "#f1f5f9" : "#0f172a",
                        borderRadius: '1rem',
                        fontWeight: 600,
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                      }} 
                    />
                    <Bar dataKey="value" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={cn("p-8 rounded-[2rem] border transition-all duration-500", darkMode ? "bg-slate-900/50 border-slate-800/80" : "bg-white border-slate-200/60 shadow-sm")}>
              <h4 className="text-xl font-extrabold mb-8 tracking-tight">Visitor Types</h4>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Students', value: stats.byStatus.Student },
                        { name: 'Professors', value: stats.byStatus.Professor },
                        { name: 'Staff', value: stats.byStatus.Staff },
                      ].filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill="#6366f1" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#10b981" />
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: darkMode ? "#0f172a" : "#fff", 
                        borderColor: darkMode ? "#334155" : "#e2e8f0",
                        color: darkMode ? "#f1f5f9" : "#0f172a",
                        borderRadius: '1rem',
                        fontWeight: 600,
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                      }} 
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontWeight: 600, fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recent Logs Table */}
          <div className={cn("rounded-[2rem] border overflow-hidden transition-all duration-500", darkMode ? "bg-slate-900/50 border-slate-800/80" : "bg-white border-slate-200/60 shadow-sm")}>
            <div className="p-6 md:p-8 border-b border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h4 className="text-xl font-extrabold tracking-tight">Recent Visitor Logs</h4>
              <span className={cn("text-xs font-bold px-3 py-1.5 rounded-lg", darkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500")}>
                {filteredLogs.length} entries shown
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={cn("text-xs font-extrabold uppercase tracking-wider", darkMode ? "bg-slate-800/30 text-slate-400" : "bg-slate-50/50 text-slate-500")}>
                    <th className="px-8 py-5">Visitor</th>
                    <th className="px-8 py-5">College</th>
                    <th className="px-8 py-5">Reason</th>
                    <th className="px-8 py-5">Type</th>
                    <th className="px-8 py-5">Date & Time</th>
                    {isAdmin && <th className="px-8 py-5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                  {filteredLogs.slice(0, 50).map((log) => (
                    <tr key={log.id} className={cn("text-sm transition-colors duration-200", darkMode ? "hover:bg-slate-800/40" : "hover:bg-slate-50/80")}>
                      <td className="px-8 py-5 font-bold">{log.name}</td>
                      <td className="px-8 py-5 text-slate-500 dark:text-slate-400 font-medium">{log.college}</td>
                      <td className="px-8 py-5">
                        <span className={cn("px-3 py-1.5 rounded-lg text-xs font-bold", 
                          darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600")}>
                          {log.reason}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={cn("px-3 py-1.5 rounded-lg text-xs font-bold", 
                          log.employee_status === 'Student' ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400" : 
                          "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400")}>
                          {log.employee_status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-slate-500 dark:text-slate-400 font-medium">
                        {format(parseISO(log.visit_date), 'MMM dd, yyyy HH:mm')}
                      </td>
                      {isAdmin && (
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setEditingLog(log)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-colors"
                              title="Edit Log"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => deleteLog(log.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                              title="Delete Log"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin ? 6 : 5} className="px-8 py-16 text-center text-slate-500 font-medium">
                        No visitor logs found for the selected criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Log Visit Modal */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
          <div className={cn("w-full max-w-md p-8 rounded-[2rem] shadow-2xl border animate-in zoom-in-95 duration-200", darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100")}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-extrabold tracking-tight">Log Library Visit</h3>
              <button onClick={() => setIsLogModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={submitLog} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Full Name</label>
                <input 
                  required
                  name="name"
                  type="text"
                  defaultValue={user.user_metadata?.full_name || ''}
                  placeholder="Enter your full name"
                  className={cn("w-full px-4 py-3 rounded-xl border font-medium transition-all focus:ring-2 focus:ring-indigo-500/50 outline-none", 
                    darkMode ? "bg-slate-800/50 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white")}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">College</label>
                <div className="relative">
                  <select 
                    required
                    name="college"
                    className={cn("w-full px-4 py-3 rounded-xl border font-medium transition-all focus:ring-2 focus:ring-indigo-500/50 outline-none appearance-none", 
                      darkMode ? "bg-slate-800/50 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white")}
                  >
                    <option value="">Select College</option>
                    {COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Visitor Type</label>
                <div className="relative">
                  <select 
                    required
                    name="employee_status"
                    className={cn("w-full px-4 py-3 rounded-xl border font-medium transition-all focus:ring-2 focus:ring-indigo-500/50 outline-none appearance-none", 
                      darkMode ? "bg-slate-800/50 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white")}
                  >
                    <option value="Student">Student</option>
                    <option value="Professor">Professor</option>
                    <option value="Staff">Staff</option>
                  </select>
                  <ChevronDown className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Reason for Visiting</label>
                <div className="relative">
                  <select 
                    required
                    name="reason"
                    className={cn("w-full px-4 py-3 rounded-xl border font-medium transition-all focus:ring-2 focus:ring-indigo-500/50 outline-none appearance-none", 
                      darkMode ? "bg-slate-800/50 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white")}
                  >
                    <option value="">Select Reason</option>
                    {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <ChevronDown className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <button 
                disabled={isSubmitting}
                type="submit"
                className="w-full mt-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlusCircle className="w-5 h-5" />}
                Submit Log
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Log Modal (Admin Only) */}
      {editingLog && isAdmin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
          <div className={cn("w-full max-w-md p-8 rounded-[2rem] shadow-2xl border animate-in zoom-in-95 duration-200", darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100")}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-extrabold tracking-tight">Edit Visitor Log</h3>
              <button onClick={() => setEditingLog(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={updateLog} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Full Name</label>
                <input 
                  required
                  name="name"
                  type="text"
                  defaultValue={editingLog.name}
                  className={cn("w-full px-4 py-3 rounded-xl border font-medium transition-all focus:ring-2 focus:ring-indigo-500/50 outline-none", 
                    darkMode ? "bg-slate-800/50 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white")}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">College</label>
                <div className="relative">
                  <select 
                    required
                    name="college"
                    defaultValue={editingLog.college}
                    className={cn("w-full px-4 py-3 rounded-xl border font-medium transition-all focus:ring-2 focus:ring-indigo-500/50 outline-none appearance-none", 
                      darkMode ? "bg-slate-800/50 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white")}
                  >
                    {COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Visitor Type</label>
                <div className="relative">
                  <select 
                    required
                    name="employee_status"
                    defaultValue={editingLog.employee_status}
                    className={cn("w-full px-4 py-3 rounded-xl border font-medium transition-all focus:ring-2 focus:ring-indigo-500/50 outline-none appearance-none", 
                      darkMode ? "bg-slate-800/50 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white")}
                  >
                    <option value="Student">Student</option>
                    <option value="Professor">Professor</option>
                    <option value="Staff">Staff</option>
                  </select>
                  <ChevronDown className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Reason for Visiting</label>
                <div className="relative">
                  <select 
                    required
                    name="reason"
                    defaultValue={editingLog.reason}
                    className={cn("w-full px-4 py-3 rounded-xl border font-medium transition-all focus:ring-2 focus:ring-indigo-500/50 outline-none appearance-none", 
                      darkMode ? "bg-slate-800/50 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white")}
                  >
                    {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <ChevronDown className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <button 
                disabled={isSubmitting}
                type="submit"
                className="w-full mt-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Edit className="w-5 h-5" />}
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      <footer className={cn("mt-auto py-10 border-t transition-colors duration-500", darkMode ? "bg-[#0B1120] border-slate-800/50 text-slate-500" : "bg-white border-slate-200/60 text-slate-400")}>
        <div className="max-w-7xl mx-auto px-4 text-center text-sm font-medium">
          <p>© {new Date().getFullYear()} NEU Library Visitor Log. All rights reserved.</p>
          <p className="mt-2 text-xs opacity-80">Designed for security, scalability, and ease of use.</p>
        </div>
      </footer>
    </div>
  );
}
