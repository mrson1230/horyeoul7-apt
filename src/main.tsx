import './index.css';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, updateDoc, deleteDoc, getDocs, onSnapshot } from 'firebase/firestore';

declare const __firebase_config: string | undefined;
declare const __app_id: string | undefined;
declare const __initial_auth_token: string | undefined;

const userFirebaseConfig = {
  apiKey: "AIzaSyA3KT2g4GiR_e8_Y-u9f4mGlYqv8XQOkDs",
  authDomain: "dream-plus-1230.firebaseapp.com",
  projectId: "dream-plus-1230",
  storageBucket: "dream-plus-1230.firebasestorage.app",
  messagingSenderId: "548622928353",
  appId: "1:548622928353:web:008ce40f40e5f37442aaa0",
  measurementId: "G-YSM60G7F8P"
};

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : userFirebaseConfig;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'horyeoul7-worklog';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const getColRef = (colName: string) => collection(db, 'artifacts', appId, 'public', 'data', colName);
const getDocRef = (colName: string, docId: string) => doc(db, 'artifacts', appId, 'public', 'data', colName, String(docId));

const BANNER_STYLES: Record<string, {
  badge: string;
  cardBg: string;
  badgeBg: string;
  titleColor: string;
  subColor: string;
  descColor: string;
}> = {
  event: {
    badge: '📢 관리소 행사 · 일정',
    cardBg: 'bg-brand-50 border-brand-200',
    badgeBg: 'bg-brand-600 text-white',
    titleColor: 'text-slate-900',
    subColor: 'text-brand-800',
    descColor: 'text-slate-600'
  },
  wedding: {
    badge: '💐 직원 결혼 · 축하',
    cardBg: 'bg-rose-50 border-rose-200',
    badgeBg: 'bg-rose-500 text-white',
    titleColor: 'text-slate-900',
    subColor: 'text-rose-800',
    descColor: 'text-slate-600'
  },
  funeral: {
    badge: '🕯️ 직원 부고 · 조의',
    cardBg: 'bg-slate-800 border-slate-700',
    badgeBg: 'bg-slate-600 text-white',
    titleColor: 'text-white',
    subColor: 'text-slate-300',
    descColor: 'text-slate-400'
  },
  urgent: {
    badge: '⚠️ 단지 긴급 안내',
    cardBg: 'bg-amber-50 border-amber-300',
    badgeBg: 'bg-amber-500 text-white',
    titleColor: 'text-slate-900',
    subColor: 'text-amber-900',
    descColor: 'text-slate-700'
  }
};

interface AppState {
  isLoggedIn: boolean;
  isAdmin: boolean;
  selectedWorkerId: string;
  activeTab: string;
  filterWorkerId: string;
  filterLogCategory: string;
  logViewMode: string;
  calendarYear: number;
  calendarMonth: number;
  selectedCalendarDate: string;
  planPeriodType: string;
  planBaseDate: string;
  homePlanMode: string;
  leaveFilter: string;
  handoverFolderMode: string;
  handoverFilter: string;
  staffHandoverFilter: string;
  toolFolderMode: string;
  toolFilter: string;
  fdFilter: string;
  fdPeriodPreset: string;
  vendorScope: string;
  vendorCategory: string;
  purchaseFilter: string;
  staff: any[];
  logs: any[];
  plans: any[];
  leaves: any[];
  handovers: any[];
  staffHandovers: any[];
  tools: any[];
  toolReturnAlerts: any[];
  detectorLogs: any[];
  vendors: any[];
  purchases: any[];
  chats: any[];
  chatSoundEnabled: boolean;
  lastSeenChatTimestamp: number;
  banners: any[];
  bannerEnabled: boolean;
  bannerIndex: number;
}

const state: AppState = {
  isLoggedIn: false,
  isAdmin: false,
  selectedWorkerId: '',
  activeTab: 'home',
  filterWorkerId: 'ALL',
  filterLogCategory: 'ALL',
  logViewMode: 'LIST',
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth(),
  selectedCalendarDate: '',
  planPeriodType: 'DAILY',
  planBaseDate: new Date().toISOString().slice(0, 10),
  homePlanMode: 'ALL',
  leaveFilter: 'ALL',
  handoverFolderMode: 'SHIFT',
  handoverFilter: 'ALL',
  staffHandoverFilter: 'ALL',
  toolFolderMode: 'TOOLS',
  toolFilter: 'ALL',
  fdFilter: 'ALL',
  fdPeriodPreset: 'ALL',
  vendorScope: 'ALL',
  vendorCategory: 'ALL',
  purchaseFilter: 'ALL',
  staff: [],
  logs: [],
  plans: [],
  leaves: [],
  handovers: [],
  staffHandovers: [],
  tools: [],
  toolReturnAlerts: [],
  detectorLogs: [],
  vendors: [],
  purchases: [],
  chats: [],
  chatSoundEnabled: true,
  lastSeenChatTimestamp: 0,
  banners: [],
  bannerEnabled: true,
  bannerIndex: 0
};

let hasInitializedToolReturnAlerts = false;
const knownToolReturnAlertIds = new Set<string>();

let currentUploadedPhoto = '';
let currentUploadedMediaType: '' | 'image' | 'video' = '';
let writeNextAction: 'logs' | 'stay' = 'logs';
let mediaCompressionCancelled = false;
let activeMediaRecorder: MediaRecorder | null = null;
let currentPurchaseItemPhoto = '';
let currentPurchaseReceiptPhoto = '';
let currentStaffHandoverAttachment: { name: string; isImage: boolean; dataUrl: string } | null = null;
let pendingImportedVendors: any[] = [];
let pendingImportedTools: any[] = [];

Object.defineProperty(window, 'pendingImportedVendors', {
  get: () => pendingImportedVendors,
  set: (v) => { pendingImportedVendors = v; },
  configurable: true
});

Object.defineProperty(window, 'pendingImportedTools', {
  get: () => pendingImportedTools,
  set: (v) => { pendingImportedTools = v; },
  configurable: true
});

function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getSelectedWorker() {
  return state.staff.find(s => s.id === state.selectedWorkerId) || null;
}

let lastKnownToday = getTodayString();

function checkDayRollover() {
  const today = getTodayString();
  if (today !== lastKnownToday) {
    lastKnownToday = today;
    ['logDate', 'bannerDate', 'newPlanDate', 'leaveStartDate', 'leaveEndDate', 'purchaseDate', 'shDate', 'fdReplaceDate'].forEach(id => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) el.value = today;
    });
    state.planBaseDate = today;
    renderLogs();
    renderPlans();
    renderHomePortal();
  }
}

const initApp = async () => {
  const today = getTodayString();
  lastKnownToday = today;
  ['logDate', 'bannerDate', 'newPlanDate', 'leaveStartDate', 'leaveEndDate', 'purchaseDate', 'shDate', 'fdReplaceDate'].forEach(id => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (el) el.value = today;
  });

  const autoLogin = localStorage.getItem('horyeoul7_auto_login') === 'true';
  if (sessionStorage.getItem('horyeoul7_logged_in') === 'true' || autoLogin) {
    state.isLoggedIn = true;
    document.getElementById('loginScreen')?.classList.add('hidden');
  }
  const rememberEl = document.getElementById('loginRememberMe') as HTMLInputElement | null;
  if (rememberEl) rememberEl.checked = autoLogin;

  const savedWorker = localStorage.getItem('horyeoul7_worker');
  if (savedWorker) state.selectedWorkerId = savedWorker;
  renderLoginWorkerSelect();

  const savedTheme = localStorage.getItem('horyeoul7_theme') || 'teal';
  setAppTheme(savedTheme, true);

  switchTab('home');
  renderHomePortal();

  window.addEventListener('focus', checkDayRollover);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkDayRollover();
  });
  setInterval(checkDayRollover, 60000);

  await initCloudSync();
};

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

async function initCloudSync() {
  const dot = document.getElementById('cloudStatusDot');
  const txt = document.getElementById('cloudStatusText');

  try {
    try {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    } catch (authErr) {
      console.warn('Anonymous auth skipped (proceeding directly with Firestore):', authErr);
    }

    onSnapshot(getColRef('staff'), (snap) => {
      state.staff = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderLoginWorkerSelect();
      renderWorkerDropdown();
      renderWorkerFilterChips();
      renderAdminStaffList();
      renderLogs();
    });

    onSnapshot(getColRef('logs'), (snap) => {
      state.logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      state.logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      renderLogs();
      renderHomePortal();
    });

    onSnapshot(getColRef('plans'), (snap) => {
      state.plans = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderPlans();
      renderHomePortal();
    });

    onSnapshot(getColRef('leaves'), (snap) => {
      state.leaves = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      state.leaves.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      renderLeaves();
      renderHomePortal();
    });

    onSnapshot(getColRef('handovers'), (snap) => {
      state.handovers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      state.handovers.sort((a, b) => (b.isImportant ? 1 : 0) - (a.isImportant ? 1 : 0) || (b.timestamp || 0) - (a.timestamp || 0));
      renderHandovers();
      renderHomePortal();
    });

    onSnapshot(getColRef('staff_handovers'), (snap) => {
      state.staffHandovers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      state.staffHandovers.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      renderStaffHandovers();
    });

    onSnapshot(getColRef('tools'), (snap) => {
      state.tools = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderTools();
      renderHomePortal();
    });

    onSnapshot(getColRef('tool_return_alerts'), (snap) => {
      const nextAlerts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      nextAlerts.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));

      if (!hasInitializedToolReturnAlerts) {
        nextAlerts.forEach(a => knownToolReturnAlertIds.add(a.id));
        hasInitializedToolReturnAlerts = true;
      } else {
        const newlyAdded = nextAlerts.filter((a: any) => !knownToolReturnAlertIds.has(a.id) && !a.readByAdmin);
        nextAlerts.forEach(a => knownToolReturnAlertIds.add(a.id));
        if (newlyAdded.length > 0 && state.isAdmin) {
          const latest: any = newlyAdded[0];
          playChatNotificationSound();
          showToast(`🔔 관리자 알림: ${latest.returnedBy || '직원'}님이 '${latest.toolName}' 공구를 반납했습니다.`, 'info');
        }
      }

      state.toolReturnAlerts = nextAlerts;
      renderAdminToolAlerts();
      renderHomePortal();
    });

    onSnapshot(getColRef('detector_logs'), (snap) => {
      state.detectorLogs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      state.detectorLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      renderFireDetectors();
    });

    onSnapshot(getColRef('vendors'), (snap) => {
      state.vendors = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderVendors();
    });

    onSnapshot(getColRef('purchases'), (snap) => {
      state.purchases = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      state.purchases.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      renderPurchases();
      renderHomePortal();
    });

    onSnapshot(getColRef('chats'), (snap) => {
      const prevLen = state.chats.length;
      const prevLatestTs = state.chats.length > 0 ? (state.chats[state.chats.length - 1].timestamp || 0) : 0;
      state.chats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      state.chats.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

      const latestMsg = state.chats[state.chats.length - 1];
      if (latestMsg) {
        if (prevLen === 0 && state.lastSeenChatTimestamp === 0) {
          state.lastSeenChatTimestamp = latestMsg.timestamp || Date.now();
        } else if ((latestMsg.timestamp || 0) > prevLatestTs && latestMsg.senderId !== state.selectedWorkerId) {
          playChatNotificationSound();
          if (state.activeTab !== 'chat') {
            setUnreadChatBadge(true);
            showToast(`💬 ${latestMsg.senderName}: ${latestMsg.text}`, 'info');
          } else {
            state.lastSeenChatTimestamp = latestMsg.timestamp || Date.now();
          }
        }
      }
      renderChats();
    });

    onSnapshot(getColRef('banners'), (snap) => {
      state.banners = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      state.banners.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      renderHomeBanner();
      renderAdminBannerList();
    });

    if (dot) dot.className = 'w-2 h-2 rounded-full bg-emerald-400 shrink-0';
    if (txt) txt.textContent = '클라우드 실시간 서버 연결됨 (전 직원 실시간 동기화)';
  } catch (err) {
    console.error('Firebase init error:', err);
    if (dot) dot.className = 'w-2 h-2 rounded-full bg-amber-400 shrink-0';
    if (txt) txt.textContent = '오프라인 로컬 모드 (인터넷 연결 확인 필요)';
    renderLoginWorkerSelect();
    renderWorkerDropdown();
    renderLogs();
    renderPlans();
    renderLeaves();
  }
}

// AUTH & WORKER SELECTION
function renderLoginWorkerSelect() {
  const sel = document.getElementById('loginWorkerSelect') as HTMLSelectElement | null;
  if (!sel) return;
  const currentVal = sel.value;
  const savedWorker = state.selectedWorkerId || localStorage.getItem('horyeoul7_worker') || '';

  if (state.staff.length === 0) {
    sel.innerHTML = `<option value="__COMMON__">관리자 / 공용 접속 (최초 직원 등록용)</option>`;
    sel.value = '__COMMON__';
    handleLoginWorkerChange('__COMMON__');
    return;
  }

  const preferred = (currentVal && (currentVal === '__COMMON__' || state.staff.some(s => s.id === currentVal)))
    ? currentVal
    : (savedWorker && state.staff.some(s => s.id === savedWorker) ? savedWorker : '');

  const options = [`<option value="">-- 본인 이름을 선택하세요 --</option>`];
  state.staff.forEach(s => {
    const selected = s.id === preferred ? 'selected' : '';
    options.push(`<option value="${s.id}" ${selected}>${escapeHtml(s.name)} (${escapeHtml(s.role)})</option>`);
  });
  options.push(`<option value="__COMMON__" ${preferred === '__COMMON__' ? 'selected' : ''}>관리자 / 공용 접속 (이름 나중에 선택)</option>`);
  sel.innerHTML = options.join('');
  handleLoginWorkerChange(sel.value);
}

function handleLoginWorkerChange(workerId: string) {
  const hint = document.getElementById('loginWorkerHint');
  if (!hint) return;
  if (workerId === '__COMMON__') {
    hint.textContent = state.staff.length === 0
      ? '등록된 직원이 없습니다. 공용 비밀번호로 접속 후 관리자 모드에서 직원을 등록해 주세요.'
      : '공용 비밀번호로 접속 후 상단에서 작업자를 선택할 수 있습니다.';
    return;
  }
  const staffMember = state.staff.find(s => s.id === workerId);
  if (staffMember) {
    hint.textContent = staffMember.pin
      ? `${staffMember.name} (${staffMember.role})님의 개인 비밀번호를 입력하세요.`
      : `${staffMember.name} (${staffMember.role})님 선택됨 · 공용 비밀번호를 입력하세요.`;
  } else {
    hint.textContent = '등록된 직원 이름을 선택 후 비밀번호를 입력하세요.';
  }
}

function handleLogin(e: Event) {
  e.preventDefault();
  const sel = document.getElementById('loginWorkerSelect') as HTMLSelectElement | null;
  const pwInput = document.getElementById('loginPw') as HTMLInputElement | null;
  const rememberInput = document.getElementById('loginRememberMe') as HTMLInputElement | null;

  const workerId = sel ? sel.value : '__COMMON__';
  const pw = pwInput ? pwInput.value.trim() : '';
  const remember = Boolean(rememberInput?.checked);

  if (state.staff.length > 0 && !workerId) {
    showToast('로그인할 본인 이름을 먼저 선택해 주세요.', 'error');
    sel?.focus();
    return;
  }

  const selectedStaff = (workerId && workerId !== '__COMMON__')
    ? state.staff.find(s => s.id === workerId)
    : null;

  const isValidPw = selectedStaff && selectedStaff.pin
    ? (pw === String(selectedStaff.pin).trim() || pw === '3927')
    : (pw === '1234' || pw === '3927');

  if (!isValidPw) {
    showToast(
      selectedStaff && selectedStaff.pin
        ? '선택한 직원의 개인 비밀번호가 일치하지 않습니다.'
        : '비밀번호가 일치하지 않습니다.',
      'error'
    );
    return;
  }

  state.isLoggedIn = true;
  sessionStorage.setItem('horyeoul7_logged_in', 'true');
  if (remember) {
    localStorage.setItem('horyeoul7_auto_login', 'true');
  } else {
    localStorage.removeItem('horyeoul7_auto_login');
  }

  if (selectedStaff) {
    handleWorkerChange(selectedStaff.id);
    renderWorkerDropdown();
  } else {
    state.selectedWorkerId = '';
    localStorage.removeItem('horyeoul7_worker');
    renderWorkerDropdown();
  }

  if (pwInput) pwInput.value = '';
  document.getElementById('loginScreen')?.classList.add('hidden');
  switchTab('home');
  showToast(
    selectedStaff
      ? `${selectedStaff.name} (${selectedStaff.role})님으로 로그인되었습니다.`
      : '관리자 / 공용 접속으로 로그인되었습니다.',
    'success'
  );
}

function handleLogout() {
  state.isLoggedIn = false;
  sessionStorage.removeItem('horyeoul7_logged_in');
  localStorage.removeItem('horyeoul7_auto_login');
  const pwInput = document.getElementById('loginPw') as HTMLInputElement | null;
  if (pwInput) pwInput.value = '';
  const rememberInput = document.getElementById('loginRememberMe') as HTMLInputElement | null;
  if (rememberInput) rememberInput.checked = false;
  renderLoginWorkerSelect();
  document.getElementById('loginScreen')?.classList.remove('hidden');
  showToast('로그아웃 되었습니다.', 'info');
}

function renderWorkerDropdown() {
  const sel = document.getElementById('workerSelect') as HTMLSelectElement | null;
  if (!sel) return;
  const options = [`<option value="">-- 작업자 선택 --</option>`];
  state.staff.forEach(s => {
    const selected = s.id === state.selectedWorkerId ? 'selected' : '';
    options.push(`<option value="${s.id}" ${selected}>${escapeHtml(s.name)} (${escapeHtml(s.role)})</option>`);
  });
  sel.innerHTML = options.join('');
  updateWorkerBanner();
}

function handleWorkerChange(workerId: string) {
  state.selectedWorkerId = workerId;
  localStorage.setItem('horyeoul7_worker', workerId);
  updateWorkerBanner();
  renderLogs();
  renderHandovers();
  renderChats();
}

function updateWorkerBanner() {
  const worker = getSelectedWorker();
  const alertBanner = document.getElementById('workerAlertBanner');
  const authorTag = document.getElementById('formAuthorTag');
  const hoAuthorTag = document.getElementById('handoverAuthorTag');
  const leaveAuthorTag = document.getElementById('leaveAuthorTag');
  const purchaseAuthorTag = document.getElementById('purchaseAuthorTag');
  const chatBadge = document.getElementById('chatCurrentUserBadge');

  if (worker) {
    alertBanner?.classList.add('hidden');
    const label = `${worker.name} (${worker.role})`;
    if (authorTag) authorTag.textContent = `작성자: ${label}`;
    if (hoAuthorTag) hoAuthorTag.textContent = `작성자: ${label}`;
    if (leaveAuthorTag) leaveAuthorTag.textContent = `신청자: ${label}`;
    if (purchaseAuthorTag) purchaseAuthorTag.textContent = `구매자: ${label}`;
    if (chatBadge) chatBadge.textContent = label;
  } else {
    alertBanner?.classList.remove('hidden');
    if (authorTag) authorTag.textContent = '작성자: 미선택';
    if (hoAuthorTag) hoAuthorTag.textContent = '작성자: 미선택';
    if (leaveAuthorTag) leaveAuthorTag.textContent = '신청자: 미선택';
    if (purchaseAuthorTag) purchaseAuthorTag.textContent = '구매자: 미선택';
    if (chatBadge) chatBadge.textContent = '작업자 미선택';
  }
}

// NAVIGATION TABS & HOME PORTAL (홈)
function switchTab(tabId: string) {
  state.activeTab = tabId;
  checkDayRollover();
  const allSections = ['home', 'write', 'logs', 'plans', 'leave', 'chat', 'handover', 'tools', 'vendors', 'purchases', 'admin'];
  allSections.forEach(t => {
    const sec = document.getElementById(`tab-${t}`);
    if (t === tabId) {
      sec?.classList.remove('hidden');
    } else {
      sec?.classList.add('hidden');
    }
  });

  const quickBar = document.getElementById('quickTabBar');
  if (quickBar) {
    quickBar.classList.toggle('hidden', tabId === 'home');
  }
  allSections.forEach(t => {
    const qBtn = document.getElementById(`quickNav-${t}`);
    if (!qBtn) return;
    if (t === tabId) {
      qBtn.className = 'relative shrink-0 px-2.5 py-1.5 rounded-lg bg-white text-brand-700 font-extrabold shadow-xs transition flex items-center gap-1 whitespace-nowrap';
      if (tabId !== 'home') {
        requestAnimationFrame(() => {
          qBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        });
      }
    } else {
      qBtn.className = t === 'home'
        ? 'relative shrink-0 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white font-bold transition flex items-center gap-1 whitespace-nowrap'
        : 'relative shrink-0 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/25 text-white/90 font-semibold transition flex items-center gap-1 whitespace-nowrap';
    }
  });

  const homeBtn = document.getElementById('headerHomeBtn');
  if (homeBtn) {
    homeBtn.className = tabId === 'home'
      ? 'px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-extrabold rounded-xl bg-white text-brand-700 border border-white shadow-xs flex items-center gap-1.5 transition whitespace-nowrap'
      : 'px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-bold rounded-xl bg-white/20 hover:bg-white/30 text-white border border-white/25 flex items-center gap-1.5 transition whitespace-nowrap';
  }
  window.scrollTo({ top: 0 });

  if (tabId !== 'write') stopVoiceInput();
  if (tabId === 'home') renderHomePortal();
  if (tabId === 'logs') renderLogs();
  if (tabId === 'plans') renderPlans();
  if (tabId === 'leave') renderLeaves();
  if (tabId === 'tools') {
    renderTools();
    renderFireDetectors();
  }
  if (tabId === 'purchases') renderPurchases();
  if (tabId === 'admin') renderAdminToolAlerts();
  if (tabId === 'chat') {
    setUnreadChatBadge(false);
    const latest = state.chats[state.chats.length - 1];
    if (latest) state.lastSeenChatTimestamp = latest.timestamp || Date.now();
    renderChats();
  }
}

function setHomePlanMode(mode: string) {
  state.homePlanMode = mode;
  const activeStyles: Record<string, string> = {
    ALL: 'bg-navy-800 text-white',
    DAILY: 'bg-brand-600 text-white',
    WEEKLY: 'bg-indigo-600 text-white',
    MONTHLY: 'bg-teal-600 text-white'
  };
  ['ALL', 'DAILY', 'WEEKLY', 'MONTHLY'].forEach(k => {
    const btn = document.getElementById(`homePlanTab-${k}`);
    const cnt = document.getElementById(`homePlanCount-${k}`);
    if (btn) {
      btn.className = k === mode
        ? `py-1.5 px-1.5 rounded-lg ${activeStyles[k] || 'bg-navy-800 text-white'} font-bold transition flex items-center justify-center gap-1 whitespace-nowrap`
        : 'py-1.5 px-1.5 rounded-lg text-slate-600 hover:text-slate-900 font-semibold transition flex items-center justify-center gap-1 whitespace-nowrap';
    }
    if (cnt) {
      cnt.className = k === mode
        ? 'px-1.5 rounded-full bg-white/25 text-white text-[10px]'
        : 'px-1.5 rounded-full bg-slate-200 text-slate-700 text-[10px]';
    }
  });
  renderHomePortal();
}

