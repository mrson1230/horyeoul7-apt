import './index.css';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, type User } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, updateDoc, deleteDoc, getDocs, onSnapshot } from 'firebase/firestore';

declare const XLSX: any;
declare const pdfjsLib: any;
declare const mammoth: any;
declare const Tesseract: any;
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
let currentUser: User | null = null;

const getColRef = (colName: string) => collection(db, 'artifacts', appId, 'public', 'data', colName);
const getDocRef = (colName: string, docId: string) => doc(db, 'artifacts', appId, 'public', 'data', colName, String(docId));

const SAMPLE_IMAGES: Record<string, string> = {
  pump: 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="#1e293b"/><circle cx="300" cy="180" r="70" fill="#0d9488" opacity="0.25"/><rect x="210" y="130" width="180" height="100" rx="16" fill="#0f766e" stroke="#2dd4bf" stroke-width="4"/><circle cx="260" cy="180" r="24" fill="#115e59" stroke="#5eead4" stroke-width="3"/><rect x="305" y="158" width="65" height="44" rx="6" fill="#042f2e"/><text x="300" y="295" font-family="sans-serif" font-size="22" font-weight="bold" fill="#f8fafc" text-anchor="middle">중앙기계실 가압펌프 점검 완료</text><text x="300" y="325" font-family="sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle">압력계 정상 범위 (4.2 bar)</text></svg>`),
  led: 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="#0f172a"/><polygon points="300,90 160,260 440,260" fill="#fef08a" opacity="0.18"/><rect x="200" y="75" width="200" height="24" rx="12" fill="#f8fafc" stroke="#38bdf8" stroke-width="3"/><text x="300" y="305" font-family="sans-serif" font-size="22" font-weight="bold" fill="#f8fafc" text-anchor="middle">지하주차장 LED 센서등 교체</text><text x="300" y="335" font-family="sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle">점등 및 센서 감도 테스트 양호</text></svg>`),
  panel: 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="#1e293b"/><rect x="190" y="65" width="220" height="190" rx="12" fill="#334155" stroke="#64748b" stroke-width="4"/><circle cx="240" cy="110" r="8" fill="#22c55e"/><circle cx="270" cy="110" r="8" fill="#22c55e"/><circle cx="300" cy="110" r="8" fill="#eab308"/><rect x="225" y="140" width="150" height="85" rx="6" fill="#0f172a"/><text x="300" y="305" font-family="sans-serif" font-size="22" font-weight="bold" fill="#f8fafc" text-anchor="middle">전기실 메인 배전반 열화상 점검</text><text x="300" y="335" font-family="sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle">각 상 부하 전류 및 온도 이상 없음</text></svg>`),
  cctv: 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="#18181b"/><rect x="210" y="115" width="150" height="75" rx="14" fill="#e2e8f0"/><circle cx="360" cy="152" r="24" fill="#0f172a" stroke="#475569" stroke-width="5"/><circle cx="360" cy="152" r="9" fill="#0ea5e9"/><text x="300" y="295" font-family="sans-serif" font-size="22" font-weight="bold" fill="#f8fafc" text-anchor="middle">정문 초소 CCTV 화각 및 녹화 점검</text><text x="300" y="325" font-family="sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle">야간 적외선 모드 정상 작동 확인</text></svg>`)
};

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
  logViewMode: string;
  calendarYear: number;
  calendarMonth: number;
  calendarSelectedDate: string;
  handoverFilter: string;
  toolFilter: string;
  pendingToolImports: any[];
  vendorScopeFilter: string;
  vendorCategoryFilter: string;
  pendingVendorImports: any[];
  staff: any[];
  logs: any[];
  handovers: any[];
  chats: any[];
  tools: any[];
  vendors: any[];
  banners: any[];
  bannersEnabled: boolean;
  bannerIndex: number;
}

const state: AppState = {
  isLoggedIn: false,
  isAdmin: false,
  selectedWorkerId: '',
  activeTab: 'write',
  filterWorkerId: 'ALL',
  logViewMode: 'LIST',
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth(),
  calendarSelectedDate: '',
  handoverFilter: 'ALL',
  toolFilter: 'ALL',
  pendingToolImports: [],
  vendorScopeFilter: 'ALL',
  vendorCategoryFilter: 'ALL',
  pendingVendorImports: [],
  staff: [],
  logs: [],
  handovers: [],
  chats: [],
  tools: [],
  vendors: [],
  banners: [],
  bannersEnabled: true,
  bannerIndex: 0
};

const ADMIN_PIN = '0000';
let currentUploadedPhoto = '';
let pendingConfirmCallback: (() => Promise<void> | void) | null = null;

const initApp = async () => {
  const logDateEl = document.getElementById('logDate') as HTMLInputElement | null;
  const bannerDateEl = document.getElementById('bannerDate') as HTMLInputElement | null;
  if (logDateEl) logDateEl.value = getTodayString();
  if (bannerDateEl) bannerDateEl.value = getTodayString();

  document.getElementById('confirmOkBtn')?.addEventListener('click', async () => {
    if (pendingConfirmCallback) await pendingConfirmCallback();
    closeConfirmModal();
  });

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
    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
      await signInWithCustomToken(auth, __initial_auth_token);
    } else {
      await signInAnonymously(auth);
    }
    currentUser = auth.currentUser;
    if (!currentUser) throw new Error('인증 사용자 없음');

    await seedInitialDataIfEmpty();

    onSnapshot(getColRef('staff'), (snap) => {
      state.staff = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      state.staff.sort((a, b) => (a.order || 0) - (b.order || 0));
      renderWorkerDropdown();
      renderFilterChips();
      renderStaffList();
      renderLogs();
    });

    onSnapshot(getColRef('logs'), (snap) => {
      state.logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      state.logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0) || (b.createdAt || '').localeCompare(a.createdAt || ''));
      renderLogs();
    });

    onSnapshot(getColRef('handovers'), (snap) => {
      state.handovers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      state.handovers.sort((a, b) => {
        if (Boolean(b.isImportant) !== Boolean(a.isImportant)) return b.isImportant ? 1 : -1;
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
      updateUnconfirmedDot();
      renderHandovers();
    });

    onSnapshot(getColRef('tools'), (snap) => {
      state.tools = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      state.tools.sort((a, b) => (a.order || 0) - (b.order || 0));
      updateRentedToolsDot();
      renderTools();
    });

    onSnapshot(getColRef('vendors'), (snap) => {
      state.vendors = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      state.vendors.sort((a, b) => {
        if (Boolean(b.isFavorite) !== Boolean(a.isFavorite)) return b.isFavorite ? 1 : -1;
        return (a.order || 0) - (b.order || 0);
      });
      renderVendors();
    });

    onSnapshot(getColRef('chats'), (snap) => {
      state.chats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      state.chats.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      renderChats();
    });

    onSnapshot(getColRef('banners'), (snap) => {
      state.banners = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      state.banners.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      if (state.bannerIndex >= state.banners.length) state.bannerIndex = 0;
      renderHomeBanner();
      renderAdminBannerList();
    });

    onSnapshot(getDocRef('settings', 'bannerConfig'), (docSnap) => {
      if (docSnap.exists()) {
        state.bannersEnabled = docSnap.data().enabled !== false;
        const toggle = document.getElementById('bannerGlobalToggle') as HTMLInputElement | null;
        if (toggle) toggle.checked = state.bannersEnabled;
        renderHomeBanner();
      }
    });

    if (dot) dot.className = 'w-2 h-2 rounded-full bg-emerald-400 shrink-0';
    if (txt) txt.textContent = '실시간 클라우드 서버 동기화 완료 · 전 직원 공유 중';
  } catch (err) {
    console.error('Firebase sync error:', err);
    if (dot) dot.className = 'w-2 h-2 rounded-full bg-red-400 shrink-0';
    if (txt) txt.textContent = '클라우드 연결 대기중 (네트워크 및 인증 설정 확인)';
  }
}

async function seedInitialDataIfEmpty() {
  const staffSnap = await getDocs(getColRef('staff'));
  if (staffSnap.empty) {
    const defaultStaff = [
      { id: 'st-1', name: '김철수', role: '시설과장', order: 1 },
      { id: 'st-2', name: '이영희', role: '경리주임', order: 2 },
      { id: 'st-3', name: '박민수', role: '기전주임', order: 3 },
      { id: 'st-4', name: '최동훈', role: '보안반장', order: 4 }
    ];
    for (const s of defaultStaff) await setDoc(getDocRef('staff', s.id), s);

    const today = getTodayString();
    await setDoc(getDocRef('logs', 'log-init-1'), {
      id: 'log-init-1',
      workerId: 'st-1',
      date: today,
      location: '중앙기계실',
      content: '급수 가압펌프 1·2호기 압력 및 이상 소음 점검 완료. 특이사항 없음.',
      photo: SAMPLE_IMAGES.pump,
      createdAt: '09:30',
      timestamp: Date.now() - 3600000
    });

    await setDoc(getDocRef('handovers', 'ho-init-1'), {
      id: 'ho-init-1',
      type: '주간→야간',
      isImportant: true,
      author: '김철수 (시설과장)',
      content: '702동 지하주차장 입구 배수로 덮개 보수 완료했습니다. 야간 순찰 시 차량 통행에 지장 없는지 한 번 더 확인 부탁드립니다.',
      createdAt: `${today} 17:40`,
      timestamp: Date.now() - 1800000,
      confirmedBy: null,
      confirmedAt: null
    });

    const defaultTools = [
      { id: 'tl-1', name: '보쉬 충전 해머드릴 18V', location: '기전실 공구함 1단', qty: '1세트', note: '배터리 2개 포함', status: 'AVAILABLE', rentedBy: '', rentedAt: '', rentedPlace: '', order: 1 },
      { id: 'tl-2', name: '절연 멀티테스터기 (후루크)', location: '전기실 계측기함', qty: '1대', note: '검교정 완료', status: 'AVAILABLE', rentedBy: '', rentedAt: '', rentedPlace: '', order: 2 },
      { id: 'tl-3', name: '알루미늄 4단 접이식 사다리', location: '중앙기계실 우측 벽면', qty: '2대', note: '', status: 'AVAILABLE', rentedBy: '', rentedAt: '', rentedPlace: '', order: 3 }
    ];
    for (const t of defaultTools) await setDoc(getDocRef('tools', t.id), t);

    const defaultVendors = [
      { id: 'vd-1', scope: '공용', category: '승강기', name: '한국승강기보수(주) 세종지사', phone: '044-865-1199', manager: '이부장', note: '단지 승강기 24시간 긴급 고장 출동', isFavorite: true, order: 1 },
      { id: 'vd-2', scope: '세대', category: '설비·배관', name: '세종종합설비누수탐지', phone: '010-3456-7890', manager: '김사장님', note: '세대 내 누수탐지, 언수도 해빙, 변기·배관 막힘', isFavorite: true, order: 2 },
      { id: 'vd-3', scope: '공용', category: '전기·소방', name: '한빛소방전기안전', phone: '044-862-0119', manager: '박팀장', note: '수신기 및 감지기 오작동·소방설비 보수', isFavorite: false, order: 3 },
      { id: 'vd-4', scope: '세대', category: '세대수리·기타', name: '호려울열쇠·도어락24시', phone: '010-9876-5432', manager: '정기사', note: '현관 디지털 도어락 교체 및 잠금해제 입주민 안내용', isFavorite: false, order: 4 }
    ];
    for (const v of defaultVendors) await setDoc(getDocRef('vendors', v.id), v);

    await setDoc(getDocRef('banners', 'bn-init-1'), {
      id: 'bn-init-1',
      category: 'event',
      date: today,
      time: '14:00',
      location: '단지 내 전 동 및 지하주차장',
      title: '하반기 소방종합정밀점검 실시 안내',
      desc: '점검 시간 동안 경종이 울릴 수 있으니 민원 응대 시 참고 바랍니다.',
      timestamp: Date.now()
    });
  }
}

