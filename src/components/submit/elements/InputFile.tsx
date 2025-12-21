"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export default function InputFile({ ref, id, type, accept, text, icon, required, isTextArea, validate }: {
    ref: React.Ref<HTMLInputElement | HTMLTextAreaElement>;
    id: string;
    type: string;
    accept?: string;
    text: string;
    icon: React.ReactElement<SVGSVGElement>;
    required?: boolean;
    isTextArea?: boolean;
    validate: (text: string) => string;
}) {
    const [currentError, setCurrentError] = useState("");
    const [validated, setValidated] = useState(false);

    useEffect(() => {
        if (validated === true) return;

        setValidated(true);
        setCurrentError(validate(""))
    }, [validated, validate])

    return (
        <div className="grid w-full items-center gap-2">
            <div className="flex flex-row gap-2 ml-1">
                {icon}
                <Label htmlFor={id}>
                    {text}
                    {required == true && <span className="ml-[-4px] mb-1 text-red-400">*</span>}
                </Label>
            </div>

            {isTextArea == true ? (
                <Textarea
                    ref={ref as React.Ref<HTMLTextAreaElement>}
                    id={id}

                    className="h-[100px]"
                    onChange={(e) => {
                        e.preventDefault();
                        setCurrentError(validate(e.target.value));
                    }}
                />
            ) : (<Input
                ref={ref as React.Ref<HTMLInputElement>}
                id={id}
                type={type}
                accept={accept}

                className={cn("w-full justify-between", type == "file" && "cursor-pointer")}
                onChange={(e) => {
                    e.preventDefault();
                    setCurrentError(validate(e.target.value));
                }}
            />)}

            {currentError != "" && <span id="value-error" className="text-sm text-red-400 ml-1">{currentError}</span>}
        </div>
    )
}