import { PrismaClient, RoomFBID } from "@prisma/client";
import { Appservice, Intent } from "matrix-bot-sdk";
import axios from "axios";

const prisma = new PrismaClient();

const erxesWebhookUser = "@dulguuno:dulguuno.matrix.host";
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

async function sendMessage(fbid: String, text: String) {
  const response = {
    recipient: {
      id: fbid,
    },
    message: {
      text,
    },
  };

  try {
    axios.post(
      `https://graph.facebook.com/v13.0/me/messages?access_token=${FB_PAGE_ACCESS_TOKEN}`,
      response
    );
  } catch (e) {
    console.error(e);
  }
}

interface ProfileInfo {
  id: string;
  name: string;
  profile_pic?: string;
  [x: string]: any;
}

async function getProfileInfo(fbid: String): Promise<ProfileInfo | undefined> {
  try {
    const res = await axios.get(
      `https://graph.facebook.com/v13.0/${fbid}?fields=name,profile_pic&access_token=${FB_PAGE_ACCESS_TOKEN}`
    );
    return res.data;

    /*
      res.data:
      {
        "name": "Дөлгөөн Өө",
        "profile_pic": "https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=4747951328667401&width=1024&ext=1653637733&hash=AeTfkaKLRRJPtV9Iz2A",
        "id": "4747951328667401"
      }

    */
  } catch (e) {
    console.error(e);
  }
}

export default function initFacebook(appservice: Appservice) {
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
      body.entry.forEach(async function (entry: any) {
        // Gets the message. entry.messaging is an array, but
        // will only ever contain one message, so we get index 0
        let webhook_event = entry.messaging[0];
        console.log(webhook_event);

        const fbid = webhook_event.sender.id;

        const puppetId = appservice.getUserIdForSuffix(fbid.toString());

        const intent = appservice.getIntentForUserId(puppetId);

        const roomFBID: RoomFBID | null = await prisma.roomFBID.findUnique({
          where: {
            fbid,
          },
        });

        let roomId;

        if (!roomFBID) {
          await intent.ensureRegistered();
          const profile: ProfileInfo = (await getProfileInfo(fbid)) || {
            id: fbid,
            name: "FB: " + fbid,
          };
          intent.underlyingClient.setDisplayName(profile.name);

          if (profile.profile_pic) {
            const mxcUri = await intent.underlyingClient.uploadContentFromUrl(profile.profile_pic);
            intent.underlyingClient.setAvatarUrl(mxcUri);
          }

          roomId = await intent.underlyingClient.createRoom({
            invite: [erxesWebhookUser],
            name: profile.name,
            is_direct: true,
            preset: "private_chat",
          });

          await prisma.roomFBID.create({
            data: {
              roomId,
              fbid,
            },
          });
        } else {
          roomId = roomFBID.roomId;
          intent.underlyingClient.inviteUser(erxesWebhookUser, roomFBID.roomId);
        }

        intent.sendText(roomId, webhook_event.message.text);
      });

      // Returns a '200 OK' response to all requests
      res.status(200).send("EVENT_RECEIVED");
    } else {
      // Returns a '404 Not Found' if event is not from a page subscription
      res.sendStatus(404);
    }
  });

  appservice.on("room.message", async (roomId, event) => {
    if (!event["content"]) return;
    if (event["content"]["msgtype"] !== "m.text") return;

    if (event.sender !== erxesWebhookUser) {
      return;
    }

    const roomFBID = await prisma.roomFBID.findUnique({
      where: {
        roomId,
      },
    });

    if (!roomFBID) throw new Error("No room to fbid relation found");

    sendMessage(roomFBID.fbid, event.content.body);
  });
}
