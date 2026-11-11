const temperaturePoints = [
  [1980,.26],[1981,.32],[1982,.14],[1983,.31],[1984,.16],[1985,.12],[1986,.18],[1987,.32],[1988,.39],[1989,.27],
  [1990,.45],[1991,.41],[1992,.22],[1993,.23],[1994,.31],[1995,.45],[1996,.33],[1997,.47],[1998,.61],[1999,.38],
  [2000,.39],[2001,.53],[2002,.63],[2003,.62],[2004,.53],[2005,.68],[2006,.64],[2007,.66],[2008,.54],[2009,.66],
  [2010,.72],[2011,.61],[2012,.65],[2013,.67],[2014,.75],[2015,.89],[2016,1.01],[2017,.91],[2018,.85],[2019,.98],
  [2020,1.01],[2021,.85],[2022,.89],[2023,1.17],[2024,1.28]
].map(([year,value],index)=>({year,value,frame:594+index*6}));

const bands = [
  {name:'Arctic',range:'60°–90°N',start:0,end:1/6},
  {name:'N. Mid-Latitudes',range:'30°–60°N',start:1/6,end:1/3},
  {name:'Tropics',range:'30°S–30°N',start:1/3,end:2/3},
  {name:'S. Mid-Latitudes',range:'30°–60°S',start:2/3,end:5/6},
  {name:'Antarctic',range:'60°–90°S',start:5/6,end:1}
];

const categoryLabels = {cool:'Cooler',reference:'Baseline',warm:'Warmer'};
const analysisCache = new Map();
const globeTextureCache = new Map();
const state = {
  yearIndex:0,
  bandIndex:0,
  mode:'history',
  section:'workbench',
  view:'flat',
  globeRotation:0,
  muted:false,
  playing:false,
  token:0,
  globeFrame:0
};
let audioContext = null;
let masterGain = null;
const activeSources = new Set();

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const clamp = (value,min,max)=>Math.max(min,Math.min(max,value));
const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));
const signed = value => `${value>=0?'+':''}${value.toFixed(2)}`;
const currentPoint = ()=>temperaturePoints[state.yearIndex];

function setStatus(message){
  const el = $('#live-status');
  if (el) el.textContent = message;
}

function notifyParentScan(scanning, bandIndex = state.bandIndex, customLatRatio = null) {
  if (window.parent && window.parent !== window) {
    const band = bands[bandIndex] || bands[0];
    const point = currentPoint();
    const latRatio = typeof customLatRatio === 'number' ? customLatRatio : (band.start + band.end) / 2;
    window.parent.postMessage({
      type: 'MONITOR_SCAN_UPDATE',
      scanning,
      year: point.year,
      value: point.value,
      bandIndex,
      bandName: band.name,
      latRatio
    }, '*');
  }
}

async function ensureAudio(){
  if(!audioContext){
    const AudioCtor=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtor){ setStatus('Web Audio API unavailable.'); return true; }
    audioContext=new AudioCtor();
    masterGain=audioContext.createGain();
    masterGain.gain.value=state.muted?0:.72;
    masterGain.connect(audioContext.destination);
  }
  if(audioContext.state==='suspended'){
    audioContext.resume().catch(()=>{});
  }
  return true;
}

function trackSource(source){
  activeSources.add(source);
  source.addEventListener('ended',()=>activeSources.delete(source),{once:true});
  return source;
}

function setPlayHistoryButtonState(playing){
  const btn = $('#play-history');
  if (!btn) return;
  const spans = btn.querySelectorAll('span');
  if (spans.length >= 2) {
    spans[0].textContent = playing ? '■' : '▶';
    spans[1].textContent = playing ? ' Stop' : 'Play history';
  } else {
    btn.textContent = playing ? '■ Stop' : '▶ Play history';
  }
}

function stopAudio(update=true){
  state.token+=1;
  state.playing=false;
  activeSources.forEach(source=>{try{source.stop();}catch{}});
  activeSources.clear();
  setPlayHistoryButtonState(false);
  $('#scan-rule').classList.remove('scanning');
  document.body.classList.remove('busy');
  notifyParentScan(false);
  if(update) setStatus('Playback stopped.');
}

