"use client";

import {
    ChevronsUpDown,
    SquareChevronRightIcon,
} from "lucide-react";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

import React, { useEffect, useState } from "react";
import { executorsList } from "@/data/executors";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function ExecutorList({ value, setValue }: { value: string; setValue: (text: string) => void }) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const [currentError, setCurrentError] = useState("Executor is required.");

    const filteredExecutors = React.useMemo(() => {
        const searchLc = search.toLowerCase();
        return executorsList.filter((e) => e.toLowerCase().includes(searchLc));
    }, [search]);

    useEffect(() => {
        setCurrentError(value == "" ? "Executor is required." : "")
    }, [value])

    return (<div className="grid w-full items-center gap-2">
        <div className="flex flex-row gap-2 ml-1">
            <SquareChevronRightIcon />
            <Label>
                Executor
                <span className="ml-[-4px] mb-1 text-red-400">*</span>
            </Label>
        </div>

        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between max-md:mt-2 max-md:mb-2 max-sm:mb-1 max-sm:mt-1 cursor-pointer"
                >
                    {value == "" ? "Select your executor..." : value}
                    <ChevronsUpDown className="opacity-50" />
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-full p-0">
                <Command>
                    <CommandInput
                        placeholder="Search executor..."
                        className="h-9"
                        value={search}
                        onValueChange={(val) => setSearch(val)}
                    />

                    <CommandList>
                        {filteredExecutors.length > 0 ? (<>
                            <CommandGroup heading={"Games"} key={"games"}>
                                {filteredExecutors.map((exec) => (
                                    <CommandItem
                                        key={exec}
                                        onSelect={() => {
                                            setValue(exec);
                                            setOpen(false);
                                        }}
                                    >
                                        {exec}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </>) : (
                            <CommandEmpty>No Executor found.</CommandEmpty>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>

        {currentError != "" && <span id="value-error" className="text-sm text-red-400 ml-1">{currentError}</span>}
    </div>);
}