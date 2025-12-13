"use client";

import React from "react";
import { Card, CardHeader } from "./ui/card";
import { CircleMinus, CircleCheck, CircleAlert, BanIcon } from "lucide-react";
import Image from "next/image";

import { useUIState } from "./obsidian/UIStateProvider";
import { MenuMapping } from "@/data/features";

const FadeText = ({ children, width }: { children:  React.ReactNode, width: number }) => (
  <div
    style={{
      width,
      textAlign: "left",
      display: "block",
      overflow: "hidden",
      whiteSpace: "nowrap",
      WebkitMaskImage: "linear-gradient(to right, black 70%, transparent 95%)",
      maskImage: "linear-gradient(to right, black 70%, transparent 95%)",
    }}
  >
    {children}
  </div>
);

export default function GameCard({ 
  title,
  mappingName,
  image, 
  placeId,
  status, 
  issues, 
  gamesStatusData 
}: { title: string, mappingName: string, image: string, placeId: number | undefined, status?: boolean, issues?: boolean, gamesStatusData: { [key: string]: string } }) {
  const uiState = useUIState();
  
  // handle icon //
  let statusEmoji = title in gamesStatusData ? gamesStatusData[title] : "🟢";
  if (status == false) {
    statusEmoji = "🔴";
  } else if (status == true) {
    if (issues == true) statusEmoji = "🟡";
    else                statusEmoji = "🟢";
  }

  // handle status icon elemenet //
  let statusIcon = <CircleCheck className="text-green-500" />;
  switch (statusEmoji) {
    case "🟡":
      statusIcon = <CircleAlert className="text-yellow-500" />
      break;

    case "🔴":
      statusIcon = <CircleMinus className="text-red-500" />
      break;

    case "❌":
      statusIcon = <BanIcon className="text-red-500" />
      break;
    
    default:
      break;
  }

  return (
    <Card className="w-72 bg-zinc-900 text-white overflow-hidden">
      <div className="h-40 w-full overflow-hidden">
        <Image 
          src={image} 
          alt={title}
          width={0} height={0} sizes={"100vw"}
          className="w-full h-full object-cover cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            uiState.setGame(mappingName);
            
            const el = document.getElementById("features")
            if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset, behavior: "smooth" });
          }}
        />
      </div>
      
      <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
        <FadeText width={255}>
          <a
            className="text-ls font-semibold transition-all duration-300 underline decoration-transparent hover:decoration-white"
            target="_blank"
            href={`https://roblox.com/games/${placeId}/${title}`}
          >
            {title}
          </a>
        </FadeText>

        {statusIcon}
      </CardHeader>
    </Card>
  );
}