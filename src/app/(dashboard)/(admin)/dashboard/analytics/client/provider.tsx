"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { getTelemetryData, TelemetryData } from "../analyticsserver";
import { toast } from "sonner";

interface AnalyticsContextType {
  telemetryData: TelemetryData[];
  totalCount: number;
  hasMore: boolean;
  isLoading: boolean;
  stats: {
    totalCount: number;
    uniquePlaceIds: number;
    uniqueGameIds: number;
    uniqueExecutors: number;
    mostRecentTimestamp: number | null;
  } | null;
  fetchTelemetryData: (options?: {
    limit?: number;
    offset?: number;
    startDate?: number;
    endDate?: number;
    placeId?: number;
    gameId?: number;
    silent?: boolean;
  }) => Promise<void>;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const [telemetryData, setTelemetryData] = useState<TelemetryData[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<AnalyticsContextType['stats']>(null);

  const fetchTelemetryData = useCallback(async (options?: {
    limit?: number;
    offset?: number;
    startDate?: number;
    endDate?: number;
    placeId?: number;
    gameId?: number;
    silent?: boolean;
  }) => {
    const { silent = false, ...queryOptions } = options || {};

    setIsLoading(true);
    console.log('Loading telemetry data...')

    if (silent) {
      try {
        const result = await getTelemetryData(queryOptions);
        setTelemetryData(result.data);
        setStats(result.stats);
        setTotalCount(result.totalCount);
      } catch (error) {
        console.error("Error fetching telemetry data:", error);
      } finally {
        setIsLoading(false);
      }
    } else {
      toast.promise(
        async () => {
          try {
            const result = await getTelemetryData(queryOptions);
            setTelemetryData(result.data);
            setStats(result.stats);
            setTotalCount(result.totalCount);
            return result;
          } catch (error) {
            console.error("Error fetching telemetry data:", error);
            throw error;
          } finally {
            setIsLoading(false);
          }
        },
        {
          loading: 'Loading telemetry data...',
          success: 'Telemetry data loaded successfully!',
          error: 'Failed to load telemetry data.'
        }
      );
    }
  }, []);

  return (
    <AnalyticsContext.Provider
      value={{
        telemetryData,
        stats,
        totalCount,
        hasMore: false,
        isLoading,
        fetchTelemetryData
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  
  if (context === undefined) {
    throw new Error("useAnalytics must be used within an AnalyticsProvider");
  }
  
  return context;
}