function getTodayString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatBannerDateTime(dateStr: string, timeStr: string) {
  if (!dateStr) return '';
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const dt = new Date(dateStr + 'T00:00:00');
  const dayLabel = !isNaN(dt.getTime()) ? ` (${days[dt.getDay()]})` : '';
  return timeStr ? `${dateStr}${dayLabel} ${timeStr}` : `${dateStr}${dayLabel}`;
}

function autoFillDemoLogin() {
  (document.getElementById('loginId') as HTMLInputElement).value = 'horyeoul7';
  (document.getElementById('loginPw') as HTMLInputElement).value = '1234';
  showToast('체험용 회사 아이디/비밀번호가 입력되었습니다.', 'info');
}

function handleLogin(e: Event) {
  e.preventDefault();
  const id = (document.getElementById('loginId') as HTMLInputElement).value.trim();
  const pw = (document.getElementById('loginPw') as HTMLInputElement).value.trim();

  if (id === 'horyeoul7' && pw === '1234') {
    state.isLoggedIn = true;
    document.getElementById('loginScreen')?.classList.add('hidden');
    showToast('호려울마을 7단지 공동 작업일지에 로그인되었습니다.', 'success');
  } else {
    showToast('아이디 또는 비밀번호가 일치하지 않습니다. (기본: horyeoul7 / 1234)', 'error');
  }
}

function handleLogout() {
  state.isLoggedIn = false;
  state.isAdmin = false;
  updateAdminUI();
  document.getElementById('loginScreen')?.classList.remove('hidden');
  showToast('로그아웃 되었습니다.', 'info');
}

function renderWorkerDropdown() {
  const select = document.getElementById('workerSelect') as HTMLSelectElement | null;
  if (!select) return;
  const prevVal = state.selectedWorkerId;

  let html = `<option value="">-- 작업자 선택 --</option>`;
  state.staff.forEach(s => {
    html += `<option value="${s.id}">${escapeHtml(s.name)} (${escapeHtml(s.role)})</option>`;
  });
  select.innerHTML = html;

  if (prevVal && state.staff.some(s => s.id === prevVal)) {
    select.value = prevVal;
  } else {
    state.selectedWorkerId = '';
  }
  updateWorkerBanner();
}

function handleWorkerChange(workerId: string) {
  state.selectedWorkerId = workerId;
  updateWorkerBanner();
  renderLogs();
  renderHandovers();
  renderChats();
}

function updateWorkerBanner() {
  const banner = document.getElementById('workerAlertBanner');
  const authorTag = document.getElementById('formAuthorTag');
  const hoAuthorTag = document.getElementById('handoverAuthorTag');
  const chatUserBadge = document.getElementById('chatCurrentUserBadge');

  const worker = state.staff.find(s => s.id === state.selectedWorkerId);
  if (worker) {
    if (banner) banner.classList.add('hidden');
    if (authorTag) {
      authorTag.textContent = `작성자: ${worker.name} (${worker.role})`;
      authorTag.className = 'text-[11px] font-bold bg-brand-50 text-brand-700 border border-brand-200 px-2.5 py-1 rounded-full truncate max-w-[160px]';
    }
    if (hoAuthorTag) hoAuthorTag.textContent = `작성자: ${worker.name} (${worker.role})`;
    if (chatUserBadge) chatUserBadge.textContent = `${worker.name} (${worker.role})`;
  } else {
    if (banner) banner.classList.remove('hidden');
    if (authorTag) {
      authorTag.textContent = '작성자: 미선택';
      authorTag.className = 'text-[11px] font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full truncate max-w-[140px]';
    }
    if (hoAuthorTag) hoAuthorTag.textContent = '작성자: 미선택';
    if (chatUserBadge) chatUserBadge.textContent = '작업자 미선택';
  }
}

function switchTab(tabId: string) {
  state.activeTab = tabId;
  const tabs = ['write', 'logs', 'chat', 'handover', 'tools', 'vendors', 'admin'];
  tabs.forEach(t => {
    const sec = document.getElementById(`tab-${t}`);
    const navBtn = document.getElementById(`nav-${t}`);
    if (t === tabId) {
      if (sec) sec.classList.remove('hidden');
      if (navBtn) {
        navBtn.className = 'relative flex-1 min-w-0 py-1.5 sm:py-2 px-0.5 rounded-xl bg-brand-600 text-white flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 font-bold shadow-sm transition-all duration-200';
      }
    } else {
      if (sec) sec.classList.add('hidden');
      if (navBtn) {
        navBtn.className = 'relative flex-1 min-w-0 py-1.5 sm:py-2 px-0.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 font-semibold transition-all duration-200';
      }
    }
  });

  if (tabId === 'logs') renderLogs();
  if (tabId === 'chat') renderChats();
  if (tabId === 'handover') renderHandovers();
  if (tabId === 'tools') renderTools();
  if (tabId === 'vendors') renderVendors();
}

function setQuickLocation(loc: string) {
  (document.getElementById('logLocation') as HTMLInputElement).value = loc;
}

function handlePhotoUpload(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 900;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, w, h);
      currentUploadedPhoto = canvas.toDataURL('image/jpeg', 0.72);
      showPhotoPreview(currentUploadedPhoto, file.name);
    };
    img.src = ev.target?.result as string;
  };
  reader.readAsDataURL(file);
}

function selectSampleImage(key: string) {
  if (!SAMPLE_IMAGES[key]) return;
  currentUploadedPhoto = SAMPLE_IMAGES[key];
  const labels: Record<string, string> = { pump: '펌프점검 샘플', led: 'LED센서등 샘플', panel: '배전반 샘플', cctv: 'CCTV보수 샘플' };
  showPhotoPreview(currentUploadedPhoto, labels[key] || '샘플 이미지');
}

function showPhotoPreview(src: string, label: string) {
  (document.getElementById('photoPreviewImg') as HTMLImageElement).src = src;
  document.getElementById('photoCaptionTag')!.textContent = label;
  document.getElementById('photoPreviewBox')?.classList.remove('hidden');
}

function clearPhoto() {
  currentUploadedPhoto = '';
  (document.getElementById('logPhotoInput') as HTMLInputElement).value = '';
  document.getElementById('photoPreviewBox')?.classList.add('hidden');
}

async function submitWorkLog(e: Event) {
  e.preventDefault();
  if (!state.selectedWorkerId) {
    showToast('상단 선택창에서 작업자(본인 이름)를 먼저 선택하세요!', 'error');
    document.getElementById('workerSelect')?.focus();
    return;
  }
  if (!currentUser) return;

  const date = (document.getElementById('logDate') as HTMLInputElement).value;
  const location = (document.getElementById('logLocation') as HTMLInputElement).value.trim();
  const content = (document.getElementById('logContent') as HTMLTextAreaElement).value.trim();
  if (!date || !location || !content) return;

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const newId = 'log-' + Date.now();

  try {
    await setDoc(getDocRef('logs', newId), {
      id: newId,
      workerId: state.selectedWorkerId,
      date,
      location,
      content,
      photo: currentUploadedPhoto || '',
      createdAt: timeStr,
      timestamp: Date.now()
    });

    (document.getElementById('logLocation') as HTMLInputElement).value = '';
    (document.getElementById('logContent') as HTMLTextAreaElement).value = '';
    clearPhoto();
    showToast('작업일지가 등록되어 전 직원에게 실시간 공유되었습니다.', 'success');
    switchTab('logs');
  } catch (err) {
    console.error(err);
    showToast('작업일지 등록 중 오류가 발생했습니다.', 'error');
  }
}

function setWorkerFilter(workerId: string) {
  state.filterWorkerId = workerId;
  renderFilterChips();
  renderLogs();
}

function setLogViewMode(mode: string) {
  state.logViewMode = mode;
  ['LIST', 'CALENDAR'].forEach(m => {
    const btn = document.getElementById(`logViewBtn-${m}`);
    if (!btn) return;
    if (m === mode) {
      btn.className = 'py-2 px-2 rounded-lg bg-brand-600 text-white font-extrabold shadow-xs transition flex items-center justify-center gap-1.5';
    } else {
      btn.className = 'py-2 px-2 rounded-lg text-slate-600 hover:text-slate-900 font-bold transition flex items-center justify-center gap-1.5';
    }
  });

  const calWrap = document.getElementById('logCalendarWrapper');
  if (mode === 'CALENDAR') {
    calWrap?.classList.remove('hidden');
    if (!state.calendarSelectedDate) {
      state.calendarSelectedDate = getTodayString();
      const [y, m] = state.calendarSelectedDate.split('-').map(Number);
      state.calendarYear = y;
      state.calendarMonth = m - 1;
    }
  } else {
    calWrap?.classList.add('hidden');
  }
  renderLogs();
}

function changeCalendarMonth(delta: number) {
  state.calendarMonth += delta;
  if (state.calendarMonth < 0) {
    state.calendarMonth = 11;
    state.calendarYear -= 1;
  } else if (state.calendarMonth > 11) {
    state.calendarMonth = 0;
    state.calendarYear += 1;
  }
  renderLogs();
}

function goCalendarToday() {
  const today = getTodayString();
  const [y, m] = today.split('-').map(Number);
  state.calendarYear = y;
  state.calendarMonth = m - 1;
  state.calendarSelectedDate = today;
  renderLogs();
}

function selectCalendarDate(dateStr: string) {
  state.calendarSelectedDate = (state.calendarSelectedDate === dateStr) ? '' : dateStr;
  renderLogs();
}

function clearCalendarSelectedDate() {
  state.calendarSelectedDate = '';
  renderLogs();
}

