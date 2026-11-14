const temperaturePoints = EARTH_DATA.points.filter(point => point.year <= 2025).map((point, index) => ({
  ...point,
  frame: point.year < 2025 ? 594 + index * 6 : null
}));
const LAST_REGIONAL_YEAR = temperaturePoints.at(-1).year;

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
  temperature:false,
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
const frameImagePath = year => `../assets/eic/${year}.webp`;
const signed = value => `${value>=0?'+':''}${value.toFixed(2)}`;
const currentPoint = ()=>temperaturePoints[state.yearIndex];
const isRegionalAvailable = year => Number.isInteger(year) && year>=temperaturePoints[0].year && year<=LAST_REGIONAL_YEAR;

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
      scanning: scanning && isRegionalAvailable(point.year),
      year: point.year,
      value: point.value,
      regionalAvailable: isRegionalAvailable(point.year),
      bandIndex,
      bandName: band.name,
      latRatio
    }, '*');
  }
}

async function ensureAudio(){
  if(!audioContext){
    const AudioCtor=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtor){ setStatus('Web Audio API unavailable.'); return false; }
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
  showQuizPlayback();
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
  if(!isRegionalAvailable(year)) throw new Error(`Regional NASA maps are available only through ${LAST_REGIONAL_YEAR}.`);
  if(globeTextureCache.has(year)) return globeTextureCache.get(year);
  const image=new Image();image.src=frameImagePath(year);image.alt='';
  try{await image.decode();}catch{throw new Error(`The NASA frame for ${year} could not be projected onto the globe.`)}
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
  const context=canvas.getContext('2d',{willReadFrequently:true});
  context.drawImage(image,0,0,canvas.width,canvas.height);
  const texture={width:canvas.width,height:canvas.height,pixels:context.getImageData(0,0,canvas.width,canvas.height).data};
  globeTextureCache.set(year,texture);
  return texture;
}

function renderGlobeUnavailable(year){
  const canvas=$('#earth-globe');
  if(!canvas) return;
  const context=canvas.getContext('2d');
  const size=canvas.width,cx=size/2,cy=size/2,radius=size*.44;
  context.clearRect(0,0,size,size);
  const fill=context.createRadialGradient(cx-radius*.25,cy-radius*.3,radius*.08,cx,cy,radius);
  fill.addColorStop(0,'#173647');fill.addColorStop(1,'#08161f');
  context.beginPath();context.arc(cx,cy,radius,0,Math.PI*2);context.fillStyle=fill;context.fill();
  context.strokeStyle='rgba(255,255,255,.38)';context.lineWidth=2;context.stroke();
  context.textAlign='center';
  context.fillStyle='rgba(255,253,247,.9)';context.font='600 15px sans-serif';
  context.fillText('Regional map unavailable',cx,cy-6);
  context.fillStyle='rgba(255,253,247,.62)';context.font='12px sans-serif';
  context.fillText(`Regional maps cover 1980–${LAST_REGIONAL_YEAR}`,cx,cy+16);
  context.textAlign='left';
  canvas.setAttribute('aria-label',`Regional NASA temperature projection unavailable for ${year}. Regional maps cover 1980 through ${LAST_REGIONAL_YEAR}.`);
}

async function renderGlobe(){
  if(state.view!=='globe') return;
  const renderId=++state.globeFrame;
  const canvas=$('#earth-globe'),context=canvas.getContext('2d');
  const year=currentPoint().year;
  if(!isRegionalAvailable(year)){renderGlobeUnavailable(year);return;}
  let texture;
  try{texture=await getGlobeTexture(year);}catch(error){
    if(renderId===state.globeFrame && state.view==='globe' && year===currentPoint().year) setStatus(error.message);
    return;
  }
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
  applyRegionalAvailability(currentPoint().year);
  if($('#flat-view')) $('#flat-view').setAttribute('aria-pressed','true');
}

function setTemperatureMode(enabled){
  state.temperature=Boolean(enabled);
  const mapStage=$('#map-stage');
  const button=$('#temperature-view');
  if(mapStage){
    mapStage.dataset.temperature=String(state.temperature);
    mapStage.setAttribute('aria-label',state.temperature
      ? `NASA global temperature anomaly map for ${currentPoint().year}`
      : 'NASA Blue Marble world map');
  }
  if(button) button.setAttribute('aria-pressed',String(state.temperature));
  if(window.parent&&window.parent!==window){
    window.parent.postMessage({
      type:'MONITOR_TEMPERATURE_MODE',
      enabled:state.temperature,
      year:currentPoint().year
    },'*');
  }
  setStatus(state.temperature
    ? `Temperature layer on for ${currentPoint().year}.`
    : 'Temperature layer off. Showing the natural-color Earth.');
}

function rotateGlobe(delta){state.globeRotation=(state.globeRotation+delta)%(Math.PI*2);scheduleGlobeRender();}

