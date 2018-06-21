var express = require('express');
var router = express.Router();
var path = require('path');
var fs = require("fs");
var file = process.cwd() + "/" + "test.db";
var sqlite3 = require("sqlite3").verbose();
var exec = require('child_process').exec;

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

function formatDateToString(date){
   // 01, 02, 03, ... 29, 30, 31
   var dd = (date.getDate() < 10 ? '0' : '') + date.getDate();
   // 01, 02, 03, ... 10, 11, 12
   var MM = ((date.getMonth() + 1) < 10 ? '0' : '') + (date.getMonth() + 1);
   // 1970, 1971, ... 2015, 2016, ...
   var yyyy = date.getFullYear();

   // create the format you want
   return (yyyy + "-" + MM + "-" + dd);
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
    console.log("Creating DB file");
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
      var adate = new Date();
      var entered = formatDateToString(adate);
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
    var adate = new Date();
    var entered = formatDateToString(adate);
    var d = new Date();

    var usebefore;
    var useaddmonths;
    var bbd;

    // get the types use before time from database and relate to current date --> usebefore
    if((req.body.bbd !== undefined) && (req.body.bbd !== null)){
      var bbddate = new Date(req.body.bbd);
      bbd = formatDateToString(bbddate);
      usebefore = bbd;
    }
    else {
      switch(req.body.type) {
        case "Fruits and berries":
        case "Vegetables":
        case "Mushroom":
        case "Bread":
        case "Skinny meat":
          useaddmonths = monthAdd(d, 12);
          usebefore = formatDateToString(useaddmonths);
          break;
        case "Fat meat":
          useaddmonths = monthAdd(d, 6);
          usebefore = formatDateToString(useaddmonths);
          break;
        case "Skinny fish":
          useaddmonths = monthAdd(d, 7);
          usebefore = formatDateToString(useaddmonths);
          break;
        case "Fat fish":
        case "Cookies and pastry":
          useaddmonths = monthAdd(d, 3);
          usebefore = formatDateToString(useaddmonths);
          break;
        case "Cooked fish":
          useaddmonths = monthAdd(d, 4);
          usebefore = formatDateToString(useaddmonths);
          break;
        default:
          useaddmonths = monthAdd(d, 3);
          usebefore = formatDateToString(useaddmonths);
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

        // create the printfile we will a little later print a label from
        var printfile = process.cwd() + "/" + "printfile.txt";
        var printdata = "*	FreezerInventory\n" + "ID:     " + (addeditemscounter + 1) + "\n" + "Type:   " + req.body.type + "\n" + "Added:  " + entered + "\n" + "Desc.:  " + req.body.description + "\n" + "Best before:   " + usebefore;
        fs.writeFileSync(printfile, printdata);

        db.run("UPDATE Settings SET addeditemscounter = ?", addeditemscounter + 1 );

        db.all("SELECT id,type,description,entered,bbd,usebefore FROM ItemList", function(err, rows) {
          if(err){
            console.log(err)
          }
          else{
            // print out the label from file printfile.txt in current folder
            var commandstring = 'lpr -o landscape ' + process.cwd() + "/" + "printfile.txt";
            exec( commandstring , function(error, stdout, stderr) {
              console.log('stdout: ' + stdout);
              console.log('stderr: ' + stderr);
              if (error !== null) {
                console.log('exec error: ' + error);
              }
            });
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
