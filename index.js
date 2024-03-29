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

//Check if id exists
function idExists(idToCheck) {
  return userDatabase[idToCheck] !== undefined;
}

//Check if user exists
function getUsernameById(id) {
  return userDatabase[id] ? userDatabase[id].username : null;
}

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

//Use upload.single() with the form name 'upfile' to get a single file from a from
app.post("/api/users", urlencodedParser, async function (req, res) {
  let username = req.body.username;

  let existingUser = Object.values(userDatabase).find(
    (user) => user.username === username
  );

  if (existingUser) {
    console.log("User already exists return their id");
    return res.json({
      username: existingUser.username,
      _id: existingUser._id,
    });
  }

  console.log("User does not exist, creating new id for user");
  let uid = crypto.randomUUID().replace(/-/g, "");

  userDatabase[uid] = {
    username: username,
    _id: uid,
  };

  return res.json({
    username: username,
    _id: uid,
  });
});

app.get("/api/users", (req, res) => {
  return res.json(Object.values(userDatabase));
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
    //convert duration to a number
    let duration = parseInt(req.body.duration, 10); // convert to number
    //we will split the date up to ensure the date doesn't convert
    let inputDateString = req.body.date;

    //We will check to see if we have a valid date/time entry, if not we will use the current date and time
    let exercise_date;
    if (!inputDateString || !DateTime.fromISO(inputDateString).isValid) {
      exercise_date = DateTime.utc();
    } else {
      exercise_date = DateTime.fromISO(inputDateString, { zone: "utc" });
    }

    let storeDate = exercise_date.toISO();
    let date = exercise_date.toFormat("EEE MMM dd yyyy");

    //Add info to the database
    let exerciseEntry = {
      description: description,
      duration: duration,
      date: storeDate,
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

  // if (!idExists(id)) {
  //   return res.json({
  //     error: "User Does Not Exist",
  //   });
  // }

  let logs = exerciseDatabase[id] || []; // All logs for the user

  logs = logs.map((log) => {
    let logDate = DateTime.fromISO(log.date, { zone: "utc" });
    return {
      ...log,
      date: logDate.toFormat("EEE MMM dd yyyy"), // Display in GMT/UTC
    };
  });

  // Optional filters
  if (req.query.from || req.query.to) {
    let fromDate = req.query.from ? new Date(req.query.from) : null;
    let toDate = req.query.to ? new Date(req.query.to) : null;

    logs = logs.filter((log) => {
      let logDate = new Date(log.date);
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
