import { NextRequest, NextResponse } from "next/server";
import { ipAddress } from "@vercel/functions";
import { kv } from "@vercel/kv";
import z from "zod";

const placeid = "16732694052";
const RATE_LIMIT = 2; // 5 requests per minute
const WINDOW_TIME = 60; // 60 seconds (1 minute)

const ImageMappings = {
  FischFright: "",
  Beluga: "https://static.wikitide.net/fischwiki/5/5b/Beluga.png",
  "Apex Leviathan":
    "https://static.wikitide.net/fischwiki/4/4a/Apex_Leviathan.png",
  "Bloop Fish": "https://static.wikitide.net/fischwiki/f/f3/Bloop_Fish.png",
  "Cosmic Relic": "https://static.wikitide.net/fischwiki/a/a2/Cosmic_Relic.png",
  Earthquake: "",
  "Emoji Fishes": "https://static.wikitide.net/fischwiki/a/a7/%F0%9F%90%9F.png",
  "Colossal Blue Dragon":
    "https://static.wikitide.net/fischwiki/7/74/Colossal_Blue_Dragon.png",
  "Colossal Ancient Dragon":
    "https://static.wikitide.net/fischwiki/0/01/Colossal_Ancient_Dragon.png",
  "Colossal Ethereal Dragon":
    "https://static.wikitide.net/fischwiki/2/2c/Colossal_Ethereal_Dragon.png",
  Mosslurker: "https://static.wikitide.net/fischwiki/9/9d/Mosslurker.png",
  Narwhal: "https://static.wikitide.net/fischwiki/e/ed/Narwhal.png",
  "Magician Narwhal":
    "https://static.wikitide.net/fischwiki/0/0a/Magician_Narwhal.png",
  "Blue Moon Pool": "",
  "Whales Pool": "https://static.wikitide.net/fischwiki/d/dc/Blue_Whale.png",
  "Forsaken Veil - Scylla":
    "https://static.wikitide.net/fischwiki/6/60/Scylla.png",
  "Orcas Pool": "https://static.wikitide.net/fischwiki/7/75/Orca.png",
  "Ancient Orcas Pool":
    "https://static.wikitide.net/fischwiki/c/c3/Ancient_Orca.png",
  "Megalodon Default":
    "https://static.wikitide.net/fischwiki/3/36/Megalodon.png",
  "Megalodon Ancient":
    "https://static.wikitide.net/fischwiki/b/bf/Ancient_Megalodon.png",
  "Birthday Megalodon":
    "https://static.wikitide.net/fischwiki/a/a8/Birthday_Megalodon.png",
  "Whale Shark": "https://static.wikitide.net/fischwiki/9/91/Whale_Shark.png",
  "Great Hammerhead Shark":
    "https://static.wikitide.net/fischwiki/5/50/Great_Hammerhead_Shark.png",
  "Great White Shark":
    "https://static.wikitide.net/fischwiki/4/46/Great_White_Shark.png",
  "The Kraken Pool":
    "https://static.wikitide.net/fischwiki/e/eb/The_Kraken.png",
  "Ancient Kraken Pool":
    "https://static.wikitide.net/fischwiki/2/24/Ancient_Kraken.png",
} as const;

type EventType = keyof typeof ImageMappings;

const schema = z.object({
  event: z.enum(Object.keys(ImageMappings) as [EventType, ...EventType[]]),
  cycle: z.enum(["Day", "Night"]),
  uptime: z.number(),
  jobid: z.string().uuid(),
});

function serverUptime(uptime: number) {
  const seconds = Math.floor(uptime);

  // If less than 60 seconds, show seconds
  if (seconds < 60) {
    return `${seconds} seconds`;
  }

  const minutes = seconds / 60;

  // If less than 60 minutes, show minutes with 2 decimals
  if (minutes < 60) {
    return `${minutes.toFixed(2)} minutes`;
  }

  const hours = seconds / 3600;

  // If less than 24 hours, show hours with 2 decimals
  if (hours < 24) {
    return `${hours.toFixed(2)} hours`;
  }

  // Otherwise show days with 2 decimals
  const days = seconds / 86400;
  return `${days.toFixed(2)} days`;
}

