const express = require("express");
const app = express();

const tf = require("@tensorflow/tfjs");
const tfcore = require("@tensorflow/tfjs-node");
const mobilenet = require("@tensorflow-models/mobilenet");
const fs = require("fs");
const formidable = require("formidable");
const bodyParser = require("body-parser");
const image = require("get-image-data");

app.use(bodyParser.json());

const server = require("http").Server(app);

app.post("/image", (req, res) => {
  let form = new formidable.IncomingForm({
    maxFileSize: 10485760, //10MB
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      res.status(500).send("Something went wrong during upload.");
    } else {
      whatIsThis(files.upload.path)
        .then((imageClassification) => {
          res.status(200).send({
            classification: imageClassification,
          });
        })
        .catch((err) => {
          console.log(err);
          res
            .status(500)
            .send("Something went wrong while fetching image from URL.");
        });
    }
  });
});

app.post("/image-from-url", async (req, res) => {
  whatIsThis(req.body.url)
    .then((imageClassification) => {
      res.status(200).send({
        classification: imageClassification,
      });
    })
    .catch((err) => {
      console.log(err);
      res
        .status(500)
        .send("Something went wrong while fetching image from URL.");
    });
});

function whatIsThis(url) {
  return new Promise((resolve, reject) => {
    image(url, async (err, image) => {
      if (err) {
        reject(err);
      } else {
        const channelCount = 3;
        const pixelCount = image.width * image.height;
        const vals = new Int32Array(pixelCount * channelCount);

        let pixels = image.data;

        for (let i = 0; i < pixelCount; i++) {
          for (let k = 0; k < channelCount; k++) {
            vals[i * channelCount + k] = pixels[i * 4 + k];
          }
        }

        const outputShape = [image.height, image.width, channelCount];

        const input = tf.tensor3d(vals, outputShape, "int32");

        const model = await mobilenet.load();

        let temp = await model.classify(input);

        resolve(temp);
      }
    });
  });
}

const port = process.env.PORT || 80;

const path = require("path");

app.use(express.static(path.join(__dirname, "client/build")));

app.get("*", (req, res) => {
  res.sendFile("./client/build/index.html", { root: __dirname });
});

server.listen(port, (req, res) => {
  console.log(`Server is up and running @ port ${port}`);
});
