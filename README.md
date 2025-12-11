# IMChat (Impact Chat)

## Send messages

Send a POST request to /send with a query parameter named `author`, the request body is the message you want to send.

```js
// replace `localhost:3000` with your IMChat server domain and port if you run it on an external server
const IMCHAT_SEND_ENDPOINT = "https://localhost:3000/send";
function sendMessage(message, author) {
    fetch(`${IMCHAT_SEND_ENDPOINT}?author=${encodeURIComponent(author)}`, {
        method: "POST",
        body: message
    });
}
```

## Listen for messages

Listen to the SSE endpoint (/listen), you will get JSON data, which has a `message` field and an `author` (nullable) field:

```js
// replace `localhost:3000` with your IMChat server domain and port if you run it on an external server
const IMCHAT_LISTEN_ENDPOINT = "https://localhost:3000/listen";
const source = new EventSource(IMCHAT_LISTEN_ENDPOINT);
source.addEventListener("message", e => {
    const { message, author } = JSON.parse(e.data);
    console.log(`[IRC] <${author ?? "server"}> ${message}`);
});
```

## Run

Impact Chat is developed with Bun (because Elysia recommends using it), run it using:
```sh
bun run dev
```