import { WebPubSubServiceClient } from "@azure/web-pubsub";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const hub = "debate"; // A fixed hub name for the debate application
  const room = request.nextUrl.searchParams.get("room"); // Get room id from query
  const userId = `user-${Date.now()}`; // Generate a unique user id

  if (!room) {
    return NextResponse.json({ message: "Room parameter is required" }, { status: 400 });
  }

  // Ensure the connection string is available
  const connectionString = process.env.AZURE_WEBPUBSUB_CONNECTION_STRING;
  if (!connectionString) {
    return NextResponse.json({ message: "Azure Web PubSub connection string is not configured" }, { status: 500 });
  }

  // Create a new service client
  const serviceClient = new WebPubSubServiceClient(connectionString, hub);

  // Get an access token for the client
  const token = await serviceClient.getClientAccessToken({
    userId: userId,
    groups: [`${hub}.${room}`], // Clients in the same room join the same group
    roles: ["webpubsub.joinLeaveGroup", "webpubsub.sendToGroup"],
  });

  // Return the client URL to the frontend
  return NextResponse.json({
    url: token.url,
  });
}