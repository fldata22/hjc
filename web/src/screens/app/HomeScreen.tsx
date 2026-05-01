import { useState } from 'react';
import { AppBar, Drawer, ResponsiveShell, PILLARS, TabBar } from './Shell';
import './app.css';

export function HomeScreen() {
  const [drawer, setDrawer] = useState(false);
  return (
    <ResponsiveShell active="home">
      <AppBar onMenu={() => setDrawer(true)}/>

      <div className="scroll">
        <div className="home-hero">
          <div className="home-hero-l">
            <div className="greet">
              <div className="eyebrow">Wed · 30 Apr · Day 58 / 84</div>
              <h1 className="serif">Good morning,<br/><em>Bishop Lovell.</em></h1>
              <p className="summary">
                <b>3 forms</b> are due this week. Composite readiness held at <b>64%</b>,
                up 4 points from last Friday's reading.
              </p>
            </div>

            {/* Composite */}
            <div className="composite">
              <div className="label">Composite readiness · Week 8</div>
              <div className="row">
                <div className="num serif">64<small>%</small></div>
                <div className="delta">
                  <b>+4 pts</b>
                  vs last week<br/>
                  5 of 13 on track
                </div>
              </div>
              <div className="track"><i style={{ width: '64%' }}/></div>
            </div>
          </div>

          <div className="home-hero-r">
            {/* Pillar strip — 13 letters */}
            <div className="pillar-strip">
              <div className="lab">
                <span>13 pillars · readiness</span>
                <span>P · A · V · E · D · D</span>
              </div>
              <div className="grid">
                {PILLARS.map((p, i) => (
                  <div
                    key={i}
                    className={'chip' + (p.s < 50 ? ' acc' : '')}
                    style={{ ['--f' as never]: p.s / 100 } as React.CSSProperties}
                  >
                    <span>{p.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="home-grid">
          <section className="home-card">
            <div className="sec">
              <h2 className="serif">Due <em>this week</em></h2>
              <span className="more">3 forms</span>
            </div>
            <div className="form-list">
              <div className="form-row">
                <div>
                  <div className="name">Weekly Assessment · Week 8</div>
                  <div className="meta">
                    <span className="pillar serif">All 13</span>
                    <span className="d">·</span>
                    <span>Bernard A.</span>
                    <span className="d">·</span>
                    <span>5 min</span>
                  </div>
                </div>
                <div className="right">
                  <div className="due urgent">DUE FRI · 2D</div>
                  <div className="arr">›</div>
                </div>
              </div>
              <div className="form-row">
                <div>
                  <div className="name">BOT Roster Update</div>
                  <div className="meta">
                    <span className="pillar serif">P3</span>
                    <span className="d">·</span>
                    <span>Director</span>
                    <span className="d">·</span>
                    <span>8 min</span>
                  </div>
                </div>
                <div className="right">
                  <div className="due warn">SUN · 4D</div>
                  <div className="arr">›</div>
                </div>
              </div>
              <div className="form-row">
                <div>
                  <div className="name">Awareness Survey · field results</div>
                  <div className="meta">
                    <span className="pillar serif">A9</span>
                    <span className="d">·</span>
                    <span>Field team</span>
                    <span className="d">·</span>
                    <span>12 min</span>
                  </div>
                </div>
                <div className="right">
                  <div className="due warn">MON · 5D</div>
                  <div className="arr">›</div>
                </div>
              </div>
            </div>
          </section>

          <section className="home-card">
            <div className="sec">
              <h2 className="serif">Pillars <em>at risk</em></h2>
              <span className="more">Bottom 4</span>
            </div>
            <div className="at-risk">
              {[...PILLARS].sort((a, b) => a.s - b.s).slice(0, 4).map((p) => (
                <div className="at-risk-row" key={p.n}>
                  <span className="L serif">{p.l}</span>
                  <span className="nm">{p.n}</span>
                  <span className="pct">{p.s}<small>%</small></span>
                </div>
              ))}
            </div>
          </section>

          <section className="home-card">
            <div className="sec">
              <h2 className="serif">Recent <em>activity</em></h2>
              <span className="more">View all</span>
            </div>
            <div className="activity">
              <div className="activity-item">
                <div className="when">2H AGO</div>
                <div className="what">
                  <b>3 PCMs verified</b> by Bernard Anchebah at Wa Pastors' Fellowship.
                  <div className="tag">P1 · PCM PARTICIPATION · +4 pts</div>
                </div>
              </div>
              <div className="activity-item">
                <div className="when">YEST</div>
                <div className="what">
                  Week 7 weekly assessment submitted — composite landed at <b>60%</b>.
                  <div className="tag">ALL PILLARS · +2 AVG</div>
                </div>
              </div>
              <div className="activity-item">
                <div className="when">2D</div>
                <div className="what">
                  <b>Mayor visit</b> logged as won — religious affairs office to follow Tuesday.
                  <div className="tag">P5 · GOVERNMENT · +3 PTS</div>
                </div>
              </div>
              <div className="activity-item">
                <div className="when">3D</div>
                <div className="what">
                  4 fathers added to the <b>Fathers of the Land</b> roster.
                  <div className="tag">P2 · FATHERS · +6 PTS</div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="bot-pad"/>
      </div>

      <TabBar active="home"/>
      {drawer && <Drawer active="home" onClose={() => setDrawer(false)}/>}
    </ResponsiveShell>
  );
}
