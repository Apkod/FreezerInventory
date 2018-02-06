var express = require('express');
var router = express.Router();
var path = require('path');
var fs = require("fs");
var file = process.cwd() + "/" + "test.db";
var sqlite3 = require("sqlite3").verbose();

function monthAdd(date, month) {
    var temp = date;
    temp = new Date(date.getFullYear(), date.getMonth(), 1);
    temp.setMonth(temp.getMonth() + (month + 1));
    temp.setDate(temp.getDate() - 1);

    if (date.getDate() < temp.getDate()) {
        temp.setDate(date.getDate());
    }
    return temp;
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.sendFile(path.join(__dirname, '../', 'views', 'index.html'));
});

router.get('/inventoryitems', function(req,res){
  // check if database exists
  var exists = fs.existsSync(file);
  var createddb = false;

  if(!exists) {
    console.log("Creating DB file.");
    fs.openSync(file, "w");
    createddb = true;
  }

  var db = new sqlite3.Database(file);
  var myJSON;

  db.serialize( () => {
    if(createddb) {
      db.run("CREATE TABLE Settings (printerpresent UNSIGNED INT, addeditemscounter UNSIGNED INT)");
      db.run("CREATE TABLE ItemList (id INT PRIMARY KEY, type TEXT, description TEXT, entered DATE, bbd DATE, usebefore DATE)");

      //Insert hardcoded initial data, just to have some sample data in the database
      var id = 1;
      var type = "meat";
      var description = "Meatballs 400g";
      var entered = new Date().toLocaleDateString();
      console.log("entered is");
      console.log(entered);

      db.run("INSERT INTO ItemList VALUES (?,?,?,?,?,?)",id,type,description,entered,entered,entered );

      var printerpresent = 1;  // True
      var addeditemscounter = 1;
      db.run("INSERT INTO Settings VALUES (?,?)",printerpresent,addeditemscounter);
    }
    db.all("SELECT id,type,description,entered,bbd,usebefore FROM ItemList", function(err, rows) {
      if(err){
        console.log(err)
      }
      else{
        console.log("Successful3");
        console.log(rows);
        myJSON = rows;
        res.send(myJSON);
      }
    });
  });
  db.close();

  console.log("Ending");
  console.log(myJSON);
});

router.put('/inventoryitems', function(req,res){
  var fs = require("fs");
  var file = process.cwd() + "/" + "test.db";
  var exists = fs.existsSync(file);

  console.log(req.body);

  if(exists) {
    var sqlite3 = require("sqlite3").verbose();
    var db = new sqlite3.Database(file);

    // get current time --> entered
    var entered = new Date().toLocaleDateString();
    var d = new Date();

    var usebefore;
    var useaddmonths;
    var bbd;

    // get the types use before time from database and relate to current date --> usebefore
    if((req.body.bbd !== undefined) && (req.body.bbd !== null)){
      bbd = new Date(req.body.bbd).toLocaleDateString();
      usebefore = bbd;
    }
    else {
      switch(req.body.type) {
        case "Fruits and berries":
        case "Vegetables":
        case "Mushroom":
        case "Bread":
        case "Skinny meat":
          useaddmonths = monthAdd(d, 12)
          usebefore = useaddmonths.toLocaleDateString();
          break;
        case "Fat meat":
          usebefore = d.monthAdd(d, 6).toLocaleDateString();
          bbd = usebefore;
          break;
        case "Skinny fish":
          usebefore = d.monthAdd(d, 7).toLocaleDateString();
          bbd = usebefore;
          break;
        case "Fat fish":
        case "Cookies and pastry":
          usebefore = d.monthAdd(d, 3).toLocaleDateString();
          break;
        case "Cooked fish":
          usebefore = d.monthAdd(d, 4).toLocaleDateString();
          break;
        default:
          usebefore = d.monthAdd(d, 3).toLocaleDateString();
          break;
      }
      bbd = usebefore;
    }

    var addeditemscounter;

    db.serialize( function() {
      db.all("SELECT printerpresent,addeditemscounter FROM Settings", function(err, rows) {
        if(err){
          console.log(err)
        }
        else{
          addeditemscounter = rows[0].addeditemscounter;
        }

        db.run("INSERT INTO ItemList VALUES (?,?,?,?,?,?)",addeditemscounter + 1,req.body.type,req.body.description,entered,bbd,usebefore );

        db.run("UPDATE Settings SET addeditemscounter = ?", addeditemscounter + 1 );

        db.all("SELECT id,type,description,entered,bbd,usebefore FROM ItemList", function(err, rows) {
          if(err){
            console.log(err)
          }
          else{
            myJSON = rows;
            res.send(myJSON);
          }
          db.close();
        });
      });
    });
  }
});

router.delete('/inventoryitems/:item_id', function(req,res){
  // check if database exists
  var exists = fs.existsSync(file);
  var createddb = false;
  var deleteid = req.params.item_id;

  if(exists) {
    fs.openSync(file, "r+");

    var sqlite3 = require("sqlite3").verbose();
    var db = new sqlite3.Database(file);

    db.serialize(function() {
      db.run("DELETE FROM ItemList WHERE id = ?",deleteid);

      db.all("SELECT id,type,description,entered,bbd,usebefore FROM ItemList", function(err, rows) {
        if(err){
          console.log(err)
        }
        else{
          console.log("Successful3");
          console.log(rows);
          myJSON = rows;
          res.send(myJSON);
        }
      });
      db.close();
    });
  }
  else {
    return res.send(err);
  }
});

module.exports = router;