function envelope(gain,start,duration,level=.16){
  gain.gain.setValueAtTime(.0001,start);
  gain.gain.exponentialRampToValueAtTime(level,start+.02);
  gain.gain.exponentialRampToValueAtTime(.0001,start+Math.max(.06,duration));
}

function historyFrequency(value){ return clamp(180*Math.pow(4,(value+.8)/3),150,850); }

async function playHistoryTone(value,duration=.34){
  if(!await ensureAudio()||state.muted) return;
  const now=audioContext.currentTime;
  const frequency=historyFrequency(value);
  const gain=audioContext.createGain();
  const filter=audioContext.createBiquadFilter();
  filter.type='lowpass'; filter.frequency.value=2200;
  envelope(gain,now,duration,.18);
  [1,2].forEach((multiple,index)=>{
    const osc=trackSource(audioContext.createOscillator());
    osc.type=index?'sine':'triangle';
    osc.frequency.value=frequency*multiple;
    osc.connect(gain); osc.start(now); osc.stop(now+duration+.03);
  });
  gain.connect(filter); filter.connect(masterGain);
}

async function playBoundaryClick(){
  if(!await ensureAudio()||state.muted) return;
  const now=audioContext.currentTime;
  const osc=trackSource(audioContext.createOscillator());
  const gain=audioContext.createGain();
  osc.type='square'; osc.frequency.setValueAtTime(145,now); osc.frequency.exponentialRampToValueAtTime(70,now+.045);
  envelope(gain,now,.055,.09); osc.connect(gain); gain.connect(masterGain); osc.start(now); osc.stop(now+.07);
}

async function playCategory(category,duration=.85){
  if(!await ensureAudio()||state.muted) return;
  const now=audioContext.currentTime;
  if(category==='cool'){
    const gain=audioContext.createGain(); envelope(gain,now,duration,.1);
    [196,204].forEach(freq=>{const osc=trackSource(audioContext.createOscillator());osc.type='sine';osc.frequency.value=freq;osc.connect(gain);osc.start(now);osc.stop(now+duration+.04)});
    const filter=audioContext.createBiquadFilter();filter.type='lowpass';filter.frequency.value=820;gain.connect(filter);filter.connect(masterGain);
  }else if(category==='reference'){
    const gain=audioContext.createGain(); envelope(gain,now,duration,.13);
    const osc=trackSource(audioContext.createOscillator());osc.type='triangle';osc.frequency.value=330;osc.connect(gain);gain.connect(masterGain);osc.start(now);osc.stop(now+duration+.04);
  }else{
    const count=Math.max(1,Math.floor(duration/.14));
    for(let i=0;i<count;i++){
      const start=now+i*(duration/count);const length=Math.min(.12,duration/count*.85);
      const gain=audioContext.createGain();envelope(gain,start,length,.11);
      const osc=trackSource(audioContext.createOscillator());osc.type='sine';osc.frequency.value=i%2?660:540;osc.connect(gain);gain.connect(masterGain);osc.start(start);osc.stop(start+length+.02);
    }
  }
}

function nearestGroup(r,g,b){
  if((r+g+b)/3<34) return null;
  const groups={
    cool:[[22,47,109],[62,100,160],[168,201,224]],
    reference:[[232,235,228],[247,244,210]],
    warm:[[250,215,62],[226,119,27],[177,17,9]]
  };
  let winner='reference',best=Infinity;
  Object.entries(groups).forEach(([group,anchors])=>anchors.forEach(([ar,ag,ab])=>{
    const distance=(r-ar)**2+(g-ag)**2+(b-ab)**2;
    if(distance<best){best=distance;winner=group;}
  }));
  return winner;
}

