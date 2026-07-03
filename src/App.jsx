import { useState, useCallback, useRef, useEffect } from "react";
import { Search, BarChart3, Layout, Plus, X, ChevronDown, ChevronRight, GripVertical,
  AlertTriangle, Check, Pencil, RotateCcw, MapPin, Eye, Upload, List,
  ArrowRight, Layers, Target, FileText, Home, Bookmark, CheckCircle, Trash2,
  Loader, Zap } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
   DESIGN TOKENS
   ═══════════════════════════════════════════════════════════════════ */
const T = {
  canvas:"#0b0b0b", canvasSoft:"#212121", canvasLight:"#ffffff", canvasPaper:"#ededed",
  ink:"#0b0b0b", onPrimary:"#ffffff",
  ash:"#b9b9b9", mute:"#797979", graphite:"#353535",
  brand:"#f36458", brandDeep:"#dd0000",
  hairline:"#ededed", hairlineSoft:"#353535",
  success:"#37cd84", successDark:"#1a7a45",
  rSm:"4px", rMd:"5px", rLg:"6px", rMkt:"12px", rFull:"9999px",
  col:{
    flagged:      {bg:"#2a1a0a",border:"#f36458",text:"#f8c4be",label:"Flagged"},
    investigating:{bg:"#0d1f12",border:"#4A7C50",text:"#a3c9a8",label:"Investigating"},
    resolved:     {bg:"#0a1220",border:"#4A6E8C",text:"#9ab4cc",label:"Resolved"},
    designed:     {bg:"#0d1a10",border:"#3D6B45",text:"#8fbf97",label:"Designed-for"},
  },
  conf:{
    High:  {bg:"#0d1f12",text:"#a3c9a8",dot:"#4A7C50"},
    Medium:{bg:"#2a1a0a",text:"#f8c4be",dot:"#f36458"},
    Low:   {bg:"#1f0d0d",text:"#f0a0a0",dot:"#dd0000"},
  },
  bm:{
    Concern:    {color:"#f36458"},
    Opportunity:{color:"#37cd84"},
    Observe:    {color:"#55beff"},
    Verify:     {color:"#C9A96E"},
  },
};

const STATUSES = ["flagged","investigating","resolved","designed"];
const FONT_SANS = "'DM Sans',system-ui,sans-serif";
const FONT_MONO = "'IBM Plex Mono',monospace";
const BM_CATS   = ["Concern","Opportunity","Observe","Verify"];

/* ═══════════════════════════════════════════════════════════════════
   SITE AUDIT SKILL — system prompt
   ═══════════════════════════════════════════════════════════════════ */
const SKILL_PROMPT = (address, brief) => {
  return `You are a site audit specialist for urban design projects in Australia.
Generate a pre-site-visit investigation brief for the site and project brief below.

SITE ADDRESS: ${address}
PROJECT BRIEF: ${brief}

Respond with ONLY a valid JSON object. No markdown, no code fences, no text before or after.
Start your response with { and end with }.

Requirements:
- Infer 3 to 5 objectives from the project brief
- Generate exactly 6 findings (ids F1 through F6)
- All string values must avoid apostrophes - write "does not" not "doesn't", "it is" not "it's"
- All string values must avoid em-dashes - use a comma or rewrite instead
- confidence must be exactly one of: High, Medium, Low
- status must be exactly: flagged
- objs array must only contain objective ids that exist in your objectives array
- Every finding must have at least one objective id in its objs array
- Evidence sentences must reference specific plausible conditions at this location in Australia
- Investigation questions must be specific and verifiable on a site visit
- Implications must begin with the words: If confirmed

Return exactly this JSON shape with all fields populated:
{"sceneSummary":"your summary here","objectives":[{"id":"o1","name":"objective name","short":"short"},{"id":"o2","name":"objective name","short":"short"},{"id":"o3","name":"objective name","short":"short"}],"findings":[{"id":"F1","status":"flagged","cat":"Movement","ev":"evidence","q":"question","imp":"If confirmed this may...","conf":"High","objs":["o1"],"res":"","dr":"","checked":false},{"id":"F2","status":"flagged","cat":"Drainage","ev":"evidence","q":"question","imp":"If confirmed this may...","conf":"Medium","objs":["o2"],"res":"","dr":"","checked":false},{"id":"F3","status":"flagged","cat":"Microclimate","ev":"evidence","q":"question","imp":"If confirmed this may...","conf":"High","objs":["o1","o3"],"res":"","dr":"","checked":false},{"id":"F4","status":"flagged","cat":"Social use","ev":"evidence","q":"question","imp":"If confirmed this may...","conf":"Medium","objs":["o2"],"res":"","dr":"","checked":false},{"id":"F5","status":"flagged","cat":"Built form","ev":"evidence","q":"question","imp":"If confirmed this may...","conf":"High","objs":["o3"],"res":"","dr":"","checked":false},{"id":"F6","status":"flagged","cat":"Movement","ev":"evidence","q":"question","imp":"If confirmed this may...","conf":"Medium","objs":["o1"],"res":"","dr":"","checked":false}],"limitations":"limitation note"}

Replace every placeholder value above with real specific content about this actual site and brief.`;
};

/* ═══════════════════════════════════════════════════════════════════
   CLAUDE API CALL
   ═══════════════════════════════════════════════════════════════════ */
async function runAudit(address, brief, onProgress, apiKey) {
  onProgress("Connecting to Claude...", 10);
  await new Promise(r => setTimeout(r, 400));

  onProgress("Analysing site context and urban conditions...", 30);
  await new Promise(r => setTimeout(r, 300));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      messages: [{ role: "user", content: SKILL_PROMPT(address, brief) }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(()=>({}));
    throw new Error(err.error?.message || `API error ${response.status}`);
  }

  onProgress("Cross-referencing aerial and ground conditions...", 55);
  await new Promise(r => setTimeout(r, 400));

  const data = await response.json();
  onProgress("Generating investigation questions...", 75);
  await new Promise(r => setTimeout(r, 300));

  const raw = data.content.map(b => b.text || "").join("");

  // Multi-stage JSON extraction and repair
  let parsed;
  try {
    // Stage 1: strip markdown fences and trim
    let clean = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    // Stage 2: extract the outermost JSON object
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No JSON object found");
    clean = clean.slice(start, end + 1);
    // Stage 3: attempt direct parse
    try {
      parsed = JSON.parse(clean);
    } catch(e1) {
      // Stage 4: sanitise common model mistakes
      // Replace curly apostrophes/smart quotes with straight ones
      let sanitised = clean
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2013\u2014]/g, "-");
      // Remove trailing commas before } or ]
      sanitised = sanitised.replace(/,\s*([\]}])/g, "$1");
      parsed = JSON.parse(sanitised);
    }
  } catch(e) {
    throw new Error("Audit response could not be parsed. Please try again. Detail: " + e.message);
  }

  // Validate minimal shape
  if (!parsed.findings || !Array.isArray(parsed.findings) || parsed.findings.length === 0) {
    throw new Error("Audit returned no findings. Please try again.");
  }

  // Ensure all required fields exist on each finding
  parsed.findings = parsed.findings.map((f, i) => ({
    id: f.id || `F${i+1}`,
    status: ["flagged","investigating","resolved","designed"].includes(f.status) ? f.status : "flagged",
    cat: f.cat || "General",
    ev: f.ev || "",
    q: f.q || "",
    imp: f.imp || "",
    conf: ["High","Medium","Low"].includes(f.conf) ? f.conf : "Medium",
    objs: Array.isArray(f.objs) ? f.objs : [],
    res: f.res || "",
    dr: f.dr || "",
    checked: false,
  }));

  if (!parsed.objectives) parsed.objectives = [];
  if (!parsed.sceneSummary) parsed.sceneSummary = "";
  if (!parsed.limitations) parsed.limitations = "";

  onProgress("Populating board...", 92);
  await new Promise(r => setTimeout(r, 300));
  return parsed;
}

/* ═══════════════════════════════════════════════════════════════════
   CONFETTI
   ═══════════════════════════════════════════════════════════════════ */
function useConfetti(){
  const [particles,setParticles]=useState([]);
  const fire=useCallback((x,y)=>{
    const cols=["#f36458","#37cd84","#55beff","#C9A96E","#ffffff","#ffdd44"];
    const ps=Array.from({length:32},(_,i)=>({
      id:Date.now()+i, x, y,
      vx:(Math.random()-0.5)*7, vy:-(Math.random()*6+2),
      rot:Math.random()*360, rotV:(Math.random()-0.5)*16,
      col:cols[Math.floor(Math.random()*cols.length)],
      size:Math.random()*5+3, life:1,
      shape:Math.random()>0.5?"rect":"circle",
    }));
    setParticles(p=>[...p,...ps]);
    let frame;
    const tick=()=>{
      setParticles(p=>{
        const next=p.map(pt=>({...pt,x:pt.x+pt.vx,y:pt.y+pt.vy,vy:pt.vy+0.2,
          rot:pt.rot+pt.rotV,life:pt.life-0.022})).filter(pt=>pt.life>0);
        if(next.length>0) frame=requestAnimationFrame(tick);
        return next;
      });
    };
    frame=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(frame);
  },[]);
  return{particles,fire};
}

