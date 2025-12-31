"use client";

import type { ReactNode } from "react";
interface RobloxGameResponse {
  data: {
    id: number;
    rootPlaceId: number;
    name: string;
    description: string;
    sourceName?: string;
    sourceDescription?: string;
    creator: {
      id: number;
      name: string;
      type: string;
    };
    price?: number;
    allowedGearGenres: string[];
    allowedGearCategories: string[];
    isGenreEnforced: boolean;
    copying: boolean;
    playing: number;
    visits: number;
    maxPlayers: number;
    created: string;
    updated: string;
    studioAccessToApisAllowed: boolean;
    createVipServersAllowed: boolean;
    universeAvatarType: string;
    genre: string;
    isAllGenre: boolean;
    isFavoritedByUser: boolean;
    favoritedCount: number;
  }[];
}

import { useAnalytics } from "./provider";
import {
  useEffect,
  useState,
  createContext,
  useContext,
  useMemo,
  useCallback,
} from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  BarChart2,
  Clock,
  Filter,
  StarIcon,
  ScrollIcon,
  LinkIcon,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import CopyDropdown from "@/components/copy-dropdown";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type SortField = "placeid" | "count" | "percentage" | "gameid" | "exec" | "failedPercentage";
type SortDirection = "asc" | "desc";
type GameData = RobloxGameResponse["data"][0] | null;

// Create a context for the game data cache
interface GameCacheContextType {
  gameData: Record<number, GameData>;
  fetchGameData: (gameid: number) => Promise<void>;
  isLoading: Record<number, boolean>;
}

const GameCacheContext = createContext<GameCacheContextType>({
  gameData: {},
  fetchGameData: async () => {},
  isLoading: {},
});

// Game Cache Provider component
function GameCacheProvider({ children }: { children: ReactNode }) {
  const [gameData, setGameData] = useState<Record<number, GameData>>({});
  const [isLoading, setIsLoading] = useState<Record<number, boolean>>({});

  // Load cached data from localStorage on initial render
  useEffect(() => {
    try {
      const cachedData = localStorage.getItem("mspaint-game-cache");
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        // Only use cache if it's less than 7 days old
        if (
          parsedData.timestamp &&
          Date.now() - parsedData.timestamp < 7 * 24 * 60 * 60 * 1000
        ) {
          setGameData(parsedData.data || {});
        }
      }
    } catch (error) {
      console.error("Error loading game cache from localStorage:", error);
    }
  }, []);

  // Save to localStorage whenever gameData changes
  useEffect(() => {
    if (Object.keys(gameData).length > 0) {
      try {
        localStorage.setItem(
          "mspaint-game-cache",
          JSON.stringify({
            data: gameData,
            timestamp: Date.now(),
          })
        );
      } catch (error) {
        console.error("Error saving game cache to localStorage:", error);
      }
    }
  }, [gameData]);

  // Function to fetch game data and update cache
  const fetchGameData = useCallback(
    async (gameid: number) => {
      // Skip if already loading or data exists
      if (isLoading[gameid] || gameData[gameid]) return;

      // Mark as loading
      setIsLoading((prev) => ({ ...prev, [gameid]: true }));

      try {
        const response = await fetch(`/api/lookup/roblox/${gameid}`);
        const data = await response.json();

        // Update cache with new data
        setGameData((prev) => ({ ...prev, [gameid]: data }));
      } catch (error) {
        console.error(`Error fetching game info for ${gameid}:`, error);
        // Store null for failed requests to prevent repeated failures
        setGameData((prev) => ({ ...prev, [gameid]: null }));
      } finally {
        // Mark as no longer loading
        setIsLoading((prev) => ({ ...prev, [gameid]: false }));
      }
    },
    [gameData, isLoading]
  );

  const value = useMemo(
    () => ({
      gameData,
      fetchGameData,
      isLoading,
    }),
    [gameData, fetchGameData, isLoading]
  );

  return (
    <GameCacheContext.Provider value={value}>
      {children}
    </GameCacheContext.Provider>
  );
}

// Hook to access the game cache
function useGameCache() {
  return useContext(GameCacheContext);
}