function renderLogCalendar(baseFilteredLogs: any[]) {
  const grid = document.getElementById('calendarGrid');
  const titleEl = document.getElementById('calendarMonthTitle');
  const labelEl = document.getElementById('calendarSelectedDateLabel');
  const clearBtn = document.getElementById('calendarClearDateBtn');
  if (!grid || !titleEl) return;

  const year = state.calendarYear;
  const month = state.calendarMonth;
  titleEl.textContent = `${year}년 ${month + 1}월`;

  const countByDate: Record<string, number> = {};
  baseFilteredLogs.forEach(l => {
    if (l.date) countByDate[l.date] = (countByDate[l.date] || 0) + 1;
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = getTodayString();

  let cellsHtml = '';
  for (let i = 0; i < firstDay; i++) {
    cellsHtml += `<div class="h-12 sm:h-14 rounded-xl bg-slate-50/50"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateStr = `${year}-${mm}-${dd}`;
    const count = countByDate[dateStr] || 0;
    const isSelected = state.calendarSelectedDate === dateStr;
    const isToday = todayStr === dateStr;
    const dow = (firstDay + day - 1) % 7;

    let numColor = 'text-slate-700';
    if (dow === 0) numColor = 'text-rose-500';
    else if (dow === 6) numColor = 'text-blue-600';
    if (isSelected) numColor = 'text-white';

    const boxClass = isSelected
      ? 'bg-brand-600 text-white border-brand-600 shadow-sm ring-2 ring-brand-200'
      : (count > 0
          ? 'bg-brand-50/70 hover:bg-brand-100/70 border-brand-200 text-slate-800'
          : 'bg-white hover:bg-slate-50 border-slate-100 text-slate-600');

    cellsHtml += `
      <button type="button" onclick="selectCalendarDate('${dateStr}')" class="h-12 sm:h-14 rounded-xl border p-1 flex flex-col items-center justify-between transition ${boxClass}">
        <span class="text-[11px] sm:text-xs font-extrabold ${numColor} ${isToday && !isSelected ? 'underline decoration-brand-600 decoration-2' : ''}">${day}</span>
        ${count > 0
          ? `<span class="px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-extrabold leading-tight ${isSelected ? 'bg-white text-brand-700' : 'bg-brand-600 text-white'}">${count}건</span>`
          : `<span class="h-3"></span>`
        }
      </button>
    `;
  }

  grid.innerHTML = cellsHtml;

  if (state.calendarSelectedDate) {
    if (labelEl) labelEl.innerHTML = `<i class="fa-solid fa-calendar-check text-brand-600 mr-1"></i>선택 날짜: <span class="text-brand-700">${state.calendarSelectedDate}</span>`;
    clearBtn?.classList.remove('hidden');
  } else {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    if (labelEl) labelEl.innerHTML = `<i class="fa-regular fa-calendar text-brand-600 mr-1"></i>${monthPrefix} 월 전체 내역 표시 중`;
    clearBtn?.classList.add('hidden');
  }
}

function renderFilterChips() {
  const container = document.getElementById('workerFilterChips');
  if (!container) return;
  let html = `
    <button onclick="setWorkerFilter('ALL')" class="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition ${state.filterWorkerId === 'ALL' ? 'bg-navy-800 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
      전체 직원
    </button>
  `;

  state.staff.forEach(s => {
    const active = state.filterWorkerId === s.id;
    html += `
      <button onclick="setWorkerFilter('${s.id}')" class="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition ${active ? 'bg-brand-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
        ${escapeHtml(s.name)}
      </button>
    `;
  });

  container.innerHTML = html;
}

function renderLogs() {
  const container = document.getElementById('logsContainer');
  const countBadge = document.getElementById('logCountBadge');
  if (!container) return;
  const keyword = ((document.getElementById('searchInput') as HTMLInputElement | null)?.value || '').trim().toLowerCase();

  const baseFiltered = state.logs.filter(log => {
    if (state.filterWorkerId !== 'ALL' && log.workerId !== state.filterWorkerId) return false;
    if (keyword) {
      const worker = state.staff.find(s => s.id === log.workerId);
      const workerName = worker ? `${worker.name} ${worker.role}` : '';
      const target = `${log.location} ${log.content} ${log.date} ${workerName}`.toLowerCase();
      if (!target.includes(keyword)) return false;
    }
    return true;
  });

  if (state.logViewMode === 'CALENDAR') {
    renderLogCalendar(baseFiltered);
  }

  const filtered = baseFiltered.filter(log => {
    if (state.logViewMode === 'CALENDAR') {
      if (state.calendarSelectedDate) {
        return log.date === state.calendarSelectedDate;
      }
      const monthPrefix = `${state.calendarYear}-${String(state.calendarMonth + 1).padStart(2, '0')}`;
      return (log.date || '').startsWith(monthPrefix);
    }
    return true;
  });

  if (countBadge) countBadge.textContent = `총 ${filtered.length}건`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 space-y-2">
        <i class="fa-regular fa-folder-open text-3xl text-slate-300"></i>
        <p class="text-sm font-medium text-slate-500">${state.logViewMode === 'CALENDAR' && state.calendarSelectedDate ? `${state.calendarSelectedDate}에 등록된 작업일지가 없습니다.` : '조회된 작업일지가 없습니다.'}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(log => {
    const worker = state.staff.find(s => s.id === log.workerId);
    const authorDisplay = worker ? `${worker.name} (${worker.role})` : '퇴사/미등록 직원';
    const isOwner = state.selectedWorkerId && state.selectedWorkerId === log.workerId;
    const canEdit = state.isAdmin || isOwner;
    const canDelete = state.isAdmin;

    return `
      <article class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 transition hover:border-slate-300 flex flex-col justify-between">
        <div class="space-y-2.5">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-8 h-8 rounded-full bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center font-bold text-xs shrink-0">
                ${worker ? escapeHtml(worker.name.slice(0, 1)) : '?'}
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-xs font-bold text-slate-800">${escapeHtml(authorDisplay)}</span>
                  ${isOwner ? '<span class="px-1.5 py-0.2 bg-brand-100 text-brand-800 text-[10px] font-bold rounded">내 기록</span>' : ''}
                </div>
                <span class="text-[11px] text-slate-400 block">${escapeHtml(log.date)} · ${escapeHtml(log.createdAt || '')}</span>
              </div>
            </div>

            <div class="flex items-center gap-1 shrink-0">
              ${canEdit ? `
                <button onclick="openEditModal('${log.id}')" class="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg text-[11px] font-semibold transition" title="수정">
                  <i class="fa-solid fa-pen"></i> 수정
                </button>
              ` : ''}
              ${canDelete ? `
                <button onclick="promptDeleteLog('${log.id}')" class="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[11px] font-semibold transition" title="삭제">
                  <i class="fa-solid fa-trash"></i>
                </button>
              ` : ''}
            </div>
          </div>

          <div class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">
            <i class="fa-solid fa-location-dot text-brand-600 text-[11px]"></i>
            <span>${escapeHtml(log.location)}</span>
          </div>

          <p class="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/70 p-3 rounded-xl border border-slate-100">${escapeHtml(log.content)}</p>
        </div>

        ${log.photo ? `
          <div class="pt-1">
            <img src="${log.photo}" alt="작업 사진" onclick="openLightbox('${log.photo}')" class="w-full h-44 object-cover rounded-xl border border-slate-200 cursor-zoom-in hover:opacity-95 transition">
          </div>
        ` : ''}
      </article>
    `;
  }).join('');
}

function openEditModal(logId: string) {
  const log = state.logs.find(l => l.id === logId);
  if (!log) return;

  (document.getElementById('editLogId') as HTMLInputElement).value = log.id;
  (document.getElementById('editLogDate') as HTMLInputElement).value = log.date;
  (document.getElementById('editLogLocation') as HTMLInputElement).value = log.location;
  (document.getElementById('editLogContent') as HTMLTextAreaElement).value = log.content;
  document.getElementById('editModal')?.classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('editModal')?.classList.add('hidden');
}

async function saveEditedLog(e: Event) {
  e.preventDefault();
  const id = (document.getElementById('editLogId') as HTMLInputElement).value;
  if (!currentUser) return;

  try {
    await updateDoc(getDocRef('logs', id), {
      date: (document.getElementById('editLogDate') as HTMLInputElement).value,
      location: (document.getElementById('editLogLocation') as HTMLInputElement).value.trim(),
      content: (document.getElementById('editLogContent') as HTMLTextAreaElement).value.trim()
    });
    closeEditModal();
    showToast('작업일지가 수정되었습니다.', 'success');
  } catch (err) {
    console.error(err);
    showToast('수정 중 오류가 발생했습니다.', 'error');
  }
}

function promptDeleteLog(logId: string) {
  openConfirmModal('작업일지 삭제', '선택한 작업일지를 영구 삭제하시겠습니까?', async () => {
    if (!currentUser) return;
    await deleteDoc(getDocRef('logs', logId));
    showToast('작업일지가 삭제되었습니다.', 'info');
  });
}

function setHandoverFilter(filter: string) {
  state.handoverFilter = filter;
  ['ALL', 'UNCONFIRMED', '전체공지'].forEach(f => {
    const btn = document.getElementById(`ho-filter-${f}`);
    if (!btn) return;
    if (f === filter) {
      btn.className = 'px-2.5 py-1.5 rounded-lg bg-navy-800 text-white font-bold transition whitespace-nowrap';
    } else {
      btn.className = 'px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 font-semibold transition whitespace-nowrap';
    }
  });
  renderHandovers();
}

async function submitHandover(e: Event) {
  e.preventDefault();
  if (!state.selectedWorkerId) {
    showToast('상단에서 작성자(본인 이름)를 먼저 선택해 주세요!', 'error');
    document.getElementById('workerSelect')?.focus();
    return;
  }
  if (!currentUser) return;

  const worker = state.staff.find(s => s.id === state.selectedWorkerId);
  const authorLabel = worker ? `${worker.name} (${worker.role})` : '미등록 직원';
  const type = (document.getElementById('handoverType') as HTMLSelectElement).value;
  const isImportant = (document.getElementById('handoverImportant') as HTMLInputElement).checked;
  const content = (document.getElementById('handoverContent') as HTMLTextAreaElement).value.trim();
  if (!content) return;

  const now = new Date();
  const timeStr = `${getTodayString()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const newId = 'ho-' + Date.now();

  try {
    await setDoc(getDocRef('handovers', newId), {
      id: newId,
      type,
      isImportant,
      author: authorLabel,
      content,
      createdAt: timeStr,
      timestamp: Date.now(),
      confirmedBy: null,
      confirmedAt: null
    });
    (document.getElementById('handoverContent') as HTMLTextAreaElement).value = '';
    (document.getElementById('handoverImportant') as HTMLInputElement).checked = false;
    showToast('공지 · 인수인계가 전 직원에게 공유되었습니다.', 'success');
  } catch (err) {
    console.error(err);
    showToast('등록 중 오류가 발생했습니다.', 'error');
  }
}

async function confirmHandover(id: string) {
  if (!state.selectedWorkerId) {
    showToast('인수 확인을 하려면 상단에서 본인 이름을 먼저 선택하세요!', 'error');
    document.getElementById('workerSelect')?.focus();
    return;
  }
  if (!currentUser) return;

  const worker = state.staff.find(s => s.id === state.selectedWorkerId);
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  try {
    await updateDoc(getDocRef('handovers', id), {
      confirmedBy: worker ? `${worker.name} (${worker.role})` : '확인자',
      confirmedAt: timeStr
    });
    showToast('인수인계 확인 서명이 기록되었습니다.', 'success');
  } catch (err) {
    console.error(err);
  }
}

function openEditHandoverModal(id: string) {
  const item = state.handovers.find(h => h.id === id);
  if (!item) return;
  (document.getElementById('editHoId') as HTMLInputElement).value = item.id;
  (document.getElementById('editHoType') as HTMLSelectElement).value = item.type;
  (document.getElementById('editHoImportant') as HTMLInputElement).checked = Boolean(item.isImportant);
  (document.getElementById('editHoContent') as HTMLTextAreaElement).value = item.content;
  document.getElementById('editHandoverModal')?.classList.remove('hidden');
}

function closeEditHandoverModal() {
  document.getElementById('editHandoverModal')?.classList.add('hidden');
}

async function saveHandoverEdit(e: Event) {
  e.preventDefault();
  const id = (document.getElementById('editHoId') as HTMLInputElement).value;
  if (!currentUser) return;

  try {
    await updateDoc(getDocRef('handovers', id), {
      type: (document.getElementById('editHoType') as HTMLSelectElement).value,
      isImportant: (document.getElementById('editHoImportant') as HTMLInputElement).checked,
      content: (document.getElementById('editHoContent') as HTMLTextAreaElement).value.trim()
    });
    closeEditHandoverModal();
    showToast('공지 · 인수인계 내용이 수정되었습니다.', 'success');
  } catch (err) {
    console.error(err);
    showToast('수정 중 오류가 발생했습니다.', 'error');
  }
}

function promptDeleteHandover(id: string) {
  openConfirmModal('공지 · 인수인계 삭제', '이 공지/인수인계 항목을 삭제하시겠습니까?', async () => {
    if (!currentUser) return;
    await deleteDoc(getDocRef('handovers', id));
    showToast('삭제되었습니다.', 'info');
  });
}

function updateUnconfirmedDot() {
  const dot = document.getElementById('unconfirmedDot');
  if (!dot) return;
  const hasUnconfirmed = state.handovers.some(h => h.type !== '전체공지' && !h.confirmedBy);
  if (hasUnconfirmed) dot.classList.remove('hidden');
  else dot.classList.add('hidden');
}

function renderHandovers() {
  const container = document.getElementById('handoverContainer');
  const countBadge = document.getElementById('handoverCountBadge');
  if (!container) return;

  const filtered = state.handovers.filter(h => {
    if (state.handoverFilter === 'UNCONFIRMED') return h.type !== '전체공지' && !h.confirmedBy;
    if (state.handoverFilter === '전체공지') return h.type === '전체공지';
    return true;
  });

  if (countBadge) countBadge.textContent = `총 ${filtered.length}건`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 space-y-2">
        <i class="fa-regular fa-clipboard text-3xl text-slate-300"></i>
        <p class="text-xs sm:text-sm font-medium text-slate-500">해당 조건의 공지 및 인수인계가 없습니다.</p>
      </div>
    `;
    return;
  }

  const currentWorker = state.staff.find(s => s.id === state.selectedWorkerId);
  const currentLabel = currentWorker ? `${currentWorker.name} (${currentWorker.role})` : '';

  container.innerHTML = filtered.map(h => {
    const isNotice = h.type === '전체공지';
    const isDayToNight = h.type === '주간→야간';
    const badgeStyle = isNotice
      ? 'bg-purple-100 text-purple-800 border-purple-200'
      : (isDayToNight ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-indigo-100 text-indigo-800 border-indigo-200');

    const isAuthor = currentLabel && h.author === currentLabel;
    const canEdit = state.isAdmin || isAuthor;
    const canDelete = state.isAdmin || isAuthor;

    return `
      <article class="bg-white border ${h.isImportant ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'} rounded-2xl p-4 shadow-sm space-y-2.5">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-1.5 flex-wrap">
            ${h.isImportant ? '<span class="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-md"><i class="fa-solid fa-thumbtack mr-1"></i>중요</span>' : ''}
            <span class="px-2 py-0.5 border text-[11px] font-bold rounded-md ${badgeStyle}">${escapeHtml(h.type)}</span>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            ${canEdit ? `
              <button onclick="openEditHandoverModal('${h.id}')" class="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg text-[11px] font-semibold transition">
                <i class="fa-solid fa-pen"></i> 수정
              </button>
            ` : ''}
            ${canDelete ? `
              <button onclick="promptDeleteHandover('${h.id}')" class="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[11px] font-semibold transition">
                <i class="fa-solid fa-trash"></i>
              </button>
            ` : ''}
          </div>
        </div>

        <p class="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line bg-slate-50 p-3 rounded-xl border border-slate-100">${escapeHtml(h.content)}</p>

        <div class="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <span>작성: <strong class="text-slate-700">${escapeHtml(h.author)}</strong></span>
          <span>${escapeHtml(h.createdAt || '')}</span>
        </div>

        ${!isNotice ? `
          <div class="pt-2 border-t border-slate-100">
            ${h.confirmedBy ? `
              <div class="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 rounded-xl text-xs font-semibold">
                <span><i class="fa-solid fa-circle-check text-emerald-600 mr-1.5"></i>인수 확인 완료: ${escapeHtml(h.confirmedBy)}</span>
                <span class="text-[11px] text-emerald-600">${escapeHtml(h.confirmedAt || '')}</span>
              </div>
            ` : `
              <button onclick="confirmHandover('${h.id}')" class="w-full py-2 bg-brand-50 hover:bg-brand-600 text-brand-700 hover:text-white border border-brand-300 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5">
                <i class="fa-solid fa-signature"></i> 다음 근무자 인수 확인 완료 체크
              </button>
            `}
          </div>
        ` : ''}
      </article>
    `;
  }).join('');
}

function toggleToolAddForm() {
  const form = document.getElementById('toolAddForm');
  if (form) form.classList.toggle('hidden');
}

function toggleToolPasteBox() {
  const box = document.getElementById('toolPasteBox');
  if (box) box.classList.toggle('hidden');
}

function extractToolsFromText(rawText: string) {
  const results: any[] = [];
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const ignoreHeaderRegex = /^(번호|연번|순번|no|품명|공구명|규격|보관위치|수량|비고|합계|총계|단가|금액|공급가액|부가세)$/i;

  lines.forEach(line => {
    let cols = line.split(/\t|\s*[,/|]\s*|\s{2,}/).map(c => c.trim()).filter(Boolean);
    if (cols.length === 0) return;

    if (/^\d+\.?$/.test(cols[0]) && cols.length > 1) {
      cols = cols.slice(1);
    }

    const firstCol = cols[0] || '';
    if (!firstCol || firstCol.length < 2 || ignoreHeaderRegex.test(firstCol)) return;

    let name = firstCol;
    let location = '기전실 공구함';
    let qty = '1개';
    let note = '';

    if (cols.length >= 2) {
      const qtyRegex = /^(\d+\s*(개|대|세트|set|ea|조|식|박스|통|본|자루)?)$/i;
      for (let i = 1; i < cols.length; i++) {
        const val = cols[i];
        if (qtyRegex.test(val) && qty === '1개') {
          qty = /^\d+$/.test(val) ? `${val}개` : val;
        } else if (location === '기전실 공구함' && /(실|함|창고|초소|사무소|벽면|선반|캐비닛|차량)/.test(val)) {
          location = val;
        } else if (location === '기전실 공구함' && i === 1 && !qtyRegex.test(val)) {
          location = val;
        } else {
          note = note ? `${note} ${val}` : val;
        }
      }
    } else {
      const inlineQty = name.match(/(\d+\s*(개|대|세트|set|ea|조|자루))$/i);
      if (inlineQty) {
        qty = inlineQty[1].replace(/\s+/g, '');
        name = name.replace(inlineQty[0], '').trim();
      }
    }

    if (!name || ignoreHeaderRegex.test(name)) return;

    results.push({
      checked: true,
      name: name.slice(0, 35),
      location: location.slice(0, 25),
      qty: qty.slice(0, 12),
      note: note.slice(0, 40)
    });
  });

  return results;
}

function showToolImportPreview(items: any[]) {
  if (!items || items.length === 0) {
    showToast('인식된 공구 목록이 없습니다. 품명이 포함된 사진이나 엑셀/텍스트를 사용해 주세요.', 'error');
    return;
  }
  state.pendingToolImports = items;
  document.getElementById('toolImportCountLabel')!.textContent = `총 ${items.length}개 공구 자동 추출됨 (수정 가능)`;
  document.getElementById('toolImportPreviewBox')?.classList.remove('hidden');
  renderToolImportPreviewList();
  showToast(`${items.length}개의 공구 항목을 추출했습니다!`, 'success');
}

function renderToolImportPreviewList() {
  const list = document.getElementById('toolImportPreviewList');
  if (!list) return;
  list.innerHTML = state.pendingToolImports.map((item, idx) => `
    <div class="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-200 text-[11px]">
      <input type="checkbox" ${item.checked ? 'checked' : ''} onchange="state.pendingToolImports[${idx}].checked = this.checked" class="w-3.5 h-3.5 text-brand-600 rounded shrink-0">
      <input type="text" value="${escapeHtml(item.name)}" placeholder="공구명" onchange="state.pendingToolImports[${idx}].name = this.value" class="flex-1 min-w-[110px] px-1.5 py-1 bg-white border border-slate-200 rounded font-bold text-slate-800">
      <input type="text" value="${escapeHtml(item.location)}" placeholder="보관위치" onchange="state.pendingToolImports[${idx}].location = this.value" class="w-28 px-1.5 py-1 bg-white border border-slate-200 rounded text-slate-700">
      <input type="text" value="${escapeHtml(item.qty)}" placeholder="수량" onchange="state.pendingToolImports[${idx}].qty = this.value" class="w-16 px-1.5 py-1 bg-white border border-slate-200 rounded text-center font-semibold text-teal-800">
    </div>
  `).join('');
}

function clearToolImportPreview() {
  state.pendingToolImports = [];
  document.getElementById('toolImportPreviewBox')?.classList.add('hidden');
  (document.getElementById('toolSmartFileInput') as HTMLInputElement).value = '';
}

function parseToolRawText() {
  const txt = (document.getElementById('toolPasteTextarea') as HTMLTextAreaElement).value.trim();
  if (!txt) {
    showToast('붙여넣기 칸에 공구 목록을 입력해 주세요.', 'error');
    return;
  }
  const extracted = extractToolsFromText(txt);
  showToolImportPreview(extracted);
}

async function handleToolSmartFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const loadingBox = document.getElementById('toolImportLoading');
  const loadingTxt = document.getElementById('toolImportLoadingText');
  loadingBox?.classList.remove('hidden');

  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    let extractedText = '';

    if (file.type.startsWith('image/')) {
      if (loadingTxt) loadingTxt.textContent = '공구 사진·영수증에서 한국어 글자를 인식하고 있습니다 (약 3~8초 소요)...';
      const result = await Tesseract.recognize(file, 'kor+eng');
      extractedText = result.data.text || '';
    } else if (['xlsx', 'xls', 'csv'].includes(ext)) {
      if (loadingTxt) loadingTxt.textContent = '엑셀 파일 시트에서 공구 목록을 분석하고 있습니다...';
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      wb.SheetNames.forEach((sheetName: string) => {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });
        rows.forEach((r: any) => {
          if (Array.isArray(r) && r.length > 0) {
            extractedText += r.filter(v => v !== null && v !== undefined && String(v).trim() !== '').join('\t') + '\n';
          }
        });
      });
    } else if (ext === 'pdf') {
      if (loadingTxt) loadingTxt.textContent = 'PDF 문서에서 공구 목록을 추출하고 있습니다...';
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        extractedText += content.items.map((it: any) => it.str).join(' ') + '\n';
      }
    } else if (ext === 'docx') {
      if (loadingTxt) loadingTxt.textContent = '워드(.docx) 문서를 읽고 있습니다...';
      const buf = await file.arrayBuffer();
      const res = await mammoth.extractRawText({ arrayBuffer: buf });
      extractedText = res.value || '';
    } else if (ext === 'hwp') {
      loadingBox?.classList.add('hidden');
      document.getElementById('toolPasteBox')?.classList.remove('hidden');
      showToast('한글(.hwp) 파일은 한글 프로그램에서 공구 표를 복사(Ctrl+C)해 위 칸에 붙여넣어 주세요!', 'info');
      return;
    } else {
      extractedText = await file.text();
    }

    const extracted = extractToolsFromText(extractedText);
    showToolImportPreview(extracted);
  } catch (err) {
    console.error('Tool file parse error:', err);
    showToast('파일을 읽는 중 오류가 발생했습니다. 텍스트 복사 붙여넣기를 이용해 주세요.', 'error');
  } finally {
    loadingBox?.classList.add('hidden');
  }
}

async function confirmBatchToolImport() {
  if (!currentUser) return;
  const selected = state.pendingToolImports.filter(i => i.checked && i.name);
  if (selected.length === 0) {
    showToast('등록할 공구를 1개 이상 선택해 주세요.', 'error');
    return;
  }

  const baseOrder = state.tools.length > 0 ? Math.max(...state.tools.map(t => t.order || 0)) + 1 : 1;

  try {
    for (let i = 0; i < selected.length; i++) {
      const item = selected[i];
      const newId = 'tl-' + Date.now() + '-' + i;
      await setDoc(getDocRef('tools', newId), {
        id: newId,
        name: item.name.trim(),
        location: (item.location || '기전실 공구함').trim(),
        qty: (item.qty || '1개').trim(),
        note: (item.note || '').trim(),
        status: 'AVAILABLE',
        rentedBy: '',
        rentedAt: '',
        rentedPlace: '',
        order: baseOrder + i
      });
    }
    clearToolImportPreview();
    toggleToolAddForm();
    showToast(`${selected.length}개 공구가 대장에 일괄 등록되었습니다!`, 'success');
  } catch (err) {
    console.error(err);
    showToast('공구 일괄 등록 중 오류가 발생했습니다.', 'error');
  }
}

function updateRentedToolsDot() {
  const dot = document.getElementById('rentedToolsDot');
  if (!dot) return;
  const hasRented = state.tools.some(t => t.status === 'RENTED');
  if (hasRented) dot.classList.remove('hidden');
  else dot.classList.add('hidden');
}

function setToolFilter(filter: string) {
  state.toolFilter = filter;
  ['ALL', 'AVAILABLE', 'RENTED', 'REPAIR'].forEach(f => {
    const btn = document.getElementById(`tool-filter-${f}`);
    if (!btn) return;
    if (f === filter) {
      btn.className = 'px-2.5 py-1.5 rounded-lg bg-navy-800 text-white font-bold transition whitespace-nowrap';
    } else {
      btn.className = 'px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-semibold transition whitespace-nowrap';
    }
  });
  renderTools();
}

async function handleAddTool(e: Event) {
  e.preventDefault();
  if (!currentUser) return;
  const name = (document.getElementById('newToolName') as HTMLInputElement).value.trim();
  const location = (document.getElementById('newToolLocation') as HTMLInputElement).value.trim();
  const qty = (document.getElementById('newToolQty') as HTMLInputElement).value.trim();
  const note = (document.getElementById('newToolNote') as HTMLInputElement).value.trim();
  if (!name || !location) return;

  const newId = 'tl-' + Date.now();
  const nextOrder = state.tools.length > 0 ? Math.max(...state.tools.map(t => t.order || 0)) + 1 : 1;

  try {
    await setDoc(getDocRef('tools', newId), {
      id: newId,
      name,
      location,
      qty: qty || '1개',
      note,
      status: 'AVAILABLE',
      rentedBy: '',
      rentedAt: '',
      rentedPlace: '',
      order: nextOrder
    });
    (document.getElementById('newToolName') as HTMLInputElement).value = '';
    (document.getElementById('newToolLocation') as HTMLInputElement).value = '';
    (document.getElementById('newToolQty') as HTMLInputElement).value = '1세트';
    (document.getElementById('newToolNote') as HTMLInputElement).value = '';
    toggleToolAddForm();
    showToast('신규 공구가 공구 대장에 등록되었습니다.', 'success');
  } catch (err) {
    console.error(err);
    showToast('공구 등록 중 오류가 발생했습니다.', 'error');
  }
}

async function rentTool(toolId: string) {
  if (!state.selectedWorkerId) {
    showToast('공구를 대여하려면 상단에서 본인 이름을 먼저 선택하세요!', 'error');
    document.getElementById('workerSelect')?.focus();
    return;
  }
  if (!currentUser) return;

  const worker = state.staff.find(s => s.id === state.selectedWorkerId);
  const workerLabel = worker ? `${worker.name} (${worker.role})` : '미등록 직원';
  const now = new Date();
  const timeStr = `오늘 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const quickPlace = (document.getElementById('logLocation') as HTMLInputElement | null)?.value?.trim() || '단지 내 현장';

  try {
    await updateDoc(getDocRef('tools', toolId), {
      status: 'RENTED',
      rentedBy: workerLabel,
      rentedAt: timeStr,
      rentedPlace: quickPlace
    });
    showToast(`공구 현장 대여가 기록되었습니다. (${workerLabel})`, 'success');
  } catch (err) {
    console.error(err);
  }
}

async function returnTool(toolId: string) {
  if (!currentUser) return;
  try {
    await updateDoc(getDocRef('tools', toolId), {
      status: 'AVAILABLE',
      rentedBy: '',
      rentedAt: '',
      rentedPlace: ''
    });
    showToast('공구가 제자리에 반납 처리되었습니다.', 'success');
  } catch (err) {
    console.error(err);
  }
}

async function toggleToolRepair(toolId: string) {
  if (!currentUser) return;
  const tool = state.tools.find(t => t.id === toolId);
  if (!tool) return;
  const nextStatus = tool.status === 'REPAIR' ? 'AVAILABLE' : 'REPAIR';
  try {
    await updateDoc(getDocRef('tools', toolId), {
      status: nextStatus,
      rentedBy: '',
      rentedAt: '',
      rentedPlace: ''
    });
    showToast(nextStatus === 'REPAIR' ? '수리/점검 중 상태로 변경되었습니다.' : '정상 비치 중으로 복구되었습니다.', 'info');
  } catch (err) {
    console.error(err);
  }
}

function promptDeleteTool(toolId: string) {
  openConfirmModal('공구 삭제', '이 공구를 대장에서 삭제하시겠습니까?', async () => {
    if (!currentUser) return;
    await deleteDoc(getDocRef('tools', toolId));
    showToast('공구가 삭제되었습니다.', 'info');
  });
}

function renderTools() {
  const container = document.getElementById('toolsContainer');
  if (!container) return;

  const totalEl = document.getElementById('toolTotalCount');
  const availEl = document.getElementById('toolAvailableCount');
  const rentedEl = document.getElementById('toolRentedCount');

  if (totalEl) totalEl.textContent = `${state.tools.length}종`;
  if (availEl) availEl.textContent = `${state.tools.filter(t => t.status === 'AVAILABLE').length}종`;
  if (rentedEl) rentedEl.textContent = `${state.tools.filter(t => t.status === 'RENTED').length}종`;

  const keyword = ((document.getElementById('toolSearchInput') as HTMLInputElement | null)?.value || '').trim().toLowerCase();

  const filtered = state.tools.filter(t => {
    if (state.toolFilter !== 'ALL' && t.status !== state.toolFilter) return false;
    if (keyword) {
      const hay = `${t.name} ${t.location} ${t.note || ''} ${t.rentedBy || ''} ${t.rentedPlace || ''}`.toLowerCase();
      if (!hay.includes(keyword)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 space-y-2">
        <i class="fa-solid fa-toolbox text-3xl text-slate-300"></i>
        <p class="text-xs sm:text-sm font-medium text-slate-500">해당 조건의 공구가 없습니다.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(t => {
    const isAvailable = t.status === 'AVAILABLE';
    const isRented = t.status === 'RENTED';

    let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
    let badgeText = '비치 중';
    if (isRented) {
      badgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
      badgeText = '현장 대여중';
    } else if (t.status === 'REPAIR') {
      badgeClass = 'bg-rose-100 text-rose-800 border-rose-200';
      badgeText = '수리/점검중';
    }

    return `
      <article class="bg-white border ${isRented ? 'border-amber-300' : 'border-slate-200'} rounded-2xl p-4 shadow-sm space-y-2.5 flex flex-col justify-between">
        <div class="space-y-2">
          <div class="flex items-start justify-between gap-2">
            <div class="space-y-1 min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="px-2 py-0.5 border text-[10px] font-extrabold rounded-md ${badgeClass}">${badgeText}</span>
                <span class="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">${escapeHtml(t.qty || '1개')}</span>
              </div>
              <h4 class="text-sm font-extrabold text-slate-800">${escapeHtml(t.name)}</h4>
            </div>

            <div class="flex items-center gap-1 shrink-0">
              <button type="button" onclick="toggleToolRepair('${t.id}')" class="px-2 py-1 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg text-[10px] font-semibold transition" title="수리/점검 상태 전환">
                <i class="fa-solid fa-screwdriver-wrench"></i>
              </button>
              ${state.isAdmin ? `
                <button type="button" onclick="promptDeleteTool('${t.id}')" class="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[10px] font-semibold transition" title="삭제">
                  <i class="fa-solid fa-trash"></i>
                </button>
              ` : ''}
            </div>
          </div>

          <div class="text-xs text-slate-600 flex items-center gap-1.5 flex-wrap">
            <span class="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md font-medium">
              <i class="fa-solid fa-location-dot text-brand-600 text-[10px]"></i> 보관: ${escapeHtml(t.location)}
            </span>
            ${t.note ? `<span class="text-[11px] text-slate-400">· ${escapeHtml(t.note)}</span>` : ''}
          </div>

          ${isRented ? `
            <div class="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-900 flex items-center justify-between gap-2">
              <div>
                <span class="font-bold block"><i class="fa-solid fa-user-clock mr-1 text-amber-600"></i>사용자: ${escapeHtml(t.rentedBy)}</span>
                <span class="text-[11px] text-amber-700">${escapeHtml(t.rentedAt)} · ${escapeHtml(t.rentedPlace || '현장 사용')}</span>
              </div>
            </div>
          ` : ''}
        </div>

        <div class="pt-1">
          ${isAvailable ? `
            <button type="button" onclick="rentTool('${t.id}')" class="w-full py-2 bg-brand-50 hover:bg-brand-600 text-brand-700 hover:text-white border border-brand-300 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-hand-holding"></i> 현장 대여하기 (내 이름으로 반출)
            </button>
          ` : isRented ? `
            <button type="button" onclick="returnTool('${t.id}')" class="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-rotate-left"></i> 작업 완료 · 제자리 반납
            </button>
          ` : `
            <button type="button" onclick="toggleToolRepair('${t.id}')" class="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl text-xs transition">
              수리/점검 완료 후 비치 복귀
            </button>
          `}
        </div>
      </article>
    `;
  }).join('');
}

function downloadToolsCSV() {
  if (state.tools.length === 0) {
    showToast('내보낼 공구 데이터가 없습니다.', 'error');
    return;
  }
  const headers = ['공구명', '보관위치', '보유수량', '현재상태', '대여자', '대여시간', '비고'];
  const statusMap: Record<string, string> = { AVAILABLE: '비치중', RENTED: '대여중', REPAIR: '수리/점검중' };
  const rows = state.tools.map(t => [
    `"${(t.name || '').replace(/"/g, '""')}"`,
    `"${(t.location || '').replace(/"/g, '""')}"`,
    `"${(t.qty || '').replace(/"/g, '""')}"`,
    `"${statusMap[t.status] || t.status}"`,
    `"${(t.rentedBy || '').replace(/"/g, '""')}"`,
    `"${(t.rentedAt || '').replace(/"/g, '""')}"`,
    `"${(t.note || '').replace(/"/g, '""')}"`
  ]);
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `호려울마을7단지_공구대장_${getTodayString()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('공구 관리 대장 엑셀(CSV) 다운로드 완료!', 'success');
}

function toggleVendorAddForm() {
  const form = document.getElementById('vendorAddForm');
  if (form) form.classList.toggle('hidden');
}

function toggleVendorPasteBox() {
  const box = document.getElementById('vendorPasteBox');
  if (box) box.classList.toggle('hidden');
}

function guessVendorCategory(text: string) {
  if (/승강기|엘리베이터|에스컬레이터|오티스|티센|현대엘|미쓰비시/.test(text)) return '승강기';
  if (/설비|배관|누수|보일러|펌프|방수|언수도|하수|위생|난방/.test(text)) return '설비·배관';
  if (/전기|소방|변압기|발전기|조명|led|화재|수신기|경보|감지기/.test(text)) return '전기·소방';
  if (/인터폰|통신|월패드|로비폰|cctv|차단기|주차관제|출입/.test(text)) return '인터폰·통신';
  return '세대수리·기타';
}

function extractVendorsFromText(rawText: string) {
  const results: any[] = [];
  const seenPhones = new Set<string>();
  const lines = rawText.split(/\r?\n|\t|\s{2,}/).map(l => l.trim()).filter(Boolean);
  const phoneRegex = /(01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}|0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}|1[568]\d{2}[-.\s]?\d{4})/g;

  lines.forEach((line, idx) => {
    const matches = line.match(phoneRegex);
    if (!matches) return;

    matches.forEach(rawPhone => {
      const cleanPhone = rawPhone.replace(/\s+/g, '-').replace(/\.+/g, '-');
      if (seenPhones.has(cleanPhone)) return;
      seenPhones.add(cleanPhone);

      let rest = line.replace(rawPhone, ' ').replace(/[|/:()[\]]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!rest && idx > 0 && !lines[idx - 1].match(phoneRegex)) {
        rest = lines[idx - 1].replace(/[|/:()[\]]/g, ' ').trim();
      }

      let name = '미확인 수리업체';
      let manager = '';
      let note = '';

      if (rest) {
        const tokens = rest.split(' ').filter(Boolean);
        name = tokens[0];
        if (tokens.length > 1 && tokens[1].length <= 6 && /(사장|부장|과장|소장|기사|대표|팀장|님|실장)/.test(tokens[1])) {
          manager = tokens[1];
          note = tokens.slice(2).join(' ');
        } else {
          note = tokens.slice(1).join(' ');
        }
      }

      results.push({
        checked: true,
        scope: /세대|도어락|열쇠|변기|싱크대|방충망|보일러/.test(rest) ? '세대' : '공용',
        category: guessVendorCategory(rest),
        name: name.slice(0, 24),
        phone: cleanPhone,
        manager: manager.slice(0, 15),
        note: note.slice(0, 40)
      });
    });
  });

  return results;
}

function showVendorImportPreview(items: any[]) {
  if (!items || items.length === 0) {
    showToast('인식된 전화번호/업체 정보가 없습니다. 글자가 선명한 파일이나 텍스트를 사용해 주세요.', 'error');
    return;
  }
  state.pendingVendorImports = items;
  document.getElementById('vendorImportCountLabel')!.textContent = `총 ${items.length}개 업체 자동 추출됨 (수정 가능)`;
  document.getElementById('vendorImportPreviewBox')?.classList.remove('hidden');
  renderVendorImportPreviewList();
  showToast(`${items.length}개의 업체 연락처를 추출했습니다!`, 'success');
}

function renderVendorImportPreviewList() {
  const list = document.getElementById('vendorImportPreviewList');
  if (!list) return;
  list.innerHTML = state.pendingVendorImports.map((item, idx) => `
    <div class="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-200 text-[11px]">
      <input type="checkbox" ${item.checked ? 'checked' : ''} onchange="state.pendingVendorImports[${idx}].checked = this.checked" class="w-3.5 h-3.5 text-indigo-600 rounded shrink-0">
      <select onchange="state.pendingVendorImports[${idx}].scope = this.value" class="px-1 py-1 bg-white border border-slate-200 rounded text-[10px] font-extrabold text-indigo-700 shrink-0">
        <option value="공용" ${item.scope === '공용' ? 'selected' : ''}>🏢공용</option>
        <option value="세대" ${item.scope === '세대' ? 'selected' : ''}>🏠세대</option>
      </select>
      <select onchange="state.pendingVendorImports[${idx}].category = this.value" class="px-1 py-1 bg-white border border-slate-200 rounded text-[10px] font-bold shrink-0">
        <option value="승강기" ${item.category === '승강기' ? 'selected' : ''}>승강기</option>
        <option value="설비·배관" ${item.category === '설비·배관' ? 'selected' : ''}>설비·배관</option>
        <option value="전기·소방" ${item.category === '전기·소방' ? 'selected' : ''}>전기·소방</option>
        <option value="인터폰·통신" ${item.category === '인터폰·통신' ? 'selected' : ''}>인터폰</option>
        <option value="세대수리·기타" ${item.category === '세대수리·기타' ? 'selected' : ''}>기타</option>
      </select>
      <input type="text" value="${escapeHtml(item.name)}" onchange="state.pendingVendorImports[${idx}].name = this.value" class="w-24 px-1.5 py-1 bg-white border border-slate-200 rounded font-bold text-slate-800">
      <input type="text" value="${escapeHtml(item.phone)}" onchange="state.pendingVendorImports[${idx}].phone = this.value" class="flex-1 min-w-[100px] px-1.5 py-1 bg-white border border-slate-200 rounded text-slate-700">
    </div>
  `).join('');
}

function clearVendorImportPreview() {
  state.pendingVendorImports = [];
  document.getElementById('vendorImportPreviewBox')?.classList.add('hidden');
  (document.getElementById('vendorSmartFileInput') as HTMLInputElement).value = '';
}

function parseVendorRawText() {
  const txt = (document.getElementById('vendorPasteTextarea') as HTMLTextAreaElement).value.trim();
  if (!txt) {
    showToast('붙여넣기 칸에 연락처 내용을 입력해 주세요.', 'error');
    return;
  }
  const extracted = extractVendorsFromText(txt);
  showVendorImportPreview(extracted);
}

async function handleVendorSmartFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const loadingBox = document.getElementById('vendorImportLoading');
  const loadingTxt = document.getElementById('vendorImportLoadingText');
  loadingBox?.classList.remove('hidden');

  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    let extractedText = '';

    if (file.type.startsWith('image/')) {
      if (loadingTxt) loadingTxt.textContent = '사진/명함에서 한국어 글자를 인식하고 있습니다 (약 3~8초 소요)...';
      const result = await Tesseract.recognize(file, 'kor+eng');
      extractedText = result.data.text || '';
    } else if (['xlsx', 'xls', 'csv'].includes(ext)) {
      if (loadingTxt) loadingTxt.textContent = '엑셀 파일 시트를 분석하고 있습니다...';
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      wb.SheetNames.forEach((sheetName: string) => {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });
        rows.forEach((r: any) => {
          if (Array.isArray(r) && r.length > 0) {
            extractedText += r.filter(Boolean).join(' ') + '\n';
          }
        });
      });
    } else if (ext === 'pdf') {
      if (loadingTxt) loadingTxt.textContent = 'PDF 문서에서 텍스트를 추출하고 있습니다...';
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        extractedText += content.items.map((it: any) => it.str).join(' ') + '\n';
      }
    } else if (ext === 'docx') {
      if (loadingTxt) loadingTxt.textContent = '워드(.docx) 문서를 읽고 있습니다...';
      const buf = await file.arrayBuffer();
      const res = await mammoth.extractRawText({ arrayBuffer: buf });
      extractedText = res.value || '';
    } else if (ext === 'hwp') {
      loadingBox?.classList.add('hidden');
      document.getElementById('vendorPasteBox')?.classList.remove('hidden');
      showToast('한글(.hwp) 전용 바이너리는 한글 프로그램에서 표를 복사(Ctrl+C)해 위 칸에 붙여넣어 주세요!', 'info');
      return;
    } else {
      extractedText = await file.text();
    }

    const extracted = extractVendorsFromText(extractedText);
    showVendorImportPreview(extracted);
  } catch (err) {
    console.error('File parse error:', err);
    showToast('파일을 읽는 중 오류가 발생했습니다. 텍스트 복사 붙여넣기를 이용해 주세요.', 'error');
  } finally {
    loadingBox?.classList.add('hidden');
  }
}

async function confirmBatchVendorImport() {
  if (!currentUser) return;
  const selected = state.pendingVendorImports.filter(i => i.checked && i.name && i.phone);
  if (selected.length === 0) {
    showToast('등록할 업체를 1개 이상 선택해 주세요.', 'error');
    return;
  }

  const baseOrder = state.vendors.length > 0 ? Math.max(...state.vendors.map(v => v.order || 0)) + 1 : 1;

  try {
    for (let i = 0; i < selected.length; i++) {
      const item = selected[i];
      const newId = 'vd-' + Date.now() + '-' + i;
      await setDoc(getDocRef('vendors', newId), {
        id: newId,
        scope: item.scope || '공용',
        category: item.category || '세대수리·기타',
        name: item.name.trim(),
        phone: item.phone.trim(),
        manager: (item.manager || '').trim(),
        note: (item.note || '').trim(),
        isFavorite: false,
        order: baseOrder + i
      });
    }
    clearVendorImportPreview();
    toggleVendorAddForm();
    showToast(`${selected.length}개 수리업체가 일괄 등록되었습니다!`, 'success');
  } catch (err) {
    console.error(err);
    showToast('일괄 등록 중 오류가 발생했습니다.', 'error');
  }
}

function setVendorScope(scope: string) {
  state.vendorScopeFilter = scope;
  ['ALL', '공용', '세대'].forEach(s => {
    const btn = document.getElementById(`vscope-${s}`);
    if (!btn) return;
    if (s === scope) {
      btn.className = 'py-2 px-1 rounded-lg bg-brand-600 text-white font-extrabold shadow-xs transition';
    } else {
      btn.className = 'py-2 px-1 rounded-lg text-slate-600 hover:text-slate-900 font-bold transition';
    }
  });
  renderVendors();
}

function setVendorCategory(cat: string) {
  state.vendorCategoryFilter = cat;
  ['ALL', '승강기', '설비·배관', '전기·소방', '인터폰·통신', '세대수리·기타'].forEach(c => {
    const btn = document.getElementById(`vcat-${c}`);
    if (!btn) return;
    if (c === cat) {
      btn.className = 'shrink-0 px-2.5 py-1.5 rounded-lg bg-navy-800 text-white font-bold transition';
    } else {
      btn.className = 'shrink-0 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-semibold transition';
    }
  });
  renderVendors();
}

async function handleAddVendor(e: Event) {
  e.preventDefault();
  if (!currentUser) return;
  const scope = (document.getElementById('newVendorScope') as HTMLSelectElement).value;
  const category = (document.getElementById('newVendorCategory') as HTMLSelectElement).value;
  const name = (document.getElementById('newVendorName') as HTMLInputElement).value.trim();
  const phone = (document.getElementById('newVendorPhone') as HTMLInputElement).value.trim();
  const manager = (document.getElementById('newVendorManager') as HTMLInputElement).value.trim();
  const note = (document.getElementById('newVendorNote') as HTMLInputElement).value.trim();
  if (!name || !phone) return;

  const newId = 'vd-' + Date.now();
  const nextOrder = state.vendors.length > 0 ? Math.max(...state.vendors.map(v => v.order || 0)) + 1 : 1;

  try {
    await setDoc(getDocRef('vendors', newId), {
      id: newId,
      scope,
      category,
      name,
      phone,
      manager,
      note,
      isFavorite: false,
      order: nextOrder
    });
    (document.getElementById('newVendorName') as HTMLInputElement).value = '';
    (document.getElementById('newVendorPhone') as HTMLInputElement).value = '';
    (document.getElementById('newVendorManager') as HTMLInputElement).value = '';
    (document.getElementById('newVendorNote') as HTMLInputElement).value = '';
    toggleVendorAddForm();
    showToast('수리업체 연락처가 등록되었습니다.', 'success');
  } catch (err) {
    console.error(err);
    showToast('업체 등록 중 오류가 발생했습니다.', 'error');
  }
}

async function toggleVendorFavorite(vendorId: string) {
  if (!currentUser) return;
  const v = state.vendors.find(item => item.id === vendorId);
  if (!v) return;
  try {
    await updateDoc(getDocRef('vendors', vendorId), {
      isFavorite: !v.isFavorite
    });
    showToast(!v.isFavorite ? '자주 찾는 업체(상단 고정)로 지정되었습니다.' : '즐겨찾기가 해제되었습니다.', 'info');
  } catch (err) {
    console.error(err);
  }
}

function copyVendorInfo(name: string, phone: string) {
  const textToCopy = `[호려울마을 7단지 안내] ${name} : ${phone}`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(textToCopy).catch(() => {
      const tempInput = document.createElement('textarea');
      tempInput.value = textToCopy;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
    });
  } else {
    const tempInput = document.createElement('textarea');
    tempInput.value = textToCopy;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
  }
  showToast(`복사 완료: ${name} (${phone})`, 'success');
}

function promptDeleteVendor(vendorId: string) {
  openConfirmModal('수리업체 삭제', '이 업체 연락처를 목록에서 삭제하시겠습니까?', async () => {
    if (!currentUser) return;
    await deleteDoc(getDocRef('vendors', vendorId));
    showToast('업체 연락처가 삭제되었습니다.', 'info');
  });
}

function renderVendors() {
  const container = document.getElementById('vendorsContainer');
  const countBadge = document.getElementById('vendorTotalCountBadge');
  if (!container) return;

  const keyword = ((document.getElementById('vendorSearchInput') as HTMLInputElement | null)?.value || '').trim().toLowerCase();

  const filtered = state.vendors.filter(v => {
    const itemScope = v.scope || '공용';
    if (state.vendorScopeFilter !== 'ALL' && itemScope !== state.vendorScopeFilter) return false;
    if (state.vendorCategoryFilter !== 'ALL' && v.category !== state.vendorCategoryFilter) return false;
    if (keyword) {
      const hay = `${itemScope} ${v.name} ${v.category} ${v.phone} ${v.manager || ''} ${v.note || ''}`.toLowerCase();
      if (!hay.includes(keyword)) return false;
    }
    return true;
  });

  if (countBadge) {
    const scopeText = state.vendorScopeFilter === 'ALL' ? '전체' : `${state.vendorScopeFilter} 수리업체`;
    countBadge.textContent = `${scopeText} ${filtered.length}개 표시 중`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 space-y-2">
        <i class="fa-solid fa-address-book text-3xl text-slate-300"></i>
        <p class="text-xs sm:text-sm font-medium text-slate-500">해당 구분에 등록된 수리업체가 없습니다.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(v => {
    const telHref = `tel:${(v.phone || '').replace(/[^0-9+]/g, '')}`;
    const isUnit = (v.scope || '공용') === '세대';
    const scopeBadge = isUnit
      ? `<span class="px-2 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10px] font-extrabold rounded-md">🏠 세대 (입주민안내)</span>`
      : `<span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold rounded-md">🏢 공용 (관리소)</span>`;

    return `
      <article class="bg-white border ${v.isFavorite ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'} rounded-2xl p-4 shadow-sm space-y-2.5 flex flex-col justify-between">
        <div class="space-y-2">
          <div class="flex items-start justify-between gap-2">
            <div class="space-y-1 flex-1 min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                ${scopeBadge}
                <span class="px-2 py-0.5 bg-brand-50 text-brand-800 border border-brand-200 text-[10px] font-bold rounded-md">${escapeHtml(v.category)}</span>
                ${v.manager ? `<span class="text-[11px] font-semibold text-slate-500 break-words">${escapeHtml(v.manager)}</span>` : ''}
              </div>
              <h4 class="text-sm font-extrabold text-slate-800 break-words leading-snug">${escapeHtml(v.name)}</h4>
            </div>

            <div class="flex items-center gap-1 shrink-0">
              <button type="button" onclick="toggleVendorFavorite('${v.id}')" class="w-8 h-8 rounded-lg ${v.isFavorite ? 'bg-amber-100 text-amber-500' : 'bg-slate-100 text-slate-400 hover:text-amber-500'} flex items-center justify-center transition" title="즐겨찾기 상단 고정">
                <i class="fa-solid fa-star text-xs"></i>
              </button>
              ${state.isAdmin ? `
                <button type="button" onclick="promptDeleteVendor('${v.id}')" class="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition" title="삭제">
                  <i class="fa-solid fa-trash text-xs"></i>
                </button>
              ` : ''}
            </div>
          </div>

          ${v.note ? `<p class="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 break-words leading-relaxed">${escapeHtml(v.note)}</p>` : ''}
        </div>

        <div class="grid grid-cols-3 gap-2 pt-1">
          <a href="${telHref}" class="col-span-2 py-2.5 px-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center justify-center gap-1.5 break-all text-center">
            <i class="fa-solid fa-phone shrink-0"></i> <span>${escapeHtml(v.phone)}</span>
          </a>
          <button type="button" onclick="copyVendorInfo('${escapeHtml(v.name)}', '${escapeHtml(v.phone)}')" class="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1 whitespace-nowrap">
            <i class="fa-regular fa-copy"></i> 번호복사
          </button>
        </div>
      </article>
    `;
  }).join('');
}

async function sendChatMessage(text: string) {
  if (!state.selectedWorkerId) {
    showToast('채팅을 보내려면 상단에서 본인 이름을 먼저 선택하세요!', 'error');
    document.getElementById('workerSelect')?.focus();
    return;
  }
  if (!currentUser || !text.trim()) return;

  const worker = state.staff.find(s => s.id === state.selectedWorkerId);
  const senderName = worker ? `${worker.name} (${worker.role})` : '미등록 직원';
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const newId = 'chat-' + Date.now();

  try {
    await setDoc(getDocRef('chats', newId), {
      id: newId,
      senderId: state.selectedWorkerId,
      senderName,
      message: text.trim(),
      timeStr,
      timestamp: Date.now()
    });
  } catch (err) {
    console.error(err);
    showToast('메시지 전송에 실패했습니다.', 'error');
  }
}

async function submitChat(e: Event) {
  e.preventDefault();
  const input = document.getElementById('chatInput') as HTMLInputElement;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  await sendChatMessage(text);
}

async function sendQuickChat(phrase: string) {
  await sendChatMessage(phrase);
}

async function deleteChatMessage(chatId: string) {
  if (!currentUser) return;
  try {
    await deleteDoc(getDocRef('chats', chatId));
    showToast('메시지가 삭제되었습니다.', 'info');
  } catch (err) {
    console.error(err);
  }
}

function renderChats() {
  const container = document.getElementById('chatMessagesContainer');
  if (!container) return;

  if (state.chats.length === 0) {
    container.innerHTML = `
      <div class="h-full flex flex-col items-center justify-center text-slate-400 text-xs space-y-1">
        <i class="fa-regular fa-comments text-2xl text-slate-300"></i>
        <p>직원들과 첫 대화를 시작해 보세요.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.chats.map(c => {
    const isMe = state.selectedWorkerId && c.senderId === state.selectedWorkerId;
    const canDelete = state.isAdmin || isMe;

    if (isMe) {
      return `
        <div class="flex flex-col items-end space-y-1">
          <div class="flex items-end gap-1.5 max-w-[82%]">
            ${canDelete ? `<button onclick="deleteChatMessage('${c.id}')" class="text-[10px] text-slate-400 hover:text-red-500 pb-1" title="삭제"><i class="fa-solid fa-xmark"></i></button>` : ''}
            <span class="text-[10px] text-slate-400 pb-0.5 shrink-0">${escapeHtml(c.timeStr || '')}</span>
            <div class="bg-brand-600 text-white px-3.5 py-2 rounded-2xl rounded-tr-xs text-xs sm:text-sm leading-relaxed shadow-xs whitespace-pre-line break-words">
              ${escapeHtml(c.message)}
            </div>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="flex flex-col items-start space-y-1">
          <span class="text-[11px] font-bold text-slate-600 ml-1">${escapeHtml(c.senderName)}</span>
          <div class="flex items-end gap-1.5 max-w-[82%]">
            <div class="bg-white border border-slate-200 text-slate-800 px-3.5 py-2 rounded-2xl rounded-tl-xs text-xs sm:text-sm leading-relaxed shadow-xs whitespace-pre-line break-words">
              ${escapeHtml(c.message)}
            </div>
            <span class="text-[10px] text-slate-400 pb-0.5 shrink-0">${escapeHtml(c.timeStr || '')}</span>
            ${canDelete ? `<button onclick="deleteChatMessage('${c.id}')" class="text-[10px] text-slate-400 hover:text-red-500 pb-1" title="삭제"><i class="fa-solid fa-xmark"></i></button>` : ''}
          </div>
        </div>
      `;
    }
  }).join('');

  container.scrollTop = container.scrollHeight;
}

function renderHomeBanner() {
  const wrapper = document.getElementById('homeEventBannerWrapper');
  const card = document.getElementById('homeEventBannerCard');
  if (!wrapper || !card) return;

  if (!state.bannersEnabled || state.banners.length === 0) {
    wrapper.classList.add('hidden');
    return;
  }

  wrapper.classList.remove('hidden');
  const item = state.banners[state.bannerIndex] || state.banners[0];
  const style = BANNER_STYLES[item.category] || BANNER_STYLES.event;
  const total = state.banners.length;
  const formattedDateTime = formatBannerDateTime(item.date, item.time);

  card.className = `rounded-2xl p-3.5 shadow-sm border transition-all relative ${style.cardBg}`;
  card.innerHTML = `
    <div class="flex items-center justify-between gap-2 mb-1.5">
      <span class="px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-tight ${style.badgeBg}">
        ${style.badge}
      </span>
      ${total > 1 ? `
        <div class="flex items-center gap-1 text-[11px] font-bold ${style.subColor}">
          <button type="button" onclick="prevBanner()" class="w-5 h-5 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center">
            <i class="fa-solid fa-chevron-left text-[9px]"></i>
          </button>
          <span>${state.bannerIndex + 1} / ${total}</span>
          <button type="button" onclick="nextBanner()" class="w-5 h-5 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center">
            <i class="fa-solid fa-chevron-right text-[9px]"></i>
          </button>
        </div>
      ` : ''}
    </div>
    <h4 class="text-sm font-extrabold leading-snug ${style.titleColor}">${escapeHtml(item.title)}</h4>
    <div class="mt-1.5 space-y-0.5 text-xs font-semibold ${style.subColor}">
      ${formattedDateTime ? `<p><i class="fa-regular fa-calendar-check mr-1.5"></i>일시: ${escapeHtml(formattedDateTime)}</p>` : ''}
      ${item.location ? `<p><i class="fa-solid fa-location-dot mr-1.5"></i>장소: ${escapeHtml(item.location)}</p>` : ''}
    </div>
    ${item.desc ? `<p class="text-[11px] mt-1.5 leading-relaxed ${style.descColor}">${escapeHtml(item.desc)}</p>` : ''}
  `;
}

function prevBanner() {
  if (state.banners.length <= 1) return;
  state.bannerIndex = (state.bannerIndex - 1 + state.banners.length) % state.banners.length;
  renderHomeBanner();
}

function nextBanner() {
  if (state.banners.length <= 1) return;
  state.bannerIndex = (state.bannerIndex + 1) % state.banners.length;
  renderHomeBanner();
}

async function toggleBannerGlobal(enabled: boolean) {
  state.bannersEnabled = enabled;
  renderHomeBanner();
  if (!currentUser) return;
  try {
    await setDoc(getDocRef('settings', 'bannerConfig'), { enabled });
    showToast(enabled ? '첫 화면 배너가 켜졌습니다.' : '첫 화면 배너가 숨겨졌습니다.', 'info');
  } catch (err) {
    console.error(err);
  }
}

async function handleAddBanner(e: Event) {
  e.preventDefault();
  if (!currentUser) return;
  const category = (document.getElementById('bannerCategory') as HTMLSelectElement).value;
  const date = (document.getElementById('bannerDate') as HTMLInputElement).value;
  const time = (document.getElementById('bannerTime') as HTMLInputElement).value;
  const location = (document.getElementById('bannerLocation') as HTMLInputElement).value.trim();
  const title = (document.getElementById('bannerTitle') as HTMLInputElement).value.trim();
  const desc = (document.getElementById('bannerDesc') as HTMLTextAreaElement).value.trim();
  if (!title || !date || !location) return;

  const newId = 'bn-' + Date.now();
  try {
    await setDoc(getDocRef('banners', newId), {
      id: newId,
      category,
      date,
      time,
      location,
      title,
      desc,
      timestamp: Date.now()
    });
    (document.getElementById('bannerTitle') as HTMLInputElement).value = '';
    (document.getElementById('bannerTime') as HTMLInputElement).value = '';
    (document.getElementById('bannerLocation') as HTMLInputElement).value = '';
    (document.getElementById('bannerDesc') as HTMLTextAreaElement).value = '';
    state.bannerIndex = 0;
    showToast('첫 화면 행사·경조사 배너가 등록되었습니다.', 'success');
  } catch (err) {
    console.error(err);
    showToast('배너 등록 중 오류가 발생했습니다.', 'error');
  }
}

function promptDeleteBanner(id: string) {
  openConfirmModal('배너 삭제', '이 행사·경조사 배너를 삭제하시겠습니까?', async () => {
    if (!currentUser) return;
    await deleteDoc(getDocRef('banners', id));
    showToast('배너가 삭제되었습니다.', 'info');
  });
}

function renderAdminBannerList() {
  const container = document.getElementById('adminBannerListContainer');
  if (!container) return;

  if (state.banners.length === 0) {
    container.innerHTML = `<p class="text-[11px] text-slate-400 text-center py-2">등록된 배너가 없습니다.</p>`;
    return;
  }

  container.innerHTML = state.banners.map(b => {
    const style = BANNER_STYLES[b.category] || BANNER_STYLES.event;
    const dt = formatBannerDateTime(b.date, b.time);
    return `
      <div class="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl gap-2">
        <div class="min-w-0">
          <div class="flex items-center gap-1.5">
            <span class="px-1.5 py-0.2 rounded text-[10px] font-bold ${style.badgeBg}">${style.badge}</span>
            <span class="text-xs font-bold text-slate-800 truncate">${escapeHtml(b.title)}</span>
          </div>
          <p class="text-[11px] text-slate-500 truncate mt-0.5">${escapeHtml(dt)} · ${escapeHtml(b.location || '')}</p>
        </div>
        <button type="button" onclick="promptDeleteBanner('${b.id}')" class="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[11px] font-semibold shrink-0">
          삭제
        </button>
      </div>
    `;
  }).join('');
}

function toggleAdminModeModal() {
  switchTab('admin');
}

function unlockAdminPanel(e: Event) {
  e.preventDefault();
  const pinInput = document.getElementById('adminPinInput') as HTMLInputElement;
  const pin = pinInput.value.trim();
  if (pin === ADMIN_PIN) {
    state.isAdmin = true;
    pinInput.value = '';
    updateAdminUI();
    renderStaffList();
    renderLogs();
    renderHandovers();
    renderChats();
    showToast('관리자 권한이 활성화되었습니다.', 'success');
  } else {
    showToast('관리자 비밀번호가 일치하지 않습니다. (기본: 0000)', 'error');
  }
}

function lockAdminPanel() {
  state.isAdmin = false;
  updateAdminUI();
  renderLogs();
  renderHandovers();
  renderChats();
  showToast('관리자 모드가 잠금 처리되었습니다.', 'info');
}

function updateAdminUI() {
  const lockedView = document.getElementById('adminLockedView');
  const unlockedView = document.getElementById('adminUnlockedView');
  const badge = document.getElementById('adminBadge');
  const btnText = document.getElementById('adminBtnText');
  const btnIcon = document.getElementById('adminBtnIcon');

  if (state.isAdmin) {
    lockedView?.classList.add('hidden');
    unlockedView?.classList.remove('hidden');
    badge?.classList.remove('hidden');
    if (btnText) btnText.textContent = '관리자 ON';
    if (btnIcon) btnIcon.className = 'fa-solid fa-shield-halved text-amber-300';
  } else {
    lockedView?.classList.remove('hidden');
    unlockedView?.classList.add('hidden');
    badge?.classList.add('hidden');
    if (btnText) btnText.textContent = '관리자 모드';
    if (btnIcon) btnIcon.className = 'fa-solid fa-user-shield text-brand-200';
  }
}

async function handleAddStaff(e: Event) {
  e.preventDefault();
  if (!currentUser) return;
  const nameInput = document.getElementById('newStaffName') as HTMLInputElement;
  const roleInput = document.getElementById('newStaffRole') as HTMLInputElement;
  const name = nameInput.value.trim();
  const role = roleInput.value.trim();
  if (!name || !role) return;

  const newId = 'st-' + Date.now();
  const nextOrder = state.staff.length > 0 ? Math.max(...state.staff.map(s => s.order || 0)) + 1 : 1;

  try {
    await setDoc(getDocRef('staff', newId), {
      id: newId,
      name,
      role,
      order: nextOrder
    });
    nameInput.value = '';
    roleInput.value = '';
    showToast(`${name} (${role}) 직원이 등록되었습니다.`, 'success');
  } catch (err) {
    console.error(err);
    showToast('직원 등록 중 오류가 발생했습니다.', 'error');
  }
}

function openEditStaffModal(staffId: string) {
  const target = state.staff.find(s => s.id === staffId);
  if (!target) return;
  (document.getElementById('editStaffId') as HTMLInputElement).value = target.id;
  (document.getElementById('editStaffNameInput') as HTMLInputElement).value = target.name;
  (document.getElementById('editStaffRoleInput') as HTMLInputElement).value = target.role;
  document.getElementById('editStaffModal')?.classList.remove('hidden');
}

function closeEditStaffModal() {
  document.getElementById('editStaffModal')?.classList.add('hidden');
}

async function saveEditedStaff(e: Event) {
  e.preventDefault();
  if (!currentUser) return;
  const id = (document.getElementById('editStaffId') as HTMLInputElement).value;
  const name = (document.getElementById('editStaffNameInput') as HTMLInputElement).value.trim();
  const role = (document.getElementById('editStaffRoleInput') as HTMLInputElement).value.trim();
  if (!name || !role) return;

  try {
    await updateDoc(getDocRef('staff', id), { name, role });
    closeEditStaffModal();
    showToast('직원 이름 및 직책이 변경되었습니다.', 'success');
  } catch (err) {
    console.error(err);
    showToast('직원 정보 변경 중 오류가 발생했습니다.', 'error');
  }
}

function promptDeleteStaff(staffId: string) {
  const target = state.staff.find(s => s.id === staffId);
  if (!target) return;

  openConfirmModal('직원 삭제', `${target.name} (${target.role}) 직원을 명단에서 삭제하시겠습니까?`, async () => {
    if (!currentUser) return;
    await deleteDoc(getDocRef('staff', staffId));
    if (state.selectedWorkerId === staffId) state.selectedWorkerId = '';
    if (state.filterWorkerId === staffId) state.filterWorkerId = 'ALL';
    showToast('직원 명단에서 삭제되었습니다.', 'info');
  });
}

function renderStaffList() {
  const container = document.getElementById('staffListContainer');
  if (!container) return;

  if (state.staff.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 text-center py-3">등록된 직원이 없습니다.</p>`;
    return;
  }

  container.innerHTML = state.staff.map(s => `
    <div class="flex items-center justify-between bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-xl">
      <div class="flex items-center gap-2">
        <span class="w-6 h-6 rounded-full bg-brand-600 text-white text-[11px] font-bold flex items-center justify-center">${escapeHtml(s.name.slice(0, 1))}</span>
        <span class="text-xs font-bold text-slate-800">${escapeHtml(s.name)}</span>
        <span class="text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">${escapeHtml(s.role)}</span>
      </div>
      <div class="flex items-center gap-1">
        <button onclick="openEditStaffModal('${s.id}')" class="px-2 py-1 bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 rounded-lg text-[11px] font-semibold transition">
          변경
        </button>
        <button onclick="promptDeleteStaff('${s.id}')" class="px-2 py-1 text-red-500 hover:bg-red-50 rounded-lg text-[11px] font-semibold transition">
          삭제
        </button>
      </div>
    </div>
  `).join('');
}

function downloadCSV() {
  if (state.logs.length === 0) {
    showToast('내보낼 작업일지 데이터가 없습니다.', 'error');
    return;
  }

  const headers = ['작업날짜', '등록시간', '작성자', '직책', '작업장소', '처리내용', '사진첨부여부'];
  const rows = state.logs.map(log => {
    const worker = state.staff.find(s => s.id === log.workerId);
    const wName = worker ? worker.name : '미등록';
    const wRole = worker ? worker.role : '-';
    const hasPhoto = log.photo ? '첨부됨' : '없음';

    return [
      `"${log.date}"`,
      `"${log.createdAt || ''}"`,
      `"${wName}"`,
      `"${wRole}"`,
      `"${(log.location || '').replace(/"/g, '""')}"`,
      `"${(log.content || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      `"${hasPhoto}"`
    ];
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `호려울마을7단지_공동작업일지_${getTodayString()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast('엑셀(CSV) 파일이 다운로드되었습니다.', 'success');
}

function clearAllDataPrompt() {
  openConfirmModal('전체 데이터 초기화', '클라우드 서버에 저장된 모든 일지, 공지, 채팅 내역이 초기화됩니다. 계속하시겠습니까?', async () => {
    if (!currentUser) return;
    for (const l of state.logs) await deleteDoc(getDocRef('logs', l.id));
    for (const h of state.handovers) await deleteDoc(getDocRef('handovers', h.id));
    for (const c of state.chats) await deleteDoc(getDocRef('chats', c.id));
    for (const b of state.banners) await deleteDoc(getDocRef('banners', b.id));
    for (const t of state.tools) await deleteDoc(getDocRef('tools', t.id));
    for (const v of state.vendors) await deleteDoc(getDocRef('vendors', v.id));
    await seedInitialDataIfEmpty();
    showToast('초기 샘플 상태로 복원되었습니다.', 'info');
  });
}

function openConfirmModal(title: string, message: string, onConfirm: () => Promise<void> | void) {
  document.getElementById('confirmTitle')!.textContent = title;
  document.getElementById('confirmMessage')!.textContent = message;
  pendingConfirmCallback = onConfirm;
  document.getElementById('confirmModal')?.classList.remove('hidden');
}

function closeConfirmModal() {
  document.getElementById('confirmModal')?.classList.add('hidden');
  pendingConfirmCallback = null;
}

function openLightbox(src: string) {
  (document.getElementById('lightboxImg') as HTMLImageElement).src = src;
  document.getElementById('imageLightbox')?.classList.remove('hidden');
}

function closeLightbox() {
  document.getElementById('imageLightbox')?.classList.add('hidden');
}

function showToast(message: string, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');

  let bgClass = 'bg-slate-800 text-white';
  let iconClass = 'fa-circle-info text-brand-400';

  if (type === 'success') {
    bgClass = 'bg-emerald-700 text-white';
    iconClass = 'fa-circle-check text-emerald-200';
  } else if (type === 'error') {
    bgClass = 'bg-red-700 text-white';
    iconClass = 'fa-circle-exclamation text-red-200';
  }

  toast.className = `${bgClass} shadow-xl rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-2 transition-all duration-300 transform translate-y-0 opacity-100`;
  toast.innerHTML = `<i class="fa-solid ${iconClass} text-sm"></i><span>${message}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('opacity-0', '-translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}

function escapeHtml(str: unknown) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

Object.assign(window, {
  state,
  autoFillDemoLogin, handleLogin, handleLogout,
  handleWorkerChange, switchTab,
  setQuickLocation, handlePhotoUpload, selectSampleImage, clearPhoto,
  submitWorkLog, setWorkerFilter, setLogViewMode, changeCalendarMonth, goCalendarToday, selectCalendarDate, clearCalendarSelectedDate,
  openEditModal, closeEditModal, saveEditedLog, promptDeleteLog,
  setHandoverFilter, submitHandover, confirmHandover, openEditHandoverModal, closeEditHandoverModal, saveHandoverEdit, promptDeleteHandover,
  toggleToolAddForm, toggleToolPasteBox, parseToolRawText, handleToolSmartFile, clearToolImportPreview, confirmBatchToolImport,
  setToolFilter, handleAddTool, rentTool, returnTool, toggleToolRepair, promptDeleteTool, downloadToolsCSV,
  toggleVendorAddForm, toggleVendorPasteBox, parseVendorRawText, handleVendorSmartFile, clearVendorImportPreview, confirmBatchVendorImport,
  setVendorScope, setVendorCategory, handleAddVendor, toggleVendorFavorite, copyVendorInfo, promptDeleteVendor,
  submitChat, sendQuickChat, deleteChatMessage,
  prevBanner, nextBanner, toggleBannerGlobal, handleAddBanner, promptDeleteBanner,
  toggleAdminModeModal, unlockAdminPanel, lockAdminPanel,
  handleAddStaff, openEditStaffModal, closeEditStaffModal, saveEditedStaff, promptDeleteStaff,
  downloadCSV, clearAllDataPrompt, closeConfirmModal, openLightbox, closeLightbox
});
