const express = require('express');
const axios = require('axios');
const nodeMailer = require('nodemailer');
const csv = require('@fast-csv/parse');
const fs = require('fs');
const path = require('path');
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

function minsFromTime(time){
  var hms = time;   // your input string
  var a = hms.split(':'); // split it at the colons

  // Hours are worth 60 minutes.
  var minutes = (+a[0]) * 60 + (+a[1]);

  return(minutes);
}

/* Helper function to perform the CSV to JSON transform */
function convertToJson(inputCsv) {

  /* Split input string by `,` and clean up each item */
  const arrayCsv = inputCsv.split(',').map(s => s.replace(/"/gi, '').trim())

  const outputJson = [];

  /* Iterate through input csv at increments of 6, to capture entire CSV row
     per iteration */
  for (let i = 6; i < arrayCsv.length; i += 6) {

    /* Extract CSV data for current row, and assign to named variables */
    const [date, firstName, middleName, lastName, uin, rsvpStatus] =
    arrayCsv.slice(i, i + 6)

    /* Populate structured JSON entry for this CSV row */
    outputJson.push({
      uin,
      studentInfo: {
        firstName,
        middleName,
        lastName,
        rsvpStatus
      }
    });
  }

  return outputJson;
}

module.exports = {
  viewReport: (req, res) => {
    res.render('daily-report.ejs',{
      title:'View daily reports',
      message:''
    })
  },

  dailyReport: (req, res) => {
    req.params.date=req.params.date==0?moment().format("YYYY-MM-DD"):req.params.date
    let stdate=req.params.date
    let endate=req.params.date
    // console.log(req.query);
    let isSummary=req.query.summary=="true"
    if (isSummary) {
      stdate=req.query.stdate
      endate=req.query.endate
    }
    let date = req.params.date;
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
                   CONCAT(RIGHT('0' + Rtrim(Day(Jobs.startDate)), 2), '/', RIGHT(
                   '0' + Rtrim(Month(Jobs.startDate)), 2), '/', Year(Jobs.startDate))   as
                   FstartDate,
                   CONCAT(RIGHT('0' + Rtrim(Day(Jobs.endDate)), 2), '/', RIGHT(
                   '0' + Rtrim(Month(Jobs.endDate)), 2), '/', Year(Jobs.endDate))       as
                   FendDate,
                   CONCAT(RIGHT('0' + Rtrim(Day(Jobs.dataDate)), 2), '/', RIGHT(
                   '0' + Rtrim(Month(Jobs.dataDate)), 2), '/', Year(Jobs.dataDate))     as
                   FdataDate,
                   CONCAT(RIGHT('0' + Rtrim(Day(Jobs.tablesDate)), 2), '/', RIGHT(
                   '0' + Rtrim(Month(Jobs.tablesDate)), 2), '/', Year(Jobs.tablesDate)) as
                   FtablesDate,
                   Jobs.startDate,
                   Jobs.endDate,
                   Jobs.jobID,
                   Jobs.jobName,
                   Jobs.interviewsTarget,
                   ViewJobsStats.CPI as jobCPI,
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
                   Jobs.isJobHourly,
                   Jobs.expectedLOI,
                   Jobs.timedLOI,
                   Quotes.quoteID,
                   Quotes.quoteNo,
                   Quotes.quoteName,
                   Quotes.clientID,
                   Quotes.quoteDate,
                   Quotes.noteID,
                   Quotes.isQuoteAsBusiness,
                   Quotes.isQuoteAsConsumer,
                   Quotes.isQuoteAsCATI,
                   Quotes.isQuoteAsRecruitment,
                   Quotes.isQuoteAsFace,
                   Quotes.isQuoteAsOnline,
                   Quotes.isQuoteAsInternational,
                   Clients.clientName,
                   daily.Pay,
                   daily.Hours,
                   daily.Ints
            FROM   Jobs LEFT JOIN ViewJobsStats on ViewJobsStats.jobID=Jobs.jobID,
                   Clients,
                   Quotes,
                   Projects,
                   (select jobID, sum(Ints) as Ints, sum(Pay) as Pay, sum(Hours) as Hours from viewDailyPay where inputDate<='`+endate+`' group by jobID) daily
            WHERE  Jobs.projectID = Projects.projectID
                   AND Projects.quoteID = Quotes.quoteID
                   AND Quotes.clientID = Clients.clientID
                   AND daily.jobID=Jobs.jobID
            ORDER  BY Jobs.isJobDay,
                      Quotes.quoteNo ASC `;
    let dPQuery =
          `SELECT Users.staffID,
                   Staff.staffName
            FROM   Users
                   INNER JOIN Staff
                           ON Users.staffID = Staff.staffID
                   INNER JOIN Roles
                           ON Users.roleID = Roles.roleID
            WHERE  ( Staff.staffJobTitleID = 6
                      OR Staff.staffJobTitleID = 3
                      OR Staff.staffJobTitleID = 14
                      OR Staff.staffJobTitleID = 7 )
                   AND Staff.staffLeft IS NULL
            GROUP  BY Users.staffID,
                      Staff.staffName
            ORDER  BY Staff.staffName ASC `;
    let tLQuery =
          `SELECT Staff.staffID,
                   Staff.staffName,
                   isEve,isDay
            FROM   Staff
              left join (select max(isEve) as isEve,max(isDay) as isDay,managerID from agentTeams group by managerID) as shift on shift.managerID=Staff.staffID
            WHERE  staffJobTitleID = 8
                   AND Staff.staffLeft IS NULL
            ORDER  BY Staff.staffName ASC `;
    let cMQuery =
          `SELECT Users.staffID,
                   Staff.staffName
            FROM   Users
                   INNER JOIN Staff
                           ON Users.staffID = Staff.staffID
                   INNER JOIN Roles
                           ON Users.roleID = Roles.roleID
            WHERE  ( Staff.staffJobTitleID = 5
                      OR Staff.staffJobTitleID = 3
                      OR Staff.staffJobTitleID = 2 )
                   AND Staff.staffLeft IS NULL
            GROUP  BY Users.staffID,
                      Staff.staffName
            ORDER  BY Staff.staffName ASC `
    let jobQuery =
          `SELECT Jobs.jobID,
                   Jobs.jobName,
                   Jobs.startDate,
                   Jobs.endDate,
                   Jobs.dataDate,
                   Jobs.tablesDate,
                   Jobs.projectID,
                   Jobs.interviewsTarget,
                   ViewJobsStats.CPI as jobCPI,
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
                   Jobs.isJobHourly,
                   Jobs.isJobDeskResearch,
                   Projects.setupCost,
                   Projects.dataCost,
                   Projects.sampleCost,
                   Projects.codingCost,
                   DI.CATIInterviews,
                   DI.Hours,
                   INC.IncCost,
                   INC.IncCount,
                   INC.IncAdm,
                   SAMP.SampCost,
                   SAMP.SampCount,
                   OTH.OtherCost,
                   PJOBS.PanelInterviews
            FROM   Projects
                   LEFT JOIN Jobs
                          ON Jobs.projectID = Projects.projectID
                  LEFT JOIN ViewJobsStats on ViewJobsStats.jobID=Jobs.jobID
                   LEFT JOIN (SELECT DailyInput.jobID,
                                     Sum(DailyInput.inputInterviews) AS 'CATIInterviews',
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
                                     Sum(PanelJobs.completesNumber) AS PanelInterviews
                              FROM   PanelJobs
                              GROUP  BY PanelJobs.jobID) PJOBS
                          ON PJOBS.jobID = Jobs.jobID`;
    let bookingQuery =
          `SELECT
          sum(bookedHours) as bookedHours,
		  AgentTeams.isDay,
		  AgentTeams.isEve
          FROM
            getBookedHours('` + stdate + `','` + endate + `') Booking
            LEFT JOIN Agents ON Agents.agentID=Booking.agentID
            LEFT JOIN AgentTeams ON agentTeamID=isnull(Booking.bookingTeamID,Agents.teamID)
          GROUP BY
          AgentTeams.isDay, AgentTeams.isEve`;
    let dailyQueryDay =
          `SELECT Sum(viewDailyPay.Ints)                as Ints,
                   Sum(viewDailyPay.Hours)                    as Hours,
                   Sum(viewDailyPay.Pay) as Pay,
                   Sum(liveSales) as liveSales,
                   viewDailyPay.jobID`+(isSummary?"":",AllNotes.note")+`
            FROM   viewDailyPay
            left join dailyInput d on d.inputDate=viewDailyPay.inputDate and d.agentID=viewDailyPay.agentID and d.jobID=viewDailyPay.jobID
            LEFT JOIN (SELECT DISTINCT agentID, startTime, endTime, bookingDate, bookingTeamID FROM Booking) Booking on Booking.agentID=viewDailyPay.agentID AND bookingDate=viewDailyPay.inputDate
  					LEFT JOIN Agents ON Agents.agentID=viewDailyPay.agentID
  					LEFT JOIN AgentTeams ON agentTeamID=isnull(Booking.bookingTeamID,Agents.teamID)
            `+(isSummary?"":`
            LEFT JOIN (SELECT note, jobID FROM AllNotes WHERE AllNotes.tableName='DailyInput' AND AllNotes.otherID=1 AND AllNotes.date between '` + stdate + `' and '` + endate + `' AND AllNotes.page='daily-update') AllNotes ON AllNotes.jobID=viewDailyPay.jobID
            `)+`            WHERE  viewDailyPay.Hours > 0
                   AND viewDailyPay.inputDate between '` + stdate + `' and '` + endate + `'
				   AND AgentTeams.isDay=1 AND (AgentTeams.isAllocatable=1 OR viewDailyPay.jobID not in (select jobID from jobs where projectID<3))
            GROUP  BY
            viewDailyPay.jobID`+(isSummary?"":",AllNotes.note")+`
            ORDER BY viewDailyPay.jobID`;
    let dailyQueryEve =
          `SELECT Sum(viewDailyPay.Ints)                as Ints,
                   Sum(viewDailyPay.Hours)                    as Hours,
                   Sum(viewDailyPay.Pay) as Pay,
                   Sum(liveSales) as liveSales,
                   viewDailyPay.jobID`+(isSummary?"":",AllNotes.note")+`
            FROM   viewDailyPay
            left join dailyInput d on d.inputDate=viewDailyPay.inputDate and d.agentID=viewDailyPay.agentID and d.jobID=viewDailyPay.jobID
            LEFT JOIN (SELECT DISTINCT agentID, startTime, endTime, bookingDate, bookingTeamID FROM Booking) Booking on Booking.agentID=viewDailyPay.agentID AND bookingDate=viewDailyPay.inputDate
  					LEFT JOIN Agents ON Agents.agentID=viewDailyPay.agentID
  					LEFT JOIN AgentTeams ON agentTeamID=isnull(Booking.bookingTeamID,Agents.teamID)
            `+(isSummary?"":`
            LEFT JOIN (SELECT note, jobID FROM AllNotes WHERE AllNotes.tableName='DailyInput' AND AllNotes.otherID=2 AND AllNotes.date between '` + stdate + `' and '` + endate + `' AND AllNotes.page='daily-update') AllNotes ON AllNotes.jobID=viewDailyPay.jobID
            `)+`
            WHERE  viewDailyPay.Hours > 0
                   AND viewDailyPay.inputDate between '` + stdate + `' and '` + endate + `'
				   AND AgentTeams.isEve=1 AND (AgentTeams.isAllocatable=1 OR viewDailyPay.jobID not in (select jobID from jobs where projectID<3))
            GROUP  BY
                      viewDailyPay.jobID`+(isSummary?"":",AllNotes.note")+`
            ORDER BY viewDailyPay.jobID`;
    let absenceQ=`SELECT
      absenceType,
      AgentTeams.isDay,
      AgentTeams.isEve,
      isnull(sum(appliedHours),0) as hoursCount,
      isnull(COUNT(distinct absence.agentID),0) as agentCount
      FROM
      Absence
      LEFT JOIN getBookedHours('` + stdate + `','` + endate + `') Booking ON Booking.agentID=Absence.agentID AND Booking.bookingDate=Absence.absenceDate
	    LEFT JOIN Agents ON Agents.agentID=Absence.agentID
      LEFT JOIN AgentTeams ON agentTeamID=isnull(bookingTeamID,Agents.teamID)
      WHERE absenceDate between '` + stdate + `' and '` + endate + `' AND isnull(bookedHours,0)>0
      GROUP BY absenceType, AgentTeams.isEve, AgentTeams.isDay`
    let qcQ=`
    select count(qualityControlID) as qcCount,type,isnull(isDay,0) as isDay,isnull(isEve,0) as isEve
    from QualityControl
    left join agents on agents.agentID=QualityControl.agentID
    left join agentTeams on agentTeams.agentTeamID=agents.teamID
    where dateMonitored between '` + stdate + `' and '` + endate + `'
    group by type,isnull(isDay,0),isnull(isEve,0)`
    let coachQ=`
    select count(c.coachingID) as coachCount,case when coachingtype='QC' then 'QC '+q.type else coachingtype end coachingtype,isnull(isDay,0) as isDay,isnull(isEve,0) as isEve,managerID
    from CoachingNew c
    left join QualityControl q on q.coachingID=c.coachingID
    left join agentTeams on agentTeams.managerID=c.staffID
    where coachingDate between '` + stdate + `' and '` + endate + `'
    group by case when coachingtype='QC' then 'QC '+q.type else coachingtype end,isnull(isDay,0),isnull(isEve,0),managerID`
    db.query(dailyQueryDay, (err, resultDD) => {
      if (err) {
        logger.info("failed to select dailys on view reports page ");
          console.log(err)
        //res.redirect("/home");
        console.log(err,dailyQueryDay)
      }
      db.query(dailyQueryEve, (err, resultDE) => {
        if (err) {
          logger.info("failed to select dailys on view reports page ");
            console.log(err)
          //res.redirect("/home");
          console.log(err,dailyQueryEve)
        }
        db.query(bookingQuery, (err, resultB) => {
          if (err) {
            logger.info("failed to select bookings on view reports page " );
              console.log(err)
            //res.redirect("/home");
          }
          db.query(projectQuery, (err, resultP) => {
            if (err) {
              logger.info("failed to select projects on view reports page " );
                console.log(err)
              //res.redirect("/home");
            }
            db.query(dPQuery, (err, resultDP) => {
              if (err) {
                logger.info("failed to select DP team on view reports page " );
                  console.log(err)
                //res.redirect("/home");
              }
              db.query(tLQuery, (err, resultTL) => {
                if (err) {
                  logger.info("failed to select TL team on view reports page " );
                    console.log(err)
                  //res.redirect("/home");
                }
                db.query(cMQuery, (err, resultCM) => {
                  if (err) {
                    logger.info("failed to select CM team on view reports page " );
                      console.log(err)
                    //res.redirect("/home");
                  }
                  db.query(jobQuery, (err, resultJ) => {
                    if (err) {
                      logger.info("failed to select jobs on view reports page" );
                        console.log(err)
                      //res.redirect("/home");
                    }
                    db.query(absenceQ, (err, absenceR) => {
                      if (err) {
                        logger.info("failed to select absences on view reports page " );
                        console.log(err)
                        //res.redirect("/home");
                      }
                      db.query(qcQ, (err, qcR) => {
                        if (err) {
                          console.log(err)
                          //res.redirect("/home");
                        }
                        db.query(coachQ, (err, coachR) => {
                          if (err) {
                            console.log(err)
                            //res.redirect("/home");
                          }
                          res.render('daily-update.ejs',{
                            title:'View daily reports',
                            message:'Report sent'
                            ,projects: resultP.recordset
                            ,ProductionManagers: resultDP.recordset
                            ,TeamLeaders: resultTL.recordset
                            ,ClientManagers: resultCM.recordset
                            ,jobs: resultJ.recordset
                            ,bookings: resultB.recordset
                            ,dailysDay: resultDD.recordset
                            ,dailysEve: resultDE.recordset
                            ,absences: absenceR.recordset
                            ,date: dateIf(date,"-","r")
                            ,coachings: coachR.recordset
                            ,qcs: qcR.recordset
                          });
                        })
                      })
                    })
                  });
                });
              });
            });
          });
        });
      });
    });
  },
  getDialReport: (req, res) => {
    req.params.date=req.params.date==0?moment().format("YYYY-MM-DD"):req.params.date
    let intQuery = `
    SELECT p.agentID,agentName,ringCentralID,Sum(Ints) Ints,Sum(Hours) Hours,Sum(Pay) Pay,SUM(sales) Sales,extensionName,max(talkMins) talktime,max(dialCount) dials
    FROM   ViewAgentShifts p
    LEFT JOIN Dials d ON d.agentID=p.agentID AND d.dialDate = p.inputDate
    LEFT join Jobs j on j.jobID=p.jobID
    LEFT join Agents a on a.agentID=p.agentID
    WHERE  p.Hours > 0 AND isnull(excludeFromDials,0)=0 AND p.agentID > 1 AND p.inputDate = '`+req.params.date+`'
    GROUP  BY agentName, p.agentID, extensionName,ringCentralID
    ORDER BY Hours DESC`;
    let jobQuery=`
    SELECT agentID, STUFF(
    						(SELECT DISTINCT ',' + jobName
    						FROM (
								SELECT DailyInput.agentID, DailyInput.jobID, ViewJobFullName.jobName
								FROM DailyInput, ViewJobFullName,jobs
								WHERE DailyInput.inputDate='`+req.params.date+`' AND DailyInput.jobID=ViewJobFullName.jobID and DailyInput.jobID=Jobs.jobID and isnull(excludeFromDials,0)=0
							) as tab
    						WHERE  tab.agentID = a.agentID
    						FOR XML PATH (''))
              , 1, 1, '')  AS jobs
    FROM (SELECT DailyInput.agentID FROM DailyInput,Jobs WHERE DailyInput.jobID=Jobs.jobID and isnull(excludeFromDials,0)=0 and DailyInput.inputDate='`+req.params.date+`') AS a
    GROUP BY agentID`
    let dialQuery = "SELECT * FROM Dials WHERE dialDate='"+req.params.date+"'";
    db.query(intQuery, (err, intResult) =>{
    if (err) {
      console.log(err)
    }
      else {
        db.query(dialQuery, (err, dialResult) =>{
        if (err) {
          console.log(err)
        }
          else {
            db.query(jobQuery, (err, jobR) =>{
            if (err) {
              console.log(err)
            }
              else {
                rcPlatform.get('/restapi/v1.0/account/~/extension/',{type:'User',perPage:500}).then(function(resp){
                  resp.json().then(function(rcAgents){
                    res.render('dial-report.ejs',{
                      title:'View dial report',
                      date:req.params.date,
                      interviewers: intResult.recordset,
                      dials: dialResult.recordset,
                      jobs: jobR.recordset,
                      extListR:rcAgents.records,
                      message:''
                    })
                  })
                })
              }
            })
          }
        });
      }
    });
  },
  getDialHourlyReport: (req, res) => {
    let intQuery = `SELECT DailyInput.agentID,
                     Agents.agentName,
                     tn.teamName,
                     Agents.ringCentralID
              FROM   DailyInput left join (select distinct agentID,teamName from booking left join agentTeams on agentTeams.agentTeamID=booking.bookingTeamID where bookingDate='`+req.params.date+`') tn on tn.agentID=DailyInput.agentID,
                     Agents
              WHERE  DailyInput.inputHours > 0
                     AND DailyInput.agentID > 1
                     AND Agents.agentID = DailyInput.agentID
                     AND Agents.agentLeft is NULL
                    AND DailyInput.inputDate = '`+req.params.date+`'
             GROUP BY DailyInput.agentID,
             Agents.ringCentralID,
                              Agents.agentName,
                              tn.teamName`;
    let dialQuery = "SELECT * FROM DialsHourly WHERE dialDate='"+req.params.date+"'";
    db.query(intQuery, (err, intResult) =>{
      if (err) {
        console.log(err)
      }else {
        db.query(dialQuery, (err, dialResult) =>{
          if (err) {
            console.log(err)
          }else {
            rcPlatform.get('/restapi/v1.0/account/~/extension/',{type:'User',perPage:500}).then(function(resp){
              resp.json().then(function(rcAgents){
                res.render('dial-report-hourly.ejs',{
                  title:'Hourly dial report',
                  date:req.params.date,
                  interviewers: intResult.recordset,
                  dials: dialResult.recordset,
                  extListR:rcAgents.records,
                  message:''
                })
              })
            })
          }
        });
      }
    });
  },
  dialsUpload: (req, res) => {
    if (req.files.dialUpload.mimetype!="application/vnd.ms-excel") {
      console.log("filetype error")
      res.status(500).send({error: 'Must be a CSV file'});
    }else {
      req.files.dialUpload.mv(__dirname+'/dialReport.csv')
      const csvFilePath=__dirname+'/dialReport.csv'
      const csv=require('csvtojson')
      csv()
      .fromFile(csvFilePath)
      .then((results)=>{
        if (results[0]==undefined || results[0]['Extension (Name)']==undefined || results[0]['Duration']==undefined) {
          res.status(500).send({error: 'CSV file not properly formatted - ensure you have selected the correct file.'});
        }else {
          res.send(results.map(el=>{
            el['phoneSystem']="Avaya"
            return el
          }))
        }
      });
    }
  },
  dialsUploadNew: (req, res) => {
    if (req.files.dialUpload.mimetype!="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
      console.log("filetype error")
      res.status(500).send({error: 'Must be an Excel file'});
    }else {
      req.files.dialUpload.mv(publicPath+'/uploads/dialReport.xlsx').then(function(e){
        const csvFilePath=publicPath+'/uploads/dialReport.xlsx'
        const excelToJson=require('xlsx-to-json-lc')
        excelToJson({
          input: csvFilePath,
          output: publicPath+"/uploads/output.json",
          sheet: 'Users'
        },function(err,results){
          if (err) {
            console.log(err)
          }else {
            if (results[0]==undefined || results[0]['Name']==undefined || results[0]['Total Calls']==undefined) {
              res.status(500).send({error: 'CSV file not properly formatted - ensure you have selected the correct file.'});
            }else {
              res.send(results.map(el=>{
                let obj={}
                obj['Out Calls']=el['Total Calls']
                obj['Duration']=el['Total Handle Time']
                obj['Extension (Name)']=el['Ext.']+" ("+el['Name']+")"
                obj['phoneSystem']="Ring Central"
                return obj
              }))
            }
          }
        })
      })
    }
  },
  dialsToSQL: (req,res) => {
    let agentID = ""
    let dialQuery=""
    let removeQuery = "DELETE FROM Dials WHERE dialDate='"+req.params.date+"'"
    db.query(removeQuery, (err, remResult) =>{
      if (err) {
        console.log("recordCheck - "+err)
      }else {
        JSON.parse(req.body.SQLinput).forEach((result, i) => {
          if (result['Extension (Name)'] != "Total(s)") {
            let getAgentId = "select top 1 agentID ID from Agents where ringCentralID=@extName"+i
            db.input("extName"+i,result['Extension (Name)'])
            db.query(getAgentId, (err, agentIdResp) =>{
              if (err) {
              }else {
                if (agentIdResp.recordset.length == 0 || agentIdResp.recordset[0].ID==null) {
                  if (result.agentID) {
                    agentID=result.agentID
                  }else {
                    agentID=""
                  }
                }else {
                  agentID=agentIdResp.recordset[0].ID
                }
                if (Number(result['Out Calls'])>0 || minsFromTime(result['Duration'])>0) {
                  dialQuery="INSERT INTO Dials (extensionName, dialDate, dialCount, talkMins, agentID, phoneSystem) VALUES (@extName"+i+", '"+req.params.date+"', '"+result['Out Calls']+"', '"+minsFromTime(result['Duration'])+"', '"+agentID+"', '"+result['phoneSystem']+"')"
                  db.input("extName"+i,result['Extension (Name)'])
                  db.query(dialQuery, (err, dialResult) =>{
                    if (err) {
                      console.log("dialResult - "+err)
                    }
                  })
                }
              }
            })
          }
        })
      }
    })
    function loadPage(){
      res.redirect('/dial-report/'+req.params.date)
    }
    setTimeout(loadPage, 2000);
  },
  dialsHourlyToSQL: (req,res) => {
    let agentID = ""
    let dialQuery=""
    let removeQuery = "DELETE FROM DialsHourly WHERE dialDate='"+req.params.date+"' and dialHour='"+req.params.hour+"'"
    db.query(removeQuery, (err, remResult) =>{
      if (err) {
        console.log("recordCheck - "+err)
      }else {
        JSON.parse(req.body["SQLinput"+req.params.hour]).forEach((result, i) => {
          if (result['Extension (Name)'] != "Total(s)") {
            let getAgentId = "select top 1 agentID ID from Agents where ringCentralID=@extName"+i
            db.input("extName"+i,result['Extension (Name)'])
            db.query(getAgentId, (err, agentIdResp) =>{
              if (err) {
              }else {
                if (agentIdResp.recordset.length == 0 || agentIdResp.recordset[0].ID==null) {
                  if (result.agentID) {
                    agentID=result.agentID
                  }else {
                    agentID=""
                  }
                }else {
                  agentID=agentIdResp.recordset[0].ID
                }
                dialQuery="INSERT INTO DialsHourly (extensionName, dialDate, dialHour, dialCount, talkMins, agentID, phoneSystem) VALUES (@extName"+i+", '"+req.params.date+"', '"+req.params.hour+"', '"+result['Out Calls']+"', '"+minsFromTime(result['Duration'])+"', '"+agentID+"', '"+result['phoneSystem']+"')"
                db.input("extName"+i,result['Extension (Name)'])
                db.query(dialQuery, (err, dialResult) =>{
                  if (err) {
                    console.log("dialResult - "+err)
                  }
                })
              }
            })
          }
        })
      }
    })
    function loadPage(){
      res.redirect('/hourly-dial-report/'+req.params.date)
    }
    setTimeout(loadPage, 2000);
  },
  dialIDupdate: (req, res) => {
    console.log(req.body)
    let data=req.body
    let checkforDupes = "SELECT * FROM Dials WHERE agentID='"+data[0].agentID+"' AND extensionName<>@extName AND phoneSystem='"+data[0].phoneSystem+"'"
    db.input("extName",data[0].extension)
    db.query(checkforDupes, (err, dupeResp) =>{
      if (err) {
        console.log(err)
      }
      if (dupeResp.recordset.length>0) {
        if (data[0].overide==0) {
          res.status(500).send({error: 'Agent has already been matched to extension '+dupeResp.recordset[0].extensionName+'. Are you sure you want to reset it?'});
        }else {
          let resetAgentId = "UPDATE Dials SET agentID = '0' WHERE extensionName=@extName AND phoneSystem='"+data[0].phoneSystem+"'; UPDATE DialsHourly SET agentID = '0' WHERE extensionName=@extName AND phoneSystem='"+data[0].phoneSystem+"'"
          db.input("extName",dupeResp.recordset[0].extensionName)
          db.query(resetAgentId, (err, resetAgentIdResp) =>{
            let setAgentId = "UPDATE Dials SET agentID = '"+data[0].agentID+"' WHERE extensionName=@extName AND phoneSystem='"+data[0].phoneSystem+"'; UPDATE DialsHourly SET agentID = '"+data[0].agentID+"' WHERE extensionName=@extName AND phoneSystem='"+data[0].phoneSystem+"'"
            db.input("extName",data[0].extension)
            db.query(setAgentId, (err, agentIdResp) =>{
              if (err) {
                console.log("getAgentId - "+err)
              }
              else {
                res.send("Success");
              }
            })
          });
        }
      }else {
        let setAgentId = "UPDATE Dials SET agentID = '"+data[0].agentID+"' WHERE extensionName=@extName AND phoneSystem='"+data[0].phoneSystem+"'; UPDATE DialsHourly SET agentID = '"+data[0].agentID+"' WHERE extensionName=@extName AND phoneSystem='"+data[0].phoneSystem+"'"
        console.log(setAgentId)
        db.input("extName",data[0].extension)
        db.query(setAgentId, (err, agentIdResp) =>{
          if (err) {
            console.log("getAgentId - "+err)
          }else {
            console.log(agentIdResp)
            res.send("Success");
          }
        })
      }
    })
  },
  salesSpend: (req, res) => {
    req.params.stdate=req.params.stdate==0?currPayPeriodSt:req.params.stdate
    req.params.endate=req.params.endate==0?currPayPeriodEn:req.params.endate
    let shift=req.params.shift
    let days=req.params.days
    let team=req.params.team
    let st=req.params.stdate
    let en=req.params.endate
    let excHourly=req.params.excHourly
    let excBMG=req.params.excBMG
    let filters=""
    if (excBMG==1) {
      filters=filters+" AND isnull(projectID,0)<>5667"
    }
    if (excHourly==1) {
      filters=filters+" AND (isnull(isJobHourly,0)=0 OR isnull(isJobRigour,0)=0)"
    }
    if (excHourly==-1) {
      filters=filters+" AND (isnull(isJobHourly,0)=1 AND isnull(isJobRigour,0)=1)"
    }
    if (shift=="d") {
      filters=filters+" AND isDay=1 "
    }
    if (shift=="e") {
      filters=filters+" AND isEve=1 "
    }
    if (team!=0) {
      filters=filters+" AND finalTeamID in ("+team+")"
    }
    if (days=="wd") {
      filters=filters+" AND DATENAME(dw, inputDate) NOT IN ('Saturday', 'Sunday')"
    }
    if (days=="we") {
      filters=filters+" AND DATENAME(dw, inputDate) IN ('Saturday', 'Sunday')"
    }
    let statsQuery=`
    IF OBJECT_ID('tempdb..##ccreport`+req.user.user+`') IS NOT NULL DROP TABLE ##ccreport`+req.user.user+`
    SELECT isnull(isnull(ViewDailyPay.inputDate,a2.agentLeft),a2.agentJoined) as inputDate, isnull(ViewDailyPay.agentID,a2.agentID) as agentID, isnull(Agents.agentName,a2.agentName) as agentName,Jobs.projectID, ViewDailyPay.jobID, CASE WHEN isJobHourly=1 THEN ViewDailyPay.Hours ELSE ViewDailyPay.Ints END as Ints,CPInew CPI, fullJobName, ViewDailyPay.Pay, case when isShift=1 then cast(ViewDailyPay.Hours as decimal(18,2)) end as Hours, a2.agentLeft, a2.agentJoined, bookingTeamID,Agents.teamID, callQC, introQC, QCscore, coachCount, isJobHourly, isnull(Booking.bookingTeamID,Agents.teamID) as finalTeamID, isnull(AgentTeams.isDay,0) as isDay, isnull(AgentTeams.isEve,0) as isEve, AgentTeams.isAllocatable, AgentTeams.teamName, case when clientID=130 then 1 else 0 end as isJobRigour,dials.dials, case when isShift=0 then viewDailyPay.Hours end as hoursLost,ISNULL(lateMins,0) lateMinsLost,case when d.inputDate<'2021-11-01' then null else liveSales end fixedSales,case when d.inputDate<'2021-11-01' then null else ViewDailyPay.Pay end fixedPay into ##ccreport`+req.user.user+` FROM
    Agents
    FULL OUTER JOIN (
  		SELECT agentID,jobID,inputDate,Hours,Ints,Pay,1 as isShift FROM ViewDailyPay WHERE inputDate BETWEEN @stdate AND @endate
  		union
  		select b.agentID,null,b.bookingDate,isnull(sum(bookedHours),0) as hoursLost,null,null,0 as isShift from getBookedHours(@stdate,@endate) b left join Absence a on a.agentID=b.agentID and a.absenceDate=b.bookingDate where absenceType<>'Cancelled by manager' and absenceType is not null and isnull(bookedHours,0)>0 AND bookingDate BETWEEN @stdate AND @endate group by b.agentID,b.bookingDate
  	) ViewDailyPay ON Agents.agentID=ViewDailyPay.agentID
    LEFT join (select agentID,inputDate,sum(lateMins) lateMins from Lateness group by agentID,inputDate) lates on lates.agentID=ViewDailyPay.agentID and lates.inputDate=ViewDailyPay.inputDate
    FULL OUTER JOIN Jobs on Jobs.jobID=ViewDailyPay.jobID
    LEFT join DailyInput d on ViewDailyPay.agentID=d.agentID and ViewDailyPay.inputDate=d.inputDate and ViewDailyPay.jobID=d.jobID
  	left join Projects p on p.projectID=Jobs.projectID
  	left join Quotes q on q.quoteID=p.quoteID
    FULL OUTER JOIN ViewJobsStats ON ViewJobsStats.jobID=ViewDailyPay.jobID
    FULL OUTER JOIN (SELECT * FROM Agents WHERE agentJoined BETWEEN @stdate AND @endate OR agentLeft BETWEEN @stdate AND @endate) a2 ON a2.agentID=ViewDailyPay.agentID AND (a2.agentJoined=ViewDailyPay.inputDate OR a2.agentLeft=ViewDailyPay.inputDate)
    LEFT JOIN (select distinct agentID,startTime,endTime,bookingDate,bookingTeamID from Booking) Booking ON Booking.agentID=isnull(ViewDailyPay.agentID,a2.agentID) AND Booking.bookingDate=isnull(isnull(ViewDailyPay.inputDate,a2.agentLeft),a2.agentJoined)
    left join AgentTeams on AgentTeams.agentTeamID=isnull(Booking.bookingTeamID,Agents.teamID)
    LEFT JOIN (SELECT count(agentID) as callQC, avg(cast(score as decimal(10,2))) as QCscore, interviewDate, agentID, jobID FROM ViewQCscores WHERE type='Call' and isFinished=1 GROUP BY interviewDate, agentID, jobID) qc ON qc.jobID=ViewDailyPay.jobID AND qc.agentID=isnull(ViewDailyPay.agentID,a2.agentID) AND qc.interviewDate=isnull(isnull(ViewDailyPay.inputDate,a2.agentLeft),a2.agentJoined)
    LEFT JOIN (SELECT count(agentID) as introQC, interviewDate, agentID, jobID FROM ViewQCscores WHERE type='Intro' and isFinished=1 GROUP BY interviewDate, agentID, jobID) introqc ON introqc.jobID=ViewDailyPay.jobID AND introqc.agentID=isnull(ViewDailyPay.agentID,a2.agentID) AND introqc.interviewDate=isnull(isnull(ViewDailyPay.inputDate,a2.agentLeft),a2.agentJoined)
    LEFT JOIN (SELECT count(coachingID) as coachCount, coachingDate, agentID, jobID FROM CoachingNew GROUP BY coachingDate, agentID, jobID) coach ON coach.jobID=ViewDailyPay.jobID AND coach.agentID=isnull(ViewDailyPay.agentID,a2.agentID) AND coach.coachingDate=isnull(isnull(ViewDailyPay.inputDate,a2.agentLeft),a2.agentJoined)
    left join (select d.agentID,dialDate,sum(cast(dialCount+talkMins as decimal(10,2)))/nullif(sum(hrs),0) as dials from Dials d left join (select agentID,inputDate,sum(inputHours) as hrs from DailyInput where jobID>8 group by agentID,inputDate) i on i.agentID=d.agentID and i.inputDate=d.dialDate group by d.agentID,d.dialDate) dials on dials.agentID=isnull(ViewDailyPay.agentID,a2.agentID) AND dials.dialDate=isnull(isnull(ViewDailyPay.inputDate,a2.agentLeft),a2.agentJoined)

    select * into ##ccreportFiltered from ##ccreport`+req.user.user+` WHERE inputDate BETWEEN @stdate AND @endate  `+filters+`

    SELECT sum(Ints) as Ints, sum(Sales) as Sales, sum(Pay) as Wages, sum(Hours) as Hours, sum(Pay)/nullif(sum(Sales),0) as cont, sum(fixedPay)/sum(nullif(fixedSales,0)) as fixedCont, avg(QCscore) as QCscore, sum(callQC) as MonitorCountCall, sum(introQC) as MonitorCountIntro, sum(JoinedCount) as JoinedCount, sum(LeftCount) as LeftCount, sum(coachCount) as coachCount,
    (SELECT COUNT(DISTINCT agentID) FROM ##ccreportFiltered where pay>0) as AgentCount, (SELECT COUNT(DISTINCT jobID) FROM ##ccreportFiltered) as JobsCount,sum(payNH)/nullif(sum(salesNH),0) as contNH,avg(dials) as dials,sum(hoursLost) as hoursLost,sum(lateMinsLost) as lateMinsLost,sum(fixedSales) fixedSales,sum(fixedPay) fixedPay
    FROM (
    SELECT inputDate, sum(Ints) as Ints, sum(CPI*Ints) as Sales, sum(Hours) as Hours, cast(avg(QCscore) as decimal(10,2)) as QCscore, sum(callQC) as callQC, sum(introQC) as introQC, sum(coachCount) as coachCount, sum(Pay) as Pay, count(distinct CASE WHEN agentJoined=inputDate THEN agentID ELSE NULL END) as JoinedCount, count(distinct CASE WHEN agentLeft=inputDate THEN agentID ELSE NULL END) as LeftCount, sum(case when isJobRigour=1 then null else CPI*Ints end) as salesNH, sum(case when isJobRigour=1 then null else Pay end) as payNH,cast(avg(dials) as decimal(10,2)) as dials,sum(hoursLost) as hoursLost,sum(lateMinsLost) as lateMinsLost,sum(fixedSales) fixedSales,sum(fixedPay) fixedPay
    FROM
    ##ccreportFiltered
    GROUP BY inputDate
    ) inputs`
    let chartQ=`
    SELECT inputDate as sortDate, CASE WHEN DATEDIFF(day,@stdate,@endate)>90 THEN FORMAT(inputDate,'MMM-yy') ELSE FORMAT(inputDate,'dd-MMM-yy') END as dateTxt, FORMAT(inputDate,'d MMM') as showDate, QCscore as 'Avg QC Score', agentCount as Agents, jobCount as Jobs, Ints as Interviews, Sales, Pay, cont as Contribution, callQC as 'Full QC Monitorings', introQC as 'Intro QC Checks', JoinedCount as 'Agents Joined', LeftCount as 'Agents Left', coachCount as 'Coaching Sessions' FROM (
      SELECT max(inputDate) as inputDate, COUNT(DISTINCT agentID) as agentCount, COUNT(DISTINCT jobID) as jobCount, sum(Ints) as Ints, sum(CPI*Ints) as Sales, cast(avg(QCscore) as decimal(10,2)) as QCscore, sum(callQC) as callQC, sum(introQC) as introQC, sum(coachCount) as coachCount, sum(Pay) as Pay, sum(Pay)/nullif(sum(CPI*CASE WHEN isJobHourly=1 THEN [Hours] ELSE Ints END),0) as cont, count(distinct CASE WHEN agentJoined=inputDate THEN agentID ELSE NULL END) as JoinedCount, count(distinct CASE WHEN agentLeft=inputDate THEN agentID ELSE NULL END) as LeftCount,sum(hoursLost) as hoursLost,sum(lateMinsLost) as lateMinsLost,sum(fixedSales) fixedSales,sum(fixedPay) fixedPay FROM
      ##ccreportFiltered
      GROUP BY CASE WHEN DATEDIFF(day,@stdate,@endate)>90 THEN DATEPART(month,inputDate) ELSE DATEPART(day,inputDate) END
    ) inputs
    ORDER BY sortDate ASC;
    drop table ##ccreportFiltered`
    let teamQ = `SELECT AgentTeams.teamName, AgentTeams.agentTeamID
    FROM AgentTeams
    WHERE AgentTeams.agentTeamID>1`
    let missingQ=`
    select agentName,teamName,inputDate,inputHours from DailyInput d
    left join Booking b on b.agentID=d.agentID and b.bookingDate=d.inputDate
    left join Agents a on a.agentID=d.agentID
    left join AgentTeams t on t.agentTeamID=a.teamID
    where b.bookingID is null and inputDate between @stdate and @endate
    order by teamName,inputDate`
    let thisDb=db
    thisDb.multiple=true
    thisDb.input('stdate',new Date(st))
    thisDb.input('endate',new Date(en))
       thisDb.batch(statsQuery+chartQ+missingQ, (err, statsResp) =>{
         if (err) {
           console.log("get stats for cc report - "+err)
           res.send(err,statsQuery+chartQ+missingQ)
           thisDb.query("drop table ##ccreport"+req.user.user)
         }
         else {
           thisDb.batch(teamQ, (err, teamR) =>{
             if (err) {
               console.log("get teams - "+err)
             }
             else {
               console.log(statsResp.recordsets[0])
               res.render('sales-spend.ejs',{
                 title:'Call centre report',
                 stdate:req.params.stdate,
                 endate:req.params.endate,
                 stats: statsResp.recordsets[0],
                 statsChart: statsResp.recordsets[1],
                 missing: statsResp.recordsets[2],
                 sessShift: shift,
                 sessTeam: team,
                 sessDays: days,
                 excHourly:excHourly,
                 teams: teamR.recordset,
                 excBMG:excBMG,
                 message:''
               })
             }
           })
         }
       })
  },
  clientSatReport: (req, res) => {
    let staffQ=`select * from Staff where staffJobTitleID in (5,6) and staffLeft is null`
    let clientQ=`select * from clients`
    db.query(staffQ, (err, staffR) =>{
      if (err) {
        console.log(err)
      }else {
        db.query(clientQ, (err, clientR) =>{
          if (err) {
            console.log(err)
          }else {
            res.render("client-sat-report2.ejs",{
              title:'Client satisfaction report',
              staff:staffR.recordset,
              clients:clientR.recordset
            })
          }
        })
      }
    })
  },
  getCallCentreReports: (req,res) => {
    let st=req.body[0].stdate
    let en=req.body[0].endate
    let splt=req.body[0].splt
    let query=""
    let fieldQ=""
    let idQ=""
    let shift=req.body[0].shift
    let days=req.body[0].days
    let team=req.body[0].team
    let excHourly=req.body[0].excHourly
    let excBMG=req.body[0].excBMG
    let filters=""
    let qcFilt=""
    let joinedFilt=""
    let leftFilt=""
    let coachFilt=""
    let qcField=""
    let joinedField=""
    let leftField=""
    let coachField=""
    if (splt=="jobName") {
      fieldQ=`fullJobName+case when isJobHourly=1 then ' <i class="far fa-clock"></i>' else '' end`
      idQ="jobID"
    }else if (splt=="agentName") {
      fieldQ="agentName"
      idQ="agentID"
    }else if (splt=="teamName") {
      fieldQ="teamName"
      idQ="finalTeamID"
    }else if (splt=="isDay") {
      fieldQ="case when isDay=1 then 'Day' else 'Eve' end"
      idQ="isDay"
    }
    if (excHourly==1) {
      filters=filters+" AND (isnull(isJobHourly,0)=0 OR isnull(isJobHourly,0)=0)"
    }
    if (excHourly==-1) {
      filters=filters+" AND (isnull(isJobHourly,0)=1 AND isnull(isJobRigour,0)=1)"
    }
    if (excBMG==1) {
      filters=filters+" AND (isnull(projectID,0)<>5667)"
    }
    if (shift=="d") {
      filters=filters+" AND isDay=1 "
    }
    if (shift=="e") {
      filters=filters+" AND isEve=1 "
    }
    if (team!=0) {
      filters=filters+" AND finalTeamID in ("+team+") "
    }
    if (days=="wd") {
      filters=filters+" AND DATENAME(dw, inputDate) NOT IN ('Saturday', 'Sunday')"
    }
    if (days=="we") {
      filters=filters+" AND DATENAME(dw, inputDate) IN ('Saturday', 'Sunday')"
    }
    query=`
    select * into ##ccreportFiltered from ##ccreport`+req.user.user+` WHERE inputDate BETWEEN @stdate AND @endate  `+filters+`
    SELECT max(inputDate) as inputDate, inputDateTxt, rowTxt, rowID, sum(Ints) as Ints, sum(Hours) as Hours, sum(Sales) as Sales, sum(Pay) as Wages, sum(fixedPay)/nullif(sum(fixedSales),0) as fixedCont, sum(Pay)/nullif(sum(Sales),0) as cont, avg(QCscore) as QCscore, sum(callQC) as MonitorCountCall, sum(introQC) as MonitorCountIntro, sum(JoinedCount) as JoinedCount, sum(LeftCount) as LeftCount, sum(coachCount) as coachCount,
    sum(AgentCount) as AgentCount, sum(jobCount) as JobCount, sum(payNH)/nullif(sum(salesNH),0) as contNH,avg(dials) as dials,sum(hoursLost) as hoursLost,sum(lateMinsLost) as lateMinsLost,sum(fixedSales) fixedSales,sum(fixedPay) fixedPay
    FROM (
    SELECT `+fieldQ+` as rowTxt, `+idQ+` as rowID, max(inputDate) as inputDate, CASE WHEN DATEDIFF(day,@stdate,@endate)>90 THEN FORMAT(max(inputDate),'MMM-yy') ELSE FORMAT(max(inputDate),'dd-MMM-yy') END as inputDateTxt, sum(Ints) as Ints, sum(Hours) as Hours, sum(CPI*Ints) as Sales, cast(avg(QCscore) as decimal(10,2)) as QCscore, sum(callQC) as callQC, sum(introQC) as introQC, sum(coachCount) as coachCount, sum(Pay) as Pay, count(distinct CASE WHEN agentJoined=inputDate THEN agentID ELSE NULL END) as JoinedCount, COUNT(DISTINCT agentID) as AgentCount, COUNT(DISTINCT jobID) as jobCount, count(distinct CASE WHEN agentLeft=inputDate THEN agentID ELSE NULL END) as LeftCount, sum(case when isJobRigour=1 then null else CPI*Ints end) as salesNH, sum(case when isJobRigour=1 then null else Pay end) as payNH,cast(avg(dials) as decimal(10,2)) as dials,sum(hoursLost) as hoursLost,sum(lateMinsLost) as lateMinsLost,sum(fixedSales) fixedSales,sum(fixedPay) fixedPay FROM
    ##ccreportFiltered
		GROUP BY CASE WHEN DATEDIFF(day,@stdate,@endate)>90 THEN FORMAT(inputDate,'MMM-yy') ELSE FORMAT(inputDate,'dd-MMM-yy') END, `+fieldQ+`, `+idQ+`
    ) inputs
    GROUP BY inputDateTxt, rowTxt, rowID
    ORDER BY inputDate, rowID
    `
    let colTotalQ=`
    SELECT max(inputDate) as inputDate, inputDateTxt, sum(Ints) as Ints, sum(Hours) as Hours, sum(Sales) as Sales, sum(Pay) as Wages, sum(fixedPay)/nullif(sum(fixedSales),0) as fixedCont, sum(Pay)/nullif(sum(Sales),0) as cont, avg(QCscore) as QCscore, sum(callQC) as MonitorCountCall, sum(introQC) as MonitorCountIntro, sum(JoinedCount) as JoinedCount, sum(LeftCount) as LeftCount, sum(coachCount) as coachCount,
    sum(AgentCount) as AgentCount, sum(jobCount) as JobCount, sum(payNH)/nullif(sum(salesNH),0) as contNH,avg(dials) as dials,sum(hoursLost) as hoursLost,sum(lateMinsLost) as lateMinsLost,sum(fixedSales) fixedSales,sum(fixedPay) fixedPay
    FROM (
    SELECT max(inputDate) as inputDate, CASE WHEN DATEDIFF(day,@stdate,@endate)>90 THEN FORMAT(max(inputDate),'MMM-yy') ELSE FORMAT(max(inputDate),'dd-MMM-yy') END as inputDateTxt, sum(Ints) as Ints, sum(Hours) as Hours, sum(CPI*Ints) as Sales, cast(avg(QCscore) as decimal(10,2)) as QCscore, sum(callQC) as callQC, sum(introQC) as introQC, sum(coachCount) as coachCount, sum(Pay) as Pay, count(distinct CASE WHEN agentJoined=inputDate THEN agentID ELSE NULL END) as JoinedCount, COUNT(DISTINCT agentID) as AgentCount, COUNT(DISTINCT jobID) as jobCount, count(distinct CASE WHEN agentLeft=inputDate THEN agentID ELSE NULL END) as LeftCount, sum(case when isJobRigour=1 then null else CPI*Ints end) as salesNH, sum(case when isJobRigour=1 then null else Pay end) as payNH,cast(avg(dials) as decimal(10,2)) as dials,sum(hoursLost) as hoursLost,sum(lateMinsLost) as lateMinsLost,sum(fixedSales) fixedSales,sum(fixedPay) fixedPay FROM
    ##ccreportFiltered
		GROUP BY CASE WHEN DATEDIFF(day,@stdate,@endate)>90 THEN FORMAT(inputDate,'MMM-yy') ELSE FORMAT(inputDate,'dd-MMM-yy') END
    ) inputs
    GROUP BY inputDateTxt
    ORDER BY inputDate
    `
    let rowTotalQ=`
    SELECT rowTxt, rowID, sum(Ints) as Ints, sum(Hours) as Hours, sum(Sales) as Sales, sum(Pay) as Wages, sum(fixedPay)/nullif(sum(fixedSales),0) as fixedCont, sum(Pay)/nullif(sum(Sales),0) as cont, avg(QCscore) as QCscore, sum(callQC) as MonitorCountCall, sum(introQC) as MonitorCountIntro, sum(JoinedCount) as JoinedCount, sum(LeftCount) as LeftCount, sum(coachCount) as coachCount,
        sum(AgentCount) as AgentCount, sum(jobCount) as JobCount, sum(payNH)/nullif(sum(salesNH),0) as contNH,avg(dials) as dials,sum(hoursLost) as hoursLost,sum(lateMinsLost) as lateMinsLost,sum(fixedSales) fixedSales,sum(fixedPay) fixedPay
        FROM (
        SELECT `+fieldQ+` as rowTxt, `+idQ+` as rowID, sum(Ints) as Ints, sum(Hours) as Hours, sum(CPI*Ints) as Sales, cast(avg(QCscore) as decimal(10,2)) as QCscore, sum(callQC) as callQC, sum(introQC) as introQC, sum(coachCount) as coachCount, sum(Pay) as Pay, count(distinct CASE WHEN agentJoined=inputDate THEN agentID ELSE NULL END) as JoinedCount, COUNT(DISTINCT agentID) as AgentCount, COUNT(DISTINCT jobID) as jobCount, count(distinct CASE WHEN agentLeft=inputDate THEN agentID ELSE NULL END) as LeftCount, sum(case when isJobRigour=1 then null else CPI*Ints end) as salesNH, sum(case when isJobRigour=1 then null else Pay end) as payNH,cast(avg(dials) as decimal(10,2)) as dials,sum(hoursLost) as hoursLost,sum(lateMinsLost) as lateMinsLost,sum(fixedSales) fixedSales,sum(fixedPay) fixedPay FROM
    ##ccreportFiltered
		GROUP BY `+fieldQ+`, `+idQ+`
    ) inputs
    GROUP BY rowTxt, rowID
    ORDER BY rowID
    `
    let tTotalQ=`
    SELECT sum(Ints) as Ints, sum(Hours) as Hours, sum(Sales) as Sales, sum(Pay) as Wages, sum(fixedPay)/nullif(sum(fixedSales),0) as fixedCont, sum(Pay)/nullif(sum(Sales),0) as cont, avg(QCscore) as QCscore, sum(callQC) as MonitorCountCall, sum(introQC) as MonitorCountIntro, sum(JoinedCount) as JoinedCount, sum(LeftCount) as LeftCount, sum(coachCount) as coachCount,
    sum(AgentCount) as AgentCount, sum(jobCount) as JobCount, sum(payNH)/nullif(sum(salesNH),0) as contNH,avg(dials) as dials,sum(hoursLost) as hoursLost,sum(lateMinsLost) as lateMinsLost,sum(fixedSales) fixedSales,sum(fixedPay) fixedPay
    FROM (
    SELECT sum(Ints) as Ints, sum(Hours) as Hours, sum(CPI*Ints) as Sales, cast(avg(QCscore) as decimal(10,2)) as QCscore, sum(callQC) as callQC, sum(introQC) as introQC, sum(coachCount) as coachCount, sum(Pay) as Pay, count(distinct CASE WHEN agentJoined=inputDate THEN agentID ELSE NULL END) as JoinedCount, COUNT(DISTINCT agentID) as AgentCount, COUNT(DISTINCT jobID) as jobCount, count(distinct CASE WHEN agentLeft=inputDate THEN agentID ELSE NULL END) as LeftCount, sum(case when isJobRigour=1 then null else CPI*Ints end) as salesNH, sum(case when isJobRigour=1 then null else Pay end) as payNH,cast(avg(dials) as decimal(10,2)) as dials,sum(hoursLost) as hoursLost,sum(lateMinsLost) as lateMinsLost,sum(fixedSales) fixedSales,sum(fixedPay) fixedPay FROM
    ##ccreportFiltered
    ) inputs
    drop table ##ccreportFiltered
    `
    db.input('stdate',new Date(st))
    db.input('endate',new Date(en))
    db.query(query, (err, resp) =>{
     if (err) {
       console.log(query+" - "+err)
       logger.info(req.user.uName + " failed to get drilldown report");
       res.status(500).send({error: 'Could not get drilldown report. Try refreshing the page.'});
     }
     else {
       db.query(colTotalQ, (err, colTotalR) =>{
         if (err) {
           console.log(query+" - "+err)
           res.status(500).send({error: 'Could not get col totals'});
         }
         db.query(rowTotalQ, (err, rowTotalR) =>{
           if (err) {
             console.log(query+" - "+err)
             res.status(500).send({error: 'Could not get row totals'});
           }
           db.query(tTotalQ, (err, tTotalR) =>{
             if (err) {
               console.log(query+" - "+err)
               res.status(500).send({error: 'Could not get grand total'});
             }
             res.send({
               report: resp.recordset,
               rowTotals:rowTotalR.recordset,
               colTotals:colTotalR.recordset,
               tTotal:tTotalR.recordset,
             })
           })
         })
       })
     }
    })
  },
  emailPerf: (req,res) => {
    let shiftQ=""
    let shiftTxt=""
    if (req.body[0].shift=="d") {
      shiftQ="isDay=1"
      shiftTxt="Day"
    }else {
      shiftQ="isEve=1"
      shiftTxt="Eve"
    }
    let statsQ=`
    SELECT
    ISNULL(Ints/NULLIF(hours,0),0) as AHR,
    agentName,
    n.jobName,
    j.jobID,
    isnull(jt.hourlyTarget,j.hourlyTarget) hourlyTarget,
    Hours inputHours,
    Ints inputInterviews,
    staffName TL,
    isnull(Pay/nullif(sales,0),9.999) cont
    FROM
    (select * from ViewAgentShifts where inputDate='`+req.body[0].date+`') s
    left join getBookedHours('`+req.body[0].date+`','`+req.body[0].date+`') b on b.bookingDate=s.inputDate and b.agentID=s.agentID
    left join Agents a on a.agentID=s.agentID
    left join ViewJobFullName n on n.jobID=s.jobID
    left join Jobs j on j.jobID=s.jobID
    outer apply (select top 1 * from PastJobTargets p where p.dateUntil>s.inputDate and p.jobID=s.jobID) jt
    left join AgentTeams t on t.agentTeamID=s.bookingTeamID
    left join Staff tl on tl.staffID=t.managerID
    WHERE
    j.jobID>0 and
    b.`+shiftQ+`
    ORDER BY n.jobName, AHR DESC,agentName
    `
    let emailQ=`
    SELECT staffEmail
    FROM
    AgentTeams
    LEFT JOIN Staff ON Staff.staffID=AgentTeams.managerID
    WHERE
    AgentTeams.`+shiftQ+` and staffLeft is null and staffEmail<>''`
    db.query(statsQ, (err, statsR) =>{
      if (err) {
        console.log(statsQ+" - "+err)
        logger.info(req.user.uName + " failed to get agent performance report for daily update");
        logger.info(statsQ+" - "+err);
        logger.info("--end--");
        res.status(500).send({error: 'Could not send agent performance report'});
      }else {
        let txt=""
        let row=1
        let rspan=0
        let alt=""
        statsR.recordset.forEach((rec, i) => {
          if (i>0) {
            if (rec.jobName!=statsR.recordset[i-1].jobName) {
              txt=txt+"</tbody></table><br><h2>"+rec.jobName+"</h2><table class='perfTable'><thead><th>Agent</th><th>Team leader</th><th>Hours</th><th>Ints</th><th>AHR</th><th>Cont.</th><th>Comments</th></thead><tbody>"
            }
          }else {
            txt=txt+"<h2>"+rec.jobName+"</h2><table class='perfTable'><thead><th>Agent</th><th>Team leader</th><th>Hours</th><th>Ints</th><th>AHR</th><th>Cont.</th><th>Comments</th></thead><tbody>"
          }
          txt=txt+"<tr "+((i % 2 === 0) ? "class='alt'" : "")+"><td>"+rec.agentName+"</td><td>"+rec.TL+"</td><td>"+rec.inputHours+"</td><td>"+rec.inputInterviews+"</td><td style='"+((rec.AHR<rec.hourlyTarget) ? "color:red" : "color:green")+"'>"+rec.AHR.toFixed(2)+"</td><td style='color:"+(rec.cont>=1?"red":(rec.cont>=0.7?"orange":"black"))+"'>"+Math.round(rec.cont*1000)/10+"%</td><td width='200px'></td></tr>"
        });
        txt=txt+"</tbody></table>"
        db.query(emailQ, (err, emailR) =>{
          emailTo=[]
          emailR.recordset.forEach((rec, i) => {
            emailTo.push(rec.staffEmail)
          })
          // emailTo.push('matt@teamsearchmr.co.uk')
          emailTo.push('tokulus@teamsearchmr.co.uk')
          let mailOptions = {
              to: emailTo,
              subject: shiftTxt+" agent performance for "+dateIf(req.body[0].date,"/","f"),
              html: '<p>' + header + txt + footer + '</p>'
          };
          transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                  return console.log(error);
                  res.status(500).send({error: 'Could not send agent performance report'});
              }else {
                res.send("success");
              }
              //console.log('Message %s sent: %s', info.messageId, info.response);
          });
        })
      }
    })
  },
  getTeamReport: (req,res) => {
    req.query.endate=req.query.endate?req.query.endate:currPayPeriodEn
    req.query.stdate=req.query.stdate?req.query.stdate:currPayPeriodSt
    req.query.hourly=req.query.hourly===undefined?1:req.query.hourly
    req.query.bmgHourly=req.query.bmgHourly===undefined?1:req.query.bmgHourly
    let enDate=moment.min(moment().subtract(1, 'day'),moment(req.query.endate)).format(moment.HTML5_FMT.DATE)
    let hours="CASE WHEN isJobHourly=1 THEN Hours ELSE Ints END"
    let liveSales="liveSales"
    let pay="Pay"
    if (req.query.hourly==0) {
      hours="CASE WHEN clientID=130 AND isJobHourly=1 THEN 0 ELSE "+hours+" END"
      pay="CASE WHEN clientID=130 AND isJobHourly=1 THEN 0 ELSE "+pay+" END"
      liveSales="CASE WHEN clientID=130 AND isJobHourly=1 THEN 0 ELSE "+liveSales+" END"
    }
    if (req.query.bmgHourly==0) {
      hours="CASE WHEN clientID=723 AND isJobHourly=1 THEN 0 ELSE "+hours+" END"
      pay="CASE WHEN clientID=723 AND isJobHourly=1 THEN 0 ELSE "+pay+" END"
      liveSales="CASE WHEN clientID=723 AND isJobHourly=1 THEN 0 ELSE "+liveSales+" END"
      // hours="CASE WHEN v.jobID=5667 THEN 0 ELSE "+hours+" END"
      // pay="CASE WHEN v.jobID=5667 THEN 0 ELSE "+pay+" END"
      // liveSales="CASE WHEN v.jobID=5667 THEN 0 ELSE "+liveSales+" END"
    }
    let tableQ=`
    SELECT DailyInput.agentID, agentName,DailyInput.inputDate, isDay, isEve, teamID, teamName, managerID, teamColour, SUM(hrs) as hrs, sum(jobhrs) as jobhrs, isnull(SUM(pay),0) as pay, sum(sales) as sales, sum(liveSales) as fixedSales,sum(case when dialHrs is null then null else dialCount end) dialCount,sum(dialHrs) dialHrs, sum(dialCount)/sum(dialHrs) as avgDials, sum(o2o.o2oCount) as o2oCount, sum(isnull(coachT.coachingCount,0)+isnull(coachQC.coachingCount,0)) as coachingCount, sum(coachQC.coachingCount) as coachingCountQC,sum(coachG.coachingCount) as coachingCountGen,sum(qcCount) as qcCount,sum(qcPoorCount) as qcPoorCount, SUM(QCsum) as QCsum, sum(CAST(t.onTarget AS DECIMAL(10,2))) as onTarget,sum(isnull(w2dCoachCount,0)) as w2dCoachCount INTO #teamReportTab
    FROM (
      SELECT v.agentID,v.inputDate,sum(Hours) as hrs, SUM(CASE WHEN dd.dialDate is null or jobs.excludeFromDials=1 THEN NULL ELSE Hours END) as dialHrs, SUM(CASE WHEN jobs.projectID>2 THEN Hours ELSE NULL END) as jobhrs, sum(`+hours+`*CPI) as sales,sum(`+pay+`) as pay,SUM(`+liveSales+`) liveSales
  		FROM ViewDailyPay v
  		LEFT JOIN (SELECT jobID, isnull(CPInew,0) as CPI FROM ViewJobsStats) as JobT ON JobT.jobID=v.jobID
  		LEFT JOIN Jobs ON Jobs.jobID=v.jobID
  		left join Projects p on p.projectID=Jobs.projectID
  		left join Quotes q on q.quoteID=p.quoteID
  		left join DailyInput d on d.inputDate=v.inputDate and d.agentID=v.agentID and d.jobID=v.jobID
  		left join (select distinct dialDate,agentID from Dials) dd on dd.dialDate=v.inputDate and dd.agentID=v.agentID
  		WHERE v.inputDate BETWEEN @stdate AND @endate AND Hours>0 AND v.agentID NOT IN (381,318) and v.jobID<>6611 and p.projectID<>5667 and v.jobID>0
  		GROUP BY v.inputDate, v.agentID
    	) as DailyInput
    LEFT JOIN (SELECT max(Dials.talkMins+Dials.dialCount) as dialCount, Dials.agentID, Dials.dialDate FROM Dials GROUP BY Dials.agentID, Dials.dialDate) as dialsT ON dialsT.agentID=DailyInput.agentID AND dialsT.dialDate=DailyInput.inputDate
    LEFT JOIN (SELECT distinct bookingDate, Booking.agentID, isnull(bookingTeamID,teamID) as teamID, agentName FROM Booking LEFT JOIN Agents on Agents.agentID=Booking.agentID WHERE bookingDate BETWEEN @stdate AND @endate) Booking on Booking.agentID=DailyInput.agentID AND Booking.bookingDate=DailyInput.inputDate
    LEFT JOIN (
    	SELECT count(DISTINCT o2oID) as o2oCount, agentID, o2oDate
    	FROM AgentOne2ones
    	GROUP BY agentID, o2oDate
    	) o2o ON o2o.agentID=DailyInput.agentID AND o2o.o2oDate=DailyInput.inputDate
    LEFT JOIN (
    	SELECT count(DISTINCT coachingID) as coachingCount, agentID, coachingDate
    	FROM CoachingNew
    	WHERE (coachingType='Coaching') GROUP BY agentID, coachingDate
    	) coachT ON coachT.agentID=DailyInput.agentID AND coachT.coachingDate=DailyInput.inputDate
    LEFT JOIN (
    	SELECT count(DISTINCT coachingID) as coachingCount, agentID, coachingDate
    	FROM CoachingNew
    	WHERE (coachingType='General') GROUP BY agentID, coachingDate
    ) coachG ON coachG.agentID=DailyInput.agentID AND coachG.coachingDate=DailyInput.inputDate
    LEFT JOIN (
      SELECT count(DISTINCT case when (agentLeft is null or shiftsAfter>4) then CoachingNew.coachingID end) as coachingCount, CoachingNew.agentID, interviewDate, sum(isnull(case when diff<7 then 1 else 0 end,0)) as w2dCoachCount
      FROM CoachingNew
  	  left join ViewQCscores qc on qc.qualityControlID=CoachingNew.qualityControlID OR qc.qcCoachID=CoachingNew.coachingID
  	  OUTER APPLY (select count(distinct inputDate) as diff from DailyInput where inputDate between dateMonitored and coachingDate and agentID=coachingNew.agentID) diff
      left join (select agentID,agentLeft from Agents) a on a.agentID=qc.agentID
      outer apply (select COUNT(distinct inputDate) shiftsAfter from DailyInput d where d.agentID=a.agentID and inputDate>dateMonitored) s
      WHERE coachingType='QC' and score<85
  	  GROUP BY CoachingNew.agentID, interviewDate
    ) coachQC ON coachQC.agentID=DailyInput.agentID AND coachQC.interviewDate=DailyInput.inputDate
    left join AgentTeams on Booking.teamID=agentTeams.agentTeamID
    LEFT JOIN (
  		SELECT sum(cast(score as decimal(10,5))) as QCsum, sum(case when score<85 and (agentLeft is null or shiftsAfter>1 or qcCoachID is not null) THEN 1 ELSE 0 END) as qcPoorCountW2d, sum(case when score<85 and (agentLeft is null or shiftsAfter>4 or qcCoachID is not null) THEN 1 ELSE 0 END) as qcPoorCount, count(*) as qcCount, q.agentID, interviewDate
  		FROM ViewQCscores q
  		left join (select agentID,agentLeft from Agents) a on a.agentID=q.agentID
  		outer apply (select COUNT(distinct inputDate) shiftsAfter from DailyInput d where d.agentID=a.agentID and inputDate>dateMonitored) s
  		WHERE isFinished=1 AND type='Call'
  		GROUP BY q.agentID, interviewDate
  	) as QCscores ON QCscores.agentID=DailyInput.agentID and QCscores.interviewDate=DailyInput.inputDate
    LEFT JOIN getShiftsOnTarget(@stdate,@endate) t on DailyInput.agentID=t.agentID and DailyInput.inputDate=t.inputDate
    WHERE DailyInput.inputDate BETWEEN @stdate AND @endate AND hrs>0
    GROUP BY DailyInput.agentID, agentName, teamID, teamName, managerID, teamColour, isDay, isEve,DailyInput.inputDate`
    let teamQ=`
    SELECT teamID, isDay, isEve, teamName, teamColour, sum(pay)/NULLIF(sum(fixedSales),0) as fixedContribution, sum(pay)/NULLIF(sum(sales),0) as contribution, sum(dialCount)/sum(dialHrs) as avgDials, sum(QCsum)/sum(QCcount) as QCscore, sum(onTarget)/count(*) as onTarget, SUM(ISNULL(o2oCount,0)) as o2oCount, SUM(ISNULL(coachingCount,0)) as coachingCount, max(ISNULL(userCoachingGen.userCoachCount,0)) as userCoachCountGen, max(ISNULL(userCoaching.userCoachCount,0)) as userCoachCount, count(distinct agentID) as agentCount,sum(isnull(qcPoorCount,0)) as qcPoorCountW2d,sum(isnull(qcPoorCount,0)) as qcPoorCount,sum(isnull(qcCount,0)) as qcCount,SUM(ISNULL(coachingCountQC,0)) as coachingCountQC,SUM(ISNULL(coachingCountGen,0)) as coachingCountGen,sum(w2dCoachCount) as w2dCoachCount
    FROM
    #teamReportTab
    LEFT JOIN (SELECT count(DISTINCT coachingID) as userCoachCount, staffID FROM CoachingNew WHERE (coachingType='QC' OR coachingType='Coaching') AND coachingDate BETWEEN @stdate AND @endate GROUP BY staffID) userCoaching ON userCoaching.staffID=#teamReportTab.managerID
  	LEFT JOIN (SELECT count(DISTINCT coachingID) as userCoachCount, staffID FROM CoachingNew WHERE (coachingType='General') AND coachingDate BETWEEN @stdate AND @endate GROUP BY staffID) userCoachingGen ON userCoachingGen.staffID=#teamReportTab.managerID
    WHERE teamID>1
    GROUP BY teamID, teamName, teamColour, isDay, isEve
    ORDER BY agentCount DESC`
    let agentQ=`
    SELECT agentID, agentName, teamID, sum(pay)/NULLIF(sum(fixedSales),0) as fixedContribution, sum(pay)/nullif(sum(sales),0) as contribution, sum(hrs) as hrs, sum(dialCount)/sum(dialHrs) as avgDials, sum(QCsum)/sum(QCcount) as QCscore, sum(onTarget)/count(*) as onTarget, SUM(ISNULL(o2oCount,0)) as o2oCount, SUM(ISNULL(coachingCount,0)) as coachingCount, sum(pay) as pay
    FROM
    #teamReportTab
    WHERE teamID>1
    GROUP BY agentID, agentName, teamID
    ORDER BY agentName ASC
    DROP TABLE #teamReportTab`
    db.multiple = true
    db.input('stdate',new Date(req.query.stdate))
    db.input('endate',new Date(enDate))
    db.batch(tableQ+teamQ+agentQ, (err, statsR) =>{
      if (err) {
        console.log(tableQ+teamQ+agentQ+" - "+err)
        logger.info(req.user.uName + " failed to get team performance report .... "+err+" - "+tableQ+teamQ+agentQ);
        if(err.code === 'ETIMEOUT'){
          res.status(500).send('The request timed out - your date range might be too long, try a shorter period');
        }else {
          res.status(500).send('Could not get team performance report - '+err);
        }
      }else {
        res.render('team-report.ejs',{
          title:'Team reports',
          teamStats: statsR.recordsets[0],
          stdate: req.query.stdate,
          agentStats: statsR.recordsets[1],
          endate: enDate,
          hourly:req.query.hourly,
          bmgHourly:req.query.bmgHourly
        })
      }
  })
},
  miDashboard: (req,res) => {
    res.render('mi-dashboard.ejs',{
      title:'MI Dashboard',
    })
  },
  miBoardReport: (req,res) => {
    req.params.stDate=moment.min(req.params.stDate,moment().subtract(1,'d'))
    req.params.enDate=moment.min(req.params.stDate,moment().subtract(1,'d'))
    let queries={}
    queries.booking=`
    select
    GROUPING(absenceType) grpab,
    GROUPING(isnull(b.bookingTeamID,0)) grpteam,
    GROUPING(isnull(b.isEve,0)) grpshift,
    isnull(b.isEve,0) isEve,
    absenceType,
    isnull(b.bookingTeamID,0) bookingTeamID,
    SUM(bookedHours) bookedHours,
	teamName
    from
    getBookedHours(@st,@en) b
    left join Absence a on a.absenceDate=b.bookingDate and a.agentID=b.agentID
	left join AgentTeams t on t.agentTeamID=b.bookingTeamID
  where b.agentID not in (`+freeAgents.join(",")+`)
    group by GROUPING sets(
    (),
    (absenceType),
    (isnull(b.bookingTeamID,0),teamName),
    (isnull(b.bookingTeamID,0),teamName,absenceType),
    (isnull(b.isEve,0),isnull(b.bookingTeamID,0),teamName),
    (isnull(b.isEve,0),isnull(b.bookingTeamID,0),teamName,absenceType),
    (isnull(b.isEve,0)),
    (isnull(b.isEve,0),absenceType)
    )`
    queries.shifts=`
    select
    GROUPING(wk) grpwk,
    GROUPING(isnull(d.bookingTeamID,0)) grpteam,
    GROUPING(isnull(isEve,0)) grpshift,
    GROUPING(agentName) grpagent,
    COUNT(distinct case when hours>0 then d.agentID end) agentsWorked,
    SUM(hours) workedHours,
    SUM(case when dialDate is null then null else hours end) dialHours,
    wk,
    a.agentName,a.agentJoined,a.agentLeft,teamName,
    isnull(d.bookingTeamID,0) bookingTeamID,
  	isnull(isEve,0) isEve,
      SUM(isnull(latemins1,0)+isnull(latemins2,0)+isnull(latemins3,0)) lateMins,
      SUM(isnull(o2os,0)) o2os,
      sum(Ints) ints,sum(cast(sales as decimal(10,2))) sales,SUM(cast(Pay as decimal(10,2))) pay,
      sum(dialCount) calls,
      sum(talkMins) talktime
      from
  	(select agentID,inputDate,bookingTeamID,dbo.startOfWeek(inputDate) wk,sum(ints) ints,sum(hours) hours,sum(pay) pay,sum(sales) sales
  	from ViewAgentShifts
  	where inputDate between @st and @en
  	group by agentID,inputDate,bookingTeamID,dbo.startOfWeek(inputDate)) d
      left join getLateMins() l on l.agentID=d.agentID and l.inputDate=d.inputDate
      left join (select agentID,o2oDate,COUNT(*) o2os from AgentOne2ones group by agentID,o2oDate) o on o.agentID=d.agentID and o.o2oDate=d.inputDate
      left join Dials i on i.agentID=d.agentID and i.dialDate=d.inputDate
  	left join AgentTeams t on t.agentTeamID=d.bookingTeamID
	left join Agents a on a.agentID=d.agentID
  where d.agentID not in (`+freeAgents.join(",")+`)
      group by GROUPING sets(
        (),
        (wk),
        (isnull(d.bookingTeamID,0)),
        (isnull(d.bookingTeamID,0),wk),
        (isnull(d.bookingTeamID,0),isnull(isEve,0),teamName),
        (isnull(isEve,0)),
        (isnull(isEve,0),wk),
        (a.agentName,a.agentJoined,a.agentLeft,teamName,isnull(isEve,0),wk),
        (a.agentName,a.agentJoined,a.agentLeft,teamName,isnull(d.bookingTeamID,0),isnull(isEve,0))
      )
      order by wk,isnull(isEve,0)`
    queries.qc=`
    select
    GROUPING(qcTeamID) grpteam,
	GROUPING(agentName) grpagent,
    GROUPING(isnull(isEve,0)) grpshift,
    qcTeamID,isnull(isEve,0) isEve,count(*) qcCount,AVG(0.00+score) qcScore,teamName,agentName
    from
    ViewQCscores q
	left join Agents a on a.agentID=q.agentID
    left join AgentTeams t on t.agentTeamID=q.qcTeamID
    where isFinished=1 and type='call' and interviewDate between @st and @en
    group by GROUPING sets(
      (),
      (isnull(isEve,0)),
      (isnull(isEve,0),qcTeamID,teamName),
	  (isnull(isEve,0),qcTeamID,teamName,agentName)
    )`
    queries.bonus=`
    select
    GROUPING(bookingTeamID) grpteam,
    GROUPING(isEve) grpshift,
    bookingTeamID,isEve,
    SUM(bonus) bonus,sum(s.shifts) shifts,SUM(ss.shifts) startShiftsToRemove,SUM(se.shifts) endShiftsToRemove,((((0.00+SUM(s.shifts))-ISNULL(sum(ss.shifts),0))-ISNULL(sum(se.shifts),0))/SUM(s.shifts))*SUM(bonus) calcBonus from
    dbo.getBonus(dbo.soPayMonth(@st),dbo.eoPayMonth(@en),130) b
    left join (select agentID,count(distinct inputDate) shifts,format(dbo.eoPayMonth(inputDate),'MMM-yy') payMonth from dailyInput group by format(dbo.eoPayMonth(inputDate),'MMM-yy'),agentID) s on s.agentID=b.agentID and s.payMonth=b.payMonth
    left join (select agentID,count(distinct inputDate) shifts from dailyInput where inputDate between dateAdd(day,1,dbo.soPayMonth(@st)) and @st group by agentID) ss on ss.agentID=b.agentID and format(dbo.eoPayMonth(@st),'MMM-yy')=b.payMonth
    left join (select agentID,count(distinct inputDate) shifts from dailyInput where inputDate between @en and dateAdd(day,-1,dbo.eoPayMonth(@en)) group by agentID) se on se.agentID=b.agentID and format(dbo.eoPayMonth(@en),'MMM-yy')=b.payMonth
    outer apply (select top 1 bookingTeamID from Booking bo where format(dbo.eoPayMonth(bookingDate),'MMM-yy')=b.payMonth and bo.agentID=b.agentID group by bookingTeamID order by COUNT(*) DESC) bt
    where b.agentID not in (`+freeAgents.join(",")+`)
    group by GROUPING sets(
        (),
        (bookingTeamID),
        (isEve)
        )
    option (maxrecursion 0)`
    queries.agents=`
    select
    GROUPING(isnull(bookingTeamID,0)) grpteam,GROUPING(isnull(isEve,0)) grpshift,
    COUNT(case when agentJoined between @st and @en then 1 end) agentsStarted,
    COUNT(case when agentLeft between @st and @en then 1 end) agentsLeft,
    count(*) agentCount,
    AVG(0.00+datediff(day,agentJoined,@en)) employedDays,
    isnull(bookingTeamID,0) bookingTeamID,isnull(isEve,0) isEve
    from
    Agents a
    outer apply (select top 1 bookingTeamID,isEve from getBookedHours(@st,@en) bo where bo.agentID=a.agentID group by bookingTeamID,isEve order by COUNT(*) DESC) bt
    where (agentLeft is null or agentLeft>=@st) and agentJoined<=@en and a.agentID not in (`+freeAgents.join(",")+`)
    group by GROUPING sets(
      (),
      (isnull(bookingTeamID,0)),
      (isnull(isEve,0))
    )`
    queries.projects=`
    select
    GROUPING(isEve) grpshift,GROUPING(costTypeName) grpcost,GROUPING(quoteName) grpjob,
		quoteNo,quoteName,
    c.costTypeID,costTypeName,
		sum(ints),
		sum(projectInts),
    COUNT(distinct p.projectID) completed,
		sum(unitValue) unitValue,
		sum(units) units,
		count(*) cnt,
		sum(unitValue*units*isnull(((0.00+ints)/nullif(projectInts,0)),0)) sales,
  	isEve
    from
    Projects p
    left join Quotes q on q.quoteID=p.quoteID
    left join ViewProjectCosts c on c.projectID=p.projectID and costTypeID<>8
    left join CostTypes t on t.costTypeID=c.costTypeID
    left join (select jobProjectID,SUM(CATI_completes) projectInts from ViewJobsStats group by jobProjectID) pj on pj.jobProjectID=p.projectID
    left join (
			select projectID,MIN(startDate) startDate,MAX(endDate) endDate,COUNT(isJobCATI) hasCati,j.isJobEve isEve,sum(CATI_Completes) ints
			from ViewJobsStats s
			left join Jobs j on j.jobID=s.jobID
			where isJobCATI=1
			group by projectID,j.isJobEve
		) j on j.projectID=p.projectID
    where endDate between @st and @en
    group by GROUPING sets(
    	(),
			(c.costTypeID,costTypeName),
    	(isEve),
    	(c.costTypeID,costTypeName,isEve),
			(quoteNo,quoteName,c.costTypeID,costTypeName,isEve)
    )`
    queries.contribution=`
    select
    GROUPING(wk) grpwk,
    GROUPING(p.jobID) grpjob,
    GROUPING(method) grpmethod,
    wk,p.jobID,jobName,method,SUM(isnull(Pay,0)) pay,SUM(isnull(sales,0)) sales,isnull(SUM(isnull(Pay,0))/nullif(SUM(isnull(sales,0)),0),9.99) cont from
    (
      select inputDate,dbo.startOfWeek(inputDate) wk,agentID,jobID,cast(Pay as decimal(10,4)) Pay,sales,'CATI' method from
      ViewAgentShifts
      where agentID not in (318,381,394,28,293,456)
      union all
      select inputDate,dbo.startOfWeek(inputDate) wk,faceAgentID,jobID,cast(Pay as decimal(10,4)),Sales,'F2F' from
      ViewFaceShifts
      union all
      select inputDate,dbo.startOfWeek(inputDate) wk,supplierID,jobID,cast(Pay as decimal(10,4)),Sales,'Online' from
      ViewOnlineShifts
    ) p
    left join ViewJobFullName j on j.jobID=p.jobID
    where inputDate between @st and @en
    group by GROUPING sets(
    	(),
    	(method),
    	(method,p.jobID,jobName),
    	(method,wk),
    	(method,wk,p.jobID,jobName)
    )`
    function createTable(data,tableName){
      return new Promise((resolve,reject)=>{
        var table = new sql.Table('##'+tableName)
        let entries=Object.keys(data[0]).map((col, i) => {
          table.columns.add(col,sql.VarChar(250),{nullable: true})
          return col
        });
        let x=0
        async function loop(){
          if(data[x]){
            let arr=entries.map(el=>data[x][el].toString())
            await table.rows.add(...arr)
            x++
            loop()
          }else {
            table.create = true
            thisDb.bulk(table, (err, bfResult) => {
              if (err) {
                console.log("In bulk query",err)
                reject()
              }else {
                resolve()
              }
            })
          }
        }
        loop()
      })
    }
    function getDials(){
      return new Promise((res,rej)=>{
        console.log(new Date(req.query.stDate).toISOString(),new Date(req.query.enDate).toISOString())
        let tData={
          grouping:{
            groupBy:"Users"
          },
          timeSettings:{
            timeRange:{
              timeFrom:new Date(req.query.stDate).toISOString(),
              timeTo:new Date(req.query.enDate).toISOString()
            }
          },
          // advancedTimeSettings:{
          //   timeZone:'Europe/London',
          //   includeHours:[{from:"09:00",to:"21:00"}],
          // },
          responseOptions:{
            counters:{
              allCalls:{
                aggregationType:'Sum'
              }
            },
            timers:{
              allCallsDuration:{
                aggregationType:'Sum'
              }
            }
          }
        }
        rcPlatform.post("/analytics/phone/performance/v1/accounts/~/calls/aggregate",tData).then(function(resp){
          resp.json().then(function(json){
            let dialData=json.data.filter(el=>el.counters && el.timers).map(d=>({ringCentralID:d.key,dialCount:d.counters.allCalls.values,talkTime:d.timers.allCalls.values}))
            console.log("REMOVED: ",json.data.filter(el=>!el.counters || !el.timers))
            console.log(dialData.reduce((a,b)=>a+b.dialCount,0)+" calls total")
            createTable(dialData,'tempDials').then(e=>{
              let agentQ=`
              select
              GROUPING(bookingTeamID) grpteam,GROUPING(isEve) grpshift,
              COUNT(case when agentJoined between @st and @en then 1 end) agentsStarted,
              COUNT(case when agentLeft between @st and @en then 1 end) agentsLeft,
              count(*) agentCount,
              AVG(0.00+datediff(day,agentJoined,@en)) employedDays,
              SUM(cast(dialCount as decimal(10,2))) dialCount,SUM(cast(talkTime as decimal(10,2))/60) talkTime,
              bookingTeamID,isEve
              from
              Agents a
              left join ##tempDials i on i.ringCentralID=a.ringCentralID
              cross apply (select top 1 bookingTeamID,isEve from getBookedHours(@st,@en) bo where bo.agentID=a.agentID group by bookingTeamID,isEve order by COUNT(*) DESC) bt
              where (agentLeft is null or agentLeft>@st) and agentJoined<@en
              group by GROUPING sets(
                (),
                (bookingTeamID),
                (isEve)
              )
              drop table ##tempDials`
              thisDb.query(agentQ,(err,agentR)=>{
                if (err) {
                  console.log("In agent query",err)
                  rej()
                }
                res(agentR.recordset)
              })
            })
          })
        }).catch(err=>console.log(err))
      })
    }
    let thisDb=new sql.Request();
    console.log(new Date(req.query.stDate),new Date(req.query.enDate))
    thisDb.input('st',new Date(req.query.stDate))
    thisDb.input('en',new Date(req.query.enDate))
    function addBfs(){
      return new Promise((res,rej)=>{
        getBradfordScores(new Date(req.query.stDate),new Date(req.query.enDate)).then(bf=>{
          var table = new sql.Table('##tempBfs')
          table.columns.add('agentID', sql.Int)
          table.columns.add('bradfordFactor', sql.Decimal(10,2))
          let x=0
          async function loop(){
            if(bf[x]){
              await table.rows.add(bf[x].agentID, bf[x].bradfordFactor)
              x++
              loop()
            }else {
              table.create = true
              thisDb.bulk(table, (err, bfResult) => {
                if (err) {
                  console.log("In bulk query",err)
                  rej()
                }else {
                  let agentQ=`
                  select
                  GROUPING(bookingTeamID) grpteam,GROUPING(isEve) grpshift,
                  COUNT(case when agentJoined between @st and @en then 1 end) agentsStarted,
                  COUNT(case when agentLeft between @st and @en then 1 end) agentsLeft,
                  count(*) agentCount,
                  AVG(0.00+datediff(day,agentJoined,@en)) employedDays,
                  AVG(0.00+bradfordFactor) bradfordFactor,
                  bookingTeamID,isEve
                  from
                  Agents a
                  left join ##tempBfs b on b.agentID=a.agentID
                  cross apply (select top 1 bookingTeamID,isEve from getBookedHours(@st,@en) bo where bo.agentID=a.agentID group by bookingTeamID,isEve order by COUNT(*) DESC) bt
                  where (agentLeft is null or agentLeft>@st) and agentJoined<@en
                  group by GROUPING sets(
                    (),
                    (bookingTeamID),
                    (isEve)
                  )
                  drop table ##tempBfs`
                  thisDb.query(agentQ,(err,agentR)=>{
                    if (err) {
                      console.log("In agent query",err)
                      rej()
                    }
                    res(agentR.recordset)
                  })
                }
              })
            }
          }
          loop()
        })
      })
    }
    thisDb.multiple=true
    let reqQueries=req.query.queries?req.query.queries:Object.keys(queries)
    let q=reqQueries.map(q=>queries[q]?queries[q]:'select 0').join(";")
    thisDb.batch(q,(err,r)=>{
      if (err) {
        console.log(err)
        res.send(err)
      }else {
        // console.log(reqQueries,q,r.recordsets.map(el=>el[0]))
        // getDials().then(agents=>{
        let x=0
        let resp={}
        function addResp(){
          if (reqQueries[x]) {
            resp[reqQueries[x]]=r.recordsets[x]
            x++
            addResp()
          }else {
            res.send(resp)
          }
        }
        addResp()
        // }).catch(err=>{
        //   console.log(err)
        //   res.status(500).send({error:"An error has occured. Please contact the system administrator"})
        // })
      }
    })
  },
  miDashboardAjax: (req,res) => {
    let contQ=`
    select (sum(Pay)/sum(case when isHourly=1 then hours else Ints end*CPI))*100 as cont,
    (sum(case when jobClientID=130 then null else Pay end)/sum(case when isHourly=1 then hours else Ints end*CPI))*100 as contExRig
    from
    ViewDailyPay dp
    left join ViewJobsStats js on js.jobID=dp.jobID
    where dp.inputDate between '`+req.body.stDate+`' and '`+req.body.enDate+`'`
    let contQSpark=`
    select format(dp.inputDate,'MMM-yy') as dte,(sum(Pay)/sum(nullif(case when isHourly=1 then hours else Ints end*CPI,0)))*100 as cont,
    (sum(case when jobClientID=130 then null else Pay end)/sum(nullif(case when isHourly=1 then hours else Ints end*CPI,0)))*100 as contExRig
    from
    ViewDailyPay dp
    left join ViewJobsStats js on js.jobID=dp.jobID
    where dp.inputDate between '`+req.body.stDate+`' and '`+req.body.enDate+`'
    group by format(dp.inputDate,'MMM-yy'),format(dp.inputDate,'yyyy-MM')
  	order by format(dp.inputDate,'yyyy-MM')
    `
    let onContQ=`
    select (sum(spend)/nullif(sum(budget),0))*100 as cont
    from
    (select projectID, sum(units*unitValue) as spend from ProjectSpends where typeID=3 group by projectID) s
    left join (select projectID, sum(units*unitValue) as budget from ProjectCosts where costTypeID=3 group by projectID) b on b.projectID=s.projectID
  	left join (select projectID, max(endDate) as endDate from jobs group by projectID) d on d.projectID=s.projectID
    where endDate between '`+req.body.stDate+`' and '`+req.body.enDate+`'`
    let onContQSpark=`
    select format(endDate,'MMM-yy') as dte,(sum(spend)/nullif(sum(budget),0))*100 as cont
    from
    (select projectID, sum(units*unitValue) as spend from ProjectSpends where typeID=3 group by projectID) s
    left join (select projectID, sum(units*unitValue) as budget from ProjectCosts where costTypeID=3 group by projectID) b on b.projectID=s.projectID
  	left join (select projectID, max(endDate) as endDate from jobs group by projectID) d on d.projectID=s.projectID
    where endDate between '`+req.body.stDate+`' and '`+req.body.enDate+`'
    group by format(endDate,'MMM-yy'),format(endDate,'yyyy-MM')
  	order by format(endDate,'yyyy-MM')`
    let f2fContQ=`
    select (sum(spend)/nullif(sum(budget),0))*100 as cont
    from
    (select projectID, sum(units*unitValue) as spend from ProjectSpends where typeID=9 group by projectID) s
    left join (select projectID, sum(units*unitValue) as budget from ProjectCosts where costTypeID=9 group by projectID) b on b.projectID=s.projectID
  	left join (select projectID, max(endDate) as endDate from jobs group by projectID) d on d.projectID=s.projectID
    where endDate between '`+req.body.stDate+`' and '`+req.body.enDate+`'`
    let f2fContQSpark=`
    select format(endDate,'MMM-yy') as dte, (sum(spend)/nullif(sum(budget),0))*100 as cont
    from
    (select projectID, sum(units*unitValue) as spend from ProjectSpends where typeID=9 group by projectID) s
    left join (select projectID, sum(units*unitValue) as budget from ProjectCosts where costTypeID=9 group by projectID) b on b.projectID=s.projectID
  	left join (select projectID, max(endDate) as endDate from jobs group by projectID) d on d.projectID=s.projectID
    where endDate between '`+req.body.stDate+`' and '`+req.body.enDate+`'
    group by format(endDate,'MMM-yy'),format(endDate,'yyyy-MM')
  	order by format(endDate,'yyyy-MM')`
    let tabQ=`
    IF OBJECT_ID('tempdb..#miQuotes') IS NOT NULL DROP TABLE #miQuotes
    create table #miQuotes (quoteDate date,daysToComm int,isQuoteAsCATI bit,isQuoteAsOnline bit,isQuoteAsFace bit,isQuoteAsRecruitment bit,isQuoteAsOther bit,FiscalYear int,FiscalQuarter int,monthtxt varchar(50),monthnum int,csatID varchar(50))
    insert into #miQuotes
    select quoteDate,datediff(d,quoteDate,commissionDate),isQuoteAsCATI,isQuoteAsOnline,isQuoteAsFace,isQuoteAsRecruitment,case when isQuoteAsCATI=1 or isQuoteAsOnline=1 or isQuoteAsFace=1 or isQuoteAsRecruitment=1 then 0 else 1 end as isQuoteAsOther,
    YEAR(quoteDate) + CASE
            WHEN MONTH(quoteDate) >=6 THEN 1
            ELSE 0
        END As FiscalYear,
        CASE
            WHEN MONTH(quoteDate) IN (6, 7, 8) THEN 1
            WHEN MONTH(quoteDate) IN (9, 10, 11) THEN 2
            WHEN MONTH(quoteDate) IN (12, 1, 2) THEN 3
            ELSE 4
        END As FiscalQuarter,
    DATENAME(month,quoteDate) as monthtxt,
    month(quoteDate) as monthnum,
    csatID
    from
    quotes
    left join projects on projects.quoteID=quotes.quoteID
    order by quoteDate asc

    select FiscalYear,FiscalQuarter,sum(isQuoteAsCATI+0) as isQuoteAsCATI,sum(isQuoteAsOnline+0) as isQuoteAsOnline,sum(isQuoteAsFace+0) as isQuoteAsFace,sum(isQuoteAsRecruitment+0) as isQuoteAsRecruitment,sum(isQuoteAsOther+0) as isQuoteAsOther
    from
    #miQuotes
    where quoteDate between '`+req.body.stDate+`' and '`+req.body.enDate+`'
    group by FiscalYear,FiscalQuarter
    order by FiscalYear desc,FiscalQuarter desc

    select FiscalYear,FiscalQuarter,monthtxt,sum(isQuoteAsCATI+0) as isQuoteAsCATI,sum(isQuoteAsOnline+0) as isQuoteAsOnline,sum(isQuoteAsFace+0) as isQuoteAsFace,sum(isQuoteAsRecruitment+0) as isQuoteAsRecruitment,sum(isQuoteAsOther+0) as isQuoteAsOther
    from
  	#miQuotes
    where quoteDate between '`+req.body.stDate+`' and '`+req.body.enDate+`'
    group by FiscalYear,FiscalQuarter,monthtxt,monthnum
    order by FiscalYear desc,FiscalQuarter desc,monthnum desc

    select FiscalYear,FiscalQuarter,sum(isQuoteAsCATI+0) as isQuoteAsCATI,sum(isQuoteAsOnline+0) as isQuoteAsOnline,sum(isQuoteAsFace+0) as isQuoteAsFace,sum(isQuoteAsRecruitment+0) as isQuoteAsRecruitment,sum(isQuoteAsOther+0) as isQuoteAsOther
    from
    #miQuotes
    where quoteDate between '`+req.body.stDate+`' and '`+req.body.enDate+`' and csatID is not null
    group by FiscalYear,FiscalQuarter
    order by FiscalYear desc,FiscalQuarter desc

    select FiscalYear,FiscalQuarter,monthtxt,sum(isQuoteAsCATI+0) as isQuoteAsCATI,sum(isQuoteAsOnline+0) as isQuoteAsOnline,sum(isQuoteAsFace+0) as isQuoteAsFace,sum(isQuoteAsRecruitment+0) as isQuoteAsRecruitment,sum(isQuoteAsOther+0) as isQuoteAsOther
    from
  	#miQuotes
    where quoteDate between '`+req.body.stDate+`' and '`+req.body.enDate+`' and csatID is not null
    group by FiscalYear,FiscalQuarter,monthtxt,monthnum
    order by FiscalYear desc,FiscalQuarter desc,monthnum desc

    select FiscalYear,FiscalQuarter,avg(CASE WHEN isQuoteAsCATI=1 THEN daysToComm ELSE null END) as isQuoteAsCATI,avg(CASE WHEN isQuoteAsOnline=1 THEN daysToComm ELSE null END) as isQuoteAsOnline,avg(CASE WHEN isQuoteAsFace=1 THEN daysToComm ELSE null END) as isQuoteAsFace,avg(CASE WHEN isQuoteAsRecruitment=1 THEN daysToComm ELSE null END) as isQuoteAsRecruitment,avg(CASE WHEN isQuoteAsOther=1 THEN daysToComm ELSE null END) as isQuoteAsOther
    from
    #miQuotes
    where quoteDate between '`+req.body.stDate+`' and '`+req.body.enDate+`' and csatID is not null
    group by FiscalYear,FiscalQuarter
    order by FiscalYear desc,FiscalQuarter desc

    select FiscalYear,FiscalQuarter,monthtxt,avg(CASE WHEN isQuoteAsCATI=1 THEN daysToComm ELSE null END) as isQuoteAsCATI,avg(CASE WHEN isQuoteAsOnline=1 THEN daysToComm ELSE null END) as isQuoteAsOnline,avg(CASE WHEN isQuoteAsFace=1 THEN daysToComm ELSE null END) as isQuoteAsFace,avg(CASE WHEN isQuoteAsRecruitment=1 THEN daysToComm ELSE null END) as isQuoteAsRecruitment,avg(CASE WHEN isQuoteAsOther=1 THEN daysToComm ELSE null END) as isQuoteAsOther
    from
  	#miQuotes
    where quoteDate between '`+req.body.stDate+`' and '`+req.body.enDate+`' and csatID is not null
    group by FiscalYear,FiscalQuarter,monthtxt,monthnum
    order by FiscalYear desc,FiscalQuarter desc,monthnum desc
    drop table #miQuotes
    `
    let salesQ=`
    select sum(sales) as sales,costTypeName
    from ViewSales
    where endDate between '`+req.body.stDate+`' and '`+req.body.enDate+`'
    group by costTypeName`
    db.multiple=true
    db.query(contQ+contQSpark, (err, contR) =>{
      db.query(onContQ+onContQSpark, (err, onContR) =>{
        if (err) {
          console.log(err)
          console.log(onContQ)
          res.status(500).send("Could not get online stats")
        }
        db.query(f2fContQ+f2fContQSpark, (err, f2fContR) =>{
          db.batch(tabQ, (err, quotesR) =>{
            if (err) {
              console.log(err)
              console.log(tabQ)
              res.status(500).send("Could not get quotes")
            }
            db.batch(salesQ, (err, salesR) =>{
              if (err) {
                console.log(err)
                console.log(salesQ)
                res.status(500).send("Could not get sales")
              }
              res.status(200).send({
                ja2Cont:contR.recordsets[0][0].cont,
                onlineCont:onContR.recordsets[0][0].cont,
                f2fCont:f2fContR.recordsets[0][0].cont,
                ja2ContSpark:contR.recordsets[1],
                onlineContSpark:onContR.recordsets[1],
                f2fContSpark:f2fContR.recordsets[1],
                quotesQtr:quotesR.recordsets[0],
                quotesMonth:quotesR.recordsets[1],
                comisQtr:quotesR.recordsets[2],
                comisMonth:quotesR.recordsets[3],
                dtcQtr:quotesR.recordsets[4],
                dtcMonth:quotesR.recordsets[5],
                sales:salesR.recordset,
              })
            })
          })
        })
      })
    })
  },
  getRCdials: (req,res) => {
    var dials=[]
    let dateFrom=req.body.fromDate
    let dateTo=req.body.toDate
    var logs=[]
    let p=0
    function sleep(ms) {
      return new Promise((resolve) => {
        setTimeout(resolve, ms);
      });
    }
    function getPages(){
      let params={dateTo:dateTo,dateFrom:dateFrom,perPage:5000,page:p+1}
      rcPlatform.get("/restapi/v1.0/account/~/call-log",params).then(function(logResp){
        logResp.json().then(function(log){
          if (log.paging.pageEnd) {
            logs=logs.concat(log.records.filter(el=>el.extension))
            p++
            sleep(2000).then(function(e){
              getPages()
            })
          }else {
            rcPlatform.get("/restapi/v1.0/account/~/extension/",{type:'User',perPage:500}).then(function(extResp){
              extResp.json().then(function(extensions){
                var i=0
                function loopForDials(){
                  if (i<extensions.records.length) {
                    var ext=extensions.records[i]
                    var extLog=logs.filter(el=>el.extension.id==ext.id)
                    if (extLog) {
                      dials.push({
                        extID:ext.id,
                        name:ext.name,
                        calls:extLog.length,
                        talkTime:extLog.reduce((a,b)=>a+Number(b.duration),0)
                      })
                    }
                    i++
                    loopForDials()
                  }else {
                    // console.log("done",dials)
                    res.send(dials)
                  }
                }
                loopForDials()
              })
            }).catch(function(err){
              console.log(err)
              res.status(500).send({error:err})
            })
          }
        })
      }).catch(function(err){
        console.log(err)
        res.status(500).send({error:err})
      })
    }
    getPages()
  },
  updateSqlDials: (req,res) => {
    let updateQ="update Dials set dialCount='"+req.body.dials+"', talkMins='0' where agentID="+req.body.agentID+" and dialDate='"+req.body.date+"'"
    if (req.body.hr) {
      updateQ="update DialsHourly set dialCount='"+req.body.dials+"', talkMins='0' where agentID="+req.body.agentID+" and dialDate='"+req.body.date+"' and dialHour="+req.body.hr
    }
    if (Number(req.body.dials)>0) {
      db.query(updateQ, (err, resp) =>{
        if (err) {
          console.log(err)
          res.status(500).send({error:err})
        }
        if (resp.rowsAffected==0) {
          let insertQ="insert into Dials (extensionName,dialCount,talkMins,agentID,dialDate,phoneSystem) VALUES ('"+req.body.extID+"',"+req.body.dials+",0,"+req.body.agentID+",'"+req.body.date+"','Ring Central')"
          if (req.body.hr) {
            insertQ="insert into DialsHourly (extensionName,dialCount,talkMins,agentID,dialDate,dialHour,phoneSystem) VALUES ('"+req.body.extID+"',"+req.body.dials+",0,"+req.body.agentID+",'"+req.body.date+"',"+req.body.hr+",'Ring Central')"
          }
          console.log(insertQ)
          db.query(insertQ, (err, resp) =>{
            res.send("success")
          })
        }else {
          res.send("success")
        }
      })
    }else {
      let delQ="delete from Dials where agentID="+req.body.agentID+" and dialDate='"+req.body.date+"'"
      if (req.body.hr) {
        delQ="delete from DialsHourly where agentID="+req.body.agentID+" and dialDate='"+req.body.date+"' and dialHour="+req.body.hr
      }
      db.query(delQ, (err, resp) =>{
        if (err) {
          console.log(err)
          res.status(500).send({error:err})
        }
        res.send("success")
      })
    }
  },
  bookingReport:(req,res)=>{
    let bookingWeek=moment().add(1, 'weeks').isoWeekday(1)
    let prevWeeks=(req.params.prevWeeks>0?req.params.prevWeeks:4)
    let prevWkSt=moment().isoWeekday(1).subtract(prevWeeks,"weeks")
    let prevWkEn=moment().isoWeekday(1).subtract(1,'d')
    let q=`
    select agentName as 'Agent'
    ,teamName as 'Team'
    ,case when sum(bookedHours)=0 then 'Holiday' else 'Booked' end as 'Status'
    ,sum(appliedHours) as Hours
    ,case when sum(bookedHours)=0 then 0 else count(distinct bookingDate) end as Shifts
    ,case when sum(bookedHours)=0 then 'Holiday' else '' end as 'Absence'
    ,case when max(b.isEve)=1 then 'Eve' else 'Day' end as Shift
    from
    getBookedHours(@stdate,@endate) b
    left join agents a on a.agentID=b.agentID
    left join AgentTeams t on t.agentTeamID=isnull(bookingTeamID,a.teamID)
    LEFT JOIN (select distinct * from Absence) ab on ab.agentID=b.agentID AND ab.absenceDate=b.bookingDate
    where bookingDate between @stdate and @endate and nullif(absenceType,'No show') is null and a.agentID not in (`+freeAgents.join(",")+`)
    group by agentName,teamName,absenceType

    union

    select agentName,teamName,'Absent',0,0,absenceType,case when max(isEve)=1 then 'Eve' else 'Day' end as Shift from
      Absence a
      left join agents ag on ag.agentID=a.agentID
      left join AgentTeams t on t.agentTeamID=ag.teamID
      where absenceDate between @stdate and @endate
      and a.agentID not in (`+freeAgents.join(",")+`)
      and nullif(absenceType,'No show') is not null
      group by agentName,teamName,absenceType

    union

    select agentName,teamName,'Not booked',0,0,'',case when isEve=1 then 'Eve' else 'Day' end as Shift from
      agents a
      left join AgentTeams t on t.agentTeamID=a.teamID
      where agentLeft is null
      and agentID>1
      and agentID not in (`+freeAgents.join(",")+`)
      and agentID not in (select agentID from booking where bookingDate between @stdate and @endate)
      and agentID not in (select agentID from Absence where absenceDate between @stdate and @endate)
      and agentTeamID>1
    `
    let avgHrsQ=`
    SET DATEFIRST 1
    --booked
    select booked.agentID,booked.agentName as 'Agent',Shift,teamName as Team,avg(booked.expectedHrs) as 'Avg booked p/w',avg(isnull(worked.hrs,0)) as 'Avg worked p/w',avg(booked.expectedHrs-isnull(worked.hrs,0)) as 'Avg dropped p/w',SUM(booked.hrs) 'Booked',SUM(booked.cancelled) 'Cancelled',SUM(booked.expectedHrs) 'Expected',SUM(worked.hrs) 'Worked',sum(booked.expectedHrs)-sum(isnull(worked.hrs,0)) as 'Dropped',sum(Absences) as Absences,case when booked.agentJoined>'`+prevWkSt.format("YYYY-MM-DD")+`' then DATEDIFF(week,booked.agentJoined,'`+prevWkEn.format("YYYY-MM-DD")+`') else 4 end as 'Weeks employed',case when booked.agentJoined>'`+prevWkSt.format("YYYY-MM-DD")+`' then booked.agentJoined end as 'Joined date' from
    (
    select b.agentID,agentName,teamName,agentJoined,sum(appliedHours) as hrs,sum(case when absenceType='Cancelled by manager' then appliedHours else 0 end) as cancelled,sum(case when absenceType='Cancelled by manager' then 0 else appliedHours end) as expectedHrs,DATEPART(week,bookingDate) as wk,case when max(b.isEve)=1 then 'Eve' else 'Day' end as Shift,sum(case when absenceType in ('Sick','No show') then 1 else 0 end) as Absences from
    getBookedHours('`+prevWkSt.format("YYYY-MM-DD")+`','`+prevWkEn.format("YYYY-MM-DD")+`') b
    left join agents a on a.agentID=b.agentID
    left join AgentTeams t on t.agentTeamID=a.teamID
    left join Absence ab on ab.absenceDate=b.bookingDate and ab.agentID=b.agentID
    where bookingDate between '`+prevWkSt.format("YYYY-MM-DD")+`' and '`+prevWkEn.format("YYYY-MM-DD")+`' and DATEPART(weekday,bookingDate)<>7 and agentLeft is null and startTime <> cast('00:00' as time)
    and a.agentID not in (`+freeAgents.join(",")+`)
    group by b.agentID,agentName,DATEPART(week,bookingDate),agentJoined,teamName
    ) booked
    left join
    (
    select b.agentID,agentName,teamName as Team,agentJoined,sum(inputHours) as hrs,DATEPART(week,inputDate) as wk from
    DailyInput b
    left join agents a on a.agentID=b.agentID
    left join AgentTeams t on t.agentTeamID=a.teamID
    where inputDate between '`+prevWkSt.format("YYYY-MM-DD")+`' and '`+prevWkEn.format("YYYY-MM-DD")+`' and DATEPART(weekday,inputDate)<>7 and agentLeft is null
    and a.agentID not in (`+freeAgents.join(",")+`)
    group by b.agentID,agentName,DATEPART(week,inputDate),agentJoined,teamName
    ) worked on worked.agentID=booked.agentID and booked.wk=worked.wk

    group by booked.agentID,booked.agentName,booked.agentJoined,booked.teamName,Shift
    order by avg(booked.hrs)`
    db.input('stdate',new Date(bookingWeek.format("YYYY-MM-DD")))
    db.input('endate',new Date(moment(bookingWeek).add(6,'d').format("YYYY-MM-DD")))
    let daysQ=`
    declare @brden date=dateadd(day,-1,cast(getdate() as date))
    declare @brdst date=dateadd(day,-`+Math.max(0,Number(req.params.prevDays)-1)+`,@brden)
    select bookingDate 'Date',case when isEve=1 then 'Eve' else 'Day' end Shift,sum(appliedHours) 'Booked',sum(case when absenceType='Cancelled by manager' then appliedHours else 0 end) 'Cancelled',sum(hrs) 'Worked' from
    getBookedHours(@brdst,@brden) b
    left join Absence ab on ab.absenceDate=b.bookingDate and ab.agentID=b.agentID
    left join (select sum(inputhours) hrs,agentID,inputDate from DailyInput group by agentID,inputDate) d on d.agentID=b.agentID and d.inputDate=b.bookingDate
    group by bookingDate,case when isEve=1 then 'Eve' else 'Day' end`
    db.query(q,(err,r)=>{
      if (err) {
        console.log(err)
        res.send(err)
      }else {
        db.multiple=true
        db.query(avgHrsQ,(err,avgHrsR)=>{
          db.query(daysQ,(err,daysR)=>{
            if (err) {
              console.log(err,daysQ)
            }
            res.render("booking-report.ejs",{
              title:"Booking report",
              bookings:r.recordset,
              prevWeeks:prevWeeks,
              prevDays:req.params.prevDays,
              bookingWeek:bookingWeek.format("YYYY-MM-DD"),
              bookingAvgs:avgHrsR.recordsets,
              bookingDays:daysR.recordset,
              tabulatorUpdated:true
            })
          })
        })
      }
    })
  },
  allBookingData:(req,res)=>{
    let q= `
    select b.agentID,agentName,isnull(jobName,b.isEve) isEve,teamName,isResourceable,bookingDate,startTime,endTime,appliedHours,isAbsent,workedHours from getBookedHours(@st,@en) b
    left join agents a on a.agentID=b.agentID
    left join agentTeams t on t.agentTeamID=b.bookingTeamID
    left join ViewJobFullName j on j.jobID=b.dtJobID
    order by bookingDate
    `
    db.input("st",req.query.stdate)
    db.input("en",req.query.endate)
    db.query(q,(err,r)=>{
      res.send({data:r.recordset})
    })
  },
  dialsAnalysisPage:(req,res)=>{
    res.render("dials-analysis.ejs",{
      title:"Dials Analysis"
    })
  },
  dialsAnalysisData:(req,res)=>{
    let dialsQ=`
    select agentID,dialHour,avg(talkMins+dialCount) as dials,count(distinct dialDate) as shifts,extensionName ringCentralID from
    DialsHourly
    where dialDate between '`+req.params.stdate+`' and '`+req.params.endate+`'
    group by agentID,dialHour,extensionName having count(distinct dialDate)>=`+(req.query.minShifts?req.query.minShifts:0)+`
    order by dialHour DESC`
    let tParams={
      grouping:{
        groupBy:"Users",
        // keys:[]
      },
      timeSettings:{
        timeZone:'Europe/London',
        timeRange:{
          timeFrom:moment.utc(req.params.stdate).toISOString(),
          timeTo:moment.utc(req.params.endate).toISOString()
        },
      },
      // advancedTimeSettings:{
      //   includeHours:[{from:"09:00",to:"21:00"}],
      // },
      callFilters:{
        callDuration:{
          minSeconds:1,
          maxSeconds:120,
        },
        callTypes:["Outbound"],
      },
      responseOptions:{
        counters:{
          allCalls:true
        },
        timers:{
          allCallsDuration:true
        }
      }
    }
    function getShortDials(){
      const _ = require('lodash')
      return new Promise((res,rej)=>{
        if (req.params.dataType==1) {
          let w=0
          let fullRange=moment.range(moment.utc(req.params.stdate),moment.min(moment.utc(),moment.utc(req.params.endate)))
          let respData=[]
          function weekChunk(){
            let thisRange=moment.range(moment.utc(req.params.stdate).add(w,'weeks'),moment.utc(req.params.stdate).add(w+1,'weeks'))
            let finalRan=thisRange.intersect(fullRange)
            console.log(w,finalRan)
            if (finalRan) {
              tParams.timeSettings.timeRange.timeFrom=finalRan.start.toISOString()
              tParams.timeSettings.timeRange.timeTo=finalRan.end.toISOString()
              console.log(w,tParams.timeSettings.timeRange)
              let totalPages
              let logs=[]
              let p=1
              asyncDo(resp=>{
                totalPages=resp.paging.totalPages
                respData=respData.concat(resp.data.records)
                console.log(respData.length)
                p++
              },()=>p<=totalPages,()=>{
                return rcPlatform.post("/analytics/calls/v1/accounts/~/timeline/fetch?interval=Hour&page="+p+"&perPage=20",tParams).then(function(resp){
                  console.log("In promise resp",resp.response)
                  return resp.json()
                })
              },()=>{
                w++
                weekChunk()
              },e=>{
                console.log('API error ',e);
              })
            }else {
              let rcDials=respData.map(el=>{
                let obj={id:el.key,ext:el.key,name:el.info.name,dials:0}
                let hourly=_.range(9,21).forEach(hr=>{
                  let d={}
                  let points=el.points.filter(point=>point.counters.allCalls.values>0 && moment(point.time).hour()==hr)
                  let dials=points.reduce((a,b)=>a+Number(b.timers.allCalls.values),0)/points.reduce((a,b)=>a+Number(b.counters.allCalls.values),0)
                  obj[hr]=dials?dials:''
                  obj.dials=obj.dials+Number(obj[hr])
                })
                // console.log(obj)
                return obj
              }).filter(el=>el.dials>0)
              res(rcDials)
            }
          }
          weekChunk()
        }else {
          res([])
        }
      })
    }

    db.query(dialsQ,(err,dialsR)=>{
      if (err) {
        console.log(err)
      }
      let filts=[]
      if (req.query.team!=='0' && req.query.team) {
        filts.push(req.query.team.split(",").map(t=>'a.teamID='+t))
      }
      if (req.query.shift!=='0' && req.query.shift) {
        let s=[]
        if (req.query.shift.indexOf('e')>-1) {
          s.push('isEve=1')
        }
        if (req.query.shift.indexOf('d')>-1) {
          s.push('isnull(isEve,0)<>1')
        }
        filts.push(s)
      }
      let agentQ=`select *,a.ringCentralID extID from
      agents a
      left join agentTeams t on t.agentTeamID=a.teamID
      `+(filts.length>0?' where '+filts.map(f=>"("+f.join(" OR ")+")").join(" AND "):'')
      db.query(agentQ,(err,agentR)=>{
        if (err) {
          console.log(err)
        }
        getShortDials().then(shortDials=>{
          let data=agentR.recordset.map(agent=>{
            let agentDials=dialsR.recordset.filter(dial=>dial.agentID==agent.agentID && dial.shifts>1)
            let sd=shortDials.find(s=>s.id==agent.extID)
            agentDials.forEach((dial, i) => {
              if (req.params.dataType==1) {
                dial.dials=(sd?sd[dial.dialHour]:'')
              }
              agent['dials_'+dial.dialHour]=dial.dials
              agent['shifts_'+dial.dialHour]=dial.shifts
            });
            agent.totalDials=Math.round(agentDials.reduce((a,b)=>a+Number(b.dials),0)/agentDials.length)
            return agent
          })
          data=data.filter(el=>el.totalDials>0)
          res.send(JSON.stringify(data))
        }).catch(e=>{
          console.log(e)
          res.status(500).send({error:e})
        })
      })
    })
  },
  staffReports:(req,res)=>{
    let tlQ=`
    select * from
    staff s
    left join agentTeams t on t.managerID=s.staffID
    where staffLeft is null and staffJobTitleID=8`
    db.query(tlQ,(err,tlR)=>{
      db.query('select * from staff where staffLeft is null and staffJobTitleID in (6,2,5)',(err,cmpmR)=>{
        res.render("staff-reports.ejs",{
          title:"Staff Reports",
          tls:tlR.recordset,
          cmpms:cmpmR.recordset,
          stdate:req.params.stdate!='0'?req.params.stdate:moment().subtract(30,'d').format("YYYY-MM-DD"),
          endate:req.params.endate!='0'?req.params.endate:moment().subtract(1,'d').format("YYYY-MM-DD"),
        })
      })
    })
  },
  opsDigest:(req,res)=>{
    let queries=[]
    queries.push({
      name:'projects',
      query:`
      select table1.jobID,fullJobName,isJobInHouse,jobType,interviewsTarget,isnull(intsDone,0) as intsDone,startDate,endDate,sum(ahr.inputInterviews)/nullif(sum(ahr.inputHours),0) as ahr,(sum(ahr.sales)/sum(ahr.inputHours))-(sum(ahr.pay)/sum(ahr.inputHours)) as hourlyProfit,@hourlyOverheads as hourlyOverheads,salesTD,payTD,overheadsTD,(sum(ahr.sales)/sum(ahr.inputHours)) as salesPH,(sum(ahr.pay)/sum(ahr.inputHours)) as payPH,CPI,isHourly,CM,PM,max(ahr.inputInterviews/nullif(ahr.inputHours,0)) as maxAHR,min(ahr.inputInterviews/nullif(ahr.inputHours,0)) as minAHR,sum(shifts) as shifts
      from
      (select j.jobID,fullJobName,isJobInHouse,case when isJobCATI=1 then 'CATI' when isJobOnline=1 then 'Online' when isJobFace=1 then 'F2F' end as jobType,interviewsTarget,sum(d.inputInterviews)+isnull(WEB_Completes,0)+isnull(F2F_Completes,0) as intsDone,startDate,endDate,case when isHourly=1 then sum(inputHours) else sum(inputInterviews) end * CPI as salesTD,sum(pay) as payTD,sum(inputHours)*@hourlyOverheads as overheadsTD,CPI,isHourly,CM,PM,count(*) as shifts
      from
      DailyInput d
      full outer join Jobs j on j.jobID=d.jobID
      left join ViewJobsStats js on js.jobID=j.jobID
      left join ViewDailyPay p on p.agentID=d.agentID and p.inputDate=d.inputDate and p.jobID=j.jobID
      where cast(getdate() as date) between startDate and endDate and js.jobProjectID>2 and isnull(d.inputDate,dateadd(day,-1,cast(getdate() as date)))<cast(getdate() as date)
      group by j.jobID,fullJobName,interviewsTarget,startDate,endDate,CPI,isHourly,CM,PM,WEB_Completes,F2F_Completes,isJobCATI,isJobOnline,isJobFace,isJobInHouse
      ) table1
      outer apply
          (SELECT top 10 d.inputDate,inputHours,inputInterviews,case when isHourly=1 then inputHours else inputInterviews end * CPI as sales,pay
          FROM      DailyInput d
          left join ViewJobsStats j on j.jobID=d.jobID
          left join ViewDailyPay p on p.agentID=d.agentID and p.inputDate=d.inputDate
          WHERE   d.jobID=table1.jobID and d.inputDate<cast(getdate() as date) and inputHours>3 and p.jobID=d.jobID
          ORDER BY inputDate DESC) ahr
      group by table1.jobID,fullJobName,jobType,interviewsTarget,intsDone,startDate,endDate,salesTD,payTD,overheadsTD,CPI,isHourly,CM,PM,isJobInHouse`
    })
    queries.push({
      name:'staff',
      query:"select staffName,teamupID,staffJobTitleID from staff where staffJobTitleID in (6,5) and staffLeft is null and staffID<>3 and staffID>1"
    })
    queries.push({
      name:"agents",
      query:`
      select a.agentID,agentName,onTarget,coachCount,bookingHours from
      agents a
  	  left join (select agentID,isnull(100*sum(onTarget)/count(*),0) as onTarget from getShiftsOnTarget(dateadd(week,-1,getdate()),getdate()) group by agentID) s on a.agentID=s.agentID
      left join (select count(*) as coachCount,agentID from CoachingNew where coachingType='Coaching' and coachingDate between dateadd(week,-1,getdate()) and getdate() group by agentID) c on c.agentID=a.agentID
      left join (select distinct sum(bookedHours) as bookingHours,agentID from getBookedHours(dateadd(week,-1,getdate()),getdate()) where bookingDate between getdate() and dateadd(week,1,getdate()) group by agentID) b on b.agentID=a.agentID
  	  where onTarget is not null
  	  order by onTarget`
    })
    queries.push({
      name:"resourceNeeded",
      query:`
      select * from ViewResourceNeeded where calcHours>0`
    })
    queries.push({
      name:"resourcePlanned",
      query:`
      SELECT planners.jobID, plannerHours+isnull(plannerHours,0) plannerHours, plannerDate, isJobDay, isJobEve
      from Planners
      left join jobs on Planners.jobID=jobs.jobID
      where plannerDate>=cast(getdate() as date) and jobs.projectID>2 AND Jobs.isJobInHouse = 1 AND Jobs.isJobCATI = 1 and plannerDate<dateadd(week,4,cast(getdate() as date))`
    })
    queries.push({
      name:"bookedHours",
      query:`
      SELECT bookingDate, sum(Hours*isDay) as DayHours, case when bookingDate>DATEADD(week, 1, cast(GETDATE() as date)) then max(forcastHours) else sum(Hours*isEve) end as EveHours
            FROM
            (
            SELECT Booking.bookingDate, DATEDIFF(second, Booking.startTime, Booking.endTime) / 3600.0 as Hours, AgentTeams.isDay, AgentTeams.isEve, absenceType
            FROM (SELECT DISTINCT agentID, startTime, endTime, bookingDate, bookingTeamID FROM Booking) as Booking LEFT JOIN Absence on Absence.agentID=Booking.agentID AND Absence.absenceDate=Booking.bookingDate,
        	Agents, AgentTeams
            WHERE
            Booking.bookingDate BETWEEN cast(GETDATE() as date) AND DATEADD(week, 4, cast(GETDATE() as date))
            AND Booking.agentID=Agents.agentID AND isnull(bookingTeamID,Agents.teamID)=AgentTeams.agentTeamID
            AND isAllocatable=1
            ) as b
      	  left join (
      		select DATEPART(WEEKDAY,bookingDate) as bookingDay,SUM(DATEDIFF(second, b.startTime, b.endTime) / 3600.0)/2 as forcastHours
      		from
      		Booking b
      		left join AgentTeams t on t.agentTeamID=b.bookingTeamID
      		where isEve=1 and bookingDate between DATEADD(week,-2,getdate()) and getdate()
      		group by DATEPART(WEEKDAY,bookingDate)
      	  ) f on f.bookingDay=DATEPART(WEEKDAY,b.bookingDate)
        	WHERE absenceType IS NULL
            GROUP BY bookingDate`
    })
    let params={title:"Ops Digest"}
    let i=0
    db.input('hourlyOverheads',16.16)
    function runQs(){
      if (i<queries.length) {
        db.query(queries[i].query,(err,r)=>{
          if (err) {
            console.log(err)
          }else {
            params[queries[i].name]=r.recordset
          }
          i++
          runQs()
        })
      }else {
        teamupReq.get('/events/',{
          params: {
            startDate:moment().format("YYYY-MM-DD"),
            endDate:moment().add(1,"weeks").format("YYYY-MM-DD"),
          }
        }).then(function(events){
          params.teamUpEvents=events.data.events
          res.render("operations-digest.ejs",params)
        })
      }
    }
    runQs()
  },
  logViewer:(req,res)=>{
    res.render("log-viewer.ejs",{
      title:"Change Logs",
    })
  },
  qcIssuesReport:(req,res)=>{
    let stdate=req.params.stdate!=0?req.params.stdate:currPayPeriodSt
    let endate=req.params.endate!=0?req.params.endate:tdy
    db.query("select * from agentTeams",(err,teamR)=>{
      res.render("qc-issues-report.ejs",{
        title:"QC Advisories",
        stdate:stdate,
        endate:endate,
        teams:teamR.recordset
      })
    })
  },
  getAdvisories:(req,res)=>{
    console.log(req.query)
    let advQ=`
    select issueID,issue,sum(issueCount) as issueCount,(count(*)/cast(count(distinct agentID) as decimal(6,3))) as repScore,100*sum(coachings)/sum(issueCount) as fedBack
    from ViewQCissues
    where dateMonitored between '`+req.query.stdate+`' and '`+req.query.endate+`' `+(req.query.teamID&&req.query.teamID!='0'?'and agentTeamID in ('+req.query.teamID+")":'')+`
    group by issueID,issue
    order by sum(issueCount) DESC
    `
    let detailsQ=`
    select issueID,issue,agentID,agentName,sum(issueCount) as issueCount
    from ViewQCissues
    where dateMonitored between '`+req.query.stdate+`' and '`+req.query.endate+`' `+(req.query.teamID&&req.query.teamID!='0'?'and agentTeamID in ('+req.query.teamID+")":'')+`
    group by issueID,issue,agentID,agentName
    order by sum(issueCount) DESC`
    db.query(advQ,(err,advR)=>{
      if (err) {
        console.log(err)
      }
      db.query(detailsQ,(err,detailsR)=>{
        if (err) {
          console.log(err)
        }
        res.send({
          advisories:advR.recordset,
          details:detailsR.recordset
        })
      })
    })
  },
  getAgentsAdvisories:(req,res)=>{
    let advQ=`
    select agentID,agentName,sum(issueCount) as issueCount,avg(issueCount) as avgIssues,100*sum(coachings)/sum(issueCount) as fedBack
    from ViewQCissues
    where dateMonitored between '`+req.query.stdate+`' and '`+req.query.endate+`' `+(req.query.teamID&&req.query.teamID!='0'?'and agentTeamID in ('+req.query.teamID+")":'')+`
    group by agentID,agentName
    order by sum(issueCount) DESC
    `
    let detailsQ=`
    select issueID,issue,agentID,agentName,sum(issueCount) as issueCount,(count(*)/cast(count(distinct agentID) as decimal(6,3))) as repScore
    from ViewQCissues
    where dateMonitored between '`+req.query.stdate+`' and '`+req.query.endate+`' `+(req.query.teamID&&req.query.teamID!='0'?'and agentTeamID in ('+req.query.teamID+")":'')+`
    group by agentID,agentName,issueID,issue`
    db.query(advQ,(err,advR)=>{
      if (err) {
        console.log(err)
      }
      db.query(detailsQ,(err,detailsR)=>{
        if (err) {
          console.log(err)
        }
        res.send({
          agents:advR.recordset,
          details:detailsR.recordset
        })
      })
    })
  },
  getAdvisory:(req,res)=>{
    let adQ=`
    select agentID,agentName,issueID,issue,sum(issueCount) as issueCount,count(*) as checkCount,100*sum(coachings)/sum(issueCount) as fedBack
    from ViewQCissues
    where dateMonitored between '`+req.query.stdate+`' and '`+req.query.endate+`' and issueID=`+req.query.issueID+` `+(req.query.teamID&&req.query.teamID!='0'?'and agentTeamID in ('+req.query.teamID+")":'')+`
    group by agentID,agentName,issueID,issue
    order by sum(issueCount) DESC`
    let datesQ=`
    select agentID,agentName,sum(issueCount) as issueCount,dateMonitored
    from ViewQCissues
    where dateMonitored between '`+req.query.stdate+`' and '`+req.query.endate+`' and issueID=`+req.query.issueID+` `+(req.query.teamID&&req.query.teamID!='0'?'and agentTeamID in ('+req.query.teamID+")":'')+`
    group by agentID,agentName,dateMonitored`
    db.query(adQ,(err,adR)=>{
      if (err) {
        console.log(err)
      }
      db.query(datesQ,(err,datesR)=>{
        if (err) {
          console.log(err)
        }
        res.send({
          advisory:adR.recordset,
          dates:datesR.recordset
        })
      })
    })
  },
  getAgentAdvisories:(req,res)=>{
    let adQ=`
    select agentID,agentName,issueID,issue,sum(issueCount) as issueCount,100*sum(coachings)/sum(issueCount) as fedBack
    from ViewQCissues
    where dateMonitored between '`+req.query.stdate+`' and '`+req.query.endate+`' and agentID=`+req.query.agentID+`
    group by issueID,issue,agentID,agentName`
    let datesQ=`
    select issueID,issue,dateMonitored,sum(issueCount) as issueCount
    from ViewQCissues
    where dateMonitored between '`+req.query.stdate+`' and '`+req.query.endate+`' and agentID=`+req.query.agentID+`
    group by issueID,issue,dateMonitored`
    db.query(adQ,(err,adR)=>{
      if (err) {
        console.log(err)
      }
      db.query(datesQ,(err,datesR)=>{
        if (err) {
          console.log(err)
        }
        res.send({
          agent:adR.recordset,
          dates:datesR.recordset
        })
      })
    })
  },
  getAdvisoryChecks:(req,res)=>{
    let advQ=`
    select q.qualityControlID,dateMonitored,interviewDate,score as score,recordingID,controllerNotes,u.login as controller,coachingDate,teamName,i.issueCount
    from ViewQCscores q
    left join CoachingNew c on c.qualityControlID=q.qualityControlID or c.coachingID=q.qcCoachID
    left join (select qualityControlID,count(*) as issueCount from QCissues where issueID=`+req.query.issueID+` group by qualityControlID) i on i.qualityControlID=q.qualityControlID
    left join Users u on u.userID=q.userID
    left join agents a on a.agentID=q.agentID
    left join AgentTeams t on t.agentTeamID=a.teamID
    where q.agentID=`+req.query.agentID+` and issueCount>0 and dateMonitored between '`+req.query.stdate+`' and '`+req.query.endate+`'`
    db.query(advQ,(err,advR)=>{
      res.send(advR.recordset)
    })
  },
  advisorySpotlights:(req,res)=>{
    let q=`
    select issueID,issue,agentID,agentName,
    sum(issueCount) as issueCount,
    (count(*)/cast(count(distinct agentID) as decimal(6,3))) as repScore,
    100*sum(case when coachings>0 then 1 else 0 end)/count(*) as fedBack,
    fatal,
    agentJoined
    from ViewQCissues
    where dateMonitored between '`+req.query.stdate+`' and '`+req.query.endate+`' `+(req.query.teamID&&req.query.teamID!='0'?'and agentTeamID in ('+req.query.teamID+")":'')+`
    group by agentID,agentName,issueID,issue,fatal,agentJoined`
    console.log(q)
    db.query(q,(err,r)=>{
      res.send(r.recordset)
    })
  },
  ccKPIs:(req,res)=>{
    let startDate=moment().subtract((moment().month()>4?0:1),'years').set('month',5).startOf('month')
    res.render('cc-kpis.ejs',{
      title:"CC Manager KPIs",
      fromDate:req.params.fromDate==0?startDate.format("YYYY-MM-DD"):req.params.fromDate
    })
  },
  ccKPIdata:(req,res)=>{
    let q=`
    declare @st date = '`+req.query.fromDate+`'
    declare @en date = dateadd(day,-1,getdate())
    select isEve,bookedHours,bookingDate,agentJoined,inputHours,inputDate,pay,sales,score,noShows,sicks,canxs,canxms,b.agentID,o2o.agentID o2oAgentID,isnull(bookingTeamID,teamID) teamID,dbo.tsQTR(bookingDate) qtr
    into ##ccmkpitable
    from
    (
    select distinct agentID,bookingDate,DATEDIFF(second,startTime,endTime)/3600.0 as bookedHours,bookingTeamID from Booking
    ) b
    left join (
    	select agentID,inputDate,sum(Hours) as inputHours,sum(isnull(pay,0)) as pay,sum(sales) as sales
    	from getAgentShifts(@st,@en) d2
    	group by agentID,inputDate
    ) d on d.agentID=b.agentID and b.bookingDate=d.inputDate
    left join agents a on a.agentID=b.agentID
    left join AgentTeams t on t.agentTeamID=isnull(b.bookingTeamID,a.teamID)
    left join (select agentID,interviewDate,0.00+avg(score) as score from ViewQCscores where type='Call' and isFinished=1 group by agentID,interviewDate) qc on qc.agentID=d.agentID and qc.interviewDate=d.inputDate
    left join (select agentID from AgentOne2ones where o2odate between @st and @en group by agentID) o2o on o2o.agentID=b.agentID
    left join (
    	select distinct agentID,absenceDate,1.00 as noShows
    	from
    	Absence
    	where absenceType='No show'
    	group by agentID,absenceDate
    	) ns on ns.absenceDate=b.bookingDate and ns.agentID=b.agentID
    left join (
    	select distinct agentID,absenceDate,1.00 as sicks
    	from
    	Absence
    	where absenceType='Sick'
    	group by agentID,absenceDate
    	) sk on sk.absenceDate=b.bookingDate and sk.agentID=b.agentID
    left join (
    	select distinct agentID,absenceDate,1.00 as canxs
    	from
    	Absence
    	where absenceType='Cancelled by agent'
    	group by agentID,absenceDate
    	) cx on cx.absenceDate=b.bookingDate and cx.agentID=b.agentID
    left join (
    	select distinct agentID,absenceDate,1.00 as canxms
    	from
    	Absence
    	where absenceType='Cancelled by manager'
    	group by agentID,absenceDate
    	) cm on cm.absenceDate=b.bookingDate and cm.agentID=b.agentID
    where bookingDate between @st and @en and bookedHours>0 and isAllocatable=1

    ALTER TABLE ##ccmkpitable
    ADD daysEmployed as datediff(day,agentJoined,bookingDate)
    CREATE INDEX ix_daysEmployed
    ON ##ccmkpitable(daysEmployed)

    select
    isnull(isEve,0) isEve,
    sum(bookedHours-isnull(inputHours,0))/nullif(sum(bookedHours),0) as percLost,
    (0.00+count(*)-count(inputDate))/count(*) as percShiftsLost,
    sum(pay)/nullif(sum(sales),0) as cont,
    avg(score) as avgScore,
    sum(noShows)/count(*) as percNoShow,
    sum(sicks)/count(*) as percSick,
    sum(canxs)/count(*) as percCanx,
    sum(canxms)/count(*) as percCanxM,
    ((0.00000+count(*)-count(inputDate))-(sum(noShows)+sum(sicks)+sum(canxs)+sum(canxms)))/count(*) as missedEntries,
    (0.00+count(distinct o2oagentID))/nullif(count(distinct agentID),0) o2os,
    teamID,
    case
    	when daysEmployed <7 then '<7'
    	when daysEmployed between 7 and 31 then '7-31'
    	when daysEmployed between 32 and 90 then '32-90'
    	when daysEmployed >90 then '90+'
    end daysEmployed,
    qtr
    from
    ##ccmkpitable
    group by grouping sets(
    	(isnull(isEve,0),qtr),
    	(teamID,case
      	when daysEmployed <7 then '<7'
      	when daysEmployed between 7 and 31 then '7-31'
      	when daysEmployed between 32 and 90 then '32-90'
      	when daysEmployed >90 then '90+'
      end)
    )

    drop table ##ccmkpitable`
    db.batch(q,(err,r)=>{
      if (err) {
        console.log(err)
      }
      res.send({
        shifts:r.recordset.filter(el=>el.teamID==null),
        teams:r.recordset.filter(el=>el.teamID!=null)
      })
    })
  },
  digestData:(req,res)=>{
    req.params.stDate=moment.min(moment(req.params.stDate),moment().subtract(1,'d')).format("YYYY-MM-DD")
    req.params.enDate=moment.min(moment(req.params.enDate),moment().subtract(1,'d')).format("YYYY-MM-DD")
    req.query.stDate=moment.min(moment(req.query.stDate),moment().subtract(1,'d')).format("YYYY-MM-DD")
    req.query.enDate=moment.min(moment(req.query.enDate),moment().subtract(1,'d')).format("YYYY-MM-DD")
    let queries={}
    queries.interviews=`
    select grouping(method) grpmethod,method,SUM(inputInterviews) interviews,SUM(inputHours) hours,COUNT(distinct jobID) projects
    from ViewAllDailyInput
    where inputDate between @st and @en
    group by GROUPING sets(
    	(method),
    	()
    )`
    queries.coaching=`
    select GROUPING(c.agentID) grpagent,GROUPING(staffName) grpstaff,GROUPING(coachingType) grptype,
    c.agentID,agentName,s.staffID,staffName,coachingType,
    COUNT(*) coachings,sum(advisories) advisories,avg(case when shiftsAfter>0 then beforeCoaching end) beforeCoaching,avg(case when shiftsAfter>0 then afterCoaching end) afterCoaching,sum(shiftsBefore) shiftsBefore,sum(shiftsAfter) shiftsAfter from
    CoachingNew c
    outer apply (
    	select (0.00+COUNT(onTarget))/nullif(COUNT(*),0) beforeCoaching,MIN(inputDate) beforeFrom,COUNT(*) shiftsBefore from (
    		select top 5 onTarget,inputDate
    		from getShiftsOnTarget(dateAdd(day,-10,@st),@en)
    		where agentID=c.agentID and inputDate<c.coachingDate and c.coachingType='Coaching'
    		order by inputDate desc
    		) s
    	having COUNT(*)>0
    ) b
    outer apply (
    	select (0.00+COUNT(onTarget))/nullif(COUNT(*),0) afterCoaching,MAX(inputDate) afterUntil,COUNT(*) shiftsAfter from (
    		select top 5 onTarget,inputDate
    		from getShiftsOnTarget(@st,dateAdd(day,10,@en))
    		where agentID=c.agentID and inputDate>c.coachingDate and c.coachingType='Coaching'
    		order by inputDate asc
    		) s
    	having COUNT(*)>0
    ) a
    left join Agents ag on ag.agentID=c.agentID
    left join Staff s on s.staffID=c.staffID
	left join (select coachingID,COUNT(*) advisories from CoachingIssues group by coachingID) ad on ad.coachingID=c.coachingID
    where coachingDate between @st and @en
    GROUP BY
        GROUPING SETS (
			(c.agentID, agentName,s.staffID,staffName,coachingType),
            (c.agentID, agentName,s.staffID,staffName),
            (s.staffID,staffName,coachingType),
            (s.staffID,staffName),
            ()
    );`
    queries.cont=`
    select GROUPING(agentName) grpagent,GROUPING(jobName) grpjob,GROUPING(inputDate) grpdate,s.agentID,agentName,j.jobID,jobName,inputDate,SUM(Hours) hrs,SUM(ints) ints,SUM(pay) pay,SUM(sales) sales,SUM(pay)/nullif(sum(sales),0) cont from
    getAgentShifts(@st,@en) s
    left join Agents a on a.agentID=s.agentID
	left join viewJobFullName j on j.jobID=s.jobID
  where a.agentID not in (`+freeAgents.join(",")+`)
    GROUP BY GROUPING SETS (
  		(inputDate),
		(inputDate,j.jobID,jobName),
  		(inputDate,agentName,s.agentID,j.jobID,jobName)
  	)
    order by inputDate asc`
    queries.attendance=`
    select GROUPING(agentName) grpagent,GROUPING(absenceType) grpabsence,GROUPING(bookingWeek) grpweek,GROUPING(bookingMonth) grpmonth,b.agentID,agentName,absenceType,bookingWeek,bookingMonth,(0.00+COUNT(workedHours))/COUNT(bookedHours) shiftsWorked,COUNT(*) shifts
    from (select *,dbo.startOfWeek(bookingDate) bookingWeek,format(bookingDate,'MMM-yy') bookingMonth from getBookedHours(@st,@en)) b
    left join Absence a on a.absenceDate=b.bookingDate and a.agentID=b.agentID
    left join Agents ag on ag.agentID=b.agentID
    left join AgentTeams t on t.agentTeamID=b.bookingTeamID
    group by GROUPING sets(
		(),
		(bookingMonth),
    	(bookingWeek),
		(bookingWeek,absenceType),
		(bookingWeek,absenceType,agentName,b.agentID)
    )
    order by bookingWeek asc`
    queries.attendanceShift=`
    select GROUPING(agentName) grpagent,GROUPING(t.isEve) grpshift,GROUPING(isnull(absenceType,'Worked')) grpabsence,GROUPING(bookingWeek) grpweek,b.agentID,agentName,t.isDay,t.isEve,isnull(absenceType,'Worked') absenceType,bookingWeek,(0.00+SUM(isnull(workedHours,0)))/SUM(isnull(appliedHours,0)) hoursWorked,SUM(isnull(appliedHours,0)) appliedHours,
    (0.00+SUM(case when absenceType='Sick' then isnull(appliedHours,0) else 0 end))/SUM(isnull(appliedHours,0)) hoursSick,
    (0.00+SUM(case when absenceType='No show' then isnull(appliedHours,0) else 0 end))/SUM(isnull(appliedHours,0)) hoursNoShow,
    (0.00+SUM(case when absenceType='Cancelled by agent' then isnull(appliedHours,0) end))/SUM(isnull(appliedHours,0)) hoursCanx
        from (select *,dbo.startOfWeek(bookingDate) bookingWeek from getBookedHours(@st,@en)) b
        left join Absence a on a.absenceDate=b.bookingDate and a.agentID=b.agentID
        left join Agents ag on ag.agentID=b.agentID
        left join (select agentTeamID,nullif(isDay,0) isDay,nullif(isEve,0) isEve from AgentTeams) t on t.agentTeamID=b.bookingTeamID
        where bookedHours>0 and isnull(absenceType,'Worked') not in ('Cancelled by manager','Paid leave')
        group by GROUPING sets(
    		(),
    		(t.isEve,t.isDay),
    		(t.isEve,t.isDay,agentName,b.agentID),
        	(bookingWeek,t.isEve,t.isDay),
    		(bookingWeek,t.isEve,t.isDay,isnull(absenceType,'Worked')),
    		(bookingWeek,t.isEve,t.isDay,isnull(absenceType,'Worked'),agentName,b.agentID)
        )
        order by bookingWeek asc`
    queries.sales=`
    select GROUPING(costTypeName) grpcost,GROUPING(endDate) grpdate,GROUPING(qtr) grpqtr,GROUPING(quoteName) grpjob,endDate,costTypeName,c.costTypeID,qtr,quoteNo,quoteName,sum(unitValue*units) sales from
    ProjectCosts c
    left join CostTypes t on t.costTypeID=c.costTypeID
    left join Projects p on p.projectID=c.projectID
    left join Quotes q on q.quoteID=p.quoteID
    left join (select MAX(endDate) endDate,dbo.tsQTR(MAX(endDate)) qtr,projectID from Jobs group by projectID) j on j.projectID=c.projectID
    where endDate between @st and @en and endDate<cast(GETDATE() as date)
    group by GROUPING sets(
    (),
    (endDate),
    (qtr),
    (costTypeName,c.costTypeID,qtr),
    (costTypeName,c.costTypeID,qtr,quoteNo,quoteName)
    )`
    queries.qcChecks=`
    select GROUPING(q.type) grptype,GROUPING(staffName) grpstaff,GROUPING(agentName) grpcheck,q.type,staffName,agentName,jobName,avg(0.00+score) score,COUNT(*) qcCount from
    ViewQCscores q
    left join Agents a on q.agentID=a.agentID
    left join ViewJobFullName j on j.jobID=q.jobID
    left join Users u on u.userID=q.userID
    left join Staff s on s.staffID=u.staffID
    where dateMonitored between @st and @en and isFinished=1
    group by GROUPING sets(
    (),
    (q.type),
    (q.type,staffName,q.userID),
    (q.type,staffName,q.userID,agentName,jobName)
    )`
    queries.qcScores=`
    select GROUPING(agentName) grpagent,GROUPING(jobName) grpjob,GROUPING(wk) grpwk,GROUPING(interviewDate) grpdate,interviewDate,wk,q.agentID,agentName,jobName,avg(0.00+score) score,COUNT(*) qcCount from
    (select *,dbo.startOfWeek(interviewDate) wk from ViewQCscores where dateMonitored between @st and @en and isFinished=1 and type='Call') q
    left join Agents a on q.agentID=a.agentID
    left join ViewJobFullName j on j.jobID=q.jobID
    group by GROUPING sets(
    (),
    (wk),
    (wk,agentName,q.agentID),
    (wk,interviewDate,agentName,q.agentID,jobName)
    )
    order by interviewDate,wk`
    queries.hourlyAHR=`
    select
    grouping(isJobBusiness) grpaudience,grouping(r.reportHour) grphour,grouping(r.jobID) grpjob,grouping(r.agentID) grpagent,
    r.reportHour,isJobBusiness,isJobConsumer,r.jobID,n.jobName,r.agentID,agentName,sum(cast(isnull(e.hourWorked,r.hourWorked) as int)) hoursWorked,
    isnull(jt.hourlyTarget,j.hourlyTarget) hourlyTarget,
    avg((0.00+isnull(e.inputInterviews,r.inputInterviews))/nullif(cast(isnull(e.hourWorked,r.hourWorked) as int),0)) ahr,
    avg(((0.00+isnull(e.inputInterviews,r.inputInterviews))/nullif(cast(isnull(e.hourWorked,r.hourWorked) as int),0))-isnull(jt.hourlyTarget,j.hourlyTarget)) diff,
    avg((((0.00+isnull(e.inputInterviews,r.inputInterviews))/nullif(cast(isnull(e.hourWorked,r.hourWorked) as int),0))-isnull(jt.hourlyTarget,j.hourlyTarget))/isnull(jt.hourlyTarget,j.hourlyTarget)) diffWeighted
    from
    AskiaLiveReports r
    left join AskiaLiveReportsEdits e on e.agentID=r.agentID and e.jobID=r.jobID and e.reportDate=r.reportDate and e.reportHour=r.reportHour
    left join Jobs j on j.jobID=r.jobID
    left join ViewJobFullName n on n.jobID=j.jobID
    left join Agents a on a.agentID=r.agentID
    outer apply
    (select top 1 * from PastJobTargets p where p.dateUntil>r.reportDate and p.jobID=r.jobID
    ) jt
    where isnull(jt.hourlyTarget,j.hourlyTarget)>0 and r.reportDate between @st and @en
    group by GROUPING sets(
    	(r.reportHour),
    	(isJobBusiness,isJobConsumer,r.reportHour),
    	(isJobBusiness,isJobConsumer,r.reportHour,r.jobID,n.jobName,isnull(jt.hourlyTarget,j.hourlyTarget)),
    	(isJobBusiness,isJobConsumer,r.reportHour,r.jobID,n.jobName,isnull(jt.hourlyTarget,j.hourlyTarget),r.agentID,agentName)
    )
    order by r.reportHour`
    queries.taskAudits=`
    select GROUPING(staffName) grpstaff,GROUPING(taskName) grptask,GROUPING(plannerGroup) grpjob,taskName,plannerGroup,staffName,dueDate,doneDate,1-((0.00+COUNT(a.doneDate))/COUNT(a.taskID)) taskOverduePerc,(0.00+COUNT(a.doneDate))/COUNT(a.taskID) taskDonePerc,COUNT(a.doneDate) taskDoneCnt,COUNT(a.taskID) taskCnt
    from projectTaskAudits a
    left join PlannerTasks t on t.taskID=a.taskID
    left join Projects p on p.projectID=a.projectID
    left join Staff s on s.staffID=case when isTaskCM is null then p.projectDP else p.projectCM end
    where dueDate between @st and @en and dueDate<cast(getDate() as date) and plannerGroup is not null and staffName is not null
    group by GROUPING sets(
    	(),
    	(staffName),
    	(staffName,plannerGroup),
      (staffName,plannerGroup,taskName,dueDate,doneDate)
    )`
    let thisDb=new sql.Request();
    thisDb.input('st',new Date(req.query.stDate))
    thisDb.input('en',new Date(req.query.enDate))
    let reqQueries=req.query.queries?req.query.queries:Object.keys(queries)
    let q=reqQueries.map(q=>queries[q]?queries[q]:'select 0').join(";")
    thisDb.multiple=true
    thisDb.query(q,(err,r)=>{
      if (err) {
        res.status(500).send({error:err})
      }else {
        let x=0
        let resp={}
        function addResp(){
          if (reqQueries[x]) {
            resp[reqQueries[x]]=r.recordsets[x]
            x++
            addResp()
          }else {
            res.send(resp)
          }
        }
        addResp()
      }
    })
  },
  quotesReport:(req,res)=>{
    res.render('quotes-report.ejs',{
      title:"Quotes Report",
      stdate:req.params.stdate,
      endate:req.params.endate,
    })
  },
  quotesReportData:(req,res)=>{
    console.log(req.query)
    let filt=""
    if (req.query.client) {
      filt=filt+" and q.clientID in ("+req.query.client.join(",")+")"
    }
    let chaseWordsQ=`
    select
    GROUPING(quoteNo) grpjob,GROUPING(Keywords) grpwords,
    quoteNo,quoteName,chaseOutcome,Keywords,COUNT(*) KeyWordCount from
    (select distinct quoteID,Keywords from ViewQuoteChaseKeywords)  k
    left join viewQuotes q on q.quoteID=k.quoteID
    where k.quoteID in (select quoteID from quotes q where quoteDate between @qrst and @qren `+filt+`) and outcomeCount=1
    group by GROUPING sets(
      (quoteNo,quoteName,q.chaseOutcome),
    	(Keywords)
    )
    `
    let chaseQ=`
    select GROUPING(quoteNo) grpjob,GROUPING(q.chaseOutcome) grpoutcome,
      quoteNo,quoteName,q.chaseOutcome,COUNT(*) jobCount,outcomeCount,clientName,contactName,contactEmail,chased
  	from
  	viewQuotes q
  	where q.chaseOutcome is not null and quoteDate between @qrst and @qren `+filt+`
  	group by GROUPING sets(
    		(q.chaseOutcome),
      	(quoteNo,quoteName,q.chaseOutcome,outcomeCount,clientName,contactName,contactEmail,chased)
      )`
    let statsQ=(method)=>`
    select
    GROUPING(qtr) grpqtr,GROUPING(mnth) grpmonth,GROUPING(quoteNo) grpjob,grouping(clientName) grpclient,grouping(isChased) grpchased,grouping(contactName) grpcontact,
    qtr,
    mnth,
    quoteNo,quoteName,clientName,contactName,quoteDate,commissionDate,chaseOutcome,chased,isChased,
    COUNT(*) quoted,
    COUNT(projectID) commissioned,
    COUNT(chased) chasedCount,
    COUNT(chaseOutcome) responded,
    (0.00+COUNT(chaseOutcome))/nullif(count(chased),0) responseRate,
    (0.00+COUNT(projectID))/nullif(count(*),0) commissionRate,
    avg(0.00+DATEDIFF(day,quoteDate,commissionDate)) daysToCommission
    from
    (select *,dbo.tsQTR(quoteDate) qtr,FORMAT(quoteDate,'MMM') mnth,YEAR(quoteDate) ySort,MONTH(quoteDate) mSort,case when chased is not null and (commissionDate is null or commissionDate>dateAdd(week,3,quoteDate)) then 1 else 0 end isChased from Quotes) q
    left join Projects p on p.quoteID=q.quoteID
    left join Clients c on c.clientID=q.clientID
    left join Contacts cn on cn.contactID=q.contactID
    where `+method+`=1 and quoteDate between @qrst and @qren `+filt+`
    group by GROUPING sets (
      (),
      (isChased),
    	(qtr,ySort),
      (clientName),
      (clientName,contactName,contactEmail),
      (quoteNo,quoteName,clientName,contactName,contactEmail,quoteDate,commissionDate,chased,chaseOutcome),
    	(qtr,mnth,ySort,mSort),
      (qtr,mnth,ySort,mSort,quoteNo,quoteName,clientName,contactName,contactEmail,quoteDate,commissionDate,chased,chaseOutcome)
    )
    order by ySort,mSort,qtr
    `
    db.input('qrst',new Date(req.query.stDate))
    db.input('qren',new Date(req.query.enDate))
    let methods=['1','isQuoteAsCATI','isQuoteAsOnline','isQuoteAsFace','isQuoteAsRecruitment']
    let labels=['Total','CATI','Online','F2F','Recruit']
    function getStats(){
      let stats={}
      return new Promise((res,rej)=>{
        let s=0
        function doLoop(){
          if (methods[s]) {
            db.query(statsQ(methods[s]),(err,r)=>{
              if (err) {
                console.log(err)
                stats[labels[s]]=[]
              }else {
                stats[labels[s]]=r.recordset
              }
              s++
              doLoop()
            })
          }else {
            res(stats)
          }
        }
        doLoop()
      })
    }
    getStats().then(stats=>{
      db.query(chaseWordsQ,(err,chaseWordsR)=>{
        db.query(chaseQ,(err,chaseR)=>{
          res.send({
            stats:stats,
            chaseWords:chaseWordsR.recordset,
            chaseOutcomes:chaseR.recordset
          })
        })
      })
    })
  }
}