async function analyzeYear(year){
  if(!isRegionalAvailable(year)) return null;
  if(analysisCache.has(year)) return analysisCache.get(year);
  const image=new Image(); image.src=frameImagePath(year); image.alt='';
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

function renderUnavailableAnalysis(){
  const point=currentPoint();
  const bars=$('#category-bars');
  if(bars){
    bars.innerHTML=`<p class="analysis-unavailable">Regional category analysis is available for 1980–${LAST_REGIONAL_YEAR}.</p>`;
  }
  const ledger=$('#ledger-summary');
  if(ledger){
    ledger.textContent=`${point.year} · regional analysis unavailable (valid through ${LAST_REGIONAL_YEAR}).`;
  }
}

function applyRegionalAvailability(year){
  const available=isRegionalAvailable(year);
  const frameImage=$('#frame-image');
  const bandsEl=$('#latitude-bands');
  const notice=$('#regional-unavailable');
  if(frameImage) frameImage.hidden=!available;
  if(bandsEl) bandsEl.hidden=!available;
  if(notice) notice.hidden=available;
  const scanRule=$('#scan-rule');
  if(scanRule){
    scanRule.hidden=!available;
    if(!available) scanRule.classList.remove('scanning');
  }
  $$('[data-band]').forEach(button=>{
    button.disabled=!available;
    button.setAttribute('aria-disabled',String(!available));
    button.setAttribute('aria-pressed',String(available && state.mode==='frame' && Number(button.dataset.band)===state.bandIndex));
  });
  const scanButton=$('#scan-frame');
  const playBandButton=$('#play-band');
  if(scanButton) scanButton.disabled=!available;
  if(playBandButton) playBandButton.disabled=!available;
  const viewDescription=$('#view-description');
  if(viewDescription){
    viewDescription.textContent=available
      ?'Flat view shows the complete source frame and all five latitude bands at once.'
      :`${year} shows the official global annual anomaly. Regional NASA maps are available only through ${LAST_REGIONAL_YEAR}.`;
  }
  const frameWindow=$('#frame-window');
  if(frameWindow){
    frameWindow.textContent=available?(year === 2025 ? 'Annual regional mean' : 'Running regional mean'):`Global annual value · regional maps 1980–${LAST_REGIONAL_YEAR}`;
  }
  const bandSummary=$('#selected-band-summary strong');
  if(bandSummary){
    bandSummary.textContent=available
      ?`${bands[state.bandIndex].name} · ${bands[state.bandIndex].range}`
      :`Regional bands unavailable · through ${LAST_REGIONAL_YEAR}`;
  }
  if(!available) renderUnavailableAnalysis();
}

async function updateFrameAnalysis(){
  const {year}=currentPoint();
  if(!isRegionalAvailable(year)){ renderUnavailableAnalysis(); return; }
  try{
    const vectors=await analyzeYear(year);
    if(!vectors||currentPoint().year!==year) return;
    renderBandVector(vectors[state.bandIndex]);
    updateLedger(vectors[state.bandIndex]);
  }catch(error){
    if(currentPoint().year===year){
      $('#category-bars').textContent=error.message;
      $('#ledger-summary').textContent=`${year} · regional analysis unavailable.`;
      setStatus(error.message);
    }
  }
}

function updateYear(index,{play=false}={}){
  state.yearIndex=clamp(index,0,temperaturePoints.length-1);
  const point=currentPoint();
  const regionalAvailable=isRegionalAvailable(point.year);
  const frameImage=$('#frame-image');
  if(regionalAvailable){
    const frameSrc=frameImagePath(point.year);
    if(frameImage.getAttribute('src')!==frameSrc) frameImage.src=frameSrc;
    frameImage.alt=`NASA global temperature anomaly visualization for ${point.year}`;
    $('#frame-index').textContent=point.frame === null ? 'Annual grid' : `#${point.frame}`;
  }else{
    frameImage.alt=`Regional NASA temperature map unavailable for ${point.year}`;
    $('#frame-index').textContent='—';
  }
  $('#frame-year').textContent=point.year;
  $('#history-year').textContent=point.year;
  $('#history-value').textContent=`${signed(point.value)} °C`;
  $('#history-frequency').textContent=`${Math.round(historyFrequency(point.value))} Hz`;
  $('#year-slider').value=state.yearIndex;
  $('#year-slider').setAttribute('aria-valuetext',`${point.year}, ${signed(point.value)} degrees Celsius relative to the 1951–1980 average`);
  $('#year-output').textContent=point.year;
  if($('#frame-year-select')) $('#frame-year-select').value=String(point.year);
  if($('#frame-year-slider')) {
    $('#frame-year-slider').value=state.yearIndex;
    $('#frame-year-slider').setAttribute('aria-valuetext',`${point.year}, ${signed(point.value)} degrees Celsius relative to the 1951–1980 average`);
  }
  applyRegionalAvailability(point.year);
  updateFrameAnalysis();
  renderGlobe();
  if(play) playHistoryTone(point.value);

  // Sync the 3D studio globe in the parent window
  if(window.parent && window.parent !== window){
    window.parent.postMessage({
      type: 'MONITOR_YEAR_CHANGE',
      year: point.year,
      value: point.value,
      regionalAvailable
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

  // If starting at the end of the record, wrap back to the first year.
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
  if(!isRegionalAvailable(currentPoint().year)) return;
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
  if(token!==state.token) return;
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
  if(!isRegionalAvailable(currentPoint().year)){setStatus(`Regional band playback is available only through ${LAST_REGIONAL_YEAR}.`);return;}
  stopAudio(false);const token=state.token;document.body.classList.add('busy');
  try{
    selectBand(state.bandIndex, {showHighlight:true});
    notifyParentScan(true, state.bandIndex);
    const vectors=await analyzeYear(currentPoint().year);
    await playBandPattern(vectors[state.bandIndex],`${currentPoint().year}, ${bands[state.bandIndex].name}`,token);
  }
  catch(error){if(token===state.token) setStatus(error.message)}
  if(token===state.token){
    document.body.classList.remove('busy');
    if(state.mode!=='frame') notifyParentScan(false);
  }
}

async function scanFrame(){
  if(!isRegionalAvailable(currentPoint().year)){setStatus(`Frame Scan is available only through ${LAST_REGIONAL_YEAR}.`);return;}
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
  }catch(error){if(token===state.token) setStatus(error.message)}
  if(token===state.token){
    document.body.classList.remove('busy');
    $('#scan-rule').classList.remove('scanning');
    notifyParentScan(false);
  }
}

function calcMapHeight(){return $('#frame-image').clientHeight||$('#map-stage')?.clientHeight||380}

function setMode(mode){
  stopAudio(false);state.mode=mode;
  if (mode === 'learn' && !quizInitialized) {
    quizInitialized = true;
    initializeQuiz();
  }
  const tabs={history:'#history-tab',frame:'#frame-tab',learn:'#learn-tab'};
  const panels={history:'#history-panel',frame:'#frame-panel',learn:'#learn-panel'};
  Object.keys(tabs).forEach(key=>{
    $(tabs[key]).setAttribute('aria-selected',String(key===mode));
    $(tabs[key]).tabIndex=key===mode?0:-1;
    $(panels[key]).hidden=key!==mode;
  });
  if(mode==='frame'){
    const regionalAvailable=isRegionalAvailable(currentPoint().year);
    selectBand(state.bandIndex, {showHighlight:true});
    notifyParentScan(regionalAvailable, state.bandIndex);
    if(!regionalAvailable) setStatus(`Frame Scan is available only through ${LAST_REGIONAL_YEAR}.`);
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
    const isSelected = btn.dataset.sectionTarget === sectionName;
    btn.setAttribute('aria-selected', String(isSelected));
    btn.tabIndex = isSelected ? 0 : -1;
  });
}

const yearOptions = points => points.map(({year}) => `<option value="${year}">${year}</option>`).join('');
const bandOptions = () => bands.map((band,index) => `<option value="${index}">${band.name} · ${band.range}</option>`).join('');

function populateSelects(){
  const regionalPoints=temperaturePoints.filter(point=>isRegionalAvailable(point.year));
  const years=yearOptions(regionalPoints);
  $('#frame-year-select').innerHTML=years;
  if($('#frame-year-slider')) $('#frame-year-slider').max=String(regionalPoints.length-1);
  $('#compare-year-a').innerHTML=years;$('#compare-year-b').innerHTML=years;$('#compare-year-b').value=String(LAST_REGIONAL_YEAR);
  $('#compare-band').innerHTML=bandOptions();
  $('#year-slider').max=String(temperaturePoints.length-1);
}

function setComparisonUnavailable(yearA,yearB){
  const cards=$$('#compare-output>div:not(.difference-mark)');
  const message=`Regional analysis unavailable (valid through ${LAST_REGIONAL_YEAR}).`;
  if(cards[0]) cards[0].innerHTML=`<span>Frame A</span><strong>${yearA}</strong><p>${message}</p>`;
  if(cards[1]) cards[1].innerHTML=`<span>Frame B</span><strong>${yearB}</strong><p>${message}</p>`;
}

async function updateComparison(){
  const yearA=Number($('#compare-year-a').value),yearB=Number($('#compare-year-b').value),bandIndex=Number($('#compare-band').value);
  if(!isRegionalAvailable(yearA)||!isRegionalAvailable(yearB)){
    setComparisonUnavailable(yearA,yearB);
    setStatus(`Compare A/B uses regional maps, available only through ${LAST_REGIONAL_YEAR}.`);
    return;
  }
  try{
    const [vectorsA,vectorsB]=await Promise.all([analyzeYear(yearA),analyzeYear(yearB)]);
    if(Number($('#compare-year-a').value)!==yearA || Number($('#compare-year-b').value)!==yearB || Number($('#compare-band').value)!==bandIndex) return;
    const a=vectorsA[bandIndex],b=vectorsB[bandIndex];
    const cards=$$('#compare-output>div:not(.difference-mark)');
    cards[0].innerHTML=`<span>Frame A</span><strong>${yearA}</strong><p>${(a.cool*100).toFixed(0)}% cooler · ${(a.reference*100).toFixed(0)}% baseline · ${(a.warm*100).toFixed(0)}% warmer</p>`;
    cards[1].innerHTML=`<span>Frame B</span><strong>${yearB}</strong><p>${(b.cool*100).toFixed(0)}% cooler · ${(b.reference*100).toFixed(0)}% baseline · ${(b.warm*100).toFixed(0)}% warmer</p>`;
  }catch(error){setStatus(error.message)}
}

async function playComparison(){
  stopAudio(false);const token=state.token;document.body.classList.add('busy');
  const yearA=Number($('#compare-year-a').value),yearB=Number($('#compare-year-b').value),bandIndex=Number($('#compare-band').value);
  if(!isRegionalAvailable(yearA)||!isRegionalAvailable(yearB)){
    setComparisonUnavailable(yearA,yearB);
    setStatus(`Compare A/B uses regional maps, available only through ${LAST_REGIONAL_YEAR}.`);
    document.body.classList.remove('busy');
    return;
  }
  try{
    const [a,b]=await Promise.all([analyzeYear(yearA),analyzeYear(yearB)]);
    await playBandPattern(a[bandIndex],`Frame A, ${yearA}`,token);await sleep(500);
    if(token!==state.token)return;
    await playBandPattern(b[bandIndex],`Frame B, ${yearB}`,token);
  }catch(error){setStatus(error.message)}
  if(token===state.token)document.body.classList.remove('busy');
}

const quizSets = [
  { years: [1980, 2025], bandIds: [0], color: 'warm', type: 'larger' },
  { years: [2025, 1990], bandIds: [1], color: 'cool', type: 'larger' },
  { years: [2000, 2025], bandIds: [2], color: 'warm', type: 'trend' },
  { years: [2010, 2025], bandIds: [3], color: 'cool', type: 'smaller' },
  { years: [2025, 2020], bandIds: [4], color: 'warm', type: 'larger' },
  { years: [1990, 2000], bandIds: [0], color: 'warm', type: 'difference' },
  { years: [2000, 2010], bandIds: [1], color: 'cool', type: 'trend' },
  { years: [2024, 2025], bandIds: [2], color: 'warm', type: 'larger' },
  { years: [1980, 2025], bandIds: [0, 2], color: 'warm', type: 'change' },
  { years: [1980, 2025], bandIds: [1, 3], color: 'cool', type: 'decrease' }
];
const quizMaps = [$('#quiz-map-a'), $('#quiz-map-b')];
const quizBand = $('#quiz-band');
const quizPlayButtons = $$('[data-quiz-play]');
const quizBandName = index => ['Arctic', 'Northern mid-latitudes', 'Tropics', 'Southern mid-latitudes', 'Antarctic'][index];
let quizInitialized = false;
let quizQuestions = [];
let quizAnswers = [];
let quizIndex = 0;
let quizReviewing = false;
let quizComparison = null;

function showQuizPlayback(index, label = '') {
  quizMaps.forEach((map, position) => map.classList.toggle('is-playing', position === index));
  $('#quiz-playing').textContent = label;
}

function clearQuizAnswer() {
  const feedback = $('#lesson-feedback');
  feedback.hidden = true;
  feedback.textContent = '';
  feedback.className = 'lesson-feedback';
  $('#proof-receipt').hidden = true;
}

async function resolveQuizQuestions() {
  const availableYears = temperaturePoints.filter(point => isRegionalAvailable(point.year)).map(point => point.year);
  const loaded = new Map();
  async function loadFrame(year) {
    if (!loaded.has(year)) loaded.set(year, analyzeYear(year).catch(() => null));
    return loaded.get(year);
  }

  async function resolve(set) {
    const alternativeBands = bands.map((_, index) => index).filter(index => !set.bandIds.includes(index));
    const bandGroups = [set.bandIds];
    for (const index of alternativeBands) {
      if (set.bandIds.length === 1) bandGroups.push([index]);
      else bandGroups.push([set.bandIds[0], index], [index, set.bandIds[1]]);
    }
    if (set.bandIds.length === 2) {
      alternativeBands.forEach((first, index) => {
        alternativeBands.slice(index + 1).forEach(second => bandGroups.push([first, second]));
      });
    }

    const nearest = set.years.map(target => [...availableYears].sort((a, b) => Math.abs(a - target) - Math.abs(b - target)));
    for (const bandIds of bandGroups) {
      const usable = frame => bandIds.every(index => frame?.[index].valid);
      for (const yearA of nearest[0]) {
        const frameA = await loadFrame(yearA);
        if (!usable(frameA)) continue;
        for (const yearB of nearest[1]) {
          if (Math.sign(yearB - yearA) !== Math.sign(set.years[1] - set.years[0])) continue;
          const frameB = await loadFrame(yearB);
          if (!usable(frameB)) continue;
          const frames = [frameA, frameB];
          const playableBands = bands.map((_, index) => index).filter(index => frames.every(frame => frame[index].valid));
          return { ...set, years: [yearA, yearB], bandIds, frames, playableBands };
        }
      }
    }
    return null;
  }

  return Promise.all(quizSets.map(resolve));
}

async function initializeQuiz() {
  quizQuestions = await resolveQuizQuestions();
  startQuiz();
}

function startQuiz() {
  quizAnswers = Array(quizSets.length).fill(null);
  quizReviewing = false;
  advanceQuiz(-1);
}

function advanceQuiz(after) {
  const index = quizQuestions.findIndex((question, index) => index > after && question);
  if (index === -1) showQuizSummary();
  else openQuizQuestion(index);
}

function focusQuizProgress() {
  if (state.section === 'workbench' && state.mode === 'learn') $('#quiz-progress').focus();
}

function openQuizQuestion(index) {
  quizIndex = index;
  const question = quizQuestions[index];
  $('#quiz-summary').hidden = true;
  $('#quiz-comparison').hidden = false;
  $('#quiz-back').hidden = !quizReviewing;
  $('#quiz-progress').textContent = `Question ${index + 1} of ${quizSets.length}${quizReviewing ? ' · Review' : ''}`;
  const options = question.bandIds.length === 2 ? question.bandIds : question.playableBands;
  quizBand.innerHTML = options.map(id => `<option value="${id}">${quizBandName(id)} · ${bands[id].range}</option>`).join('');
  quizBand.value = String(quizAnswers[index]?.bandId ?? question.bandIds[0]);
  updateQuiz();
  focusQuizProgress();
}

function showQuizSummary() {
  stopAudio(false);
  quizComparison = null;
  $('#quiz-progress').textContent = 'Quiz results';
  $('#quiz-summary').hidden = false;
  $('#quiz-comparison').hidden = true;
  $('#quiz-next').hidden = true;
  $('#quiz-back').hidden = true;
  const correct = quizAnswers.filter(answer => answer?.correct).length;
  $('#quiz-score').textContent = `Score: ${correct} out of ${quizSets.length}`;
  const missing = quizQuestions.flatMap((question, index) => question ? [] : [`${index + 1} (${quizSets[index].years.join(' → ')} · ${quizSets[index].bandIds.map(quizBandName).join(' and ')})`]);
  const unavailable = $('#quiz-unavailable');
  unavailable.hidden = missing.length === 0;
  unavailable.textContent = missing.length ? `Comparisons unavailable: ${missing.join(', ')}.` : '';
  $('#quiz-review-list').innerHTML = quizAnswers.map((answer, index) => answer
    ? `<li value="${index + 1}"><button class="text-button" type="button" data-quiz-review="${index}">Review ${quizQuestions[index].years.join(' → ')} · ${answer.correct ? 'Correct' : 'Incorrect'}</button></li>`
    : '').join('');
  focusQuizProgress();
}

const quizPercent = value => `${(value / 10).toFixed(1)}%`;
const quizPoints = value => `${(value / 10).toFixed(1)} percentage points`;

function quizEvidence(question, bandId) {
  const { years, frames, color, type } = question;
  const bandIds = question.bandIds.length === 2 ? question.bandIds : [bandId];
  const rows = bandIds.map(id => {
    // Pixel classifier fractions use valid pixels only. Grade the displayed tenths.
    const [a, b] = frames.map(frame => Math.round(frame[id][color] * 1000));
    return { id, a, b, change: b - a };
  });
  const [first, second] = rows;
  const category = `${color}-colored pixel share`;
  const region = quizBandName(bandId).toLowerCase();
  let prompt;
  let choices;
  let correct;
  switch (type) {
    case 'larger':
    case 'smaller':
      prompt = `Which frame shows a ${type} share of ${color}-colored pixels in the ${region}?`;
      choices = ['Frame A', 'Frame B', 'Same share'];
      correct = first.change === 0 ? 2 : (first.change > 0) === (type === 'larger') ? 1 : 0;
      break;
    case 'trend':
      prompt = `How did the ${category} in the ${region} change from ${years[0]} to ${years[1]}?`;
      choices = ['Increased', 'Decreased', 'Stayed the same'];
      correct = first.change === 0 ? 2 : first.change > 0 ? 0 : 1;
      break;
    case 'difference': {
      prompt = `What was the difference in ${category} between the two frames in the ${region}?`;
      const difference = Math.abs(first.change);
      const step = Math.max(10, Math.round(difference * 0.15));
      const start = Math.max(0, Math.min(1000 - step * 2, difference - step));
      const values = [difference, ...[start, start + step, start + step * 2].filter(value => value !== difference).slice(0, 2)].sort((a, b) => a - b);
      choices = values.map(quizPoints);
      correct = values.indexOf(difference);
      break;
    }
    case 'change':
    case 'decrease': {
      const decrease = type === 'decrease';
      const measure = row => decrease ? Math.max(0, -row.change) : Math.abs(row.change);
      const difference = measure(first) - measure(second);
      prompt = `Which band had the larger ${type} in ${category} from ${years[0]} to ${years[1]}?`;
      choices = [...bandIds.map(quizBandName), `Same ${type}`];
      if (decrease) choices.push('Neither decreased');
      correct = decrease && !measure(first) && !measure(second) ? 3 : difference === 0 ? 2 : difference > 0 ? 0 : 1;
      break;
    }
  }
  return { prompt, choices, correct, rows };
}

function updateQuiz() {
  stopAudio(false);
  clearQuizAnswer();
  const question = quizQuestions[quizIndex];
  const bandId = Number(quizBand.value);
  const band = bands[bandId];
  const evidence = quizEvidence(question, bandId);
  quizComparison = { ...question, band, bandId, evidence, vectors: question.frames.map(frame => frame[bandId]) };
  const saved = quizAnswers[quizIndex];
  const reviewingEvidence = saved && (saved.bandId === bandId || question.bandIds.length === 2);
  $('#quiz-practice').hidden = !saved || reviewingEvidence;
  const next = $('#quiz-next');
  next.hidden = !saved || quizReviewing;
  next.textContent = quizQuestions.slice(quizIndex + 1).some(Boolean) ? 'Next question' : 'See results';

  quizMaps.forEach((map, position) => {
    const year = question.years[position];
    map.querySelector('figcaption span').textContent = year;
    const image = map.querySelector('img');
    const path = frameImagePath(year);
    if (image.getAttribute('src') !== path) image.src = path;
    image.alt = `${year} temperature anomaly map with ${quizBandName(bandId)} (${band.range}) highlighted`;
    const highlight = map.querySelector('.quiz-band-highlight');
    highlight.style.top = `${band.start * 100}%`;
    highlight.style.height = `${(band.end - band.start) * 100}%`;
  });
  $('#quiz-question').textContent = evidence.prompt;
  $('#quiz-choices').innerHTML = evidence.choices.map((choice, index) =>
    `<button type="button" data-answer="${index}" aria-pressed="false">${choice}</button>`).join('');
  $('#lesson-answers').disabled = Boolean(reviewingEvidence);
  if (reviewingEvidence) showQuizAnswer(saved.choice);
}

async function playQuiz(order) {
  const comparison = quizComparison;
  if (!comparison) return;
  if (state.muted) {
    $('#quiz-playing').textContent = 'Audio is muted.';
    return;
  }
  stopAudio(false);
  const token = state.token;
  const sequence = order === 'ab' ? [0, 1] : [order === 'a' ? 0 : 1];
  const { years, band, vectors } = comparison;
  try {
    if (!await ensureAudio()) return;
    for (const index of sequence) {
      if (token !== state.token) return;
      const label = `Frame ${index === 0 ? 'A' : 'B'}, ${years[index]}, ${band.name}`;
      showQuizPlayback(index, `Playing ${label}`);
      await playBandPattern(vectors[index], label, token);
      if (token !== state.token) return;
      showQuizPlayback();
      if (order === 'ab' && index === 0) await sleep(500);
    }
  } catch (error) {
    if (token === state.token) {
      showQuizPlayback();
      $('#quiz-playing').textContent = error.message;
    }
  }
}

function showQuizAnswer(choice) {
  const { years, color, type, evidence } = quizComparison;
  const { rows, correct, choices } = evidence;
  const descriptions = rows.map(({ id, a, b, change }) => {
    const movement = change === 0 ? 'stayed the same' : `${change > 0 ? 'increased' : 'decreased'} by ${quizPoints(Math.abs(change))}`;
    return `In the ${quizBandName(id).toLowerCase()}, the ${color}-colored share ${movement} from ${quizPercent(a)} in Frame A (${years[0]}) to ${quizPercent(b)} in Frame B (${years[1]}).`;
  });

  $$('#quiz-choices [data-answer]').forEach(button => {
    button.setAttribute('aria-pressed', String(Number(button.dataset.answer) === choice));
  });
  const feedback = $('#lesson-feedback');
  feedback.className = `lesson-feedback ${choice === correct ? 'correct' : 'incorrect'}`;
  feedback.textContent = `${choice === correct ? 'Correct.' : 'Not quite.'} You picked ${choices[choice]}. Correct answer: ${choices[correct]}. ${descriptions.join(' ')}`;
  feedback.hidden = false;
  $('#proof-metric').textContent = `Share of valid map pixels in ${color} colors`;
  $('#proof-values').innerHTML = rows.map(({ id, a, b, change }) => `
    <p><strong>${quizBandName(id)} (${bands[id].range})</strong></p>
    <div class="proof-shares">
      <div><span>Frame A (${years[0]})</span><strong>${quizPercent(a)}</strong></div>
      <div><span>Frame B (${years[1]})</span><strong>${quizPercent(b)}</strong></div>
    </div>
    <p>${type === 'decrease' ? 'Decrease' : type === 'change' || type === 'difference' ? 'Absolute change' : 'Difference'}: ${quizPoints(type === 'decrease' ? Math.max(0, -change) : Math.abs(change))}.</p>
  `).join('');
  $('#proof-takeaway').textContent = rows.length === 2
    ? 'Switch latitude bands to highlight and replay each strip.'
    : 'Compare the highlighted strips to see where these colors appear.';
  $('#proof-receipt').hidden = false;
}

function answerLesson(choice) {
  if (!quizComparison) return;
  const { bandId, evidence } = quizComparison;
  if (!quizAnswers[quizIndex]) {
    quizAnswers[quizIndex] = { choice, bandId, correct: choice === evidence.correct };
    $('#lesson-answers').disabled = true;
    $('#quiz-next').hidden = false;
  }
  showQuizAnswer(choice);
  $('#lesson-feedback').scrollIntoView({ block: 'nearest' });
}

function copyLedger(){
  const text=$('#ledger-summary').textContent;
  if(navigator.clipboard?.writeText){navigator.clipboard.writeText(text);}
}

/* =====================================================
   NASA CLIMATE STORIES & DR. JO AUDIO ENGINE (OPTION 1)
   ===================================================== */
const storyAudio = new Audio();
storyAudio.preload = 'auto';
storyAudio.volume = 0.95;

const storySubtitleContainer = document.getElementById('story-subtitle');
const storySubtitleTextEl = document.getElementById('story-subtitle-text');

let activeStory = null;
let storySyncTimer = null;
let triggeredMilestones = new Set();

const CLIMATE_STORIES = {
  'heat-spike': {
    title: 'Expedition 1: The Global Heat Spike',
    audioFile: 'heat-spike.wav',
    cues: [
      { start: 0.0, end: 3.97, text: 'Welcome to Expedition 1: The Global Heat Spike.' },
      { start: 3.97, end: 10.24, text: 'In 1980, global temperatures remained close to the historical mid-century baseline.' },
      { start: 10.24, end: 14.60, text: 'Hear the calm, balanced frequency of this baseline era.' },
      { start: 14.60, end: 26.35, text: 'Fast forward to 2016. Driven by accumulated greenhouse forcing and an intense El Niño, global anomalies reached plus 0.99 degrees Celsius.' },
      { start: 26.35, end: 30.51, text: 'Notice how the pitch climbs higher across the northern hemisphere.' },
      { start: 30.51, end: 36.84, text: 'In 2023 and 2024, our climate system crossed an uncharted threshold.' },
      { start: 36.84, end: 46.57, text: 'Global anomalies shattered all prior records at plus 1.18 degrees Celsius, pushing our sonification to the sharpest edge of its acoustic range.' }
    ],
    milestones: [
      { time: 0.0, year: 1980, temp: false, band: null, tone: 0.26 },
      { time: 14.60, year: 2016, temp: true, band: null, tone: 0.99 },
      { time: 30.51, year: 2024, temp: true, band: null, tone: 1.18 }
    ]
  },
  'arctic-amplification': {
    title: 'Expedition 2: Arctic Amplification',
    audioFile: 'arctic-amplification.wav',
    cues: [
      { start: 0.0, end: 4.08, text: 'Welcome to Expedition 2: Arctic Amplification.' },
      { start: 4.08, end: 9.52, text: 'In 1980, reflective Arctic sea ice acted as Earth natural mirror.' },
      { start: 9.52, end: 15.42, text: 'At 60 to 90 degrees North, acoustic frequencies matched global equilibrium.' },
      { start: 15.42, end: 20.43, text: 'By the turn of the millennium, perennial sea ice began shrinking rapidly.' },
      { start: 20.43, end: 29.01, text: 'As bright ice melted into darker ocean waters, solar heat absorption accelerated, triggering a runaway warming feedback loop.' },
      { start: 29.01, end: 34.36, text: 'Today, the Arctic is warming nearly four times faster than the rest of the planet.' },
      { start: 34.36, end: 40.91, text: 'Compare this polar tone to equatorial regions to hear the drastic acoustic divergence of our melting pole.' }
    ],
    milestones: [
      { time: 0.0, year: 1980, temp: true, band: 0, tone: 0.26 },
      { time: 15.42, year: 2000, temp: true, band: 0, tone: 0.40 },
      { time: 29.01, year: 2024, temp: true, band: 0, tone: 1.18 }
    ]
  },
  'satellite-era': {
    title: 'Expedition 3: The 45-Year Satellite Era',
    audioFile: 'satellite-era.wav',
    cues: [
      { start: 0.0, end: 4.72, text: 'Welcome to Expedition 3: The 45-Year Satellite Era.' },
      { start: 4.72, end: 14.30, text: 'In 1980, NASA and NOAA began continuous orbital Earth monitoring, observing a world still governed by natural decadal variability.' },
      { start: 14.30, end: 20.77, text: 'In 1998, an unprecedented ocean warming event signaled a permanent regime shift.' },
      { start: 20.77, end: 26.92, text: 'Natural cooling cycles could no longer counteract the compounding buildup of greenhouse gases.' },
      { start: 26.92, end: 34.75, text: 'Across 45 years of continuous satellite records, NASA datasets document an undeniable upward trajectory.' },
      { start: 34.75, end: 40.61, text: 'What was once abstract numbers is now a visceral, audible reality for our home planet.' }
    ],
    milestones: [
      { time: 0.0, year: 1980, temp: false, band: null, tone: 0.26 },
      { time: 14.30, year: 1998, temp: true, band: null, tone: 0.61 },
      { time: 26.92, year: 2025, temp: true, band: null, tone: 1.18 }
    ]
  }
};

function getStoryYearIndex(targetYear) {
  const idx = temperaturePoints.findIndex(p => p.year === targetYear);
  return idx >= 0 ? idx : 0;
}

function updateStorySubtitleDisplay(text) {
  if (storySubtitleContainer && storySubtitleTextEl) {
    storySubtitleContainer.hidden = false;
    storySubtitleContainer.classList.add('is-active');
    storySubtitleTextEl.textContent = text;
  }
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'STORY_SUBTITLE', text: text, active: true }, '*');
  }
}

