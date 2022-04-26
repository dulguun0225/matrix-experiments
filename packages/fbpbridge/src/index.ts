import {
  Appservice,
  AppserviceJoinRoomStrategy,
  AutojoinRoomsMixin,
  IAppserviceOptions,
  IAppserviceRegistration,
  MemoryStorageProvider,
  SimpleRetryJoinStrategy,
} from "matrix-bot-sdk";
import registration from "./registration";
import axios from "axios";
import * as AxiosLogger from "axios-logger";
import dotenv from "dotenv";
dotenv.config();

import initFacebook from "./init-facebook";

import { PrismaClient, RoomFBID } from "@prisma/client";

const prisma = new PrismaClient();

// @ts-ignore
axios.interceptors.request.use(AxiosLogger.requestLogger);


console.log("Setting up appservice with in-memory storage");

const storage = new MemoryStorageProvider();

const PORT = 44444;


const options: IAppserviceOptions = {
  bindAddress: "0.0.0.0",
  port: PORT,
  homeserverName: "dulguuno.matrix.host",
  homeserverUrl: "http://synapse:8008",

  storage: storage,
  registration: registration,
  joinStrategy: new SimpleRetryJoinStrategy(),
};

const appservice = new Appservice(options);
AutojoinRoomsMixin.setupOnAppservice(appservice);

appservice.on("room.event", (roomId, event) => {
  console.log(
    `Received event ${event["event_id"]} (${event["type"]}) from ${event["sender"]} in ${roomId}`
  );
});

appservice.on("query.user", (userId, createUser) => {
  // This is called when the homeserver queries a user's existence. At this point, a
  // user should be created. To do that, give an object or Promise of an object in the
  // form below to the createUser function (as shown). To prevent the creation of a user,
  // pass false to createUser, like so: createUser(false);
  console.log(`Received query for user ${userId}`);
  createUser(false);
  // createUser({
  //     display_name: "Test User " + userId,
  //     avatar_mxc: "mxc://localhost/somewhere",
  // });
});

appservice.on("query.room", (roomAlias, createRoom) => {
  // This is called when the homeserver queries to find out if a room alias exists. At
  // this point, a room should be created and associated with the room alias. To do
  // that, given an object or Promise of an object in the form below to the createRoom
  // function (as shown). To prevent creation of a room, pass false to createRoom like
  // so: createRoom(false); The object (with minor modifications) will be passed to
  // the /createRoom API.
  console.log(`Received query for alias ${roomAlias}`);
  createRoom(false);
  // createRoom({
  //     name: "Hello World",
  //     topic: "This is an example room",
  //     invite: [appservice.botUserId],
  //     visibility: "public",
  //     preset: "public_chat",
  // });
});

// Note: The following 3 handlers only fire for appservice users! These will NOT be fired
// for everyone.

appservice.on("room.invite", (roomId, inviteEvent) => {
  const userId = inviteEvent["state_key"];
  console.log(`Received invite for ${inviteEvent["state_key"]} to ${roomId}`);
  const intent = appservice.getIntentForUserId(userId);
  intent.joinRoom(roomId);
});

appservice.on("room.join", (roomId, joinEvent) => {
  console.log(`Joined ${roomId} as ${joinEvent["state_key"]}`);
});

appservice.on("room.leave", (roomId, leaveEvent) => {
  console.log(`Left ${roomId} as ${leaveEvent["state_key"]}`);
});


// initFacebookHook(appservice);

initFacebook(appservice);

async function main() {
  await appservice.begin();
  console.log(`Appservice started on port ${PORT}`);
  // await inviteUser();
}

main();