function renderHomePortal() {
  const todayStr = getTodayString();
  const d = new Date(todayStr + 'T00:00:00');
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const dateLabelEl = document.getElementById('homeTodayDateText');
  if (dateLabelEl) {
    dateLabelEl.textContent = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${weekdays[d.getDay()]})`;
  }

  // Update 10-card live indicators
  const todayLogsCount = state.logs.filter(l => l.date === todayStr).length;
  const logsBadge = document.getElementById('homeBadge-logs');
  if (logsBadge) {
    logsBadge.textContent = String(todayLogsCount);
    logsBadge.classList.toggle('hidden', todayLogsCount === 0);
  }

  const weekRange = getWeekRange(todayStr);
  const ym = todayStr.slice(0, 7);
  const dailyPlans = state.plans.filter(p => p.type === 'DAILY' && p.date === todayStr);
  const weeklyPlans = state.plans.filter(p => p.type === 'WEEKLY' && p.date >= weekRange.start && p.date <= weekRange.end);
  const monthlyPlans = state.plans.filter(p => p.type === 'MONTHLY' && (p.date || '').startsWith(ym));
  const allHomePlans = [...dailyPlans, ...weeklyPlans, ...monthlyPlans];
  const pendingPlansCount = allHomePlans.filter(p => !p.done).length;

  const plansBadge = document.getElementById('homeBadge-plans');
  if (plansBadge) {
    plansBadge.textContent = String(pendingPlansCount);
    plansBadge.classList.toggle('hidden', pendingPlansCount === 0);
  }

  const hasTodayLeave = state.leaves.some(l => l.startDate <= todayStr && (l.endDate || l.startDate) >= todayStr);
  document.getElementById('homeDot-leave')?.classList.toggle('hidden', !hasTodayLeave);
  document.getElementById('qDot-leave')?.classList.toggle('hidden', !hasTodayLeave);

  const hasUnconfirmedHo = state.handovers.some(h => !h.confirmedBy);
  document.getElementById('homeDot-handover')?.classList.toggle('hidden', !hasUnconfirmedHo);
  document.getElementById('qDot-handover')?.classList.toggle('hidden', !hasUnconfirmedHo);

  const hasToolAlert = state.tools.some(t => t.status === 'RENTED' || isToolLowStock(t));
  document.getElementById('homeDot-tools')?.classList.toggle('hidden', !hasToolAlert);
  document.getElementById('qDot-tools')?.classList.toggle('hidden', !hasToolAlert);

  const hasUnverifiedPur = state.purchases.some(p => !p.verifiedBy);
  document.getElementById('homeDot-purchases')?.classList.toggle('hidden', !hasUnverifiedPur);
  document.getElementById('qDot-purchases')?.classList.toggle('hidden', !hasUnverifiedPur);

  const hasUnreadAdminAlert = state.toolReturnAlerts.some(a => !a.readByAdmin);
  document.getElementById('homeDot-admin')?.classList.toggle('hidden', !hasUnreadAdminAlert);
  document.getElementById('qDot-admin')?.classList.toggle('hidden', !hasUnreadAdminAlert);

  // Render Notices & Important Handovers on Home
  const noticeBox = document.getElementById('homeNoticeList');
  if (noticeBox) {
    const sortedNotices = [...state.handovers].sort((a, b) => {
      const aScore = (a.isImportant ? 2 : 0) + (a.type === '전체공지' ? 1 : 0);
      const bScore = (b.isImportant ? 2 : 0) + (b.type === '전체공지' ? 1 : 0);
      return bScore - aScore || (b.timestamp || 0) - (a.timestamp || 0);
    }).slice(0, 5);

    if (sortedNotices.length === 0) {
      noticeBox.innerHTML = `
        <div class="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-5 text-center space-y-2">
          <p class="text-xs text-slate-400">등록된 공지사항 · 인수인계가 없습니다.</p>
          <button type="button" onclick="switchTab('handover')" class="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-[11px] font-bold text-slate-700 transition">공지·인수인계 작성하기</button>
        </div>
      `;
    } else {
      noticeBox.innerHTML = sortedNotices.map(h => {
        const isNotice = h.type === '전체공지';
        const badgeHtml = isNotice
          ? `<span class="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-extrabold">📢 전체공지</span>`
          : `<span class="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-extrabold">${escapeHtml(h.type || '인수인계')}</span>`;
        const pinHtml = h.isImportant
          ? `<span class="px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-extrabold">📌 중요</span>`
          : '';
        return `
          <div class="p-2.5 rounded-xl border ${h.isImportant ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50 border-slate-200'} space-y-1">
            <div class="flex items-center justify-between gap-1.5 flex-wrap">
              <div class="flex items-center gap-1 flex-wrap">${pinHtml}${badgeHtml}</div>
              <span class="text-[10px] text-slate-400">${escapeHtml(h.createdAt || '')}</span>
            </div>
            <p class="text-xs text-slate-800 font-medium leading-relaxed line-clamp-2 whitespace-pre-line">${escapeHtml(h.content)}</p>
            <div class="flex items-center justify-between text-[10px] text-slate-500">
              <span>작성: <strong>${escapeHtml(h.authorName || '-')}</strong></span>
              ${h.confirmedBy
                ? `<span class="text-emerald-700 font-bold">✔ 확인 (${escapeHtml(h.confirmedBy)})</span>`
                : `<span class="text-amber-700 font-bold">미확인</span>`
              }
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Render Daily / Weekly / Monthly Plans on Home
  const countMap: Record<string, number> = {
    ALL: allHomePlans.length,
    DAILY: dailyPlans.length,
    WEEKLY: weeklyPlans.length,
    MONTHLY: monthlyPlans.length
  };
  ['ALL', 'DAILY', 'WEEKLY', 'MONTHLY'].forEach(k => {
    const el = document.getElementById(`homePlanCount-${k}`);
    if (el) el.textContent = String(countMap[k] || 0);
  });

  const planBox = document.getElementById('homePlanList');
  if (planBox) {
    const targetList = state.homePlanMode === 'DAILY'
      ? dailyPlans
      : state.homePlanMode === 'WEEKLY'
        ? weeklyPlans
        : state.homePlanMode === 'MONTHLY'
          ? monthlyPlans
          : allHomePlans;

    if (targetList.length === 0) {
      const modeNames: Record<string, string> = {
        ALL: '오늘·이번 주·이번 달',
        DAILY: '오늘 일일',
        WEEKLY: '이번 주 주간',
        MONTHLY: '이번 달 월간'
      };
      planBox.innerHTML = `
        <div class="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center space-y-2">
          <p class="text-xs text-slate-400">${modeNames[state.homePlanMode] || ''} 등록된 업무계획이 없습니다.</p>
          <button type="button" onclick="switchTab('plans')" class="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-[11px] font-bold text-indigo-700 transition">업무계획 등록하기</button>
        </div>
      `;
    } else {
      planBox.innerHTML = targetList.map(p => {
        const typeBadge = p.type === 'DAILY'
          ? `<span class="px-1.5 py-0.5 rounded bg-brand-100 text-brand-800 text-[10px] font-extrabold">일일</span>`
          : p.type === 'WEEKLY'
            ? `<span class="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-extrabold">주간</span>`
            : `<span class="px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 text-[10px] font-extrabold">월간</span>`;
        return `
          <div class="flex items-start justify-between gap-2 p-2.5 rounded-xl border ${p.done ? 'bg-slate-50 border-slate-200 opacity-75' : 'bg-white border-slate-200'} transition">
            <div class="flex items-start gap-2 min-w-0">
              <input type="checkbox" ${p.done ? 'checked' : ''} onchange="togglePlanDone('${p.id}')" class="mt-0.5 w-4 h-4 text-brand-600 rounded cursor-pointer shrink-0">
              <div class="min-w-0 space-y-0.5">
                <div class="flex items-center gap-1.5 flex-wrap">
                  ${typeBadge}
                  <span class="text-[10px] font-bold text-slate-500">${escapeHtml(p.date)}</span>
                  <span class="text-[10px] font-semibold text-slate-500">· 담당: ${escapeHtml(p.assignee || '공통')}</span>
                </div>
                <p class="text-xs font-bold ${p.done ? 'line-through text-slate-400' : 'text-slate-800'}">${escapeHtml(p.title)}</p>
                ${p.location ? `<span class="text-[10px] text-brand-700 font-semibold block"><i class="fa-solid fa-location-dot mr-0.5"></i>${escapeHtml(p.location)}</span>` : ''}
              </div>
            </div>
            <button type="button" onclick="sendPlanToWorkLog('${p.id}')" title="일지작성으로 옮기기" class="shrink-0 px-2 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-[10px] font-bold transition whitespace-nowrap">
              일지로 <i class="fa-solid fa-arrow-right ml-0.5"></i>
            </button>
          </div>
        `;
      }).join('');
    }
  }
}

// HOME EVENT & CONDOLENCE BANNER
function renderHomeBanner() {
  const wrapper = document.getElementById('homeEventBannerWrapper');
  const card = document.getElementById('homeEventBannerCard');
  if (!wrapper || !card) return;

  if (!state.bannerEnabled || state.banners.length === 0) {
    wrapper.classList.add('hidden');
    return;
  }

  if (state.bannerIndex >= state.banners.length) state.bannerIndex = 0;
  const item = state.banners[state.bannerIndex];
  const st = BANNER_STYLES[item.category] || BANNER_STYLES.event;

  wrapper.classList.remove('hidden');
  card.className = `rounded-2xl p-3.5 shadow-sm border transition-all relative overflow-hidden ${st.cardBg}`;
  card.innerHTML = `
    <div class="flex items-start justify-between gap-2">
      <div class="space-y-1 min-w-0">
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="px-2 py-0.5 rounded-md text-[10px] font-extrabold ${st.badgeBg}">${st.badge}</span>
          <span class="text-[11px] font-bold ${st.subColor}">${escapeHtml(item.date || '')} ${escapeHtml(item.time || '')} · ${escapeHtml(item.location || '')}</span>
        </div>
        <h4 class="text-sm font-extrabold ${st.titleColor} leading-snug">${escapeHtml(item.title)}</h4>
        ${item.desc ? `<p class="text-xs ${st.descColor} leading-relaxed">${escapeHtml(item.desc)}</p>` : ''}
      </div>
      ${state.banners.length > 1 ? `
        <button type="button" onclick="cycleBanner()" class="shrink-0 px-2 py-1 bg-white/80 hover:bg-white text-slate-700 rounded-lg text-[10px] font-extrabold border border-slate-200 shadow-xs">
          다음 (${state.bannerIndex + 1}/${state.banners.length})
        </button>
      ` : ''}
    </div>
  `;
}

function cycleBanner() {
  if (state.banners.length <= 1) return;
  state.bannerIndex = (state.bannerIndex + 1) % state.banners.length;
  renderHomeBanner();
}

function toggleBannerGlobal(checked: boolean) {
  state.bannerEnabled = checked;
  renderHomeBanner();
}

async function handleAddBanner(e: Event) {
  e.preventDefault();
  const category = (document.getElementById('bannerCategory') as HTMLSelectElement).value;
  const date = (document.getElementById('bannerDate') as HTMLInputElement).value;
  const time = (document.getElementById('bannerTime') as HTMLInputElement).value;
  const location = (document.getElementById('bannerLocation') as HTMLInputElement).value.trim();
  const title = (document.getElementById('bannerTitle') as HTMLInputElement).value.trim();
  const desc = (document.getElementById('bannerDesc') as HTMLTextAreaElement).value.trim();
  if (!title) return;

  const id = 'ban-' + Date.now();
  const newBan = { id, category, date, time, location, title, desc, timestamp: Date.now() };
  state.banners.unshift(newBan);
  (document.getElementById('bannerLocation') as HTMLInputElement).value = '';
  (document.getElementById('bannerTitle') as HTMLInputElement).value = '';
  (document.getElementById('bannerDesc') as HTMLTextAreaElement).value = '';
  renderHomeBanner();
  renderAdminBannerList();

  try { await setDoc(getDocRef('banners', id), newBan); } catch (err) { console.error(err); }
  showToast('첫 화면 공지 배너가 등록되었습니다.', 'success');
}

async function deleteBanner(id: string) {
  state.banners = state.banners.filter(b => b.id !== id);
  renderHomeBanner();
  renderAdminBannerList();
  try { await deleteDoc(getDocRef('banners', id)); } catch (err) { console.error(err); }
  showToast('배너가 삭제되었습니다.', 'info');
}

function renderAdminBannerList() {
  const box = document.getElementById('adminBannerListContainer');
  if (!box) return;
  if (state.banners.length === 0) {
    box.innerHTML = `<p class="text-[11px] text-slate-400 text-center py-2">등록된 첫 화면 배너가 없습니다.</p>`;
    return;
  }
  box.innerHTML = state.banners.map(b => `
    <div class="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
      <div class="min-w-0">
        <strong class="text-slate-800 block truncate">${escapeHtml(b.title)}</strong>
        <span class="text-[10px] text-slate-500">${escapeHtml(b.date || '')} · ${escapeHtml(b.location || '')}</span>
      </div>
      <button type="button" onclick="deleteBanner('${b.id}')" class="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold shrink-0">삭제</button>
    </div>
  `).join('');
}

// WORK LOG WRITE & PHOTO & SUBMIT
function selectLogCategory(cat: string) {
  (document.getElementById('logCategory') as HTMLInputElement).value = cat;
  const activeColors: Record<string, string> = {
    '공용민원': 'bg-brand-600 text-white',
    '세대민원': 'bg-amber-600 text-white',
    '세대민원(긴급)': 'bg-rose-600 text-white',
    '정기점검': 'bg-indigo-600 text-white',
    '하자보수': 'bg-violet-600 text-white'
  };
  ['공용민원', '세대민원', '세대민원(긴급)', '정기점검', '하자보수'].forEach(c => {
    const btn = document.getElementById(`logCatBtn-${c}`);
    if (!btn) return;
    btn.className = c === cat
      ? `py-2.5 px-2 rounded-xl ${activeColors[c] || 'bg-brand-600 text-white'} font-bold text-xs shadow-xs transition flex items-center justify-center gap-1 whitespace-nowrap`
      : 'py-2.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1 whitespace-nowrap';
  });
}

function setQuickLocation(loc: string) {
  const el = document.getElementById('logLocation') as HTMLInputElement | null;
  if (el) el.value = loc;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function estimateDataUrlBytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',');
  const b64Len = commaIdx >= 0 ? dataUrl.length - commaIdx - 1 : dataUrl.length;
  return Math.round((b64Len * 3) / 4);
}

function isVideoMediaSrc(src: string, mediaType?: string): boolean {
  if (mediaType === 'video') return true;
  if (!src) return false;
  return src.startsWith('data:video/');
}

interface OptimizedImageResult {
  dataUrl: string;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  originalBytes: number;
  optimizedBytes: number;
  savedPercent: number;
}

async function decodeImageSourceForCanvas(file: File): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
}> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close()
      };
    } catch {
      try {
        const bitmap = await createImageBitmap(file);
        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          cleanup: () => bitmap.close()
        };
      } catch {
        // Fallback to HTMLImageElement below
      }
    }
  }

  return await new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({
        source: img,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        cleanup: () => URL.revokeObjectURL(objectUrl)
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('이미지를 디코딩할 수 없습니다.'));
    };
    img.src = objectUrl;
  });
}

async function optimizeImageFile(
  file: File,
  options?: {
    scale?: number;
    maxDimension?: number;
    minDimension?: number;
    maxTargetBytes?: number;
    initialQuality?: number;
  }
): Promise<OptimizedImageResult> {
  const scale = options?.scale ?? 0.5;
  const maxDim = options?.maxDimension ?? 1200;
  const minDim = options?.minDimension ?? 240;
  const maxTargetBytes = options?.maxTargetBytes ?? 420 * 1024;
  const initialQuality = options?.initialQuality ?? 0.72;

  const decoded = await decodeImageSourceForCanvas(file);
  try {
    const origW = Math.max(1, decoded.width);
    const origH = Math.max(1, decoded.height);

    // 50% resizing (preserve tiny thumbnails above minDim)
    let w = (origW <= minDim && origH <= minDim) ? origW : Math.max(1, Math.round(origW * scale));
    let h = (origW <= minDim && origH <= minDim) ? origH : Math.max(1, Math.round(origH * scale));

    if (w > maxDim || h > maxDim) {
      if (w >= h) {
        h = Math.max(1, Math.round((h * maxDim) / w));
        w = maxDim;
      } else {
        w = Math.max(1, Math.round((w * maxDim) / h));
        h = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D 컨텍스트를 생성할 수 없습니다.');

    // Drawing onto fresh Canvas & re-encoding JPEG strips all EXIF metadata (GPS, device info, timestamps)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(decoded.source, 0, 0, w, h);

    const qualities = [initialQuality, 0.62, 0.52, 0.42];
    let dataUrl = canvas.toDataURL('image/jpeg', qualities[0]);
    for (let i = 1; i < qualities.length; i++) {
      if (estimateDataUrlBytes(dataUrl) <= maxTargetBytes) break;
      dataUrl = canvas.toDataURL('image/jpeg', qualities[i]);
    }

    // If still larger than target, shrink one more step by 75%
    if (estimateDataUrlBytes(dataUrl) > maxTargetBytes && (w > 480 || h > 480)) {
      const cw = Math.max(1, Math.round(w * 0.75));
      const ch = Math.max(1, Math.round(h * 0.75));
      const smallCanvas = document.createElement('canvas');
      smallCanvas.width = cw;
      smallCanvas.height = ch;
      const sCtx = smallCanvas.getContext('2d');
      if (sCtx) {
        sCtx.fillStyle = '#ffffff';
        sCtx.fillRect(0, 0, cw, ch);
        sCtx.imageSmoothingEnabled = true;
        sCtx.imageSmoothingQuality = 'high';
        sCtx.drawImage(canvas, 0, 0, cw, ch);
        dataUrl = smallCanvas.toDataURL('image/jpeg', 0.52);
        w = cw;
        h = ch;
      }
    }

    const optimizedBytes = estimateDataUrlBytes(dataUrl);
    const savedPercent = file.size > 0 ? Math.max(0, Math.round((1 - optimizedBytes / file.size) * 100)) : 0;

    return {
      dataUrl,
      width: w,
      height: h,
      originalWidth: origW,
      originalHeight: origH,
      originalBytes: file.size,
      optimizedBytes,
      savedPercent
    };
  } finally {
    decoded.cleanup();
  }
}

function getSupportedVideoMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4'
  ];
  for (const mime of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(mime)) return mime;
    } catch {
      // ignore
    }
  }
  return '';
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('파일을 Data URL로 변환하지 못했습니다.'));
    reader.readAsDataURL(blob);
  });
}

async function runVideoCompressionPass(
  file: File,
  passOptions: { maxDim: number; maxDurationSec: number; bitrate: number; fps: number },
  onProgress?: (pct: number, message: string) => void
): Promise<{ dataUrl: string; width: number; height: number; durationSec: number; optimizedBytes: number }> {
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = objectUrl;

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('동영상 메타데이터 로딩 시간 초과')), 12000);
      video.onloadedmetadata = () => {
        window.clearTimeout(timer);
        resolve();
      };
      video.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error('지원하지 않는 동영상 형식입니다.'));
      };
    });

    const rawW = Math.max(2, video.videoWidth || 640);
    const rawH = Math.max(2, video.videoHeight || 360);
    // 50% scale capped at maxDim, rounded to even numbers for encoder compatibility
    let targetW = Math.round(rawW * 0.5);
    let targetH = Math.round(rawH * 0.5);
    if (targetW > passOptions.maxDim || targetH > passOptions.maxDim) {
      if (targetW >= targetH) {
        targetH = Math.round((targetH * passOptions.maxDim) / targetW);
        targetW = passOptions.maxDim;
      } else {
        targetW = Math.round((targetW * passOptions.maxDim) / targetH);
        targetH = passOptions.maxDim;
      }
    }
    targetW = Math.max(160, targetW & ~1);
    targetH = Math.max(120, targetH & ~1);

    const rawDuration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 5;
    const clipDuration = Math.min(rawDuration, passOptions.maxDurationSec);
    const dynamicBitrate = Math.min(
      passOptions.bitrate,
      Math.max(95_000, Math.floor((440_000 * 8) / Math.max(clipDuration, 2)))
    );

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('동영상 압축용 캔버스를 생성할 수 없습니다.');

    const mimeType = getSupportedVideoMimeType();
    if (!mimeType || typeof canvas.captureStream !== 'function') {
      throw new Error('이 브라우저에서는 동영상 자동 압축(MediaRecorder)을 지원하지 않습니다.');
    }

    const stream = canvas.captureStream(passOptions.fps);
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: dynamicBitrate
    });
    activeMediaRecorder = recorder;

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunks.push(ev.data);
    };

    const recordingPromise = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        if (mediaCompressionCancelled) {
          reject(new Error('CANCELLED'));
          return;
        }
        resolve(new Blob(chunks, { type: mimeType.split(';')[0] || 'video/webm' }));
      };
      recorder.onerror = () => {
        stream.getTracks().forEach(t => t.stop());
        reject(new Error('동영상 인코딩 중 오류가 발생했습니다.'));
      };
    });

    video.currentTime = 0;
    recorder.start(250);
    await video.play();

    let stopped = false;
    const stopAll = () => {
      if (stopped) return;
      stopped = true;
      try { video.pause(); } catch { /* ignore */ }
      if (recorder.state !== 'inactive') {
        try { recorder.stop(); } catch { /* ignore */ }
      }
    };

    const drawLoop = () => {
      if (mediaCompressionCancelled) {
        stopAll();
        return;
      }
      ctx.drawImage(video, 0, 0, targetW, targetH);
      const pct = Math.min(99, Math.round((video.currentTime / Math.max(clipDuration, 0.5)) * 100));
      onProgress?.(pct, `동영상 자동 압축 중... ${pct}% (${targetW}×${targetH})`);
      if (video.ended || video.currentTime >= clipDuration) {
        stopAll();
        return;
      }
      requestAnimationFrame(drawLoop);
    };
    requestAnimationFrame(drawLoop);

    const guardTimer = window.setTimeout(stopAll, Math.ceil((clipDuration + 1.5) * 1000));
    const blob = await recordingPromise;
    window.clearTimeout(guardTimer);

    const dataUrl = await readBlobAsDataUrl(blob);
    return {
      dataUrl,
      width: targetW,
      height: targetH,
      durationSec: clipDuration,
      optimizedBytes: blob.size
    };
  } finally {
    activeMediaRecorder = null;
    try { video.pause(); } catch { /* ignore */ }
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}

async function compressVideoFile(
  file: File,
  onProgress?: (pct: number, message: string) => void
): Promise<{
  dataUrl: string;
  width: number;
  height: number;
  originalBytes: number;
  optimizedBytes: number;
  savedPercent: number;
  trimmed: boolean;
}> {
  mediaCompressionCancelled = false;
  let result: { dataUrl: string; width: number; height: number; durationSec: number; optimizedBytes: number };

  try {
    result = await runVideoCompressionPass(
      file,
      { maxDim: 480, maxDurationSec: 12, bitrate: 320_000, fps: 15 },
      onProgress
    );

    // If compressed dataUrl is still too large for Firestore 1MB doc limit, try a tighter compact pass
    if (result.dataUrl.length > 760_000 && !mediaCompressionCancelled) {
      onProgress?.(10, '클라우드 용량에 맞춰 추가 압축 중...');
      result = await runVideoCompressionPass(
        file,
        { maxDim: 320, maxDurationSec: 8, bitrate: 140_000, fps: 12 },
        onProgress
      );
    }
  } catch (err: any) {
    if (err?.message === 'CANCELLED') throw err;
    // Fallback if MediaRecorder unsupported AND file is already very small (<520KB)
    if (file.size <= 520 * 1024) {
      const rawDataUrl = await readBlobAsDataUrl(file);
      return {
        dataUrl: rawDataUrl,
        width: 0,
        height: 0,
        originalBytes: file.size,
        optimizedBytes: file.size,
        savedPercent: 0,
        trimmed: false
      };
    }
    throw err;
  }

  if (result.dataUrl.length > 840_000) {
    throw new Error('동영상 용량이 커서 클라우드 저장 한도(약 600KB)를 초과합니다. 10초 이내의 짧은 영상을 사용해 주세요.');
  }

  const savedPercent = file.size > 0 ? Math.max(0, Math.round((1 - result.optimizedBytes / file.size) * 100)) : 0;
  return {
    dataUrl: result.dataUrl,
    width: result.width,
    height: result.height,
    originalBytes: file.size,
    optimizedBytes: result.optimizedBytes,
    savedPercent,
    trimmed: result.durationSec >= 11.9
  };
}

function cancelMediaCompression() {
  mediaCompressionCancelled = true;
  if (activeMediaRecorder && activeMediaRecorder.state !== 'inactive') {
    try { activeMediaRecorder.stop(); } catch { /* ignore */ }
  }
  document.getElementById('logMediaProgressBox')?.classList.add('hidden');
  const inp = document.getElementById('logPhotoInput') as HTMLInputElement | null;
  if (inp) inp.value = '';
  showToast('미디어 압축이 취소되었습니다.', 'info');
}

async function handlePhotoUpload(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v|3gp|avi)$/i.test(file.name);
  const progressBox = document.getElementById('logMediaProgressBox');
  const progressBar = document.getElementById('logMediaProgressBar');
  const progressText = document.getElementById('logMediaProgressText');
  const previewBox = document.getElementById('photoPreviewBox');
  const imgEl = document.getElementById('photoPreviewImg') as HTMLImageElement | null;
  const videoEl = document.getElementById('photoPreviewVideo') as HTMLVideoElement | null;
  const captionTag = document.getElementById('photoCaptionTag');

  if (isVideo) {
    progressBox?.classList.remove('hidden');
    if (progressBar) progressBar.style.width = '8%';
    if (progressText) progressText.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i>동영상 분석 및 자동 압축 준비 중...`;

    try {
      const compressed = await compressVideoFile(file, (pct, msg) => {
        if (progressBar) progressBar.style.width = `${Math.max(8, pct)}%`;
        if (progressText) progressText.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i>${escapeHtml(msg)}`;
      });

      progressBox?.classList.add('hidden');
      currentUploadedPhoto = compressed.dataUrl;
      currentUploadedMediaType = 'video';

      if (imgEl) { imgEl.classList.add('hidden'); imgEl.src = ''; }
      if (videoEl) {
        videoEl.src = compressed.dataUrl;
        videoEl.classList.remove('hidden');
      }
      if (captionTag) {
        captionTag.textContent = `🎥 동영상 압축 완료 · ${formatBytes(compressed.originalBytes)} → ${formatBytes(compressed.optimizedBytes)}${compressed.savedPercent > 0 ? ` (-${compressed.savedPercent}%)` : ''}`;
      }
      previewBox?.classList.remove('hidden');
      showToast(
        compressed.trimmed
          ? `동영상이 자동 압축되었습니다 (최대 12초 최적화 · ${formatBytes(compressed.optimizedBytes)}).`
          : `동영상이 자동 압축되었습니다 (${formatBytes(compressed.originalBytes)} → ${formatBytes(compressed.optimizedBytes)}).`,
        'success'
      );
    } catch (err: any) {
      progressBox?.classList.add('hidden');
      input.value = '';
      if (err?.message !== 'CANCELLED') {
        console.error('Video compression error:', err);
        showToast(err?.message || '동영상 압축 중 오류가 발생했습니다.', 'error');
      }
    }
    return;
  }

  // Image EXIF stripping + 50% auto-resizing
  try {
    const opt = await optimizeImageFile(file, {
      scale: 0.5,
      maxDimension: 1200,
      maxTargetBytes: 420 * 1024,
      initialQuality: 0.72
    });
    currentUploadedPhoto = opt.dataUrl;
    currentUploadedMediaType = 'image';

    if (videoEl) {
      videoEl.pause();
      videoEl.classList.add('hidden');
      videoEl.removeAttribute('src');
    }
    if (imgEl) {
      imgEl.src = opt.dataUrl;
      imgEl.classList.remove('hidden');
    }
    if (captionTag) {
      captionTag.textContent = `EXIF 삭제 · 50% 축소 (${opt.width}×${opt.height} · ${formatBytes(opt.originalBytes)} → ${formatBytes(opt.optimizedBytes)})`;
    }
    previewBox?.classList.remove('hidden');
    showToast(`EXIF 삭제 및 50% 리사이징 완료 (${formatBytes(opt.originalBytes)} → ${formatBytes(opt.optimizedBytes)})`, 'success');
  } catch (err) {
    console.error('Photo optimization error:', err);
    input.value = '';
    showToast('지원하지 않는 이미지 형식이거나 처리 중 오류가 발생했습니다.', 'error');
  }
}

function clearPhoto() {
  currentUploadedPhoto = '';
  currentUploadedMediaType = '';
  const inp = document.getElementById('logPhotoInput') as HTMLInputElement | null;
  if (inp) inp.value = '';
  const imgEl = document.getElementById('photoPreviewImg') as HTMLImageElement | null;
  if (imgEl) { imgEl.src = ''; imgEl.classList.remove('hidden'); }
  const videoEl = document.getElementById('photoPreviewVideo') as HTMLVideoElement | null;
  if (videoEl) {
    videoEl.pause();
    videoEl.removeAttribute('src');
    videoEl.classList.add('hidden');
  }
  document.getElementById('logMediaProgressBox')?.classList.add('hidden');
  document.getElementById('photoPreviewBox')?.classList.add('hidden');
}

let activeVoiceRecognition: any = null;
let activeVoiceFieldId: string | null = null;
let isManualVoiceStop = false;

function updateVoiceButtonUI(fieldId: string, listening: boolean, interimText = '') {
  const btn = document.getElementById(`voiceBtn-${fieldId}`);
  const statusEl = document.getElementById(`voiceStatus-${fieldId}`);
  if (btn) {
    if (listening) {
      btn.className = 'px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white border border-rose-600 text-[11px] font-bold transition flex items-center gap-1.5 shrink-0 animate-pulse';
      btn.innerHTML = `<i class="fa-solid fa-stop"></i><span>녹음 중지</span>`;
    } else {
      btn.className = 'px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-brand-50 text-slate-700 hover:text-brand-700 border border-slate-200 text-[11px] font-bold transition flex items-center gap-1.5 shrink-0';
      btn.innerHTML = `<i class="fa-solid fa-microphone text-brand-600"></i><span>음성 입력</span>`;
    }
  }
  if (statusEl) {
    if (listening) {
      statusEl.classList.remove('hidden');
      const textSpan = statusEl.querySelector('span:last-child');
      if (textSpan) {
        textSpan.textContent = interimText
          ? `🎙️ 인식 중: "${interimText}"`
          : '🎙️ 듣고 있습니다... 말씀해 주세요. (완료 시 중지 클릭)';
      }
    } else {
      statusEl.classList.add('hidden');
    }
  }
}

function stopVoiceInput() {
  if (activeVoiceRecognition) {
    isManualVoiceStop = true;
    try {
      activeVoiceRecognition.stop();
    } catch (e) {
      console.warn(e);
    }
    activeVoiceRecognition = null;
  }
  if (activeVoiceFieldId) {
    updateVoiceButtonUI(activeVoiceFieldId, false);
    activeVoiceFieldId = null;
  }
}

