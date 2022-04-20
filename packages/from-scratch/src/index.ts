import axios from "axios";
import express from 'express';
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

app.put("/transactions/:txnId", (req, res) => {
  console.log("-------------------------- transaction -----------------------------")
  console.log(req.body);
  console.log("-------------------------- transaction -----------------------------")
})

app.get("/users/:userId", (req, res) => {
  console.log("-------------------------- user query -----------------------------")
  console.log(req.params);
  console.log("-------------------------- user query -----------------------------")
  res.status(404).end();
})

async function main() {

  await new Promise<void>(resolve => app.listen(33333, resolve));
  console.log("Listening on port 33333");
}

main();

