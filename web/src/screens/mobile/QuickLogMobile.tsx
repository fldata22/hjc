// @ts-nocheck
import React from 'react';
import { Phone, TopBar } from '../../components/MobileShell';
export function QuickLogMobile() {
  return (
    <Phone active="log" top={<TopBar title="Quick log" />}>
      <div style={{ padding: 24, color: 'var(--text-secondary)' }}>Coming soon.</div>
    </Phone>
  );
}