function toggleVoiceInput(fieldId: string) {
  if (activeVoiceFieldId === fieldId) {
    stopVoiceInput();
    showToast('음성 입력을 종료했습니다.', 'info');
    return;
  }

  if (activeVoiceRecognition) {
    stopVoiceInput();
  }

  const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRec) {
    showToast('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 또는 모바일 브라우저를 이용해 주세요.', 'error');
    return;
  }

  try {
    const recognition = new SpeechRec();
    recognition.lang = 'ko-KR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    isManualVoiceStop = false;
    activeVoiceRecognition = recognition;
    activeVoiceFieldId = fieldId;
    updateVoiceButtonUI(fieldId, true);

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const txt = res[0]?.transcript || '';
        if (res.isFinal) {
          finalTranscript += txt;
        } else {
          interimTranscript += txt;
        }
      }

      if (finalTranscript.trim()) {
        const textarea = document.getElementById(fieldId) as HTMLTextAreaElement | null;
        if (textarea) {
          const cur = textarea.value;
          const sep = cur.length > 0 && !/\s$/.test(cur) ? ' ' : '';
          textarea.value = cur + sep + finalTranscript.trim();
          textarea.scrollTop = textarea.scrollHeight;
        }
      }

      if (activeVoiceFieldId === fieldId) {
        updateVoiceButtonUI(fieldId, true, interimTranscript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      const errType = event?.error || '';
      if (errType === 'aborted' && isManualVoiceStop) return;
      if (errType === 'not-allowed' || errType === 'service-not-allowed') {
        showToast('마이크 사용 권한이 거부되었습니다. 브라우저 설정에서 마이크를 허용해 주세요.', 'error');
      } else if (errType === 'no-speech') {
        showToast('음성이 감지되지 않았습니다. 마이크 가까이에서 다시 말씀해 주세요.', 'info');
      } else {
        showToast(`음성 인식 오류 (${errType || '알 수 없음'})`, 'error');
      }
      if (activeVoiceFieldId === fieldId) {
        updateVoiceButtonUI(fieldId, false);
        activeVoiceFieldId = null;
        activeVoiceRecognition = null;
      }
    };

    recognition.onend = () => {
      if (activeVoiceFieldId === fieldId) {
        updateVoiceButtonUI(fieldId, false);
        activeVoiceFieldId = null;
        activeVoiceRecognition = null;
      }
      isManualVoiceStop = false;
    };

    recognition.start();
    showToast('음성 인식이 시작되었습니다. 말씀해 주세요.', 'success');
  } catch (err) {
    console.error('SpeechRecognition start failed:', err);
    updateVoiceButtonUI(fieldId, false);
    activeVoiceFieldId = null;
    activeVoiceRecognition = null;
    showToast('음성 인식을 시작할 수 없습니다. 마이크 연결을 확인해 주세요.', 'error');
  }
}

function setWriteNextAction(action: 'logs' | 'stay') {
  writeNextAction = action;
}

async function submitWorkLog(e: Event) {
  e.preventDefault();
  stopVoiceInput();
  const worker = getSelectedWorker();
  if (!worker) {
    showToast('상단에서 작업자 본인의 이름을 먼저 선택해 주세요!', 'error');
    document.getElementById('workerSelect')?.focus();
    return;
  }

  const date = (document.getElementById('logDate') as HTMLInputElement).value || getTodayString();
  const category = (document.getElementById('logCategory') as HTMLInputElement).value || '공용민원';
  const location = (document.getElementById('logLocation') as HTMLInputElement).value.trim();
  const complaintContent = (document.getElementById('logComplaintContent') as HTMLTextAreaElement).value.trim();
  const content = (document.getElementById('logContent') as HTMLTextAreaElement).value.trim();
  if (!location || !content) return;

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const id = 'log-' + Date.now();

  const newLog = {
    id,
    date,
    category,
    workerId: worker.id,
    workerName: worker.name,
    workerRole: worker.role,
    location,
    complaintContent,
    content,
    photo: currentUploadedPhoto || '',
    mediaType: currentUploadedMediaType || (currentUploadedPhoto.startsWith('data:video/') ? 'video' : (currentUploadedPhoto ? 'image' : '')),
    createdAt: timeStr,
    timestamp: Date.now()
  };

  state.logs.unshift(newLog);
  (document.getElementById('logLocation') as HTMLInputElement).value = '';
  (document.getElementById('logComplaintContent') as HTMLTextAreaElement).value = '';
  (document.getElementById('logContent') as HTMLTextAreaElement).value = '';
  clearPhoto();
  renderLogs();
  renderHomePortal();

  const stayOnWrite = writeNextAction === 'stay';
  writeNextAction = 'logs';

  try {
    await setDoc(getDocRef('logs', id), newLog);
    showToast(
      stayOnWrite ? '작업일지가 등록되었습니다! 이어서 다음 작업을 작성하세요.' : '작업일지가 등록되었습니다!',
      'success'
    );
  } catch (err) {
    console.error('WorkLog save error:', err);
    showToast('미디어 용량 한도 초과로 텍스트만 클라우드에 저장됩니다.', 'error');
    try {
      await setDoc(getDocRef('logs', id), { ...newLog, photo: '', mediaType: '' });
    } catch (e2) { console.error(e2); }
  }

  if (stayOnWrite) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById('logLocation')?.focus();
  } else {
    switchTab('logs');
  }
}

// WORK LOGS LIST, FILTERS & CALENDAR
function setLogCategoryFilter(cat: string) {
  state.filterLogCategory = cat;
  const activeColors: Record<string, string> = {
    ALL: 'bg-navy-800 text-white',
    '공용민원': 'bg-teal-600 text-white',
    '세대민원': 'bg-amber-600 text-white',
    '세대민원(긴급)': 'bg-rose-600 text-white',
    '정기점검': 'bg-indigo-600 text-white',
    '하자보수': 'bg-violet-600 text-white'
  };
  ['ALL', '공용민원', '세대민원', '세대민원(긴급)', '정기점검', '하자보수'].forEach(c => {
    const btn = document.getElementById(`logCatFilter-${c}`);
    const countEl = document.getElementById(`logCatCount-${c}`);
    if (btn) {
      btn.className = c === cat
        ? `py-2 px-2 rounded-lg ${activeColors[c] || 'bg-navy-800 text-white'} font-bold shadow-xs transition flex items-center justify-center gap-1 whitespace-nowrap`
        : 'py-2 px-2 rounded-lg text-slate-600 hover:text-slate-900 font-semibold transition flex items-center justify-center gap-1 whitespace-nowrap';
    }
    if (countEl) {
      countEl.className = c === cat
        ? 'px-1.5 py-0.2 rounded-full bg-white/25 text-white text-[10px] font-extrabold'
        : 'px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-600 text-[10px] font-extrabold';
    }
  });
  const resetBtn = document.getElementById('logCatResetBtn');
  if (resetBtn) {
    if (cat !== 'ALL') resetBtn.classList.remove('hidden');
    else resetBtn.classList.add('hidden');
  }
  renderLogs();
}

function setWorkerFilter(workerId: string) {
  state.filterWorkerId = workerId;
  renderWorkerFilterChips();
  renderLogs();
}

function renderWorkerFilterChips() {
  const box = document.getElementById('workerFilterChips');
  if (!box) return;
  const chips = [
    `<button type="button" onclick="setWorkerFilter('ALL')" class="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold transition ${state.filterWorkerId === 'ALL' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">전체 직원</button>`
  ];
  state.staff.forEach(s => {
    const active = state.filterWorkerId === s.id;
    chips.push(`<button type="button" onclick="setWorkerFilter('${s.id}')" class="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold transition ${active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">${escapeHtml(s.name)}</button>`);
  });
  box.innerHTML = chips.join('');
}

function setLogViewMode(mode: string) {
  state.logViewMode = mode;
  const listBtn = document.getElementById('logViewBtn-LIST');
  const calBtn = document.getElementById('logViewBtn-CALENDAR');
  const calWrap = document.getElementById('logCalendarWrapper');
  const todayBanner = document.getElementById('logsTodayResetBanner');

  if (mode === 'CALENDAR') {
    if (calBtn) calBtn.className = 'py-2 px-2 rounded-lg bg-brand-600 text-white font-extrabold shadow-xs transition flex items-center justify-center gap-1.5';
    if (listBtn) listBtn.className = 'py-2 px-2 rounded-lg text-slate-600 hover:text-slate-900 font-bold transition flex items-center justify-center gap-1.5';
    calWrap?.classList.remove('hidden');
    todayBanner?.classList.add('hidden');
  } else {
    if (listBtn) listBtn.className = 'py-2 px-2 rounded-lg bg-brand-600 text-white font-extrabold shadow-xs transition flex items-center justify-center gap-1.5';
    if (calBtn) calBtn.className = 'py-2 px-2 rounded-lg text-slate-600 hover:text-slate-900 font-bold transition flex items-center justify-center gap-1.5';
    calWrap?.classList.add('hidden');
    todayBanner?.classList.remove('hidden');
  }
  renderLogs();
}

function openYesterdayInCalendar() {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = String(now.getDate()).padStart(2, '0');
  const yestStr = `${y}-${String(m + 1).padStart(2, '0')}-${d}`;
  state.calendarYear = y;
  state.calendarMonth = m;
  state.selectedCalendarDate = yestStr;
  setLogViewMode('CALENDAR');
}

function changeCalendarMonth(delta: number) {
  let m = state.calendarMonth + delta;
  let y = state.calendarYear;
  if (m < 0) { m = 11; y -= 1; }
  else if (m > 11) { m = 0; y += 1; }
  state.calendarYear = y;
  state.calendarMonth = m;
  state.selectedCalendarDate = '';
  renderLogs();
}

function goCalendarToday() {
  const now = new Date();
  state.calendarYear = now.getFullYear();
  state.calendarMonth = now.getMonth();
  state.selectedCalendarDate = getTodayString();
  renderLogs();
}

function selectCalendarDate(dateStr: string) {
  state.selectedCalendarDate = state.selectedCalendarDate === dateStr ? '' : dateStr;
  renderLogs();
}

function clearCalendarSelectedDate() {
  state.selectedCalendarDate = '';
  renderLogs();
}

function renderLogsCalendar(filteredLogs: any[]) {
  const grid = document.getElementById('calendarGrid');
  const title = document.getElementById('calendarMonthTitle');
  const selLabel = document.getElementById('calendarSelectedDateLabel');
  const clearBtn = document.getElementById('calendarClearDateBtn');
  if (!grid) return;

  const y = state.calendarYear;
  const m = state.calendarMonth;
  if (title) title.textContent = `${y}년 ${m + 1}월`;

  const countByDate: Record<string, number> = {};
  filteredLogs.forEach(l => {
    if (l.date) countByDate[l.date] = (countByDate[l.date] || 0) + 1;
  });

  const firstDay = new Date(y, m, 1).getDay();
  const lastDate = new Date(y, m + 1, 0).getDate();
  const todayStr = getTodayString();

  const cells: string[] = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(`<div class="h-12 sm:h-14 rounded-xl bg-slate-50/50"></div>`);
  }

  for (let d = 1; d <= lastDate; d++) {
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const cnt = countByDate[dateStr] || 0;
    const isSelected = state.selectedCalendarDate === dateStr;
    const isToday = todayStr === dateStr;
    const dayOfWeek = (firstDay + d - 1) % 7;
    const numColor = isSelected ? 'text-white' : dayOfWeek === 0 ? 'text-rose-500' : dayOfWeek === 6 ? 'text-blue-600' : 'text-slate-700';

    cells.push(`
      <button type="button" onclick="selectCalendarDate('${dateStr}')" class="h-12 sm:h-14 rounded-xl border flex flex-col items-center justify-between p-1 transition ${isSelected ? 'bg-brand-600 border-brand-600 text-white shadow-sm' : isToday ? 'bg-brand-50/70 border-brand-400 hover:bg-brand-100/60' : 'bg-white border-slate-200 hover:bg-slate-50'}">
        <span class="text-[11px] font-extrabold ${numColor}">${d}</span>
        ${cnt > 0
          ? `<span class="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${isSelected ? 'bg-white text-brand-700' : 'bg-brand-100 text-brand-800'}">${cnt}건</span>`
          : `<span class="h-3"></span>`
        }
      </button>
    `);
  }

  grid.innerHTML = cells.join('');

  if (state.selectedCalendarDate) {
    if (selLabel) selLabel.innerHTML = `<i class="fa-solid fa-calendar-check text-brand-600 mr-1"></i>선택 날짜: ${state.selectedCalendarDate}`;
    clearBtn?.classList.remove('hidden');
  } else {
    if (selLabel) selLabel.innerHTML = `<i class="fa-solid fa-calendar-check text-brand-600 mr-1"></i>선택 날짜: ${y}년 ${m + 1}월 전체`;
    clearBtn?.classList.add('hidden');
  }
}

function getFilteredLogsContext() {
  const keywordRaw = ((document.getElementById('searchInput') as HTMLInputElement | null)?.value || '').trim();
  const keyword = keywordRaw.toLowerCase();
  const todayStr = getTodayString();

  const preCategoryLogs = state.logs.filter(l => {
    if (state.logViewMode !== 'CALENDAR' && l.date !== todayStr) return false;
    const fallbackWorker = l.workerName ? null : state.staff.find(s => s.id === l.workerId);
    const wName = l.workerName || fallbackWorker?.name || '';
    if (state.filterWorkerId !== 'ALL' && l.workerId !== state.filterWorkerId) return false;
    if (keyword) {
      const hay = `${l.location} ${l.complaintContent || ''} ${l.content} ${wName} ${l.date} ${l.category || ''}`.toLowerCase();
      if (!hay.includes(keyword)) return false;
    }
    return true;
  });

  let categoryScopeLogs = preCategoryLogs;
  const monthPrefix = `${state.calendarYear}-${String(state.calendarMonth + 1).padStart(2, '0')}`;
  if (state.logViewMode === 'CALENDAR') {
    if (state.selectedCalendarDate) {
      categoryScopeLogs = preCategoryLogs.filter(l => l.date === state.selectedCalendarDate);
    } else {
      categoryScopeLogs = preCategoryLogs.filter(l => (l.date || '').startsWith(monthPrefix));
    }
  }

  const baseFiltered = preCategoryLogs.filter(l => {
    if (state.filterLogCategory !== 'ALL' && (l.category || '공용민원') !== state.filterLogCategory) return false;
    return true;
  });

  let filtered = baseFiltered;
  if (state.logViewMode === 'CALENDAR') {
    if (state.selectedCalendarDate) {
      filtered = baseFiltered.filter(l => l.date === state.selectedCalendarDate);
    } else {
      filtered = baseFiltered.filter(l => (l.date || '').startsWith(monthPrefix));
    }
  }

  return { keywordRaw, todayStr, preCategoryLogs, categoryScopeLogs, baseFiltered, filtered, monthPrefix };
}

function updateLogsPdfSummaryCard(filtered: any[], keywordRaw: string, monthPrefix: string, todayStr: string) {
  const infoEl = document.getElementById('logsPdfSummaryInfo');
  const btn = document.getElementById('downloadLogsPdfBtn') as HTMLButtonElement | null;
  const parts: string[] = [];

  if (state.logViewMode === 'CALENDAR') {
    parts.push(state.selectedCalendarDate ? state.selectedCalendarDate : `${monthPrefix} 월간`);
  } else {
    parts.push(`오늘(${todayStr})`);
  }
  parts.push(state.filterLogCategory === 'ALL' ? '전체 구분' : state.filterLogCategory);
  if (state.filterWorkerId !== 'ALL') {
    const w = state.staff.find(s => s.id === state.filterWorkerId);
    if (w) parts.push(`작성자:${w.name}`);
  }
  if (keywordRaw) parts.push(`검색:"${keywordRaw}"`);

  if (infoEl) {
    infoEl.textContent = `필터: ${parts.join(' · ')} (총 ${filtered.length}건)`;
  }
  if (btn) {
    btn.classList.toggle('opacity-60', filtered.length === 0);
  }
}