async function getGlobeTexture(year){
  if(globeTextureCache.has(year)) return globeTextureCache.get(year);
  const image=new Image();image.src=`../assets/eic/${year}.webp`;image.alt='';
  try{await image.decode();}catch{throw new Error(`The NASA frame for ${year} could not be projected onto the globe.`)}
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
  const context=canvas.getContext('2d',{willReadFrequently:true});
  context.drawImage(image,0,0,canvas.width,canvas.height);
  const texture={width:canvas.width,height:canvas.height,pixels:context.getImageData(0,0,canvas.width,canvas.height).data};
  globeTextureCache.set(year,texture);
  return texture;
}

async function renderGlobe(){
  if(state.view!=='globe') return;
  const renderId=++state.globeFrame;
  const canvas=$('#earth-globe'),context=canvas.getContext('2d');
  const year=currentPoint().year;
  let texture;
  try{texture=await getGlobeTexture(year);}catch(error){setStatus(error.message);return;}
  if(renderId!==state.globeFrame||state.view!=='globe'||year!==currentPoint().year)return;
  const size=canvas.width,cx=size/2,cy=size/2,radius=size*.44;
  const output=context.createImageData(size,size),data=output.data;
  const rotation=state.globeRotation;
  for(let y=0;y<size;y++){
    const ny=(y-cy)/radius;
    for(let x=0;x<size;x++){
      const nx=(x-cx)/radius,radial=nx*nx+ny*ny;
      if(radial>1)continue;
      const nz=Math.sqrt(1-radial);
      const latitude=Math.asin(-ny);
      const longitude=Math.atan2(nx,nz)+rotation;
      const u=((longitude/(Math.PI*2)+.5)%1+1)%1;
      const v=clamp(.5-latitude/Math.PI,0,1);
      const sourceX=Math.min(texture.width-1,Math.floor(u*texture.width));
      const sourceY=Math.min(texture.height-1,Math.floor(v*texture.height));
      const source=(sourceY*texture.width+sourceX)*4,target=(y*size+x)*4;
      const light=Math.max(0,nx*-.28+ny*-.22+nz*.92);
      const shade=.77+.23*light;
      data[target]=texture.pixels[source]*shade;
      data[target+1]=texture.pixels[source+1]*shade;
      data[target+2]=texture.pixels[source+2]*shade;
      data[target+3]=255;
    }
  }
  context.clearRect(0,0,size,size);context.putImageData(output,0,0);
  context.save();context.beginPath();context.arc(cx,cy,radius,0,Math.PI*2);context.clip();
  const band=bands[state.bandIndex];
  const yA=cy-Math.sin(Math.PI/2-band.start*Math.PI)*radius;
  const yB=cy-Math.sin(Math.PI/2-band.end*Math.PI)*radius;
  context.fillStyle='rgba(228,184,70,.11)';context.fillRect(cx-radius,Math.min(yA,yB),radius*2,Math.abs(yB-yA));
  context.strokeStyle='rgba(255,253,247,.28)';context.lineWidth=1;
  [-60,-30,0,30,60].forEach(degrees=>{
    const latitude=degrees*Math.PI/180,yLine=cy-Math.sin(latitude)*radius,halfWidth=Math.cos(latitude)*radius;
    context.beginPath();context.moveTo(cx-halfWidth,yLine);context.lineTo(cx+halfWidth,yLine);context.stroke();
  });
  context.strokeStyle='rgba(228,184,70,.95)';context.lineWidth=3;
  [band.start,band.end].forEach(edge=>{
    const latitude=Math.PI/2-edge*Math.PI,yLine=cy-Math.sin(latitude)*radius,halfWidth=Math.cos(latitude)*radius;
    context.beginPath();context.moveTo(cx-halfWidth,yLine);context.lineTo(cx+halfWidth,yLine);context.stroke();
  });
  const vignette=context.createRadialGradient(cx-radius*.22,cy-radius*.25,radius*.1,cx,cy,radius*1.08);
  vignette.addColorStop(0,'rgba(255,255,255,.09)');vignette.addColorStop(.62,'rgba(0,0,0,0)');vignette.addColorStop(1,'rgba(0,0,0,.32)');
  context.fillStyle=vignette;context.fillRect(cx-radius,cy-radius,radius*2,radius*2);context.restore();
  context.beginPath();context.arc(cx,cy,radius,0,Math.PI*2);context.strokeStyle='rgba(255,255,255,.72)';context.lineWidth=2;context.stroke();
  canvas.setAttribute('aria-label',`Interactive round projection of the ${year} NASA temperature frame. ${bands[state.bandIndex].name}, ${bands[state.bandIndex].range}, is highlighted.`);
}

