const D=window.HUB_DATA;
const M=window.MATH_DATA||[];
const $=s=>document.querySelector(s), app=$('#app');
const state={
  grade:Number(localStorage.getItem('hubGrade')||1),
  page:localStorage.getItem('hubPage')||'overview',
  vocabTab:localStorage.getItem('hubVocabTab')||'today',
  storyId:Number(localStorage.getItem('hubStory')||1),
  storyGrade:Number(localStorage.getItem('hubStoryGrade')||1),
  gameTab:localStorage.getItem('hubGameTab')||'choice',
  gameIndex:{choice:0,fill:0,listen:0},
  gameScore:{choice:0,fill:0,listen:0},
  gameWord:{choice:'',fill:'',listen:''},
  mathPage:Number(localStorage.getItem('hubMathPage')||1),
  mathMode:localStorage.getItem('hubMathMode')||'student',
  mindmapRoot:localStorage.getItem('hubMindRoot')||''
};
const progress=JSON.parse(localStorage.getItem('hubProgress')||'{}');

function updatePill(){
  const el=$('#progressPill');
  if(!el)return;
  const today=progress.today||{};
  const words=vocab();
  const done=words.filter(w=>today[w.word]).length;
  el.textContent=`${words.length?Math.round(done/words.length*100):0}% hôm nay`;
}
function save(){
  localStorage.setItem('hubProgress',JSON.stringify(progress));
  localStorage.setItem('hubGrade',state.grade);localStorage.setItem('hubPage',state.page);
  localStorage.setItem('hubVocabTab',state.vocabTab);localStorage.setItem('hubStory',state.storyId);
  localStorage.setItem('hubStoryGrade',state.storyGrade);localStorage.setItem('hubGameTab',state.gameTab);
  localStorage.setItem('hubMathPage',state.mathPage);localStorage.setItem('hubMathMode',state.mathMode);localStorage.setItem('hubMindRoot',state.mindmapRoot);
  updatePill();
}
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove('show'),1700)}
function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

