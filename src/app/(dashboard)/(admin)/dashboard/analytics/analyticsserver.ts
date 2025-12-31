"use server";

import { kv } from "@vercel/kv";

export type TelemetryData = {
  exec: string;
  execver: string;
  placeid: number;
  gameid: number;
  timestamp: number;
  loading: boolean;
  failed: boolean;
};

type StatsData = {
  totalCount: number;
  filteredCount: number;
  uniquePlaceIds: number;
  uniqueGameIds: number;
  uniqueExecutors: number;
  mostRecentTimestamp: number | null;
};

const PARALLEL_WORKERS = 25;

/*
 * Get telemetry data
 */
async function pullTelemetryData({
  startDate,
  endDate,
}: {
  startDate?: number;
  endDate?: number;
}): Promise<TelemetryData[]> {
  const totalCount = await kv.scard('telemetryv2:all-keys');
  if (totalCount === 0) {
    return [];
  }
  
  const CHUNK_SIZE = Math.ceil(totalCount / PARALLEL_WORKERS);
  const workerPromises = Array.from({ length: PARALLEL_WORKERS }, async (_, workerIndex) => {
    const workerData: TelemetryData[] = [];

    let cursor = workerIndex * CHUNK_SIZE;
    let itemsCollected = 0;
    let batchCount = 0;
    let emptyBatches = 0;

    do {
      const [newCursor, batch] = await kv.sscan(
        'telemetryv2:all-keys',
        cursor,
        { count: 10000 }
      );
      
      const batchData = batch as unknown as TelemetryData[];
      const filteredBatch = batchData.filter(item => {
        if (startDate !== undefined && item.timestamp < startDate) return false;
        if (endDate !== undefined && item.timestamp > endDate) return false;

        return true;
      });

      if (filteredBatch.length === 0) {
        emptyBatches++;
        if (emptyBatches >= 2) break;
      } else { emptyBatches = 0; }

      workerData.push(...filteredBatch);
      itemsCollected += filteredBatch.length;

      cursor = parseInt(newCursor);
      batchCount++;

      if (itemsCollected >= CHUNK_SIZE && workerIndex < PARALLEL_WORKERS - 1) break;
    } while (cursor !== 0);
    
    return workerData;
  });
  
  const results = await Promise.all(workerPromises);
  const allKeys = results.flat();
  allKeys.sort((a, b) => b.timestamp - a.timestamp);

  return allKeys;
}

/**
 * Filter telemetry data
 */
