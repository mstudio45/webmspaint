import { repoWhitelist } from "@/data/github";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest, slug: { params: Promise<{ slug: string[] }> }) {
    const segments = (await slug.params).slug;
    if (!segments || segments.length === 0) 
        return new Response(JSON.stringify({ success: false, error: "Invalid path" }), {
            status: 400
        });
    
    // verify stuff //
    const repoOwner = segments[0];
    const repoName = segments[1];

    const whitelistedRepos = repoWhitelist[repoOwner] ?? [];
    if (whitelistedRepos.indexOf(repoName) === -1)
        return new Response(JSON.stringify({ success: false, error: "Invalid path" }), {
            status: 400
        });
    
    // get from github //
    try {
        let URL = "";
        if (segments[2] === "releases") {
            URL = `https://github.com/${segments.join("/")}`;
        } else {
            URL = `https://raw.githubusercontent.com/${segments.join("/")}`;
        }

        const response = await fetch(URL, {
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