// ===== AUDIO =====
// Audio strategy for GitHub Pages (no API key required):
// 1) Google Dictionary/Oxford US MP3 on ssl.gstatic.com (primary)
// 2) Free Dictionary API -> its returned MP3 URL (fallback)
// 3) Device/browser en-US speech synthesis (last fallback)
// We cannot call ChatGPT's internal Voice service directly from a static GitHub Pages site.
let cachedVoices=[];
let remoteAudioCache=JSON.parse(localStorage.getItem('hubEnglishAudioCache')||'{}');
let activeAudio=null;
function loadVoices(){
  if(!('speechSynthesis' in window)) return [];
  cachedVoices=speechSynthesis.getVoices()||[];
  return cachedVoices;
}
loadVoices();
if('speechSynthesis' in window && 'onvoiceschanged' in speechSynthesis){speechSynthesis.onvoiceschanged=()=>loadVoices()}
function pickVoice(lang){
  const voices=loadVoices();
  const wanted=String(lang||'').toLowerCase();
  const exact=voices.filter(v=>String(v.lang||'').toLowerCase()===wanted);
  const family=voices.filter(v=>String(v.lang||'').toLowerCase().startsWith(wanted.split('-')[0]));
  const pool=exact.length?exact:family;
  const preferred=wanted==='en-us'
    ? ['Microsoft Aria Online (Natural) - English (United States)','Microsoft Jenny Online (Natural) - English (United States)','Google US English','Samantha','Alex']
    : wanted==='vi-vn'
      ? ['Microsoft HoaiMy Online (Natural) - Vietnamese (Vietnam)','Google Tiếng Việt','Google Vietnamese','Microsoft An']
      : [];
  for(const name of preferred){const hit=pool.find(v=>v.name===name||v.name.toLowerCase().includes(name.toLowerCase()));if(hit)return hit}
  return pool.find(v=>v.localService===true)||pool[0]||null;
}
function feedbackTone(correct){
  try{
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    const ctx=new AC();const osc=ctx.createOscillator();const gain=ctx.createGain();
    osc.type='sine';osc.frequency.setValueAtTime(correct?740:220,ctx.currentTime);
    if(correct){osc.frequency.exponentialRampToValueAtTime(1040,ctx.currentTime+0.16)}else{osc.frequency.exponentialRampToValueAtTime(150,ctx.currentTime+0.22)}
    gain.gain.setValueAtTime(.0001,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.18,ctx.currentTime+.02);gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+(correct?.22:.28));
    osc.connect(gain).connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+(correct?.24:.3));setTimeout(()=>ctx.close(),400);
  }catch(e){}
}
function showAnswerFeedback(correct,title,detail=''){
  document.querySelectorAll('.answer-feedback').forEach(x=>x.remove());
  const el=document.createElement('div');el.className=`answer-feedback ${correct?'is-correct':'is-wrong'}`;
  el.innerHTML=`<div class="answer-feedback-card" role="alert"><div class="answer-feedback-icon">${correct?'✓':'×'}</div><div class="answer-feedback-title">${escapeHtml(title)}</div>${detail?`<div class="answer-feedback-detail">${escapeHtml(detail)}</div>`:''}</div>`;
  document.body.appendChild(el);feedbackTone(correct);
  requestAnimationFrame(()=>el.classList.add('show'));
  clearTimeout(window.__answerFeedbackTimer);window.__answerFeedbackTimer=setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),250)},1100);
}
function browserSpeak(text,lang){
  if(!('speechSynthesis' in window)){toast('Thiết bị chưa hỗ trợ đọc âm thanh.');return false;}
  const run=()=>{
    try{
      speechSynthesis.cancel();
      const u=new SpeechSynthesisUtterance(String(text));u.lang=lang;u.rate=0.86;u.pitch=1;u.volume=1;
      const v=pickVoice(lang);if(v)u.voice=v;
      u.onerror=()=>{};
      speechSynthesis.speak(u);
    }catch(e){toast('Không thể phát giọng đọc trên thiết bị này.');}
  };
  const voices=loadVoices();
  if(voices.length) run();
  else {const old=speechSynthesis.onvoiceschanged;speechSynthesis.onvoiceschanged=()=>{speechSynthesis.onvoiceschanged=old;loadVoices();run()};setTimeout(run,500)}
  return true;
}
function saveAudioCache(){try{localStorage.setItem('hubEnglishAudioCache',JSON.stringify(remoteAudioCache))}catch(e){}}
function stopActiveAudio(){if(activeAudio){try{activeAudio.pause();activeAudio.currentTime=0}catch(e){}activeAudio=null}}
function playAudioUrl(url,onFail){
  if(!url)return onFail?.();
  stopActiveAudio();
  const audio=new Audio();audio.preload='auto';audio.src=url;activeAudio=audio;
  let failed=false;
  const fail=()=>{if(failed)return;failed=true;if(activeAudio===audio)activeAudio=null;onFail?.(url)};
  audio.onended=()=>{if(activeAudio===audio)activeAudio=null};audio.onerror=fail;
  try{
    const p=audio.play();
    if(p&&typeof p.catch==='function')p.catch(fail);
  }catch(e){fail()}
  return true;
}
function remoteTtsUrl(text,lang){
  const q=encodeURIComponent(String(text||''));
  if(!q)return '';
  const tl=lang==='vi-VN'?'vi-VN':'en-US';
  return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(tl)}&q=${q}`;
}
function speakRemoteTts(text,lang,onFail){
  const url=remoteTtsUrl(text,lang);
  if(!url){onFail?.();return false}
  return playAudioUrl(url,onFail);
}
function googleEnglishAudioUrl(word){
  const w=String(word).trim().toLowerCase();
  return w?`https://ssl.gstatic.com/dictionary/static/sounds/oxford/${encodeURIComponent(w)}--_us_1.mp3`:'';
}
function googleEnglishAudioUrlAlt(word){
  const w=String(word).trim().toLowerCase();
  return w?`https://ssl.gstatic.com/dictionary/static/sounds/20200429/${encodeURIComponent(w)}--_us_1.mp3`:'';
}
async function resolveDictionaryAudio(word){
  const w=String(word).trim().toLowerCase();
  if(!w)return '';
  if(remoteAudioCache[w])return remoteAudioCache[w];
  try{
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),5000);
    const r=await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`,{signal:controller.signal,cache:'force-cache'});clearTimeout(timer);
    if(!r.ok)return '';
    const data=await r.json();
    const audios=[];
    for(const entry of (Array.isArray(data)?data:[])) for(const p of (entry.phonetics||[])) if(p.audio) audios.push(String(p.audio).startsWith('//')?`https:${p.audio}`:p.audio);
    const us=audios.find(u=>/-us[_-].*\.mp3(?:\?|$)/i.test(u))||audios.find(u=>/us/i.test(u))||audios[0]||'';
    if(us){remoteAudioCache[w]=us;saveAudioCache();return us}
  }catch(e){}
  return '';
}
function openAudioFile(url){try{window.open(url,'_blank','noopener');toast('Đang mở file phát âm…')}catch(e){}}
function speakEnglish(word){
  const w=String(word).trim().toLowerCase();
  // Priority: natural female en-US voice if the device exposes Microsoft/Google neural voices;
  // otherwise use a remote TTS MP3 so playback does not depend on installed voices.
  const preferred=loadVoices().find(v=>/Jenny.*Natural|Aria.*Natural/i.test(v.name||'')&&/^en[-_]?US/i.test(v.lang||''));
  if(preferred){browserSpeak(w,'en-US');return true}
  const primary=googleEnglishAudioUrl(w), secondary=googleEnglishAudioUrlAlt(w), cached=remoteAudioCache[w];
  const fallbackRemote=()=>speakRemoteTts(w,'en-US',()=>resolveDictionaryAudio(w).then(url=>url?playAudioUrl(url,()=>browserSpeak(w,'en-US')):browserSpeak(w,'en-US')));
  if(cached)return playAudioUrl(cached,()=>playAudioUrl(primary,()=>playAudioUrl(secondary,()=>fallbackRemote())));
  return playAudioUrl(primary,()=>playAudioUrl(secondary,()=>fallbackRemote()));
}
let vnQueue=[];
function speakVietnamese(text){
  const raw=String(text||'').trim();if(!raw)return false;
  vnQueue=raw.match(/.{1,150}(?:[\s,.;!?]|$)/g)||[raw];
  vnQueue=vnQueue.map(x=>x.trim()).filter(Boolean);
  stopActiveAudio();
  const playNext=()=>{
    if(!vnQueue.length)return;
    const part=vnQueue.shift();
    speakRemoteTts(part,'vi-VN',()=>{
      if('speechSynthesis' in window){browserSpeak(part,'vi-VN')}
      setTimeout(playNext,Math.max(700,part.length*45));
    });
    if(activeAudio)activeAudio.onended=()=>{if(activeAudio)activeAudio=null;setTimeout(playNext,120)};
  };
  playNext();return true;
}

// ===== MENU =====
function navigate(page){
  state.page=page;
  save();
  closeMenu();
  render();
}
function renderNav(){
  let h=`<button type="button" class="grade ${state.page==='overview'?'active':''}" data-page="overview">🏠 <span>Tổng quan</span><span class="arrow">›</span></button>`;
  for(let g=1;g<=10;g++){
    h+=`<button type="button" class="grade ${state.grade===g?'active':''}" data-grade="${g}">📁 <span>Lớp ${g}</span><span class="arrow">›</span></button>`;
    if(state.grade===g)h+=`<div class="subnav"><button type="button" data-page="vocabGames" class="${state.page==='vocabGames'?'active':''}">🌈 Vocabulary Games</button><button type="button" data-page="vocabList" class="${state.page==='vocabList'?'active':''}">📚 Vocabulary List</button><button type="button" data-page="mindmap" class="${state.page==='mindmap'?'active':''}">🧠 Mindmap Vocabulary</button><button type="button" data-page="math" class="${state.page==='math'?'active':''}">🧠 Toán tư duy</button><button type="button" data-page="vietnamese" class="${state.page==='vietnamese'?'active':''}">📖 Tiếng Việt</button></div>`;
  }
  $('#gradeNav').innerHTML=h;
  document.querySelectorAll('[data-grade]').forEach(b=>b.onclick=()=>{state.grade=+b.dataset.grade;state.page='vocabGames';save();closeMenu();render()});
  document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>navigate(b.dataset.page));
}
function openMenu(){ $('#sidebar').classList.add('open');$('#menuOverlay').classList.add('show'); }
function closeMenu(){ $('#sidebar').classList.remove('open');$('#menuOverlay').classList.remove('show'); }
$('#menuBtn').onclick=openMenu;$('#menuOverlay').onclick=closeMenu;document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});

function render(){
  renderNav();
  $('#pageTitle').textContent=({overview:'Tổng quan',vocabGames:'Vocabulary Games',vocabList:'Vocabulary List',mindmap:'Mindmap Vocabulary',math:'Toán tư duy',vietnamese:'Tiếng Việt'})[state.page]||'Tổng quan';
  ({overview:renderOverview,vocabGames:renderGames,vocabList:renderVocab,mindmap:renderMindmap,math:renderMath,vietnamese:renderVietnamese}[state.page]||renderOverview)();updatePill();
}
function renderOverview(){
  app.innerHTML=`<div class="hero"><div><div class="eyebrow" style="color:#eee">CHÀO MỪNG BẠN NHỎ</div><h2>Học vui • Nhớ lâu • Tự tin</h2><p>Lớp ${state.grade} · Chọn một khu vực để bắt đầu hôm nay.</p></div><div class="hero-art">🧒📚</div></div><div class="stats"><div class="stat"><strong>10</strong><span>Từ mới hôm nay</span></div><div class="stat"><strong>${D.stories.filter(x=>x.grade===state.grade).length}</strong><span>Truyện lớp ${state.grade}</span></div><div class="stat"><strong>${M.length}</strong><span>Trang Toán tương tác</span></div></div><h2 class="section-title">Nội dung học</h2><div class="grid"><div class="card module-card" data-go="vocabGames"><div class="module-icon">🌈</div><h3>Vocabulary Games</h3><p>Chọn từng trò chơi riêng, mỗi trò có điểm riêng.</p><span class="go">Học ngay →</span></div><div class="card module-card" data-go="vocabList"><div class="module-icon">📚</div><h3>Vocabulary List</h3><p>10 từ mới hôm nay, flashcard, đã thuộc và cần học.</p><span class="go">Mở danh sách →</span></div><div class="card module-card" data-go="math"><div class="module-icon">🧠</div><h3>Toán tư duy</h3><p>46 trang bài tập được cắt từ tài liệu, có lớp nhập và chấm đáp án.</p><span class="go">Làm bài →</span></div><div class="card module-card" data-go="vietnamese"><div class="module-icon">📖</div><h3>Tiếng Việt</h3><p>100 truyện cổ tích và ngụ ngôn, 16–19 câu, đọc to và đọc hiểu.</p><span class="go">Đọc truyện →</span></div></div>`;
  document.querySelectorAll('[data-go]').forEach(x=>x.onclick=()=>{state.page=x.dataset.go;save();render()});
}

// ===== CURRICULUM VOCABULARY ENGINE =====
const OXFORD_CSV_URL='https://raw.githubusercontent.com/chunzhng/Oxford-3000-5000/main/oxford-3000.csv';
let vocabularyReady=false, vocabularyLoading=null;
const meaningCache=JSON.parse(localStorage.getItem('hubMeaningCache')||'{}');
const POS_KEEP=new Set(['noun','verb','adjective','adverb','number','exclamation']);
function saveMeaningCache(){try{localStorage.setItem('hubMeaningCache',JSON.stringify(meaningCache))}catch(e){}}
function cleanWord(w){return String(w||'').trim().replace(/\s+/g,' ')}
function parseOxford(csv){
  const rows=String(csv||'').split(/\r?\n/).slice(1), map=new Map();
  for(const line of rows){const m=line.match(/^([^,]+),([^,]+),([^,]+)$/);if(!m)continue;const word=cleanWord(m[1]);const pos=m[2],level=m[3].toLowerCase();if(!word||word.length>30||!POS_KEEP.has(pos))continue;if(!map.has(word))map.set(word,{word,level,pos,meaning:meaningCache[word]||''})}
  return [...map.values()];
}
const GRADE_LEVELS={1:['a1'],2:['a1'],3:['a1'],4:['a1','a2'],5:['a1','a2'],6:['a2'],7:['a2','b1'],8:['a2','b1'],9:['a2','b1','b2'],10:['b1','b2']};
const GRADE_SEEDS={};
for(let g=1;g<=10;g++)GRADE_SEEDS[g]=(D.vocabulary[String(g)]||[]).map(x=>x.word);
async function hydrateVocabulary(){
  if(vocabularyReady||vocabularyLoading)return vocabularyLoading;
  vocabularyLoading=(async()=>{
    try{
      const r=await fetch(OXFORD_CSV_URL,{cache:'force-cache'});if(!r.ok)throw new Error('Oxford fetch failed');
      const items=parseOxford(await r.text());
      const used=new Set(), next={};
      const targets=window.HUB_CURRICULUM?.targets||{};
      for(let g=1;g<=10;g++){
        const target=targets[g]||D.vocabulary[String(g)]?.length||10;
        const out=[];
        for(const seed of (GRADE_SEEDS[g]||[])){
          const hit=items.find(x=>x.word.toLowerCase()===String(seed).toLowerCase());
          if(hit&&!used.has(hit.word.toLowerCase())){out.push({...hit,meaning:(D.vocabulary[String(g)]||[]).find(y=>y.word.toLowerCase()===hit.word.toLowerCase())?.meaning||hit.meaning||''});used.add(hit.word.toLowerCase())}
        }
        const allowed=new Set(GRADE_LEVELS[g]||['a1']);
        const candidates=items.filter(x=>allowed.has(x.level)&&!used.has(x.word.toLowerCase()) && !/^(a|an|the|i|you|he|she|it|we|they|me|him|her|us|them|my|your|his|our|their|this|that|these|those|and|or|but|if|because|so|of|to|in|on|at|by|for|from|with|as|than|into|over|under|can|could|may|might|must|should|would|will|be|been|being|do|does|did|have|has|had)$/i.test(x.word));
        candidates.sort((a,b)=>{const lv={'a1':0,'a2':1,'b1':2,'b2':3};return (lv[a.level]||9)-(lv[b.level]||9)||a.word.localeCompare(b.word)});
        for(const x of candidates){if(out.length>=target)break;out.push({...x,meaning:x.meaning||''});used.add(x.word.toLowerCase())}
        next[String(g)]=out;
      }
      // Guarantee no class falls below its planned target if the filtered Oxford set is insufficient.
      if(Object.values(next).every(a=>a.length>=20)){D.vocabulary=next;vocabularyReady=true;window.HUB_DATA.vocabulary=next;}
    }catch(e){console.warn('Expanded vocabulary unavailable; keeping bundled seed vocabulary.',e)}
  })();
  return vocabularyLoading;
}
function getMeaning(word){return meaningCache[String(word).toLowerCase()]||''}
async function fetchMeaning(word){
  const w=cleanWord(word).toLowerCase();if(!w)return '';
  if(meaningCache[w])return meaningCache[w];
  try{const r=await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(w)}&langpair=en|vi`,{cache:'force-cache'});if(!r.ok)return '';const d=await r.json();const t=d?.responseData?.translatedText||'';if(t&&t.toLowerCase()!==w){meaningCache[w]=t;saveMeaningCache();return t}}catch(e){}
  return '';
}
function ensureMeanings(words,limit=12){
  const targets=words.filter(x=>!x.meaning&&!getMeaning(x.word)).slice(0,limit);if(!targets.length)return;
  Promise.all(targets.map(async x=>{const m=await fetchMeaning(x.word);if(m)x.meaning=m;})).then(()=>{if(state.page==='vocabList')renderVocab()}).catch(()=>{});
}

