const express = require('express');
const moment = require('moment');

const dateIf = (inDate, seperator, order) => {
  let day =''
  if (new Date(inDate).getDate() < 10) {
    day = '0' + new Date(inDate).getDate()
  } else {
    day = new Date(inDate).getDate()
  }
  let month =''
  if (new Date(inDate).getMonth()+1 < 10) {
    month = '0' + (new Date(inDate).getMonth()+1)
  } else {
    month = (new Date(inDate).getMonth()+1)
  }
  let year = new Date(inDate).getFullYear()
  if(order=="f"){
    return(day+seperator+month+seperator+year)
  }
  if(order=="r"){
    return(year+seperator+month+seperator+day)
  }
}
function getBusinessDatesCount(startDate, endDate) {
    var count = 0;
    var curDate = startDate;
    while (curDate <= endDate) {
        var dayOfWeek = curDate.getDay();
        if(!((dayOfWeek == 6) || (dayOfWeek == 0)))
           count++;
        curDate.setDate(curDate.getDate() + 1);
    }
    return count;
}
module.exports = {
  createTally(req, res){
    let projectQuery = "SELECT Jobs.jobID, Jobs.jobName, Jobs.interviewsTarget, Quotes.quoteNo, Quotes.quoteName, Quotes.quoteID FROM Jobs, Projects, Quotes WHERE Jobs.projectID = Projects.projectID AND Projects.quoteID = Quotes.quoteID AND Quotes.quoteID > 1 AND (Jobs.isJobCATI = 1 OR Quotes.quoteID = 2) AND Projects.isProjectLive = 1 ORDER BY Quotes.quoteNo ASC";
    let jobQuery =
          `SELECT Jobs.jobID,
             Jobs.startDate,
             Jobs.endDate,
             Jobs.dataDate,
             Jobs.tablesDate,
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
             jOBS.isJobDP,
             Projects.setupCost,
             Projects.dataCost,
             Projects.sampleCost,
             Projects.codingCost,
             DI.Interviews,
             DI.Hours,
             INC.IncCost,
             INC.IncCount,
             INC.IncAdm,
             SAMP.SampCost,
             SAMP.SampCount,
             OTH.OtherCost
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
      WHERE Jobs.endDate>=DATEADD(day,-1,GETDATE())`
    let interviewerQuery = "SELECT Agents.agentName, Agents.agentID FROM Agents WHERE Agents.agentLeft IS NULL OR Agents.agentLeft = '' ORDER BY agentName ASC";
    db.query(interviewerQuery, (err, result2) =>{
      db.query(projectQuery, (err, result) =>{
        db.query(jobQuery, (err, result3) => {
          res.render('add-tally-sheet.ejs', {
            title: "Input a tally sheet"
            ,projects: result.recordset
            ,interviewers: result2.recordset
            ,message: ''
            ,jobs: result3.recordset
          });
        });
      });
    });
  },

  generateTally(req, res){
    req.session.daily_projects = req.body.projects;
    req.session.daily_interviewers = req.body.interviewers;
    req.session.tallyDate = req.body.tDate;
    req.session.daily_date = req.session.tallyDate
    res.redirect('/view-tally/t');
  },

  viewTally(req, res){
    if (req.session.daily_date == 0)
    {
      res.render('menu.ejs', {
        title: "Welcome to Project analysis"
        ,message: "No tally sheet found"
      });
    }
    else
    {
      let queryText = ["","AND jobs.isJobDay = 1","AND Jobs.isJobEve = 1", ""]
      let qText = 0;
      let tallyType
      if(req.params.type == 'n')
      {tallyType = req.session.tallyType}
      else
      {tallyType = req.params.type;
        req.session.tallyType = tallyType}
        if(tallyType == 'd'){
          qText = 1;
          //daily_projects.push(2,4,6);
        }
        if(tallyType == 'e'){
          qText = 2;
          //daily_projects.push(3,5,7);
        }
        if(tallyType == 't'){
          let tallyDate = req.session.daily_date;
          let daily_projects = req.session.daily_projects;
          let daily_interviewers = req.session.daily_interviewers;
          let projectQuery = "SELECT Jobs.jobID, Jobs.jobName, Jobs.interviewsTarget, Jobs.jobCPI, Jobs.hourlyTarget, Jobs.isJobDay, Jobs.isJobEve, Jobs.isJobBusiness, Jobs.isJobConsumer, Jobs.isJobCATI, Jobs.isJobOnline, Jobs.isJobFace, Jobs.isJobRecruitment, Jobs.isJobValidation, Jobs.isJobRecontacts, Jobs.isJobInternational, Jobs.projectID, Quotes.quoteNo, Quotes.quoteName, Quotes.quoteID FROM Jobs, Projects, Quotes WHERE Jobs.projectID = Projects.projectID AND Projects.quoteID = Quotes.quoteID AND Jobs.jobID IN (" + daily_projects + " ) " + queryText[qText] + " ORDER BY Quotes.quoteNo DESC"
          let interviewerQuery = "SELECT Agents.agentName, Agents.agentID FROM Agents WHERE Agents.agentID IN (" + daily_interviewers + ") ORDER BY agentName ASC";
          db.query(projectQuery, (err, resultProj) =>{
            if(resultProj){
              let dailyQuery = "SELECT DailyInput.inputInterviews, DailyInput.inputHours as agentAllocationHours, DailyInput.inputDate, Jobs.jobName, Quotes.quoteNo, Quotes.quoteName, DailyInput.agentID, DailyInput.jobID, Agents.agentName FROM DailyInput, Jobs, Projects, Quotes, Agents WHERE DailyInput.jobID = Jobs.jobID AND Jobs.projectID = Projects.projectID AND Projects.quoteID = Quotes.quoteID AND DailyInput.agentID = Agents.agentID AND DailyInput.inputDate = '" + tallyDate + "'";
              db.query(interviewerQuery, (err, resultInt) =>{
                db.query(dailyQuery, (err, resultDaily) =>{
                  res.render('view-tally-sheet.ejs', {
                    title: "Tally Sheet"
                    ,projects: resultProj.recordset
                    ,interviewers: resultInt.recordset
                    ,dailys: resultDaily.recordset
                    ,date: tallyDate
                    ,message: ''
                    ,tType: tallyType
                  });
                });
              });
            }
            else
            {
              res.render('menu.ejs', {
                title: "Welcome to Project analysis"
                ,message: "No tally sheet found"
              });
            }
          });
        } else if (tallyType == 'd' || tallyType == 'e') {
          var shiftCheck=""
          if (tallyType=="d") {
            shiftCheck="isDay"
          }else {
            shiftCheck="isEve"
          }
          let tallyDate = new Date();
          var dd = tallyDate.getDate(); var mm = tallyDate.getMonth()+1;
          var yyyy = tallyDate.getFullYear();
          if(dd<10){dd='0'+dd} if(mm<10){mm='0'+mm}
          var sToday = dd+'/'+mm+'/'+yyyy;
          let alloQueryInterviewer = `
          SELECT Concat(RIGHT('0'
                              + Rtrim(Day(agentallocation.agentallocationdate)), 2), '/',
                 RIGHT(
                        '0'
                        +
                 Rtrim(Month(agentallocation.agentallocationdate)), 2), '/', Year(
                        agentallocation.agentallocationdate)) AS alloDate,
                 agents.agentName,
                 agentallocation.agentAllocationHours,
                 agentallocation.agentID,
                 agentallocation.agentAllocationDate,
                 agentallocation.jobID,
                 AgentTeams.isDay,
                 AgentTeams.isEve
          FROM   agentallocation,
                 agents,
          			 AgentTeams
          WHERE  Concat(RIGHT('0'
                              + Rtrim(Day(agentallocation.agentallocationdate)), 2), '/',
                 RIGHT(
                        '0'
                        +
                 Rtrim(Month(agentallocation.agentallocationdate)), 2), '/', Year(
                        agentallocation.agentallocationdate)) = '` + sToday + `'
                 AND agents.agentid = agentallocation.agentid
          			 AND AgentTeams.AgentTeamID=agents.teamID
                 AND AgentTeams.`+shiftCheck+` = 1`
          let alloQueryProjects = "SELECT * FROM dbo.ViewAllocation WHERE dbo.ViewAllocation.agentAllocationDate = '" + sToday +  "' AND dbo.ViewAllocation."+shiftCheck+" = 1"
          db.query(alloQueryInterviewer, (err, resultInt) =>{
            if(err){
              logger.info("failed to select allocations on view tally page " + req.user.uName);
              //res.redirect("/home");
            }
          db.query(alloQueryProjects, (err, resultProj) =>{
            if(err){
              logger.info("failed to select allocations on view tally page " + req.user.uName);
              //res.redirect("/home");
            }
            if(resultProj){
              let daily_projects = []
              let daily_interviewers = []
              if(tallyType == 'd'){
                daily_projects.push(2,4,6);
              }
              if(tallyType == 'e'){
                daily_projects.push(3,5,7);
              }
              projectsToAdd = resultProj.recordset;
              projectsToAdd.forEach((project, index) =>{
                daily_projects.push(project.jobID)
                daily_interviewers.push(project.agentID)
              });
              req.session.daily_projects = daily_projects;
              req.session.daily_interviewers = daily_interviewers;
              req.session.daily_date = tallyDate;
              console.log("daily_projects: "+daily_projects)
              console.log("daily_interviewers: "+daily_interviewers)
              let projectQuery = "SELECT Jobs.jobID, Jobs.jobName, Quotes.quoteNo, Quotes.quoteName, Quotes.quoteID FROM Jobs, Projects, Quotes WHERE Jobs.projectID = Projects.projectID AND Projects.quoteID = Quotes.quoteID AND Jobs.jobID IN (" + daily_projects + ") ORDER BY Quotes.quoteNo DESC"
              console.log("projectQuery: "+projectQuery)
              db.query(projectQuery, (err, result) =>{
                if(err){
                  logger.info("failed to select projects on view tally page " + req.user.uName);
                  //res.redirect("/home");
                }
                  res.render('view-tally-sheet.ejs', {
                    title: "Tally Sheet"
                    ,projects: result.recordset
                    ,interviewers: resultInt.recordset
                    ,dailys: resultProj.recordset
                    ,date: tallyDate
                    ,message: ''
                    ,tType: tallyType
                  });
              });
            }
            else
            {
              res.render('menu.ejs', {
                title: "Welcome to Project analysis"
                ,message: "No allocation found"
              });
            }
          });
        });
        }
        else
        {
          res.render('menu.ejs', {
            title: "Welcome to Project analysis"
            ,message: "No allocation found"
          });
        }
      }
    },
    loadNewQC: (req,res) => {
      let agentsQ=`SELECT Agents.agentName, Agents.agentID, Agents.ringCentralID
      FROM Agents
      WHERE Agents.agentID>1
      ORDER BY Agents.agentName`
      let jobsQ=`SELECT Jobs.jobID, Jobs.jobName, Quotes.quoteName, Quotes.quoteNo
      FROM Jobs, Projects, Quotes
      WHERE
      Quotes.quoteID=Projects.quoteID
      AND projects.projectID=Jobs.projectID
      AND Jobs.projectID>2
      AND Jobs.isJobCATI=1`
      let issuesQ=`SELECT * FROM QCissuesRef WHERE issueID>4 and inUse=1 order by issueScore`
      let staffQ=`select * from staff where staffLeft is null and staffID>1 order by staffName`
      let topicQ=`select * from trainingTopics order by topic`
      db.query(agentsQ, (err, agentsR) => {
        if (err){
          logger.info(req.user.uName + " failed to get agents for QC load");
          console.log(agentsQ+" - "+err)
        }
        else{
          db.query(jobsQ, (err, jobsR) => {
            if (err){
              console.log(jobsQ+" - "+err)
              logger.info(req.user.uName + " failed to get jobs for QC load");
            }
            else{
              db.query(issuesQ, (err, issuesR) => {
                if (err){
                  console.log(issuesQ+" - "+err)
                  logger.info(req.user.uName + " failed to get jobs for QC load");
                }
                else{
                  db.query("select staffName from users left join staff on users.staffID=staff.staffID where login='"+req.user.uName+"'", (err, checkerR) => {
                    if (err){
                      console.log(err)
                      logger.info(req.user.uName + " failed to get jobs for QC load");
                    }
                    else{
                      db.query(staffQ, (err, staffR) => {
                        if (err){
                          console.log(err)
                          logger.info(req.user.uName + " failed to get staff for QC load");
                        }
                        else{
                          db.query(topicQ, (err, topicR) => {
                            if (err){
                              console.log(err)
                              logger.info(req.user.uName + " failed to get staff for QC load");
                            }
                            else{
                              if (!agentsR.recordset.find(a=>a.agentID==req.params.agentID).ringCentralID) {
                                res.send("This interviewer has not been linked to Ring Central. Please edit their JA2 profile to add their Ring Central extension, then try again.")
                              }
                              let dte=req.params.date
                              let resParams={
                                agents: agentsR.recordset,
                                jobs: jobsR.recordset,
                                dateSel: req.params.date,
                                agentSel: req.params.agentID,
                                jobSel: req.params.jobID,
                                isController:true,
                                title: "QC checking",
                                issues: issuesR.recordset,
                                checker: checkerR.recordset[0],
                                staff:staffR.recordset,
                                trainingTopics:topicR.recordset,
                                addedIssues: [],
                                recordings:[],
                                check: []
                              }
                              rcPlatform.get("/restapi/v1.0/account/~/extension/"+agentsR.recordset.find(a=>a.agentID==req.params.agentID).ringCentralID+"/call-log",{dateTo:moment.utc(dte).startOf('d').add(1,'d').toISOString(),dateFrom:moment.utc(dte).startOf('d').toISOString(),perPage:10000}).then(function(logResp){
                                logResp.json().then(function(log){
                                  resParams.recordings=log.records.filter(el=>el.extension).filter(el=>el.recording)
                                  res.render("add-qc-check.ejs", resParams)
                                })
                              }).catch(function(e){
                                console.log(e)
                                res.render("add-qc-check.ejs", resParams)
                              })
                            }
                          })
                        }
                      })
                    }
                  })
                }
              })
            }
          });
        }
      });
    },
    getRCrecording:(req,res) => {
      const axios = require('axios');
      const fs = require('fs');
      rcMedia.get("/restapi/v1.0/account/~/recording/"+req.params.recID+"/content/").then(function(logResp){
        logResp.buffer().then(function(result){
          let out=publicPath + '/temp/Recordings/'+req.params.recID+".mp3"
          fs.writeFileSync(out, result);
          res.send('/temp/Recordings/'+req.params.recID+".mp3")
        }).catch(function(e){
          console.log(e)
          res.status(500).send(e)
        })
      }).catch(function(e){
        console.log(e)
        res.status(500).send(e)
      })
    },
    downloadRCrecording:(req,res) => {
      res.render("download-rc-recording.ejs",{
        title:"Download Recording",
        recordingID:req.params.recordingID
      })
    },
    addNewQC:(req,res) => {
      let data=req.body
      var clientFriendly="0"
      if (data.clientFriendly=="on") {
        clientFriendly="1"
      }
      var isFinished="0"
      if (data.isFinished=="on") {
        isFinished="1"
      }
      if (data.QCissues=="") {
        data.QCissues="[{}]"
      }
      let issues=JSON.parse(data.QCissues)
      let qualityAddQ=`INSERT INTO QualityControl (dateMonitored,interviewDate,agentID,jobID,score,type,recordingID,controllerScore,controllerNotes,userID,serial,clientFriendly,isFinished,feedbackPriority) VALUES (GETDATE(),'`+data.inputdate+`',`+data.agent_select+`,`+data.job_select+`,`+data.QCscore+`,'`+data.callType_select+`',@recordingID,`+data.softscore+`,@controllerNotes,`+req.user.user+`,'`+data.serial+`',`+clientFriendly+`,`+isFinished+`,'`+data.feedbackPriority+`')
      SELECT SCOPE_IDENTITY() as QCID`
      let issueAddQ=""
      if (parseInt(data.QCID)>0) {
        let removeQ=`
        DELETE FROM QCissues WHERE qualityControlID=`+data.QCID
        db.query(removeQ, (err, removeR) => {
          if (err){
            console.log(removeQ+" - "+err)
            logger.info(req.user.uName + " failed to delete QC check... Data: "+JSON.stringify(data)+" ... Query: "+removeQ+" ... Err: "+err);
          }
          else{
            let removeQ1="DELETE FROM Training WHERE source='QC' and sourceID="+data.QCID
            db.query(removeQ1, (err, removeR1) => {
              if (err){
                console.log(removeR1+" - "+err)
                logger.info(req.user.uName + " failed to delete QC check ... Query: "+JSON.stringify(data)+" ... Err: "+err);
              }
              else{
                let removeQ2=`
                DELETE FROM QualityControl WHERE qualityControlID=`+data.QCID
                db.query(removeQ2, (err, removeR2) => {
                  if (err){
                    console.log(removeQ2+" - "+err)
                    logger.info(req.user.uName + " failed to delete QC check... Data: "+JSON.stringify(data)+" ... Query: "+removeQ2+" ... Err: "+err);
                  }
                })
              }
            })
          }
        })
      }
      var recID=data.recordingID
      if (data.recordingID.indexOf("http://")!=0 && !data.recordingIDRC) {
        recID="http://liquidvoice/web/recording/audioplayer.aspx?recordingid="+data.recordingID
      }
      db.input('recordingID',recID)
      db.input('controllerNotes',data.controllerNotes)
      db.query(qualityAddQ, (err, qualityAddR) => {
        if (err){
          console.log(qualityAddQ+" - "+err)
          res.send("Could not add QC check: ",err,JSON.stringify(data))
          logger.info(req.user.uName + " failed to add QC check... Data: "+JSON.stringify(data)+" ... Query: "+qualityAddQ+" ... Err: "+err);
        }
        else{
          logger.info(req.user.uName + " added a QC check... Data: "+JSON.stringify(data));
          if (req.body.qcAudited=="on") {
            let addQ="insert into Audits (auditorID,auditeeID,auditDate,category,categoryID) VALUES ("+req.body.qcAuditor+",(select staffID from users where userID="+req.user.user+"),getdate(),'QC',"+qualityAddR.recordset[0].QCID+")"
            db.query(addQ, (err, addR) => {
              if (err) {
                logger.info("Error adding QC audit "+req.user.uName);
                logger.info(err)
                console.log(err)
                console.log(addQ)
              }
            })
          }
          let qcIssueIDs=[]
          for (var i = 5; i <= 25; i++) {
            qcIssueIDs.push(i);
          }
          if (data.QCissues!="[{}]") {
            issues.forEach((issue, i) => {
              issueAddQ="INSERT INTO QCissues (issueID,qualityControlID,note) VALUES ("+issue.issueID+","+qualityAddR.recordset[0].QCID+",@note"+i+")"

              db.input('note'+i,issue.issueNotes)
              db.query(issueAddQ, (err, issueAddR) => {
                if (err){
                  console.log(issueAddQ+" - "+err)
                  logger.info(req.user.uName + " failed to add QC issue");
                }
              })
            });
          }
          if (data.trainingIDs) {
            data.trainingIDs=Array.isArray(data.trainingIDs)?data.trainingIDs:[data.trainingIDs]
            let issueAddQ=[]
            data.trainingIDs.forEach((topic, i) => {
              issueAddQ[i]="INSERT INTO Training (topicID,source,sourceID,raisedDate) VALUES ("+topic+",'QC',"+qualityAddR.recordset[0].QCID+",'"+data.inputdate+"')"
              db.query(issueAddQ[i], (err, issueAddR) => {
                if (err){
                  console.log(issueAddQ[i]+" - "+err)
                  logger.info(req.user.uName + " failed to add QC issue");
                }
              })
            });
          }
          if (req.body.emailTL=='on') {
            let emailQ=`SELECT staffEmail,emailCC,isAllocatable FROM
            Agents
            LEFT JOIN AgentTeams ON AgentTeams.agentTeamID=Agents.teamID
            LEFT JOIN Staff ON Staff.staffID=AgentTeams.managerID
            WHERE agentID=`+data.agent_select
            db.query(emailQ, (err, emailR) => {
              if (err){
                logger.info(req.user.uName + " failed to get email address for agent's manager: "+err)
                console.log(err)
              }
              let emailTo=[]
              let importance=data.feedbackPriority
              if (data.callType_select=="Call" && isFinished=="1") {
                emailTo.push(emailR.recordset[0].staffEmail)
                emailTo.push((emailR.recordset[0].emailCC?emailR.recordset[0].emailCC.split(";"):[]))
                // emailTo.push('matt@teamsearchmr.co.uk')
                if (issues.some(value => ['5','6','7'].includes(value.issueID))) {
                  emailTo.push('tokulus@teamsearchmr.co.uk')
                  emailTo.push('pjaeger@teamsearchmr.co.uk')
                  importance="high"
                }
                if (emailR.recordset[0].isAllocatable!=1) {
                  emailTo.push('tokulus@teamsearchmr.co.uk')
                }
              }else if (isFinished!="1") {
                emailTo.push('sean@teamsearchmr.co.uk')
                req.body.subject=req.body.subject.replace("New","Unfinished")
              }else if (data.callType_select!="Call") {
                emailTo.push('cath@teamsearchmr.co.uk')
                emailTo.push(emailR.recordset[0].staffEmail)
                emailTo.push((emailR.recordset[0].emailCC?emailR.recordset[0].emailCC.split(";"):[]))
                req.body.subject=req.body.subject.replace("monitoring","intro check")
              }
              let mailOptions = {
                to: emailTo,
                // to: 'matt@teamsearchmr.co.uk',
                subject: req.body.subject,
                html: '<p>' + req.body.HTMLbody+'<br><h2><a href="http://job-analysis:8080/edit-qc-check/'+qualityAddR.recordset[0].QCID+'">Click here to feed back now</a></h2><br><br>' + footer + '</p>',
                priority: importance
              };
              transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                  return console.log(error);
                  logger.info(req.user.uName + " failed to send QC email to "+emailTo+": "+err)
                }
              });
            })
          }
          res.redirect("/quality-control/"+currPayPeriodSt+"/"+currPayPeriodEn)
        }
      })
    },
    qcEmailOnly:(req,res) => {
      let issues=JSON.parse(req.body.QCissues)
      let emailQ=`SELECT staffEmail,emailCC,isAllocatable FROM
      Agents
      LEFT JOIN AgentTeams ON AgentTeams.agentTeamID=Agents.teamID
      LEFT JOIN Staff ON Staff.staffID=AgentTeams.managerID
      WHERE agentID=`+req.body.agent_select
      db.query(emailQ, (err, emailR) => {
        if (err){
          logger.info(req.user.uName + " failed to get email address for agent's manager: "+err)
          console.log(err)
        }
        let emailTo=[]
        emailTo.push(emailR.recordset[0].staffEmail)
        emailTo.push((emailR.recordset[0].emailCC?emailR.recordset[0].emailCC.split(";"):[]))
        let importance="normal"
        if (issues.some(value => ['5','6','7'].includes(value.issueID))) {
          emailTo.push('tokulus@teamsearchmr.co.uk')
          emailTo.push('pjaeger@teamsearchmr.co.uk')
          importance="high"
        }
        if (emailR.recordset[0].isAllocatable!=1) {
          emailTo.push('tokulus@teamsearchmr.co.uk')
        }
        let mailOptions = {
          to: emailTo,
          // to: 'matt@teamsearchmr.co.uk',
          subject: req.body.subject,
          html: '<p>' + req.body.HTMLbody +'<br><h2><a href="http://job-analysis:8080/edit-qc-check/'+req.body.QCID+'">Click here to feed back now</a></h2><br><br>' + footer + '</p>',
          priority: importance
        };
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            return console.log(error);
            logger.info(req.user.uName + " failed to send QC email to "+emailTo+": "+err)
          }else {
            res.send("done!")
          }
        });
      })
    },
    checkQCID:(req,res) => {
      var recID=req.body[0].recordingID
      if (recID.indexOf("http://")!=0 && !req.body[0].recordingIDRC) {
        recID="http://liquidvoice/web/recording/audioplayer.aspx?recordingid="+req.body[0].recordingID
      }
      let checkQ=`SELECT * FROM QualityControl WHERE recordingID=@recid and jobID=`+req.body[0].jobID
      db.input('recid',recID)
      db.query(checkQ, (err, checkR) => {
        if (err) {
          console.log(err,checkQ)
          res.send(false)
        }
        if (checkR.recordset.length!=0) {
          res.send(checkR.recordset[0])
        }else {
          res.send(false)
        }
      })
    },
    deleteQC:(req,res) => {
      if (parseInt(req.params.id)>0) {
        let removeQ="DELETE FROM QCissues WHERE qualityControlID="+req.params.id
        db.query(removeQ, (err, removeR) => {
          if (err){
            console.log(removeQ+" - "+err)
            logger.info(req.user.uName + " failed to delete QC check ... Query: "+removeQ+" ... Err: "+err);
          }
          else{
            let removeQ1="DELETE FROM Training WHERE source='QC' and sourceID="+req.params.id
            db.query(removeQ1, (err, removeR1) => {
              if (err){
                console.log(removeR1+" - "+err)
                logger.info(req.user.uName + " failed to delete QC check ... Query: "+removeQ1+" ... Err: "+err);
              }
              else{
                console.log("deleted")
                let removeQ2="DELETE FROM QualityControl WHERE qualityControlID="+req.params.id
                db.query(removeQ2, (err, removeR2) => {
                  if (err){
                    console.log(removeQ2+" - "+err)
                    logger.info(req.user.uName + " failed to delete QC check ... Query: "+removeQ2+" ... Err: "+err);
                  }
                  else{
                    console.log("deleted")
                  }
                })
              }
            })
          }
        })
      }
      res.redirect("/quality-control/"+currPayPeriodSt+"/"+currPayPeriodEn)
    },
    getQCsplash:(req,res) => {
      req.params.stDate=req.params.stDate==0?currPayPeriodSt:req.params.stDate
      req.params.enDate=req.params.enDate==0?currPayPeriodEn:req.params.enDate
      var stDate=req.params.stDate
      var enDate=req.params.enDate
      let monitorJobQ=`
      SELECT CONCAT(quoteNo,' ',quoteName,' - ',jobName) as jobName,
      ints interviews,callMonitorings,introMonitorings
      from
      Jobs j
      left join Projects p on p.projectID=j.projectID
      left join Quotes q on q.quoteID=p.quoteID
      left join (select jobID,COUNT(case when type='Call' then 1 end) callMonitorings,COUNT(case when type='Intro' then 1 end) introMonitorings from QualityControl where isFinished=1 and interviewDate between '`+stDate+`' and '`+enDate+`' group by jobID) qc on qc.jobID=j.jobID
      left join (select jobID,SUM(inputInterviews) ints from DailyInput where inputDate between '`+stDate+`' and '`+enDate+`' group by jobID) d on d.jobID=j.jobID
      where ints>0`
      let allJobQ=`
        SELECT CONCAT(Quotes.quoteNo,' ',Quotes.quoteName,' - ',Jobs.jobName) as jobName,
        sum(DailyInput.inputInterviews) as interviews,
        Jobs.jobID
        FROM Quotes, Jobs, Projects, DailyInput
        WHERE Quotes.quoteID = Projects.quoteID
        AND Jobs.projectID = Projects.projectID
        AND DailyInput.jobID = Jobs.jobID
        AND DailyInput.inputInterviews>0
        AND jobs.jobID>7
        GROUP BY Quotes.quoteNo, Quotes.quoteName, Jobs.jobName, Jobs.jobID
				ORDER BY jobName DESC`
      let monitorAgentQ=`SELECT agentsT.agentID, agentsT.agentName, isRemote, agentsT.interviews,
        sum(CASE WHEN QualityControl.type='Call' THEN 1 ELSE 0 END) as callMonitorings,
        sum(CASE WHEN QualityControl.type='Intro' THEN 1 ELSE 0 END) as introMonitorings
        FROM
        (
          SELECT Agents.agentID,
          sum(DailyInput.inputInterviews) as interviews,
          Agents.agentName,
          Agents.isRemote
          FROM Agents, DailyInput
          WHERE DailyInput.agentID = Agents.agentID
          AND DailyInput.inputDate BETWEEN '`+stDate+`' AND '`+enDate+`'
          AND DailyInput.inputInterviews>0
          GROUP BY Agents.agentID, Agents.agentName, Agents.isRemote
        ) as agentsT
        LEFT JOIN QualityControl ON QualityControl.agentID=agentsT.agentID AND QualityControl.interviewDate BETWEEN '`+stDate+`' AND '`+enDate+`' AND QualityControl.isFinished=1
        GROUP BY agentsT.agentID, agentsT.agentName, agentsT.interviews, isRemote
        ORDER BY agentsT.agentName, callMonitorings, introMonitorings DESC`
      let allAgentQ=`SELECT agentsT.agentID, agentsT.agentName
        FROM
        (
          SELECT Agents.agentID,
          sum(DailyInput.inputInterviews) as interviews,
          Agents.agentName,
          Agents.isRemote
          FROM Agents, DailyInput
          WHERE DailyInput.agentID = Agents.agentID
          AND DailyInput.inputInterviews>0
          GROUP BY Agents.agentID, Agents.agentName, Agents.isRemote
        ) agentsT
        GROUP BY agentsT.agentID, agentsT.agentName, agentsT.interviews
        ORDER BY agentsT.agentName ASC`
      let callQ=`SELECT CONCAT(Quotes.quoteNo,' ',Quotes.quoteName,' - ',Jobs.jobName) as jobName,
        sum(DailyInput.inputInterviews) as interviews,
        Jobs.jobID,
        DailyInput.inputDate,
        Agents.agentName,
        Agents.agentID
        FROM Quotes, Jobs, Projects, DailyInput, Agents
        WHERE Quotes.quoteID = Projects.quoteID
        AND Jobs.projectID = Projects.projectID
        AND DailyInput.jobID = Jobs.jobID
        AND DailyInput.agentID = Agents.agentID
        AND DailyInput.inputDate>DATEADD(day, -5, GETDATE())
        AND DailyInput.inputInterviews>0
        GROUP BY Quotes.quoteNo, Quotes.quoteName, Jobs.jobName, Jobs.jobID, DailyInput.inputDate, Agents.agentName, Agents.agentID
        ORDER BY NEWID()`
      let statsQ=`
        select
        staffName,
        sum(CASE WHEN dateMonitored=CAST(getDate() as date) THEN 1 ELSE 0 END) as todayCount,
        sum(CASE WHEN type='Call' AND dateMonitored=CAST(getDate() as date) THEN 1 ELSE 0 END) as todayCountCall,
        sum(CASE WHEN type='Intro' AND dateMonitored=CAST(getDate() as date) THEN 1 ELSE 0 END) as todayCountIntro,
        sum(CASE WHEN dateMonitored BETWEEN @stdate AND @endate THEN 1 ELSE 0 END) as monthCount,
        sum(CASE WHEN type='Call' AND dateMonitored BETWEEN @stdate AND @endate THEN 1 ELSE 0 END) as monthCountCall,
        sum(CASE WHEN type='Intro' AND dateMonitored BETWEEN @stdate AND @endate THEN 1 ELSE 0 END) as monthCountIntro
        from QualityControl
        LEFT JOIN Users ON Users.userID=QualityControl.userID
        LEFT JOIN Staff ON Staff.staffID=Users.staffID
        WHERE staffName IS NOT NULL AND QualityControl.isFinished=1
        group by staffName`
      let teamQ=`select * from AgentTeams where agentTeamID>1 order by teamName`
      db.input('stdate',new Date(stDate))
      db.input('endate',new Date(enDate))
        db.query(monitorJobQ, (err, monitorJobR) => {
          if (err){
            console.log(monitorJobQ+" - "+err)
            logger.info(req.user.uName + " failed to get monitor jobs");
          }else {
            db.query(monitorAgentQ, (err, monitorAgentR) => {
              if (err){
                console.log(monitorAgentQ+" - "+err)
                logger.info(req.user.uName + " failed to get monitor agents");
              }else {
                db.query(callQ, (err, callR) => {
                  if (err){
                    console.log(callQ+" - "+err)
                    logger.info(req.user.uName + " failed to get monitor call");
                  }else {
                    db.query(statsQ, (err, statsR) => {
                      if (err){
                        console.log(statsQ+" - "+err)
                        logger.info(req.user.uName + " failed to get stats for QC page");
                      }else {
                        db.query(teamQ, (err, teamR) => {
                          if (err){
                            console.log(teamQ+" - "+err)
                            logger.info(req.user.uName + " failed to get stats for QC page");
                          }else {
                            db.query(allAgentQ, (err, allAgentsR) => {
                              if (err){
                                console.log(err)
                                logger.info(req.user.uName + " failed to get stats for QC page");
                              }else {
                                db.query(allJobQ, (err, allJobR) => {
                                  if (err){
                                    console.log(allJobQ+" - "+err)
                                    logger.info(req.user.uName + " failed to get stats for QC page");
                                  }else {
                                    res.render("quality-control.ejs", {
                                      monitorJobs: monitorJobR.recordset,
                                      monitorAgents: monitorAgentR.recordset,
                                      allAgents:allAgentsR.recordset,
                                      allJobs:allJobR.recordset,
                                      allTeams:teamR.recordset,
                                      title: "Quality Control",
                                      call: callR.recordset,
                                      stDate: stDate,
                                      enDate: enDate,
                                      sessJob: req.session.QCjob,
                                      sessAgent: req.session.QCagent,
                                      sessDate: req.session.QCdate,
                                      sessTeam: req.session.QCteamID,
                                      stats: statsR.recordset,
                                      period: moment(enDate).diff(moment(stDate),'days'),
                                      todayDone: moment().diff(moment().hours(9),'hours'),
                                      periodDone: getBusinessDatesCount(new Date(stDate),new Date())
                                    })
                                  }
                                })
                              }
                            })
                          }
                        })
                      }
                    })
                  }
                })
              }
            })
          }
        })
      },
      getQCsuggestion:(req,res) => {
        let data=req.body[0]
        req.session.QCjob=data.jobID
        req.session.QCagent=data.agentID
        req.session.QCdate=data.date
        req.session.QCteamID=data.teamID
        let callQ=`SELECT CONCAT(Quotes.quoteNo,' ',Quotes.quoteName,' - ',Jobs.jobName) as jobName,
          sum(DailyInput.inputInterviews) as interviews,
          Jobs.jobID,
          DailyInput.inputDate,
          Agents.agentName,
          Agents.agentID
          FROM Quotes, Jobs, Projects, DailyInput left join (select distinct bookingDate, agentID, bookingTeamID from booking) b on b.agentID=DailyInput.agentID and b.bookingDate=DailyInput.inputDate, Agents
          WHERE Quotes.quoteID = Projects.quoteID
          AND Jobs.projectID = Projects.projectID
          AND DailyInput.jobID = Jobs.jobID
          AND DailyInput.agentID = Agents.agentID
          AND DailyInput.inputDate>='`+data.date+`' `
          if (data.agentID!="") {
            callQ=callQ+" AND DailyInput.agentID = "+data.agentID
          }
          if (data.jobID!="") {
            callQ=callQ+" AND DailyInput.jobID = "+data.jobID
          }
          if (data.teamID!="") {
            callQ=callQ+" AND b.bookingTeamID = "+data.teamID
          }
          callQ=callQ+` AND DailyInput.inputHours>0
          and Jobs.projectID>2
          GROUP BY Quotes.quoteNo, Quotes.quoteName, Jobs.jobName, Jobs.jobID, DailyInput.inputDate, Agents.agentName, Agents.agentID
          ORDER BY NEWID()`
          db.query(callQ, (err, callR) => {
            if (err){
              console.log(callQ+" - "+err)
              logger.info(req.user.uName + " failed to get monitor call");
              res.status(500).send({error: 'Could not get new monitor call'});
            }else{
              res.send(callR.recordset)
            }
          })
      },
      editQC: (req,res) => {
        let jobsQ=`SELECT Jobs.jobID, Jobs.jobName, Quotes.quoteName, Quotes.quoteNo
        FROM Jobs, Projects, Quotes
        WHERE
        Quotes.quoteID=Projects.quoteID
        AND projects.projectID=Jobs.projectID
        AND Jobs.projectID>2
        AND Jobs.isJobCATI=1`
        let issuesQ=`SELECT * FROM QCissuesRef WHERE issueID>4 order by issueScore`
        let checkQ=`SELECT * FROM QualityControl WHERE qualityControlID=`+req.params.id
        let addedIssuesQ=`SELECT * FROM QCissues LEFT JOIN QCissuesRef ON QCissues.issueID=QCissuesRef.issueID WHERE qualityControlID=`+req.params.id
        let staffQ=`select * from staff where staffLeft is null and staffID>1 order by staffName`
        let auditQ=`select * from audits where category='QC' and categoryID=`+req.params.id
        let topicQ=`select * from trainingTopics order by topic`
        let trainingQ=`select * from Training where source='QC' and sourceID='`+req.params.id+`'`
        let coachingIssueQ=`
        select CoachingIssuesRef.issueID
        from
        QCissues
        left join CoachingIssuesRef on CoachingIssuesRef.QCissueID=QCissues.issueID
        where CoachingIssuesRef.issueID IS NOT NULL and qualityControlID=`+req.params.id
        db.query(addedIssuesQ, (err, addedIssuesR) => {
          if (err){
            logger.info(req.user.uName + " failed to get agents for QC load");
            console.log(agentsQ+" - "+err)
          }
          else{
            db.query(jobsQ, (err, jobsR) => {
              if (err){
                console.log(jobsQ+" - "+err)
                logger.info(req.user.uName + " failed to get jobs for QC load");
              }
              else{
                db.query(issuesQ, (err, issuesR) => {
                  if (err){
                    console.log(issuesQ+" - "+err)
                    logger.info(req.user.uName + " failed to get jobs for QC load");
                  }
                  else{
                    db.query(checkQ, (err, checkR) => {
                      if (err || !checkR.recordset[0]){
                        console.log(checkQ+" - "+err)
                        logger.info(req.user.uName + " failed to get QC check to edit",checkR);
                        res.send("Could not find QC check. Please check with the QC team whether it has been deleted.")
                      }
                      else{
                        let agentsQ=`SELECT Agents.agentName, Agents.agentID, Agents.ringCentralID
                        FROM Agents
                        WHERE Agents.agentID=`+checkR.recordset[0].agentID+`
                        ORDER BY Agents.agentName`
                        db.query(agentsQ, (err, agentsR) => {
                          if (err){
                            console.log(addedIssuesQ+" - "+err)
                            logger.info(req.user.uName + " failed to get agent for QC check to edit");
                          }
                          else{
                            issuesR.recordset=issuesR.recordset.filter(el=>el.inUse==1 || addedIssuesR.recordset.map(el2=>el2.issueID[0]).includes(el.issueID))
                            db.query("select staffName from users left join staff on users.staffID=staff.staffID where login='"+req.user.uName+"'", (err, checkerR) => {
                              if (err){
                                console.log(err)
                                logger.info(req.user.uName + " failed to get jobs for QC load");
                              }
                              else{
                                db.query(staffQ, (err, staffR) => {
                                  if (err){
                                    console.log(err)
                                    logger.info(req.user.uName + " failed to get staff for QC load");
                                  }
                                  else{
                                    db.query(auditQ, (err, auditR) => {
                                      if (err){
                                        console.log(err)
                                        logger.info(req.user.uName + " failed to get audit info for QC load");
                                      }
                                      else{
                                        db.query(trainingQ, (err, trainingR) => {
                                          if (err){
                                            console.log(err)
                                            logger.info(req.user.uName + " failed to get audit info for QC load");
                                          }
                                          else{
                                            db.query(topicQ, (err, topicR) => {
                                              if (err){
                                                console.log(err)
                                                logger.info(req.user.uName + " failed to get audit info for QC load");
                                              }
                                              else{
                                                db.query(coachingIssueQ, (err, coachingIssueR) => {
                                                  if (err){
                                                    console.log(err)
                                                    logger.info(req.user.uName + " failed to get coaching issues for QC load");
                                                  }
                                                  else{
                                                    let dte=checkR.recordset[0].interviewDate
                                                    rcPlatform.get("/restapi/v1.0/account/~/extension/"+agentsR.recordset.find(a=>a.agentID==checkR.recordset[0].agentID).ringCentralID+"/call-log",{dateTo:moment.utc(dte).startOf('d').add(1,'d').toISOString(),dateFrom:moment.utc(dte).startOf('d').toISOString(),perPage:10000}).then(function(logResp){
                                                      logResp.json().then(function(log){
                                                        res.render("add-qc-check.ejs", {
                                                          agents: agentsR.recordset,
                                                          jobs: jobsR.recordset,
                                                          dateSel: req.params.date,
                                                          agentSel: req.params.agentID,
                                                          jobSel: req.params.jobID,
                                                          title: "QC checking",
                                                          issues: issuesR.recordset,
                                                          checker: checkerR.recordset[0],
                                                          addedIssues: addedIssuesR.recordset,
                                                          coachingIssues: coachingIssueR.recordset,
                                                          isController:req.session.passport.user.isQC || req.session.passport.user.isAdmin,
                                                          check: checkR.recordset,
                                                          staff:staffR.recordset,
                                                          recordings:log.records.filter(el=>el.extension).filter(el=>el.recording),
                                                          training:trainingR.recordset,
                                                          trainingTopics:topicR.recordset,
                                                          audits:auditR.recordset
                                                        })
                                                      })
                                                    }).catch(function(e){
                                                      console.log(e)
                                                      // res.send("Could not contact RingCentral. Please try refreshing the page. If the problem persists, contact the system administrator.")
                                                      res.render("add-qc-check.ejs", {
                                                        agents: agentsR.recordset,
                                                        jobs: jobsR.recordset,
                                                        dateSel: req.params.date,
                                                        agentSel: req.params.agentID,
                                                        jobSel: req.params.jobID,
                                                        title: "QC checking",
                                                        issues: issuesR.recordset,
                                                        checker: checkerR.recordset[0],
                                                        addedIssues: addedIssuesR.recordset,
                                                        coachingIssues: coachingIssueR.recordset,
                                                        isController:req.session.passport.user.isQC || req.session.passport.user.isAdmin,
                                                        check: checkR.recordset,
                                                        staff:staffR.recordset,
                                                        recordings:[],
                                                        training:trainingR.recordset,
                                                        trainingTopics:topicR.recordset,
                                                        audits:auditR.recordset
                                                      })
                                                    })
                                                  }
                                                })
                                              }
                                            })
                                          }
                                        })
                                      }
                                    })
                                  }
                                })
                              }
                            })
                          }
                        })
                      }
                    })
                  }
                })
              }
            });
          }
        });
      },
      loadTallySheet: (req,res) => {
        let shift=req.params.shift
        let team=req.params.team
        let incAcademy=req.params.incAcademy
        req.params.date=req.params.date==0?moment().format("YYYY-MM-DD"):req.params.date
        let filters=""
        let filtersJ=""
        if (shift=="d") {
          filters=filters+" AND AgentTeams.isDay=1 "
          filtersJ=filtersJ+" AND (Jobs.isJobDay=1 OR dayAgents>0) "
        }
        if (shift=="e") {
          filters=filters+" AND AgentTeams.isEve=1 "
          filtersJ=filtersJ+" AND (Jobs.isJobEve=1 OR eveAgents>0) "
        }
        if (team!=0) {
          filters=filters+" AND Booking.bookingTeamID in ("+team.toString().split(",")+") "
        }
        if (incAcademy==0) {
          filters=filters+" AND AgentTeams.isAllocatable=1 "
        }
        if (req.params.incFixed==0) {
          filters=filters+" AND isnull(fixedHours,0)=0 "
        }
        let agentQ=`
          SELECT
          agentName,
          max(bookingID) bookingID,
          max(bookedHours) as bookedHours,
          left(max(startTime),5) as startTime,
          left(max(endTime),5) as endTime,
          Agents.agentID,
          teamID,
          isnull(absenceType,'Present') as absenceType,
          lateMins1,
          lateMins2,
          lateMins3,
          note,
          isRemote,
          contractVersion,
          max(points) as points,
          sum(Booking.isDay) as isDay,
          max(dbo.getPayRate(Agents.agentID,@dte)) as wageRate,
          AgentTeams.isAllocatable,
          contractName,fixedHours,
          max(reductionHours) payReduction
          FROM
          Agents
          LEFT JOIN getBookedHours(@dte,@dte) Booking ON Agents.agentID=Booking.agentID AND bookingDate=@dte
          LEFT JOIN AgentTeams ON AgentTeams.AgentTeamID=isnull(Booking.bookingTeamID,Agents.teamID)
          LEFT JOIN Absence ON Absence.agentID=Agents.agentID AND absenceDate=@dte
          LEFT JOIN getLateMins() Lateness ON Lateness.agentID=Agents.agentID AND Lateness.inputDate=@dte
          left join payrollReductions pr on pr.agentID=agents.agentID and pr.inputDate=@dte
          LEFT JOIN AllNotes ON AllNotes.agentID=Agents.agentID AND AllNotes.date=@dte AND page='tally-sheet'
          LEFT JOIN BonusPointsEntry ON BonusPointsEntry.agentID=Agents.agentID AND BonusPointsEntry.entryDate=@dte
          LEFT JOIN (SELECT sum(inputHours) as hours, agentID FROM DailyInput WHERE inputDate=@dte GROUP BY agentID) inputs ON inputs.agentID=Agents.agentID
          LEFT JOIN AgentContracts c on c.contractID=Agents.contractVersion
          WHERE
          (agentLeft IS NULL OR agentLeft>=@dte) AND
          ((bookingDate=@dte AND startTime<>'00:00:00') OR hours>0 OR absenceType='Sick' OR Agents.agentID IN(318,381)) `+filters+`
          GROUP BY agentName, Agents.agentID, teamID, absenceType, note, isRemote, contractVersion, AgentTeams.isAllocatable, lateMins1,lateMins2,lateMins3,contractName,fixedHours
          ORDER BY agentName`
        let alloQ=`
          SELECT
          agentID,
          jobID,
          agentAllocationHours
          FROM AgentAllocation
          WHERE agentAllocationDate=@dte`
        let dailyQ=`
          SELECT
          agentID,
          d.jobID,
          j.projectID,
          inputInterviews,
          inputHours,
          excludeFromBonus
          FROM
          DailyInput d left join jobs j on j.jobID=d.jobID
          WHERE
          inputDate=@dte`
        let jobQ=`
        SELECT
        dbo.getJobName(Jobs.jobID) jobName,
        Jobs.jobID,
        Jobs.projectID,
        Jobs.startDate,
        Jobs.endDate,
        isJobHourly,
        interviewsTarget-isnull(ints,0) as intsLeft,
        CASE WHEN isJobHourly=1 THEN 1 ELSE resourceTarget END as resourceTarget,
        isnull(targets.hourlyTarget,Jobs.hourlyTarget) as hourlyTarget,
        ints/hrs as AHR,
        plannerHours,
        plannerHoursAcademy,
        dayAgents,
        eveAgents,
        dbo.getCPI(Jobs.jobID,0) CPI,
        rt.hoursNeeded,rt.hoursNeededAcademy
        FROM
        Jobs
        --LEFT JOIN ViewJobsStats j ON j.jobID=Jobs.jobID
        LEFT JOIN (SELECT jobID, sum(inputInterviews) as ints, sum(inputHours) as hrs FROM DailyInput WHERE inputDate<@dte GROUP BY jobID) inputs ON inputs.jobID=Jobs.jobID
        LEFT JOIN (SELECT sum(inputHours) as hoursOnDte, jobID FROM DailyInput WHERE inputDate=@dte GROUP BY jobID) hrsInputs ON hrsInputs.jobID=Jobs.jobID
        LEFT JOIN (SELECT max(plannerHours) as plannerHours,max(isnull(plannerHoursAcademy,0)) as plannerHoursAcademy, jobID, plannerDate from Planners GROUP BY jobID, plannerDate) tPlan ON tPlan.jobID=Jobs.jobID AND tPlan.plannerDate=@dte
        LEFT JOIN (
          SELECT hourlyTarget, jobID, jobTargetID FROM PastJobTargets WHERE dateUntil>@dte
          ) targets on targets.jobID=Jobs.jobID AND targets.jobTargetID =
            (
               SELECT top 1 jobTargetID
               FROM PastJobTargets
               WHERE dateUntil>@dte AND PastJobTargets.jobID=Jobs.jobID
               ORDER BY jobTargetID ASC
            )
        LEFT JOIN (SELECT jobID, sum(isDay) as dayAgents, sum(isEve) as eveAgents FROM DailyInput
          LEFT JOIN (SELECT DISTINCT agentID, bookingDate, bookingTeamID FROM Booking) Booking on Booking.agentID=DailyInput.agentID AND bookingDate=DailyInput.inputDate
          LEFT JOIN Agents ON Agents.agentID=DailyInput.agentID
          LEFT JOIN AgentTeams ON AgentTeams.agentTeamID=isnull(Booking.bookingTeamID,Agents.teamID)
          WHERE inputDate=@dte
          GROUP BY jobID
        ) agentCheck on agentCheck.jobID=Jobs.jobID
        left join DailyResourceTargets rt on rt.jobID=Jobs.jobID and rt.targetDate=@dte
          WHERE (hoursOnDte>0 OR @dte BETWEEN Jobs.startDate AND Jobs.endDate) `+filtersJ+`
          AND Jobs.isJobCATI=1
          AND Jobs.isJobInHouse=1
          ORDER BY Jobs.projectID DESC,jobName`
        let allJobsQ=`
          SELECT
          dbo.getJobName(Jobs.jobID) jobName,
          Jobs.jobID
          FROM
          Jobs
          WHERE @dte BETWEEN Jobs.startDate AND Jobs.endDate
          AND Jobs.isJobCATI=1
          AND Jobs.isJobInHouse=1
          ORDER BY jobName`
        let teamQ = `SELECT AgentTeams.teamName, AgentTeams.agentTeamID
          FROM AgentTeams
          WHERE AgentTeams.agentTeamID>1
          ORDER BY managerID`
        let pointsQ=`
        SELECT p.agentID, isnull(max(bp.points)-100,sum(score*goldSurveys)) as points, sum(fatalCount) as fatalCount
        FROM
        PointsTable p
        left join BonusPointsEntry bp on bp.entryDate=p.inputDate and bp.agentID=p.agentID
		    WHERE p.inputDate=@dte
        GROUP BY p.agentID
        ORDER BY p.agentID`
        let bonusScoringQ=`select top 5 * from BonusScoringNew where dateFrom<@dte order by dateFrom DESC,scoreID DESC`
        let maxWageQ=`SELECT TOP 1 payrate as maxPayRate
                            FROM      PayRates
                            WHERE   @dte >= dateFrom
                            ORDER BY payrateid DESC`
        let reportQ=`select jobID,agentID,sum(inputInterviews) as ints,sum(case when hourWorked=1 then 1 else 0 end) as hrs from
          (
          	select a.jobID,a.agentID,a.reportHour,isnull(e.inputInterviews,a.inputInterviews) as inputInterviews,isnull(e.hourWorked,a.hourWorked) as hourWorked from AskiaLiveReports a
          	left join AskiaLiveReportsEdits e on e.reportDate=a.reportDate and e.agentID=a.agentID and e.jobID=a.jobID and e.reportHour=a.reportHour
          	where a.reportDate=@dte
          	union
          	select jobID,agentID,reportHour,inputInterviews,hourWorked from AskiaLiveReportsEdits e2 where e2.alrID not in (
          		select e3.alrID from AskiaLiveReports a left join AskiaLiveReportsEdits e3 on e3.reportDate=a.reportDate and e3.agentID=a.agentID and e3.jobID=a.jobID and e3.reportHour=a.reportHour
          		where e3.alrID is not null
            ) and reportDate=@dte
          ) r
          group by jobID,agentID`
        let dte=moment.utc(req.params.date).format("YYYY-MM-DD")
        let tdy=new Date()
        tdy.setHours(0,0,0,0)
        db.input('dte',dte)
        db.input('today',tdy)
        db.query(agentQ, (err, agentR) => {
          if (err){
            logger.info(req.user.uName + " failed to get agents for new tally ... "+agentQ+" - "+err);
            console.log(agentQ+" - "+err,"dte",req.params.date)
            res.send(err)
          }
          else{
            db.query(alloQ, (err, alloR) => {
              if (err){
                console.log(alloQ+" - "+err)
                logger.info(req.user.uName + " failed to get allocations for new tally ... "+alloQ+" - "+err);
                res.send(err)
              }
              else{
                db.query(dailyQ, (err, dailyR) => {
                  if (err){
                    console.log(dailyQ+" - "+err)
                    logger.info(req.user.uName + " failed to get daily for new tally ... "+dailyQ+" - "+err);
                    res.send(err)
                  }
                  else{
                    db.query(allJobsQ, (err, allJobsR) => {
                      if (err){
                        console.log(allJobsQ+" - "+err)
                        logger.info(req.user.uName + " failed to get jobs for new tally ... "+allJobsQ+" - "+err);
                        res.send(err)
                      }
                      db.query(jobQ, (err, jobR) => {
                        if (err){
                          console.log(jobQ+" - "+err)
                          logger.info(req.user.uName + " failed to get jobs for new tally ... "+jobQ+" - "+err);
                          res.send(err)
                        }
                        else{
                          db.query(teamQ, (err, teamR) => {
                            if (err){
                              console.log(teamQ+" - "+err)
                              logger.info(req.user.uName + " failed to get teams list for new tally ... "+teamQ+" - "+err);
                              res.send(err)
                            }
                            else{
                              db.query(pointsQ, (err, pointsR) => {
                                if (err){
                                  console.log(pointsQ+" - "+err)
                                  logger.info(req.user.uName + " failed to get bonus points for new tally ... "+pointsQ+" - "+err);
                                  res.send(err)
                                }
                                else{
                                  db.query(bonusScoringQ, (err, bonusScoringR) => {
                                    if (err){
                                      console.log(pointsQ+" - "+err)
                                      logger.info(req.user.uName + " failed to get bonus scoring for tally ... "+pointsQ+" - "+err);
                                      res.send(err)
                                    }
                                    else{
                                      db.query(maxWageQ, (err, maxWageR) => {
                                        if (err){
                                          console.log(pointsQ+" - "+err)
                                          logger.info(req.user.uName + " failed to get bonus scoring for tally ... "+pointsQ+" - "+err);
                                          res.send(err)
                                        }
                                        else{
                                          db.query(reportQ, (err, reportR) => {
                                            if (err){
                                              console.log(pointsQ+" - "+err)
                                              logger.info(req.user.uName + " failed to get bonus scoring for tally ... "+pointsQ+" - "+err);
                                              res.send(err)
                                            }
                                            else{
                                              res.render("tally-sheet2.ejs", {
                                                agents: agentR.recordset,
                                                allocations: alloR.recordset,
                                                tabulatorUpdated:true,
                                                dailys: dailyR.recordset,
                                                jobs: jobR.recordset,
                                                allJobs: allJobsR.recordset,
                                                dte: req.params.date,
                                                title: "Tally Sheet",
                                                teams:teamR.recordset,
                                                sessTeam:team,
                                                sessShift:shift,
                                                points: pointsR.recordset,
                                                isAdmin:req.user.isAdmin,
                                                bonusScoring:bonusScoringR.recordset,
                                                maxPayRate:maxWageR.recordset[0].maxPayRate,
                                                report:reportR.recordset,
                                                incAcademy:incAcademy,
                                                incFixed:req.params.incFixed,
                                              })
                                            }
                                          })
                                        }
                                      })
                                    }
                                  })
                                }
                              })
                            }
                          })
                        }
                      })
                    })
                  }
                })
              }
            })
          }
        })
      },
      loadTallySheetPost: (req,res) => {
        let shift=req.params.shift
        let team=req.params.team
        let jobs=req.body.job_search
        let filters=""
        let filtersJ=""
        if (shift=="d") {
          filters=filters+" AND AgentTeams.isDay=1 "
          filtersJ=filtersJ+" AND (Jobs.isJobDay=1 OR dayAgents>0) "
        }
        if (shift=="e") {
          filters=filters+" AND AgentTeams.isEve=1 "
          filtersJ=filtersJ+" AND (Jobs.isJobEve=1 OR eveAgents>0) "
        }
        if (team>0) {
          filters=filters+" AND teamID="+team+" "
        }
        if (!jobs) {
          jobs=[]
        }
        let agentQ=`
          SELECT
          agentName,
          max(bookedHours) as bookedHours,
          left(max(startTime),5) as startTime,
          left(max(endTime),5) as endTime,
          Agents.agentID,
          teamID,
          isnull(absenceType,case when lateMins>0 then 'Late' else 'Present' end) as absenceType,
          lateMins,
          note,
          isRemote,
          contractVersion,
          max(points) as points,
          Booking.isAllocatable
          FROM
          Agents
          LEFT JOIN getBookedHours(@dte,@dte) Booking ON Agents.agentID=Booking.agentID AND bookingDate=@dte
          LEFT JOIN AgentTeams ON AgentTeams.AgentTeamID=isnull(Booking.bookingTeamID,Agents.teamID)
          LEFT JOIN Absence ON Absence.agentID=Agents.agentID AND absenceDate=@dte
          LEFT JOIN Lateness ON Lateness.agentID=Agents.agentID AND Lateness.inputDate=@dte
          LEFT JOIN AllNotes ON AllNotes.agentID=Agents.agentID AND AllNotes.date=@dte AND page='tally-sheet'
          LEFT JOIN BonusPointsEntry ON BonusPointsEntry.agentID=Agents.agentID AND BonusPointsEntry.entryDate=@dte
          LEFT JOIN (SELECT sum(inputHours) as hours, agentID FROM DailyInput WHERE inputDate=@dte GROUP BY agentID) inputs ON inputs.agentID=Agents.agentID
          WHERE
          (agentLeft IS NULL OR agentLeft>=@dte) AND
          ((bookingDate=@dte AND startTime<>'00:00:00') OR hours>0 OR absenceType='Sick' OR Agents.agentID IN(318,381)) `+filters+`
          GROUP BY agentName, Agents.agentID, teamID, absenceType, note, isRemote, contractVersion, lateMins,Booking.isAllocatable
          ORDER BY agentName`
        let alloQ=`
          SELECT
          agentID,
          jobID,
          agentAllocationHours
          FROM AgentAllocation
          WHERE agentAllocationDate=@dte`
        let dailyQ=`
          SELECT
          agentID,
          d.jobID,
          j.projectID,
          inputInterviews,
          inputHours,
          excludeFromBonus
          FROM
          DailyInput d left join jobs j on j.jobID=d.jobID
          WHERE
          inputDate=@dte`
        let jobQ=`
          SELECT
          j.fullJobName as jobName,
          Jobs.jobID,
          Jobs.projectID,
          Jobs.startDate,
          Jobs.endDate,
          isJobHourly,
          interviewsTarget-isnull(ints,0) as intsLeft,
          CASE WHEN isJobHourly=1 THEN 1 ELSE j.resourceTarget END as resourceTarget,
          isnull(targets.hourlyTarget,Jobs.hourlyTarget) as hourlyTarget,
          ints/hrs as AHR,
          plannerHours,
		  dayAgents,
		  eveAgents,
      j.CPI
          FROM
          Jobs
          LEFT JOIN ViewJobsStats j ON j.jobID=Jobs.jobID
          LEFT JOIN (SELECT jobID, sum(inputInterviews) as ints, sum(inputHours) as hrs FROM DailyInput WHERE inputDate<@dte GROUP BY jobID) inputs ON inputs.jobID=Jobs.jobID
		  LEFT JOIN (SELECT sum(inputHours) as hoursOnDte, jobID FROM DailyInput WHERE inputDate=@dte GROUP BY jobID) hrsInputs ON hrsInputs.jobID=Jobs.jobID
          LEFT JOIN (SELECT max(plannerHours) as plannerHours, jobID, plannerDate from Planners GROUP BY jobID, plannerDate) tPlan ON tPlan.jobID=Jobs.jobID AND tPlan.plannerDate=@dte
          LEFT JOIN (
            SELECT hourlyTarget, jobID, jobTargetID FROM PastJobTargets WHERE dateUntil>@dte
            ) targets on targets.jobID=Jobs.jobID AND targets.jobTargetID =
      				(
      				   SELECT top 1 jobTargetID
      				   FROM PastJobTargets
      				   WHERE dateUntil>@dte AND PastJobTargets.jobID=Jobs.jobID
      				   ORDER BY jobTargetID ASC
      				)
		  LEFT JOIN (SELECT jobID, sum(isDay) as dayAgents, sum(isEve) as eveAgents FROM DailyInput
      LEFT JOIN (SELECT DISTINCT agentID, bookingDate, bookingTeamID FROM Booking) Booking on Booking.agentID=DailyInput.agentID AND bookingDate=DailyInput.inputDate
			LEFT JOIN Agents ON Agents.agentID=DailyInput.agentID
			LEFT JOIN AgentTeams ON AgentTeams.agentTeamID=isnull(Booking.bookingTeamID,Agents.teamID)
			WHERE inputDate=@dte
			GROUP BY jobID
			) agentCheck on agentCheck.jobID=Jobs.jobID
          WHERE (hoursOnDte>0 OR @dte BETWEEN Jobs.startDate AND Jobs.endDate)
          AND Jobs.isJobCATI=1
          AND Jobs.isJobInHouse=1
          AND Jobs.jobID IN (`+jobs+`)
          ORDER BY Jobs.projectID DESC,jobName`
        let allJobsQ=`
          SELECT
          ViewJobFullName.jobName,
          Jobs.jobID
          FROM
          Jobs
          LEFT JOIN ViewJobFullName ON ViewJobFullName.jobID=Jobs.jobID
          WHERE @dte BETWEEN Jobs.startDate AND Jobs.endDate
          AND Jobs.isJobCATI=1
          AND Jobs.isJobInHouse=1
          ORDER BY jobName`
        let teamQ = `SELECT AgentTeams.teamName, AgentTeams.agentTeamID
          FROM AgentTeams
          WHERE AgentTeams.agentTeamID>1
          AND isAllocatable=1
          ORDER BY managerID`
        let pointsQ=`

        SELECT p.agentID, isnull(max(bp.points)-100,sum(score*goldSurveys)) as points, sum(fatalCount) as fatalCount
        FROM
        PointsTable p
        left join BonusPointsEntry bp on bp.entryDate=p.inputDate and bp.agentID=p.agentID
        WHERE p.inputDate=@dte
        GROUP BY p.agentID
        ORDER BY p.agentID`
        let bonusScoringQ=`select top 5 * from BonusScoringNew where dateFrom<@dte order by dateFrom DESC,scoreID DESC`
        let maxWageQ=`SELECT TOP 1 payrate as maxPayRate
                            FROM      PayRates
                            WHERE   @dte >= dateFrom
                            ORDER BY payrateid DESC`
        let reportQ=`select jobID,agentID,sum(inputInterviews) as ints,sum(case when hourWorked=1 then 1 else 0 end) as hrs from
          (
          	select a.jobID,a.agentID,a.reportHour,isnull(e.inputInterviews,a.inputInterviews) as inputInterviews,isnull(e.hourWorked,a.hourWorked) as hourWorked from AskiaLiveReports a
          	left join AskiaLiveReportsEdits e on e.reportDate=a.reportDate and e.agentID=a.agentID and e.jobID=a.jobID and e.reportHour=a.reportHour
          	where a.reportDate=@dte
          	union
          	select jobID,agentID,reportHour,inputInterviews,hourWorked from AskiaLiveReportsEdits e2 where e2.alrID not in (
          		select e3.alrID from AskiaLiveReports a left join AskiaLiveReportsEdits e3 on e3.reportDate=a.reportDate and e3.agentID=a.agentID and e3.jobID=a.jobID and e3.reportHour=a.reportHour
          		where e3.alrID is not null
              ) and reportDate=@dte
          ) r
          group by jobID,agentID`
        let dte=moment.utc(req.params.date).format("YYYY-MM-DD")
        let tdy=new Date()
        tdy.setHours(0,0,0,0)
        if (dte instanceof Date && !isNaN(dte.valueOf())) {
          db.input('dte',dte)
          db.input('today',tdy)
          db.query(agentQ, (err, agentR) => {
            if (err){
              logger.info(req.user.uName + " failed to get agents for new tally ... "+agentQ+" - "+err);
              console.log(agentQ+" - "+err,"dte",req.params.date)
              res.send(err)
            }
            else{
              db.query(alloQ, (err, alloR) => {
                if (err){
                  console.log(alloQ+" - "+err)
                  logger.info(req.user.uName + " failed to get allocations for new tally ... "+alloQ+" - "+err);
                }
                else{
                  db.query(dailyQ, (err, dailyR) => {
                    if (err){
                      console.log(dailyQ+" - "+err)
                      logger.info(req.user.uName + " failed to get daily for new tally ... "+dailyQ+" - "+err);
                    }
                    else{
                      db.query(allJobsQ, (err, allJobsR) => {
                        if (err){
                          console.log(allJobsQ+" - "+err)
                          logger.info(req.user.uName + " failed to get jobs for new tally ... "+allJobsQ+" - "+err);
                        }
                        db.query(jobQ, (err, jobR) => {
                          if (err){
                            console.log(jobQ+" - "+err)
                            logger.info(req.user.uName + " failed to get jobs for new tally ... "+jobQ+" - "+err);
                          }
                          else{
                            db.query(teamQ, (err, teamR) => {
                              if (err){
                                console.log(teamQ+" - "+err)
                                logger.info(req.user.uName + " failed to get teams list for new tally ... "+teamQ+" - "+err);
                              }
                              else{
                                db.query(pointsQ, (err, pointsR) => {
                                  if (err){
                                    console.log(pointsQ+" - "+err)
                                    logger.info(req.user.uName + " failed to get bonus points for new tally ... "+pointsQ+" - "+err);
                                  }
                                  else{
                                    db.query(bonusScoringQ, (err, bonusScoringR) => {
                                      if (err){
                                        console.log(pointsQ+" - "+err)
                                        logger.info(req.user.uName + " failed to get bonus scoring for tally ... "+pointsQ+" - "+err);
                                      }
                                      else{
                                        db.query(maxWageQ, (err, maxWageR) => {
                                          if (err){
                                            console.log(pointsQ+" - "+err)
                                            logger.info(req.user.uName + " failed to get bonus scoring for tally ... "+pointsQ+" - "+err);
                                          }
                                          else{
                                            db.query(reportQ, (err, reportR) => {
                                              if (err){
                                                console.log(reportQ+" - "+err)
                                                logger.info(req.user.uName + " failed to get bonus scoring for tally ... "+pointsQ+" - "+err);
                                              }
                                              res.render("tally-sheet2.ejs", {
                                                agents: agentR.recordset,
                                                allocations: alloR.recordset,
                                                tabulatorUpdated:true,
                                                dailys: dailyR.recordset,
                                                jobs: jobR.recordset,
                                                allJobs: allJobsR.recordset,
                                                dte: req.params.date,
                                                title: "Tally Sheet",
                                                teams:teamR.recordset,
                                                sessTeam:team,
                                                sessShift:shift,
                                                points: pointsR.recordset,
                                                isAdmin:req.user.isAdmin,
                                                bonusScoring:bonusScoringR.recordset,
                                                maxPayRate:maxWageR.recordset[0].maxPayRate,
                                                report:reportR.recordset,
                                              })
                                            })
                                          }
                                        })
                                      }
                                    })
                                  }
                                })
                              }
                            })
                          }
                        })
                      })
                    }
                  })
                }
              })
            }
          })
        }else {
          res.send("Invalid date. Please try again")
        }
      },
      getTallyPerf:(req,res)=>{
        let performanceQ=`
        select
        Agents.agentID,
        Agents.agentName,
        sum(inputHours) as hrsWorked,
        (0.00+sum(inputInterviews)/nullif(sum(inputHours),0)) as AHR
        from
        DailyInput left join Agents on Agents.agentID=DailyInput.agentID
        where
        jobID=`+req.body[0].jobID+`
        AND inputDate < cast(getDate() as date)
        GROUP by
        jobID, Agents.agentID, Agents.agentName
        ORDER BY AHR DESC`
        db.query(performanceQ, (err, performanceR) => {
          if (err){
            console.log(performanceQ+" - "+err)
            logger.info(req.user.uName + " failed to get performance for new tally ... "+performanceQ+" - "+err);
            res.status(500).send({error: 'Failed to get performance'})
          }
          else{
            res.status(200).send(performanceR.recordset)
          }
        })
      },
      updateTallyAllo: (req,res) => {
        let data=req.body[0]
        let deleteQ=`DELETE FROM AgentAllocation WHERE agentAllocationDate='`+data.dte+`' AND agentID=`+data.agentID+` AND jobID=`+data.jobID
        let insertQ=`INSERT INTO AgentAllocation (agentAllocationDate, agentID, jobID, agentAllocationHours) VALUES ('`+data.dte+`',`+data.agentID+`,`+data.jobID+`,`+data.hrs+`)`
        db.query(deleteQ, (err, deleteR) => {
          if (data.hrs>0) {
            db.query(insertQ, (err, insertR) => {
              if (err) {
                res.status(500).send({error: 'Failed to add allocation'})
                logger.info(req.user.uName + " failed to add allocation from tally ... "+insertQ+" - "+err);
              }else {
                res.send("success")
              }
            })
          }else {
            res.send("success")
          }
        })
      },
      updateTallyDaily: (req,res) => {
        let data=req.body[0]
        let y = data.agentID;
        let deleteQ=`DELETE FROM dailyInput WHERE inputDate='`+data.dte+`' AND agentID=`+data.agentID+` AND jobID=`+data.jobID
        let insertQ=`INSERT INTO dailyInput (inputDate,agentID,jobID,inputHours,payRateID,inputInterviews,excludeFromBonus,liveSales,inputBookingID) VALUES ('`+data.dte+`',`+data.agentID+`,`+data.jobID+`,`+data.hrs+`,0,`+data.ints+`,`+(data.incl?0:1)+`,`+data.sales+`,`+data.bookingID+`)`
        db.query(deleteQ, (err, deleteR) => {
          if (data.hrs>0) {
            db.query(insertQ, (err, insertR) => {
              if (err) {
                console.log(err)
                console.log(insertQ)
                res.status(500).send({error: 'Failed to add to daily figures'})
                logger.info(req.user.uName + " failed to add allocation from tally ... "+insertQ+" - "+err);
              }else {
                res.send("success")
                logger.info(req.user.uName + " edited the tally sheet ... inputDate='"+data.dte+"' agentID="+data.agentID+" AND jobID="+data.jobID+" AND Hours="+data.hrs+" AND Ints="+data.ints);
              }
            })
          }else {
            res.send("success")
            logger.info(req.user.uName + " removed from the tally sheet ... inputDate='"+data.dte+"' agentID="+data.agentID+" AND jobID="+data.jobID);
          }
        })
      },
      updateAbsence: (req,res) => {
        let data=req.body[0]
        let deleteQ=`DELETE FROM Absence WHERE absenceDate='`+data.dte+`' AND agentID=`+data.agentID
        let insertQ=`INSERT INTO Absence (absenceDate, agentID, absenceType) VALUES ('`+data.dte+`',`+data.agentID+`,'`+data.type+`')`
        db.query(deleteQ, (err, deleteR) => {
          if (!["Present","Late"].includes(data.type)) {
            db.query(insertQ, (err, insertR) => {
              if (err) {
                res.status(500).send({error: 'Failed to update absence'})
                console.log(req.user.user + " failed to update absence from tally ... "+insertQ+" - "+err);
                logger.info(req.user.uName + " failed to update absence from tally ... "+insertQ+" - "+err);
              }else {
                res.send("success")
                logger.info(req.user.uName + " added absence on the tally sheet ... inputDate='"+data.dte+"' agentID="+data.agentID+" AND absenceType="+data.type);
              }
            })
          }else {
            res.send("success")
          }
        })
      },
      updateLateness: (req,res) => {
        let data=req.body[0]
        let deleteQ=`DELETE FROM Lateness WHERE inputDate='`+data.dte+`' AND agentID=`+data.agentID+` AND lateType='`+data.lateType+`'`
        let insertQ=`INSERT INTO Lateness (inputDate, agentID, lateMins, lateType) VALUES ('`+data.dte+`',`+data.agentID+`,'`+data.lateMins+`','`+data.lateType+`')`
        db.query(deleteQ, (err, deleteR) => {
          if (err) {
            console.log(err)
          }
          if (data.lateMins) {
            db.query(insertQ, (err, insertR) => {
              if (err) {
                res.status(500).send({error: 'Failed to update lateness'})
                console.log(req.user.user + " failed to update lateness from tally ... "+insertQ+" - "+err);
                logger.info(req.user.uName + " failed to update lateness from tally ... "+insertQ+" - "+err);
              }else {
                res.send("success")
                logger.info(req.user.uName + " added lateness on the tally sheet",insertQ);
              }
            })
          }else {
            res.send("success")
          }
        })
      },
      updateTallyNote: (req,res) => {
        let data=req.body[0]
        let deleteQ=`DELETE FROM AllNotes WHERE AllNotes.agentID=`+data.agentID+` AND AllNotes.date='`+data.dte+`' AND page='tally-sheet'`
        let insertQ=`INSERT INTO AllNotes (date, agentID, page, note) VALUES ('`+data.dte+`',`+data.agentID+`,'tally-sheet',@note)`
        db.input('note',data.note)
        db.query(deleteQ, (err, deleteR) => {
          if (data.note!="") {
            db.query(insertQ, (err, insertR) => {
              if (err) {
                res.status(500).send({error: 'Failed to update note'})
                console.log(req.user.user + " failed to update note from tally ... "+insertQ+" - "+err);
                logger.info(req.user.uName + " failed to update note from tally ... "+insertQ+" - "+err);
              }else {
                res.send("success")
              }
            })
          }else {
            res.send("success")
          }
        })
      },
      manualBonus: (req,res) => {
        let insQ="insert into BonusPointsEntry (entryDate,agentID,points) VALUES ('"+req.body.dte+"','"+req.body.agentID+"',"+req.body.points+")"
        db.query("delete from BonusPointsEntry where entryDate='"+req.body.dte+"' and agentID='"+req.body.agentID+"'", (err, pointsR) => {
          if (req.body.points==="") {
            res.status(200).send("success")
          }else {
            db.query(insQ, (err, insR) => {
              if (err) {
                res.status(500).send({error: 'Failed to change points'})
                console.log(insQ,err)
              }else {
                res.status(200).send("success")
              }
            })
          }
        })
      },
      updateTallyBonus: (req,res) => {
        let data=req.body[0]
        let pointsQ=`
          SELECT isnull(max(bp.points)-100,sum(score*goldSurveys)) as points, sum(fatalCount) as fatalCount
          FROM
          PointsTable p
          left join BonusPointsEntry bp on bp.entryDate=p.inputDate and bp.agentID=p.agentID
  		    WHERE inputDate=@dte AND p.agentID=`+data.agentID
        db.input('dte',moment.utc(data.dte).format("YYYY-MM-DD"))
        db.query(pointsQ, (err, pointsR) => {
          if (err) {
            res.status(500).send({error: 'Failed to get points'})
          }else {
            if (!pointsR.recordset[0]) {
              res.send({points:0})
            }else {
              res.send({points:pointsR.recordset[0].points})
            }
          }
        })
      },
      updateTallyBooking: (req,res) => {
        let data=req.body[0]
        let deleteQ=`DELETE FROM Booking WHERE agentID=`+data.agentID+` AND bookingDate='`+data.dte+`'`
        let insertQ=`INSERT INTO Booking (bookingDate, agentID, startTime, endTime, bookingTeamID) VALUES ('`+data.dte+`',`+data.agentID+`,'`+data.stTime+`','`+data.enTime+`',`+data.teamID+`)`
        let updateQ=`UPDATE Booking set startTime='`+data.stTime+`', endTime='`+data.enTime+`' where bookingID=`+data.bookingID
        if (data.bookingID) {
          db.query(updateQ, (err, updateR) => {
            if (err) {
              res.status(500).send({error: 'Failed to update booking hours'})
              console.log(req.user.user + " failed to update booking hours from tally ... "+updateQ+" - "+err);
              logger.info(req.user.uName + " failed to update booking hours from tally ... "+updateQ+" - "+err);
            }else {
              res.send("success")
            }
          })
        }else {
          db.query(deleteQ, (err, deleteR) => {
            if (err) {
              res.status(500).send({error: 'Failed to update booking hours'})
              console.log(req.user.user + " failed to update booking hours from tally ... "+deleteQ+" - "+err);
              logger.info(req.user.uName + " failed to update booking hours from tally ... "+deleteQ+" - "+err);
            }else {
              if (data.enTime!="00:00") {
                db.query(insertQ, (err, insertR) => {
                  if (err) {
                    res.status(500).send({error: 'Failed to update booking hours'})
                    console.log(req.user.user + " failed to update booking hours from tally ... "+insertQ+" - "+err);
                    logger.info(req.user.uName + " failed to update booking hours from tally ... "+insertQ+" - "+err);
                  }else {
                    res.send("success")
                  }
                })
              }else {
                res.send("success")
              }
            }
          })
        }
      },
      getAgentRecents: (req,res) => {
        let agentQ=`
        select Agents.agentName,isnull(CPI,0)*isnull(Ints,0) as sales,isnull(Pay,0) as pay,inputDate,fullJobName
        from
        ViewDailyPay
        left join Agents on agents.agentID=ViewDailyPay.agentID
        left join ViewJobsStats on ViewJobsStats.jobID=ViewDailyPay.jobID
        where inputDate>='`+req.body.past+`'
        and inputDate<cast(getdate() as date)
        and ViewDailyPay.agentID =`+req.body.agentID+`
        order by inputDate desc`
        db.query(agentQ, (err, agentR) => {
          if (err) {
            console.log(err)
            console.log(agentQ)
          }
          res.send(agentR.recordset)
        })
      },
      getJobRecents: (req,res) => {
        let jobQ=`
        select Agents.agentName,isnull(CPI,0)*isnull(Ints,0) as sales,isnull(Pay,0) as pay,inputDate,fullJobName
        from
        ViewDailyPay
        left join Agents on agents.agentID=ViewDailyPay.agentID
        left join ViewJobsStats on ViewJobsStats.jobID=ViewDailyPay.jobID
        where inputDate>='`+req.body.past+`'
        and inputDate<cast(getdate() as date)
        and ViewDailyPay.jobID =`+req.body.jobID+`
        order by inputDate desc`
        db.query(jobQ, (err, jobR) => {
          if (err) {
            console.log(err)
            console.log(jobQ)
          }
          res.send(jobR.recordset)
        })
      },
      addOne2one:(req,res)=>{
        let thisDb=new sql.Request()
        let fields=['agentID','o2oDate','o2oNote','userID']
        let vals=[req.body.agent,'@dte','@note',req.user.user]
        let targets=['cont','qc','dials','onTarget','attendance']
        promForEach(targets,(t,i,next)=>{
          thisDb.input(t+"Target",req.body[t+"Target"] || null)
          fields.push(t+"Target")
          vals.push("@"+t+"Target")
          thisDb.input(t+"Note",req.body[t+"Note"] || null)
          fields.push(t+"Note")
          vals.push("@"+t+"Note")
          next()
        }).then(e=>{
          let q=`insert into AgentOne2ones (`+fields.join(",")+`) VALUES (`+vals.join(",")+`)`
          thisDb.input('dte',moment.utc(req.body.coachDate).format("YYYY-MM-DD"))
          thisDb.input('note',req.body.one2oneNote)
          thisDb.query(q,(err,r)=>{
            if (err) {
              console.log(err,q)
              res.send(err)
            }else {
              res.redirect('/add-coaching/0/0')
            }
          })
        })
      },
      updatePayReduction:(req,res)=>{
        console.log(req.body)
        db.query("delete from payrollReductions where agentID="+req.body.agentID+" and inputDate='"+req.body.dte+"'",(err,r)=>{
          if (err) {
            console.log(err)
            res.status(500).send(err)
          }
          if (req.body.reduction) {
            db.query("insert into payrollReductions (agentID,inputDate,reductionHours) VALUES ("+req.body.agentID+",'"+req.body.dte+"',"+req.body.reduction+")",(err,r)=>{
              if (err) {
                console.log(err)
                res.status(500).send(err)
              }else {
                res.send("done")
              }
            })
          }else {
            res.send("done")
          }
        })
      },
      getDowntime:(req,res)=>{
        // console.log(req.query)
        let d=req.query
        db.query(`select * from TallyDowntime where jobID=`+d.jobID+` and agentID=`+d.agentID+` and inputDate='`+d.inputDate+`'`,(err,r)=>{
          if (err) {
            console.log(err)
            res.status(500).send({error:err})
          }else {
            res.send(r.recordset)
          }
        })
      },
      updateDowntime:(req,res)=>{
        console.log(req.body,req.params)
        let d=req.body.data
        function dbQuery(){
          db.input("tdNote",d.note)
          if (req.params.type=='add') {
            return db.query(`insert into TallyDowntime (agentID,inputDate,jobID,startTime,endTime,downtimeType,note) VALUES (`+d.agentID+`,'`+d.inputDate+`',`+d.jobID+`,'`+d.startTime+`','`+d.endTime+`','`+d.downtimeType+`',@tdNote)
            select SCOPE_IDENTITY() as id`)
          }else if (req.params.type=='remove') {
            return db.query(`delete from TallyDowntime where dtID=`+d.dtID+``)
          }else if (req.params.type=='update') {
            return db.query(`update TallyDowntime set startTime='`+d.startTime+`',endTime='`+d.endTime+`',downtimeType='`+d.downtimeType+`',note=@tdNote where dtID=`+d.dtID)
          }
        }
        dbQuery().then(r=>{
          res.send(r.recordset)
        }).catch(err=>{
          console.log(err)
          res.status(500).send({error:err})
        })
      },
      ccActivity:(req,res)=>{
        res.render("cc-activity.ejs",{
          title:"Live CC Tracker",
          tabulatorUpdated:true,
        })
      }
  }
