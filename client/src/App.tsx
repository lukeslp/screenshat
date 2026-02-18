import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Router, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import CaptureResults from "./pages/CaptureResults";
import History from "./pages/History";

// Strip trailing slash from base so wouter matches correctly
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function AppRouter() {
  return (
    <Router base={BASE}>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/results/:jobId"} component={CaptureResults} />
        <Route path={"/history"} component={History} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Router>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <AppRouter />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