// ===== VOCAB LIST =====
function vocab(){return D.vocabulary[String(state.grade)]||[]}
function allVocab(){return Object.keys(D.vocabulary).sort((a,b)=>Number(a)-Number(b)).flatMap(g=>(D.vocabulary[g]||[]).map(x=>({...x,grade:Number(g)})))}
// Small built-in illustrations: no external image service, no broken image links.
// Emoji are used as lightweight, offline-friendly illustrations for every vocabulary item.
const VOCAB_ART={
  apple:'🍎',book:'📖',cat:'🐱',dog:'🐶',egg:'🥚',fish:'🐟',home:'🏠',school:'🏫',sun:'☀️',water:'💧',
  family:'👨‍👩‍👧‍👦',friend:'🧑‍🤝‍🧑',teacher:'👩‍🏫',pencil:'✏️',chair:'🪑',window:'🪟',morning:'🌅',happy:'😊',small:'🔹',yellow:'🟡',
  garden:'🌷',market:'🛒',breakfast:'🍳',library:'📚',animal:'🐾',weather:'🌤️',rainy:'🌧️',cloudy:'☁️',clever:'💡',quiet:'🤫',
  arrive:'🚶',borrow:'🤲',careful:'⚠️',healthy:'🥗',journey:'🧳',message:'💬',practice:'🏋️',return:'↩️',strong:'💪',useful:'🛠️',
  adventure:'🗺️',discover:'🔎',environment:'🌍',exercise:'🏃',improve:'📈',important:'❗',prepare:'📝',protect:'🛡️',remember:'🧠',successful:'🏆',
  ancient:'🏛️',challenge:'🧗',community:'🏘️',creative:'🎨',curious:'🔭',decision:'⚖️',energy:'⚡',experiment:'🧪',resource:'📦',responsible:'🫡',
  achieve:'🎯',communication:'🗣️',confidence:'😎',consequence:'🔗',effective:'⚙️',independent:'🧍',influence:'📣',opportunity:'🚪',research:'🔬',solution:'💡',
  analysis:'📊',benefit:'🎁',compare:'⚖️',evidence:'🔍',flexible:'🧘',identity:'🪪',motivate:'🔥',perspective:'👀',reliable:'🤝',strategy:'♟️',
  accurate:'🎯',complex:'🧩',concept:'💭',construct:'🏗️',critical:'🧐',debate:'🗯️',evaluate:'📋',factor:'➗',logical:'🧠',sustainable:'♻️',
  adapt:'🔄',alternative:'🔀',collaborate:'🤝',controversial:'⚡',criterion:'📏',diverse:'🌈',innovation:'💡',interpret:'🧩',justify:'⚖️',significant:'⭐'
};
function vocabArt(word){return VOCAB_ART[String(word).toLowerCase()]||'🔤'}
function vocabIllustration(word,cls='vocab-art',label=''){return `<div class="${cls}" role="img" aria-label="${escapeHtml(label||word)}">${vocabArt(word)}</div>`}
function isMastered(word){return !!(progress.mastered&&progress.mastered[word])}
function setMastered(word,val){progress.mastered=progress.mastered||{};progress.mastered[word]=val;progress.today=progress.today||{};progress.today[word]=val;save()}
function vocabDetail(x){
  if(!x)return;
  const old=document.querySelector('.vocab-detail-overlay'); if(old)old.remove();
  const overlay=document.createElement('div'); overlay.className='vocab-detail-overlay';
  const known=x.meaning||getMeaning(x.word)||'Đang tra nghĩa…';
  overlay.innerHTML=`<div class="vocab-detail-popup" role="dialog" aria-modal="true" aria-label="Chi tiết từ vựng">
    ${vocabIllustration(x.word,'vocab-art vocab-art-detail',x.word)}
    <div class="eyebrow">VOCABULARY · LỚP ${state.grade}</div>
    <h2>${escapeHtml(x.word)}</h2><div class="vocab-detail-meaning" id="detailMeaning">${escapeHtml(known)}</div>
    <div class="vocab-detail-actions"><button class="btn primary" data-detail-speak="${escapeHtml(x.word)}">🔊 Nghe tiếng Anh</button><button class="btn secondary" data-detail-vn="${escapeHtml(known)}">🔊 Nghe tiếng Việt</button></div>
    <div class="vocab-detail-note">Chạm ra ngoài khung để đóng.</div>
  </div>`;
  document.body.appendChild(overlay);
  if(!x.meaning&&!getMeaning(x.word))fetchMeaning(x.word).then(m=>{if(m){x.meaning=m;const el=overlay.querySelector('#detailMeaning');if(el)el.textContent=m;const b=overlay.querySelector('[data-detail-vn]');if(b)b.dataset.detailVn=m;}});
  overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});
  overlay.querySelector('[data-detail-speak]').onclick=e=>{e.stopPropagation();speakEnglish(x.word)};
  overlay.querySelector('[data-detail-vn]').onclick=async e=>{e.stopPropagation();const m=x.meaning||getMeaning(x.word)||await fetchMeaning(x.word);if(m){x.meaning=m;overlay.querySelector('[data-detail-vn]').dataset.detailVn=m;overlay.querySelector('#detailMeaning').textContent=m;speakVietnamese(m)}else toast('Chưa lấy được nghĩa tiếng Việt.');};
}
function bindVocabInteractions(){
  document.querySelectorAll('[data-en-speak]').forEach(x=>x.onclick=e=>{e.stopPropagation();speakEnglish(x.dataset.enSpeak)});
  document.querySelectorAll('[data-vocab-detail]').forEach(x=>x.onclick=()=>vocabDetail(D.vocabulary[String(state.grade)]?.find(w=>w.word===x.dataset.vocabDetail)));
  document.querySelectorAll('[data-master]').forEach(x=>x.onclick=e=>{e.stopPropagation();setMastered(x.dataset.master,!isMastered(x.dataset.master));render()});
  document.querySelectorAll('[data-check]').forEach(x=>x.onchange=e=>{e.stopPropagation();setMastered(x.dataset.check,x.checked);render()});
}
function renderVocab(){
  const words=vocab(), mastered=words.filter(x=>isMastered(x.word)), need=words.filter(x=>!isMastered(x.word));
  let body='';
  if(state.vocabTab==='today') body=`<div class="flash-grid">${words.slice(0,10).map((x,i)=>`<div class="flash" data-vocab-detail="${escapeHtml(x.word)}"><div>${vocabIllustration(x.word,'vocab-art vocab-art-card',x.word)}<span class="eyebrow">TỪ ${i+1}/10</span><div class="word">${escapeHtml(x.word)}</div><div class="meaning">${escapeHtml(x.meaning||getMeaning(x.word)||'Đang tải nghĩa…')}</div></div><div class="flash-actions"><button class="btn secondary sound" title="Nghe phát âm Mỹ" data-en-speak="${escapeHtml(x.word)}">🔊</button><button class="btn ${isMastered(x.word)?'good':'warn'}" data-master="${escapeHtml(x.word)}">${isMastered(x.word)?'✓ Đã thuộc':'□ Cần học'}</button></div></div>`).join('')}</div>`;
  else if(state.vocabTab==='mastered'||state.vocabTab==='need') {const arr=state.vocabTab==='mastered'?mastered:need;body=arr.length?`<div class="word-list">${arr.map(x=>`<div class="word-row" data-vocab-detail="${escapeHtml(x.word)}">${vocabIllustration(x.word,'vocab-art vocab-art-row',x.word)}<div><b>${escapeHtml(x.word)}</b><span>${escapeHtml(x.meaning||getMeaning(x.word)||'Đang tải nghĩa…')}</span></div><button class="btn secondary sound" data-en-speak="${escapeHtml(x.word)}">🔊</button><label class="check"><input type="checkbox" ${isMastered(x.word)?'checked':''} data-check="${escapeHtml(x.word)}"> Đã thuộc</label></div>`).join('')}</div>`:`<div class="empty">Chưa có từ nào ở mục này.</div>`}
  else body=`<div class="grade-vocab-grid">${words.map((x,i)=>`<div class="grade-vocab-card" data-vocab-detail="${escapeHtml(x.word)}">${vocabIllustration(x.word,'vocab-art vocab-art-grid',x.word)}<b>${escapeHtml(x.word)}</b><span>${escapeHtml(x.meaning||getMeaning(x.word)||'Đang tải nghĩa…')}</span><button class="btn secondary sound" data-en-speak="${escapeHtml(x.word)}">🔊</button></div>`).join('')}</div>`;
  ensureMeanings(words,16);
  app.innerHTML=`<div class="toolbar"><span class="grade-badge">📘 Lớp ${state.grade}</span><span class="muted">${words.length} từ · ${escapeHtml(window.HUB_CURRICULUM?.bands?.[state.grade]||'')}</span></div><div class="tabs vocab-tabs"><button class="tab ${state.vocabTab==='today'?'active':''}" data-vtab="today">10 từ mới hôm nay</button><button class="tab ${state.vocabTab==='mastered'?'active':''}" data-vtab="mastered">Vocab đã thuộc (${mastered.length})</button><button class="tab ${state.vocabTab==='need'?'active':''}" data-vtab="need">Cần học (${need.length})</button><button class="tab ${state.vocabTab==='all'?'active':''}" data-vtab="all">📚 Vocab lớp ${state.grade}</button></div>${body}<div class="note vocab-curriculum-note">Chương trình GDPT quy định theo <b>cấp học</b>, không ấn định một số từ riêng cho từng lớp. App dùng mục tiêu phân bổ theo lớp để dễ học: lớp 3–5 cộng dồn khoảng 600–700 từ; lớp 6–9 bổ sung khoảng 800–1000 từ; lớp 10 bắt đầu dải THPT. Đây là <b>mục tiêu thiết kế của app</b>, không phải quota chính thức của từng lớp.</div>`;
  document.querySelectorAll('[data-vtab]').forEach(x=>x.onclick=()=>{state.vocabTab=x.dataset.vtab;save();render()});
  bindVocabInteractions();
}