function ConfettiLayer({particles}){
  if(!particles.length)return null;
  return(
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:9999}}>
      {particles.map(p=>(
        <div key={p.id} style={{position:"absolute",left:p.x,top:p.y,
          width:p.shape==="rect"?p.size*2:p.size,height:p.size,
          borderRadius:p.shape==="circle"?"50%":"2px",
          background:p.col,opacity:Math.max(0,p.life),
          transform:`rotate(${p.rot}deg)`,pointerEvents:"none"}}/>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MICRO COMPONENTS
   ═══════════════════════════════════════════════════════════════════ */
const Eyebrow=({children,style={}})=>(
  <span style={{fontFamily:FONT_MONO,fontSize:11,fontWeight:400,letterSpacing:"0.08em",
    textTransform:"uppercase",color:T.mute,...style}}>{children}</span>
);
const ConfBadge=({l})=>{
  const c=T.conf[l]||T.conf.Medium;
  return(<span style={{display:"inline-flex",alignItems:"center",gap:5,fontFamily:FONT_MONO,
    fontSize:10,padding:"2px 8px",borderRadius:T.rSm,background:c.bg,color:c.text}}>
    <span style={{width:5,height:5,borderRadius:"50%",background:c.dot,flexShrink:0}}/>{l}</span>);
};
const CatTag=({c})=>(<span style={{fontFamily:FONT_MONO,fontSize:10,padding:"2px 7px",
  borderRadius:T.rSm,background:T.canvasSoft,color:T.ash,border:`1px solid ${T.hairlineSoft}`}}>{c}</span>);
const ObjTag=({name})=>(<span style={{fontFamily:FONT_MONO,fontSize:10,padding:"2px 6px",
  borderRadius:T.rSm,background:T.graphite,color:T.ash}}>{name}</span>);

function StatusDrop({current,onChange}){
  const [open,setOpen]=useState(false);
  const ref=useRef(null);
  useEffect(()=>{
    const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};
    document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);
  },[]);
  const m=T.col[current];
  return(<div ref={ref} style={{position:"relative"}}>
    <button onClick={()=>setOpen(!open)} style={{display:"flex",alignItems:"center",gap:4,
      fontFamily:FONT_MONO,fontSize:10,padding:"3px 8px",borderRadius:T.rSm,
      border:`1px solid ${m.border}`,background:m.bg,color:m.text,cursor:"pointer"}}>
      {T.col[current].label}<ChevronDown size={10}/></button>
    {open&&<div style={{position:"absolute",top:"100%",left:0,marginTop:4,background:T.canvasSoft,
      border:`1px solid ${T.hairlineSoft}`,borderRadius:T.rMd,
      boxShadow:"0 8px 24px rgba(0,0,0,0.4)",zIndex:100,minWidth:140,overflow:"hidden"}}>
      {STATUSES.map(s=>(<button key={s} onClick={()=>{onChange(s);setOpen(false)}} style={{
        display:"block",width:"100%",textAlign:"left",padding:"8px 12px",border:"none",
        cursor:"pointer",fontFamily:FONT_MONO,fontSize:11,
        fontWeight:s===current?500:400,
        background:s===current?T.graphite:"transparent",color:T.col[s].text}}
        onMouseEnter={e=>e.target.style.background=T.graphite}
        onMouseLeave={e=>e.target.style.background=s===current?T.graphite:"transparent"}>
        {T.col[s].label}</button>))}
    </div>}
  </div>);
}

/* ═══════════════════════════════════════════════════════════════════
   CHECK-OFF SHEET
   ═══════════════════════════════════════════════════════════════════ */
function CheckOffSheet({finding,onKeep,onRemove,onMarkBoard,onClose}){
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",
    alignItems:"center",justifyContent:"center",zIndex:500}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:T.canvasSoft,
      border:`1px solid ${T.success}`,borderRadius:T.rMkt,padding:28,maxWidth:380,width:"100%",
      boxShadow:`0 0 48px rgba(55,205,132,0.2), 0 16px 48px rgba(0,0,0,0.5)`}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
        <CheckCircle size={22} style={{color:T.success}}/>
        <h3 style={{fontFamily:FONT_SANS,fontSize:18,fontWeight:400,color:T.onPrimary,
          margin:0,letterSpacing:"-0.2px"}}>{finding.id} verified on site</h3>
      </div>
      <p style={{fontFamily:FONT_SANS,fontSize:13,color:T.ash,margin:"0 0 22px",lineHeight:1.5}}>{finding.q}</p>
      <Eyebrow style={{display:"block",marginBottom:12}}>What would you like to do?</Eyebrow>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        <button onClick={onMarkBoard} style={{padding:"10px 16px",fontFamily:FONT_SANS,fontSize:13,
          fontWeight:500,borderRadius:T.rFull,border:`1px solid ${T.success}`,
          background:"rgba(55,205,132,0.1)",color:T.success,cursor:"pointer",
          display:"flex",alignItems:"center",gap:8}}>
          <Check size={14}/>Mark as resolved on board</button>
        <button onClick={onKeep} style={{padding:"10px 16px",fontFamily:FONT_SANS,fontSize:13,
          fontWeight:400,borderRadius:T.rFull,border:`1px solid ${T.hairlineSoft}`,
          background:"transparent",color:T.ash,cursor:"pointer",
          display:"flex",alignItems:"center",gap:8}}>
          <Bookmark size={14}/>Keep on board as-is</button>
        <button onClick={onRemove} style={{padding:"10px 16px",fontFamily:FONT_SANS,fontSize:13,
          fontWeight:400,borderRadius:T.rFull,border:`1px solid ${T.hairlineSoft}`,
          background:"transparent",color:T.mute,cursor:"pointer",
          display:"flex",alignItems:"center",gap:8}}>
          <Trash2 size={14}/>Remove from board</button>
      </div>
    </div>
  </div>);
}

/* ═══════════════════════════════════════════════════════════════════
   BOOKMARK MODAL
   ═══════════════════════════════════════════════════════════════════ */
function BookmarkModal({onAdd,onClose,customCats}){
  const [cat,setCat]=useState("Concern");
  const [label,setLabel]=useState("");
  const [newCat,setNewCat]=useState("");
  const [addingCat,setAddingCat]=useState(false);
  const allCats=[...BM_CATS,...(customCats||[])];
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",display:"flex",
    alignItems:"center",justifyContent:"center",zIndex:500}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:T.canvasSoft,
      border:`1px solid ${T.hairlineSoft}`,borderRadius:T.rMkt,padding:24,maxWidth:340,width:"100%",
      boxShadow:"0 16px 48px rgba(0,0,0,0.5)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div>
          <Eyebrow style={{display:"block",marginBottom:4}}>New bookmark</Eyebrow>
          <h3 style={{fontFamily:FONT_SANS,fontSize:16,fontWeight:400,color:T.onPrimary,margin:0}}>Add to findings list</h3>
        </div>
        <button onClick={onClose} style={{background:"none",border:`1px solid ${T.hairlineSoft}`,
          borderRadius:T.rSm,padding:5,cursor:"pointer",color:T.mute,display:"flex"}}>
          <X size={14}/></button>
      </div>
      <div style={{marginBottom:14}}>
        <Eyebrow style={{display:"block",marginBottom:8}}>Category</Eyebrow>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
          {allCats.map(c=>{
            const col=T.bm[c]?.color||T.ash;
            const active=cat===c;
            return(<button key={c} onClick={()=>setCat(c)} style={{fontFamily:FONT_MONO,fontSize:10,
              padding:"4px 10px",borderRadius:T.rFull,cursor:"pointer",
              border:`1px solid ${active?col:T.hairlineSoft}`,
              background:active?`${col}22`:"transparent",color:active?col:T.ash}}>{c}</button>);
          })}
          {!addingCat&&<button onClick={()=>setAddingCat(true)} style={{fontFamily:FONT_MONO,fontSize:10,
            padding:"4px 10px",borderRadius:T.rFull,cursor:"pointer",
            border:`1px dashed ${T.hairlineSoft}`,background:"transparent",color:T.mute}}>
            + custom</button>}
        </div>
        {addingCat&&<div style={{display:"flex",gap:6}}>
          <input value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="Category name" autoFocus
            style={{flex:1,padding:"5px 8px",fontFamily:FONT_SANS,fontSize:12,borderRadius:T.rMd,
              border:`1px solid ${T.hairlineSoft}`,background:T.canvas,color:T.onPrimary,outline:"none"}}
            onKeyDown={e=>{if(e.key==="Enter"&&newCat.trim()){setCat(newCat.trim());setAddingCat(false);}}}/>
          <button onClick={()=>{if(newCat.trim()){setCat(newCat.trim());setAddingCat(false);}}}
            style={{padding:"5px 10px",fontFamily:FONT_SANS,fontSize:12,borderRadius:T.rMd,
              border:"none",background:T.brand,color:T.ink,cursor:"pointer",fontWeight:500}}>Add</button>
        </div>}
      </div>
      <div style={{marginBottom:20}}>
        <Eyebrow style={{display:"block",marginBottom:8}}>Label</Eyebrow>
        <input value={label} onChange={e=>setLabel(e.target.value)}
          placeholder="e.g. Potential activation zone..."
          style={{width:"100%",padding:"8px 10px",fontFamily:FONT_SANS,fontSize:13,borderRadius:T.rMd,
            border:`1px solid ${T.hairlineSoft}`,background:T.canvas,color:T.onPrimary,
            outline:"none",boxSizing:"border-box"}}
          onKeyDown={e=>{if(e.key==="Enter"&&label.trim())onAdd({cat,label:label.trim(),id:"b"+Date.now()});}}/>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button onClick={onClose} style={{padding:"7px 16px",fontFamily:FONT_SANS,fontSize:13,
          borderRadius:T.rFull,border:`1px solid ${T.hairlineSoft}`,background:"transparent",
          color:T.ash,cursor:"pointer"}}>Cancel</button>
        <button onClick={()=>{if(label.trim())onAdd({cat,label:label.trim(),id:"b"+Date.now()});}}
          style={{padding:"7px 16px",fontFamily:FONT_SANS,fontSize:13,fontWeight:500,
            borderRadius:T.rFull,border:"none",background:T.brand,color:T.ink,cursor:"pointer"}}>
          Add bookmark</button>
      </div>
    </div>
  </div>);
}

