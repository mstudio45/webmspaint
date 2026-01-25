import { auth } from "@/auth";
import { generateId, getFileExtension } from "@/data/submit/all";
import { gamesList } from "@/data/games";
import { rateLimitService } from "@/server/ratelimit";
import { NextRequest, NextResponse } from "next/server";
import { z } from 'zod';
import { GetUserSubscription } from "@/server/dashutils";
import { normalizeEpochMs } from "@/lib/utils";

const customGameList = [ "mspaint", "Universal", ...gamesList ];

const schema = z.object({
  user_id: z.string(),

  title: z.string().min(1).max(50),
  description: z.string().min(25).max(500),
  game: z
    .string()
    .refine((game) => customGameList.includes(game), {
      message: "Invalid game provided.",
    })
});

function formDataToObject(formData: FormData, ignoreFile?: boolean): Record<string, string | File | boolean> {
  const obj: Record<string, string | File | boolean> = {};

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      if (ignoreFile !== true) obj[key] = value;
    } else {
      obj[key] = value.toString();
    }
  }

  return obj;
}

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
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ status: "error", error: [{ message: "Unauthorized" }] }, { status: 401 });
  }

  const discordId = session.user.id;
  if (!discordId) {
    return NextResponse.json({ status: "error", error: [{ message: "User ID not found" }] }, { status: 400 });
  }

  // fetch stuff
  const rawFormData = await request.formData();
  const rawJsonData = formDataToObject(rawFormData);
  const { success, error, data } = schema.safeParse(rawJsonData);

  if (!success) {
    return NextResponse.json({ status: "error", error: error.issues }, { status: 400 });
  }

  if (discordId !== data.user_id) {
    return NextResponse.json({ status: "error", error: [{ message: "Invalid User ID" }] }, { status: 400 });
  }

  const limiter_success = rateLimitService.getLimiter("suggestions");
  const { success: canSuggestion, reset: requestAfterSuccess } = await limiter_success.limit(discordId);
  if (!canSuggestion) {
    const waitTime = formatWaitTime(requestAfterSuccess - Date.now());
    return NextResponse.json(
      {
        status: "error", error: [{ message: `Rate limit reached! Please wait ${waitTime}.` }],
      },
      { status: 429 }
    );
  }

  try {
    // track cooldown request //
    await rateLimitService.trackRequest("suggestions", discordId);

    const subscription = await GetUserSubscription(discordId);
    if (!subscription) {
      return NextResponse.json({ status: "error", error: [{ message: "Unauthorized" }] }, { status: 401 });
    }
    
    const expirationDate = normalizeEpochMs(subscription?.expires_at) ?? 0;
    const userStatus: string = subscription ? subscription.user_status : "unlink";

    const isMember = subscription != null;
    const isLifetime = expirationDate == -1;
    const isKeySystem = subscription?.from_key_system === true;

    const isResetState = userStatus === "reset";
    const isBanned = userStatus === "banned" || subscription?.is_banned;
    const isSubscriptionActive = (!isBanned && isMember) && (userStatus === "active" || isResetState || isLifetime);
    const isPostBanned = subscription?.is_post_banned === true;
    
    if (!isKeySystem && !isSubscriptionActive) return NextResponse.json({ status: "error", error: [{ message: "Unauthorized" }] }, { status: 401 });
    if (isPostBanned || isBanned) return NextResponse.json({ status: "error", error: [{ message: "Banned" }] }, { status: 401 });

    // check for mspaint bot //
    try {
      const response = await fetch(
          "https://irc.mspaint.cc/v1/users/1300942082076053554",
          { cache: "force-cache", next: { revalidate: 30 } }
      );

      if (!response.ok) return NextResponse.json({ status: "error", error: [{ message: "Could not verify if the mspaint bot is online, please try again later." }] }, { status: 400 });
      
      const botInformation = await response.json();
      if (botInformation?.data?.discord_status !== "online") return NextResponse.json({ status: "error", error: [{ message: "The mspaint bot is offline, please try again later." }] }, { status: 400 });
    } catch (error) {
      return NextResponse.json({ status: "error", error: [{ message: "Could not verify if the mspaint bot is online, please try again later." }] }, { status: 400 });
    }

    // send suggestion data //
    const suggestionId = generateId();
    const suggestionJson = formDataToObject(rawFormData, true);
    suggestionJson["__id"] = suggestionId.toString();
    suggestionJson["__key_system"] = isKeySystem;

    const payload = {
      content:
        "------SUGGESTION------\n" +
        "```\n-----------------------BEGINJSONDATA-----------------------\n" +
                    `${JSON.stringify(suggestionJson)}\n` +
        "-----------------------ENDJSONDATA-----------------------```"
    };

    const discordForm = new FormData();
    discordForm.append("payload_json", JSON.stringify(payload));

    await fetch(process.env.DISCORD_SUGGESTION_WEBHOOK!, {
      method: "POST",
      body: discordForm
    });

    return NextResponse.json({ status: "finished", success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { status: "error", error: [{ message: "Internal server error (submit/suggestion)" }] },
      { status: 500 }
    );
  }
}