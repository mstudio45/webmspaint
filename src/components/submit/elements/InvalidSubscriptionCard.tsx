"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function InvalidSubscriptionCard({ text, textClassName }: { text: string; textClassName?: string }) {
    return (
        <div className="w-full max-w-md mx-auto sm:mx-0 mt-6">
            <Card className="relative rounded-lg z-10 border-transparent">
                <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
                        <div className="flex-shrink-0 mx-auto sm:mx-0">
                            <h1 className={cn(textClassName ?? "")}>{text}</h1>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}