let globeAnimationFrame=0;
function scheduleGlobeRender(){
  if(globeAnimationFrame)return;
  globeAnimationFrame=requestAnimationFrame(()=>{globeAnimationFrame=0;renderGlobe();});
}

function setEarthView(){
  state.view='flat';
  $('#map-stage').dataset.view='flat';
  $('#frame-image').hidden=false;
  $('#latitude-bands').hidden=false;
  $('#scan-rule').hidden=false;
  if($('#flat-view')) $('#flat-view').setAttribute('aria-pressed','true');
}

function rotateGlobe(delta){state.globeRotation=(state.globeRotation+delta)%(Math.PI*2);scheduleGlobeRender();}

async function analyzeYear(year){
  if(analysisCache.has(year)) return analysisCache.get(year);
  const image=new Image(); image.src=`../assets/eic/${year}.webp`; image.alt='';
  try{await image.decode();}catch{throw new Error(`The NASA frame for ${year} could not be loaded.`)}
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
  const context=canvas.getContext('2d',{willReadFrequently:true});
  context.drawImage(image,0,0,canvas.width,canvas.height);
  const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
  const vectors=bands.map(band=>{
    const counts={cool:0,reference:0,warm:0,valid:0,unclassified:0};
    const yStart=Math.floor(canvas.height*band.start);const yEnd=Math.ceil(canvas.height*band.end);
    for(let y=yStart;y<yEnd;y+=2){
      for(let x=0;x<canvas.width;x+=2){
        const offset=(y*canvas.width+x)*4;
        if(pixels[offset+3]<220){counts.unclassified++;continue;}
        const group=nearestGroup(pixels[offset],pixels[offset+1],pixels[offset+2]);
        if(!group){counts.unclassified++;continue;}
        counts[group]++;counts.valid++;
      }
    }
    const divisor=Math.max(1,counts.valid);
    return {cool:counts.cool/divisor,reference:counts.reference/divisor,warm:counts.warm/divisor,valid:counts.valid,unclassified:counts.unclassified};
  });
  analysisCache.set(year,vectors);
  return vectors;
}

async function updateFrameAnalysis(){
  const {year}=currentPoint();
  try{
    const vectors=await analyzeYear(year);
    if(currentPoint().year!==year) return;
    renderBandVector(vectors[state.bandIndex]);
    updateLedger(vectors[state.bandIndex]);
  }catch(error){ setStatus(error.message); }
}

function updateYear(index,{play=false}={}){
  state.yearIndex=clamp(index,0,temperaturePoints.length-1);
  const point=currentPoint();
  $('#frame-image').src=`../assets/eic/${point.year}.webp`;
  $('#frame-image').alt=`NASA global temperature anomaly visualization for ${point.year}`;
  $('#frame-year').textContent=point.year;
  $('#frame-index').textContent=point.frame;
  $('#history-year').textContent=point.year;
  $('#history-value').textContent=`${signed(point.value)} °C`;
  $('#history-frequency').textContent=`${Math.round(historyFrequency(point.value))} Hz`;
  $('#year-slider').value=state.yearIndex;
  $('#year-slider').setAttribute('aria-valuetext',`${point.year}, ${signed(point.value)} degrees Celsius`);
  $('#year-output').textContent=point.year;
  updateFrameAnalysis();
  renderGlobe();
  if(play) playHistoryTone(point.value);

  // Sync the 3D studio globe in the parent window
  if(window.parent && window.parent !== window){
    window.parent.postMessage({
      type: 'MONITOR_YEAR_CHANGE',
      year: point.year,
      value: point.value
    }, '*');
  }
}

