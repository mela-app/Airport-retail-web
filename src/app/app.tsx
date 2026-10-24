/**
 * Application root: configuration, language, live connection and routes.
 *
 *   /split?left=…&right=…   split-screen demo mode
 *   /claim/:token           the passenger's mobile claim page (no demo chrome)
 *   everything else         one role view under the header and the simulation bar
 */
import { useEffect, useState } from 'react';

import { I18nProvider, useI18n } from '../i18n';
import { ClaimPage } from '../pages/claim/claim-page';
import { AdvertiserReport } from '../pages/report/advertiser-report';
import { BrowserRouter, matchPath, useLocation, useNavigate } from '../lib/router';
import { DemoGuide } from '../shell/demo-guide';
import { Header } from '../shell/header';
import { RoleView } from '../shell/role-view';
import { SimBar } from '../shell/sim-bar';
import { SplitView } from '../shell/split-view';
import { ToastProvider } from '../ui/overlay';
import { AppConfigProvider } from './config';

export function App() {
  return (
    <AppConfigProvider fallback={<Boot />}>
      <I18nProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes />
          </BrowserRouter>
        </ToastProvider>
      </I18nProvider>
    </AppConfigProvider>
  );
}

function Routes() {
  const { path } = useLocation();
  const navigate = useNavigate();
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    if (path === '/') navigate('/admin', { replace: true });
  }, [path, navigate]);

  const claim = matchPath('/claim/:token', path);
  if (claim) return <ClaimPage token={claim.get('token') ?? ''} />;
  const report = matchPath('/report/:id', path);
  if (report) return <AdvertiserReport advertiserId={report.get('id') ?? ''} />;
  const split = path === '/split';
  return (
    <div className={split ? 'app app--split' : 'app'}>
      <SkipLink />
      <Header split={split} onDemo={() => setDemo((d) => !d)} demoOpen={demo} />
      <SimBar />
      {split ? <SplitView /> : <RoleView />}
      {demo ? <DemoGuide onClose={() => setDemo(false)} /> : null}
    </div>
  );
}

function SkipLink() {
  const { t } = useI18n();
  return (
    <a className="skip-link" href="#content">
      {t('app.shell.skipToContent')}
    </a>
  );
}

function Boot() {
  return (
    <div className="startup" role="status">
      <div className="spinner" aria-hidden="true" />
    </div>
  );
}
