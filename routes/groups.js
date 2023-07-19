const express = require('express');
const moment = require('moment');
module.exports = {
  addGroupPage(req, res) {
    let pID = req.params.id;
    let query = "SELECT Projects.quoteID, Projects.projectID, Quotes.quoteNo, Quotes.quoteName FROM Projects INNER JOIN Quotes ON Projects.quoteID = Quotes.quoteID WHERE Projects.projectID = '" + pID + "' ";
    let cpiQ=`
    select * from
    ProjectCosts
    left join CostTypes on ProjectCosts.costTypeID=CostTypes.costTypeID
    where projectID = `+pID
    db.query(query, (err, result) => {
      if (err) {

      }
      db.query(cpiQ, (err, cpiR) => {
        if (err) {

        }
        res.render('add-group.ejs', {
          title: "Add Group"
          ,project: result.recordset
          ,cpis: cpiR.recordset
          ,success_msg: req.flash('success_msg')
          ,error_msg: req.flash('error_msg')
          ,message: ''
        });
      })
    });
  },

  addGroup(req, res) {
    let jName = req.body.groupName;
    jName = jName.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '');
    let pID = req.body.projectID;
    console.log(req.body)
    let query = "SELECT Jobs.jobName FROM Jobs WHERE Jobs.projectID = '" + pID + "' AND jobs.jobName = '" + jName + "'";
    db.query(query, (err, result) => {
      if (result.recordset.length > 0){
        let query2 = "SELECT Projects.quoteID, Quotes.quoteNo, Quotes.quoteName, Projects.projectID FROM Projects INNER JOIN Quotes ON Projects.quoteID = Quotes.quoteID WHERE Projects.projectID = '" + pID + "' ";
        db.query(query2, (err, result2) => {
          if (err) {
            console.log(err)
          }
          req.flash('error_msg','Group name already exists')
          req.session.save(function () {
            res.redirect('/addgroup/'+req.body.projectID)
          })
        });
      }
      else {
        let user = req.user.user;
        let qID = req.params.id;
        let tInts = req.body.targetInterviews;
        let hTarget = req.body.hourlyTarget;
        let qCPI = req.body.quotedCPI;
        let aud = req.body.Audience;
        let met = req.body.Method;
        let shf = req.body.Shift;
        let lengthS = req.body.ExpectedLength;
        let lengthE = req.body.EndLength;
        let b2b = 0;
        let cons = 0;
        if (aud == 1 || aud ==3){ b2b = 1; };
        if (aud == 2 || aud ==3){ cons = 1; };
        let sDate = req.body.startDate;
        let eDate = req.body.endDate;
        let tDate = req.body.tablesDate;
        if (tDate) {
          tDate="'"+tDate+"'"
        }else {
          tDate='NULL'
        }
        if (!lengthE) {
          lengthE=0
        }
        let dDate = req.body.dataDate;
        let cati = req.body.CATIPhone;
        if (cati != 1){
          cati = 0;
        }
        let rec = req.body.Recruit;
        if (rec != 1){
          rec = 0;
        }
        let f2f = req.body.F2F;
        if (f2f != 1){
          f2f = 0;
        }
        let oline = req.body.Online;
        if (oline != 1){
          oline = 0;
        }
        let vali = req.body.Validation;
        if (vali != 1){
          vali = 0;
        }
        let recon = req.body.Recontact;
        if (recon != 1){
          recon = 0;
        }
        let interna = req.body.International;
        if (interna != 1){
          interna = 0;
        }
        let confirmit = req.body.Confirmit;
        if (confirmit != 1){
          confirmit = 0;
        }
        let dataProcessing = req.body.DP;
        if (dataProcessing != 1){
          dataProcessing = 0;
        }
        let inhouse = req.body.inHouse;
        if (inhouse != 1){
          inhouse = 0;
        }
        let hourly = req.body.hourly;
        if (hourly != 1){
          hourly = 0;
        }
        let sDay = 0;
        let sEve = 0;
        if (!req.body.hourlyTarget) {
          hTarget=0
        }
        db.query("select quoteName from quotes where quoteID=(select top 1 quoteID from projects where projectID="+pID+")",(err,projectR)=>{
          if (shf == 1 || shf ==3){ sDay = 1; }; if (shf == 2 || shf ==3){ sEve = 1; };
          let query3 = `INSERT INTO Jobs (projectID, jobName, startDate, endDate, dataDate, tablesDate, interviewsTarget, jobCPI, hourlyTarget, isJobDay, isJobEve, isJobBusiness, isJobConsumer, isJobCATI, isJobOnline, isJobFace,	isJobRecruitment, isJobValidation, isJobRecontacts, isJobInternational, isJobConfirmit, isJobDP, isJobInHouse, expectedLOI, timedLOI, isJobHourly, pdGroup, plannerGroup) VALUES ( '` + pID + `' , '` + jName + `' , '` + sDate + `' , '` + eDate + `' , '` + dDate  + `' , ` + tDate  + ` , '` + tInts + `'  , '` + qCPI + `'  , ` + hTarget + `  , '` + sDay + `'  , '` + sEve + `'  , '` + b2b + `'  , '` + cons + `'  , '` + cati + `'  , '` + oline + `'  , '` + f2f + `'  , '` + rec + `'  , '` + vali + `'  , '` + recon + `'  , '` + interna + `' , '` + confirmit + `' , '` + dataProcessing + `' , '` + inhouse + `'   , ` + lengthS + `   , ` + lengthE + ` , '` + hourly + `' ,'`+projectR.recordset[0].quoteName+`','`+projectR.recordset[0].quoteName+`')

          SELECT SCOPE_IDENTITY() as jobID`;
          db.query(query3, (err, result3) => {
            if (err)
            {
              console.log(req.user.uName + " failed to add a job called " + jName + " to project ID " + pID );
              console.log(err);
              console.log(query3);
              //res.redirect("/home");
            }
            let ids={}
            ids.projectID=pID
            ids.jobID=result3.recordset[0].jobID
            logChange(req,'jobs','jobCPI',qCPI,ids).catch(err=>console.log("couldn't add to changeLog",err))
            logChange(req,'jobs','interviewsTarget',tInts,ids).catch(err=>console.log("couldn't add to changeLog",err))
            let i=0
            function addCost(){
              if (i>=req.body.CPIs.length) {
                db.query("select quoteID from projects where projectID="+pID, (err, qRes) => {
                  res.redirect('/overview/' + qRes.recordset[0].quoteID);
                })
              }else {
                addQ="insert into JobCPIs (jobID,costID) VALUES ("+result3.recordset[0].jobID+","+req.body.CPIs[i]+")"
                db.query(addQ, (err, resp2) =>{
                  if(err){
                    logger.info(req.user.uName + " failed to update group CPI " + result3.recordset[0].jobID);
                    console.log(err)
                    console.log(addQ)
                  } else {
                    i++
                    addCost()
                  }
                })
              }
            }
            addCost()
          });
        })
      }
    });
  },

  editGroup(req, res){
    let jID = req.params.id;
    let query = "SELECT Jobs.jobID, Jobs.jobName, Jobs.interviewsTarget, ViewJobsStats.CPIbasic as jobCPI,	Jobs.hourlyTarget, Jobs.isJobDay, Jobs.isJobEve, Jobs.isJobBusiness, Jobs.isJobConsumer, Jobs.isJobCATI,	Jobs.isJobOnline,	Jobs.isJobFace,	Jobs.isJobRecruitment, Jobs.isJobValidation, Jobs.isJobRecontacts, Jobs.isJobInternational, Jobs.isJobHourly, Jobs.projectID, Jobs.isJobConfirmit, Jobs.isJobDP, Jobs.isJobInHouse, Jobs.expectedLOI, Jobs.timedLOI, Quotes.quoteNo, Quotes.quoteName, Quotes.quoteID, startDate, endDate, dataDate, tablesDate, CPIreduction,Jobs.isJobDeskResearch,Jobs.sponsorJobID,Jobs.vistaName FROM Jobs LEFT JOIN ViewJobsStats on ViewJobsStats.jobID=Jobs.jobID, Projects, Quotes WHERE Jobs.projectID = Projects.projectID AND Projects.quoteID = Quotes.quoteID AND Jobs.jobID = '"+ jID + "'";
    let incentiveQuery = "SELECT Incentives.incentiveCost, Incentives.incentiveID, Incentives.incentiveCount, Incentives.incentiveAdminCost, Incentives.incentiveType, Jobs.jobName, Jobs.jobID, Quotes.quoteNo, Quotes.quoteName, Quotes.quoteID, Projects.projectID FROM Incentives, Jobs, Projects, Quotes WHERE Quotes.quoteID = Projects.quoteID AND Projects.projectID = Jobs.projectID AND Incentives.jobID = Jobs.jobID AND Incentives.jobID = '" + jID + "'";
    let costQuery = "SELECT OtherCosts.costName, OtherCosts.costAmount, OtherCosts.costID, Jobs.jobName, Jobs.jobID, Quotes.quoteNo, Quotes.quoteName, Quotes.quoteID, Projects.projectID FROM OtherCosts, Projects, Quotes, Jobs WHERE Quotes.quoteID = Projects.quoteID AND Projects.projectID = Jobs.projectID AND OtherCosts.jobID = Jobs.jobID AND OtherCosts.jobID = '" + jID + "'";
    let sampleQuery = "SELECT Projects.quoteID, Quotes.quoteNo, Quotes.quoteName, Jobs.jobName, Jobs.jobID, Samples.sampleCount, Samples.totalCost, Samples.sampleID, Samples.sampleProviderID, SampleProviders.sampleProviderName, Projects.projectID FROM Projects, Quotes, Jobs, Samples, SampleProviders WHERE Jobs.projectID = Projects.projectID AND Projects.quoteID = Quotes.quoteID AND Samples.jobID = Jobs.jobID AND Samples.sampleProviderID = SampleProviders.sampleProviderID AND Samples.jobID = '" + jID + "' ";
    let panelQuery = "SELECT PanelJobs.panelJobID, PanelJobs.onlinePanelID, PanelJobs.completesNumber, PanelJobs.interviewCost, OnlinePanels.onlinePanelName, PanelJobs.jobID FROM PanelJobs, OnlinePanels WHERE PanelJobs.onlinePanelID = OnlinePanels.onlinePanelID AND PanelJobs.jobID = '" + jID + "'";
    let datesQ=`
    SELECT * FROM
    JobDates
    WHERE jobDates.jobID=`+jID+`
    order by dateValue`
    let notesQ=`
    SELECT * FROM
    AllNotes WHERE AllNotes.jobID=`+jID+` AND AllNotes.page='edit-group-page'`
    let cpiQ=`
    select * from
    ProjectCosts
    left join CostTypes on ProjectCosts.costTypeID=CostTypes.costTypeID
    left join JobCPIs on JobCPIs.costID=ProjectCosts.costID and JobCPIs.jobID=`+jID+`
    where projectID IN (select projectID from Jobs where jobID=`+jID+`)
    AND costTypeCategory='CPI'`
    let dailysQ=`select jobID from AgentAllocation where jobID=`+jID+`
    UNION
    select jobID from DailyInput where jobID=`+jID
    let failed = false
    let allJobQ="select * from jobs where projectID=(select projectID from jobs where jobID="+jID+") and isnull(isJobDeskResearch,0)<>1"
    db.query(query, (err, result) =>{
      if(err){
        failed = true
      }
      db.query(incentiveQuery, (err, resultI) =>{
        if(err){
          failed = true
        }
        db.query(costQuery, (err, resultO) =>{
          if(err){
            failed = true
          }
          db.query(sampleQuery, (err, resultS) =>{
            if(err){
              failed = true
            }
            db.query(panelQuery, (err, resultOn) =>{
              if(err){
                failed = true
              }
              db.query(datesQ, (err, datesR) =>{
                if(err){
                  failed = true
                }
                db.query(notesQ, (err, notesR) =>{
                  if(err){
                    failed = true
                  }
                  db.query(cpiQ, (err, cpiR) =>{
                    if(err){
                      failed = true
                    }
                    db.query(dailysQ, (err, dailysR) =>{
                      if(err){
                        failed = true
                      }
                      db.query(allJobQ, (err, allJobR) =>{
                        if(err){
                          failed = true
                        }
                        if(failed){
                          logger.info(req.user.uName + " failed to edit job with id "+ jID)
                          res.redirect("/500")
                        } else {
                          res.render('edit-group.ejs', {
                            title: "Edit group"
                            ,group: result.recordset[0]
                            ,incentives: resultI.recordset
                            ,costs: resultO.recordset
                            ,samples: resultS.recordset
                            ,onlines: resultOn.recordset
                            ,jobDates: datesR.recordset
                            ,notes: notesR.recordset
                            ,cpis: cpiR.recordset
                            ,hasDailys: dailysR.recordset.length>0?true:false
                            ,allJobs:allJobR.recordset
                            ,message: ''
                          });
                        }
                      })
                    })
                  })
                })
              })
            });
          });
        });
      });
    });
  },
  updateGroupAjax: (req,res) => {
    let query=""
    if (req.body[0].query=='delete') {
      query=`DELETE FROM `+req.body[0].table+` WHERE `+req.body[0].idfield+`=`+req.body[0].id
    }else{
      query=`UPDATE `+req.body[0].table+` SET `+req.body[0].values+` WHERE `+req.body[0].idfield+`=`+req.body[0].id
    }
    let i=0
    let stringValues=Object.entries(req.body[0].stringValues)
    function addStrings(){
      if (i<stringValues.length) {
        db.input(stringValues[i][0],stringValues[i][1])
        i++
        addStrings()
      }
    }
    addStrings()
    db.query(query, (err, resp) =>{
      if (err) {
        res.status(500).send({error: 'Failed to update'})
        console.log(err)
        console.log(query)
        console.log(req.body[0])
      }else {
        let ids={}
        ids[req.body[0].idfield]=req.body[0].id
        if (req.body[0].fieldsArr.includes("jobCPI") || req.body[0].fieldsArr.includes("interviewsTarget") || req.body[0].fieldsArr.includes("CPIreduction")) {
          logChange(req,'jobs','jobCPI',req.body[0].valuesArr[req.body[0].fieldsArr.indexOf("jobCPI")],ids).catch(err=>console.log("couldn't add to changeLog",err))
          logChange(req,'jobs','interviewsTarget',req.body[0].valuesArr[req.body[0].fieldsArr.indexOf("interviewsTarget")],ids).catch(err=>console.log("couldn't add to changeLog",err))
          logChange(req,'jobs','CPIreduction',req.body[0].valuesArr[req.body[0].fieldsArr.indexOf("CPIreduction")],ids).catch(err=>console.log("couldn't add to changeLog",err))
        }else {
          req.body[0].fieldsArr.forEach((field, i) => {
            logChange(req,'jobs',field,req.body[0].valuesArr[i],ids).catch(err=>console.log("couldn't add to changeLog",field))
          });
        }
        logger.info(req.user.uName+" ran updateGroupAjax ",query)
        res.status(200).send('success')
      }
    })
  },
  updatePastTarget: (req,res) => {
    db.query("SELECT hourlyTarget FROM Jobs WHERE jobID="+req.body.jobID, (err, oldTargetR) => {
      if (oldTargetR.recordset[0].hourlyTarget) {
        let targetQ = "insert into PastJobTargets (jobID,hourlyTarget,dateUntil) VALUES ("+req.body.jobID+"," + oldTargetR.recordset[0].hourlyTarget + ",cast(getdate() as date))"
        db.query(targetQ, (err, targetR) => {
          if (err) {
            res.status(500).send({error: 'Failed to update'})
            console.log(err)
            console.log(targetQ)
          }
          res.status(200).send('success')
        })
      }else {
        res.status(200).send('success')
      }
    })
  },
  checkGroupStart: (req,res) => {
    let dateCheck=new Date(req.body[0].date)
    let query="select min(inputDate) as startDate from DailyInput where jobID="+req.body[0].jobID
    db.query(query, (err, resp) =>{
      if (err) {
        res.status(500).send({error: 'Failed to check job dates'})
        console.log(err)
      }else{
        let stDate=new Date(resp.recordset[0].startDate)
        if (dateCheck.getTime()>stDate.getTime() && resp.recordset[0].startDate != null) {
          res.status(500).send({error: 'There are already hours/surveys applied to this job before this date. Reverting to earliest input date',date:resp.recordset[0].startDate})
        }else {
          res.status(200).send('success')
        }
      }
    })
  },
  checkGroupEnd: (req,res) => {
    let dateCheck=new Date(req.body[0].date)
    let query="select max(inputDate) as endDate from DailyInput where jobID="+req.body[0].jobID
    db.query(query, (err, resp) =>{
      if (err) {
        res.status(500).send({error: 'Failed to check job dates'})
        console.log(err)
      }else{
        let enDate=new Date(resp.recordset[0].endDate)
        if (dateCheck.getTime()<enDate.getTime() && resp.recordset[0].endDate != null) {
          res.status(500).send({error: 'There are already hours/surveys applied to this job after this date. Reverting to latest input date',date:resp.recordset[0].endDate})
        }else {
          res.status(200).send('success')
        }
      }
    })
  },
  addGroupDate: (req,res) => {
    let query=""
    query=`INSERT INTO JobDates (dateName,dateValue,jobID) VALUES ('`+req.body[0].dateName+`','`+req.body[0].dateValue+`',`+req.body[0].jobID+`) SELECT SCOPE_IDENTITY() as id`
    console.log(query)
    // res.status(200).send({id:1234})
    db.query(query, (err, resp) =>{
      if (err) {
        res.status(500).send({error: 'Failed to update'})
        console.log(err)
      }else {
        res.status(200).send(resp.recordset[0])
      }
    })
  },
  updateGroup(req, res){
    let user = req.user.user;
    let jName = req.body.groupName;
    jName = jName.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '');
    let jID = req.params.id;
    let pID = req.body.projectID;
    let qID = req.body.quoteID;
    let tInts = req.body.targetInterviews;
    let hTarget = req.body.hourlyTarget;
    let qCPI = req.body.quotedCPI;
    let aud = req.body.Audience;
    let met = req.body.Method;
    let shf = req.body.Shift;
    let sDate = req.body.startDate;
    let eDate = req.body.endDate;
    let tDate = req.body.tablesDate;
    let dDate = req.body.dataDate;
    let lengthS = req.body.ExpectedLength;
    let lengthE = req.body.EndLength;
    let b2b = 0;
    let cons = 0;
    if (aud == 1 || aud ==3){ b2b = 1; };
    if (aud == 2 || aud ==3){ cons = 1; };
    let cati = req.body.CATIPhone;
    if (cati != 1){
      cati = 0;
    }
    let rec = req.body.Recruit;
    if (rec != 1){
      rec = 0;
    }
    let f2f = req.body.F2F;
    if (f2f != 1){
      f2f = 0;
    }
    let oline = req.body.Online;
    if (oline != 1){
      oline = 0;
    }
    let vali = req.body.Validation;
    if (vali != 1){
      vali = 0;
    }
    let recon = req.body.Recontact;
    if (recon != 1){
      recon = 0;
    }
    let interna = req.body.International;
    if (interna != 1){
      interna = 0;
    }
    let confirmit = req.body.Confirmit;
    if (confirmit != 1){
      confirmit = 0;
    }
    let dataProcessing = req.body.DP;
    if (dataProcessing != 1){
      dataProcessing = 0;
    }
    let inhouse = req.body.inHouse;
    if (inhouse != 1){
      inhouse = 0;
    }
    let hourly = req.body.hourly;
    if (hourly != 1){
      hourly = 0;
    }
    let sDay = 0;
    let sEve = 0;
    db.query("SELECT hourlyTarget FROM Jobs WHERE jobID="+jID, (err, oldTargetR) => {
      let targetQ = "insert into PastJobTargets (jobID,hourlyTarget,dateUntil) VALUES ("+jID+"," + oldTargetR.recordset[0].hourlyTarget + ",cast(getdate() as date))"
      db.query(targetQ, (err, targetR) => {})
    })
      if (shf == 1 || shf ==3){ sDay = 1; }; if (shf == 2 || shf ==3){ sEve = 1; };
      let query3 = "UPDATE Jobs SET jobName = '" + jName + "', interviewsTarget = '" + tInts + "', startDate = '" + sDate + "', endDate = '" + eDate + "', dataDate = '" + dDate + "', tablesDate = '" + tDate + "',  jobCPI = '" + qCPI + "',  hourlyTarget = '" + hTarget + "',  isJobDay = '" + sDay + "',  isJobEve = '" + sEve  +  "', isJobBusiness = '"  + b2b + "',  isJobConsumer = '" + cons + "',  isJobCATI = '" + cati + "',  isJobOnline = '" + oline + "',  isJobFace = '" + f2f +  "', isJobRecruitment = '" + rec +  "', isJobValidation = '" + vali + "',  isJobRecontacts = '" + recon + "',  isJobInternational = '" + interna +  "', isJobConfirmit = '" + confirmit + "', isJobDP = '" + dataProcessing + "' , isJobInHouse = '" + inhouse + "', isJobHourly = '" + hourly + "', expectedLOI = '" + lengthS + "', timedLOI = '" + lengthE + "' WHERE projectID = '" + pID + "' AND jobID = '" + jID + "'";
      db.query(query3, (err, result3) => {
        if (err)
        {
          logger.info(req.user.uName + " failed to update a job called " + jName + " to project ID " + pID );
          logger.info(err)
          console.log(err);
          console.log(query3)
          console.log("--end--")
          //res.redirect("/home");
        }
        else
        {
          logger.info(req.user.uName + " updated a job called " + jName + " to project ID " + pID );
          console.log("Success: " + query3);
        }
        let DPQuery = "SELECT Users.staffID, Staff.staffName FROM Users INNER JOIN Staff ON Users.staffID = Staff.staffID INNER JOIN Roles ON Users.roleID = Roles.roleID WHERE (Staff.staffJobTitleID = 6 OR Staff.staffJobTitleID = 3 OR Staff.staffJobTitleID = 14 OR Staff.staffJobTitleID = 7) AND Staff.staffLeft IS NULL GROUP BY Users.staffID, Staff.staffName ORDER BY Staff.staffName ASC";
        let TLQuery = "SELECT Users.staffID, Staff.staffName FROM Users INNER JOIN Staff ON Users.staffID = Staff.staffID INNER JOIN Roles ON Users.roleID = Roles.roleID WHERE (Staff.staffJobTitleID = 8) AND Staff.staffLeft IS NULL GROUP BY Users.staffID, Staff.staffName ORDER BY Staff.staffName ASC";
        let CMQuery = "SELECT Users.staffID, Staff.staffName FROM Users INNER JOIN Staff ON Users.staffID = Staff.staffID INNER JOIN Roles ON Users.roleID = Roles.roleID WHERE (Staff.staffJobTitleID = 5 OR Staff.staffJobTitleID = 3 OR Staff.staffJobTitleID = 2) AND Staff.staffLeft IS NULL GROUP BY Users.staffID, Staff.staffName ORDER BY Staff.staffName ASC";
        let ProjectQuery = "SELECT Projects.projectID, Projects.projectCM, Projects.projectDP, Projects.projectTL, Projects.projectGrade, Projects.setupCost, Projects.dataCost, Projects.sampleCost, Projects.codingCost, Projects.verbsCodingNumber, Projects.quotedIR, Projects.finalIR, Projects.isProjectCommissioned, Projects.isProjectLive, Projects.isProjectClosed, Projects.isProjectCancelled, Quotes.quoteID, Quotes.quoteNo, Quotes.quoteName, Quotes.clientID, Quotes.contactID, Quotes.quoteDate, Quotes.isQuoteAsBusiness, Quotes.isQuoteAsConsumer, Quotes.isQuoteAsCATI, Quotes.isQuoteAsRecruitment, Quotes.isQuoteAsFace, Quotes.isQuoteAsOnline, Quotes.isQuoteAsInternational, Quotes.isQuoteAsDP, Clients.clientName, Contacts.contactName, Contacts.contactRole, Contacts.contactEmail, Contacts.contactPhoneNo, Notes.noteText FROM Clients, Contacts, Notes, Quotes LEFT JOIN Projects ON Quotes.quoteID = Projects.quoteID WHERE Quotes.clientID = Clients.clientID AND Quotes.contactID = Contacts.contactID AND Quotes.noteID = Notes.noteID AND Projects.projectID = '" + pID + "' ";
        let jobQuery = "SELECT Jobs.jobID, Jobs.jobName, Jobs.interviewsTarget, Jobs.jobCPI, Jobs.hourlyTarget, Jobs.isJobDay, Jobs.isJobEve, Jobs.isJobBusiness, Jobs.isJobConsumer, Jobs.isJobCATI, Jobs.isJobOnline, Jobs.isJobFace, Jobs.isJobRecruitment, Jobs.isJobValidation, Jobs.isJobRecontacts, Jobs.isJobInternational, Jobs.isJobDP, Projects.setupCost, Jobs.isJobConfirmit, Jobs.isJobInHouse, Jobs.expectedLOI, Jobs.timedLOI, Projects.dataCost, Projects.sampleCost, Projects.codingCost, CONCAT(YEAR(Jobs.startDate), '-', RIGHT('0' + RTRIM(MONTH(Jobs.startDate)), 2), '-', RIGHT('0' + RTRIM(DAY(Jobs.startDate)), 2)) as FstartDate, CONCAT(YEAR(Jobs.endDate), '-', RIGHT('0' + RTRIM(MONTH(Jobs.endDate)), 2), '-', RIGHT('0' + RTRIM(DAY(Jobs.endDate)), 2)) as FendDate, CONCAT(YEAR(Jobs.dataDate), '-', RIGHT('0' + RTRIM(MONTH(Jobs.dataDate)), 2), '-', RIGHT('0' + RTRIM(DAY(Jobs.dataDate)), 2)) as FdataDate, CONCAT(YEAR(Jobs.tablesDate), '-', RIGHT('0' + RTRIM(MONTH(Jobs.tablesDate)), 2), '-', RIGHT('0' + RTRIM(DAY(Jobs.tablesDate)), 2)) as FtablesDate, DI.Interviews, DI.Hours, INC.IncCost, INC.IncCount, INC.IncAdm, SAMP.SampCost, SAMP.SampCount, OTH.OtherCost FROM Projects LEFT JOIN Jobs ON Jobs.projectID = Projects.projectID LEFT JOIN (SELECT DailyInput.jobID, SUM(DailyInput.inputInterviews) AS 'Interviews', SUM(DailyInput.inputHours) AS 'Hours' FROM DailyInput WHERE inputDate<cast(getDate() as date) GROUP BY DailyInput.jobID) DI ON Jobs.jobID = DI.jobID LEFT JOIN (SELECT Incentives.jobID, SUM(Incentives.incentiveCost) AS IncCost, SUM(Incentives.incentiveCount) AS IncCount, SUM(Incentives.incentiveAdminCost) AS IncAdm FROM Incentives GROUP BY Incentives.jobID) INC ON Jobs.jobID = INC.jobID LEFT JOIN (SELECT Samples.jobID, SUM(Samples.sampleCount) AS SampCount, SUM(Samples.totalCost) AS SampCost FROM Samples GROUP BY Samples.jobID) SAMP ON Jobs.jobID = SAMP.jobID LEFT JOIN (SELECT OtherCosts.jobID, SUM(OtherCosts.costAmount) AS OtherCost FROM OtherCosts GROUP BY OtherCosts.jobID) OTH ON Jobs.jobID = OTH.jobID WHERE Projects.projectID = '" + pID + "'";
        let dailyQuery = "SELECT SUM(DailyInput.inputInterviews) AS Ints, SUM(DailyInput.inputHours) as Hours, DailyInput.inputDate, DailyInput.jobID FROM DailyInput WHERE DailyInput.inputHours > 0 AND inputDate<cast(getDate() as date) GROUP BY DailyInput.inputDate, DailyInput.jobID ORDER BY inputDate DESC";
        let failed = false
        db.query(dailyQuery, (err, resultD) => {
          if (err) {
            //res.redirect("/home");
            failed = true
            console.log(err);
          }
          db.query(jobQuery, (err, resultJ) => {
            if (err) {
              //res.redirect("/home");
              failed = true
              console.log(err);
            }
            db.query(ProjectQuery, (err, resultP) => {
              if (err) {
                //res.redirect("/home");
                failed = true
                console.log(err);
              }
              db.query(DPQuery, (err, resultDP) => {
                if (err) {
                  //res.redirect("/home");
                  failed = true
                  console.log(err);
                }
                db.query(TLQuery, (err, resultTL) => {
                  if (err) {
                    //res.redirect("/home");
                    failed = true
                    console.log(err);
                  }
                  db.query(CMQuery, (err, resultCM) => {
                    if (err) {
                      //res.redirect("/home");
                      failed = true
                      console.log(err);
                    }
                    if(failed){
                      logger.info(req.user.uName + " failed to get job with id "+ jID)
                      res.redirect("/500")
                    } else {
                    res.redirect("/overview/"+qID)
                  }
                  });
                });
              });
            });
          });
        });
      });
  },

  addIncentivePage(req, res) {
    let jID = req.params.id;
    let query = "SELECT Projects.quoteID, Quotes.quoteNo, Quotes.quoteName, Jobs.jobName, Jobs.jobID FROM Projects, Quotes, Jobs WHERE Jobs.projectID = Projects.projectID AND Projects.quoteID = Quotes.quoteID AND Jobs.jobID = '" + jID + "' ";
    db.query(query, (err, result) => {
      if (err) {
        //res.redirect("/home");
      }
      res.render('add-incentive.ejs', {
        title: "Add Incentive"
        ,project: result.recordset
        ,message: ''
      });
    });
  },

  addIncentive(req, res) {
    let user = req.user.user;
    let jID = req.params.id;
    let incCost = req.body.incentiveCost;
    let incCount = req.body.incentiveNumber;
    let incAdm = req.body.incAdminCost;
    let incType = req.body.incType;
    incType = incType.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '');
    let query = "INSERT INTO Incentives (jobID,	incentiveCost,	incentiveCount,	incentiveAdminCost,	incentiveType) VALUES ( '" + jID + "', '" + incCost + "', '" + incCount + "', '" + incAdm + "', '" + incType + "')";
    db.query(query, (err, result) => {
      if (err)
      {
        logger.info(req.user.uName + " failed to add an incentive to job ID " + jID );
        //res.redirect("/home");
      }
      else
      {
        logger.info(req.user.uName + " added an incentive to job ID " + jID );
      }
    });
    function reDirect(){
      res.redirect('/edit-group-page/'+jID);
    }
    setTimeout(reDirect,1000);
  },


  editIncentive(req, res) {
    let iID = req.params.id;
    let jID = req.params.id2;
    let incentiveQuery = "SELECT Incentives.incentiveCost, Incentives.jobID, Incentives.incentiveID, Incentives.incentiveCount, Incentives.incentiveAdminCost, Incentives.incentiveType, Jobs.jobName, Quotes.quoteNo, Quotes.quoteName, Projects.projectID FROM Incentives, Jobs, Projects, Quotes WHERE Quotes.quoteID = Projects.quoteID AND Projects.projectID = Jobs.projectID AND Incentives.jobID = Jobs.jobID AND Incentives.incentiveID = '" + iID + "'";
    db.query(incentiveQuery, (err, result) =>
    {
      res.render('edit-incentive.ejs', {
        title: "Edit Incentives"
        ,incentives: result.recordset
        ,message: ''
      });
    });
  },

  updateIncentive(req, res) {
    let user = req.user.user;
    let iID = req.params.id;
    let jID = req.params.id2;
    let incCost = req.body.incentiveCost;
    let incCount = req.body.incentiveNumber;
    let incAdm = req.body.incAdminCost;
    let incType = req.body.incType;
    incType = incType.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '');
    let incentiveQuery
    if(incCost == 0 && incAdm == 0 && incCount == 0){
      incentiveQuery = "DELETE FROM Incentives WHERE incentiveID = '" + iID + "'"
    } else {
      incentiveQuery = "UPDATE Incentives SET incentiveCost = '" + incCost + "', incentiveCount = '" + incCount + "', incentiveAdminCost = '" + incAdm + "', incentiveType = '" + incType + "' WHERE incentiveID = '" + iID + "'";}
      db.query(incentiveQuery, (err, result) => {
        if (err)
        {
          logger.info(req.user.uName + " failed to update an incentive for job ID " + jID );
          //res.redirect("/home");
        }
        else
        {
          logger.info(req.user.uName + " updated an incentive for job ID " + jID );
        }
      });
      function reDirect(){
        res.redirect('/edit-group-page/'+jID);
      }
      setTimeout(reDirect,1000);
    },

    addOtherCostPage(req, res) {
      let jID = req.params.id;
      let query = "SELECT Projects.quoteID, Quotes.quoteNo, Quotes.quoteName, Jobs.jobName, Jobs.jobID FROM Projects, Quotes, Jobs WHERE Jobs.projectID = Projects.projectID AND Projects.quoteID = Quotes.quoteID AND Jobs.jobID = '" + jID + "' ";
      db.query(query, (err, result) => {
        if (err) {
          //res.redirect("/home");
        }
        res.render('add-othercost.ejs', {
          title: "Add Other Cost"
          ,project: result.recordset
          ,message: ''
        });
      });
    },

    addOtherCost(req, res){
      let user = req.user.user;
      let jID = req.params.id;
      let cName = req.body.otherCostName;
      cName = cName.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '');
      let cAm = req.body.otherCostAmount;
      let query ="INSERT INTO OtherCosts VALUES ( '" + jID + "', '" + cName + "', '" + cAm + "')"
      db.query(query, (err, result) => {
        if (err)
        {
          logger.info(req.user.uName + " failed to add an other cost to job ID " + jID );
          //res.redirect("/home");
        }
        else
        {
          logger.info(req.user.uName + " added an other cost to job ID " + jID );
        }
      });
      function reDirect(){
        res.redirect('/edit-group-page/'+jID);
      }
      setTimeout(reDirect,1000);
    },

    editOtherCost (req, res){
      let cID = req.params.id;
      let jID = req.params.id2;
      let costQuery = "SELECT OtherCosts.costName, OtherCosts.costAmount, OtherCosts.costID, Jobs.jobName, Jobs.jobID, Quotes.quoteNo, Quotes.quoteName, Quotes.quoteID FROM OtherCosts, Projects, Quotes, Jobs WHERE Quotes.quoteID = Projects.quoteID AND Projects.projectID = Jobs.projectID AND OtherCosts.jobID = Jobs.jobID AND OtherCosts.costID = '" + cID + "'";
      db.query(costQuery, (err, result) =>
      {
        res.render('edit-costs.ejs', {
          title: "Edit Other Costs"
          ,costs: result.recordset
          ,message: ''
        });
      });
    },

    updateCost (req, res){
      let user = req.user.user;
      let cID = req.params.id;
      let jID = req.params.id2;
      let cName = req.body.costNa;
      let cNo = req.body.costAm;
      let updateQuery
      if(cNo == 0){
        updateQuery = "DELETE FROM OtherCosts WHERE OtherCosts.costID = '" + cID + "'"
      } else {
        updateQuery = "UPDATE OtherCosts SET costName = '" + cName + "', costAmount = '" + cNo + "' WHERE OtherCosts.costID = '" + cID + "'";}
        db.query(updateQuery, (err, result) => {
          if (err)
          {
            logger.info(req.user.uName + " failed to edit an other cost to job ID " + jID );
            //res.redirect("/home");
          }
          else
          {
            logger.info(req.user.uName + " edited an other cost to job ID " + jID );
          }
        });
        function reDirect(){
          res.redirect('/edit-group-page/'+jID);
        }
        setTimeout(reDirect,1000);
      },

      addSampleSpendPage (req, res){
        let jID = req.params.id;
        let query = "SELECT Projects.quoteID, Quotes.quoteNo, Quotes.quoteName, Jobs.jobName, Jobs.jobID FROM Projects, Quotes, Jobs WHERE Jobs.projectID = Projects.projectID AND Projects.quoteID = Quotes.quoteID AND Jobs.jobID = '" + jID + "' ";
        let query2 = "SELECT * FROM SampleProviders WHERE sampleProviderID > 1 ORDER BY sampleProviderName ASC"
        db.query(query2, (err, result2) => {
          db.query(query, (err, result) => {
            if (err) {
              //res.redirect("/home");
            }
            res.render('add-samplespend.ejs', {
              title: "Add Sample Spend"
              ,project: result.recordset
              ,providers: result2.recordset
              ,message: ''
            });
          });
        });
      },

      addSampleSpend (req, res){
        let user = req.user.user;
        let jID = req.params.id;
        let sCount = req.body.sampCount;
        let sCost = req.body.sampCost;
        let pID = req.body.provName;
        let samplequery = "INSERT INTO Samples VALUES ( '" + jID + "', '" + pID + "', '" + sCount + "', '" + sCost + "' )"
        db.query(samplequery, (err, result) => {
          if (err)
          {
            logger.info(req.user.uName + " failed to add sample spend to job ID " + jID );
            //res.redirect("/home");
          }
          else
          {
            logger.info(req.user.uName + " added sample spend to job ID " + jID );
          }
        });
        function reDirect(){
          res.redirect('/edit-group-page/'+jID);
        }
        setTimeout(reDirect,1000);
      },


      editSampleSpend (req, res){
        let jID = req.params.id2;
        let sID = req.params.id;
        let samplequery = "SELECT Projects.quoteID, Quotes.quoteNo, Quotes.quoteName, Jobs.jobName, Jobs.jobID, Samples.sampleCount, Samples.totalCost, Samples.sampleID, Samples.sampleProviderID, SampleProviders.sampleProviderName FROM Projects, Quotes, Jobs, Samples, SampleProviders WHERE Jobs.projectID = Projects.projectID AND Projects.quoteID = Quotes.quoteID AND Samples.jobID = Jobs.jobID AND Samples.sampleProviderID = SampleProviders.sampleProviderID AND Samples.sampleID = '" + sID + "' "
        let query2 = "SELECT * FROM SampleProviders WHERE sampleProviderID > 1 ORDER BY sampleProviderName ASC"
        db.query(query2, (err, result2) => {
          db.query(samplequery, (err, result) => {
            if (err) {
              return res.status(500).send(err);
            }
            res.render('edit-samplespend.ejs', {
              title: "Edit Sample Spend"
              ,samples: result.recordset
              ,providers: result2.recordset
              ,message: ''
            });
          });
        });
      },

      updateSampleSpend (req, res){
        let user = req.user.user;
        let jID = req.params.id2;
        let sID = req.params.id;
        let sCount = req.body.sampCount;
        let sCost = req.body.sampCost;
        let pID = req.body.provName;
        let updateQuery
        if(sCount == 0 && sCost == 0){
          updateQuery = "DELETE FROM Samples WHERE Samples.sampleID = '" + sID + "'"
        } else {
          updateQuery = "UPDATE Samples SET sampleCount = '" + sCount + "', totalCost = '" + sCost + "', sampleProviderID = '" + pID + "' WHERE Samples.sampleID = '" + sID + "'";}
          db.query(updateQuery, (err, result) => {
            if (err)
            {
              logger.info(req.user.uName + " failed to update sample spend to job ID " + jID );
              //res.redirect("/home");
            }
            else
            {
              logger.info(req.user.uName + " updated sample spend to job ID " + jID );
            }
          });
          function reDirect(){
            res.redirect('/edit-group-page/'+jID);
          }
          setTimeout(reDirect,1000);
        },

        addOnline(req, res){
          let jID = req.params.id;
          let onlineProviderQuery = "SELECT * FROM OnlinePanels";
          db.query(onlineProviderQuery, (err, result) => {
            if (err) {
              //res.redirect("/home");
            }
            db.query("select projectID from Jobs where jobID="+jID, (err, pidR) => {
              res.render('addOnline.ejs', {
                title: "Add Online Completes"
                ,providers: result.recordset
                ,projectID:pidR.recordset[0].projectID
                ,message: ''
              });
            })
          });
        },
        addOnlineInterviews(req, res){
          let user = req.user.user;
          let jID = req.params.id;
          let pID = req.body.provider;
          let comps = req.body.completes;
          let cost = req.body.cost;
          let onlineProviderQuery = "INSERT INTO PanelJobs (jobID, onlinePanelID, completesNumber, interviewCost) VALUES ('" + jID + "','" + pID + "'," + comps + "," + cost + ")";
          db.query(onlineProviderQuery, (err, result) => {
            if (err){
              logger.info(req.user.uName + " failed to update online interviews to job ID " + jID );
              //res.redirect("/home");
            }else{
              logger.info(req.user.uName + " updated online interviews to job ID " + jID );
              db.query("insert into ProjectCosts (costName,unitValue,units,projectID,costTypeID) VALUES ('Online ints "+moment.utc().format("DD/MM/YY HH:mm")+"',"+(cost/comps).toFixed(2)+","+comps+","+req.body.projectID+",3)", (err, insR) => {
                res.redirect('/edit-group-page/'+jID)
              })
            }
          });
        },
        editOnlineSpend (req, res){
          let jID = req.params.id2;
          let costQuery = "SELECT Jobs.jobID, Jobs.jobName, Projects.projectID, Quotes.quoteNo, Quotes.quoteName, Jobs.jobCPI, PanelJobs.panelJobID, PanelJobs.onlinePanelID, PanelJobs.completesNumber, PanelJobs.interviewCost FROM Jobs, Projects, Quotes, PanelJobs WHERE Jobs.projectID = Projects.projectID AND Projects.quoteID = Quotes.quoteID AND PanelJobs.jobID = Jobs.jobID AND Jobs.jobID = '" + jID + "'"
          let onlineProviderQuery = "SELECT * FROM OnlinePanels";
          db.query(onlineProviderQuery, (err, onResult) => {
            if (err) {
              //res.redirect("/home");
            }
            db.query(costQuery, (err, coResult) =>
            {
              res.render('edit-panel.ejs', {
                title: "Edit Panel Spend"
                ,costs: coResult.recordset
                ,providers: onResult.recordset
                ,message: ''
              });
            });
          });
        },

        updateOnlineSpend (req, res){
          let user = req.user.user;
          let oID = req.params.id;
          let jID = req.params.id2;
          let cost = req.body.intCost;
          let comps = req.body.compNo;
          let provider = req.body.provider;
          let updateQuery
          if(comps == 0 && cost == 0){
            updateQuery = "DELETE FROM PanelJobs WHERE PanelJobs.panelJobID = '" + oID + "'";
          } else {
            updateQuery = "UPDATE PanelJobs SET onlinePanelID = " + provider + ", completesNumber = " + comps + ", interviewCost = " + cost + " WHERE PanelJobs.panelJobID = '" + oID + "'";}
            db.query(updateQuery, (err, result) => {
              if (err)
              {
                logger.info(req.user.uName + " failed to edit an panel cost to job ID " + jID );
                //res.redirect("/home");
              }
              else
              {
                logger.info(req.user.uName + " edited an other panel to job ID " + jID );
              }
            });
            function reDirect(){
              res.redirect('/edit-group-page/'+jID);
            }
            setTimeout(reDirect,1000);
          },
        deleteGroup (req, res){
          let groupId = req.params.id;
          let existsCount = 0
          let deleteQuery = "DELETE FROM Jobs WHERE Jobs.jobID = " + groupId
          let checkForData = `SELECT jobID FROM DailyInput WHERE jobID = ` + groupId+`
            UNION
            SELECT jobID FROM QualityControl WHERE jobID = ` + groupId+`
            UNION
            SELECT jobID FROM AgentAllocation WHERE jobID = ` + groupId+`
            UNION
            SELECT jobID FROM CoachingNew WHERE jobID = ` + groupId
            let datesQ=`
            delete from JobDates
            where jobID=`+req.params.id
            let notesQ=`
            delete from AllNotes
            where jobID=`+req.params.id+` and tableName='datesTable'
            `
            let cpisQ=`
            delete from JobCPIs
            where jobID=`+req.params.id
          db.query(checkForData, (err, checkForDataR) =>{
            if(parseInt(checkForDataR.recordset.length) > 0){
              res.status(500).send({error: "Cannot delete target group - there are interviews, costs, QC checks, queries or other elements associated with it."})
            }else {
              db.query(deleteQuery+datesQ+notesQ+cpisQ, (err, result) =>{
                if(err){
                  logger.info(req.user.uName + " failed to delete group ID " + groupId);
                  res.status(500).send({error: "Cannot delete target group - there are interviews, costs, QC checks, queries or other elements associated with it."})
                } else {
                  logger.info(req.user.uName + " deleted group ID " + groupId);
                  res.send("Success")
                }
              });
            }
          })
        },
        duplicateGroup (req, res){
          let jobQ=`
          insert into Jobs (projectID,jobName,startDate,endDate,dataDate,tablesDate,interviewsTarget,jobCPI,hourlyTarget,expectedLOI,timedLOI,isJobDay,isJobEve,isJobBusiness,isJobConsumer,isJobConfirmit,isJobInHouse,isJobCATI,isJobOnline,isJobFace,isJobRecruitment,isJobValidation,isJobRecontacts,isJobInternational,isJobDP,vistaLink,isJobHourly,resourceTarget,closingIR,CPIreduction,pdGroup,plannerGroup,vistaName,presetDials,isJobDeskResearch,sponsorJobID,resourceSettings)
          select projectID,case when len(jobName)>25 then left(jobName, 25) else jobName end +' (copy)',startDate,endDate,dataDate,tablesDate,interviewsTarget,jobCPI,hourlyTarget,expectedLOI,timedLOI,isJobDay,isJobEve,isJobBusiness,isJobConsumer,isJobConfirmit,isJobInHouse,isJobCATI,isJobOnline,isJobFace,isJobRecruitment,isJobValidation,isJobRecontacts,isJobInternational,isJobDP,vistaLink,isJobHourly,resourceTarget,closingIR,CPIreduction,pdGroup,plannerGroup,vistaName,presetDials,isJobDeskResearch,sponsorJobID,REPLACE(REPLACE(REPLACE(resourceSettings,'"b2bHoursOnly":true','"b2bHoursOnly":false'),'"canGoDay":true','"canGoDay":false'),'"canGoEve":true','"canGoEve":false') from Jobs
          where jobID=`+req.params.id+`
          SELECT SCOPE_IDENTITY() as jobID`
          db.query(jobQ, (err, jobR) =>{
            if (err) {
              logger.info(err)
              console.log(err)
              res.status(500).send("Could not duplicate group")
            }
            let datesQ=`
            insert into JobDates (dateName,dateValue,jobID)
            select dateName,dateValue,`+jobR.recordset[0].jobID+` from JobDates
            where jobID=`+req.params.id
            let notesQ=`
            insert into AllNotes (tableName,jobID,otherID,note,page)
            select tableName,`+jobR.recordset[0].jobID+`,otherID,note,page from AllNotes
            where jobID=`+req.params.id+` and tableName='datesTable'
            `
            let cpisQ=`
            insert into JobCPIs (jobID,costID)
            select `+jobR.recordset[0].jobID+`,costID from JobCPIs
            where jobID=`+req.params.id
            db.query(datesQ+notesQ+cpisQ, (err, datesR) =>{
              let errors=[]
              function checkChanges(){
                return new Promise((resolve,reject)=>{
                  let c=0
                  function runChange(){
                    let change=req.query.changes[c]
                    if (change) {
                      db.query(`update jobs set `+change.field+`='`+change.value+`' where jobID=`+jobR.recordset[0].jobID,(err,changeR)=>{
                        if (err) {
                          console.log(err)
                          errors.push(err)
                        }
                        c++
                        runChange()
                      })
                    }else {
                      resolve()
                    }
                  }
                  if (req.query.changes) {
                    runChange()
                  }else {
                    resolve()
                  }
                })
              }
              checkChanges().then(e=>{
                if (req.query.ajax) {
                  db.query('select * from jobs where jobID='+jobR.recordset[0].jobID,(err,newJob)=>{
                    res.send({job:newJob.recordset[0],errors:errors})
                  })
                }else {
                  res.redirect('/edit-group-page/'+jobR.recordset[0].jobID)
                }
              }).catch(e=>res.status(500).send({error:e}))
            })
          });
        },
        updateGroupCPI (req,res){
          let deleteQ="delete from JobCPIs where jobID="+req.body[0].jobID
          let costs=req.body[0].costIDs
          let addQ=""
          let i=0
          db.query(deleteQ, (err, resp) =>{
            function addCost(){
              if (i>=costs.length) {
                res.send("Success")
              }else {
                addQ="insert into JobCPIs (jobID,costID) VALUES ("+req.body[0].jobID+","+costs[i]+")"
                db.query(addQ, (err, resp2) =>{
                  if(err){
                    logger.info(req.user.uName+' failed to updateGroupCPI',err)
                    logger.info(checkQ)
                    console.log(err)
                    console.log(addQ)
                    res.status(500).send({error: "Cannot update CPI"})
                  } else {
                    logger.info(req.user.uName+' ran updateGroupCPI',addQ)
                    i++
                    addCost()
                  }
                })
              }
            }
            addCost()
          })
        },
        addGroupAjax (req,res){
          let checkQ=`select * from jobs where jobName=@jobName and projectID=`+req.body[0].projectID
          let jobName=req.body[0].jobName.replace("'","").replace("'","").replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '');
          delete req.body[0].jobName
          db.input('jobName',jobName)
          db.query(checkQ, (err, checkR) =>{
            if (err) {
              logger.info(req.user.uName+' failed to addGroupAjax (checkQ)',err,checkQ)
              res.status(500).send({error: "Could not add target group"})
            }
            if (checkR.recordset.length==0) {
              let insertQ=`insert into jobs (jobName,`+Object.keys(req.body[0]).join(",")+`)
              VALUES
              (@jobName,`+Object.values(req.body[0]).join(",")+`)
              select SCOPE_IDENTITY() as id`
              db.input('jobName',jobName)
              db.query(insertQ, (err, insertR) =>{
                if (err) {
                  console.log(err)
                  logger.info(req.user.uName+' failed to addGroupAjax',err)
                  logger.info(insertQ)
                  res.status(500).send({error: "Could not add target group"})
                }else if (req.body[1]) {
                  let ids={}
                  ids.projectID=req.body[0].projectID
                  ids.jobID=insertR.recordset[0].jobID
                  logChange(req,'jobs','jobCPI',req.body[0].jobCPI,ids).catch(err=>console.log("couldn't add to changeLog",err))
                  logChange(req,'jobs','interviewsTarget',req.body[0].interviewsTarget,ids).catch(err=>console.log("couldn't add to changeLog",err))
                  let i=0
                  function addJobCPIs(){
                    if (i==req.body[1].length) {
                      res.status(200).send(insertR.recordset[0])
                    }else {
                      db.query('insert into JobCPIs (jobID,costID) VALUES ('+insertR.recordset[0].id+','+req.body[1][i]+')', (err, insertR) =>{
                        i++
                        addJobCPIs()
                      })
                    }
                  }
                  addJobCPIs()
                }else {
                  res.status(200).send(insertR.recordset[0])
                }
              })
            }else {
              logger.info(req.user.uName+" saw 'A target group already exists with that name'",checkQ,checkR,jobName)
              res.status(500).send({error: "A target group already exists with that name"})
            }
          })
        },
        getJobGroupings(req, res){
          groupingQ=`
          select jobID,jobName,`+req.params.groupCol+`
          from jobs where projectID=`+req.params.projectID
          db.query(groupingQ, (err, groupingR) =>{
            if (err) {
              console.log(err)
              logger.info(req.user.uName+' failed to getJobGroupings',err)
              logger.info(groupingQ)
              res.status(500).send({error: "Could not get grouping data for target groups."})
            }
            res.status(200).send(groupingR.recordset)
          })
        },
        onlineTracker(req, res){
          let allPanelQ=`select supplierID,supplierName from Suppliers where (isOnlineB2B=1 or isOnlineCons=1) and isSupplierActive=1 order by supplierName`
          let jobQ="select j.jobID,j.projectID,p.jobQuoteID,p.fullJobName,j.interviewsTarget,p.CPI,j.startDate,j.endDate from jobs j left join viewJobsStats p on p.jobID=j.jobID where j.jobID="+req.params.jobID
          db.query(allPanelQ, (err, allPanelR) =>{
            if (err) {
              console.log(err)
            }
            db.query(jobQ, (err, jobR) =>{
              if (err) {
                console.log(err)
              }
              res.render('online-tracker.ejs', {
                title: "Online Tracker"
                ,allPanels: allPanelR.recordset
                ,job:jobR.recordset[0]
              });
            })
          })
        },
        f2fTracker(req, res){
          let allAgentQ=`select a.agentID,a.agentName,s.supervisorName from FaceAgents a left join FaceSupervisors s on s.id=a.supervisorID where a.isActive=1 order by a.agentName`
          let jobQ="select j.jobID,p.fullJobName,j.interviewsTarget,p.CPI,j.startDate,j.endDate,j.vistaName,p.jobQuoteID from jobs j left join viewJobsStats p on p.jobID=j.jobID where j.jobID="+req.params.jobID
          let tabletQ="select t.tabletID,tabletName,tabletModel from FaceTablets t left join (select max(postedBy) as lastPosted,max(receivedBy) as lastReceived,tabletID from FaceTabletAllocations group by tabletID) a on a.tabletID=t.tabletID where isActive=1 and lastPosted is null or lastReceived<getDate()"
          db.query(allAgentQ, (err, allAgentR) =>{
            if (err) {
              console.log(err)
            }
            db.query(jobQ, (err, jobR) =>{
              if (err) {
                console.log(err)
                res.send("Could not find target group ID "+req.params.jobID+" ... Err: "+err)
              }else {
                db.query(tabletQ, (err, tabletR) =>{
                  if (err) {
                    console.log(err)
                  }
                  res.render('f2f-tracker.ejs', {
                    title: jobR.recordset[0].fullJobName+" - F2F Tracker"
                    ,allAgents: allAgentR.recordset
                    ,job:jobR.recordset[0]
                    ,tablets:tabletR.recordset
                  });
                })
              }
            })
          })
        },
        getPayclaimLinks(req,res){
          let q=`select * from PayclaimLinks where jobID=`+req.query.jobID
          db.query(q,(err,r)=>{
            res.send(r.recordset)
          })
        },
        updatePayclaimLinks(req,res){
          let thisDb=new sql.Request();
          let q=""
          if (req.body.pclID) {
            q=`update PayclaimLinks set linkName=@linkName,formVals=@formVals where pclID=`+req.body.pclID
          }else {
            q=`insert into PayclaimLinks (jobID,linkName,formVals) VALUES (`+req.body.jobID+`,@linkName,@formVals)`
          }
          thisDb.input("linkName",req.body.linkName)
          thisDb.input("formVals",JSON.stringify(req.body))
          thisDb.query(q,(err,r)=>{
            if (err) {
              console.log(err)
              res.status(500).send({error:err})
            }else {
              res.send("done")
            }
          })
        },
        getOnlineAllocations(req, res){
          let allocQ=`
          select allocationID,o.supplierID,s.supplierName,allocationName,sf.unitValue as setupFee,cpi.unitValue as panelCPI,targetCompletes,o.PO,redirectComplete,redirectScreenout,redirectQuotafull,inviteLink,o.spendID,o.setupFeeID,isClosed
          from
          OnlineAllocations o
          left join Suppliers s on s.supplierID=o.supplierID
    		  left join ProjectSpends cpi on cpi.spendID = o.spendID
    		  left join ProjectSpends sf on sf.spendID = o.setupFeeID
          where o.jobID=`+req.params.jobID
          let dailyQ="select * from OnlineDailyInput"
          let notesQ="select * from AllNotes where tableName='onlineTable' and [page]='online-tracker' and jobID="+req.params.jobID
          db.query(allocQ, (err, allocR) =>{
            if (err) {
              console.log(err)
            }
            db.query(dailyQ, (err, dailyR) =>{
              if (err) {
                console.log(err)
                res.status(500).send(err)
              }
              db.query(notesQ, (err, notesR) =>{
                if (err) {
                  console.log(err)
                  res.status(500).send(err)
                }
                res.send({
                  allocations: allocR.recordset,
                  dailys:dailyR.recordset,
                  notes:notesR.recordset,
                });
              })
            })
          })
        },
        getF2fAllocations(req, res){
          let allocQ=`
          select *
          from
          FaceAllocations f
          left join FaceAgents a on a.agentID=f.faceAgentID
          where jobID=`+req.params.jobID
          let dailyQ="select * from FaceDailyInput"
          let notesQ="select * from AllNotes where tableName='f2fTable' and [page]='f2f-tracker' and jobID="+req.params.jobID
          let tabletQ=`
          select a.allocationID,t.tabletName,t.tabletModel,a.faceAgentID,a.jobID,a.askiaID,g.agentName from
          FaceTabletAllocations a
          left join FaceTablets t on t.tabletID=a.tabletID
          left join FaceAgents g on g.agentID=a.faceAgentID
          where jobID=`+req.params.jobID+` and returnedDate is null order by isnull(postedDate,DATEADD(year,1,getdate())) DESC`
          let bonusQ="select * from FaceBonusAllocations where allocationID in (select allocationID from FaceAllocations where jobID="+req.params.jobID+")"
          db.query(allocQ, (err, allocR) =>{
            if (err) {
              console.log(err)
            }
            db.query(dailyQ, (err, dailyR) =>{
              if (err) {
                console.log(err)
                res.status(500).send(err)
              }
              db.query(notesQ, (err, notesR) =>{
                if (err) {
                  console.log(err)
                  res.status(500).send(err)
                }
                db.query(tabletQ, (err, tabletR) =>{
                  if (err) {
                    console.log(err)
                    res.status(500).send(err)
                  }
                  db.query(bonusQ, (err, bonusR) =>{
                    if (err) {
                      console.log(err)
                      res.status(500).send(err)
                    }
                    res.send({
                      allocations: allocR.recordset.map(el=>({...el,bonusCalc:bonusR.recordset.filter(b=>b.allocationID==el.allocationID).map(b=>b.calcID)})),
                      dailys:dailyR.recordset,
                      notes:notesR.recordset,
                      tabletAllocations:tabletR.recordset,
                    });
                  })
                })
              })
            })
          })
        },
        addOnlineAllocation(req, res){
          let insQ="insert into OnlineAllocations (supplierID,jobID,PO,targetCompletes) VALUES ('"+req.body.supplierID+"','"+req.body.jobID+"','"+req.body.PO+"',"+req.body.targetCompletes+"); SELECT SCOPE_IDENTITY() as allocationID"
          db.query(insQ, (err, insR) =>{
            if (err) {
              console.log(err)
              res.status(500).send({error:err})
            }
            res.status(200).send(insR.recordset[0])
          })
        },
        addF2fAllocation(req, res){
          let insQ="insert into FaceAllocations (faceAgentID,jobID) VALUES ('"+req.body.agentID+"','"+req.body.jobID+"'); SELECT SCOPE_IDENTITY() as allocationID"
          db.query(insQ, (err, insR) =>{
            if (err) {
              console.log(err,insQ)
              res.status(500).send({error:err})
            }
            res.status(200).send(insR.recordset[0])
          })
        },
        addOnlineDaily(req, res){
          let d=req.body.dte
          let ints=req.body.ints===undefined?null:req.body.ints
          let isInput=req.body.ints!==""
          db.query("select * from OnlineDailyInput where allocationID="+req.body.allocationID+" and inputDate='"+d+"'", (err, checkR) =>{
            if (checkR.recordset.length>0) {
              if (isInput) {
                db.query("update OnlineDailyInput set inputInterviews="+ints+" where allocationID="+req.body.allocationID+" and inputDate='"+d+"'", (err, insR) =>{
                  res.status(200).send()
                })
              }else {
                db.query("delete from OnlineDailyInput where allocationID="+req.body.allocationID+" and inputDate='"+d+"'", (err, insR) =>{
                  res.status(200).send()
                })
              }
            }else {
              db.query("insert into OnlineDailyInput (inputInterviews,inputDate,allocationID) VALUES ("+ints+",'"+d+"','"+req.body.allocationID+"')", (err, insR) =>{
                res.status(200).send()
              })
            }
          })
        },
        addF2fDaily(req, res){
          console.log(req.body)
          let d=req.body.dte
          let ints=req.body.ints===undefined?null:req.body.ints
          let isInput=req.body.ints!==""
          db.query("select * from FaceDailyInput where allocationID="+req.body.allocationID+" and inputDate='"+d+"'", (err, checkR) =>{
            if (checkR.recordset.length>0) {
              if (isInput) {
                db.query("update FaceDailyInput set inputInterviews="+ints+" where allocationID="+req.body.allocationID+" and inputDate='"+d+"'", (err, insR) =>{
                  res.status(200).send()
                })
              }else {
                db.query("delete from FaceDailyInput where allocationID="+req.body.allocationID+" and inputDate='"+d+"'", (err, insR) =>{
                  res.status(200).send()
                })
              }
            }else {
              db.query("insert into FaceDailyInput (inputInterviews,inputDate,allocationID) VALUES ("+ints+",'"+d+"','"+req.body.allocationID+"')", (err, insR) =>{
                res.status(200).send()
              })
            }
          })
        },
        deleteOnlineAllocation(req,res){
          db.query("delete from OnlineAllocations where allocationID="+req.body.allocationID, (err, insR) =>{
            if (err) {
              console.log(err)
              res.sendStatus(500).send({error:err})
            }
            res.status(200).send()
          })
        },
        deleteF2fAllocation(req,res){
          db.query("delete from FaceAllocations where allocationID="+req.body.allocationID, (err, insR) =>{
            if (err) {
              console.log(err)
              res.sendStatus(500).send({error:err})
            }
            res.status(200).send()
          })
        },
        getF2fTablets(req, res){
          let tabletQ="select t.tabletID,tabletName,tabletModel,case when lastReceived<cast(getDate() as date) or lastPosted is null then lastPosted else null end as lastPosted from FaceTablets t left join (select max(postedDate) as lastPosted,max(returnedDate) as lastReceived,tabletID from FaceTabletAllocations group by tabletID) a on a.tabletID=t.tabletID where isActive=1"
          db.query(tabletQ, (err, tabletR) =>{
            if (err) {
              console.log(err)
            }
            res.send(tabletR.recordset)
          })
        },
        addF2fTabletAllocation(req, res){
          let tabletQ="insert into FaceTabletAllocations (jobID,faceAgentID) VALUES ("+req.body.jobID+","+req.body.agentID+"); SELECT SCOPE_IDENTITY() as allocationID"
          db.query(tabletQ, (err, tabletR) =>{
            if (err) {
              console.log(err)
              res.sendStatus(500).send({error:err})
            }else {
              res.sendStatus(200).send(tabletR.recordset[0].allocationID)
            }
          })
        },
        deleteF2fTabletAllocation(req, res){
          let tabletQ="delete from FaceTabletAllocations where allocationID="+req.body.allocationID
          db.query(tabletQ, (err, tabletR) =>{
            if (err) {
              console.log(err)
              res.sendStatus(500).send({error:err})
            }
            res.sendStatus(200)
          })
        },
        changeDate:(req,res)=>{
          let q="insert into DateChanges (dateField,oldDate,newDate,changedBy,changedDate,isByClient,jobID,isConfirmed) VALUES ('"+req.body.dateField+"','"+moment(req.body.oldDate).format("YYYY-MM-DD")+"','"+moment(req.body.newDate).format("YYYY-MM-DD")+"',"+req.user.user+",getdate(),"+req.body.isByClient+","+req.body.jobID+","+req.body.isConfirmed+")"
          if (moment(req.body.oldDate).format("YYYY-MM-DD")!=moment(req.body.newDate).format("YYYY-MM-DD")) {
            db.query(q,(err,r)=>{
              if (err) {
                console.log(err,q)
                res.status(500).send(err)
              }
              res.send(200)
            })
          }else {
            res.send(200)
          }
        },
        addF2fBonusCalc:(req,res)=>{
          let q=`
          insert into FaceBonusCalcs (calcName,jobID,calcParams) VALUES (@calcName,`+req.body.jobID+`,@calcParams)
          select SCOPE_IDENTITY() as id
          `
          db.input('calcName',req.body.name)
          db.input('calcParams',JSON.stringify(req.body.params))
          db.query(q,(err,r)=>{
            if (err) {
              console.log(err)
              res.status(500).send({error:err})
            }
            db.query(`insert into FaceBonusAllocations (calcID,allocationID) VALUES (`+r.recordset[0].id+`,`+req.body.allocationID+`)`,(err,r2)=>{
              if (err) {
                console.log(err)
                res.status(500).send({error:err})
              }
              res.send({id:r.recordset[0].id})
            })
          })
        },
        getF2fBonusCalcs:(req,res)=>{
          let q=`
          select * from FaceBonusCalcs where jobID=`+req.query.jobID+`
          `
          db.query(q,(err,r)=>{
            if (err) {
              console.log(err)
              res.status(500).send({error:err})
            }
            res.send(r.recordset)
          })
        },
        updateF2fBonusAllocs:(req,res)=>{
          let delQ=`
          delete from FaceBonusAllocations where allocationID=`+req.body.allocationID
          db.query(delQ,(err,r)=>{
            if (err) {
              console.log(err)
              res.status(500).send({error:err})
            }
            let a=0
            function add(){
              let calc=req.body.calcs[a]
              if (calc) {
                db.query(`insert into FaceBonusAllocations (calcID,allocationID) VALUES (`+calc+`,`+req.body.allocationID+`)`,(err,r)=>{
                  if (err) {
                    console.log(err)
                  }
                  a++
                  add()
                })
              }else {
                res.send('done')
              }
            }
            if (req.body.calcs) {
              add()
            }else {
              res.send('done')
            }
          })
        },
        updateF2fBonus:(req,res)=>{
          let x=0
          function updateBonus(){
            let alloc=req.body.allocs[x]
            if (alloc) {
              let bonus={
                total:alloc.bonus?alloc.bonus.reduce((a,b)=>a+Number(b.bonus),0):0
              }
              let totalQ=`
              update FaceAllocations set bonus=`+bonus.total+` where allocationID=`+alloc.allocationID+`;
              update FaceDailyInput set bonus=0 where allocationID=`+alloc.allocationID
              db.query(totalQ,(err,tR)=>{
                if (err) {
                  console.log(err)
                }
              })
              let y=0
              function updateShift(){
                let shift=alloc.shifts[y]
                if (shift) {
                  if (shift.bonus) {
                    bonus[shift.date]=shift.bonus.reduce((a,b)=>a+Number(b.bonus),0)
                    let shiftQ=`update FaceDailyInput set bonus=`+bonus[shift.date]+` where allocationID=`+alloc.allocationID+` and inputDate='`+shift.date+`'`
                    db.query(shiftQ,(err,sR)=>{
                      if (err) {
                        console.log(err)
                      }
                      y++
                      updateShift()
                    })
                  }else {
                    y++
                    updateShift()
                  }
                }else {
                  x++
                  updateBonus()
                }
              }
              updateShift()
            }else {
              res.send("done")
            }
          }
          updateBonus()
        },
        dedicateAgent:(req,res)=>{
          let insQ=`insert into dedicatedTeams (agentID,jobID,briefingDate,autoAllocate) VALUES (`+req.body.agentID+`,`+req.body.jobID+`,`+(req.body.briefingDate?"'"+req.body.briefingDate+"'":"null")+`,`+(req.body.autoAllocate?1:0)+`)
          select SCOPE_IDENTITY() as dedicationID`
          db.query(insQ,(err,r)=>{
            if (err) {
              console.log(err,insQ)
              res.status(500).send({error:err})
            }else {
              logger.info(req.user.uName+" added agentID "+req.body.agentID+" to the dedicated team for job "+req.body.jobID)
              res.send(r.recordset[0])
            }
          })
        },
        undedicateAgent:(req,res)=>{
          let delQ=`delete from dedicatedTeams where dedicationID=`+req.params.dedicationID
          db.query(delQ,(err,r)=>{
            if (err) {
              console.log(err,delQ)
              res.status(500).send({error:err})
            }else {
              logger.info(req.user.uName+" removed agentID "+req.query.agentID+" from the dedicated team for job "+req.query.jobID)
              res.send("done")
            }
          })
        },
        updateDedicatedDates:(req,res)=>{
          db.query(`delete from dedicatedTeamDates where dedicationID=`+req.params.dedicationID,(err,delR)=>{
            if (err) {
              console.log("error deleting ddates",err)
              res.status(500).send({error:err})
            }
            db.query('select dedicationID,dedicatedDate from dedicatedTeamDates where dateID<0', (err, result) => {
              if (err) {
                console.log("error selecting ddates",err)
                res.status(500).send({error:err})
              }
              var table=result.recordset.toTable('dedicatedTeamDates')
              let data=req.body.dates || []
              let i=0
              async function addRows(){
                if (i<data.length) {
                  let row=data[i]
                  await table.rows.add(req.params.dedicationID,(!row?null:new Date(row)))
                  i++
                  addRows()
                }else if(data.length) {
                  db.bulk(table, (err, result) => {
                    if (err) {
                      console.log(err)
                      res.send({error:err})
                    }else {
                      res.send("done")
                    }
                  })
                }else {
                  res.send("done")
                }
              }
              addRows()
            })
          })
        },
        getDedicatedDates:(req,res)=>{
          let q=`
          select d.*,j.*,j2.startDate,j2.endDate from
          dedicatedTeamDates d
          left join DedicatedTeams t on t.dedicationID=d.dedicationID
          left join ViewJobFullName j on j.jobID=t.jobID
          left join jobs j2 on j2.jobID=t.jobID
          where 1=1`
          if (req.params.apartFrom!='0') {
            q=q+` and d.dedicationID<>`+req.params.apartFrom
          }
          if (req.params.agentID!='0') {
            q=q+` and t.agentID=`+req.params.agentID
          }
          db.query(q,(err,r)=>{
            res.send(r.recordset)
          })
        },
        getDedicatedTeam:(req,res)=>{
          let q=`
          select t.*,a.agentName from dedicatedTeams t
          left join agents a on a.agentID=t.agentID
          where agentLeft is null`
          if (req.params.jobID!='0') {
            q=q+` and jobID=`+req.params.jobID
          }
          db.query(q,(err,r)=>{
            if (err) {
              console.log(err)
              res.status(500).send({error:err})
            }else {
              db.query("select * from agents a left join agentTeams at on at.agentTeamID=a.teamID where agentID>1 and agentLeft is null order by agentName",(err,a)=>{
                if (err) {
                  console.log(err)
                  res.status(500).send({error:err})
                }else {
                  getBreatheEmployees(true).then(emps=>{
                    db.query("select * from dedicatedTeamDates",(err,dateR)=>{
                      res.send({team:r.recordset.map(t=>({...t,dedicatedDates:dateR.recordset.filter(d=>d.dedicationID==t.dedicationID).map(d=>d.dedicatedDate?d.dedicatedDate.toISOString().split("T")[0]:null)})),agents:a.recordset.map(ag=>({...ag,breatheAgent:emps.find(e=>e.id==ag.breatheID)}))})
                    })
                  })
                }
              })
            }
          })
        }
      };
