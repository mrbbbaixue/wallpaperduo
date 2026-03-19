import { BrowserRouter } from "react-router-dom";

import { AppProviders } from "@/app/AppProviders";
import { AppRouter } from "@/app/router";
import { AppShell } from "@/components/layout/AppShell";

function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppShell>
          <AppRouter />
        </AppShell>
      </BrowserRouter>
    </AppProviders>
  );
}

export default App;
