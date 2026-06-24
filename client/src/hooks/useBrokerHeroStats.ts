import { useEffect, useState } from "react";
import api from "@/lib/api";
import { isPaidPlan } from "@/lib/brokerBranding";
import {
  formatCityCount,
  formatPropertyCount,
  formatSalesVolume,
} from "@/utils/formatSalesVolume";

const MIN_PROPERTIES = 20;
const MIN_CITIES = 2;

export interface HeroStats {
  propertyCount: number;
  cityCount: number;
  salesVolume: number;
}

export interface HeroStatsDisplay {
  properties: string;
  cities: string;
  salesVolume: string;
}

export function useBrokerHeroStats(
  brokerPackage: string | undefined | null,
  brokerLoading: boolean,
) {
  const [stats, setStats] = useState<HeroStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (brokerLoading || !isPaidPlan(brokerPackage)) {
      setStats(null);
      return;
    }

    let active = true;
    setLoading(true);

    (async () => {
      try {
        const { data } = await api.get("/properties/stats");
        if (!active) return;
        setStats(data?.data ?? null);
      } catch (err) {
        console.error("Error fetching hero stats:", err);
        if (!active) return;
        setStats(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [brokerPackage, brokerLoading]);

  const shouldShow =
    !!stats &&
    stats.propertyCount >= MIN_PROPERTIES &&
    stats.cityCount >= MIN_CITIES;

  const display: HeroStatsDisplay | null = shouldShow
    ? {
        properties: formatPropertyCount(stats.propertyCount),
        cities: formatCityCount(stats.cityCount),
        salesVolume: formatSalesVolume(stats.salesVolume),
      }
    : null;

  return { display, loading, shouldShow };
}
