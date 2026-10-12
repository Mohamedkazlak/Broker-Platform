import React, { createContext, useContext, useEffect, useState } from "react";
import {
  Broker,
  getSubdomainFromHost,
  getBrokerBySubdomain,
} from "@/lib/broker";
import { getPrefetchedCustomDomainBroker } from "@/utils/tenant";

interface BrokerContextType {
  broker: Broker | null;
  isLoading: boolean;
  error: string | null;
}

const BrokerContext = createContext<BrokerContextType>({
  broker: null,
  isLoading: true,
  error: null,
});

export const useBroker = () => useContext(BrokerContext);

export function BrokerProvider({ children }: { children: React.ReactNode }) {
  const [broker, setBroker] = useState<Broker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBroker() {
      try {
        const subdomain = getSubdomainFromHost();

        if (!subdomain) {
          // Main domain — no broker needed
          setBroker(null);
          setIsLoading(false);
          return;
        }

        // Custom-domain bootstrap already fetched the public profile via
        // /api/tenant/resolve — reuse it instead of a second round-trip.
        const prefetched = getPrefetchedCustomDomainBroker(subdomain);
        const brokerData =
          (prefetched as Broker | null) ??
          (await getBrokerBySubdomain(subdomain));

        if (brokerData) {
          setBroker(brokerData);
        } else {
          // Subdomain exists but no broker found in DB
          setError(`No broker found for subdomain "${subdomain}"`);
          setBroker(null);
        }
      } catch (err) {
        console.error("Failed to load broker:", err);
        setError("Failed to load broker configuration");
        setBroker(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadBroker();
  }, []);

  return (
    <BrokerContext.Provider value={{ broker, isLoading, error }}>
      {children}
    </BrokerContext.Provider>
  );
}
