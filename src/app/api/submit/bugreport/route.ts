import { auth } from "@/auth";
import { imageAllowedTypes, isValidVideoPlatform, maxImageFileSize } from "@/data/submit/bugreport";
import { generateId, getFileExtension } from "@/data/submit/all";
import { executorsList } from "@/data/executors";
import { gamesList } from "@/data/games";
import { rateLimitService } from "@/server/ratelimit";
import { NextRequest, NextResponse } from "next/server";
import { z } from 'zod';

const customGameList = [ "mspaint", "Universal", ...gamesList ];

const schema = z.object({
  user_id: z.string(),

  title: z.string().min(1).max(50),
  description: z.string().min(25).max(500),
  game: z
    .string()
    .refine((game) => customGameList.includes(game), {
      message: "Invalid game provided.",
    }),
  executor: z
    .string()
    .refine((exec) => executorsList.includes(exec), {
      message: "Invalid executor provided.",
    }),

  console: z
    .instanceof(File)
    .optional()
    .refine((file) => !file || imageAllowedTypes.includes(file.type), {
      message: "Invalid console screenshot file type.",
    })
    .refine((file) => !file || file.size <= maxImageFileSize * (1024 * 1024), {
      message: "Console screenshot is over the size limit.",
    }),
  video: z
    .string()
    .optional()
    .refine((url) => !url || isValidVideoPlatform(url), {
      message: "Invalid Video URL provided."
    })
});

function formDataToObject(formData: FormData, ignoreFile?: boolean): Record<string, string | File> {
  const obj: Record<string, string | File> = {};

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

  const limiter_success = rateLimitService.getLimiter("bugreports");
  const { success: canBugReport, reset: requestAfterSuccess } = await limiter_success.limit(discordId);
  if (!canBugReport) {
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
    await rateLimitService.trackRequest("bugreports", discordId);

    // check for mspaint bot //
    const response = await fetch(
        "https://irc.mspaint.cc/v1/users/1300942082076053554",
        { cache: "force-cache", next: { revalidate: 120 } } // 2 minutes
    );

    if (!response.ok) return NextResponse.json({ status: "error", error: [{ message: "Could not verify if the mspaint bot is online, please try again later." }] }, { status: 400 });

    const botInformation = await response.json();
    if (botInformation?.data?.discord_status !== "online") return NextResponse.json({ status: "error", error: [{ message: "The mspaint bot is offline, please try again later." }] }, { status: 400 });

    // send bug report data //
    const bugReportId = generateId();
    const bugReportJson = formDataToObject(rawFormData, true);
    bugReportJson["__id"] = bugReportId.toString();

    const payload = {
      content:
        "------BUGREPORT------\n" +
        "```\n-----------------------BEGINJSONDATA-----------------------\n" +
                      `${JSON.stringify(bugReportJson)}\n` +
        "-----------------------ENDJSONDATA-----------------------```"
    };

    const discordForm = new FormData();
    discordForm.append("payload_json", JSON.stringify(payload));
    if (data.console) discordForm.append("file", data.console, `image.${getFileExtension(data.console.name)}`);

    await fetch(process.env.DISCORD_BUGREPORT_WEBHOOK!, {
      method: "POST",
      body: discordForm
    });

    return NextResponse.json({ status: "finished", success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { status: "error", error: [{ message: "Internal server error (submit/bugreport)" }] },
      { status: 500 }
    );
  }
}