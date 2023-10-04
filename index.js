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
  return userDatabase[idToCheck] !== undefined;
}

//Create a function that returns the username based on the id provided
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

  //Check if it is an existing user in the database
  let existingUser = Object.values(userDatabase).find(
    (user) => user.username === username
  );

  //Return user data if it is an existing user
  if (existingUser) {
    console.log("User already exists return their id");
    return res.json({
      username: existingUser.username,
      _id: existingUser._id,
    });
  }

  //New user
  console.log("User does not exist, creating new id for user");
  let uid = crypto.randomUUID().replace(/-/g, "");

  //Add entry to userDatabase
  userDatabase[uid] = {
    username: username,
    _id: uid,
  };

  return res.json({
    username: username,
    _id: uid,
  });
});

//Return user list
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
    //Convert the duration to a number to meet the requirements of the test
    let duration = parseInt(req.body.duration, 10); // convert to number
    //we will split the date up to ensure the date doesn't convert
    let inputDateString = req.body.date;
    let exercise_date = inputDateString
      ? DateTime.fromISO(inputDateString, { zone: "utc" })
      : DateTime.now().setZone;
    //use the dateString format
    let date = exercise_date.toFormat("EEE MMM dd yyyy"); // use dateString format

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
      exercise: {
        date: date,
        duration: duration,
        description: description,
      },
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

  //Ensure logs data types are datestring and number
  logs = logs.map((log) => {
    log.date = DateTime.fromFormat(log.date, "EEE MMM dd yyyy", {
      zone: "utc",
    }).toISODate();
    log.duration = parseInt(log.duration, 10); // ensure it's a number
    return log;
  });

  // Optional filters
  if (req.query.from || req.query.to) {
    let fromDate = req.query.from
      ? DateTime.fromISO(req.query.from, { zone: "utc" })
      : null;
    let toDate = req.query.to
      ? DateTime.fromISO(req.query.to, { zone: "utc" })
      : null;

    logs = logs.filter((log) => {
      let logDate = DateTime.fromISO(log.date, { zone: "utc" }); // directly using DateTime.fromISO()
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
