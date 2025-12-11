// import { html, Html } from "@elysiajs/html";
import { Elysia } from "elysia";
import cors from "@elysiajs/cors";
import z from "zod";

const clients = new Set<ReadableStreamDefaultController<string>>();
const DISCORD_WEBHOOK_URL = Bun.env.DISCORD_WEBHOOK_URL;

async function sendToDiscord(username: string, content: string) {
  if (DISCORD_WEBHOOK_URL === undefined) {
    throw "please include your discord webhook URL if you want to send a message to discord";
  }
  const r = await fetch(DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      content,
      embeds: [],
      components: [],
      username
    })
  });
}

function broadcast(author: string, message: string) {
  if (DISCORD_WEBHOOK_URL !== undefined)
    sendToDiscord(author, message);
  const payload = JSON.stringify({ author, message });
  for (const c of Array.from(clients)) {
    try {
      c.enqueue(`data: ${payload}\n\n`);
    } catch (err) {
      clients.delete(c);
    }
  }
}

// TODO: remove /test when I'm done testing (never)

const app = new Elysia()
  // .use(html())
  .use(cors())
  // .get("/test", () => {
  //   return <html>
  //     <head>
  //       <title>Test Page</title>
  //     </head>
  //     <body>
  //       <h1>Testing 123</h1>
  //       <input type="text" placeholder="Author name" required></input>
  //       <textarea id="message" placeholder="Enter your message"></textarea>
  //       <button id="submit">Submit</button>
  //       <script async defer>
  //         const evtSource = new EventSource("/listen");
  //         document.getElementById("submit").onclick = () ={'>'} {'{'}
  //         const author = document.querySelector("input").value;
  //         const message = document.getElementById("message").value;

  //         fetch(`/send?author=${'{'}encodeURIComponent(author){'}'}`, {'{'}
  //         method: "POST",
  //         headers: {'{'}
  //         "Content-Type": "text/plain"
  //         {'}'},
  //         body: message
  //         {'}'});
  //         {'}'};
  //       </script>
  //     </body>
  //   </html>;
  // })
  .get("/listen", () => {
    let controllerRef: ReadableStreamDefaultController<string> | null = null;
    const stream = new ReadableStream<string>({
      start(controller) {
        controllerRef = controller;
        clients.add(controller);
        controller.enqueue(`data: ${JSON.stringify({ author: null, message: "Connected" })}\n\n`);
      },
      cancel() {
        if (controllerRef) {
          clients.delete(controllerRef);
          controllerRef = null;
        }
      }
    });

    return new Response(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
      }
    });
  }, {
    response: z.object({
      author: z.nullable(z.string()),
      message: z.string()
    })
  })
  .post("/send", a => {
    const message = a.body as string;
    const author = a.query.author as string;
    console.log(`[IRC] <${author}> ${message}`);

    broadcast(author, message);
  }, {
    body: z.string(),
    query: z.object({
      author: z.string()
    })
  }).listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
