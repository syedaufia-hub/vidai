import { useState, useRef, useCallback, useEffect } from "react";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');`;

const STYLES = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0a0a0f;--surface:#111118;--card:#16161f;--border:#2a2a38;
  --accent:#f5a623;--accent2:#e8834a;--glow:rgba(245,166,35,.18);
  --text:#f0ede8;--muted:#7a7a95;--success:#4ade80;
  --fh:'Syne',sans-serif;--fb:'DM Sans',sans-serif;
}
body{background:var(--bg);color:var(--text);font-family:var(--fb)}
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes glow{0%,100%{box-shadow:0 0 20px var(--glow)}50%{box-shadow:0 0 40px rgba(245,166,35,.35)}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
`;

const VIDEO_STYLES = [
  {id:"educational",label:"Educational",icon:"🎓",desc:"Clear, informative"},
  {id:"social",label:"Social Media",icon:"📱",desc:"Punchy, viral"},
  {id:"corporate",label:"Corporate",icon:"💼",desc:"Professional"},
  {id:"motivational",label:"Motivational",icon:"🔥",desc:"Inspiring, bold"},
];
const VOICES_LIST = ["Nova (Female)","Onyx (Male)","Shimmer (Female)","Echo (Male)"];
const LANGUAGES   = ["English","Spanish","French","German","Portuguese","Japanese"];
const ASPECTS     = [{id:"landscape",label:"16:9",icon:"▬"},{id:"portrait",label:"9:16",icon:"▮"}];
const STEPS = [
  {label:"Refining script…",    icon:"✍️",duration:1800},
  {label:"Breaking scenes…",   icon:"🎬",duration:1600},
  {label:"Generating visuals…",icon:"🖼️",duration:2400},
  {label:"Synthesising voice…",icon:"🎙️",duration:1800},
  {label:"Adding captions…",   icon:"📝",duration:1400},
  {label:"Mixing music…",      icon:"🎵",duration:1600},
  {label:"Rendering video…",   icon:"🎞️",duration:2000},
];
const PALETTES = {
  educational:{bg:["#0d1b2a","#1a2a3a"],accent:"#38bdf8",text:"#e0f2fe"},
  social:     {bg:["#1a0a2e","#2d1b4e"],accent:"#a78bfa",text:"#ede9fe"},
  corporate:  {bg:["#0f172a","#1e293b"],accent:"#38d9a9",text:"#e2e8f0"},
  motivational:{bg:["#1c0a00","#3d1200"],accent:"#fb923c",text:"#ffedd5"},
};
const SAMPLE_VIDEOS = [
  {id:1,title:"The Future of Solar Energy",style:"educational",duration:"0:54",date:"Apr 7",aspect:"landscape",
   caption:"The sun powers everything.",
   hashtags:["#Solar","#CleanEnergy","#Future","#Green","#Tech"],
   scenes:[
     {emoji:"🌅",duration:9,text:"Solar energy is transforming how we power our world today."},
     {emoji:"⚡",duration:9,text:"New photovoltaic technology reaches record efficiency levels."},
     {emoji:"🌍",duration:9,text:"Over one billion homes could run on solar by the year 2030."},
     {emoji:"💰",duration:9,text:"Costs have dropped ninety percent in the last decade alone."},
     {emoji:"🔋",duration:9,text:"Battery storage now makes solar power available around the clock."},
     {emoji:"✅",duration:9,text:"The future is bright, and it runs entirely on sunlight."},
   ]},
];

async function callClaude(userPrompt, system) {
  try {
    const apiKey = process.env.REACT_APP_ANTHROPIC_KEY;
    if (!apiKey) return null;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "x-api-key":apiKey,
        "anthropic-version":"2023-06-01",
        "anthropic-dangerous-direct-browser-access":"true",
      },
      body:JSON.stringify({
        model:"claude-sonnet-4-20250514",
        max_tokens:1000,
        system,
        messages:[{role:"user",content:userPrompt}],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.content?.map(b=>b.text||"").join("")||"";
  } catch { return null; }
}

// ── Canvas Video Player ───────────────────────────────────────────────────────
function CanvasPlayer({video, aspect, onClose}) {
  const canvasRef    = useRef(null);
  const rafRef       = useRef(null);
  const mediaRecRef  = useRef(null);
  const chunksRef    = useRef([]);
  const pbRef        = useRef({startTime:null,sceneIdx:0});

  const [playing,      setPlaying]      = useState(false);
  const [recording,    setRecording]    = useState(false);
  const [downloaded,   setDownloaded]   = useState(false);
  const [currentScene, setCurrentScene] = useState(0);
  const [elapsed,      setElapsed]      = useState(0);

  const isPortrait = aspect === "portrait";
  const CW = isPortrait ? 405 : 720;
  const CH = isPortrait ? 720 : 405;
  const pal     = PALETTES[video.style] || PALETTES.educational;
  const scenes  = video.scenes || [];
  const totalT  = scenes.reduce((s,sc)=>s+sc.duration,0)||54;

  const drawFrame = useCallback((sIdx, totalElapsed, isRec) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // BG
    const grad = ctx.createLinearGradient(0,0,CW,CH);
    grad.addColorStop(0,pal.bg[0]);
    grad.addColorStop(1,pal.bg[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,CW,CH);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for(let x=0;x<CW;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,CH);ctx.stroke();}
    for(let y=0;y<CH;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(CW,y);ctx.stroke();}

    // Glow orb
    const grd = ctx.createRadialGradient(CW*0.8,CH*0.2,0,CW*0.8,CH*0.2,CH*0.4);
    grd.addColorStop(0,"rgba(245,166,35,0.1)");
    grd.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=grd;ctx.fillRect(0,0,CW,CH);

    // Scene pill
    ctx.fillStyle="rgba(0,0,0,0.55)";
    ctx.beginPath();ctx.roundRect(18,18,130,30,15);ctx.fill();
    ctx.fillStyle=pal.accent;
    ctx.font=`700 12px 'Syne',sans-serif`;
    ctx.textAlign="left";
    ctx.fillText(`SCENE ${sIdx+1} / ${scenes.length}`,32,38);

    // Progress bar
    ctx.fillStyle="rgba(255,255,255,0.08)";ctx.fillRect(0,CH-6,CW,6);
    ctx.fillStyle=pal.accent;ctx.fillRect(0,CH-6,CW*(totalElapsed/totalT),6);

    // Emoji
    const sc = scenes[sIdx];
    if (sc) {
      const eSz = isPortrait?96:76;
      ctx.font=`${eSz}px serif`;ctx.textAlign="center";
      ctx.fillText(sc.emoji, CW/2, CH*0.37+Math.sin(Date.now()/700)*6);

      // Text box
      const bY=CH*0.52, bH=isPortrait?155:115;
      ctx.fillStyle="rgba(0,0,0,0.55)";
      ctx.beginPath();ctx.roundRect(28,bY,CW-56,bH,14);ctx.fill();
      ctx.strokeStyle=pal.accent+"44";ctx.lineWidth=1.5;
      ctx.beginPath();ctx.roundRect(28,bY,CW-56,bH,14);ctx.stroke();

      ctx.fillStyle=pal.text;
      ctx.font=`400 ${isPortrait?17:15}px 'DM Sans',sans-serif`;
      ctx.textAlign="center";
      const words=sc.text.split(" "),maxW=CW-110;
      let line="",lines=[];
      for(const w of words){
        const t=line?line+" "+w:w;
        if(ctx.measureText(t).width>maxW){lines.push(line);line=w;}
        else line=t;
      }
      lines.push(line);
      const lh=isPortrait?25:21;
      const sY=bY+bH/2-(lines.length*lh)/2+lh*0.4;
      lines.forEach((l,i)=>ctx.fillText(l,CW/2,sY+i*lh));
    }

    // Caption strip
    ctx.fillStyle="rgba(0,0,0,0.72)";ctx.fillRect(0,CH-50,CW,44);
    ctx.fillStyle=pal.accent;
    ctx.font=`600 ${isPortrait?13:11}px 'DM Sans',sans-serif`;
    ctx.textAlign="center";
    ctx.fillText(video.caption||video.title,CW/2,CH-27);

    // Timecode
    const mm=String(Math.floor(totalElapsed/60)).padStart(2,"0");
    const ss2=String(Math.floor(totalElapsed%60)).padStart(2,"0");
    const tm=String(Math.floor(totalT/60)).padStart(2,"0");
    const ts=String(Math.floor(totalT%60)).padStart(2,"0");
    ctx.fillStyle="rgba(255,255,255,0.35)";ctx.font="500 10px monospace";ctx.textAlign="right";
    ctx.fillText(`${mm}:${ss2} / ${tm}:${ts}`,CW-16,CH-56);

    // REC dot
    if (isRec) {
      ctx.fillStyle="#f87171";ctx.beginPath();ctx.arc(CW-18,26,5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#fff";ctx.font="700 10px sans-serif";ctx.textAlign="right";
      ctx.fillText("REC",CW-26,31);
    }
    ctx.textAlign="left";
  },[CW,CH,pal,scenes,totalT,isPortrait,video]);

  const speak = useCallback((text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate=0.93;utt.pitch=1;
    window.speechSynthesis.speak(utt);
  },[]);

  const tick = useCallback(() => {
    const pb = pbRef.current;
    if (!pb.startTime) pb.startTime = performance.now();
    const total = (performance.now()-pb.startTime)/1000;
    if (total>=totalT) {
      setPlaying(false);setElapsed(totalT);
      if(window.speechSynthesis) window.speechSynthesis.cancel();
      drawFrame(scenes.length-1,totalT,false);
      return;
    }
    let acc=0,sIdx=0;
    for(let i=0;i<scenes.length;i++){
      if(total<acc+scenes[i].duration){sIdx=i;break;}
      acc+=scenes[i].duration;
    }
    if(sIdx!==pb.sceneIdx){pb.sceneIdx=sIdx;speak(scenes[sIdx].text);setCurrentScene(sIdx);}
    setElapsed(Math.floor(total));
    drawFrame(sIdx,total,mediaRecRef.current?.state==="recording");
    rafRef.current=requestAnimationFrame(tick);
  },[drawFrame,scenes,totalT,speak]);

  const startPlay = useCallback(()=>{
    if(rafRef.current) cancelAnimationFrame(rafRef.current);
    if(window.speechSynthesis) window.speechSynthesis.cancel();
    pbRef.current={startTime:null,sceneIdx:0};
    setCurrentScene(0);setElapsed(0);setPlaying(true);
    speak(scenes[0]?.text||"");
    rafRef.current=requestAnimationFrame(tick);
  },[tick,scenes,speak]);

  const stopPlay = useCallback(()=>{
    if(rafRef.current) cancelAnimationFrame(rafRef.current);
    if(window.speechSynthesis) window.speechSynthesis.cancel();
    setPlaying(false);setElapsed(0);
    drawFrame(0,0,false);
  },[drawFrame]);

  const startRecord = useCallback(()=>{
    const canvas=canvasRef.current;
    if(!canvas) return;
    chunksRef.current=[];
    const stream=canvas.captureStream(30);
    const mime=MediaRecorder.isTypeSupported("video/webm;codecs=vp9")?"video/webm;codecs=vp9":"video/webm";
    const mr=new MediaRecorder(stream,{mimeType:mime});
    mr.ondataavailable=e=>{if(e.data.size>0)chunksRef.current.push(e.data);};
    mr.onstop=()=>{
      const blob=new Blob(chunksRef.current,{type:"video/webm"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url;a.download=`${(video.title||"vidai").replace(/\s+/g,"-")}.webm`;a.click();
      URL.revokeObjectURL(url);
      setDownloaded(true);setRecording(false);
    };
    mediaRecRef.current=mr;
    mr.start(100);setRecording(true);
    startPlay();
    setTimeout(()=>{if(mr.state==="recording")mr.stop();},(totalT+1.5)*1000);
  },[startPlay,totalT,video.title]);

  useEffect(()=>{drawFrame(0,0,false);},[drawFrame]);
  useEffect(()=>()=>{
    if(rafRef.current) cancelAnimationFrame(rafRef.current);
    if(window.speechSynthesis) window.speechSynthesis.cancel();
  },[]);

  const mm=String(Math.floor(elapsed/60)).padStart(2,"0");
  const ss=String(Math.floor(elapsed%60)).padStart(2,"0");
  const tm=String(Math.floor(totalT/60)).padStart(2,"0");
  const ts=String(Math.floor(totalT%60)).padStart(2,"0");

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.88)",backdropFilter:"blur(10px)",
      zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"var(--card)",borderRadius:20,border:"1px solid var(--border)",
        padding:24,maxWidth:isPortrait?460:780,width:"100%",animation:"fadeUp .4s ease"}}>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div>
            <div style={{fontFamily:"var(--fh)",fontWeight:800,fontSize:15,color:"var(--accent)"}}>◈ {video.title}</div>
            <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{video.style} · {isPortrait?"9:16":"16:9"} · {tm}:{ts}</div>
          </div>
          <button onClick={()=>{stopPlay();onClose();}}
            style={{background:"transparent",border:"1px solid var(--border)",borderRadius:8,
              color:"var(--muted)",padding:"6px 14px",cursor:"pointer",fontSize:13}}>✕ Close</button>
        </div>

        <div style={{display:"flex",justifyContent:"center",marginBottom:14}}>
          <div style={{position:"relative",borderRadius:12,overflow:"hidden",
            boxShadow:"0 0 40px var(--glow)",animation:"glow 3s ease infinite",
            border:"2px solid var(--accent)"}}>
            <canvas ref={canvasRef} width={CW} height={CH}
              style={{display:"block",maxWidth:"100%",maxHeight:"52vh"}}/>
            {recording && (
              <div style={{position:"absolute",top:8,left:8,background:"rgba(248,113,113,.2)",
                border:"1px solid #f87171",borderRadius:20,padding:"3px 10px",
                fontSize:10,color:"#f87171",fontWeight:700,animation:"blink 1s ease infinite"}}>
                ⏺ RECORDING
              </div>
            )}
          </div>
        </div>

        <div style={{marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,
            color:"var(--muted)",marginBottom:5}}>
            <span>Scene {currentScene+1} of {scenes.length}</span>
            <span style={{fontFamily:"monospace"}}>{mm}:{ss} / {tm}:{ts}</span>
          </div>
          <div style={{height:4,background:"var(--border)",borderRadius:2,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${(elapsed/totalT)*100}%`,
              background:"linear-gradient(90deg,var(--accent2),var(--accent))",
              borderRadius:2,transition:"width .3s linear"}}/>
          </div>
        </div>

        <div style={{display:"flex",gap:10,marginBottom:10}}>
          {!playing ? (
            <button onClick={startPlay}
              style={{flex:1,padding:"13px",
                background:"linear-gradient(135deg,var(--accent2),var(--accent))",
                border:"none",borderRadius:10,color:"#000",fontWeight:800,fontSize:14,
                cursor:"pointer",fontFamily:"var(--fh)"}}>▶ Play with Voice</button>
          ) : (
            <button onClick={stopPlay}
              style={{flex:1,padding:"13px",background:"var(--surface)",
                border:"1px solid var(--border)",borderRadius:10,color:"var(--text)",
                fontWeight:700,fontSize:14,cursor:"pointer"}}>⏹ Stop</button>
          )}
          <button onClick={startRecord} disabled={playing||recording}
            style={{flex:1,padding:"13px",
              background:playing||recording?"var(--border)":"rgba(248,113,113,.12)",
              border:"1px solid #f87171",borderRadius:10,
              color:playing||recording?"var(--muted)":"#f87171",
              fontWeight:700,fontSize:13,
              cursor:playing||recording?"not-allowed":"pointer"}}>
            {recording?"⏺ Saving…":"⬇ Record & Download"}
          </button>
        </div>

        {downloaded && (
          <div style={{padding:"10px 14px",background:"rgba(74,222,128,.1)",
            border:"1px solid rgba(74,222,128,.3)",borderRadius:10,
            fontSize:13,color:"var(--success)",textAlign:"center",marginBottom:10}}>
            ✅ Saved to Downloads as .webm — plays in Chrome, Firefox, VLC
          </div>
        )}

        <div style={{fontSize:11,color:"var(--muted)",textAlign:"center",lineHeight:1.6}}>
          💡 <b>Play</b> = preview with voice narration &nbsp;·&nbsp;
          <b>Record &amp; Download</b> = saves the full video to your device
        </div>
      </div>
    </div>
  );
}

