/* global React */
const { Icon, TopBar, Phone } = window.MWShell;

// ─── DM.6 — Quick log (modal-style sheet) ───
const DM6 = () => (
  <Phone active="log" gray top={<TopBar title="Quick log" right={<button className="mw-iconbtn" style={{fontSize:13, width:'auto', padding:'0 6px'}}>Cancel</button>}/>}>
    <div className="mw-section-title" style={{margin:'0 2px 8px'}}>What happened?</div>
    <div className="mw-grid mw-g2">
      {[
        ['Pastor visit','pastors','var(--text-info)','var(--bg-info)'],
        ['Pledge','check','var(--text-success)','var(--bg-success)'],
        ['Survey result','spark','var(--text-warning)','var(--bg-warning)'],
        ['Donation','money','var(--text-success)','var(--bg-success)'],
        ['Risk / blocker','flag','var(--text-danger)','var(--bg-danger)'],
        ['Note to self','edit','var(--text-secondary)','var(--bg-secondary)'],
      ].map((t,i)=>(
        <div key={i} className="mw-card" style={{padding:14, display:'flex', flexDirection:'column', gap:10}}>
          <div style={{width:36, height:36, borderRadius:9, background:t[3], color:t[2], display:'flex', alignItems:'center', justifyContent:'center'}}><Icon name={t[1]} size={18}/></div>
          <div style={{fontSize:13, fontWeight:500}}>{t[0]}</div>
        </div>
      ))}
    </div>

    <div className="mw-section-title">Or speak it</div>
    <div className="mw-card" style={{display:'flex', alignItems:'center', gap:14, padding:18}}>
      <div style={{width:48, height:48, borderRadius:'50%', background:'var(--text-info)', color:'white', display:'flex', alignItems:'center', justifyContent:'center'}}><Icon name="mic" size={22}/></div>
      <div style={{flex:1}}>
        <div style={{fontSize:14, fontWeight:500}}>Voice log</div>
        <div style={{fontSize:12, color:'var(--text-secondary)'}}>"Met Pastor Joyce, she'll bring 8 ushers…"</div>
      </div>
    </div>

    <div className="mw-section-title">Recent · last 24h</div>
    <div className="mw-rowlist">
      {[
        ['Pledge · Pastor Mwanza · 12 ushers','2h ago'],
        ['Survey Z03 · 28% awareness','5h ago'],
        ['Donation · BOT · $1,200','Yesterday'],
      ].map((r,i)=>(
        <div key={i} className="row">
          <div style={{flex:1}}>
            <div className="title" style={{fontSize:13}}>{r[0]}</div>
            <div className="sub">{r[1]}</div>
          </div>
          <Icon name="chevron" size={14}/>
        </div>
      ))}
    </div>
  </Phone>
);

// ─── DM.7 — Weekly assessment ───
const DM7 = () => {
  const items = [
    ['Pastors',78,'success','reviewed'],
    ['Awareness',21,'danger','flagged'],
    ['Volunteers',2,'danger','flagged'],
    ['Equipment',64,'warning','reviewed'],
    ['Events',38,'warning','pending'],
    ['Donors',71,'success','reviewed'],
  ];
  return (
    <Phone active="more" top={<TopBar back eyebrow="Director's discipline" title="Weekly assessment"/>}>
      <div className="mw-stat info" style={{marginBottom:14}}>
        <div className="lbl">Week 8 · due Sun 9pm</div>
        <div style={{display:'flex', alignItems:'baseline', gap:10, marginTop:4}}>
          <div className="val" style={{fontSize:28}}>4 <span style={{fontSize:14, fontWeight:400, color:'var(--text-secondary)'}}>of 14 powers</span></div>
        </div>
        <div className="mw-progress" style={{marginTop:8}}><div style={{width:'29%', background:'var(--text-info)'}}/></div>
      </div>

      <div className="mw-section-title">Power-by-power review</div>
      <div className="mw-rowlist">
        {items.map((r,i)=>(
          <div key={i} className="row">
            <div style={{flex:1}}>
              <div className="mw-row" style={{gap:8}}>
                <div className="title">{r[0]}</div>
                <span className={`mw-badge ${r[2]}`}>{r[1]}%</span>
              </div>
              <div className="sub">Status: {r[3]}</div>
            </div>
            {r[3]==='reviewed' ? <span className="mw-badge success"><Icon name="check" size={11}/></span> : r[3]==='flagged' ? <span className="mw-badge danger">flag</span> : <Icon name="chevron" size={16}/>}
          </div>
        ))}
      </div>

      <div className="mw-section-title">Director's reflection</div>
      <div className="mw-card">
        <textarea className="mw-input" rows={4} style={{fontFamily:'inherit', resize:'none'}} placeholder="What broke this week? What's the one thing for next week?" defaultValue="Worker groups still the biggest gap. Bishop call moved to Tuesday. Awareness uptick after radio."/>
      </div>

      <button className="mw-btn primary full" style={{marginTop:14}}>Submit to Bishop</button>
    </Phone>
  );
};

// ─── DM.8 — Activity log ───
const DM8 = () => {
  const days = [
    ['TODAY · 25 APR',[
      ['#639922','09:14','Pastor Mwanza pledged 12 ushers','Pledge · Z03'],
      ['var(--text-info)','08:02','Reviewed Awareness Z01–Z08','Power · Awareness'],
    ]],
    ['YESTERDAY',[
      ['#EF9F27','17:30','Permit follow-up · no response','Documentation'],
      ['#639922','14:12','BOT received $1,200 from Bishop Mulenga','Donors'],
      ['#E24B4A','11:00','Convoy: 2 buses fell through','Equipment · risk'],
    ]],
    ['WED 23 APR',[
      ['var(--text-info)','19:00','Steering meeting · 8 attended','Direction'],
      ['#639922','15:40','3 pastors moved to Active','Pastors'],
    ]],
  ];
  return (
    <Phone active="more" top={<TopBar back title="Activity log" right={<button className="mw-iconbtn"><Icon name="filter" size={18}/></button>}/>}>
      <div className="mw-filterbar" style={{padding:'0 0 12px'}}>
        <div className="mw-chip active">All</div>
        <div className="mw-chip">Pledges</div>
        <div className="mw-chip">Pastors</div>
        <div className="mw-chip">Risks</div>
        <div className="mw-chip">Donors</div>
      </div>
      {days.map((d,i)=>(
        <div key={i} style={{marginBottom:14}}>
          <div className="mw-eyebrow" style={{margin:'4px 2px 8px'}}>{d[0]}</div>
          <div className="mw-card" style={{padding:'4px 14px'}}>
            {d[1].map((e,j)=>(
              <div key={j} className="mw-row" style={{gap:12, padding:'12px 0', borderBottom:j<d[1].length-1?'0.5px solid var(--border)':'none'}}>
                <div style={{width:8, height:8, borderRadius:'50%', background:e[0], flexShrink:0, marginTop:6}}/>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:13, fontWeight:500}}>{e[2]}</div>
                  <div style={{fontSize:11, color:'var(--text-secondary)', marginTop:2}}>{e[3]}</div>
                </div>
                <div style={{fontSize:11, color:'var(--text-tertiary)'}}>{e[1]}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </Phone>
  );
};

window.MWScreens2 = { DM6, DM7, DM8 };
