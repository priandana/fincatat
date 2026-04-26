import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { 
  Wallet, User, TrendingDown, TrendingUp, CreditCard, Receipt, 
  PieChart, BarChart3, PiggyBank, Tags, Home, History, Settings,
  ArrowLeft, PlusCircle, CheckCircle2, AlertCircle, Landmark, Phone,
  Send, Calendar, Shield, Plane, Target, Plus, Loader2, ChevronDown, 
  Lock, Delete, X, MessageCircle, Mail, FileQuestion, Trash2, Edit3, Filter,
  Eye, EyeOff, Edit
} from 'lucide-react';

// --- FIREBASE INITIALIZATION ---
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
const appId = 'fincatat-app';

// Default Data
const DEFAULT_DATA = {
  pin: null, 
  profile: { name: 'Nama Pengguna' },
  showBalance: true, // Default tampil saldo
  transactions: [],
  bills: [],
  savingsGoals: [
    { id: 1, name: 'Dana Darurat', target: 20000000, current: 5000000, iconName: 'shield' },
  ],
  categories: {
    in: ['Gaji', 'Bonus', 'Investasi', 'Hadiah', 'Lainnya'],
    out: ['Kebutuhan', 'Transport', 'Tagihan', 'Makan', 'Hiburan', 'Transfer', 'Lainnya']
  },
  budgetLimits: {
    'Kebutuhan': 3000000,
    'Makan': 1500000,
    'Transport': 1000000,
    'Tagihan': 1000000,
    'Hiburan': 500000
  },
  bankAccounts: [
    { id: 1, bank: 'BCA', accountName: 'Nama Pengguna', accountNumber: '1234567890' }
  ]
};

