import * as http from "http";
import { IMessage, request, server as websocket } from "websocket";

export class WebsocketServer {
  wss: websocket;

  constructor(port: Number) {
    const httpServer = http.createServer();
    httpServer.listen(port);
    this.wss = new websocket({ httpServer: httpServer });

    console.log(`Server Started on port: ${port}`);
  }
}

function start(port: Number) {
  const server = new WebsocketServer(port).wss;

  server.on("request", (request: request) => {
    const connection = request.accept(undefined, request.origin);

    console.log("Client Connected");

    connection.on("message", (data: IMessage) => {
      if (data.type == "utf8") {
        const jsonData = JSON.parse(data.utf8Data!);

        if (jsonData && jsonData.event.indexOf("remoteedit:") === 0) {
          server.broadcastUTF(data.utf8Data);
        }
      }
    });

    connection.on("close", (code: number, desc: string) => {
      console.log("Connection Closed");
    });
  });
}

start(+process.env.PORT || 9898);
