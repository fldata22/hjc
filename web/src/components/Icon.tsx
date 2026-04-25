// @ts-nocheck
import React from 'react';

export type IconName =
  | 'home' | 'powers' | 'pastors' | 'committees' | 'publicity' | 'govt'
  | 'budget' | 'activity' | 'assess' | 'inbox' | 'pledges' | 'conf' | 'prep'
  | 'search' | 'bell' | 'plus' | 'chevron' | 'menu' | 'filter' | 'download'
  | 'phone' | 'mail' | 'check' | 'edit' | 'flag' | 'star' | 'clock' | 'spark'
  | 'money' | 'upload' | 'arrowR' | 'sliders' | 'shield' | 'cal' | 'chart' | 'cards';

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/></>,
    powers: <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></>,
    pastors: <><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M14.5 20c0-2.5 1.5-4.5 4-4.5"/></>,
    committees: <><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M8 6V4M16 6V4"/></>,
    publicity: <><path d="M3 11l11-6v14L3 13z"/><path d="M14 8c2 1 2 7 0 8"/></>,
    govt: <><path d="M3 10l9-5 9 5"/><path d="M5 10v9M19 10v9M9 19v-6M15 19v-6M3 21h18"/></>,
    budget: <><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="12" cy="14.5" r="2"/></>,
    activity: <><path d="M4 4h16v16H4z"/><path d="M4 9h16M8 13h8M8 17h5"/></>,
    assess: <><path d="M5 3h11l4 4v14H5z"/><path d="M9 13l2 2 4-4"/></>,
    inbox: <><path d="M3 13l3-9h12l3 9"/><path d="M3 13v6h18v-6h-6l-2 2h-2l-2-2H3z"/></>,
    pledges: <><path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/></>,
    conf: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 10h8M8 14h5"/></>,
    prep: <><rect x="4" y="5" width="5" height="14" rx="1"/><rect x="11" y="5" width="5" height="9" rx="1"/><rect x="18" y="5" width="3" height="6" rx="1"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="M16 16l5 5"/></>,
    bell: <><path d="M6 16V11a6 6 0 1112 0v5l1.5 2H4.5z"/><path d="M10 20a2 2 0 004 0"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    chevron: <><path d="M9 6l6 6-6 6"/></>,
    menu: <><path d="M5 7h14M5 12h14M5 17h14"/></>,
    filter: <><path d="M3 5h18l-7 9v6l-4-2v-4z"/></>,
    download: <><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></>,
    phone: <><path d="M5 4h4l2 5-3 2a11 11 0 005 5l2-3 5 2v4a2 2 0 01-2 2A17 17 0 013 6a2 2 0 012-2z"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></>,
    check: <><path d="M5 12l4 4L19 6"/></>,
    edit: <><path d="M4 20h4l10-10-4-4L4 16z"/></>,
    flag: <><path d="M5 21V4M5 4l12 2-2 4 2 4-12-2"/></>,
    star: <><path d="M12 3l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    spark: <><path d="M3 17l5-8 4 5 4-7 5 10"/></>,
    money: <><path d="M12 4v16M8 8c0-2 8-2 8 0s-8 1-8 4 8 1 8 4-8 2-8 0"/></>,
    upload: <><path d="M12 16V5M7 9l5-5 5 5M5 20h14"/></>,
    arrowR: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    sliders: <><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h14M18 18h2"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="18" r="2"/></>,
    shield: <><path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/></>,
    cal: <><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></>,
    chart: <><path d="M4 20V8M10 20V4M16 20v-9M22 20H2"/></>,
    cards: <><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}
