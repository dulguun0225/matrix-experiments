import axios from "axios";
import express from "express";
import bodyParser from "body-parser";

axios.defaults.headers.common = {
  Authorization: "Bearer from_scratch_token",
};

const app = express();
app.use(bodyParser.json());

app.put("/transactions/:txnId", async (req, res) => {
  console.log(
    "-------------------------- transaction -----------------------------"
  );
  console.log(JSON.stringify(req.body, null, 2));
  console.log(
    "-------------------------- transaction -----------------------------"
  );

  for (const event of req.body?.events) {
    const { room_id, state_key, type, sender } = event;
    if (type === "m.room.member") {
      const res = await axios.post(`/_matrix/client/v3/join/${room_id}`, {
        reason: "Looking for support",
        third_party_signed: {
          mxid: state_key,
          sender,
          token: "from_scratch_token",
        },
      });
      console.log(res);
    }
  }
});

app.get("/users/:userId", (req, res) => {
  console.log(
    "-------------------------- user query -----------------------------"
  );
  console.log(req.params);
  console.log(
    "-------------------------- user query -----------------------------"
  );
});

app.get("/rooms/:roomAlias", (req, res) => {
  console.log(
    "-------------------------- alias query -----------------------------"
  );
  console.log(req.params);
  console.log(
    "-------------------------- alias query -----------------------------"
  );
});

app.get("/", (req, res) => {
  console.log("--------------------------------------------");
  console.log(req.params);

  console.log("--------------------------------------------");
});

app.post("/", (req, res) => {
  console.log("--------------------------------------------");
  console.log(JSON.stringify(req.body, null, 2));
  console.log("--------------------------------------------");
});

async function initialSync() {
  const res = await axios.get("http://synapse:8008/_matrix/client/v3/sync", {});
  console.log(res);
}

async function main() {
  await new Promise<void>((resolve) => app.listen(33333, resolve));
  console.log("Listening on port 33333");
  try {
    await initialSync();
  } catch (e) {
    console.error(e);
  }
}

main();