function Badge({style}) {
  const c={educational:"#2a4a2a",social:"#2a2a4a",corporate:"#4a3a1a",motivational:"#4a1a1a"};
  return <span style={{background:c[style]||"#222",color:"var(--accent)",fontSize:10,fontWeight:700,
    padding:"2px 7px",borderRadius:4,letterSpacing:1,textTransform:"uppercase",
    fontFamily:"var(--fh)"}}>{style}</span>;
}

function PBar({value,label,step,total}) {
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
        <span style={{fontSize:13,color:"var(--muted)"}}>{label}</span>
        <span style={{fontSize:12,color:"var(--accent)",fontFamily:"var(--fh)",fontWeight:700}}>{step}/{total}</span>
      </div>
      <div style={{height:4,background:"var(--border)",borderRadius:2,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${value}%`,
          background:"linear-gradient(90deg,var(--accent2),var(--accent))",
          borderRadius:2,transition:"width .5s ease",
          boxShadow:"0 0 10px var(--glow)"}}/>
      </div>
    </div>
  );
}

export default function App() {
  const [tab,         setTab]         = useState("create");
  const [prompt,      setPrompt]      = useState("");
  const [style,       setStyle]       = useState("educational");
  const [voice,       setVoice]       = useState(VOICES_LIST[0]);
  const [lang,        setLang]        = useState("English");
  const [aspect,      setAspect]      = useState("landscape");
  const [phase,       setPhase]       = useState("idle");
  const [stepIdx,     setStepIdx]     = useState(0);
  const [progress,    setProgress]    = useState(0);
  const [result,      setResult]      = useState(null);
  const [savedVideos, setSavedVideos] = useState(SAMPLE_VIDEOS);
  const [improved,    setImproved]    = useState("");
  const [showImp,     setShowImp]     = useState(false);
  const [playerVid,   setPlayerVid]   = useState(null);
  const timerRef = useRef(null);

  const improveScript = async () => {
    if (!prompt.trim()) return;
    setPhase("improving");
    const out = await callClaude(
      `Improve this script for a ${style} video (${lang}): "${prompt}"`,
      `You are a professional video scriptwriter. Rewrite as a punchy 50-80 word script. Return ONLY the script.`
    );
    if (out){setImproved(out.trim());setShowImp(true);}
    setPhase("idle");
  };

  const generateVideo = useCallback(async () => {
    const script = showImp && improved ? improved : prompt;
    if (!script.trim()) return;
    setPhase("generating");setStepIdx(0);setProgress(0);setResult(null);

    let videoData = null;
    try {
      const raw = await callClaude(
        `Create a ${style} video for: "${script}". Voice: ${voice}. Language: ${lang}.`,
        `Return ONLY valid JSON no markdown:
{"title":"short catchy title","duration":"0:54","caption":"one line caption","hashtags":["#tag1","#tag2","#tag3","#tag4","#tag5"],"scenes":[{"emoji":"🌟","duration":9,"text":"full spoken sentence for narration"},{"emoji":"📊","duration":9,"text":"full spoken sentence"},{"emoji":"💡","duration":9,"text":"full spoken sentence"},{"emoji":"🚀","duration":9,"text":"full spoken sentence"},{"emoji":"🎯","duration":9,"text":"full spoken sentence"},{"emoji":"✅","duration":9,"text":"full spoken sentence"}]}`
      );
      if (raw){const c=raw.replace(/```json|```/g,"").trim();videoData=JSON.parse(c);}
    } catch(e){console.error(e);}

    if (!videoData) {
      videoData={
        title:script.slice(0,48),duration:"0:54",
        caption:"Powered by VIDAI · AI Video Studio",
        hashtags:["#AIVideo","#Content","#Creator","#Digital","#Innovation"],
        scenes:[
          {emoji:"🌅",duration:9,text:"Welcome. Let us explore this fascinating topic together."},
          {emoji:"📌",duration:9,text:"Here is why this matters to you and everyone around you."},
          {emoji:"💡",duration:9,text:"The key insight is simple but incredibly powerful."},
          {emoji:"📊",duration:9,text:"Evidence and data support this conclusion strongly."},
          {emoji:"🚀",duration:9,text:"This changes how we approach everything going forward."},
          {emoji:"✅",duration:9,text:"Now you know. Share this with someone who needs it."},
        ],
      };
    }

    const totalDur=STEPS.reduce((s,st)=>s+st.duration,0);
    for(let i=0;i<STEPS.length;i++){
      setStepIdx(i);
      const stepStart=STEPS.slice(0,i).reduce((s,st)=>s+st.duration,0);
      const ticks=Math.floor(STEPS[i].duration/40);
      await new Promise(resolve=>{
        let t=0;
        timerRef.current=setInterval(()=>{
          t++;
          setProgress(Math.min((stepStart+(t/ticks)*STEPS[i].duration)/totalDur*100,100));
          if(t>=ticks){clearInterval(timerRef.current);resolve();}
        },40);
      });
    }

    const final={...videoData,style,aspect,voice};
    setResult(final);setPhase("done");
    setSavedVideos(prev=>[{
      id:Date.now(),title:videoData.title,style,duration:videoData.duration,
      date:"Today",aspect,scenes:videoData.scenes,
      hashtags:videoData.hashtags,caption:videoData.caption,
    },...prev]);
  },[prompt,style,voice,lang,aspect,showImp,improved]);

  const reset=()=>{setPhase("idle");setResult(null);setProgress(0);setStepIdx(0);};
  const isGen=phase==="generating";
  const isImp=phase==="improving";
  const cur=STEPS[stepIdx]||STEPS[STEPS.length-1];

  return (
    <>
      <style>{FONTS+STYLES}</style>
      {playerVid && <CanvasPlayer video={playerVid} aspect={playerVid.aspect||"landscape"} onClose={()=>setPlayerVid(null)}/>}
      <div style={{minHeight:"100vh",background:"var(--bg)"}}>

        {/* Ticker */}
        <div style={{background:"var(--accent)",overflow:"hidden",height:28,display:"flex",alignItems:"center"}}>
          <div style={{display:"flex",whiteSpace:"nowrap",animation:"ticker 20s linear infinite"}}>
            {Array(8).fill("🎬 AI Text-to-Video · Play with Voice · Download Video · 60 Seconds · 1080p · ").map((t,i)=>(
              <span key={i} style={{fontSize:11,fontWeight:700,fontFamily:"var(--fh)",
                color:"#000",letterSpacing:1,padding:"0 28px"}}>{t}</span>
            ))}
          </div>
        </div>

        {/* Header */}
        <header style={{padding:"24px 32px 0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontFamily:"var(--fh)",fontWeight:800,fontSize:22,color:"var(--accent)"}}>◈ VIDAI</div>
            <div style={{fontSize:10,color:"var(--muted)",letterSpacing:2,textTransform:"uppercase"}}>Text-to-Video Studio</div>
          </div>
          <nav style={{display:"flex",gap:4}}>
            {["create","dashboard"].map(t=>(
              <button key={t} onClick={()=>setTab(t)}
                style={{padding:"8px 18px",borderRadius:8,
                  background:tab===t?"var(--accent)":"transparent",
                  border:tab===t?"none":"1px solid var(--border)",
                  color:tab===t?"#000":"var(--muted)",fontWeight:700,fontSize:12,
                  cursor:"pointer",fontFamily:"var(--fh)",letterSpacing:.8,textTransform:"uppercase"}}>
                {t==="create"?"🎬 Create":"📁 Dashboard"}
              </button>
            ))}
          </nav>
        </header>

        {/* CREATE */}
        {tab==="create" && (
          <main style={{maxWidth:860,margin:"0 auto",padding:"36px 24px 80px"}}>
            <div style={{textAlign:"center",marginBottom:36,animation:"fadeUp .6s ease"}}>
              <h1 style={{fontFamily:"var(--fh)",fontWeight:800,
                fontSize:"clamp(28px,5vw,50px)",lineHeight:1.1,letterSpacing:-1.5,marginBottom:10}}>
                Turn words into<br/>
                <span style={{background:"linear-gradient(90deg,var(--accent2),var(--accent))",
                  WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>cinematic video.</span>
              </h1>
              <p style={{color:"var(--muted)",fontSize:14,maxWidth:460,margin:"0 auto"}}>
                Enter a topic — get scenes, voice narration &amp; a downloadable video instantly.
              </p>
            </div>

            {phase!=="done" && <>
              {/* Style */}
              <div style={{marginBottom:20}}>
                <div style={{fontSize:10,color:"var(--muted)",letterSpacing:2,
                  textTransform:"uppercase",fontWeight:700,marginBottom:8}}>Video Style</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                  {VIDEO_STYLES.map(vs=>(
                    <button key={vs.id} onClick={()=>setStyle(vs.id)}
                      style={{padding:"12px 8px",borderRadius:10,cursor:"pointer",textAlign:"center",
                        border:style===vs.id?"2px solid var(--accent)":"2px solid var(--border)",
                        background:style===vs.id?"rgba(245,166,35,.08)":"var(--card)"}}>
                      <div style={{fontSize:20,marginBottom:3}}>{vs.icon}</div>
                      <div style={{fontFamily:"var(--fh)",fontWeight:700,fontSize:11,
                        color:style===vs.id?"var(--accent)":"var(--text)",marginBottom:1}}>{vs.label}</div>
                      <div style={{fontSize:9,color:"var(--muted)"}}>{vs.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:20}}>
                {[{label:"Voice",value:voice,opts:VOICES_LIST,set:setVoice},
                  {label:"Language",value:lang,opts:LANGUAGES,set:setLang}].map(o=>(
                  <div key={o.label}>
                    <div style={{fontSize:10,color:"var(--muted)",letterSpacing:2,
                      textTransform:"uppercase",fontWeight:700,marginBottom:5}}>{o.label}</div>
                    <select value={o.value} onChange={e=>o.set(e.target.value)}
                      style={{width:"100%",padding:"9px 10px",background:"var(--card)",
                        border:"1px solid var(--border)",borderRadius:8,color:"var(--text)",
                        fontSize:12,fontFamily:"var(--fb)",outline:"none",cursor:"pointer"}}>
                      {o.opts.map(v=><option key={v}>{v}</option>)}
                    </select>
                  </div>
                ))}
                <div>
                  <div style={{fontSize:10,color:"var(--muted)",letterSpacing:2,
                    textTransform:"uppercase",fontWeight:700,marginBottom:5}}>Format</div>
                  <div style={{display:"flex",gap:6}}>
                    {ASPECTS.map(a=>(
                      <button key={a.id} onClick={()=>setAspect(a.id)}
                        style={{flex:1,padding:"8px 4px",borderRadius:8,cursor:"pointer",textAlign:"center",
                          border:aspect===a.id?"1px solid var(--accent)":"1px solid var(--border)",
                          background:aspect===a.id?"rgba(245,166,35,.08)":"var(--card)",
                          color:aspect===a.id?"var(--accent)":"var(--muted)",
                          fontSize:10,fontWeight:600,fontFamily:"var(--fh)"}}>
                        <div style={{fontSize:14}}>{a.icon}</div>{a.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Prompt */}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,color:"var(--muted)",letterSpacing:2,
                  textTransform:"uppercase",fontWeight:700,marginBottom:7}}>Your Script or Topic</div>
                {showImp && improved ? (
                  <div style={{background:"rgba(245,166,35,.06)",border:"1px solid var(--accent)",
                    borderRadius:10,padding:14,marginBottom:8}}>
                    <div style={{fontSize:10,color:"var(--accent)",letterSpacing:2,fontWeight:700,marginBottom:7}}>✨ AI-IMPROVED SCRIPT</div>
                    <div style={{fontSize:14,lineHeight:1.7,color:"var(--text)",marginBottom:8}}>{improved}</div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>setShowImp(false)}
                        style={{fontSize:11,color:"var(--muted)",background:"transparent",
                          border:"1px solid var(--border)",borderRadius:6,padding:"4px 10px",cursor:"pointer"}}>Use original</button>
                      <button onClick={improveScript}
                        style={{fontSize:11,color:"var(--accent)",background:"transparent",
                          border:"1px solid var(--accent)",borderRadius:6,padding:"4px 10px",cursor:"pointer"}}>Re-improve</button>
                    </div>
                  </div>
                ) : (
                  <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={4}
                    placeholder="e.g. 'Explain how black holes form' or 'Top 5 habits of successful people'…"
                    style={{width:"100%",padding:"12px 14px",background:"var(--card)",
                      border:"1px solid var(--border)",borderRadius:10,color:"var(--text)",
                      fontSize:14,fontFamily:"var(--fb)",lineHeight:1.6,resize:"vertical",outline:"none"}}
                    onFocus={e=>e.target.style.borderColor="var(--accent)"}
                    onBlur={e=>e.target.style.borderColor="var(--border)"}/>
                )}
                <button onClick={improveScript} disabled={isImp||!prompt.trim()}
                  style={{marginTop:8,padding:"8px 16px",background:"transparent",
                    border:"1px solid var(--border)",borderRadius:8,
                    color:isImp?"var(--muted)":"var(--text)",fontSize:12,
                    cursor:isImp||!prompt.trim()?"not-allowed":"pointer",
                    display:"flex",alignItems:"center",gap:6}}>
                  {isImp?<><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span>Improving…</>:"✨ Improve Script"}
                </button>
              </div>

              <button onClick={generateVideo}
                disabled={isGen||(!prompt.trim()&&!improved.trim())}
                style={{width:"100%",padding:"16px",borderRadius:12,cursor:"pointer",
                  background:isGen?"var(--border)":"linear-gradient(135deg,var(--accent2),var(--accent))",
                  border:"none",color:"#000",fontFamily:"var(--fh)",fontWeight:800,fontSize:15,
                  boxShadow:isGen?"none":"0 4px 24px var(--glow)",
                  opacity:(!prompt.trim()&&!improved.trim())?.5:1}}>
                {isGen?"⏳ Generating your video…":"🎬 Generate Video"}
              </button>
            </>}

            {/* Progress */}
            {isGen && (
              <div style={{marginTop:28,background:"var(--card)",borderRadius:16,
                border:"1px solid var(--border)",padding:24}}>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
                  <div style={{fontSize:26,animation:"float 1.5s ease infinite"}}>{cur.icon}</div>
                  <div>
                    <div style={{fontFamily:"var(--fh)",fontWeight:700,fontSize:15}}>{cur.label}</div>
                    <div style={{fontSize:12,color:"var(--muted)"}}>Hang tight, almost ready…</div>
                  </div>
                </div>
                <PBar value={progress} label={cur.label} step={stepIdx+1} total={STEPS.length}/>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:16}}>
                  {STEPS.map((s,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:4,
                      padding:"4px 9px",borderRadius:20,fontSize:10,
                      background:i<stepIdx?"rgba(74,222,128,.1)":i===stepIdx?"rgba(245,166,35,.1)":"var(--surface)",
                      border:`1px solid ${i<stepIdx?"rgba(74,222,128,.3)":i===stepIdx?"var(--accent)":"var(--border)"}`,
                      color:i<stepIdx?"var(--success)":i===stepIdx?"var(--accent)":"var(--muted)",
                      fontWeight:i===stepIdx?700:400}}>
                      {i<stepIdx?"✓":s.icon} {s.label.split("…")[0]}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Result */}
            {phase==="done" && result && (
              <div style={{marginTop:28,animation:"fadeUp .6s ease"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
                  <span style={{fontSize:20}}>✅</span>
                  <span style={{fontFamily:"var(--fh)",fontWeight:800,fontSize:20}}>Your video is ready!</span>
                  <div style={{flex:1}}/>
                  <button onClick={reset}
                    style={{padding:"7px 14px",background:"transparent",
                      border:"1px solid var(--border)",borderRadius:8,
                      color:"var(--muted)",fontSize:12,cursor:"pointer"}}>↺ New video</button>
                </div>

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
                  <button onClick={()=>setPlayerVid(result)}
                    style={{padding:"18px",background:"linear-gradient(135deg,var(--accent2),var(--accent))",
                      border:"none",borderRadius:14,color:"#000",fontFamily:"var(--fh)",
                      fontWeight:800,fontSize:16,cursor:"pointer",
                      boxShadow:"0 4px 24px var(--glow)"}}>
                    ▶ Play Video
                  </button>
                  <button onClick={()=>setPlayerVid(result)}
                    style={{padding:"18px",background:"var(--card)",
                      border:"2px solid var(--accent)",borderRadius:14,color:"var(--accent)",
                      fontFamily:"var(--fh)",fontWeight:800,fontSize:16,cursor:"pointer"}}>
                    ⬇ Download Video
                  </button>
                </div>

                <div style={{background:"rgba(245,166,35,.06)",border:"1px solid rgba(245,166,35,.2)",
                  borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:12,color:"var(--muted)"}}>
                  💡 Click <b style={{color:"var(--accent)"}}>Play Video</b> to watch with voice narration, then click <b style={{color:"var(--accent)"}}>Record &amp; Download</b> inside the player to save the .webm file to your device.
                </div>

                <div style={{background:"var(--card)",border:"1px solid var(--border)",
                  borderRadius:16,padding:20}}>
                  <div style={{fontSize:10,color:"var(--muted)",letterSpacing:2,
                    textTransform:"uppercase",fontWeight:700,marginBottom:12}}>Scene Breakdown</div>
                  {result.scenes?.map((sc,i)=>(
                    <div key={i} style={{display:"flex",gap:12,padding:"10px 0",
                      borderBottom:"1px solid var(--border)"}}>
                      <div style={{width:44,height:32,borderRadius:6,flexShrink:0,
                        background:`hsl(${200+i*30},40%,15%)`,display:"flex",
                        alignItems:"center",justifyContent:"center",fontSize:16}}>{sc.emoji}</div>
                      <div>
                        <div style={{fontSize:10,color:"var(--accent)",fontWeight:700,
                          letterSpacing:.8,marginBottom:2,fontFamily:"var(--fh)"}}>
                          SCENE {i+1} · {sc.duration}s</div>
                        <div style={{fontSize:12,color:"var(--muted)",lineHeight:1.5}}>{sc.text}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{marginTop:14,paddingTop:14,borderTop:"1px solid var(--border)",
                    display:"flex",flexWrap:"wrap",gap:6}}>
                    {result.hashtags?.map(h=>(
                      <span key={h} style={{padding:"3px 9px",background:"rgba(245,166,35,.08)",
                        border:"1px solid rgba(245,166,35,.2)",borderRadius:20,
                        fontSize:11,color:"var(--accent)",fontWeight:600}}>{h}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </main>
        )}

        {/* DASHBOARD */}
        {tab==="dashboard" && (
          <main style={{maxWidth:860,margin:"0 auto",padding:"36px 24px 80px"}}>
            <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:28}}>
              <div>
                <h2 style={{fontFamily:"var(--fh)",fontWeight:800,fontSize:30,letterSpacing:-1,marginBottom:3}}>My Videos</h2>
                <p style={{color:"var(--muted)",fontSize:13}}>{savedVideos.length} videos generated</p>
              </div>
              <button onClick={()=>setTab("create")}
                style={{padding:"10px 18px",background:"linear-gradient(135deg,var(--accent2),var(--accent))",
                  border:"none",borderRadius:8,color:"#000",fontWeight:700,fontSize:12,
                  cursor:"pointer",fontFamily:"var(--fh)"}}>+ New Video</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:14}}>
              {savedVideos.map((v,i)=>(
                <div key={v.id}
                  style={{background:"var(--card)",border:"1px solid var(--border)",
                    borderRadius:14,overflow:"hidden",
                    animation:`fadeUp .5s ease ${i*60}ms both`,cursor:"pointer"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor="var(--accent)"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
                  <div style={{height:120,background:PALETTES[v.style]?.bg[0]||"#1a1a2a",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:40,position:"relative"}}>
                    {v.scenes?.[0]?.emoji||"🎬"}
                    <div style={{position:"absolute",bottom:7,right:7,background:"rgba(0,0,0,.75)",
                      borderRadius:4,padding:"2px 6px",fontSize:10,fontWeight:700,color:"#fff"}}>
                      {v.duration}</div>
                  </div>
                  <div style={{padding:12}}>
                    <div style={{fontFamily:"var(--fh)",fontWeight:700,fontSize:13,
                      marginBottom:6,lineHeight:1.3}}>{v.title}</div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                      <Badge style={v.style}/>
                      <span style={{fontSize:10,color:"var(--muted)"}}>{v.date}</span>
                    </div>
                    <div style={{display:"flex",gap:7}}>
                      <button onClick={()=>setPlayerVid({...v,aspect:v.aspect||"landscape"})}
                        style={{flex:1,padding:"7px",background:"rgba(245,166,35,.1)",
                          border:"1px solid rgba(245,166,35,.3)",borderRadius:6,
                          color:"var(--accent)",fontSize:11,fontWeight:700,cursor:"pointer"}}>▶ Play</button>
                      <button onClick={()=>setPlayerVid({...v,aspect:v.aspect||"landscape"})}
                        style={{flex:1,padding:"7px",background:"var(--surface)",
                          border:"1px solid var(--border)",borderRadius:6,
                          color:"var(--muted)",fontSize:11,cursor:"pointer"}}>⬇ Save</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </main>
        )}

        <footer style={{textAlign:"center",padding:"20px",borderTop:"1px solid var(--border)"}}>
          <span style={{fontSize:11,color:"var(--muted)",letterSpacing:1}}>◈ VIDAI · AI Text-to-Video Studio · Powered by Claude</span>
        </footer>
      </div>
    </>
  );
}
