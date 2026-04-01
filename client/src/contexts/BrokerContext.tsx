import React, { createContext, useContext, useEffect, useState } from 'react';
import { Broker, getSubdomainFromHost, getBrokerBySubdomain, demoBroker } from '@/lib/broker';

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

        const brokerData = await getBrokerBySubdomain(subdomain);
        
        if (brokerData) {
          setBroker(brokerData);
        } else {
          // Subdomain exists but no broker found in DB
          setError(`No broker found for subdomain "${subdomain}"`);
          setBroker(null);
        }
      } catch (err) {
        console.error('Failed to load broker:', err);
        setError('Failed to load broker configuration');
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
