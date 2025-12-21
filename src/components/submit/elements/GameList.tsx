"use client";

import {
    ChevronsUpDown,
    Gamepad2Icon,
} from "lucide-react";
import { QueryResultRow } from "@vercel/postgres";
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

import React, { useEffect, useRef, useState } from "react";
import { gamesList } from "@/data/games";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function GameList ({ value, setValue }: { value: string; setValue: (text: string) => void }) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const [currentError, setCurrentError] = useState("Game is required.");

    const customGameList = React.useMemo(() => ["mspaint", "Universal", ...gamesList], [])
    const filteredGames = React.useMemo(() => {
        const searchLc = search.toLowerCase();
        return customGameList.filter((g) => g.toLowerCase().includes(searchLc));
    }, [search, customGameList]);

    useEffect(() => {
        setCurrentError(value == "" ? "Game is required." : "")
    }, [value])

    return (<div className="grid w-full items-center gap-2">
        <div className="flex flex-row gap-2 ml-1">
            <Gamepad2Icon />
            <Label>
                Game
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
                    {value == "" ? "Select a game..." : value}
                    <ChevronsUpDown className="opacity-50" />
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-full p-0">
                <Command>
                    <CommandInput
                        placeholder="Search a game..."
                        className="h-9"
                        value={search}
                        onValueChange={(val) => setSearch(val)}
                    />

                    <CommandList>
                        {filteredGames.length > 0 ? (<>
                            <CommandGroup heading={"Games"} key={"games"}>
                                {filteredGames.map((game) => (
                                    <CommandItem
                                        key={game}
                                        onSelect={() => {
                                            setValue(game);
                                            setOpen(false);
                                        }}
                                    >
                                        {game}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </>) : (
                            <CommandEmpty>No game found.</CommandEmpty>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>

        {currentError != "" && <span id="value-error" className="text-sm text-red-400 ml-1">{currentError}</span>}
    </div>);
}