// ===== VOCAB GAMES =====
function resetGame(tab){state.gameIndex[tab]=0;state.gameScore[tab]=0;state.gameWord[tab]='';}
function randomGameWord(tab){
  const words=allVocab();if(!words.length)return null;
  const current=state.gameWord[tab];
  const pool=words.filter(x=>x.word!==current);
  const picked=(pool.length?pool:words)[Math.floor(Math.random()*(pool.length?pool:words).length)];
  state.gameWord[tab]=picked.word;state.gameIndex[tab]=(state.gameIndex[tab]+1)%words.length;return picked;
}
function currentGameWord(tab){
  const words=allVocab();if(!words.length)return null;
  let w=words.find(x=>x.word===state.gameWord[tab]);
  if(!w)w=randomGameWord(tab);
  return w||words[0];
}
function nextGame(tab){randomGameWord(tab);save();renderGames()}
function maskedWord(word){
  const n=word.length;let start=Math.max(1,Math.floor(n/2)-1);let len=n>=6?2:1;if(start+len>n-1)start=Math.max(1,n-len-1);return {before:word.slice(0,start),missing:word.slice(start,start+len),after:word.slice(start+len)};
}
function gameTabs(){return `<div class="tabs game-tabs"><button class="tab ${state.gameTab==='choice'?'active':''}" data-game-tab="choice">🎯 Chọn từ</button><button class="tab ${state.gameTab==='fill'?'active':''}" data-game-tab="fill">✏️ Hoàn thiện từ</button><button class="tab ${state.gameTab==='listen'?'active':''}" data-game-tab="listen">🎧 Nghe và chọn</button></div>`}
function randomChoices(correct,count=4){
  const words=allVocab();
  const pool=words.filter(x=>x.word!==correct.word).sort(()=>Math.random()-.5).slice(0,count-1);
  return [correct,...pool].sort(()=>Math.random()-.5);
}
function renderGames(){
  const w=currentGameWord(state.gameTab);if(!w){app.innerHTML='<div class="empty">Chưa có dữ liệu từ vựng.</div>';return}
  let body='';
  ensureMeanings([w],1);
  if(state.gameTab==='choice'){
    const choices=randomChoices(w);
    const wMeaning=w.meaning||getMeaning(w.word)||'Đang tải nghĩa…';
    body=`<div class="card game-card single-game"><div class="eyebrow">GAME 1 · CHỌN TỪ · RANDOM TOÀN BỘ ${allVocab().length} TỪ</div>${vocabIllustration(w.word,'vocab-art vocab-art-game',w.word)}<button class="btn secondary sound big-sound" data-en-speak="${escapeHtml(w.word)}">🔊 Nghe từ</button><div class="game-question">Từ tiếng Anh nào có nghĩa <em>“${escapeHtml(wMeaning)}”</em>?</div><div class="options">${choices.map(c=>`<button class="option option-with-art" data-choice="${escapeHtml(c.word)}">${vocabIllustration(c.word,'vocab-art vocab-art-option',c.word)}<span>${escapeHtml(c.word)}</span></button>`).join('')}</div><div class="score-line">Điểm trò này: <b>${state.gameScore.choice}</b> · Câu ngẫu nhiên #${state.gameIndex.choice+1}</div></div>`;
  } else if(state.gameTab==='fill'){
    const m=maskedWord(w.word);
    body=`<div class="card game-card single-game"><div class="eyebrow">GAME 2 · HOÀN THIỆN TỪ · RANDOM TOÀN BỘ ${allVocab().length} TỪ</div>${vocabIllustration(w.word,'vocab-art vocab-art-game',w.word)}<div class="game-question">Điền đúng phần còn thiếu.</div><div class="inline-word" aria-label="Từ có một phần bị khuyết"><span>${escapeHtml(m.before)}</span><input id="fillInput" class="inline-letter-input" maxlength="${m.missing.length}" autocomplete="off" aria-label="Phần còn thiếu"><span>${escapeHtml(m.after)}</span></div><button class="btn secondary sound" data-en-speak="${escapeHtml(w.word)}">🔊 Nghe</button><button id="checkFill" class="btn primary" style="margin-top:12px">Kiểm tra</button><div id="fillResult" class="result-space"></div><div class="score-line">Điểm trò này: <b>${state.gameScore.fill}</b> · Câu ngẫu nhiên #${state.gameIndex.fill+1}</div></div>`;
  } else {
    const choices=randomChoices(w);
    const wMeaning=w.meaning||getMeaning(w.word)||'Đang tải nghĩa…';
    body=`<div class="card game-card single-game"><div class="eyebrow">GAME 3 · NGHE VÀ CHỌN · RANDOM TOÀN BỘ ${allVocab().length} TỪ</div><div class="listen-illustration" aria-hidden="true">🎧</div><button id="playListen" class="listen-big">🔊</button><div class="game-question">Nghe từ rồi chọn từ em vừa nghe.</div><div class="options">${choices.map(c=>`<button class="option option-with-art" data-listen-choice="${escapeHtml(c.word)}">${vocabIllustration(c.word,'vocab-art vocab-art-option',c.word)}<span>${escapeHtml(c.word)}</span></button>`).join('')}</div><div class="score-line">Điểm trò này: <b>${state.gameScore.listen}</b> · Câu ngẫu nhiên #${state.gameIndex.listen+1}</div></div>`;
  }
  app.innerHTML=`<div class="note">🎲 Mỗi câu được chọn ngẫu nhiên từ toàn bộ <b>${allVocab().length}</b> từ của lớp 1–10. Mỗi trò có điểm riêng. Bộ từ được mở rộng theo cấp độ/word list; danh sách lớp là phần học chính, game là vùng ôn tập tổng hợp.</div>${gameTabs()}${body}`;
  document.querySelectorAll('[data-game-tab]').forEach(b=>b.onclick=()=>{state.gameTab=b.dataset.gameTab;save();renderGames()});
  document.querySelectorAll('[data-en-speak]').forEach(b=>b.onclick=()=>speakEnglish(b.dataset.enSpeak));
  document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{const ok=b.dataset.choice===w.word;if(ok){b.classList.add('correct');state.gameScore.choice++;showAnswerFeedback(true,'Chính xác!','Tuyệt vời, em đã chọn đúng.');setTimeout(()=>nextGame('choice'),900)}else{b.classList.add('wrong');showAnswerFeedback(false,'Chưa đúng','Hãy thử lại nhé.');}});
  if($('#checkFill'))$('#checkFill').onclick=()=>{const v=$('#fillInput').value.trim().toLowerCase();const m=maskedWord(w.word);if(v===m.missing.toLowerCase()){state.gameScore.fill++;$('#fillResult').innerHTML='<span class="success">✓ Chính xác!</span>';showAnswerFeedback(true,'Chính xác!','Phần còn thiếu hoàn toàn đúng.');setTimeout(()=>nextGame('fill'),900)}else{$('#fillResult').innerHTML='<span class="error">✗ Chưa đúng. Em chỉ cần điền phần bị khuyết.</span>';showAnswerFeedback(false,'Chưa đúng','Kiểm tra lại phần chữ còn thiếu.');}};
  if($('#fillInput'))$('#fillInput').onkeydown=e=>{if(e.key==='Enter')$('#checkFill').click()};
  document.querySelectorAll('[data-listen-choice]').forEach(b=>b.onclick=()=>{const ok=b.dataset.listenChoice===w.word;if(ok){b.classList.add('correct');state.gameScore.listen++;showAnswerFeedback(true,'Chính xác!','Em nghe rất tốt.');setTimeout(()=>nextGame('listen'),900)}else{b.classList.add('wrong');showAnswerFeedback(false,'Chưa đúng','Hãy bấm loa và nghe lại.');}});
  if($('#playListen'))$('#playListen').onclick=()=>speakEnglish(w.word);
}

