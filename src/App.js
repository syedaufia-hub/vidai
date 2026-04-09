import { useState, useRef, useCallback } from "react";
import ReactDOM from "react-dom/client";
export default function App() {

// ─── Palette & Fonts ────────────────────────────────────────────────────────
const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');
`;

const STYLES = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0a0a0f;
    --surface: #111118;
    --card: #16161f;
    --border: #2a2a38;
    --accent: #f5a623;
    --accent2: #e8834a;
    --accent-glow: rgba(245,166,35,0.18);
    --text: #f0ede8;
    --muted: #7a7a95;
    --success: #4ade80;
    --error: #f87171;
    --font-head: 'Syne', sans-serif;
    --font-body: 'DM Sans', sans-serif;
  }
  body { background: var(--bg); color: var(--text); font-family: var(--font-body); }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
  @keyframes shimmer { 0%,100% { opacity:.4 } 50% { opacity:1 } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse-ring { 0% { transform:scale(1); opacity:.6; } 100% { transform:scale(1.5); opacity:0; } }
  @keyframes scan { 0%,100% { transform:translateY(0); } 50% { transform:translateY(160px); } }
  @keyframes glow-pulse { 0%,100% { box-shadow:0 0 20px var(--accent-glow); } 50% { box-shadow:0 0 40px rgba(245,166,35,.32); } }
  @keyframes ticker { 0% { transform:translateX(0); } 100% { transform:translateX(-50%); } }
  @keyframes float { 0%,100% { transform:translateY(0px); } 50% { transform:translateY(-6px); } }
`;

// ─── Video Styles ────────────────────────────────────────────────────────────
const VIDEO_STYLES = [
  { id: "educational", label: "Educational", icon: "🎓", desc: "Clear, informative, structured" },
  { id: "social",      label: "Social Media", icon: "📱", desc: "Punchy, viral, trendy" },
  { id: "corporate",   label: "Corporate",   icon: "💼", desc: "Professional, polished, clean" },
  { id: "motivational",label: "Motivational",icon: "🔥", desc: "Inspiring, energetic, bold" },
];

const VOICES = ["Nova (Female)", "Onyx (Male)", "Shimmer (Female)", "Echo (Male)"];
const LANGUAGES = ["English", "Spanish", "French", "German", "Portuguese", "Japanese"];
const ASPECTS = [{ id: "landscape", label: "16:9 Landscape", icon: "▬" }, { id: "portrait", label: "9:16 Portrait", icon: "▮" }];

// ─── Generation Steps ─────────────────────────────────────────────────────────
const STEPS = [
  { label: "Refining your script…",       icon: "✍️", duration: 2200 },
  { label: "Breaking into scenes…",       icon: "🎬", duration: 1800 },
  { label: "Generating AI visuals…",      icon: "🖼️", duration: 3000 },
  { label: "Synthesising voiceover…",     icon: "🎙️", duration: 2200 },
  { label: "Adding captions & titles…",  icon: "📝", duration: 1600 },
  { label: "Mixing background music…",   icon: "🎵", duration: 1800 },
  { label: "Rendering final video…",      icon: "🎞️", duration: 2400 },
];

// ─── Mock saved videos ────────────────────────────────────────────────────────
const SAMPLE_VIDEOS = [
  { id: 1, title: "The Future of Solar Energy", style: "educational", duration: "0:58", thumb: "#1a2a1a", date: "Apr 7" },
  { id: 2, title: "5 Productivity Hacks 🚀",   style: "social",      duration: "0:45", thumb: "#1a1a2a", date: "Apr 6" },
  { id: 3, title: "Q1 2025 Highlights",         style: "corporate",   duration: "0:60", thumb: "#2a1a1a", date: "Apr 5" },
];

// ─── Anthropic API call ───────────────────────────────────────────────────────
async function callClaude(prompt, system) {
  try {
    const apiKey = process.env.REACT_APP_ANTHROPIC_KEY;
    if (!apiKey) {
      console.error("No API key found");
      return null;
    }
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: system,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      console.error("API error:", err);
      return null;
    }
    const data = await res.json();
    return data.content?.map(b => b.text || "").join("") || "";
  } catch (err) {
    console.error("Fetch error:", err);
    return null;
  }
}
// ─── Components ───────────────────────────────────────────────────────────────
function Badge({ style }) {
  const colors = { educational:"#2a4a2a", social:"#2a2a4a", corporate:"#4a3a1a", motivational:"#4a1a1a" };
  return (
    <span style={{ background: colors[style]||"#222", color:"var(--accent)", fontSize:10, fontWeight:700,
      padding:"2px 7px", borderRadius:4, letterSpacing:1, textTransform:"uppercase", fontFamily:"var(--font-head)" }}>
      {style}
    </span>
  );
}

