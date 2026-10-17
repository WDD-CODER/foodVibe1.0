const I=(n,s=18,w=2)=>`<i data-lucide="${n}" style="width:${s}px;height:${s}px;stroke-width:${w}"></i>`;
const clone=o=>JSON.parse(JSON.stringify(o));
const DATA={
recipe:{name:'רוטב עגבניות קלאסי',base:10,unit:'ל׳',cost:236,
ing:[['עגבניות מרוסקות',2.5,'ק״ג',[['גרם',1000]]],['בצל קצוץ',.4,'ק״ג',[['גרם',1000]]],['שום',60,'גרם',[['ק״ג',.001]]],['שמן זית',120,'מ״ל',[['ל׳',.001],['כוס',1/240]]],['בזיליקום',40,'גרם',[]],['מלח',25,'גרם',[]]],
steps:[{t:'מרסקים את העגבניות ומסננים עודפי נוזלים'},{t:'מבשלים על להבה נמוכה עד להסמכה, מערבבים מדי כמה דקות',sec:720},{t:'מתבלים במלח ובזיליקום ומטעמים'},{t:'מצננים ומעבירים למכל סגור ומתויג'}]},
dish:{name:'פסטה פומודורו',base:12,unit:'מנות',cost:184,
ing:[['פסטה פנה',800,'גרם',[['ק״ג',.001]]],['רוטב עגבניות',1.2,'ל׳',[['מ״ל',1000]]],['בזיליקום קצוץ',30,'גרם',[]],['גבינת פרמזן מגורדת',150,'גרם',[]],['שמן זית',60,'מ״ל',[['ל׳',.001]]]]}
};
let D=clone(DATA.recipe);
const S=JSON.parse(localStorage.getItem('cvA2')||'null')||{dark:false};
Object.assign(S,{type:'recipe',mode:'view',draft:null,scaled:null,setBy:null,preview:null,empty:false,approved:true,rating:4,tab:S.tab||'steps',qty:S.qty||10,chk:S.chk||[0],done:S.done||[],act:S.act||0,rem:S.rem??720,unit:S.unit||{},run:false,fin:false,sw:0,swRun:false,menu:false,fab:false,toast:'',um:null});
const save=()=>localStorage.setItem('cvA2',JSON.stringify({dark:S.dark,tab:S.tab,qty:S.type==='recipe'?S.qty:10,chk:S.type==='recipe'?S.chk:[0],done:S.type==='recipe'?S.done:[],act:S.type==='recipe'?S.act:0,unit:S.type==='recipe'?S.unit:{}}));
S.T={};S.W={};const T=i=>S.T[i]||(S.T[i]={rem:(ST()[i]&&ST()[i].sec)||300,base:(ST()[i]&&ST()[i].sec)||300,run:false,fin:false}),W=i=>S.W[i]||(S.W[i]={t:0,run:false});
const pills=i=>{if(S.type==='dish')return '';const t=S.T[i],w=S.W[i];let h='';if(t&&(t.run||t.fin))h+=`<span class="tp ${t.fin?'al':''}">${I('timer',12)}<b class="num" data-tmp="${i}">${tm(t.rem)}</b></span>`;if(w&&(w.run||w.t>0))h+=`<span class="tp">${I('watch',12)}<b class="num" data-swp="${i}">${tm(w.t)}</b></span>`;return h};
const clocks=(i,s)=>{const t=S.T[i],w=S.W[i];let h='';
if(t)h+=`<div class="tm ${t.fin?'fin':''}">${S.te===i?`<input class="ti num" id="tin" data-i="${i}" value="${tm(t.rem)}" inputmode="numeric" aria-label="זמן בדקות או דק׳:שנ׳">`:`<b class="num ed" data-a="tedit" data-v="${i}" data-tm="${i}" role="button" tabindex="0" title="לחצו לשינוי הזמן">${tm(t.rem)}</b>`}<button class="g" data-a="reset" aria-label="אפס">${I('timer-reset',22)}</button><button data-a="toggle" aria-label="${t.run?'השהה':'התחל'}">${I(t.run?'pause':'play',22)}</button><button class="g x" data-a="rmt" aria-label="הסר טיימר">${I('x',18)}</button></div>`;
if(w)h+=`<div class="sw"><b class="num" data-sw="${i}">${tm(w.t)}</b><button data-a="swreset" aria-label="אפס סטופר">${I('rotate-ccw',18)}</button><button class="p" data-a="swtoggle" aria-label="${w.run?'השהה סטופר':'הפעל סטופר'}">${I(w.run?'pause':'play',20)}</button><button data-a="rmw" aria-label="הסר סטופר">${I('x',18)}</button></div>`;
return h};
const addBtns=(i,s)=>{const t=S.T[i],w=S.W[i];return(t&&w)?'':`<span class="addc">${t?'':`<button data-a="addt" data-v="${i}" aria-label="הוסף טיימר${s.sec?' '+Math.round(s.sec/60)+' ד׳':''}" title="טיימר${s.sec?' · '+Math.round(s.sec/60)+' ד׳':''}">${I('timer',20)}</button>`}${w?'':`<button data-a="addw" data-v="${i}" aria-label="הוסף סטופר" title="סטופר">${I('watch',20)}</button>`}</span>`};
const parseT=v=>{v=String(v).trim();const m=v.match(/^(\d+):(\d{1,2})$/);if(m)return+m[1]*60+Math.min(59,+m[2]);const n=parseFloat(v.replace(',','.'));return n>0?Math.round(n*60):null};
const fmt=n=>String(Math.round(n*100)/100);
const tm=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
const f=()=>S.qty/D.base;
const ST=()=>S.type==='dish'?D.ing.map(()=>({})):D.steps;
const unitOf=i=>S.unit[i]||D.ing[i][2];
const facOf=i=>{const u=unitOf(i);return u===D.ing[i][2]?1:(D.ing[i][3].find(a=>a[0]===u)||[0,1])[1]};
const amt=i=>D.ing[i][1]*f()*facOf(i);
const applyScale=(i,val)=>{const cur=D.ing[i][1]*facOf(i);if(!(val>0)||!(cur>0))return;S.qty=D.base*(val/cur);S.scaled={i}};
const stepOf=u=>['ק״ג','ל׳'].includes(u)?.1:['גרם','מ״ל'].includes(u)?10:1;
const stepText=(s,i)=>S.type==='dish'?`${fmt(amt(i))} ${unitOf(i)} ${D.ing[i][0]}`:s.t;
const stars=(n,live)=>Array.from({length:5},(_,i)=>{const s=`<span class="${i<n?'sf':''}" style="display:inline-flex;opacity:${i<n?1:.35}">${I('star',13)}</span>`;return live?`<button class="stb" data-a="rate" data-v="${i+1}" aria-label="דירוג ${i+1}">${s}</button>`:s}).join('');
function optsHtml(i){const r=D.ing[i],u=unitOf(i),opts=[[r[2],1],...r[3]];let h='';
if(r[3].length)h+=`<div class="oi">${opts.map(o=>`<button class="uo ${o[0]===u?'on':''}" data-a="unitset" data-v="${o[0]}" data-i="${i}"><span>${o[0]}</span><b class="num">${fmt(r[1]*f()*o[1])}</b>${o[0]===u?I('check',16,3):''}</button>`).join('')}</div>`;
if(S.setBy===i)h+=`<div class="sbf"><span class="sbl">${I('scale',16)}התאם את המתכון ל־</span><input class="ai num" id="sbamt" data-i="${i}" type="number" inputmode="decimal" step="any" min="0" value="${fmt(amt(i))}" aria-label="הכמות שיש לך"><span class="eu">${u}</span><button class="pill-btn p" data-a="sbgo" data-v="${i}">חשב מחדש</button><button class="pill-btn" data-a="sbno">ביטול</button><span class="sbp" id="sbpv">הכמות שיש לך של ${r[0]}. שאר המתכון יחושב לפיה.</span></div>`;
else h+=`<div class="sbr"><button class="sbtn" data-a="sbopen" data-v="${i}">${I('scale',16)}התאם את המתכון למצרך זה</button></div>`;
return h}
function rowHtml(r,i){const on=S.chk.includes(i),alt=r[3].length,u=unitOf(i);
return `<div class="ing ${on?'on':''} ${S.um===i?'open':''} ${S.scaled&&S.scaled.i===i?'pin':''}" data-a="chk" data-v="${i}" data-x="1" role="checkbox" tabindex="0" aria-checked="${on}"><div class="ing-main"><span class="ck">${on?I('check',18,3):''}</span><span class="nm">${r[0]}${S.scaled&&S.scaled.i===i?`<span class="pinb">${I('pin',12)}מצרך מקור</span>`:''}</span><span class="am num">${fmt(amt(i))}</span>${alt?`<button class="un-b" data-a="unitmenu" data-v="${i}" aria-label="שנה יחידה" aria-expanded="${S.um===i}">${u}${I('chevron-down',14,2.5)}</button><span class="un alt">${u}${I('arrow-left-right',13)}</span>`:`<span class="un">${u}</span>`}<button class="sb" data-a="unitmenu" data-v="${i}" aria-label="התאמת המתכון למצרך">${I('scale',16)}</button></div><div class="ing-opts" data-a="noop"><div>${optsHtml(i)}</div></div></div>`}
function ingEdit(){return `<div class="list">${S.draft.ing.map((r,i)=>`<div class="ied"><span class="nm">${r[0]}</span><span class="stp"><button data-a="eamt" data-i="${i}" data-d="-1" aria-label="הפחת">${I('minus',16)}</button><input class="ai num" type="number" step="any" min="0" value="${r[1]}" data-f="amt" data-i="${i}" aria-label="כמות"><button data-a="eamt" data-i="${i}" data-d="1" aria-label="הוסף">${I('plus',16)}</button></span><span class="eu">${r[2]}</span><button class="ib del" data-a="edel" data-i="${i}" aria-label="הסר">${I('trash-2',18)}</button></div>`).join('')}</div>`}
function ingredients(){if(S.mode==='edit')return ingEdit();
const sc=S.scaled?'':`<div class="sc">${[.5,1,2,3].map(m=>`<button class="ch num ${Math.abs(f()-m)<.001?'on':''}" data-a="mult" data-v="${m}"><span dir="ltr">×${m==.5?'½':m}</span></button>`).join('')}<span class="q"><button data-a="qty" data-v="-1" aria-label="הפחת">${I('minus',18)}</button><b class="num">${fmt(S.qty)}</b><button data-a="qty" data-v="1" aria-label="הוסף">${I('plus',18)}</button></span></div>`;
return sc+`<p class="uhint">לחיצה ארוכה על מצרך: יחידת מידה והתאמת המתכון</p><div class="list">${D.ing.map(rowHtml).join('')}</div>`}
function stepsEdit(){return `<div class="list">${S.draft.steps.map((s,i)=>`<div class="sed"><div class="sh"><span class="n">${i+1}</span><label class="mn">${I('timer',16)}<input class="mi2 num" type="number" min="0" value="${s.sec?Math.round(s.sec/60):0}" data-f="min" data-i="${i}" aria-label="דקות">ד׳</label><button class="ib del" data-a="estepdel" data-i="${i}" aria-label="מחק שלב">${I('trash-2',18)}</button></div><textarea class="ta" rows="2" data-f="txt" data-i="${i}">${s.t}</textarea></div>`).join('')}<button class="addb" data-a="estepadd">${I('plus',18)}הוסף שלב</button></div>`}
function steps(){if(S.mode==='edit'&&S.type==='recipe')return stepsEdit();
const L=ST(),dish=S.type==='dish';let h='<div class="list">';
L.forEach((s,i)=>{const tx=stepText(s,i);
if(S.done.includes(i))h+=`<button class="dn" data-a="undo" data-v="${i}" aria-label="חזרה לשלב ${i+1}"><span class="ok">${I('check',15,3)}</span><s>${tx}</s>${pills(i)}<span class="ib">${I('undo-2',18)}</span></button>`;
else if(i===S.act)h+=`<div class="act${S.pulse===i?' grow':''}"><div class="lab"><i></i>${dish?'פריט':'שלב'} ${i+1} · פעיל עכשיו${dish?'':addBtns(i,s)}</div><p>${dish?`<b class="big num">${fmt(amt(i))} ${unitOf(i)}</b><br>${D.ing[i][0]}`:tx}</p>${dish?'':clocks(i,s)}<button class="go" data-a="done" data-v="${i}">${I('check',22,3)}סיימתי</button></div>`;
else h+=`<button class="pd" data-a="jump" data-v="${i}"><span class="n">${i+1}</span><span class="t">${tx}</span>${pills(i)}${s.sec?`<em class="num">${I('timer',14)}${Math.round(s.sec/60)} ד׳</em>`:''}</button>`});
if(L.length&&S.done.length===L.length)h+=`<div class="fin-ban">${I('party-popper',26)}הבישול הושלם</div>`;
return h+'</div>'}
const KINDS=()=>[['info','מידע על המתכון'],['shop','רשימת קניות'],['steps',S.type==='dish'?'צ׳קליסט הכנה':'שלבי בישול']];
function menuHtml(x){const demo=[['recipe','מתכון'],['dish','מנה (מיז אן פלאס)'],['edit','מצב עריכה'],['scaled','מותאם למצרך'],['export','תצוגת ייצוא'],['empty','מצב ריק']];
return '<div class="menu">'+(x?'':'<button class="mi" data-a="edit"><span>עריכת מתכון</span>'+I('pencil',20)+'</button><div class="ms"></div>')+'<div class="mh">ייצוא</div>'+KINDS().map(k=>'<div class="mi"><span>'+k[1]+'</span><button class="ab" data-a="pv" data-v="'+k[0]+'" aria-label="צפייה">'+I('eye',18)+'</button><button class="ab" data-a="exp" data-v="הורדה: '+k[1]+'" aria-label="הורדה">'+I('download',18)+'</button></div>').join('')+'<div class="ms"></div><div class="mh">מצבי הדגמה</div>'+demo.map(d=>'<button class="mi d" data-a="demo" data-v="'+d[0]+'"><span>'+d[1]+'</span></button>').join('')+'</div>'}
function previewHtml(){const k=S.preview,title=KINDS().find(x=>x[0]===k)[1],L=ST();
const ingL=`<ul class="pl">${D.ing.map((r,i)=>`<li><span class="bx"></span><span>${r[0]}</span><b class="num">${fmt(amt(i))} ${unitOf(i)}</b></li>`).join('')}</ul>`;
const stL=`<ol class="pl n">${L.map((s,i)=>`<li><span>${stepText(s,i)}</span>${s.sec?`<b class="num">${Math.round(s.sec/60)} ד׳</b>`:''}</li>`).join('')}</ol>`;
const body=k==='shop'?ingL:k==='steps'?stL:`<h4>מצרכים</h4>${ingL}<h4>${S.type==='dish'?'פריטי הכנה':'שלבים'}</h4>${stL}`;
return `<div class="pv" data-a="pvclose"><div class="paper" data-a="noop"><div class="pvh"><h3>${title}</h3><span class="sp"></span><button class="pill-btn p" data-a="exp" data-v="הורדה: ${title}">${I('download',16)}ייצוא</button><button class="pill-btn" data-a="exp" data-v="הדפסה: ${title}">${I('printer',16)}הדפסה</button><button class="ib" data-a="pvclose" aria-label="סגירה">${I('x',20)}</button></div><div class="pvb"><h2 class="pt">${D.name}</h2><p class="ps">${fmt(S.qty)} ${D.unit} · ₪${Math.round(D.cost*f())}</p>${body}</div></div></div>`}
function render(){const y0=scrollY,dn=S.done.length,ic=S.chk.length,edit=S.mode==='edit',L=ST();document.documentElement.classList.toggle('dark',S.dark);
const shell=`<header class="shell-h"><div class="s"><span class="uc"><i>אכ</i><b class="un">אבי כהן</b></span></div><nav class="np" aria-label="ניווט ראשי"><a>דשבורד ${I('layout-dashboard',16)}</a><a>מלאי ${I('package',16)}</a><a class="on">ספר מתכונים ${I('book-open',16)}</a><a>ספריית תפריטים ${I('library',16)}</a></nav><div class="s e"><span class="bm">foodCo<i>fC</i></span></div></header><nav class="chips" aria-label="מסכי משנה"><a>${I('chef-hat',15)}בונה מתכונים</a><a class="on">${I('flame',15)}מצב בישול</a></nav>`;
const hd=`<div class="hd"><button class="ib" aria-label="חזרה">${I('arrow-right',22)}</button><h1>${S.empty?'מצב בישול':D.name}</h1><button class="ib" data-a="theme" aria-label="מצב מטבח כהה">${I(S.dark?'sun':'moon',20)}</button><span class="menu-wrap"><button class="ib ${S.menu?'on':''}" data-a="menu" aria-label="עוד">${I('ellipsis-vertical',22)}</button>${S.menu?menuHtml():''}</span></div>`;
const tabs=`<div class="tabbar"><span>${I('circle-user-round',22)}פרופיל</span><span>${I('layout-dashboard',22)}דשבורד</span><span>${I('package',22)}מלאי</span><span class="on">${I('book-open',22)}מתכונים</span><span>${I('library',22)}תפריטים</span></div>`;
const fab=`<div class="fab">${S.fab?'<span class="a">'+I('chef-hat',18)+'בונה מתכונים</span>':''}<button class="m ${S.fab?'on':''}" data-a="fab" aria-label="פעולות מהירות">${I('flame',26)}</button></div>`;
let main;
if(S.empty){main=`<main class="app"><div class="empty">${I('utensils',48)}<p>בחרו מתכון לבישול</p><button class="pill-btn p" data-a="demo" data-v="recipe">${I('book-open',16)}ספר המתכונים</button><div class="rc"><span>מתכונים אחרונים</span><button class="c" data-a="demo" data-v="recipe">רוטב עגבניות קלאסי</button><button class="c" data-a="demo" data-v="dish">פסטה פומודורו</button></div></div></main>`}
else{
const acts=edit?`<button class="ib" data-a="theme" aria-label="מצב מטבח כהה">${I(S.dark?'sun':'moon',20)}</button><button class="pill-btn p" data-a="esave">${I('save',16)}שמירה</button><button class="pill-btn" data-a="eundo">${I('rotate-ccw',16)}ביטול שינויים</button>`:`<button class="ib" data-a="theme" aria-label="מצב מטבח כהה">${I(S.dark?'sun':'moon',20)}</button><button class="pill-btn" data-a="edit">${I('pencil',16)}עריכה</button><span class="menu-wrap"><button class="pill-btn ${S.menu?'p':''}" data-a="menu">${I('download',16)}ייצוא${I('chevron-down',14)}</button>${S.menu?menuHtml(1):''}</span>`;
const bar=(a,b)=>`<span class="bar"><i style="width:${b?a/b*100:0}%"></i></span>`;
const stTitle=S.type==='dish'?'רשימת הכנה (מיז אן פלאס)':'שלבים',stShort=S.type==='dish'?'הכנה':'שלבים';
main=`<main class="app">${edit?`<div class="editban"><i></i>מצב עריכה</div>`:''}${S.scaled&&!edit?`<div class="scb"><span class="sbt">${I('scale',18)}המתכון חושב לפי <b>${D.ing[S.scaled.i][0]}</b>:</span><span class="stp"><button data-a="sstep" data-d="-1" aria-label="הפחת">${I('minus',16)}</button><input class="ai num" id="sbban" type="number" inputmode="decimal" step="any" min="0" value="${fmt(amt(S.scaled.i))}" aria-label="הכמות שיש לך"><button data-a="sstep" data-d="1" aria-label="הוסף">${I('plus',16)}</button></span><span class="eu">${unitOf(S.scaled.i)}</span><span class="sbr2 num">${fmt(S.qty)} ${D.unit}</span><button data-a="sreset">${I('rotate-ccw',16)}חזרה למתכון המלא</button></div>`:''}
<div class="ph"><button class="back" aria-label="חזרה לספר מתכונים">${I('arrow-right',20)}</button><div class="tt"><h1 class="big">${D.name}</h1><div class="meta"><button class="c ${S.approved?'':'w'}" data-a="stamp">${I(S.approved?'check':'clock',14,3)}${S.approved?'מאושר':'ממתין לאישור'}</button><span class="c num">₪${Math.round(D.cost*f())}</span><span class="c num">${fmt(S.qty)} ${D.unit}</span><span class="c w">${stars(S.rating,1)}</span></div></div><div class="acts">${acts}</div></div>
<div class="segw"><div class="seg"><button class="${S.tab==='steps'?'on':''}" data-a="tab" data-v="steps">${stShort}<em class="num">${dn}/${L.length}</em></button><button class="${S.tab==='ing'?'on':''}" data-a="tab" data-v="ing">מצרכים<em class="num">${ic}/${D.ing.length}</em></button></div></div>
<div class="panes"><section class="pane p-ing"><h2>${I('flask-conical',18)}מצרכים<em class="num">${ic}/${D.ing.length}</em>${ic===D.ing.length?`<span class="rdy">${I('check',13,3)}כל המצרכים מוכנים</span>`:''}</h2><div class="pbar"><i style="width:${ic/D.ing.length*100}%"></i></div><div class="inner">${ingredients()}</div></section><section class="pane p-st"><h2>${I('timer',18)}${stTitle}<em class="num">${dn}/${L.length}</em></h2><div class="pbar"><i style="width:${L.length?dn/L.length*100:0}%"></i></div><div class="inner">${steps()}</div></section></div></main>`}
document.getElementById('app').innerHTML=shell+hd+main+(S.menu?'<div class="scrim" data-a="menu"></div>':'')+(S.toast?'<div class="toast">'+S.toast+'</div>':'')+(edit?`<div class="editbar"><button class="pill-btn p" data-a="esave">${I('save',16)}שמירה</button><button class="pill-btn" data-a="eundo">${I('rotate-ccw',16)}ביטול שינויים</button></div>`:'')+(S.empty?'':`<button class="stamp${edit?' ed':''}" data-a="stamp" aria-label="${S.approved?'בטל אישור':'אשר מתכון'}"><img src="../assets/${S.approved?'stamp-approved':'stamp-not-approved'}.png" alt=""></button>`)+(edit?'':fab)+tabs+(S.preview?previewHtml():'');
lucide.createIcons();scrollTo(0,y0);spy();S.pulse=null;save()}
function toast(t){S.toast=t;render();setTimeout(()=>{S.toast='';render()},1600)}
function setAct(i){S.act=i}
function setType(t){D=clone(DATA[t]);S.type=t;S.T={};S.W={};S.chk=[0];S.done=[];S.unit={};S.qty=D.base;S.scaled=null;S.mode='view';S.draft=null;S.um=null;S.setBy=null;setAct(0)}
function enterEdit(){S.mode='edit';S.draft={ing:clone(D.ing),steps:clone(D.steps||[])};S.um=null;S.setBy=null}
function demo(v){S.menu=false;S.um=null;S.setBy=null;S.preview=null;S.empty=false;S.mode='view';S.draft=null;
if(v==='dish')setType('dish');else if(v!=='empty'&&(S.type!=='recipe'||v==='recipe'||v==='scaled'))setType('recipe');
if(v==='scaled'){S.qty=20;S.scaled={i:0}}
if(v==='edit')enterEdit();if(v==='export')S.preview='info';if(v==='empty')S.empty=true}
function go(v){const el=document.querySelector('.pane.'+(v==='ing'?'p-ing':'p-st'));if(!el)return;const off=parseFloat(getComputedStyle(el).scrollMarginTop)||0;window.scrollTo({top:el.getBoundingClientRect().top+scrollY-off+1,behavior:'smooth'})}
function spy(){if(innerWidth>=768)return;const ing=document.querySelector('.pane.p-ing');if(!ing)return;const off=parseFloat(getComputedStyle(ing).scrollMarginTop)||0;const end=scrollY+innerHeight>=document.documentElement.scrollHeight-2;const v=(ing.getBoundingClientRect().top<=off+40||end)?'ing':'steps';S.tab=v;document.querySelectorAll('.seg button').forEach(b=>b.classList.toggle('on',b.dataset.v===v))}
addEventListener('scroll',spy,{passive:true});
let skipClick=false,lp=null;
function syncOpen(){document.querySelectorAll('.ing').forEach(el=>{const o=+el.dataset.v===S.um;el.classList.toggle('open',o);const u=el.querySelector('.un-b');if(u)u.setAttribute('aria-expanded',o)})}
document.addEventListener('pointerdown',e=>{if(innerWidth>=768||S.mode==='edit')return;const r=e.target.closest('.ing[data-x]');if(!r||e.target.closest('.un-b')||e.target.closest('.ing-opts'))return;const sx=e.clientX,sy=e.clientY,i=+r.dataset.v;lp={sx,sy,t:setTimeout(()=>{skipClick=true;setTimeout(()=>skipClick=false,700);S.um=S.um===i?null:i;syncOpen();navigator.vibrate&&navigator.vibrate(12)},500)}});
document.addEventListener('pointermove',e=>{if(lp&&(Math.abs(e.clientX-lp.sx)>8||Math.abs(e.clientY-lp.sy)>8)){clearTimeout(lp.t);lp=null}});
['pointerup','pointercancel'].forEach(ev=>document.addEventListener(ev,()=>{if(lp){clearTimeout(lp.t);lp=null}}));
document.addEventListener('contextmenu',e=>{if(innerWidth<768&&e.target.closest('.ing'))e.preventDefault()});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('.ing')){e.preventDefault();e.target.click()}});
document.addEventListener('input',e=>{const t=e.target;if(t.id==='sbamt'){const i=+t.dataset.i,val=+t.value,cur=D.ing[i][1]*facOf(i),pv=document.getElementById('sbpv');if(pv)pv.textContent=val>0?`המתכון יחושב מחדש: ×${fmt(val/cur)} · ${fmt(D.base*val/cur)} ${D.unit}`:'הזינו כמות גדולה מאפס';return}const fl=t.dataset&&t.dataset.f;if(!fl||!S.draft)return;const i=+t.dataset.i;if(fl==='amt')S.draft.ing[i][1]=+t.value||0;else if(fl==='min')S.draft.steps[i].sec=(+t.value>0)?Math.round(+t.value*60):undefined;else if(fl==='txt')S.draft.steps[i].t=t.value});
document.addEventListener('change',e=>{if(e.target.id==='tin'){const t=S.T[+e.target.dataset.i],s=parseT(e.target.value);if(t&&s){t.rem=s;t.base=s;t.run=false;t.fin=false}S.te=null;render()}});
document.addEventListener('keydown',e=>{if(e.target.id==='tin'&&e.key==='Enter'){e.preventDefault();e.target.blur()}if(e.target.id==='tin'&&e.key==='Escape'){S.te=null;render()}if(e.target.dataset&&e.target.dataset.a==='tedit'&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.target.click()}});
document.addEventListener('focusout',e=>{if(e.target.id==='tin'&&S.te!=null){setTimeout(()=>{if(S.te!=null){S.te=null;render()}},0)}});
document.addEventListener('change',e=>{if(e.target.id==='sbban'&&S.scaled){applyScale(S.scaled.i,+e.target.value);render()}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='sbamt'){e.preventDefault();const b=document.querySelector('[data-a=sbgo]');b&&b.click()}if(e.key==='Enter'&&e.target.id==='sbban'){e.preventDefault();e.target.blur()}});
document.addEventListener('click',e=>{if(skipClick){skipClick=false;return}if(S.um!=null&&!e.target.closest('.ing.open')){S.um=null;S.setBy=null;syncOpen()}const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a,v=b.dataset.v,ix=+b.dataset.i;
if(a==='noop')return;
else if(a==='theme')S.dark=!S.dark;
else if(a==='menu')S.menu=!S.menu;
else if(a==='fab')S.fab=!S.fab;
else if(a==='tab'){go(v);return}
else if(a==='mult')S.qty=D.base*+v;
else if(a==='qty')S.qty=Math.max(1,S.qty+ +v);
else if(a==='chk'){const i=+v,k=S.chk.indexOf(i);k<0?S.chk.push(i):S.chk.splice(k,1)}
else if(a==='unitmenu'){S.um=S.um===+v?null:+v;S.setBy=null;syncOpen();return}
else if(a==='unitset'){S.unit[ix]=v;S.um=null}
else if(a==='sbopen'){S.setBy=+v;S.um=+v}
else if(a==='sbno'){S.setBy=null}
else if(a==='sbgo'){const i=+v,val=+document.getElementById('sbamt').value;if(!(val>0))return;applyScale(i,val);S.setBy=null;S.um=null}
else if(a==='sstep'){const i=S.scaled.i,st=stepOf(unitOf(i));applyScale(i,Math.max(st,Math.round((amt(i)+ +b.dataset.d*st)*1000)/1000))}
else if(a==='sreset'){S.qty=D.base;S.scaled=null}
else if(a==='swtoggle'){const w=W(S.act);w.run=!w.run}
else if(a==='swreset'){const w=W(S.act);w.t=0;w.run=false}
else if(a==='toggle'){const t=T(S.act);if(t.fin){t.fin=false;t.rem=t.base}else t.run=!t.run}
else if(a==='reset'){const t=T(S.act);t.rem=t.base;t.run=false;t.fin=false}
else if(a==='addt'){const t=T(+v);t.run=true}
else if(a==='addw'){W(+v).run=true}
else if(a==='rmt'){delete S.T[S.act]}
else if(a==='rmw'){delete S.W[S.act]}
else if(a==='tedit'){S.te=+v;render();const n=document.getElementById('tin');if(n){n.focus();n.select()}return}
else if(a==='jump'){setAct(+v);S.pulse=+v}
else if(a==='done'){const i=+v;if(!S.done.includes(i))S.done.push(i);const n=ST().findIndex((_,j)=>!S.done.includes(j));setAct(n<0?-1:n);S.pulse=n}
else if(a==='undo'){const i=+v;S.done=S.done.filter(x=>x!==i);setAct(i);S.pulse=i}
else if(a==='edit'){S.menu=false;enterEdit()}
else if(a==='esave'){D.ing=S.draft.ing;if(S.type==='recipe')D.steps=S.draft.steps;S.chk=S.chk.filter(i=>i<D.ing.length);S.done=S.done.filter(i=>i<ST().length);setAct(Math.min(S.act,ST().length-1));S.mode='view';S.draft=null;S.toast='השינויים נשמרו';setTimeout(()=>{S.toast='';render()},1600)}
else if(a==='eundo'){S.mode='view';S.draft=null;S.toast='השינויים בוטלו';setTimeout(()=>{S.toast='';render()},1600)}
else if(a==='eamt'){const r=S.draft.ing[ix],st=['ק״ג','ל׳'].includes(r[2])?.1:['גרם','מ״ל'].includes(r[2])?10:1;r[1]=Math.max(0,Math.round((r[1]+ +b.dataset.d*st)*1000)/1000)}
else if(a==='edel')S.draft.ing.splice(ix,1);
else if(a==='estepdel')S.draft.steps.splice(ix,1);
else if(a==='estepadd')S.draft.steps.push({t:'שלב חדש'});
else if(a==='rate')S.rating=+v;
else if(a==='stamp'){S.approved=!S.approved;S.toast=S.approved?'המתכון אושר':'האישור בוטל';setTimeout(()=>{S.toast='';render()},1600)}
else if(a==='pv'){S.menu=false;S.preview=v}
else if(a==='pvclose')S.preview=null;
else if(a==='demo'){demo(v)}
else if(a==='exp'){S.menu=false;return toast(v)}
render()});
setInterval(()=>{let re=false;for(const k in S.W){const w=S.W[k];if(!w.run)continue;w.t++;document.querySelectorAll('[data-sw="'+k+'"],[data-swp="'+k+'"]').forEach(n=>n.textContent=tm(w.t))}for(const k in S.T){const t=S.T[k];if(!t.run)continue;t.rem--;if(t.rem<=0){t.rem=0;t.run=false;t.fin=true;re=true}else document.querySelectorAll('[data-tm="'+k+'"],[data-tmp="'+k+'"]').forEach(n=>n.textContent=tm(t.rem))}if(re)render()},1000);
const hs=location.hash.slice(1);if(hs)demo(hs);
render();
