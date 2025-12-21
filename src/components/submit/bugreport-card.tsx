"use client";

import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";
import {
    FolderPen,
    ImageIcon,
    VideoIcon,
} from "lucide-react";
import { QueryResultRow } from "@vercel/postgres";

import { cn, normalizeEpochMs } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { imageUrlRegex, isValidVideoPlatform, maxImageFileSize, getVideoPlatform, imageAllowedTypes } from "@/data/submit/bugreport";
import InvalidSubscriptionCard from "./elements/InvalidSubscriptionCard";
import InputFile from "./elements/InputFile";
import ExecutorList from "./elements/ExecutorList";
import GameList from "./elements/GameList";
import Link from "next/link";

interface BugreportCardProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    session: any;
    subscription: QueryResultRow | null;
}

export default function BugreportCard({
    session,
    subscription
}: BugreportCardProps) {
    const router = useRouter();

    // values //
    const [isDisabled, setIsDisabled] = useState(true);

    const [game, setGame] = React.useState("");
    const [executor, setExecutor] = React.useState("");

    const titleRef = useRef<HTMLInputElement>(null);
    const descriptionRef = useRef<HTMLTextAreaElement>(null);
    const consoleImageRef = useRef<HTMLInputElement>(null);
    const videoImageRef = useRef<HTMLInputElement>(null);

    const [videoUrlPlatform, setVideoUrlPlatform] = useState<string | null>(null);

    useEffect(() => {
        const checkErrors = () => {
            setIsDisabled(document.querySelectorAll("#value-error").length > 0);
        };

        checkErrors();

        const observer = new MutationObserver(checkErrors);
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
        });

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (executor === "Other Executor") toast.warning("Please state the executor you are using in the description!")
    }, [executor])

    if (!session || !session.user || !session.user.id) {
        router.push("/sign-in");
        return null;
    }

    const expirationDate = normalizeEpochMs(subscription?.expires_at) ?? 0;
    const userStatus: string = subscription ? subscription.user_status : "unlink";

    // Determine subscription status
    const isMember = subscription != null;
    const isLifetime = expirationDate == -1;

    const isUnlink = userStatus === "unlink";
    const isResetState = userStatus === "reset";
    const isBanned = userStatus === "banned" || subscription?.is_banned;
    const isSubscriptionActive = (!isBanned && isMember) && (userStatus === "active" || isResetState || isLifetime);

    if (isUnlink || !isSubscriptionActive) return <InvalidSubscriptionCard text={"You don't have any active subsctiption."} textClassName={"text-orange-500"} />
    if (isBanned) return <InvalidSubscriptionCard text={"You are not allowed to report bugs."} textClassName={"text-red-500"} />

    return (
        <div className="w-full max-w-md mx-auto sm:mx-0 mt-6">
            <Card className="relative rounded-lg z-10 border-transparent">
                <CardTitle className="p-4 sm:p-6 !pb-0 w-full">
                    Bug Report
                    <hr className="mt-4" />
                </CardTitle>

                <CardContent className="flex flex-col gap-3 p-4 sm:p-6 w-full">
                    <InputFile
                        ref={titleRef}
                        id={"title"}
                        type={"text"}
                        text={"Title"}
                        icon={<FolderPen />}
                        required={true}
                        validate={(text) => {
                            if (text.trim() == "") return "Title is required.";
                            if (text.length > 50) return `Only 50 characters are allowed. (${text.length}/50)`;

                            return "";
                        }}
                    />

                    <ExecutorList value={executor} setValue={setExecutor} />
                    <GameList value={game} setValue={setGame} />

                    <InputFile
                        ref={descriptionRef}
                        id={"description"}
                        type={"text"}
                        text={"Description"}
                        icon={<FolderPen />}
                        isTextArea={true}
                        required={true}
                        validate={(text) => {
                            if (text.trim() == "") return "Description is required.";
                            if (text.length < 25) return `Minimum of 25 characters are required. (${text.length}/25)`;
                            if (text.length > 500) return `Only 500 characters are allowed. (${text.length}/500)`;

                            return "";
                        }}
                    />

                    <InputFile
                        ref={consoleImageRef}
                        id={"consoleimage"}
                        type={"file"}
                        accept={imageAllowedTypes.join(", ")}
                        text={"Console Screenshot (F9, /console)"}
                        icon={<ImageIcon />}
                        validate={(data) => {
                            if (data.trim() != "") {
                                if (!imageUrlRegex.test(data)) return "Only .png, .jpg and .jpeg files are allowed.";

                                const files = (consoleImageRef.current?.files ?? ({} as FileList));
                                if (files.length > 1) return "Only one file is allowed.";

                                const file = files[0];
                                if (!file) return "";

                                const sizeInMB = file.size / (1024 * 1024);
                                if (sizeInMB > maxImageFileSize) return `File is over the size limit. (${Math.floor(sizeInMB)} MB / ${maxImageFileSize} MB)`;
                            }

                            return "";
                        }}
                    />

                    <InputFile
                        ref={videoImageRef}
                        id={"videoimage"}
                        type={"text"}
                        text={"Video URL"}
                        icon={<VideoIcon />}
                        validate={(text) => {
                            const videoPlatform = getVideoPlatform(text);
                            setVideoUrlPlatform(videoPlatform)

                            if (text.trim() != "") {
                                if (videoPlatform === null) return "Invalid Video URL provided."
                            }
                        
                            return "";
                        }}
                    />

                    <div className="flex flex-col gap-0">
                        <span className="italic text-sm text-gray-400">Only YouTube and Medal links are allowed.</span>
                        <span className="italic text-sm text-red-400">Posting any clips that break the &quot;Content Restrictions&quot; section in the Discord Server rules with result in a blacklist!</span>
                    </div>

                    <span className={cn("text-red-400", videoUrlPlatform !== "youtube" && "hidden")}>WARNING: The YouTube URL will be shared within the Discord server&apos;s #bug-reports channel. Make sure that you are okay with your YouTube channel being shared into that channel.</span>

                    <hr />

                    <Button disabled={isDisabled} variant={"default"} onClick={(e) => {
                        e.preventDefault();

                        if (!isSubscriptionActive) return;
                        if (isBanned || isUnlink) return;
                        
                        toast.promise(
                            (async () => {
                                const formData = new FormData();

                                formData.append("user_id", session?.user?.id ?? "");
                                formData.append("title", titleRef.current?.value ?? "");
                                formData.append("description", descriptionRef.current?.value ?? "");
                                formData.append("game", game);
                                formData.append("executor", executor);

                                if (consoleImageRef.current?.files?.[0]) formData.append("console", consoleImageRef.current.files[0]);
                                if (isValidVideoPlatform(videoImageRef.current?.value ?? "")) formData.append("video", videoImageRef.current?.value ?? "");

                                const response = await fetch(
                                    "/api/submit/bugreport",
                                    {
                                        method: "POST",
                                        body: formData
                                    }
                                );

                                const data = await response.json();
                                if (!response.ok) {
                                    throw new Error(
                                        (data.error && data.error.length > 0) ? data.error[0]?.message : "Submit failed."
                                    );
                                }

                                if (data.success === false) {
                                    throw new Error(
                                        data.message ? data.message : "Submit failed."
                                    );
                                }

                                return data;
                            })(),
                            {
                                loading: "Submitting...",
                                success: (data) => {
                                    setTimeout(() => {
                                        window.location.reload()
                                    }, 2500);

                                    return (
                                        data.message || "Bug Report has been submitted successfully!"
                                    );
                                },

                                error: (error) => {
                                    return error.message;
                                },
                            }
                        );
                    }}>Submit</Button>

                    <div className="text-center text-sm text-muted-foreground">
                        <Link href={"/subscription-dashboard"} className="transition duration-200 border-b-1 border-transparent hover:border-white hover:text-white">Go Back</Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