// ===== MINDMAP VOCABULARY =====
function mindmapData(){return window.HUB_CURRICULUM?.mindmaps?.[state.grade]||[]}
function renderMindmap(){
  const maps=mindmapData();if(!maps.length){app.innerHTML='<div class="empty">Chưa có mindmap cho lớp này.</div>';return}
  if(!state.mindmapRoot||!maps.some(x=>x[0]===state.mindmapRoot))state.mindmapRoot=maps[0][0];
  const root=maps.find(x=>x[0]===state.mindmapRoot)||maps[0], branches=root[2]||[];
  const cx=50,cy=50, radius=35, n=branches.length;
  const pts=branches.map((_,i)=>{const a=(-Math.PI/2)+(i/n)*Math.PI*2;return {x:cx+radius*Math.cos(a),y:cy+radius*Math.sin(a)}});
  const lines=pts.map(p=>`<line x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" class="mind-line"/>`).join('');
  const nodes=pts.map((p,i)=>`<button class="mind-node mind-child" style="left:${p.x}%;top:${p.y}%" data-mind-child="${escapeHtml(branches[i])}">${escapeHtml(branches[i])}</button>`).join('');
  app.innerHTML=`<div class="note mindmap-note">🧠 <b>Mindmap Vocabulary · Lớp ${state.grade}</b><br>Gốc từ ở giữa → các dạng từ, từ ghép và cụm từ phát triển xung quanh. Nhãn <b>mở rộng</b> có thể vượt chương trình lớp để tạo cầu nối lên cấp độ cao hơn.</div><div class="mindmap-tabs">${maps.map(x=>`<button class="mind-tab ${x[0]===root[0]?'active':''}" data-mind-root="${escapeHtml(x[0])}"><b>${escapeHtml(x[0])}</b><span>${escapeHtml(x[1])}</span></button>`).join('')}</div><div class="mindmap-card"><div class="mindmap-canvas"><svg viewBox="0 0 100 100" preserveAspectRatio="none" class="mind-svg">${lines}</svg><div class="mind-node mind-root" style="left:${cx}%;top:${cy}%"><strong>${escapeHtml(root[0])}</strong><span>${escapeHtml(root[1])}</span></div>${nodes}</div><div class="mindmap-legend"><span>● Gốc từ</span><span>○ Dạng phát triển</span><span>↗ Mở rộng word family / cụm từ</span></div></div>`;
  document.querySelectorAll('[data-mind-root]').forEach(b=>b.onclick=()=>{state.mindmapRoot=b.dataset.mindRoot;save();renderMindmap()});
}

