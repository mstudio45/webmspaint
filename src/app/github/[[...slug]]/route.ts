import { repoWhitelist } from "@/data/github";
import { NextRequest } from "next/server";

const MAX_PROXY_BYTES = 1_000_000; // 1MB safety limit
const ALLOWED_FILE_EXTENSIONS =
  /\.(json|lua|txt|md|yml|yaml|js|mjs|cjs|ts|tsx|css|toml)$/i;

export async function GET(req: NextRequest, slug: { params: Promise<{ slug: string[] }> }) {
    if (req.nextUrl.search) {
        return new Response(JSON.stringify({ success: false, error: "Query params are not supported" }), {
            status: 400
        });
    }

    const segments = (await slug.params).slug;
    if (!segments || segments.length < 3) 
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

    const requestedPath = segments.slice(2).join("/");
    if (!requestedPath || !ALLOWED_FILE_EXTENSIONS.test(requestedPath)) {
        return new Response(JSON.stringify({ success: false, error: "Unsupported file type" }), {
            status: 400
        });
    }
    
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

        if (!response.ok) {
            return new Response(JSON.stringify({ success: false, error: "Failed to get data" }), {
                status: response.status
            });
        }

        const data = await response.arrayBuffer();
        if (data.byteLength > MAX_PROXY_BYTES) {
            return new Response(JSON.stringify({ success: false, error: "File too large" }), {
                status: 413
            });
        }

        return new Response(data, {
            status: response.status,
            headers: {
                "Content-Type": response.headers.get("content-type") ?? "text/plain; charset=utf-8",
                "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
            }
        });
    } catch (err) {
        console.error("Failed to get data from github:", err);
        return new Response(JSON.stringify({ success: false, error: "Failed to get data" }), {
            status: 500
        });
    }
}
