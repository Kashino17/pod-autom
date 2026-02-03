import{j as e,b as A,u as F,c as N}from"./vendor-query-CpRdniug.js";import{u as B,a as E}from"./index-CupJPaFk.js";import{r as g}from"./vendor-react-4xEIaAEA.js";import{u as O,a as M}from"./useShopify-BNCwXObD.js";import{D as v}from"./DashboardLayout-BZDTWsk4.js";import{L as w,W as _,S as P,V as I,l as R,x as V,Y as q,_ as U,k as $,$ as K,a0 as Q,s as W,a1 as G,a2 as H,a3 as Y}from"./vendor-ui-BMWb517o.js";import{a as b}from"./api-DNziMqA2.js";import"./vendor-supabase-DejIJ_qE.js";import"./vendor-charts-Cz_1NfFu.js";const j={image:`Create a modern, eye-catching print-on-demand design.

Style: Clean, minimalist, trendy
Colors: Vibrant, high contrast
Background: Transparent or solid color
Format: Suitable for t-shirts and hoodies

Niche: {{niche}}
Theme: {{theme}}

The design should appeal to {{niche}} enthusiasts and be instantly recognizable.`,title:`Create a catchy, SEO-optimized product title.

Requirements:
- Length: 50-70 characters
- Include main keyword: {{niche}}
- Product type: {{product_type}}
- Unique and appealing
- Avoid generic phrases like "Best" or "Amazing"

Format: [Adjective] [Niche-related word] [Product type] - [Unique selling point]`,description:`Write a compelling product description for {{niche}} enthusiasts.

Product: {{product_type}}
Design theme: {{theme}}

Structure:
1. Hook (1 sentence) - Grab attention
2. Benefits (2-3 bullet points) - Why they need it
3. Quality details - Premium materials, print quality
4. Call to action - Limited availability, order now

Tone: Enthusiastic but professional
Length: 100-150 words
Include relevant keywords naturally.`},J={image:{icon:e.jsx(Y,{className:"w-5 h-5"}),label:"Bild-Prompt",description:"Für die KI-Bildgenerierung (DALL-E / Midjourney)"},title:{icon:e.jsx(H,{className:"w-5 h-5"}),label:"Titel-Prompt",description:"Für SEO-optimierte Produkttitel"},description:{icon:e.jsx(G,{className:"w-5 h-5"}),label:"Beschreibungs-Prompt",description:"Für überzeugende Produktbeschreibungen"}},X=[{key:"{{niche}}",description:'Aktuelle Nische (z.B. "Fitness")'},{key:"{{theme}}",description:'Design-Thema (z.B. "Motivation")'},{key:"{{product_type}}",description:'Produkttyp (z.B. "T-Shirt")'},{key:"{{style}}",description:'Stil (z.B. "Minimalist")'},{key:"{{color}}",description:'Hauptfarbe (z.B. "Schwarz")'}];function Z({type:i,content:c,isEditing:a,isSaving:l,hasChanges:p,onEdit:u,onSave:d,onReset:o,onCancel:m}){const[t,n]=g.useState(c),[s,r]=g.useState(!1),[x,y]=g.useState(!1),f=J[i],z=async()=>{await navigator.clipboard.writeText(t),y(!0),setTimeout(()=>y(!1),2e3)},C=()=>{d(t)},k=()=>{n(j[i]),o()},D=()=>{n(c),m()},T=()=>t.replace(/\{\{niche\}\}/g,"Fitness").replace(/\{\{theme\}\}/g,"Motivation").replace(/\{\{product_type\}\}/g,"T-Shirt").replace(/\{\{style\}\}/g,"Minimalist").replace(/\{\{color\}\}/g,"Schwarz");return e.jsxs("div",{className:"bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden",children:[e.jsxs("div",{className:"flex items-center justify-between p-4 border-b border-zinc-800",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center text-violet-400",children:f.icon}),e.jsxs("div",{children:[e.jsx("h3",{className:"font-medium text-white",children:f.label}),e.jsx("p",{className:"text-xs text-zinc-500",children:f.description})]})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[p&&!a&&e.jsx("span",{className:"w-2 h-2 bg-amber-500 rounded-full"}),a?e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("button",{onClick:D,className:"btn-secondary text-sm",children:"Abbrechen"}),e.jsxs("button",{onClick:C,disabled:l,className:"btn-primary text-sm",children:[l?e.jsx(w,{className:"w-4 h-4 animate-spin mr-1"}):e.jsx(U,{className:"w-4 h-4 mr-1"}),"Speichern"]})]}):e.jsxs("button",{onClick:u,className:"btn-secondary text-sm",children:[e.jsx(q,{className:"w-4 h-4 mr-1"}),"Bearbeiten"]})]})]}),e.jsx("div",{className:"p-4",children:a?e.jsxs("div",{className:"space-y-4",children:[e.jsx("textarea",{value:t,onChange:L=>n(L.target.value),className:"input min-h-[200px] font-mono text-sm resize-none",placeholder:`${f.label} eingeben...`}),e.jsx("div",{className:"flex items-center justify-between",children:e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("button",{onClick:z,className:"btn-secondary text-sm",children:[x?e.jsx($,{className:"w-4 h-4 mr-1 text-emerald-400"}):e.jsx(K,{className:"w-4 h-4 mr-1"}),x?"Kopiert!":"Kopieren"]}),e.jsxs("button",{onClick:k,className:"btn-secondary text-sm",children:[e.jsx(Q,{className:"w-4 h-4 mr-1"}),"Standard"]}),e.jsxs("button",{onClick:()=>r(!s),className:"btn-secondary text-sm",children:[e.jsx(W,{className:"w-4 h-4 mr-1"}),"Vorschau"]})]})}),s&&e.jsxs("div",{className:"p-4 rounded-lg bg-zinc-800 border border-zinc-700",children:[e.jsxs("p",{className:"text-xs text-zinc-500 mb-2 flex items-center gap-1",children:[e.jsx(P,{className:"w-3 h-3"}),"Vorschau mit Beispielwerten"]}),e.jsx("pre",{className:"text-sm text-zinc-300 whitespace-pre-wrap font-mono",children:T()})]})]}):e.jsx("div",{className:"relative",children:e.jsx("pre",{className:"text-sm text-zinc-400 whitespace-pre-wrap font-mono bg-zinc-800/50 rounded-lg p-4 max-h-[150px] overflow-y-auto",children:c})})})]})}function ee({prompts:i,isLoading:c,onSave:a,onReset:l,isSaving:p=!1}){const[u,d]=g.useState(null),[o,m]=g.useState(!1),t=s=>i.find(x=>x.type===s)?.content||j[s],n=s=>{const r=i.find(x=>x.type===s);return r?r.content!==j[s]:!1};return c?e.jsx("div",{className:"flex items-center justify-center h-64",children:e.jsx(w,{className:"w-8 h-8 text-violet-500 animate-spin"})}):e.jsxs("div",{className:"space-y-6",children:[e.jsx("div",{className:"flex flex-col sm:flex-row sm:items-center justify-between gap-4",children:e.jsxs("div",{children:[e.jsxs("h2",{className:"text-xl font-bold text-white flex items-center gap-2",children:[e.jsx(_,{className:"w-5 h-5 text-violet-400"}),"KI-Prompts"]}),e.jsx("p",{className:"text-sm text-zinc-400 mt-1",children:"Passe die Prompts an, um die KI-generierten Inhalte zu steuern."})]})}),e.jsxs("div",{className:"bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden",children:[e.jsxs("button",{onClick:()=>m(!o),className:"w-full flex items-center justify-between p-4 text-left hover:bg-zinc-800/50 transition-colors",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center",children:e.jsx(P,{className:"w-4 h-4 text-violet-400"})}),e.jsxs("div",{children:[e.jsx("p",{className:"font-medium text-white",children:"Verfügbare Variablen"}),e.jsx("p",{className:"text-xs text-zinc-500",children:"Dynamische Platzhalter für deine Prompts"})]})]}),o?e.jsx(I,{className:"w-5 h-5 text-zinc-400"}):e.jsx(R,{className:"w-5 h-5 text-zinc-400"})]}),o&&e.jsx("div",{className:"p-4 pt-0 border-t border-zinc-800",children:e.jsx("div",{className:"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4",children:X.map(s=>e.jsxs("div",{className:"flex items-start gap-2 p-3 rounded-lg bg-zinc-800/50",children:[e.jsx("code",{className:"px-2 py-0.5 bg-violet-500/20 text-violet-300 rounded text-xs font-mono",children:s.key}),e.jsx("p",{className:"text-xs text-zinc-400 flex-1",children:s.description})]},s.key))})})]}),e.jsx("div",{className:"p-4 rounded-lg bg-amber-500/10 border border-amber-500/20",children:e.jsxs("div",{className:"flex gap-3",children:[e.jsx(V,{className:"w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5"}),e.jsxs("div",{children:[e.jsx("p",{className:"text-sm text-amber-300 font-medium",children:"Tipps für bessere Ergebnisse"}),e.jsxs("ul",{className:"mt-2 text-xs text-zinc-400 space-y-1",children:[e.jsx("li",{children:"• Sei spezifisch bei Stil, Format und gewünschtem Output"}),e.jsx("li",{children:"• Nutze Variablen für dynamische, nischenspezifische Inhalte"}),e.jsx("li",{children:"• Teste Änderungen zuerst mit einzelnen Produkten"})]})]})]})}),e.jsx("div",{className:"space-y-4",children:["image","title","description"].map(s=>e.jsx(Z,{type:s,content:t(s),isEditing:u===s,isSaving:p,hasChanges:n(s),onEdit:()=>d(s),onSave:r=>{a(s,r),d(null)},onReset:()=>l(s),onCancel:()=>d(null)},s))})]})}const h={image:`Create a modern, eye-catching print-on-demand design.

Style: Clean, minimalist, trendy
Colors: Vibrant, high contrast
Background: Transparent or solid color
Format: Suitable for t-shirts and hoodies

Niche: {{niche}}
Theme: {{theme}}

The design should appeal to {{niche}} enthusiasts and be instantly recognizable.`,title:`Create a catchy, SEO-optimized product title.

Requirements:
- Length: 50-70 characters
- Include main keyword: {{niche}}
- Product type: {{product_type}}
- Unique and appealing
- Avoid generic phrases like "Best" or "Amazing"

Format: [Adjective] [Niche-related word] [Product type] - [Unique selling point]`,description:`Write a compelling product description for {{niche}} enthusiasts.

Product: {{product_type}}
Design theme: {{theme}}

Structure:
1. Hook (1 sentence) - Grab attention
2. Benefits (2-3 bullet points) - Why they need it
3. Quality details - Premium materials, print quality
4. Call to action - Limited availability, order now

Tone: Enthusiastic but professional
Length: 100-150 words
Include relevant keywords naturally.`};function S(){return[{id:"1",type:"image",name:"Bild-Prompt",content:h.image,isDefault:!0,isActive:!0,usageCount:145,lastUsed:new Date(Date.now()-7200*1e3).toISOString(),createdAt:new Date(Date.now()-720*60*60*1e3).toISOString()},{id:"2",type:"title",name:"Titel-Prompt",content:h.title,isDefault:!0,isActive:!0,usageCount:145,lastUsed:new Date(Date.now()-7200*1e3).toISOString(),createdAt:new Date(Date.now()-720*60*60*1e3).toISOString()},{id:"3",type:"description",name:"Beschreibungs-Prompt",content:h.description,isDefault:!0,isActive:!0,usageCount:145,lastUsed:new Date(Date.now()-7200*1e3).toISOString(),createdAt:new Date(Date.now()-720*60*60*1e3).toISOString()}]}function te(i){const{session:c}=B(),a=E(t=>t.addToast),l=A(),{data:p,isLoading:u,error:d}=F({queryKey:["prompts",i],queryFn:async()=>{if(!i)return S();try{return(await b.get(`/api/pod-autom/prompts/${i}`)).prompts}catch{return S()}},enabled:!!c,staleTime:1e3*60*5}),o=N({mutationFn:async({type:t,content:n})=>{if(!i)return{type:t,content:n};const s=await b.put(`/api/pod-autom/prompts/${i}/${t}`,{prompt_text:n});if(!s.success)throw new Error(s.error||"Failed to save prompt");return{type:t,content:n}},onSuccess:({type:t,content:n})=>{l.setQueryData(["prompts",i],s=>s?.map(r=>r.type===t?{...r,content:n,isDefault:!1}:r)||[]),a({type:"success",title:"Prompt gespeichert",description:"Deine Änderungen wurden übernommen."})},onError:t=>{a({type:"error",title:"Fehler",description:t.message})}}),m=N({mutationFn:async t=>{if(!i)return{type:t,content:h[t]};const n=await b.put(`/api/pod-autom/prompts/${i}/${t}`,{prompt_text:h[t]});if(!n.success)throw new Error(n.error||"Failed to reset prompt");return{type:t,content:h[t]}},onSuccess:({type:t,content:n})=>{l.setQueryData(["prompts",i],s=>s?.map(r=>r.type===t?{...r,content:n,isDefault:!0}:r)||[]),a({type:"success",title:"Prompt zurückgesetzt",description:"Der Standard-Prompt wurde wiederhergestellt."})},onError:t=>{a({type:"error",title:"Fehler",description:t.message})}});return{prompts:p||[],isLoading:u,error:d,savePrompt:(t,n)=>o.mutate({type:t,content:n}),isSaving:o.isPending,resetPrompt:m.mutate,isResetting:m.isPending,defaultPrompts:h}}function me(){const{shops:i,isLoading:c}=O(),a=i[0]?.id||null,{settings:l,isLoading:p}=M(a),{prompts:u,isLoading:d,savePrompt:o,isSaving:m,resetPrompt:t}=te(l?.id||null),n=c||p||d;return n?e.jsx(v,{children:e.jsx("div",{className:"flex items-center justify-center h-64",children:e.jsx(w,{className:"w-8 h-8 text-violet-500 animate-spin"})})}):e.jsx(v,{children:e.jsx(ee,{prompts:u,isLoading:n,onSave:o,onReset:t,isSaving:m})})}export{me as default};
//# sourceMappingURL=DashboardPrompts-DXg_mfWz.js.map
