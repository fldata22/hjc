// @ts-nocheck
import React from 'react';
import { Phone, TopBar } from '../../components/MobileShell';
export function PastorsDirectoryMobile() {
  return (
    <Phone active="pastors" top={<TopBar title="Pastors" />}>
      <div style={{ padding: 24, color: 'var(--text-secondary)' }}>Coming soon.</div>
    </Phone>
  );
}