async function playHistory(){
  if(state.playing){stopAudio();return;}
  if(!await ensureAudio()) return;
  stopAudio(false);
  state.playing=true;
  const token=state.token;
  document.body.classList.add('busy');
  setPlayHistoryButtonState(true);

  // Ensure flat map is visible on monitor so user sees the year-by-year color changes alongside the 3D hologram globe
  if(state.view !== 'flat') setEarthView('flat');
  // Do NOT show the latitude scan rule or band highlights during History playback (reserved for Frame Scan)
  $('#scan-rule').classList.remove('scanning');
  $$('[data-band]').forEach(button=>button.setAttribute('aria-pressed','false'));
  notifyParentScan(false);

  // If starting at the very end (2024), wrap back to 1980
  if(state.yearIndex >= temperaturePoints.length - 1){
    state.yearIndex = 0;
  }

  for(let index=state.yearIndex;index<temperaturePoints.length;index++){
    if(token!==state.token) return;
    updateYear(index);
    await playHistoryTone(temperaturePoints[index].value, .30);
    await sleep(360);
  }
  if(token===state.token){
    state.playing=false;
    document.body.classList.remove('busy');
    setPlayHistoryButtonState(false);
  }
}

function selectBand(index,{focus=false, showHighlight=(state.mode==='frame')}={}){
  state.bandIndex=clamp(index,0,bands.length-1);
  $$('[data-band]').forEach(button=>{
    const isSelected = showHighlight && Number(button.dataset.band)===state.bandIndex;
    button.setAttribute('aria-pressed',String(isSelected));
  });
  $('#selected-band-summary strong').textContent=`${bands[state.bandIndex].name} · ${bands[state.bandIndex].range}`;
  if(focus) $$('#latitude-bands button')[state.bandIndex].focus();
  updateFrameAnalysis();
  renderGlobe();
}

function renderBandVector(vector){
  const categories=['cool','reference','warm'];
  $('#category-bars').innerHTML=categories.map(category=>{
    const percent=vector[category]*100;
    return `<div class="bar-row"><span>${categoryLabels[category]}</span><div class="bar-track" aria-hidden="true"><div class="bar-fill ${category}" style="width:${percent.toFixed(1)}%"></div></div><output>${percent.toFixed(0)}%</output></div>`;
  }).join('');
}

function updateLedger(vector){
  const point=currentPoint(),band=bands[state.bandIndex];
  $('#ledger-summary').textContent=`${point.year} · ${band.name}: ${(vector.cool*100).toFixed(0)}% cooler, ${(vector.reference*100).toFixed(0)}% baseline, ${(vector.warm*100).toFixed(0)}% warmer.`;
}

async function playBandPattern(vector,label,token=state.token){
  await playBoundaryClick();await sleep(120);
  const total=2100;
  for(const category of ['cool','reference','warm']){
    if(token!==state.token) return;
    const duration=Math.max(0,vector[category]*total);
    if(duration<70) continue;
    await playCategory(category,duration/1000);await sleep(duration+40);
  }
}

async function playSelectedBand(){
  stopAudio(false);const token=state.token;document.body.classList.add('busy');
  try{
    selectBand(state.bandIndex, {showHighlight:true});
    notifyParentScan(true, state.bandIndex);
    const vectors=await analyzeYear(currentPoint().year);
    await playBandPattern(vectors[state.bandIndex],`${currentPoint().year}, ${bands[state.bandIndex].name}`,token);
  }
  catch(error){setStatus(error.message)}
  if(token===state.token){
    document.body.classList.remove('busy');
    if(state.mode!=='frame') notifyParentScan(false);
  }
}

