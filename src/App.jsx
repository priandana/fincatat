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
  
  // Auth States
  const [authMode, setAuthMode] = useState('login'); 
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // PIN Security States
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinSetupStep, setPinSetupStep] = useState(0); 
  const [tempPin, setTempPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // General UI States
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDanger: false });
  const [greeting, setGreeting] = useState('');
  
  // Financial Form States
  const [formData, setFormData] = useState({ amount: '', title: '', category: 'Lainnya' });
  const [transferData, setTransferData] = useState({ bank: 'BCA', account: '', amount: '' });
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [editBudgetModal, setEditBudgetModal] = useState({ isOpen: false, category: '', limit: '' });

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        try { await signInWithCustomToken(auth, __initial_auth_token); } catch (e) {}
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setIsLoading(false);
        setIsUnlocked(false);
      }
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

  const handleAuth = async (e) => {
    e.preventDefault(); setIsSubmitting(true); setAuthError('');
    try {
      if (authMode === 'register') {
        await createUserWithEmailAndPassword(auth, authForm.email, authForm.password);
      } else {
        await signInWithEmailAndPassword(auth, authForm.email, authForm.password);
      }
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setAuthError('Email atau Password salah.');
      } else if (err.code === 'auth/email-already-in-use') {
        setAuthError('Email ini sudah terdaftar. Silakan login.');
      } else {
        setAuthError('Gagal masuk. Cek koneksi Anda.');
      }
    } finally { setIsSubmitting(false); }
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
        } else if (pinSetupStep === 1) { 
          setTempPin(p); setEnteredPin(''); setPinSetupStep(2); 
        } else if (pinSetupStep === 2) {
          if (p === tempPin) { 
            updateFirestore({ pin: p }); 
            setIsUnlocked(true); setPinSetupStep(0); setEnteredPin(''); 
            triggerSuccess('PIN Berhasil Disimpan');
          } else { 
            setPinError(true); 
            setTimeout(() => { setPinError(false); setEnteredPin(''); setTempPin(''); setPinSetupStep(1); }, 500); 
          }
        }
      }, 200);
    }
  };

  const triggerSuccess = (m, s = null) => {
    setSuccessMsg(m); setShowSuccess(true);
    setTimeout(() => { setShowSuccess(false); if(s) setActiveScreen(s); }, 1500);
  };

  const formatIDR = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

  const handleSaveTx = async (type) => {
    if (!formData.amount || !formData.title) return;
    setIsSubmitting(true);
    const nt = { id: Date.now(), type, amount: parseInt(formData.amount), title: formData.title, category: formData.category, date: new Date().toISOString().split('T')[0] };
    await updateFirestore({ transactions: [nt, ...(appData?.transactions || [])] });
    setFormData({ amount: '', title: '', category: appData?.categories[type][0] || 'Lainnya' });
    setIsSubmitting(false); triggerSuccess('Transaksi Tersimpan!', 'home');
  };

  const handlePayBill = async (bill) => {
    setIsSubmitting(true);
    const nt = { id: Date.now(), type: 'out', amount: bill.amount, title: `Bayar: ${bill.name}`, category: 'Tagihan', date: new Date().toISOString().split('T')[0] };
    const ub = appData.bills.map(b => b.id === bill.id ? { ...b, isPaid: true } : b);
    await updateFirestore({ transactions: [nt, ...appData.transactions], bills: ub });
    setIsSubmitting(false); triggerSuccess('Tagihan Dibayar!', 'home');
  };

  // --- UI COMPONENTS ---
  const PageHeader = ({ title }) => (
    <div className="flex items-center gap-4 text-white mb-8 pt-4 sticky top-0 z-20 animate-slide-right">
      <button onClick={() => setActiveScreen('home')} className="p-2 bg-white/20 rounded-xl backdrop-blur-sm hover:bg-white/30 transition-all"><ArrowLeft size={24} /></button>
      <h1 className="text-xl font-bold tracking-wide">{title}</h1>
    </div>
  );

  const renderAuth = () => (
    <div className="fixed inset-0 bg-[#f2f6fa] flex items-center justify-center p-4 z-[300]">
      <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-[#20b2aa]/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        <div className="bg-white/80 backdrop-blur-2xl rounded-[45px] p-8 shadow-2xl border border-white/50">
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-br from-[#20b2aa] to-[#147a75] rounded-3xl flex items-center justify-center mb-5 shadow-lg shadow-[#20b2aa]/30"><Wallet size={36} className="text-white" /></div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">FinCatat <span className="text-[#20b2aa]">PRO</span></h1>
            <p className="text-slate-400 text-sm font-medium mt-1">{authMode === 'login' ? 'Kelola uang jadi lebih asyik' : 'Mulai hemat hari ini'}</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-5">
            {authMode === 'register' && (
              <div className="relative"><User className="absolute left-4 top-4 text-slate-300"/><input type="text" required placeholder="Nama Lengkap" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} className="w-full bg-[#f8fafc] rounded-2xl py-4 pl-12 pr-5 outline-none focus:border-[#20b2aa] border-2 border-transparent transition-all font-bold" /></div>
            )}
            <div className="relative"><Mail className="absolute left-4 top-4 text-slate-300"/><input type="email" required placeholder="Email Anda" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full bg-[#f8fafc] rounded-2xl py-4 pl-12 pr-5 outline-none focus:border-[#20b2aa] border-2 border-transparent transition-all font-bold" /></div>
            <div className="relative"><KeyRound className="absolute left-4 top-4 text-slate-300"/><input type={showPassword ? "text" : "password"} required placeholder="Kata Sandi" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full bg-[#f8fafc] rounded-2xl py-4 pl-12 pr-12 outline-none focus:border-[#20b2aa] border-2 border-transparent transition-all font-bold" /><button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-4 top-4 text-slate-300">{showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}</button></div>
            {authError && <div className="bg-red-50 text-red-500 text-[10px] font-bold py-2 px-3 rounded-lg border border-red-100 animate-shake">{authError}</div>}
            <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-[#20b2aa] hover:bg-[#1b9a94] text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">{isSubmitting ? <Loader2 className="animate-spin" /> : (authMode === 'login' ? 'Masuk' : 'Daftar')}</button>
          </form>
          <div className="mt-10 text-center"><p className="text-slate-400 text-sm">{authMode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}</p><button onClick={() => {setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError('');}} className="mt-2 text-[#20b2aa] font-black text-lg">{authMode === 'login' ? 'Daftar Gratis' : 'Login Sekarang'}</button></div>
        </div>
      </div>
    </div>
  );

  const renderApp = () => {
    if (!isUnlocked) {
      const title = pinSetupStep === 1 ? "Buat PIN Keamanan" : pinSetupStep === 2 ? "Konfirmasi PIN Baru" : "Masukkan PIN Brankas";
      return (
        <div className="fixed inset-0 bg-gradient-to-b from-[#20b2aa] to-[#147a75] flex items-center justify-center p-8 text-white z-[400]">
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
            <button onClick={() => signOut(auth)} className="mt-12 text-white/50 text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:text-white"><LogOut size={14}/> Keluar Akun</button>
          </div>
        </div>
      );
    }

    const totalIn = appData?.transactions?.filter(t=>t.type==='in').reduce((a,c)=>a+c.amount,0) || 0;
    const totalOut = appData?.transactions?.filter(t=>t.type==='out').reduce((a,c)=>a+c.amount,0) || 0;
    const totalSaldo = totalIn - totalOut;

    return (
      <div className="fixed inset-0 flex justify-center bg-slate-900 overflow-hidden">
        <div className="w-full max-w-md bg-[#f2f6fa] relative h-full shadow-2xl flex flex-col overflow-hidden">
          
          <div className={`absolute top-0 left-0 right-0 transition-all duration-700 ease-in-out z-0 ${(activeScreen === 'home' || activeScreen === 'stats' || activeScreen === 'history') ? 'h-[320px] rounded-b-[50px]' : 'h-[180px] rounded-b-[30px]'} bg-gradient-to-b from-[#20b2aa] to-[#48d1cc]`}></div>
          
          <div className="flex-1 overflow-y-auto relative z-10 scrollbar-hide pt-12 px-5 pb-24">
            {activeScreen === 'home' && (
              <div className="animate-fade-in-up">
                <div className="flex justify-between items-center text-white mb-10">
                  <div className="flex items-center gap-3"><Wallet size={28} className="text-white" /><div className="leading-tight"><p className="text-[10px] uppercase font-bold opacity-80">{greeting}</p><h1 className="text-lg font-black">{appData?.profile?.name || 'Pengguna'}</h1></div></div>
                  <div onClick={() => setActiveScreen('settings')} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 cursor-pointer shadow-lg hover:scale-110 transition-all"><User size={20} className="text-white"/></div>
                </div>
                <div className="bg-white/95 backdrop-blur-sm rounded-[32px] p-6 shadow-xl mb-6 flex justify-between items-center transition-all hover:scale-[1.02]">
                  <div><span className="text-[10px] font-bold text-[#20b2aa] bg-[#e0f7f6] px-2 py-1 rounded-md uppercase tracking-wider">Saldo Tersedia</span><div className="flex items-center gap-3 mt-2"><h2 className="text-3xl font-black text-slate-800">{appData?.showBalance ? formatIDR(totalSaldo) : 'Rp ••••••••'}</h2><button onClick={() => updateFirestore({showBalance: !appData?.showBalance})}>{appData?.showBalance ? <EyeOff size={18} className="text-slate-300"/> : <Eye size={18} className="text-slate-300"/>}</button></div><p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Akun Cloud Aktif</p></div>
                  <div className="w-14 h-14 rounded-full bg-[#e0f7f6] flex items-center justify-center shadow-inner"><Wallet size={28} className="text-[#20b2aa]" fill="currentColor" /></div>
                </div>
                <div className="bg-gradient-to-r from-[#ff6b6b] to-[#ff4757] rounded-[32px] p-5 shadow-[0_15px_30px_rgba(255,107,107,0.3)] mb-10 text-white flex items-center gap-5 relative overflow-hidden">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20 shadow-lg"><TrendingDown size={28} /></div>
                  <div className="z-10"><h3 className="text-lg font-bold">Total Pengeluaran</h3><p className="text-xs text-red-100 mb-1">{appData?.transactions?.filter(t=>t.type==='out').length} Transaksi</p><p className="text-2xl font-black tracking-wider">{appData?.showBalance ? formatIDR(totalOut) : 'Rp ••••••••'}</p></div>
                </div>
                <div className="grid grid-cols-4 gap-y-6 gap-x-2">
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
                    <div key={i} onClick={() => setActiveScreen(item.action)} className="flex flex-col items-center gap-3 cursor-pointer group animate-pop-in" style={{ animationDelay: `${100 + i * 40}ms` }}>
                      <div className="w-[70px] h-[70px] rounded-[24px] bg-white shadow-md flex items-center justify-center transition-all group-hover:scale-110 active:scale-90 group-hover:shadow-lg">{item.icon}</div>
                      <span className="text-[9px] font-black text-slate-500 uppercase text-center leading-tight">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(activeScreen === 'form_in' || activeScreen === 'form_out') && (
              <div className="animate-fade-in-up">
                <PageHeader title={activeScreen === 'form_in' ? "Tambah Pemasukan" : "Tambah Pengeluaran"} />
                <div className="bg-white p-6 rounded-[32px] shadow-xl space-y-6">
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nominal (Rp)</label>
                    <input type="number" placeholder="0" value={formData.amount} onChange={e=>setFormData({...formData, amount: e.target.value})} className={`w-full text-4xl font-black border-b-2 outline-none py-4 bg-transparent ${activeScreen === 'form_in' ? 'border-emerald-100 text-emerald-500' : 'border-red-100 text-red-500'}`}/>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Keterangan</label>
                    <input type="text" placeholder="Misal: Gaji / Belanja" value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} className="w-full text-lg border-b border-slate-100 outline-none py-3 font-bold text-slate-700"/>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Kategori</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {appData?.categories[activeScreen === 'form_in' ? 'in' : 'out'].map(cat => (
                        <button key={cat} onClick={() => setFormData({...formData, category: cat})} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${formData.category === cat ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>{cat}</button>
                      ))}
                    </div>
                  </div>
                  <button onClick={()=>handleSaveTx(activeScreen === 'form_in' ? 'in' : 'out')} disabled={isSubmitting} className={`w-full py-5 text-white rounded-3xl font-black shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${activeScreen === 'form_in' ? 'bg-emerald-500 shadow-emerald-200' : 'bg-red-500 shadow-red-200'}`}>
                    {isSubmitting ? <Loader2 className="animate-spin"/> : <PlusCircle size={20}/>}
                    {isSubmitting ? 'Memproses...' : 'Simpan Transaksi'}
                  </button>
                </div>
              </div>
            )}

            {activeScreen === 'transfer' && (
              <div className="animate-fade-in-up">
                <PageHeader title="Transfer Dana" />
                <div className="bg-white p-6 rounded-[32px] shadow-xl space-y-6">
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Bank</label>
                    <div className="relative" ref={dropdownRef}>
                      <button onClick={() => setIsBankDropdownOpen(!isBankDropdownOpen)} className="w-full text-left py-3 border-b border-slate-100 font-bold flex justify-between items-center uppercase">{transferData.bank} <ChevronDown size={20}/></button>
                      {isBankDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 bg-white border rounded-xl shadow-2xl z-50 max-h-40 overflow-y-auto">
                          {["BCA", "Mandiri", "BNI", "BRI", "Gopay", "OVO", "Dana"].map(b => (
                            <button key={b} onClick={()=>{setTransferData({...transferData, bank:b}); setIsBankDropdownOpen(false);}} className="w-full text-left p-3 hover:bg-slate-50 font-bold border-b uppercase">{b}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">No. Rekening</label>
                    <input type="number" placeholder="0000000000" value={transferData.account} onChange={e=>setTransferData({...transferData, account:e.target.value})} className="w-full text-lg border-b border-slate-100 outline-none py-3 font-bold text-slate-700"/>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nominal (Rp)</label>
                    <input type="number" placeholder="0" value={transferData.amount} onChange={e=>setTransferData({...transferData, amount:e.target.value})} className="w-full text-3xl font-black border-b-2 border-blue-100 text-blue-500 outline-none py-4 bg-transparent"/>
                  </div>
                  <button onClick={()=>handleSaveTx('out')} disabled={isSubmitting} className="w-full py-5 bg-blue-500 text-white rounded-3xl font-black shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2">Kirim Dana</button>
                </div>
              </div>
            )}

            {activeScreen === 'budget' && (
              <div className="animate-fade-in-up">
                <PageHeader title="Anggaran Bulanan" />
                <div className="bg-white p-6 rounded-[32px] shadow-xl space-y-6">
                  {appData?.categories?.out.map(cat => {
                    const limit = appData?.budgetLimits?.[cat] || 0;
                    const spent = appData?.transactions?.filter(t=>t.category===cat && t.type==='out').reduce((a,c)=>a+c.amount,0) || 0;
                    const pct = limit > 0 ? Math.min((spent/limit)*100, 100) : 0;
                    return (
                      <div key={cat} className="space-y-2">
                        <div className="flex justify-between items-end">
                          <div><h4 className="font-bold text-slate-800 flex items-center gap-2">{cat} <Edit size={12} className="text-[#20b2aa] cursor-pointer" onClick={()=>setEditBudgetModal({isOpen:true, category:cat, limit:limit.toString()})}/></h4><p className="text-[10px] font-bold text-slate-400 uppercase">{formatIDR(spent)} TERPAKAI</p></div>
                          <div className="text-right"><p className="text-[10px] font-black text-slate-400 uppercase">BATAS</p><p className="font-black text-slate-800">{limit > 0 ? formatIDR(limit) : 'BELUM DIATUR'}</p></div>
                        </div>
                        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                          <div className={`h-full rounded-full transition-all duration-1000 ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-orange-400' : 'bg-[#20b2aa]'}`} style={{width: `${pct}%`}}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeScreen === 'history' && (
              <div className="animate-fade-in-up">
                <PageHeader title="Riwayat" />
                <div className="bg-white -mx-5 px-6 py-8 rounded-t-[45px] min-h-[600px] shadow-inner space-y-4">
                  <div className="flex gap-2 mb-4">
                    {['all', 'in', 'out'].map(f => <button key={f} onClick={()=>setHistoryFilter(f)} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${historyFilter === f ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>{f === 'all' ? 'Semua' : f === 'in' ? 'Masuk' : 'Keluar'}</button>)}
                  </div>
                  {appData?.transactions?.filter(t => historyFilter === 'all' || t.type === historyFilter).map(t => (
                    <div key={t.id} className="flex justify-between items-center p-4 bg-[#f8fafc] rounded-[24px] border border-white hover:border-slate-200 transition-all group">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.type==='in'?'bg-emerald-50 text-emerald-500':'bg-red-50 text-red-500'}`}>{t.type==='in'?<TrendingUp size={20}/>:<TrendingDown size={20}/>}</div>
                        <div><p className="font-black text-slate-800 text-sm">{t.title}</p><p className="text-[10px] font-bold text-slate-400">{t.date} • {t.category}</p></div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className={`font-black ${t.type==='in'?'text-emerald-500':'text-slate-800'}`}>{t.type==='in'?'+':'-'}{formatIDR(t.amount)}</p>
                        <button onClick={()=>setConfirmModal({isOpen:true, title:'Hapus?', message:'Hapus transaksi ini?', isDanger:true, onConfirm: async ()=>{setIsSubmitting(true); await updateFirestore({transactions: appData.transactions.filter(tx=>tx.id!==t.id)}); setIsSubmitting(false); triggerSuccess('Dihapus!', 'history');}})} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeScreen === 'settings' && (
              <div className="animate-fade-in-up">
                <PageHeader title="Profil Saya" />
                <div className="bg-white p-6 rounded-[32px] shadow-xl space-y-6">
                  <div className="flex items-center gap-4 border-b pb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#20b2aa] to-[#147a75] rounded-2xl flex items-center justify-center text-white font-black text-2xl uppercase shadow-lg">{appData?.profile?.name?.substring(0,2) || 'JD'}</div>
                    <div><h4 className="font-black text-slate-800 text-lg">{appData?.profile?.name}</h4><p className="text-xs text-slate-400 font-bold">{user?.email}</p></div>
                  </div>
                  <button onClick={()=>setActiveScreen('bank_accounts')} className="w-full text-left p-4 bg-[#f8fafc] rounded-2xl flex items-center gap-4 font-bold text-slate-600 hover:bg-slate-100 transition-all"><Landmark size={20} className="text-[#20b2aa]"/> Rekening Bank</button>
                  
                  {/* TOMBOL GANTI PIN */}
                  <button onClick={()=>{setPinSetupStep(1); setIsUnlocked(false); setEnteredPin('');}} className="w-full text-left p-4 bg-[#f8fafc] rounded-2xl flex items-center gap-4 font-bold text-slate-600 hover:bg-slate-100 transition-all"><KeyRound size={20} className="text-[#20b2aa]"/> Ganti PIN Keamanan</button>
                  
                  <button onClick={()=>setActiveScreen('help_report')} className="w-full text-left p-4 bg-[#f8fafc] rounded-2xl flex items-center gap-4 font-bold text-slate-600 hover:bg-slate-100 transition-all"><Phone size={20} className="text-[#20b2aa]"/> Bantuan & Laporan</button>
                  
                  <div className="pt-4 border-t border-slate-50 space-y-3">
                    <button onClick={()=>setIsUnlocked(false)} className="w-full text-left p-4 bg-[#fff1f2] rounded-2xl flex items-center gap-4 font-bold text-red-400 hover:bg-red-100 transition-all"><Lock size={20}/> Kunci Aplikasi</button>
                    <button onClick={() => signOut(auth)} className="w-full text-left p-4 bg-red-50 rounded-2xl flex items-center gap-4 font-black text-red-600 hover:bg-red-600 hover:text-white transition-all"><LogOut size={20}/> Keluar Akun</button>
                  </div>
                </div>
              </div>
            )}
            
            {activeScreen === 'bills' && <div className="animate-fade-in-up"><PageHeader title="Tagihan"/><div className="space-y-4">{(appData?.bills || []).map(b=>(<div key={b.id} className="bg-white p-5 rounded-2xl flex justify-between shadow-md"><div><p className="font-bold">{b.name}</p><p className="text-xs text-slate-400">{formatIDR(b.amount)}</p></div><button onClick={()=>handlePayBill(b)} className="px-4 py-1.5 bg-[#20b2aa] text-white text-xs font-bold rounded-lg">Bayar</button></div>))}</div></div>}
            {activeScreen === 'savings' && <div className="animate-fade-in-up"><PageHeader title="Tabungan"/><div className="bg-white p-6 rounded-3xl shadow-xl space-y-4">{(appData?.savingsGoals || []).map(g => (<div key={g.id} className="space-y-2"><div className="flex justify-between font-bold"><span>{g.name}</span><span>{formatIDR(g.current)}</span></div><div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-pink-400" style={{width: `${(g.current/g.target)*100}%`}}></div></div></div>))}</div></div>}
            {activeScreen === 'stats' && <div className="animate-fade-in-up"><PageHeader title="Statistik"/><div className="bg-white p-6 rounded-3xl shadow-xl"><h4 className="font-bold mb-4 uppercase text-xs text-slate-400 tracking-widest">Pengeluaran Total</h4><div className="text-4xl font-black text-slate-800 mb-2">{formatIDR(totalOut)}</div></div></div>}
            {activeScreen === 'categories' && <div className="animate-fade-in-up"><PageHeader title="Kategori"/><div className="bg-white p-6 rounded-3xl shadow-xl space-y-4"><div><p className="font-black text-xs text-slate-400 uppercase mb-2">Pengeluaran</p><div className="flex flex-wrap gap-2">{appData?.categories.out.map(c=>(<span key={c} className="px-3 py-1 bg-red-50 text-red-500 rounded-lg text-xs font-bold">{c}</span>))}</div></div></div></div>}
            {activeScreen === 'bank_accounts' && <div className="animate-fade-in-up"><PageHeader title="Rekening"/><div className="space-y-4">{(appData?.bankAccounts || []).map(b=>(<div key={b.id} className="bg-white p-4 rounded-xl shadow flex items-center gap-3"><Landmark className="text-blue-500"/><div><p className="font-bold">{b.bank}</p><p className="text-xs">{b.accountNumber}</p></div></div>))}<button className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl font-bold text-slate-400">+ Rekening Baru</button></div></div>}
            {activeScreen === 'help_report' && <div className="animate-fade-in-up"><PageHeader title="Bantuan"/><div className="bg-white p-6 rounded-3xl shadow-xl space-y-4"><div className="flex items-center gap-4 p-4 bg-green-50 rounded-2xl"><MessageCircle className="text-green-500"/><div><p className="font-bold">WhatsApp Support</p><p className="text-xs text-slate-400">Respon dalam 5 menit</p></div></div><div className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl"><Mail className="text-blue-500"/><div><p className="font-bold">Email Kami</p><p className="text-xs text-slate-400">support@fincatat.com</p></div></div></div></div>}

          </div>

          <div className="w-full h-20 bg-white/90 backdrop-blur-md rounded-t-[30px] shadow-[0_-10px_25px_rgba(0,0,0,0.05)] flex justify-between items-end px-4 pb-2 z-50 border-t border-white shrink-0">
            {[
              { id: 'home', icon: <Home size={24}/>, label: 'HOME' },
              { id: 'history', icon: <History size={24}/>, label: 'RIWAYAT' },
              { id: 'stats', icon: <PieChart size={24}/>, label: 'STATISTIK' },
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

  return (
    <div className="min-h-screen bg-slate-900 flex justify-center selection:bg-[#20b2aa] selection:text-white font-sans">
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.5); } 60% { opacity: 1; transform: scale(1.1); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes slideRight { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-10px); } 75% { transform: translateX(10px); } }
        .animate-fade-in-up { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-pop-in { animation: popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-slide-right { animation: slideRight 0.5s ease-out forwards; }
        .animate-shake { animation: shake 0.4s ease-in-out; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
      
      {showSuccess && <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-max bg-slate-800/95 text-white px-6 py-4 rounded-full font-bold flex items-center gap-3 shadow-2xl z-[500] animate-pop-in"><CheckCircle2 className="text-emerald-400" size={20}/>{successMsg}</div>}
      
      {editBudgetModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[500] flex items-center justify-center p-5">
           <div className="bg-white rounded-[40px] p-8 w-full max-w-sm animate-pop-in">
              <h3 className="text-xl font-black text-slate-800 mb-2">Set Anggaran</h3>
              <p className="text-[#20b2aa] font-bold mb-6 uppercase tracking-wider">{editBudgetModal.category}</p>
              <input type="number" placeholder="Batas Nominal Rp" value={editBudgetModal.limit} onChange={e=>setEditBudgetModal({...editBudgetModal, limit:e.target.value})} className="w-full text-2xl font-black border-b-2 border-slate-100 outline-none mb-8 text-center text-slate-700"/>
              <div className="flex gap-3">
                 <button onClick={()=>setEditBudgetModal({isOpen:false,category:'',limit:''})} className="flex-1 py-4 bg-slate-100 rounded-2xl font-bold">Batal</button>
                 <button onClick={async ()=>{setIsSubmitting(true); await updateFirestore({budgetLimits:{...appData.budgetLimits, [editBudgetModal.category]:parseInt(editBudgetModal.limit)}}); setIsSubmitting(false); setEditBudgetModal({isOpen:false,category:'',limit:''}); triggerSuccess('Batas Disimpan');}} className="flex-1 py-4 bg-[#20b2aa] text-white rounded-2xl font-black shadow-lg">Simpan</button>
              </div>
           </div>
        </div>
      )}

      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[500] flex items-center justify-center p-5">
           <div className="bg-white rounded-[45px] p-8 w-full max-w-sm animate-pop-in text-center shadow-2xl">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ${confirmModal.isDanger ? 'bg-red-100 text-red-500 shadow-lg shadow-red-100' : 'bg-orange-100 text-orange-500 shadow-lg shadow-orange-100'}`}><AlertCircle size={40} /></div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">{confirmModal.title}</h3>
              <p className="text-slate-400 mb-8 font-semibold text-sm">{confirmModal.message}</p>
              <div className="flex gap-4"><button onClick={() => setConfirmModal({isOpen: false})} className="flex-1 py-4 rounded-2xl bg-slate-50 text-slate-400 font-bold active:scale-95 transition-all">Batal</button><button onClick={confirmModal.onConfirm} className={`flex-1 py-4 rounded-2xl text-white font-black shadow-lg active:scale-95 transition-all ${confirmModal.isDanger ? 'bg-red-500 shadow-red-200' : 'bg-[#20b2aa] shadow-[#20b2aa]/20'}`}>Lanjutkan</button></div>
           </div>
        </div>
      )}

      {isLoading ? (
        <div className="fixed inset-0 bg-[#f2f6fa] flex flex-col items-center justify-center gap-4 text-[#20b2aa] z-[600]"><Loader2 className="animate-spin" size={48} /><p className="font-black text-xs animate-pulse uppercase tracking-widest">Sinkronisasi Cloud...</p></div>
      ) : (
        !user ? renderAuth() : renderApp()
      )}
    </div>
  );
};

export default App;