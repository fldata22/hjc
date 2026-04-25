/* global React */

const Icon = ({name, size=18}) => {
  const paths = {
    home: <><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/></>,
    powers: <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></>,
    pastors: <><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M14.5 20c0-2.5 1.5-4.5 4-4.5"/></>,
    log: <><path d="M4 4h16v16H4z"/><path d="M4 9h16M8 13h8M8 17h5"/></>,
    more: <><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></>,
    bell: <><path d="M6 16V11a6 6 0 1112 0v5l1.5 2H4.5z"/><path d="M10 20a2 2 0 004 0"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    chevron: <><path d="M9 6l6 6-6 6"/></>,
    chevronL: <><path d="M15 6l-6 6 6 6"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="M16 16l5 5"/></>,
    filter: <><path d="M3 5h18l-7 9v6l-4-2v-4z"/></>,
    phone: <><path d="M5 4h4l2 5-3 2a11 11 0 005 5l2-3 5 2v4a2 2 0 01-2 2A17 17 0 013 6a2 2 0 012-2z"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></>,
    cal: <><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></>,
    check: <><path d="M5 12l4 4L19 6"/></>,
    edit: <><path d="M4 20h4l10-10-4-4L4 16z"/></>,
    download: <><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></>,
    share: <><path d="M12 4v12M7 9l5-5 5 5M5 20h14"/></>,
    star: <><path d="M12 3l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/></>,
    spark: <><path d="M3 17l5-8 4 5 4-7 5 10"/></>,
    money: <><path d="M12 4v16M8 8c0-2 8-2 8 0s-8 1-8 4 8 1 8 4-8 2-8 0"/></>,
    cards: <><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/></>,
    flag: <><path d="M5 21V4M5 4l12 2-2 4 2 4-12-2"/></>,
    mic: <><rect x="9" y="3" width="6" height="13" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
};

// === Top bar ===
const TopBar = ({eyebrow, title, back, right, transparent}) => (
  <div className="mw-topbar" style={transparent?{background:'transparent', borderBottom:'none'}:null}>
    <div className="mw-topbar-l">
      {back ? (
        <button className="mw-iconbtn" aria-label="Back"><Icon name="chevronL" size={20}/></button>
      ) : (
        <button className="mw-iconbtn"><div style={{width:30, height:30, borderRadius:7, background:'var(--text-info)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:600, fontSize:14}}>P</div></button>
      )}
    </div>
    <div className="mw-topbar-title">
      {eyebrow && <div className="mw-topbar-eyebrow">{eyebrow}</div>}
      <div>{title}</div>
    </div>
    <div className="mw-topbar-r">
      {right || (
        <>
          <button className="mw-iconbtn"><Icon name="search" size={19}/></button>
          <button className="mw-iconbtn"><Icon name="bell" size={19}/><span className="dot"/></button>
        </>
      )}
    </div>
  </div>
);

// === Bottom tab bar ===
const TabBar = ({active}) => {
  const tabs = [
    {key:'home', label:'Home', icon:'home'},
    {key:'powers', label:'Powers', icon:'powers'},
    {key:'log', label:'Log', icon:'plus', center:true},
    {key:'pastors', label:'Pastors', icon:'pastors'},
    {key:'more', label:'More', icon:'more'},
  ];
  return (
    <div className="mw-tabbar">
      {tabs.map(t => {
        if (t.center) {
          return (
            <div key={t.key} className="mw-tabitem" style={{justifyContent:'flex-start', paddingTop:2}}>
              <div style={{width:44, height:44, borderRadius:'50%', background:'var(--text-info)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(12,68,124,0.28)'}}>
                <Icon name="plus" size={22}/>
              </div>
              <div style={{marginTop:2, fontSize:9, color:'var(--text-tertiary)'}}>Quick log</div>
            </div>
          );
        }
        return (
          <div key={t.key} className={`mw-tabitem ${active===t.key?'active':''}`}>
            <div className="ic"><Icon name={t.icon} size={20}/></div>
            <div>{t.label}</div>
          </div>
        );
      })}
    </div>
  );
};

const Phone = ({active, children, top, fab, noPad, gray}) => (
  <div className="mw" style={gray?{background:'var(--bg-secondary)'}:null}>
    {top}
    <div className={`mw-content ${noPad ? 'flush' : ''}`}>{children}</div>
    {fab}
    <TabBar active={active}/>
  </div>
);

window.MWShell = { Icon, TopBar, TabBar, Phone };