/* ═══════════════════════════════════════════════════════════════════
   FINDINGS LIST VIEW (replaces SVG map for real sites)
   ═══════════════════════════════════════════════════════════════════ */
function FindingsList({findings,objs,onSelect,onCheck,onUncheck,sceneSummary,limitations,confetti}){
  const verified=findings.filter(f=>f.checked).length;
  return(
    <div>
      {/* Scene summary */}
      {sceneSummary&&(
        <div style={{background:T.canvasSoft,border:`1px solid ${T.hairlineSoft}`,
          borderRadius:T.rMkt,padding:20,marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <Zap size={15} style={{color:T.brand}}/>
            <Eyebrow style={{color:T.brand}}>Site context — AI reasoning</Eyebrow>
          </div>
          <p style={{fontFamily:FONT_SANS,fontSize:13,color:T.ash,margin:0,lineHeight:1.6}}>{sceneSummary}</p>
          {limitations&&<p style={{fontFamily:FONT_MONO,fontSize:10,color:T.mute,margin:"10px 0 0",
            lineHeight:1.5,padding:"8px 10px",background:T.canvas,borderRadius:T.rMd,
            borderLeft:`2px solid ${T.graphite}`}}>⚠ {limitations}</p>}
        </div>
      )}

      {/* Progress bar */}
      <div style={{background:T.canvasSoft,border:`1px solid ${T.hairlineSoft}`,
        borderRadius:T.rMkt,padding:"12px 16px",marginBottom:16,
        display:"flex",alignItems:"center",gap:12}}>
        <div style={{flex:1,height:4,background:T.graphite,borderRadius:2,overflow:"hidden"}}>
          <div style={{height:"100%",background:T.success,borderRadius:2,
            width:`${findings.length>0?(verified/findings.length)*100:0}%`,
            transition:"width 0.5s ease"}}/>
        </div>
        <span style={{fontFamily:FONT_MONO,fontSize:11,color:T.success,flexShrink:0}}>
          {verified} / {findings.length} verified
        </span>
      </div>

      {/* Findings cards — grouped by status */}
      {STATUSES.map(status=>{
        const group=findings.filter(f=>f.status===status);
        if(!group.length)return null;
        const m=T.col[status];
        return(
          <div key={status} style={{marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,
              paddingBottom:6,borderBottom:`1px solid ${m.border}`}}>
              <span style={{fontFamily:FONT_SANS,fontSize:12,fontWeight:500,color:m.border}}>{m.label}</span>
              <span style={{fontFamily:FONT_MONO,fontSize:10,color:m.text,
                background:m.bg,border:`1px solid ${m.border}`,
                borderRadius:"50%",width:18,height:18,display:"flex",
                alignItems:"center",justifyContent:"center"}}>{group.length}</span>
            </div>
            {group.map(f=>{
              const fo=objs.filter(o=>f.objs.includes(o.id));
              return(
                <div key={f.id} style={{background:T.canvasSoft,
                  border:`1px solid ${f.checked?T.successDark:T.hairlineSoft}`,
                  borderLeft:`2px solid ${f.checked?T.success:m.border}`,
                  borderRadius:`0 ${T.rLg} ${T.rLg} 0`,
                  padding:"12px 14px",marginBottom:6,
                  opacity:f.checked?0.65:1,
                  transition:"all 0.3s ease"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontFamily:FONT_MONO,fontSize:11,fontWeight:500,
                        color:f.checked?T.success:m.border}}>{f.id}</span>
                      <CatTag c={f.cat}/>
                      {f.checked&&<span style={{fontFamily:FONT_MONO,fontSize:9,color:T.success,
                        padding:"1px 6px",borderRadius:T.rFull,border:`1px solid ${T.success}`,
                        display:"flex",alignItems:"center",gap:3}}><Check size={9}/>Verified</span>}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <ConfBadge l={f.conf}/>
                      {!f.checked
                        ?<button onClick={()=>{
                            const btn=document.getElementById(`chk-${f.id}`);
                            const rect=btn?.getBoundingClientRect();
                            if(rect)confetti.fire(rect.left+rect.width/2,rect.top+rect.height/2);
                            onCheck(f);
                          }} id={`chk-${f.id}`}
                          style={{background:"none",border:`1px solid ${T.success}`,borderRadius:T.rFull,
                            padding:"3px 10px",cursor:"pointer",display:"flex",alignItems:"center",
                            gap:4,fontFamily:FONT_MONO,fontSize:9,color:T.success}}
                          title="Mark as verified on site">
                          <Check size={10}/>Verify</button>
                        :<button onClick={()=>onUncheck(f.id)}
                          style={{background:"none",border:`1px solid ${T.hairlineSoft}`,borderRadius:T.rFull,
                            padding:"3px 10px",cursor:"pointer",fontFamily:FONT_MONO,fontSize:9,color:T.mute}}>
                          ↩ Unresolve</button>}
                    </div>
                  </div>
                  <p style={{fontFamily:FONT_SANS,fontSize:13,fontWeight:500,
                    color:f.checked?T.mute:T.onPrimary,margin:"0 0 5px",lineHeight:1.4,
                    textDecoration:f.checked?"line-through":"none"}}>{f.q}</p>
                  <p style={{fontFamily:FONT_SANS,fontSize:12,color:T.mute,margin:"0 0 6px",lineHeight:1.4}}>{f.ev}</p>
                  {f.imp&&<div style={{fontSize:12,padding:"6px 10px",background:T.canvas,
                    borderRadius:T.rMd,color:T.ash,lineHeight:1.4,borderLeft:`2px solid ${T.brand}`,
                    fontFamily:FONT_SANS,marginBottom:6}}>
                    <span style={{fontFamily:FONT_MONO,fontSize:9,color:T.brand,marginRight:6}}>IMPLICATION</span>
                    {f.imp}</div>}
                  {f.res&&<div style={{fontSize:12,padding:"6px 10px",background:T.col.resolved.bg,
                    borderRadius:T.rMd,color:T.col.resolved.text,lineHeight:1.4,
                    fontFamily:FONT_SANS,marginBottom:6}}>
                    <span style={{fontWeight:500}}>Resolution — </span>{f.res}</div>}
                  {f.dr&&<div style={{fontSize:12,padding:"6px 10px",background:T.col.designed.bg,
                    borderRadius:T.rMd,color:T.col.designed.text,lineHeight:1.4,fontFamily:FONT_SANS,marginBottom:6}}>
                    <span style={{fontWeight:500}}>Design response — </span>{f.dr}</div>}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:6,marginTop:6}}>
                    <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                      {fo.map(o=><ObjTag key={o.id} name={o.short}/>)}
                    </div>
                    <button onClick={()=>onSelect(f)} style={{background:"none",border:`1px solid ${T.hairlineSoft}`,
                      borderRadius:T.rSm,padding:"3px 8px",cursor:"pointer",display:"flex",
                      alignItems:"center",gap:4,fontFamily:FONT_MONO,fontSize:9,color:T.mute}}>
                      <Pencil size={10}/>Edit</button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   FINDING CARD (board view)
   ═══════════════════════════════════════════════════════════════════ */
function FCard({f,objs,onStatus,onEdit,onDragStart,checkFlash,onUncheck}){
  const m=T.col[f.status];
  const fo=objs.filter(o=>f.objs.includes(o.id));
  const [showImp,setShowImp]=useState(false);
  const isFlash=checkFlash===f.id;
  return(<div draggable onDragStart={e=>onDragStart(e,f.id)}
    style={{background:isFlash?"rgba(55,205,132,0.08)":f.checked?"rgba(55,205,132,0.03)":T.canvasSoft,
      border:`1px solid ${isFlash?T.success:f.checked?T.successDark:T.hairlineSoft}`,
      borderLeft:`2px solid ${f.checked?T.success:m.border}`,
      borderRadius:`0 ${T.rLg} ${T.rLg} 0`,padding:"12px 14px",marginBottom:6,
      cursor:"grab",transition:"all 0.4s ease",opacity:f.checked?0.65:1,
      boxShadow:isFlash?`0 0 24px rgba(55,205,132,0.25)`:"none"}}
    onMouseEnter={e=>{if(!f.checked&&!isFlash){e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.4)";}}}
    onMouseLeave={e=>{e.currentTarget.style.boxShadow=isFlash?`0 0 24px rgba(55,205,132,0.25)`:"none";}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7}}>
      <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
        <GripVertical size={13} style={{color:T.mute,flexShrink:0}}/>
        <span style={{fontFamily:FONT_MONO,fontSize:11,fontWeight:500,color:f.checked?T.success:m.border}}>{f.id}</span>
        <CatTag c={f.cat}/>
        {f.checked&&<span style={{fontFamily:FONT_MONO,fontSize:9,color:T.success,
          padding:"1px 6px",borderRadius:T.rFull,border:`1px solid ${T.success}`,
          display:"flex",alignItems:"center",gap:3}}><Check size={9}/>Verified</span>}
      </div>
      <ConfBadge l={f.conf}/>
    </div>
    <p style={{fontFamily:FONT_SANS,fontSize:13,fontWeight:400,
      color:f.checked?T.mute:T.onPrimary,margin:"0 0 5px",lineHeight:1.45,
      textDecoration:f.checked?"line-through":"none"}}>{f.q}</p>
    <p style={{fontFamily:FONT_SANS,fontSize:12,color:T.mute,margin:"0 0 6px",lineHeight:1.4}}>{f.ev}</p>
    {f.imp&&<div style={{marginBottom:8}}>
      <button onClick={e=>{e.stopPropagation();setShowImp(!showImp)}} style={{display:"flex",
        alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",
        padding:"2px 0",fontFamily:FONT_MONO,fontSize:10,color:T.brand}}>
        {showImp?<ChevronDown size={11}/>:<ChevronRight size={11}/>}Brief implication</button>
      {showImp&&<div style={{fontFamily:FONT_SANS,fontSize:12,padding:"6px 10px",marginTop:4,
        background:T.canvas,borderRadius:T.rMd,color:T.ash,lineHeight:1.4,
        borderLeft:`2px solid ${T.brand}`}}>{f.imp}</div>}
    </div>}
    {f.res&&<div style={{fontFamily:FONT_SANS,fontSize:12,padding:"6px 10px",marginBottom:8,
      background:T.col.resolved.bg,borderRadius:T.rMd,color:T.col.resolved.text,lineHeight:1.4,
      borderLeft:`2px solid ${T.col.resolved.border}`}}>
      <span style={{fontWeight:500}}>Resolution — </span>{f.res}</div>}
    {f.dr&&<div style={{fontFamily:FONT_SANS,fontSize:12,padding:"6px 10px",marginBottom:8,
      background:T.col.designed.bg,borderRadius:T.rMd,color:T.col.designed.text,lineHeight:1.4,
      borderLeft:`2px solid ${T.col.designed.border}`}}>
      <span style={{fontWeight:500}}>Design response — </span>{f.dr}</div>}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:6,marginTop:4}}>
      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
        {fo.map(o=><ObjTag key={o.id} name={o.short}/>)}
        {fo.length===0&&<span style={{fontFamily:FONT_MONO,fontSize:10,color:T.mute,fontStyle:"italic"}}>No objectives tagged</span>}
      </div>
      <div style={{display:"flex",gap:4,alignItems:"center"}}>
        {f.checked&&<button onClick={()=>onUncheck(f.id)} style={{background:"none",
          border:`1px solid ${T.hairlineSoft}`,borderRadius:T.rSm,padding:"3px 7px",
          cursor:"pointer",display:"flex",alignItems:"center",gap:4,
          fontFamily:FONT_MONO,fontSize:9,color:T.mute}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=T.ash;e.currentTarget.style.color=T.ash;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=T.hairlineSoft;e.currentTarget.style.color=T.mute;}}>
          ↩ Unresolve</button>}
        <button onClick={()=>onEdit(f)} style={{background:"none",border:`1px solid ${T.hairlineSoft}`,
          borderRadius:T.rSm,padding:"3px 6px",cursor:"pointer",display:"flex",alignItems:"center",color:T.mute}}>
          <Pencil size={11}/></button>
        <StatusDrop current={f.status} onChange={s=>onStatus(f.id,s)}/>
      </div>
    </div>
  </div>);
}

/* ═══════════════════════════════════════════════════════════════════
   EDIT MODAL
   ═══════════════════════════════════════════════════════════════════ */
function EditModal({f:init,objs,onSave,onClose,isNew}){
  const [f,setF]=useState({...init});
  const fs={width:"100%",padding:"8px 10px",fontSize:13,fontFamily:FONT_SANS,
    border:`1px solid ${T.hairlineSoft}`,borderRadius:T.rMd,
    background:T.canvas,color:T.onPrimary,resize:"vertical",boxSizing:"border-box",outline:"none"};
  const ls={fontFamily:FONT_MONO,fontSize:11,color:T.mute,marginBottom:5,display:"block",
    textTransform:"uppercase",letterSpacing:"0.07em"};
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.78)",display:"flex",
    alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:T.canvasSoft,
      border:`1px solid ${T.hairlineSoft}`,borderRadius:T.rMkt,padding:28,width:"100%",
      maxWidth:560,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 16px 48px rgba(0,0,0,0.5)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
        <div>
          <Eyebrow>{isNew?"New finding":"Edit finding"}</Eyebrow>
          <h2 style={{fontFamily:FONT_SANS,fontSize:22,fontWeight:400,color:T.onPrimary,
            margin:"4px 0 0",letterSpacing:"-0.3px"}}>{isNew?"Add to board":init.id}</h2>
        </div>
        <button onClick={onClose} style={{background:"none",border:`1px solid ${T.hairlineSoft}`,
          borderRadius:T.rSm,padding:6,cursor:"pointer",color:T.mute,display:"flex"}}>
          <X size={16}/></button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div><label style={ls}>Category</label>
          <input style={fs} value={f.cat} onChange={e=>setF({...f,cat:e.target.value})} placeholder="e.g. Movement, Drainage..."/></div>
        <div><label style={ls}>Evidence</label>
          <textarea style={{...fs,minHeight:60}} value={f.ev} onChange={e=>setF({...f,ev:e.target.value})}/></div>
        <div><label style={ls}>Investigation question</label>
          <textarea style={{...fs,minHeight:60}} value={f.q} onChange={e=>setF({...f,q:e.target.value})}/></div>
        <div><label style={ls}>Brief implication</label>
          <textarea style={{...fs,minHeight:60}} value={f.imp} onChange={e=>setF({...f,imp:e.target.value})}/></div>
        <div><label style={ls}>Confidence</label>
          <select style={{...fs,cursor:"pointer"}} value={f.conf} onChange={e=>setF({...f,conf:e.target.value})}>
            <option>High</option><option>Medium</option><option>Low</option></select></div>
        <div><label style={ls}>Brief objectives</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {objs.map(o=>{const a=f.objs.includes(o.id);return(
              <button key={o.id} onClick={()=>setF({...f,objs:a?f.objs.filter(x=>x!==o.id):[...f.objs,o.id]})}
                style={{fontFamily:FONT_MONO,fontSize:10,padding:"4px 10px",borderRadius:T.rFull,
                  cursor:"pointer",border:`1px solid ${a?T.brand:T.hairlineSoft}`,
                  background:a?"rgba(243,100,88,0.1)":"transparent",
                  color:a?T.brand:T.ash}}>{o.short}</button>)})}</div></div>
        <div><label style={ls}>Resolution notes</label>
          <textarea style={{...fs,minHeight:50}} value={f.res} onChange={e=>setF({...f,res:e.target.value})} placeholder="What was confirmed or ruled out..."/></div>
        <div><label style={ls}>Design response</label>
          <textarea style={{...fs,minHeight:50}} value={f.dr} onChange={e=>setF({...f,dr:e.target.value})} placeholder="What design move addresses this..."/></div>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:22}}>
        <button onClick={onClose} style={{padding:"8px 18px",fontFamily:FONT_SANS,fontSize:13,
          fontWeight:500,borderRadius:T.rFull,border:`1px solid ${T.hairlineSoft}`,
          background:"transparent",cursor:"pointer",color:T.ash}}>Cancel</button>
        <button onClick={()=>{onSave(f);onClose()}} style={{padding:"8px 20px",fontFamily:FONT_SANS,
          fontSize:13,fontWeight:500,borderRadius:T.rFull,border:"none",
          background:T.brand,color:T.ink,cursor:"pointer"}}>
          {isNew?"Add to board":"Save changes"}</button>
      </div>
    </div>
  </div>);
}

/* ═══════════════════════════════════════════════════════════════════
   KANBAN COLUMN
   ═══════════════════════════════════════════════════════════════════ */
function KCol({status,findings,objs,onStatus,onEdit,onDrop,checkFlash,onUncheck}){
  const m=T.col[status];const [dOver,setDOver]=useState(false);
  return(<div onDragOver={e=>{e.preventDefault();setDOver(true)}} onDragLeave={()=>setDOver(false)}
    onDrop={e=>{e.preventDefault();setDOver(false);onDrop(e,status)}}
    style={{flex:1,minWidth:0,background:dOver?"rgba(255,255,255,0.02)":"transparent",
      borderRadius:T.rLg,padding:"0 4px",transition:"background 0.15s",
      border:dOver?`1px dashed ${m.border}`:"1px solid transparent"}}>
    <div style={{display:"flex",alignItems:"center",gap:8,
      padding:"10px 10px 8px",borderBottom:`1px solid ${m.border}`,marginBottom:10}}>
      <span style={{fontFamily:FONT_SANS,fontSize:13,fontWeight:500,color:m.border}}>{m.label}</span>
      <span style={{fontFamily:FONT_MONO,fontSize:10,fontWeight:500,width:18,height:18,
        borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
        background:m.bg,color:m.text,border:`1px solid ${m.border}`}}>{findings.length}</span>
    </div>
    <div style={{minHeight:60}}>
      {findings.map(f=><FCard key={f.id} f={f} objs={objs} onStatus={onStatus} onEdit={onEdit}
        checkFlash={checkFlash} onUncheck={onUncheck} onDragStart={(e,id)=>e.dataTransfer.setData("text/plain",id)}/>)}
      {findings.length===0&&<div style={{padding:"20px 10px",textAlign:"center",
        fontFamily:FONT_MONO,fontSize:10,color:T.mute,
        border:`1px dashed ${T.hairlineSoft}`,borderRadius:T.rMd}}>Drag findings here</div>}
    </div>
  </div>);
}

/* ═══════════════════════════════════════════════════════════════════
   COVERAGE VIEW
   ═══════════════════════════════════════════════════════════════════ */
function CoverageView({objs,findings}){
  return(<div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:20}}>
      {[{l:"Total findings",v:findings.length,i:<Layers size={15}/>},
        {l:"Unresolved",v:findings.filter(f=>f.status==="flagged"||f.status==="investigating").length,i:<AlertTriangle size={15}/>},
        {l:"Verified on site",v:findings.filter(f=>f.checked).length,i:<CheckCircle size={15}/>},
        {l:"Coverage",v:objs.filter(o=>findings.some(f=>f.objs.includes(o.id))).length+"/"+objs.length,i:<Target size={15}/>},
      ].map((s,i)=>(
        <div key={i} style={{background:T.canvasSoft,borderRadius:T.rLg,padding:"14px 16px",border:`1px solid ${T.hairlineSoft}`}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
            <span style={{color:T.mute}}>{s.i}</span><Eyebrow>{s.l}</Eyebrow>
          </div>
          <span style={{fontFamily:FONT_SANS,fontSize:24,fontWeight:300,color:T.onPrimary,letterSpacing:"-0.5px"}}>{s.v}</span>
        </div>
      ))}
    </div>
    <div style={{background:T.canvasSoft,border:`1px solid ${T.hairlineSoft}`,borderRadius:T.rLg,padding:22}}>
      <Eyebrow style={{display:"block",marginBottom:14}}>Brief objective coverage</Eyebrow>
      {objs.length===0&&<p style={{fontFamily:FONT_SANS,fontSize:13,color:T.mute,fontStyle:"italic"}}>No objectives defined yet.</p>}
      {objs.map(obj=>{
        const tg=findings.filter(f=>f.objs.includes(obj.id));
        const d=tg.filter(f=>f.status==="designed").length,rv=tg.filter(f=>f.status==="resolved").length,
          iv=tg.filter(f=>f.status==="investigating").length,fl=tg.filter(f=>f.status==="flagged").length,tot=tg.length;
        return(<div key={obj.id} style={{marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
            <span style={{fontFamily:FONT_SANS,fontSize:13,color:T.onPrimary}}>{obj.name}</span>
            <span style={{fontFamily:FONT_MONO,fontSize:11,color:T.mute}}>{tot} finding{tot!==1?"s":""}</span>
          </div>
          {tot===0
            ?<><div style={{height:6,borderRadius:3,background:T.canvas,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",inset:0,background:`repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(243,100,88,0.1) 4px,rgba(243,100,88,0.1) 8px)`}}/></div>
              <span style={{fontFamily:FONT_MONO,fontSize:10,color:T.brand,fontStyle:"italic",marginTop:3,display:"block"}}>Blind spot — no site evidence</span></>
            :<div style={{display:"flex",gap:2,height:6,borderRadius:3,overflow:"hidden"}}>
              {d>0&&<div style={{flex:d,background:T.col.designed.border}}/>}
              {rv>0&&<div style={{flex:rv,background:T.col.resolved.border}}/>}
              {iv>0&&<div style={{flex:iv,background:T.col.investigating.border}}/>}
              {fl>0&&<div style={{flex:fl,background:T.col.flagged.border}}/>}
            </div>}
        </div>);})}
      <div style={{display:"flex",gap:16,marginTop:14,paddingTop:14,borderTop:`1px solid ${T.hairlineSoft}`,flexWrap:"wrap"}}>
        {STATUSES.map(s=><div key={s} style={{display:"flex",alignItems:"center",gap:5}}>
          <span style={{width:8,height:8,borderRadius:2,background:T.col[s].border}}/>
          <Eyebrow>{T.col[s].label}</Eyebrow></div>)}
      </div>
    </div>
  </div>);
}

/* ═══════════════════════════════════════════════════════════════════
   BLIND SPOT VIEW
   ═══════════════════════════════════════════════════════════════════ */
function BlindSpotView({findings,objs}){
  const unresolved=findings.filter(f=>f.status==="flagged"||f.status==="investigating");
  const uncovered=objs.filter(o=>!findings.some(f=>f.objs.includes(o.id)));
  const designed=findings.filter(f=>f.status==="designed");
  return(<div>
    <div style={{background:T.canvasSoft,border:`1px solid ${T.hairlineSoft}`,borderRadius:T.rLg,padding:24,marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <Upload size={16} style={{color:T.brand}}/>
        <span style={{fontFamily:FONT_SANS,fontSize:15,fontWeight:500,color:T.onPrimary,letterSpacing:"-0.2px"}}>Upload final scheme</span>
      </div>
      <p style={{fontFamily:FONT_SANS,fontSize:13,color:T.ash,lineHeight:1.55,margin:"0 0 18px"}}>
        Upload your final massing diagram or site plan. The audit skill re-runs against original findings and flags any the design contradicts or leaves unaddressed.
      </p>
      <div style={{border:`1px dashed ${T.hairlineSoft}`,borderRadius:T.rMd,padding:"32px 24px",
        textAlign:"center",background:T.canvas,cursor:"pointer",transition:"border-color 0.15s"}}
        onMouseEnter={e=>e.currentTarget.style.borderColor=T.brand}
        onMouseLeave={e=>e.currentTarget.style.borderColor=T.hairlineSoft}>
        <Upload size={24} style={{color:T.mute,marginBottom:8}}/>
        <p style={{fontFamily:FONT_SANS,fontSize:13,fontWeight:500,color:T.onPrimary,margin:"0 0 4px"}}>Drop scheme here or click to browse</p>
        <Eyebrow>PNG, JPG, or PDF · max 10 MB</Eyebrow>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
      {[
        {title:`Unresolved (${unresolved.length})`,icon:<AlertTriangle size={14} style={{color:T.brand}}/>,col:T.brand,
         empty:"All findings resolved",items:unresolved.map(f=>({id:f.id,cat:f.cat,text:f.q,border:T.col[f.status].border}))},
        {title:`Uncovered (${uncovered.length})`,icon:<Eye size={14} style={{color:T.brand}}/>,col:T.brand,
         empty:"All objectives covered",items:uncovered.map(o=>({id:o.id,text:o.name,border:T.brand}))},
        {title:`Addressed (${designed.length})`,icon:<Check size={14} style={{color:T.col.designed.border}}/>,col:T.col.designed.border,
         empty:"No findings designed-for yet",items:designed.map(f=>({id:f.id,cat:f.cat,text:f.dr||"No response recorded yet",border:T.col.designed.border}))},
      ].map((panel,i)=>(
        <div key={i} style={{background:T.canvasSoft,border:`1px solid ${T.hairlineSoft}`,borderRadius:T.rLg,padding:18}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
            {panel.icon}<Eyebrow style={{color:panel.col}}>{panel.title}</Eyebrow>
          </div>
          {panel.items.map(item=>(<div key={item.id} style={{padding:"7px 10px",marginBottom:5,
            borderRadius:T.rMd,background:T.canvas,borderLeft:`2px solid ${item.border}`}}>
            {item.cat&&<div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
              <span style={{fontFamily:FONT_MONO,fontSize:10,fontWeight:500,color:item.border}}>{item.id}</span>
              <CatTag c={item.cat}/></div>}
            <p style={{fontFamily:FONT_SANS,fontSize:11,color:T.ash,margin:0,lineHeight:1.3}}>{item.text}</p>
          </div>))}
          {panel.items.length===0&&<p style={{fontFamily:FONT_MONO,fontSize:11,color:T.mute,fontStyle:"italic"}}>{panel.empty}</p>}
        </div>
      ))}
    </div>
  </div>);
}

/* ═══════════════════════════════════════════════════════════════════
   SIDEBAR
   ═══════════════════════════════════════════════════════════════════ */
function Sidebar({site,findings,objs,setObjs,fText,setFText,fCat,setFCat,
  fConf,setFConf,fObj,setFObj,cats,bookmarks,onGoHome,onRerunAudit}){
  const [addObj,setAddObj]=useState(false);
  const [nn,setNN]=useState("");const [ns,setNS]=useState("");
  const counts=STATUSES.reduce((a,s)=>({...a,[s]:findings.filter(f=>f.status===s).length}),{});
  const verified=findings.filter(f=>f.checked).length;
  const inp={width:"100%",padding:"6px 9px",fontSize:12,fontFamily:FONT_SANS,borderRadius:T.rMd,
    border:`1px solid ${T.hairlineSoft}`,background:T.canvas,color:T.onPrimary,boxSizing:"border-box",outline:"none"};
  return(<div style={{width:252,flexShrink:0,background:T.canvas,color:T.ash,
    height:"100vh",overflowY:"auto",display:"flex",flexDirection:"column",
    borderRight:`1px solid ${T.hairlineSoft}`}}>
    {/* Logo + home */}
    <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.hairlineSoft}`,
      display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{width:10,height:10,borderRadius:"50%",background:T.brand,flexShrink:0}}/>
        <span style={{fontFamily:FONT_SANS,fontSize:14,fontWeight:500,color:T.onPrimary,letterSpacing:"-0.2px"}}>Site Intelligence</span>
      </div>
      <button onClick={onGoHome} title="New audit"
        style={{background:"none",border:`1px solid ${T.hairlineSoft}`,borderRadius:T.rSm,
          padding:5,cursor:"pointer",color:T.mute,display:"flex",transition:"all 0.15s"}}
        onMouseEnter={e=>{e.currentTarget.style.borderColor=T.ash;e.currentTarget.style.color=T.onPrimary;}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor=T.hairlineSoft;e.currentTarget.style.color=T.mute;}}>
        <Home size={13}/></button>
    </div>
    {/* Site info */}
    <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.hairlineSoft}`}}>
      <Eyebrow style={{display:"block",marginBottom:8}}>Current site</Eyebrow>
      <p style={{fontFamily:FONT_SANS,fontSize:13,fontWeight:500,color:T.onPrimary,margin:"0 0 3px",letterSpacing:"-0.1px"}}>{site.name||site.address}</p>
      <p style={{fontFamily:FONT_MONO,fontSize:10,color:T.mute,margin:0,display:"flex",alignItems:"center",gap:4}}>
        <MapPin size={10}/>{site.address}</p>
      {site.brief&&<p style={{fontFamily:FONT_MONO,fontSize:10,color:T.brand,margin:"6px 0 0",display:"flex",alignItems:"center",gap:4}}>
        <FileText size={10}/>{site.brief}</p>}
      <button onClick={onRerunAudit}
        style={{marginTop:10,width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:5,
          padding:"6px 10px",fontFamily:FONT_MONO,fontSize:10,borderRadius:T.rFull,cursor:"pointer",
          border:`1px solid ${T.hairlineSoft}`,background:"transparent",color:T.brand,transition:"all 0.15s"}}
        onMouseEnter={e=>e.currentTarget.style.borderColor=T.brand}
        onMouseLeave={e=>e.currentTarget.style.borderColor=T.hairlineSoft}>
        <Loader size={10}/>Re-run audit</button>
    </div>
    {/* Verification progress */}
    <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.hairlineSoft}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
        <Eyebrow>Site verification</Eyebrow>
        <span style={{fontFamily:FONT_MONO,fontSize:11,
          color:verified===findings.length&&findings.length>0?T.success:T.mute}}>
          {verified}/{findings.length}</span>
      </div>
      <div style={{height:4,background:T.graphite,borderRadius:2,marginBottom:10}}>
        <div style={{height:"100%",background:T.success,borderRadius:2,
          width:`${findings.length>0?(verified/findings.length)*100:0}%`,
          transition:"width 0.5s ease"}}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
        {STATUSES.map(s=>(
          <div key={s} style={{padding:"8px 10px",borderRadius:T.rMd,background:T.canvasSoft,border:`1px solid ${T.hairlineSoft}`}}>
            <div style={{fontFamily:FONT_SANS,fontSize:20,fontWeight:300,color:T.col[s].border,letterSpacing:"-0.5px"}}>{counts[s]}</div>
            <Eyebrow style={{color:T.mute}}>{T.col[s].label}</Eyebrow>
          </div>))}
      </div>
    </div>
    {/* Bookmarks */}
    {bookmarks.length>0&&<div style={{padding:"14px 18px",borderBottom:`1px solid ${T.hairlineSoft}`}}>
      <Eyebrow style={{display:"block",marginBottom:8}}>Bookmarks ({bookmarks.length})</Eyebrow>
      {bookmarks.map(b=>{const col=T.bm[b.cat]?.color||T.ash;return(
        <div key={b.id} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0"}}>
          <span style={{width:6,height:6,flexShrink:0,borderLeft:"3px solid transparent",
            borderRight:"3px solid transparent",borderBottom:`6px solid ${col}`}}/>
          <span style={{fontFamily:FONT_SANS,fontSize:11,color:T.ash,flex:1,
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.label}</span>
          <span style={{fontFamily:FONT_MONO,fontSize:9,color:col,flexShrink:0}}>{b.cat}</span>
        </div>
      );})}
    </div>}
    {/* Objectives */}
    <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.hairlineSoft}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <Eyebrow>Brief objectives</Eyebrow>
        <button onClick={()=>setAddObj(!addObj)} style={{background:"none",border:"none",cursor:"pointer",color:T.brand,display:"flex",padding:2}}>
          <Plus size={13}/></button>
      </div>
      {objs.map(o=>(<div key={o.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"5px 8px",marginBottom:3,borderRadius:T.rMd,background:T.canvasSoft}}>
        <span style={{fontFamily:FONT_MONO,fontSize:10,color:T.ash}}>{o.short}</span>
        <button onClick={()=>setObjs(p=>p.filter(x=>x.id!==o.id))} style={{background:"none",border:"none",
          cursor:"pointer",color:T.mute,padding:2,display:"flex",opacity:0.5}}><X size={10}/></button>
      </div>))}
      {addObj&&<div style={{marginTop:7,display:"flex",flexDirection:"column",gap:5}}>
        <input value={nn} onChange={e=>setNN(e.target.value)} placeholder="Objective name" style={inp}
          onKeyDown={e=>{if(e.key==="Enter"&&nn.trim()){setObjs(p=>[...p,{id:"o"+Date.now(),name:nn.trim(),short:ns.trim()||nn.trim().substring(0,20)}]);setNN("");setNS("");setAddObj(false);}}}/>
        <input value={ns} onChange={e=>setNS(e.target.value)} placeholder="Short label" style={inp}/>
        <button onClick={()=>{if(nn.trim()){setObjs(p=>[...p,{id:"o"+Date.now(),name:nn.trim(),short:ns.trim()||nn.trim().substring(0,20)}]);setNN("");setNS("");setAddObj(false);}}}
          style={{fontFamily:FONT_SANS,fontSize:12,fontWeight:500,padding:"5px 10px",borderRadius:T.rFull,
            border:"none",background:T.brand,color:T.ink,cursor:"pointer"}}>Add</button>
      </div>}
    </div>
    {/* Filters */}
    <div style={{padding:"14px 18px",flex:1}}>
      <Eyebrow style={{display:"block",marginBottom:10}}>Filters</Eyebrow>
      <div style={{position:"relative",marginBottom:7}}>
        <Search size={12} style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:T.mute}}/>
        <input value={fText} onChange={e=>setFText(e.target.value)} placeholder="Search findings..." style={{...inp,paddingLeft:26}}/>
      </div>
      {[{v:fCat,set:setFCat,opts:[{v:"all",l:"All categories"},...cats.map(c=>({v:c,l:c}))]},
        {v:fConf,set:setFConf,opts:[{v:"all",l:"All confidence"},{v:"High",l:"High"},{v:"Medium",l:"Medium"},{v:"Low",l:"Low"}]},
        {v:fObj,set:setFObj,opts:[{v:"all",l:"All objectives"},...objs.map(o=>({v:o.id,l:o.short}))]},
      ].map((sel,i)=>(
        <select key={i} value={sel.v} onChange={e=>sel.set(e.target.value)}
          style={{...inp,marginBottom:6,cursor:"pointer"}}>
          {sel.opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      ))}
      {(fText||fCat!=="all"||fConf!=="all"||fObj!=="all")&&
        <button onClick={()=>{setFText("");setFCat("all");setFConf("all");setFObj("all")}}
          style={{fontFamily:FONT_MONO,fontSize:10,padding:"4px 10px",borderRadius:T.rFull,
            border:`1px solid ${T.hairlineSoft}`,cursor:"pointer",background:"transparent",
            color:T.brand,display:"flex",alignItems:"center",gap:4,width:"100%",justifyContent:"center",marginTop:4}}>
          <X size={10}/>Clear filters</button>}
    </div>
  </div>);
}

/* ═══════════════════════════════════════════════════════════════════
   LOADING SCREEN
   ═══════════════════════════════════════════════════════════════════ */
function LoadingScreen({address,brief,progress,step}){
  const stages=[
    {pct:10, label:"Connecting to Claude"},
    {pct:30, label:"Analysing site context"},
    {pct:55, label:"Cross-referencing conditions"},
    {pct:75, label:"Generating investigation questions"},
    {pct:92, label:"Populating board"},
  ];
  const currentStage=stages.reduce((a,s)=>progress>=s.pct?s:a,stages[0]);
  return(
    <div style={{minHeight:"100vh",background:T.canvas,display:"flex",alignItems:"center",
      justifyContent:"center",fontFamily:FONT_SANS,padding:24}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <div style={{maxWidth:480,width:"100%",textAlign:"center"}}>
        {/* Animated logo */}
        <div style={{width:48,height:48,borderRadius:12,background:T.brand,display:"flex",
          alignItems:"center",justifyContent:"center",margin:"0 auto 24px",
          animation:"pulse 1.5s ease-in-out infinite"}}>
          <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.8;transform:scale(0.96)}}`}</style>
          <Layers size={24} color="#0b0b0b"/>
        </div>
        <Eyebrow style={{color:T.brand,display:"block",marginBottom:12}}>Running site audit</Eyebrow>
        <h2 style={{fontFamily:FONT_SANS,fontSize:22,fontWeight:300,color:T.onPrimary,
          margin:"0 0 6px",letterSpacing:"-0.5px"}}>{address}</h2>
        <p style={{fontFamily:FONT_SANS,fontSize:13,color:T.mute,margin:"0 0 32px"}}>{brief}</p>
        {/* Progress bar */}
        <div style={{height:3,background:T.graphite,borderRadius:2,marginBottom:16,overflow:"hidden"}}>
          <div style={{height:"100%",background:T.brand,borderRadius:2,
            width:`${progress}%`,transition:"width 0.5s ease"}}/>
        </div>
        {/* Stage dots */}
        <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:20}}>
          {stages.map((s,i)=>(
            <div key={i} style={{width:6,height:6,borderRadius:"50%",
              background:progress>=s.pct?T.brand:T.graphite,
              transition:"background 0.3s ease"}}/>
          ))}
        </div>
        <p style={{fontFamily:FONT_MONO,fontSize:11,color:T.mute}}>{currentStage.label}…</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════════════════════════ */
function Landing({onStart}){
  const [addr,setAddr]=useState("");
  const [proj,setProj]=useState("");
  const [apiKey,setApiKey]=useState(()=>localStorage.getItem('anthropic_key')||'');
  const [hover,setHover]=useState(false);
  const [addrFocus,setAddrFocus]=useState(false);
  const [projFocus,setProjFocus]=useState(false);
  const canRun=addr.trim().length>5&&proj.trim().length>3&&apiKey.trim().length>10;

  const handleStart=()=>{
    if(canRun){
      localStorage.setItem('anthropic_key', apiKey.trim());
      onStart({addr:addr.trim(),proj:proj.trim(),apiKey:apiKey.trim()});
    }
  };

  return(<div style={{minHeight:"100vh",background:T.canvas,fontFamily:FONT_SANS,display:"flex",flexDirection:"column"}}>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet"/>
    <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",
      padding:"0 48px",height:56,borderBottom:`1px solid ${T.graphite}`,flexShrink:0}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{width:10,height:10,borderRadius:"50%",background:T.brand,flexShrink:0}}/>
        <span style={{fontFamily:FONT_SANS,fontSize:15,fontWeight:500,color:T.onPrimary,letterSpacing:"-0.2px"}}>Site Intelligence</span>
      </div>
      <Eyebrow style={{color:T.mute}}>Urban design · AI workflow</Eyebrow>
    </nav>
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"center",padding:"60px 48px 48px",maxWidth:760,margin:"0 auto",width:"100%"}}>
      <div style={{marginBottom:20,display:"flex",alignItems:"center",gap:10}}>
        <span style={{width:20,height:1,background:T.brand,display:"inline-block"}}/>
        <Eyebrow style={{color:T.brand}}>Pre-site investigation</Eyebrow>
      </div>
      <h1 style={{fontFamily:FONT_SANS,fontSize:56,fontWeight:300,color:T.onPrimary,
        margin:"0 0 20px",lineHeight:1.05,letterSpacing:"-2.5px",textAlign:"center"}}>
        Surface what the site<br/><span style={{color:T.brand}}>isn't</span> showing you.
      </h1>
      <p style={{fontFamily:FONT_SANS,fontSize:16,fontWeight:400,color:T.ash,
        lineHeight:1.6,margin:"0 0 40px",textAlign:"center",maxWidth:460,letterSpacing:"-0.1px"}}>
        Enter any site address and project brief. Claude will generate a structured set of site investigation findings — evidence, questions, and brief implications — ready to track on your board.
      </p>
      {/* Input card */}
      <div style={{width:"100%",maxWidth:500,background:T.canvasSoft,
        border:`1px solid ${T.hairlineSoft}`,borderRadius:T.rMkt,padding:28,
        boxShadow:"0 8px 32px rgba(0,0,0,0.3)"}}>
        <div style={{marginBottom:16}}>
          <label style={{fontFamily:FONT_MONO,fontSize:11,color:T.mute,marginBottom:7,
            display:"block",textTransform:"uppercase",letterSpacing:"0.07em"}}>Site address</label>
          <div style={{display:"flex",alignItems:"center",gap:8,background:T.canvas,
            border:`1px solid ${addrFocus?T.brand:T.hairlineSoft}`,borderRadius:T.rMd,
            padding:"0 12px",height:44,transition:"border-color 0.15s"}}>
            <MapPin size={14} style={{color:T.mute,flexShrink:0}}/>
            <input value={addr} onChange={e=>setAddr(e.target.value)}
              onFocus={()=>setAddrFocus(true)} onBlur={()=>setAddrFocus(false)}
              placeholder="e.g. 123 George St, Sydney NSW 2000"
              onKeyDown={e=>e.key==="Enter"&&handleStart()}
              style={{flex:1,fontSize:14,border:"none",background:"transparent",
                color:T.onPrimary,outline:"none",fontFamily:FONT_SANS}}/>
          </div>
        </div>
        <div style={{marginBottom:16}}>
          <label style={{fontFamily:FONT_MONO,fontSize:11,color:T.mute,marginBottom:7,
            display:"block",textTransform:"uppercase",letterSpacing:"0.07em"}}>Project brief</label>
          <input value={proj} onChange={e=>setProj(e.target.value)}
            onFocus={()=>setProjFocus(true)} onBlur={()=>setProjFocus(false)}
            placeholder="e.g. Mixed-use precinct open space upgrade"
            onKeyDown={e=>e.key==="Enter"&&handleStart()}
            style={{width:"100%",padding:"0 12px",height:44,fontSize:14,
              border:`1px solid ${projFocus?T.brand:T.hairlineSoft}`,borderRadius:T.rMd,
              background:T.canvas,color:T.onPrimary,outline:"none",
              fontFamily:FONT_SANS,boxSizing:"border-box",transition:"border-color 0.15s"}}/>
        </div>
        <div style={{marginBottom:24,paddingTop:16,borderTop:`1px solid ${T.hairlineSoft}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
            <label style={{fontFamily:FONT_MONO,fontSize:11,color:T.mute,
              textTransform:"uppercase",letterSpacing:"0.07em"}}>Anthropic API key</label>
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer"
              style={{fontFamily:FONT_MONO,fontSize:10,color:T.brand,textDecoration:"none"}}>
              Get key ↗
            </a>
          </div>
          <input value={apiKey} onChange={e=>setApiKey(e.target.value)}
            placeholder="sk-ant-..." type="password"
            onKeyDown={e=>e.key==="Enter"&&handleStart()}
            style={{width:"100%",padding:"0 12px",height:44,fontSize:14,
              border:`1px solid ${T.hairlineSoft}`,borderRadius:T.rMd,
              background:T.canvas,color:T.onPrimary,outline:"none",
              fontFamily:FONT_SANS,boxSizing:"border-box"}}/>
          <p style={{fontFamily:FONT_MONO,fontSize:10,color:T.mute,margin:"6px 0 0"}}>
            Saved in your browser only · sent directly to Anthropic
          </p>
        </div>
        <button onClick={handleStart}
          disabled={!canRun}
          onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
          style={{width:"100%",height:48,fontSize:15,fontWeight:500,fontFamily:FONT_SANS,
            borderRadius:T.rFull,border:"none",
            background:canRun?(hover?T.brandDeep:T.brand):T.graphite,
            color:canRun?T.ink:T.mute,cursor:canRun?"pointer":"default",
            display:"flex",alignItems:"center",justifyContent:"center",gap:8,
            letterSpacing:"-0.1px",transition:"background 0.15s"}}>
          {canRun?"Launch audit →":"Enter address and brief to continue"}
        </button>
      </div>
      <p style={{fontFamily:FONT_MONO,fontSize:11,color:T.mute,marginTop:20,textAlign:"center"}}>
        Powered by Claude Sonnet · Text-based site reasoning · No imagery required
      </p>
    </div>
    {/* Bottom strip */}
    <div style={{background:"#111111",borderTop:`1px solid ${T.graphite}`,
      padding:"16px 48px",display:"flex",gap:40,justifyContent:"center"}}>
      {[{label:"Generates",desc:"6–8 site investigation findings"},
        {label:"Evidence-based",desc:"grounded in site context + brief"},
        {label:"Board-ready",desc:"tracks through to design response"},
      ].map((item,i)=>(<div key={i} style={{textAlign:"center"}}>
        <Eyebrow style={{color:T.graphite,display:"block",marginBottom:3}}>{item.label}</Eyebrow>
        <span style={{fontFamily:FONT_SANS,fontSize:12,color:T.mute}}>{item.desc}</span>
      </div>))}
    </div>
  </div>);
}

/* ═══════════════════════════════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════════════════════════════ */
function Dashboard({site,auditResult,onGoHome,onRerunAudit}){
  const [findings,setFindings]=useState(auditResult.findings||[]);
  const [objs,setObjs]=useState(auditResult.objectives||[]);
  const [bookmarks,setBookmarks]=useState([]);
  const [customBmCats,setCustomBmCats]=useState([]);
  const [view,setView]=useState("list");
  const [editing,setEditing]=useState(null);
  const [showAdd,setShowAdd]=useState(false);
  const [showBm,setShowBm]=useState(false);
  const [fText,setFText]=useState("");
  const [fCat,setFCat]=useState("all");
  const [fConf,setFConf]=useState("all");
  const [fObj,setFObj]=useState("all");
  const [checkSheet,setCheckSheet]=useState(null);
  const [checkFlash,setCheckFlash]=useState(null);
  const confetti=useConfetti();

  const cats=[...new Set(findings.map(f=>f.cat))].sort();
  const filtered=findings.filter(f=>{
    if(fText&&!(`${f.id} ${f.q} ${f.ev} ${f.cat}`).toLowerCase().includes(fText.toLowerCase()))return false;
    if(fCat!=="all"&&f.cat!==fCat)return false;
    if(fConf!=="all"&&f.conf!==fConf)return false;
    if(fObj!=="all"&&!f.objs.includes(fObj))return false;
    return true;
  });

  const onStatus=useCallback((id,s)=>setFindings(p=>p.map(f=>f.id===id?{...f,status:s}:f)),[]);
  const onDrop=useCallback((e,s)=>{const id=e.dataTransfer.getData("text/plain");if(id)onStatus(id,s);},[onStatus]);
  const onSave=useCallback(ed=>setFindings(p=>p.map(f=>f.id===ed.id?ed:f)),[]);
  const handleCheck=useCallback((finding)=>{
    setFindings(p=>p.map(f=>f.id===finding.id?{...f,checked:true}:f));
    setCheckFlash(finding.id);
    setTimeout(()=>setCheckFlash(null),1400);
    setCheckSheet(finding);
  },[]);
  const handleUncheck=useCallback((id)=>{
    setFindings(p=>p.map(f=>f.id===id?{...f,checked:false}:f));
  },[]);
  const handleAddBookmark=useCallback((bm)=>{
    if(!BM_CATS.includes(bm.cat)&&!customBmCats.includes(bm.cat))
      setCustomBmCats(p=>[...p,bm.cat]);
    setBookmarks(p=>[...p,bm]);
    setShowBm(false);
  },[customBmCats]);

  const views=[
    {k:"list",  l:"Findings",  i:<List size={13}/>},
    {k:"board", l:"Board",     i:<Layout size={13}/>},
    {k:"coverage",l:"Coverage",i:<BarChart3 size={13}/>},
    {k:"blindspot",l:"Blind spots",i:<Eye size={13}/>},
  ];

  return(<div style={{display:"flex",height:"100vh",fontFamily:FONT_SANS,color:T.onPrimary,fontSize:14,background:T.canvas}}>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet"/>
    <ConfettiLayer particles={confetti.particles}/>

    <Sidebar site={site} findings={findings} objs={objs} setObjs={setObjs}
      fText={fText} setFText={setFText} fCat={fCat} setFCat={setFCat}
      fConf={fConf} setFConf={setFConf} fObj={fObj} setFObj={setFObj}
      cats={cats} bookmarks={bookmarks} onGoHome={onGoHome} onRerunAudit={onRerunAudit}/>

    <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,background:T.canvas}}>
      {/* Top nav */}
      <div style={{background:T.canvas,borderBottom:`1px solid ${T.hairlineSoft}`,
        padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",height:48,flexShrink:0}}>
        <div style={{display:"flex",gap:0}}>
          {views.map(v=>(<button key={v.k} onClick={()=>setView(v.k)} style={{display:"flex",alignItems:"center",gap:5,
            padding:"6px 14px",fontFamily:FONT_SANS,fontSize:13,
            fontWeight:view===v.k?500:400,border:"none",cursor:"pointer",
            borderBottom:view===v.k?`1px solid ${T.brand}`:"1px solid transparent",
            background:"transparent",color:view===v.k?T.onPrimary:T.mute,
            marginBottom:-1,transition:"color 0.15s"}}>{v.i}{v.l}</button>))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <button onClick={()=>setShowBm(true)} style={{display:"flex",alignItems:"center",gap:5,
            padding:"5px 12px",fontFamily:FONT_MONO,fontSize:10,borderRadius:T.rFull,cursor:"pointer",
            border:`1px solid ${T.hairlineSoft}`,background:"transparent",color:T.mute,transition:"all 0.15s"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=T.ash}
            onMouseLeave={e=>e.currentTarget.style.borderColor=T.hairlineSoft}>
            <Bookmark size={11}/>Add bookmark</button>
          <button onClick={()=>setShowAdd(true)} style={{display:"flex",alignItems:"center",gap:5,
            padding:"5px 14px",fontFamily:FONT_SANS,fontSize:12,fontWeight:500,
            borderRadius:T.rFull,border:"none",background:T.brand,color:T.ink,cursor:"pointer"}}
            onMouseEnter={e=>e.currentTarget.style.background=T.brandDeep}
            onMouseLeave={e=>e.currentTarget.style.background=T.brand}>
            <Plus size={13}/>Add finding</button>
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:"auto",padding:16}}>
        {view==="list"&&<FindingsList findings={filtered} objs={objs}
          onSelect={f=>setEditing(f)} onCheck={handleCheck} onUncheck={handleUncheck}
          sceneSummary={auditResult.sceneSummary} limitations={auditResult.limitations}
          confetti={confetti}/>}
        {view==="board"&&<div style={{display:"flex",gap:10,overflowX:"auto"}}>
          {STATUSES.map(s=><KCol key={s} status={s} findings={filtered.filter(f=>f.status===s)}
            objs={objs} onStatus={onStatus} onEdit={setEditing} onDrop={onDrop}
            checkFlash={checkFlash} onUncheck={handleUncheck}/>)}</div>}
        {view==="coverage"&&<CoverageView objs={objs} findings={findings}/>}
        {view==="blindspot"&&<BlindSpotView findings={findings} objs={objs}/>}
      </div>
    </div>

    {editing&&<EditModal f={editing} objs={objs} onSave={onSave} onClose={()=>setEditing(null)}/>}
    {showAdd&&<EditModal isNew f={{id:"F"+(findings.length+1),status:"flagged",cat:"",ev:"",q:"",imp:"",
      conf:"Medium",objs:[],res:"",dr:"",checked:false}} objs={objs}
      onSave={nf=>setFindings(p=>[...p,nf])} onClose={()=>setShowAdd(false)}/>}
    {showBm&&<BookmarkModal customCats={customBmCats} onAdd={handleAddBookmark} onClose={()=>setShowBm(false)}/>}
    {checkSheet&&<CheckOffSheet finding={checkSheet}
      onKeep={()=>setCheckSheet(null)}
      onRemove={()=>{setFindings(p=>p.filter(f=>f.id!==checkSheet.id));setCheckSheet(null);}}
      onMarkBoard={()=>{onStatus(checkSheet.id,"resolved");setCheckSheet(null);}}
      onClose={()=>setCheckSheet(null)}/>}
  </div>);
}

/* ═══════════════════════════════════════════════════════════════════
   APP ROOT
   ═══════════════════════════════════════════════════════════════════ */
export default function App(){
  const [phase,setPhase]=useState("landing"); // landing | loading | dashboard
  const [site,setSite]=useState(null);
  const [auditResult,setAuditResult]=useState(null);
  const [progress,setProgress]=useState(0);
  const [error,setError]=useState(null);

  const handleStart=async({addr,proj,apiKey})=>{
    setSite({address:addr,brief:proj,name:addr.split(",")[0],apiKey});
    setPhase("loading");
    setProgress(0);
    setError(null);
    try{
      const result=await runAudit(addr,proj,(msg,pct)=>setProgress(pct),apiKey);
      setAuditResult(result);
      setPhase("dashboard");
    }catch(err){
      setError(err.message||"Audit failed — please try again");
      setPhase("landing");
    }
  };

  const handleRerun=async()=>{
    if(!site)return;
    setPhase("loading");
    setProgress(0);
    try{
      const result=await runAudit(site.address,site.brief,(msg,pct)=>setProgress(pct),site.apiKey);
      setAuditResult(result);
      setPhase("dashboard");
    }catch(err){
      setError(err.message||"Audit failed");
      setPhase("dashboard");
    }
  };

  if(phase==="loading")
    return <LoadingScreen address={site?.address} brief={site?.brief} progress={progress}/>;
  if(phase==="dashboard"&&auditResult)
    return <Dashboard site={site} auditResult={auditResult}
      onGoHome={()=>setPhase("landing")}
      onRerunAudit={handleRerun}/>;
  return(
    <>
      {error&&<div style={{position:"fixed",top:0,left:0,right:0,zIndex:9999,
        background:"rgba(221,0,0,0.9)",padding:"12px 24px",
        fontFamily:FONT_MONO,fontSize:12,color:"#fff",textAlign:"center",
        display:"flex",alignItems:"center",justifyContent:"center",gap:12}}>
        ⚠ {error}
        <button onClick={()=>setError(null)} style={{background:"none",border:"1px solid rgba(255,255,255,0.4)",
          borderRadius:4,padding:"2px 8px",cursor:"pointer",color:"#fff",fontFamily:FONT_MONO,fontSize:11}}>
          Dismiss</button>
      </div>}
      <Landing onStart={handleStart}/>
    </>
  );
}
