"use client";

import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";
import {
    FolderPen,
} from "lucide-react";
import { QueryResultRow } from "@vercel/postgres";

import { cn, normalizeEpochMs } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import InvalidSubscriptionCard from "./elements/InvalidSubscriptionCard";
import InputFile from "./elements/InputFile";
import GameList from "./elements/GameList";
import Link from "next/link";

interface SuggestionCardProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    session: any;
    subscription: QueryResultRow | null;
}

export default function SuggestionCard({
    session,
    subscription,
}: SuggestionCardProps) {
    const router = useRouter();

    // values //
    const [isDisabled, setIsDisabled] = useState(true);
    const [game, setGame] = React.useState("");

    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const titleRef = useRef<HTMLInputElement>(null);
    const descriptionRef = useRef<HTMLTextAreaElement>(null);

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

    if (!session || !session.user || !session.user.id) {
        router.push("/sign-in");
        return null;
    }

    const expirationDate = normalizeEpochMs(subscription?.expires_at) ?? 0;
    const userStatus: string = subscription ? subscription.user_status : "unlink";

    // Determine subscription status
    const isMember = subscription != null;
    const isLifetime = expirationDate == -1;
    const isKeySystem = subscription?.from_key_system === true;

    const isUnlink = userStatus === "unlink";
    const isResetState = userStatus === "reset";
    const isBanned = userStatus === "banned" || subscription?.is_banned;
    const isSubscriptionActive = (!isBanned && isMember) && (userStatus === "active" || isResetState || isLifetime);
    const isPostBanned = subscription?.is_post_banned === true;

    if (!isKeySystem && !isSubscriptionActive) return <InvalidSubscriptionCard text={"You don't have any active subscription."} textClassName={"text-orange-500"} />
    if (isPostBanned || isBanned) return <InvalidSubscriptionCard text={"You are not allowed to make suggestions."} textClassName={"text-red-500"} />

    return (
        <div className="w-full max-w-md mx-auto sm:mx-0 mt-6">
            <Card className="relative rounded-lg z-10 border-transparent">
                <CardTitle className="p-4 sm:p-6 !pb-0 w-full">
                    Suggestion
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

                    <hr />

                    <Button disabled={isDisabled || isSubmitting} variant={"default"} onClick={(e) => {
                        e.preventDefault();

                        if (!isSubscriptionActive) return;
                        if (isBanned || isUnlink) return;
                        if (isSubmitting) return;

                        setIsSubmitting(true);
                        
                        toast.promise(
                            (async () => {
                                const formData = new FormData();

                                formData.append("user_id", session?.user?.id ?? "");
                                formData.append("title", titleRef.current?.value ?? "");
                                formData.append("description", descriptionRef.current?.value ?? "");
                                formData.append("game", game);

                                const response = await fetch(
                                    "/api/submit/suggestion",
                                    {
                                        method: "POST",
                                        body: formData
                                    }
                                );

                                const data = await response.json();
                                if (!response.ok) {
                                    setTimeout(() => { setIsSubmitting(false); }, 500);
                                    throw new Error(
                                        (data.error && data.error.length > 0) ? data.error[0]?.message : "Submit failed."
                                    );
                                }

                                if (data.success === false) {
                                    setTimeout(() => { setIsSubmitting(false); }, 500);
                                    throw new Error(
                                        data.message ? data.message : "Submit failed."
                                    );
                                }

                                return data;
                            })(),
                            {
                                loading: "Submitting...",
                                success: (data) => {
                                    setTimeout(() => { window.location.reload() }, 3500);

                                    return (
                                        data.message || "Suggestion has been submitted successfully!"
                                    );
                                },

                                error: (error) => {
                                    return error.message;
                                },
                            }
                        );

                        router.refresh();
                    }}>Submit</Button>

                    <div className="text-center text-sm text-muted-foreground">
                        <Link href={"/subscription-dashboard"} className="transition duration-200 border-b-1 border-transparent hover:border-white hover:text-white">Go Back</Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