function SceneCard({ scene, index }) {
  return (
    <div style={{ display:"flex", gap:12, padding:"12px 0", borderBottom:"1px solid var(--border)",
      animation:`fadeUp .4s ease both`, animationDelay:`${index*80}ms` }}>
      <div style={{ width:52, height:36, borderRadius:6, background:`hsl(${200+index*30},40%,15%)`,
        flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:18, border:"1px solid var(--border)" }}>{scene.emoji}</div>
      <div>
        <div style={{ fontSize:11, color:"var(--accent)", fontWeight:700, letterSpacing:.8, marginBottom:3,
          fontFamily:"var(--font-head)" }}>SCENE {index + 1} · {scene.duration}s</div>
        <div style={{ fontSize:13, color:"var(--muted)", lineHeight:1.5 }}>{scene.text}</div>
      </div>
    </div>
  );
}

function ProgressBar({ value, label, step, totalSteps }) {
  return (
    <div style={{ animation:"fadeUp .4s ease" }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
        <span style={{ fontSize:13, color:"var(--muted)" }}>{label}</span>
        <span style={{ fontSize:12, color:"var(--accent)", fontFamily:"var(--font-head)", fontWeight:700 }}>
          {step}/{totalSteps}
        </span>
      </div>
      <div style={{ height:4, background:"var(--border)", borderRadius:2, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${value}%`, background:`linear-gradient(90deg,var(--accent2),var(--accent))`,
          borderRadius:2, transition:"width .6s cubic-bezier(.4,0,.2,1)",
          boxShadow:"0 0 10px var(--accent-glow)" }} />
      </div>
    </div>
  );
}

function VideoPreview({ video, aspect }) {
  const isPortrait = aspect === "portrait";
  const w = isPortrait ? 180 : 320;
  const h = isPortrait ? 320 : 180;

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16, animation:"fadeUp .6s ease" }}>
      <div style={{ position:"relative", width:w, height:h, borderRadius:12,
        background:`linear-gradient(135deg,#0d1b2a,#1a0d2a,#1a1a0d)`,
        border:"2px solid var(--accent)", boxShadow:"0 0 40px var(--accent-glow)",
        overflow:"hidden", animation:"glow-pulse 3s ease infinite" }}>
        {/* Scan line effect */}
        <div style={{ position:"absolute", left:0, right:0, height:2,
          background:"rgba(245,166,35,.4)", animation:"scan 3s ease-in-out infinite", zIndex:2 }} />
        {/* Film grain overlay */}
        <div style={{ position:"absolute", inset:0, zIndex:1,
          background:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.05) 2px,rgba(0,0,0,.05) 4px)" }} />
        {/* Content */}
        <div style={{ position:"relative", zIndex:3, height:"100%", display:"flex",
          flexDirection:"column", alignItems:"center", justifyContent:"center", padding:16, textAlign:"center" }}>
          <div style={{ fontSize:isPortrait?36:28, marginBottom:8, animation:"float 3s ease infinite" }}>🎬</div>
          <div style={{ fontFamily:"var(--font-head)", fontWeight:700, fontSize:isPortrait?12:11,
            color:"var(--accent)", letterSpacing:1, marginBottom:6 }}>{video.title}</div>
          <Badge style={video.style} />
          <div style={{ marginTop:10, fontSize:10, color:"var(--muted)" }}>
            ▶ {video.duration} · {isPortrait?"9:16":"16:9"}
          </div>
        </div>
        {/* Caption bar */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"8px 12px",
          background:"rgba(0,0,0,.7)", backdropFilter:"blur(4px)", zIndex:4 }}>
          <div style={{ fontSize:9, color:"#fff", textAlign:"center", fontWeight:500,
            borderBottom:"1px solid rgba(245,166,35,.3)", paddingBottom:4, marginBottom:4 }}>
            {video.caption}
          </div>
          <div style={{ display:"flex", justifyContent:"center", gap:6 }}>
            {video.hashtags?.slice(0,3).map(h=>(
              <span key={h} style={{ fontSize:8, color:"var(--accent)", fontWeight:700 }}>{h}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display:"flex", gap:10 }}>
        <button onClick={() => alert("▶ Playing generated video…")}
          style={{ padding:"10px 22px", background:`linear-gradient(135deg,var(--accent2),var(--accent))`,
            border:"none", borderRadius:8, color:"#000", fontWeight:700, fontSize:13,
            cursor:"pointer", fontFamily:"var(--font-head)", letterSpacing:.5 }}>▶ Play</button>
        <button onClick={() => alert("⬇ Downloading MP4…")}
          style={{ padding:"10px 22px", background:"transparent", border:"1px solid var(--accent)",
            borderRadius:8, color:"var(--accent)", fontWeight:600, fontSize:13,
            cursor:"pointer", fontFamily:"var(--font-body)" }}>⬇ Download MP4</button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("create"); // create | dashboard
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("educational");
  const [voice, setVoice] = useState(VOICES[0]);
  const [lang, setLang] = useState("English");
  const [aspect, setAspect] = useState("landscape");
  const [phase, setPhase] = useState("idle"); // idle | improving | generating | done | error
  const [stepIdx, setStepIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [savedVideos, setSavedVideos] = useState(SAMPLE_VIDEOS);
  const [improvedScript, setImprovedScript] = useState("");
  const [showImproved, setShowImproved] = useState(false);
  const [activeScript, setActiveScript] = useState("");
  const timerRef = useRef(null);

  // ── Improve script via Claude ─────────────────────────────────────────────
  const improveScript = async () => {
    if (!prompt.trim()) return;
    setPhase("improving");
    try {
      const improved = await callClaude(
        `Improve this script for a ${style} video (${lang}): "${prompt}"`,
        `You are a professional video scriptwriter. Given a topic or rough script, rewrite it as a punchy, engaging video script of 50-80 words max. Return ONLY the improved script, no labels or preamble.`
      );
      setImprovedScript(improved.trim());
      setShowImproved(true);
      setPhase("idle");
    } catch {
      setPhase("idle");
    }
  };

  // ── Generate video via Claude then simulate rendering ─────────────────────
  const generateVideo = useCallback(async () => {
    const script = showImproved && improvedScript ? improvedScript : prompt;
    if (!script.trim()) return;
    setPhase("generating");
    setStepIdx(0);
    setProgress(0);
    setResult(null);

    // 1️⃣  Claude generates structured content
    let videoData = null;
    try {
      const raw = await callClaude(
        `Create a ${style} video structure for: "${script}". Voice: ${voice}. Language: ${lang}.`,
        `You are a video production AI. Return ONLY valid JSON (no markdown) with this exact structure:
{
  "title": "catchy video title",
  "duration": "0:55",
  "caption": "one-line caption shown at bottom of video",
  "hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5"],
  "scenes": [
    {"emoji":"🌟","duration":8,"text":"scene description"},
    {"emoji":"📊","duration":9,"text":"scene description"},
    {"emoji":"💡","duration":8,"text":"scene description"},
    {"emoji":"🚀","duration":9,"text":"scene description"},
    {"emoji":"🎯","duration":8,"text":"scene description"},
    {"emoji":"✅","duration":9,"text":"scene description"}
  ]
}`
      );
      const clean = raw.replace(/```json|```/g, "").trim();
      videoData = JSON.parse(clean);
    } catch {
      videoData = {
        title: script.slice(0, 48),
        duration: "0:58",
        caption: "Powered by AI · Generated in seconds",
        hashtags: ["#AIVideo","#Content","#Creator","#Digital","#Innovation"],
        scenes: [
          { emoji:"🌅", duration:9, text:"Opening hook to grab attention immediately." },
          { emoji:"📌", duration:10, text:"Establish the core topic and why it matters." },
          { emoji:"💡", duration:10, text:"Deep dive into the key insight or solution." },
          { emoji:"📊", duration:9, text:"Support with data, examples, or evidence." },
          { emoji:"🚀", duration:10, text:"Transformation or next step for the viewer." },
          { emoji:"✅", duration:10, text:"Clear call-to-action and memorable close." },
        ],
      };
    }

    // 2️⃣  Simulate rendering steps
    const totalDuration = STEPS.reduce((s, st) => s + st.duration, 0);

    for (let i = 0; i < STEPS.length; i++) {
      setStepIdx(i);
      const stepStart = STEPS.slice(0, i).reduce((s, st) => s + st.duration, 0);
      const stepDuration = STEPS[i].duration;
      const tickMs = 40;
      const ticks = Math.floor(stepDuration / tickMs);

      await new Promise(resolve => {
        let t = 0;
        timerRef.current = setInterval(() => {
          t++;
          const stepProgress = t / ticks;
          const totalProgress = (stepStart + stepProgress * stepDuration) / totalDuration * 100;
          setProgress(Math.min(totalProgress, 100));
          if (t >= ticks) { clearInterval(timerRef.current); resolve(); }
        }, tickMs);
      });
    }

    setResult({ ...videoData, style, aspect, voice });
    setPhase("done");

    // Save to dashboard
    setSavedVideos(prev => [{
      id: Date.now(),
      title: videoData.title,
      style,
      duration: videoData.duration,
      thumb: `hsl(${Math.random()*360},40%,15%)`,
      date: "Today",
    }, ...prev]);
  }, [prompt, style, voice, lang, aspect, showImproved, improvedScript]);

  const reset = () => { setPhase("idle"); setResult(null); setProgress(0); setStepIdx(0); };

  // ── Derived state ─────────────────────────────────────────────────────────
  const isGenerating = phase === "generating";
  const isImproving  = phase === "improving";
  const currentStep  = STEPS[stepIdx] || STEPS[STEPS.length - 1];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{FONTS + STYLES}</style>
      <div style={{ minHeight:"100vh", background:"var(--bg)", fontFamily:"var(--font-body)" }}>

        {/* ── Noise texture overlay ── */}
        <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, opacity:.03,
          backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

        {/* ── Ticker ── */}
        <div style={{ background:"var(--accent)", overflow:"hidden", height:28, display:"flex",
          alignItems:"center", position:"relative", zIndex:10 }}>
          <div style={{ display:"flex", gap:0, whiteSpace:"nowrap", animation:"ticker 18s linear infinite" }}>
            {Array(6).fill("🎬 AI Text-to-Video  ·  60 Seconds  ·  1080p  ·  MP4  ·  Instant Generation  ·").map((t,i)=>(
              <span key={i} style={{ fontSize:11, fontWeight:700, fontFamily:"var(--font-head)",
                color:"#000", letterSpacing:1, padding:"0 32px" }}>{t}</span>
            ))}
          </div>
        </div>

        {/* ── Header ── */}
        <header style={{ position:"relative", zIndex:10, padding:"28px 40px 0",
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontFamily:"var(--font-head)", fontWeight:800, fontSize:22,
              color:"var(--accent)", letterSpacing:-0.5 }}>◈ VIDAI</div>
            <div style={{ fontSize:10, color:"var(--muted)", letterSpacing:2, textTransform:"uppercase" }}>
              Text-to-Video Studio
            </div>
          </div>
          <nav style={{ display:"flex", gap:4 }}>
            {["create","dashboard"].map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding:"8px 18px", borderRadius:8,
                  background: tab===t ? "var(--accent)" : "transparent",
                  border: tab===t ? "none" : "1px solid var(--border)",
                  color: tab===t ? "#000" : "var(--muted)",
                  fontWeight: 700, fontSize:12, cursor:"pointer",
                  fontFamily:"var(--font-head)", letterSpacing:.8, textTransform:"uppercase",
                  transition:"all .2s" }}>
                {t === "create" ? "🎬 Create" : "📁 Dashboard"}
              </button>
            ))}
          </nav>
        </header>

        {/* ═══════════════════ CREATE TAB ═══════════════════ */}
        {tab === "create" && (
          <main style={{ position:"relative", zIndex:10, maxWidth:900, margin:"0 auto",
            padding:"40px 24px 80px" }}>

            {/* Hero */}
            <div style={{ textAlign:"center", marginBottom:40, animation:"fadeUp .6s ease" }}>
              <h1 style={{ fontFamily:"var(--font-head)", fontWeight:800, fontSize:"clamp(32px,5vw,54px)",
                lineHeight:1.1, letterSpacing:-1.5, marginBottom:12 }}>
                Turn words into<br />
                <span style={{ background:`linear-gradient(90deg,var(--accent2),var(--accent))`,
                  WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                  cinematic video.
                </span>
              </h1>
              <p style={{ color:"var(--muted)", fontSize:15, maxWidth:480, margin:"0 auto" }}>
                Enter a topic or script — get a fully produced video with visuals, narration, captions &amp; music in seconds.
              </p>
            </div>

            {phase !== "done" && (
              <>
                {/* ── Style Selector ── */}
                <div style={{ marginBottom:24, animation:"fadeUp .5s ease .1s both" }}>
                  <div style={{ fontSize:11, color:"var(--muted)", letterSpacing:2,
                    textTransform:"uppercase", fontWeight:700, marginBottom:10 }}>Video Style</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
                    {VIDEO_STYLES.map(vs => (
                      <button key={vs.id} onClick={() => setStyle(vs.id)}
                        style={{ padding:"14px 10px", borderRadius:10, cursor:"pointer", transition:"all .2s",
                          border: style===vs.id ? "2px solid var(--accent)" : "2px solid var(--border)",
                          background: style===vs.id ? "rgba(245,166,35,.08)" : "var(--card)",
                          textAlign:"center" }}>
                        <div style={{ fontSize:22, marginBottom:4 }}>{vs.icon}</div>
                        <div style={{ fontFamily:"var(--font-head)", fontWeight:700, fontSize:12,
                          color: style===vs.id ? "var(--accent)" : "var(--text)", marginBottom:2 }}>{vs.label}</div>
                        <div style={{ fontSize:10, color:"var(--muted)" }}>{vs.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Options Row ── */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12,
                  marginBottom:24, animation:"fadeUp .5s ease .15s both" }}>
                  {[
                    { label:"Voice", value:voice, options:VOICES, set:setVoice },
                    { label:"Language", value:lang, options:LANGUAGES, set:setLang },
                  ].map(opt => (
                    <div key={opt.label}>
                      <div style={{ fontSize:10, color:"var(--muted)", letterSpacing:2,
                        textTransform:"uppercase", fontWeight:700, marginBottom:6 }}>{opt.label}</div>
                      <select value={opt.value} onChange={e=>opt.set(e.target.value)}
                        style={{ width:"100%", padding:"10px 12px", background:"var(--card)",
                          border:"1px solid var(--border)", borderRadius:8, color:"var(--text)",
                          fontSize:13, fontFamily:"var(--font-body)", cursor:"pointer",
                          outline:"none" }}>
                        {opt.options.map(o=><option key={o}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                  <div>
                    <div style={{ fontSize:10, color:"var(--muted)", letterSpacing:2,
                      textTransform:"uppercase", fontWeight:700, marginBottom:6 }}>Format</div>
                    <div style={{ display:"flex", gap:8 }}>
                      {ASPECTS.map(a => (
                        <button key={a.id} onClick={() => setAspect(a.id)}
                          style={{ flex:1, padding:"9px 6px", borderRadius:8, cursor:"pointer",
                            border: aspect===a.id ? "1px solid var(--accent)" : "1px solid var(--border)",
                            background: aspect===a.id ? "rgba(245,166,35,.08)" : "var(--card)",
                            color: aspect===a.id ? "var(--accent)" : "var(--muted)",
                            fontSize:11, fontWeight:600, textAlign:"center", transition:"all .2s",
                            fontFamily:"var(--font-head)" }}>
                          <div style={{ fontSize:16 }}>{a.icon}</div>
                          <div>{a.label.split(" ")[0]}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Prompt Input ── */}
                <div style={{ marginBottom:16, animation:"fadeUp .5s ease .2s both" }}>
                  <div style={{ fontSize:11, color:"var(--muted)", letterSpacing:2,
                    textTransform:"uppercase", fontWeight:700, marginBottom:8 }}>
                    Your Script or Topic
                  </div>
                  {showImproved && improvedScript ? (
                    <div style={{ background:"rgba(245,166,35,.06)", border:"1px solid var(--accent)",
                      borderRadius:10, padding:16, marginBottom:10 }}>
                      <div style={{ fontSize:10, color:"var(--accent)", letterSpacing:2,
                        fontWeight:700, marginBottom:8 }}>✨ AI-IMPROVED SCRIPT</div>
                      <div style={{ fontSize:14, lineHeight:1.7, color:"var(--text)", marginBottom:10 }}>{improvedScript}</div>
                      <div style={{ display:"flex", gap:8 }}>
                        <button onClick={() => setShowImproved(false)}
                          style={{ fontSize:11, color:"var(--muted)", background:"transparent",
                            border:"1px solid var(--border)", borderRadius:6, padding:"4px 10px", cursor:"pointer" }}>
                          Use original
                        </button>
                        <button onClick={improveScript} disabled={isImproving}
                          style={{ fontSize:11, color:"var(--accent)", background:"transparent",
                            border:"1px solid var(--accent)", borderRadius:6, padding:"4px 10px", cursor:"pointer" }}>
                          Re-improve
                        </button>
                      </div>
                    </div>
                  ) : (
                    <textarea
                      value={prompt}
                      onChange={e => setPrompt(e.target.value)}
                      placeholder="e.g. 'Explain how black holes form' or 'Top 5 habits of successful people'…"
                      rows={4}
                      style={{ width:"100%", padding:"14px 16px", background:"var(--card)",
                        border:"1px solid var(--border)", borderRadius:10, color:"var(--text)",
                        fontSize:14, fontFamily:"var(--font-body)", lineHeight:1.6, resize:"vertical",
                        outline:"none", transition:"border-color .2s" }}
                      onFocus={e=>e.target.style.borderColor="var(--accent)"}
                      onBlur={e=>e.target.style.borderColor="var(--border)"}
                    />
                  )}

                  <div style={{ display:"flex", gap:10, marginTop:10 }}>
                    <button onClick={improveScript} disabled={isImproving || !prompt.trim()}
                      style={{ padding:"9px 18px", background:"transparent",
                        border:"1px solid var(--border)", borderRadius:8,
                        color: isImproving ? "var(--muted)" : "var(--text)", fontSize:13,
                        cursor: isImproving || !prompt.trim() ? "not-allowed" : "pointer",
                        fontFamily:"var(--font-body)", display:"flex", alignItems:"center", gap:6,
                        transition:"all .2s" }}>
                      {isImproving ? <><span style={{ animation:"spin 1s linear infinite", display:"inline-block" }}>⟳</span> Improving…</> : "✨ Improve Script"}
                    </button>
                    <div style={{ flex:1 }} />
                    <span style={{ fontSize:11, color:"var(--muted)", alignSelf:"center" }}>
                      {(showImproved ? improvedScript : prompt).length}/300 chars
                    </span>
                  </div>
                </div>

                {/* ── Generate Button ── */}
                <button onClick={generateVideo}
                  disabled={isGenerating || (!prompt.trim() && !improvedScript.trim())}
                  style={{ width:"100%", padding:"18px", borderRadius:12, cursor:"pointer",
                    background: isGenerating ? "var(--border)" : `linear-gradient(135deg,var(--accent2),var(--accent))`,
                    border:"none", color:"#000", fontFamily:"var(--font-head)", fontWeight:800,
                    fontSize:16, letterSpacing:.5, transition:"all .3s",
                    boxShadow: isGenerating ? "none" : "0 4px 24px var(--accent-glow)",
                    animation:"fadeUp .5s ease .3s both",
                    transform: isGenerating ? "none" : "translateY(0)",
                    opacity: (!prompt.trim() && !improvedScript.trim()) ? .5 : 1 }}>
                  {isGenerating ? "⏳ Generating your video…" : "🎬 Generate Video"}
                </button>
              </>
            )}

            {/* ── Generating Progress ── */}
            {isGenerating && (
              <div style={{ marginTop:32, background:"var(--card)", borderRadius:16,
                border:"1px solid var(--border)", padding:28, animation:"fadeUp .4s ease" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
                  <div style={{ fontSize:28, animation:"float 1.5s ease infinite" }}>{currentStep.icon}</div>
                  <div>
                    <div style={{ fontFamily:"var(--font-head)", fontWeight:700, fontSize:16 }}>
                      {currentStep.label}
                    </div>
                    <div style={{ fontSize:12, color:"var(--muted)" }}>This takes just a moment…</div>
                  </div>
                </div>
                <ProgressBar value={progress} label={currentStep.label}
                  step={stepIdx+1} totalSteps={STEPS.length} />
                <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:20 }}>
                  {STEPS.map((s, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:5,
                      padding:"5px 10px", borderRadius:20,
                      background: i < stepIdx ? "rgba(74,222,128,.1)" : i === stepIdx ? "rgba(245,166,35,.1)" : "var(--surface)",
                      border: `1px solid ${i < stepIdx ? "rgba(74,222,128,.3)" : i===stepIdx ? "var(--accent)" : "var(--border)"}`,
                      fontSize:10, color: i < stepIdx ? "var(--success)" : i===stepIdx ? "var(--accent)" : "var(--muted)",
                      fontWeight: i===stepIdx ? 700 : 400, transition:"all .3s" }}>
                      <span>{i < stepIdx ? "✓" : s.icon}</span>
                      <span>{s.label.split("…")[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Done — Result ── */}
            {phase === "done" && result && (
              <div style={{ marginTop:32, animation:"fadeUp .6s ease" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24 }}>
                  <div style={{ fontSize:20 }}>✅</div>
                  <div style={{ fontFamily:"var(--font-head)", fontWeight:800, fontSize:20 }}>
                    Your video is ready!
                  </div>
                  <div style={{ flex:1 }} />
                  <button onClick={reset}
                    style={{ padding:"8px 16px", background:"transparent",
                      border:"1px solid var(--border)", borderRadius:8,
                      color:"var(--muted)", fontSize:12, cursor:"pointer", fontFamily:"var(--font-body)" }}>
                    ↺ Create another
                  </button>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"auto 1fr", gap:24 }}>
                  {/* Preview */}
                  <VideoPreview video={result} aspect={result.aspect} />

                  {/* Scene breakdown */}
                  <div style={{ background:"var(--card)", border:"1px solid var(--border)",
                    borderRadius:16, padding:20 }}>
                    <div style={{ fontSize:11, color:"var(--muted)", letterSpacing:2,
                      textTransform:"uppercase", fontWeight:700, marginBottom:12 }}>Scene Breakdown</div>
                    {result.scenes?.map((sc, i) => <SceneCard key={i} scene={sc} index={i} />)}

                    {/* Hashtags */}
                    <div style={{ marginTop:16, paddingTop:16, borderTop:"1px solid var(--border)" }}>
                      <div style={{ fontSize:11, color:"var(--muted)", letterSpacing:2,
                        textTransform:"uppercase", fontWeight:700, marginBottom:8 }}>Hashtags</div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                        {result.hashtags?.map(h => (
                          <span key={h} style={{ padding:"4px 10px", background:"rgba(245,166,35,.08)",
                            border:"1px solid rgba(245,166,35,.2)", borderRadius:20,
                            fontSize:11, color:"var(--accent)", fontWeight:600 }}>{h}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        )}

        {/* ═══════════════════ DASHBOARD TAB ═══════════════════ */}
        {tab === "dashboard" && (
          <main style={{ position:"relative", zIndex:10, maxWidth:900, margin:"0 auto", padding:"40px 24px 80px" }}>
            <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between",
              marginBottom:32, animation:"fadeUp .5s ease" }}>
              <div>
                <h2 style={{ fontFamily:"var(--font-head)", fontWeight:800, fontSize:32,
                  letterSpacing:-1, marginBottom:4 }}>My Videos</h2>
                <p style={{ color:"var(--muted)", fontSize:14 }}>{savedVideos.length} videos generated</p>
              </div>
              <button onClick={() => setTab("create")}
                style={{ padding:"10px 20px", background:`linear-gradient(135deg,var(--accent2),var(--accent))`,
                  border:"none", borderRadius:8, color:"#000", fontWeight:700, fontSize:13,
                  cursor:"pointer", fontFamily:"var(--font-head)" }}>
                + New Video
              </button>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:16 }}>
              {savedVideos.map((v, i) => (
                <div key={v.id} style={{ background:"var(--card)", border:"1px solid var(--border)",
                  borderRadius:14, overflow:"hidden", animation:`fadeUp .5s ease ${i*60}ms both`,
                  cursor:"pointer", transition:"border-color .2s, transform .2s" }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--accent)";e.currentTarget.style.transform="translateY(-2px)"}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.transform="none"}}>
                  {/* Thumb */}
                  <div style={{ height:130, background:v.thumb||"#1a1a2a",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:36, position:"relative" }}>
                    🎬
                    <div style={{ position:"absolute", bottom:8, right:8, background:"rgba(0,0,0,.7)",
                      borderRadius:4, padding:"2px 6px", fontSize:11, fontWeight:700, color:"#fff" }}>
                      {v.duration}
                    </div>
                  </div>
                  <div style={{ padding:14 }}>
                    <div style={{ fontFamily:"var(--font-head)", fontWeight:700, fontSize:14,
                      marginBottom:6, lineHeight:1.3 }}>{v.title}</div>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <Badge style={v.style} />
                      <span style={{ fontSize:11, color:"var(--muted)" }}>{v.date}</span>
                    </div>
                    <div style={{ display:"flex", gap:8, marginTop:10 }}>
                      <button onClick={() => alert("▶ Playing…")}
                        style={{ flex:1, padding:"7px", background:"rgba(245,166,35,.1)",
                          border:"1px solid rgba(245,166,35,.3)", borderRadius:6,
                          color:"var(--accent)", fontSize:11, fontWeight:700, cursor:"pointer" }}>▶ Play</button>
                      <button onClick={() => alert("⬇ Downloading…")}
                        style={{ flex:1, padding:"7px", background:"var(--surface)",
                          border:"1px solid var(--border)", borderRadius:6,
                          color:"var(--muted)", fontSize:11, cursor:"pointer" }}>⬇ MP4</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </main>
        )}

        {/* ── Footer ── */}
        <footer style={{ position:"relative", zIndex:10, textAlign:"center",
          padding:"24px", borderTop:"1px solid var(--border)" }}>
          <span style={{ fontSize:11, color:"var(--muted)", letterSpacing:1 }}>
            ◈ VIDAI · AI Text-to-Video Studio · Powered by Claude
          </span>
        </footer>
      </div>
    </>
  );
}