function hideStorySubtitleDisplay() {
  if (storySubtitleContainer) {
    storySubtitleContainer.classList.remove('is-active');
    setTimeout(() => {
      if (!storySubtitleContainer.classList.contains('is-active')) {
        storySubtitleContainer.hidden = true;
      }
    }, 240);
  }
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'STORY_SUBTITLE', active: false }, '*');
  }
}

function syncStoryProgress() {
  if (!activeStory || storyAudio.paused || storyAudio.ended) return;
  const t = storyAudio.currentTime;

  // 1. Update Subtitle Cue
  const activeCue = activeStory.cues.find(c => t >= c.start && t < c.end);
  if (activeCue) {
    updateStorySubtitleDisplay(activeCue.text);
  } else if (t >= activeStory.cues[activeStory.cues.length - 1].end) {
    hideStorySubtitleDisplay();
  }

  // 2. Trigger Visual Milestones on the Monitor accurate to narration
  activeStory.milestones.forEach((m, idx) => {
    if (t >= m.time && !triggeredMilestones.has(idx)) {
      triggeredMilestones.add(idx);
      updateYear(getStoryYearIndex(m.year));
      if (typeof setTemperatureMode === 'function') {
        setTemperatureMode(m.temp);
      }
      if (m.band !== null && typeof selectBand === 'function') {
        selectBand(m.band, { showHighlight: true });
      } else {
        $$('[data-band]').forEach(b => b.setAttribute('aria-pressed', 'false'));
      }
      if (typeof playHistoryTone === 'function') {
        playHistoryTone(m.tone, 0.45);
      }
    }
  });
}

