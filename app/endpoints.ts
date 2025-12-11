// replace `localhost:3000` with your IMChat server domain and port if you run it on an external server

// http because it's a local elysia server running with no SSL certificate
export const IMCHAT_URL = new URL("http://localhost:3000/");
export const SEND_ENDPOINT = new URL("/send", IMCHAT_URL);
export const LISTEN_ENDPOINT = new URL("/listen", IMCHAT_URL);

export async function sendMessage(message: string, author: string) {
    await fetch(`${SEND_ENDPOINT}?author=${encodeURIComponent(author)}`, {
        method: "POST",
        headers: {
            "Content-Type": "text/plain"
        },
        body: message
    });
}