export async function getTelemetryData({
  startDate,
  endDate,
  placeId,
  gameId
}: {
  startDate?: number;
  endDate?: number;
  placeId?: number;
  gameId?: number;
} = {}): Promise<{
  data: TelemetryData[];
  stats: StatsData;
  totalCount: number;
  filteredCount: number;
}> {
  try {
    const allKeys: TelemetryData[] = await pullTelemetryData({ startDate, endDate });
    const totalCount = allKeys.length;

    let validData = allKeys.filter((item): item is TelemetryData => item !== null);
    const filteredCount = validData.length;
    
    // statistics //
    let stats: StatsData = {
      totalCount: 0,
      filteredCount: 0,
      uniquePlaceIds: 0,
      uniqueGameIds: 0,
      uniqueExecutors: 0,
      mostRecentTimestamp: null
    };
    if (allKeys.length > 0) {
      const placeIds = new Set(validData.map(item => item.placeid));
      const executors = new Set(validData.map(item => item.exec));
      const gameIds = new Set(validData.map(item => item.gameid));
      const timestamps = validData.map(item => item.timestamp);
      
      stats = {
        totalCount,
        filteredCount,
        uniquePlaceIds: placeIds.size,
        uniqueGameIds: gameIds.size,
        uniqueExecutors: executors.size,
        mostRecentTimestamp: timestamps.length > 0 ? timestamps.reduce((a, b) => Math.max(a, b), -Infinity) : null,
      };
    }
    
    // data //
    if (startDate || endDate || placeId !== undefined || gameId !== undefined) {
      validData = validData.filter(data => {
        if (startDate && data.timestamp < startDate) return false;
        if (endDate && data.timestamp > endDate) return false;
        if (placeId !== undefined && data.placeid !== placeId) return false;
        if (gameId !== undefined && data.gameid !== gameId) return false;
        return true;
      });
    }
    
    return {
      data: validData,
      stats,
      totalCount,
      filteredCount
    };
  } catch (err) {
    throw new Error("Failed to retrieve telemetry data");
  }
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export async function getTelemetryDatav1({
  startDate,
  endDate,
  placeId,
  gameId
}: {
  limit?: number;
  offset?: number;
  startDate?: number;
  endDate?: number;
  placeId?: number;
  gameId?: number;
} = {}): Promise<{
  data: TelemetryData[];
  totalCount: number;
}> {
  try {
    // Get all keys from the set
    let allKeys = await kv.smembers('telemetry:all-keys') as string[];
    
    // Sort keys in descending order (newest first)
    allKeys = allKeys.sort().reverse();
    
    // Filter keys if needed
    if (startDate || endDate || placeId || gameId) {
      const filteredKeys: string[] = [];
      
      for (const key of allKeys) {
        const data = await kv.get(key) as TelemetryData | null;
        if (data) {
          let includeItem = true;
          
          if (startDate && data.timestamp < startDate) includeItem = false;
          if (endDate && data.timestamp > endDate) includeItem = false;
          if (placeId !== undefined && data.placeid !== placeId) includeItem = false;
          if (gameId !== undefined && data.gameid !== gameId) includeItem = false;
          
          if (includeItem) filteredKeys.push(key);
        }
      }
      
      allKeys = filteredKeys;
    }
    
    // Retrieve all telemetry data for these keys
    const telemetryData = await Promise.all(
      allKeys.map(async (key) => {
        const data = await kv.get(key) as TelemetryData | null;
        
        if (!data) {
          await kv.srem('telemetry:all-keys', key);
          return null;
        }

        return data;
      })
    );
    
    // Filter out any null values (in case keys expired)
    const validData = telemetryData.filter((item): item is TelemetryData => item !== null);
    
    return {
      data: validData,
      totalCount: validData.length
    };
  } catch (err) {
    console.error("Failed to retrieve telemetry data:", err);
    throw new Error("Failed to retrieve telemetry data");
  }
}

export async function getTelemetryStatsv1(): Promise<{
  totalCount: number;
  uniquePlaceIds: number;
  uniqueGameIds: number;
  uniqueExecutors: number;
  mostRecentTimestamp: number | null;
}> {
  try {
    // Get all keys and fetch data
    const allKeys = await kv.smembers('telemetry:all-keys') as string[];
    
    if (allKeys.length === 0) {
      return {
        totalCount: 0,
        uniquePlaceIds: 0,
        uniqueGameIds: 0,
        uniqueExecutors: 0,
        mostRecentTimestamp: null
      };
    }
    
    const telemetryData = await Promise.all(
      allKeys.map(async (key) => {
        return await kv.get(key) as TelemetryData | null;
      })
    );
    
    const validData = telemetryData.filter((item): item is TelemetryData => item !== null);
    
    const placeIds = new Set(validData.map(item => item.placeid));
    const gameIds = new Set(validData.map(item => item.gameid));
    const executors = new Set(validData.map(item => item.exec));
    const timestamps = validData.map(item => item.timestamp);
    
    return {
      totalCount: validData.length,
      uniquePlaceIds: placeIds.size,
      uniqueGameIds: gameIds.size,
      uniqueExecutors: executors.size,
      mostRecentTimestamp: timestamps.length > 0 ? timestamps.reduce((a, b) => Math.max(a, b), -Infinity) : null
    };
  } catch (err) {
    console.error("Failed to retrieve telemetry stats:", err);
    throw new Error("Failed to retrieve telemetry statistics");
  }
}