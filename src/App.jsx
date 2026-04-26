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
  Eye, EyeOff, Edit, LogOut, LogIn, KeyRound, UserPlus, Info, ChevronRight,
  ArrowUpRight, ArrowDownLeft, Clock
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
  
  // Auth States
  const [authMode, setAuthMode] = useState('login'); 
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinSetupStep, setPinSetupStep] = useState(0); 
  const [tempPin, setTempPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // UI States
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
  const [addBankModal, setAddBankModal] = useState({ isOpen: false, bank: 'BCA', number: '', owner: '' });
  const [addBillModal, setAddBillModal] = useState({ isOpen: false, name: '', amount: '', date: '' });
  const [addSavingsModal, setAddSavingsModal] = useState({ isOpen: false, name: '', target: '', current: '' });
  const [addCategoryModal, setAddCategoryModal] = useState({ isOpen: false, type: 'out', name: '' });
  const [editBudgetModal, setEditBudgetModal] = useState({ isOpen: false, category: '', limit: '' });

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
        else setAuthError('Gagal masuk. Cek koneksi atau pendaftaran.');
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

  // --- FINANCIAL LOGIC ---
  const transactions = appData?.transactions || [];
  const bills = appData?.bills || [];
  const savings = appData?.savingsGoals || [];
  const totalIn = transactions.filter(t=>t.type==='in').reduce((a,c)=>a+c.amount,0);
  const totalOut = transactions.filter(t=>t.type==='out').reduce((a,c)=>a+c.amount,0);
  const totalSaldo = totalIn - totalOut;

  const handleSaveTx = async (type) => {
    if (!formData.amount || !formData.title) return;
    setIsSubmitting(true);
    const nt = { id: Date.now(), type, amount: parseInt(formData.amount), title: formData.title, category: formData.category, date: new Date().toISOString().split('T')[0] };
    await updateFirestore({ transactions: [nt, ...transactions] });
    setFormData({ amount: '', title: '', category: appData?.categories[type][0] || 'Lainnya' });
    setIsSubmitting(false); triggerSuccess('Tersimpan!', 'home');
  };

  const handleTransferSubmit = async () => {
    if (!transferForm.amount || !transferForm.account) return;
    setIsSubmitting(true);
    const nt = { id: Date.now(), type: 'out', amount: parseInt(transferForm.amount), title: `Transfer: ${transferForm.bank} (${transferForm.account})`, category: 'Transfer', date: new Date().toISOString().split('T')[0] };
    await updateFirestore({ transactions: [nt, ...transactions] });
    setTransferForm({ bank: 'BCA', account: '', amount: '', note: '' });
    setIsSubmitting(false); triggerSuccess('Transfer Berhasil!', 'home');
  };

  const handlePayBill = async (billId) => {
    const bill = bills.find(b => b.id === billId);
    if (!bill) return;
    setIsSubmitting(true);
    const nt = { id: Date.now(), type: 'out', amount: bill.amount, title: `Bayar: ${bill.name}`, category: 'Tagihan', date: new Date().toISOString().split('T')[0] };
    const updatedBills = bills.filter(b => b.id !== billId);
    await updateFirestore({ transactions: [nt, ...transactions], bills: updatedBills });
    setIsSubmitting(false); triggerSuccess('Tagihan Lunas');
  };

  // --- UI COMPONENTS ---
  const PageHeader = ({ title }) => (
    <div className="flex items-center gap-4 text-white mb-8 pt-4 sticky top-0 z-20 animate-slide-right">
      <button onClick={() => setActiveScreen('home')} className="p-3 bg-white/20 rounded-2xl backdrop-blur-md hover:bg-white/30 transition-all border border-white/10"><ArrowLeft size={22} /></button>
      <h1 className="text-xl font-black tracking-tight">{title}</h1>
    </div>
  );

  const renderAuth = () => (
    <div className="fixed inset-0 bg-[#f4f7fe] flex items-center justify-center p-4 z-[300]">
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[80px]"></div>
      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        <div className="bg-white rounded-[50px] p-10 shadow-[0_30px_60px_rgba(0,0,0,0.1)] border border-white">
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-blue-200"><Wallet size={36} className="text-white" /></div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tighter">FinCatat <span className="text-blue-600">PRO</span></h1>
            <p className="text-slate-400 text-xs font-bold mt-2 uppercase tracking-widest leading-relaxed">Keuangan Anda Aman di Genggaman</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-5">
            {authMode === 'register' && (
              <div className="relative group"><User className="absolute left-4 top-4 text-slate-300 group-focus-within:text-blue-600 transition-colors"/><input type="text" required placeholder="Nama Lengkap" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} className="w-full bg-slate-50 rounded-2xl py-4 pl-12 pr-5 outline-none border-2 border-transparent focus:border-blue-400 transition-all font-bold text-slate-700" /></div>
            )}
            <div className="relative group"><Mail className="absolute left-4 top-4 text-slate-300 group-focus-within:text-blue-600 transition-colors"/><input type="email" required placeholder="Email Anda" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full bg-slate-50 rounded-2xl py-4 pl-12 pr-5 outline-none border-2 border-transparent focus:border-blue-400 transition-all font-bold text-slate-700" /></div>
            <div className="relative group"><KeyRound className="absolute left-4 top-4 text-slate-300 group-focus-within:text-blue-600 transition-colors"/><input type={showPassword ? "text" : "password"} required placeholder="Kata Sandi" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full bg-slate-50 rounded-2xl py-4 pl-12 pr-12 outline-none border-2 border-transparent focus:border-blue-400 transition-all font-bold text-slate-700" /><button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-4 top-4 text-slate-300">{showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}</button></div>
            {authError && <div className="bg-red-50 text-red-500 text-[10px] font-black py-3 px-4 rounded-xl border border-red-100 animate-shake flex items-center gap-2"><AlertCircle size={14}/> {authError}</div>}
            <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-3">
              {isSubmitting ? <Loader2 className="animate-spin" /> : (authMode === 'login' ? <LogIn size={20}/> : <UserPlus size={20}/>)}
              {isSubmitting ? 'MEMPROSES...' : (authMode === 'login' ? 'MASUK KE AKUN' : 'DAFTAR SEKARANG')}
            </button>
          </form>
          <div className="mt-10 text-center"><p className="text-slate-400 text-xs font-bold uppercase">{authMode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}</p><button onClick={() => {setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError('');}} className="mt-2 text-blue-600 font-black text-lg hover:underline underline-offset-4">{authMode === 'login' ? 'Daftar Gratis' : 'Login Sekarang'}</button></div>
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
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6 backdrop-blur-md border border-white/20 shadow-xl"><Lock size={32} /></div>
            <h1 className="text-2xl font-black mb-10 text-center leading-tight tracking-tight">{title}</h1>
            <div className={`flex gap-5 mb-14 ${pinError ? 'animate-shake' : ''}`}>
              {[...Array(6)].map((_, i) => (<div key={i} className={`w-4 h-4 rounded-full transition-all duration-300 ${i < enteredPin.length ? 'bg-white scale-150 shadow-[0_0_15px_white]' : 'bg-white/20'}`} />))}
            </div>
            <div className="grid grid-cols-3 gap-x-10 gap-y-8">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0].map((n, i) => (
                n === '' ? <div key={i}/> : <button key={i} onClick={() => handlePinInput(n.toString())} className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-3xl font-black active:scale-90 border border-white/5 hover:bg-white/20 transition-all">{n}</button>
              ))}
              <button onClick={() => setEnteredPin(enteredPin.slice(0, -1))} className="w-16 h-16 flex items-center justify-center active:scale-90 hover:text-red-300 transition-all"><Delete size={32} /></button>
            </div>
            <button onClick={() => signOut(auth)} className="mt-16 text-white/40 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:text-white transition-all"><LogOut size={14}/> KELUAR AKUN</button>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 flex justify-center bg-slate-900 overflow-hidden font-sans">
        <div className="w-full max-w-md bg-[#f4f7fe] relative h-full shadow-2xl flex flex-col overflow-hidden">
          
          <div className={`absolute top-0 left-0 right-0 transition-all duration-700 ease-in-out z-0 
            ${(activeScreen === 'home' || activeScreen === 'stats' || activeScreen === 'history') ? 'h-[360px] rounded-b-[60px]' : 'h-[180px] rounded-b-[40px]'} 
            bg-gradient-to-b from-blue-600 to-blue-800 shadow-xl shadow-blue-100`}></div>
          
          <div className="flex-1 overflow-y-auto relative z-10 scrollbar-hide pt-12 px-6 pb-28">
            
            {/* SCREEN: HOME */}
            {activeScreen === 'home' && (
              <div className="animate-fade-in-up">
                <div className="flex justify-between items-center text-white mb-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 shadow-lg"><Wallet size={24} /></div>
                    <div><p className="text-[10px] uppercase font-black opacity-60 tracking-widest">{greeting}</p><h1 className="text-xl font-black">{appData?.profile?.name || 'Halo!'}</h1></div>
                  </div>
                  <div onClick={() => setActiveScreen('settings')} className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 cursor-pointer hover:scale-110 transition-all shadow-lg"><User size={22}/></div>
                </div>
                
                <div className="bg-white rounded-[40px] p-8 shadow-2xl shadow-blue-100/50 mb-7 relative overflow-hidden group">
                  <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative z-10">
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full uppercase tracking-widest">Total Saldo</span>
                    <div className="flex items-center gap-3 mt-4"><h2 className="text-3xl font-black text-slate-800 tracking-tighter">{appData?.showBalance ? formatIDR(totalSaldo) : 'Rp ••••••••'}</h2><button onClick={() => updateFirestore({showBalance: !appData?.showBalance})}>{appData?.showBalance ? <EyeOff size={20} className="text-slate-300"/> : <Eye size={20} className="text-slate-300"/>}</button></div>
                    <div className="flex gap-4 mt-6">
                      <div className="flex-1 bg-emerald-50 p-4 rounded-3xl border border-emerald-100"><p className="text-[9px] font-black text-emerald-600 uppercase mb-1 flex items-center gap-1"><ArrowDownLeft size={10}/> Masuk</p><p className="font-black text-slate-700 text-sm">{formatIDR(totalIn)}</p></div>
                      <div className="flex-1 bg-red-50 p-4 rounded-3xl border border-red-100"><p className="text-[9px] font-black text-red-600 uppercase mb-1 flex items-center gap-1"><ArrowUpRight size={10}/> Keluar</p><p className="font-black text-slate-700 text-sm">{formatIDR(totalOut)}</p></div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-y-8 gap-x-3 mt-10">
                  {[
                    { icon: <TrendingUp size={24} className="text-emerald-500" />, label: "MASUK", action: 'form_in', color: 'bg-emerald-50' },
                    { icon: <TrendingDown size={24} className="text-red-500" />, label: "KELUAR", action: 'form_out', color: 'bg-red-50' },
                    { icon: <Send size={24} className="text-blue-500" />, label: "TRANSFER", action: 'transfer', color: 'bg-blue-50' },
                    { icon: <Receipt size={24} className="text-amber-500" />, label: "TAGIHAN", action: 'bills', color: 'bg-amber-50' },
                    { icon: <PiggyBank size={24} className="text-pink-500" />, label: "TABUNGAN", action: 'savings', color: 'bg-pink-50' },
                    { icon: <PieChart size={24} className="text-indigo-500" />, label: "ANGGARAN", action: 'budget', color: 'bg-indigo-50' },
                    { icon: <BarChart3 size={24} className="text-cyan-500" />, label: "LAPORAN", action: 'stats', color: 'bg-cyan-50' },
                    { icon: <Tags size={24} className="text-slate-500" />, label: "KATEGORI", action: 'categories', color: 'bg-slate-50' }
                  ].map((item, i) => (
                    <div key={i} onClick={() => setActiveScreen(item.action)} className="flex flex-col items-center gap-3 cursor-pointer group animate-pop-in" style={{ animationDelay: `${50 + i * 40}ms` }}>
                      <div className={`w-[75px] h-[75px] rounded-[28px] bg-white shadow-xl shadow-blue-100/30 flex items-center justify-center transition-all group-hover:scale-110 group-active:scale-90`}><div className={`w-12 h-12 rounded-2xl ${item.color} flex items-center justify-center shadow-inner`}>{item.icon}</div></div>
                      <span className="text-[9px] font-black text-slate-500 uppercase text-center tracking-tighter leading-none">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SCREEN: FORM MASUK/KELUAR */}
            {(activeScreen === 'form_in' || activeScreen === 'form_out') && (
              <div className="animate-fade-in-up">
                <PageHeader title={activeScreen === 'form_in' ? "Input Pemasukan" : "Input Pengeluaran"} />
                <div className="bg-white p-8 rounded-[45px] shadow-2xl space-y-7 border border-white">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nominal (Rp)</label>
                    <input type="number" placeholder="0" value={formData.amount} onChange={e=>setFormData({...formData, amount: e.target.value})} className={`w-full text-4xl font-black border-b-4 outline-none py-5 bg-transparent ${activeScreen === 'form_in' ? 'text-emerald-500 border-emerald-50 focus:border-emerald-500' : 'text-red-500 border-red-50 focus:border-red-500'} transition-all`}/>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Keterangan Nama</label>
                    <input type="text" placeholder="Misal: Gaji / Beli Pizza" value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} className="w-full text-xl font-black border-b-2 border-slate-50 outline-none py-4 bg-transparent text-slate-800 focus:border-blue-500 transition-all"/>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kategori</label>
                    <div className="flex flex-wrap gap-2.5">
                      {appData?.categories[activeScreen === 'form_in' ? 'in' : 'out'].map(cat => (
                        <button key={cat} onClick={() => setFormData({...formData, category: cat})} className={`px-5 py-2.5 rounded-2xl text-[11px] font-black transition-all ${formData.category === cat ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>{cat.toUpperCase()}</button>
                      ))}
                      <button onClick={()=>setAddCategoryModal({isOpen:true, type: activeScreen === 'form_in' ? 'in' : 'out', name:''})} className="px-5 py-2.5 rounded-2xl text-[11px] font-black border-2 border-dashed border-blue-200 text-blue-400 hover:border-blue-500">+ BARU</button>
                    </div>
                  </div>
                  <button onClick={()=>handleSaveTx(activeScreen === 'form_in' ? 'in' : 'out')} disabled={isSubmitting} className={`w-full py-6 text-white rounded-[28px] font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 ${activeScreen === 'form_in' ? 'bg-emerald-500 shadow-emerald-100' : 'bg-red-500 shadow-red-100'}`}>
                    {isSubmitting ? <Loader2 className="animate-spin"/> : <CheckCircle2 size={24}/>} SIMPAN TRANSAKSI
                  </button>
                </div>
              </div>
            )}

            {/* SCREEN: TRANSFER DANA */}
            {activeScreen === 'transfer' && (
              <div className="animate-fade-in-up">
                <PageHeader title="Kirim Transfer" />
                <div className="bg-white p-8 rounded-[45px] shadow-2xl space-y-7 border border-white">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Bank</label>
                    <div className="relative">
                      <button onClick={() => setIsBankDropdownOpen(!isBankDropdownOpen)} className="w-full text-left py-4 px-1 border-b-2 border-slate-50 font-black text-lg flex justify-between items-center text-slate-700">{transferForm.bank} <ChevronDown size={20} className="text-blue-500"/></button>
                      {isBankDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 bg-white border rounded-[25px] shadow-2xl z-50 mt-2 py-2 max-h-52 overflow-y-auto animate-pop-in">
                          {["BCA", "MANDIRI", "BNI", "BRI", "DANA", "GOPAY", "OVO", "QRIS"].map(b => (
                            <button key={b} onClick={()=>{setTransferForm({...transferForm, bank:b}); setIsBankDropdownOpen(false);}} className="w-full text-left px-6 py-4 hover:bg-blue-50 font-black text-slate-600 text-sm border-b border-slate-50 last:border-0">{b}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nomor Rekening / Tujuan</label>
                    <input type="number" placeholder="0000000000" value={transferForm.account} onChange={e=>setTransferForm({...transferForm, account:e.target.value})} className="w-full text-xl font-black border-b-2 border-slate-50 outline-none py-4 bg-transparent text-slate-800 focus:border-blue-500 transition-all"/>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nominal (Rp)</label>
                    <input type="number" placeholder="0" value={transferForm.amount} onChange={e=>setTransferForm({...transferForm, amount:e.target.value})} className="w-full text-4xl font-black border-b-2 border-blue-50 text-blue-600 outline-none py-4 bg-transparent focus:border-blue-600 transition-all"/>
                  </div>
                  <button onClick={handleTransferSubmit} disabled={isSubmitting} className="w-full py-6 bg-blue-600 text-white rounded-[28px] font-black shadow-xl shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-3">
                    {isSubmitting ? <Loader2 className="animate-spin"/> : <Send size={20}/>} LANJUT KIRIM
                  </button>
                </div>
              </div>
            )}

            {/* SCREEN: TAGIHAN (DENGAN ISI) */}
            {activeScreen === 'bills' && (
              <div className="animate-fade-in-up">
                <PageHeader title="Daftar Tagihan" />
                <div className="space-y-4">
                  {bills.map(b => (
                    <div key={b.id} className="bg-white p-6 rounded-[35px] shadow-xl flex justify-between items-center border border-slate-50 transition-all hover:border-blue-200 group">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform"><Receipt className="text-amber-500" size={26}/></div>
                        <div><p className="font-black text-slate-800 text-lg">{b.name}</p><p className="text-xs font-bold text-blue-500 uppercase tracking-tighter flex items-center gap-1 mt-1"><Clock size={12}/> Jatuh Tempo: {b.date}</p></div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-800 mb-2">{formatIDR(b.amount)}</p>
                        <button onClick={()=>handlePayBill(b.id)} className="px-5 py-2 bg-blue-600 text-white text-[10px] font-black rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all">BAYAR</button>
                      </div>
                    </div>
                  ))}
                  <button onClick={()=>setAddBillModal({isOpen:true, name:'', amount:'', date:''})} className="w-full py-8 border-2 border-dashed border-blue-200 bg-blue-50/20 rounded-[35px] font-black text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-md"><Plus size={24}/> BUAT TAGIHAN BARU</button>
                </div>
              </div>
            )}

            {/* SCREEN: TABUNGAN (DENGAN ISI) */}
            {activeScreen === 'savings' && (
              <div className="animate-fade-in-up">
                <PageHeader title="Target Tabungan" />
                <div className="space-y-6">
                  {savings.map(g => {
                    const progress = Math.min((g.current / g.target) * 100, 100);
                    return (
                      <div key={g.id} className="bg-white p-8 rounded-[45px] shadow-2xl border border-slate-50 space-y-6">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-pink-50 rounded-2xl flex items-center justify-center shadow-inner"><PiggyBank className="text-pink-500" size={28}/></div>
                            <div><h4 className="font-black text-slate-800 text-xl">{g.name}</h4><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">TERKUMPUL {progress.toFixed(0)}%</p></div>
                          </div>
                          <button onClick={async ()=>{const filtered = savings.filter(s=>s.id!==g.id); await updateFirestore({savingsGoals: filtered}); triggerSuccess('Dihapus');}} className="p-2 text-slate-100 hover:text-red-400 transition-colors"><Trash2 size={20}/></button>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between text-xs font-black uppercase tracking-tight">
                            <span className="text-blue-600">{formatIDR(g.current)}</span>
                            <span className="text-slate-400">TARGET: {formatIDR(g.target)}</span>
                          </div>
                          <div className="h-4 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000" style={{width: `${progress}%`}}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={()=>setAddSavingsModal({isOpen:true, name:'', target:'', current:''})} className="w-full py-8 border-2 border-dashed border-pink-200 bg-pink-50/20 rounded-[45px] font-black text-pink-600 hover:bg-pink-50 transition-all flex items-center justify-center gap-3"><Plus size={24}/> BUAT TARGET BARU</button>
                </div>
              </div>
            )}

            {/* SCREEN: STATISTIK (DENGAN ISI) */}
            {activeScreen === 'stats' && (
              <div className="animate-fade-in-up">
                <PageHeader title="Analisis Bulanan" />
                <div className="bg-white rounded-[50px] p-10 shadow-2xl border border-white text-center">
                  <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border-2 border-blue-100"><BarChart3 size={40} className="text-blue-600"/></div>
                  <h4 className="font-black text-slate-400 text-[10px] uppercase tracking-widest mb-3">Pengeluaran Bulan Ini</h4>
                  <div className="text-4xl font-black text-slate-800 mb-10 tracking-tighter">{formatIDR(totalOut)}</div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-10">
                    <div className="bg-slate-50 p-5 rounded-[30px] border border-slate-100 transition-all hover:scale-105"><p className="text-[9px] font-black text-slate-400 uppercase mb-2">Pemasukan</p><p className="font-black text-emerald-600 text-lg">{formatIDR(totalIn)}</p></div>
                    <div className="bg-slate-50 p-5 rounded-[30px] border border-slate-100 transition-all hover:scale-105"><p className="text-[9px] font-black text-slate-400 uppercase mb-2">Transaksi</p><p className="font-black text-blue-600 text-lg">{transactions.length}</p></div>
                  </div>

                  <div className="space-y-6 text-left">
                    <p className="font-black text-[10px] text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-3 mb-6">Top Kategori Pengeluaran</p>
                    {appData?.categories?.out.slice(0,4).map(cat => {
                       const spent = transactions.filter(t=>t.category===cat && t.type==='out').reduce((a,c)=>a+c.amount,0);
                       const pct = totalOut > 0 ? (spent/totalOut)*100 : 0;
                       if (spent === 0) return null;
                       return (
                         <div key={cat} className="space-y-2 animate-fade-in-up">
                            <div className="flex justify-between font-bold text-xs uppercase tracking-tighter"><span>{cat}</span><span className="text-blue-600">{formatIDR(spent)}</span></div>
                            <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{width: `${pct}%`}}></div></div>
                         </div>
                       );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN: RIWAYAT */}
            {activeScreen === 'history' && (
              <div className="animate-fade-in-up">
                <PageHeader title="Riwayat Aktivitas" />
                <div className="bg-white -mx-6 px-6 py-12 rounded-t-[60px] min-h-[700px] shadow-inner space-y-6 border-t-2 border-slate-50">
                  <div className="flex gap-3 mb-4">
                    {['all', 'in', 'out'].map(f => <button key={f} onClick={()=>setHistoryFilter(f)} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] transition-all shadow-sm ${historyFilter === f ? 'bg-slate-900 text-white shadow-xl scale-105' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>{f === 'all' ? 'SEMUA' : f === 'in' ? 'MASUK' : 'KELUAR'}</button>)}
                  </div>
                  {transactions.filter(t => historyFilter === 'all' || t.type === historyFilter).map(t => (
                    <div key={t.id} className="flex justify-between items-center p-5 bg-[#fcfdfe] rounded-[30px] border border-slate-50 hover:border-blue-100 transition-all group relative overflow-hidden">
                      <div className="flex items-center gap-5">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${t.type==='in'?'bg-emerald-50 text-emerald-500':'bg-red-50 text-red-500'}`}>{t.type==='in'?<TrendingUp size={24}/>:<TrendingDown size={24}/>}</div>
                        <div><p className="font-black text-slate-800 text-[15px]">{t.title}</p><p className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter mt-1">{t.date} • {t.category}</p></div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className={`font-black text-lg ${t.type==='in'?'text-emerald-500':'text-slate-800'}`}>{t.type==='in'?'+':'-'}{formatIDR(t.amount)}</p>
                        <button onClick={()=>handleDeleteTx(t.id)} className="p-3 text-slate-100 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18}/></button>
                      </div>
                    </div>
                  ))}
                  {transactions.length === 0 && <div className="text-center py-32 text-slate-300 font-black tracking-widest text-[10px] uppercase">Belum ada transaksi cloud</div>}
                </div>
              </div>
            )}

            {/* SCREEN: PENGATURAN */}
            {activeScreen === 'settings' && (
              <div className="animate-fade-in-up">
                <PageHeader title="Pusat Kendali" />
                <div className="bg-white p-10 rounded-[50px] shadow-2xl space-y-10 border border-white">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[35px] flex items-center justify-center text-white font-black text-4xl uppercase shadow-2xl shadow-blue-200 mb-5 border-4 border-blue-50">{appData?.profile?.name?.substring(0,2) || 'JD'}</div>
                    <h4 className="font-black text-slate-800 text-2xl tracking-tighter">{appData?.profile?.name}</h4>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{user?.email}</p>
                  </div>
                  
                  <div className="space-y-4">
                    <button onClick={()=>setActiveScreen('bank_accounts')} className="w-full text-left p-6 bg-slate-50 rounded-[30px] flex items-center justify-between font-black text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all group border border-transparent hover:border-blue-100">
                      <div className="flex items-center gap-5"><div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-blue-500"><Landmark size={24}/></div> Daftar Rekening</div>
                      <ChevronRight size={20} className="text-slate-300 group-hover:translate-x-2 transition-transform"/>
                    </button>
                    <button onClick={()=>{setPinSetupStep(1); setIsUnlocked(false); setEnteredPin('');}} className="w-full text-left p-6 bg-slate-50 rounded-[30px] flex items-center justify-between font-black text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all group border border-transparent hover:border-blue-100">
                      <div className="flex items-center gap-5"><div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-blue-500"><KeyRound size={24}/></div> Keamanan PIN</div>
                      <ChevronRight size={20} className="text-slate-300 group-hover:translate-x-2 transition-transform"/>
                    </button>
                    <button onClick={()=>setActiveScreen('help_report')} className="w-full text-left p-6 bg-slate-50 rounded-[30px] flex items-center justify-between font-black text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all group border border-transparent hover:border-blue-100">
                      <div className="flex items-center gap-5"><div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-blue-500"><Phone size={24}/></div> Bantuan Support</div>
                      <ChevronRight size={20} className="text-slate-300 group-hover:translate-x-2 transition-transform"/>
                    </button>
                  </div>
                  
                  <div className="pt-8 border-t-2 border-slate-50 space-y-4">
                    <button onClick={()=>setIsUnlocked(false)} className="w-full text-left p-6 bg-red-50 rounded-[30px] flex items-center gap-5 font-black text-red-400 hover:bg-red-500 hover:text-white transition-all border border-red-100 hover:border-transparent"><Lock size={24}/> Kunci Brankas</button>
                    <button onClick={() => signOut(auth)} className="w-full text-left p-6 bg-slate-100 rounded-[30px] flex items-center gap-5 font-black text-slate-400 hover:bg-red-600 hover:text-white transition-all shadow-sm"><LogOut size={24}/> Keluar Akun</button>
                  </div>
                </div>
                <p className="text-center mt-10 text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">FinCatat PRO Enterprise v1.0.4</p>
              </div>
            )}
            
            {/* SCREEN: KATEGORI */}
            {activeScreen === 'categories' && (
              <div className="animate-fade-in-up">
                <PageHeader title="Manajemen Kategori" />
                <div className="bg-white rounded-[50px] p-10 shadow-2xl space-y-12">
                  <div className="space-y-6">
                    <p className="font-black text-[10px] text-slate-400 uppercase tracking-[0.2em] text-center border-b border-slate-50 pb-4">Kategori Pengeluaran</p>
                    <div className="flex flex-wrap justify-center gap-3">
                      {appData?.categories.out.map(c=>(<span key={c} className="px-6 py-3 bg-red-50 text-red-500 rounded-2xl text-xs font-black border border-red-100 uppercase tracking-tight">{c}</span>))}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <p className="font-black text-[10px] text-slate-400 uppercase tracking-[0.2em] text-center border-b border-slate-50 pb-4">Kategori Pemasukan</p>
                    <div className="flex flex-wrap justify-center gap-3">
                      {appData?.categories.in.map(c=>(<span key={c} className="px-6 py-3 bg-emerald-50 text-emerald-600 rounded-2xl text-xs font-black border border-emerald-100 uppercase tracking-tight">{c}</span>))}
                    </div>
                  </div>
                  <button onClick={()=>setAddCategoryModal({isOpen:true, type:'out', name:''})} className="w-full py-6 bg-slate-900 text-white rounded-[30px] font-black text-xs tracking-[0.1em] uppercase shadow-2xl transition-all active:scale-95">+ KATEGORI BARU</button>
                </div>
              </div>
            )}

            {/* SCREEN: ANGGARAN */}
            {activeScreen === 'budget' && (
              <div className="animate-fade-in-up">
                <PageHeader title="Analisis Anggaran" />
                <div className="bg-white rounded-[50px] p-10 shadow-2xl space-y-10">
                  {appData?.categories?.out.map(cat => {
                    const limit = appData?.budgetLimits?.[cat] || 0;
                    const spent = transactions.filter(t=>t.category===cat && t.type==='out').reduce((a,c)=>a+c.amount,0);
                    const pct = limit > 0 ? Math.min((spent/limit)*100, 100) : 0;
                    return (
                      <div key={cat} className="space-y-4">
                        <div className="flex justify-between items-end">
                          <div className="flex items-center gap-3"><h4 className="font-black text-slate-800 text-base">{cat}</h4><button onClick={()=>setEditBudgetModal({isOpen:true, category:cat, limit:limit.toString()})} className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 transition-colors hover:bg-blue-600 hover:text-white"><Edit size={14}/></button></div>
                          <div className="text-right leading-none"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{formatIDR(spent)} TERPAKAI</p><p className="font-black text-slate-700 text-sm tracking-tighter">{limit > 0 ? formatIDR(limit) : 'BELUM DIATUR'}</p></div>
                        </div>
                        <div className="h-4 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                          <div className={`h-full rounded-full transition-all duration-1000 ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-orange-400' : 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]'}`} style={{width: `${pct}%`}}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          {/* BOTTOM NAVIGATION PATEN */}
          <div className="w-full h-24 bg-white/90 backdrop-blur-xl rounded-t-[55px] shadow-[0_-30px_60px_rgba(0,0,0,0.05)] flex justify-between items-end px-10 pb-5 z-50 border-t-2 border-white/50 shrink-0">
            {[
              { id: 'home', icon: <Home size={26}/>, label: 'HOME' },
              { id: 'history', icon: <History size={26}/>, label: 'RIWAYAT' },
              { id: 'stats', icon: <PieChart size={26}/>, label: 'ANALISA' },
              { id: 'settings', icon: <Settings size={26}/>, label: 'AKUN' }
            ].map(nav => (
              <div key={nav.id} onClick={() => setActiveScreen(nav.id)} className={`flex flex-col items-center justify-center cursor-pointer transition-all duration-500 ${activeScreen === nav.id ? 'w-[95px] h-[105px] bg-slate-900 text-white rounded-t-[40px] shadow-2xl -translate-y-6 scale-110' : 'w-16 h-16 text-slate-300 mb-1 hover:text-blue-500'}`}>
                <div className={activeScreen === nav.id ? 'animate-pop-in' : ''}>{nav.icon}</div>
                <span className="text-[7px] font-black mt-2 uppercase tracking-[0.3em]">{nav.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // --- MODALS COLLECTION ---
  const Modals = () => (
    <>
      {showSuccess && <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-max bg-slate-900 text-white px-10 py-7 rounded-[40px] font-black flex items-center gap-5 shadow-[0_40px_80px_rgba(0,0,0,0.4)] z-[1000] animate-pop-in border border-white/10 uppercase tracking-[0.2em] text-xs"><div className="bg-blue-500 rounded-full p-2"><CheckCircle2 size={24}/></div>{successMsg}</div>}
      
      {/* Modal: Tambah Rekening (FIXED) */}
      {addBankModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-8">
           <div className="bg-white rounded-[55px] p-12 w-full max-w-sm animate-pop-in shadow-2xl space-y-7 text-center">
              <h3 className="text-2xl font-black text-slate-800 tracking-tighter">Rekening Baru</h3>
              <div className="space-y-4">
                <select value={addBankModal.bank} onChange={e=>setAddBankModal({...addBankModal, bank:e.target.value})} className="w-full p-5 bg-slate-50 rounded-3xl font-black text-slate-700 outline-none border-2 border-transparent focus:border-blue-200">
                  {["BCA", "MANDIRI", "BNI", "BRI", "PERMATA", "DANA", "GOPAY", "OVO", "LINE BANK"].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <input type="number" placeholder="Nomor Rekening" value={addBankModal.number} onChange={e=>setAddBankModal({...addBankModal, number:e.target.value})} className="w-full p-5 bg-slate-50 rounded-3xl font-black outline-none border-2 border-transparent focus:border-blue-200 text-center"/>
                <input type="text" placeholder="Atas Nama Pemilik" value={addBankModal.owner} onChange={e=>setAddBankModal({...addBankModal, owner:e.target.value})} className="w-full p-5 bg-slate-50 rounded-3xl font-black outline-none border-2 border-transparent focus:border-blue-200 text-center uppercase"/>
              </div>
              <div className="flex gap-4 pt-4">
                 <button onClick={()=>setAddBankModal({isOpen:false})} className="flex-1 py-5 bg-slate-100 rounded-[25px] font-black text-slate-400 text-xs tracking-widest active:scale-95 transition-all">BATAL</button>
                 <button onClick={async ()=>{if(!addBankModal.number)return; setIsSubmitting(true); const nb = [...(appData.bankAccounts || []), {bank: addBankModal.bank, accountNumber: addBankModal.number, accountName: addBankModal.owner}]; await updateFirestore({bankAccounts: nb}); setIsSubmitting(false); setAddBankModal({isOpen:false, bank:'BCA', number:'', owner:''}); triggerSuccess('Rekening Aktif');}} className="flex-1 py-5 bg-blue-600 text-white rounded-[25px] font-black text-xs shadow-xl active:scale-95 transition-all tracking-widest">SIMPAN</button>
              </div>
           </div>
        </div>
      )}

      {/* Modal: Tambah Tagihan (FIXED) */}
      {addBillModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-8">
           <div className="bg-white rounded-[55px] p-12 w-full max-w-sm animate-pop-in shadow-2xl space-y-7 text-center">
              <h3 className="text-2xl font-black text-slate-800 tracking-tighter">Tagihan Baru</h3>
              <div className="space-y-4">
                <input type="text" placeholder="Nama Tagihan (Cth: Listrik)" value={addBillModal.name} onChange={e=>setAddBillModal({...addBillModal, name:e.target.value})} className="w-full p-5 bg-slate-50 rounded-3xl font-black outline-none border-2 border-transparent focus:border-blue-200 text-center"/>
                <input type="number" placeholder="Nominal Rp" value={addBillModal.amount} onChange={e=>setAddBillModal({...addBillModal, amount:e.target.value})} className="w-full p-5 bg-slate-50 rounded-3xl font-black outline-none border-2 border-transparent focus:border-blue-200 text-center"/>
                <input type="date" value={addBillModal.date} onChange={e=>setAddBillModal({...addBillModal, date:e.target.value})} className="w-full p-5 bg-slate-50 rounded-3xl font-black outline-none border-2 border-transparent focus:border-blue-200 text-center uppercase"/>
              </div>
              <div className="flex gap-4">
                 <button onClick={()=>setAddBillModal({isOpen:false})} className="flex-1 py-5 bg-slate-100 rounded-[25px] font-black text-slate-400 text-xs tracking-widest">BATAL</button>
                 <button onClick={async ()=>{if(!addBillModal.name)return; setIsSubmitting(true); const nb = [...(appData.bills || []), {id: Date.now(), name: addBillModal.name, amount: parseInt(addBillModal.amount), date: addBillModal.date}]; await updateFirestore({bills: nb}); setIsSubmitting(false); setAddBillModal({isOpen:false, name:'', amount:'', date:''}); triggerSuccess('Tagihan Dibuat');}} className="flex-1 py-5 bg-amber-500 text-white rounded-[25px] font-black text-xs shadow-xl tracking-widest">SIMPAN</button>
              </div>
           </div>
        </div>
      )}

      {/* Modal: Tambah Tabungan (FIXED) */}
      {addSavingsModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-8">
           <div className="bg-white rounded-[55px] p-12 w-full max-w-sm animate-pop-in shadow-2xl space-y-7 text-center">
              <h3 className="text-2xl font-black text-slate-800 tracking-tighter">Target Menabung</h3>
              <div className="space-y-4">
                <input type="text" placeholder="Tujuan (Cth: Liburan / HP Baru)" value={addSavingsModal.name} onChange={e=>setAddSavingsModal({...addSavingsModal, name:e.target.value})} className="w-full p-5 bg-slate-50 rounded-3xl font-black outline-none border-2 border-transparent focus:border-blue-200 text-center"/>
                <input type="number" placeholder="Target Akhir Rp" value={addSavingsModal.target} onChange={e=>setAddSavingsModal({...addSavingsModal, target:e.target.value})} className="w-full p-5 bg-slate-50 rounded-3xl font-black outline-none border-2 border-transparent focus:border-blue-200 text-center text-emerald-600"/>
                <input type="number" placeholder="Modal Awal Rp" value={addSavingsModal.current} onChange={e=>setAddSavingsModal({...addSavingsModal, current:e.target.value})} className="w-full p-5 bg-slate-50 rounded-3xl font-black outline-none border-2 border-transparent focus:border-blue-200 text-center"/>
              </div>
              <div className="flex gap-4">
                 <button onClick={()=>setAddSavingsModal({isOpen:false})} className="flex-1 py-5 bg-slate-100 rounded-[25px] font-black text-slate-400 text-xs tracking-widest">BATAL</button>
                 <button onClick={async ()=>{if(!addSavingsModal.name)return; setIsSubmitting(true); const ns = [...(appData.savingsGoals || []), {id: Date.now(), name: addSavingsModal.name, target: parseInt(addSavingsModal.target), current: parseInt(addSavingsModal.current || 0)}]; await updateFirestore({savingsGoals: ns}); setIsSubmitting(false); setAddSavingsModal({isOpen:false, name:'', target:'', current:''}); triggerSuccess('Target Dibuat');}} className="flex-1 py-5 bg-pink-600 text-white rounded-[25px] font-black text-xs shadow-xl tracking-widest">MULAI NABUNG</button>
              </div>
           </div>
        </div>
      )}

      {/* Modal: Tambah Kategori */}
      {addCategoryModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-8">
           <div className="bg-white rounded-[55px] p-12 w-full max-w-sm animate-pop-in shadow-2xl space-y-8 text-center border border-white">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Kategori Baru</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{addCategoryModal.type === 'in' ? 'Pemasukan' : 'Pengeluaran'}</p>
              <input type="text" placeholder="Nama Kategori..." value={addCategoryModal.name} onChange={e=>setAddCategoryModal({...addCategoryModal, name:e.target.value})} className="w-full p-6 bg-slate-50 rounded-[30px] font-black outline-none text-center focus:border-blue-500 border-b-4 border-slate-100 transition-all text-lg"/>
              <div className="flex gap-4 pt-4">
                 <button onClick={()=>setAddCategoryModal({isOpen:false})} className="flex-1 py-5 bg-slate-100 rounded-[25px] font-black text-slate-400 text-[10px] tracking-widest">BATAL</button>
                 <button onClick={async ()=>{if(!addCategoryModal.name)return; setIsSubmitting(true); const updated = {...appData.categories}; updated[addCategoryModal.type] = [...updated[addCategoryModal.type], addCategoryModal.name]; await updateFirestore({categories: updated}); setIsSubmitting(false); setAddCategoryModal({isOpen:false, name:''}); triggerSuccess('Kategori Aktif');}} className="flex-1 py-5 bg-blue-600 text-white rounded-[25px] font-black text-[10px] tracking-widest shadow-xl shadow-blue-100">SIMPAN</button>
              </div>
           </div>
        </div>
      )}

      {/* Modal: Set Anggaran */}
      {editBudgetModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-8">
           <div className="bg-white rounded-[55px] p-12 w-full max-w-sm animate-pop-in shadow-2xl text-center">
              <h3 className="text-2xl font-black text-slate-800 mb-2">Pasang Batas</h3>
              <p className="text-blue-600 font-black text-[10px] mb-8 uppercase tracking-[0.3em]">{editBudgetModal.category}</p>
              <input type="number" placeholder="Nominal Batas Rp" value={editBudgetModal.limit} onChange={e=>setEditBudgetModal({...editBudgetModal, limit:e.target.value})} className="w-full text-3xl font-black border-b-4 border-slate-100 outline-none mb-12 text-center text-slate-700 focus:border-blue-500 transition-all py-4"/>
              <div className="flex gap-4">
                 <button onClick={()=>setEditBudgetModal({isOpen:false,category:'',limit:''})} className="flex-1 py-5 bg-slate-50 rounded-[25px] font-black text-slate-400 text-[10px] tracking-widest">BATAL</button>
                 <button onClick={async ()=>{setIsSubmitting(true); await updateFirestore({budgetLimits:{...appData.budgetLimits, [editBudgetModal.category]:parseInt(editBudgetModal.limit)}}); setIsSubmitting(false); setEditBudgetModal({isOpen:false,category:'',limit:''}); triggerSuccess('Batas Disimpan');}} className="flex-1 py-5 bg-slate-900 text-white rounded-[25px] font-black text-[10px] tracking-widest shadow-xl">TERAPKAN</button>
              </div>
           </div>
        </div>
      )}

      {/* Modal: Konfirmasi */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[2000] flex items-center justify-center p-8">
           <div className="bg-white rounded-[60px] p-12 w-full max-w-sm animate-pop-in text-center shadow-[0_50px_100px_rgba(0,0,0,0.5)] border border-white">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 ${confirmModal.isDanger ? 'bg-red-50 text-red-500 shadow-xl shadow-red-50 border border-red-100' : 'bg-blue-50 text-blue-500 shadow-xl shadow-blue-50 border border-blue-100'}`}><AlertCircle size={48} /></div>
              <h3 className="text-2xl font-black text-slate-800 mb-4 tracking-tighter leading-none">{confirmModal.title}</h3>
              <p className="text-slate-400 mb-12 font-bold text-sm leading-relaxed uppercase tracking-tighter">{confirmModal.message}</p>
              <div className="flex gap-5"><button onClick={() => setConfirmModal({isOpen: false})} className="flex-1 py-6 rounded-[30px] bg-slate-100 text-slate-400 font-black text-[10px] tracking-[0.2em] active:scale-95 transition-all">BATAL</button><button onClick={confirmModal.onConfirm} className={`flex-1 py-6 rounded-[30px] text-white font-black text-[10px] tracking-[0.2em] shadow-xl active:scale-95 transition-all ${confirmModal.isDanger ? 'bg-red-600 shadow-red-200' : 'bg-blue-600 shadow-blue-200'}`}>LANJUTKAN</button></div>
           </div>
        </div>
      )}
    </>
  );

  if (isLoading) return <div className="fixed inset-0 bg-[#f8faff] flex flex-col items-center justify-center gap-8 text-blue-600 z-[600]"><div className="relative scale-150"><Loader2 className="animate-spin text-blue-600" size={64} /><Wallet className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-200" size={24}/></div><p className="font-black text-[10px] animate-pulse uppercase tracking-[0.6em] text-blue-300 ml-2">Secure Syncing...</p></div>;
  
  return (
    <div className="min-h-screen bg-slate-900 flex justify-center selection:bg-blue-600 selection:text-white font-sans antialiased overflow-hidden">
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(50px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.6); } 70% { opacity: 1; transform: scale(1.05); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes slideRight { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-15px); } 75% { transform: translateX(15px); } }
        .animate-fade-in-up { animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-pop-in { animation: popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-slide-right { animation: slideRight 0.6s ease-out forwards; }
        .animate-shake { animation: shake 0.4s ease-in-out; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
      
      {!user ? renderAuth() : renderApp()}
      <Modals />
    </div>
  );
};

export default App;