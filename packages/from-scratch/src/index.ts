import axios from "axios";
import express from "express";
import bodyParser from "body-parser";
import * as AxiosLogger from "axios-logger";
import qs from "qs";

axios.defaults.headers.common = {
  Authorization: "Bearer from_scratch_token",
};

axios.interceptors.request.use(AxiosLogger.requestLogger);

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
  //   for (const event of req.body?.events) {
  //     const { room_id, state_key, type, sender } = event;
  //     if (type === "m.room.member") {
  //       const res = await axios.post(`/_matrix/client/v3/join/${room_id}`, {
  //         reason: "Looking for support",
  //         third_party_signed: {
  //           mxid: state_key,
  //           sender,
  //           token: "from_scratch_token",
  //         },
  //       });
  //       console.log(res);
  //     }
  //   }
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
  // console.log(req.params);
  // console.log(req.query);
  // console.log(req.body)
  console.log(req);
  console.log(
    "-------------------------- alias query -----------------------------"
  );
  res.status(200).end();
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

app.post("/_matrix/client/v3/join/:roomId", (req, res) => {
  console.log(req.params);
  console.log(req.query);
  console.log(req.body);
});

const roomId = "!fxkOYwqWYnjxybWrCJ:dulguuno.matrix.host";

async function sync() {
  try {
    const res = await axios.get(
      `http://synapse:8008/_matrix/client/v3/sync?full_state=true&user_id=${encodeURIComponent(
        "@fromscratchbot:dulguuno.matrix.host"
      )}`,
      {
        headers: {
          Authorization: "Bearer from_scratch_token",
        },
      }
    );
  } catch (e) {
    console.error(e);
  }
}

async function join() {
  try {
    const result = await axios.post(
      `http://synapse:8008/_matrix/client/r0/join/${encodeURIComponent(
        roomId
      )}?user_id=${encodeURIComponent("@fromscratchbot:dulguuno.matrix.host")}`,
      {}
    );
    console.log(result.data);
  } catch (e) {
    console.error(e);
  }
}

async function leave() {
  try {
    const result = await axios.post(
      `http://synapse:8008/_matrix/client/v3/rooms/${encodeURIComponent(
        roomId
      )}/leave`
    );
  } catch (e) {
    console.error(e);
  }
}

async function axiosTest() {
  axios.post(
    "http://something.com/?" + qs.stringify({ foo: "bar", a: [12, 3] })
  );
  // console.log(qs.stringify({ a : 1, b : "bbbbbbbbbbbbbbbbb", c : [1,2,23]}))
}

async function main() {
  await new Promise<void>((resolve) => app.listen(33333, resolve));
  console.log("Listening on port 33333");
  await sync();
  // await leave();
  // await join();
  // await axiosTest();
}

main();