async function checkRateLimit(ip: string): Promise<boolean> {
  const key = `ratelimit:${ip}`;

  const count = (await kv.get<number>(key)) || 0;
  const ttl = await kv.ttl(key);

  if (count === 0) {
    await kv.set(key, 1, { ex: WINDOW_TIME });
    return true;
  } else if (count < RATE_LIMIT) {
    await kv.incr(key);

    if (ttl < 0 || ttl < WINDOW_TIME / 2) {
      await kv.expire(key, WINDOW_TIME);
    }
    return true;
  } else {
    return false;
  }
}

async function getIp(headersList: Headers, request?: NextRequest) {
  if (request) {
    if (ipAddress(request)) return ipAddress(request);
  }

  const forwarded = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");

  if (forwarded) return forwarded.split(",")[0].trim();
  if (realIp) return realIp.trim();

  return undefined;
}

function getHWID(headers: Headers) {
  let fingerprint = "not found";

  if (headers !== undefined && headers instanceof Headers) {
    headers.forEach((value: string, name: string) => {
      const val_name = name.toLocaleLowerCase();

      const is_fingerprint =
        val_name.includes("fingerprint") || val_name.includes("hwid");
      const value_exists = value != undefined && value != null && value != "";

      if (is_fingerprint && value_exists) {
        fingerprint = value;
      }
    });
  }

  if (
    headers !== undefined &&
    headers instanceof Headers &&
    fingerprint === "not found"
  ) {
    headers.forEach((value: string, name: string) => {
      const val_name = name.toLocaleLowerCase();

      const is_identifier = val_name.includes("identifier");
      const value_exists = value != undefined && value != null && value != "";

      if (is_identifier && value_exists) {
        fingerprint = value;
      }
    });
  }

  return fingerprint;
}

export async function POST(req: NextRequest) {
  const fingerprint = getHWID(req.headers);

  if (fingerprint === "not found") {
    return NextResponse.json({ status: "error", error: "Failed" });
  }

  const ip = await getIp(req.headers, req);

  if (!ip) {
    return NextResponse.json({
      status: "error",
      error: "Could not determine client IP",
    });
  }

  const allowed = await checkRateLimit(ip);
  if (!allowed)
    return NextResponse.json({
      status: "error",
      error: "Rate limit exceeded. Try again in later.",
    });

  const rawData = await req.json();
  const { success, error, data } = schema.safeParse(rawData);

  if (!success) {
    return NextResponse.json({ status: "error", error: error.issues });
  }

  const webhook_data = {
    content: "<@&1435283020046139574>",
    embeds: [
      {
        title: "Global Event Tracker | <:mspaint:1299074827583230085> mspaint",
        description:
          "An event has been registered in a server where an mspaint user that opted into global webhooks.",
        fields: [
          {
            name: "[Event]",
            value: `<:connect:1435289140185923704> **Event:** ${
              data.event
            }\n<:reply:1435289154983297074> **Time:** <t:${Math.floor(
              Date.now() / 1000
            )}:R>`,
            inline: true,
          },
          {
            name: "[Server Info]",
            value: `<:connect:1435289140185923704> **Time Cycle:** ${
              data.cycle
            } ${
              data.cycle == "Day" ? "☀️" : "🌙"
            }\n<:reply:1435289154983297074> **Uptime:** ||\`${serverUptime(
              data.uptime
            )}\`||`,
            inline: true,
          },
        ],
        footer: {
          text: "discord.gg/mspaint",
          icon_url: "https://mspaint.cc/icon.png",
        },
      } as {
        [key: string]: unknown;
      },
    ],
    attachments: [],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            url: `https://externalrobloxjoiner.vercel.app/join?placeId=${placeid}&jobId=${encodeURIComponent(
              data.jobid
            )}`,
            label: "Join Server",
          },
        ],
      },
    ],
  };

  if (data.event in ImageMappings && ImageMappings[data.event] !== "") {
    webhook_data.embeds[0].image = {
      url: ImageMappings[data.event],
    };
  }

  const response = await fetch(
    // Make sure the Webhook URL has ?wait=true&with_components=true at the end for anyone self-hosting
    process.env.FISCH_EVENTS_WEBHOOK_URL!,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(webhook_data),
    }
  );

  if (!response.ok) {
    return NextResponse.json({
      status: "error",
      error: "Failed to send webhook",
    });
  }

  return NextResponse.json({ status: "ok" });
}
