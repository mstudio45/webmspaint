import {
  ResetHardwareIDWithLuarmor,
  SyncSingleLuarmorUserByDiscord,
  SyncSingleLuarmorUserByLRMSerial,
} from "@/server/dashutils";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitService } from "@/server/ratelimit";
import { isUserAllowedOnDashboard } from "@/server/authutils";

function formatWaitTime(remainingMs: number): string {
  const hours = Math.floor(remainingMs / 1000 / 60 / 60);
  const minutes = Math.floor((remainingMs / 1000 / 60) % 60);
  const seconds = Math.floor((remainingMs / 1000) % 60);
  
  const timeParts = [];
  if (hours > 0) timeParts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
  if (minutes > 0) timeParts.push(`${minutes} minute${minutes !== 1 ? "s" : ""}`);
  if (seconds > 0) timeParts.push(`${seconds} second${seconds !== 1 ? "s" : ""}`);
  
  return timeParts.join(" ") || "0 seconds";
}

export async function POST(request: NextRequest) {
  let lrm_serial: string;
  try {
    const body = await request.json();
    lrm_serial = body.lrm_serial;
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  if (!lrm_serial) {
    return NextResponse.json(
      { error: "Missing lrm_serial" },
      { status: 400 }
    );
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const discordId = session.user.id;
  if (!discordId) {
    return NextResponse.json({ error: "User ID not found" }, { status: 400 });
  }

  const isAdmin = await isUserAllowedOnDashboard();
  if (!isAdmin) {
    // success cooldown //
    const limiter_success = rateLimitService.getLimiter("hwidreset_success");
    const { success: canResetAfterSuccess, reset: requestResetAfterSuccess } = await limiter_success.limit(discordId);
    if (!canResetAfterSuccess) {
      const waitTime = formatWaitTime(requestResetAfterSuccess - Date.now());
      return NextResponse.json(
        {
          error: `Rate limit reached: You can reset your HWID once every 6 hours. Please wait ${waitTime}.`,
        },
        { status: 429 }
      );
    }

    // request cooldown //
    const limiter_request = rateLimitService.getLimiter("hwidreset_request");
    const { success: canAttempt, reset: requestResetAttempt } = await limiter_request.limit(discordId);
    if (!canAttempt) {
      const waitTime = formatWaitTime(requestResetAttempt - Date.now());
      return NextResponse.json(
        {
          error: `Rate limit reached: You can only try to reset your HWID once every 30 minutes. Please wait ${waitTime}.`,
        },
        { status: 429 }
      );
    }
  }

  try {
    // track cooldown request //
    await rateLimitService.trackRequest("hwidreset_request", discordId);
    
    // reset hwid //
    const result = await ResetHardwareIDWithLuarmor(lrm_serial, isAdmin);
    if (result.status !== 200) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    await rateLimitService.trackRequest("hwidreset_success", discordId);

    // sync with luarmor //
    try {
      const resultSync = await SyncSingleLuarmorUserByLRMSerial(lrm_serial);
      if (resultSync.status === 200) {
        return NextResponse.json({ success: result.success });

      } else {
        const resultSync = await SyncSingleLuarmorUserByDiscord(discordId);
        if (resultSync.status === 200) {
          return NextResponse.json({ success: result.success });
        }

        throw Error(result.error || "Sync failed");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      result.success += `\nWarning: ${message}`;
    }
    
    return NextResponse.json({ success: result.success });
  } catch (error) {
    // clear the hwid thing //
    try { await rateLimitService.deleteRequest("hwidreset_success", discordId); } catch { }

    console.error(error);
    return NextResponse.json(
      { error: "Internal server error (reset-hwid)" },
      { status: 500 }
    );
  }
}