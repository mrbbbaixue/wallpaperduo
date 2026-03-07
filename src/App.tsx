import { HashRouter } from "react-router-dom";

import { AppProviders } from "@/app/AppProviders";
import { AppRouter } from "@/app/router";
import { AppShell } from "@/components/layout/AppShell";

function App() {
  return (
    <AppProviders>
      <HashRouter>
        <AppShell>
          <AppRouter />
        </AppShell>
      </HashRouter>
    </AppProviders>
  );
}

export default App;
