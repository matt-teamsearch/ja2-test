const express = require('express');

module.exports = {

  getDashboard: (req, res) => {
    let yearStart = new Date()
    yearStart.setYear(req.params.year)
    if (yearStart.getMonth<4) {
      yearStart.setYear(yearStart.getYear()-1)
    }
    yearStart.setMonth(5)
    yearStart.setDate(0)
    let Q1end = new Date(yearStart.getFullYear(), yearStart.getMonth()+3, 0)
    let Q2end = new Date(yearStart.getFullYear(), yearStart.getMonth()+6, 0)
    let Q3end = new Date(yearStart.getFullYear(), yearStart.getMonth()+9, 0)
    let Q4end = new Date(yearStart.getFullYear()+1, 5, 0)
    let YTDquery = "SELECT * FROM Quotes LEFT JOIN Projects ON Quotes.quoteID = Projects.quoteID WHERE Quotes.quoteDate > '" + yearStart.toISOString().slice(0, 19).replace('T', ' ') + "'"
    let Q1query = "SELECT * FROM Quotes LEFT JOIN Projects ON Quotes.quoteID = Projects.quoteID WHERE Quotes.quoteDate BETWEEN '" + yearStart.toISOString().slice(0, 19).replace('T', ' ') + "' AND '" + Q1end.toISOString().slice(0, 19).replace('T', ' ') + "'"
    let Q2query = "SELECT * FROM Quotes LEFT JOIN Projects ON Quotes.quoteID = Projects.quoteID WHERE Quotes.quoteDate BETWEEN '" + Q1end.toISOString().slice(0, 19).replace('T', ' ') + "' AND '" + Q2end.toISOString().slice(0, 19).replace('T', ' ') + "'"
    let Q3query = "SELECT * FROM Quotes LEFT JOIN Projects ON Quotes.quoteID = Projects.quoteID WHERE Quotes.quoteDate BETWEEN '" + Q2end.toISOString().slice(0, 19).replace('T', ' ') + "' AND '" + Q3end.toISOString().slice(0, 19).replace('T', ' ') + "'"
    let Q4query = "SELECT * FROM Quotes LEFT JOIN Projects ON Quotes.quoteID = Projects.quoteID WHERE Quotes.quoteDate BETWEEN '" + Q3end.toISOString().slice(0, 19).replace('T', ' ') + "' AND '" + Q4end.toISOString().slice(0, 19).replace('T', ' ') + "'"
    db.query(YTDquery, (err, result) => {
      if(err){
        console.log(err)
        res.redirect("back")
      }
      db.query(Q1query, (err, Q1result) => {
        if(err){
          console.log(err)
          res.redirect("back")
        }
        db.query(Q2query, (err, Q2result) => {
          if(err){
            console.log(err)
            res.redirect("back")
          }
          db.query(Q3query, (err, Q3result) => {
            if(err){
              console.log(err)
              res.redirect("back")
            }
            db.query(Q4query, (err, Q4result) => {
              if(err){
                console.log(err)
                res.redirect("back")
              }
              res.render('dashboard1.ejs', {
                title: "Dashboard 1"
                ,YTDquotes: result.recordset
                ,Q1quotes: Q1result.recordset
                ,Q2quotes: Q2result.recordset
                ,Q3quotes: Q3result.recordset
                ,Q4quotes: Q4result.recordset
                ,message: ""
              });
            });
          });
        });
      });
    });
  },
  getUsers(req, res){
    if (req.user.uName != 'mworsley') {
      console.log(req.user.user)
      res.render('menu.ejs', {
        title: "Welcome to Job Analysis 2.0"
        ,message: "Insufficient priviledges to access that page"
    });
  }else {
    let RoleQuery = "SELECT * FROM Roles"
    let JobTitleQuery = "SELECT * FROM JobTitles"
    let StaffQuery = "SELECT * FROM Staff"
    let UserQuery = "SELECT * FROM Users"
    let AgentQuery = "SELECT * FROM Agents"
    let DailyQuery = "SELECT * FROM DailyInput"
    db.query(RoleQuery, (err, result) => {
      if(err){
        console.log(err)
        res.redirect("back")
      }
      db.query(JobTitleQuery, (err, Q1result) => {
        if(err){
          console.log(err)
          res.redirect("back")
        }
        db.query(StaffQuery, (err, Q2result) => {
          if(err){
            console.log(err)
            res.redirect("back")
          }
          db.query(UserQuery, (err, Q3result) => {
            if(err){
              console.log(err)
              res.redirect("back")
            }
            db.query(AgentQuery, (err, Q4result) => {
              if(err){
                console.log(err)
                res.redirect("back")
              }
              res.render('users.ejs', {
                title: "User management"
                ,roles: result.recordset
                ,jobTitles: Q1result.recordset
                ,staff: Q2result.recordset
                ,users: Q3result.recordset
                ,agents: Q4result.recordset
                ,message: ""
            });
          });
        });
      });
    });
    });
  }
  },
  addUser: (req, res) => {
    let staffCheckQuery = "SELECT * FROM Staff WHERE staffEmail='" + req.body.Email +"'"
    let userCheckQuery = "SELECT * FROM Users WHERE login='" + req.body.Username +"'"
    let Squery=""
    let Uquery=""
    db.query(staffCheckQuery, (err, dupResult) => {
      if (err) {
          logger.info("Error checking for duplicate email while adding a new user "+req.body.Email);
          //res.redirect("/home");
      }
      db.query(userCheckQuery, (err, dupUResult) => {
        if (err) {
            logger.info("Error checking for duplicate user while adding a new user "+req.body.Username);
            //res.redirect("/home");
        }
        if (dupResult.recordset.length > 0){
          Squery = "UPDATE Staff SET staffName = '"  + req.body.staffName + "', staffJobTitleID = '" + req.body.jobTitle + "', staffJoined = '" + req.body.intJoin +"' WHERE staffEmail = '" + req.body.Email +"'";
        }
        else {
          Squery = "INSERT INTO Staff (staffName, staffEmail, staffJobTitleID, staffJoined) VALUES ('"  + req.body.staffName + "', '" + req.body.Email +"', '" + req.body.jobTitle + "', '" + req.body.intJoin +"')";
        }
        db.query(Squery, (err, Sresult) => {
          if (err)
          {
            console.log(user + " failed to add to staff " + req.body.staffName );
            res.render('menu.ejs', {
              title: ""
              ,message: 'Error while adding staff member'
            });
          }
          db.query(staffCheckQuery, (err, dup2Result) => {
            if (err) {
                logger.info("Error checking for duplicate email while adding a new user "+req.body.Email);
                //res.redirect("/home");
            }
            if (dupUResult.recordset.length > 0){
              Uquery = "UPDATE Users SET staffID = '"  + dup2Result.recordset[0].staffID + "', roleID = '" + req.body.Role +"', isUserActive = 'TRUE' WHERE login = '" + req.body.Username + "'";
            }
            else {
              Uquery = "INSERT INTO Users (staffID, roleID, isUserActive, login, password) VALUES ('"  + dup2Result.recordset[0].staffID + "', '" + req.body.Role +"', 'TRUE', '" + req.body.Username + "', HASHBYTES('SHA2_512','" + req.body.Password +"'))";
            }
              db.query(Uquery, (err, result) => {
                if (err)
                {
                  console.log(err);
                  res.render('menu.ejs', {
                    title: ""
                    ,message: 'Error while adding staff member'
                  });
                }
                res.render('menu.ejs', {
                  title: ""
                  ,message: 'Staff member added'
                });
              });
            });
          });
        });
      });
  }
}
