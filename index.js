const express = require("express");
const app = express();
const cors = require("cors");
const mongo = require("mongodb");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bodyParser = require("body-parser");
const shortid = require("shortid");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
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
const defaultDate = () => new Date().toISOString().slice(0, 10);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/urlShortener", (req, res) => {
  res.sendFile(__dirname + "/views/urlShortener.html");
});

app.get("/exerciseTracker", (req, res) => {
  res.sendFile(__dirname + "/views/exerciseTracker.html");
});

app.get("/fileMetadata", (req, res) => {
  res.sendFile(__dirname + "/views/fileMetadata.html");
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

const usersSchema = new Schema({
  username: String,
  total: Number,
  consultado: String,
  log: [
    {
      description: String,
      duration: Number,
      date: String,
    },
  ],
});

const Users = mongoose.model("Users", usersSchema);

app.post("/api/users", (req, res) => {
  let user = req.body.username;
  if (user) {
    let cons = new Date();
    Users.findOneAndUpdate(
      { username: user },
      { consultado: cons },
      (error, result) => {
        if (error) return console.error(error);
        if (!result) {
          result = new Users({
            username: user,
            total: 0,
            consultado: cons,
            log: [],
          });
        }
        result.total += 1;
        result.save((err) => {
          if (err) return console.error(err);
          res.json({
            username: result.username,
            _id: result._id,
          });
        });
      }
    );
  } else {
    res.json({
      error: "Usuario invalido",
    });
  }
});

app.post("/api/users/:_id/exercises", (req, res) => {
  let id = req.params._id;
  if (id.length > 5) {
    let fecha = req.body.date || defaultDate();
    Users.findOneAndUpdate(
      { _id: id },
      { consultado: fecha },
      (err, result) => {
        if (err) return console.error(err);
        if (!result) {
          res.json({
            error: "No existe",
          });
        } else {
          let fechaParseada = new Date(fecha).toDateString();
          result.log.push({
            description: req.body.description,
            duration: parseInt(req.body.duration),
            date: fechaParseada,
          });
          result.save((err) => {
            if (err) return console.error(err);
            res.json({
              _id: result._id,
              username: result.username,
              date: fechaParseada,
              duration: parseInt(req.body.duration),
              description: req.body.description,
            });
          });
        }
      }
    );
  } else {
    res.json({
      error: "Id invalida",
    });
  }
});

app.get("/api/users", (req, res) => {
  Users.find((err, todo) => {
    if (err) return console.error(err);
    if (!todo) {
      res.json({
        error: "No hay nada",
      });
    } else {
      res.json(todo);
    }
  });
});

app.get("/api/users/:_id/logs", (req, res) => {
  let id = req.params._id;
  let { from, to, limit } = req.query;

  if (id.length > 5) {
    Users.findOne({ _id: id }, (err, result) => {
      if (err) return console.error(err);
      if (!result) {
        res.json({
          error: "No existe",
        });
      } else {
        if (from) {
          let fromDate = new Date(from);
          result.log = result.log.filter(
            (exe) => new Date(exe.date) > fromDate
          );
        }
        if (to) {
          let toDate = new Date(to);
          result.log = result.log.filter((exe) => new Date(exe.date) < toDate);
        }
        if (limit) {
          result.log = result.log.slice(0, limit);
        }
        let resObj = {
          username: result.username,
          count: result.log.length,
          _id: result._id,
          log: result.log,
        };
        res.json(resObj);
      }
    });
  } else {
    res.json({
      error: "Id invalida",
    });
  }
});

app.post(
  "/fileMetadata/api/fileanalyse",
  upload.single("upfile"),
  (req, res) => {
    res.json({
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size,
    });
  }
);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log("Escuchando en port: ", PORT);
});
