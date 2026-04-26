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
  Eye, EyeOff, Edit, LogOut, LogIn, KeyRound, UserPlus, Info, ChevronRight
} from 'lucide-react';

// --- FIREBASE INITIALIZATION ---
// !!! PENTING: GANTI DENGAN KODE ASLI DARI FIREBASE CONSOLE ANDA !!!
const firebaseConfig = {
  apiKey: "AIzaSyDAbWuN37Y_9H3nsFI1KKifhXVSOtgXXSU",
  authDomain: "fincatat.firebaseapp.com",
  projectId: "fincatat",
  storageBucket: "fincatat.firebasestorage.app",
  messagingSenderId: "162007230800",
  appId: "1:162007230800:web:df8f4a4b44ece741b0e455",
  measurementId: "G-5158WYVV3E"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'fincatat-pro-ultimate-v1';

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
  
  // Security & Auth States
  const [authMode, setAuthMode] = useState('login'); 
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinSetupStep, setPinSetupStep] = useState(0); 
  const [tempPin, setTempPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // UI & Feedback States
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDanger: false });
  const [greeting, setGreeting] = useState('');
  
  // Functional Form States
  const [formData, setFormData] = useState({ amount: '', title: '', category: 'Lainnya' });
  const [transferForm, setTransferForm] = useState({ bank: 'BCA', account: '', amount: '', note: '' });
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('all');
  
  // Specific Modals
  const [editBudgetModal, setEditBudgetModal] = useState({ isOpen: false, category: '', limit: '' });
  const [addBankModal, setAddBankModal] = useState({ isOpen: false, bank: 'BCA', number: '', owner: '' });
  const [addCategoryModal, setAddCategoryModal] = useState({ isOpen: false, type: 'out', name: '' });

  // --- LOGIC: AUTH & SYNC ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) { setIsLoading(false); setIsUnlocked(false); setEnteredPin(''); }
    });
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
        setDoc(docRef, init);
        setAppData(init);
        setPinSetupStep(1);
      }
      setIsLoading(false);
    }, (err) => { console.error(err); setIsLoading(false); });
    return () => unsubscribe();
  }, [user]);

  // --- ACTIONS ---
  const handleAuth = async (e) => {
    e.preventDefault(); setIsSubmitting(true); setAuthError('');
    try {
      if (authMode === 'register') await createUserWithEmailAndPassword(auth, authForm.email, authForm.password);
      else await signInWithEmailAndPassword(auth, authForm.email, authForm.password);
    } catch (err) { 
        if (err.code === 'auth/invalid-credential') setAuthError('Email atau password salah.');
        else if (err.code === 'auth/api-key-not-valid') setAuthError('Konfigurasi API Key Firebase Salah!');
        else setAuthError('Gagal masuk. Periksa koneksi & config.');
    }
    finally { setIsSubmitting(false); }
  };

  const updateFirestore = async (fields) => {
    if (!user) return;
    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'finances', 'mainData');
    try { await setDoc(docRef, fields, { merge: true }); } catch (e) { console.error(e); }
  };

  const handlePinInput = (num) => {
    if (enteredPin.length < 6) {
      const p = enteredPin + num; setEnteredPin(p);
      if (p.length === 6) setTimeout(() => {
        if (pinSetupStep === 0) {
          if (p === appData.pin) { setIsUnlocked(true); setEnteredPin(''); }
          else { setPinError(true); setTimeout(() => { setPinError(false); setEnteredPin(''); }, 500); }
        } else if (pinSetupStep === 1) { setTempPin(p); setEnteredPin(''); setPinSetupStep(2); }
        else if (pinSetupStep === 2) {
          if (p === tempPin) { updateFirestore({ pin: p }); setIsUnlocked(true); setPinSetupStep(0); setEnteredPin(''); triggerSuccess('PIN Disimpan'); }
          else { setPinError(true); setTimeout(() => { setPinError(false); setEnteredPin(''); setTempPin(''); setPinSetupStep(1); }, 500); }
        }
      }, 200);
    }
  };

  const triggerSuccess = (m, s = null) => {
    setSuccessMsg(m); setShowSuccess(true);
    setTimeout(() => { setShowSuccess(false); if(s) setActiveScreen(s); }, 1500);
  };

  const formatIDR = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

  // --- FUNCTIONAL HANDLERS ---
  const handleSaveTx = async (type) => {
    if (!formData.amount || !formData.title) return;
    setIsSubmitting(true);
    const nt = { id: Date.now(), type, amount: parseInt(formData.amount), title: formData.title, category: formData.category, date: new Date().toISOString().split('T')[0] };
    await updateFirestore({ transactions: [nt, ...(appData?.transactions || [])] });
    setFormData({ amount: '', title: '', category: appData?.categories[type][0] || 'Lainnya' });
    setIsSubmitting(false); triggerSuccess('Tersimpan!', 'home');
  };

  const handleTransferSubmit = async () => {
    if (!transferForm.amount || !transferForm.account) return;
    setIsSubmitting(true);
    const nt = { id: Date.now(), type: 'out', amount: parseInt(transferForm.amount), title: `Transfer: ${transferForm.bank} (${transferForm.account})`, category: 'Transfer', date: new Date().toISOString().split('T')[0] };
    await updateFirestore({ transactions: [nt, ...(appData?.transactions || [])] });
    setTransferForm({ bank: 'BCA', account: '', amount: '', note: '' });
    setIsSubmitting(false); triggerSuccess('Transfer Berhasil!', 'home');
  };

  const handleDeleteTx = (id) => {
    setConfirmModal({ isOpen: true, title: 'Hapus?', message: 'Data akan hilang permanen.', isDanger: true, onConfirm: async () => {
      setIsSubmitting(true); await updateFirestore({ transactions: appData.transactions.filter(t => t.id !== id) });
      setIsSubmitting(false); setConfirmModal({ ...confirmModal, isOpen: false }); triggerSuccess('Dihapus');
    }});
  };

  // --- UI COMPONENTS ---
  const PageHeader = ({ title }) => (
    <div className="flex items-center gap-4 text-white mb-8 pt-4 sticky top-0 z-20 animate-slide-right">
      <button onClick={() => setActiveScreen('home')} className="p-2 bg-white/20 rounded-xl backdrop-blur-sm hover:bg-white/30 transition-all"><ArrowLeft size={24} /></button>
      <h1 className="text-xl font-black tracking-wide">{title}</h1>
    </div>
  );

  const renderAuth = () => (
    <div className="fixed inset-0 bg-[#f4f7fe] flex items-center justify-center p-4 z-[300]">
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[80px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[80px] animate-pulse"></div>
      
      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        <div className="bg-white/90 backdrop-blur-xl rounded-[50px] p-10 shadow-[0_30px_60px_rgba(0,0,0,0.1)] border border-white">
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-blue-200">
              <Wallet size={36} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tighter">FinCatat <span className="text-blue-600">PRO</span></h1>
            <p className="text-slate-400 text-sm font-bold mt-1 uppercase tracking-widest text-[10px]">Cloud Banking Solution</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {authMode === 'register' && (
              <div className="relative"><User className="absolute left-4 top-4 text-slate-300 group-focus-within:text-blue-600 transition-colors"/><input type="text" required placeholder="Nama Lengkap" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} className="w-full bg-slate-50 rounded-2xl py-4 pl-12 pr-5 outline-none focus:ring-2 ring-blue-100 border-2 border-transparent focus:border-blue-400 transition-all font-bold text-slate-700 placeholder:text-slate-300" /></div>
            )}
            <div className="relative"><Mail className="absolute left-4 top-4 text-slate-300 group-focus-within:text-blue-600 transition-colors"/><input type="email" required placeholder="Email Anda" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full bg-slate-50 rounded-2xl py-4 pl-12 pr-5 outline-none focus:ring-2 ring-blue-100 border-2 border-transparent focus:border-blue-400 transition-all font-bold text-slate-700 placeholder:text-slate-300" /></div>
            <div className="relative"><KeyRound className="absolute left-4 top-4 text-slate-300 group-focus-within:text-blue-600 transition-colors"/><input type={showPassword ? "text" : "password"} required placeholder="Kata Sandi" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full bg-slate-50 rounded-2xl py-4 pl-12 pr-12 outline-none focus:ring-2 ring-blue-100 border-2 border-transparent focus:border-blue-400 transition-all font-bold text-slate-700 placeholder:text-slate-300" /><button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-4 top-4 text-slate-300">{showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}</button></div>
            
            {authError && <div className="bg-red-50 text-red-500 text-[10px] font-black py-3 px-4 rounded-xl border border-red-100 animate-shake flex items-center gap-2"><AlertCircle size={14}/> {authError}</div>}
            
            <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-3">
              {isSubmitting ? <Loader2 className="animate-spin" /> : (authMode === 'login' ? <LogIn size={20}/> : <UserPlus size={20}/>)}
              {isSubmitting ? 'MEMPROSES...' : (authMode === 'login' ? 'MASUK SEKARANG' : 'DAFTAR AKUN')}
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{authMode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}</p>
            <button onClick={() => {setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError('');}} className="mt-2 text-blue-600 font-black text-lg hover:underline transition-all">
              {authMode === 'login' ? 'Daftar Gratis Di Sini' : 'Login ke Akun Anda'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderApp = () => {
    if (!isUnlocked) {
      const title = pinSetupStep === 1 ? "Buat PIN Keamanan" : pinSetupStep === 2 ? "Konfirmasi PIN Baru" : "Masukkan PIN Brankas";
      return (
        <div className="fixed inset-0 bg-gradient-to-b from-blue-700 to-blue-900 flex items-center justify-center p-8 text-white z-[400]">
          <div className="w-full max-w-sm flex flex-col items-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-6 backdrop-blur-md border border-white/30 shadow-xl"><Lock size={32} /></div>
            <h1 className="text-2xl font-black mb-10 text-center leading-tight">{title}</h1>
            <div className={`flex gap-5 mb-14 ${pinError ? 'animate-shake' : ''}`}>
              {[...Array(6)].map((_, i) => (<div key={i} className={`w-4 h-4 rounded-full transition-all duration-300 ${i < enteredPin.length ? 'bg-white scale-150 shadow-[0_0_15px_white]' : 'bg-white/20'}`} />))}
            </div>
            <div className="grid grid-cols-3 gap-x-10 gap-y-8">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0].map((n, i) => (
                n === '' ? <div key={i}/> : <button key={i} onClick={() => handlePinInput(n.toString())} className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-3xl font-black active:scale-90 border border-white/5 hover:bg-white/20 transition-all">{n}</button>
              ))}
              <button onClick={() => setEnteredPin(enteredPin.slice(0, -1))} className="w-16 h-16 flex items-center justify-center active:scale-90 hover:text-red-300 transition-all"><Delete size={32} /></button>
            </div>
            <button onClick={() => signOut(auth)} className="mt-16 text-white/40 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:text-white transition-all"><LogOut size={14}/> Keluar Akun</button>
          </div>
        </div>
      );
    }

    const totalIn = appData?.transactions?.filter(t=>t.type==='in').reduce((a,c)=>a+c.amount,0) || 0;
    const totalOut = appData?.transactions?.filter(t=>t.type==='out').reduce((a,c)=>a+c.amount,0) || 0;
    const totalSaldo = totalIn - totalOut;

    return (
      <div className="fixed inset-0 flex justify-center bg-slate-900 overflow-hidden font-sans">
        <div className="w-full max-w-md bg-[#f8faff] relative h-full shadow-2xl flex flex-col overflow-hidden">
          
          {/* HEADER BACKGROUND TETAP */}
          <div className={`absolute top-0 left-0 right-0 transition-all duration-700 ease-in-out z-0 
            ${(activeScreen === 'home' || activeScreen === 'stats' || activeScreen === 'history') ? 'h-[340px] rounded-b-[60px]' : 'h-[180px] rounded-b-[40px]'} 
            bg-gradient-to-b from-blue-600 to-blue-800 shadow-xl shadow-blue-100`}>
          </div>
          
          {/* AREA ISI SCROLLABLE */}
          <div className="flex-1 overflow-y-auto relative z-10 scrollbar-hide pt-12 px-6 pb-28">
            
            {/* SCREEN: HOME DASHBOARD */}
            {activeScreen === 'home' && (
              <div className="animate-fade-in-up">
                <div className="flex justify-between items-center text-white mb-12">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 shadow-lg"><Wallet size={24} className="text-white" /></div>
                    <div className="leading-tight"><p className="text-[10px] uppercase font-black opacity-60 tracking-widest">{greeting}</p><h1 className="text-xl font-black">{appData?.profile?.name || 'User'}</h1></div>
                  </div>
                  <div onClick={() => setActiveScreen('settings')} className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 cursor-pointer hover:scale-110 transition-all shadow-lg shadow-black/10"><User size={22} className="text-white"/></div>
                </div>
                
                <div className="bg-white rounded-[40px] p-7 shadow-2xl shadow-blue-100/50 mb-7 flex justify-between items-center transition-all hover:scale-[1.02]">
                  <div><span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full uppercase tracking-widest">Saldo Tersedia</span><div className="flex items-center gap-3 mt-3"><h2 className="text-3xl font-black text-slate-800 tracking-tight">{appData?.showBalance ? formatIDR(totalSaldo) : 'Rp ••••••••'}</h2><button onClick={() => updateFirestore({showBalance: !appData?.showBalance})}>{appData?.showBalance ? <EyeOff size={20} className="text-slate-300"/> : <Eye size={20} className="text-slate-300"/>}</button></div><p className="text-[10px] font-bold text-slate-300 mt-2 flex items-center gap-1"><Shield size={12}/> AMAN DI CLOUD</p></div>
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center shadow-inner border border-blue-100 shrink-0"><TrendingUp size={32} className="text-blue-600" /></div>
                </div>

                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[40px] p-6 shadow-2xl mb-12 text-white flex items-center gap-6 relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
                  <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/10 shadow-lg"><TrendingDown size={28} className="text-red-400" /></div>
                  <div className="z-10"><h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Pengeluaran</h3><p className="text-2xl font-black tracking-tight mt-1">{appData?.showBalance ? formatIDR(totalOut) : 'Rp ••••••••'}</p><p className="text-[10px] font-bold text-slate-500 mt-1">{appData?.transactions?.filter(t=>t.type==='out').length} TRANSAKSI</p></div>
                </div>

                <div className="grid grid-cols-4 gap-y-8 gap-x-3 mb-10">
                  {[
                    { icon: <TrendingUp size={24} className="text-emerald-500" />, label: "MASUK", action: 'form_in', color: 'bg-emerald-50' },
                    { icon: <TrendingDown size={24} className="text-red-500" />, label: "KELUAR", action: 'form_out', color: 'bg-red-50' },
                    { icon: <Send size={24} className="text-blue-500" />, label: "TRANSFER", action: 'transfer', color: 'bg-blue-50' },
                    { icon: <Receipt size={24} className="text-amber-500" />, label: "TAGIHAN", action: 'bills', color: 'bg-amber-50' },
                    { icon: <PieChart size={24} className="text-indigo-500" />, label: "ANGGARAN", action: 'budget', color: 'bg-indigo-50' },
                    { icon: <PiggyBank size={24} className="text-pink-500" />, label: "TABUNGAN", action: 'savings', color: 'bg-pink-50' },
                    { icon: <BarChart3 size={24} className="text-cyan-500" />, label: "LAPORAN", action: 'stats', color: 'bg-cyan-50' },
                    { icon: <Tags size={24} className="text-slate-500" />, label: "KATEGORI", action: 'categories', color: 'bg-slate-50' }
                  ].map((item, i) => (
                    <div key={i} onClick={() => setActiveScreen(item.action)} className="flex flex-col items-center gap-3 cursor-pointer group animate-pop-in" style={{ animationDelay: `${100 + i * 50}ms` }}>
                      <div className={`w-[75px] h-[75px] rounded-[28px] bg-white shadow-[0_10px_25px_rgba(0,0,0,0.03)] border border-slate-50 flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-blue-100 group-hover:shadow-2xl active:scale-90`}>
                        <div className={`w-12 h-12 rounded-2xl ${item.color} flex items-center justify-center shadow-inner`}>{item.icon}</div>
                      </div>
                      <span className="text-[9px] font-black text-slate-500 uppercase text-center tracking-tighter leading-none">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SCREEN: TRANSFER DANA */}
            {activeScreen === 'transfer' && (
              <div className="animate-fade-in-up">
                <PageHeader title="Transfer Keluar" />
                <div className="bg-white p-8 rounded-[45px] shadow-2xl space-y-7">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Bank Tujuan</label>
                    <div className="relative">
                      <button onClick={() => setIsBankDropdownOpen(!isBankDropdownOpen)} className="w-full text-left py-4 px-1 border-b-2 border-slate-50 font-black text-lg flex justify-between items-center text-slate-700">{transferForm.bank} <ChevronDown size={20} className="text-blue-500"/></button>
                      {isBankDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 bg-white border rounded-[25px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-50 mt-2 py-2 max-h-52 overflow-y-auto animate-pop-in">
                          {["BCA", "MANDIRI", "BNI", "BRI", "DANA", "GOPAY", "OVO", "SHOPEEPAY", "QRIS"].map(b => (
                            <button key={b} onClick={()=>{setTransferForm({...transferForm, bank:b}); setIsBankDropdownOpen(false);}} className="w-full text-left px-6 py-4 hover:bg-blue-50 font-black text-slate-600 text-sm border-b border-slate-50 last:border-0">{b}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nomor Rekening / HP</label>
                    <input type="number" placeholder="Contoh: 1234567890" value={transferForm.account} onChange={e=>setTransferForm({...transferForm, account:e.target.value})} className="w-full text-xl font-black border-b-2 border-slate-50 outline-none py-4 bg-transparent text-slate-800 focus:border-blue-500 transition-all"/>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nominal Transfer (Rp)</label>
                    <input type="number" placeholder="0" value={transferForm.amount} onChange={e=>setTransferForm({...transferForm, amount:e.target.value})} className="w-full text-4xl font-black border-b-2 border-blue-50 text-blue-600 outline-none py-4 bg-transparent focus:border-blue-600 transition-all"/>
                  </div>
                  <button onClick={handleTransferSubmit} disabled={isSubmitting} className="w-full py-6 bg-blue-600 text-white rounded-[28px] font-black shadow-xl shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-3">
                    {isSubmitting ? <Loader2 className="animate-spin"/> : <Send size={20}/>}
                    KIRIM SEKARANG
                  </button>
                </div>
              </div>
            )}

            {/* SCREEN: REKENING BANK */}
            {activeScreen === 'bank_accounts' && (
              <div className="animate-fade-in-up">
                <PageHeader title="Rekening Saya" />
                <div className="space-y-4">
                  {appData?.bankAccounts?.map((b, i) => (
                    <div key={i} className="bg-white p-6 rounded-[35px] shadow-xl flex justify-between items-center border border-slate-50">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center shadow-inner"><Landmark className="text-blue-600" size={28}/></div>
                        <div><p className="font-black text-slate-800 text-lg">{b.bank}</p><p className="text-xs font-bold text-slate-400 tracking-widest uppercase mt-1">{b.accountNumber} • {b.accountName}</p></div>
                      </div>
                      <button onClick={async ()=>{const filtered = appData.bankAccounts.filter((_, idx)=>idx!==i); await updateFirestore({bankAccounts:filtered}); triggerSuccess('Dihapus');}} className="p-3 text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>
                    </div>
                  ))}
                  <button onClick={()=>setAddBankModal({isOpen:true, bank:'BCA', number:'', owner:''})} className="w-full py-7 border-2 border-dashed border-blue-200 bg-blue-50/30 rounded-[35px] font-black text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-3"><Plus size={24}/> TAMBAH REKENING BARU</button>
                </div>
              </div>
            )}

            {/* SCREEN: BANTUAN & LAPORAN */}
            {activeScreen === 'help_report' && (
              <div className="animate-fade-in-up">
                <PageHeader title="Pusat Bantuan" />
                <div className="bg-white rounded-[45px] p-8 shadow-2xl space-y-6">
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-blue-100"><MessageCircle size={36} className="text-blue-600"/></div>
                    <h3 className="text-xl font-black text-slate-800">Ada kendala?</h3>
                    <p className="text-slate-400 text-sm font-medium">Tim CS kami siap membantu Anda 24/7</p>
                  </div>
                  <div className="space-y-3">
                    <a href="https://wa.me/628123456789" className="flex items-center justify-between p-5 bg-emerald-50 rounded-[25px] border border-emerald-100 hover:bg-emerald-100 transition-all group">
                      <div className="flex items-center gap-4"><div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-500"><Phone size={24}/></div><div><p className="font-black text-emerald-800">WhatsApp Support</p><p className="text-[10px] font-bold text-emerald-600 uppercase">Respon Cepat (5 Menit)</p></div></div>
                      <ChevronRight className="text-emerald-400 group-hover:translate-x-1 transition-transform" />
                    </a>
                    <a href="mailto:support@fincatat.com" className="flex items-center justify-between p-5 bg-blue-50 rounded-[25px] border border-blue-100 hover:bg-blue-100 transition-all group">
                      <div className="flex items-center gap-4"><div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-500"><Mail size={24}/></div><div><p className="font-black text-blue-800">Email Bantuan</p><p className="text-[10px] font-bold text-blue-600 uppercase">support@fincatat.com</p></div></div>
                      <ChevronRight className="text-blue-400 group-hover:translate-x-1 transition-transform" />
                    </a>
                    <div className="p-6 bg-slate-50 rounded-[30px] border border-slate-100">
                      <h4 className="font-black text-slate-800 text-sm mb-3">FAQ Teratas</h4>
                      <div className="space-y-4">
                        <div className="space-y-1"><p className="text-xs font-black text-blue-600 uppercase">Cara ganti PIN?</p><p className="text-[11px] font-medium text-slate-500">Buka menu Akun {'>'} Klik Ganti PIN Keamanan.</p></div>
                        <div className="space-y-1"><p className="text-xs font-black text-blue-600 uppercase">Data aman di Cloud?</p><p className="text-[11px] font-medium text-slate-500">Ya, data Anda terenkripsi penuh dan tersinkron otomatis antar HP.</p></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN: FORM TRANSAKSI */}
            {(activeScreen === 'form_in' || activeScreen === 'form_out') && (
              <div className="animate-fade-in-up">
                <PageHeader title={activeScreen === 'form_in' ? "Input Pemasukan" : "Input Pengeluaran"} />
                <div className="bg-white p-8 rounded-[45px] shadow-2xl space-y-7">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NOMINAL TRANSAKSI (Rp)</label>
                    <input type="number" placeholder="0" value={formData.amount} onChange={e=>setFormData({...formData, amount: e.target.value})} className={`w-full text-4xl font-black border-b-2 outline-none py-5 bg-transparent ${activeScreen === 'form_in' ? 'text-emerald-500 focus:border-emerald-500' : 'text-red-500 focus:border-red-500'} transition-all`}/>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">KETERANGAN / NAMA</label>
                    <input type="text" placeholder="Misal: Gaji / Beli Makan" value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} className="w-full text-xl font-black border-b-2 border-slate-50 outline-none py-4 bg-transparent text-slate-800 focus:border-blue-500 transition-all"/>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">KATEGORI PILIHAN</label>
                    <div className="flex flex-wrap gap-2.5">
                      {appData?.categories[activeScreen === 'form_in' ? 'in' : 'out'].map(cat => (
                        <button key={cat} onClick={() => setFormData({...formData, category: cat})} className={`px-5 py-2.5 rounded-2xl text-[11px] font-black transition-all ${formData.category === cat ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>{cat.toUpperCase()}</button>
                      ))}
                      <button onClick={()=>setAddCategoryModal({isOpen:true, type: activeScreen === 'form_in' ? 'in' : 'out', name:''})} className="px-5 py-2.5 rounded-2xl text-[11px] font-black border-2 border-dashed border-blue-200 text-blue-400">+ BARU</button>
                    </div>
                  </div>
                  <button onClick={()=>handleSaveTx(activeScreen === 'form_in' ? 'in' : 'out')} disabled={isSubmitting} className={`w-full py-6 text-white rounded-[28px] font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 ${activeScreen === 'form_in' ? 'bg-emerald-500' : 'bg-red-500'}`}>{isSubmitting ? <Loader2 className="animate-spin"/> : <CheckCircle2 size={24}/>} SIMPAN DATA</button>
                </div>
              </div>
            )}

            {/* SCREEN: ANGGARAN */}
            {activeScreen === 'budget' && (
              <div className="animate-fade-in-up">
                <PageHeader title="Analisis Anggaran" />
                <div className="bg-white p-8 rounded-[45px] shadow-2xl space-y-8">
                  {appData?.categories?.out.map(cat => {
                    const limit = appData?.budgetLimits?.[cat] || 0;
                    const spent = appData?.transactions?.filter(t=>t.category===cat && t.type==='out').reduce((a,c)=>a+c.amount,0) || 0;
                    const pct = limit > 0 ? Math.min((spent/limit)*100, 100) : 0;
                    return (
                      <div key={cat} className="space-y-3">
                        <div className="flex justify-between items-end">
                          <div className="flex items-center gap-3"><h4 className="font-black text-slate-800 text-base">{cat}</h4><Edit size={14} className="text-blue-500 cursor-pointer" onClick={()=>setEditBudgetModal({isOpen:true, category:cat, limit:limit.toString()})}/></div>
                          <div className="text-right"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formatIDR(spent)} / {limit > 0 ? formatIDR(limit) : 'UNSET'}</p></div>
                        </div>
                        <div className="h-4 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                          <div className={`h-full rounded-full transition-all duration-1000 ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-orange-400' : 'bg-blue-500'}`} style={{width: `${pct}%`}}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SCREEN: RIWAYAT */}
            {activeScreen === 'history' && (
              <div className="animate-fade-in-up">
                <PageHeader title="Histori Transaksi" />
                <div className="bg-white -mx-6 px-6 py-10 rounded-t-[55px] min-h-[600px] shadow-inner space-y-5">
                  <div className="flex gap-2.5 mb-6">
                    {['all', 'in', 'out'].map(f => <button key={f} onClick={()=>setHistoryFilter(f)} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${historyFilter === f ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-400'}`}>{f === 'all' ? 'SEMUA' : f === 'in' ? 'MASUK' : 'KELUAR'}</button>)}
                  </div>
                  {appData?.transactions?.filter(t => historyFilter === 'all' || t.type === historyFilter).map(t => (
                    <div key={t.id} className="flex justify-between items-center p-5 bg-[#fcfdfe] rounded-[30px] border border-slate-50 group">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${t.type==='in'?'bg-emerald-50 text-emerald-500':'bg-red-50 text-red-500'}`}>{t.type==='in'?<TrendingUp size={22}/>:<TrendingDown size={22}/>}</div>
                        <div><p className="font-black text-slate-800 text-[14px]">{t.title}</p><p className="text-[10px] font-bold text-slate-300 uppercase mt-0.5">{t.date} • {t.category}</p></div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className={`font-black text-[15px] ${t.type==='in'?'text-emerald-500':'text-slate-800'}`}>{t.type==='in'?'+':'-'}{formatIDR(t.amount)}</p>
                        <button onClick={()=>handleDeleteTx(t.id)} className="p-2 text-slate-100 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SCREEN: PENGATURAN */}
            {activeScreen === 'settings' && (
              <div className="animate-fade-in-up">
                <PageHeader title="Akun & Privasi" />
                <div className="bg-white p-8 rounded-[45px] shadow-2xl space-y-7">
                  <div className="flex items-center gap-5 border-b border-slate-50 pb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center text-white font-black text-2xl uppercase shadow-xl">{appData?.profile?.name?.substring(0,2) || 'JD'}</div>
                    <div><h4 className="font-black text-slate-800 text-lg">{appData?.profile?.name}</h4><p className="text-xs text-slate-400 font-bold uppercase">{user?.email}</p></div>
                  </div>
                  <div className="space-y-3">
                    <button onClick={()=>setActiveScreen('bank_accounts')} className="w-full text-left p-5 bg-slate-50 rounded-[25px] flex items-center justify-between font-black text-slate-600 hover:bg-blue-50 transition-all">
                      <div className="flex items-center gap-4"><Landmark size={20} className="text-blue-500"/> Rekening Bank</div><ChevronRight size={18} className="text-slate-300"/>
                    </button>
                    <button onClick={()=>{setPinSetupStep(1); setIsUnlocked(false); setEnteredPin('');}} className="w-full text-left p-5 bg-slate-50 rounded-[25px] flex items-center justify-between font-black text-slate-600 hover:bg-blue-50 transition-all">
                      <div className="flex items-center gap-4"><KeyRound size={20} className="text-blue-500"/> Ganti PIN</div><ChevronRight size={18} className="text-slate-300"/>
                    </button>
                    <button onClick={()=>setActiveScreen('help_report')} className="w-full text-left p-5 bg-slate-50 rounded-[25px] flex items-center justify-between font-black text-slate-600 hover:bg-blue-50 transition-all">
                      <div className="flex items-center gap-4"><Phone size={20} className="text-blue-500"/> Bantuan</div><ChevronRight size={18} className="text-slate-300"/>
                    </button>
                  </div>
                  <div className="pt-6 border-t border-slate-50 space-y-3">
                    <button onClick={()=>setIsUnlocked(false)} className="w-full text-left p-5 bg-red-50/50 rounded-[25px] flex items-center gap-4 font-black text-red-400 hover:bg-red-50"><Lock size={20}/> Kunci Aplikasi</button>
                    <button onClick={() => signOut(auth)} className="w-full text-left p-5 bg-slate-50 rounded-[25px] flex items-center gap-4 font-black text-slate-400 hover:bg-red-600 hover:text-white transition-all"><LogOut size={20}/> Keluar Akun</button>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* BOTTOM NAVIGATION FIXED */}
          <div className="w-full h-24 bg-white/90 backdrop-blur-xl rounded-t-[50px] shadow-[0_-20px_50px_rgba(0,0,0,0.05)] flex justify-between items-end px-7 pb-4 z-50 border-t border-white shrink-0">
            {[
              { id: 'home', icon: <Home size={24}/>, label: 'BERANDA' },
              { id: 'history', icon: <History size={24}/>, label: 'RIWAYAT' },
              { id: 'stats', icon: <PieChart size={24}/>, label: 'LAPORAN' },
              { id: 'settings', icon: <Settings size={24}/>, label: 'SETELAN' }
            ].map(nav => (
              <div key={nav.id} onClick={() => setActiveScreen(nav.id)} className={`flex flex-col items-center justify-center cursor-pointer transition-all duration-500 ${activeScreen === nav.id ? 'w-[85px] h-[95px] bg-slate-900 text-white rounded-t-[35px] shadow-2xl -translate-y-4 scale-105' : 'w-16 h-16 text-slate-300 mb-2 hover:text-blue-500'}`}>
                {nav.icon}<span className="text-[7px] font-black mt-2 uppercase tracking-[0.2em]">{nav.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // --- MODALS ---
  const Modals = () => (
    <>
      {showSuccess && <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-max bg-slate-900 text-white px-10 py-6 rounded-full font-black flex items-center gap-4 shadow-2xl z-[1000] animate-pop-in border border-white/10 uppercase tracking-widest text-xs"><div className="bg-blue-500 rounded-full p-1.5"><CheckCircle2 size={24}/></div>{successMsg}</div>}
      
      {editBudgetModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[500] flex items-center justify-center p-6">
           <div className="bg-white rounded-[50px] p-10 w-full max-w-sm animate-pop-in shadow-2xl">
              <h3 className="text-xl font-black text-slate-800 mb-2">Set Anggaran</h3>
              <p className="text-blue-600 font-black text-[10px] mb-8 uppercase tracking-widest">{editBudgetModal.category}</p>
              <input type="number" placeholder="Rp 0" value={editBudgetModal.limit} onChange={e=>setEditBudgetModal({...editBudgetModal, limit:e.target.value})} className="w-full text-3xl font-black border-b-4 border-slate-50 outline-none mb-10 text-center text-slate-700 focus:border-blue-500 transition-all"/>
              <div className="flex gap-4">
                 <button onClick={()=>setEditBudgetModal({isOpen:false,category:'',limit:''})} className="flex-1 py-5 bg-slate-50 rounded-3xl font-black text-slate-400 text-xs">BATAL</button>
                 <button onClick={async ()=>{setIsSubmitting(true); await updateFirestore({budgetLimits:{...appData.budgetLimits, [editBudgetModal.category]:parseInt(editBudgetModal.limit)}}); setIsSubmitting(false); setEditBudgetModal({isOpen:false,category:'',limit:''}); triggerSuccess('Disimpan');}} className="flex-1 py-5 bg-blue-600 text-white rounded-3xl font-black text-xs shadow-xl shadow-blue-100">SIMPAN</button>
              </div>
           </div>
        </div>
      )}

      {addBankModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[500] flex items-center justify-center p-6">
           <div className="bg-white rounded-[50px] p-10 w-full max-w-sm animate-pop-in space-y-6">
              <h3 className="text-xl font-black text-slate-800">Rekening Baru</h3>
              <select value={addBankModal.bank} onChange={e=>setAddBankModal({...addBankModal, bank:e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-black text-slate-700 outline-none">
                {["BCA", "MANDIRI", "BNI", "BRI", "PERMATA", "DANA"].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <input type="number" placeholder="No Rekening" value={addBankModal.number} onChange={e=>setAddBankModal({...addBankModal, number:e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none"/>
              <input type="text" placeholder="Atas Nama" value={addBankModal.owner} onChange={e=>setAddBankModal({...addBankModal, owner:e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none"/>
              <div className="flex gap-4 pt-4">
                 <button onClick={()=>setAddBankModal({isOpen:false})} className="flex-1 py-5 bg-slate-50 rounded-3xl font-black text-slate-400 text-xs">BATAL</button>
                 <button onClick={async ()=>{if(!addBankModal.number)return; setIsSubmitting(true); const nb = [...(appData.bankAccounts || []), {bank: addBankModal.bank, accountNumber: addBankModal.number, accountName: addBankModal.owner}]; await updateFirestore({bankAccounts: nb}); setIsSubmitting(false); setAddBankModal({isOpen:false}); triggerSuccess('Rekening Ditambah');}} className="flex-1 py-5 bg-blue-600 text-white rounded-3xl font-black text-xs shadow-xl">SIMPAN</button>
              </div>
           </div>
        </div>
      )}

      {addCategoryModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[500] flex items-center justify-center p-6">
           <div className="bg-white rounded-[50px] p-10 w-full max-w-sm animate-pop-in text-center space-y-6">
              <h3 className="text-xl font-black text-slate-800">Kategori Baru</h3>
              <input type="text" placeholder="Nama Kategori..." value={addCategoryModal.name} onChange={e=>setAddCategoryModal({...addCategoryModal, name:e.target.value})} className="w-full p-5 bg-slate-50 rounded-3xl font-black outline-none text-center focus:border-blue-500 border-b-4 border-slate-100 transition-all"/>
              <div className="flex gap-4">
                 <button onClick={()=>setAddCategoryModal({isOpen:false})} className="flex-1 py-5 bg-slate-50 rounded-3xl font-black text-slate-400 text-xs">BATAL</button>
                 <button onClick={async ()=>{if(!addCategoryModal.name)return; setIsSubmitting(true); const updated = {...appData.categories}; updated[addCategoryModal.type] = [...updated[addCategoryModal.type], addCategoryModal.name]; await updateFirestore({categories: updated}); setIsSubmitting(false); setAddCategoryModal({isOpen:false}); triggerSuccess('Kategori Ditambah');}} className="flex-1 py-5 bg-blue-600 text-white rounded-3xl font-black text-xs">SIMPAN</button>
              </div>
           </div>
        </div>
      )}

      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[1000] flex items-center justify-center p-8">
           <div className="bg-white rounded-[60px] p-10 w-full max-w-sm animate-pop-in text-center shadow-2xl">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 ${confirmModal.isDanger ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-blue-50 text-blue-500'}`}><AlertCircle size={48} /></div>
              <h3 className="text-2xl font-black text-slate-800 mb-3">{confirmModal.title}</h3>
              <p className="text-slate-400 mb-10 font-bold text-sm leading-relaxed uppercase">{confirmModal.message}</p>
              <div className="flex gap-4"><button onClick={() => setConfirmModal({isOpen: false})} className="flex-1 py-5 rounded-[25px] bg-slate-100 text-slate-400 font-black text-[10px] tracking-widest">BATAL</button><button onClick={confirmModal.onConfirm} className={`flex-1 py-5 rounded-[25px] text-white font-black text-[10px] tracking-widest ${confirmModal.isDanger ? 'bg-red-500' : 'bg-blue-600'}`}>LANJUTKAN</button></div>
           </div>
        </div>
      )}
    </>
  );

  if (isLoading) return <div className="fixed inset-0 bg-[#f8faff] flex flex-col items-center justify-center gap-6 text-blue-600 z-[600]"><div className="relative"><Loader2 className="animate-spin text-blue-600" size={64} /><Wallet className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-200" size={24}/></div><p className="font-black text-[10px] animate-pulse uppercase tracking-[0.4em] text-blue-300">Syncing with Cloud Database...</p></div>;
  
  return (
    <div className="min-h-screen bg-slate-900 flex justify-center selection:bg-blue-600 selection:text-white font-sans antialiased overflow-hidden">
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.6); } 70% { transform: scale(1.05); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes slideRight { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-12px); } 75% { transform: translateX(12px); } }
        .animate-fade-in-up { animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-pop-in { animation: popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-slide-right { animation: slideRight 0.6s ease-out forwards; }
        .animate-shake { animation: shake 0.4s ease-in-out; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>
      
      {!user ? renderAuth() : renderApp()}
      <Modals />
    </div>
  );
};

export default App;