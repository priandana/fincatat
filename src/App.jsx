import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  signInWithCustomToken
} from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { 
  Wallet, User, TrendingDown, TrendingUp, CreditCard, Receipt, 
  PieChart, BarChart3, PiggyBank, Tags, Home, History, Settings,
  ArrowLeft, PlusCircle, CheckCircle2, AlertCircle, Landmark, Phone,
  Send, Calendar, Shield, Plane, Target, Plus, Loader2, ChevronDown, 
  Lock, Delete, X, MessageCircle, Mail, FileQuestion, Trash2, Edit3, Filter,
  Eye, EyeOff, Edit, LogOut, LogIn, KeyRound, UserPlus
} from 'lucide-react';

// --- FIREBASE INITIALIZATION ---
// PENTING: Saat di komputer lokal (Vercel), ganti isi firebaseConfig ini dengan milik Anda!
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "ISI_API_KEY_ANDA",
  authDomain: "ISI_DOMAIN_ANDA",
  projectId: "ISI_PROJECT_ID_ANDA",
  storageBucket: "ISI_STORAGE_BUCKET_ANDA",
  messagingSenderId: "ISI_SENDER_ID_ANDA",
  appId: "ISI_APP_ID_ANDA"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// TIPS: Ganti 'fincatat-app-prod' dengan nama bebas agar ID database Anda tidak berubah-ubah di Vercel
const appId = typeof __app_id !== 'undefined' ? __app_id : 'fincatat-app-prod';

const DEFAULT_DATA = {
  pin: null, 
  profile: { name: '' },
  showBalance: true,
  transactions: [],
  bills: [],
  savingsGoals: [],
  categories: {
    in: ['Gaji', 'Bonus', 'Investasi', 'Hadiah', 'Lainnya'],
    out: ['Kebutuhan', 'Transport', 'Tagihan', 'Makan', 'Hiburan', 'Transfer', 'Lainnya']
  },
  budgetLimits: {},
  bankAccounts: []
};

