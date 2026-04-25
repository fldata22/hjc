/* global React */
const { Icon, TopBar, Phone } = window.MWShell;

// ─── DM.1 — Mission control (home) ───
const PaveDonut = ({size=160}) => {
  const cx=size/2, cy=size/2, r=size*0.34, sw=size*0.18;
  const segs = [['#EF9F27',1],['#639922',1],['#639922',1],['#639922',1],['#639922',1],['#EF9F27',1],['#E24B4A',1],['#639922',1],['#EF9F27',1],['#E24B4A',1],['#639922',1],['#639922',1],['#B4B2A9',1],['#B4B2A9',1]];
  const total = segs.length;
  const C = 2*Math.PI*r;
  const segLen = C/total;
  const gap = 2;
  let off = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${cx} ${cy})`} fill="none" strokeWidth={sw}>
        {segs.map(([color],i)=>{
          const dash = `${segLen-gap} ${C-(segLen-gap)}`;
          const dashoffset = -off; off += segLen;
          return <circle key={i} cx={cx} cy={cy} r={r} stroke={color} strokeDasharray={dash} strokeDashoffset={dashoffset}/>;
        })}
      </g>
      <text x={cx} y={cy-3} textAnchor="middle" dominantBaseline="central" fontSize={size*0.21} fontWeight="500" fill="currentColor">67%</text>
      <text x={cx} y={cy+size*0.13} textAnchor="middle" dominantBaseline="central" fontSize="10" fill="var(--text-secondary)">readiness</text>
    </svg>
  );
};

const DM1 = () => (
  <Phone active="home" top={<TopBar eyebrow="Lusaka 2026" title="Mission control"/>}>
    <div className="mw-stat danger" style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14}}>
      <div>
        <div className="lbl">Days to crusade</div>
        <div className="val" style={{fontSize:32}}>7</div>
        <div className="sub">Sat 02 May · 6:30pm</div>
      </div>
      <div style={{textAlign:'right'}}>
        <div className="mw-badge danger" style={{marginBottom:8}}><span className="mw-dot"/>4 risks</div>
        <div style={{fontSize:11, color:'var(--text-danger)'}}>day 58 of 90</div>
      </div>
    </div>

    <div className="mw-card" style={{display:'flex', alignItems:'center', gap:14, marginBottom:14}}>
      <PaveDonut size={130}/>
      <div className="mw-col" style={{gap:8, flex:1, fontSize:12}}>
        {[['Pastors',78,'#639922'],['Awareness',21,'#E24B4A'],['Volunteers',2,'#E24B4A'],['Donors',71,'#639922']].map((p,i)=>(
          <div key={i} className="mw-row mw-between">
            <div className="mw-row" style={{gap:6}}><span className="mw-dot" style={{color:p[2]}}/><span>{p[0]}</span></div>
            <span style={{color:'var(--text-secondary)'}}>{p[1]}%</span>
          </div>
        ))}
        <div style={{fontSize:11, color:'var(--text-info)', marginTop:2}}>+10 more powers →</div>
      </div>
    </div>

    <div className="mw-grid mw-g2" style={{marginBottom:6}}>
      <div className="mw-stat">
        <div className="lbl">Financial</div>
        <div className="val" style={{fontSize:18}}>$43.8k</div>
        <div className="mw-bar" style={{marginTop:6}}><div style={{width:'55%', background:'var(--text-success)'}}/></div>
        <div className="sub">of $80k target</div>
      </div>
      <div className="mw-stat">
        <div className="lbl">Pastors won</div>
        <div className="val" style={{fontSize:18}}>975</div>
        <div className="mw-bar" style={{marginTop:6}}><div style={{width:'90%', background:'var(--text-success)'}}/></div>
        <div className="sub">of 1,088 identified</div>
      </div>
      <div className="mw-stat warning">
        <div className="lbl">Convoy</div>
        <div className="val" style={{fontSize:18}}>12 / 24</div>
      </div>
      <div className="mw-stat warning">
        <div className="lbl">Conference</div>
        <div className="val" style={{fontSize:18}}>559 / 820</div>
      </div>
    </div>

    <div className="mw-section-title"><span>Top risks</span><a>See all 4</a></div>
    <div className="mw-rowlist">
      <div className="row">
        <div style={{flex:1}}>
          <div className="title">Worker groups at 2%</div>
          <div className="sub">Only 11 of 42 zones rehearsing</div>
        </div>
        <span className="mw-badge danger"><span className="mw-dot"/>Critical</span>
      </div>
      <div className="row">
        <div style={{flex:1}}>
          <div className="title">Awareness 21%</div>
          <div className="sub">Survey 6 · target 60% by now</div>
        </div>
        <span className="mw-badge danger"><span className="mw-dot"/>Critical</span>
      </div>
      <div className="row">
        <div style={{flex:1}}>
          <div className="title">Crusade permit pending</div>
          <div className="sub">Escalate to Bishop today</div>
        </div>
        <span className="mw-badge warning"><span className="mw-dot"/>High</span>
      </div>
    </div>

    <div className="mw-section-title"><span>Today's prompts</span></div>
    <div className="mw-rowlist">
      <div className="row">
        <div style={{width:32, height:32, borderRadius:8, background:'var(--bg-info)', color:'var(--text-info)', display:'flex', alignItems:'center', justifyContent:'center'}}><Icon name="check" size={16}/></div>
        <div style={{flex:1}}>
          <div className="title">Submit weekly assessment</div>
          <div className="sub">Due Sun 9pm · 6 of 14 powers reviewed</div>
        </div>
        <Icon name="chevron" size={16}/>
      </div>
      <div className="row">
        <div style={{width:32, height:32, borderRadius:8, background:'var(--bg-warning)', color:'var(--text-warning)', display:'flex', alignItems:'center', justifyContent:'center'}}><Icon name="phone" size={16}/></div>
        <div style={{flex:1}}>
          <div className="title">Call Bishop re: TV permit</div>
          <div className="sub">Last contact 8 days ago</div>
        </div>
        <Icon name="chevron" size={16}/>
      </div>
    </div>
  </Phone>
);

// ─── DM.2 — PAVEDDD powers list ───
const DM2 = () => {
  const powers = [
    ['Pastors',78,'success','976/1088 won'],
    ['Awareness',21,'danger','Survey 6 · 8 zones'],
    ['Volunteers',2,'danger','Worker groups · 11/42 zones'],
    ['Equipment',64,'warning','Convoy 12/24'],
    ['Events',38,'warning','Rehearsals · 4 of 7'],
    ['Decisions','—','muted','Tracked post-crusade'],
    ['Discipleship','—','muted','Tracked post-crusade'],
    ['Donors',71,'success','BOT pool $43.8k'],
    ['Drama',55,'warning','Counselling team training'],
    ['Diligence','—','muted','Tracked weekly'],
    ['Documentation',82,'success','Permits 2/3 cleared'],
    ['Direction',71,'success','Steering on track'],
    ['Days',7,'danger','to crusade open'],
    ['Driving force',88,'success','Bishop alignment strong'],
  ];
  const colorFor = c => c==='success'?'#639922':c==='warning'?'#EF9F27':c==='danger'?'#E24B4A':'#888780';
  return (
    <Phone active="powers" top={<TopBar eyebrow="Mission control" title="14 PAVEDDD powers"/>}>
      <div className="mw-filterbar" style={{padding:'0 0 12px', marginBottom:0}}>
        <div className="mw-chip active">All</div>
        <div className="mw-chip">Critical · 3</div>
        <div className="mw-chip">Watch · 4</div>
        <div className="mw-chip">On track · 5</div>
        <div className="mw-chip">Untracked</div>
      </div>
      <div className="mw-rowlist">
        {powers.map((p,i)=>(
          <div key={i} className="row">
            <div style={{width:6, height:36, borderRadius:3, background:colorFor(p[2]), flexShrink:0}}/>
            <div style={{flex:1}}>
              <div className="title">{p[0]}</div>
              <div className="sub">{p[3]}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:18, fontWeight:500, color:colorFor(p[2]), letterSpacing:'-0.01em'}}>{p[1]}{typeof p[1]==='number'?'%':''}</div>
              <Icon name="chevron" size={14}/>
            </div>
          </div>
        ))}
      </div>
    </Phone>
  );
};

// ─── DM.3 — Power drilldown (Awareness) ───
const DM3 = () => {
  const cls = v => v==null?'zero':v>=60?'high':v>=22?'mid':'low';
  const data = [
    ['Z01',[10,12,28,30,35,42]],
    ['Z02',[8,14,22,35,18,21]],
    ['Z03',[12,26,30,61,52,68]],
    ['Z04',[5,8,12,14,9,11]],
    ['Z05',[null,null,8,10,7,12]],
    ['Z06',[null,null,null,15,18,22]],
    ['Z07',[14,12,22,26,8,10]],
    ['Z08',[null,null,14,18,21,24]],
  ];
  return (
    <Phone active="powers" top={<TopBar back title="Awareness" eyebrow="Mission control / Powers" right={<button className="mw-iconbtn"><Icon name="more" size={20}/></button>}/>}>
      <div className="mw-card" style={{textAlign:'center', marginBottom:14, padding:'18px 14px'}}>
        <div style={{fontSize:42, fontWeight:500, color:'var(--text-danger)', letterSpacing:'-0.03em', lineHeight:1}}>21%</div>
        <div className="mw-row" style={{justifyContent:'center', gap:6, marginTop:8}}>
          <span className="mw-badge danger"><span className="mw-dot"/>Critical</span>
          <span className="mw-badge outline">target ≥ 60%</span>
        </div>
        <div style={{fontSize:12, color:'var(--text-secondary)', marginTop:8}}>"Yes and attending" share across 8 surveyed zones</div>
      </div>

      <div className="mw-card" style={{marginBottom:14}}>
        <div className="mw-eyebrow">Trajectory · 6 surveys</div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:8, height:110, alignItems:'end'}}>
          {[18,18,30,18,7,21].map((h,i)=>{
            const color = h>=22?(h>=60?'var(--text-success)':'var(--text-warning)'):'var(--text-danger)';
            return (
              <div key={i} style={{display:'flex', flexDirection:'column', alignItems:'center', gap:4, height:'100%'}}>
                <div style={{flex:1, display:'flex', flexDirection:'column', justifyContent:'flex-end', width:'100%'}}>
                  <div style={{fontSize:10, textAlign:'center', marginBottom:3, color:'var(--text-secondary)'}}>{h}%</div>
                  <div style={{height:`${h*2.5}%`, background:color, borderRadius:'3px 3px 0 0'}}/>
                </div>
                <div style={{fontSize:10, color:'var(--text-secondary)'}}>S{i+1}</div>
              </div>
            );
          })}
        </div>
        <div style={{fontSize:10, color:'var(--text-tertiary)', marginTop:8}}>Radio campaign launched after S5</div>
      </div>

      <div className="mw-section-title"><span>Per-zone breakdown · S6</span></div>
      <div className="mw-card" style={{padding:'10px 8px'}}>
        <div className="mw-matrix" style={{gridTemplateColumns:'42px repeat(6, 1fr)'}}>
          <div className="mw-mh left">Zone</div>
          {[1,2,3,4,5,6].map(n=> <div key={n} className="mw-mh">S{n}</div>)}
          {data.map(([z,row])=>(
            <React.Fragment key={z}>
              <div className="mw-row-label">{z}</div>
              {row.map((v,i)=> <div key={i} className={`mw-mc ${cls(v)}`}>{v==null?'—':`${v}%`}</div>)}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div style={{fontSize:11, color:'var(--text-tertiary)', margin:'10px 2px 14px'}}>8 of 42 zones surveyed · 34 pending</div>

      <button className="mw-btn primary full"><Icon name="plus" size={16}/> Log new survey</button>
    </Phone>
  );
};

// ─── DM.4 — Pastors list ───
const DM4 = () => {
  const Pipe = ({s}) => (
    <div style={{display:'flex', gap:3}}>
      {[0,1,2,3,4].map(i=>(
        <div key={i} style={{width:6, height:6, borderRadius:'50%', background:i<s?'#639922':i===s?'var(--text-info)':'var(--bg-tertiary)', border:i===s?'1px solid var(--text-info)':'1px solid var(--border-strong)'}}/>
      ))}
    </div>
  );
  const rows = [
    ['EM','Pastor Emmanuel Mwanza','Bread of Life · Z03',['PCM','BOT'],4,'2d'],
    ['DM','Bishop David Mulenga','Christ Embassy · Z01',['BOT chair'],4,'today'],
    ['MN','Pastor Mary Nkomo','Grace Assembly · Z03',['PCM','★'],4,'today'],
    ['JK','Rev. Joyce Kalonga','Faith Baptist · Z01',['PCM'],3,'5d'],
    ['ER','Pastor Esther Ranga','Hope Chapel · Z05',['PCM','BOT'],3,'8d'],
    ['PT','Pastor Peter Tembo','Living Water · Z04',['CPC'],2,'12d'],
    ['SC','Pastor Samuel Chanda','Cornerstone · Z02',['PCM'],1,'—'],
  ];
  return (
    <Phone active="pastors" top={<TopBar eyebrow="1,088 identified" title="Pastors"/>}>
      <div className="mw-search">
        <Icon name="search" size={15}/>
        <span>Search by name, church, phone…</span>
      </div>
      <div className="mw-filterbar" style={{padding:'0 0 12px'}}>
        <div className="mw-chip active">All</div>
        <div className="mw-chip">PCM</div>
        <div className="mw-chip">BOT</div>
        <div className="mw-chip">CPC</div>
        <div className="mw-chip">Champion</div>
        <div className="mw-chip">Zone <Icon name="chevron" size={10}/></div>
      </div>
      <div className="mw-rowlist">
        {rows.map((r,i)=>(
          <div key={i} className="row">
            <div className="mw-avatar">{r[0]}</div>
            <div style={{flex:1, minWidth:0}}>
              <div className="title" style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{r[1]}</div>
              <div className="sub">{r[2]}</div>
              <div style={{display:'flex', gap:6, marginTop:6, alignItems:'center'}}>
                {r[3].map(t=> <span key={t} className="mw-badge outline">{t}</span>)}
              </div>
            </div>
            <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6}}>
              <Pipe s={r[4]}/>
              <div style={{fontSize:11, color:'var(--text-tertiary)'}}>{r[5]}</div>
            </div>
          </div>
        ))}
      </div>
    </Phone>
  );
};

// ─── DM.5 — Pastor profile ───
const DM5 = () => {
  const stages = ['Identified','Engaged','Committed','Active','Champion'];
  return (
    <Phone active="pastors" noPad top={<TopBar back title="Pastor profile" right={<><button className="mw-iconbtn"><Icon name="share" size={19}/></button><button className="mw-iconbtn"><Icon name="more" size={20}/></button></>}/>}>
      <div style={{padding:'18px 14px 14px', background:'var(--bg-primary)', borderBottom:'0.5px solid var(--border)'}}>
        <div className="mw-row" style={{gap:14}}>
          <div className="mw-avatar lg">EM</div>
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontSize:18, fontWeight:500, letterSpacing:'-0.01em'}}>Pastor Emmanuel Mwanza</div>
            <div style={{fontSize:13, color:'var(--text-secondary)', marginTop:2}}>Bread of Life Intl.</div>
            <div style={{fontSize:12, color:'var(--text-tertiary)', marginTop:2}}>Lusaka · Zone Z03 · since 2018</div>
          </div>
        </div>
        <div className="mw-row" style={{gap:6, marginTop:12}}>
          <span className="mw-badge info">PCM</span>
          <span className="mw-badge outline">BOT</span>
          <span className="mw-badge success"><span className="mw-dot"/>Active</span>
        </div>
        <div className="mw-row" style={{gap:8, marginTop:14}}>
          <button className="mw-btn" style={{flex:1, justifyContent:'center'}}><Icon name="phone" size={14}/>Call</button>
          <button className="mw-btn" style={{flex:1, justifyContent:'center'}}><Icon name="mail" size={14}/>Message</button>
          <button className="mw-btn" style={{flex:1, justifyContent:'center'}}><Icon name="edit" size={14}/>Edit</button>
        </div>
      </div>

      <div style={{padding:'14px 14px 90px'}}>
        <div className="mw-card" style={{marginBottom:14}}>
          <div className="mw-eyebrow">Status pipeline</div>
          <div className="mw-pipeline" style={{marginTop:6}}>
            {stages.map((s,i)=>(
              <React.Fragment key={s}>
                <div className="mw-pip">
                  <div className={`mw-pip-dot ${i<3?'done':i===3?'current':''}`}/>
                  <div className="mw-pip-lbl">{s.slice(0,4)}</div>
                </div>
                {i<stages.length-1 && <div className={`mw-pip-line ${i<3?'done':''}`}/>}
              </React.Fragment>
            ))}
          </div>
          <button className="mw-btn primary full" style={{marginTop:14}}><Icon name="star" size={14}/>Promote to Champion</button>
        </div>

        <div className="mw-section-title"><span>Activity</span><a>14 entries</a></div>
        <div className="mw-card" style={{padding:'4px 14px'}}>
          {[
            ['#639922','Pledged 12 ushers','Pledge meeting #2','Today'],
            ['var(--text-info)','Joined BOT','Confirmed by D. Boateng','11 Mar'],
            ['#639922','Status → Active','3rd zonal meeting','02 Mar'],
            ['#EF9F27','Conference registered','Stripe · $40','12 Apr'],
          ].map((e,i)=>(
            <div key={i} className="mw-row" style={{gap:12, padding:'12px 0', borderBottom:i<3?'0.5px solid var(--border)':'none'}}>
              <div style={{width:8, height:8, borderRadius:'50%', background:e[0], flexShrink:0}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:13, fontWeight:500}}>{e[1]}</div>
                <div style={{fontSize:11, color:'var(--text-secondary)'}}>{e[2]}</div>
              </div>
              <div style={{fontSize:11, color:'var(--text-tertiary)'}}>{e[3]}</div>
            </div>
          ))}
        </div>

        <div className="mw-section-title"><span>Pledged</span></div>
        <div className="mw-card">
          <div className="mw-col" style={{gap:8, fontSize:13}}>
            <div className="mw-row mw-between"><span>Ushers</span><b>12</b></div>
            <div className="mw-row mw-between"><span>Choir</span><b>0</b></div>
            <div className="mw-row mw-between"><span>Counsellors</span><b>4</b></div>
          </div>
        </div>
      </div>
    </Phone>
  );
};

window.MWScreens1 = { DM1, DM2, DM3, DM4, DM5 };