function renderLogs() {
  const container = document.getElementById('logsContainer');
  const countBadge = document.getElementById('logCountBadge');
  if (!container) return;

  const { keywordRaw, todayStr, categoryScopeLogs, baseFiltered, filtered, monthPrefix } = getFilteredLogsContext();
  const pastLogsCount = state.logs.filter(l => l.date && l.date !== todayStr).length;
  const todayResetText = document.getElementById('logsTodayResetText');
  if (todayResetText) {
    todayResetText.textContent = `오늘(${todayStr}) 작업내역만 표시 중 · 지난 기록 ${pastLogsCount}건은 달력에서 확인하세요.`;
  }

  const catCounts: Record<string, number> = {
    ALL: categoryScopeLogs.length,
    '공용민원': 0,
    '세대민원': 0,
    '세대민원(긴급)': 0,
    '정기점검': 0,
    '하자보수': 0
  };
  categoryScopeLogs.forEach(l => {
    const c = l.category || '공용민원';
    catCounts[c] = (catCounts[c] || 0) + 1;
  });
  ['ALL', '공용민원', '세대민원', '세대민원(긴급)', '정기점검', '하자보수'].forEach(c => {
    const countEl = document.getElementById(`logCatCount-${c}`);
    if (countEl) countEl.textContent = String(catCounts[c] || 0);
  });

  if (state.logViewMode === 'CALENDAR') {
    renderLogsCalendar(baseFiltered);
  }

  updateLogsPdfSummaryCard(filtered, keywordRaw, monthPrefix, todayStr);

  if (countBadge) {
    countBadge.textContent = state.filterLogCategory === 'ALL'
      ? `총 ${filtered.length}건`
      : `${state.filterLogCategory} ${filtered.length}건`;
  }

  if (filtered.length === 0) {
    const emptyMsg = state.logViewMode === 'LIST'
      ? (state.filterLogCategory !== 'ALL'
        ? `오늘(${todayStr}) '${escapeHtml(state.filterLogCategory)}' 구분에 등록된 작업일지 내역이 없습니다.`
        : `오늘(${todayStr}) 등록된 작업일지 내역이 없습니다.`)
      : (state.filterLogCategory !== 'ALL'
        ? `'${escapeHtml(state.filterLogCategory)}' 구분에 등록된 작업일지 내역이 없습니다.`
        : '선택한 날짜/기간에 등록된 작업일지 내역이 없습니다.');

    container.innerHTML = `
      <div class="col-span-full bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs sm:text-sm space-y-2.5">
        <i class="fa-regular fa-folder-open text-2xl block text-slate-300"></i>
        <p>${emptyMsg}</p>
        <div class="flex items-center justify-center gap-2 flex-wrap">
          ${state.filterLogCategory !== 'ALL' ? `
            <button type="button" onclick="setLogCategoryFilter('ALL')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition">
              전체 민원 구분 보기
            </button>
          ` : ''}
          ${state.logViewMode === 'LIST' && pastLogsCount > 0 ? `
            <button type="button" onclick="openYesterdayInCalendar()" class="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-xs font-bold transition">
              <i class="fa-regular fa-calendar mr-1"></i>어제·지난 작업내역 달력에서 보기 (${pastLogsCount}건)
            </button>
          ` : ''}
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(log => {
    const fallbackWorker = log.workerName ? null : state.staff.find(s => s.id === log.workerId);
    const workerNameDisplay = log.workerName || fallbackWorker?.name || '미등록 직원';
    const workerRoleDisplay = log.workerRole || fallbackWorker?.role || '';
    const canModify = state.isAdmin || (state.selectedWorkerId && state.selectedWorkerId === log.workerId);
    const cat = log.category || '공용민원';
    const catBadge = cat === '세대민원(긴급)'
      ? `<button type="button" onclick="setLogCategoryFilter('세대민원(긴급)')" title="세대민원(긴급)만 보기" class="px-2 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-200 rounded-md text-[10px] font-extrabold transition cursor-pointer">🚨 세대민원(긴급)</button>`
      : cat === '세대민원'
        ? `<button type="button" onclick="setLogCategoryFilter('세대민원')" title="세대민원만 보기" class="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200 rounded-md text-[10px] font-extrabold transition cursor-pointer">🏠 세대민원</button>`
        : cat === '정기점검'
          ? `<button type="button" onclick="setLogCategoryFilter('정기점검')" title="정기점검만 보기" class="px-2 py-0.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 border border-indigo-200 rounded-md text-[10px] font-extrabold transition cursor-pointer">🔍 정기점검</button>`
          : cat === '하자보수'
            ? `<button type="button" onclick="setLogCategoryFilter('하자보수')" title="하자보수만 보기" class="px-2 py-0.5 bg-violet-100 hover:bg-violet-200 text-violet-800 border border-violet-200 rounded-md text-[10px] font-extrabold transition cursor-pointer">🔧 하자보수</button>`
            : `<button type="button" onclick="setLogCategoryFilter('공용민원')" title="공용민원만 보기" class="px-2 py-0.5 bg-teal-100 hover:bg-teal-200 text-teal-800 border border-teal-200 rounded-md text-[10px] font-extrabold transition cursor-pointer">🏢 공용민원</button>`;

    return `
      <article class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2.5 flex flex-col justify-between">
        <div class="space-y-2">
          <div class="flex items-start justify-between gap-2">
            <div class="flex flex-wrap items-center gap-1.5">
              ${catBadge}
              <span class="px-2 py-0.5 bg-brand-50 text-brand-700 border border-brand-200 rounded-md text-[11px] font-extrabold">${escapeHtml(log.date)}</span>
              <span class="text-xs font-bold text-slate-800">${escapeHtml(workerNameDisplay)}</span>
              <span class="text-[11px] text-slate-400">${escapeHtml(workerRoleDisplay)} · ${escapeHtml(log.createdAt || '')}</span>
            </div>
            ${canModify ? `
              <div class="flex items-center gap-1 shrink-0">
                <button type="button" onclick="openEditModal('${log.id}')" class="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold transition">수정</button>
                <button type="button" onclick="confirmDeleteLog('${log.id}')" class="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[11px] font-bold transition">삭제</button>
              </div>
            ` : ''}
          </div>

          <div class="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
            <i class="fa-solid fa-location-dot text-brand-600 shrink-0"></i>
            <span>${escapeHtml(log.location)}</span>
          </div>

          ${log.complaintContent ? `
            <div class="bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5 space-y-0.5">
              <span class="text-[10px] font-extrabold text-amber-800 block"><i class="fa-solid fa-circle-question mr-1"></i>민원 내용</span>
              <p class="text-xs text-slate-800 leading-relaxed whitespace-pre-line">${escapeHtml(log.complaintContent)}</p>
            </div>
          ` : ''}

          <div class="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 space-y-0.5">
            <span class="text-[10px] font-extrabold text-brand-700 block"><i class="fa-solid fa-wrench mr-1"></i>처리 내용</span>
            <p class="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">${escapeHtml(log.content)}</p>
          </div>
        </div>

        ${log.photo ? (isVideoMediaSrc(log.photo, log.mediaType) ? `
          <div class="pt-1 relative">
            <video src="${log.photo}" controls playsinline preload="metadata" class="w-full h-44 object-contain rounded-xl border border-slate-200 bg-black"></video>
            <button type="button" onclick="openLightbox('${log.photo}', 'video')" class="mt-1.5 w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1">
              <i class="fa-solid fa-expand"></i> 동영상 크게 보기
            </button>
          </div>
        ` : `
          <div class="pt-1">
            <img src="${log.photo}" alt="작업사진" onclick="openLightbox('${log.photo}', 'image')" class="w-full h-40 object-cover rounded-xl border border-slate-200 cursor-zoom-in hover:opacity-95 transition">
          </div>
        `) : ''}
      </article>
    `;
  }).join('');
}

async function downloadFilteredLogsPDF() {
  const { keywordRaw, filtered, monthPrefix } = getFilteredLogsContext();
  if (filtered.length === 0) {
    showToast('다운로드할 필터링된 작업일지 내역이 없습니다.', 'error');
    return;
  }

  const btn = document.getElementById('downloadLogsPdfBtn') as HTMLButtonElement | null;
  const originalBtnHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>PDF 생성 중...</span>`;
  }
  showToast('작업일지 요약본 PDF를 생성하고 있습니다...', 'info');

  const stage = document.createElement('div');
  stage.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;background:#ffffff;color:#0f172a;font-family:"Noto Sans KR",sans-serif;z-index:-1;';
  document.body.appendChild(stage);

  try {
    const periodLabel = state.logViewMode === 'CALENDAR'
      ? (state.selectedCalendarDate ? state.selectedCalendarDate : `${monthPrefix} (월 전체)`)
      : `오늘 (${getTodayString()})`;
    const catLabel = state.filterLogCategory === 'ALL' ? '전체 구분' : state.filterLogCategory;
    const workerObj = state.filterWorkerId !== 'ALL' ? state.staff.find(s => s.id === state.filterWorkerId) : null;
    const workerLabel = workerObj ? `${workerObj.name} (${workerObj.role})` : '전체 직원';
    const searchLabel = keywordRaw || '없음';

    const countPublic = filtered.filter(l => (l.category || '공용민원') === '공용민원').length;
    const countUnit = filtered.filter(l => l.category === '세대민원').length;
    const countUrgentUnit = filtered.filter(l => l.category === '세대민원(긴급)').length;
    const countInspect = filtered.filter(l => l.category === '정기점검').length;
    const countDefect = filtered.filter(l => l.category === '하자보수').length;

    const now = new Date();
    const generatedAt = `${getTodayString()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const buildRowHtml = (log: any, idx: number) => {
      const fallbackWorker = log.workerName ? null : state.staff.find(s => s.id === log.workerId);
      const wName = log.workerName || fallbackWorker?.name || '미등록';
      const wRole = log.workerRole || fallbackWorker?.role || '';
      const cat = log.category || '공용민원';
      const catBg = cat === '세대민원(긴급)'
        ? '#fee2e2'
        : cat === '세대민원'
          ? '#fef3c7'
          : cat === '정기점검'
            ? '#e0e7ff'
            : cat === '하자보수'
              ? '#ede9fe'
              : '#ccfbf1';
      const catColor = cat === '세대민원(긴급)'
        ? '#991b1b'
        : cat === '세대민원'
          ? '#92400e'
          : cat === '정기점검'
            ? '#3730a3'
            : cat === '하자보수'
              ? '#5b21b6'
              : '#115e59';

      return `
        <tr style="border-bottom:1px solid #cbd5e1;vertical-align:top;background:${idx % 2 === 1 ? '#f8fafc' : '#ffffff'};">
          <td style="padding:8px 6px;text-align:center;font-weight:700;color:#475569;border-right:1px solid #e2e8f0;font-size:11px;">${idx + 1}</td>
          <td style="padding:8px 6px;border-right:1px solid #e2e8f0;font-size:11px;white-space:nowrap;">
            <div style="font-weight:700;color:#0f172a;">${escapeHtml(log.date || '')}</div>
            <div style="color:#64748b;font-size:10px;margin-top:2px;">${escapeHtml(log.createdAt || '')}</div>
          </td>
          <td style="padding:8px 6px;text-align:center;border-right:1px solid #e2e8f0;white-space:nowrap;">
            <span style="display:inline-block;padding:2px 6px;border-radius:4px;background:${catBg};color:${catColor};font-size:10px;font-weight:800;">${escapeHtml(cat)}</span>
          </td>
          <td style="padding:8px 6px;border-right:1px solid #e2e8f0;font-size:11px;">
            <div style="font-weight:700;color:#0f172a;">${escapeHtml(wName)}</div>
            ${wRole ? `<div style="color:#64748b;font-size:10px;">${escapeHtml(wRole)}</div>` : ''}
          </td>
          <td style="padding:8px 6px;border-right:1px solid #e2e8f0;font-size:11px;font-weight:700;color:#1e293b;word-break:break-word;">${escapeHtml(log.location || '-')}</td>
          <td style="padding:8px 8px;font-size:11px;color:#1e293b;line-height:1.45;word-break:break-word;">
            ${log.complaintContent ? `<div style="margin-bottom:3px;color:#92400e;"><strong style="font-weight:700;">[민원]</strong> ${escapeHtml(log.complaintContent)}</div>` : ''}
            <div><strong style="font-weight:700;color:#0f766e;">[처리]</strong> ${escapeHtml(log.content || '')}</div>
            ${log.photo ? `<div style="margin-top:3px;font-size:10px;color:#0284c7;font-weight:700;">${isVideoMediaSrc(log.photo, log.mediaType) ? '🎥 현장 동영상 첨부됨' : '📷 현장 사진 첨부됨'}</div>` : ''}
          </td>
        </tr>
      `;
    };

    const tableHeaderHtml = `
      <thead>
        <tr style="background:#1e293b;color:#ffffff;font-size:11px;text-align:left;">
          <th style="padding:8px 6px;text-align:center;width:36px;border-right:1px solid #334155;">No</th>
          <th style="padding:8px 6px;width:82px;border-right:1px solid #334155;">날짜/시각</th>
          <th style="padding:8px 6px;text-align:center;width:72px;border-right:1px solid #334155;">민원구분</th>
          <th style="padding:8px 6px;width:78px;border-right:1px solid #334155;">작성자</th>
          <th style="padding:8px 6px;width:125px;border-right:1px solid #334155;">작업장소</th>
          <th style="padding:8px 8px;">민원 및 처리 내용 요약</th>
        </tr>
      </thead>
    `;

    // Measure exact row heights to paginate cleanly without slicing rows across pages
    const measureWrap = document.createElement('div');
    measureWrap.style.cssText = 'width:714px;';
    measureWrap.innerHTML = `<table style="width:100%;border-collapse:collapse;table-layout:fixed;">${tableHeaderHtml}<tbody>${filtered.map((l, i) => buildRowHtml(l, i)).join('')}</tbody></table>`;
    stage.appendChild(measureWrap);
    const rowEls = Array.from(measureWrap.querySelectorAll('tbody tr')) as HTMLElement[];

    const FIRST_PAGE_BODY_MAX = 710;
    const NEXT_PAGE_BODY_MAX = 900;
    const pages: { rowHtml: string }[][] = [];
    let currentChunk: { rowHtml: string }[] = [];
    let currentHeight = 0;

    rowEls.forEach((tr, idx) => {
      const h = Math.max(tr.offsetHeight, 36);
      const limit = pages.length === 0 ? FIRST_PAGE_BODY_MAX : NEXT_PAGE_BODY_MAX;
      if (currentChunk.length > 0 && currentHeight + h > limit) {
        pages.push(currentChunk);
        currentChunk = [];
        currentHeight = 0;
      }
      currentChunk.push({ rowHtml: buildRowHtml(filtered[idx], idx) });
      currentHeight += h;
    });
    if (currentChunk.length > 0) pages.push(currentChunk);
    stage.removeChild(measureWrap);

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const totalPages = pages.length;

    for (let p = 0; p < totalPages; p++) {
      const pageEl = document.createElement('div');
      pageEl.style.cssText = 'width:794px;min-height:1122px;padding:40px;box-sizing:border-box;background:#ffffff;color:#0f172a;display:flex;flex-direction:column;justify-content:space-between;';

      const headerBlock = p === 0 ? `
        <div style="margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:12px;">
            <div>
              <div style="font-size:11px;font-weight:700;color:#0f766e;margin-bottom:3px;">호려울마을 7단지 관리사무소</div>
              <h1 style="font-size:22px;font-weight:800;margin:0;letter-spacing:-0.3px;color:#0f172a;">공동 작업일지 요약 보고서</h1>
              <div style="font-size:11px;color:#64748b;margin-top:4px;">출력 일시: ${escapeHtml(generatedAt)}</div>
            </div>
            <table style="border-collapse:collapse;font-size:11px;text-align:center;">
              <tr>
                <th style="border:1px solid #334155;padding:4px 14px;background:#f1f5f9;font-weight:700;">담당</th>
                <th style="border:1px solid #334155;padding:4px 14px;background:#f1f5f9;font-weight:700;">소장</th>
              </tr>
              <tr>
                <td style="border:1px solid #334155;height:40px;width:68px;"></td>
                <td style="border:1px solid #334155;height:40px;width:68px;"></td>
              </tr>
            </table>
          </div>

          <div style="display:flex;flex-wrap:wrap;gap:8px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px;margin-bottom:10px;font-size:11px;">
            <div><strong style="color:#475569;">조회 기간:</strong> <span style="font-weight:700;color:#0f172a;">${escapeHtml(periodLabel)}</span></div>
            <div style="color:#cbd5e1;">|</div>
            <div><strong style="color:#475569;">민원 구분:</strong> <span style="font-weight:700;color:#0f766e;">${escapeHtml(catLabel)}</span></div>
            <div style="color:#cbd5e1;">|</div>
            <div><strong style="color:#475569;">작성자:</strong> <span style="font-weight:700;color:#0f172a;">${escapeHtml(workerLabel)}</span></div>
            <div style="color:#cbd5e1;">|</div>
            <div><strong style="color:#475569;">검색어:</strong> <span style="font-weight:700;color:#0f172a;">${escapeHtml(searchLabel)}</span></div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;font-size:10px;text-align:center;">
            <div style="border:1px solid #cbd5e1;border-radius:8px;padding:7px 4px;background:#f1f5f9;">
              <div style="color:#475569;font-size:9.5px;font-weight:700;">전체 조회</div>
              <div style="font-size:14px;font-weight:800;color:#0f172a;margin-top:2px;">${filtered.length}건</div>
            </div>
            <div style="border:1px solid #99f6e4;border-radius:8px;padding:7px 4px;background:#f0fdfa;">
              <div style="color:#0f766e;font-size:9.5px;font-weight:700;">🏢 공용민원</div>
              <div style="font-size:14px;font-weight:800;color:#115e59;margin-top:2px;">${countPublic}건</div>
            </div>
            <div style="border:1px solid #fde68a;border-radius:8px;padding:7px 4px;background:#fffbeb;">
              <div style="color:#b45309;font-size:9.5px;font-weight:700;">🏠 세대민원</div>
              <div style="font-size:14px;font-weight:800;color:#92400e;margin-top:2px;">${countUnit}건</div>
            </div>
            <div style="border:1px solid #fecaca;border-radius:8px;padding:7px 4px;background:#fef2f2;">
              <div style="color:#b91c1c;font-size:9.5px;font-weight:700;">🚨 긴급민원</div>
              <div style="font-size:14px;font-weight:800;color:#991b1b;margin-top:2px;">${countUrgentUnit}건</div>
            </div>
            <div style="border:1px solid #c7d2fe;border-radius:8px;padding:7px 4px;background:#eef2ff;">
              <div style="color:#4338ca;font-size:9.5px;font-weight:700;">🔍 정기점검</div>
              <div style="font-size:14px;font-weight:800;color:#3730a3;margin-top:2px;">${countInspect}건</div>
            </div>
            <div style="border:1px solid #ddd6fe;border-radius:8px;padding:7px 4px;background:#f5f3ff;">
              <div style="color:#6d28d9;font-size:9.5px;font-weight:700;">🔧 하자보수</div>
              <div style="font-size:14px;font-weight:800;color:#5b21b6;margin-top:2px;">${countDefect}건</div>
            </div>
          </div>
        </div>
      ` : `
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #cbd5e1;padding-bottom:8px;margin-bottom:12px;font-size:11px;color:#475569;">
          <strong style="color:#0f172a;font-size:13px;">공동 작업일지 요약 보고서 (계속)</strong>
          <span>${escapeHtml(periodLabel)} · ${escapeHtml(catLabel)}</span>
        </div>
      `;

      pageEl.innerHTML = `
        <div>
          ${headerBlock}
          <table style="width:100%;border-collapse:collapse;table-layout:fixed;border:1px solid #cbd5e1;">
            ${tableHeaderHtml}
            <tbody>${pages[p].map(item => item.rowHtml).join('')}</tbody>
          </table>
        </div>
        <div style="border-top:1px solid #e2e8f0;padding-top:10px;display:flex;justify-content:space-between;font-size:10px;color:#64748b;">
          <span>호려울마을 7단지 공동 작업일지 시스템</span>
          <span>페이지 ${p + 1} / ${totalPages}</span>
        </div>
      `;

      stage.appendChild(pageEl);
      const canvas = await html2canvas(pageEl, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      stage.removeChild(pageEl);

      const imgData = canvas.toDataURL('image/png');
      if (p > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
    }

    const catSlug = state.filterLogCategory === 'ALL' ? '전체' : state.filterLogCategory;
    pdf.save(`호려울마을7단지_작업일지_요약본_${catSlug}_${getTodayString()}.pdf`);
    showToast('작업일지 요약본 PDF 파일이 다운로드되었습니다.', 'success');
  } catch (err) {
    console.error('PDF generation error:', err);
    showToast('PDF 생성 중 오류가 발생했습니다.', 'error');
  } finally {
    stage.remove();
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalBtnHtml;
    }
  }
}

function openEditModal(id: string) {
  const log = state.logs.find(l => l.id === id);
  if (!log) return;
  (document.getElementById('editLogId') as HTMLInputElement).value = log.id;
  (document.getElementById('editLogDate') as HTMLInputElement).value = log.date;
  (document.getElementById('editLogCategory') as HTMLSelectElement).value = log.category || '공용민원';
  (document.getElementById('editLogLocation') as HTMLInputElement).value = log.location;
  (document.getElementById('editLogComplaintContent') as HTMLTextAreaElement).value = log.complaintContent || '';
  (document.getElementById('editLogContent') as HTMLTextAreaElement).value = log.content;
  document.getElementById('editModal')?.classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('editModal')?.classList.add('hidden');
}

async function saveEditedLog(e: Event) {
  e.preventDefault();
  const id = (document.getElementById('editLogId') as HTMLInputElement).value;
  const date = (document.getElementById('editLogDate') as HTMLInputElement).value;
  const category = (document.getElementById('editLogCategory') as HTMLSelectElement).value;
  const location = (document.getElementById('editLogLocation') as HTMLInputElement).value.trim();
  const complaintContent = (document.getElementById('editLogComplaintContent') as HTMLTextAreaElement).value.trim();
  const content = (document.getElementById('editLogContent') as HTMLTextAreaElement).value.trim();

  const log = state.logs.find(l => l.id === id);
  if (log) {
    log.date = date;
    log.category = category;
    log.location = location;
    log.complaintContent = complaintContent;
    log.content = content;
    renderLogs();
    try { await updateDoc(getDocRef('logs', id), { date, category, location, complaintContent, content }); } catch (err) { console.error(err); }
  }
  closeEditModal();
  showToast('작업일지가 수정되었습니다.', 'success');
}

function confirmDeleteLog(id: string) {
  openConfirmModal('작업일지 삭제', '이 작업일지 기록을 삭제하시겠습니까?', async () => {
    state.logs = state.logs.filter(l => l.id !== id);
    renderLogs();
    try { await deleteDoc(getDocRef('logs', id)); } catch (err) { console.error(err); }
    showToast('작업일지가 삭제되었습니다.', 'info');
  });
}

// WORK PLANS (일일 · 주간 · 월간 업무계획표)
function togglePlanAddForm() {
  const form = document.getElementById('planAddForm');
  if (!form) return;
  form.classList.toggle('hidden');
  (document.getElementById('newPlanType') as HTMLSelectElement).value = state.planPeriodType;
  (document.getElementById('newPlanDate') as HTMLInputElement).value = state.planBaseDate;
}

function setPlanPeriodType(type: string) {
  state.planPeriodType = type;
  ['DAILY', 'WEEKLY', 'MONTHLY'].forEach(t => {
    const btn = document.getElementById(`planType-${t}`);
    if (!btn) return;
    btn.className = t === type
      ? 'py-2 px-1 rounded-lg bg-brand-600 text-white font-extrabold shadow-xs transition'
      : 'py-2 px-1 rounded-lg text-slate-600 hover:text-slate-900 font-bold transition';
  });
  renderPlans();
}

function shiftPlanPeriod(delta: number) {
  const d = new Date(state.planBaseDate + 'T00:00:00');
  if (state.planPeriodType === 'DAILY') d.setDate(d.getDate() + delta);
  else if (state.planPeriodType === 'WEEKLY') d.setDate(d.getDate() + delta * 7);
  else d.setMonth(d.getMonth() + delta);
  state.planBaseDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  renderPlans();
}

function resetPlanPeriodToday() {
  state.planBaseDate = getTodayString();
  renderPlans();
}

function getWeekRange(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  return { start: fmt(mon), end: fmt(sun) };
}

async function handleAddPlan(e: Event) {
  e.preventDefault();
  const type = (document.getElementById('newPlanType') as HTMLSelectElement).value;
  const date = (document.getElementById('newPlanDate') as HTMLInputElement).value;
  const assignee = (document.getElementById('newPlanAssignee') as HTMLInputElement).value.trim() || '공통';
  const location = (document.getElementById('newPlanLocation') as HTMLInputElement).value.trim();
  const title = (document.getElementById('newPlanTitle') as HTMLInputElement).value.trim();
  if (!date || !title) return;

  const id = 'plan-' + Date.now();
  const newPlan = { id, type, date, location, title, assignee, done: false, timestamp: Date.now() };
  state.plans.unshift(newPlan);

  (document.getElementById('newPlanLocation') as HTMLInputElement).value = '';
  (document.getElementById('newPlanTitle') as HTMLInputElement).value = '';
  document.getElementById('planAddForm')?.classList.add('hidden');
  renderPlans();

  try { await setDoc(getDocRef('plans', id), newPlan); } catch (err) { console.error(err); }
  showToast('업무계획이 등록되었습니다.', 'success');
}

async function togglePlanDone(id: string) {
  const plan = state.plans.find(p => p.id === id);
  if (!plan) return;
  plan.done = !plan.done;
  renderPlans();
  renderHomePortal();
  try { await updateDoc(getDocRef('plans', id), { done: plan.done }); } catch (err) { console.error(err); }
}

async function deletePlan(id: string) {
  state.plans = state.plans.filter(p => p.id !== id);
  renderPlans();
  try { await deleteDoc(getDocRef('plans', id)); } catch (err) { console.error(err); }
  showToast('업무계획이 삭제되었습니다.', 'info');
}

function sendPlanToWorkLog(id: string) {
  const plan = state.plans.find(p => p.id === id);
  if (!plan) return;
  (document.getElementById('logDate') as HTMLInputElement).value = getTodayString();
  selectLogCategory('정기점검');
  if (plan.location) (document.getElementById('logLocation') as HTMLInputElement).value = plan.location;
  (document.getElementById('logComplaintContent') as HTMLTextAreaElement).value = `[업무계획 일정] ${plan.title}`;
  (document.getElementById('logContent') as HTMLTextAreaElement).value = `${plan.title} 점검 및 조치 완료`;
  switchTab('write');
  showToast('계획 내용이 일지 작성 화면으로 복사되었습니다!', 'info');
}

function renderPlans() {
  const tbody = document.getElementById('plansTableBody');
  const titleEl = document.getElementById('planPeriodTitle');
  const subEl = document.getElementById('planPeriodSub');
  const ratioEl = document.getElementById('planDoneRatio');
  const pctEl = document.getElementById('planPercentLabel');
  const barEl = document.getElementById('planProgressBar');
  if (!tbody) return;

  const base = state.planBaseDate || getTodayString();
  let filtered: any[] = [];

  if (state.planPeriodType === 'DAILY') {
    if (titleEl) titleEl.textContent = `일일 업무계획 (${base})`;
    if (subEl) subEl.textContent = '선택한 날짜의 일일 점검 및 민원 처리 계획';
    filtered = state.plans.filter(p => p.type === 'DAILY' && p.date === base);
  } else if (state.planPeriodType === 'WEEKLY') {
    const range = getWeekRange(base);
    if (titleEl) titleEl.textContent = `주간 업무계획 (${range.start} ~ ${range.end})`;
    if (subEl) subEl.textContent = '해당 주간(월~일) 주요 정기 점검 및 시설 관리 일정';
    filtered = state.plans.filter(p => p.type === 'WEEKLY' && p.date >= range.start && p.date <= range.end);
  } else {
    const ym = base.slice(0, 7);
    if (titleEl) titleEl.textContent = `월간 업무계획 (${ym.replace('-', '년 ')}월)`;
    if (subEl) subEl.textContent = '월간 법정점검, 시설 보수 및 주요 관리 일정';
    filtered = state.plans.filter(p => p.type === 'MONTHLY' && (p.date || '').startsWith(ym));
  }

  const doneCount = filtered.filter(p => p.done).length;
  const pct = filtered.length > 0 ? Math.round((doneCount / filtered.length) * 100) : 0;
  if (ratioEl) ratioEl.textContent = `${doneCount} / ${filtered.length}건`;
  if (pctEl) pctEl.textContent = `${pct}%`;
  if (barEl) barEl.style.width = `${pct}%`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-400 text-xs">해당 기간에 등록된 업무계획이 없습니다. 우측 상단 '+ 계획 등록'을 눌러 추가해 보세요.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(p => `
    <tr class="${p.done ? 'bg-slate-50/80 text-slate-400' : 'bg-white text-slate-800'} hover:bg-slate-50 transition">
      <td class="py-2.5 px-2.5 text-center">
        <input type="checkbox" ${p.done ? 'checked' : ''} onchange="togglePlanDone('${p.id}')" class="w-4 h-4 text-brand-600 rounded cursor-pointer">
      </td>
      <td class="py-2.5 px-2 text-[11px] font-bold whitespace-nowrap">${escapeHtml(p.date)}</td>
      <td class="py-2.5 px-2">
        <span class="font-bold block ${p.done ? 'line-through text-slate-400' : 'text-slate-900'}">${escapeHtml(p.title)}</span>
        ${p.location ? `<span class="text-[10px] text-brand-700 font-semibold"><i class="fa-solid fa-location-dot mr-0.5"></i>${escapeHtml(p.location)}</span>` : ''}
      </td>
      <td class="py-2.5 px-2 text-[11px] font-semibold text-slate-600">${escapeHtml(p.assignee || '공통')}</td>
      <td class="py-2.5 px-2 text-center">
        <div class="flex items-center justify-center gap-1">
          <button type="button" onclick="sendPlanToWorkLog('${p.id}')" title="작업일지로 옮기기" class="w-6 h-6 rounded bg-brand-50 hover:bg-brand-100 text-brand-700 text-[10px]"><i class="fa-solid fa-arrow-right"></i></button>
          <button type="button" onclick="deletePlan('${p.id}')" title="삭제" class="w-6 h-6 rounded bg-red-50 hover:bg-red-100 text-red-600 text-[10px]"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

// LEAVE / VACATION MANAGEMENT (반차 · 연차 · 휴가 폴더 및 결재용 출력)
function syncLeaveEndDate() {
  const start = (document.getElementById('leaveStartDate') as HTMLInputElement).value;
  const endEl = document.getElementById('leaveEndDate') as HTMLInputElement;
  if (start && (!endEl.value || endEl.value < start)) {
    endEl.value = start;
  }
  updateLeaveDaysCalc();
}

function updateLeaveDaysCalc() {
  const type = (document.getElementById('leaveType') as HTMLSelectElement).value;
  const start = (document.getElementById('leaveStartDate') as HTMLInputElement).value;
  const end = (document.getElementById('leaveEndDate') as HTMLInputElement).value;
  const disp = document.getElementById('leaveDaysDisplay') as HTMLInputElement | null;
  if (!disp) return;

  if (type === '오전반차' || type === '오후반차') {
    if (start) (document.getElementById('leaveEndDate') as HTMLInputElement).value = start;
    disp.value = '0.5일 (반차)';
    return;
  }
  if (start && end && end >= start) {
    const d1 = new Date(start + 'T00:00:00').getTime();
    const d2 = new Date(end + 'T00:00:00').getTime();
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
    disp.value = `${diff}일`;
  } else {
    disp.value = '1일';
  }
}

async function submitLeaveRequest(e: Event) {
  e.preventDefault();
  const worker = getSelectedWorker();
  if (!worker) {
    showToast('상단에서 신청자(작업자) 본인의 이름을 먼저 선택해 주세요!', 'error');
    document.getElementById('workerSelect')?.focus();
    return;
  }

  const type = (document.getElementById('leaveType') as HTMLSelectElement).value;
  const startDate = (document.getElementById('leaveStartDate') as HTMLInputElement).value;
  const endDate = (type === '오전반차' || type === '오후반차')
    ? startDate
    : ((document.getElementById('leaveEndDate') as HTMLInputElement).value || startDate);
  const daysText = (document.getElementById('leaveDaysDisplay') as HTMLInputElement).value || '1일';
  const reason = (document.getElementById('leaveReason') as HTMLTextAreaElement).value.trim();
  const phone = (document.getElementById('leavePhone') as HTMLInputElement).value.trim();
  if (!startDate || !reason) return;

  const id = 'leave-' + Date.now();
  const item = {
    id,
    workerId: worker.id,
    workerName: worker.name,
    workerRole: worker.role,
    type,
    startDate,
    endDate,
    daysText,
    reason,
    phone,
    status: '결재대기',
    approvedBy: '',
    submittedDate: getTodayString(),
    timestamp: Date.now()
  };

  state.leaves.unshift(item);
  (document.getElementById('leaveReason') as HTMLTextAreaElement).value = '';
  renderLeaves();

  try { await setDoc(getDocRef('leaves', id), item); } catch (err) { console.error(err); }
  showToast('연차·휴가 신청서가 등록되었습니다. 결재용 출력도 바로 가능합니다!', 'success');
}

function setLeaveFilter(f: string) {
  state.leaveFilter = f;
  ['ALL', 'TODAY', 'PENDING'].forEach(key => {
    const btn = document.getElementById(`leave-filter-${key}`);
    if (!btn) return;
    btn.className = key === f
      ? 'px-2.5 py-1.5 rounded-lg bg-navy-800 text-white font-bold transition whitespace-nowrap'
      : 'px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 font-semibold transition whitespace-nowrap';
  });
  renderLeaves();
}

async function approveLeaveRequest(id: string) {
  const item = state.leaves.find(l => l.id === id);
  if (!item) return;
  item.status = '결재승인';
  item.approvedBy = '관리소장';
  renderLeaves();
  try { await updateDoc(getDocRef('leaves', id), { status: '결재승인', approvedBy: '관리소장' }); } catch (err) { console.error(err); }
  showToast('소장 결재 승인 처리되었습니다.', 'success');
}

async function deleteLeaveRequest(id: string) {
  state.leaves = state.leaves.filter(l => l.id !== id);
  renderLeaves();
  try { await deleteDoc(getDocRef('leaves', id)); } catch (err) { console.error(err); }
  showToast('휴가 신청서가 삭제되었습니다.', 'info');
}

function openLeavePrintModal(id: string) {
  const item = state.leaves.find(l => l.id === id);
  if (!item) return;

  document.getElementById('printRole')!.textContent = item.workerRole || '-';
  document.getElementById('printName')!.textContent = item.workerName || '-';
  document.getElementById('printType')!.textContent = `${item.type} (${item.daysText})`;
  document.getElementById('printPeriod')!.textContent = item.startDate === item.endDate
    ? `${item.startDate} (${item.daysText})`
    : `${item.startDate} ~ ${item.endDate} (${item.daysText})`;
  document.getElementById('printPhone')!.textContent = item.phone || '-';
  document.getElementById('printReason')!.textContent = item.reason || '-';
  document.getElementById('printSignAuthor')!.textContent = item.workerName || '서명';
  document.getElementById('printSignDirector')!.textContent = item.status === '결재승인' ? '승인완료' : '';
  document.getElementById('printApplicantSign')!.textContent = item.workerName || '';

  const subParts = (item.submittedDate || getTodayString()).split('-');
  if (subParts.length === 3) {
    document.getElementById('printSubmittedDate')!.textContent = `${subParts[0]}년 ${Number(subParts[1])}월 ${Number(subParts[2])}일`;
  }

  document.getElementById('leavePrintModal')?.classList.remove('hidden');
}

function closeLeavePrintModal() {
  document.getElementById('leavePrintModal')?.classList.add('hidden');
}

function renderLeaves() {
  const container = document.getElementById('leaveListContainer');
  const countBadge = document.getElementById('leaveCountBadge');
  const todayBox = document.getElementById('todayLeaveSummaryBox');
  const todayLabel = document.getElementById('leaveTodayDateLabel');
  const dot = document.getElementById('todayLeaveDot');

  const today = getTodayString();
  if (todayLabel) todayLabel.textContent = today;

  const todayLeaves = state.leaves.filter(l => l.startDate <= today && l.endDate >= today);
  if (todayLeaves.length > 0) {
    dot?.classList.remove('hidden');
    if (todayBox) {
      todayBox.innerHTML = todayLeaves.map(l =>
        `<span class="inline-block mr-2 mb-1 px-2.5 py-0.5 bg-white/15 rounded-lg border border-white/20">🌴 ${escapeHtml(l.workerName)} (${escapeHtml(l.workerRole || '')}) · <strong>${escapeHtml(l.type)}</strong></span>`
      ).join('');
    }
  } else {
    dot?.classList.add('hidden');
    if (todayBox) {
      todayBox.textContent = '오늘 연차·반차·휴가 중인 직원이 없습니다. (전원 정상 근무)';
    }
  }

  if (!container) return;
  let list = state.leaves;
  if (state.leaveFilter === 'TODAY') list = todayLeaves;
  else if (state.leaveFilter === 'PENDING') list = state.leaves.filter(l => l.status !== '결재승인');

  if (countBadge) countBadge.textContent = `총 ${list.length}건`;

  if (list.length === 0) {
    container.innerHTML = `<div class="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-xs">등록된 연차·휴가 신청 내역이 없습니다.</div>`;
    return;
  }

  container.innerHTML = list.map(l => {
    const isApproved = l.status === '결재승인';
    const isToday = l.startDate <= today && l.endDate >= today;
    const canDelete = state.isAdmin || (state.selectedWorkerId && state.selectedWorkerId === l.workerId);
    return `
      <div class="bg-white border ${isToday ? 'border-indigo-300 bg-indigo-50/20' : 'border-slate-200'} rounded-2xl p-3.5 shadow-sm space-y-2">
        <div class="flex items-start justify-between gap-2">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-[10px] font-extrabold">${escapeHtml(l.type)} (${escapeHtml(l.daysText)})</span>
            <span class="text-xs font-extrabold text-slate-900">${escapeHtml(l.workerName)}</span>
            <span class="text-[11px] text-slate-500">${escapeHtml(l.workerRole || '')}</span>
            ${isToday ? `<span class="px-1.5 py-0.5 bg-rose-500 text-white rounded text-[9px] font-extrabold">오늘 휴무</span>` : ''}
          </div>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
            ${isApproved ? '✔ 소장 결재승인' : '결재 대기중'}
          </span>
        </div>

        <div class="text-xs font-bold text-slate-700">
          <i class="fa-regular fa-calendar text-brand-600 mr-1"></i>
          기간: ${l.startDate === l.endDate ? escapeHtml(l.startDate) : `${escapeHtml(l.startDate)} ~ ${escapeHtml(l.endDate)}`}
        </div>
        <p class="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 whitespace-pre-line">${escapeHtml(l.reason)}</p>

        <div class="flex items-center justify-between pt-2 border-t border-slate-100 gap-1.5 text-[11px] flex-wrap">
          <div class="flex items-center gap-1.5">
            <button type="button" onclick="openLeavePrintModal('${l.id}')" class="px-3 py-1.5 bg-navy-800 hover:bg-navy-700 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1">
              <i class="fa-solid fa-print"></i> 결재용 출력
            </button>
            ${state.isAdmin && !isApproved ? `
              <button type="button" onclick="approveLeaveRequest('${l.id}')" class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition">소장 결재 승인</button>
            ` : ''}
          </div>
          ${canDelete ? `
            <button type="button" onclick="deleteLeaveRequest('${l.id}')" class="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold transition">삭제</button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// HANDOVER & NOTICE (공지 및 인수인계 + 입사·퇴사 인수인계 폴더)
function setHandoverFolderMode(mode: string) {
  state.handoverFolderMode = mode;
  const shiftBtn = document.getElementById('hoFolderBtn-SHIFT');
  const ioBtn = document.getElementById('hoFolderBtn-STAFF_IO');
  const shiftSec = document.getElementById('hoShiftSection');
  const ioSec = document.getElementById('hoStaffIoSection');

  if (mode === 'STAFF_IO') {
    if (ioBtn) ioBtn.className = 'py-2.5 px-2 rounded-xl bg-indigo-600 text-white font-extrabold shadow-xs transition flex items-center justify-center gap-1.5';
    if (shiftBtn) shiftBtn.className = 'py-2.5 px-2 rounded-xl text-slate-600 hover:text-slate-900 font-bold transition flex items-center justify-center gap-1.5';
    shiftSec?.classList.add('hidden');
    ioSec?.classList.remove('hidden');
    renderStaffHandovers();
  } else {
    if (shiftBtn) shiftBtn.className = 'py-2.5 px-2 rounded-xl bg-brand-600 text-white font-extrabold shadow-xs transition flex items-center justify-center gap-1.5';
    if (ioBtn) ioBtn.className = 'py-2.5 px-2 rounded-xl text-slate-600 hover:text-slate-900 font-bold transition flex items-center justify-center gap-1.5';
    ioSec?.classList.add('hidden');
    shiftSec?.classList.remove('hidden');
    renderHandovers();
  }
}

async function handleStaffHandoverFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const label = document.getElementById('shFileLabel');
  if (file.type.startsWith('image/')) {
    try {
      const opt = await optimizeImageFile(file, {
        scale: 0.5,
        maxDimension: 1000,
        maxTargetBytes: 380 * 1024,
        initialQuality: 0.7
      });
      currentStaffHandoverAttachment = {
        name: file.name,
        isImage: true,
        dataUrl: opt.dataUrl
      };
      if (label) label.textContent = `첨부됨: ${file.name} (EXIF 삭제·50% 압축)`;
      showToast('인수인계 서류 이미지가 EXIF 삭제 및 50% 리사이징되어 첨부되었습니다.', 'success');
    } catch (err) {
      console.error(err);
      showToast('이미지 최적화 처리 중 오류가 발생했습니다.', 'error');
    }
  } else {
    currentStaffHandoverAttachment = {
      name: file.name,
      isImage: false,
      dataUrl: ''
    };
    if (label) label.textContent = `서류파일명 기록됨: ${file.name}`;
    showToast(`서류 파일명('${file.name}')이 기록되었습니다.`, 'info');
  }
}

async function submitStaffHandover(e: Event) {
  e.preventDefault();
  const type = (document.getElementById('shType') as HTMLSelectElement).value;
  const date = (document.getElementById('shDate') as HTMLInputElement).value || getTodayString();
  const giver = (document.getElementById('shGiver') as HTMLInputElement).value.trim();
  const receiver = (document.getElementById('shReceiver') as HTMLInputElement).value.trim();
  const title = (document.getElementById('shTitle') as HTMLInputElement).value.trim();
  const content = (document.getElementById('shContent') as HTMLTextAreaElement).value.trim();
  const chkKeys = (document.getElementById('shChkKeys') as HTMLInputElement).checked;
  const chkDocs = (document.getElementById('shChkDocs') as HTMLInputElement).checked;
  if (!giver || !receiver || !title || !content) return;

  const worker = getSelectedWorker();
  const id = 'sh-' + Date.now();
  const docObj = {
    id,
    type,
    date,
    giver,
    receiver,
    title,
    content,
    chkKeys,
    chkDocs,
    attachmentName: currentStaffHandoverAttachment?.name || '',
    attachmentImage: currentStaffHandoverAttachment?.dataUrl || '',
    createdBy: worker ? `${worker.name} (${worker.role})` : giver,
    receiverConfirmedBy: '',
    receiverConfirmedAt: '',
    directorApprovedBy: '',
    timestamp: Date.now()
  };

  state.staffHandovers.unshift(docObj);
  (document.getElementById('shGiver') as HTMLInputElement).value = '';
  (document.getElementById('shReceiver') as HTMLInputElement).value = '';
  (document.getElementById('shTitle') as HTMLInputElement).value = '';
  (document.getElementById('shContent') as HTMLTextAreaElement).value = '';
  currentStaffHandoverAttachment = null;
  const fileInp = document.getElementById('shFileInput') as HTMLInputElement | null;
  if (fileInp) fileInp.value = '';
  const fileLbl = document.getElementById('shFileLabel');
  if (fileLbl) fileLbl.textContent = '서류 사진 또는 문서 파일 선택';
  renderStaffHandovers();

  try { await setDoc(getDocRef('staff_handovers', id), docObj); } catch (err) { console.error(err); }
  showToast('입사·퇴사 인수인계 폴더에 등록되었습니다!', 'success');
}

function setStaffHandoverFilter(f: string) {
  state.staffHandoverFilter = f;
  ['ALL', 'UNCONFIRMED', 'DONE'].forEach(key => {
    const btn = document.getElementById(`sh-filter-${key}`);
    if (!btn) return;
    btn.className = key === f
      ? 'px-2.5 py-1.5 rounded-lg bg-navy-800 text-white font-bold transition whitespace-nowrap'
      : 'px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-semibold transition whitespace-nowrap';
  });
  renderStaffHandovers();
}

async function confirmStaffHandoverReceiver(id: string) {
  const worker = getSelectedWorker();
  const item = state.staffHandovers.find(s => s.id === id);
  if (!item) return;
  const signer = worker ? `${worker.name} (${worker.role})` : item.receiver;
  const now = new Date();
  const timeStr = `${getTodayString()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  item.receiverConfirmedBy = signer;
  item.receiverConfirmedAt = timeStr;
  renderStaffHandovers();
  try { await updateDoc(getDocRef('staff_handovers', id), { receiverConfirmedBy: signer, receiverConfirmedAt: timeStr }); } catch (err) { console.error(err); }
  showToast('인수자 확인 서명이 완료되었습니다.', 'success');
}

async function approveStaffHandoverDirector(id: string) {
  const item = state.staffHandovers.find(s => s.id === id);
  if (!item) return;
  item.directorApprovedBy = '관리소장 결재완료';
  renderStaffHandovers();
  try { await updateDoc(getDocRef('staff_handovers', id), { directorApprovedBy: '관리소장 결재완료' }); } catch (err) { console.error(err); }
  showToast('관리소장 최종 확인 결재가 완료되었습니다.', 'success');
}

async function deleteStaffHandover(id: string) {
  state.staffHandovers = state.staffHandovers.filter(s => s.id !== id);
  renderStaffHandovers();
  try { await deleteDoc(getDocRef('staff_handovers', id)); } catch (err) { console.error(err); }
  showToast('인수인계 서류가 삭제되었습니다.', 'info');
}

function openStaffHandoverPrintModal(id: string) {
  const item = state.staffHandovers.find(s => s.id === id);
  if (!item) return;
  document.getElementById('shPrintType')!.textContent = item.type || '-';
  document.getElementById('shPrintDate')!.textContent = item.date || '-';
  document.getElementById('shPrintGiver')!.textContent = item.giver || '-';
  document.getElementById('shPrintReceiver')!.textContent = item.receiver || '-';
  document.getElementById('shPrintTitle')!.textContent = item.title || '-';
  const checks: string[] = [];
  if (item.chkKeys) checks.push('✔ 마스터키·공구·비품 인계 완료');
  if (item.chkDocs) checks.push('✔ 미처리 민원·법정점검 서류 및 계정 안내 완료');
  if (item.attachmentName) checks.push(`✔ 첨부서류: ${item.attachmentName}`);
  document.getElementById('shPrintChecks')!.textContent = checks.join('  /  ') || '-';
  document.getElementById('shPrintContent')!.textContent = item.content || '-';
  document.getElementById('shPrintSignGiver')!.textContent = item.giver || '인계자';
  document.getElementById('shPrintSignReceiver')!.textContent = item.receiverConfirmedBy ? '확인완료' : '';
  document.getElementById('shPrintSignDirector')!.textContent = item.directorApprovedBy ? '결재완료' : '';
  document.getElementById('shPrintSignGiverBottom')!.textContent = item.giver || '-';
  document.getElementById('shPrintSignReceiverBottom')!.textContent = item.receiver || '-';
  document.getElementById('staffHandoverPrintModal')?.classList.remove('hidden');
}

function closeStaffHandoverPrintModal() {
  document.getElementById('staffHandoverPrintModal')?.classList.add('hidden');
}

function renderStaffHandovers() {
  const container = document.getElementById('staffHandoverListContainer');
  const countBadge = document.getElementById('shCountBadge');
  if (!container) return;

  let list = state.staffHandovers;
  if (state.staffHandoverFilter === 'UNCONFIRMED') list = state.staffHandovers.filter(s => !s.receiverConfirmedBy);
  else if (state.staffHandoverFilter === 'DONE') list = state.staffHandovers.filter(s => !!s.receiverConfirmedBy);

  if (countBadge) countBadge.textContent = `보관 ${list.length}건`;

  if (list.length === 0) {
    container.innerHTML = `<div class="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-xs">등록된 입사·퇴사 업무 인수인계서가 없습니다.</div>`;
    return;
  }

  container.innerHTML = list.map(s => {
    const isConfirmed = !!s.receiverConfirmedBy;
    const isDirectorApproved = !!s.directorApprovedBy;
    return `
      <div class="bg-white border ${isConfirmed ? 'border-emerald-200' : 'border-indigo-200'} rounded-2xl p-4 shadow-sm space-y-2.5">
        <div class="flex items-start justify-between gap-2">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-[10px] font-extrabold">${escapeHtml(s.type)}</span>
            <span class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-bold">${escapeHtml(s.date)}</span>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${isConfirmed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
              ${isConfirmed ? '✔ 인수확인 완료' : '인수확인 대기'}
            </span>
            ${isDirectorApproved ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-600 text-white">소장결재</span>` : ''}
          </div>
        </div>

        <h4 class="text-sm font-extrabold text-slate-900">${escapeHtml(s.title)}</h4>

        <div class="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-xs">
          <div><span class="text-[10px] text-slate-500 block">인계자 (전임)</span><strong class="text-slate-800">${escapeHtml(s.giver)}</strong></div>
          <div><span class="text-[10px] text-slate-500 block">인수자 (후임)</span><strong class="text-indigo-800">${escapeHtml(s.receiver)}</strong></div>
        </div>

        <div class="flex flex-wrap gap-1.5 text-[10px] font-bold">
          ${s.chkKeys ? `<span class="px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded">✔ 열쇠·공구·비품 인계</span>` : ''}
          ${s.chkDocs ? `<span class="px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded">✔ 민원·서류·계정 안내</span>` : ''}
          ${s.attachmentName ? `<span class="px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded"><i class="fa-solid fa-paperclip mr-1"></i>${escapeHtml(s.attachmentName)}</span>` : ''}
        </div>

        <p class="text-xs text-slate-700 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 whitespace-pre-line leading-relaxed">${escapeHtml(s.content)}</p>

        ${s.attachmentImage ? `
          <div>
            <span class="text-[10px] font-bold text-indigo-700 block mb-1">📎 첨부 서류 스캔본 (클릭 확대)</span>
            <img src="${s.attachmentImage}" alt="인수인계서류" onclick="openLightbox('${s.attachmentImage}')" class="w-full h-36 object-cover rounded-xl border border-indigo-200 cursor-zoom-in">
          </div>
        ` : ''}

        <div class="flex items-center justify-between pt-2 border-t border-slate-100 gap-1.5 text-[11px] flex-wrap">
          <div class="flex items-center gap-1.5 flex-wrap">
            <button type="button" onclick="openStaffHandoverPrintModal('${s.id}')" class="px-3 py-1.5 bg-navy-800 hover:bg-navy-700 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1">
              <i class="fa-solid fa-print"></i> 인수인계서 출력
            </button>
            ${!isConfirmed ? `
              <button type="button" onclick="confirmStaffHandoverReceiver('${s.id}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-xs transition">인수자 확인서명</button>
            ` : `<span class="text-emerald-700 font-bold"><i class="fa-solid fa-circle-check mr-1"></i>인수: ${escapeHtml(s.receiverConfirmedBy)}</span>`}
            ${state.isAdmin && !isDirectorApproved ? `
              <button type="button" onclick="approveStaffHandoverDirector('${s.id}')" class="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition">소장 결재</button>
            ` : ''}
          </div>
          ${state.isAdmin ? `
            <button type="button" onclick="deleteStaffHandover('${s.id}')" class="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold transition">삭제</button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function setHandoverFilter(f: string) {
  state.handoverFilter = f;
  ['ALL', 'UNCONFIRMED', '전체공지'].forEach(key => {
    const btn = document.getElementById(`ho-filter-${key}`);
    if (!btn) return;
    btn.className = key === f
      ? 'px-2.5 py-1.5 rounded-lg bg-navy-800 text-white font-bold transition whitespace-nowrap'
      : 'px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 font-semibold transition whitespace-nowrap';
  });
  renderHandovers();
}

async function submitHandover(e: Event) {
  e.preventDefault();
  const worker = getSelectedWorker();
  if (!worker) {
    showToast('상단에서 작업자 본인의 이름을 먼저 선택해 주세요!', 'error');
    return;
  }
  const type = (document.getElementById('handoverType') as HTMLSelectElement).value;
  const isImportant = (document.getElementById('handoverImportant') as HTMLInputElement).checked;
  const content = (document.getElementById('handoverContent') as HTMLTextAreaElement).value.trim();
  if (!content) return;

  const now = new Date();
  const timeStr = `${getTodayString()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const id = 'ho-' + Date.now();
  const newHo = {
    id,
    type,
    isImportant,
    author: `${worker.name} (${worker.role})`,
    authorId: worker.id,
    content,
    createdAt: timeStr,
    timestamp: Date.now(),
    confirmedBy: null,
    confirmedAt: null
  };

  state.handovers.unshift(newHo);
  (document.getElementById('handoverContent') as HTMLTextAreaElement).value = '';
  (document.getElementById('handoverImportant') as HTMLInputElement).checked = false;
  renderHandovers();

  try { await setDoc(getDocRef('handovers', id), newHo); } catch (err) { console.error(err); }
  showToast('공지 / 인수인계가 등록되었습니다.', 'success');
}

async function confirmHandoverItem(id: string) {
  const worker = getSelectedWorker();
  if (!worker) {
    showToast('인수 확인 서명을 위해 상단에서 작업자를 선택해 주세요!', 'error');
    return;
  }
  const ho = state.handovers.find(h => h.id === id);
  if (!ho) return;
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  ho.confirmedBy = `${worker.name} (${worker.role})`;
  ho.confirmedAt = timeStr;
  renderHandovers();
  try { await updateDoc(getDocRef('handovers', id), { confirmedBy: ho.confirmedBy, confirmedAt: ho.confirmedAt }); } catch (err) { console.error(err); }
  showToast('인수 확인 완료 서명되었습니다.', 'success');
}

function openEditHandoverModal(id: string) {
  const ho = state.handovers.find(h => h.id === id);
  if (!ho) return;
  (document.getElementById('editHoId') as HTMLInputElement).value = ho.id;
  (document.getElementById('editHoType') as HTMLSelectElement).value = ho.type;
  (document.getElementById('editHoImportant') as HTMLInputElement).checked = !!ho.isImportant;
  (document.getElementById('editHoContent') as HTMLTextAreaElement).value = ho.content;
  document.getElementById('editHandoverModal')?.classList.remove('hidden');
}

function closeEditHandoverModal() {
  document.getElementById('editHandoverModal')?.classList.add('hidden');
}

async function saveHandoverEdit(e: Event) {
  e.preventDefault();
  const id = (document.getElementById('editHoId') as HTMLInputElement).value;
  const type = (document.getElementById('editHoType') as HTMLSelectElement).value;
  const isImportant = (document.getElementById('editHoImportant') as HTMLInputElement).checked;
  const content = (document.getElementById('editHoContent') as HTMLTextAreaElement).value.trim();
  const ho = state.handovers.find(h => h.id === id);
  if (ho) {
    ho.type = type;
    ho.isImportant = isImportant;
    ho.content = content;
    renderHandovers();
    try { await updateDoc(getDocRef('handovers', id), { type, isImportant, content }); } catch (err) { console.error(err); }
  }
  closeEditHandoverModal();
  showToast('수정되었습니다.', 'success');
}

async function deleteHandover(id: string) {
  state.handovers = state.handovers.filter(h => h.id !== id);
  renderHandovers();
  try { await deleteDoc(getDocRef('handovers', id)); } catch (err) { console.error(err); }
  showToast('삭제되었습니다.', 'info');
}

function renderHandovers() {
  const container = document.getElementById('handoverContainer');
  const countBadge = document.getElementById('handoverCountBadge');
  const dot = document.getElementById('unconfirmedDot');

  const unconfirmedCount = state.handovers.filter(h => !h.confirmedBy && h.type !== '전체공지').length;
  if (unconfirmedCount > 0) dot?.classList.remove('hidden');
  else dot?.classList.add('hidden');

  if (!container) return;
  let list = state.handovers;
  if (state.handoverFilter === 'UNCONFIRMED') list = state.handovers.filter(h => !h.confirmedBy && h.type !== '전체공지');
  else if (state.handoverFilter === '전체공지') list = state.handovers.filter(h => h.type === '전체공지');

  if (countBadge) countBadge.textContent = `총 ${list.length}건`;

  if (list.length === 0) {
    container.innerHTML = `<div class="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-xs">등록된 공지 · 인수인계 내역이 없습니다.</div>`;
    return;
  }

  container.innerHTML = list.map(ho => {
    const canModify = state.isAdmin || (state.selectedWorkerId && state.selectedWorkerId === ho.authorId);
    return `
      <div class="bg-white border ${ho.isImportant ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'} rounded-2xl p-3.5 shadow-sm space-y-2">
        <div class="flex items-start justify-between gap-2">
          <div class="flex flex-wrap items-center gap-1.5">
            ${ho.isImportant ? `<span class="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-extrabold rounded">중요</span>` : ''}
            <span class="px-2 py-0.5 bg-slate-100 text-slate-800 text-[11px] font-bold rounded">${escapeHtml(ho.type)}</span>
            <span class="text-xs font-bold text-slate-700">${escapeHtml(ho.author)}</span>
          </div>
          ${canModify ? `
            <div class="flex items-center gap-1 shrink-0">
              <button type="button" onclick="openEditHandoverModal('${ho.id}')" class="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold">수정</button>
              <button type="button" onclick="deleteHandover('${ho.id}')" class="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold">삭제</button>
            </div>
          ` : ''}
        </div>

        <p class="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line">${escapeHtml(ho.content)}</p>

        <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
          <span class="text-slate-400">${escapeHtml(ho.createdAt || '')}</span>
          ${ho.type !== '전체공지' ? (
            ho.confirmedBy
              ? `<span class="text-emerald-700 font-bold"><i class="fa-solid fa-circle-check mr-1"></i>인수확인: ${escapeHtml(ho.confirmedBy)} (${escapeHtml(ho.confirmedAt || '')})</span>`
              : `<button type="button" onclick="confirmHandoverItem('${ho.id}')" class="px-2.5 py-1 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-lg text-[11px] shadow-xs">인수 확인 서명</button>`
          ) : `<span class="text-brand-600 font-semibold">전체 공유 공지</span>`}
        </div>
      </div>
    `;
  }).join('');
}

// TOOL MANAGEMENT (공구 관리 대장 + 재고부족 자동표시 + 반납 관리자 알림 + 화재감지기 폴더)
function parseToolQtyNumber(qtyStr: any): number {
  const m = String(qtyStr ?? '').match(/\d+/);
  return m ? parseInt(m[0], 10) : 1;
}

function formatToolQtyWithUnit(prevQtyStr: any, nextNum: number): string {
  const safeNum = Math.max(0, nextNum);
  const s = String(prevQtyStr ?? '').trim();
  const unit = s.replace(/^.*?\d+\s*/, '').trim() || '개';
  return `${safeNum}${unit}`;
}

function isToolLowStock(tool: any): boolean {
  return parseToolQtyNumber(tool?.qty) <= 1;
}

function getToolCategory(tool: any): '일반공구' | '광전식감지기' | '정온식감지기' {
  if (tool?.category === '광전식감지기' || tool?.category === '정온식감지기') {
    return tool.category;
  }
  const name = String(tool?.name || '');
  if (name.includes('광전식')) return '광전식감지기';
  if (name.includes('정온식')) return '정온식감지기';
  return '일반공구';
}

function setToolFolderMode(mode: string) {
  state.toolFolderMode = mode;
  const toolsBtn = document.getElementById('toolFolderBtn-TOOLS');
  const fdBtn = document.getElementById('toolFolderBtn-FIRE_DETECTORS');
  const toolsSec = document.getElementById('toolLedgerSection');
  const fdSec = document.getElementById('fireDetectorSection');

  if (mode === 'TOOLS') {
    if (toolsBtn) toolsBtn.className = 'py-2.5 px-2 rounded-xl bg-brand-600 text-white font-extrabold shadow-xs transition flex items-center justify-center gap-1.5';
    if (fdBtn) fdBtn.className = 'relative py-2.5 px-2 rounded-xl text-slate-600 hover:text-slate-900 font-bold transition flex items-center justify-center gap-1.5';
    toolsSec?.classList.remove('hidden');
    fdSec?.classList.add('hidden');
  } else {
    if (toolsBtn) toolsBtn.className = 'py-2.5 px-2 rounded-xl text-slate-600 hover:text-slate-900 font-bold transition flex items-center justify-center gap-1.5';
    if (fdBtn) fdBtn.className = 'relative py-2.5 px-2 rounded-xl bg-rose-600 text-white font-extrabold shadow-xs transition flex items-center justify-center gap-1.5';
    toolsSec?.classList.add('hidden');
    fdSec?.classList.remove('hidden');
    renderFireDetectors();
  }
}

function toggleToolAddForm() {
  document.getElementById('toolAddForm')?.classList.toggle('hidden');
}

function toggleToolPasteBox() {
  document.getElementById('toolPasteBox')?.classList.toggle('hidden');
}

function presetFireDetectorTool(type: '광전식감지기' | '정온식감지기') {
  const form = document.getElementById('toolAddForm');
  form?.classList.remove('hidden');
  const catEl = document.getElementById('newToolCategory') as HTMLSelectElement | null;
  const nameEl = document.getElementById('newToolName') as HTMLInputElement | null;
  const locEl = document.getElementById('newToolLocation') as HTMLInputElement | null;
  const qtyEl = document.getElementById('newToolQty') as HTMLInputElement | null;
  const noteEl = document.getElementById('newToolNote') as HTMLInputElement | null;

  if (catEl) catEl.value = type;
  if (nameEl) nameEl.value = type === '광전식감지기' ? '광전식 감지기' : '정온식 감지기';
  if (locEl && !locEl.value.trim()) locEl.value = '방재실 소방자재함';
  if (qtyEl) {
    qtyEl.value = '50개';
    qtyEl.focus();
    qtyEl.select();
  }
  if (noteEl && !noteEl.value.trim()) noteEl.value = '화재감지기 교체용 예비품';
  showToast(`${type} 등록 양식이 채워졌습니다. 수량을 확인 후 등록하세요.`, 'info');
}

function setToolFilter(f: string) {
  state.toolFilter = f;
  ['ALL', 'AVAILABLE', 'RENTED', 'REPAIR', 'LOW_STOCK'].forEach(key => {
    const btn = document.getElementById(`tool-filter-${key}`);
    if (!btn) return;
    if (key === f) {
      btn.className = key === 'LOW_STOCK'
        ? 'px-2.5 py-1.5 rounded-lg bg-red-600 text-white font-bold transition whitespace-nowrap'
        : 'px-2.5 py-1.5 rounded-lg bg-navy-800 text-white font-bold transition whitespace-nowrap';
    } else {
      btn.className = key === 'LOW_STOCK'
        ? 'px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 font-semibold transition whitespace-nowrap'
        : 'px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-semibold transition whitespace-nowrap';
    }
  });
  renderTools();
}

async function handleAddTool(e: Event) {
  e.preventDefault();
  const categoryEl = document.getElementById('newToolCategory') as HTMLSelectElement | null;
  const name = (document.getElementById('newToolName') as HTMLInputElement).value.trim();
  const location = (document.getElementById('newToolLocation') as HTMLInputElement).value.trim();
  const qty = (document.getElementById('newToolQty') as HTMLInputElement).value.trim() || '1개';
  const note = (document.getElementById('newToolNote') as HTMLInputElement).value.trim();
  if (!name || !location) return;

  const rawCategory = categoryEl?.value || '일반공구';
  const category = getToolCategory({ category: rawCategory, name });

  const id = 'tool-' + Date.now();
  const newTool = { id, category, name, location, qty, note, status: 'AVAILABLE', rentedBy: '', rentedAt: '', rentLocation: '' };
  state.tools.unshift(newTool);
  if (categoryEl) categoryEl.value = '일반공구';
  (document.getElementById('newToolName') as HTMLInputElement).value = '';
  (document.getElementById('newToolLocation') as HTMLInputElement).value = '';
  (document.getElementById('newToolQty') as HTMLInputElement).value = '1세트';
  (document.getElementById('newToolNote') as HTMLInputElement).value = '';
  document.getElementById('toolAddForm')?.classList.add('hidden');
  renderTools();

  try { await setDoc(getDocRef('tools', id), newTool); } catch (err) { console.error(err); }
  if (isToolLowStock(newTool)) {
    showToast(`'${name}' 등록됨 (⚠️ 수량 1 이하로 재고 부족 상태입니다)`, 'info');
  } else {
    showToast('공구 대장에 등록되었습니다.', 'success');
  }
}

async function adjustToolQty(id: string, delta: number) {
  const tool = state.tools.find(t => t.id === id);
  if (!tool) return;
  const curNum = parseToolQtyNumber(tool.qty);
  const nextNum = Math.max(0, curNum + delta);
  if (nextNum === curNum && delta < 0) return;
  const nextQty = formatToolQtyWithUnit(tool.qty, nextNum);
  tool.qty = nextQty;
  renderTools();

  try { await updateDoc(getDocRef('tools', id), { qty: nextQty }); } catch (err) { console.error(err); }
  if (nextNum <= 1) {
    showToast(`⚠️ '${tool.name}' 보유 수량이 ${nextQty}로 재고 부족 상태입니다!`, 'error');
  }
}

async function rentTool(id: string) {
  const worker = getSelectedWorker();
  if (!worker) {
    showToast('상단에서 대여자 본인의 이름을 먼저 선택해 주세요!', 'error');
    return;
  }
  const tool = state.tools.find(t => t.id === id);
  if (!tool) return;
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  tool.status = 'RENTED';
  tool.rentedBy = `${worker.name} (${worker.role})`;
  tool.rentedAt = timeStr;
  renderTools();
  try { await updateDoc(getDocRef('tools', id), { status: 'RENTED', rentedBy: tool.rentedBy, rentedAt: timeStr }); } catch (err) { console.error(err); }
  showToast(`'${tool.name}' 현장 대여 처리되었습니다.`, 'success');
}

async function returnTool(id: string) {
  const tool = state.tools.find(t => t.id === id);
  if (!tool) return;

  const prevRentedBy = tool.rentedBy || '';
  const selectedWorker = getSelectedWorker();
  const returnedBy = selectedWorker
    ? `${selectedWorker.name} (${selectedWorker.role})`
    : (prevRentedBy || '작업자 미상');

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const returnedAt = `${getTodayString()} ${timeStr}`;

  tool.status = 'AVAILABLE';
  tool.rentedBy = '';
  tool.rentedAt = '';

  const alertId = 'talert-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5);
  const returnAlert = {
    id: alertId,
    toolId: tool.id,
    toolName: tool.name,
    toolLocation: tool.location || '',
    returnedBy,
    prevRentedBy,
    returnedAt,
    readByAdmin: false,
    timestamp: Date.now()
  };

  knownToolReturnAlertIds.add(alertId);
  state.toolReturnAlerts.unshift(returnAlert);

  renderTools();
  renderAdminToolAlerts();

  try {
    await updateDoc(getDocRef('tools', id), { status: 'AVAILABLE', rentedBy: '', rentedAt: '' });
  } catch (err) {
    console.error(err);
  }
  try {
    await setDoc(getDocRef('tool_return_alerts', alertId), returnAlert);
  } catch (err) {
    console.error(err);
  }

  if (state.isAdmin) {
    playChatNotificationSound();
  }
  showToast(`'${tool.name}' 반납 완료! 관리자에게 반납 알림이 전송되었습니다.`, 'success');
}

async function markToolAlertRead(id: string) {
  const alertItem = state.toolReturnAlerts.find(a => a.id === id);
  if (!alertItem) return;
  alertItem.readByAdmin = true;
  renderAdminToolAlerts();
  try {
    await updateDoc(getDocRef('tool_return_alerts', id), { readByAdmin: true });
  } catch (err) {
    console.error(err);
  }
}

async function markAllToolAlertsRead() {
  const unread = state.toolReturnAlerts.filter(a => !a.readByAdmin);
  if (unread.length === 0) {
    showToast('확인할 새 반납 알림이 없습니다.', 'info');
    return;
  }
  unread.forEach(a => { a.readByAdmin = true; });
  renderAdminToolAlerts();
  for (const a of unread) {
    try {
      await updateDoc(getDocRef('tool_return_alerts', a.id), { readByAdmin: true });
    } catch (err) {
      console.error(err);
    }
  }
  showToast('모든 공구 반납 알림을 확인 처리했습니다.', 'success');
}

async function deleteToolReturnAlert(id: string) {
  state.toolReturnAlerts = state.toolReturnAlerts.filter(a => a.id !== id);
  renderAdminToolAlerts();
  try {
    await deleteDoc(getDocRef('tool_return_alerts', id));
  } catch (err) {
    console.error(err);
  }
}

function renderAdminToolAlerts() {
  const navDot = document.getElementById('adminReturnAlertDot');
  const lockedNotice = document.getElementById('adminLockedToolAlertNotice');
  const lockedText = document.getElementById('adminLockedToolAlertText');
  const countBadge = document.getElementById('adminToolAlertCountBadge');
  const container = document.getElementById('adminToolAlertListContainer');

  const unreadCount = state.toolReturnAlerts.filter(a => !a.readByAdmin).length;

  if (unreadCount > 0) {
    navDot?.classList.remove('hidden');
    lockedNotice?.classList.remove('hidden');
    if (lockedText) lockedText.textContent = `미확인 공구 반납 알림 ${unreadCount}건이 도착했습니다.`;
  } else {
    navDot?.classList.add('hidden');
    lockedNotice?.classList.add('hidden');
  }

  if (countBadge) {
    countBadge.textContent = `미확인 ${unreadCount}건`;
    countBadge.className = unreadCount > 0
      ? 'px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold animate-pulse'
      : 'px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold';
  }

  if (!container) return;
  if (state.toolReturnAlerts.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 text-center py-3">도착한 공구 반납 알림이 없습니다.</p>`;
    return;
  }

  container.innerHTML = state.toolReturnAlerts.map(a => {
    const isUnread = !a.readByAdmin;
    return `
      <div class="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs border ${isUnread ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}">
        <div class="min-w-0 space-y-0.5">
          <div class="flex items-center gap-1.5 flex-wrap">
            ${isUnread ? `<span class="px-1.5 py-0.5 bg-red-600 text-white rounded text-[9px] font-extrabold">NEW</span>` : `<span class="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[9px] font-bold">확인됨</span>`}
            <strong class="text-slate-900 truncate">${escapeHtml(a.toolName)}</strong>
          </div>
          <div class="text-[11px] text-slate-600">
            반납자: <strong>${escapeHtml(a.returnedBy || '-')}</strong> · ${escapeHtml(a.returnedAt || '')}
          </div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          ${isUnread ? `<button type="button" onclick="markToolAlertRead('${a.id}')" class="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold">확인</button>` : ''}
          <button type="button" onclick="deleteToolReturnAlert('${a.id}')" class="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[10px] font-bold">삭제</button>
        </div>
      </div>
    `;
  }).join('');
}

async function toggleToolRepair(id: string) {
  const tool = state.tools.find(t => t.id === id);
  if (!tool) return;
  tool.status = tool.status === 'REPAIR' ? 'AVAILABLE' : 'REPAIR';
  renderTools();
  try { await updateDoc(getDocRef('tools', id), { status: tool.status }); } catch (err) { console.error(err); }
}

async function deleteTool(id: string) {
  state.tools = state.tools.filter(t => t.id !== id);
  renderTools();
  try { await deleteDoc(getDocRef('tools', id)); } catch (err) { console.error(err); }
  showToast('공구가 삭제되었습니다.', 'info');
}

function renderTools() {
  const container = document.getElementById('toolsContainer');
  const totalEl = document.getElementById('toolTotalCount');
  const availEl = document.getElementById('toolAvailableCount');
  const rentedEl = document.getElementById('toolRentedCount');
  const lowEl = document.getElementById('toolLowStockCount');
  const lowFilterBtn = document.getElementById('tool-filter-LOW_STOCK');
  const dot = document.getElementById('rentedToolsDot');

  const rentedCount = state.tools.filter(t => t.status === 'RENTED').length;
  const availCount = state.tools.filter(t => t.status === 'AVAILABLE').length;
  const lowStockCount = state.tools.filter(t => isToolLowStock(t)).length;

  if (totalEl) totalEl.textContent = `${state.tools.length}종`;
  if (availEl) availEl.textContent = `${availCount}종`;
  if (rentedEl) rentedEl.textContent = `${rentedCount}종`;
  if (lowEl) lowEl.textContent = `${lowStockCount}종`;
  if (lowFilterBtn) {
    lowFilterBtn.textContent = lowStockCount > 0 ? `⚠️ 재고부족 (${lowStockCount})` : '⚠️ 재고부족';
  }
  if (rentedCount > 0 || lowStockCount > 0) dot?.classList.remove('hidden');
  else dot?.classList.add('hidden');

  if (container) {
    const kw = ((document.getElementById('toolSearchInput') as HTMLInputElement | null)?.value || '').trim().toLowerCase();
    const filtered = state.tools.filter(t => {
      if (state.toolFilter === 'LOW_STOCK') {
        if (!isToolLowStock(t)) return false;
      } else if (state.toolFilter !== 'ALL' && t.status !== state.toolFilter) {
        return false;
      }
      const cat = getToolCategory(t);
      if (kw && !`${t.name} ${cat} ${t.location} ${t.rentedBy || ''} ${t.note || ''}`.toLowerCase().includes(kw)) return false;
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = `<div class="col-span-full bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-xs">조건에 맞는 공구가 없습니다.</div>`;
    } else {
      container.innerHTML = filtered.map(t => {
        const isRented = t.status === 'RENTED';
        const isRepair = t.status === 'REPAIR';
        const isLow = isToolLowStock(t);
        const cat = getToolCategory(t);
        const badge = isRented
          ? `<span class="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[10px] font-extrabold">현장 대여중</span>`
          : isRepair
            ? `<span class="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md text-[10px] font-extrabold">수리/점검중</span>`
            : `<span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-extrabold">비치 중</span>`;

        const catBadge = cat === '광전식감지기'
          ? `<span class="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md text-[10px] font-extrabold">🔥 광전식감지기</span>`
          : cat === '정온식감지기'
            ? `<span class="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-md text-[10px] font-extrabold">🌡️ 정온식감지기</span>`
            : '';

        const lowStockBadge = isLow
          ? `<span class="px-2 py-0.5 bg-red-600 text-white rounded-md text-[10px] font-extrabold animate-pulse">⚠️ 재고 부족</span>`
          : '';

        const cardBorder = isLow
          ? 'border-red-300 bg-red-50/20'
          : isRented
            ? 'border-amber-300'
            : 'border-slate-200';

        return `
          <div class="bg-white border ${cardBorder} rounded-2xl p-3.5 shadow-sm space-y-2.5 flex flex-col justify-between">
            <div class="space-y-1.5">
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-1.5 flex-wrap">
                  ${badge}
                  ${catBadge}
                  ${lowStockBadge}
                  <span class="text-xs font-extrabold text-slate-900">${escapeHtml(t.name)}</span>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <button type="button" onclick="adjustToolQty('${t.id}', -1)" title="수량 1 감소" class="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[11px] flex items-center justify-center">-</button>
                  <span class="text-[11px] font-extrabold px-1 ${isLow ? 'text-red-700' : 'text-slate-700'}">${escapeHtml(t.qty || '1개')}</span>
                  <button type="button" onclick="adjustToolQty('${t.id}', 1)" title="수량 1 증가" class="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[11px] flex items-center justify-center">+</button>
                </div>
              </div>
              <div class="text-xs text-slate-600"><i class="fa-solid fa-box-archive text-brand-600 mr-1"></i>보관위치: <strong>${escapeHtml(t.location)}</strong></div>
              ${t.note ? `<div class="text-[11px] text-slate-500">${escapeHtml(t.note)}</div>` : ''}
              ${isRented ? `<div class="bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-amber-900">대여자: ${escapeHtml(t.rentedBy)} (${escapeHtml(t.rentedAt)})</div>` : ''}
            </div>

            <div class="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-100">
              ${isRented
                ? `<button type="button" onclick="returnTool('${t.id}')" class="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs">반납 완료</button>`
                : `<button type="button" onclick="rentTool('${t.id}')" ${isRepair ? 'disabled' : ''} class="flex-1 py-2 ${isRepair ? 'bg-slate-200 text-slate-400' : 'bg-brand-600 hover:bg-brand-500 text-white'} font-bold rounded-xl text-xs">현장 대여하기</button>`
              }
              <button type="button" onclick="toggleToolRepair('${t.id}')" class="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-semibold">${isRepair ? '수리완료' : '수리표시'}</button>
              <button type="button" onclick="deleteTool('${t.id}')" class="px-2.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[11px] font-semibold">삭제</button>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  renderFireDetectors();
}

// FIRE DETECTOR FOLDER (화재감지기 광전식/정온식 재고 파악 및 교체 자동 차감)
function getDetectorMatchingTools(type: '광전식감지기' | '정온식감지기') {
  return state.tools.filter(t => getToolCategory(t) === type);
}

function getDetectorTotalQty(type: '광전식감지기' | '정온식감지기'): number {
  return getDetectorMatchingTools(type).reduce((sum, t) => sum + parseToolQtyNumber(t.qty), 0);
}

async function addDetectorStockFromFolder(type: '광전식감지기' | '정온식감지기') {
  const inputId = type === '광전식감지기' ? 'fdPhotoQuickQtyInput' : 'fdHeatQuickQtyInput';
  const input = document.getElementById(inputId) as HTMLInputElement | null;
  const addQty = Math.max(1, parseInt(input?.value || '0', 10) || 0);
  if (addQty <= 0) {
    showToast('추가할 입고 수량을 1개 이상 입력해 주세요.', 'error');
    return;
  }

  const matches = getDetectorMatchingTools(type);
  if (matches.length > 0) {
    const target = matches[0];
    const nextNum = parseToolQtyNumber(target.qty) + addQty;
    target.qty = formatToolQtyWithUnit(target.qty || '개', nextNum);
    renderTools();
    try {
      await updateDoc(getDocRef('tools', target.id), { qty: target.qty });
    } catch (err) {
      console.error(err);
    }
    showToast(`${type} ${addQty}개 입고되어 총 ${getDetectorTotalQty(type)}개가 되었습니다.`, 'success');
  } else {
    const id = 'tool-' + Date.now();
    const newTool = {
      id,
      category: type,
      name: type === '광전식감지기' ? '광전식 감지기' : '정온식 감지기',
      location: '방재실 소방자재함',
      qty: `${addQty}개`,
      note: '화재감지기 폴더에서 등록됨',
      status: 'AVAILABLE',
      rentedBy: '',
      rentedAt: '',
      rentLocation: ''
    };
    state.tools.unshift(newTool);
    renderTools();
    try {
      await setDoc(getDocRef('tools', id), newTool);
    } catch (err) {
      console.error(err);
    }
    showToast(`${type} ${addQty}개가 공구 대장에 신규 등록되었습니다.`, 'success');
  }
}

function setFdLocationQuick(loc: string) {
  const el = document.getElementById('fdReplaceLocation') as HTMLInputElement | null;
  if (el) {
    el.value = loc;
    el.focus();
  }
}

function setFdHistoryFilter(f: string) {
  state.fdFilter = f;
  ['ALL', '광전식감지기', '정온식감지기'].forEach(key => {
    const btn = document.getElementById(`fd-filter-${key}`);
    if (!btn) return;
    btn.className = key === f
      ? 'px-2.5 py-1.5 rounded-lg bg-navy-800 text-white font-bold transition whitespace-nowrap'
      : 'px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-semibold transition whitespace-nowrap';
  });
  renderFireDetectors();
}

async function submitDetectorReplacement(e: Event) {
  e.preventDefault();
  const date = (document.getElementById('fdReplaceDate') as HTMLInputElement).value || getTodayString();
  const type = ((document.getElementById('fdReplaceType') as HTMLSelectElement).value || '광전식감지기') as '광전식감지기' | '정온식감지기';
  const location = (document.getElementById('fdReplaceLocation') as HTMLInputElement).value.trim();
  const replaceQty = Math.max(1, parseInt((document.getElementById('fdReplaceQty') as HTMLInputElement).value || '1', 10) || 1);
  const note = (document.getElementById('fdReplaceNote') as HTMLInputElement).value.trim();

  if (!location) {
    showToast('교체 위치(동·층 등)를 입력해 주세요.', 'error');
    return;
  }

  const matches = getDetectorMatchingTools(type);
  const totalStock = getDetectorTotalQty(type);

  if (matches.length === 0) {
    showToast(`공구 대장에 '${type}'가 등록되어 있지 않습니다. 위 입고 버튼이나 공구 등록에서 먼저 등록해 주세요.`, 'error');
    return;
  }

  if (totalStock < replaceQty) {
    showToast(`현재 보유한 ${type} 수량(${totalStock}개)보다 교체 수량(${replaceQty}개)이 많습니다.`, 'error');
    return;
  }

  let remainingToDeduct = replaceQty;
  const updatedTools: any[] = [];
  for (const t of matches) {
    if (remainingToDeduct <= 0) break;
    const cur = parseToolQtyNumber(t.qty);
    if (cur <= 0) continue;
    const deduct = Math.min(cur, remainingToDeduct);
    t.qty = formatToolQtyWithUnit(t.qty, cur - deduct);
    remainingToDeduct -= deduct;
    updatedTools.push(t);
  }

  const afterTotal = totalStock - replaceQty;
  const worker = getSelectedWorker();
  const workerName = worker ? `${worker.name} (${worker.role})` : (state.isAdmin ? '관리자' : '작업자 미선택');

  const logId = 'fdlog-' + Date.now();
  const newRecord = {
    id: logId,
    date,
    type,
    location,
    qty: replaceQty,
    prevTotal: totalStock,
    afterTotal,
    note,
    workerName,
    timestamp: Date.now()
  };

  state.detectorLogs.unshift(newRecord);
  (document.getElementById('fdReplaceLocation') as HTMLInputElement).value = '';
  (document.getElementById('fdReplaceQty') as HTMLInputElement).value = '1';
  (document.getElementById('fdReplaceNote') as HTMLInputElement).value = '';

  renderTools();

  for (const ut of updatedTools) {
    try {
      await updateDoc(getDocRef('tools', ut.id), { qty: ut.qty });
    } catch (err) {
      console.error(err);
    }
  }
  try {
    await setDoc(getDocRef('detector_logs', logId), newRecord);
  } catch (err) {
    console.error(err);
  }

  if (afterTotal <= 1) {
    showToast(`${location} ${type} ${replaceQty}개 교체 완료! ⚠️ 남은 재고 ${afterTotal}개 (재고 부족)`, 'error');
  } else {
    showToast(`${location} ${type} ${replaceQty}개 교체 반영! (${totalStock}개 → ${afterTotal}개)`, 'success');
  }
}

async function deleteDetectorLog(id: string) {
  const target = state.detectorLogs.find(l => l.id === id);
  if (!target) return;

  state.detectorLogs = state.detectorLogs.filter(l => l.id !== id);
  const restoreQty = Number(target.qty) || 0;
  const type = (target.type === '정온식감지기' ? '정온식감지기' : '광전식감지기') as '광전식감지기' | '정온식감지기';

  let updatedTool: any = null;
  if (restoreQty > 0) {
    const matches = getDetectorMatchingTools(type);
    if (matches.length > 0) {
      const tool = matches[0];
      tool.qty = formatToolQtyWithUnit(tool.qty || '개', parseToolQtyNumber(tool.qty) + restoreQty);
      updatedTool = tool;
    }
  }

  renderTools();

  if (updatedTool) {
    try {
      await updateDoc(getDocRef('tools', updatedTool.id), { qty: updatedTool.qty });
    } catch (err) {
      console.error(err);
    }
  }
  try {
    await deleteDoc(getDocRef('detector_logs', id));
  } catch (err) {
    console.error(err);
  }
  showToast(
    updatedTool
      ? `교체 이력이 삭제되고 ${type} 수량 ${restoreQty}개가 복원되었습니다.`
      : '교체 이력이 삭제되었습니다.',
    'info'
  );
}

function formatLocalYmd(dt: Date): string {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function updateFdPeriodPresetButtons(activePreset: string) {
  ['ALL', 'TODAY', '7D', 'MONTH', 'LAST_MONTH'].forEach(key => {
    const btn = document.getElementById(`fd-period-${key}`);
    if (!btn) return;
    btn.className = key === activePreset
      ? 'px-2 py-1 rounded-md bg-navy-800 text-white font-bold whitespace-nowrap'
      : 'px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-600 font-semibold whitespace-nowrap';
  });
}

function setFdPeriodPreset(preset: string) {
  state.fdPeriodPreset = preset;
  const startEl = document.getElementById('fdStartDate') as HTMLInputElement | null;
  const endEl = document.getElementById('fdEndDate') as HTMLInputElement | null;
  const now = new Date();
  const todayStr = formatLocalYmd(now);

  let startVal = '';
  let endVal = '';
  if (preset === 'TODAY') {
    startVal = todayStr;
    endVal = todayStr;
  } else if (preset === '7D') {
    const d7 = new Date(now);
    d7.setDate(d7.getDate() - 6);
    startVal = formatLocalYmd(d7);
    endVal = todayStr;
  } else if (preset === 'MONTH') {
    startVal = formatLocalYmd(new Date(now.getFullYear(), now.getMonth(), 1));
    endVal = formatLocalYmd(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  } else if (preset === 'LAST_MONTH') {
    startVal = formatLocalYmd(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    endVal = formatLocalYmd(new Date(now.getFullYear(), now.getMonth(), 0));
  }

  if (startEl) startEl.value = startVal;
  if (endEl) endEl.value = endVal;
  updateFdPeriodPresetButtons(preset);
  renderFireDetectors();
}

function onFdCustomDateChange() {
  const startVal = (document.getElementById('fdStartDate') as HTMLInputElement | null)?.value || '';
  const endVal = (document.getElementById('fdEndDate') as HTMLInputElement | null)?.value || '';
  state.fdPeriodPreset = (startVal || endVal) ? 'CUSTOM' : 'ALL';
  updateFdPeriodPresetButtons(state.fdPeriodPreset);
  renderFireDetectors();
}

function resetFdFilters() {
  state.fdFilter = 'ALL';
  state.fdPeriodPreset = 'ALL';
  ['ALL', '광전식감지기', '정온식감지기'].forEach(key => {
    const btn = document.getElementById(`fd-filter-${key}`);
    if (!btn) return;
    btn.className = key === 'ALL'
      ? 'px-2.5 py-1.5 rounded-lg bg-navy-800 text-white font-bold transition whitespace-nowrap'
      : 'px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-semibold transition whitespace-nowrap';
  });
  updateFdPeriodPresetButtons('ALL');
  const startEl = document.getElementById('fdStartDate') as HTMLInputElement | null;
  const endEl = document.getElementById('fdEndDate') as HTMLInputElement | null;
  const dongEl = document.getElementById('fdDongFilter') as HTMLSelectElement | null;
  const unitEl = document.getElementById('fdUnitFilterInput') as HTMLInputElement | null;
  const searchEl = document.getElementById('fdSearchInput') as HTMLInputElement | null;
  if (startEl) startEl.value = '';
  if (endEl) endEl.value = '';
  if (dongEl) dongEl.value = 'ALL';
  if (unitEl) unitEl.value = '';
  if (searchEl) searchEl.value = '';
  renderFireDetectors();
  showToast('화재감지기 검색 필터가 초기화되었습니다.', 'info');
}

function populateFdDongFilter() {
  const sel = document.getElementById('fdDongFilter') as HTMLSelectElement | null;
  if (!sel) return;
  const currentVal = sel.value || 'ALL';
  const dongSet = new Set<string>([
    '701동', '702동', '703동', '704동', '705동', '706동',
    '지하주차장', '기계실/전기실'
  ]);
  state.detectorLogs.forEach(l => {
    const matches = String(l.location || '').match(/\d+동/g);
    if (matches) matches.forEach(m => dongSet.add(m));
  });

  const sortedOptions = Array.from(dongSet).sort((a, b) => {
    const aIsDong = /^\d+동$/.test(a);
    const bIsDong = /^\d+동$/.test(b);
    if (aIsDong && bIsDong) return parseInt(a, 10) - parseInt(b, 10);
    if (aIsDong) return -1;
    if (bIsDong) return 1;
    return a.localeCompare(b, 'ko');
  });

  sel.innerHTML = `<option value="ALL">전체 동·구역</option>` +
    sortedOptions.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
  sel.value = sortedOptions.includes(currentVal) ? currentVal : 'ALL';
}

function renderFireDetectors() {
  const photoMatches = getDetectorMatchingTools('광전식감지기');
  const heatMatches = getDetectorMatchingTools('정온식감지기');
  const photoTotal = getDetectorTotalQty('광전식감지기');
  const heatTotal = getDetectorTotalQty('정온식감지기');

  const photoLow = photoMatches.length > 0 && photoTotal <= 1;
  const heatLow = heatMatches.length > 0 && heatTotal <= 1;

  const folderLowDot = document.getElementById('fireDetectorLowDot');
  if (photoLow || heatLow) folderLowDot?.classList.remove('hidden');
  else folderLowDot?.classList.add('hidden');

  const photoQtyEl = document.getElementById('fdPhotoQtyDisplay');
  const photoLowBadge = document.getElementById('fdPhotoLowBadge');
  const photoHintEl = document.getElementById('fdPhotoSourceHint');
  if (photoQtyEl) photoQtyEl.textContent = `${photoTotal}개`;
  if (photoLowBadge) {
    if (photoLow) photoLowBadge.classList.remove('hidden');
    else photoLowBadge.classList.add('hidden');
  }
  if (photoHintEl) {
    photoHintEl.textContent = photoMatches.length > 0
      ? `공구대장 연동: ${photoMatches.map(m => `${m.name}(${m.location} · ${m.qty})`).join(', ')}`
      : '공구대장 연동: 등록된 광전식 감지기 없음 (아래 입고 또는 공구 등록 필요)';
  }

  const heatQtyEl = document.getElementById('fdHeatQtyDisplay');
  const heatLowBadge = document.getElementById('fdHeatLowBadge');
  const heatHintEl = document.getElementById('fdHeatSourceHint');
  if (heatQtyEl) heatQtyEl.textContent = `${heatTotal}개`;
  if (heatLowBadge) {
    if (heatLow) heatLowBadge.classList.remove('hidden');
    else heatLowBadge.classList.add('hidden');
  }
  if (heatHintEl) {
    heatHintEl.textContent = heatMatches.length > 0
      ? `공구대장 연동: ${heatMatches.map(m => `${m.name}(${m.location} · ${m.qty})`).join(', ')}`
      : '공구대장 연동: 등록된 정온식 감지기 없음 (아래 입고 또는 공구 등록 필요)';
  }

  populateFdDongFilter();

  const startDate = (document.getElementById('fdStartDate') as HTMLInputElement | null)?.value || '';
  const endDate = (document.getElementById('fdEndDate') as HTMLInputElement | null)?.value || '';
  const dongFilter = (document.getElementById('fdDongFilter') as HTMLSelectElement | null)?.value || 'ALL';
  const unitKw = ((document.getElementById('fdUnitFilterInput') as HTMLInputElement | null)?.value || '').trim().toLowerCase();
  const kw = ((document.getElementById('fdSearchInput') as HTMLInputElement | null)?.value || '').trim().toLowerCase();

  // 1. 기간 범위 필터 적용 (상단 기간 요약 계산용)
  const periodLogs = state.detectorLogs.filter(l => {
    const d = String(l.date || '');
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  });

  const periodPhotoLogs = periodLogs.filter(l => l.type === '광전식감지기');
  const periodHeatLogs = periodLogs.filter(l => l.type === '정온식감지기');
  const sumQty = (arr: any[]) => arr.reduce((acc, cur) => acc + (Number(cur.qty) || 0), 0);

  const periodTotalEvents = periodLogs.length;
  const periodTotalUnits = sumQty(periodLogs);
  const periodPhotoUnits = sumQty(periodPhotoLogs);
  const periodHeatUnits = sumQty(periodHeatLogs);

  let periodLabelText = '전체 기간 교체 현황';
  if (state.fdPeriodPreset === 'TODAY') periodLabelText = `오늘 (${startDate}) 교체 현황`;
  else if (state.fdPeriodPreset === '7D') periodLabelText = `최근 7일 (${startDate} ~ ${endDate})`;
  else if (state.fdPeriodPreset === 'MONTH') periodLabelText = `이번 달 (${startDate.slice(0, 7)}) 교체 현황`;
  else if (state.fdPeriodPreset === 'LAST_MONTH') periodLabelText = `지난 달 (${startDate.slice(0, 7)}) 교체 현황`;
  else if (startDate || endDate) periodLabelText = `${startDate || '처음'} ~ ${endDate || '현재'} 교체 현황`;

  // 2. 세분화 필터 적용 (종류 + 동/구역 + 호수/층 + 키워드)
  const filtered = periodLogs.filter(l => {
    if (state.fdFilter !== 'ALL' && l.type !== state.fdFilter) return false;
    const locLower = String(l.location || '').toLowerCase();
    if (dongFilter !== 'ALL') {
      if (dongFilter === '기계실/전기실') {
        if (!locLower.includes('기계실') && !locLower.includes('전기실')) return false;
      } else if (!locLower.includes(dongFilter.toLowerCase())) {
        return false;
      }
    }
    if (unitKw) {
      const normalizedLoc = locLower.replace(/\s+/g, '');
      const normalizedUnit = unitKw.replace(/\s+/g, '');
      if (!normalizedLoc.includes(normalizedUnit)) return false;
    }
    if (kw && !`${l.location} ${l.type} ${l.workerName || ''} ${l.note || ''} ${l.date || ''}`.toLowerCase().includes(kw)) return false;
    return true;
  });

  const filteredUnits = sumQty(filtered);

  const periodLabelEl = document.getElementById('fdSummaryPeriodLabel');
  const summaryEventEl = document.getElementById('fdSummaryEventCount');
  const summaryUnitEl = document.getElementById('fdSummaryUnitCount');
  const summaryFilteredEl = document.getElementById('fdSummaryFilteredCount');
  const summaryBreakdownEl = document.getElementById('fdSummaryBreakdown');

  if (periodLabelEl) periodLabelEl.textContent = periodLabelText;
  if (summaryEventEl) summaryEventEl.textContent = `${periodTotalEvents}건`;
  if (summaryUnitEl) summaryUnitEl.textContent = `${periodTotalUnits}개`;
  if (summaryFilteredEl) summaryFilteredEl.textContent = `${filtered.length}건 (${filteredUnits}개)`;
  if (summaryBreakdownEl) {
    summaryBreakdownEl.innerHTML = `
      <span>🔥 광전식: <strong>${periodPhotoLogs.length}건</strong> (${periodPhotoUnits}개) · 🌡️ 정온식: <strong>${periodHeatLogs.length}건</strong> (${periodHeatUnits}개)</span>
      ${(dongFilter !== 'ALL' || unitKw || state.fdFilter !== 'ALL') ? `<span class="text-brand-700 font-bold">세부 필터 적용중</span>` : ''}
    `;
  }

  const countBadge = document.getElementById('fdHistoryCountBadge');
  const container = document.getElementById('fdHistoryContainer');
  if (!container) return;

  if (countBadge) countBadge.textContent = `검색 ${filtered.length}건 (${filteredUnits}개)`;

  if (filtered.length === 0) {
    container.innerHTML = `<div class="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-xs">선택한 기간 및 조건에 해당하는 화재감지기 교체 이력이 없습니다.</div>`;
    return;
  }

  container.innerHTML = filtered.map(l => {
    const isPhoto = l.type === '광전식감지기';
    return `
      <div class="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm space-y-2">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="px-2 py-0.5 rounded-md text-[10px] font-extrabold ${isPhoto ? 'bg-rose-100 text-rose-800' : 'bg-orange-100 text-orange-800'}">
              ${isPhoto ? '🔥 광전식감지기' : '🌡️ 정온식감지기'}
            </span>
            <span class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold">${escapeHtml(l.date)}</span>
            <span class="text-xs font-extrabold text-slate-900">${escapeHtml(l.location)}</span>
          </div>
          <span class="px-2 py-0.5 bg-navy-800 text-white rounded-md text-[10px] font-extrabold shrink-0">-${escapeHtml(l.qty)}개 교체</span>
        </div>
        <div class="flex items-center justify-between text-[11px] text-slate-600 flex-wrap gap-2">
          <span>
            재고 변동: <strong>${escapeHtml(l.prevTotal)}개</strong> → <strong class="${Number(l.afterTotal) <= 1 ? 'text-red-600' : 'text-emerald-700'}">${escapeHtml(l.afterTotal)}개</strong>
            ${l.note ? ` · 사유: ${escapeHtml(l.note)}` : ''}
          </span>
          <div class="flex items-center gap-2">
            <span class="text-slate-400">작업자: ${escapeHtml(l.workerName || '-')}</span>
            <button type="button" onclick="deleteDetectorLog('${l.id}')" class="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-bold text-[10px]">삭제(복원)</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function downloadToolsCSV() {
  const rows = [['구분', '공구명', '보관위치', '보유수량', '재고상태', '현재상태', '대여자', '대여시각', '비고']];
  state.tools.forEach(t => {
    const st = t.status === 'RENTED' ? '대여중' : t.status === 'REPAIR' ? '수리중' : '비치중';
    const low = isToolLowStock(t) ? '재고부족' : '정상';
    rows.push([getToolCategory(t), t.name, t.location, t.qty || '', low, st, t.rentedBy || '', t.rentedAt || '', t.note || '']);
  });
  triggerCSVDownload(rows, `호려울마을7단지_공구대장_${getTodayString()}.csv`);
}

async function handleToolSmartFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const loading = document.getElementById('toolImportLoading');
  loading?.classList.remove('hidden');
  try {
    const text = await extractTextFromAnyFile(file);
    extractToolItemsFromText(text);
  } catch (err) {
    console.error(err);
    showToast('파일 분석 중 오류가 발생했습니다.', 'error');
  } finally {
    loading?.classList.add('hidden');
    input.value = '';
  }
}

function parseToolRawText() {
  const raw = (document.getElementById('toolPasteTextarea') as HTMLTextAreaElement).value;
  if (!raw.trim()) return;
  extractToolItemsFromText(raw);
}

function extractToolItemsFromText(text: string) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length >= 2);
  pendingImportedTools = lines.slice(0, 40).map((line) => {
    const parts = line.split(/[,/\t|]+/).map(p => p.trim()).filter(Boolean);
    return {
      checked: true,
      name: parts[0] || line,
      location: parts[1] || '기전실 공구함',
      qty: parts[2] || '1개'
    };
  });
  renderToolImportPreview();
}

function renderToolImportPreview() {
  const box = document.getElementById('toolImportPreviewBox');
  const list = document.getElementById('toolImportPreviewList');
  const label = document.getElementById('toolImportCountLabel');
  if (!box || !list || !label) return;
  box.classList.remove('hidden');
  label.textContent = `${pendingImportedTools.length}개 공구 자동 추출됨`;
  list.innerHTML = pendingImportedTools.map((item, i) => `
    <div class="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs">
      <input type="checkbox" ${item.checked ? 'checked' : ''} onchange="pendingImportedTools[${i}].checked = this.checked">
      <input type="text" value="${escapeHtml(item.name)}" onchange="pendingImportedTools[${i}].name = this.value" class="flex-1 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold">
      <input type="text" value="${escapeHtml(item.location)}" onchange="pendingImportedTools[${i}].location = this.value" class="w-24 px-2 py-1 bg-white border border-slate-300 rounded text-xs">
      <input type="text" value="${escapeHtml(item.qty)}" onchange="pendingImportedTools[${i}].qty = this.value" class="w-16 px-2 py-1 bg-white border border-slate-300 rounded text-xs">
    </div>
  `).join('');
}

function clearToolImportPreview() {
  pendingImportedTools = [];
  document.getElementById('toolImportPreviewBox')?.classList.add('hidden');
}

async function confirmBatchToolImport() {
  const selected = pendingImportedTools.filter(i => i.checked && i.name.trim());
  if (selected.length === 0) return;
  for (const item of selected) {
    const id = 'tool-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const name = item.name.trim();
    const category = getToolCategory({ name });
    const obj = { id, category, name, location: item.location.trim() || '기전실 공구함', qty: item.qty.trim() || '1개', note: '일괄등록', status: 'AVAILABLE', rentedBy: '', rentedAt: '' };
    state.tools.unshift(obj);
    try { await setDoc(getDocRef('tools', id), obj); } catch (err) { console.error(err); }
  }
  clearToolImportPreview();
  document.getElementById('toolAddForm')?.classList.add('hidden');
  renderTools();
  showToast(`${selected.length}개 공구가 일괄 등록되었습니다!`, 'success');
}

// REPAIR VENDORS (수리·협력업체 연락처 + 공용/세대 분리 + 스마트 인식)
function toggleVendorAddForm() {
  document.getElementById('vendorAddForm')?.classList.toggle('hidden');
}

function toggleVendorPasteBox() {
  document.getElementById('vendorPasteBox')?.classList.toggle('hidden');
}

function setVendorScope(scope: string) {
  state.vendorScope = scope;
  ['ALL', '공용', '세대'].forEach(s => {
    const btn = document.getElementById(`vscope-${s}`);
    if (!btn) return;
    btn.className = s === scope
      ? 'py-2 px-1 rounded-lg bg-brand-600 text-white font-extrabold shadow-xs transition'
      : 'py-2 px-1 rounded-lg text-slate-600 hover:text-slate-900 font-bold transition';
  });
  renderVendors();
}

function setVendorCategory(cat: string) {
  state.vendorCategory = cat;
  ['ALL', '승강기', '설비·배관', '전기·소방', '인터폰·통신', '세대수리·기타'].forEach(c => {
    const btn = document.getElementById(`vcat-${c}`);
    if (!btn) return;
    btn.className = c === cat
      ? 'shrink-0 px-2.5 py-1.5 rounded-lg bg-navy-800 text-white font-bold transition'
      : 'shrink-0 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-semibold transition';
  });
  renderVendors();
}

async function handleAddVendor(e: Event) {
  e.preventDefault();
  const scope = (document.getElementById('newVendorScope') as HTMLSelectElement).value;
  const category = (document.getElementById('newVendorCategory') as HTMLSelectElement).value;
  const name = (document.getElementById('newVendorName') as HTMLInputElement).value.trim();
  const phone = (document.getElementById('newVendorPhone') as HTMLInputElement).value.trim();
  const manager = (document.getElementById('newVendorManager') as HTMLInputElement).value.trim();
  const note = (document.getElementById('newVendorNote') as HTMLInputElement).value.trim();
  if (!name || !phone) return;

  const id = 'ven-' + Date.now();
  const newVen = { id, scope, category, name, phone, manager, note, favorite: false };
  state.vendors.unshift(newVen);
  (document.getElementById('newVendorName') as HTMLInputElement).value = '';
  (document.getElementById('newVendorPhone') as HTMLInputElement).value = '';
  (document.getElementById('newVendorManager') as HTMLInputElement).value = '';
  (document.getElementById('newVendorNote') as HTMLInputElement).value = '';
  document.getElementById('vendorAddForm')?.classList.add('hidden');
  renderVendors();

  try { await setDoc(getDocRef('vendors', id), newVen); } catch (err) { console.error(err); }
  showToast('수리업체가 등록되었습니다.', 'success');
}

async function toggleVendorFavorite(id: string) {
  const v = state.vendors.find(item => item.id === id);
  if (!v) return;
  v.favorite = !v.favorite;
  renderVendors();
  try { await updateDoc(getDocRef('vendors', id), { favorite: v.favorite }); } catch (err) { console.error(err); }
}

async function deleteVendor(id: string) {
  state.vendors = state.vendors.filter(v => v.id !== id);
  renderVendors();
  try { await deleteDoc(getDocRef('vendors', id)); } catch (err) { console.error(err); }
  showToast('업체 연락처가 삭제되었습니다.', 'info');
}

function copyVendorPhone(name: string, phone: string) {
  const text = `[호려울마을 7단지 안내] ${name} : ${phone}`;
  navigator.clipboard?.writeText(text);
  showToast(`복사됨: ${name} (${phone})`, 'success');
}

function renderVendors() {
  const container = document.getElementById('vendorsContainer');
  const countBadge = document.getElementById('vendorTotalCountBadge');
  if (!container) return;

  const kw = ((document.getElementById('vendorSearchInput') as HTMLInputElement | null)?.value || '').trim().toLowerCase();
  const filtered = state.vendors.filter(v => {
    if (state.vendorScope !== 'ALL' && (v.scope || '공용') !== state.vendorScope) return false;
    if (state.vendorCategory !== 'ALL' && v.category !== state.vendorCategory) return false;
    if (kw && !`${v.name} ${v.phone} ${v.manager || ''} ${v.note || ''} ${v.category}`.toLowerCase().includes(kw)) return false;
    return true;
  });

  filtered.sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0));
  if (countBadge) countBadge.textContent = `전체 ${filtered.length}개 업체 표시 중`;

  if (filtered.length === 0) {
    container.innerHTML = `<div class="col-span-full bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-xs">등록된 수리업체가 없습니다. 우측 상단 '+ 업체 등록'을 눌러 추가해 주세요.</div>`;
    return;
  }

  container.innerHTML = filtered.map(v => {
    const isPublic = (v.scope || '공용') === '공용';
    return `
      <div class="bg-white border ${v.favorite ? 'border-amber-300' : 'border-slate-200'} rounded-2xl p-3.5 shadow-sm space-y-2.5 flex flex-col justify-between">
        <div class="space-y-1.5">
          <div class="flex items-start justify-between gap-2">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="px-2 py-0.5 rounded-md text-[10px] font-extrabold ${isPublic ? 'bg-teal-100 text-teal-800' : 'bg-indigo-100 text-indigo-800'}">
                ${isPublic ? '🏢 공용' : '🏠 세대'}
              </span>
              <span class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold">${escapeHtml(v.category)}</span>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button type="button" onclick="toggleVendorFavorite('${v.id}')" class="text-base ${v.favorite ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400'}">★</button>
              <button type="button" onclick="deleteVendor('${v.id}')" class="px-2 py-0.5 bg-red-50 text-red-600 rounded text-[10px] font-bold">삭제</button>
            </div>
          </div>
          <h4 class="text-sm font-extrabold text-slate-900 break-words">${escapeHtml(v.name)}</h4>
          <div class="text-xs font-bold text-brand-700">${escapeHtml(v.phone)} ${v.manager ? `<span class="text-slate-500 font-medium">(${escapeHtml(v.manager)})</span>` : ''}</div>
          ${v.note ? `<p class="text-xs text-slate-600 break-words leading-relaxed">${escapeHtml(v.note)}</p>` : ''}
        </div>

        <div class="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100">
          <a href="tel:${escapeHtml(v.phone)}" class="py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl text-xs text-center flex items-center justify-center gap-1">
            <i class="fa-solid fa-phone"></i> 바로전화
          </a>
          <button type="button" onclick="copyVendorPhone('${escapeHtml(v.name)}', '${escapeHtml(v.phone)}')" class="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1">
            <i class="fa-regular fa-copy"></i> 번호복사
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function handleVendorSmartFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const loading = document.getElementById('vendorImportLoading');
  loading?.classList.remove('hidden');
  try {
    const text = await extractTextFromAnyFile(file);
    extractVendorsFromText(text);
  } catch (err) {
    console.error(err);
    showToast('파일 분석 중 오류가 발생했습니다.', 'error');
  } finally {
    loading?.classList.add('hidden');
    input.value = '';
  }
}

function parseVendorRawText() {
  const raw = (document.getElementById('vendorPasteTextarea') as HTMLTextAreaElement).value;
  if (!raw.trim()) return;
  extractVendorsFromText(raw);
}

function guessVendorCategory(str: string) {
  if (/승강기|엘리베이터/.test(str)) return '승강기';
  if (/누수|배관|설비|보일러|변기|하수/.test(str)) return '설비·배관';
  if (/전기|소방|화재|감지기|조명/.test(str)) return '전기·소방';
  if (/인터폰|통신|도어락|CCTV|로비폰/.test(str)) return '인터폰·통신';
  return '세대수리·기타';
}

function extractVendorsFromText(text: string) {
  const phoneRegex = /(0\d{1,2}[-\s.]?\d{3,4}[-\s.]?\d{4}|1\d{3}[-\s.]?\d{4})/g;
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const extracted: any[] = [];

  lines.forEach(line => {
    const matches = line.match(phoneRegex);
    if (matches) {
      matches.forEach(phone => {
        const namePart = line.replace(phone, '').replace(/[,/\t|]+/g, ' ').trim();
        extracted.push({
          checked: true,
          scope: '공용',
          category: guessVendorCategory(line),
          name: namePart.slice(0, 30) || '미상 수리업체',
          phone: phone.replace(/\s+/g, '-')
        });
      });
    }
  });

  pendingImportedVendors = extracted;
  renderVendorImportPreview();
}

function renderVendorImportPreview() {
  const box = document.getElementById('vendorImportPreviewBox');
  const list = document.getElementById('vendorImportPreviewList');
  const label = document.getElementById('vendorImportCountLabel');
  if (!box || !list || !label) return;
  box.classList.remove('hidden');
  label.textContent = `${pendingImportedVendors.length}개 업체 추출됨`;

  if (pendingImportedVendors.length === 0) {
    list.innerHTML = `<p class="text-xs text-slate-400 py-2 text-center">전화번호 패턴을 찾지 못했습니다. 텍스트를 확인해 주세요.</p>`;
    return;
  }

  list.innerHTML = pendingImportedVendors.map((v, i) => `
    <div class="flex flex-wrap items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs">
      <input type="checkbox" ${v.checked ? 'checked' : ''} onchange="pendingImportedVendors[${i}].checked = this.checked">
      <select onchange="pendingImportedVendors[${i}].scope = this.value" class="px-1.5 py-1 bg-white border border-slate-300 rounded text-[11px] font-bold">
        <option value="공용" ${v.scope === '공용' ? 'selected' : ''}>공용</option>
        <option value="세대" ${v.scope === '세대' ? 'selected' : ''}>세대</option>
      </select>
      <input type="text" value="${escapeHtml(v.name)}" onchange="pendingImportedVendors[${i}].name = this.value" class="flex-1 min-w-[100px] px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold">
      <input type="text" value="${escapeHtml(v.phone)}" onchange="pendingImportedVendors[${i}].phone = this.value" class="w-28 px-2 py-1 bg-white border border-slate-300 rounded text-xs">
    </div>
  `).join('');
}

function clearVendorImportPreview() {
  pendingImportedVendors = [];
  document.getElementById('vendorImportPreviewBox')?.classList.add('hidden');
}

async function confirmBatchVendorImport() {
  const selected = pendingImportedVendors.filter(v => v.checked && v.name.trim() && v.phone.trim());
  if (selected.length === 0) return;
  for (const item of selected) {
    const id = 'ven-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const obj = { id, scope: item.scope || '공용', category: item.category || '세대수리·기타', name: item.name.trim(), phone: item.phone.trim(), manager: '', note: '일괄인식 등록', favorite: false };
    state.vendors.unshift(obj);
    try { await setDoc(getDocRef('vendors', id), obj); } catch (err) { console.error(err); }
  }
  clearVendorImportPreview();
  document.getElementById('vendorAddForm')?.classList.add('hidden');
  renderVendors();
  showToast(`${selected.length}개 수리업체가 일괄 등록되었습니다!`, 'success');
}

async function extractTextFromAnyFile(file: File): Promise<string> {
  const win = window as any;
  const name = file.name.toLowerCase();
  if (file.type.startsWith('image/')) {
    if (win.Tesseract) {
      const res = await win.Tesseract.recognize(file, 'kor+eng');
      return res.data.text || '';
    }
    return '';
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
    const buf = await file.arrayBuffer();
    const wb = win.XLSX.read(buf, { type: 'array' });
    let out = '';
    wb.SheetNames.forEach((sn: string) => {
      out += win.XLSX.utils.sheet_to_csv(wb.Sheets[sn]) + '\n';
    });
    return out;
  }
  if (name.endsWith('.docx') && win.mammoth) {
    const buf = await file.arrayBuffer();
    const res = await win.mammoth.extractRawText({ arrayBuffer: buf });
    return res.value || '';
  }
  if (name.endsWith('.pdf') && win.pdfjsLib) {
    win.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const buf = await file.arrayBuffer();
    const pdf = await win.pdfjsLib.getDocument({ data: buf }).promise;
    let out = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      out += tc.items.map((it: any) => it.str).join(' ') + '\n';
    }
    return out;
  }
  return await file.text();
}

// PURCHASE RECEIPT & ITEM VERIFICATION (물품구매확인란)
async function handlePurchasePhoto(e: Event, kind: string) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  showToast(kind === 'item' ? '물품 사진 EXIF 삭제 및 50% 리사이징 중...' : '영수증 사진 EXIF 삭제 및 50% 리사이징 중...', 'info');
  try {
    const opt = await optimizeImageFile(file, {
      scale: 0.5,
      maxDimension: 1100,
      maxTargetBytes: 340 * 1024,
      initialQuality: 0.7
    });
    const optLabel = `EXIF 삭제·50% (${formatBytes(opt.originalBytes)}→${formatBytes(opt.optimizedBytes)})`;
    if (kind === 'item') {
      currentPurchaseItemPhoto = opt.dataUrl;
      const prevImg = document.getElementById('purchaseItemPreviewImg') as HTMLImageElement | null;
      const prevBox = document.getElementById('purchaseItemPreviewBox');
      const optTag = document.getElementById('purchaseItemOptTag');
      if (prevImg) prevImg.src = opt.dataUrl;
      if (optTag) {
        optTag.textContent = optLabel;
        optTag.classList.remove('hidden');
      }
      prevBox?.classList.remove('hidden');
      showToast(`물품 사진 최적화 완료 (${formatBytes(opt.originalBytes)} → ${formatBytes(opt.optimizedBytes)})`, 'success');
    } else {
      currentPurchaseReceiptPhoto = opt.dataUrl;
      const prevImg = document.getElementById('purchaseReceiptPreviewImg') as HTMLImageElement | null;
      const prevBox = document.getElementById('purchaseReceiptPreviewBox');
      const optTag = document.getElementById('purchaseReceiptOptTag');
      if (prevImg) prevImg.src = opt.dataUrl;
      if (optTag) {
        optTag.textContent = optLabel;
        optTag.classList.remove('hidden');
      }
      prevBox?.classList.remove('hidden');
      showToast(`영수증 사진 최적화 완료 (${formatBytes(opt.originalBytes)} → ${formatBytes(opt.optimizedBytes)})`, 'success');
    }
  } catch (err) {
    console.error(err);
    input.value = '';
    showToast('지원하지 않는 이미지 형식이거나 최적화 중 오류가 발생했습니다.', 'error');
  }
}

function clearPurchasePhoto(kind: string) {
  if (kind === 'item') {
    currentPurchaseItemPhoto = '';
    const el = document.getElementById('purchaseItemPhotoInput') as HTMLInputElement | null;
    if (el) el.value = '';
    document.getElementById('purchaseItemOptTag')?.classList.add('hidden');
    document.getElementById('purchaseItemPreviewBox')?.classList.add('hidden');
  } else {
    currentPurchaseReceiptPhoto = '';
    const el = document.getElementById('purchaseReceiptPhotoInput') as HTMLInputElement | null;
    if (el) el.value = '';
    document.getElementById('purchaseReceiptOptTag')?.classList.add('hidden');
    document.getElementById('purchaseReceiptPreviewBox')?.classList.add('hidden');
  }
}

async function submitPurchaseRecord(e: Event) {
  e.preventDefault();
  const worker = getSelectedWorker();
  if (!worker) {
    showToast('상단에서 구매자(작업자) 본인의 이름을 먼저 선택해 주세요!', 'error');
    document.getElementById('workerSelect')?.focus();
    return;
  }
  const date = (document.getElementById('purchaseDate') as HTMLInputElement).value || getTodayString();
  const payMethod = (document.getElementById('purchasePayMethod') as HTMLSelectElement).value;
  const itemName = (document.getElementById('purchaseItemName') as HTMLInputElement).value.trim();
  const store = (document.getElementById('purchaseStore') as HTMLInputElement).value.trim();
  const amount = Number((document.getElementById('purchaseAmount') as HTMLInputElement).value || 0);
  const purpose = (document.getElementById('purchasePurpose') as HTMLInputElement).value.trim();
  if (!itemName || !store) {
    showToast('구매 물품명과 구매처를 입력해 주세요.', 'error');
    return;
  }

  const id = 'pur-' + Date.now();
  const record = {
    id,
    date,
    payMethod,
    itemName,
    store,
    amount,
    purpose,
    buyerId: worker.id,
    buyerName: worker.name,
    buyerRole: worker.role,
    itemPhoto: currentPurchaseItemPhoto || '',
    receiptPhoto: currentPurchaseReceiptPhoto || '',
    verifiedBy: '',
    verifiedAt: '',
    timestamp: Date.now()
  };

  state.purchases.unshift(record);
  (document.getElementById('purchaseItemName') as HTMLInputElement).value = '';
  (document.getElementById('purchaseStore') as HTMLInputElement).value = '';
  (document.getElementById('purchaseAmount') as HTMLInputElement).value = '';
  (document.getElementById('purchasePurpose') as HTMLInputElement).value = '';
  clearPurchasePhoto('item');
  clearPurchasePhoto('receipt');
  renderPurchases();

  try {
    await setDoc(getDocRef('purchases', id), record);
  } catch (err) {
    console.error('Purchase save error:', err);
    showToast('클라우드 동기화 중 사진 용량 초과로 텍스트만 저장됩니다.', 'error');
    try {
      await setDoc(getDocRef('purchases', id), { ...record, itemPhoto: '', receiptPhoto: '' });
    } catch (e2) { console.error(e2); }
  }
  showToast('물품구매 및 영수증 내역이 등록되었습니다!', 'success');
}

function setPurchaseFilter(f: string) {
  state.purchaseFilter = f;
  ['ALL', 'UNVERIFIED', 'VERIFIED'].forEach(key => {
    const btn = document.getElementById(`pur-filter-${key}`);
    if (!btn) return;
    btn.className = key === f
      ? 'px-2.5 py-1.5 rounded-lg bg-navy-800 text-white font-bold transition whitespace-nowrap'
      : 'px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-semibold transition whitespace-nowrap';
  });
  renderPurchases();
}

async function verifyPurchaseRecord(id: string) {
  const worker = getSelectedWorker();
  const verifierName = worker ? `${worker.name} (${worker.role})` : (state.isAdmin ? '관리자' : '');
  if (!verifierName) {
    showToast('확인 서명을 위해 상단에서 본인의 이름을 먼저 선택해 주세요!', 'error');
    return;
  }
  const item = state.purchases.find(p => p.id === id);
  if (!item) return;
  const now = new Date();
  const timeStr = `${getTodayString()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  item.verifiedBy = verifierName;
  item.verifiedAt = timeStr;
  renderPurchases();

  try { await updateDoc(getDocRef('purchases', id), { verifiedBy: verifierName, verifiedAt: timeStr }); } catch (err) { console.error(err); }
  showToast('물품 및 영수증 확인 완료 처리되었습니다.', 'success');
}

async function deletePurchaseRecord(id: string) {
  state.purchases = state.purchases.filter(p => p.id !== id);
  renderPurchases();
  try { await deleteDoc(getDocRef('purchases', id)); } catch (err) { console.error(err); }
  showToast('물품구매 기록이 삭제되었습니다.', 'info');
}

function openPurchasePrintModal(id: string) {
  const item = state.purchases.find(p => p.id === id);
  if (!item) return;

  document.getElementById('purPrintDate')!.textContent = item.date || '-';
  document.getElementById('purPrintBuyer')!.textContent = `${item.buyerName} (${item.buyerRole || ''})`;
  document.getElementById('purPrintItemName')!.textContent = item.itemName || '-';
  document.getElementById('purPrintAmount')!.textContent = `${(Number(item.amount) || 0).toLocaleString()}원`;
  document.getElementById('purPrintStore')!.textContent = item.store || '-';
  document.getElementById('purPrintPayMethod')!.textContent = item.payMethod || '-';
  document.getElementById('purPrintPurpose')!.textContent = item.purpose || '-';
  document.getElementById('purPrintBuyerSign')!.textContent = item.buyerName || '담당';
  document.getElementById('purPrintVerifySign')!.textContent = item.verifiedBy ? '확인완료' : '';
  document.getElementById('purPrintVerifiedText')!.textContent = item.verifiedBy
    ? `검수확인: ${item.verifiedBy} (${item.verifiedAt || ''})`
    : '';

  const itemBox = document.getElementById('purPrintItemPhotoBox')!;
  const receiptBox = document.getElementById('purPrintReceiptPhotoBox')!;

  itemBox.innerHTML = item.itemPhoto
    ? `<img src="${item.itemPhoto}" alt="구매물품" class="max-h-64 w-auto object-contain mx-auto">`
    : `<span class="text-xs text-slate-400">첨부된 물품 사진 없음</span>`;

  receiptBox.innerHTML = item.receiptPhoto
    ? `<img src="${item.receiptPhoto}" alt="영수증" class="max-h-64 w-auto object-contain mx-auto">`
    : `<span class="text-xs text-slate-400">첨부된 영수증 사진 없음</span>`;

  document.getElementById('purchasePrintModal')?.classList.remove('hidden');
}

function closePurchasePrintModal() {
  document.getElementById('purchasePrintModal')?.classList.add('hidden');
}

function renderPurchases() {
  const container = document.getElementById('purchasesContainer');
  const sumBadge = document.getElementById('purchaseTotalSumBadge');
  const dot = document.getElementById('unverifiedPurchaseDot');

  const unverifiedCount = state.purchases.filter(p => !p.verifiedBy).length;
  if (unverifiedCount > 0) dot?.classList.remove('hidden');
  else dot?.classList.add('hidden');

  if (!container) return;
  let list = state.purchases;
  if (state.purchaseFilter === 'UNVERIFIED') list = state.purchases.filter(p => !p.verifiedBy);
  else if (state.purchaseFilter === 'VERIFIED') list = state.purchases.filter(p => !!p.verifiedBy);

  const totalAmount = list.reduce((acc, cur) => acc + (Number(cur.amount) || 0), 0);
  if (sumBadge) sumBadge.textContent = `총 ${list.length}건 · ${totalAmount.toLocaleString()}원`;

  if (list.length === 0) {
    container.innerHTML = `<div class="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-xs">등록된 물품구매 · 영수증 내역이 없습니다.</div>`;
    return;
  }

  container.innerHTML = list.map(p => {
    const isVerified = !!p.verifiedBy;
    const canDelete = state.isAdmin || (state.selectedWorkerId && state.selectedWorkerId === p.buyerId);
    return `
      <div class="bg-white border ${isVerified ? 'border-emerald-200' : 'border-slate-200'} rounded-2xl p-4 shadow-sm space-y-3">
        <div class="flex items-start justify-between gap-2">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-bold">${escapeHtml(p.date)}</span>
            <span class="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-bold">${escapeHtml(p.payMethod || '법인카드')}</span>
            <span class="text-xs font-bold text-slate-700">${escapeHtml(p.buyerName)}</span>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${isVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
            ${isVerified ? '✔ 영수증 확인완료' : '정산 확인대기'}
          </span>
        </div>

        <div class="flex items-baseline justify-between gap-2">
          <div>
            <h4 class="text-sm font-extrabold text-slate-900">${escapeHtml(p.itemName)}</h4>
            <span class="text-xs text-slate-500">구매처: <strong>${escapeHtml(p.store)}</strong> · 용도: ${escapeHtml(p.purpose || '-')}</span>
          </div>
          <strong class="text-base font-extrabold text-indigo-700 shrink-0">${(Number(p.amount) || 0).toLocaleString()}원</strong>
        </div>

        ${(p.itemPhoto || p.receiptPhoto) ? `
          <div class="grid grid-cols-2 gap-2 pt-1">
            ${p.itemPhoto ? `
              <div class="space-y-1">
                <span class="text-[10px] font-bold text-slate-500 block">📦 구매 물품 사진</span>
                <img src="${p.itemPhoto}" alt="물품사진" onclick="openLightbox('${p.itemPhoto}')" class="w-full h-32 object-cover rounded-xl border border-slate-200 cursor-zoom-in">
              </div>
            ` : `<div class="bg-slate-50 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[11px] text-slate-400 h-32">물품 사진 없음</div>`}
            ${p.receiptPhoto ? `
              <div class="space-y-1">
                <span class="text-[10px] font-bold text-indigo-600 block">🧾 영수증 사진</span>
                <img src="${p.receiptPhoto}" alt="영수증사진" onclick="openLightbox('${p.receiptPhoto}')" class="w-full h-32 object-cover rounded-xl border border-indigo-200 cursor-zoom-in">
              </div>
            ` : `<div class="bg-slate-50 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[11px] text-slate-400 h-32">영수증 사진 없음</div>`}
          </div>
        ` : ''}

        <div class="flex items-center justify-between pt-2 border-t border-slate-100 gap-1.5 text-[11px] flex-wrap">
          <div class="flex items-center gap-1.5 flex-wrap">
            <button type="button" onclick="openPurchasePrintModal('${p.id}')" class="px-3 py-1.5 bg-navy-800 hover:bg-navy-700 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1">
              <i class="fa-solid fa-print"></i> 증빙 출력
            </button>
            ${!isVerified ? `
              <button type="button" onclick="verifyPurchaseRecord('${p.id}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-xs transition">물품·영수증 확인완료</button>
            ` : `<span class="text-emerald-700 font-bold"><i class="fa-solid fa-circle-check mr-1"></i>확인자: ${escapeHtml(p.verifiedBy)} (${escapeHtml(p.verifiedAt || '')})</span>`}
          </div>
          ${canDelete ? `
            <button type="button" onclick="deletePurchaseRecord('${p.id}')" class="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold transition">삭제</button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function downloadPurchasesCSV() {
  const rows: any[][] = [['구매일자', '품목명', '구매처', '금액', '결제수단', '사용용도', '구매자', '확인상태', '확인자']];
  state.purchases.forEach(p => {
    rows.push([p.date, p.itemName, p.store, p.amount, p.payMethod || '', p.purpose || '', p.buyerName, p.verifiedBy ? '확인완료' : '대기', p.verifiedBy || '']);
  });
  triggerCSVDownload(rows, `호려울마을7단지_물품구매대장_${getTodayString()}.csv`);
}

// STAFF CHAT (직원 단체 채팅 + 알림음 + 이모티콘)
function setUnreadChatBadge(show: boolean) {
  const pingDot = document.getElementById('unreadChatDot');
  const solidDot = document.getElementById('unreadChatDotSolid');
  const homeDot = document.getElementById('homeDot-chat');
  const qDot = document.getElementById('qDot-chat');
  if (show) {
    pingDot?.classList.remove('hidden');
    solidDot?.classList.remove('hidden');
    homeDot?.classList.remove('hidden');
    qDot?.classList.remove('hidden');
  } else {
    pingDot?.classList.add('hidden');
    solidDot?.classList.add('hidden');
    homeDot?.classList.add('hidden');
    qDot?.classList.add('hidden');
  }
}

function toggleChatSound() {
  state.chatSoundEnabled = !state.chatSoundEnabled;
  const btn = document.getElementById('chatSoundToggleBtn');
  const icon = document.getElementById('chatSoundIcon');
  const txt = document.getElementById('chatSoundText');
  if (state.chatSoundEnabled) {
    if (btn) btn.className = 'px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold transition flex items-center gap-1 whitespace-nowrap';
    if (icon) icon.className = 'fa-solid fa-bell';
    if (txt) txt.textContent = '알림음 ON';
    playChatNotificationSound();
    showToast('채팅 도착 알림음이 켜졌습니다.', 'success');
  } else {
    if (btn) btn.className = 'px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-200 text-[11px] font-bold transition flex items-center gap-1 whitespace-nowrap';
    if (icon) icon.className = 'fa-solid fa-bell-slash';
    if (txt) txt.textContent = '무음';
    showToast('채팅 알림음이 무음으로 전환되었습니다.', 'info');
  }
}

function playChatNotificationSound() {
  if (!state.chatSoundEnabled) return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1174.66, now + 0.14);
    gain2.gain.setValueAtTime(0.14, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.42);
  } catch (e) {
    console.warn('Audio play blocked:', e);
  }
}

function toggleChatEmojiPanel() {
  document.getElementById('chatEmojiPanel')?.classList.toggle('hidden');
}

async function sendEmojiMessage(emoji: string) {
  document.getElementById('chatEmojiPanel')?.classList.add('hidden');
  await sendQuickChat(emoji);
}

async function submitChat(e: Event) {
  e.preventDefault();
  const input = document.getElementById('chatInput') as HTMLInputElement;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  document.getElementById('chatEmojiPanel')?.classList.add('hidden');
  await sendQuickChat(text);
}

async function sendQuickChat(text: string) {
  const worker = getSelectedWorker();
  if (!worker) {
    showToast('상단에서 본인의 이름을 먼저 선택해 주세요!', 'error');
    return;
  }
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const id = 'chat-' + Date.now();
  const ts = Date.now();
  const msg = {
    id,
    senderId: worker.id,
    senderName: worker.name,
    senderRole: worker.role,
    text,
    time: timeStr,
    timestamp: ts
  };
  state.lastSeenChatTimestamp = ts;
  state.chats.push(msg);
  renderChats();
  try { await setDoc(getDocRef('chats', id), msg); } catch (err) { console.error(err); }
}

function renderChats() {
  const box = document.getElementById('chatMessagesContainer');
  if (!box) return;
  if (state.chats.length === 0) {
    box.innerHTML = `<div class="text-center text-xs text-slate-400 py-10">직원들과 첫 메시지를 나누어 보세요.</div>`;
    return;
  }
  const emojiOnlyRegex = /^(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}|\uFE0F|\u200D){1,3}$/u;
  box.innerHTML = state.chats.map(c => {
    const isMine = state.selectedWorkerId && c.senderId === state.selectedWorkerId;
    const isBigEmoji = emojiOnlyRegex.test((c.text || '').trim());
    return `
      <div class="flex flex-col ${isMine ? 'items-end' : 'items-start'}">
        <span class="text-[10px] font-bold text-slate-500 mb-0.5 px-1">${escapeHtml(c.senderName)} (${escapeHtml(c.senderRole || '')}) · ${escapeHtml(c.time || '')}</span>
        ${isBigEmoji
          ? `<div class="text-4xl py-1 px-2 select-none">${escapeHtml(c.text)}</div>`
          : `<div class="max-w-[80%] px-3.5 py-2 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${isMine ? 'bg-brand-600 text-white rounded-tr-xs' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'}">${escapeHtml(c.text)}</div>`
        }
      </div>
    `;
  }).join('');
  box.scrollTop = box.scrollHeight;
}

// ADMIN MODE & STAFF MANAGEMENT & CSV EXPORT
const THEME_NAMES: Record<string, string> = {
  teal: '청록(기본)',
  blue: '하늘(스카이블루)',
  emerald: '초록(에메랄드)',
  indigo: '남색(로얄인디고)',
  rose: '로즈(핑크)',
  amber: '오렌지(선셋)',
  slate: '차콜(슬레이트)'
};

function setAppTheme(themeKey: string, silent = false) {
  const keys = Object.keys(THEME_NAMES);
  keys.forEach(k => document.body.classList.remove(`theme-${k}`));
  if (themeKey !== 'teal') {
    document.body.classList.add(`theme-${themeKey}`);
  }
  localStorage.setItem('horyeoul7_theme', themeKey);

  const label = document.getElementById('currentThemeLabel');
  if (label) label.textContent = THEME_NAMES[themeKey] || '청록(기본)';

  keys.forEach(k => {
    const btn = document.getElementById(`themeBtn-${k}`);
    if (!btn) return;
    btn.className = k === themeKey
      ? 'p-2 rounded-xl bg-white border-2 border-slate-800 flex flex-col items-center gap-1 shadow-xs transition scale-105'
      : 'p-2 rounded-xl bg-white border border-slate-200 hover:border-slate-400 flex flex-col items-center gap-1 transition opacity-80 hover:opacity-100';
  });

  if (!silent) {
    showToast(`화면 색상이 '${THEME_NAMES[themeKey]}' 테마로 변경되었습니다.`, 'success');
  }
}

function toggleAdminModeModal() {
  switchTab('admin');
}

function unlockAdminPanel(e: Event) {
  e.preventDefault();
  const pin = (document.getElementById('adminPinInput') as HTMLInputElement).value.trim();
  if (pin === '0000') {
    state.isAdmin = true;
    document.getElementById('adminLockedView')?.classList.add('hidden');
    document.getElementById('adminUnlockedView')?.classList.remove('hidden');
    document.getElementById('adminBadge')?.classList.remove('hidden');
    const adminBtnText = document.getElementById('adminBtnText');
    if (adminBtnText) adminBtnText.textContent = '관리자 활성';
    renderLogs();
    renderHandovers();
    renderLeaves();
    renderAdminToolAlerts();
    renderAdminStaffList();
    renderAdminBannerList();
    showToast('관리자 모드가 활성화되었습니다.', 'success');
  } else {
    showToast('관리자 비밀번호가 올바르지 않습니다.', 'error');
  }
}

function lockAdminPanel() {
  state.isAdmin = false;
  (document.getElementById('adminPinInput') as HTMLInputElement).value = '';
  document.getElementById('adminLockedView')?.classList.remove('hidden');
  document.getElementById('adminUnlockedView')?.classList.add('hidden');
  document.getElementById('adminBadge')?.classList.add('hidden');
  const adminBtnText = document.getElementById('adminBtnText');
  if (adminBtnText) adminBtnText.textContent = '관리자 모드';
  renderLogs();
  showToast('관리자 모드가 잠겼습니다.', 'info');
}

async function handleAddStaff(e: Event) {
  e.preventDefault();
  const name = (document.getElementById('newStaffName') as HTMLInputElement).value.trim();
  const role = (document.getElementById('newStaffRole') as HTMLInputElement).value.trim();
  const pinInput = document.getElementById('newStaffPin') as HTMLInputElement | null;
  const pin = pinInput ? pinInput.value.trim() : '';
  if (!name || !role) return;
  const id = 'staff-' + Date.now();
  const newStaff: any = { id, name, role };
  if (pin) newStaff.pin = pin;
  state.staff.push(newStaff);
  (document.getElementById('newStaffName') as HTMLInputElement).value = '';
  (document.getElementById('newStaffRole') as HTMLInputElement).value = '';
  if (pinInput) pinInput.value = '';
  renderLoginWorkerSelect();
  renderWorkerDropdown();
  renderWorkerFilterChips();
  renderAdminStaffList();
  try { await setDoc(getDocRef('staff', id), newStaff); } catch (err) { console.error(err); }
  showToast(`${name} (${role}) 직원이 등록되었습니다.`, 'success');
}

function openEditStaffModal(id: string) {
  const s = state.staff.find(item => item.id === id);
  if (!s) return;
  (document.getElementById('editStaffId') as HTMLInputElement).value = s.id;
  (document.getElementById('editStaffNameInput') as HTMLInputElement).value = s.name;
  (document.getElementById('editStaffRoleInput') as HTMLInputElement).value = s.role;
  const pinInput = document.getElementById('editStaffPinInput') as HTMLInputElement | null;
  if (pinInput) pinInput.value = s.pin || '';
  document.getElementById('editStaffModal')?.classList.remove('hidden');
}

function closeEditStaffModal() {
  document.getElementById('editStaffModal')?.classList.add('hidden');
}

async function saveEditedStaff(e: Event) {
  e.preventDefault();
  const id = (document.getElementById('editStaffId') as HTMLInputElement).value;
  const name = (document.getElementById('editStaffNameInput') as HTMLInputElement).value.trim();
  const role = (document.getElementById('editStaffRoleInput') as HTMLInputElement).value.trim();
  const pinInput = document.getElementById('editStaffPinInput') as HTMLInputElement | null;
  const pin = pinInput ? pinInput.value.trim() : '';
  const s = state.staff.find(item => item.id === id);
  if (s) {
    s.name = name;
    s.role = role;
    s.pin = pin;
    renderLoginWorkerSelect();
    renderWorkerDropdown();
    renderWorkerFilterChips();
    renderAdminStaffList();
    try { await updateDoc(getDocRef('staff', id), { name, role, pin }); } catch (err) { console.error(err); }
  }
  closeEditStaffModal();
  showToast('직원 정보가 수정되었습니다.', 'success');
}

async function deleteStaff(id: string) {
  state.staff = state.staff.filter(s => s.id !== id);
  if (state.selectedWorkerId === id) {
    state.selectedWorkerId = '';
    localStorage.removeItem('horyeoul7_worker');
  }
  renderLoginWorkerSelect();
  renderWorkerDropdown();
  renderWorkerFilterChips();
  renderAdminStaffList();
  try { await deleteDoc(getDocRef('staff', id)); } catch (err) { console.error(err); }
  showToast('직원이 삭제되었습니다.', 'info');
}

function renderAdminStaffList() {
  const box = document.getElementById('staffListContainer');
  if (!box) return;
  if (state.staff.length === 0) {
    box.innerHTML = `<p class="text-xs text-slate-400 text-center py-3">등록된 직원이 없습니다. 위 입력창에서 직원 이름과 직책을 등록해 주세요.</p>`;
    return;
  }
  box.innerHTML = state.staff.map(s => `
    <div class="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
      <div class="flex items-center gap-1.5 flex-wrap">
        <strong class="text-slate-800">${escapeHtml(s.name)}</strong>
        <span class="text-slate-500">${escapeHtml(s.role)}</span>
        ${s.pin
          ? `<span class="px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200 text-[10px] font-bold">🔒 개인비번</span>`
          : `<span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-medium">공용비번</span>`
        }
      </div>
      <div class="flex items-center gap-1 shrink-0">
        <button type="button" onclick="openEditStaffModal('${s.id}')" class="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg font-bold">수정</button>
        <button type="button" onclick="deleteStaff('${s.id}')" class="px-2 py-1 bg-red-50 text-red-600 rounded-lg font-bold">삭제</button>
      </div>
    </div>
  `).join('');
}

function downloadCSV() {
  const rows: any[][] = [['작업날짜', '민원구분', '작성자', '직책', '작업장소', '민원내용', '처리내용', '작성시각', '미디어첨부']];
  state.logs.forEach(l => {
    const fallbackWorker = l.workerName ? null : state.staff.find(s => s.id === l.workerId);
    const wName = l.workerName || fallbackWorker?.name || '';
    const wRole = l.workerRole || fallbackWorker?.role || '';
    const mediaLabel = l.photo ? (isVideoMediaSrc(l.photo, l.mediaType) ? '동영상' : '사진') : 'X';
    rows.push([l.date, l.category || '공용민원', wName, wRole, l.location, l.complaintContent || '', l.content, l.createdAt || '', mediaLabel]);
  });
  triggerCSVDownload(rows, `호려울마을7단지_공동작업일지_${getTodayString()}.csv`);
}

function triggerCSVDownload(rows: any[][], filename: string) {
  const csv = '\uFEFF' + rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showToast('엑셀(CSV) 파일이 다운로드되었습니다.', 'success');
}

function clearAllDataPrompt() {
  openConfirmModal(
    '클라우드 전체 기록 초기화',
    '클라우드 서버에 저장된 기존 작업일지·업무계획·공지·채팅·공구·업체·구매내역을 모두 삭제하고 깨끗하게 비우시겠습니까? (직원 명단은 유지됩니다)',
    async () => {
      const cols = ['logs', 'plans', 'leaves', 'handovers', 'staff_handovers', 'tools', 'tool_return_alerts', 'detector_logs', 'vendors', 'purchases', 'chats', 'banners'];
      for (const cName of cols) {
        try {
          const snap = await getDocs(getColRef(cName));
          for (const d of snap.docs) {
            await deleteDoc(getDocRef(cName, d.id));
          }
        } catch (err) {
          console.error(err);
        }
      }
      state.logs = [];
      state.plans = [];
      state.leaves = [];
      state.handovers = [];
      state.staffHandovers = [];
      state.tools = [];
      state.toolReturnAlerts = [];
      state.detectorLogs = [];
      state.vendors = [];
      state.purchases = [];
      state.chats = [];
      state.banners = [];

      renderLogs();
      renderPlans();
      renderLeaves();
      renderHandovers();
      renderStaffHandovers();
      renderTools();
      renderAdminToolAlerts();
      renderVendors();
      renderPurchases();
      renderChats();
      renderHomeBanner();
      renderAdminBannerList();
      showToast('클라우드 서버의 모든 기존 테스트 데이터가 깨끗하게 초기화되었습니다.', 'success');
    }
  );
}

// MODALS & TOAST & UTILS
let confirmCallback: (() => Promise<void> | void) | null = null;
function openConfirmModal(title: string, msg: string, onOk: () => Promise<void> | void) {
  document.getElementById('confirmTitle')!.textContent = title;
  document.getElementById('confirmMessage')!.textContent = msg;
  confirmCallback = onOk;
  const okBtn = document.getElementById('confirmOkBtn');
  if (okBtn) {
    okBtn.onclick = () => {
      closeConfirmModal();
      if (confirmCallback) confirmCallback();
    };
  }
  document.getElementById('confirmModal')?.classList.remove('hidden');
}

function closeConfirmModal() {
  document.getElementById('confirmModal')?.classList.add('hidden');
}

function openLightbox(src: string, mediaType?: string) {
  const imgEl = document.getElementById('lightboxImg') as HTMLImageElement | null;
  const videoEl = document.getElementById('lightboxVideo') as HTMLVideoElement | null;
  const isVideo = mediaType === 'video' || isVideoMediaSrc(src, mediaType);

  if (isVideo) {
    if (imgEl) { imgEl.classList.add('hidden'); imgEl.src = ''; }
    if (videoEl) {
      videoEl.src = src;
      videoEl.classList.remove('hidden');
      videoEl.play().catch(() => { /* user interaction handles play */ });
    }
  } else {
    if (videoEl) {
      videoEl.pause();
      videoEl.removeAttribute('src');
      videoEl.classList.add('hidden');
    }
    if (imgEl) {
      imgEl.src = src;
      imgEl.classList.remove('hidden');
    }
  }
  document.getElementById('imageLightbox')?.classList.remove('hidden');
}

function closeLightbox() {
  const videoEl = document.getElementById('lightboxVideo') as HTMLVideoElement | null;
  if (videoEl) {
    videoEl.pause();
    videoEl.removeAttribute('src');
    videoEl.classList.add('hidden');
  }
  document.getElementById('imageLightbox')?.classList.add('hidden');
}

function showToast(msg: string, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  let bg = 'bg-slate-800 text-white';
  if (type === 'success') bg = 'bg-emerald-700 text-white';
  if (type === 'error') bg = 'bg-red-700 text-white';
  el.className = `${bg} shadow-xl rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-2 transition-all`;
  el.innerHTML = `<i class="fa-solid fa-circle-info"></i><span>${escapeHtml(msg)}</span>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function escapeHtml(str: any): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

Object.assign(window, {
  handleLogin, handleLogout, handleLoginWorkerChange,
  handleWorkerChange, switchTab, setHomePlanMode, renderHomePortal,
  cycleBanner, toggleBannerGlobal, handleAddBanner, deleteBanner,
  selectLogCategory, setQuickLocation, handlePhotoUpload, cancelMediaCompression, clearPhoto, toggleVoiceInput, setWriteNextAction, submitWorkLog,
  setLogCategoryFilter, setWorkerFilter, setLogViewMode, openYesterdayInCalendar, changeCalendarMonth, goCalendarToday, selectCalendarDate, clearCalendarSelectedDate,
  openEditModal, closeEditModal, saveEditedLog, confirmDeleteLog, renderLogs, downloadFilteredLogsPDF,
  togglePlanAddForm, setPlanPeriodType, shiftPlanPeriod, resetPlanPeriodToday, handleAddPlan, togglePlanDone, deletePlan, sendPlanToWorkLog,
  syncLeaveEndDate, updateLeaveDaysCalc, submitLeaveRequest, setLeaveFilter, approveLeaveRequest, deleteLeaveRequest, openLeavePrintModal, closeLeavePrintModal,
  setHandoverFolderMode, handleStaffHandoverFile, submitStaffHandover, setStaffHandoverFilter, confirmStaffHandoverReceiver, approveStaffHandoverDirector, deleteStaffHandover, openStaffHandoverPrintModal, closeStaffHandoverPrintModal,
  setHandoverFilter, submitHandover, confirmHandoverItem, openEditHandoverModal, closeEditHandoverModal, saveHandoverEdit, deleteHandover,
  setToolFolderMode, toggleToolAddForm, toggleToolPasteBox, presetFireDetectorTool, setToolFilter, handleAddTool, adjustToolQty, rentTool, returnTool, toggleToolRepair, deleteTool, downloadToolsCSV, renderTools,
  addDetectorStockFromFolder, setFdLocationQuick, setFdHistoryFilter, setFdPeriodPreset, onFdCustomDateChange, resetFdFilters, submitDetectorReplacement, deleteDetectorLog, renderFireDetectors,
  markToolAlertRead, markAllToolAlertsRead, deleteToolReturnAlert, renderAdminToolAlerts,
  handleToolSmartFile, parseToolRawText, clearToolImportPreview, confirmBatchToolImport,
  toggleVendorAddForm, toggleVendorPasteBox, setVendorScope, setVendorCategory, handleAddVendor, toggleVendorFavorite, deleteVendor, copyVendorPhone, renderVendors,
  handleVendorSmartFile, parseVendorRawText, clearVendorImportPreview, confirmBatchVendorImport,
  handlePurchasePhoto, clearPurchasePhoto, submitPurchaseRecord, setPurchaseFilter, verifyPurchaseRecord, deletePurchaseRecord, openPurchasePrintModal, closePurchasePrintModal, downloadPurchasesCSV,
  toggleChatSound, toggleChatEmojiPanel, sendEmojiMessage, submitChat, sendQuickChat,
  setAppTheme, toggleAdminModeModal, unlockAdminPanel, lockAdminPanel,
  handleAddStaff, openEditStaffModal, closeEditStaffModal, saveEditedStaff, deleteStaff,
  downloadCSV, clearAllDataPrompt,
  closeConfirmModal, openLightbox, closeLightbox
});
