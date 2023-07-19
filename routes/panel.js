const express = require('express');

module.exports = {
  addPanelPage: (req, res) => {
    res.render('add-panel.ejs', {
      title: "Add a new Panel"
      ,message: ''
    });
  },
  addPanel: (req, res) => {
    let user = req.user.user;
    let message = '';
    let pName = req.body.panelName;
    pName = pName.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '');
    let usernameQuery = "SELECT * FROM Suppliers WHERE supplierName = '" + pName + "'";
    db.query(usernameQuery, (err, result) => {
      if (err) {
        res.redirect('/');
      }
      if (result.recordset.length > 0) {
        message = 'Panel already exists';
        res.render('add-panel.ejs', {
          message,
          title: "Add a new panel"
        });
      } else {
        let query = "INSERT INTO Suppliers (supplierName,isOnlineCons,isOnlineB2B,isSupplierActive,onboardedDate) VALUES ('"  + pName + "',1,1,1,getdate());select SCOPE_IDENTITY() as id";
        db.query(query, (err, result) => {
          if (err)
          {
            logger.info(req.user.uName + " failed to add a panel " + pName );
            //res.redirect("/home");
          }
          else
          {
            logger.info(req.user.uName + " added a panel " + pName );
            //res.redirect("/home");
          }
          res.redirect('/edit-supplier/'+result.recordset[0].id);
        });
      }
    });
  },

  editPanelPage: (req, res) => {
    let clID = req.params.id;
    let query = "SELECT * FROM Clients WHERE clientID = '" + clID + "' ";
    db.query(query, (err, result) => {
      if (err) {
        res.redirect('/');
      }
      res.render('edit-client.ejs', {
        title: "Edit  Client"
        ,client: result.recordset
        ,message: ''
      });
    });
  },
  getPanels: (req, res) => {
    let query = "SELECT * FROM OnlinePanels ORDER BY onlinePanelName ASC";
    db.query(query, (err, result) => {
      if (err) {
        res.redirect('/home');
      }
      res.render('view-panels.ejs', {
        title: "View Panels"
        ,panels: result.recordset
        ,message: ""
      });
    });
  },

  panelPerformance: (req, res) => {
    let oID = req.params.id;
    let startDate = req.params.start;
    let endDate = req.params.end;
    let jobQuery =
            `SELECT OnlinePanels.onlinePanelName,
                     Quotes.quoteID,
                     Jobs.jobID,
                     Jobs.jobName,
                     Projects.projectID,
                     Quotes.quoteNo,
                     Quotes.quoteName,
                     Jobs.jobCPI,
                     PanelJobs.jobID,
                     PanelJobs.onlinePanelID,
                     PanelJobs.completesNumber,
                     PanelJobs.interviewCost
              FROM   Jobs,
                     Projects,
                     Quotes,
                     PanelJobs,
                     OnlinePanels
              WHERE  OnlinePanels.onlinePanelID = PanelJobs.onlinePanelID
                     AND Jobs.projectID = Projects.projectID
                     AND Projects.quoteID = Quotes.quoteID
                     AND PanelJobs.jobID = Jobs.jobID
                     AND PanelJobs.onlinePanelID = '` + oID + `'
                     AND Quotes.quoteDate >= '` + startDate + `'
                     and Quotes.quoteDate <= '` + endDate + `' `
    db.query(jobQuery, (err, jobResult) => {
      if (err) {
        console.log(err);
      }
      if(jobResult.recordset.length > 0){
        res.render('panel-performance.ejs', {
          title: "Panel Performance"
          ,panelJobs: jobResult.recordset
        });
      } else {
        let query = "SELECT * FROM OnlinePanels ORDER BY onlinePanelName ASC";
        db.query(query, (err, result) => {
          if (err) {
            logger.info("failed to select online panels on view panels page " + req.user.uName);
            //res.redirect("/home");
          }
          res.render('view-panels.ejs', {
            title: "View Panels"
            ,panels: result.recordset
            ,message: "No data for this panel"
          });
        });
      }
    });
  },
};
