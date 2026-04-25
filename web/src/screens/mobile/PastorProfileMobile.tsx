// @ts-nocheck
import React from 'react';
import { Phone, TopBar } from '../../components/MobileShell';
export function PastorProfileMobile() {
  return (
    <Phone active="pastors" top={<TopBar title="Pastor" />}>
      <div style={{ padding: 24, color: 'var(--text-secondary)' }}>Coming soon.</div>
    </Phone>
  );
}
