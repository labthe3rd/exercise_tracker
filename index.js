/*  Programmer:   labthe3rd
 *  Date:         10/04/2023
 *  Description:  API takes data from an exercise form and returns the info in JSON
 *  Note:         This code was used to get my Backend API cert from freeCodeCamp.com feel free to use it as you wish.
 */

const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

//We'll use body parser to simplify things
var bodyParser = require("body-parser");

//We'll use crypto to generate the id for users
const crypto = require("crypto");

//We will be using the library luxon to handle the datetime because of javascripts timezone handling
const { DateTime } = require("luxon");

// create application/json parser
var jsonParser = bodyParser.json();

// create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false });

// instantiate user database
let userDatabase = {};

//instantatiate user exercise database
let exerciseDatabase = {};

//Create a function that checks if the id exists in the userdatabase
function idExists(idToCheck) {
  return Object.values(userDatabase).includes(idToCheck);
}

//Create a function that returns the username based on the id provided
function getUsernameById(id) {
  for (let [username, userId] of Object.entries(userDatabase)) {
    if (userId === id) {
      return username;
    }
  }
  return null; // or throw an error, depending on your preference
}

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

//Use upload.single() with the form name 'upfile' to get a single file from a from
app.post("/api/users", urlencodedParser, async function (req, res) {
  let username = req.body.username;

  if (username in userDatabase) {
    console.log("User already exists return their id");
    return res.json({
      username: username,
      _id: userDatabase[username],
    });
  }
  console.log("User does not exist, creating new id for usrer");
  let uid = crypto.randomUUID().replace(/-/g, "");
  userDatabase[username] = uid;

  return res.json({
    username: username,
    _id: uid,
  });
});

app.get("/api/users", (req, res) => {
  //First create array for the return
  let usersArray = Object.entries(userDatabase).map(([username, id]) => {
    return { [username]: id };
  });
  //now return the array
  return res.json(usersArray);
});

//Upload exercise to a database
app.post(
  "/api/users/:_id/exercises",
  urlencodedParser,
  async function (req, res) {
    console.log("ID detected is ", req.params._id);
    let id = req.params._id;
    if (!idExists(id)) {
      return res.json({
        error: "User Does Not Exist",
      });
    }
    //Since ID exists grab the username
    let username = getUsernameById(id);
    //Set description and duration direclty from body
    let description = req.body.description;
    let duration = req.body.duration;
    //we will split the date up to ensure the date doesn't convert
    let inputDateString = req.body.date;
    let exercise_date = DateTime.fromISO(inputDateString, { zone: "utc" });
    let date = exercise_date.toFormat("EEE MMM dd yyyy");

    //Add info to the database
    let exerciseEntry = {
      date: date,
      duration: duration,
      description: description,
    };

    // Append new exercise to the user's list of exercises
    if (!exerciseDatabase[id]) {
      exerciseDatabase[id] = [];
    }
    exerciseDatabase[id].push(exerciseEntry);

    return res.json({
      _id: id,
      username: username,
      date: date,
      duration: duration,
      description: description,
    });
  }
);

//Retrieve exercise logs for a user with optional queries
app.get("/api/users/:_id/logs", (req, res) => {
  let id = req.params._id;

  if (!idExists(id)) {
    return res.json({
      error: "User Does Not Exist",
    });
  }

  let logs = exerciseDatabase[id] || []; // All logs for the user

  // Optional filters
  if (req.query.from || req.query.to) {
    let fromDate = req.query.from
      ? DateTime.fromISO(req.query.from, { zone: "utc" })
      : null;
    let toDate = req.query.to
      ? DateTime.fromISO(req.query.to, { zone: "utc" })
      : null;

    logs = logs.filter((log) => {
      let logDate = DateTime.fromFormat(log.date, "EEE MMM dd yyyy", {
        zone: "utc",
      });
      return (
        (!fromDate || logDate >= fromDate) && (!toDate || logDate <= toDate)
      );
    });
  }

  // Optional limit
  if (req.query.limit) {
    let limit = parseInt(req.query.limit, 10);
    logs = logs.slice(0, limit);
  }

  return res.json({
    _id: id,
    username: getUsernameById(id),
    count: logs.length,
    log: logs,
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
  console.log(crypto.randomUUID().replace(/-/g, ""));
});
