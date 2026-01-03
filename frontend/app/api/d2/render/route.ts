export async function POST(req: Request) {
    try {
        const body = await req.text();

        const response = await fetch('https://kroki.io/d2/svg', {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: body,
        });

        if (!response.ok) {
            const errorText = await response.text();
            return new Response(errorText, { 
                status: response.status,
                headers: { 'Content-Type': 'text/plain' }
            });
        }

        const svgText = await response.text();
        return new Response(svgText, {
            headers: { 
                'Content-Type': 'image/svg+xml',
                // Keep the D2 layout engine's cache headers if any
                'Cache-Control': 'public, max-age=3600'
            }
        });
    } catch (err) {
        console.error('D2 Proxy error:', err);
        return new Response(String(err), { status: 500 });
    }
}
