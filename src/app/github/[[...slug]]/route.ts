import { allowedRepositories } from "@/data/github";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest, slug: { params: Promise<{ slug: string[] }> }) {
    const segments = (await slug.params).slug;
    if (!segments || segments.length === 0) 
        return new Response(JSON.stringify({ success: false, error: "Invalid path" }), {
            status: 400
        });

    if (allowedRepositories.indexOf(segments[0]) === -1)
        return new Response(JSON.stringify({ success: false, error: "Invalid path" }), {
            status: 400
        });

    try {
        const response = await fetch(`https://raw.githubusercontent.com/mspaint-cc/${segments.join("/")}`, {
            method: "GET",
            cache: "force-cache",
            next: {
                revalidate: 300 // 5 minutes
            }
        })

        const data = await response.text();
        return new Response(data, {
            status: 200,
            headers: {
                "Cache-Control": "public, max-age=120, stale-while-revalidate=30",
            }
        });
    } catch (err) {
        console.error("Failed to get data from github:", err);
        return new Response(JSON.stringify({ success: false, error: "Failed to get data" }), {
            status: 500
        });
    }
}