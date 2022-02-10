// Imports

const express = require("express"); // Node JS framework for REST APIs
const mongoose = require("mongoose"); // MongoDB framework
const ShortUrl = require("./models/shortUrl"); // Short URL model
const nanoid = require("nanoid"); // Used to generate id
const authRoute = require("./auth"); // Authentication Routes ('/auth/login', '/auth/signup')
const middleware = require("./middleware"); // Middleware module for verification of JWT token

const app = express(); // Express Application

// Setting properties of server and middleware

app.set("view engine", "ejs"); // Using EJS as our view engine
app.use(express.urlencoded({ extended: true })); // For URL encoding parsing
app.use(express.json()); // FOR JSON parsing
app.use("/api/auth", authRoute); // Setting up authentication routes

// Connection to the database
mongoose.connect(
  "mongodb+srv://admin-sam:KbeJMDYku3r16eCL@cluster0.86aot.mongodb.net/urlShortener?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  () => {
    console.log("Mongo DB connected.");
  }
);

// GET Routes

// Home Route - renders the frontend of the application
app.get("/", async (req, res) => {
  // Finds all the url entries and render them on the frontend
  const urls = await ShortUrl.find();

  res.render("index", { urls: urls });
});


// Short URL redirection route - All the short URL generated by our app gets 
// handled here for redirection to their original URL
app.get("/:shortUrl", async (req, res) => {

  // Finds the Entry in our database which contains the short field as this shortUrl
  const urlObject = await ShortUrl.findOne({ short: req.params.shortUrl });

  // If not found, then return 404 Error
  if (urlObject == null) {
    return res.sendStatus(404);
  }

  // Increment the click count for this short URL and save the changes
  urlObject.clicks++;
  urlObject.save();

  // Redirect to the original URL
  res.redirect(urlObject.full);
});

// POST Routes

// POST REQUESTS FROM FORM : FRONTEND
app.post("/shortUrls", async (req, res) => {

  // Take the various inputs from the body of request
  const fullUrl = req.body.full_url;
  const customAlias = req.body.custom_alias;
  const userName = req.body.user_name;
  let expire_at = req.body.expire_at;

  // If expire_at field is not given then set its value to the default value 30
  if (expire_at === "") {
    expire_at = new Date();
    expire_at.setDate(expire_at.getDate() + 30);
  }

  let shortUrl = "";

  // If customAlias given then 
  if (customAlias.length > 0) {

    // Check whether this customAlias exists in our database or not
    const doesExist = await ShortUrl.findOne({ short: customAlias });

    if (doesExist) {

      // If exists and the full url is same as one in the database then do nothing
      if (doesExist.full === fullUrl) {
        res.redirect('/')
        return;
      }

      // If exists and is already in use for different long url then return error response
      res.send("Error: Custom Alias Already in Use.");
      return;
    }

    shortUrl = customAlias;
  } else {
    // If userName field is given then use the userName in the encoding
    if (userName.length > 0) {
      shortUrl = nanoid.customAlphabet(userName + "abcABCdefDEF_098", 9)();
    } else {
      // If userName field is not given then do the standard encoding for the shortURL
      shortUrl = nanoid.nanoid(9);
    }
  }

  // Create the corresponding entry in the database
  await ShortUrl.create({
    full: fullUrl,
    short: shortUrl,
    expireAt: expire_at,
  });

  // Redirect to the home route
  res.redirect("/");
});

// API ROUTES

// API POST REQUEST FOR CREATION OF SHORT URL
app.post("/api/getShortUrl", middleware.verify, async (req, res) => {

  // Take the various inputs from the body of request
  const fullUrl = req.body.full_url;
  const customAlias = req.body.custom_alias;
  const userName = req.body.user_name;
  let expire_at = req.body.expire_at;

  // If expire_at field is not given then set its value to the default value 30
  if (expire_at === undefined) {
    expire_at = new Date();
    expire_at.setDate(expire_at.getDate() + 30);
  }

  let shortUrl = "";

  // If customAlias given then 
  if (customAlias) {

    // Check whether this customAlias exists in our database or not
    const doesExist = await ShortUrl.findOne({ short: customAlias });

    if (doesExist) {

      // If exists and the full url is same as one in the database then do nothing and return a valid response
      if (doesExist.full === fullUrl) {
        res.send({
          status: "SUCCESS",
          fullUrl: fullUrl,
          shortUrl: "http://18.206.223.141:80/" + doesExist.short,
        });
        return;
      }

      // If exists and is already in use for different long url then return error response
      res.send("Error: Custom Alias Already in Use.");
      return;
    }

    shortUrl = customAlias;
  } else {
    if (userName) {

      // If userName field is given then use the userName in the encoding
      shortUrl = nanoid.customAlphabet(userName + "abcABCdefDEF_098", 9)();

    } else {

      // If userName field is not given then do the standard encoding for the shortURL
      shortUrl = nanoid.nanoid(9);
    }
  }

  // Create the corresponding entry in the database
  await ShortUrl.create({
    full: fullUrl,
    short: shortUrl,
    expireAt: expire_at,
  });

  // Return a valid response with the shortURL
  res.send({
    status: "SUCCESS",
    fullUrl: fullUrl,
    shortUrl: "http://18.206.223.141:80/" + shortUrl,
    expireAt: expire_at,
  });
});

// API POST ROUTE FOR DELETION OF THE URL
app.post("/api/deleteURL", middleware.verify, (req, res) => {

  // Take the short_url from the request body
  const url = req.body.short_url;

  // Find the entry in the Database that contains this short_URL and Delete it
  ShortUrl.findOneAndDelete({ short: url })
    .then((response) => {
      // If it was deleted successfully, then send success response
      if (response) {
        res.send({ success: "URL Removed" });
      } else {

        // If it didn't existed then return ERROR response
        res.status(404).send("URL Not Found");
      }
    })
    .catch((err) => res.status(404).send(err)); // If Error then return error response

  return;
});

// SERVER START
app.listen(process.env.PORT || 80, () => {
  console.log(`Server running on port ${process.env.PORT || 80}`);
});
