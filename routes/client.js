const express = require('express');

module.exports = {
  addClientPage: (req, res) => {
    res.render('add-client.ejs', {
      title: "Add a new Client"
      ,message: ''
      ,clientR:{}
      ,contactsR:[]
    });
  },
  addClient: (req, res) => {
    let user = req.user.user;
    let message = '';
    let clName = req.body.clientName;
    let accName = req.body.accountsName?"'"+req.body.accountsName+"'":'NULL';
    let accEmail = req.body.accountsEmail?"'"+req.body.accountsEmail+"'":'NULL';
    clName = clName.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '');
    let usernameQuery = "SELECT * FROM Clients WHERE clientName = @clientName";
    if (req.body.clientID) {
      let query = "UPDATE Clients set clientName=@clientName,accountsName=" + accName + ",accountsEmail=" + accEmail + " where clientID="+req.body.clientID;
      db.input("clientName",clName)
      db.query(query, (err, result) => {
        if (err)
        {
          logger.info(req.user.uName + " failed to update a client " + clName ,err);
          req.flash('error_msg','Failed to update client. Contact the system administrator')
          req.session.save(function () {
            res.redirect('/add-client/')
          })
        }
        else
        {
          logger.info(req.user.uName + " added a client " + clName );
          if (req.body.contacts) {
            let updateContact=(id)=>{
              let thisDb=new sql.Request();
              let q=`update contacts set contactName=@contactName,contactEmail=@contactEmail,contactRole=@contactRole,contactPhoneNo=@contactPhoneNo,excludeFromCsat=`+(req.body['csatExclude_'+id]=='1'?1:0)+` where contactID=`+id
              thisDb.input('contactName',req.body['contactName_'+id])
              thisDb.input('contactEmail',req.body['contactEmail_'+id])
              thisDb.input('contactRole',req.body['contactRole_'+id])
              thisDb.input('contactPhoneNo',req.body['contactPhoneNo_'+id])
              thisDb.query(q,(err,r)=>{
                if (err) {
                  console.log(err,q)
                }else {
                  logger.log("Contact updated",id)
                }
              })
            }
            if (typeof req.body.contacts == "string") {
              req.body.contacts=[req.body.contacts]
            }
            req.body.contacts.forEach((contactID, i) => {
              updateContact(contactID)
            });
          }
          req.flash('success_msg','Client updated')
        }
        res.redirect('/view-clients');
      });
    }else {
      db.input("clientName",clName)
      db.query(usernameQuery, (err, result) => {
        if (err) {
          logger.info("failed to add client " + clName + " " + req.user.uName);
        }
        if (result.recordset.length > 0) {
          req.flash('error_msg','Failed to add client. Client already exists')
          req.session.save(function () {
            res.redirect('back')
          })
        } else {
          let query = "INSERT INTO Clients (clientName,accountsName,accountsEmail) VALUES (@clientName,"  + accName + ","  + accEmail + ")";
          db.query(query, (err, result) => {
            if (err)
            {
              logger.info(req.user.uName + " failed to add a client " + clName ,err);
              req.flash('error_msg','Failed to add client. Contact the system administrator')
              req.session.save(function () {
                res.redirect('back')
              })
            }
            else
            {
              logger.info(req.user.uName + " added a client " + clName );
              req.flash('success_msg','Client added')
              req.session.save(function () {
                res.redirect('/view-clients/')
              })
            }
          });
        }
      });
    }
  },

  editClientPage: (req, res) => {
    let clID = req.params.id;
    let clientsQ = "SELECT * FROM Clients WHERE clientID = '" + clID + "' ";
    let contactsQ="select * from contacts where clientID='" + clID + "' ";
    db.multiple=true
    db.query(clientsQ+contactsQ, (err, result) => {
      if (err) {
        logger.info("failed to select clients on edit clients page " + req.user.uName);
        console.log(err)
      }
      res.render('add-client.ejs', {
        title: "Edit Client"
        ,clientR: result.recordsets[0][0]
        ,contactsR: result.recordsets[1]
        ,message: ''
      });
    });
  },
  getClients: (req, res) => {
    let query = `SELECT Clients.clientID,clientName,accountsName,accountsEmail,contactCount
    FROM Clients
    left join (select count(*) as contactCount,clientID from contacts group by clientID) c on c.clientID=Clients.clientID
    ORDER BY clientName ASC`;
    db.query(query, (err, result) => {
      if (err) {
        logger.info("failed to select clients on get clients page " + req.user.uName);
      }
      res.render('view-clients.ejs', {
        title: "View Clients"
        ,clients: result.recordset
        ,message: ""
      });
    });
  },

  clientPerformance: (req, res) => {
    let cID = req.params.id;
    let startDate = req.params.start;
    let endDate = req.params.end;
    let projectQuery =
          `SELECT Projects.projectID,
             Projects.projectCM,
             Projects.projectDP,
             Projects.projectTL,
             Projects.projectGrade,
             Projects.setupCost,
             Projects.dataCost,
             Projects.sampleCost,
             Projects.codingCost,
             Projects.verbsCodingNumber,
             Projects.quotedIR,
             Projects.finalIR,
             Projects.isProjectCommissioned,
             Projects.isProjectLive,
             Projects.isProjectClosed,
             Projects.isProjectCancelled,
             Quotes.quoteID,
             Quotes.quoteNo,
             Quotes.quoteName,
             Quotes.clientID,
             Quotes.contactID,
             Quotes.quoteDate,
             Quotes.isQuoteAsBusiness,
             Quotes.isQuoteAsConsumer,
             Quotes.isQuoteAsCATI,
             Quotes.isQuoteAsRecruitment,
             Quotes.isQuoteAsFace,
             Quotes.isQuoteAsOnline,
             Quotes.isQuoteAsInternational,
             Clients.clientName,
             Contacts.contactName,
             Contacts.contactRole,
             Contacts.contactEmail,
             Contacts.contactPhoneNo,
             Notes.noteText
      FROM   Clients,
             Contacts,
             Notes,
             Quotes
             LEFT JOIN Projects
                    ON Quotes.quoteID = Projects.quoteID
      WHERE  Quotes.clientID = Clients.clientID
             AND Quotes.contactID = Contacts.contactID
             AND Quotes.noteID = Notes.noteID
             AND Quotes.quoteDate >= '` + startDate + `'
             and Quotes.quoteDate <= '` + endDate + `'
             AND Quotes.clientID = '` + cID + `' `;
    let jobQuery =
          `SELECT Quotes.clientID,
             Quotes.quoteID,
             Jobs.projectID,
             Jobs.jobID,
             Jobs.jobName,
             Jobs.interviewsTarget,
             Jobs.jobCPI,
             Jobs.hourlyTarget,
             Jobs.isJobDay,
             Jobs.isJobEve,
             Jobs.isJobBusiness,
             Jobs.isJobConsumer,
             Jobs.isJobCATI,
             Jobs.isJobOnline,
             Jobs.isJobFace,
             Jobs.isJobRecruitment,
             Jobs.isJobValidation,
             Jobs.isJobRecontacts,
             Jobs.isJobInternational,
             Jobs.isJobConfirmit,
             Jobs.isJobInHouse,
             Jobs.expectedLOI,
             Jobs.timedLOI,
             Projects.setupCost,
             Projects.dataCost,
             Projects.sampleCost,
             Projects.codingCost,
             CONCAT(Year(Jobs.startDate), '-',
               RIGHT('0' + Rtrim(Month(Jobs.startDate)), 2), '-',
               RIGHT('0' + Rtrim(Day(Jobs.startDate)), 2))    as FstartDate,
             CONCAT(Year(Jobs.endDate), '-',
               RIGHT('0' + Rtrim(Month(Jobs.endDate)), 2), '-',
               RIGHT('0' + Rtrim(Day(Jobs.endDate)), 2))      as FendDate,
             CONCAT(Year(Jobs.dataDate), '-',
               RIGHT('0' + Rtrim(Month(Jobs.dataDate)), 2), '-',
               RIGHT('0' + Rtrim(Day(Jobs.dataDate)), 2))     as FdataDate,
             CONCAT(Year(Jobs.tablesDate), '-',
              RIGHT('0' + Rtrim(Month(Jobs.tablesDate)), 2), '-',
              RIGHT('0' + Rtrim(Day(Jobs.tablesDate)), 2))    as FtablesDate,
             DI.Interviews,
             DI.Hours,
             INC.IncCost,
             INC.IncCount,
             INC.IncAdm,
             SAMP.SampCost,
             SAMP.SampCount,
             OTH.OtherCost,
             PJOBS.OnlineCompletes,
             PJOBS.OnlineCost
      FROM   Projects
             LEFT JOIN Jobs
                    ON Jobs.projectID = Projects.projectID
             LEFT JOIN (SELECT DailyInput.jobID,
                               Sum(DailyInput.inputInterviews) AS 'Interviews',
                               Sum(DailyInput.inputHours)      AS 'Hours'
                        FROM   DailyInput
                        GROUP  BY DailyInput.jobID) DI
                    ON Jobs.jobID = DI.jobID
             LEFT JOIN (SELECT Incentives.jobID,
                               Sum(Incentives.incentiveCost)      AS IncCost,
                               Sum(Incentives.incentiveCount)     AS IncCount,
                               Sum(Incentives.incentiveAdminCost) AS IncAdm
                        FROM   Incentives
                        GROUP  BY Incentives.jobID) INC
                    ON Jobs.jobID = INC.jobID
             LEFT JOIN (SELECT Samples.jobID,
                               Sum(Samples.sampleCount) AS SampCount,
                               Sum(Samples.totalCost)   AS SampCost
                        FROM   Samples
                        GROUP  BY Samples.jobID) SAMP
                    ON Jobs.jobID = SAMP.jobID
             LEFT JOIN (SELECT OtherCosts.jobID,
                               Sum(OtherCosts.costAmount) AS OtherCost
                        FROM   OtherCosts
                        GROUP  BY OtherCosts.jobID) OTH
                    ON Jobs.jobID = OTH.jobID
             LEFT JOIN (SELECT PanelJobs.jobID,
                               Sum(PanelJobs.completesNumber) AS OnlineCompletes,
                               Sum(PanelJobs.interviewCost)   AS OnlineCost
                        FROM   PanelJobs
                        GROUP  BY PanelJobs.jobID) PJOBS
                    ON Jobs.jobID = PJOBS.jobID
             LEFT JOIN Quotes
                    ON Quotes.quoteID = Projects.quoteID
      WHERE  Quotes.clientID = '` + cID + `' `;
    let dailyQuery =
          `SELECT
              Sum(DailyInput.inputInterviews)              as Ints,
             Sum(DailyInput.inputHours)                    as Hours,
             Sum(DailyInput.inputHours * PayRates.payRate) as Pay,
             DailyInput.jobID
      FROM   DailyInput,
             Quotes,
             Projects,
             PayRates,
             Jobs
      WHERE  PayRates.payRateID = DailyInput.payRateID
             AND DailyInput.inputHours > 0
             AND DailyInput.jobID = Jobs.jobID
             AND Jobs.projectID = Projects.projectID
             AND Quotes.quoteID = Projects.quoteID
             AND Quotes.clientID = '` + cID + `'
      GROUP  BY DailyInput.jobID `;
    let quoteQuery = "SELECT * FROM Quotes WHERE Quotes.clientID = '" + cID + "' AND Quotes.quoteDate >= '" + startDate + "' and Quotes.quoteDate <= '" + endDate + "'";
    db.query(projectQuery, (err, projResult) => {
      if (err) {
        logger.info("failed to select projects on client performance page " + req.user.uName);
        //res.redirect("/home");
      }
      db.query(dailyQuery, (err, dailyResult) => {
        if (err) {
          logger.info("failed to select dailys on client performance page " + req.user.uName);
          //res.redirect("/home");
        }
        db.query(jobQuery, (err, jobResult) => {
          if (err) {
            logger.info("failed to select jobs on client performance page " + req.user.uName);
            //res.redirect("/home");
          }
          db.query(quoteQuery, (err, quoteResult) => {
            if (err) {
              logger.info("failed to select quotes on client performance page " + req.user.uName);
              //res.redirect("/home");
            }
            if(projResult.recordset.length > 0){
              res.render('client-performance.ejs', {
                title: "Client Performance"
                ,clientProjects: projResult.recordset
                ,clientJobs: jobResult.recordset
                ,clientDaily: dailyResult.recordset
                ,clientQuotes: quoteResult.recordset
              });
            } else {
              let query = "SELECT * FROM Clients ORDER BY clientName ASC";
              db.query(query, (err, result) => {
                if (err) {
                  logger.info("failed to select clients on client performance page " + req.user.uName);
                  //res.redirect("/home");
                }
                res.render('view-clients.ejs', {
                  title: "View Clients"
                  ,clients: result.recordset
                  ,message: "No quotes found for selected dates"
                  ,success_msg: req.flash('success_msg')
                  ,error_msg: req.flash('error_msg')
                });
              });
            }
          });
        });
      });
    });
  },
  clientStats:(req,res)=>{
    res.render('client-stats.ejs',{
      title:'Client Report',
    })
  },
};