const App = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [appData, setAppData] = useState(null);
  const [activeScreen, setActiveScreen] = useState('home'); 
  
  // Auth & UI States
  const [authMode, setAuthMode] = useState('login'); 
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinSetupStep, setPinSetupStep] = useState(0); 
  const [tempPin, setTempPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDanger: false });
  const [greeting, setGreeting] = useState('');
  
  // Forms States
  const [formData, setFormData] = useState({ amount: '', title: '', category: 'Lainnya' });
  const [transferData, setTransferData] = useState({ bank: 'BCA', account: '', amount: '', note: '' });
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [newCategoryData, setNewCategoryData] = useState({ type: 'out', name: '', isAdding: false });
  const [newBillData, setNewBillData] = useState({ isAdding: false, name: '', amount: '', dueDate: '' });
  const [newSavingsData, setNewSavingsData] = useState({ isAdding: false, name: '', target: '', iconName: 'target' });
  const [newBankData, setNewBankData] = useState({ isAdding: false, bank: 'BCA', accountName: '', accountNumber: '' });
  const [historyFilter, setHistoryFilter] = useState('all');
  const [editProfileModal, setEditProfileModal] = useState({ isOpen: false, name: '' });
  const [editBudgetModal, setEditBudgetModal] = useState({ isOpen: false, category: '', limit: '' });

  // --- LOGIC AUTH & DATA ---
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        try { await signInWithCustomToken(auth, __initial_auth_token); } catch (e) {}
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); if (!u) { setIsLoading(false); setIsUnlocked(false); } });
    const hr = new Date().getHours();
    setGreeting(hr < 11 ? 'Selamat Pagi,' : hr < 15 ? 'Selamat Siang,' : hr < 18 ? 'Selamat Sore,' : 'Selamat Malam,');
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'finances', 'mainData');
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setAppData(data);
        if (!data.pin) setPinSetupStep(1); 
      } else {
        const init = { ...DEFAULT_DATA, profile: { name: authForm.name || 'Pengguna Baru' } };
        setDoc(docRef, init); setAppData(init); setPinSetupStep(1);
      }
      setIsLoading(false);
    }, (err) => { console.error(err); setIsLoading(false); });
    return () => unsubscribe();
  }, [user]);

  const handleAuth = async (e) => {
    e.preventDefault(); setIsSubmitting(true); setAuthError('');
    try {
      if (authMode === 'register') await createUserWithEmailAndPassword(auth, authForm.email, authForm.password);
      else await signInWithEmailAndPassword(auth, authForm.email, authForm.password);
    } catch (err) { setAuthError(err.code === 'auth/invalid-credential' ? 'Email/Password salah' : 'Gagal masuk. Cek koneksi.'); }
    finally { setIsSubmitting(false); }
  };

  const handleLogout = async () => { await signOut(auth); setActiveScreen('home'); setAuthForm({ email:'', password:'', name:'' }); };

  const updateFirestore = async (fields) => {
    if (!user) return;
    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'finances', 'mainData');
    try { await setDoc(docRef, fields, { merge: true }); } catch (e) { console.error(e); }
  };

  // --- PIN LOGIC ---
  const handlePinInput = (num) => {
    if (enteredPin.length < 6) {
      const p = enteredPin + num; setEnteredPin(p);
      if (p.length === 6) setTimeout(() => {
        if (pinSetupStep === 0) {
          if (p === appData.pin) { setIsUnlocked(true); setEnteredPin(''); }
          else { setPinError(true); setTimeout(() => { setPinError(false); setEnteredPin(''); }, 500); }
        } else if (pinSetupStep === 1) { setTempPin(p); setEnteredPin(''); setPinSetupStep(2); }
        else if (pinSetupStep === 2) {
          if (p === tempPin) { updateFirestore({ pin: p }); setIsUnlocked(true); setPinSetupStep(0); setEnteredPin(''); }
          else { setPinError(true); setTimeout(() => { setPinError(false); setEnteredPin(''); setTempPin(''); setPinSetupStep(1); }, 500); }
        }
      }, 200);
    }
  };

  // --- ACTIONS ---
  const formatIDR = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);
  const triggerSuccess = (m, s = 'home') => { setSuccessMsg(m); setShowSuccess(true); setTimeout(() => { setShowSuccess(false); if(s) setActiveScreen(s); }, 1500); };

  const handleSaveTx = async (type) => {
    if (!formData.amount || !formData.title) return;
    setIsSubmitting(true);
    const nt = { id: Date.now(), type, amount: parseInt(formData.amount), title: formData.title, category: formData.category, date: new Date().toISOString().split('T')[0] };
    await updateFirestore({ transactions: [nt, ...(appData?.transactions || [])] });
    setFormData({ amount: '', title: '', category: appData?.categories[type][0] || 'Lainnya' });
    setIsSubmitting(false); triggerSuccess('Tersimpan!');
  };

  const handlePayBill = async (bill) => {
    setIsSubmitting(true);
    const nt = { id: Date.now(), type: 'out', amount: bill.amount, title: `Bayar: ${bill.name}`, category: 'Tagihan', date: new Date().toISOString().split('T')[0] };
    const ub = appData.bills.map(b => b.id === bill.id ? { ...b, isPaid: true } : b);
    await updateFirestore({ transactions: [nt, ...appData.transactions], bills: ub });
    setIsSubmitting(false); triggerSuccess('Berhasil Bayar!', 'bills');
  };

  // --- SUB-COMPONENTS ---
  const PageHeader = ({ title }) => (
    <div className="flex items-center gap-4 text-white mb-8 pt-4 sticky top-0 z-20 animate-slide-right">
      <button onClick={() => setActiveScreen('home')} className="p-2 bg-white/20 rounded-xl backdrop-blur-sm hover:bg-white/30 transition-all"><ArrowLeft size={24} /></button>
      <h1 className="text-xl font-bold tracking-wide">{title}</h1>
    </div>
  );

  // --- RENDER SCREENS ---
  const renderAuth = () => (
    <div className="min-h-screen w-full bg-[#f2f6fa] flex items-center justify-center p-4 font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-[#20b2aa]/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/80 backdrop-blur-2xl rounded-[45px] p-8 shadow-2xl border border-white/50 animate-fade-in-up">
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-br from-[#20b2aa] to-[#147a75] rounded-3xl flex items-center justify-center mb-5 shadow-lg shadow-[#20b2aa]/30"><Wallet size={36} className="text-white" /></div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">FinCatat <span className="text-[#20b2aa]">PRO</span></h1>
            <p className="text-slate-400 text-sm font-medium mt-1">{authMode === 'login' ? 'Kelola uang jadi lebih asyik' : 'Mulai hemat hari ini'}</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-5">
            {authMode === 'register' && (
              <div className="relative"><User className="absolute left-4 top-4 text-slate-300"/><input type="text" required placeholder="Nama Lengkap" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} className="w-full bg-[#f8fafc] rounded-2xl py-4 pl-12 pr-5 outline-none focus:border-[#20b2aa] border-2 border-transparent transition-all" /></div>
            )}
            <div className="relative"><Mail className="absolute left-4 top-4 text-slate-300"/><input type="email" required placeholder="Email Anda" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full bg-[#f8fafc] rounded-2xl py-4 pl-12 pr-5 outline-none focus:border-[#20b2aa] border-2 border-transparent transition-all" /></div>
            <div className="relative"><KeyRound className="absolute left-4 top-4 text-slate-300"/><input type={showPassword ? "text" : "password"} required placeholder="Kata Sandi" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full bg-[#f8fafc] rounded-2xl py-4 pl-12 pr-12 outline-none focus:border-[#20b2aa] border-2 border-transparent transition-all" /><button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-4 top-4 text-slate-300">{showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}</button></div>
            {authError && <div className="text-red-500 text-xs font-bold px-2 animate-shake">{authError}</div>}
            <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-[#20b2aa] hover:bg-[#1b9a94] text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">{isSubmitting ? <Loader2 className="animate-spin" /> : (authMode === 'login' ? 'Masuk' : 'Daftar')}</button>
          </form>
          <div className="mt-10 text-center"><p className="text-slate-400 text-sm">{authMode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}</p><button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="mt-2 text-[#20b2aa] font-black text-lg">{authMode === 'login' ? 'Daftar Gratis' : 'Login Sekarang'}</button></div>
        </div>
      </div>
    </div>
  );

  const renderHome = () => (
    <div className="relative z-10 px-5 pt-12 pb-24">
      <div className="flex justify-between items-center text-white mb-10 animate-fade-in-up">
        <div className="flex items-center gap-3"><Wallet size={28} className="text-white" /><div className="leading-tight"><p className="text-[10px] uppercase font-bold opacity-80">{greeting}</p><h1 className="text-lg font-black">{appData?.profile?.name || 'Pengguna'}</h1></div></div>
        <div onClick={() => setActiveScreen('settings')} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 cursor-pointer shadow-lg hover:scale-110 transition-all"><User size={20} /></div>
      </div>
      <div className="bg-white/95 backdrop-blur-sm rounded-[32px] p-6 shadow-xl mb-6 flex justify-between items-center animate-fade-in-up">
        <div><span className="text-[10px] font-bold text-[#20b2aa] bg-[#e0f7f6] px-2 py-1 rounded-md uppercase tracking-wider">Saldo Tersedia</span><div className="flex items-center gap-3 mt-2"><h2 className="text-3xl font-black text-slate-800">{appData?.showBalance ? formatIDR((appData?.transactions?.filter(t=>t.type==='in').reduce((a,c)=>a+c.amount,0)) - (appData?.transactions?.filter(t=>t.type==='out').reduce((a,c)=>a+c.amount,0))) : 'Rp ••••••••'}</h2><button onClick={() => updateFirestore({showBalance: !appData?.showBalance})}>{appData?.showBalance ? <EyeOff size={18} className="text-slate-300"/> : <Eye size={18} className="text-slate-300"/>}</button></div><p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Akun Cloud Aktif</p></div>
        <div className="w-14 h-14 rounded-full bg-[#e0f7f6] flex items-center justify-center shadow-inner"><Wallet size={28} className="text-[#20b2aa]" fill="currentColor" /></div>
      </div>
      <div className="grid grid-cols-4 gap-y-6 gap-x-2 animate-fade-in-up">
        {[
          { icon: <TrendingUp size={24} className="text-emerald-500" />, label: "MASUK", action: 'form_in' },
          { icon: <TrendingDown size={24} className="text-red-500" />, label: "KELUAR", action: 'form_out' },
          { icon: <Send size={24} className="text-blue-500" />, label: "TRANSFER", action: 'transfer' },
          { icon: <Receipt size={24} className="text-orange-400" />, label: "TAGIHAN", action: 'bills' },
          { icon: <PieChart size={24} className="text-purple-500" />, label: "ANGGARAN", action: 'budget' },
          { icon: <PiggyBank size={24} className="text-pink-400" />, label: "TABUNGAN", action: 'savings' },
          { icon: <BarChart3 size={24} className="text-teal-500" />, label: "LAPORAN", action: 'stats' },
          { icon: <Tags size={24} className="text-slate-500" />, label: "KATEGORI", action: 'categories' }
        ].map((item, i) => (
          <div key={i} onClick={() => setActiveScreen(item.action)} className="flex flex-col items-center gap-3 cursor-pointer group animate-pop-in" style={{ animationDelay: `${350 + i * 50}ms` }}>
            <div className="w-[70px] h-[70px] rounded-[24px] bg-white shadow-md flex items-center justify-center transition-all group-hover:scale-110 active:scale-90">{item.icon}</div>
            <span className="text-[9px] font-black text-slate-500 uppercase text-center">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // --- MAIN APP WRAPPER ---
  if (isLoading) return <div className="min-h-screen bg-[#f2f6fa] flex flex-col items-center justify-center gap-4 text-[#20b2aa]"><Loader2 className="animate-spin" size={48} /><p className="font-black text-xs animate-pulse uppercase tracking-widest">Sinkronisasi Cloud...</p></div>;
  if (!user) return renderAuth();
  
  if (!isUnlocked) {
    const title = pinSetupStep === 1 ? "Buat PIN Baru" : pinSetupStep === 2 ? "Konfirmasi PIN" : "Masukkan PIN";
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#20b2aa] to-[#147a75] flex items-center justify-center p-8 text-white">
        <div className="w-full max-w-sm flex flex-col items-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-6 backdrop-blur-md border border-white/30 shadow-xl"><Lock size={32} /></div>
          <h1 className="text-2xl font-black mb-10 text-center">{title}</h1>
          <div className={`flex gap-4 mb-12 ${pinError ? 'animate-shake' : ''}`}>
            {[...Array(6)].map((_, i) => (<div key={i} className={`w-4 h-4 rounded-full transition-all duration-300 ${i < enteredPin.length ? 'bg-white scale-150 shadow-[0_0_15px_white]' : 'bg-white/30'}`} />))}
          </div>
          <div className="grid grid-cols-3 gap-x-8 gap-y-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0].map((n, i) => (
              n === '' ? <div key={i}/> : <button key={i} onClick={() => handlePinInput(n.toString())} className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-2xl font-bold active:scale-90 border border-white/5">{n}</button>
            ))}
            <button onClick={() => setEnteredPin(enteredPin.slice(0, -1))} className="w-16 h-16 flex items-center justify-center active:scale-90"><Delete size={28} /></button>
          </div>
          <button onClick={handleLogout} className="mt-12 text-white/50 text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:text-white"><LogOut size={14}/> Keluar Akun</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex justify-center selection:bg-[#20b2aa] selection:text-white font-sans">
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.5); } 60% { opacity: 1; transform: scale(1.1); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-10px); } 75% { transform: translateX(10px); } }
        .animate-fade-in-up { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-pop-in { animation: popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-shake { animation: shake 0.4s ease-in-out; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
      
      {showSuccess && <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-max bg-slate-800/95 text-white px-6 py-4 rounded-full font-bold flex items-center gap-3 shadow-2xl z-[100] animate-pop-in"><CheckCircle2 className="text-emerald-400" size={20}/>{successMsg}</div>}

      <div className="w-full max-w-md bg-[#f2f6fa] relative h-[100dvh] shadow-2xl flex flex-col overflow-hidden">
        <div className={`absolute top-0 left-0 right-0 transition-all duration-700 ease-in-out z-0 ${(activeScreen === 'home' || activeScreen === 'stats' || activeScreen === 'history') ? 'h-[320px] rounded-b-[50px]' : 'h-[180px] rounded-b-[30px]'} bg-gradient-to-b from-[#20b2aa] to-[#48d1cc]`}></div>
        
        <div className="flex-1 overflow-y-auto relative z-10 scrollbar-hide">
          {activeScreen === 'home' && renderHome()}
          {activeScreen === 'form_in' && <div className="p-6 h-full"><PageHeader title="Tambah Pemasukan"/><div className="bg-white p-6 rounded-[32px] shadow-xl animate-fade-in-up space-y-6"><input type="number" placeholder="Nominal Rp" value={formData.amount} onChange={e=>setFormData({...formData, amount: e.target.value})} className="w-full text-3xl font-black border-b-2 border-emerald-100 outline-none text-emerald-500 py-4"/><input type="text" placeholder="Keterangan" value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} className="w-full text-lg border-b outline-none py-2"/><button onClick={()=>handleSaveTx('in')} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2">{isSubmitting && <Loader2 className="animate-spin"/>} Simpan</button></div></div>}
          {activeScreen === 'form_out' && <div className="p-6 h-full"><PageHeader title="Tambah Pengeluaran"/><div className="bg-white p-6 rounded-[32px] shadow-xl animate-fade-in-up space-y-6"><input type="number" placeholder="Nominal Rp" value={formData.amount} onChange={e=>setFormData({...formData, amount: e.target.value})} className="w-full text-3xl font-black border-b-2 border-red-100 outline-none text-red-500 py-4"/><input type="text" placeholder="Keterangan" value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} className="w-full text-lg border-b outline-none py-2"/><button onClick={()=>handleSaveTx('out')} className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2">{isSubmitting && <Loader2 className="animate-spin"/>} Simpan</button></div></div>}
          {activeScreen === 'bills' && <div className="p-6 h-full"><PageHeader title="Tagihan Bulanan"/><div className="space-y-4">{(appData?.bills || []).map(b => <div key={b.id} className="bg-white p-5 rounded-2xl flex justify-between items-center shadow-md"><div><h4 className="font-bold">{b.name}</h4><p className="text-xs text-slate-400">{formatIDR(b.amount)}</p></div>{b.isPaid ? <CheckCircle2 className="text-emerald-500"/> : <button onClick={()=>handlePayBill(b)} className="px-4 py-1.5 bg-[#20b2aa] text-white text-xs font-bold rounded-lg">Bayar</button>}</div>)}</div></div>}
          {activeScreen === 'history' && <div className="p-6 h-full pb-24"><PageHeader title="Riwayat"/><div className="bg-white -mx-6 px-6 py-6 rounded-t-[40px] min-h-screen shadow-2xl animate-fade-in-up space-y-4">{(appData?.transactions || []).map(t => <div key={t.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl"><div><p className="font-black text-slate-800 text-sm">{t.title}</p><p className="text-[10px] font-bold text-slate-400">{t.date} • {t.category}</p></div><p className={`font-black ${t.type==='in'?'text-emerald-500':'text-slate-800'}`}>{t.type==='in'?'+':'-'}{formatIDR(t.amount)}</p></div>)}</div></div>}
          {activeScreen === 'settings' && <div className="p-6 h-full pb-24"><PageHeader title="Profil Saya"/><div className="bg-white p-6 rounded-[32px] shadow-xl space-y-6"><div className="flex items-center gap-4 border-b pb-6"><div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-white font-black text-2xl uppercase shadow-lg shadow-emerald-500/20">{appData?.profile?.name?.substring(0,2) || 'JD'}</div><div><h4 className="font-black text-slate-800">{appData?.profile?.name}</h4><p className="text-xs text-slate-400 font-bold">{user?.email}</p></div></div><button onClick={()=>setIsUnlocked(false)} className="w-full text-left p-4 bg-slate-50 rounded-2xl flex items-center gap-4 font-bold text-slate-600"><Lock size={20} className="text-[#20b2aa]"/> Kunci Aplikasi</button><button onClick={handleLogout} className="w-full text-left p-4 bg-red-50 rounded-2xl flex items-center gap-4 font-black text-red-600"><LogOut size={20}/> Keluar Akun</button></div></div>}
        </div>

        <div className="w-full h-20 bg-white/80 backdrop-blur-md rounded-t-[30px] shadow-2xl flex justify-between items-end px-4 pb-2 z-50 border-t border-slate-100">
          {[
            { id: 'home', icon: <Home size={24}/>, label: 'HOME' },
            { id: 'history', icon: <History size={24}/>, label: 'RIWAYAT' },
            { id: 'settings', icon: <User size={24}/>, label: 'AKUN' }
          ].map(nav => (
            <div key={nav.id} onClick={() => setActiveScreen(nav.id)} className={`flex flex-col items-center justify-center cursor-pointer transition-all duration-500 ${activeScreen === nav.id ? 'w-[75px] h-[85px] bg-[#1d2333] text-white rounded-t-[28px] shadow-2xl -translate-y-2' : 'w-16 h-16 text-slate-400 mb-2'}`}>
              {nav.icon}<span className="text-[8px] font-black mt-1 uppercase tracking-widest">{nav.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;