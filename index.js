const express = require("express");
const app = express();
const cors = require("cors");
const mongo = require("mongodb");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bodyParser = require("body-parser");
const shortid = require("shortid");
require("dotenv").config();

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect(
  process.env.MONGO_URI,
  { useNewUrlParser: true, useUnifiedTopology: true },
  (err) => {
    err
      ? console.log("No estas conectado:" + err)
      : console.log("Conectado a MongoDB");
  }
);

const urlsSchema = new Schema({
  original: String,
  suffix: String,
  total: Number,
  consultado: String,
});

const Urls = mongoose.model("Urls", urlsSchema);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/urlShortener", (req, res) => {
  res.sendFile(__dirname + "/views/urlShortener.html");
});

const isValidUrl = (string) => {
  let url;
  try {
    url = new URL(string);
  } catch (_) {
    return false;
  }
  return url.protocol === "http:" || url.protocol === "https:";
};

app.post("/api/shorturl", (req, res) => {
  let enlace = req.body.url;
  if (isValidUrl(enlace)) {
    let cons = new Date();
    Urls.findOneAndUpdate(
      { original: enlace },
      { consultado: cons },
      (error, result) => {
        if (error) return console.error(error);
        if (!result) {
          let suffix = shortid.generate();
          result = new Urls({
            original: enlace,
            suffix: suffix,
            total: 0,
            consultado: cons,
          });
        }
        result.total += 1;
        result.save((err) => {
          if (err) return console.error(err);
          res.json({
            original_url: result.original,
            short_url: result.suffix,
          });
        });
      }
    );
  } else {
    res.json({
      error: "Invalid URL",
    });
  }
});

app.get("/api/shorturl/:suffix", (req, res) => {
  Urls.findOne({ suffix: req.params.suffix }, (err, result) => {
    if (err) return console.error(err);
    if (!result) {
      res.json({
        error: "No short URL found for the given input",
      });
    } else {
      res.redirect(result.original);
    }
  });
});

app.listen(3001, () => {
  console.log("Escuchando en port: 3001");
});