// ===== TOÁN TƯ DUY =====
function getMathKey(page){const all=JSON.parse(localStorage.getItem('hubMathKeys')||'{}');return all[page]||[]}
function setMathKey(page,key){const all=JSON.parse(localStorage.getItem('hubMathKeys')||'{}');all[page]=key;localStorage.setItem('hubMathKeys',JSON.stringify(all))}
function getMathAnswers(page){const all=JSON.parse(localStorage.getItem('hubMathAnswers')||'{}');return all[page]||[]}
function setMathAnswers(page,ans){const all=JSON.parse(localStorage.getItem('hubMathAnswers')||'{}');all[page]=ans;localStorage.setItem('hubMathAnswers',JSON.stringify(all))}
function renderMath(){
  const item=M[state.mathPage-1]||M[0], key=getMathKey(item.id), answers=getMathAnswers(item.id), count=item.answerCount;
  const answerBoxes=Array.from({length:count},(_,i)=>`<label class="answer-field"><span>Câu ${i+1}</span><input data-math-answer="${i}" value="${escapeHtml(answers[i]||'')}" autocomplete="off"></label>`).join('');
  const teacher=state.mathMode==='teacher';
  const keyBoxes=Array.from({length:count},(_,i)=>`<label class="answer-field"><span>Đáp án ${i+1}</span><input data-math-key="${i}" value="${escapeHtml(key[i]||'')}" autocomplete="off"></label>`).join('');
  app.innerHTML=`<div class="toolbar"><select id="mathPageSelect" class="select">${M.map(x=>`<option value="${x.id}" ${x.id===item.id?'selected':''}>Trang ${x.id} · PDF ${x.pdfPage}</option>`).join('')}</select><div class="tabs math-mode-tabs"><button class="tab ${!teacher?'active':''}" data-math-mode="student">👧 Học sinh</button><button class="tab ${teacher?'active':''}" data-math-mode="teacher">🛠 Biên tập đáp án</button></div><span class="muted">${M.length} trang bài tập</span></div><div class="math-layout"><div class="math-viewer"><div class="math-toolbar"><button class="btn secondary" id="mathPrev">← Trang trước</button><button class="btn secondary" id="mathNext">Trang sau →</button><span>Trang PDF ${item.pdfPage}</span></div><div class="math-image-wrap"><img class="math-page-image" src="${item.image}" alt="Bài tập Toán lớp 1, trang ${item.pdfPage}" loading="eager"></div></div><div class="card math-answer-card">${teacher?`<h3>🛠 Đáp án chuẩn</h3><p class="muted">Nhập đáp án theo thứ tự câu hỏi trên trang. Không cần sửa mã nguồn.</p><div class="answer-grid">${keyBoxes}</div><button id="saveMathKey" class="btn primary">Lưu đáp án trang này</button><div class="note small-note">Tài liệu gốc là bản quét nên không có đáp án máy đọc được. Ứng dụng không tự đoán đáp án để tránh chấm sai.</div>`:`<h3>✏️ Bài làm của em</h3><p class="muted">Điền đáp án rồi bấm kiểm tra.</p><div class="answer-grid">${answerBoxes}</div><button id="checkMath" class="btn primary">Kiểm tra bài</button><div id="mathResult" class="math-result"></div>`}</div></div>`;
  $('#mathPageSelect').onchange=e=>{state.mathPage=+e.target.value;save();renderMath()};document.querySelectorAll('[data-math-mode]').forEach(b=>b.onclick=()=>{state.mathMode=b.dataset.mathMode;save();renderMath()});
  $('#mathPrev').onclick=()=>{state.mathPage=Math.max(1,state.mathPage-1);save();renderMath()};$('#mathNext').onclick=()=>{state.mathPage=Math.min(M.length,state.mathPage+1);save();renderMath()};
  if(teacher){$('#saveMathKey').onclick=()=>{const key=Array.from(document.querySelectorAll('[data-math-key]')).map(x=>x.value.trim());setMathKey(item.id,key);toast('Đã lưu đáp án trang này ✓');renderMath()}}
  else {$('#checkMath').onclick=()=>{const ans=Array.from(document.querySelectorAll('[data-math-answer]')).map(x=>x.value.trim());setMathAnswers(item.id,ans);if(!key.length||key.every(x=>!String(x).trim())){$('#mathResult').innerHTML='<div class="note">Chưa có đáp án chuẩn cho trang này. Hãy vào <b>Biên tập đáp án</b> để nhập đáp án trước khi chấm.</div>';return}let correct=0;ans.forEach((v,i)=>{if(String(v).trim().toLowerCase()===String(key[i]||'').trim().toLowerCase())correct++});const total=key.filter(x=>String(x).trim()).length;$('#mathResult').innerHTML=`<div class="result-card"><b>${correct}/${total}</b> câu đúng · ${total?Math.round(correct/total*100):0}%</div>`;showAnswerFeedback(correct===total,correct===total?'Chính xác!':'Cần xem lại',`${correct}/${total} câu đúng`);}}
}

