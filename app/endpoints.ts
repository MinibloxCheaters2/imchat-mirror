// replace `localhost:3000` with your IMChat server domain and port if you run it on an external server

import { PLATFORM_ID, SEND_AUTHORIZATION } from "./env";

if (PLATFORM_ID === undefined)
    throw "please add a platform ID to your .env file";

// http because it's a local elysia server running with no SSL certificate
export const IMCHAT_URL = new URL("http://localhost:3000/");
export const SEND_UNAUTH_ENDPOINT = new URL("/send", IMCHAT_URL);
export const SEND_AUTH_ENDPOINT = new URL("/send-protected", IMCHAT_URL);
export const LISTEN_ENDPOINT = new URL("/listen", IMCHAT_URL);

export async function sendMessage(message: string, author: string) {
    const doAuth = SEND_AUTHORIZATION !== undefined;
    const endpoint = doAuth ? SEND_AUTH_ENDPOINT : SEND_UNAUTH_ENDPOINT;
    const headers = new Headers({
        "Content-Type": "text/plain",
    });
    if (doAuth) headers.set("Authorization", `Bearer ${SEND_AUTHORIZATION}`);
    await fetch(`${endpoint}?author=${encodeURIComponent(author)}&platformID=${PLATFORM_ID}`, {
        method: "POST",
        headers,
        body: message
    });
}