function startClimateStory(storyId) {
  const story = CLIMATE_STORIES[storyId];
  if (!story) return;

  stopAudio(false);
  stopClimateStory();

  activeStory = story;
  triggeredMilestones.clear();

  if (state.view !== 'flat') setEarthView();
  if (state.mode !== 'history') setMode('history');

  storyAudio.src = `../assets/audio/stories/${story.audioFile}`;
  storyAudio.currentTime = 0;
  storyAudio.play().catch(e => {
    console.warn('Story audio play blocked or error:', e);
  });

  if (storySyncTimer) clearInterval(storySyncTimer);
  storySyncTimer = setInterval(syncStoryProgress, 60);
}

function stopClimateStory() {
  if (storySyncTimer) {
    clearInterval(storySyncTimer);
    storySyncTimer = null;
  }
  storyAudio.pause();
  storyAudio.currentTime = 0;
  activeStory = null;
  triggeredMilestones.clear();
  hideStorySubtitleDisplay();
}

storyAudio.addEventListener('ended', () => {
  stopClimateStory();
});

function bindEvents(){
  $$('[data-section-target]').forEach(el => {
    el.addEventListener('click', (event) => {
      event.preventDefault();
      setSection(el.dataset.sectionTarget);
    });
  });

  $$('.section-tabs [role="tab"]').forEach((tab, index, tabs) => {
    tab.addEventListener('keydown', (event) => {
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      tabs[next].click();
      tabs[next].focus();
    });
  });

  $$('[data-mode-target]').forEach(btn => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      setMode(btn.dataset.modeTarget);
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
  // EXCEPT when clicking Play History / transport / scrubber / Frame Scan / audio controls / temperature view toggle / Stories
  const noFocusSelector = '#stories-open, #stories-close, #stories-modal, #story-hud, .story-ctrl-btn, .story-launch-btn, [data-launch], #help-open, #help-close, #help-modal, #play-history, .transport, #previous-year, #next-year, #play-selected, #year-slider, #frame-year-select, #frame-prev-year, #frame-next-year, .frame-context-row, .frame-year-control, .slider-block, #scan-frame, #play-band, .frame-actions, #history-tab, #frame-tab, #learn-tab, [data-band], [data-mode-target], [data-section-target], #mute-toggle, #exit-to-studio, #temperature-view, #flat-view, .view-switch, [data-legend]';
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
  $('#frame-image').addEventListener('error',()=>{
    if(!isRegionalAvailable(currentPoint().year)) return;
    setStatus(`The NASA frame for ${currentPoint().year} could not be loaded. Retrying with 1980 reference frame.`);
    if ($('#frame-image').dataset.retried !== 'true') {
      $('#frame-image').dataset.retried = 'true';
      $('#frame-image').src = '../assets/eic/1980.webp';
    }
  });
  $('#frame-image').addEventListener('load',()=>{
    delete $('#frame-image').dataset.retried;
  });
  $('#year-slider').addEventListener('input',event=>{stopAudio(false);updateYear(Number(event.target.value));});
  $('#year-slider').addEventListener('change',()=>playHistoryTone(currentPoint().value,.42));
  $('#frame-year-select').addEventListener('change',event=>{
    stopAudio(false);
    const index=temperaturePoints.findIndex(point=>point.year===Number(event.target.value));
    if(index>=0) updateYear(index);
  });
  if($('#frame-year-slider')){
    $('#frame-year-slider').addEventListener('input',event=>{
      stopAudio(false);
      updateYear(Number(event.target.value));
    });
  }
  if($('#frame-prev-year')){
    $('#frame-prev-year').addEventListener('click',()=>{
      stopAudio(false);
      updateYear(state.yearIndex-1);
    });
  }
  if($('#frame-next-year')){
    $('#frame-next-year').addEventListener('click',()=>{
      stopAudio(false);
      updateYear(state.yearIndex+1);
    });
  }
  $('#previous-year').addEventListener('click',()=>{stopAudio(false);updateYear(state.yearIndex-1,{play:true});});
  $('#next-year').addEventListener('click',()=>{stopAudio(false);updateYear(state.yearIndex+1,{play:true});});
  $('#play-selected').addEventListener('click',()=>playHistoryTone(currentPoint().value,.6));
  $('#play-history').addEventListener('click',(event)=>{event.stopPropagation();playHistory();});
  $$('[data-band]').forEach(button=>button.addEventListener('click',()=>{stopAudio(false);if(state.mode!=='frame')setMode('frame');selectBand(Number(button.dataset.band),{showHighlight:true});notifyParentScan(true,Number(button.dataset.band));}));
  if($('#flat-view')) $('#flat-view').addEventListener('click',(event)=>{event.stopPropagation();setEarthView('flat');});
  if($('#temperature-view')) $('#temperature-view').addEventListener('click',(event)=>{event.stopPropagation();setTemperatureMode(!state.temperature);});
  $$('[data-legend]').forEach(button=>button.addEventListener('click',()=>playCategory(button.dataset.legend,1)));
  $('#scan-frame').addEventListener('click',scanFrame);$('#play-band').addEventListener('click',playSelectedBand);
  ['compare-year-a','compare-year-b','compare-band'].forEach(id=>$(`#${id}`).addEventListener('change',updateComparison));
  $('#compare-play').addEventListener('click',playComparison);
  quizBand.addEventListener('change', updateQuiz);
  quizPlayButtons.forEach(button => button.addEventListener('click', () => playQuiz(button.dataset.quizPlay)));
  $('#quiz-choices').addEventListener('click', event => {
    const button = event.target.closest('[data-answer]');
    if (button) answerLesson(Number(button.dataset.answer));
  });
  $('#quiz-next').addEventListener('click', () => advanceQuiz(quizIndex));
  $('#quiz-review-list').addEventListener('click', event => {
    const button = event.target.closest('[data-quiz-review]');
    if (!button) return;
    quizReviewing = true;
    openQuizQuestion(Number(button.dataset.quizReview));
  });
  $('#quiz-back').addEventListener('click', showQuizSummary);
  $('#quiz-retake').addEventListener('click', startQuiz);
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

  /* ---- Help Guide Modal ---- */
  const helpModal = document.getElementById('help-modal');
  const helpOpen  = document.getElementById('help-open');
  const helpClose = document.getElementById('help-close');

  function openHelp() {
    if (!helpModal) return;
    helpModal.hidden = false;
    document.body.style.overflow = 'hidden';
    helpClose?.focus();
  }

  function closeHelp() {
    if (!helpModal) return;
    helpModal.hidden = true;
    document.body.style.overflow = '';
    helpOpen?.focus();
  }

  helpOpen?.addEventListener('click', openHelp);
  helpClose?.addEventListener('click', closeHelp);
  helpModal?.addEventListener('click', (e) => {
    if (e.target === helpModal) closeHelp();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && helpModal && !helpModal.hidden) {
      closeHelp();
    }
  });

  /* ---- Climate Stories Modal & Controls ---- */
  const storiesModal = document.getElementById('stories-modal');
  const storiesOpen  = document.getElementById('stories-open');
  const storiesClose = document.getElementById('stories-close');

  function openStories() {
    if (!storiesModal) return;
    storiesModal.hidden = false;
    document.body.style.overflow = 'hidden';
    storiesClose?.focus();
  }

  function closeStories() {
    if (!storiesModal) return;
    storiesModal.hidden = true;
    document.body.style.overflow = '';
    storiesOpen?.focus();
  }

  storiesOpen?.addEventListener('click', openStories);
  storiesClose?.addEventListener('click', closeStories);
  storiesModal?.addEventListener('click', (e) => {
    if (e.target === storiesModal) closeStories();
  });

  // Launch buttons inside stories modal
  $$('[data-launch]').forEach(btn => {
    btn.addEventListener('click', () => {
      const storyId = btn.getAttribute('data-launch');
      closeStories();
      startClimateStory(storyId);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (storiesModal && !storiesModal.hidden) {
        closeStories();
      } else if (activeStory) {
        stopClimateStory();
      }
    }
  });

  window.addEventListener('message',event=>{
    if(event.data&&(event.data.type==='SUSPEND_WORKSTATION'||event.data.type==='PAUSE_ALL_AUDIO')){
      stopAudio(false);
      stopClimateStory();
    } else if (event.data && event.data.type === 'FOCUS_FIRST_CONTROL') {
      const firstControl = $('#play-history') || $('#section-tab-workbench');
      firstControl?.focus();
    }
  });

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){
      stopAudio(false);
      stopClimateStory();
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