// ===== TIẾNG VIỆT =====
function stories(){return D.stories.filter(x=>x.grade===state.storyGrade)}
function renderVietnamese(){
  let list=stories();if(!list.find(s=>s.id===state.storyId))state.storyId=list[0].id;const s=list.find(x=>x.id===state.storyId);
  app.innerHTML=`<div class="toolbar"><select id="storyGrade" class="select">${Array.from({length:10},(_,i)=>`<option value="${i+1}" ${state.storyGrade===i+1?'selected':''}>Lớp ${i+1}</option>`).join('')}</select><div class="read-controls"><button class="btn primary" id="readAll">🔊 Đọc to</button><button class="btn secondary" id="stopRead">⏹ Dừng</button></div><span class="muted">10 truyện/lớp · tổng 100 truyện · 16–19 câu/truyện</span></div><div class="reading-grid"><div class="card story-list">${list.map(x=>`<div class="story-item ${x.id===s.id?'active':''}" data-story="${x.id}"><b>${escapeHtml(x.title)}</b><small>${x.sentences.length} câu · Lớp ${x.grade}</small></div>`).join('')}</div><div class="card"><div class="story-head"><div><div class="eyebrow">TIẾNG VIỆT · LỚP ${s.grade}</div><h2 class="story-title">${escapeHtml(s.title)}</h2></div><button class="btn secondary" id="readStory">🔊 Đọc truyện</button></div><div class="story-text">${s.sentences.map(t=>`<span class="story-sentence">${escapeHtml(t)}</span>`).join('')}</div><h3 class="section-title" style="margin-top:12px">Câu hỏi đọc hiểu</h3>${s.questions.map((q,qi)=>`<div class="question"><b>${qi+1}. ${escapeHtml(q.q)}</b><div class="options">${q.options.map((o,oi)=>`<button class="option" data-q="${qi}" data-a="${oi}">${escapeHtml(o)}</button>`).join('')}</div></div>`).join('')}</div></div>`;
  $('#storyGrade').onchange=e=>{state.storyGrade=+e.target.value;const l=stories();state.storyId=l[0].id;save();render()};document.querySelectorAll('[data-story]').forEach(x=>x.onclick=()=>{state.storyId=+x.dataset.story;save();render()});
  const read=()=>speakVietnamese(s.sentences.join(' '));$('#readStory').onclick=read;$('#readAll').onclick=read;$('#stopRead').onclick=()=>speechSynthesis.cancel();
  document.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{const qi=+b.dataset.q,ai=+b.dataset.a,correct=s.questions[qi].answer;document.querySelectorAll(`[data-q="${qi}"]`).forEach(x=>x.disabled=true);if(ai===correct){b.classList.add('correct');showAnswerFeedback(true,'Chính xác!','Em đã hiểu nội dung câu chuyện.')}else{b.classList.add('wrong');document.querySelector(`[data-q="${qi}"][data-a="${correct}"]`).classList.add('correct');showAnswerFeedback(false,'Chưa đúng','Đọc lại đoạn truyện và thử câu tiếp theo.')}})
}

render();
hydrateVocabulary().then(()=>{if(vocabularyReady){render();toast('Đã nạp bộ từ vựng mở rộng theo cấp độ ✓')}});
