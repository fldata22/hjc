// @ts-nocheck
import React from 'react';
import { Phone, TopBar } from '../../components/MobileShell';
export function WeeklyAssessmentMobile() {
  return (
    <Phone active="home" top={<TopBar title="Weekly assessment" />}>
      <div style={{ padding: 24, color: 'var(--text-secondary)' }}>Coming soon.</div>
    </Phone>
  );
}