// Updated GameInfoComponent to use cache
function GameInfoComponent({
  gameid,
  placeid,
}: {
  gameid: number;
  placeid?: number;
}) {
  const { gameData, fetchGameData, isLoading } = useGameCache();
  const data = gameData[gameid];

  useEffect(() => {
    if (!data && !isLoading[gameid]) {
      fetchGameData(gameid);
    }
  }, [gameid, data, fetchGameData, isLoading]);

  // Show skeleton while loading
  if (!data && isLoading[gameid]) {
    return (
      <Card className="px-2 py-2 flex flex-row justify-center items-center gap-2 max-w-[500px]">
        <div>
          <Skeleton className="h-5 w-24 mb-2" />
          <div className="flex flex-row items-center space-x-2">
            <div className="flex flex-row text-xs items-center">
              <ScrollIcon className="h-4 w-4" />
              <Skeleton className="h-3 w-20 ml-1" />
            </div>
            <div className="flex flex-row text-xs items-center">
              <StarIcon className="h-4 w-4" />
              <Skeleton className="h-3 w-8 ml-1" />
            </div>
          </div>
        </div>
        <div className="flex flex-row gap-2 ml-auto">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-24" />
        </div>
      </Card>
    );
  }

  // Handle error/not found
  if (!(data && data.rootPlaceId)) {
    return (
      <Card className="px-2 py-2 flex flex-row justify-center items-center gap-2 max-w-[500px]">
        <div>
          <p>Unknown Game</p>
          <p className="text-xs text-muted-foreground">Game ID: {gameid}</p>
        </div>
        <div className="flex flex-row gap-2 ml-auto">
          <CopyDropdown
            size="sm"
            items={[
              { name: "Copy Game ID", value: gameid.toString() },
              {
                name: "Copy Place ID",
                value: (placeid ?? "No Place ID").toString(),
              },
            ]}
          />
          {placeid && <a
            href={`https://www.roblox.com/games/${placeid}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size={"sm"}>
              <LinkIcon className="mr-2 h-4 w-4" />
              View on Roblox
            </Button>
          </a>}
        </div>
      </Card>
    );
  }

  // Normal rendering with data
  return (
    <Card className="px-2 py-2 flex flex-row justify-center items-center gap-2 max-w-[500px]">
      <div>
        <p>{data.name}</p>
        <div className="flex flex-row items-center space-x-2">
          <div className="flex flex-row text-xs items-center text-muted-foreground">
            <ScrollIcon className="h-4 w-4" />
            <span className="max-w-[8rem] text-nowrap overflow-hidden text-ellipsis">
              {data.description}
            </span>
          </div>
          <div className="flex flex-row text-xs items-center text-muted-foreground">
            <StarIcon className="h-4 w-4" />
            {data.favoritedCount?.toLocaleString(navigator?.language ?? "en-US") || 0}
          </div>
        </div>
      </div>

      <div className="flex flex-row gap-2 ml-auto">
        <CopyDropdown
          size="sm"
          items={[
            { name: "Copy Game ID", value: gameid.toString() },
            {
              name: "Copy Place ID",
              value: (placeid ?? "No Place ID").toString(),
            },
          ]}
        />
        <a
          href={`https://www.roblox.com/games/${data.rootPlaceId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" size={"sm"}>
            <LinkIcon className="mr-2 h-4 w-4" />
            View on Roblox
          </Button>
        </a>
      </div>
    </Card>
  );
}

export function AnalyticsClient() {
  const {
    telemetryData,
    totalCount,
    hasMore,
    isLoading,
    stats,
    fetchTelemetryData
  } = useAnalytics();

  const [timeFilter, setTimeFilter] = useState<string>("all");

  // places
  const [placeSortField, setPlaceSortField] = useState<SortField>("count");
  const [placeSortDirection, setPlaceSortDirection] =
    useState<SortDirection>("desc");
  const [placeCurrentPage, setPlaceCurrentPage] = useState(1);
  const [placeItemsPerPage, setPlaceItemsPerPage] = useState(10);

  // executors
  const [executorsSortField, setExecutorsSortField] = useState<SortField>("count");
  const [executorsSortDirection, setExecutorsSortDirection] = useState<SortDirection>("desc");
  const [executorsCurrentPage, setExecutorsCurrentPage] = useState(1);
  const [executorsItemsPerPage, setExecutorsItemsPerPage] = useState(10);

  // pages
  const [rawDataCurrentPage, setRawDataCurrentPage] = useState(1);
  const [rawDataItemsPerPage, setRawDataItemsPerPage] = useState(10);

  function getDateFilterName(filter: string): string {
    let name = "";

    switch (filter) {
      case "today":
        return "Activity today";

      case "yesterday":
        return "Activity yesterday";

      case "24hours":
        name = "24 hours";
        break;

      case "7days":
        name = "7 days";
        break;

      case "30days":
        name = "30 days";
        break;

      case "90days":
        name = "90 days";
        break;

      case "currentyear":
        return "Activity in the current year (" + new Date().getFullYear().toString() + ")";

      case "previousyear":
        return "Activity in the previous year (" + (new Date().getFullYear() - 1).toString() + ")";
        
      case "all":
        return "All time activity";

      default:
        name = "Not programmed.";
        break;
    }

    return "Activity in the last " + name;
  }

  function getDateRangeFromFilter(filter: string): { startDate: number | undefined; endDate: number } {
    const now = Date.now();

    let startDate: number | undefined = undefined;
    let endDate: number = now;

    switch (filter) {
      case "today":
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        startDate = today.getTime();
        break;

      case "yesterday":
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        startDate = yesterday.getTime();
        
        const yesterdayEnd = new Date(now);
        yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
        yesterdayEnd.setHours(23, 59, 59, 999);
        endDate = yesterdayEnd.getTime();
        break;

      case "24hours":
        startDate = now - 24 * 60 * 60 * 1000;
        break;

      case "7days":
        const d7 = new Date(now);
        d7.setDate(d7.getDate() - 7);
        d7.setHours(0, 0, 0, 0);
        startDate = d7.getTime();
        break;

      case "30days":
        const d30 = new Date(now);
        d30.setDate(d30.getDate() - 30);
        d30.setHours(0, 0, 0, 0);
        startDate = d30.getTime();
        break;

      case "90days":
        const d90 = new Date(now);
        d90.setDate(d90.getDate() - 90);
        d90.setHours(0, 0, 0, 0);
        startDate = d90.getTime();
        break;

      case "currentyear":
        const startOfYear = new Date(new Date().getFullYear(), 0, 1, 0, 0, 0, 0);
        startDate = startOfYear.getTime();
        break;

      case "previousyear":
        const previousYear = new Date().getFullYear() - 1;
        startDate = new Date(previousYear, 0, 1, 0, 0, 0, 0).getTime();
        endDate = new Date(previousYear, 11, 31, 23, 59, 59, 999).getTime();
        break;

      default:
        // "all" case - no filter
        startDate = undefined;
        break;
    }

    return { startDate, endDate };
  }

  function loadDataWithTimeFilter(timeRange: string) {
    const { startDate, endDate } = getDateRangeFromFilter(timeRange);

    fetchTelemetryData({
      limit: 100,
      startDate: startDate,
      endDate: endDate
    });

    setTimeFilter(timeRange);
  }

  const prepareChartData = (timeRange: string) => {
    if (!telemetryData.length) return [];

    const groupedByDate = telemetryData.reduce<
      Record<string, { count: number }>
    >((acc, item) => {
      let key: string;
      const date = new Date(item.timestamp);

      switch (timeRange) {
        case "today":
        case "yesterday":
        case "24hours":
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
          break;
        
        case "7days":
        case "30days":
          key = date.toISOString().split("T")[0]; // YYYY-MM-DD
          break;
        
        case "90days":
        case "currentyear":
        case "previousyear":
          const startOfWeek = new Date(date);
          const day = startOfWeek.getDay();
          const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);

          startOfWeek.setDate(diff);
          startOfWeek.setHours(0, 0, 0, 0);
          
          key = startOfWeek.toISOString().split("T")[0];
          break;
        
        default:
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          key = `${year}-${month}`;
          break;
      }

      if (!acc[key]) acc[key] = { count: 0 };
      acc[key].count += 1;

      return acc;
    }, {});

    return Object.entries(groupedByDate)
      .map(([date, data]) => ({
        date,
        ...data,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const formatChartDate = (value: string) => {
    const date = new Date(value);
    
    switch (timeFilter) {
      case "today":
      case "yesterday":
      case "24hours":
        return date.toLocaleTimeString(navigator?.language ?? "en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
      
      case "7days":
      case "30days":
        return date.toLocaleDateString(navigator?.language ?? "en-US", {
          month: "short",
          day: "numeric",
        });
      
      case "90days":
      case "currentyear":
      case "previousyear":
        return date.toLocaleDateString(navigator?.language ?? "en-US", {
          month: "short",
          day: "numeric",
        });
      
      default:
        return date.toLocaleDateString(navigator?.language ?? "en-US", {
          month: "short",
          year: "numeric",
        });
    }
  };

  const formatTooltipDate = (value: string) => {
    const date = new Date(value);
    
    switch (timeFilter) {
      case "today":
      case "yesterday":
      case "24hours":
        const datePart24 = date.toLocaleDateString(navigator?.language ?? "en-US", {
          month: "short",
          day: "numeric",
          year: "numeric"
        });
        const timePart24 = date.toLocaleTimeString(navigator?.language ?? "en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
        return `${datePart24} - ${timePart24}`;
      
      case "7days":
      case "30days":
        return date.toLocaleDateString(navigator?.language ?? "en-US", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      
      case "90days":
      case "currentyear":
      case "previousyear":
        const endOfWeek = new Date(date);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        
        const startStr = date.toLocaleDateString(navigator?.language ?? "en-US", {
          month: "short",
          day: "numeric",
        });
        const endStr = endOfWeek.toLocaleDateString(navigator?.language ?? "en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        
        return `${startStr} - ${endStr}`;
      
      default:
        return date.toLocaleDateString(navigator?.language ?? "en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
    }
  };

  const chartData = prepareChartData(timeFilter);

  // Group by game ID instead of place ID for the place distribution
  const placeIdDistribution = telemetryData.reduce<
    Record<number, { placeid: number; count: number }>
  >((placeAcc, placeItem) => {
    // Skip items outside the current time filter range
    if (timeFilter !== "all") {
      const itemDate = new Date(placeItem.timestamp).getTime();
      const { startDate } = getDateRangeFromFilter(timeFilter);

      if (startDate && itemDate < startDate) {
        return placeAcc;
      }
    }

    if (!placeAcc[placeItem.gameid]) {
      placeAcc[placeItem.gameid] = {
        placeid: placeItem.placeid,
        count: 0,
      };
    }
    placeAcc[placeItem.gameid].count += 1;
    return placeAcc;
  }, {});

  const filteredTotalCount = Object.values(placeIdDistribution).reduce(
    (sum, item) => sum + item.count, 
    0
  );

  const placeDistributionArray = Object.entries(placeIdDistribution).map(
    ([gameid, placeData]) => ({
      placeid: Number(placeData.placeid),
      gameid: Number(gameid),
      count: placeData.count,
      percentage: (placeData.count / filteredTotalCount) * 100,
    })
  );

  const placeSortedDistribution = [...placeDistributionArray].sort((a, b) => {
    if (placeSortField === "placeid") {
      return placeSortDirection === "asc"
        ? a.placeid - b.placeid
        : b.placeid - a.placeid;

    } else if (placeSortField === "count") {
      return placeSortDirection === "asc"
        ? a.count - b.count
        : b.count - a.count;

    } else if (placeSortField === "gameid") {
      return placeSortDirection === "asc"
        ? a.gameid - b.gameid
        : b.gameid - a.gameid;

    } else {
      return placeSortDirection === "asc"
        ? a.percentage - b.percentage
        : b.percentage - a.percentage;
    }
  });

  // pagination bounds
  const placePageNumbers = [];
  const placeMaxPageButtons = 5;

  const placeIndexOfLastItem = placeCurrentPage * placeItemsPerPage;
  const placeIndexOfFirstItem = placeIndexOfLastItem - placeItemsPerPage;
  const placeCurrentItems = placeSortedDistribution.slice(
    placeIndexOfFirstItem,
    placeIndexOfLastItem
  );
  const placeTotalPages = Math.ceil(
    placeSortedDistribution.length / placeItemsPerPage
  );

  let placeStartPage = Math.max(
    1,
    placeCurrentPage - Math.floor(placeMaxPageButtons / 2)
  );
  const placeEndPage = Math.min(
    placeTotalPages,
    placeStartPage + placeMaxPageButtons - 1
  );

  if (
    placeEndPage - placeStartPage + 1 < placeMaxPageButtons &&
    placeStartPage > 1
  ) {
    placeStartPage = Math.max(1, placeEndPage - placeMaxPageButtons + 1);
  }

  for (let i = placeStartPage; i <= placeEndPage; i++) {
    placePageNumbers.push(i);
  }

  const placePaginate = (placePageNumber: number) => setPlaceCurrentPage(placePageNumber);
  
  // sort clicking
  const placeHandleSortClick = (field: SortField) => {
    if (placeSortField !== field) setPlaceSortField(field);
    setPlaceSortDirection(placeSortDirection === "asc" ? "desc" : "asc");
  };

  const placeRenderSortIcon = (field: SortField) => {
    if (placeSortField !== field) {
      return <ChevronDown className="h-4 w-4 opacity-50" />;
    }
    return placeSortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  // executor
  const executorCounts = telemetryData.reduce(
    (acc: Record<string, { total: number; failed: number }>, item: { exec: string; failed?: boolean }) => {
      if (!acc[item.exec]) {
        acc[item.exec] = { total: 0, failed: 0 };
      }
      acc[item.exec].total += 1;
      if (item.failed === true) {
        acc[item.exec].failed += 1;
      }
      return acc;
    },
    {}
  );

  const executorDistributionArray = Object.entries(executorCounts).map(
    ([exec, data]) => ({
      exec,
      count: data.total,
      percentage: (data.total / filteredTotalCount) * 100,
      failedCount: data.failed,
      failedPercentage: data.total > 0 ? (data.failed / data.total) * 100 : 0,
    })
  );

  const sortedExecutorsDistribution = [...executorDistributionArray].sort(
    (a, b) => {
      if (executorsSortField === "exec") {
        return executorsSortDirection === "asc"
          ? a.exec.localeCompare(b.exec)
          : b.exec.localeCompare(a.exec);

      } else if (executorsSortField === "count") {
        return executorsSortDirection === "asc"
          ? a.count - b.count
          : b.count - a.count;

      } else if (executorsSortField === "failedPercentage") {
        return executorsSortDirection === "asc"
          ? a.failedPercentage - b.failedPercentage
          : b.failedPercentage - a.failedPercentage;
      
      } else {
        // percentage
        return executorsSortDirection === "asc"
          ? a.percentage - b.percentage
          : b.percentage - a.percentage;
      }
    }
  );

  // executor pagination bounds
  const executorsPageNumbers = [];
  const executorsMaxPageButtons = 5;

  const executorsIndexOfLastItem = executorsCurrentPage * executorsItemsPerPage;
  const executorsIndexOfFirstItem = executorsIndexOfLastItem - executorsItemsPerPage;
  const executorsCurrentItems = sortedExecutorsDistribution.slice(
    executorsIndexOfFirstItem,
    executorsIndexOfLastItem
  );
  const executorsTotalPages = Math.ceil(
    sortedExecutorsDistribution.length / executorsItemsPerPage
  );

  let executorsStartPage = Math.max(
    1,
    executorsCurrentPage - Math.floor(executorsMaxPageButtons / 2)
  );
  const executorsEndPage = Math.min(
    executorsTotalPages,
    executorsStartPage + executorsMaxPageButtons - 1
  );

  if (
    executorsEndPage - executorsStartPage + 1 < executorsMaxPageButtons &&
    executorsStartPage > 1
  ) {
    executorsStartPage = Math.max(
      1,
      executorsEndPage - executorsMaxPageButtons + 1
    );
  }

  for (let i = executorsStartPage; i <= executorsEndPage; i++) {
    executorsPageNumbers.push(i);
  }

  const executorsPaginate = (executorsPageNumber: number) => setExecutorsCurrentPage(executorsPageNumber);
  const executorsHandleSortClick = (field: SortField) => {
    if (executorsSortField !== field) setExecutorsSortField(field);
    setExecutorsSortDirection(executorsSortDirection === "asc" ? "desc" : "asc");
  };

  const executorsRenderSortIcon = (field: SortField) => {
    if (executorsSortField !== field) {
      return <ChevronDown className="h-4 w-4 opacity-50" />;
    }
    return executorsSortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  // chart data
  const chartConfig = {
    count: {
      label: "Executions",
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;

  // pagination for raw data table
  const rawDataPageNumbers = [];
  const maxRawDataPageButtons = 5;

  const rawDataTotalPages = Math.ceil(
    telemetryData.length / rawDataItemsPerPage
  );
  const rawDataStartIndex = (rawDataCurrentPage - 1) * rawDataItemsPerPage;
  const rawDataEndIndex = Math.min(
    rawDataStartIndex + rawDataItemsPerPage,
    telemetryData.length
  );
  const paginatedRawData = telemetryData.slice(
    rawDataStartIndex,
    rawDataEndIndex
  );

  let rawDataStartPage = Math.max(
    1,
    rawDataCurrentPage - Math.floor(maxRawDataPageButtons / 2)
  );
  const rawDataEndPage = Math.min(
    rawDataTotalPages,
    rawDataStartPage + maxRawDataPageButtons - 1
  );

  if (
    rawDataEndPage - rawDataStartPage + 1 < maxRawDataPageButtons &&
    rawDataStartPage > 1
  ) {
    rawDataStartPage = Math.max(1, rawDataEndPage - maxRawDataPageButtons + 1);
  }

  for (let i = rawDataStartPage; i <= rawDataEndPage; i++) {
    rawDataPageNumbers.push(i);
  }

  const paginateRawData = (pageNumber: number) => setRawDataCurrentPage(pageNumber);

  return (
    <GameCacheProvider>
      <div className="space-y-6">
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Analytics</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">
            mspaint analytics
          </h2>

          <div className="flex items-center gap-2">
            <Select
              value={timeFilter}
              onValueChange={loadDataWithTimeFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>

                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>

                <SelectItem value="24hours">Last 24 Hours</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>

                <SelectItem value="currentyear">Current Year</SelectItem>
                <SelectItem value="previousyear">Previous Year</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                loadDataWithTimeFilter(timeFilter);
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Filter className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {stats ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Telemetry Records
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalCount.toLocaleString(navigator?.language ?? "en-US")}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Unique Places
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.uniquePlaceIds.toLocaleString(navigator?.language ?? "en-US")}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Unique Games
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.uniqueGameIds.toLocaleString(navigator?.language ?? "en-US")}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Unique Executors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.uniqueExecutors.toLocaleString(navigator?.language ?? "en-US")}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Last Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-medium">
                    {stats.mostRecentTimestamp
                      ? new Date(stats.mostRecentTimestamp).toLocaleString(navigator?.language ?? "en-US")
                      : "No activity"}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            // Skeleton loaders for stats
            Array(5)
              .fill(0)
              .map((_, i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Loading
                    </CardTitle>                    
                    {/* <Skeleton className="h-4 w-[140px]" /> */}
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-[100px]" />
                  </CardContent>
                </Card>
              ))
          )}
        </div>

        {/* Charts and Tables in Tabs */}
        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger
              value="chart"
              className="data-[state=active]:bg-[rgb(25,25,25)]"
            >
              Activity Chart
            </TabsTrigger>
            <TabsTrigger
              value="places"
              className="data-[state=active]:bg-[rgb(25,25,25)]"
            >
              Place Distribution
            </TabsTrigger>
            <TabsTrigger
              value="executors"
              className="data-[state=active]:bg-[rgb(25,25,25)]"
            >
              Executor Distribution
            </TabsTrigger>
            <TabsTrigger
              value="table"
              className="data-[state=active]:bg-[rgb(25,25,25)]"
            >
              Raw Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chart">
            <Card>
              <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
                <div className="grid flex-1 gap-1 text-center sm:text-left">
                  <CardTitle>Telemetry Activity Over Time</CardTitle>
                  <CardDescription>
                    {getDateFilterName(timeFilter)}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                {chartData.length > 0 ? (
                  <ChartContainer
                    config={chartConfig}
                    className="aspect-auto h-[350px] w-full"
                  >
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient
                          id="fillCount"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="var(--color-count)"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="var(--color-count)"
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        minTickGap={32}
                        tickFormatter={formatChartDate}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            labelFormatter={formatTooltipDate}
                            indicator="dot"
                          />
                        }
                      />
                      <Area
                        dataKey="count"
                        type="monotone"
                        fill="url(#fillCount)"
                        stroke="var(--color-count)"
                        strokeWidth={2}
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                    </AreaChart>
                  </ChartContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[350px]">
                    <BarChart2 className="h-10 w-10 text-gray-400" />
                    <p className="mt-2 text-gray-500">
                      {isLoading ? "Loading data please wait..." : "No data available for the selected time period"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="places">
            <Card>
              <CardHeader>
                <CardTitle>Place ID Distribution</CardTitle>
                <CardDescription>
                  Activity breakdown by Place ID - Click column headers to sort - Filter: {getDateFilterName(timeFilter)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {placeSortedDistribution.length > 0 ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => placeHandleSortClick("gameid")}
                          >
                            <div className="flex items-center">
                              Game {placeRenderSortIcon("gameid")}
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50 text-right"
                            onClick={() => placeHandleSortClick("count")}
                          >
                            <div className="flex items-center justify-end">
                              Count {placeRenderSortIcon("count")}
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50 text-right"
                            onClick={() => placeHandleSortClick("percentage")}
                          >
                            <div className="flex items-center justify-end">
                              Percentage {placeRenderSortIcon("percentage")}
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {placeCurrentItems.map(
                          ({ placeid, gameid, count, percentage }) => (
                            <TableRow key={placeid}>
                              <TableCell>
                                <GameInfoComponent
                                  gameid={gameid}
                                  placeid={placeid}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                {count}
                              </TableCell>
                              <TableCell className="text-right">
                                {percentage.toFixed(1)}%
                              </TableCell>
                            </TableRow>
                          )
                        )}
                      </TableBody>
                    </Table>

                    {/* Place Pagination controls */}
                    {placeTotalPages > 0 && (
                      <div className="mt-4 flex items-center relative">
                        <div className="flex items-center mr-4 absolute left-0">
                          <span className="mr-2 text-sm text-muted-foreground">
                            Items per page:
                          </span>
                          <input
                            type="number"
                            min="5"
                            max="100"
                            value={placeItemsPerPage}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              if (value >= 5 && value <= 100) {
                                setPlaceItemsPerPage(value);
                                setPlaceCurrentPage(1);
                              }
                            }}
                            className="w-16 h-8 rounded-md border border-input px-2 text-sm"
                          />
                        </div>

                        <Pagination className="ml-auto">
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={() =>
                                  placePaginate(
                                    Math.max(1, placeCurrentPage - 1)
                                  )
                                }
                                className={
                                  placeCurrentPage === 1
                                    ? "pointer-events-none opacity-50"
                                    : "cursor-pointer"
                                }
                              />
                            </PaginationItem>

                            {placeStartPage > 1 && (
                              <>
                                <PaginationItem>
                                  <PaginationLink
                                    onClick={() => placePaginate(1)}
                                  >
                                    1
                                  </PaginationLink>
                                </PaginationItem>
                                {placeStartPage > 2 && (
                                  <PaginationItem>
                                    <PaginationLink className="cursor-default">
                                      ...
                                    </PaginationLink>
                                  </PaginationItem>
                                )}
                              </>
                            )}

                            {placePageNumbers.map((number) => (
                              <PaginationItem key={number}>
                                <PaginationLink
                                  onClick={() => placePaginate(number)}
                                  isActive={placeCurrentPage === number}
                                >
                                  {number}
                                </PaginationLink>
                              </PaginationItem>
                            ))}

                            {placeEndPage < placeTotalPages && (
                              <>
                                {placeEndPage < placeTotalPages - 1 && (
                                  <PaginationItem>
                                    <PaginationLink className="cursor-default">
                                      ...
                                    </PaginationLink>
                                  </PaginationItem>
                                )}
                                <PaginationItem>
                                  <PaginationLink
                                    onClick={() =>
                                      placePaginate(placeTotalPages)
                                    }
                                  >
                                    {placeTotalPages}
                                  </PaginationLink>
                                </PaginationItem>
                              </>
                            )}

                            <PaginationItem>
                              <PaginationNext
                                onClick={() =>
                                  placePaginate(
                                    Math.min(
                                      placeTotalPages,
                                      placeCurrentPage + 1
                                    )
                                  )
                                }
                                className={
                                  placeCurrentPage === placeTotalPages
                                    ? "pointer-events-none opacity-50"
                                    : "cursor-pointer"
                                }
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}

                    <div className="text-center text-sm text-muted-foreground mt-2">
                      Showing {placeIndexOfFirstItem + 1}-{Math.min(placeIndexOfLastItem, placeDistributionArray.length)} of{" "}
                      {placeDistributionArray.length} items
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[200px]">
                    <p className="text-gray-500">
                      No data available for the selected time period
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="executors">
            <Card>
              <CardHeader>
                <CardTitle>Executor Distribution</CardTitle>
                <CardDescription>
                  Activity breakdown by Executor - Click column headers to sort
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sortedExecutorsDistribution.length > 0 ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => executorsHandleSortClick("exec")}
                          >
                            <div className="flex items-center">
                              Executor {executorsRenderSortIcon("exec")}
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50 text-right"
                            onClick={() => executorsHandleSortClick("count")}
                          >
                            <div className="flex items-center justify-end">
                              Count {executorsRenderSortIcon("count")}
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50 text-right"
                            onClick={() =>
                              executorsHandleSortClick("percentage")
                            }
                          >
                            <div className="flex items-center justify-end">
                              Percentage {executorsRenderSortIcon("percentage")}
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50 text-right"
                            onClick={() =>
                              executorsHandleSortClick("failedPercentage")
                            }
                          >
                            <div className="flex items-center justify-end">
                              Failed Percentage {executorsRenderSortIcon("failedPercentage")}
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {executorsCurrentItems.map(
                          ({ exec, count, percentage, failedCount, failedPercentage }) => (
                            <TableRow key={exec}>
                              <TableCell className="text-left">
                                {exec}
                              </TableCell>
                              <TableCell className="text-right">
                                {count}
                              </TableCell>
                              <TableCell className="text-right">
                                {percentage.toFixed(1)}%
                              </TableCell>
                              <TableCell className="text-right">
                                {failedPercentage.toFixed(1)}% ({failedCount.toLocaleString(navigator?.language ?? "en-US")}/{count.toLocaleString(navigator?.language ?? "en-US")})
                              </TableCell>
                            </TableRow>
                          )
                        )}
                      </TableBody>
                    </Table>

                    {/* Executors Pagination controls */}
                    {executorsTotalPages > 0 && (
                      <div className="mt-4 flex items-center relative">
                        <div className="flex items-center mr-4 absolute left-0">
                          <span className="mr-2 text-sm text-muted-foreground">
                            Items per page:
                          </span>
                          <input
                            type="number"
                            min="5"
                            max="100"
                            value={executorsItemsPerPage}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              if (value >= 5 && value <= 100) {
                                setExecutorsItemsPerPage(value);
                                setExecutorsCurrentPage(1);
                              }
                            }}
                            className="w-16 h-8 rounded-md border border-input px-2 text-sm"
                          />
                        </div>

                        <Pagination className="ml-auto">
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={() =>
                                  executorsPaginate(
                                    Math.max(1, executorsCurrentPage - 1)
                                  )
                                }
                                className={
                                  executorsCurrentPage === 1
                                    ? "pointer-events-none opacity-50"
                                    : "cursor-pointer"
                                }
                              />
                            </PaginationItem>

                            {executorsStartPage > 1 && (
                              <>
                                <PaginationItem>
                                  <PaginationLink
                                    onClick={() => executorsPaginate(1)}
                                  >
                                    1
                                  </PaginationLink>
                                </PaginationItem>
                                {executorsStartPage > 2 && (
                                  <PaginationItem>
                                    <PaginationLink className="cursor-default">
                                      ...
                                    </PaginationLink>
                                  </PaginationItem>
                                )}
                              </>
                            )}

                            {executorsPageNumbers.map((number) => (
                              <PaginationItem key={number}>
                                <PaginationLink
                                  onClick={() => executorsPaginate(number)}
                                  isActive={executorsCurrentPage === number}
                                >
                                  {number}
                                </PaginationLink>
                              </PaginationItem>
                            ))}

                            {executorsEndPage < executorsTotalPages && (
                              <>
                                {executorsEndPage < executorsTotalPages - 1 && (
                                  <PaginationItem>
                                    <PaginationLink className="cursor-default">
                                      ...
                                    </PaginationLink>
                                  </PaginationItem>
                                )}
                                <PaginationItem>
                                  <PaginationLink
                                    onClick={() =>
                                      executorsPaginate(executorsTotalPages)
                                    }
                                  >
                                    {executorsTotalPages}
                                  </PaginationLink>
                                </PaginationItem>
                              </>
                            )}

                            <PaginationItem>
                              <PaginationNext
                                onClick={() =>
                                  executorsPaginate(
                                    Math.min(
                                      executorsTotalPages,
                                      executorsCurrentPage + 1
                                    )
                                  )
                                }
                                className={
                                  executorsCurrentPage === executorsTotalPages
                                    ? "pointer-events-none opacity-50"
                                    : "cursor-pointer"
                                }
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}

                    <div className="text-center text-sm text-muted-foreground mt-2">
                      Showing {executorsIndexOfFirstItem + 1}-{Math.min(executorsIndexOfLastItem, executorDistributionArray.length)} of{" "}
                      {executorDistributionArray.length} items
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[200px]">
                    <p className="text-gray-500">
                      No data available for the selected time period
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="table">
            <Card>
              <CardHeader>
                <CardTitle>Telemetry Raw Data</CardTitle>
                <CardDescription>
                  Showing {paginatedRawData.length} of {totalCount} records
                </CardDescription>
              </CardHeader>
              <CardContent>
                {telemetryData.length > 0 ? (
                  <>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Executor</TableHead>
                            <TableHead>Game</TableHead>
                            <TableHead>Timestamp</TableHead>
                            <TableHead>Loaded</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedRawData.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {item.exec} ({item.execver ?? "0.0.0.0"})
                              </TableCell>
                              <TableCell>
                                <GameInfoComponent
                                  gameid={item.gameid}
                                  placeid={item.placeid}
                                />
                              </TableCell>
                              <TableCell>
                                {new Date(item.timestamp).toLocaleString(navigator?.language ?? "en-US")}
                              </TableCell>
                              {typeof item.failed != "boolean" ? <TableCell>No Data</TableCell> : <TableCell>
                                {item.failed == true ? "❌" : "✔️"} — {item.loading == true ? "Game" : "Loader"}
                              </TableCell>}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Raw Data Pagination controls */}
                    {telemetryData.length > 0 && (
                      <div className="mt-4 flex items-center relative">
                        <div className="flex items-center mr-4 absolute left-0">
                          <span className="mr-2 text-sm text-muted-foreground">
                            Items per page:
                          </span>
                          <input
                            type="number"
                            min="5"
                            max="100"
                            value={rawDataItemsPerPage}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              if (value >= 5 && value <= 100) {
                                setRawDataItemsPerPage(value);
                                setRawDataCurrentPage(1); // Reset to first page
                              }
                            }}
                            className="w-16 h-8 rounded-md border border-input px-2 text-sm"
                          />
                        </div>

                        <Pagination className="ml-auto">
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={() =>
                                  paginateRawData(
                                    Math.max(1, rawDataCurrentPage - 1)
                                  )
                                }
                                className={
                                  rawDataCurrentPage === 1
                                    ? "pointer-events-none opacity-50"
                                    : "cursor-pointer"
                                }
                              />
                            </PaginationItem>

                            {rawDataStartPage > 1 && (
                              <>
                                <PaginationItem>
                                  <PaginationLink
                                    onClick={() => paginateRawData(1)}
                                  >
                                    1
                                  </PaginationLink>
                                </PaginationItem>
                                {rawDataStartPage > 2 && (
                                  <PaginationItem>
                                    <PaginationLink className="cursor-default">
                                      ...
                                    </PaginationLink>
                                  </PaginationItem>
                                )}
                              </>
                            )}

                            {rawDataPageNumbers.map((number) => (
                              <PaginationItem key={number}>
                                <PaginationLink
                                  onClick={() => paginateRawData(number)}
                                  isActive={rawDataCurrentPage === number}
                                >
                                  {number}
                                </PaginationLink>
                              </PaginationItem>
                            ))}

                            {rawDataEndPage < rawDataTotalPages && (
                              <>
                                {rawDataEndPage < rawDataTotalPages - 1 && (
                                  <PaginationItem>
                                    <PaginationLink className="cursor-default">
                                      ...
                                    </PaginationLink>
                                  </PaginationItem>
                                )}
                                <PaginationItem>
                                  <PaginationLink
                                    onClick={() =>
                                      paginateRawData(rawDataTotalPages)
                                    }
                                  >
                                    {rawDataTotalPages}
                                  </PaginationLink>
                                </PaginationItem>
                              </>
                            )}

                            <PaginationItem>
                              <PaginationNext
                                onClick={() =>
                                  paginateRawData(
                                    Math.min(
                                      rawDataTotalPages,
                                      rawDataCurrentPage + 1
                                    )
                                  )
                                }
                                className={
                                  rawDataCurrentPage === rawDataTotalPages
                                    ? "pointer-events-none opacity-50"
                                    : "cursor-pointer"
                                }
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}

                    <div className="text-center text-sm text-muted-foreground mt-2">
                      Showing {rawDataStartIndex + 1}-{rawDataEndIndex} of{" "}
                      {telemetryData.length} items
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[200px]">
                    <Clock className="h-10 w-10 text-gray-400" />
                    <p className="mt-2 text-gray-500">
                      No data available for the selected time period
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                {hasMore && (
                  <Button
                    onClick={() => {
                      const { startDate, endDate } = getDateRangeFromFilter(timeFilter);
                      fetchTelemetryData({
                        limit: 20,
                        offset: telemetryData.length,
                        startDate: startDate,
                        endDate: endDate
                      })
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                        Loading...
                      </>
                    ) : (
                      "Load More"
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </GameCacheProvider>
  );
}