import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import LookupPage from "@/pages/lookup";
import ReportPage from "@/pages/report";
import PaymentPage from "@/pages/payment";
import PricingPage from "@/pages/pricing";
import SubscribedPage from "@/pages/subscribed";
import NotFound from "@/pages/not-found";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router hook={useHashLocation}>
        <Switch>
          <Route path="/" component={LookupPage} />
          <Route path="/report/:id" component={ReportPage} />
          <Route path="/payment/:lookupId" component={PaymentPage} />
          <Route path="/pricing" component={PricingPage} />
          <Route path="/subscribed" component={SubscribedPage} />
          <Route component={NotFound} />
        </Switch>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