const App = () => {
  // --- STATE MANAGEMENT ---
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [appData, setAppData] = useState(null);
  const [activeScreen, setActiveScreen] = useState('home'); 
  
  // --- SECURITY STATES (PIN) ---
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinSetupStep, setPinSetupStep] = useState(0); 
  const [tempPin, setTempPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // --- UI STATES ---
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
  
  // Fitur Baru
  const [historyFilter, setHistoryFilter] = useState('all');
  const [editProfileModal, setEditProfileModal] = useState({ isOpen: false, name: '' });
  const [editBudgetModal, setEditBudgetModal] = useState({ isOpen: false, category: '', limit: '' });

  // --- FIREBASE AUTH & SYNC ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);

    // Set Greeting by time
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) setGreeting('Selamat Pagi,');
    else if (hour >= 11 && hour < 15) setGreeting('Selamat Siang,');
    else if (hour >= 15 && hour < 18) setGreeting('Selamat Sore,');
    else setGreeting('Selamat Malam,');

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'finances', 'mainData');
    
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (!data.profile) data.profile = { name: 'Pengguna Cloud' };
        if (data.showBalance === undefined) data.showBalance = true;
        if (!data.budgetLimits) data.budgetLimits = DEFAULT_DATA.budgetLimits;
        setAppData(data);
        if (!data.pin) setPinSetupStep(1); 
      } else {
        setDoc(docRef, DEFAULT_DATA);
        setAppData(DEFAULT_DATA);
        setPinSetupStep(1);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsBankDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  // --- HELPER UNTUK UPDATE KE FIRESTORE ---
  const updateFirestore = async (newDataFields) => {
    if (!user) return;
    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'finances', 'mainData');
    try {
      await setDoc(docRef, newDataFields, { merge: true });
    } catch (err) {
      console.error("Gagal update data:", err);
    }
  };

  // --- CALCULATIONS ---
  const transactions = appData?.transactions || [];
  const bills = appData?.bills || [];
  const savingsGoals = appData?.savingsGoals || [];
  const categories = appData?.categories || { in: [], out: [] };
  const bankAccounts = appData?.bankAccounts || [];
  const budgetLimits = appData?.budgetLimits || {};
  const profileName = appData?.profile?.name || 'Pengguna Cloud';
  const showBalance = appData?.showBalance !== false; // true if not explicitly false

  const totalIn = transactions.filter(t => t.type === 'in').reduce((acc, curr) => acc + curr.amount, 0);
  const totalOut = transactions.filter(t => t.type === 'out').reduce((acc, curr) => acc + curr.amount, 0);
  const totalSaldo = totalIn - totalOut;

  const formatIDR = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number || 0);
  };

  const getIcon = (name) => {
    if (name === 'shield') return <Shield size={20}/>;
    if (name === 'plane') return <Plane size={20}/>;
    return <Target size={20}/>;
  };

  const toggleShowBalance = async () => {
    // Optimistic UI update
    setAppData({...appData, showBalance: !showBalance});
    await updateFirestore({ showBalance: !showBalance });
  };

  // --- PIN LOGIC ---
  const handlePinInput = (num) => {
    if (enteredPin.length < 6) {
      const newPin = enteredPin + num;
      setEnteredPin(newPin);
      
      if (newPin.length === 6) {
        setTimeout(() => processPin(newPin), 200);
      }
    }
  };

  const handleDeletePin = () => {
    setEnteredPin(enteredPin.slice(0, -1));
  };

  const processPin = async (currentPin) => {
    if (pinSetupStep === 0) {
      if (currentPin === appData.pin) {
        setIsUnlocked(true);
        setEnteredPin(''); 
      } else {
        triggerPinError();
      }
    } else if (pinSetupStep === 1) {
      setTempPin(currentPin);
      setEnteredPin('');
      setPinSetupStep(2); 
    } else if (pinSetupStep === 2) {
      if (currentPin === tempPin) {
        await updateFirestore({ pin: currentPin });
        setIsUnlocked(true);
        setPinSetupStep(0);
        setEnteredPin(''); 
      } else {
        triggerPinError();
        setTimeout(() => {
           setEnteredPin('');
           setTempPin('');
           setPinSetupStep(1); 
        }, 500);
      }
    }
  };

  const triggerPinError = () => {
    setPinError(true);
    setTimeout(() => {
      setPinError(false);
      setEnteredPin('');
    }, 500);
  };

  // --- HANDLERS ---
  const triggerSuccess = (msg, stayOnScreen = 'home') => {
    setSuccessMsg(msg);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      if(stayOnScreen) setActiveScreen(stayOnScreen);
    }, 1500);
  };

  const openConfirm = (title, message, onConfirmAction, isDanger = false) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      isDanger,
      onConfirm: async () => {
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null, isDanger: false });
        await onConfirmAction();
      }
    });
  };

  const handleSaveTransaction = async (type) => {
    if (!formData.amount || !formData.title) return;
    setIsSubmitting(true);
    const newTx = {
      id: Date.now(), type,
      amount: parseInt(formData.amount), title: formData.title, category: formData.category,
      date: new Date().toISOString().split('T')[0] // current date
    };
    await updateFirestore({ transactions: [newTx, ...transactions] });
    setFormData({ amount: '', title: '', category: categories[type][0] || 'Lainnya' });
    setIsSubmitting(false);
    triggerSuccess('Transaksi Tersimpan!', 'home');
  };

  const handleDeleteTransaction = (id) => {
    openConfirm('Hapus Transaksi', 'Data transaksi ini akan dihapus secara permanen dan saldo akan disesuaikan kembali.', async () => {
      setIsSubmitting(true);
      const updatedTxs = transactions.filter(t => t.id !== id);
      await updateFirestore({ transactions: updatedTxs });
      setIsSubmitting(false);
      triggerSuccess('Transaksi Dihapus!', 'history');
    }, true); 
  };

  const handleSaveProfile = async () => {
    if (!editProfileModal.name) return;
    setIsSubmitting(true);
    await updateFirestore({ profile: { name: editProfileModal.name } });
    setEditProfileModal({ isOpen: false, name: '' });
    setIsSubmitting(false);
    triggerSuccess('Profil Diperbarui!', 'settings');
  };

  const handleSaveBudgetLimit = async () => {
    if (!editBudgetModal.category || !editBudgetModal.limit) return;
    setIsSubmitting(true);
    const updatedBudgets = { ...budgetLimits, [editBudgetModal.category]: parseInt(editBudgetModal.limit) };
    await updateFirestore({ budgetLimits: updatedBudgets });
    setEditBudgetModal({ isOpen: false, category: '', limit: '' });
    setIsSubmitting(false);
    triggerSuccess('Anggaran Diperbarui!', 'budget');
  };

  const executeTransfer = async () => {
    setIsSubmitting(true);
    const newTx = {
      id: Date.now(), type: 'out',
      amount: parseInt(transferData.amount),
      title: `Transfer ke ${transferData.bank} ${transferData.account}`,
      category: 'Transfer', date: new Date().toISOString().split('T')[0]
    };
    await updateFirestore({ transactions: [newTx, ...transactions] });
    setTransferData({ bank: 'BCA', account: '', amount: '', note: '' });
    setIsSubmitting(false);
    triggerSuccess('Berhasil Transfer!', 'home');
  };

  const handleTransferClick = () => {
    openConfirm('Konfirmasi Transfer', `Apakah kamu yakin ingin transfer Rp ${parseInt(transferData.amount).toLocaleString('id-ID')} ke ${transferData.bank} - ${transferData.account}?`, executeTransfer);
  };

  const executePayBill = async (bill) => {
    setIsSubmitting(true);
    const newTx = {
      id: Date.now(), type: 'out',
      amount: bill.amount, title: `Bayar Tagihan: ${bill.name}`,
      category: 'Tagihan', date: new Date().toISOString().split('T')[0]
    };
    const updatedBills = bills.map(b => b.id === bill.id ? { ...b, isPaid: true } : b);
    await updateFirestore({ transactions: [newTx, ...transactions], bills: updatedBills });
    setIsSubmitting(false);
    triggerSuccess('Pembayaran Berhasil!', 'bills');
  };

  const handlePayBillClick = (bill) => {
    openConfirm('Konfirmasi Pembayaran', `Bayar tagihan ${bill.name} sebesar Rp ${bill.amount.toLocaleString('id-ID')}? Saldo akan otomatis terpotong.`, () => executePayBill(bill));
  };

  const handleSaveNewBill = async () => {
    if (!newBillData.name || !newBillData.amount || !newBillData.dueDate) return;
    setIsSubmitting(true);
    const newBill = {
      id: Date.now(), name: newBillData.name, amount: parseInt(newBillData.amount),
      dueDate: newBillData.dueDate, isPaid: false
    };
    await updateFirestore({ bills: [...bills, newBill] });
    setNewBillData({ isAdding: false, name: '', amount: '', dueDate: '' });
    setIsSubmitting(false);
    triggerSuccess('Tagihan Ditambahkan!', 'bills');
  };

  const executeAddSavings = async (id, amount) => {
    setIsSubmitting(true);
    const newTx = {
      id: Date.now(), type: 'out',
      amount: amount, title: `Isi Tabungan`,
      category: 'Tabungan', date: new Date().toISOString().split('T')[0]
    };
    const updatedSavings = savingsGoals.map(s => s.id === id ? { ...s, current: s.current + amount } : s);
    await updateFirestore({ transactions: [newTx, ...transactions], savingsGoals: updatedSavings });
    setIsSubmitting(false);
    triggerSuccess('Tabungan Ditambah!', 'savings');
  };

  const handleAddSavingsClick = (id, name, amount) => {
     openConfirm('Isi Tabungan', `Pindahkan dana Rp ${amount.toLocaleString('id-ID')} ke tabungan ${name}?`, () => executeAddSavings(id, amount));
  };

  const handleSaveNewSavings = async () => {
    if (!newSavingsData.name || !newSavingsData.target) return;
    setIsSubmitting(true);
    const newGoal = {
      id: Date.now(), name: newSavingsData.name, target: parseInt(newSavingsData.target),
      current: 0, iconName: newSavingsData.iconName
    };
    await updateFirestore({ savingsGoals: [...savingsGoals, newGoal] });
    setNewSavingsData({ isAdding: false, name: '', target: '', iconName: 'target' });
    setIsSubmitting(false);
    triggerSuccess('Target Dibuat!', 'savings');
  };

  const handleAddCategory = async () => {
    if (!newCategoryData.name) return;
    setIsSubmitting(true);
    const updatedCats = { ...categories };
    updatedCats[newCategoryData.type] = [...updatedCats[newCategoryData.type], newCategoryData.name];
    await updateFirestore({ categories: updatedCats });
    setNewCategoryData({ type: 'out', name: '', isAdding: false });
    setIsSubmitting(false);
    triggerSuccess('Kategori Ditambah!', 'categories');
  };

  const handleSaveNewBank = async () => {
    if (!newBankData.bank || !newBankData.accountNumber || !newBankData.accountName) return;
    setIsSubmitting(true);
    const newBank = {
      id: Date.now(), bank: newBankData.bank, accountName: newBankData.accountName, accountNumber: newBankData.accountNumber
    };
    await updateFirestore({ bankAccounts: [...bankAccounts, newBank] });
    setNewBankData({ isAdding: false, bank: 'BCA', accountName: '', accountNumber: '' });
    setIsSubmitting(false);
    triggerSuccess('Rekening Ditambahkan!', 'bank_accounts');
  };

  const handleDeleteBank = (id) => {
    openConfirm('Hapus Rekening', 'Apakah Anda yakin ingin menghapus rekening ini dari daftar tersimpan?', async () => {
      setIsSubmitting(true);
      const updatedBanks = bankAccounts.filter(b => b.id !== id);
      await updateFirestore({ bankAccounts: updatedBanks });
      setIsSubmitting(false);
      triggerSuccess('Rekening Dihapus!', 'bank_accounts');
    }, true);
  };

  // --- CUSTOM CSS UNTUK ANIMASI LENGKAP ---
  const customAnimations = `
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes popIn { 0% { opacity: 0; transform: scale(0.5); } 60% { opacity: 1; transform: scale(1.1); } 100% { opacity: 1; transform: scale(1); } }
    @keyframes slideLeft { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes slideRight { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes fillBar { from { width: 0; } }
    @keyframes bounceModal { 0% { transform: translate(-50%, -20%) scale(0.8); opacity: 0; } 70% { transform: translate(-50%, -50%) scale(1.05); opacity: 1; } 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
    @keyframes fadeInScale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-10px); } 75% { transform: translateX(10px); } }
    @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 15px rgba(32,178,170,0.1); transform: scale(1); } 50% { box-shadow: 0 0 25px rgba(32,178,170,0.6); transform: scale(1.05); } }

    .animate-fade-in-up { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    .animate-pop-in { animation: popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; opacity: 0; }
    .animate-slide-left { animation: slideLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    .animate-slide-right { animation: slideRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    .animate-fill-bar { animation: fillBar 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .animate-bounce-modal { animation: bounceModal 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
    .animate-fade-in-scale { animation: fadeInScale 0.3s ease-out forwards; }
    .animate-shake { animation: shake 0.4s ease-in-out; }
    .animate-pulse-glow { animation: pulseGlow 2s infinite; }
    
    /* Hide scrollbar for smooth UI */
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  `;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f2f6fa] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-[#20b2aa]">
          <Loader2 className="animate-spin" size={48} />
          <p className="font-bold tracking-widest text-sm animate-pulse">MEMUAT CLOUD DATA...</p>
        </div>
      </div>
    );
  }

  if (!isUnlocked) {
    const titleText = pinSetupStep === 1 ? "Buat PIN Baru" : pinSetupStep === 2 ? "Konfirmasi PIN" : "Masukkan PIN";
    const subText = pinSetupStep === 1 ? "Amankan aplikasi keuangan Anda" : pinSetupStep === 2 ? "Ketik ulang PIN yang baru dibuat" : "Masukkan 6 digit PIN untuk masuk";

    return (
      <div className="min-h-screen bg-gradient-to-b from-[#20b2aa] to-[#147a75] flex items-center justify-center font-sans text-white">
        <style>{customAnimations}</style>
        <div className="w-full max-w-md px-8 flex flex-col items-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md mb-6 animate-pop-in border border-white/30">
             <Lock size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-center animate-fade-in-up" style={{animationDelay: '100ms'}}>{titleText}</h1>
          <p className="text-emerald-100 text-sm text-center mb-10 animate-fade-in-up" style={{animationDelay: '200ms'}}>{subText}</p>
          
          <div className={`flex gap-4 mb-12 ${pinError ? 'animate-shake' : ''}`}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`w-4 h-4 rounded-full transition-all duration-300 ${i < enteredPin.length ? 'bg-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'bg-white/30'}`} />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-x-8 gap-y-6 animate-fade-in-up" style={{animationDelay: '300ms'}}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button key={num} onClick={() => handlePinInput(num.toString())} className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-2xl font-bold transition-all active:scale-90 hover:bg-white/20">
                {num}
              </button>
            ))}
            <div className="col-start-2">
              <button onClick={() => handlePinInput('0')} className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-2xl font-bold transition-all active:scale-90 hover:bg-white/20">0</button>
            </div>
            <div className="col-start-3">
              <button onClick={handleDeletePin} className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold transition-all active:scale-90 hover:bg-white/10">
                 <Delete size={28} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const PageHeader = ({ title }) => (
    <div className="flex items-center gap-4 text-white mb-8 pt-4 sticky top-0 z-20 animate-slide-right">
      <button onClick={() => setActiveScreen('home')} className="p-2 bg-white/20 rounded-xl backdrop-blur-sm transition-all duration-300 hover:bg-white/30 hover:scale-110 hover:-translate-x-1 active:scale-90">
        <ArrowLeft size={24} />
      </button>
      <h1 className="text-xl font-bold tracking-wide">{title}</h1>
    </div>
  );

  const renderHome = () => {
    const menuItems = [
      { icon: <TrendingUp size={24} className="text-emerald-500" />, label: "PEMASUKAN", action: 'form_in' },
      { icon: <TrendingDown size={24} className="text-red-500" />, label: "PENGELUARAN", action: 'form_out' },
      { icon: <Send size={24} className="text-blue-500" />, label: "TRANSFER", action: 'transfer' },
      { icon: <Receipt size={24} className="text-orange-400" />, label: "TAGIHAN", action: 'bills' },
      { icon: <PieChart size={24} className="text-purple-500" />, label: "ANGGARAN", action: 'budget' },
      { icon: <PiggyBank size={24} className="text-pink-400" />, label: "TABUNGAN", action: 'savings' },
      { icon: <BarChart3 size={24} className="text-teal-500" />, label: "LAPORAN", action: 'stats' },
      { icon: <Tags size={24} className="text-slate-500" />, label: "KATEGORI", action: 'categories' }
    ];

    return (
      <div className="relative z-10 px-5 pt-12 pb-24">
        <div className="flex justify-between items-center text-white mb-10 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <Wallet size={28} className="text-white" strokeWidth={2.5} />
            <div>
               <p className="text-[10px] uppercase tracking-widest font-medium opacity-80 mb-0.5">{greeting}</p>
               <h1 className="text-lg font-bold leading-none">{profileName}</h1>
            </div>
          </div>
          <div onClick={() => setActiveScreen('settings')} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 cursor-pointer transition-all duration-300 hover:scale-110 hover:bg-white/40 active:scale-90 shadow-lg">
            <User size={20} className="text-white" />
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-[32px] p-6 shadow-[0_15px_30px_rgba(32,178,170,0.15)] mb-6 flex justify-between items-center animate-fade-in-up transition-all duration-500 ease-out hover:-translate-y-2 hover:shadow-[0_25px_40px_rgba(32,178,170,0.25)]" style={{ animationDelay: '100ms' }}>
          <div>
            <span className="text-xs font-bold text-[#20b2aa] bg-[#e0f7f6] px-2 py-1 rounded-md tracking-wider">TOTAL SALDO</span>
            <div className="flex items-center gap-3">
               <h2 className="text-3xl font-black text-slate-800 mt-2 mb-1">
                 {showBalance ? formatIDR(totalSaldo) : 'Rp ••••••••'}
               </h2>
               <button onClick={toggleShowBalance} className="mt-1 text-slate-400 hover:text-[#20b2aa] transition-colors">
                 {showBalance ? <EyeOff size={20} /> : <Eye size={20} />}
               </button>
            </div>
            <p className="text-sm font-medium text-slate-400">Tersinkronisasi Cloud</p>
          </div>
          <div className="w-16 h-16 rounded-full bg-[#e0f7f6] flex items-center justify-center shadow-inner border border-[#b2eaf2] transition-transform duration-300 hover:rotate-12 hover:scale-110 shrink-0">
            <Wallet size={32} className="text-[#20b2aa]" fill="currentColor" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-[#ff6b6b] to-[#ff4757] rounded-[32px] p-5 shadow-[0_15px_30px_rgba(255,107,107,0.3)] mb-10 text-white flex items-center gap-5 relative overflow-hidden animate-fade-in-up transition-all duration-500 ease-out hover:-translate-y-2 hover:shadow-[0_25px_40px_rgba(255,107,107,0.4)]" style={{ animationDelay: '200ms' }}>
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"></div>
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20 shadow-lg transition-transform duration-300 hover:rotate-12 hover:scale-110">
            <TrendingDown size={28} className="text-white" />
          </div>
          <div className="z-10">
            <h3 className="text-lg font-bold">Pengeluaran Total</h3>
            <p className="text-xs text-red-100 mb-1">{transactions.filter(t => t.type==='out').length} Transaksi Tercatat</p>
            <p className="text-2xl font-black tracking-wider">
               {showBalance ? formatIDR(totalOut) : 'Rp ••••••••'}
            </p>
          </div>
        </div>

        <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-6 bg-[#20b2aa] rounded-full shadow-[0_0_8px_rgba(32,178,170,0.5)]"></div>
            <h2 className="text-xl font-extrabold text-[#1e293b]">Menu Keuangan</h2>
          </div>
          <div className="grid grid-cols-4 gap-y-6 gap-x-2">
            {menuItems.map((item, index) => (
              <div key={index} onClick={() => setActiveScreen(item.action)} className="flex flex-col items-center gap-3 cursor-pointer group animate-pop-in" style={{ animationDelay: `${350 + index * 50}ms` }}>
                <div className="w-[70px] h-[70px] rounded-[24px] bg-[#f2f6fa] shadow-[6px_6px_14px_#d1d9e6,-6px_-6px_14px_#ffffff] flex items-center justify-center transition-all duration-300 ease-out group-hover:scale-110 group-hover:-translate-y-2 group-active:scale-90 group-hover:shadow-[8px_8px_20px_#d1d9e6,-8px_-8px_20px_#ffffff]">
                  <div className="w-11 h-11 rounded-full bg-white shadow-[inset_1px_1px_3px_rgba(0,0,0,0.05),0_2px_5px_rgba(0,0,0,0.02)] flex items-center justify-center transition-transform duration-300 group-hover:rotate-6">
                    {item.icon}
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide text-center transition-colors duration-300 group-hover:text-[#20b2aa]">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderForm = (type) => {
    const isIncome = type === 'in';
    const catList = isIncome ? categories.in : categories.out;
    
    return (
      <div className="relative z-10 px-5 pt-8 h-full pb-24">
        <PageHeader title={isIncome ? 'Tambah Pemasukan' : 'Tambah Pengeluaran'} />
        <div className="bg-white rounded-3xl p-6 shadow-xl mb-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="mb-6 group">
            <label className="text-sm font-bold text-slate-500 mb-2 block transition-colors group-focus-within:text-[#20b2aa]">Nominal (Rp)</label>
            <input type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} placeholder="0" className={`w-full text-3xl font-black outline-none border-b-2 py-2 transition-all duration-300 ${isIncome ? 'text-emerald-500 border-emerald-100 focus:border-emerald-500' : 'text-red-500 border-red-100 focus:border-red-500'} bg-transparent`} />
          </div>
          <div className="mb-6 group">
            <label className="text-sm font-bold text-slate-500 mb-2 block transition-colors group-focus-within:text-[#20b2aa]">Keterangan</label>
            <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="Cth: Belanja Makan" className="w-full text-lg font-medium outline-none border-b-2 border-slate-100 focus:border-[#20b2aa] py-2 bg-transparent transition-all duration-300" />
          </div>
          <div className="mb-8">
            <label className="text-sm font-bold text-slate-500 mb-3 block">Kategori</label>
            <div className="flex flex-wrap gap-2">
              {catList.map((cat, index) => (
                <button key={cat} onClick={() => setFormData({...formData, category: cat})} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 hover:scale-105 active:scale-95 animate-pop-in ${formData.category === cat ? (isIncome ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 -translate-y-1' : 'bg-red-500 text-white shadow-lg shadow-red-500/40 -translate-y-1') : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`} style={{ animationDelay: `${200 + index * 20}ms` }}>{cat}</button>
              ))}
            </div>
          </div>
          <button onClick={() => handleSaveTransaction(type)} disabled={!formData.amount || !formData.title || isSubmitting} className={`w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 active:scale-95 animate-fade-in-up disabled:opacity-50 disabled:cursor-not-allowed ${isIncome ? 'bg-emerald-500 hover:shadow-emerald-500/40' : 'bg-red-500 hover:shadow-red-500/40'}`} style={{ animationDelay: '400ms' }}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : <PlusCircle />}
            {isSubmitting ? 'Memproses...' : 'Simpan Transaksi'}
          </button>
        </div>
      </div>
    );
  };

  const renderTransfer = () => {
    const banks = ["BCA", "Mandiri", "BNI", "BRI", "BSI", "Gopay", "OVO", "Dana"];
    return (
      <div className="relative z-10 px-5 pt-8 h-full pb-24">
        <PageHeader title="Transfer Dana" />
        <div className="bg-white rounded-3xl p-6 shadow-xl mb-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="mb-5 relative" ref={dropdownRef}>
            <label className="text-sm font-bold text-slate-500 mb-2 block">Bank Tujuan</label>
            <div onClick={() => setIsBankDropdownOpen(!isBankDropdownOpen)} className={`w-full flex items-center justify-between border-b-2 py-2 cursor-pointer transition-all duration-300 ${isBankDropdownOpen ? 'border-[#20b2aa]' : 'border-slate-100'}`}>
              <span className="text-lg font-bold text-slate-800">{transferData.bank}</span>
              <ChevronDown className={`text-slate-400 transition-transform duration-300 ${isBankDropdownOpen ? 'rotate-180 text-[#20b2aa]' : ''}`} />
            </div>
            {isBankDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-fade-in-scale">
                <div className="max-h-60 overflow-y-auto">
                  {banks.map(b => (
                    <div key={b} onClick={() => { setTransferData({...transferData, bank: b}); setIsBankDropdownOpen(false); }} className={`px-5 py-3 font-medium cursor-pointer transition-colors ${transferData.bank === b ? 'bg-[#e0f7f6] text-[#20b2aa] font-bold' : 'text-slate-700 hover:bg-slate-50'}`}>{b}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="mb-5 group">
            <label className="text-sm font-bold text-slate-500 mb-2 block transition-colors group-focus-within:text-[#20b2aa]">Nomor Rekening</label>
            <input type="number" value={transferData.account} onChange={(e) => setTransferData({...transferData, account: e.target.value})} placeholder="Masukkan nomor rekening" className="w-full text-lg font-medium outline-none border-b-2 border-slate-100 focus:border-[#20b2aa] py-2 bg-transparent transition-all duration-300" />
          </div>
          <div className="mb-5 group">
            <label className="text-sm font-bold text-slate-500 mb-2 block transition-colors group-focus-within:text-[#20b2aa]">Nominal Transfer (Rp)</label>
            <input type="number" value={transferData.amount} onChange={(e) => setTransferData({...transferData, amount: e.target.value})} placeholder="0" className="w-full text-3xl font-black outline-none border-b-2 text-blue-500 border-blue-100 focus:border-blue-500 py-2 bg-transparent transition-all duration-300" />
            {parseInt(transferData.amount) > totalSaldo && <p className="text-red-500 text-xs font-bold mt-2 animate-pulse">Saldo tidak mencukupi!</p>}
          </div>
          <button onClick={handleTransferClick} disabled={!transferData.amount || !transferData.account || parseInt(transferData.amount) > totalSaldo || isSubmitting} className="w-full py-4 mt-4 rounded-2xl text-white bg-blue-500 font-bold text-lg shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-blue-500/50 active:scale-95 animate-fade-in-up disabled:opacity-50 disabled:cursor-not-allowed" style={{ animationDelay: '300ms' }}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Send size={20} />}
            {isSubmitting ? 'Memproses...' : 'Kirim Sekarang'}
          </button>
        </div>
      </div>
    );
  };

  const renderBills = () => (
    <div className="relative z-10 px-5 pt-8 h-full pb-24">
      <PageHeader title="Bayar Tagihan" />
      {newBillData.isAdding ? (
         <div className="bg-white rounded-3xl p-5 shadow-xl mb-6 animate-fade-in-up border-2 border-[#20b2aa]">
            <h3 className="font-bold text-slate-700 mb-4 text-sm flex items-center justify-between">
              Tambah Tagihan Bulanan
              <X size={20} className="cursor-pointer text-slate-400" onClick={() => setNewBillData({...newBillData, isAdding: false})} />
            </h3>
            <input type="text" placeholder="Nama Tagihan (Cth: Netflix)" value={newBillData.name} onChange={(e) => setNewBillData({...newBillData, name: e.target.value})} className="w-full border-b-2 border-slate-200 focus:border-[#20b2aa] outline-none py-2 mb-4 font-medium text-sm" />
            <input type="number" placeholder="Nominal (Rp)" value={newBillData.amount} onChange={(e) => setNewBillData({...newBillData, amount: e.target.value})} className="w-full border-b-2 border-slate-200 focus:border-[#20b2aa] outline-none py-2 mb-4 font-black text-[#20b2aa]" />
            <input type="date" value={newBillData.dueDate} onChange={(e) => setNewBillData({...newBillData, dueDate: e.target.value})} className="w-full border-b-2 border-slate-200 focus:border-[#20b2aa] outline-none py-2 mb-6 font-medium text-slate-500 text-sm" />
            <button onClick={handleSaveNewBill} disabled={!newBillData.name || !newBillData.amount || !newBillData.dueDate || isSubmitting} className="w-full py-3 rounded-xl bg-[#20b2aa] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform">
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : null}
              {isSubmitting ? 'Menyimpan...' : 'Simpan Tagihan'}
            </button>
         </div>
      ) : (
         <button onClick={() => setNewBillData({...newBillData, isAdding: true})} className="w-full mb-6 py-3 rounded-2xl bg-white/20 border border-white/40 text-white font-bold flex items-center justify-center gap-2 hover:bg-white/30 transition-colors animate-fade-in-up">
            <PlusCircle size={20} /> Tambah Tagihan Baru
         </button>
      )}
      {bills.length === 0 && !newBillData.isAdding && <p className="text-center text-white/70 animate-pop-in">Belum ada tagihan.</p>}
      <div className="space-y-4">
        {bills.map((bill, index) => (
          <div key={bill.id} className="bg-white rounded-2xl p-5 shadow-lg border border-slate-50 animate-slide-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1" style={{ animationDelay: `${index * 100}ms` }}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 transition-transform duration-300 hover:rotate-12 hover:scale-110">
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{bill.name}</h3>
                  <p className="text-xs font-medium text-slate-400 flex items-center gap-1"><Calendar size={12} /> Jatuh tempo: {bill.dueDate}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-slate-800">{formatIDR(bill.amount)}</p>
              </div>
            </div>
            {bill.isPaid ? (
              <div className="w-full py-2 bg-slate-100 text-slate-400 font-bold rounded-xl text-sm flex items-center justify-center gap-1"><CheckCircle2 size={16} /> Lunas</div>
            ) : (
              <button onClick={() => handlePayBillClick(bill)} disabled={totalSaldo < bill.amount || isSubmitting} className={`w-full py-2 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 ${totalSaldo < bill.amount ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-[#20b2aa] text-white shadow shadow-[#20b2aa]/30 hover:bg-[#1b9a94] hover:shadow-[#20b2aa]/50 disabled:opacity-70'}`}>
                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : null}
                {totalSaldo < bill.amount ? 'Saldo Kurang' : isSubmitting ? 'Memproses...' : 'Bayar Sekarang'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderBudget = () => {
    const outTxs = transactions.filter(t => t.type === 'out');
    const spentPerCategory = outTxs.reduce((acc, tx) => { acc[tx.category] = (acc[tx.category] || 0) + tx.amount; return acc; }, {});
    
    return (
      <div className="relative z-10 px-5 pt-8 h-full pb-24">
        <PageHeader title="Anggaran Bulanan" />

        {/* Modal Edit Budget */}
        {editBudgetModal.isOpen && (
           <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-5">
             <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-pop-in">
                <h3 className="text-xl font-bold text-center text-slate-800 mb-2">Atur Anggaran</h3>
                <p className="text-center text-[#20b2aa] font-bold mb-4">{editBudgetModal.category}</p>
                <input type="number" placeholder="Nominal Anggaran (Rp)" value={editBudgetModal.limit} onChange={(e) => setEditBudgetModal({...editBudgetModal, limit: e.target.value})} className="w-full border-b-2 border-slate-200 focus:border-[#20b2aa] outline-none py-2 mb-6 font-black text-center text-lg text-slate-800" autoFocus />
                <div className="flex gap-3">
                   <button onClick={() => setEditBudgetModal({isOpen: false, category: '', limit: ''})} disabled={isSubmitting} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold active:scale-95 transition-transform disabled:opacity-50">Batal</button>
                   <button onClick={handleSaveBudgetLimit} disabled={!editBudgetModal.limit || isSubmitting} className="flex-1 py-3 rounded-xl bg-[#20b2aa] text-white font-bold shadow-lg shadow-[#20b2aa]/30 active:scale-95 transition-transform disabled:opacity-80 flex items-center justify-center gap-2">
                     {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : null}
                     {isSubmitting ? '...' : 'Simpan'}
                   </button>
                </div>
             </div>
          </div>
        )}

        <div className="bg-white rounded-3xl p-6 shadow-xl mb-6 space-y-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          {/* Loop melalui semua kategori pengeluaran yang aktif */}
          {categories.out.map((cat, index) => {
            const limit = budgetLimits[cat] || 0;
            const spent = spentPerCategory[cat] || 0;
            const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : (spent > 0 ? 100 : 0);
            const isOver = limit > 0 && spent > limit;
            const isWarning = limit > 0 && percentage >= 80 && !isOver;
            
            let barColor = 'bg-[#20b2aa] shadow-[#20b2aa]/50'; 
            if (isWarning) barColor = 'bg-orange-400 shadow-orange-400/50';
            if (isOver) barColor = 'bg-red-500 shadow-red-500/50';
            if (limit === 0) barColor = 'bg-slate-300'; // Warna abu-abu jika belum diatur

            return (
              <div key={cat} className="animate-slide-left group" style={{ animationDelay: `${200 + index * 100}ms` }}>
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                       {cat}
                       <button onClick={() => setEditBudgetModal({ isOpen: true, category: cat, limit: limit > 0 ? limit.toString() : '' })} className="text-slate-300 hover:text-[#20b2aa] transition-colors">
                          <Edit size={14} />
                       </button>
                    </h4>
                    <p className="text-xs font-medium text-slate-400">{formatIDR(spent)} terpakai</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-500">Batas</p>
                    <p className="text-sm font-black text-slate-800">{limit > 0 ? formatIDR(limit) : 'Belum diatur'}</p>
                  </div>
                </div>
                <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden border border-slate-200">
                  {(limit > 0 || spent > 0) && <div className={`${barColor} h-full rounded-full shadow-lg animate-fill-bar`} style={{ width: `${limit === 0 && spent > 0 ? 100 : percentage}%` }}></div>}
                </div>
                {isOver && <p className="text-xs text-red-500 font-bold mt-1 text-right animate-pulse">Melebihi anggaran!</p>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSavings = () => {
    const iconOptions = [ { id: 'target', label: 'Umum' }, { id: 'plane', label: 'Liburan' }, { id: 'shield', label: 'Darurat' } ];
    return (
      <div className="relative z-10 px-5 pt-8 h-full pb-24">
        <PageHeader title="Target Tabungan" />
        {newSavingsData.isAdding ? (
           <div className="bg-white rounded-3xl p-5 shadow-xl mb-6 animate-fade-in-up border-2 border-pink-400">
              <h3 className="font-bold text-slate-700 mb-4 text-sm flex items-center justify-between">
                Buat Target Baru
                <X size={20} className="cursor-pointer text-slate-400" onClick={() => setNewSavingsData({...newSavingsData, isAdding: false})} />
              </h3>
              <input type="text" placeholder="Nama Impian (Cth: HP Baru)" value={newSavingsData.name} onChange={(e) => setNewSavingsData({...newSavingsData, name: e.target.value})} className="w-full border-b-2 border-slate-200 focus:border-pink-400 outline-none py-2 mb-4 font-medium text-sm" />
              <input type="number" placeholder="Target Nominal (Rp)" value={newSavingsData.target} onChange={(e) => setNewSavingsData({...newSavingsData, target: e.target.value})} className="w-full border-b-2 border-slate-200 focus:border-pink-400 outline-none py-2 mb-6 font-black text-pink-500" />
              <div className="flex gap-6 justify-center mb-6">
                 {iconOptions.map(opt => (
                   <div key={opt.id} className="flex flex-col items-center gap-2">
                     <div onClick={() => setNewSavingsData({...newSavingsData, iconName: opt.id})} className={`w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer transition-all ${newSavingsData.iconName === opt.id ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/40 -translate-y-1' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                        {getIcon(opt.id)}
                     </div>
                     <span className={`text-xs font-bold ${newSavingsData.iconName === opt.id ? 'text-pink-500' : 'text-slate-400'}`}>{opt.label}</span>
                   </div>
                 ))}
              </div>
              <button onClick={handleSaveNewSavings} disabled={!newSavingsData.name || !newSavingsData.target || isSubmitting} className="w-full py-3 rounded-xl bg-pink-500 text-white font-bold flex justify-center items-center gap-2 disabled:opacity-50 active:scale-95 transition-transform">
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : null}
                {isSubmitting ? 'Menyimpan...' : 'Simpan Target'}
              </button>
           </div>
        ) : (
           <button onClick={() => setNewSavingsData({...newSavingsData, isAdding: true})} className="w-full mb-6 py-3 rounded-2xl bg-white/20 border border-white/40 text-white font-bold flex items-center justify-center gap-2 hover:bg-white/30 transition-colors animate-fade-in-up">
              <PlusCircle size={20} /> Target Impian Baru
           </button>
        )}
        <div className="space-y-4">
          {savingsGoals.map((goal, index) => {
            const percentage = Math.min((goal.current / goal.target) * 100, 100);
            return (
              <div key={goal.id} className="bg-white rounded-3xl p-5 shadow-lg border border-slate-50 animate-slide-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1" style={{ animationDelay: `${index * 150}ms` }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-pink-100 text-pink-500 flex items-center justify-center transition-transform duration-300 hover:scale-110 hover:rotate-12">
                    {getIcon(goal.iconName)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{goal.name}</h3>
                    <p className="text-xs font-medium text-slate-400">Target: {formatIDR(goal.target)}</p>
                  </div>
                </div>
                <div className="mb-2 flex justify-between text-sm font-bold">
                  <span className="text-[#20b2aa]">{formatIDR(goal.current)}</span>
                  <span className="text-slate-400">{percentage.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-4">
                  <div className="bg-pink-400 h-full rounded-full animate-fill-bar shadow-lg shadow-pink-400/40" style={{ width: `${percentage}%` }}></div>
                </div>
                {percentage < 100 ? (
                  <button onClick={() => handleAddSavingsClick(goal.id, goal.name, 500000)} disabled={totalSaldo < 500000 || isSubmitting} className="w-full py-2.5 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed bg-pink-50 text-pink-500 hover:bg-pink-500 hover:text-white hover:shadow-lg hover:shadow-pink-500/40">
                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <PlusCircle size={18} className="transition-transform duration-300 group-hover:rotate-90" />}
                    {isSubmitting ? 'Memproses...' : 'Isi Rp 500.000'}
                  </button>
                ) : (
                  <div className="w-full py-2.5 bg-emerald-50 text-emerald-500 font-bold rounded-xl text-sm flex items-center justify-center gap-1">
                    <CheckCircle2 size={18} /> Target Tercapai!
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCategories = () => (
    <div className="relative z-10 px-5 pt-8 h-full pb-24">
      <PageHeader title="Daftar Kategori" />
      {newCategoryData.isAdding && (
         <div className="bg-white rounded-3xl p-5 shadow-xl mb-6 animate-fade-in-up border-2 border-[#20b2aa]">
            <h3 className="font-bold text-slate-700 mb-3 text-sm flex items-center justify-between">
               Tambah Kategori Baru
               <X size={20} className="cursor-pointer text-slate-400" onClick={() => setNewCategoryData({...newCategoryData, isAdding: false})} />
            </h3>
            <div className="flex gap-2 mb-4">
               <button onClick={() => setNewCategoryData({...newCategoryData, type: 'out'})} className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-colors ${newCategoryData.type === 'out' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500'}`}>Pengeluaran</button>
               <button onClick={() => setNewCategoryData({...newCategoryData, type: 'in'})} className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-colors ${newCategoryData.type === 'in' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>Pemasukan</button>
            </div>
            <input type="text" placeholder="Nama Kategori..." value={newCategoryData.name} onChange={(e) => setNewCategoryData({...newCategoryData, name: e.target.value})} className="w-full border-b-2 border-slate-200 focus:border-[#20b2aa] outline-none py-2 mb-4 font-medium" autoFocus />
            <button onClick={handleAddCategory} disabled={!newCategoryData.name || isSubmitting} className="w-full flex justify-center items-center gap-2 py-3 rounded-xl bg-[#20b2aa] text-white font-bold disabled:opacity-50 active:scale-95">
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : null}
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </button>
         </div>
      )}
      <div className="bg-white rounded-3xl p-6 shadow-xl mb-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <h3 className="font-bold text-slate-500 mb-4 flex items-center gap-2"><TrendingDown size={18} className="text-red-500 animate-bounce"/> Kategori Pengeluaran</h3>
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.out.map((cat, index) => (
            <span key={cat} className="px-3 py-1.5 bg-red-50 text-red-600 font-medium text-sm rounded-lg border border-red-100 animate-pop-in cursor-default" style={{ animationDelay: `${100 + index * 20}ms` }}>{cat}</span>
          ))}
          <button onClick={() => setNewCategoryData({ type: 'out', name: '', isAdding: true })} className="px-3 py-1.5 bg-slate-100 text-slate-500 font-medium text-sm rounded-lg border border-slate-200 flex items-center gap-1 hover:bg-slate-200 hover:scale-105 active:scale-95 transition-all"><Plus size={14} /> Tambah</button>
        </div>
        <h3 className="font-bold text-slate-500 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-emerald-500 animate-bounce"/> Kategori Pemasukan</h3>
        <div className="flex flex-wrap gap-2">
          {categories.in.map((cat, index) => (
            <span key={cat} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 font-medium text-sm rounded-lg border border-emerald-100 animate-pop-in cursor-default" style={{ animationDelay: `${200 + index * 20}ms` }}>{cat}</span>
          ))}
          <button onClick={() => setNewCategoryData({ type: 'in', name: '', isAdding: true })} className="px-3 py-1.5 bg-slate-100 text-slate-500 font-medium text-sm rounded-lg border border-slate-200 flex items-center gap-1 hover:bg-slate-200 hover:scale-105 active:scale-95 transition-all"><Plus size={14} /> Tambah</button>
        </div>
      </div>
    </div>
  );

  const renderHistory = () => {
    const filteredTransactions = transactions.filter(tx => {
      if (historyFilter === 'all') return true;
      return tx.type === historyFilter;
    });

    return (
      <div className="relative z-10 px-5 pt-8 h-full pb-24">
        <PageHeader title="Riwayat Transaksi" />
        <div className="flex gap-2 mb-6 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
           <button onClick={() => setHistoryFilter('all')} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${historyFilter === 'all' ? 'bg-white text-[#20b2aa] shadow-md' : 'bg-white/20 text-white hover:bg-white/30'}`}>Semua</button>
           <button onClick={() => setHistoryFilter('in')} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${historyFilter === 'in' ? 'bg-white text-emerald-500 shadow-md' : 'bg-white/20 text-white hover:bg-white/30'}`}>Pemasukan</button>
           <button onClick={() => setHistoryFilter('out')} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${historyFilter === 'out' ? 'bg-white text-red-500 shadow-md' : 'bg-white/20 text-white hover:bg-white/30'}`}>Pengeluaran</button>
        </div>

        <div className="bg-white rounded-t-3xl shadow-xl min-h-screen p-5 -mx-5 pb-32 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-2 mb-4 text-slate-500 text-sm font-bold px-2">
            <Filter size={16} /> Menampilkan {filteredTransactions.length} transaksi
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="text-center text-slate-400 mt-20 animate-pop-in">Tidak ada transaksi ditemukan.</div>
          ) : (
            <div className="space-y-4">
              {filteredTransactions.map((tx, index) => (
                <div key={tx.id} className="flex justify-between items-center p-4 bg-[#f2f6fa] rounded-2xl animate-slide-left transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-md group" style={{ animationDelay: `${150 + index * 50}ms` }}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:rotate-12 ${tx.type === 'in' ? 'bg-emerald-100 text-emerald-500' : 'bg-red-100 text-red-500'}`}>
                      {tx.type === 'in' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">{tx.title}</h4>
                      <p className="text-xs font-medium text-slate-400">{tx.category} • {tx.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`font-bold ${tx.type === 'in' ? 'text-emerald-500' : 'text-slate-800'}`}>
                      {tx.type === 'in' ? '+' : '-'}{formatIDR(tx.amount)}
                    </div>
                    <button onClick={() => handleDeleteTransaction(tx.id)} className="p-2 text-red-300 hover:text-white hover:bg-red-500 rounded-lg transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStats = () => {
    const outTxs = transactions.filter(t => t.type === 'out');
    const categoryTotals = outTxs.reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
      return acc;
    }, {});
    
    return (
      <div className="relative z-10 px-5 pt-8 h-full pb-24">
        <PageHeader title="Laporan Keuangan" />
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <h3 className="font-bold text-slate-500 mb-4">Pengeluaran by Kategori</h3>
          {Object.keys(categoryTotals).length === 0 ? (
            <p className="text-slate-400 text-sm">Belum ada data.</p>
          ) : (
            <div className="space-y-5">
              {Object.entries(categoryTotals).sort((a,b) => b[1] - a[1]).map(([cat, amount], index) => {
                const percentage = (amount / totalOut) * 100;
                return (
                  <div key={cat} className="animate-slide-left" style={{ animationDelay: `${200 + index * 100}ms` }}>
                    <div className="flex justify-between text-sm font-bold text-slate-700 mb-1">
                      <span>{cat}</span>
                      <span>{formatIDR(amount)}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <div className="bg-[#20b2aa] h-full rounded-full animate-fill-bar shadow-sm" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-emerald-500 p-5 rounded-3xl text-white shadow-lg shadow-emerald-500/30 animate-pop-in transition-all duration-300 hover:scale-105 hover:-translate-y-1 cursor-pointer" style={{ animationDelay: '400ms' }}>
            <p className="text-xs font-medium opacity-80 mb-1">Total Pemasukan</p>
            <p className="font-black">{formatIDR(totalIn)}</p>
          </div>
          <div className="bg-red-500 p-5 rounded-3xl text-white shadow-lg shadow-red-500/30 animate-pop-in transition-all duration-300 hover:scale-105 hover:-translate-y-1 cursor-pointer" style={{ animationDelay: '500ms' }}>
            <p className="text-xs font-medium opacity-80 mb-1">Total Pengeluaran</p>
            <p className="font-black">{formatIDR(totalOut)}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderBankAccounts = () => {
    const banks = ["BCA", "Mandiri", "BNI", "BRI", "BSI", "CIMB Niaga", "Jago", "SeaBank"];

    return (
      <div className="relative z-10 px-5 pt-8 h-full pb-24">
        <PageHeader title="Rekening Bank" />
        
        {newBankData.isAdding ? (
           <div className="bg-white rounded-3xl p-5 shadow-xl mb-6 animate-fade-in-up border-2 border-[#20b2aa]">
              <h3 className="font-bold text-slate-700 mb-4 text-sm flex items-center justify-between">
                Tambah Rekening
                <X size={20} className="cursor-pointer text-slate-400" onClick={() => setNewBankData({...newBankData, isAdding: false})} />
              </h3>
              
              <div className="mb-4 relative" ref={dropdownRef}>
                <div 
                  onClick={() => setIsBankDropdownOpen(!isBankDropdownOpen)}
                  className={`w-full flex items-center justify-between border-b-2 py-2 cursor-pointer transition-all ${isBankDropdownOpen ? 'border-[#20b2aa]' : 'border-slate-100'}`}
                >
                  <span className="font-bold text-slate-800">{newBankData.bank}</span>
                  <ChevronDown className={`text-slate-400 transition-transform ${isBankDropdownOpen ? 'rotate-180 text-[#20b2aa]' : ''}`} />
                </div>
                {isBankDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                    <div className="max-h-40 overflow-y-auto">
                      {banks.map(b => (
                        <div key={b} onClick={() => { setNewBankData({...newBankData, bank: b}); setIsBankDropdownOpen(false); }} className="px-5 py-3 font-medium cursor-pointer hover:bg-slate-50">
                          {b}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <input type="number" placeholder="Nomor Rekening" value={newBankData.accountNumber} onChange={(e) => setNewBankData({...newBankData, accountNumber: e.target.value})} className="w-full border-b-2 border-slate-200 focus:border-[#20b2aa] outline-none py-2 mb-4 font-black tracking-widest" />
              <input type="text" placeholder="Nama Pemilik (A.N)" value={newBankData.accountName} onChange={(e) => setNewBankData({...newBankData, accountName: e.target.value})} className="w-full border-b-2 border-slate-200 focus:border-[#20b2aa] outline-none py-2 mb-6 font-medium text-sm uppercase" />
              
              <button onClick={handleSaveNewBank} disabled={!newBankData.accountNumber || !newBankData.accountName || isSubmitting} className="w-full py-3 rounded-xl bg-[#20b2aa] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform">
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : null}
                {isSubmitting ? 'Menyimpan...' : 'Simpan Rekening'}
              </button>
           </div>
        ) : (
           <button onClick={() => setNewBankData({...newBankData, isAdding: true})} className="w-full mb-6 py-3 rounded-2xl bg-white/20 border border-white/40 text-white font-bold flex items-center justify-center gap-2 hover:bg-white/30 transition-colors animate-fade-in-up">
              <PlusCircle size={20} /> Tambah Rekening
           </button>
        )}

        <div className="space-y-4">
          {bankAccounts.length === 0 && !newBankData.isAdding && <p className="text-center text-white/70 animate-pop-in">Belum ada rekening tersimpan.</p>}
          
          {bankAccounts.map((bank, index) => (
            <div key={bank.id} className="bg-white rounded-2xl p-5 shadow-lg border border-slate-50 animate-slide-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1" style={{ animationDelay: `${index * 100}ms` }}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                    <Landmark size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-lg tracking-wider">{bank.accountNumber}</h3>
                    <p className="text-xs font-bold text-slate-400">{bank.bank} • <span className="uppercase">{bank.accountName}</span></p>
                  </div>
                </div>
                <button onClick={() => handleDeleteBank(bank.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderHelpReport = () => (
    <div className="relative z-10 px-5 pt-8 h-full pb-24">
      <PageHeader title="Bantuan & Laporan" />
      
      <div className="bg-white rounded-3xl shadow-xl p-5 mb-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
         <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">Pusat Bantuan</h3>
         <div className="space-y-3">
            <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-[#20b2aa] hover:text-white transition-colors group">
               <div className="w-10 h-10 rounded-full bg-green-100 text-green-500 flex items-center justify-center group-hover:bg-white group-hover:text-[#20b2aa]">
                 <MessageCircle size={20} />
               </div>
               <div>
                  <h4 className="font-bold">Chat WhatsApp</h4>
                  <p className="text-xs opacity-70">Respon dalam 5 menit</p>
               </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-[#20b2aa] hover:text-white transition-colors group">
               <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center group-hover:bg-white group-hover:text-[#20b2aa]">
                 <Mail size={20} />
               </div>
               <div>
                  <h4 className="font-bold">Email Support</h4>
                  <p className="text-xs opacity-70">support@fincatat.com</p>
               </div>
            </div>
         </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl p-5 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
         <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">Pertanyaan Umum (FAQ)</h3>
         <div className="space-y-4">
            <div>
               <h4 className="font-bold text-sm text-slate-700 flex items-center gap-2 mb-1"><FileQuestion size={16} className="text-[#20b2aa]"/> Apakah data saya aman?</h4>
               <p className="text-xs text-slate-500 leading-relaxed pl-6">Sangat aman. Data Anda disimpan dalam sistem Cloud Google (Firebase) dengan enkripsi tingkat tinggi dan dikunci menggunakan PIN pribadi Anda.</p>
            </div>
            <div>
               <h4 className="font-bold text-sm text-slate-700 flex items-center gap-2 mb-1"><FileQuestion size={16} className="text-[#20b2aa]"/> Bagaimana cara mereset PIN?</h4>
               <p className="text-xs text-slate-500 leading-relaxed pl-6">Saat ini fitur reset PIN harus melalui Customer Service kami demi keamanan data. Silakan hubungi kami via WhatsApp.</p>
            </div>
         </div>
      </div>
      
      <p className="text-center text-white/50 text-xs mt-8 font-medium animate-pop-in">App Version 2.2.0 (PRO Ultimate)</p>
    </div>
  );

  const renderSettings = () => (
    <div className="relative z-10 px-5 pt-8 h-full pb-24">
      <PageHeader title="Pengaturan Akun" />
      <div className="bg-white rounded-3xl shadow-xl p-2 mb-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <div className="p-4 flex items-center justify-between border-b border-slate-100 animate-slide-left" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#20b2aa] rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-[#20b2aa]/30 transition-transform duration-300 hover:scale-110">
               {profileName.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800">{profileName}</h3>
              <p className="text-sm text-slate-400">Akun Cloud Aktif</p>
            </div>
          </div>
          <button onClick={() => setEditProfileModal({ isOpen: true, name: profileName })} className="p-2 text-[#20b2aa] bg-[#e0f7f6] rounded-xl hover:bg-[#cbf1ef] transition-colors">
            <Edit3 size={20} />
          </button>
        </div>
        <div onClick={() => setActiveScreen('bank_accounts')} className="p-4 cursor-pointer text-slate-700 font-medium flex items-center gap-3 hover:bg-slate-50 rounded-xl transition-all duration-300 hover:translate-x-2 animate-slide-left" style={{ animationDelay: '300ms' }}>
          <Landmark size={20} className="text-[#20b2aa]" /> Rekening Bank
        </div>
        <div onClick={() => setActiveScreen('help_report')} className="p-4 cursor-pointer text-slate-700 font-medium flex items-center gap-3 hover:bg-slate-50 rounded-xl transition-all duration-300 hover:translate-x-2 animate-slide-left" style={{ animationDelay: '400ms' }}>
          <Phone size={20} className="text-[#20b2aa]" /> Bantuan & Laporan
        </div>
        <div onClick={() => { setIsUnlocked(false); setEnteredPin(''); setActiveScreen('home'); }} className="p-4 cursor-pointer font-bold flex items-center gap-3 text-red-500 hover:bg-red-50 rounded-xl mt-4 transition-all duration-300 hover:translate-x-2 animate-slide-left" style={{ animationDelay: '500ms' }}>
          <Lock size={20} /> Kunci Aplikasi
        </div>
      </div>
    </div>
  );

  // --- MAIN RENDER ---
  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-800 relative flex justify-center selection:bg-[#20b2aa] selection:text-white">
      <style>{customAnimations}</style>

      {/* Global Success Modal */}
      {showSuccess && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-max bg-slate-800/95 backdrop-blur-sm text-white px-6 py-4 rounded-full font-bold flex items-center gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[100] animate-bounce-modal border border-slate-700">
          <div className="bg-[#20b2aa] rounded-full p-1 animate-pulse-glow">
            <CheckCircle2 className="text-white" size={20} />
          </div>
          {successMsg}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-5">
           <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-pop-in">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce ${confirmModal.isDanger ? 'bg-red-100 text-red-500' : 'bg-orange-100 text-orange-500'}`}>
                 {confirmModal.isDanger ? <Trash2 size={32} /> : <AlertCircle size={32} />}
              </div>
              <h3 className="text-xl font-bold text-center text-slate-800 mb-2">{confirmModal.title}</h3>
              <p className="text-center text-slate-500 text-sm mb-6 font-medium leading-relaxed">{confirmModal.message}</p>
              
              <div className="flex gap-3">
                 <button onClick={() => setConfirmModal({isOpen: false, title: '', message: '', onConfirm: null, isDanger: false})} disabled={isSubmitting} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold active:scale-95 transition-transform disabled:opacity-50">Batal</button>
                 <button onClick={confirmModal.onConfirm} disabled={isSubmitting} className={`flex-1 py-3 rounded-xl text-white font-bold shadow-lg active:scale-95 transition-transform disabled:opacity-80 flex items-center justify-center gap-2 ${confirmModal.isDanger ? 'bg-red-500 shadow-red-500/30' : 'bg-[#20b2aa] shadow-[#20b2aa]/30'}`}>
                   {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : null}
                   {isSubmitting ? 'Memproses...' : (confirmModal.isDanger ? 'Ya, Hapus' : 'Ya, Lanjutkan')}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Profile Edit Modal (Global) */}
      {editProfileModal.isOpen && (
         <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-5">
           <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-pop-in">
              <h3 className="text-xl font-bold text-center text-slate-800 mb-4">Edit Profil</h3>
              <input type="text" placeholder="Masukkan nama panggilan..." value={editProfileModal.name} onChange={(e) => setEditProfileModal({...editProfileModal, name: e.target.value})} className="w-full border-b-2 border-slate-200 focus:border-[#20b2aa] outline-none py-2 mb-6 font-medium text-center text-lg" autoFocus />
              <div className="flex gap-3">
                 <button onClick={() => setEditProfileModal({isOpen: false, name: ''})} disabled={isSubmitting} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold active:scale-95 transition-transform disabled:opacity-50">Batal</button>
                 <button onClick={handleSaveProfile} disabled={!editProfileModal.name || isSubmitting} className="flex-1 py-3 rounded-xl bg-[#20b2aa] text-white font-bold shadow-lg shadow-[#20b2aa]/30 active:scale-95 transition-transform disabled:opacity-80 flex items-center justify-center gap-2">
                   {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : null}
                   {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Mobile Container (Fixed to Viewport) */}
      <div className="w-full max-w-md bg-[#f2f6fa] relative h-[100dvh] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Latar Belakang Gradien Utama */}
        <div className={`absolute top-0 left-0 right-0 transition-all duration-700 ease-in-out z-0 
          ${(activeScreen === 'home' || activeScreen === 'stats' || activeScreen === 'history') ? 'h-[320px] rounded-b-[50px]' : 'h-[180px] rounded-b-[30px]'} 
          bg-gradient-to-b from-[#20b2aa] to-[#48d1cc]`}>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto relative z-10 scrollbar-hide">
          {activeScreen === 'home' && renderHome()}
          {activeScreen === 'form_in' && renderForm('in')}
          {activeScreen === 'form_out' && renderForm('out')}
          {activeScreen === 'transfer' && renderTransfer()}
          {activeScreen === 'bills' && renderBills()}
          {activeScreen === 'budget' && renderBudget()}
          {activeScreen === 'savings' && renderSavings()}
          {activeScreen === 'categories' && renderCategories()}
          {activeScreen === 'history' && renderHistory()}
          {activeScreen === 'stats' && renderStats()}
          {activeScreen === 'settings' && renderSettings()}
          {activeScreen === 'bank_accounts' && renderBankAccounts()}
          {activeScreen === 'help_report' && renderHelpReport()}
        </div>

        {/* Bottom Navigation (Fixed at the bottom of the container) */}
        <div className="w-full h-20 bg-[#f2f6fa] rounded-t-[30px] shadow-[0_-10px_25px_rgba(0,0,0,0.05)] flex justify-between items-end px-4 pb-2 z-50 border-t border-white relative shrink-0">
          
          <div onClick={() => setActiveScreen('home')} className={`w-[75px] h-[85px] rounded-t-[28px] flex flex-col items-center justify-center relative cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] ${activeScreen === 'home' ? 'bg-[#1d2333] text-white shadow-[0_-8px_20px_rgba(29,35,51,0.4)] -translate-y-2' : 'text-slate-400 bg-transparent h-16 hover:text-[#20b2aa] hover:-translate-y-1'}`}>
            <Home size={24} className={`mb-1 transition-transform duration-500 ${activeScreen === 'home' ? 'scale-110' : ''}`} fill={activeScreen === 'home' ? "currentColor" : "none"} />
            <span className="text-[9px] font-bold tracking-widest mt-1">BERANDA</span>
          </div>

          <div onClick={() => setActiveScreen('history')} className={`w-16 h-16 flex flex-col items-center justify-center cursor-pointer transition-all duration-500 ease-out mb-2 hover:-translate-y-1 hover:scale-105 ${activeScreen === 'history' ? 'text-[#20b2aa] -translate-y-1' : 'text-slate-400 hover:text-[#20b2aa]'}`}>
            <History size={24} className={`transition-transform duration-500 ${activeScreen === 'history' ? 'scale-110 animate-bounce' : ''}`} />
            <span className="text-[9px] font-bold mt-1">RIWAYAT</span>
          </div>

          <div onClick={() => setActiveScreen('stats')} className={`w-16 h-16 flex flex-col items-center justify-center cursor-pointer transition-all duration-500 ease-out mb-2 hover:-translate-y-1 hover:scale-105 ${activeScreen === 'stats' ? 'text-[#20b2aa] -translate-y-1' : 'text-slate-400 hover:text-[#20b2aa]'}`}>
            <PieChart size={24} className={`transition-transform duration-500 ${activeScreen === 'stats' ? 'scale-110 animate-bounce' : ''}`} />
            <span className="text-[9px] font-bold mt-1">STATISTIK</span>
          </div>

          <div onClick={() => setActiveScreen('settings')} className={`w-16 h-16 flex flex-col items-center justify-center cursor-pointer transition-all duration-500 ease-out mb-2 hover:-translate-y-1 hover:scale-105 ${activeScreen === 'settings' || activeScreen === 'bank_accounts' || activeScreen === 'help_report' ? 'text-[#20b2aa] -translate-y-1' : 'text-slate-400 hover:text-[#20b2aa]'}`}>
            <Settings size={24} className={`transition-transform duration-500 ${activeScreen === 'settings' || activeScreen === 'bank_accounts' || activeScreen === 'help_report' ? 'scale-110 animate-bounce' : ''}`} />
            <span className="text-[9px] font-bold mt-1">AKUN</span>
          </div>

        </div>

      </div>
    </div>
  );
};

export default App;