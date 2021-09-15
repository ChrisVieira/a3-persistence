const { report } = require("process"),
  express = require("express"),
  mongodb = require("mongodb"),
  app = express();

const uri =
  "mongodb+srv://" +
  "test_user" +
  ":" +
  "tester_user_pw" +
  "@" +
  "cluster0.dpk53.mongodb.net/";

const fs = require("fs"),
  // IMPORTANT: you must run `npm install` in the directory for this assignment
  // to install the mime library used in the following line of code
  mime = require("mime"),
  dir = "public/",
  port = 3000;

// Client representing the database
const client = new mongodb.MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// The collection we are connected to
let collection = null;

// Connects the client and sets up the collection
client
  .connect()
  .then(() => {
    // will only create collection if it doesn't exist
    return client.db("Assignment3DB").collection("test_08");
  })
  .then((__collection) => {
    // store reference to collection
    collection = __collection;
    // blank query returns all documents
    return collection.find({}).toArray();
  });

// route to get all docs
app.get("/", (req, res) => {
  sendFile(res, "public/index.html");
});

app.use(express.static("public"));
app.use(express.json());

// Handles adding an item to the forum
app.post("/submit", function (request, response) {
  console.log("\n\nNEW POST DATA REQUEST");

  // Stores the data we read in
  let dataString = "";
  // Stores the new student we are adding
  let new_student = "";

  request.on("data", async function (data) {
    dataString += data;

    let dataStringParsed = JSON.parse(dataString);

    let studentHours = getStudentHours(dataStringParsed.StudentRole);

    // Make the new student
    new_student = {
      StudentName: dataStringParsed.StudentName,
      StudentClass: dataStringParsed.StudentClass,
      StudentRole: dataStringParsed.StudentRole,
      StudentHours: studentHours,
    };

    // Insert it into the database
    mongo_db_promise = collection.insertOne(new_student);
  });

  request.on("end", async function () {
    // Wait for the data to be added to the datebase
    await mongo_db_promise;

    // Stores the entire collection
    let dbData = undefined;

    // Fetch the most up to date version of the data
    dbDataPromise = collection
      .find({})
      .toArray()
      .then((newData) => (dbData = newData));

    // Wait for the new data to be fetched
    await dbDataPromise;

    console.log("dbData");
    console.log(dbData);

    const stringDBData = JSON.stringify(dbData);
    response.writeHead(200, "OK", { "Content-Type": "text/plain" });

    // Sends forum data back to front end
    response.end(stringDBData);
  });
});

// Handles deleting an item from the forum
app.post("/deleteEntry", function (request, response) {
  let dataString = "";

  let delete_promise = undefined;

  request.on("data", async function (data) {
    console.log("\n\nNEW DELETE DATA REQUEST");

    dataString += data;

    let dataStringParsed = JSON.parse(dataString);

    // Delete the item from the database
    delete_promise = collection.deleteOne(newIDEntry(dataStringParsed));
  });

  request.on("end", async function () {
    // Wait for the delete to finish
    await delete_promise;

    let dbData = undefined;

    // Fetch up to date data
    dbDataPromise = collection
      .find({})
      .toArray()
      .then((newData) => (dbData = newData));

    await dbDataPromise;

    console.log("dbData");
    console.log(dbData);

    const stringDBData = JSON.stringify(dbData);
    response.writeHead(200, "OK", { "Content-Type": "text/plain" });

    // Sends forum data back to front end
    response.end(stringDBData);
  });
});

// Function used to make a newIDEntry {Key: Object} combo, allows cleaner code
function newIDEntry(dataStringParsed) {
  return { _id: mongodb.ObjectId(dataStringParsed._id) };
}

// Handles updating an item in the forum
app.post("/updateEntry", function (request, response) {
  let dataString = "";

  let updatePromise = undefined;

  request.on("data", function (data) {
    dataString += data;

    console.log("\n\nNEW UPDATE DATA REQUEST");

    let dataStringParsed = JSON.parse(dataString);

    let studentHours = getStudentHours(dataStringParsed.StudentRole);

    // Make a new student
    new_student = {
      StudentName: dataStringParsed.StudentName,
      StudentClass: dataStringParsed.StudentClass,
      StudentRole: dataStringParsed.StudentRole,
      StudentHours: studentHours,
    };

    // Update the entry with the same id in the database
    updatePromise = collection.update(newIDEntry(dataStringParsed), {
      $set: new_student,
    });
  });

  request.on("end", async function () {
    // Wait for the update to finish
    await updatePromise;

    let dbData = undefined;

    // Fetch the new data
    dbDataPromise = collection
      .find({})
      .toArray()
      .then((newData) => (dbData = newData));

    await dbDataPromise;

    console.log("dbData");
    console.log(dbData);

    const stringDBData = JSON.stringify(dbData);
    response.writeHead(200, "OK", { "Content-Type": "text/plain" });

    // Sends forum data back to front end
    response.end(stringDBData);
  });
});

// Handles the get request where we get all forum data
app.get("/initializeData", async function (response, response) {
  console.log("\n\nNEW GET INITIAL DATA REQUEST");

  let dbData = undefined;

  // Fetch the new up to date data
  dbDataPromise = collection
    .find({})
    .toArray()
    .then((newData) => (dbData = newData));

  await dbDataPromise;

  console.log("dbData");
  console.log(dbData);

  const stringDBData = JSON.stringify(dbData);
  response.writeHead(200, "OK", { "Content-Type": "text/plain" });
  // Sends forum data back to front end
  response.end(stringDBData);
});

// Handles sending a file over to the front end
const sendFile = function (response, filename) {
  const type = mime.getType(filename);

  fs.readFile(filename, function (err, content) {
    // if the error = null, then we've loaded the file successfully
    if (err === null) {
      // status code: https://httpstatuses.com
      response.writeHeader(200, { "Content-Type": type });
      response.end(content);
    } else {
      // file not found, error code 404
      response.writeHeader(404);
      response.end("404 Error: File Not Found");
    }
  });
};

// Lists on the respective port for the server
app.listen(process.env.PORT || port);

// Function that converts student role to hours per week
function getStudentHours(studentRole) {
  if (studentRole === "SA") {
    return 10;
  } else if (studentRole === "TA" || studentRole === "GLA") {
    return 20;
  } else {
    return -1;
  }
}
