var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

// console.log(Users)

app.auth = false;  // default authorization

app.get('/', 
function(req, res) {
  if (app.auth === false) {
    console.log('\n\n\nShortly.js: res.req.path', res.req.path)
    res.redirect('/login');
  }
  res.render('index');
});


app.get('/create', 
function(req, res) {
  if (app.auth === false) {
    console.log('\n\n\nShortly.js: res.req.path', res.req.path)
    res.redirect('/');
  }
  res.render('index');
});

app.get('/links', 
function(req, res) {
  if (app.auth === false) {
    console.log('\n\n\nShortly.js: res.req.path', res.req.path)
    res.redirect('/login');
  }
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/links', 
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your dedicated authentication routes here
// e.g. login, logout, etc.
/************************************************************/
app.post('/login', function(req, res) {
  // if the user exists 

  var user;
  var isNew = true;
  // loop through every user.  
  for(var i=0; i<Users.length; i++) {
    //check if the user matches the input user.
    user = Users.models[i];
    if (user.get('username') === req.body.username) {
      isNew = false;
      console.log('user exists in db');
    //check password 
      if (user.get('password') === req.body.password) {
      // if pass is correct route to "/"
        console.log('password match');
        app.auth = true;
        res.redirect('/');

      // else pass is incorect 
      } else {
      // alert bad pass
        console.log('bad password');
      }
    }
    console.log("\n\n\n\n model found: ", user.attributes);
  }


if (isNew){
  // add new user and send to "/"
  console.log('newUser created')
  Users.add(new User(req.body));
  app.auth = true;
  res.redirect('/');


}

  console.log('-----------------------------------------', Users.length)
/*
  Loop to check the users
  var myModel;

  for(var i=0; i<Users.length; i++) {
    myModel = Users.models[i];
    console.log("\n\n\n\n model found: ", myModel);
    }

*/
});

app.get('/login', 
function(req, res) {
  res.render('login');
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
