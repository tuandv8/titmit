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
  mathPage:Number(localStorage.getItem('hubMathPage')||1),
  mathMode:localStorage.getItem('hubMathMode')||'student'
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
  localStorage.setItem('hubMathPage',state.mathPage);localStorage.setItem('hubMathMode',state.mathMode);
  updatePill();
}
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove('show'),1700)}
function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

// ===== AUDIO =====
// Audio strategy:
// 1) Prefer a real en-US / vi-VN voice supplied by the device/browser.
// 2) If the device has no matching voice, use the browser's best language voice.
// 3) Never silently fail: a short WebAudio fallback tone confirms the button was pressed.
// Oxford remains a preferred external dictionary source when an audio file is available,
// but GitHub Pages must not expose an Oxford API key. The Web Speech API is the reliable
// browser-side fallback documented by MDN.
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
function saveAudioCache(){
  try{localStorage.setItem('hubEnglishAudioCache',JSON.stringify(remoteAudioCache))}catch(e){}
}
function stopActiveAudio(){
  if(activeAudio){try{activeAudio.pause();activeAudio.currentTime=0}catch(e){}activeAudio=null}
}
function playAudioUrl(url, onFail){
  if(!url)return onFail?.();
  stopActiveAudio();
  const audio=new Audio();
  audio.preload='auto';
  audio.src=url;
  activeAudio=audio;
  let failed=false;
  audio.onended=()=>{if(activeAudio===audio)activeAudio=null};
  audio.onerror=()=>{if(failed)return;failed=true;if(activeAudio===audio)activeAudio=null;onFail?.()};
  const p=audio.play();
  if(p&&typeof p.catch==='function')p.catch(()=>{if(!failed){failed=true;if(activeAudio===audio)activeAudio=null;onFail?.()}});
  return true;
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
    for(const entry of (Array.isArray(data)?data:[])) for(const p of (entry.phonetics||[])) if(p.audio) audios.push(p.audio);
    const us=audios.find(u=>/-us\.mp3(?:\?|$)/i.test(u))||audios.find(u=>/us/i.test(u))||audios[0]||'';
    if(us){remoteAudioCache[w]=us;saveAudioCache();return us}
  }catch(e){}
  return '';
}
function englishAudioUrl(word){
  const w=String(word).toLowerCase().trim().replace(/[^a-z'-]/g,'');
  return w?`https://api.dictionaryapi.dev/media/pronunciations/en/${w}-us.mp3`:'';
}
function speakEnglish(word){
  // Primary source: Free Dictionary API -> US pronunciation files sourced from
  // Wikimedia Commons. Try the predictable US file directly first so playback
  // starts inside the user's click gesture; then resolve the exact URL via API.
  const w=String(word).trim().toLowerCase();
  const cached=remoteAudioCache[w];
  const fallback=()=>resolveDictionaryAudio(w).then(url=>{
    if(url)return playAudioUrl(url,()=>browserSpeak(w,'en-US'));
    browserSpeak(w,'en-US');
  });
  if(cached)return playAudioUrl(cached,()=>fallback());
  return playAudioUrl(englishAudioUrl(w),()=>fallback());
}
function speakVietnamese(text){return browserSpeak(text,'vi-VN')}

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
    if(state.grade===g)h+=`<div class="subnav"><button type="button" data-page="vocabGames" class="${state.page==='vocabGames'?'active':''}">🌈 Vocabulary Games</button><button type="button" data-page="vocabList" class="${state.page==='vocabList'?'active':''}">📚 Vocabulary List</button><button type="button" data-page="math" class="${state.page==='math'?'active':''}">🧠 Toán tư duy</button><button type="button" data-page="vietnamese" class="${state.page==='vietnamese'?'active':''}">📖 Tiếng Việt</button></div>`;
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
  $('#pageTitle').textContent=({overview:'Tổng quan',vocabGames:'Vocabulary Games',vocabList:'Vocabulary List',math:'Toán tư duy',vietnamese:'Tiếng Việt'})[state.page]||'Tổng quan';
  ({overview:renderOverview,vocabGames:renderGames,vocabList:renderVocab,math:renderMath,vietnamese:renderVietnamese}[state.page]||renderOverview)();updatePill();
}
function renderOverview(){
  app.innerHTML=`<div class="hero"><div><div class="eyebrow" style="color:#eee">CHÀO MỪNG BẠN NHỎ</div><h2>Học vui • Nhớ lâu • Tự tin</h2><p>Lớp ${state.grade} · Chọn một khu vực để bắt đầu hôm nay.</p></div><div class="hero-art">🧒📚</div></div><div class="stats"><div class="stat"><strong>10</strong><span>Từ mới hôm nay</span></div><div class="stat"><strong>${D.stories.filter(x=>x.grade===state.grade).length}</strong><span>Truyện lớp ${state.grade}</span></div><div class="stat"><strong>${M.length}</strong><span>Trang Toán tương tác</span></div></div><h2 class="section-title">Nội dung học</h2><div class="grid"><div class="card module-card" data-go="vocabGames"><div class="module-icon">🌈</div><h3>Vocabulary Games</h3><p>Chọn từng trò chơi riêng, mỗi trò có điểm riêng.</p><span class="go">Học ngay →</span></div><div class="card module-card" data-go="vocabList"><div class="module-icon">📚</div><h3>Vocabulary List</h3><p>10 từ mới hôm nay, flashcard, đã thuộc và cần học.</p><span class="go">Mở danh sách →</span></div><div class="card module-card" data-go="math"><div class="module-icon">🧠</div><h3>Toán tư duy</h3><p>46 trang bài tập được cắt từ tài liệu, có lớp nhập và chấm đáp án.</p><span class="go">Làm bài →</span></div><div class="card module-card" data-go="vietnamese"><div class="module-icon">📖</div><h3>Tiếng Việt</h3><p>100 truyện cổ tích và ngụ ngôn, 16–19 câu, đọc to và đọc hiểu.</p><span class="go">Đọc truyện →</span></div></div>`;
  document.querySelectorAll('[data-go]').forEach(x=>x.onclick=()=>{state.page=x.dataset.go;save();render()});
}

// ===== VOCAB LIST =====
function vocab(){return D.vocabulary[String(state.grade)]||[]}
function isMastered(word){return !!(progress.mastered&&progress.mastered[word])}
function setMastered(word,val){progress.mastered=progress.mastered||{};progress.mastered[word]=val;progress.today=progress.today||{};progress.today[word]=val;save()}
function renderVocab(){
  const words=vocab(), mastered=words.filter(x=>isMastered(x.word)), need=words.filter(x=>!isMastered(x.word));
  let body='';
  if(state.vocabTab==='today') body=`<div class="flash-grid">${words.map((x,i)=>`<div class="flash"><div><span class="eyebrow">TỪ ${i+1}/10</span><div class="word">${escapeHtml(x.word)}</div><div class="meaning">${escapeHtml(x.meaning)}</div></div><div class="flash-actions"><button class="btn secondary sound" title="Nghe phát âm Oxford Mỹ" data-en-speak="${escapeHtml(x.word)}">🔊</button><button class="btn ${isMastered(x.word)?'good':'warn'}" data-master="${escapeHtml(x.word)}">${isMastered(x.word)?'✓ Đã thuộc':'□ Cần học'}</button></div></div>`).join('')}</div>`;
  else {const arr=state.vocabTab==='mastered'?mastered:need;body=arr.length?`<div class="word-list">${arr.map(x=>`<div class="word-row"><b>${escapeHtml(x.word)}</b><span>${escapeHtml(x.meaning)}</span><button class="btn secondary sound" data-en-speak="${escapeHtml(x.word)}">🔊</button><label class="check"><input type="checkbox" ${isMastered(x.word)?'checked':''} data-check="${escapeHtml(x.word)}"> Đã thuộc</label></div>`).join('')}</div>`:`<div class="empty">Chưa có từ nào ở mục này.</div>`}
  app.innerHTML=`<div class="toolbar"><select id="gradeSelect" class="select">${Array.from({length:10},(_,i)=>`<option value="${i+1}" ${state.grade===i+1?'selected':''}>Lớp ${i+1}</option>`).join('')}</select><span class="muted">Phát âm tiếng Anh ưu tiên bản ghi American English từ Dictionary API; bản ghi âm được dẫn từ Wikimedia Commons. Nếu không có, ứng dụng sẽ dùng giọng en-US của thiết bị.</span></div><div class="tabs"><button class="tab ${state.vocabTab==='today'?'active':''}" data-vtab="today">10 từ mới hôm nay</button><button class="tab ${state.vocabTab==='mastered'?'active':''}" data-vtab="mastered">Vocab đã thuộc (${mastered.length})</button><button class="tab ${state.vocabTab==='need'?'active':''}" data-vtab="need">Cần học (${need.length})</button></div>${body}`;
  $('#gradeSelect').onchange=e=>{state.grade=+e.target.value;save();render()};document.querySelectorAll('[data-vtab]').forEach(x=>x.onclick=()=>{state.vocabTab=x.dataset.vtab;save();render()});document.querySelectorAll('[data-en-speak]').forEach(x=>x.onclick=()=>speakEnglish(x.dataset.enSpeak));document.querySelectorAll('[data-master]').forEach(x=>x.onclick=()=>{setMastered(x.dataset.master,!isMastered(x.dataset.master));render()});document.querySelectorAll('[data-check]').forEach(x=>x.onchange=()=>{setMastered(x.dataset.check,x.checked);render()});
}

// ===== VOCAB GAMES =====
function resetGame(tab){state.gameIndex[tab]=0;state.gameScore[tab]=0;}
function currentGameWord(tab){const words=vocab();return words[state.gameIndex[tab]%words.length]||words[0]}
function nextGame(tab){state.gameIndex[tab]=(state.gameIndex[tab]+1)%Math.max(1,vocab().length);save();renderGames()}
function maskedWord(word){
  const n=word.length;let start=Math.max(1,Math.floor(n/2)-1);let len=n>=6?2:1;if(start+len>n-1)start=Math.max(1,n-len-1);return {before:word.slice(0,start),missing:word.slice(start,start+len),after:word.slice(start+len)};
}
function gameTabs(){return `<div class="tabs game-tabs"><button class="tab ${state.gameTab==='choice'?'active':''}" data-game-tab="choice">🎯 Chọn từ</button><button class="tab ${state.gameTab==='fill'?'active':''}" data-game-tab="fill">✏️ Hoàn thiện từ</button><button class="tab ${state.gameTab==='listen'?'active':''}" data-game-tab="listen">🎧 Nghe và chọn</button></div>`}
function renderGames(){
  const w=currentGameWord(state.gameTab);let body='';
  if(state.gameTab==='choice'){
    const choices=[w.word,...vocab().filter(x=>x.word!==w.word).slice(0,3).map(x=>x.word)].sort(()=>Math.random()-.5);
    body=`<div class="card game-card single-game"><div class="eyebrow">GAME 1 · CHỌN TỪ</div><button class="btn secondary sound big-sound" data-en-speak="${escapeHtml(w.word)}">🔊 Nghe từ</button><div class="game-question">Từ tiếng Anh nào có nghĩa <em>“${escapeHtml(w.meaning)}”</em>?</div><div class="options">${choices.map(c=>`<button class="option" data-choice="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}</div><div class="score-line">Điểm trò này: <b>${state.gameScore.choice}</b> · ${state.gameIndex.choice+1}/${vocab().length}</div></div>`;
  } else if(state.gameTab==='fill'){
    const m=maskedWord(w.word);
    body=`<div class="card game-card single-game"><div class="eyebrow">GAME 2 · HOÀN THIỆN TỪ</div><div class="game-question">Điền đúng phần còn thiếu.</div><div class="inline-word" aria-label="Từ có một phần bị khuyết"><span>${escapeHtml(m.before)}</span><input id="fillInput" class="inline-letter-input" maxlength="${m.missing.length}" autocomplete="off" aria-label="Phần còn thiếu"><span>${escapeHtml(m.after)}</span></div><button class="btn secondary" data-en-speak="${escapeHtml(w.word)}">🔊 Nghe</button><button id="checkFill" class="btn primary" style="margin-top:12px">Kiểm tra</button><div id="fillResult" class="result-space"></div><div class="score-line">Điểm trò này: <b>${state.gameScore.fill}</b> · ${state.gameIndex.fill+1}/${vocab().length}</div></div>`;
  } else {
    const choices=[w,...vocab().filter(x=>x.word!==w.word).slice(0,3)].sort(()=>Math.random()-.5);
    body=`<div class="card game-card single-game"><div class="eyebrow">GAME 3 · NGHE VÀ CHỌN</div><button id="playListen" class="listen-big">🔊</button><div class="game-question">Nghe từ rồi chọn từ em vừa nghe.</div><div class="options">${choices.map(c=>`<button class="option" data-listen-choice="${escapeHtml(c.word)}">${escapeHtml(c.word)}</button>`).join('')}</div><div class="score-line">Điểm trò này: <b>${state.gameScore.listen}</b> · ${state.gameIndex.listen+1}/${vocab().length}</div></div>`;
  }
  app.innerHTML=`<div class="note">🔊 Âm thanh tiếng Anh ưu tiên bản ghi American English từ Dictionary API/Wikimedia Commons; nếu từ chưa có bản ghi, ứng dụng sẽ dùng giọng en-US của thiết bị.</div>${gameTabs()}${body}`;
  document.querySelectorAll('[data-game-tab]').forEach(b=>b.onclick=()=>{state.gameTab=b.dataset.gameTab;save();renderGames()});
  document.querySelectorAll('[data-en-speak]').forEach(b=>b.onclick=()=>speakEnglish(b.dataset.enSpeak));
  document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{const ok=b.dataset.choice===w.word;if(ok){b.classList.add('correct');state.gameScore.choice++;showAnswerFeedback(true,'Chính xác!','Tuyệt vời, em đã chọn đúng.');setTimeout(()=>nextGame('choice'),900)}else{b.classList.add('wrong');showAnswerFeedback(false,'Chưa đúng','Hãy thử lại nhé.');}});
  if($('#checkFill'))$('#checkFill').onclick=()=>{const v=$('#fillInput').value.trim().toLowerCase();const m=maskedWord(w.word);if(v===m.missing.toLowerCase()){state.gameScore.fill++;$('#fillResult').innerHTML='<span class="success">✓ Chính xác!</span>';showAnswerFeedback(true,'Chính xác!','Phần còn thiếu hoàn toàn đúng.');setTimeout(()=>nextGame('fill'),900)}else {$('#fillResult').innerHTML='<span class="error">✗ Chưa đúng. Em chỉ cần điền phần bị khuyết.</span>';showAnswerFeedback(false,'Chưa đúng','Kiểm tra lại phần chữ còn thiếu.');}};
  if($('#fillInput'))$('#fillInput').onkeydown=e=>{if(e.key==='Enter')$('#checkFill').click()};
  document.querySelectorAll('[data-listen-choice]').forEach(b=>b.onclick=()=>{const ok=b.dataset.listenChoice===w.word;if(ok){b.classList.add('correct');state.gameScore.listen++;showAnswerFeedback(true,'Chính xác!','Em nghe rất tốt.');setTimeout(()=>nextGame('listen'),900)}else{b.classList.add('wrong');showAnswerFeedback(false,'Chưa đúng','Hãy bấm loa và nghe lại.');}});
  if($('#playListen'))$('#playListen').onclick=()=>speakEnglish(w.word);
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