async function scanFrame(){
  stopAudio(false);const token=state.token;document.body.classList.add('busy');
  if(state.view!=='flat') setEarthView('flat');
  $('#scan-rule').classList.add('scanning');
  try{
    const vectors=await analyzeYear(currentPoint().year);
    for(let i=0;i<bands.length;i++){
      if(token!==state.token)return;
      selectBand(i, {showHighlight:true});
      const midRatio = (bands[i].start + bands[i].end) / 2;
      $('#scan-rule').style.top=`${midRatio * calcMapHeight()}px`;
      notifyParentScan(true, i);
      await playBandPattern(vectors[i],`${currentPoint().year}, ${bands[i].name}`,token);await sleep(180);
    }
  }catch(error){setStatus(error.message)}
  if(token===state.token){
    document.body.classList.remove('busy');
    $('#scan-rule').classList.remove('scanning');
    notifyParentScan(false);
  }
}

function calcMapHeight(){return $('#frame-image').clientHeight||$('#map-stage')?.clientHeight||380}

function setMode(mode){
  stopAudio(false);state.mode=mode;
  const tabs={history:'#history-tab',frame:'#frame-tab',learn:'#learn-tab'};
  const panels={history:'#history-panel',frame:'#frame-panel',learn:'#learn-panel'};
  Object.keys(tabs).forEach(key=>{
    $(tabs[key]).setAttribute('aria-selected',String(key===mode));
    $(tabs[key]).tabIndex=key===mode?0:-1;
    $(panels[key]).hidden=key!==mode;
  });
  if(mode==='frame'){
    selectBand(state.bandIndex, {showHighlight:true});
    notifyParentScan(true, state.bandIndex);
  }else{
    $$('[data-band]').forEach(button=>button.setAttribute('aria-pressed','false'));
    $('#scan-rule').classList.remove('scanning');
    notifyParentScan(false);
  }
}

function setSection(sectionName){
  stopAudio(false);
  state.section = sectionName;
  $$('[data-section]').forEach(sec => {
    sec.hidden = sec.dataset.section !== sectionName;
  });
  $$('.section-tab[data-section-target]').forEach(btn => {
    btn.setAttribute('aria-selected', String(btn.dataset.sectionTarget === sectionName));
  });
}

function populateSelects(){
  const years=temperaturePoints.map(point=>`<option value="${point.year}">${point.year}</option>`).join('');
  $('#compare-year-a').innerHTML=years;$('#compare-year-b').innerHTML=years;$('#compare-year-b').value='2024';
  $('#compare-band').innerHTML=bands.map((band,index)=>`<option value="${index}">${band.name} · ${band.range}</option>`).join('');
}

async function updateComparison(){
  const yearA=Number($('#compare-year-a').value),yearB=Number($('#compare-year-b').value),bandIndex=Number($('#compare-band').value);
  try{
    const [vectorsA,vectorsB]=await Promise.all([analyzeYear(yearA),analyzeYear(yearB)]);
    const a=vectorsA[bandIndex],b=vectorsB[bandIndex];
    const cards=$$('#compare-output>div:not(.difference-mark)');
    cards[0].innerHTML=`<span>Frame A</span><strong>${yearA}</strong><p>${(a.cool*100).toFixed(0)}% cooler · ${(a.reference*100).toFixed(0)}% baseline · ${(a.warm*100).toFixed(0)}% warmer</p>`;
    cards[1].innerHTML=`<span>Frame B</span><strong>${yearB}</strong><p>${(b.cool*100).toFixed(0)}% cooler · ${(b.reference*100).toFixed(0)}% baseline · ${(b.warm*100).toFixed(0)}% warmer</p>`;
  }catch(error){setStatus(error.message)}
}

async function playComparison(){
  stopAudio(false);const token=state.token;document.body.classList.add('busy');
  const yearA=Number($('#compare-year-a').value),yearB=Number($('#compare-year-b').value),bandIndex=Number($('#compare-band').value);
  try{
    const [a,b]=await Promise.all([analyzeYear(yearA),analyzeYear(yearB)]);
    await playBandPattern(a[bandIndex],`Frame A, ${yearA}`,token);await sleep(500);
    if(token!==state.token)return;
    await playBandPattern(b[bandIndex],`Frame B, ${yearB}`,token);
  }catch(error){setStatus(error.message)}
  if(token===state.token)document.body.classList.remove('busy');
}

