// @ts-nocheck
import React from 'react';
import { Phone, TopBar } from '../../components/MobileShell';
export function PowersListMobile() {
  return (
    <Phone active="powers" top={<TopBar title="PAVEDDD powers" />}>
      <div style={{ padding: 24, color: 'var(--text-secondary)' }}>Coming soon.</div>
    </Phone>
  );
}
