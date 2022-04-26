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
import axios from 'axios';
import * as AxiosLogger from 'axios-logger';

// @ts-ignore
axios.interceptors.request.use(AxiosLogger.requestLogger);

console.log("Setting up appservice with in-memory storage");

const storage = new MemoryStorageProvider();

const PORT = 44444;

const roomPuppets: { [x: string]: string } = {
  "!EXuhdqxQwzaElfkVmO:dulguuno.matrix.host":
    "@fbpbridge_fb0:dulguuno.matrix.host",
};

const erxesWebhookUser = "@dulguuno:dulguuno.matrix.host";

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

appservice.on("room.message", async (roomId, event) => {
  if (!event["content"]) return;
  if (event["content"]["msgtype"] !== "m.text") return;

  if(event.sender === erxesWebhookUser) {
    sendMessage(event.content.body);
  }

  console.log(JSON.stringify(event, null, 2));

  // We'll create fake ghosts based on the event ID. Typically these users would be mapped
  // by some other means and not arbitrarily. The ghost here also echos whatever the original
  // user said.
  // const intent = appservice.getIntentForSuffix(event["event_id"].toLowerCase().replace(/[^a-z0-9]/g, '_'));

  // console.log(JSON.stringify(event, null, 2));

  // const arr = await appservice.botClient.getJoinedRoomMembers(roomId);
  // console.log(JSON.stringify(arr, null, 2));

  // const intent = appservice.getIntentForUserId("@fbpbridge_bot:dulguuno.matrix.host");

  // intent.sendText(roomId, body, "m.notice");
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

async function inviteUser() {
  const fbid = "fb0";
  const fbMatrixUserId = `@fbpbridge_${fbid}:dulguuno.matrix.host`;
  const intent = appservice.getIntentForUserId(fbMatrixUserId);
  await intent.ensureRegistered();

  const roomId = await intent.underlyingClient.createRoom({
    invite: [erxesWebhookUser],
    name: new Date().toISOString() + fbMatrixUserId,
    is_direct: true,
    preset: "private_chat",
  });

  roomPuppets[roomId] = fbMatrixUserId;

  console.log(`created room: ${roomId}`);
}

// initFacebookHook(appservice);

// Adds support for GET requests to our webhook
appservice.expressAppInstance.get("/facebook/webhook", (req, res) => {
  // Your verify token. Should be a random string.
  let VERIFY_TOKEN = "VERIFY_TOKEN";

  // Parse the query params
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  // Checks if a token and mode is in the query string of the request
  if (mode && token) {
    // Checks the mode and token sent is correct
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      // Responds with the challenge token from the request
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});

appservice.expressAppInstance.post("/facebook/webhook", async (req, res) => {
  let body = req.body;

  // Checks this is an event from a page subscription
  if (body.object === "page") {
    // console.log(JSON.stringify(body, null, 2));
    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function (entry: any) {
      // Gets the message. entry.messaging is an array, but
      // will only ever contain one message, so we get index 0
      let webhook_event = entry.messaging[0];
      console.log(webhook_event);

      // handleMessage(webhook_event.sender.id, webhook_event.message);

      const intent = appservice.getIntentForUserId(
        "@fbpbridge_fb0:dulguuno.matrix.host"
      );
      intent.sendText(
        "!EXuhdqxQwzaElfkVmO:dulguuno.matrix.host",
        webhook_event.message.text,
        "m.text"
      );
    });

    // Returns a '200 OK' response to all requests
    res.status(200).send("EVENT_RECEIVED");
  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }
});

const senderPsid = "4747951328667401";

const FB_PAGE_ACCESS_TOKEN = "EAAgzVRbfn2QBAHu3rZBXwCVrqwkv29v9ugU6RvPzRLZAE62ciaC44HopD0PFB5q97jGhxZAvmTRHJUlBUMejDZBTGv5d8ZCt37OAx8KcrQUtEUl6yDG5PtlX27ZAaehZBO4W1249XsZCOHu3IoMGttsKGEiB5TZB8YcjZB0h6KZBnWNn6nEVsjUWZBIK"

async function sendMessage(text: String) {
  const response = {
    recipient: {
      id: senderPsid,
    },
    message: {
      text,
    },
  };
  
  try {
    axios.post(`https://graph.facebook.com/v2.6/me/messages?access_token=${FB_PAGE_ACCESS_TOKEN}`, response)
  } catch (e) {
    console.error(e);
  }
}

async function handleMessage(senderPsid: any, receivedMessage: any) {
  const response = {
    recipient: {
      id: senderPsid,
    },
    message: {
      text: `You sent the message: '${receivedMessage.text}'. Now send me an attachment!`,
    },
  };
  
  try {
    axios.post(`https://graph.facebook.com/v2.6/me/messages?access_token=${FB_PAGE_ACCESS_TOKEN}`, response)
  } catch (e) {
    console.error(e);
  }
}

async function main() {
  await appservice.begin();
  console.log(`Appservice started on port ${PORT}`);
  // await inviteUser();
}

main();