async function playLesson(){
  stopAudio(false);const token=state.token;document.body.classList.add('busy');
  try{
    const [a,b]=await Promise.all([analyzeYear(1980),analyzeYear(2024)]);
    await playBandPattern(a[0],'A, 1980 Arctic',token);await sleep(550);
    if(token!==state.token)return;
    await playBandPattern(b[0],'B, 2024 Arctic',token);
    if(token===state.token){$('#lesson-answers').disabled=false;$('#lesson-feedback').textContent='Choose the frame with more warmer-category coverage.';$$('.lesson-progress span')[1].classList.add('active');}
  }catch(error){setStatus(error.message)}
  if(token===state.token)document.body.classList.remove('busy');
}

async function answerLesson(year){
  const [a,b]=await Promise.all([analyzeYear(1980),analyzeYear(2024)]);
  const answer=a[0].warm>b[0].warm?'1980':'2024';const correct=year===answer;
  const feedback=$('#lesson-feedback');feedback.className=`lesson-feedback ${correct?'correct':'incorrect'}`;
  feedback.textContent=`${correct?'Correct!':'Not quite.'} Arctic warmer coverage: ${(a[0].warm*100).toFixed(0)}% in 1980 vs ${(b[0].warm*100).toFixed(0)}% in 2024.`;
  $$('.lesson-progress span')[2].classList.add('active');
}

function resetLesson(){
  stopAudio(false);$('#lesson-answers').disabled=true;
  $('#lesson-feedback').className='lesson-feedback';$('#lesson-feedback').textContent='Listen first, then choose A or B.';
  $$('.lesson-progress span').forEach((span,index)=>span.classList.toggle('active',index===0));
}

function copyLedger(){
  const text=$('#ledger-summary').textContent;
  if(navigator.clipboard?.writeText){navigator.clipboard.writeText(text);}
}

function bindEvents(){
  $$('[data-section-target]').forEach(el => {
    el.addEventListener('click', (event) => {
      event.preventDefault();
      setSection(el.dataset.sectionTarget);
    });
  });

  // Forward pointer movement to parent 3D studio so camera parallax works smoothly
  // without feedback loops when CSS3D transforms shift or when hovering buttons/controls
  let lastScreenX = null;
  let lastScreenY = null;
  window.addEventListener('pointermove', (event) => {
    if (!window.parent || window.parent === window || event.pointerType === 'touch') return;
    if (lastScreenX !== null && Math.hypot(event.screenX - lastScreenX, event.screenY - lastScreenY) < 2) {
      return;
    }
    lastScreenX = event.screenX;
    lastScreenY = event.screenY;

    // Keep camera steady when cursor is over interactive buttons/sliders so controls never shift under cursor
    if (event.target.closest && event.target.closest('button, input, select, a, label')) {
      return;
    }

    window.parent.postMessage({
      type: 'MONITOR_POINTER_MOVE',
      ratioX: event.clientX / window.innerWidth,
      ratioY: event.clientY / window.innerHeight
    }, '*');
  }, { passive: true });

  // Clicking on the monitor screen focuses the monitor (Telemetry Desk),
  // EXCEPT when clicking Play History / transport / scrubber / Frame Scan / audio controls
  const noFocusSelector = '#play-history, .transport, #previous-year, #next-year, #play-selected, #year-slider, .slider-block, #scan-frame, #play-band, .frame-actions, #history-tab, #frame-tab, #learn-tab, [data-band], #mute-toggle, #exit-to-studio';
  document.addEventListener('click', (event) => {
    if (!window.parent || window.parent === window) return;
    if (event.target.closest && event.target.closest(noFocusSelector)) {
      return;
    }
    if (event.composedPath) {
      const path = event.composedPath();
      if (path.some(el => el && el.matches && el.matches(noFocusSelector))) {
        return;
      }
    }
    window.parent.postMessage({ type: 'FOCUS_MONITOR' }, '*');
  });

  $('#history-tab').addEventListener('click',()=>setMode('history'));
  $('#frame-tab').addEventListener('click',()=>setMode('frame'));
  $('#learn-tab').addEventListener('click',()=>setMode('learn'));
  $$('.mode-tabs [role="tab"]').forEach((tab,index,tabs)=>tab.addEventListener('keydown',event=>{
    let next=index;
    if(event.key==='ArrowRight') next=(index+1)%tabs.length;
    else if(event.key==='ArrowLeft') next=(index-1+tabs.length)%tabs.length;
    else if(event.key==='Home') next=0;
    else if(event.key==='End') next=tabs.length-1;
    else return;
    event.preventDefault();
    tabs[next].click();
    tabs[next].focus();
  }));
  $('#frame-image').addEventListener('error',()=>setStatus(`The NASA frame for ${currentPoint().year} could not be loaded.`));
  $('#year-slider').addEventListener('input',event=>{stopAudio(false);updateYear(Number(event.target.value));});
  $('#year-slider').addEventListener('change',()=>playHistoryTone(currentPoint().value,.42));
  $('#previous-year').addEventListener('click',()=>{stopAudio(false);updateYear(state.yearIndex-1,{play:true});});
  $('#next-year').addEventListener('click',()=>{stopAudio(false);updateYear(state.yearIndex+1,{play:true});});
  $('#play-selected').addEventListener('click',()=>playHistoryTone(currentPoint().value,.6));
  $('#play-history').addEventListener('click',(event)=>{event.stopPropagation();playHistory();});
  $$('[data-band]').forEach(button=>button.addEventListener('click',()=>{stopAudio(false);if(state.mode!=='frame')setMode('frame');selectBand(Number(button.dataset.band),{showHighlight:true});notifyParentScan(true,Number(button.dataset.band));}));
  if($('#flat-view')) $('#flat-view').addEventListener('click',()=>setEarthView('flat'));
  $$('[data-legend]').forEach(button=>button.addEventListener('click',()=>playCategory(button.dataset.legend,1)));
  $('#scan-frame').addEventListener('click',scanFrame);$('#play-band').addEventListener('click',playSelectedBand);
  ['compare-year-a','compare-year-b','compare-band'].forEach(id=>$(`#${id}`).addEventListener('change',updateComparison));
  $('#compare-play').addEventListener('click',playComparison);
  $('#lesson-listen').addEventListener('click',playLesson);$$('[data-answer]').forEach(button=>button.addEventListener('click',()=>answerLesson(button.dataset.answer)));$('#lesson-reset').addEventListener('click',resetLesson);
  $('#copy-ledger').addEventListener('click',copyLedger);
  $('#mute-toggle').addEventListener('click',async()=>{state.muted=!state.muted;stopAudio(false);if(await ensureAudio())masterGain.gain.value=state.muted?0:.72;$('#mute-toggle').setAttribute('aria-pressed',String(state.muted));$('#mute-toggle').setAttribute('aria-label',state.muted?'Turn audio on':'Mute audio');$('#mute-toggle span:last-child').textContent=state.muted?'Muted':'Audio on';});

  function returnToStudio(){
    stopAudio(false);
    if(window.parent&&window.parent!==window){
      window.parent.postMessage({type:'EXIT_COMPUTER_MODE'},'*');
    }
  }

  const exitBtn=$('#exit-to-studio');
  if(exitBtn){
    exitBtn.addEventListener('click',returnToStudio);
  }

  window.addEventListener('message',event=>{
    if(event.data&&(event.data.type==='SUSPEND_WORKSTATION'||event.data.type==='PAUSE_ALL_AUDIO')){
      stopAudio(false);
    }
  });

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){
      stopAudio(false);
      if(window.self!==window.top){
        returnToStudio();
      }
    }
  });
}

function initialize(){
  populateSelects();bindEvents();selectBand(0);updateYear(0);updateComparison();
  if(new URLSearchParams(location.search).get('view')==='globe')setEarthView('globe');
}

initialize();
