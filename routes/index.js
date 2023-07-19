const express = require('express');
//const user_check = require('./usercheck');
const nodeMailer = require('nodemailer');
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

Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

module.exports = {

  getFeedbackPage: (req, res) => {
    res.render('feedback-form.ejs',{
      name: req.user.uName,
      title: 'Send feedback or report a bug',
      message: ''
    });
  },

  submitFeedback: (req, res) => {
    let name = req.user.uName;
    let page = req.params.page;
    let issue = req.body.feedback;
    let mailOptions = {
      to: 'reports@teamsearchmr.co.uk',
      subject: 'Job analysis 2 - Error reported',
      html: '<p>' + name + ' has reported an issue on page ' + page + ': ' + issue + '<br/>' + footer + '</p>'
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return console.log(error);
      }

    });
    logger.info(name+" has reported an issue on page "+page+": "+issue)
    console.log(name+" has reported an issue on page "+page+": "+issue)
    res.render('feedback-form.ejs',{
      title: 'Send feedback or report a bug',
      message: 'Feedback sent'
    });
  },

  getProjectPage: (req, res) => {
    let projStatus = req.params.id;
    let cmpmQ = `SELECT * from staff where staffJobTitleID IN (5,6,2) ORDER BY staffName`
    let clientQ = `SELECT * from clients ORDER BY clientName`
    db.query(cmpmQ, (err, cmpmR) => {
      db.query(clientQ, (err, clientR) => {
        res.render('index.ejs', {
          title: "Project Overview"
          ,cmpm:cmpmR.recordset
          ,clients:clientR.recordset
          ,message: ""
        });
      });
    });
  },
  getLiveProject: (req, res) => {
    res.render('live-index.ejs', {
      title: "Live projects",
      staffFilter:req.query.staff
    });
  },
  allIndex: (req, res) => {
    res.render('all-index.ejs', {
      title: "All projects",
      staffFilter:req.query.staff
    });
  },
  getAllProjects:(req,res)=>{
    req.query.size=Number(req.query.size)
    req.query.page=Number(req.query.page)
    let sort
    let projectQ=`
    select *
    from
    (
    select p.projectID,q.quoteID, quoteNo, quoteName, clientName, CM.staffName CM, PM.staffName PM
    FROM Quotes q
    left join Projects p on q.quoteID=p.quoteID
    left join Clients c on c.clientID=q.clientID
    LEFT JOIN Staff CM ON CM.staffID=p.projectCM AND CM.staffID>1
    LEFT JOIN Staff PM ON PM.staffID=p.projectDP AND PM.staffID>1
    ) pr
    left join (
      select projectID,AVG(j.hourlyTarget) targetAHR,AVG(j.timedLOI) timedLOI,AVG(j.expectedLOI) expectedLOI,min(startDate) as startDate, max(endDate) as endDate, max(dataDate) as dataDate, max(tablesDate) as tablesDate, sum(interviewsTarget) as interviewsTarget, sum(isnull(d.ints,0)+isnull(f.ints,0)+isnull(o.ints,0)) as ints,sum(d.ints) catiInts,sum(isnull(d.hrs,0)+isnull(f.hrs,0)+isnull(o.hrs,0)) hrs,max(cast(j.isJobEve as int)) as hasEve, max(cast(j.isJobDay as int)) as hasDay, max(cast(j.isJobFace as int)) as hasFace, min(cast(j.isJobInHouse as int)) as hasOut, max(cast(j.isJobHourly as int)) as hasHourly, max(cast(j.isJobOnline as int)) as hasOnline,sum(qcCount) as qcCount,SUM(isnull(d.pay,0)+isnull(f.pay,0)+isnull(o.pay,0)) pay,SUM(CPInew*case when j.isJobHourly=1 then isnull(d.hrs,0)+isnull(f.hrs,0)+isnull(o.hrs,0) else isnull(d.ints,0)+isnull(f.ints,0)+isnull(o.ints,0) end) sales
      from
    	Jobs j
    	left join (
    		select SUM(inputHours) hrs,SUM(inputInterviews) ints,SUM(inputInterviews)/nullif(SUM(inputHours),0) ahr,sum(payrate*inputHours) pay,jobID from
    		DailyInput d
    		cross apply (select * from getPayRates(d.inputDate,d.inputDate) p where p.agentID=d.agentID) p
    		group by jobID
    	) d on d.jobID=j.jobID
    	left join ViewJobsStats s on s.jobID=j.jobID
    	left join (select COUNT(*) qcCount,jobID from QualityControl where isFinished=1 group by jobID) qc on qc.jobID=j.jobID
    	left join (
    		select count(*) hrs,SUM(inputInterviews) ints,sum(payrate*case when isPaidByDay=1 then 1 else inputInterviews end) pay,jobID
    		from FaceDailyInput d
    		left join FaceAllocations a on d.allocationID=a.allocationID
    		group by jobID
    	) f on f.jobID=j.jobID
    	left join (
    		select SUM(isnull(s.units,0)) hrs,SUM(isnull(s.units,0)) ints,SUM(isnull(s.unitValue*s.units,0))+SUM(isnull(f.unitValue*f.units,0)) pay,a.jobID from
    		OnlineAllocations a
    		left join ProjectSpends s on s.spendID=a.spendID
    		left join ProjectSpends f on f.spendID=a.setupFeeID
    		group by a.jobID
    	) o on o.jobID=j.jobID
    	group by projectID
    ) jx on jx.projectID=pr.projectID
    order by quoteID
    OFFSET (`+((req.query.size*req.query.page)-req.query.size)+`) ROWS FETCH NEXT (`+req.query.size+`) ROWS ONLY
    `
    let jobQ=`
    select *
    from
    (
    select p.projectID,q.quoteID, quoteNo, quoteName, clientName, CM.staffName CM, PM.staffName PM
    FROM Quotes q
    left join Projects p on q.quoteID=p.quoteID
    left join Clients c on c.clientID=q.clientID
    LEFT JOIN Staff CM ON CM.staffID=p.projectCM AND CM.staffID>1
    LEFT JOIN Staff PM ON PM.staffID=p.projectDP AND PM.staffID>1
    order by quoteID
    OFFSET (`+((req.query.size*req.query.page)-req.query.size)+`) ROWS FETCH NEXT (`+req.query.size+`) ROWS ONLY
    ) pr
    left join (
      select projectID,AVG(j.hourlyTarget) targetAHR,AVG(j.timedLOI) timedLOI,AVG(j.expectedLOI) expectedLOI,min(startDate) as startDate, max(endDate) as endDate, max(dataDate) as dataDate, max(tablesDate) as tablesDate, sum(interviewsTarget) as interviewsTarget, sum(isnull(d.ints,0)+isnull(f.ints,0)+isnull(o.ints,0)) as ints,sum(d.ints) catiInts,sum(isnull(d.hrs,0)+isnull(f.hrs,0)+isnull(o.hrs,0)) hrs,max(cast(j.isJobEve as int)) as hasEve, max(cast(j.isJobDay as int)) as hasDay, max(cast(j.isJobFace as int)) as hasFace, min(cast(j.isJobInHouse as int)) as hasOut, max(cast(j.isJobHourly as int)) as hasHourly, max(cast(j.isJobOnline as int)) as hasOnline,sum(qcCount) as qcCount,SUM(isnull(d.pay,0)+isnull(f.pay,0)+isnull(o.pay,0)) pay,SUM(CPInew*case when j.isJobHourly=1 then isnull(d.hrs,0)+isnull(f.hrs,0)+isnull(o.hrs,0) else isnull(d.ints,0)+isnull(f.ints,0)+isnull(o.ints,0) end) sales
      from
    	Jobs j
    	left join (
    		select SUM(inputHours) hrs,SUM(inputInterviews) ints,SUM(inputInterviews)/nullif(SUM(inputHours),0) ahr,sum(payrate*inputHours) pay,jobID from
    		DailyInput d
    		cross apply (select * from getPayRates(d.inputDate,d.inputDate) p where p.agentID=d.agentID) p
    		group by jobID
    	) d on d.jobID=j.jobID
    	left join ViewJobsStats s on s.jobID=j.jobID
    	left join (select COUNT(*) qcCount,jobID from QualityControl where isFinished=1 group by jobID) qc on qc.jobID=j.jobID
    	left join (
    		select count(*) hrs,SUM(inputInterviews) ints,sum(payrate*case when isPaidByDay=1 then 1 else inputInterviews end) pay,jobID
    		from FaceDailyInput d
    		left join FaceAllocations a on d.allocationID=a.allocationID
    		group by jobID
    	) f on f.jobID=j.jobID
    	left join (
    		select SUM(isnull(s.units,0)) hrs,SUM(isnull(s.units,0)) ints,SUM(isnull(s.unitValue*s.units,0))+SUM(isnull(f.unitValue*f.units,0)) pay,a.jobID from
    		OnlineAllocations a
    		left join ProjectSpends s on s.spendID=a.spendID
    		left join ProjectSpends f on f.spendID=a.setupFeeID
    		group by a.jobID
    	) o on o.jobID=j.jobID
    	group by j.jobID,j.projectID
    ) jx on jx.projectID=pr.projectID
    `
    let pageQ=`select count(*)/`+req.query.size+` lastPage from quotes`
    db.multiple=true
    console.log(req.query)
    db.query(projectQ+pageQ,(err,r)=>{
      if (err) {
        console.log(err)
        res.status(500).send({error:err})
      }
      res.send({
        view:req.query.view,
        data:{
          projects:r.recordsets[0],
          jobs:[],
        },
        last_page:r.recordsets[1][0].lastPage+1,
      })
    })
  },
  getLiveJobs: (req, res) => {
    let jobQ=`
    SELECT Jobs.jobID, Jobs.jobName, Jobs.projectID, Quotes.quoteID, Quotes.quoteNo, Quotes.quoteName, Clients.clientName, CM.staffName as CM, PM.staffName as PM, min(jobs.startDate) as startDate, max(jobs.endDate) as endDate, max(jobs.dataDate) as dataDate, max(jobs.tablesDate) as tablesDate, sum(Jobs.interviewsTarget) as interviewsTarget, sum(CASE WHEN Jobs.isJobHourly=1 THEN isnull(Hrs,0)+isnull(F2F_Shifts,0) ELSE isnull(WEB_Completes,0)+isnull(CATI_Completes,0)+isnull(F2F_Completes,0) END) as ints, isnull(sum(ViewDailyPay.Pay),0)+isnull(sum(web.spend),0) as pay, isnull(sum(CASE WHEN Jobs.isJobHourly=1 THEN isnull(Hrs,0)+isnull(F2F_Shifts,0) ELSE isnull(Ints,0)+isnull(WEB_Completes,0)+isnull(F2F_Completes,0) END*ViewJobsStats.CPI),0) as sales, max(cast(Jobs.isJobEve as int)) as hasEve, max(cast(Jobs.isJobDay as int)) as hasDay, max(cast(Jobs.isJobFace as int)) as hasFace, CASE WHEN min(cast(Jobs.isJobInHouse as int))=0 THEN 1 ELSE 0 END as hasOut, max(cast(Jobs.isJobHourly as int)) as hasHourly, max(cast(Jobs.isJobOnline as int)) as hasOnline, DATEDIFF(day,min(jobs.startDate),max(jobs.endDate)) as fwPeriod, cast(sum(qcCount) as float) as qcCount,cast(nullif(SUM(CATI_Completes),0) as float) as catiInts,r.ahr,max(todayHours) todayHours,dbo.workingDaysBetween(Jobs.startdate,Jobs.endDate) fieldDays,dbo.workingDaysBetween(case when Jobs.startDate>getdate() then cast(getdate() as date) else Jobs.startDate end,case when Jobs.endDate>getdate() then cast(getdate() as date) else Jobs.endDate end) daysDone into ##liveJobs
        from
        Jobs
        LEFT JOIN Projects ON Projects.projectID=Jobs.projectID
        LEFT JOIN Quotes ON Quotes.QuoteID=Projects.quoteID
        LEFT JOIN Staff CM ON CM.staffID=Projects.projectCM AND CM.staffID>1
        LEFT JOIN Staff PM ON PM.staffID=Projects.projectDP AND PM.staffID>1
        LEFT JOIN ViewJobsStats ON ViewJobsStats.jobID=Jobs.jobID
        left join ViewResourceNeeded r on r.jobID=Jobs.jobID
        left join (select jobID, count(*) as qcCount from qualityControl group by jobID) q on q.jobID=Jobs.jobID
        LEFT JOIN (SELECT sum(Pay) as Pay, sum(Ints) as Ints, sum(Hours) as Hrs, jobID from ViewDailyPay where inputDate<cast(getdate() as date) group by jobID) ViewDailyPay ON ViewDailyPay.jobID=Jobs.jobID
    		left join (select jobID,sum(unitValue*units) as spend from ProjectSpends where typeID=3 group by jobID) web on web.jobID=Jobs.jobID
        LEFT JOIN Clients ON Clients.clientID=Quotes.clientID
        where isProjectLive=1 AND Jobs.projectID>2
        group by
        Jobs.jobID, Jobs.jobName,Jobs.startDate,Jobs.endDate, Jobs.projectID, Quotes.quoteID, Quotes.quoteNo, Quotes.quoteName, Clients.clientName, CM.staffName, PM.staffName,r.ahr
    SELECT *,(interviewsTarget/nullif(fieldDays,0))*daysDone shouldBe,((interviewsTarget-ints)/nullif(ahr,0))/nullif(fieldDays-daysDone,0) hoursPerDay FROM ##liveJobs`
    let projectQ=`
    SELECT projectID, quoteID, quoteNo, quoteName, clientName, CM, PM, min(startDate) as startDate, max(endDate) as endDate, max(dataDate) as dataDate, max(tablesDate) as tablesDate, sum(interviewsTarget) as interviewsTarget, sum(Ints) as ints,  isnull(sum(Pay),0) as pay, isnull(sum(sales),0) as sales, max(hasEve) as hasEve, max(hasDay) as hasDay, max(hasFace) as hasFace, min(hasOut) as hasOut, max(hasHourly) as hasHourly, max(hasOnline) as hasOnline, DATEDIFF(day,min(startDate),max(endDate)) as fwPeriod,sum(qcCount) as qcCount,sum(catiInts) as catiInts,avg(0.00+ahr) ahr,sum(todayHours) todayHours,sum((interviewsTarget/nullif(fieldDays,0))*daysDone) shouldBe,sum(((interviewsTarget-ints)/nullif(ahr,0))/nullif(fieldDays-daysDone,0)) hoursPerDay,max(daysDone) daysDone
    FROM ##liveJobs group by projectID, quoteID, quoteNo, quoteName, clientName, CM, PM
    DROP TABLE ##liveJobs`
    let dailyQ=`
    SELECT Jobs.jobID, Jobs.jobName, Jobs.projectID, inputDate, isnull(sum(ViewDailyPay.Pay),0) as pay, isnull(sum(CASE WHEN Jobs.isJobHourly=1 THEN Hrs ELSE Ints END*ViewJobsStats.CPI),0) as sales, Jobs.isJobEve, Jobs.isJobDay, CASE WHEN (sum(ViewDailyPay.Pay)/nullif(sum(CASE WHEN Jobs.isJobHourly=1 THEN Hrs ELSE Ints END*ViewJobsStats.CPI),0)>0.35 AND Jobs.isJobEve=1) OR (sum(ViewDailyPay.Pay)/nullif(sum(CASE WHEN Jobs.isJobHourly=1 THEN Hrs ELSE Ints END*ViewJobsStats.CPI),0)>0.40 AND Jobs.isJobDay=1) OR (sum(ViewDailyPay.Pay)/nullif(sum(CASE WHEN Jobs.isJobHourly=1 THEN Hrs ELSE Ints END*ViewJobsStats.CPI),0)>0.50 AND Jobs.isJobOnline=1) OR sum(Ints*ViewJobsStats.CPI)=0 THEN 1 ELSE 0 END as underTarget INTO ##liveJobsDaily
        from (
          SELECT sum(Pay) as Pay, sum(Ints) as Ints, sum(Hours) as Hrs, inputDate, jobID from ViewDailyPay group by jobID, inputDate
          union
      		select sum(pay),sum(ints),null,inputDate,jobID from ViewOnlineDailyPay group by jobID, inputDate
        ) ViewDailyPay
        LEFT JOIN ViewJobsStats ON ViewDailyPay.jobID=ViewJobsStats.jobID
        LEFT JOIN Jobs ON ViewDailyPay.jobID=Jobs.jobID
        where inputDate<cast(getdate() as date) and endDate>=dateadd(day,-10,cast(getdate() as date)) AND Jobs.projectID>2
    	group by Jobs.jobID, Jobs.jobName, Jobs.projectID, inputDate, Jobs.isJobEve, Jobs.isJobDay, Jobs.isJobOnline
		order by inputDate asc
    SELECT * FROM ##liveJobsDaily
    `
    let projectDailyQ=`
    SELECT projectID, inputDate, isnull(sum(pay),0) as pay, isnull(sum(sales),0) as sales, max(underTarget) as underTarget
    FROM ##liveJobsDaily group by projectID, inputDate
    DROP TABLE ##liveJobsDaily`
    db.multiple = true
    db.query(jobQ+projectQ, (err, jobR) => {
      if (err) {
        console.log(err)
        res.send(err)
      }else {
        db.query(dailyQ+projectDailyQ, (err, dailyR) => {
          if (err) {
            console.log(err)
            res.send(err)
          }else {
            res.send({
              title:"Live projects"
              ,jobs: jobR.recordsets[0]
              ,dailys: dailyR.recordsets[0]
              ,projects: jobR.recordsets[1]
              ,projectDailys: dailyR.recordsets[1]
              ,view: req.body.view
            });
          }
        })
      }
    });
  },
  getClientProjects: (req, res) => {
    let cID = req.params.id;
    let projectQuery =
          `SELECT Quotes.quoteName,
             Quotes.quoteNo,
             Quotes.noteID,
             Clients.clientName,
             Quotes.quoteID,
             Projects.isProjectCommissioned,
             Projects.isProjectLive,
             Projects.isProjectClosed,
             Projects.isProjectCancelled,
             Jobs.startDate,
             Jobs.endDate,
             Jobs.dataDate,
             Jobs.jobName
      FROM   Quotes
             INNER JOIN Clients
                     ON Quotes.clientID = Clients.clientID
             LEFT JOIN Projects
                    ON Quotes.quoteID = Projects.quoteID
             LEFT JOIN Jobs
                    ON Jobs.projectID = Projects.projectID
      WHERE  Quotes.quoteID > 1
             AND Quotes.clientID = '` + cID + `'
      ORDER  BY Quotes.quoteNo DESC `
    let noteQuery = "SELECT * FROM Notes"
    db.query(projectQuery, (err, result) => {
        logger.info("Crash while loading projects for client index page "+req.user.uName);
      db.query(noteQuery, (err, result2) => {
        res.render('index.ejs', {
          title: "Project Overview"
          ,projects: result.recordset
          ,notes: result2.recordset
          ,message: ""
        });
      });
    });
  },
  viewPlanner: (req, res) => {
    db.query("select s.staffID,staffName,roleID,u.userID,staffJobTitleID from staff s left join Users u on u.staffID=s.staffID where staffLeft is null",(err,staff)=>{
      res.render('resource-planner4.ejs', {
        title: "Resource Planner",
        tabulatorUpdated:true,
        resourceUpdating:resourceUpdating,
        staffs:staff.recordset,
        thisUser:req.user.user
      });
    })
  },
  viewPlannerOld: (req, res) => {
    var moment=require('moment')
    let today = moment.utc().startOf('day')
    var sToday = moment.utc().startOf('day').format("YYYY-MM-DD")
    var oneDayBack = moment.utc().startOf('day').subtract(1,'days').format("YYYY-MM-DD")
    var sToday2 = sToday;
    var twoDaysBack2 = moment.utc().startOf('day').subtract(2,'days').format("YYYY-MM-DD")
    let shiftType = req.params.id;
    let shiftDays = req.params.days;
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
             Jobs.jobCPI,
             Jobs.hourlyTarget,
             Jobs.resourceTarget,
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
             Jobs.isJobDP,
             Jobs.expectedLOI,
             Jobs.timedLOI,
             Jobs.isJobHourly,
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
             Quotes.isQuoteAsDP,
             Clients.clientName
      FROM   Jobs,
             Clients,
             Quotes,
             Projects
      WHERE  Jobs.projectID = Projects.projectID
             AND Projects.quoteID = Quotes.quoteID
             AND Quotes.clientID = Clients.clientID
             AND Quotes.quoteID > 2
             AND Projects.isProjectLive = 1
             AND Jobs.isJobCATI = 1
             AND Projects.isProjectLive = 1
             AND Jobs.hourlyTarget is not null
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
          `SELECT Users.staffID,
             Staff.staffName
      FROM   Users
             INNER JOIN Staff
                     ON Users.staffID = Staff.staffID
             INNER JOIN Roles
                     ON Users.roleID = Roles.roleID
      WHERE  ( Staff.staffJobTitleID = 8 )
             AND Staff.staffLeft IS NULL
      GROUP  BY Users.staffID,
                Staff.staffName
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
      ORDER  BY Staff.staffName ASC `;
    let jobQuery =
          `SELECT Jobs.jobID,
            Jobs.projectID,
             Jobs.jobName,
             Jobs.startDate,
             Jobs.endDate,
             Jobs.dataDate,
             Jobs.tablesDate,
             Jobs.interviewsTarget,
             Jobs.jobCPI,
             Jobs.hourlyTarget,
             Jobs.resourceTarget,
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
             Jobs.isJobDP,
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
             PJOBS.PanelInterviews,
						 ISNULL(ResNotes.Note,'__________________________') as Note
      FROM   Projects
             LEFT JOIN Jobs
                    ON Jobs.projectID = Projects.projectID
             LEFT JOIN (SELECT DailyInput.jobID,
                               Sum(DailyInput.inputInterviews) AS 'CATIInterviews',
                               Sum(DailyInput.inputHours)      AS 'Hours'
                        FROM   DailyInput
                        WHERE  inputDate<CAST(GETDATE() as date)
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
                    ON PJOBS.jobID = Jobs.jobID
             LEFT JOIN (SELECT AllNotes.Note, AllNotes.jobID
                        FROM   AllNotes
												WHERE AllNotes.tableName='Jobs' and AllNotes.page='view-planner') ResNotes
                    ON ResNotes.jobID = Jobs.jobID
      WHERE  Jobs.isJobInHouse = 1
             AND Projects.isProjectLive = 1
             AND Jobs.startDate<DATEADD(day,`+shiftDays+`,GETDATE())
             AND Jobs.endDate>DATEADD(day,-1,GETDATE())`
    let alloQuery =
          `SELECT Sum(agentAllocationHours) AS hours,
             AgentAllocation.agentAllocationDate,
             AgentAllocation.jobID
      FROM   AgentAllocation
      WHERE  agentAllocationDate >= '` + sToday + `'
      GROUP  BY AgentAllocation.jobID,
                AgentAllocation.agentAllocationDate `
    let dailyQuery =
          `SELECT SUM(DailyInput.inputInterviews) AS Ints,
              SUM(DailyInput.inputHours) as Hours,
              DailyInput.inputDate,
              DailyInput.jobID
         FROM DailyInput
         WHERE DailyInput.inputHours > 0
         AND DailyInput.inputDate BETWEEN '` + twoDaysBack2 + `' AND '` + sToday2 + `'
         AND DailyInput.inputDate<CAST(GETDATE() as date)
         GROUP BY DailyInput.inputDate, DailyInput.jobID
         ORDER BY DailyInput.inputDate DESC`;
    let bookedQ=`SELECT bookingDate, sum(Hours*isDay*isAllocatable) as DayHours, sum(Hours*isEve*isAllocatable) as EveHours, sum(Hours*isAcademy*isEve) as EveAcademy, sum(Hours*isAcademy*isDay) as DayAcademy
      FROM
      (
      SELECT Booking.bookingDate, DATEDIFF(second, Booking.startTime, Booking.endTime) / 3600.0 as Hours, AgentTeams.isDay, AgentTeams.isEve, absenceType,case when isAllocatable=1 then 0 else 1 end as isAcademy,isnull(isAllocatable,0) isAllocatable
      FROM (SELECT DISTINCT agentID, startTime, endTime, bookingDate, bookingTeamID FROM Booking) as Booking LEFT JOIN Absence on Absence.agentID=Booking.agentID AND Absence.absenceDate=Booking.bookingDate,
  	Agents, AgentTeams
      WHERE
      Booking.bookingDate BETWEEN DATEADD(day,-(DATEPART(weekday, GETDATE())-1),GETDATE())AND DATEADD(day, (-(DATEPART(weekday, GETDATE())-1))+`+shiftDays+`, GETDATE())
      AND Booking.agentID=Agents.agentID AND isnull(bookingTeamID,Agents.teamID)=AgentTeams.agentTeamID
      ) as b
  	WHERE nullif(absenceType,'No show') is null
      GROUP BY bookingDate`
    let forecastHrsQ=`
    select DATEPART(WEEKDAY,bookingDate) as bookingDay,isEve,SUM(DATEDIFF(second, b.startTime, b.endTime) / 3600.0)/4 as Hours
    from
    Booking b
    left join AgentTeams t on t.agentTeamID=b.bookingTeamID
    where bookingDate between DATEADD(week,-4,getdate()) and getdate()
    group by DATEPART(WEEKDAY,bookingDate),isEve`
    db.query(dailyQuery, (err, resultD) => {
      if (err) {
        logger.info("Error loading daily results for planner page "+req.user.uName);
      }
      db.query(alloQuery, (err, resultA) => {
        if (err) {
          logger.info("Error loading allocation results for planner page "+req.user.uName);
        }
        var getDates = function(startDate) {
          var dates = [],
          currentDate = moment.utc(startDate).startOf('day'),
          addDays = function(days) {
            var date = moment.utc(this.valueOf()).startOf('day');
            date.add(days,'days');
            return date;
          };
          var i = 0;
          while (i < shiftDays) {
            dates.push(currentDate);
            currentDate = addDays.call(currentDate, 1);
            i++;
          }
          return dates;
        };
        var today = moment.utc().startOf('day');
        var dates = getDates(today)
        db.query(projectQuery, (err, resultP) => {
          if (err) {
            logger.info("Error loading projects results for planner page "+req.user.uName);
          }
          db.query(dPQuery, (err, resultDP) => {
            if (err) {
              logger.info("Error loading DP team results for planner page "+req.user.uName);
            }
            db.query(tLQuery, (err, resultTL) => {
              if (err) {
                logger.info("Error loading TL team results for planner page "+req.user.uName);
              }
              db.query(cMQuery, (err, resultCM) => {
                if (err) {
                  logger.info("Error loading CM team results for planner page "+req.user.uName);
                }
                db.query(jobQuery, (err, resultJ) => {
                  if (err) {
                    logger.info("Error loading job results for planner page "+req.user.uName);
                  }
                  let plannerQuery = `
                  SELECT Jobs.jobID,plannerHours, plannerDate, Jobs.endDate FROM
                  Jobs
                  left join Planners on Jobs.jobID=Planners.jobID
                  left join (select jobID, agentAllocationDate, sum(agentAllocationHours) as hoursToday from AgentAllocation where agentAllocationDate=cast(getdate() as date) group by jobID, agentAllocationDate) alloToday on alloToday.jobID=Planners.jobID
                  WHERE  Jobs.isJobInHouse = 1
                  AND Jobs.startDate<DATEADD(day,28,GETDATE())
                  AND Jobs.endDate>DATEADD(day,-1,GETDATE())
                  AND (plannerHours IS NULL OR plannerDate>cast(getdate() as date))
                  UNION
                  SELECT Jobs.jobID,isnull(hoursToday,0) as plannerHours, cast(getdate() as date) as plannerDate, Jobs.endDate FROM
                  Jobs
                  left join (select jobID, agentAllocationDate, sum(agentAllocationHours) as hoursToday from AgentAllocation where agentAllocationDate=cast(getdate() as date) group by jobID, agentAllocationDate) alloToday on alloToday.jobID=Jobs.jobID
                  WHERE (agentAllocationDate=cast(getdate() as date) OR agentAllocationDate IS NULL)
                  AND Jobs.isJobInHouse = 1
                  AND cast(getdate() as date) BETWEEN Jobs.startDate AND Jobs.endDate
                  order by plannerDate`;
                  let dateChangesQ=`
                  select d.jobID,d.dateField,firstDate,newDate,isByClient,changedDate
                  from DateChanges d left join (select jobID,min(oldDate) as firstDate,dateField from DateChanges group by jobID,dateField) f on f.jobID=d.jobID and f.dateField=d.dateField
                  where d.jobID in (`+resultP.recordset.map(el=>el.jobID).join(",")+`)
                  order by changedDate ASC`
                  db.query(plannerQuery,(err,planResult) => {
                    if(err){
                      logger.info("Error loading planner results for planner page "+req.user.uName);
                    }
                    db.query(bookedQ,(err,bookedR) => {
                      if(err){
                        logger.info("Error loading planner results for planner page "+req.user.uName);
                      }
                      db.query(forecastHrsQ,(err,forecastHrsR) => {
                        if(err){
                          logger.info("Error loading planner results for planner page "+req.user.uName);
                        }
                        db.query(dateChangesQ,(err,dateChangesR) => {
                          if(err){
                            logger.info("Error loading date changes for planner page "+req.user.uName);
                          }
                          res.render('resource-planner2.ejs', {
                            title: "Resource Planner"
                            ,projects: resultP.recordset
                            ,ProductionManagers: resultDP.recordset
                            ,TeamLeaders: resultTL.recordset
                            ,ClientManagers: resultCM.recordset
                            ,jobs: resultJ.recordset
                            ,dates: dates
                            ,today: today
                            ,viewType: shiftType
                            ,viewDays: shiftDays
                            ,message: ""
                            ,allocations: resultA.recordset
                            ,dailys: resultD.recordset
                            ,yesterday: moment.utc().startOf('day').subtract(1,'days')
                            ,dayBefore: moment.utc().startOf('day').subtract(2,'days')
                            ,planner: planResult.recordset
                            ,booked: bookedR.recordset
                            ,forecastHrs:forecastHrsR.recordset
                            ,moment: require('moment')
                            ,dateChanges:dateChangesR.recordset
                          });
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
    });
  },

  foreCast: (req, res) => {
    let today = new Date().getFullYear() + "-" + ('0' + (new Date().getMonth()+1)).slice(-2) + "-" +  ('0' + new Date().getDate()).slice(-2);
    let thirty
    if (new Date().getMonth() === 0) {
      thirty = new Date().getFullYear()-1 + '-12-' +  ('0' + new Date().getDate()).slice(-2)
    } else {
      thirty = new Date().getFullYear() + "-" + ('0' + (new Date().getMonth())).slice(-2) + "-" +  ('0' + new Date().getDate()).slice(-2)
    }
    let oneYear = new Date().getFullYear()-1 + "-" + ('0' + (new Date().getMonth()+1)).slice(-2) + "-" +  ('0' + new Date().getDate()).slice(-2);
    today = dateIf(today,"-","r");
    thirty = dateIf(thirty,"-","r");
    oneYear = dateIf(oneYear,"-","r");
    let quotesQuery =
          `SELECT Count(Quotes.quoteID) AS 'TotalQuotes',
             Count(CASE Quotes.isQuoteAsCATI
                     WHEN 1 THEN 1
                     ELSE NULL
                   END)            AS 'CATI',
             Count(CASE Quotes.isQuoteAsBusiness
                     WHEN 1 THEN 1
                     ELSE NULL
                   END)            AS 'B2B',
             Count(CASE Quotes.isQuoteAsConsumer
                     WHEN 1 THEN 1
                     ELSE NULL
                   END)            AS 'Cons',
             Count(CASE Quotes.isQuoteAsOnline
                     WHEN 1 THEN 1
                     ELSE NULL
                   END)            AS 'Online',
             Count(CASE Quotes.isQuoteAsFace
                     WHEN 1 THEN 1
                     ELSE NULL
                   END)            AS 'F2F',
             Count(CASE Quotes.isQuoteAsRecruitment
                     WHEN 1 THEN 1
                     ELSE NULL
                   END)            AS 'Rec',
             Count(CASE Quotes.isQuoteAsInternational
                     WHEN 1 THEN 1
                     ELSE NULL
                   END)            AS 'Interna'
      FROM   Quotes
      WHERE  Quotes.quoteDate <= '` + today + `'
             AND  Quotes.quoteDate >= '` + thirty + `' `
    let yearQuery =
          `SELECT Month(Quotes.quoteDate) AS 'QuoteMonth',
             Year(Quotes.quoteDate)  AS 'QuoteYear',
             Count(Quotes.quoteID)   AS 'TotalQuotes',
             Count(CASE Quotes.isQuoteAsCATI
                     WHEN 1 THEN 1
                     ELSE NULL
                   END)              AS 'CATI',
             Count(CASE Quotes.isQuoteAsBusiness
                     WHEN 1 THEN 1
                     ELSE NULL
                   END)              AS 'B2B',
             Count(CASE Quotes.isQuoteAsConsumer
                     WHEN 1 THEN 1
                     ELSE NULL
                   END)              AS 'Cons',
             Count(CASE Quotes.isQuoteAsOnline
                     WHEN 1 THEN 1
                     ELSE NULL
                   END)              AS 'Online',
             Count(CASE Quotes.isQuoteAsFace
                     WHEN 1 THEN 1
                     ELSE NULL
                   END)              AS 'F2F',
             Count(CASE Quotes.isQuoteAsRecruitment
                     WHEN 1 THEN 1
                     ELSE NULL
                   END)              AS 'Rec',
             Count(CASE Quotes.isQuoteAsInternational
                     WHEN 1 THEN 1
                     ELSE NULL
                   END)              AS 'Interna'
      FROM   Quotes
      WHERE  Quotes.quoteDate <= '` + today + `'
             AND Quotes.quoteDate >= '` + oneYear +` '
      GROUP  BY Month(Quotes.quoteDate),
                Year(Quotes.quoteDate) `;
    let catiQuery =
          `SELECT Sum(DailyInput.inputInterviews) AS 'Ints',
             Sum(DailyInput.inputInterviews * Jobs.jobCPI) as 'Sales',
             Sum(DailyInput.inputHours)                    as 'Hours',
             Sum(DailyInput.inputHours * PayRates.payRate) as 'Pay',
             DailyInput.inputDate
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
             AND DailyInput.inputDate <= '` + today + `'
             AND DailyInput.inputDate >= '` + thirty + `'
      GROUP  BY DailyInput.inputDate `
    let projectSQuery =
          `SELECT COUNT(Jobs.jobID) AS Starts
      FROM Projects, Jobs
      WHERE Jobs.startDate <= '` + today + `'
            AND Jobs.startDate >= '` + thirty + `'
            AND Jobs.projectID = Projects.projectID`;
    let projectEQuery =
          `SELECT COUNT(Jobs.jobID) AS Ends
      FROM Projects, Jobs
      WHERE Jobs.endDate <= '` + today + `'
          AND Jobs.endDate >= '` + thirty + `'
          AND Jobs.projectID = Projects.projectID`;
    db.query(yearQuery, (err, yearResults) =>{
      if(err){
        logger.info("Error loading year results for allocation page "+req.user.uName);
      }
      db.query(quotesQuery, (err, quotesResults) =>{
        if(err){
          logger.info("Error loading quotes results for allocation page "+req.user.uName);
        }
        db.query(catiQuery, (err, catiResults) =>{
          if(err){
            logger.info("Error loading CATI results for allocation page "+req.user.uName);
          }
          db.query(projectSQuery, (err, projSRes) =>{
            if(err){
              logger.info("Error loading project results for allocation page "+req.user.uName);
            }
            db.query(projectEQuery, (err, projERes) =>{
              if(err){
                logger.info("Error loading project end results for allocation page "+req.user.uName);
              }
              res.render('30-forecaster.ejs', {
                title: '30-day forecaster'
                ,catiStats: catiResults.recordset
                ,quoteStats: quotesResults.recordset
                ,projStarts: projSRes.recordset
                ,projEnds: projERes.recordset
                ,yearStats: yearResults.recordset
              });
            });
          });
        });
      });
    });
  },

  updateResourcePlanner(req, res){
    let plannerQuery = "DELETE FROM Planners WHERE Planners.plannerDate = '" + req.body.dte + "' AND Planners.jobID = '" + req.body.jid + "'";
    db.query(plannerQuery,(err,planResult) => {
      if(err){
        console.log(err)
      }else {
        if (req.body.reqType=="update" && req.body.hrs!=="") {
          let addToPlanner = "INSERT INTO Planners (jobID, plannerHours, plannerDate) VALUES ("+ req.body.jid +", "+ req.body.hrs +", '"+ req.body.dte +"')";
          db.query(addToPlanner,(err, addResult) =>{
            if(err){
              logger.info("didnt insert data into Planner",err)
            }else {
              function loadPage(){
                logger.info(req.user.uName + " updated resource planner figures");
                res.redirect("/view-planner/1/14");
              }
              setTimeout(loadPage, 2000);
            }
          });
        }
      }
    })
  },
  getMenu: (req, res) =>{
    let contQuery=`SELECT inputDate, sum(Wages*isJobDay) as DayWages, sum(Wages*isJobEve) as EveWages, sum(Sales*isJobDay) as DaySales, sum(Sales*isJobEve) as EveSales
FROM
(
	SELECT Sum(Ints) AS Ints,
	Sum(Pay) AS Wages,
	Sum(CASE WHEN isJobHourly=1 THEN [Hours] ELSE Ints END * CPI) AS Sales,
	inputDate,
	Jobs.isJobDay,
	Jobs.isJobEve
	FROM   ViewDailyPay
	left join Jobs on ViewDailyPay.jobID=Jobs.jobID
	left join ViewJobsStats on ViewJobsStats.jobID=Jobs.jobID
	WHERE  [Hours] > 0
	AND inputdate BETWEEN DATEADD(day,-30,GETDATE()) AND DATEADD(day,-1,GETDATE())
	AND jobs.isjobcati = 1
	AND jobs.isjobinhouse = 1
	GROUP BY inputDate, Jobs.isJobEve, Jobs.isJobDay
) AS cTable
GROUP BY inputDate`
let favQ="select count(*) as clickCount,pageName,max(pageURL) as pageURL,max(pageIcon) as pageIcon from MenuClickLogs where userID="+req.user.user+" group by pageName order by count(*) DESC,max(logDate) DESC"
    db.query(contQuery,(err,result) =>{
      if(err){
        logger.info("didnt update data" +  err)
      }else {
        db.query(favQ,(err,favR) =>{
          if(err){
            console.log(err,favQ)
            logger.info("didnt update data" +  err)
          }else {
            res.render("menu.ejs", {
              contChart: result.recordset,
              title: "Welcome to JA2",
              favourites:favR.recordset,
              message:""
            })
          }
        })
      }
    })
  },
  ajaxPlanner: (req, res) => {
    let updatePlanner=""
    data=req.body
    let calcQ=`SELECT DISTINCT Jobs.jobID, CASE WHEN Jobs.isJobHourly=1 THEN Jobs.interviewsTarget-ISNULL(dInput.Hours, 0) ELSE Jobs.interviewsTarget-ISNULL(dInput.Ints, 0) END as intsLeft, Jobs.isJobHourly, Jobs.hourlyTarget, Planners.plannerDate, plannerHours, CASE WHEN Jobs.isJobHourly=1 THEN 1 ELSE ISNULL(Jobs.resourceTarget,ISNULL(dInput.Ints/dInput.Hours, Jobs.hourlyTarget)) END as AHR, Jobs.endDate, Jobs.startDate
    FROM Jobs
    LEFT JOIN Planners ON Jobs.jobID=Planners.jobID AND Planners.plannerDate>cast(getdate() as date)
    LEFT JOIN
    (
    SELECT sum(DailyInput.inputHours) as Hours, sum(DailyInput.inputInterviews) as Ints, DailyInput.jobID
    FROM DailyInput
    WHERE inputDate<cast(getdate() as date)
    GROUP BY DailyInput.jobID
    ) as dInput ON dInput.jobID=Jobs.jobID
	WHERE Jobs.jobID='` + data[0].jid + `'
	AND plannerDate IS NOT NULL
UNION
SELECT Jobs.jobID, CASE WHEN Jobs.isJobHourly=1 THEN Jobs.interviewsTarget-ISNULL(dInput.Hours, 0) ELSE Jobs.interviewsTarget-ISNULL(dInput.Ints, 0) END as intsLeft, Jobs.isJobHourly, Jobs.hourlyTarget, cast(getdate() as date) as plannerDate, alloToday.hoursToday as plannerHours, CASE WHEN Jobs.isJobHourly=1 THEN 1 ELSE ISNULL(Jobs.resourceTarget,ISNULL(dInput.Ints/dInput.Hours, Jobs.hourlyTarget)) END as AHR, Jobs.endDate, Jobs.startDate
    FROM Jobs
	left join (select jobID, agentAllocationDate, sum(agentAllocationHours) as hoursToday from AgentAllocation where agentAllocationDate=cast(getdate() as date) group by jobID, agentAllocationDate) alloToday on alloToday.jobID=Jobs.jobID
    LEFT JOIN
    (
    SELECT sum(DailyInput.inputHours) as Hours, sum(DailyInput.inputInterviews) as Ints, DailyInput.jobID
    FROM DailyInput
    WHERE inputDate<cast(getdate() as date)
    GROUP BY DailyInput.jobID
    ) as dInput ON dInput.jobID=Jobs.jobID
    WHERE Jobs.jobID='` + data[0].jid + `'`
    if (data[0].reqType=="revert") {
      let plannerQuery = "DELETE FROM Planners WHERE Planners.plannerDate = '" + data[0].dte + "' AND Planners.jobID = '" + data[0].jid + "'";
      db.query(plannerQuery,(err,planResult) => {
        if(err){
          console.log(err)
          res.status(500).send({error: 'Could not remove from planner'});
        }else {
          db.query(calcQ,(err, calcR) =>{
            if(err){
              logger.info("error getting calculated job info " +  err)
              res.status(500).send({error: 'Could not get calculated job info'});
            }else {
              let plannerQuery = `
              SELECT Jobs.jobID,plannerHours, plannerDate, Jobs.endDate FROM
              Jobs
              left join Planners on Jobs.jobID=Planners.jobID
              left join (select jobID, agentAllocationDate, sum(agentAllocationHours) as hoursToday from AgentAllocation where agentAllocationDate=cast(getdate() as date) group by jobID, agentAllocationDate) alloToday on alloToday.jobID=Planners.jobID
              WHERE  Jobs.isJobInHouse = 1
              AND Jobs.startDate<DATEADD(day,28,GETDATE())
              AND Jobs.endDate>DATEADD(day,-1,GETDATE())
              AND (plannerHours IS NULL OR plannerDate>cast(getdate() as date))
              UNION
              SELECT Jobs.jobID,isnull(hoursToday,0) as plannerHours, cast(getdate() as date) as plannerDate, Jobs.endDate FROM
              Jobs
              left join (select jobID, agentAllocationDate, sum(agentAllocationHours) as hoursToday from AgentAllocation where agentAllocationDate=cast(getdate() as date) group by jobID, agentAllocationDate) alloToday on alloToday.jobID=Jobs.jobID
              WHERE (agentAllocationDate=cast(getdate() as date) OR agentAllocationDate IS NULL)
              AND Jobs.isJobInHouse = 1
              AND cast(getdate() as date) BETWEEN Jobs.startDate AND Jobs.endDate
              order by plannerDate`;
              db.query(plannerQuery,(err,planResult) => {
                if(err){
                  logger.info("Error loading planner results for planner page "+req.user.uName);
                  res.status(500).send({error: 'Could not retrieve planner hours'});
                }
                res.send({planner: planResult.recordset, calculated: calcR.recordset})
              });
            }
          })
        }
      })
    }else {
      let plannerQuery = "DELETE FROM Planners WHERE Planners.plannerDate = '" + data[0].dte + "' AND Planners.jobID = '" + data[0].jid + "'";
      db.query(plannerQuery,(err,planResult) => {
        updatePlanner = "INSERT INTO Planners (jobID, plannerHours, plannerDate) VALUES ("+ data[0].jid +", "+ data[0].hrs +", '"+ data[0].dte +"')";
        db.query(updatePlanner,(err, addResult) =>{
          if(err){
            logger.info("didnt insert data" +  err + " ... "+updatePlanner)
            res.status(500).send({error: 'Could not insert into planner'});
          }else {
            db.query(calcQ,(err, calcR) =>{
              if(err){
                logger.info("error getting calculated job info " +  err)
                res.status(500).send({error: 'Could not get calculated job info'});
              }else {
                let plannerQuery = `
                SELECT Jobs.jobID,plannerHours, plannerDate, Jobs.endDate FROM
                Jobs
                left join Planners on Jobs.jobID=Planners.jobID
                left join (select jobID, agentAllocationDate, sum(agentAllocationHours) as hoursToday from AgentAllocation where agentAllocationDate=cast(getdate() as date) group by jobID, agentAllocationDate) alloToday on alloToday.jobID=Planners.jobID
                WHERE  Jobs.isJobInHouse = 1
                AND Jobs.startDate<DATEADD(day,28,GETDATE())
                AND Jobs.endDate>DATEADD(day,-1,GETDATE())
                AND (plannerHours IS NULL OR plannerDate>cast(getdate() as date))
                UNION
                SELECT Jobs.jobID,isnull(hoursToday,0) as plannerHours, cast(getdate() as date) as plannerDate, Jobs.endDate FROM
                Jobs
                left join (select jobID, agentAllocationDate, sum(agentAllocationHours) as hoursToday from AgentAllocation where agentAllocationDate=cast(getdate() as date) group by jobID, agentAllocationDate) alloToday on alloToday.jobID=Jobs.jobID
                WHERE (agentAllocationDate=cast(getdate() as date) OR agentAllocationDate IS NULL)
                AND Jobs.isJobInHouse = 1
                AND cast(getdate() as date) BETWEEN Jobs.startDate AND Jobs.endDate
                order by plannerDate`;
                db.query(plannerQuery,(err,planResult) => {
                  if(err){
                    logger.info("Error loading planner results for planner page "+req.user.uName);
                    res.status(500).send({error: 'Could not retrieve planner hours'});
                  }
                  res.send({planner: planResult.recordset, calculated: calcR.recordset})
                });
              }
            })
          }
        });
      })
    };
  },
  ajaxPlannerAHR: (req, res) => {
    let updatePlanner=""
    data=req.body
    let calcQ=`SELECT DISTINCT Jobs.jobID, CASE WHEN Jobs.isJobHourly=1 THEN Jobs.interviewsTarget-ISNULL(dInput.Hours, 0) ELSE Jobs.interviewsTarget-ISNULL(dInput.Ints, 0) END as intsLeft, Jobs.isJobHourly, Jobs.hourlyTarget, Planners.plannerDate, plannerHours, ISNULL(Jobs.resourceTarget,ISNULL(dInput.Ints/dInput.Hours, Jobs.hourlyTarget)) as AHR, Jobs.endDate
    FROM Jobs
    LEFT JOIN Planners ON Jobs.jobID=Planners.jobID AND Planners.plannerDate>cast(getdate() as date)
    LEFT JOIN
    (
    SELECT sum(DailyInput.inputHours) as Hours, sum(DailyInput.inputInterviews) as Ints, DailyInput.jobID
    FROM DailyInput
    WHERE inputDate<cast(getdate() as date)
    GROUP BY DailyInput.jobID
    ) as dInput ON dInput.jobID=Jobs.jobID
	WHERE Jobs.jobID='` + data[0].jid + `'
	AND plannerDate IS NOT NULL
UNION
SELECT Jobs.jobID, CASE WHEN Jobs.isJobHourly=1 THEN Jobs.interviewsTarget-ISNULL(dInput.Hours, 0) ELSE Jobs.interviewsTarget-ISNULL(dInput.Ints, 0) END as intsLeft, Jobs.isJobHourly, Jobs.hourlyTarget, cast(getdate() as date) as plannerDate, alloToday.hoursToday as plannerHours, ISNULL(Jobs.resourceTarget,ISNULL(dInput.Ints/dInput.Hours, Jobs.hourlyTarget)) as AHR, Jobs.endDate
    FROM Jobs
	left join (select jobID, agentAllocationDate, sum(agentAllocationHours) as hoursToday from AgentAllocation where agentAllocationDate=cast(getdate() as date) group by jobID, agentAllocationDate) alloToday on alloToday.jobID=Jobs.jobID
    LEFT JOIN
    (
    SELECT sum(DailyInput.inputHours) as Hours, sum(DailyInput.inputInterviews) as Ints, DailyInput.jobID
    FROM DailyInput
    WHERE inputDate<cast(getdate() as date)
    GROUP BY DailyInput.jobID
    ) as dInput ON dInput.jobID=Jobs.jobID
    WHERE Jobs.jobID='` + data[0].jid + `'`
    let plannerQuery = "UPDATE Jobs SET resourceTarget="+data[0].ahr+" WHERE jobID = '" + data[0].jid + "'";
    db.query(plannerQuery,(err,planResult) => {
      if(err){
        console.log(err)
        res.status(500).send({error: 'Could not remove from planner'});
      }else {
        db.query(calcQ,(err, calcR) =>{
          if(err){
            logger.info("error getting calculated job info " +  err)
            res.status(500).send({error: 'Could not get calculated job info'});
          }else {
            let plannerQuery = `
            SELECT Jobs.jobID,plannerHours, plannerDate, Jobs.endDate FROM
            Jobs
            left join Planners on Jobs.jobID=Planners.jobID
            left join (select jobID, agentAllocationDate, sum(agentAllocationHours) as hoursToday from AgentAllocation where agentAllocationDate=cast(getdate() as date) group by jobID, agentAllocationDate) alloToday on alloToday.jobID=Planners.jobID
            WHERE  Jobs.isJobInHouse = 1
            AND Jobs.startDate<DATEADD(day,28,GETDATE())
            AND Jobs.endDate>DATEADD(day,-1,GETDATE())
            AND (plannerHours IS NULL OR plannerDate>cast(getdate() as date))
            UNION
            SELECT Jobs.jobID,isnull(hoursToday,0) as plannerHours, cast(getdate() as date) as plannerDate, Jobs.endDate FROM
            Jobs
            left join (select jobID, agentAllocationDate, sum(agentAllocationHours) as hoursToday from AgentAllocation where agentAllocationDate=cast(getdate() as date) group by jobID, agentAllocationDate) alloToday on alloToday.jobID=Jobs.jobID
            WHERE (agentAllocationDate=cast(getdate() as date) OR agentAllocationDate IS NULL)
            AND Jobs.isJobInHouse = 1
            AND cast(getdate() as date) BETWEEN Jobs.startDate AND Jobs.endDate
            order by plannerDate`;
            db.query(plannerQuery,(err,planResult) => {
              if(err){
                logger.info("Error loading planner results for planner page "+req.user.uName);
                res.status(500).send({error: 'Could not retrieve planner hours'});
              }
              res.send({planner: planResult.recordset, calculated: calcR.recordset})
            });
          }
        })
      }
    })
  },
  allocateCell: (req,res) => {
    let data=req.body[0]
    let agentQ=`SELECT Booking.agentID,
    	Agents.AgentName,
    	MAX(DATEDIFF(hour, Booking.startTime, Booking.endTime)) as HoursBooked,
    	sum(Alloc.agentAllocationHours) as HoursAlloc,
    	dInput.JobHours,
    	dInput.AHR
    FROM Booking, Agents
    LEFT JOIN AgentAllocation Alloc ON Alloc.agentAllocationDate='`+data.date+`' AND Alloc.agentID=Agents.agentID
		LEFT JOIN
		(
		SELECT DailyInput.agentID, sum(DailyInput.inputHours) as JobHours, sum(DailyInput.inputInterviews)/sum(DailyInput.inputHours) as AHR FROM DailyInput WHERE DailyInput.jobID='`+data.jid+`'
		GROUP BY DailyInput.agentID
		) dInput on dInput.agentID=Agents.agentID
    WHERE Booking.agentID=Agents.agentID
    	AND Booking.bookingDate='`+data.date+`'
    GROUP BY Booking.agentID, Agents.AgentName, dInput.JobHours, dInput.AHR
    ORDER BY Agents.AgentName`
    let allocQ=`SELECT AgentAllocation.agentID, Agents.agentName, AgentAllocation.agentAllocationHours as jobAllocation, max(bookingsT.HoursBooked) as HoursBooked, sum(allAllocations.agentAllocationHours) as allAllocation
    FROM AgentAllocation, Agents,
    (
      SELECT * FROM AgentAllocation WHERE AgentAllocation.agentAllocationDate='`+data.date+`'
    ) as allAllocations,
    (
      SELECT sum(DATEDIFF(hour, Booking.startTime, Booking.endTime)) as HoursBooked, Booking.agentID FROM Booking WHERE Booking.bookingDate='`+data.date+`'
      GROUP BY Booking.agentID
    ) as bookingsT
        WHERE AgentAllocation.agentID=Agents.agentID
        AND AgentAllocation.agentAllocationDate='`+data.date+`'
        AND AgentAllocation.jobID='`+data.jid+`'
    		AND bookingsT.agentID=Agents.agentID
    		AND allAllocations.agentID=Agents.agentID
    GROUP BY AgentAllocation.agentID, Agents.agentName, AgentAllocation.agentAllocationHours
    ORDER BY Agents.AgentName`
    db.query(agentQ,(err,agentR) => {
      if(err){
        logger.info("Error loading agents for cell allocation "+req.user.uName);
        res.status(500).send({error: 'Could not retrieve agents'});
      }else {
        db.query(allocQ,(err,allocR) => {
          if(err){
            logger.info("Error loading allocations for cell allocation "+req.user.uName);
            res.status(500).send({error: 'Could not retrieve agents'});
          }
        res.send({agents:agentR.recordset, allocations:allocR.recordset})
        })
      }
    })
  },
  updateAlloCell: (req,res) => {
    let data=req.body[0]
    let query=""
    if (data.reqType=="remove") {
      query=`DELETE FROM AgentAllocation WHERE AgentAllocation.agentID = ` + data.agentID + ` AND AgentAllocation.jobID = ` + data.jid + ` AND AgentAllocation.agentAllocationDate = '` + data.dte + `'`
    }else if (data.reqType=="update") {
      query=`UPDATE AgentAllocation SET agentAllocationHours = ` + data.hrs + ` WHERE AgentAllocation.agentID = ` + data.agentID + ` AND AgentAllocation.jobID = ` + data.jid + ` AND AgentAllocation.agentAllocationDate = '` + data.dte + `'`
    }else if (data.reqType=="add") {
      query=`INSERT INTO AgentAllocation (agentID,jobID,agentAllocationDate,agentAllocationHours) VALUES ('` + data.agentID + `',` + data.jid + `,'` + data.dte + `',` + data.hrs + `)`
    }
    db.query(query,(err,queryR) => {
      if(err){
        logger.info("Error updating allocations for cell allocation "+req.user.uName);
        res.status(500).send({error: 'Could not update allocation'});
      }else {
        let allocHrsQ=`SELECT sum(AgentAllocation.agentAllocationHours) as Hours
          FROM AgentAllocation
          WHERE
          AgentAllocation.agentAllocationDate='`+data.dte+`'
          AND AgentAllocation.jobID='`+data.jid+`'`
        db.query(allocHrsQ,(err,allocHrsR) => {
          if(err){
            logger.info("Error getting new allocation figure for cell allocation "+req.user.uName);
            console.log(query+" - "+err)
            res.status(500).send({error: 'Could not get new allocation'});
          }else {
            res.send(allocHrsR.recordset)
          }
        })
      }
    })
  },
  updateNote: (req,res) => {
    const transaction = new sql.Transaction()
    transaction.begin(err => {
      const db = new sql.Request(transaction)
      let data={}
      let insData={}
      let fields=[]
      let query=""
      fields.push("tableName")
      fields.push("jobID")
      fields.push("agentID")
      fields.push("otherID")
      fields.push("date")
      fields.push("page")
      fields.push("note")
      console.log("updating note",req.body[0])
      fields.forEach((k, i) => {
        if (req.body[0].hasOwnProperty(k)) {
          data[k]=" = '"+req.body[0][k]+"'"
          insData[k]="'"+req.body[0][k]+"'"
        }else {
          data[k]=" IS NULL"
          insData[k]="NULL"
        }
      });
      query="SELECT * FROM AllNotes WHERE tableName"+data.tableName+" AND jobID"+data.jobID+" AND agentID"+data.agentID+" AND otherID"+data.otherID+" AND date"+data.date+" AND page"+data.page+""
      console.log(query)
      db.query(query,(err,r) => {
        if(err){
          console.log(query+" - "+err)
          logger.log(req.user.uName+" had an error checking note",query,err)
          res.status(500).send({error: 'Could not check for note'});
        }else {
          console.log(r.recordset)
          if (req.body[0].note=="") {
            query="DELETE FROM AllNotes WHERE tableName"+data.tableName+" AND jobID"+data.jobID+" AND agentID"+data.agentID+" AND otherID"+data.otherID+" AND date"+data.date+" AND page"+data.page+""
          }else if (r.recordset.length == 0) {
            query="INSERT INTO AllNotes (tableName,jobID,agentID,otherID,date,page,note) VALUES("+insData.tableName+","+insData.jobID+","+insData.agentID+","+insData.otherID+","+insData.date+","+insData.page+",@note)"
          }else {
            query="UPDATE AllNotes SET note=@note WHERE tableName"+data.tableName+" AND jobID"+data.jobID+" AND agentID"+data.agentID+" AND otherID"+data.otherID+" AND date"+data.date+" AND page"+data.page+""
          }
          db.input('note',req.body[0].note)
          db.query(query,(err,r2) => {
            if(err){
              console.log(query+" - "+err)
              logger.log(req.user.uName+" had an error updating note",query,err)
              res.status(500).send({error: 'Could not add note'});
            }else {
              transaction.commit(err => {
                console.log(err)
                console.log(query,req.body[0].note)
                res.send("success")
              })
            }
          })
        }
      })
    })
  },
  getResourceProjections: (req,res) => {
    let jobQ=`
    SELECT *`+(req.params.dte==0?'':`,(SELECT TOP 1 w.diff FROM workingDays(CASE WHEN '`+req.params.dte+`' > r.startDate THEN '`+req.params.dte+`' ELSE r.startDate END, r.endDate) w) daysLeft`)+`
    FROM
    ViewResourceNeeded r
    `+(req.params.dte==0?'':'order by daysLeft ASC,isnull(cont,9999) ASC')
    let plannerQ=`
    SELECT planners.jobID, plannerHours, plannerDate, isJobDay, isJobEve
    from Planners
    left join jobs on Planners.jobID=jobs.jobID
    where endDate>cast(getdate() as date) and jobs.projectID>2 AND Jobs.isJobInHouse = 1 AND Jobs.isJobCATI = 1`
    let bookedQ=`
    select sum(DATEDIFF(second, Booking.startTime, Booking.endTime) / 3600.0) as Hours, AgentTeams.isDay, isEve, bookingDate,AgentTeams.isAllocatable
    from booking
  	left join AgentTeams on AgentTeams.agentTeamID=booking.bookingTeamID
    where bookingDate>cast(getdate() as date)
    group by AgentTeams.isDay, isEve, bookingDate,isAllocatable`
    let forecastQ=`
    select DATEPART(WEEKDAY,bookingDate) as bookingDay,SUM(DATEDIFF(second, b.startTime, b.endTime) / 3600.0)/4 as Hours,isDay,isEve,isAllocatable
    from
    Booking b
    left join AgentTeams t on t.agentTeamID=b.bookingTeamID
    where bookingDate between DATEADD(week,-4,getdate()) and getdate()
    group by DATEPART(WEEKDAY,bookingDate),isDay,isEve,isAllocatable`
    db.query(jobQ,(err,jobR) => {
      if (err) {
        console.log(err)
        res.status(500).send({error: 'Could not get jobs for projections'});
      }else {
        db.query(plannerQ,(err,plannerR) => {
          if (err) {
            console.log(err)
            res.status(500).send({error: 'Could not get planner hours for projections'});
          }else {
            db.query(bookedQ,(err,bookedR) => {
              if (err) {
                console.log(err)
                res.status(500).send({error: 'Could not get booking for projections'});
              }else {
                db.query(forecastQ,(err,forecastR) => {
                  if (err) {
                    console.log(err)
                    res.status(500).send({error: 'Could not get booking forecasts for projections'});
                  }else {
                    res.status(200).send({
                      jobs:jobR.recordset,
                      planned:plannerR.recordset,
                      booked:bookedR.recordset,
                      forecasted:forecastR.recordset,
                    });
                  }
                })
              }
            })
          }
        })
      }
    })
  },
  addAutoResource:(req,res)=>{
    db.query(`delete from AutoResource where resourceDate>cast(getdate() as date) and jobID in (`+req.body.map(j=>j.jobID).join(",")+`)`, (err, d) => {
      db.query('select jobID,resourceDate,resourceHours,resourceHoursAcademy from AutoResource where arID<0', (err, result) => {
        var rtable=result.recordset.toTable('AutoResource')
        let r=0
        async function addRows(){
          if (r<req.body.length) {
            let row=req.body[r]
            await rtable.rows.add(row.jobID,new Date(row.dte),(row.needed?row.needed:0),(row.neededAcademy?row.neededAcademy:null))
            r++
            addRows()
          }else {
            db.bulk(rtable, (err, result) => {
              if (err) {
                console.log(err)
                res.status(500).send(err)
              }else {

                res.send("success")
              }
            })
          }
        }
        addRows()
      })
    })
  },
  removeAutoResource:(req,res)=>{
    db.query("delete from AutoResource where jobID in (select jobID from jobs where isJob"+req.params.shift+"=1) and resourceDate='"+req.params.dte+"'",(err,r)=>{
      if (err) {
        console.log(err)
      }else {
        res.send("success")
      }
    })
  },
  getSearch: (req,res) => {
    let term=req.query.term?` where label like '%`+req.query.term+`%'`:''
    let allQ=`
    select * from (
      select 'Agent' as dataType,agentID as id,agentName as label from agents
      UNION
      select 'FaceAgent' as dataType,agentID as id,agentName as label from FaceAgents
      UNION
      select 'Job' as dataType,quoteID as id,concat(quoteNo,' ',quoteName) as label from Quotes
    ) x
    `+term+`
    order by label
    `
    db.query(allQ,(err,allR) => {
      res.status(200).send(allR.recordset);
    })
  },
  eventSeen:(req,res)=>{
    var i=0
    function addSeen(){
      if (i<req.body.length) {
        var record=req.body[i]
        if (!record.seen) {
          db.query("insert into SeenLog (seenDate,eventType,eventID,seenBy,eventParentID) VALUES (getDate(),'"+record.eventType+"',"+record.eventID+","+req.user.user+","+record.parentID+")", (err,resp) => {
            if (err) {
              console.log(err)
              res.status(500).send(err)
            }else {
              i++
              addSeen()
            }
          })
        }else {
          i++
          addSeen()
        }
      }else {
        res.send('done')
      }
    }
    addSeen()
  },
  saveImg:(req,res)=>{
    const { ref,uploadString,getDownloadURL }=require("firebase/storage");
    let b64=req.body.b64.replace('data:image/'+(['jpg','jpeg'].includes(req.body.ext)?'jpeg':'png')+';base64,', '')
    let crypto = require('crypto');
    let filename=req.body.filename?req.body.filename:crypto.randomBytes(32).toString('hex')
    const imgRef=ref(firestore,"projectQueries/"+filename+'.'+req.body.ext);
    const file=Buffer.from(b64, "base64")
    uploadString(imgRef, b64, "base64").then((snapshot) => {
      console.log('Uploaded a file!',snapshot);
      getDownloadURL(imgRef).then(url=>{
        res.send(url);
      }).catch(err=>{
        res.status(500).send(err)
      })
    }).catch(err=>{
      res.status(500).send(err)
    })
  },
  resourcePlannerAjax:(req,res)=>{
    const _ = require('lodash')
    let jobQ=`
    SELECT *,cm.staffEmail cmEmail,pm.staffEmail pmEmail,isnull(isConfirmed,1) datesConfirmed FROM
    Jobs j
    left join Projects p on p.projectID=j.projectID
    left join Quotes q on q.quoteID=p.quoteID
    outer apply (select top 1 note noteRp from AllNotes where page='view-planner' and jobID=j.jobID) n
    left join getResourceNeeded(0) r on r.jobID=j.jobID
    left join staff cm on cm.staffID=p.projectCM
    left join staff pm on pm.staffID=p.projectDP
    outer apply (select top 1 isConfirmed from DateChanges where jobID=j.jobID order by changedDate DESC) d
    where coalesce(nullif(j.isJobDay,0),nullif(j.isJobEve,0)) is not null and isJobCATI=1 and isJobInHouse=1 and isProjectLive=1 and j.startDate<dateAdd(day,`+req.query.dateCount+`,getdate()) and j.endDate>=cast(GETDATE() as date) and q.quoteID>2
    order by j.jobID,coalesce(r.dtJobID,nullif(j.isJobDay,0),nullif(j.isJobEve,0))`
    let notesQ=`
    select * from AllNotes where page='view-planner' and tableName='Jobs'
    `
    let ahrQ=`select inputDate,jobID,0.00+sum(inputInterviews)/sum(inputHours) ahr from DailyInput where inputDate<cast(getdate() as date) group by inputDate,jobID order by inputDate ASC`
    let allocQ=`select * from AutoAllocations l
    left join agents a on a.agentID=l.agentID
    where allocDate>=getDate()`
    db.multiple=true
    db.query(jobQ,(err,jobR) => {
      if (err) {
        console.log(err)
        res.status(500).send({error: 'Could not get jobs for resource planner'});
      }else {
        const ps = new sql.Request()
        ps.input('jobID', 0)
        ps.execute('getJobResourcePlan',(err,dailyR)=>{
          if (err) {
            console.log('Could not get dailys for resource planner',err)
            res.status(500).send({error: 'Could not get dailys for resource planner'});
          }else {
            db.query(notesQ,(err,notesR) => {
              if (err) {
                console.log(err)
                res.status(500).send({error: 'Could not get notes for resource planner'});
              }else {
                ps.input('dateCount', req.query.dateCount)
                delete ps.parameters.jobID
                ps.execute('spNeededBooked',(err,totalsR)=>{
                  if (err) {
                    console.log(err)
                    res.status(500).send({error: 'Could not get totals for resource planner'});
                  }else {
                    db.query(ahrQ,(err,ahrR) => {
                      if (err) {
                        console.log(err)
                        res.status(500).send({error: 'Could not get ahr for resource planner'});
                      }else {
                        db.query(allocQ,(err,allocR) => {
                          if (err) {
                            console.log(err)
                            res.status(500).send({error: 'Could not get allocations for resource planner'});
                          }else {
                            let planner=jobR.recordset.map(job=>{
                              job.jobID=job.jobID[0]
                              dailyR.recordset.filter(d=>d.jobID==job.jobID && d.dte).forEach(dte=>{
                                job[dte.dte.toISOString().split("T")[0]]=dte
                              })
                              job.note=notesR.recordset.find(n=>n.jobID==job.jobID)
                              job.ahrLine=ahrR.recordset.filter(n=>n.jobID==job.jobID)
                              job.isJobDay=job.isJobDay[0]
                              job.isJobEve=job.isJobEve[0]
                              job.resourceTarget=job.resourceTarget==null?null:job.resourceTarget[0]
                              job.interviewsTarget=job.jobTarget
                              job.startDate=job.startDate[0]
                              job.endDate=job.endDate[0]
                              job.allocations=allocR.recordset.filter(n=>n.jobID==job.jobID)
                              return job
                            })
                            // console.log(req.query.dateCount,dailyR.recordset.filter(d=>d.dte).length,_.uniqBy(dailyR.recordset.filter(d=>d.dte),b=>b.dte.toISOString()).slice(0,req.query.dateCount))
                            res.send({
                              planner:planner,
                              dates:_.uniqBy(dailyR.recordset.filter(d=>d.dte),b=>b.dte.toISOString()).slice(0,req.query.dateCount),
                              totals:totalsR.recordset
                            });
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
  getBooked:(req,res)=>{
    var dte=req.body.date?"='"+req.body.date+"'":'>= cast(getDate() as date)'
    let bookingQ=`
    select sum(DATEDIFF(second, Booking.startTime, Booking.endTime) / 3600.0) as Hours, isDay, isEve, bookingDate from booking left join AgentTeams on AgentTeams.agentTeamID=booking.bookingTeamID
    where bookingDate`+dte+` and isAllocatable=1
    group by isDay, isEve, bookingDate`
    db.query(bookingQ,(err,bookingR) => {
      res.status(200).send(bookingR.recordset);
    })
  },
  liveReport:(req,res)=>{
    req.params.date=req.params.date==0?moment().format("YYYY-MM-DD"):req.params.date
    let jobQ=`select * from ViewJobsStats where jobID in (select j.jobID from DailyInput left join jobs j on j.jobID=DailyInput.jobID where inputDate='`+req.params.date+`' and j.projectID>2)`
    let dailyQ=`
    select d.agentID,a.agentName,d.jobID,j.fullJobName,a.vistaName as avName, j.vistaName as jvName,shift,p.payrate,d.excludeFromLiveReport
    from DailyInput d
    left join (select distinct bookingDate,agentID,case when isDay=1 then 'd' else 'e' end as shift,isEve from Booking b left join AgentTeams t on b.bookingTeamID=t.agentTeamID) bt on bt.bookingDate=d.inputDate and bt.agentID=d.agentID
    left join Agents a on a.agentID=d.agentID
    left join ViewJobsStats j on j.jobID=d.jobID
    left join getPayRates('`+req.params.date+`','`+req.params.date+`') p on p.agentID=d.agentID and p.inputDate=d.inputDate
    where d.inputDate='`+req.params.date+`' and j.jobProjectID>2 `+(req.params.shift!='de'?"and shift ='"+req.params.shift+"'":"")+`
    `
    let reportQ=`select a.jobID,a.agentID,a.reportDate,a.reportHour,isnull(e.inputInterviews,a.inputInterviews) as inputInterviews,isnull(e.hourWorked,a.hourWorked) as hourWorked from AskiaLiveReports a
    left join AskiaLiveReportsEdits e on e.reportDate=a.reportDate and e.agentID=a.agentID and e.jobID=a.jobID and e.reportHour=a.reportHour
	where a.reportDate='`+req.params.date+`'
    union
    select jobID,agentID,reportDate,reportHour,inputInterviews,hourWorked from AskiaLiveReportsEdits e2 where e2.alrID not in (
    	select e3.alrID from AskiaLiveReports a left join AskiaLiveReportsEdits e3 on e3.reportDate=a.reportDate and e3.agentID=a.agentID and e3.jobID=a.jobID and e3.reportHour=a.reportHour
      where e3.alrID is not null
    	) and reportDate='`+req.params.date+`'`
    db.query(dailyQ,(err,dailyR) => {
      if (err) {
        console.log(err)
      }
      db.query(jobQ,(err,jobR) => {
        if (err) {
          console.log(err)
        }
        db.query(reportQ,(err,reportR) => {
          if (err) {
            console.log(err)
          }
          res.render("live-report.ejs", {
            title: "Live report",
            dte:req.params.date,
            dailys:dailyR.recordset,
            jobs:jobR.recordset,
            reports:reportR.recordset,
            shift:req.params.shift
          })
        })
      })
    })
  },
  updateLiveReportInclusion:(req,res)=>{
    let q=`update dailyInput set excludeFromLiveReport=`+(req.body.includeRow=='true'?0:1)+` where jobID=`+req.body.jobID+` and inputDate='`+req.body.inputDate+`'`
    if (req.body.agentID) {
      q=q+" and agentID="+req.body.agentID
    }
    db.query(q,(err,r)=>{
      if (err) {
        console.log(err,q)
        res.status(500).send({error:err})
      }else {
        res.send('done')
      }
    })
  },
  saveLiveReportNames:(req,res)=>{
    let q=""
    if (req.body.type=='Job') {
      q="update jobs set vistaName=@vistaName"+(req.body.forstaGroupID?", forstaGroupID="+req.body.forstaGroupID:"")+" where jobID="+req.body.id
    }else if (req.body.type=='Agent') {
      q="update agents set vistaName=@vistaName where agentID="+req.body.id
    }else if (req.body.type=='ForstaAgent') {
      q="update agents set forstaID=@vistaName where agentID="+req.body.id
    }
    db.input('vistaName',req.body.vistaName)
    db.query(q,(err,r) => {
      if (err) {
        console.log(err)
        res.status(500).send(err);
      }else {
        res.status(200).send('success');
      }
    })
  },
  saveLiveReport:(req,res)=>{
    let delQ="delete from AskiaLiveReports where reportDate='"+req.body.date+"' and jobID="+req.body.jobID
    db.query(delQ,(err,delR) => {
      if (err) {
        console.log(err)
        res.status(500).send(err);
      }else {
        db.query('select jobID,agentID,reportDate,reportHour,inputInterviews,hourWorked from AskiaLiveReports where alrID<0', (err, result) => {
          if (err) {
            console.log(err)
            res.status(500).send(err);
          }
          var table=result.recordset.toTable('AskiaLiveReports')
          var i=0
          function addRows(){
            if (i<req.body.data.length) {
              let row=req.body.data[i]
              table.rows.add(req.body.jobID, row.agentID, new Date(req.body.date), row.hour, row.ints, row.hourWorked)
              i++
              addRows()
            }else {
              db.bulk(table, (err, result) => {
                if (err) {
                  console.log(err)
                  res.status(500).send(err);
                }
                res.status(200).send('success');
              })
            }
          }
          addRows()
        })
      }
    })
  },
  saveLiveReportEdit:(req,res)=>{
    let delQ="delete from AskiaLiveReportsEdits where reportDate='"+req.body.date+"' and agentID="+req.body.agentID+" and jobID="+req.body.jobID+" and reportHour="+req.body.hour
    db.query(delQ,(err,delR) => {
      if (err) {
        console.log(err)
        res.status(500).send(err);
      }else {
        if (req.body.ints!=="") {
          db.query("insert into AskiaLiveReportsEdits (jobID,agentID,reportDate,reportHour,inputInterviews,hourWorked) VALUES ('"+req.body.jobID+"','"+req.body.agentID+"','"+req.body.date+"','"+req.body.hour+"','"+req.body.ints+"','"+req.body.hourWorked+"')", (err, result) => {
            if (err) {
              console.log(err)
              res.status(500).send(err);
            }else {
              res.status(200).send("success");
            }
          })
        }else {
          res.status(200).send("success");
        }
      }
    })
  },
  getLiveReportEdits:(req,res)=>{
    db.query("select * from AskiaLiveReportsEdits where reportDate='"+req.params.dte+"'",(err,selR) => {
      res.status(200).send(selR.recordset);
    })
  },
  clearLiveReportCell:(req,res)=>{
    let delQ="update AskiaLiveReports set hourWorked=0 where reportDate='"+req.body.date+"' and jobID="+req.body.jobID+" and agentID="+req.body.agentID+" and reportHour="+req.body.hour
    db.query(delQ,(err,delR) => {
      if (err) {
        console.log(err)
        res.status(500).send(err);
      }else {
        res.status(200).send('success');
      }
    })
  },
  adminPanel:(req,res)=>{
    let teamQ="select * from AgentTeams"
    let agentQ="select * from Agents"
    if (req.user.isAdmin) {
      db.query(teamQ,(err,teamR) => {
        if (err) {
          console.log(err)
        }else {
          db.query(agentQ,(err,agentR) => {
            if (err) {
              console.log(err)
            }else {
              res.render("admin-panel.ejs", {
                title: "Admin tools",
                teams: teamR.recordset,
                agents:agentR.recordset
              })
            }
          })
        }
      })
    }else {
      res.render("401.ejs", {
        title: "Page restricted"
      })
    }
  },
  clearCoachingFollowUps:(req,res)=>{
    console.log(req.body)
    let filt=`and a.teamID in (`+req.body.teamID+`)`
    if (req.body.agentID.length>0) {
      filt=`and a.agentID in (`+req.body.agentID+`)`
    }
    let selectQ=`
    select agentPlanID
    from agentPlans ap
    left join Agents a on a.agentID=ap.agentID
    where
    coachingFollowedUpDate is null
    and coachingFollowUpDate between '`+req.body.stDate+`' and '`+req.body.enDate+`'
    `+filt
    let delQ=`
    update agentPlans set coachingFollowedUpDate=getDate() where agentPlanID in (select agentPlanID
    from agentPlans ap
    left join Agents a on a.agentID=ap.agentID
    where
    coachingFollowedUpDate is null
    and coachingFollowUpDate between '`+req.body.stDate+`' and '`+req.body.enDate+`'
    `+filt+`)`
    db.query(selectQ,(err,selectR) => {
      if (err) {
        console.log(err,selectQ)
        res.status(500).send(err)
      }else {
        logger.info(req.user.uName+" cleared coaching follow-ups: ",selectR.recordset.map(el=>el.agentPlanID).join(", "))
        db.query(delQ,(err,delR) => {
          if (err) {
            console.log(err)
            res.status(500).send(err);
            logger.info(req.user.uName+" failed to clear coaching follow-ups")
          }else {
            res.status(200).send('success');
          }
        })
      }
    })
  },
  clearPDPs:(req,res)=>{
    console.log(req.body)
    let filt=`and teamID in (`+req.body.teamID+`)`
    if (req.body.agentID.length>0) {
      filt=`and ap.agentID in (`+req.body.agentID+`)`
    }
    let selectQ=`
    select agentPlanID
    from agentPlans ap
    left join Agents a on a.agentID=ap.agentID
    where
    pdpEndDate is not null
    and pdpOutcomeDate is null
    and pdpEndDate between '`+req.body.stDate+`' and '`+req.body.enDate+`'
    `+filt
    let delQ=`
    update agentPlans set pdpOutcomeDate=getDate(), pdpOutcome='Completed' where agentPlanID in (
    select agentPlanID
    from agentPlans ap
    left join Agents a on a.agentID=ap.agentID
    where
    pdpEndDate is not null
    and pdpOutcomeDate is null
    and pdpEndDate between '`+req.body.stDate+`' and '`+req.body.enDate+`'
    `+filt+`)`
    db.query(selectQ,(err,selectR) => {
      if (err) {
        logger.info(req.user.uName+" failed to get coaching follow-ups",selectQ)
        console.log(err,selectQ)
        res.status(500).send(err);
      }else {
        logger.info(req.user.uName+" cleared coaching follow-ups: ",selectR.recordset.map(el=>el.agentPlanID).join(", "))
        db.query(delQ,(err,delR) => {
          if (err) {
            console.log(err,delQ)
            res.status(500).send(err);
            logger.info(req.user.uName+" failed to clear coaching follow-ups")
          }else {
            res.status(200).send('success');
          }
        })
      }
    })
    // console.log(delQ)
    // res.status(200).send('success');
  },
  f2fTabletAdmin:(req,res)=>{
    let tabQ=`
    select t.tabletID,tabletName,tabletModel,isActive,lastPosted,lastReturned,allocationID
    from FaceTablets t
    left join (
    	select tabletID,max(postedDate) as lastPosted,max(returnedDate) as lastReturned,max(allocationID) as allocationID
    	from FaceTabletAllocations
    	group by tabletID
    ) a on a.tabletID=t.tabletID`
    let allocQ=`
    select allocationID,f.askiaID,tabletID,postedDate,returnedDate,sp.staffName as postedBy,sr.staffName as receivedBy,agentName,j.fullJobName,outN.note as checkoutNote,inN.note as checkinNote
    from FaceTabletAllocations f
    left join FaceAgents a on a.agentID=f.faceAgentID
    left join ViewJobsStats j on j.jobID=f.jobID
    left join Staff sp on sp.staffID=f.postedBy
    left join Staff sr on sr.staffID=f.receivedBy
    left join AllNotes inN on inN.otherID=f.allocationID and inN.page='check-in-tablet' and inN.tableName='FaceTabletAllocations'
    left join AllNotes outN on outN.otherID=f.allocationID and outN.page='check-out-tablet' and outN.tableName='FaceTabletAllocations'`
    let accQ=`
    select t.accID,accName,accModel,isActive,lastPosted,lastReturned,allocationID
    from FaceAccessories t
    left join (
    	select accID,max(postedDate) as lastPosted,max(returnedDate) as lastReturned,max(allocationID) as allocationID
    	from FaceAccessoryAllocations
    	group by accID
    ) a on a.accID=t.accID`
    let accAllocQ=`
    select allocationID,accID,postedDate,returnedDate,sp.staffName as postedBy,sr.staffName as receivedBy,agentName,j.fullJobName,outN.note as checkoutNote,inN.note as checkinNote
    from FaceAccessoryAllocations f
    left join FaceAgents a on a.agentID=f.faceAgentID
    left join ViewJobsStats j on j.jobID=f.jobID
    left join Staff sp on sp.staffID=f.postedBy
    left join Staff sr on sr.staffID=f.receivedBy
    left join AllNotes inN on inN.otherID=f.allocationID and inN.page='check-in-tablet' and inN.tableName='FaceAccessoryAllocations'
    left join AllNotes outN on outN.otherID=f.allocationID and outN.page='check-out-tablet' and outN.tableName='FaceAccessoryAllocations'`
    db.query(tabQ,(err,tabR) => {
      db.query(allocQ,(err,allocR) => {
        db.query(accQ,(err,accR) => {
          db.query(accAllocQ,(err,accAllocR) => {
            res.render('f2f-tablets.ejs',{
              title:'F2F Tablet Admin',
              tablets:tabR.recordset,
              allocations:allocR.recordset,
              accessories:accR.recordset,
              accAllocations:accAllocR.recordset,
            })
          })
        })
      })
    })
  },
  getF2fTabletAllocations:(req,res)=>{
    let allocQ=`
    select allocationID,f.tabletID,postedDate,returnedDate,sp.staffName as postedBy,sr.staffName as receivedBy,agentName,j.fullJobName,tabletName,tabletModel,askiaID
    from FaceTabletAllocations f
    left join FaceTablets t on t.tabletID=f.tabletID
    left join FaceAgents a on a.agentID=f.faceAgentID
    left join ViewJobsStats j on j.jobID=f.jobID
    left join Staff sp on sp.staffID=f.postedBy
    left join Staff sr on sr.staffID=f.receivedBy
    `
    let allocAccQ=`
    select allocationID,f.accID,postedDate,returnedDate,sp.staffName as postedBy,sr.staffName as receivedBy,agentName,j.fullJobName,accName,accModel
    from FaceAccessoryAllocations f
    left join FaceAccessories t on t.accID=f.accID
    left join FaceAgents a on a.agentID=f.faceAgentID
    left join ViewJobsStats j on j.jobID=f.jobID
    left join Staff sp on sp.staffID=f.postedBy
    left join Staff sr on sr.staffID=f.receivedBy
    `
    db.query(allocQ,(err,allocR) => {
      if (err) {
        console.log(err)
        res.status(500).send(err)
      }else {
        db.query(allocAccQ,(err,allocAccR) => {
          if (err) {
            console.log(err)
            res.status(500).send(err)
          }else {
            res.send({
              allocations:allocR.recordset,
              accAllocations:allocAccR.recordset
            })
          }
        })
      }
    })
  },
  checkInAccessory:(req,res)=>{
    let updateQ=`
    update FaceAccessoryAllocations set returnedDate=@returnedDate,receivedBy=`+req.body.allocation.receivedBy+`
    where allocationID in(select top 1 allocationID from FaceAccessoryAllocations where accID=`+req.body.allocation.accID+` order by postedDate desc)
    `
    let notesQ=`
    insert into AllNotes (tableName,otherID,date,note,page)
    values
    ('FaceAccessoryAllocations',`+req.body.allocation.allocationID+`,@returnedDate,@note,'check-in-tablet')
    `
    db.input('note',req.body.note)
    db.input('returnedDate',new Date(req.body.allocation.returnedDate))
    db.query(updateQ,(err,updateR) => {
      if (err) {
        console.log(err)
        res.status(500).send({error:err.originalError.message})
      }else {
        db.query(notesQ,(err,notesR) => {
          if (err) {
            console.log(err)
            res.status(500).send({error:err.originalError.message})
          }else {
            res.sendStatus(200)
          }
        })
      }
    })
  },
  checkInTablet:(req,res)=>{
    let updateQ=`
    update FaceTabletAllocations set returnedDate=@returnedDate,receivedBy=`+req.body.allocation.receivedBy+`
    where allocationID in(select top 1 allocationID from FaceTabletAllocations where tabletID=`+req.body.allocation.tabletID+` order by postedDate desc)
    `
    let notesQ=`
    insert into AllNotes (tableName,otherID,date,note,page)
    values
    ('FaceTabletAllocations',`+req.body.allocation.allocationID+`,@returnedDate,@note,'check-in-tablet')
    `
    db.input('note',req.body.note)
    db.input('returnedDate',new Date(req.body.allocation.returnedDate))
    db.query(updateQ,(err,updateR) => {
      if (err) {
        console.log(err)
        res.status(500).send({error:err.originalError.message})
      }else {
        db.query(notesQ,(err,notesR) => {
          if (err) {
            console.log(err)
            res.status(500).send({error:err.originalError.message})
          }else {
            res.sendStatus(200)
          }
        })
      }
    })
  },
  checkOutAccessory:(req,res)=>{
    let updateQ=`
    insert into FaceAccessoryAllocations (accID,postedDate,postedBy,faceAgentID,jobID) VALUES (`+req.body.allocation.accID+`,@postedDate,`+req.body.allocation.postedBy+`,
      (select faceAgentID from FaceTabletAllocations where allocationID=`+req.body.allocation.allocationID+`),
      (select jobID from FaceTabletAllocations where allocationID=`+req.body.allocation.allocationID+`))
    `
    let notesQ=`
    insert into AllNotes (tableName,otherID,date,note,page)
    values
    ('FaceAccessoryAllocations',`+req.body.allocation.allocationID+`,@postedDate,@note,'check-out-tablet')
    `
    db.input('note',req.body.note)
    db.input('postedDate',new Date(req.body.allocation.postedDate))
    db.query(updateQ,(err,updateR) => {
      if (err) {
        console.log(err)
        res.status(500).send({error:err.originalError.message})
      }else {
        db.query(notesQ,(err,notesR) => {
          if (err) {
            console.log(err)
            res.status(500).send({error:err.originalError.message})
          }else {
            res.sendStatus(200)
          }
        })
      }
    })
  },
  checkOutTablet:(req,res)=>{
    let updateQ=`
    update FaceTabletAllocations set tabletID=`+req.body.allocation.tabletID+`,postedDate=@postedDate,postedBy=`+req.body.allocation.postedBy+`,askiaID='`+req.body.allocation.askiaID+`'
    where allocationID=`+req.body.allocation.allocationID+`
    `
    let notesQ=`
    insert into AllNotes (tableName,otherID,date,note,page)
    values
    ('FaceTabletAllocations',`+req.body.allocation.allocationID+`,@postedDate,@note,'check-out-tablet')
    `
    db.input('note',req.body.note)
    db.input('postedDate',new Date(req.body.allocation.postedDate))
    db.query(updateQ,(err,updateR) => {
      if (err) {
        console.log(err)
        res.status(500).send({error:err.originalError.message})
      }else {
        db.query(notesQ,(err,notesR) => {
          if (err) {
            console.log(err)
            res.status(500).send({error:err.originalError.message})
          }else {
            res.sendStatus(200)
          }
        })
      }
    })
  },
  getF2fAgent:(req,res)=>{
    let id=req.params.agentID==0?"(select top 1 faceAgentID from FaceTabletAllocations where allocationID="+req.params.allocationID+")":req.params.agentID
    let q="select * from FaceAgents where agentID="+id
    console.log(q)
    db.query(q,(err,r) => {
      if (err) {
        console.log(err)
        res.status(500).send({error:err.originalError.message})
      }else {
        console.log(r.recordset[0])
        res.send(r.recordset[0])
      }
    })
  },
  inboundLinePage:(req,res)=>{
    let projQ=`
    select p.projectID,quoteNo,quoteName,c.clientName,case when getDate() between startDate and endDate then 1 else 0 end as isLive from
    projects p
    left join quotes q on q.quoteID=p.quoteID
    left join (select projectID,min(startDate) as startDate,max(endDate) as endDate,max(cast(isJobCATI as int)) as isJobCATI from jobs where isJobCATI=1 group by projectID) j on j.projectID=p.projectID
    left join Clients c on c.clientID=q.clientID
    where p.quoteID>3 and isJobCATI=1`
    let inbQ=`
    select createdDate,lineID,p.projectID,quoteName,quoteNo from InboundLineAssignments i
    left join projects p on p.projectID=i.projectID
    left join quotes q on q.quoteID=p.quoteID
    order by createdDate DESC`
    let noteQ=`
    select * from AllNotes where tableName='inboundLines' and page='inbound-lines'`
    rcPlatform.get('/restapi/v1.0/account/~/phone-number',{perPage:500}).then(function(resp){
      rcPlatform.get("/restapi/v1.0/account/~/extension/",{perPage:1000}).then(function(extensions){
        extensions.json().then(function(ext){
          resp.json().then(function(nums){
            db.query(projQ,(err,projR) => {
              if (err) {
                console.log(err)
                res.status(500).send({error:err.originalError.message})
              }else {
                db.query(inbQ,(err,inbR) => {
                  if (err) {
                    console.log(err)
                    res.status(500).send({error:err.originalError.message})
                  }else {
                    db.query(noteQ,(err,noteR) => {
                      if (err) {
                        console.log(err)
                        res.status(500).send({error:err.originalError.message})
                      }else {
                        res.render('inbound-lines.ejs',{
                          title:"Inbound Lines",
                          lines:nums.records.filter(el=>el.paymentType=='TollFree').map(el=>{el.extension=ext.records.find(e=>e.id==el.extension.id); return el}),
                          projects:projR.recordset,
                          assignments:inbR.recordset,
                          notes:noteR.recordset
                        })
                      }
                    })
                  }
                })
              }
            })
          })
        })
      })
    }).catch(function(err){
      res.send(err)
      console.log(err)
    })
  },
  updateInboundLine:(req,res)=>{
    if (req.body.label) {
      console.log("has lineID",req.body)
      rcPlatform.put("/restapi/v1.0/account/~/phone-number/"+req.body.lineID,{label:req.body.label}).then(function(e){
        e.json().then(function(e){
          rcPlatform.put('/restapi/v1.0/account/~/extension/'+e.extension.id,{contact:{firstName:req.body.extensionName,pronouncedName:{text:req.body.label}}}).then(function(r){
            r.json().then(function(r){
              if (req.body.projectID) {
                db.query("insert into InboundLineAssignments (lineID,projectID,createdDate) VALUES ('"+req.body.lineID+"',"+req.body.projectID+",getdate())",(err,projR) => {
                  db.query("update projects set inboundLineID='"+req.body.lineID+"' where projectID="+req.body.projectID,(err,projR) => {
                    if (err) {
                      res.send(err.originalError.message)
                      console.log(err)
                    }else {
                      res.send('success')
                    }
                  })
                })
              }else{
                db.query("update projects set inboundLineID=null where inboundLineID='"+req.body.lineID+"'",(err,projR) => {
                  if (err) {
                    res.send(err.originalError.message)
                    console.log(err)
                  }else {
                    res.send('success')
                  }
                })
              }
            })
          }).catch(function(err){
            res.send(err)
            console.log(err)
          })
        })
      }).catch(function(err){
        res.send(err)
        console.log(err)
      })
    }else {
      console.log("no lineID",req.body)
      rcPlatform.put("/restapi/v1.0/account/~/phone-number/"+req.body.lineID,{label:req.body.label}).then(function(e){
        e.json().then(function(e){
          rcPlatform.put('/restapi/v1.0/account/~/extension/'+e.extension.id,{contact:{firstName:req.body.extensionName,pronouncedName:{text:req.body.label}}}).then(function(r){
            r.json().then(function(r){
              db.query("update projects set inboundLineID=null where projectID='"+req.body.projectID+"'",(err,projR) => {
                if (err) {
                  res.send(err.originalError.message)
                  console.log(err)
                }else {
                  res.send('success')
                }
              })
            })
          })
        })
      })
    }
  },
  addComplaintPage:(req,res)=>{
    let projectQ=`
    select quoteNo,quoteName,projectID
    from
    Projects p
    left join Quotes q on q.quoteID=p.quoteID
    where q.quoteID>2
    `
    let agentQ=`
    select agentID,agentName,ringCentralID
    from
    agents
    where agentID>1
    order by agentName ASC
    `
    let staffsQ=`
    select staffID,staffName
    from
    staff
    where staffID>1
    order by staffName ASC
    `
    let catQ=`select * from complaintCategories`
    db.query(projectQ,(err,projectR) => {
      if (err) {
        console.log(err)
      }else {
        db.query(agentQ,(err,agentR) => {
          if (err) {
            console.log(err)
          }else {
            db.query(staffsQ,(err,staffsR) => {
              if (err) {
                console.log(err)
              }else {
                db.query(catQ,(err,catR) => {
                  if (err) {
                    console.log(err)
                  }else {
                    res.render("add-complaint.ejs",{
                      title:"Add a complaint",
                      projects:projectR.recordset,
                      agents:agentR.recordset,
                      staffs:staffsR.recordset,
                      complaint:null,
                      categories:catR.recordset,
                      outcomeFiles:null
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
  addComplaint:(req,res)=>{
    const fs = require('fs');
    let fields=[]
    let values=[]
    for (const [key, value] of Object.entries(req.body)) {
      if(['reason','action','raisedDate'].includes(key)){
        values.push("@"+key)
      }else {
        values.push(value?"'"+value+"'":"null")
      }
      fields.push(key)
    }
    let insertQ=`
    insert into complaints (`+fields.join(",")+`) values (`+values.join(",")+`); SELECT SCOPE_IDENTITY() as complaintID`
    db.input("reason",req.body.reason)
    db.input("action",req.body.action)
    db.input("raisedDate", sql.DateTime, new Date(req.body.raisedDate));
    db.query(insertQ,(err,insertR) => {
      if (err) {
        console.log(err)
      }else {
        const { ref,uploadBytes }=require("firebase/storage");
        let files=req.files.InitialDocs.length>0?req.files.InitialDocs:[req.files.InitialDocs]
        files.forEach((file, i) => {
          const imgRef=ref(firestore,'complaints/'+insertR.recordset[0].complaintID+'/Initial/'+file.name);
          uploadBytes(imgRef, file.data).then((snapshot) => {
            console.log("added file",snapshot)
          })
        });
        // fs.mkdir(publicPath+'/complaints/'+insertR.recordset[0].complaintID+'/Initial', { recursive: true }, (err) => {
        //   if (req.files) {
        //     console.log(req.files)
        //     let files=req.files.InitialDocs.length>0?req.files.InitialDocs:[req.files.InitialDocs]
        //     files.forEach((file, i) => {
        //       file.mv(publicPath+'/complaints/'+insertR.recordset[0].complaintID+'/Initial/'+file.name)
        //     });
        //   }
          let ownerQ=`
          select staffEmail,staffName from
          complaints c
          left join staff s on s.staffID=c.ownerID
          where complaintID=`+insertR.recordset[0].complaintID
          db.query(ownerQ,(err,ownerR)=>{
            let sendTo=['pjaeger@teamsearchmr.co.uk','tokulus@teamsearchmr.co.uk']
            sendTo.push(ownerR.recordset[0].staffEmail)
            let mailOptions = {
              from:'Complaints <reports@teamsearchmr.co.uk>',
              to: sendTo,
              subject: 'New complaint added for '+ownerR.recordset[0].staffName+' - ID '+insertR.recordset[0].complaintID,
              html: '<p>' + header + '<p>A new complaint has been started. The complaint will be owned by '+ownerR.recordset[0].staffName+'. The deadline to complete the initial investigation is '+moment(req.body.outcomeDue).format("DD/MM/YYYY")+'. For full details click the link below:<br><br>http://job-analysis:8080/edit-complaint/'+insertR.recordset[0].complaintID+'<br><br>' + footer + '</p>',
              priority: 'high'
            }
            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.log(error);
                logger.info(req.user.uName+" failed to send complaint added confirmation: ",mailOptions)
              }else {

              }
            });
          })
          res.redirect('/complaints-log')
        // })
      }
    })
  },
  editComplaint:(req,res)=>{
    const fs = require('fs');
    let projectQ=`
    select quoteNo,quoteName,projectID
    from
    Projects p
    left join Quotes q on q.quoteID=p.quoteID
    where q.quoteID>2
    `
    let agentQ=`
    select agentID,agentName,ringCentralID
    from
    agents
    where agentID>1
    order by agentName ASC
    `
    let staffsQ=`
    select staffID,staffName
    from
    staff
    where staffID>1
    order by staffName ASC
    `
    let catQ=`select * from complaintCategories`
    let complaintQ=`
    select * from complaints
    where complaintID=`+req.params.id
    db.query(projectQ,(err,projectR) => {
      if (err) {
        console.log(err)
      }else {
        db.query(agentQ,(err,agentR) => {
          if (err) {
            console.log(err)
          }else {
            db.query(staffsQ,(err,staffsR) => {
              if (err) {
                console.log(err)
              }else {
                db.query(complaintQ,(err,complaintR) => {
                  if (err) {
                    console.log(err)
                  }else {
                    db.query(catQ,(err,catR) => {
                      if (err) {
                        console.log(err)
                      }else {
                        const { ref,listAll,getDownloadURL }=require("firebase/storage");
                        let stages=["Initial","Outcome","Response","Feedback","Recordings"]
                        let files={}
                        Promise.all(stages.map(stage=>{
                          files[stage]=[]
                          return new Promise(lres=>{
                            const stageRef=ref(firestore, 'complaints/'+req.params.id+'/'+stage+'/');
                            listAll(stageRef).then(fileRef=>{
                              promForEach(fileRef.items,(itemRef,ri,inext)=>{
                                getDownloadURL(itemRef).then(url=>{
                                  files[stage]=(files[stage]||[]).concat({name:itemRef.name,url:url,path:itemRef.fullPath})
                                  inext()
                                }).catch(err=>{
                                  console.log(err)
                                  inext()
                                })
                              }).then(e=>{
                                lres()
                              })
                            })
                          })
                        })).then(e=>{
                          console.log(files)
                          // fs.readdir(publicPath+'/complaints/'+req.params.id+'/Initial/', (err, files) => {
                          //   fs.readdir(publicPath+'/complaints/'+req.params.id+'/Outcome/', (err, outcomeFiles) => {
                          //     fs.readdir(publicPath+'/complaints/'+req.params.id+'/Response/', (err, responseFiles) => {
                          //       fs.readdir(publicPath+'/complaints/'+req.params.id+'/Feedback/', (err, feedbackFiles) => {
                          //         fs.readdir(publicPath+'/complaints/'+req.params.id+'/Recordings/', (err, recordings) => {
                                    res.render("add-complaint.ejs",{
                                      title:"Update complaint",
                                      projects:projectR.recordset,
                                      agents:agentR.recordset,
                                      staffs:staffsR.recordset,
                                      complaint:complaintR.recordset[0],
                                      categories:catR.recordset,
                                      files:files,
                                    })
                          //         })
                          //       })
                          //     })
                          //   })
                          // })
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
  getComplaintsLog:(req,res)=>{
    let complaintQ=`
    select complaintID,raisedDate,complainantName,concat(quoteNo,' ',quoteName) as projectName,reason,action,staffName as ownerName,categoryName,
    case
      when feedbackDate is not null then 'Closed'
      when repliedDate is not null then 'Responded, awaiting confirmation from complainant'
      when outcomeDate is not null then 'Investigation complete'
      else 'Raised, awaiting investigation'
    end as status,
    ISNULL(feedbackDue,ISNULL(responseDue,ISNULL(outcomeDue,null))) as nextDue
    from
    complaints c
    left join projects p on p.projectID=c.projectID
    left join quotes q on p.quoteID=q.quoteID
    left join staff s on s.staffID=c.ownerID
    left join complaintCategories cc on cc.categoryID=c.categoryID`
    db.query(complaintQ,(err,complaintR) => {
      if (err) {
        console.log(err)
      }else {
        res.send({
          complaints:complaintR.recordset,
        })
      }
    })
  },
  complaintsLog:(req,res)=>{
    res.render("complaints-log.ejs",{
      title:'Complaints Log'
    })
  },
  updateComplaint:(req,res)=>{
    const fs = require('fs');
    let fields=[]
    let values=[]
    for (const [key, value] of Object.entries(req.body)) {
      if(['reason','action','raisedDate','outcome','outcomeDate','repliedDate'].includes(key)){
        values.push("@"+key)
      }else {
        values.push(value?"'"+value+"'":"null")
      }
      fields.push(key)
    }
    let updateQ=`
    update complaints set `+fields.map((el,i)=>el+"="+values[i]).join(",")+` where complaintID=`+req.params.id
    db.input("reason",req.body.reason)
    db.input("action",req.body.action)
    db.input("outcome",req.body.outcome)
    if (req.body.raisedDate) {
      db.input("raisedDate", sql.DateTime, new Date(req.body.raisedDate));
    }
    if (req.body.repliedDate) {
      db.input("repliedDate", sql.DateTime, new Date(req.body.repliedDate));
    }
    if (req.body.outcomeDate) {
      db.input("outcomeDate", sql.DateTime, new Date(req.body.outcomeDate));
    }
    if (req.body.outcomeDue) {
      db.input("outcomeDue", sql.DateTime, new Date(req.body.outcomeDue));
    }
    if (req.body.responseDue) {
      db.input("responseDue", sql.DateTime, new Date(req.body.responseDue));
    }
    if (req.body.feedbackDue) {
      db.input("feedbackDue", sql.DateTime, new Date(req.body.feedbackDue));
    }
    console.log(updateQ)
    db.query(updateQ,(err,updateR) => {
      if (err) {
        console.log(err)
      }else {
        // fs.mkdir(publicPath+'/complaints/'+req.params.id+'/'+req.params.stage, { recursive: true }, (err) => {
          if (req.files) {
            const { ref,uploadBytes }=require("firebase/storage");
            let files=req.files[req.params.stage+"Docs"].length>0?req.files[req.params.stage+"Docs"]:[req.files[req.params.stage+"Docs"]]
            files.forEach((file, i) => {
              const imgRef=ref(firestore,'complaints/'+req.params.id+'/'+req.params.stage+'/'+file.name);
              uploadBytes(imgRef, file.data).then((snapshot) => {
                console.log("added file",snapshot)
              })
            });
          }
          let ownerQ=`
          select staffEmail from
          complaints c
          left join staff s on s.staffID=c.ownerID
          where complaintID=`+req.params.id
          db.query(ownerQ,(err,ownerR)=>{
            let sendTo=['tokulus@teamsearchmr.co.uk','matt@teamsearchmr.co.uk']
            sendTo.push(ownerR.recordset[0].staffEmail)
            let mailOptions = {
              from:'Complaints <reports@teamsearchmr.co.uk>',
              to: sendTo,
              subject: 'Complaint updated - ID '+req.params.id,
              html: '<p>' + header + '<p>This complaint has been updated by '+req.user.uName+'. To view the complaint in full, click the link below:<br><br>http://job-analysis:8080/edit-complaint/'+req.params.id+'<br><br>' + footer + '</p>',
            }
            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.log(error);
                logger.info(req.user.uName+" failed to send complaint added confirmation: ",mailOptions)
              }else {

              }
            });
          })
          res.redirect('/complaints-log')
        // })
      }
    })
  },
  deleteFile:(req,res)=>{
    const fs = require('fs');
    const { ref,deleteObject }=require("firebase/storage");
    const fileRef=ref(firestore,req.body.path)
    deleteObject(fileRef).then(() => {
      res.send("success")
    }).catch((error) => {
      console.log(error,req.body.path)
      res.status(500).send({error:err})
    });
    // fs.unlink(publicPath+req.body.url, (err) => {
    //   if (err) {
    //     console.log(err)
    //     res.status(500).send({error:err})
    //   }else {
    //     res.send("success")
    //   }
    // })
  },
  recordingSearch:(req,res)=>{
    const fs = require('fs');
    let dte=req.body.date
    let dateFrom=req.body.dateFrom?req.body.dateFrom:dte
    let dateTo=req.body.dateTo?req.body.dateTo:moment(dte).add(1,'d').format("YYYY-MM-DD")
    let params={}
    if (req.body.phoneNum) {
      params.phoneNumber="44"+req.body.phoneNum
    }
    if (dateFrom) {
      params.dateFrom=dateFrom
      params.dateTo=dateTo
    }else {
      params.dateFrom=moment().subtract(90,'d').format("YYYY-MM-DD")
      params.dateTo=moment().format("YYYY-MM-DD")
    }
    params.perPage=10000
    params.recordingType='All'
    // params.view='Simple'
    // params.showBlocked=true
    params.withRecording=true
    console.log(req.body,params)
    // fs.readdir(publicPath+'/complaints/'+req.params.id+'/Recordings/', (err, recordings) => {
      const { ref,listAll }=require("firebase/storage");
      let recRef=ref(firestore,'complaints/'+req.params.id+'/Recordings/')
      listAll(recRef).then(fileRef=>{
        let recordings=fileRef.items.map(item=>item.name).join(",")
        var recs=[]
        let p=0
        function sleep(ms) {
          return new Promise((resolve) => {
            setTimeout(resolve, ms);
          });
        }
        let q="/restapi/v1.0/account/~/call-log"
        if (req.body.extID) {
          q="/restapi/v1.0/account/~/extension/"+req.body.extID+"/call-log"
        }
        // console.log(req.body)
        function getPages(){
          params.page=p+1
          rcPlatform.get(q,params).then(function(resp){
            resp.json().then(function(log){
              if (log.paging.pageEnd || log.paging.page==1) {
                recs=recs.concat(log.records)
                p++
                sleep(300).then(function(e){
                  getPages()
                })
              }else {
                recs=recs.map(el=>{
                  el.added=recordings?recordings.join(",").indexOf(el.recording.id)>-1:false
                  return el
                })
                res.send(recs)
              }
            })
          }).catch(function(err){
            console.log(err);
            res.status(500).send(err)
          })
        }
        getPages()
      })
    // })
  },
  addComplaintRecording:(req,res)=>{
    const axios = require('axios');
    const fs = require('fs');
    rcMedia.get("/restapi/v1.0/account/~/recording/"+req.body.recordingID+"/content/").then(function(logResp){
      logResp.buffer().then(function(result){
        const { ref,uploadBytes,getDownloadURL }=require("firebase/storage");
        const fileRef=ref(firestore,'complaints/'+req.body.complaintID+'/Recordings/'+req.body.recordingID+".mp3")
        uploadBytes(fileRef,result).then(e=>{
          const addedRef=ref(firestore,'complaints/'+req.body.complaintID+'/Recordings/'+req.body.recordingID+".mp3")
          getDownloadURL(addedRef).then(url=>{
            res.send({url:url,path:addedRef.fullPath,name:addedRef.name})
          })
        }).catch(err=>{
          console.log(err)
          res.status(500).send(err)
        })
        // fs.mkdir(publicPath+'/complaints/'+req.body.complaintID+'/Recordings', { recursive: true }, (err) => {
        //   let out=publicPath + '/complaints/'+req.body.complaintID+'/Recordings/'+req.body.recordingID+".mp3"
        //   fs.writeFileSync(out, result);
        //   res.send("success")
        // })
      }).catch(function(e){
        console.log(e)
        res.status(500).send(e)
      })
    }).catch(function(e){
      console.log(e)
      res.status(500).send(e)
    })
  },
  getRCrecordingStream:(req,res)=>{
    const axios = require('axios');
    const fs = require('fs');
    rcMedia.get("/restapi/v1.0/account/~/recording/"+req.params.id+"/content/").then(function(logResp){
      logResp.buffer().then(function(result){
        res.send(result)
      }).catch(function(e){
        console.log(e)
        res.status(500).send(e)
      })
    }).catch(function(e){
      console.log(e)
      res.status(500).send(e)
    })
  },
  addSupplierPage:(req,res)=>{
    db.query("select * from suppliers",(err,supR)=>{
      if (err) {
        console.log(err)
      }
      res.render("add-supplier.ejs",{
        title:"Add new supplier",
        suppliers:supR.recordset,
        supplier:null
      })
    })
  },
  editSupplierPage:(req,res)=>{
    let supQ=`
    select top 1 * from
    suppliers s
    left join AllNotes n on n.tableName='Suppliers' and n.otherID=s.supplierID and page='add-supplier'
    where supplierID=`+req.params.id
    db.query("select * from suppliers",(err,supsR)=>{
      if (err) {
        console.log(err)
      }
      db.query(supQ,(err,supR)=>{
        if (err) {
          console.log(err,)
        }
        res.render("add-supplier.ejs",{
          title:"Add new supplier",
          suppliers:supsR.recordset,
          supplier:supR.recordset[0],
          files:[]
        })
      })
    })
  },
  addSupplier:(req,res)=>{
    let insQ=`insert into Suppliers (
      supplierName,
      contactName,
      contactEmail,
      contactTel,
      isOnlineB2B,
      isOnlineCons,
      isConsSample,
      isB2bSample,
      isUkFieldwork,
      isIntFieldwork,
      isIncentives,
      isF2fFieldwork,
      isAdmin,
      isSupplierPreferred,
      isSupplierActive,
      onboardedDate,
      iso
    ) VALUES (
      @supplierName,
      @contactName,
      @contactEmail,
      @contactTel,
      `+(req.body.isOnlineB2B?1:0)+`,
      `+(req.body.isOnlineCons?1:0)+`,
      `+(req.body.isConsSample?1:0)+`,
      `+(req.body.isB2bSample?1:0)+`,
      `+(req.body.isUkFieldwork?1:0)+`,
      `+(req.body.isIntFieldwork?1:0)+`,
      `+(req.body.isIncentives?1:0)+`,
      `+(req.body.isF2fFieldwork?1:0)+`,
      `+(req.body.isAdmin?1:0)+`,
      `+(req.body.isSupplierPreferred?1:0)+`,
      `+(req.body.isSupplierActive?1:0)+`,
      '`+req.body.onboardedDate+`',
      '`+req.body.iso+`'
    );
    select scope_identity() as id`
    db.input('supplierName',req.body.supplierName)
    db.input('contactName',req.body.contactName)
    db.input('contactEmail',req.body.contactEmail)
    db.input('contactTel',req.body.contactTel)
    db.query(insQ,(err,insR)=>{
      if (err) {
        console.log(err,insQ)
        req.flash('error_msg','Error adding supplier. Contact the system administrator')
        req.session.save(function () {
          res.redirect('/view-suppliers/')
        })
      }
      let noteQ="insert into AllNotes (tableName,otherID,note,page) VALUES ('Suppliers',"+insR.recordset[0].id+",@note,'add-supplier')"
      db.input('note',req.body.notes)
      db.query(noteQ,(err,noteR)=>{
        if (err) {
          console.log(err)
          req.flash('error_msg','Error adding supplier. Contact the system administrator')
          req.session.save(function () {
            res.redirect('/view-suppliers/')
          })
        }
        req.flash('success_msg','Supplier added')
        req.session.save(function () {
          res.redirect('/view-suppliers/')
        })
      })
    })
  },
  editSupplier:(req,res)=>{
    let insQ=`update Suppliers set
      supplierName=@supplierName,
      contactName=@contactName,
      contactEmail=@contactEmail,
      contactTel=@contactTel,
      isOnlineB2B=`+(req.body.isOnlineB2B=='1'?1:0)+`,
      isOnlineCons=`+(req.body.isOnlineCons=='1'?1:0)+`,
      isConsSample=`+(req.body.isConsSample=='1'?1:0)+`,
      isB2bSample=`+(req.body.isB2bSample=='1'?1:0)+`,
      isUkFieldwork=`+(req.body.isUkFieldwork=='1'?1:0)+`,
      isIntFieldwork=`+(req.body.isIntFieldwork=='1'?1:0)+`,
      isIncentives=`+(req.body.isIncentives=='1'?1:0)+`,
      isF2fFieldwork=`+(req.body.isF2fFieldwork=='1'?1:0)+`,
      isSupplierActive=`+(req.body.isSupplierActive=='1'?1:0)+`,
      isSupplierPreferred=`+(req.body.isSupplierPreferred=='1'?1:0)+`,
      isAdmin=`+(req.body.isAdmin=='1'?1:0)+`,
      onboardedDate='`+req.body.onboardedDate+`',
      iso='`+req.body.iso+`'
    where supplierID=`+req.params.id
    db.input('supplierName',req.body.supplierName)
    db.input('contactName',req.body.contactName)
    db.input('contactEmail',req.body.contactEmail)
    db.input('contactTel',req.body.contactTel)
    db.query(insQ,(err,insR)=>{
      if (err) {
        console.log(err)
        req.flash('error_msg','Error updating supplier. Contact the system administrator')
        req.session.save(function () {
          res.redirect('/view-suppliers/')
        })
      }
      let noteQ="update AllNotes set note=@note where tableName='Suppliers' and page='add-supplier' and otherID="+req.params.id
      db.input('note',req.body.notes)
      db.query(noteQ,(err,noteR)=>{
        if (err) {
          console.log(err)
          req.flash('error_msg','Error updating supplier. Contact the system administrator')
          req.session.save(function () {
            res.redirect('/view-suppliers/')
          })
        }
        req.flash('success_msg','Supplier updated')
        req.session.save(function () {
          res.redirect('/view-suppliers/')
        })
      })
    })
  },
  deleteSupplier:(req,res)=>{
    db.query("select * from projectSpends where supplierID="+req.params.id,(checkR,err)=>{
      if (checkR.recordset.length>0) {
        res.send("There are spends already logged with this supplier, so it cannot be deleted.")
      }else {
        let insQ=`delete from Suppliers where supplierID=`+req.params.id
        db.query(insQ,(err,insR)=>{
          if (err) {
            console.log(err)
            req.flash('error_msg','Error deleting supplier. Contact the system administrator')
            req.session.save(function () {
              res.redirect('/view-suppliers/')
            })
          }
          let noteQ="delete from AllNotes where tableName='Suppliers' and page='add-supplier' and otherID="+req.params.id
          db.query(noteQ,(err,noteR)=>{
            if (err) {
              console.log(err)
              req.flash('error_msg','Error deleting supplier. Contact the system administrator')
              req.session.save(function () {
                res.redirect('/view-suppliers/')
              })
            }
            req.flash('success_msg','Supplier deleted')
            req.session.save(function () {
              res.redirect('/view-suppliers/')
            })
          })
        })
      }
    })
  },
  viewSuppliers:(req,res)=>{
    let supQ="select * from suppliers s left join (select supplierID as supID,max(reviewDate) as lastReview from supplierReviews group by supplierID) r on r.supID=s.supplierID"
    db.query(supQ,(err,supR)=>{
      res.render("view-suppliers",{
        title:"View suppliers",
        suppliers:supR.recordset,
        success_msg: req.flash('success_msg'),
        error_msg: req.flash('error_msg')
      })
    })
  },
  reviewSupplier:(req,res)=>{
    let queries=[]
    queries.push({
      name:'typeTotals',
      q:`
      select typeID,count(distinct projectID) as projects,sum(units) as units,avg(unitValue) as avgUnitValue,avg(units) as avgUnits,avg(unitValue*units) as avgSpend,sum(unitValue*units) as spend  from
      ProjectSpends
      group by typeID`
    })
    queries.push({
      name:'supplierTotals',
      q:`
      select supplierID,count(distinct projectID) as projects,sum(units) as units,avg(unitValue) as avgUnitValue,avg(units) as avgUnits,avg(unitValue*units) as avgSpend,sum(unitValue*units) as spend  from
      ProjectSpends
      group by supplierID`
    })
    queries.push({
      name:'typeSuppliers',
      q:`
      select typeID,supplierID,count(distinct projectID) as projects,sum(units) as units,avg(unitValue) as avgUnitValue,avg(units) as avgUnits,avg(unitValue*units) as avgSpend,sum(unitValue*units) as spend  from
      ProjectSpends
      group by typeID,supplierID`
    })
    queries.push({
      name:'supplierResp',
      q:`
      select top 1 * from
      suppliers s
      left join AllNotes n on n.tableName='Suppliers' and n.otherID=s.supplierID and page='add-supplier'
      where supplierID=`+req.params.id
    })
    queries.push({
      name:'costTypes',
      q:`
      select * from costTypes`
    })
    let i=0
    let renders={
      title:"Supplier Review",
      files:[]
    }
    function runQueries(){
      if (i<queries.length) {
        db.query(queries[i].q,(err,resp)=>{
          if (err) {
            console.log(err,queries[i].q)
            res.send(err)
          }else {
            renders[queries[i].name]=resp.recordset
            i++
            runQueries()
          }
        })
      }else {
        res.render("review-supplier.ejs",renders)
      }
    }
    runQueries()
  },
  submitSupplierReview:(req,res)=>{
    for (const [key, value] of Object.entries(req.body)) {
      req.body[key]=(value?value:"null")
    }
    let insQ=`
    INSERT INTO [dbo].[SupplierReviews]
      ([supplierID]
      ,[reviewDate]
      ,[reviewChanges]
      ,[commsSpeedRating]
      ,[commsQualityRating]
      ,[quoteSpeedRating]
      ,[competitivenessRating]
      ,[productRangeRating]
      ,[productQualityRating]
      ,[easeOfUseRating]
      ,[deliverySpeedRating]
      ,[aftercareRating]
      ,[complianceRating]
      ,[overallRating]
      ,[reviewedBy])
    VALUES
      (`+req.params.id+`
      ,'`+moment.utc().format("YYYY-MM-DD")+`'
      ,'`+req.body.reviewChanges+`'
      ,`+req.body.commsSpeedRating+`
      ,`+req.body.commsQualityRating+`
      ,`+req.body.quoteSpeedRating+`
      ,`+req.body.competitivenessRating+`
      ,`+req.body.productRangeRating+`
      ,`+req.body.productQualityRating+`
      ,`+req.body.easeOfUseRating+`
      ,`+req.body.deliverySpeedRating+`
      ,`+req.body.aftercareRating+`
      ,`+req.body.complianceRating+`
      ,`+req.body.overallRating+`
      ,`+req.user.user+`)`
    function updateSupplier(){
      return new Promise((resolve,reject) => {
        let updateQ="update Suppliers set "
        if (req.body.reviewChanges!="{}") {
          let changes=JSON.parse(req.body.reviewChanges)
          let vals=[]
          for (const [key, value] of Object.entries(changes)) {
            vals.push(key+"=@"+key)
            db.input(key,value.to)
          }
          updateQ=updateQ+vals.join(",")+" where supplierID="+req.params.id
          db.query(updateQ,(err,updateR)=>{
            if (err) {
              reject(err,updateQ)
            }else {
              resolve()
            }
          })
        }else {
          resolve()
        }
      })
    }
    db.query(insQ,(err,insR)=>{
      if (err) {
        console.log(err,insQ)
        req.flash('error_msg','Error submitting review. Contact the system administrator')
        req.session.save(function () {
          res.redirect('/view-suppliers/')
        })
      }
      updateSupplier().then(e=>{
        req.flash('success_msg','Review submitted')
        req.session.save(function () {
          res.redirect('/view-suppliers/')
        })
      }).catch((err,updateQ)=>{
        console.log(err,updateQ)
        req.flash('error_msg','Error updating supplier values. Contact the system administrator')
        req.session.save(function () {
          res.redirect('/view-suppliers/')
        })
      })
    })
  },
  getPrevCompInfo:(req,res)=>{
    const _ = require('lodash')
    const csv=require('csvtojson')
    let filters=[]
    let countFilters=[]
    let countFilterExcluders=[]
    let lookups=[]
    let filterIDs=req.body.filterIDs.split(",")
    console.log(req.body)
    for (var i = 0; i < filterIDs.length; i++) {
      let id=filterIDs[i]
      if (req.body["countFilter-"+id]!=="undefined") {
        countFilters.push(req.body["column-"+id]+" "+req.body["compare-"+id]+" "+req.body["value-"+id])
        countFilterExcluders.push(req.body["excluder-"+id])
      }else {
        if (!(req.files || {})["lookupFile-"+id]) {
          filters.push(req.body["column-"+id]+" "+req.body["compare-"+id]+" "+req.body["value-"+id])
        }else {
          lookups.push({id:id,file:req.files["lookupFile-"+id]})
        }
      }
    }
    let excluder=countFilterExcluders.length?((filters.length?" and (":" where (")+countFilterExcluders.join(" and ")+")"):""
    let where=filters.length?" where "+filters.join(" and "):""
    let close=""
    promForEach(lookups,(lookup,fi,fnext)=>{
      db.query("select * from TEMPlookup"+lookup.id,err=>{
        if (!err) {
          // console.log(err)
          where=where+" and "+req.body["column-"+lookup.id]+" "+req.body["compare-"+lookup.id]+" (select val from TEMPlookup"+lookup.id+")"
          filters.push(req.body["column-"+lookup.id]+" "+req.body["compare-"+lookup.id]+" (select val from TEMPlookup"+lookup.id+")")
          fnext()
        }else {
          let str=lookup.file.data.toString('utf8')
          // console.log(_.truncate(str))
          let data=csv({
            noheader:true,
            trim:true,
            delimiter:','
          }).fromString(str).then(csvdata=>{
            // console.log(csvdata)
            const table = new sql.Table('TEMPlookup'+lookup.id) // or temporary table, e.g. #temptable
            table.create = true
            table.columns.add('val', sql.VarChar(250), {nullable: true})
            let i=0
            // console.log(csvdata.length,"ROWS TO ADD")
            async function addRows(){
              if (i<csvdata.length) {
                let val=csvdata[i].field1
                await table.rows.add(val)
                // console.log(i,val)
                i++
                addRows()
              }else {
                // console.log("ALL ROWS ADDED",i)
                db.bulk(table, (err, result) => {
                  if (err) {
                    console.log(err)
                  }
                  where=where+" and "+req.body["column-"+lookup.id]+" "+req.body["compare-"+lookup.id]+" (select val from TEMPlookup"+lookup.id+")"
                  filters.push(req.body["column-"+lookup.id]+" "+req.body["compare-"+lookup.id]+" (select val from TEMPlookup"+lookup.id+")")
                  fnext()
                })
              }
            }
            addRows()
          })
        }
      })
    }).then(e=>{
      let countWhere=where+""
      if (countFilters.length) {
        countWhere+=(filters.length?" and (":" where (")+countFilters.map(f=>f.replace("{{filters}}"," and "+(filters.length?filters.join(" and "):"1=1"))).join(" or ")+")"
      }
      if (req.body.type=="count") {
        let table=`
        prevcomps pc
        left join (select p.projectID pid,concat(quoteNo,' ',quoteName) sourceProject from projects p left join quotes q on q.quoteID=p.quoteID) p on p.pid=pc.projectID
        OUTER APPLY
          (SELECT TOP 1 d.sampleID as dSampleID, staffName as downloadedBy,d.downloadDate,concat(quoteNo,' ',quoteName) as downloadedFor
           FROM PrevCompDownloads d
      	 left join projects p on d.projectID=p.projectID
      	 left join quotes q on q.quoteID=p.quoteID
      	 left join users u on u.userID=d.downloadedBy
      	 left join staff s on s.staffID=u.staffID
      	 where p.isProjectClosed<>1 and d.sampleID=pc.sampleID
           ORDER BY d.downloadDate
          ) AS downloads`
        let grouping=",(downloadedBy,downloadedFor)"
        let cols=",grouping(downloadedBy) grpInUse,downloadedBy,downloadedFor"
        if (req.body.splitCol1) {
          cols+=","+req.body.splitCol1+",grouping("+req.body.splitCol1+") grp1"
          grouping+=",("+req.body.splitCol1+")"
        }
        if (req.body.splitCol2) {
          cols+=","+req.body.splitCol2+",grouping("+req.body.splitCol2+") grp2"
          grouping+=",("+req.body.splitCol2+"),("+req.body.splitCol1+","+req.body.splitCol2+")"
        }
        let q="select count(case when dSampleID is null then 1 end) c,COUNT(dSampleID) inuse"+cols+" from "+table+where+" group by grouping sets (()"+grouping+")"
        console.log(q)
        db.query(q,(err,r)=>{
          if (err) {
            console.log(err,q)
            res.status(500).send(err)
          }else {
            res.send({counts:r.recordset})
          }
        })
      }
      if (req.body.type=="colValues") {
        let table=`
        prevComps pc
        left join (select p.projectID pid,concat(quoteNo,' ',quoteName) sourceProject from projects p left join quotes q on q.quoteID=p.quoteID) p on p.pid=pc.projectID`
        let q="select distinct "+req.body.col+" val from "+table+where
        db.query(q,(err,r)=>{
          if (err) {
            console.log(err,q)
            res.status(500).send(err)
          }else {
            res.send({vals:r.recordset})
          }
        })
      }
      if(req.body.type=="records"){
        let table=`
        prevComps pc
        left join (select p.projectID pid,concat(quoteNo,' ',quoteName) sourceProject from projects p left join quotes q on q.quoteID=p.quoteID) p on p.pid=pc.projectID`
        let q=`
        select * into #customCountTable from `+table+` where sampleID in (
          select top `+req.body.count+` sampleID from `+table+`
          `+countWhere+` `+(countWhere?"and":"where")+` not exists (SELECT null FROM PrevCompDownloads d left join projects p on d.projectID=p.projectID where p.isProjectClosed<>1 and d.sampleID=pc.sampleID)
          order by NEWID()
        )
        select * into #records from (
          (
            select * from `+table+` where sampleID in (
              select top (select `+req.body.count+`-count(*) from #customCountTable) sampleID from `+table+`
              `+where+excluder+` `+(where?"and":"where")+` not exists (select null from #customCountTable cc where cc.sampleID=pc.sampleID)
              and not exists (SELECT null FROM PrevCompDownloads d left join projects p on d.projectID=p.projectID where p.isProjectClosed<>1 and d.sampleID=pc.sampleID)
              order by NEWID()
            )
          )
          union
          (
            select * from #customCountTable
          )
        ) final
        insert into prevcompdownloads (sampleID,projectID,downloadDate,downloadedBy) select sampleID,`+req.body.projectID+`,getdate(),`+req.user.user+` from #records
        select * from #records
        drop table #customCountTable
        drop table #records
        `
        console.log(q)
        db.query(q,(err,r)=>{
          if (err) {
            console.log(err,q)
            res.status(500).send(err)
          }else {
            console.log("SQL COMPLETED")
            var XLSX = require("xlsx");
            var fs = require("fs");
            const worksheet = XLSX.utils.json_to_sheet(r.recordset);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Sample");
            let name="JA2 sample extract "+moment().format("DD-MM-YYYY")+".xlsx"
            const uuidv4 = require('uuid').v4
            let tempName=uuidv4()+".xlsx"
            const buf = XLSX.write(workbook, {type: "buffer", bookType: "xlsx"});
            console.log("FILE BUFFER WRITTEN")

            fs.writeFile(publicPath+"/temp/"+tempName, buf, function(err) {
              if(err) {
                console.log(err);
                res.status(500).send(err)
              }else {
                res.send({records:r.recordset,file:{path:"/temp/"+tempName,filename:name}})
              }
            });
            // console.log(workbook)
          }
        })
      }
    })
  },
  prevCompsPage:(req,res)=>{
    db.query("select * from quotes q left join projects p on p.quoteID=q.quoteID where projectID is not null and isProjectClosed<>1 order by commissionDate DESC",(err,projectR)=>{
      db.query("SELECT COLUMN_NAME col,DATA_TYPE dataType FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'prevComps'",(err,pccols)=>{
        pccols.recordset.push({col:'sourceProject',dataType:'varchar'})
        res.render("prev-comps.ejs",{
          title:"Completes Database",
          projects:projectR.recordset,
          completes:true,
          cols:pccols.recordset,
          tabulatorUpdated:true
        })
      })
    })
  },
  prevUnusedPage:(req,res)=>{
    db.query("select * from quotes q left join projects p on p.quoteID=q.quoteID where projectID is not null and isProjectClosed<>1 order by commissionDate DESC",(err,projectR)=>{
      db.query("SELECT COLUMN_NAME col,DATA_TYPE dataType FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'prevComps'",(err,pccols)=>{
        pccols.recordset.push({col:'sourceProject',dataType:'varchar'})
        res.render("prev-comps.ejs",{
          title:"Unused Sample",
          projects:projectR.recordset,
          completes:false,
          cols:pccols.recordset,
          tabulatorUpdated:true
        })
      })
    })
  },
  registerPrevCompsDownload:(req,res)=>{
    db.query('select sampleID,projectID,downloadDate,downloadedBy from PrevCompDownloads where downloadID<0', (err, selR) => {
      if (err) {
        console.log(err)
        res.status(500).send(err);
      }
      var table=selR.recordset.toTable('PrevCompDownloads')
      var i=0
      async function addRows(){
        if (i<req.body.records.length) {
          let row=req.body.records[i]
          await table.rows.add(row.sampleID, req.body.projectID, new Date(), req.user.user)
          i++
          addRows()
        }else {
          db.bulk(table, (err, result) => {
            if (err) {
              console.log(err)
              res.status(500).send(err);
            }
            res.status(200).send('success');
          })
        }
      }
      addRows()
    })
  },
  addCsatComplaints:(req,res)=>{
    let newClientComplaints=[]
    let vistaData=req.body
    db.query('select * from Complaints',(err,complaints)=>{
      db.query('select * from Projects',(err,projects)=>{
        db.query('select raisedDate,complainantName,complainantEmail,projectID,ownerID,priority,reason,action,categoryID,clientSatID,outcomeDue from Complaints where complaintID<0', (err, result) => {
          if (err) {
            console.log(err)
            res.status(500).send(err);
          }
          var table=result.recordset.toTable('Complaints')
          var i=0
          var newCount=0
          var unmatched=[]
          var data=vistaData.filter(row=>row.start_time && moment.utc(row.start_time)>moment.utc().subtract(90,'d') && !complaints.recordset.map(el=>el.clientSatID).includes(row.BrokerPanelId) && Object.keys(row).filter(el=>el.indexOf('s5')>-1 && row[el]).filter(el=>row[el]<7).length>0)
          function addRows(){
            if (i<data.length) {
              let row=data[i]
              let project=projects.recordset.find(el=>el.csatID==row.BrokerPanelId)
              if (project) {
                let poorScore=Object.keys(row).filter(el=>el.indexOf('s5')>-1 && row[el]).filter(el=>row[el]<7)[0]
                table.rows.add(new Date(row.start_time),row.cName,row.cEmail,project.projectID,project.projectCM,3,'Client feedback score of '+row[poorScore]+' at '+poorScore+'. Comments: "'+row.s4+'"','Internal debrief',1,row.BrokerPanelId,new Date(moment().add(7,'d').format("YYYY-MM-DD")))
                newCount++
              }else {
                unmatched.push(row.BrokerPanelId)
              }
              i++
              addRows()
            }else {
              if (newCount>0) {
                db.query("select IDENT_CURRENT('complaints') as id",(err,idR)=>{
                  db.bulk(table, (err, result) => {
                    if (err) {
                      console.log(err)
                      res.status(500).send(err);
                    }
                    let ownerQ=`
                    select complaintID,staffEmail from
                    complaints c
                    left join staff s on s.staffID=c.ownerID
                    where complaintID>`+idR.recordset[0].id
                    db.query(ownerQ,(err,ownerR)=>{
                      let sendTo=['tokulus@teamsearchmr.co.uk','matt@teamsearchmr.co.uk']
                      sendTo.push(ownerR.recordset[0].staffEmail)
                      table.rows.forEach((row, r) => {
                        let mailOptions = {
                          from:'Complaints <reports@teamsearchmr.co.uk>',
                          to: sendTo,
                          subject: 'New complaint added from client satisfaction for '+ownerR.recordset[r].staffName+' - ID '+ownerR.recordset[r].complaintID,
                          html: '<p>' + header + '<p>A new complaint has been started as a result of poor client feedback. The complaint will be owned by '+ownerR.recordset[r].staffName+'. The deadline to complete the initial investigation is '+moment().add(7,'d').format("YYYY-MM-DD")+'. For full details click the link below:<br><br>http://job-analysis:8080/edit-complaint/'+ownerR.recordset[r].complaintID+'<br><br>' + footer + '</p>',
                          priority: 'high'
                        }
                        transporter.sendMail(mailOptions, (error, info) => {
                          if (error) {
                            console.log(error);
                            logger.info(req.user.uName+" failed to send complaint added confirmation: ",mailOptions)
                          }
                        });
                      })
                    });

                    res.status(200).send({count:newCount,unmatched:unmatched});
                  })
                })
              }else {
                res.status(500).send({error:"Poor feedback was found for the following Csat IDs but could not be matched in JA2: "+unmatched.join(", ")});
              }
            }
          }
          if (data.length>0) {
            addRows()
          }else {
            res.status(200).send({count:"No"});
          }
        })
      })
    })
  },
  editF2fTabletPage:(req,res)=>{
    const fs = require('fs');
    let tabQ="select * from FaceTablets where tabletID="+req.params.id
    db.query(tabQ,(err,tabR)=>{
      fs.readdir(publicPath+'/F2F Tablets/', (err, files) => {
        console.log(files)
        res.render("add-f2f-tablet.ejs",{
          title:"Edit tablet",
          tablet:tabR.recordset[0],
          profileImg:files?files.find(el=>el.split(".")[0]==req.params.id.toString()):''
        })
      })
    })
  },
  editF2fAccessoryPage:(req,res)=>{
    const fs = require('fs');
    let tabQ="select * from FaceAccessories where accID="+req.params.id
    db.query(tabQ,(err,tabR)=>{
      fs.readdir(publicPath+'/F2F Accessories/', (err, files) => {
        console.log(files)
        res.render("add-f2f-accessory.ejs",{
          title:"Edit accessory",
          acc:tabR.recordset[0],
          profileImg:files?files.find(el=>el.split(".")[0]==req.params.id.toString()):''
        })
      })
    })
  },
  editF2fTablet:(req,res)=>{
    const fs = require('fs');
    let software=['os','askia','confirmit','teamviewer','surveytogo']
    let tabQ="update FaceTablets set tabletName=@tabletName,tabletModel=@tabletModel,isActive="+(req.body.isActive=='on'?1:0)+","+software.map(el=>el+"Updated"+"="+(req.body[el+"Updated"]?"@"+el+"Updated":'null')).join(",")+" where tabletID="+req.params.id
    db.input('tabletName',req.body.tabletName)
    db.input('tabletModel',req.body.tabletModel)
    let i=0
    function inputs(){
      if (i<software.length) {
        if (req.body[software[i]+"Updated"]) {
          db.input(software[i]+"Updated",new Date(req.body[software[i]+"Updated"]))
        }
        i++
        inputs()
      }else {
        console.log(tabQ)
        db.query(tabQ,(err,tabR)=>{
          if (err) {
            console.log(err)
          }
          fs.mkdir(publicPath + '/F2F Tablets', { recursive: true }, (err) => {
            if (req.files) {
              req.files.profileImg.mv(publicPath + '/F2F Tablets/'+req.params.id+"."+req.files.profileImg.name.split(".")[1])
            }
            res.redirect('/f2f-tablet-admin')
          })
        })
      }
    }
    inputs()
  },
  editF2fAccessory:(req,res)=>{
    const fs = require('fs');
    let tabQ="update FaceAccessories set accType='"+req.body.accType+"',accName=@accName,accModel=@accModel,isActive="+(req.body.isActive=='on'?1:0)+" where accID="+req.params.id
    db.input('accName',req.body.accName)
    db.input('accModel',req.body.accModel)
    let i=0
    db.query(tabQ,(err,tabR)=>{
      if (err) {
        console.log(err)
      }
      fs.mkdir(publicPath + '/F2F Accessories', { recursive: true }, (err) => {
        if (req.files) {
          req.files.profileImg.mv(publicPath + '/F2F Accessories/'+req.params.id+"."+req.files.profileImg.name.split(".")[1])
        }
        res.redirect('/f2f-tablet-admin')
      })
    })
  },
  bookingHub:(req,res)=>{
    let filters=""
    if (['Day','Eve'].includes(req.params.shift)) {
      filters=filters+" AND is"+req.params.shift+"=1 "
    }
    let tQ=`
    select * from
    agentTeams
    where agentTeamID>1`+filters
    let bookingWeek=req.params.bookingWeek==0?moment().isoWeekday(1).add(2,'weeks').format("YYYY-MM-DD"):moment(req.params.bookingWeek).isoWeekday(1).format("YYYY-MM-DD")
    db.query(tQ,(err,tR)=>{
      db.query("select jobID,jobName,count(*) agentCount from dedicatedTeams t cross apply (select jobName from ViewJobFullName where jobID=t.jobID) q group by jobID,jobName",(err,dR)=>{
        if (err) {
          console.log(err)
          res.send(err)
        }else {
          res.render('booking-hub.ejs',{
            title:'Booking Hub',
            teams:tR.recordset,
            sessTeam:req.params.teams,
            sessShift:req.params.shift,
            bookingWeek:bookingWeek,
            dayFilter:req.query.day,
            dedicatedTeams:dR.recordset
          })
        }
      })
    })
  },
  bookingHubData:(req,res)=>{
    let filters=""
    let bookingFilter=""
    let neededFilt=()=>true
    if (req.params.teams!='0') {
      filters=filters+" AND t.agentTeamID in ("+req.params.teams+") "
    }
    let st="'"+req.params.bookingWeek+"'"
    let en="dateadd(day,6,'"+req.params.bookingWeek+"')"
    let dayFilt=""
    if (req.query.day!=='') {
      st="dateadd(day,"+req.query.day+",'"+req.params.bookingWeek+"')"
      en=st
      dayFilt=" and DATEPART(weekday,bookingDate)="+(Number(req.query.day)+1)
    }
    if (['Day','Eve'].includes(req.params.shift)) {
      filters=filters+" AND t.is"+req.params.shift+"=1 AND b.dtJobID is null and isnull(dedDays,0)<DATEDIFF(day,"+st+","+en+")+1"
      bookingFilter=bookingFilter+" and b.is"+req.params.shift+"=1"
      neededFilt=(el)=>el['isJob'+req.params.shift]==1
    }else if (req.params.shift!='0') {
      filters=filters+" AND a.agentID in (select agentID from dedicatedTeams where jobID="+req.params.shift+")"
      bookingFilter=bookingFilter+" and b.dtJobID="+req.params.shift
      neededFilt=(el)=>el.dtJobID==req.params.shift
    }

    let bookingQ=`
    set datefirst 1
    declare @bhst date=`+st+`
    declare @bhen date=`+en+`
    select a.agentID,agentName,contractName,fixedHours,agentJoined,agentLeft,breatheID,teamName,t.isEve,max(avgShifts) avgShifts,max(avgHours) avgHours,FLOOR(sum(isnull(b.appliedHours,0))) hoursBooked,count(bookingDate) shiftsBooked,isnull(sick.dayCount,0)+isnull(hols.dayCount,0)+isnull(canx.dayCount,0) as absenceCount,max(tdy.startTime) startTime,max(tdy.endTime) endTime,note,isnull(sick.dayCount,0) sickDays,isnull(canx.dayCount,0) canxDays,isnull(hols.dayCount,0) holDays
    ,sum(case when datePart(weekday,bookingDate)=1 then isnull(b.appliedHours,0) end) mon
  	,sum(case when datePart(weekday,bookingDate)=2 then isnull(b.appliedHours,0) end) tue
  	,sum(case when datePart(weekday,bookingDate)=3 then isnull(b.appliedHours,0) end) wed
  	,sum(case when datePart(weekday,bookingDate)=4 then isnull(b.appliedHours,0) end) thu
  	,sum(case when datePart(weekday,bookingDate)=5 then isnull(b.appliedHours,0) end) fri
  	,sum(case when datePart(weekday,bookingDate)=6 then isnull(b.appliedHours,0) end) sat
  	,sum(case when datePart(weekday,bookingDate)=7 then isnull(b.appliedHours,0) end) sun
    from
    Agents a
    left join AgentContracts c on c.contractID=a.contractVersion
    left join getBookedHours(@bhst,@bhen) b on b.agentID=a.agentID and b.isAbsent=0`+bookingFilter+`
    left join AgentTeams t on t.agentTeamID=isnull(b.bookingTeamID,a.teamID)
    left join (
    	select agentID,avg(weekHours) avgHours,avg(weekShifts) avgShifts from (
    		select agentID,DATEPART(week,bookingdate) wk,sum(bookedHours) as weekHours,count(*) as weekShifts from
    		getBookedHours(dateadd(week,-4,@bhst),dateadd(day,-1,@bhst)) where isAbsent=0 `+dayFilt+`
    		group by agentID,DATEPART(week,bookingdate)
    		) weeks
    	group by agentID
    	) avgs on avgs.agentID=a.agentID
    left join (select agentID,count(*) dayCount from Absence where absenceDate between @bhst and @bhen and absenceType='Sick' group by agentID) sick on sick.agentID=a.agentID
    left join (select agentID,count(*) dayCount from Booking where bookingDate between @bhst and @bhen and startTime='00:00:00' group by agentID) hols on hols.agentID=a.agentID
    left join (select agentID,count(*) dayCount from Absence where absenceDate between @bhst and @bhen and absenceType='Cancelled by manager' group by agentID) canx on canx.agentID=a.agentID
    left join (select b.agentID,startTime,endTime from Booking b left join absence a on a.absenceDate=b.bookingDate AND a.agentID=b.agentID where bookingDate=cast(getdate() as date) and isnull(absenceType,'No show')='No show') tdy on tdy.agentID=a.agentID
    outer apply (select top 1 note from allnotes where tableName='agentTable' and page='booking-hub' and agentID=a.agentID and date=@bhst) notes
    left join (select dt.agentID,COUNT(*) dedDays from dedicatedTeams dt left join getDedicatedDates() dd on dd.dedicationID=dt.dedicationID where dd.dedicatedDate between @bhst and @bhen group by dt.agentID) d on d.agentID=a.agentID
    where a.agentID>1 and agentTeamID>1 and agentLeft is null`+filters+`
    group by agentName,a.agentID,contractName,fixedHours,teamName,t.isEve,breatheID,agentJoined,agentLeft,note,isnull(sick.dayCount,0),isnull(canx.dayCount,0),isnull(hols.dayCount,0)`
    // console.log(req.params,st,bookingQ)
    let kpiQ=`
    set datefirst 1

    declare @bsen date=dateadd(day,-datepart(weekday,cast(getdate() as date)),cast(getdate() as date))
    declare @bsst date=dateadd(day,1,dateadd(week,-10,@bsen))

    select dateadd(day,-datepart(weekday,bookingDate)+1,bookingDate) wk,dateadd(day,-datepart(weekday,bookingDate)+8,bookingDate),sum(appliedHours) bookedHours,count(bookedHours) as shiftsCount,count(distinct a.agentID) agentCount,sum(worked) as workedHours from
    agents a
    left join getBookedHours(@bsst,@bsen) b on b.agentID=a.agentID`+bookingFilter+`
    left join AgentTeams t on t.agentTeamID=isnull(b.bookingTeamID,a.teamID)
    left join (select agentID,sum(inputHours) as worked,inputDate from DailyInput group by agentID,inputDate) d on d.agentID=a.agentID and d.inputDate=b.bookingDate
    left join (select dt.agentID,COUNT(*) dedDays from dedicatedTeams dt left join getDedicatedDates() dd on dd.dedicationID=dt.dedicationID where dd.dedicatedDate between @bsst and @bsen group by dt.agentID) dd on dd.agentID=a.agentID
    where b.bookingDate is not null `+filters+`
    group by dateadd(day,-datepart(weekday,bookingDate)+1,bookingDate),dateadd(day,-datepart(weekday,bookingDate)+8,bookingDate)
    order by dateadd(day,-datepart(weekday,bookingDate)+1,bookingDate)`
    let agentsQ=`
    set datefirst 1

    declare @bsen date=dateadd(day,-datepart(weekday,cast(getdate() as date)),cast(getdate() as date))
    declare @bsst date=dateadd(day,1,dateadd(week,-10,@bsen))

    select a.agentID,agentJoined,agentLeft,wks.wk,case when agentJoined<nextwk and (agentLeft is null or agentLeft>nextwk) then isnull(b.bookingTeamID,99) end teamID into ##aTable
    from
    agents a
    left join (
    	select dateadd(day,-datepart(weekday,bookingDate)+1,bookingDate) wk,dateadd(day,-datepart(weekday,bookingDate)+8,bookingDate) nextwk from
    	booking b
    	where bookingDate between @bsst and @bsen
    	group by dateadd(day,-datepart(weekday,bookingDate)+1,bookingDate),dateadd(day,-datepart(weekday,bookingDate)+8,bookingDate)
    	) wks on 1=1
    left join (
    	select agentID,max(bookingTeamID) bookingTeamID,dateadd(day,-datepart(weekday,bookingDate)+1,bookingDate) wk from
    	booking b
      where 1=1
    	group by agentID,dateadd(day,-datepart(weekday,bookingDate)+1,bookingDate)
    	) b on b.agentID=a.agentID and b.wk=wks.wk

    select * from
    (
    select agentID,agentJoined,agentLeft,wk,case when t1.teamID=99 then t2.teamID else t1.teamID end teamID from
    ##aTable t1
    outer apply (
    	select top 1 teamID from ##aTable
    	where agentID=t1.agentID and wk<t1.wk and nullif(teamID,99) is not null
    	order by wk DESC
    	) t2
    where t1.teamID is not null
    ) a
    left join AgentTeams t on t.agentTeamID=a.teamID
    outer apply (
      select top 1 t.jobID dtJobID from
      DedicatedTeams t
      where t.agentID=a.agentID and (select count(*) from DedicatedTeamDates where dedicationID=t.dedicationID and dedicatedDate between @bsst and @bsen)>0
    ) b
    left join (select dt.agentID,COUNT(*) dedDays from dedicatedTeams dt left join getDedicatedDates() dd on dd.dedicationID=dt.dedicationID where dd.dedicatedDate between @bsst and @bsen group by dt.agentID) d on d.agentID=a.agentID
    where a.agentID>1 and agentTeamID>1`+filters+`
    drop table ##aTable`
    let sendsQ=`
    select * from AgentSends where campaign='Booking `+req.params.bookingWeek+`'
    `
    db.query(bookingQ,(err,r)=>{
      if (err) {
        console.log(err,bookingQ)
        res.status(500).send(err)
      }
      db.query(kpiQ,(err,kpiR)=>{
        if (err) {
          console.log(err,kpiQ)
          res.status(500).send(err)
        }
        db.query(agentsQ,(err,agentsR)=>{
          if (err) {
            console.log(err,agentsQ)
            res.status(500).send(err)
          }
          db.query(sendsQ,(err,sendsR)=>{
            if (err) {
              console.log(err,sendsQ)
              res.status(500).send(err)
            }
            getBookingReq(req.params.bookingWeek).then(requests=>{
              getResourceNeeded(req.params.bookingWeek,moment(req.params.bookingWeek).add(6,'days'),0).then(needed=>{
                res.send({
                  booking:r.recordset.map(el=>({
                    ...el,
                    ...breatheEmployees.find(b=>b.id==el.breatheID),
                    ...requests.find(b=>b.agentID==el.agentID),
                    ...{sends:sendsR.recordset.filter(s=>s.agentID==el.agentID)}
                  })),
                  kpis:kpiR.recordset,
                  agents:agentsR.recordset,
                  needed:needed.filter(neededFilt)
                })
              })
            })
          })
        })
      })
    })
  },
  sendBookingEmail:(req,res)=>{
    let dte=moment.utc(req.params.bookingWeek)
    db.query("select * from agents where agentID="+req.params.agentID,(err,r)=>{
      getBreatheEmployees(true).then(breatheEmployees=>{
        let agent=r.recordset[0]
        agent.email=breatheEmployees.find(el=>el.id==agent.breatheID).email
        let url='https://docs.google.com/forms/d/e/1FAIpQLSe0waJeiBfQdrL--204D9kLH5_nLLlavwxE6D-kN3WntQeBhQ/viewform?usp=pp_url&entry.155226268='+dte.format("YYYY-MM-DD")+'&entry.1134691254='+agent.agentID+'&entry.1295280051='+agent.teamID
        let body='<p>Hi '+agent.agentName+'<br><br>Please click on the following link to enter your hours for week commencing '+dte.format("DD/MM/YYYY")+'<br><br><b>All hours must be submitted by Sunday '+moment(dte).subtract(8,'d').format("DD/MM/YYYY")+'.</b><br><br>Please do not re-use this link. It is only valid for this week. If you re-use this link at a later date, your hours <b>will not be submitted.</b></p><p>'+url+'<br><br>Many thanks,<br>Teamsearch</p>'
        let mailOptions = {
          from:'Teamsearch <reports@teamsearchmr.co.uk>',
          to: agent.email,
          // to: 'matt@teamsearchmr.co.uk',
          subject: "Please book your hours NOW for w/c "+dte.format("DD/MM/YYYY"),
          html: '<p>' + header + '</p>' + body+'<br><br>' + footer + '</p>'
        }
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            logger.log('Error sending booking form',agent,error)
            res.status(500).send(error)
          }else {
            logger.log('Sent booking form',agent.agentName,agent.email)
            prepareBookingSQL('Booking '+dte.format("YYYY-MM-DD")).then(ps=>{
              ps.execute({type:'email',msg: body,to:mailOptions.to,agentID:agent.agentID},(err,r)=>{
                ps.unprepare()
                res.send("success")
              })
            })
          }
        });
      })
    })
  },
  sendBookingText:(req,res)=>{
    let dte=moment.utc(req.params.bookingWeek)
    const libphonenumber = require('libphonenumber-js')
    db.query("select * from agents where agentID="+req.params.agentID,(err,r)=>{
      getBreatheEmployees(true).then(breatheEmployees=>{
        let agent=r.recordset[0]
        let url='https://teamsear.ch/booking-form?usp=pp_url&entry.155226268='+dte.format("YYYY-MM-DD")+'&entry.1134691254='+agent.agentID+'&entry.1295280051='+agent.teamID
        function sendText(link){
          agent.telnum=libphonenumber.parsePhoneNumber(breatheEmployees.find(el=>el.id==agent.breatheID)['personal_mobile'],'GB')
          var smsCollection = new clicksend.SmsMessageCollection();
          var smsMessage = new clicksend.SmsMessage();
          smsMessage.from = "Teamsearch";
          smsMessage.to = agent.telnum.formatInternational();
          // smsMessage.to = '+447903612563'
          smsMessage.body = "Please book your hours NOW for the week commencing "+dte.format("DD-MMM")+" using this link: "+link;
          smsCollection.messages = [smsMessage]
          smsApi.smsSendPost(smsCollection).then(function(response) {
            logger.log('Sent booking form sms',agent.agentName,agent.email)
            prepareBookingSQL('Booking '+dte.format("YYYY-MM-DD")).then(ps=>{
              ps.execute({type:'sms',msg:smsMessage.body,to:smsMessage.to,agentID:agent.agentID},(err,r)=>{
                ps.unprepare()
                res.send("success")
              })
            })
          }).catch(function(err){
            logger.log('Error sending booking form sms',agent,err)
            console.log(err)
            res.status(500).send(err)
          });
        }
        shortenURL(url).then(links=>{
          sendText(links[0].short_url)
        }).catch(err=>{
          console.log(err)
          sendText(url)
        })
      })
    })
  },
  sendRCmessage:(req,res)=>{
    const body = {
      // from: {
      //   extensionId: '313'
      // },
      // replyOn: 313,
      text: 'Test message',
      to: [
        {
          extensionId: '2026346064'
        },
      ]
    };
    rcPlatform.post(`/restapi/v1.0/account/~/extension/~/company-pager`, body).then((r) => {
      res.send('success')
    }).catch(err=>{
      console.log(err)
      res.status(500).send(err)
    })
  },
  attendanceHub:(req,res)=>{
    let filters=""
    if (req.params.shift!='0') {
      filters=filters+" AND is"+req.params.shift+"=1 "
    }
    let tQ=`
    select * from
    agentTeams
    where agentTeamID>1`+filters
    let actionTypesQ="select * from AbsenceActionTypes order by scoreTrigger desc"
    let mngrQ=`select * from staff where staffLeft is null and staffJobTitleID in (2,8,16,18) order by nullif(staffJobTitleID,16)`
    console.log(req.params)
    db.query(tQ,(err,tR)=>{
      db.query(actionTypesQ,(err,actionTypesR)=>{
        db.query(mngrQ,(err,mngrR)=>{
          if (err) {
            console.log(err)
            res.status(500).send(err)
          }
          res.render('attendance-hub.ejs',{
            title:'Attendance Hub',
            teams:tR.recordset,
            sessTeam:req.params.teams,
            sessShift:req.params.shift,
            actionTypes:actionTypesR.recordset,
            managers:mngrR.recordset
          })
        })
      })
    })
  },
  attendanceHubData:(req,res)=>{
    let abQ=`
    select agentID,t.managerID,a.breatheID,a.ringCentralID,agentName,a.agentTeamID,a.teamName,startTime,endTime,Shift,lateMins,lateCount,noShowCount,note,sickActScore,sickLastActionID,nsActScore,noShowsSince,nsLastActionID,latesSince,lateLastActionID,staffName
    from ViewAttendance a
    left join agentTeams t on t.agentTeamID=a.agentTeamID
    left join Staff s on s.staffID=t.managerID`
    let detailQ=`
    set datefirst 1
    declare @nsen date=dateadd(day,-1,cast(getdate() as date))
    declare @nsst date=dateadd(week,-52,@nsen)
    select a.absenceID,a.agentID,absenceDate,absenceType,null stage,null as detail from Absence a left join booking b on b.bookingDate=a.absenceDate and b.agentID=a.agentID where absenceDate between @nsst and @nsen
    union
    select lateID,a.agentID,inputDate,'Late',lateType,lateMins detail from Lateness a left join booking b on b.bookingDate=a.inputDate and b.agentID=a.agentID where inputDate between dateadd(day,-30,@nsen) and @nsen
    order by absenceDate`
    let filters=""
    if (req.params.teams!='0') {
      filters=filters+" AND t.agentTeamID in ("+req.params.teams+") "
    }
    if (req.params.shift!='0') {
      filters=filters+" AND t.is"+req.params.shift+"=1 "
    }
    let kpiQ=`
    set datefirst 1
    declare @aken date=dateadd(day,-1,cast(getdate() as date))
    declare @akst date=dateadd(week,-52,@aken)

    select dateadd(day,-datepart(weekday,bookingDate)+1,bookingDate) wk,count(absenceDate) absenceCount,count(*) bookingCount,sum(appliedHours) bookedHours,sum(case when absenceDate is null then 0 else appliedHours end) lostHours from
    getBookedHours(@akst,@aken) b
    left join absence ab on ab.absenceDate=b.bookingDate and ab.agentID=b.agentID
    left join agentTeams t on t.agentTeamID=b.bookingTeamID
    where bookingDate between @akst and @aken and isnull(absenceType,'na') in ('na','Sick','No show')`+filters+`
    group by dateadd(day,-datepart(weekday,bookingDate)+1,bookingDate)
    order by dateadd(day,-datepart(weekday,bookingDate)+1,bookingDate)`
    let actionsQ="select a.actionID,absenceType,a.actionTypeID,agentID,a.actionDate,a.actionBy,t.actionName,a.reportURL,DATEADD(day,t.durationDays,a.actionDate) expiry,currentScore from AbsenceActions a left join AbsenceActionTypes t on t.actionTypeID=a.actionTypeID"
    db.query(abQ,(err,r)=>{
      if (err) {
        console.log(err)
        res.status(500).send(err)
      }
      db.query(detailQ,(err,det)=>{
        if (err) {
          console.log(err)
          res.status(500).send(err)
        }
        db.query(kpiQ,(err,kpiR)=>{
          if (err) {
            console.log(err)
            res.status(500).send(err)
          }
          db.query(actionsQ,(err,actionsR)=>{
            if (err) {
              console.log(err)
              res.status(500).send(err)
            }
            getBreatheEmployees(true).then(breatheEmps=>{
              if (breatheEmps.filter(el=>el.bradfordFactor!==undefined).length==0) {
                getBradfordScores().then(br=>{
                  breatheEmployees=breatheEmps.map(agent=>{
                    let rec=br.find(el=>el.breatheID==agent.id)
                    rec=rec?rec:{}
                    return {...agent,...rec}
                  })
                  res.send({
                    attendance:r.recordset.map(el=>({...el,...breatheEmployees.find(b=>b.id==el.breatheID),...{ext:rcEmployees.find(b=>b.id==el.ringCentralID)?rcEmployees.find(b=>b.id==el.ringCentralID).extensionNumber:null}})),
                    absences:det.recordset,
                    kpis:kpiR.recordset,
                    actions:actionsR.recordset,
                    thisUser:req.user
                  })
                })
              }else {
                res.send({
                  attendance:r.recordset.map(el=>({...el,...breatheEmployees.find(b=>b.id==el.breatheID),...{ext:rcEmployees.find(b=>b.id==el.ringCentralID)?rcEmployees.find(b=>b.id==el.ringCentralID).extensionNumber:null}})),
                  absences:det.recordset,
                  kpis:kpiR.recordset,
                  actions:actionsR.recordset,
                  thisUser:req.user
                })
              }
            })
          })
        })
      })
    })
  },
  contTrackingData:(req,res)=>{
    let trackerQ=`select * from ContributionTracker c left join agentTeams t on t.agentTeamID=c.teamID
    `
    let jobQ=`select * from ViewJobsStats
    `
    let agentQ=`select * from agents
    `
    db.multiple=true
    db.batch(trackerQ+jobQ+agentQ,(err,r)=>{
      if (err) {
        console.log(err)
      }
      res.send({
        data:r.recordsets[0],
        allJobs:r.recordsets[1],
        allAgents:r.recordsets[2],
      })
    })
  },
  getFilters:(req,res)=>{
    let q=`
    select agentID id,agentName txt from agents where agentID>1 and agentID not in (`+freeAgents.join(",")+`) order by agentName
    select agentTeamID id,teamName txt from agentTeams where agentTeamID>1 order by teamName
    select jobID id,jobName txt from ViewJobFullName where jobID>1 order by jobName
    select clientID id,clientName txt from Clients where clientID>1 order by clientName
    select quoteID id,concat(quoteNo,' ',quoteName) txt from Quotes where quoteID>1 order by quoteNo`
    db.query(q,(err,r)=>{
      res.send({
        agents:r.recordsets[0],
        teams:r.recordsets[1],
        jobs:r.recordsets[2],
        clients:r.recordsets[3],
        quotes:r.recordsets[4],
      })
    })
  },
  postcodeLookup:(req,res)=>{
    const postcode = require('postcode');
    db.query('select postcode from postcodeDb where postcode is null', (err, result) => {
      var reqData=req.body.data
      var rtable
      rtable=result.recordset.toTable('##PostcodeUploadTemp')
      rtable.create=true
      rtable.columns.add('serial', sql.VarChar(50))
      rtable.columns.add('agent', sql.VarChar(255))
      let r=0
      async function addRow(){
        let data=reqData[r]
        if (data) {
          try {
            postcode.fix(data.postcode)
          } catch (e) {
            res.status(500).send({error:'Given question is not a postcode question.'})
          }
          await rtable.rows.add(data.postcode?postcode.fix(data.postcode):data.postcode,data.serial,data.agent)
          r++
          addRow()
        }else {
          db.bulk(rtable, (err, pcodeTable) => {
            if (err) {
              console.log(err)
            }
            let tableQ=`
            select * from ##PostcodeUploadTemp u
            left join postcodeDb d on d.postcode=u.postcode
            drop table ##PostcodeUploadTemp`
            db.batch(tableQ,(err,tableR)=>{
              if (err) {
                console.log(err)
              }
              // console.log(tableR.recordset)
              res.send(tableR.recordset)
            })
          })
        }
      }
      addRow()
    })
  },
  longLatLookup:(req,res)=>{
    const _ = require('lodash')
    const postcode = require('postcode');
    db.query('select longitude,latitude from postcodeDb where postcode is null', (err, result) => {
      var reqData=req.body.data
      var rtable
      rtable=result.recordset.toTable('##PostcodeUploadTemp')
      rtable.create=true
      rtable.columns.add('serial', sql.VarChar(50))
      rtable.columns.add('agent', sql.VarChar(255))
      rtable.columns.add('intDate', sql.DateTime())
      let r=0
      async function addRow(){
        let data=reqData[r]
        if (data) {
          await rtable.rows.add(data.longitude,data.latitude,data.serial,data.agent,new Date(data.intDate))
          r++
          addRow()
        }else {
          db.bulk(rtable, (err, pcodeTable) => {
            if (err) {
              console.log(err)
            }
            let tableQ=`
            select * from ##PostcodeUploadTemp u
            left join postcodeDb d on round(d.longitude,3)=round(u.longitude,3) and round(d.latitude,3)=round(u.latitude,3) and d.status='live'
            drop table ##PostcodeUploadTemp`
            db.batch(tableQ,(err,tableR)=>{
              if (err) {
                console.log(err)
              }
              // console.log(tableR.recordset)
              let reduced=_.uniqBy(tableR.recordset,'serial')
              res.send(reduced)
            })
          })
        }
      }
      addRow()
    })
  },
  suggestPostcode:(req,res)=>{
    let a=[8,'h','j','k','a']
    let b=[3,'d','c','t','e','g','p','t','v','z','b']
    let f=['f','s','x']
    let m=['m','n']
    let i=[5,9,'y','i','r']
    let q=[2,'u','q']
    let soundalikes={
      a:a,
      b:b,
      c:b,
      d:b,
      e:b,
      f:f,
      g:b,
      h:a,
      i:i,
      j:a,
      k:a,
      l:['l',1],
      m:m,
      n:m,
      o:['o',0],
      p:b,
      q:q,
      r:i,
      s:f,
      t:b,
      u:q,
      v:b,
      w:['w'],
      x:f,
      y:i,
      z:b,
      1:[1,'l'],
      2:q,
      3:b,
      4:4,
      5:i,
      6:6,
      7:7,
      8:a,
      9:i,
      0:[0,'o'],
    }
    let split=(req.params.pcode.split(" ").length>1?req.params.pcode.split(" "):req.params.pcode.replace(/^(.*)(\d)/, "$1 $2").split(" "))
    function checkSoundalikes(recordset,part){
      let matches=[]
      let c=0
      return new Promise((resolve,reject)=>{
        function tryChar(){
          let char=split[part].charAt(c)
          if (char) {
            let s=0
            function testSAL(){
              let sal=soundalikes[char.toLowerCase()][s]
              if (sal) {
                let newPC
                if (part==0) {
                  newPC=split[0].substring(0,c) + sal + split[0].substring(c+1)+" "+split[1]
                }else {
                  newPC=split[0]+" "+split[1].substring(0,c) + sal + split[1].substring(c+1)
                }
                newPC=newPC.toUpperCase()
                // console.log("Testing:",newPC)
                if (recordset.find(el=>el.postcode==newPC)) {
                  matches.push(recordset.find(el=>el.postcode==newPC))
                }
                s++
                testSAL()
              }else {
                c++
                tryChar()
              }
            }
            testSAL()
          }else {
            // console.log("matches:",matches)
            resolve(matches)
          }
        }
        if (!recordset[0]) {
          resolve([])
        }else {
          tryChar()
        }
      })
    }
    let results=[]
    let finish=(results)=>{
      res.send({result:results})
    }
    db.query("select postcode,longitude,latitude from postcodeDb where postcode_no_space like '%"+req.params.pcode.replace(/\s/g, '').toUpperCase()+"%'",(err,r)=>{
      if (err) {
        finish()
      }
      if (r.recordset[0]) {
        results=results.concat(r.recordset)
      }
      if (split.length>1) {
        db.query("select postcode,longitude,latitude from postcodeDb where postcode_district='"+split[0].toUpperCase()+"' and incode like '%"+split[1].toUpperCase()+"%'",(err,r)=>{
          if (err) {
            finish(results)
          }
          if (r.recordset[0]) {
            results=results.concat(r.recordset)
          }
          db.query("select postcode,longitude,latitude from postcodeDb where postcode_district='"+split[0].toUpperCase()+"'",(err,r)=>{
            if (err) {
              finish(results)
            }
            checkSoundalikes(r.recordset,1).then(matches=>{
              results=results.concat(matches)
              db.query("select postcode,longitude,latitude from postcodeDb where incode='"+split[1].toUpperCase()+"'",(err,r)=>{
                if (err) {
                  finish(results)
                }
                checkSoundalikes(r.recordset,0).then(matches=>{
                  results=results.concat(matches)
                  finish(results)
                })
              })
            })
          })
        })
      }else {
        finish(results)
      }
    })
  },
  homePage:(req,res)=>{
    res.render('home.ejs',{title:"Home"})
  },
  getNotes:(req,res)=>{
    let q=`select * from allnotes
    left join (select staffID,staffName from Staff) s on s.staffID=agentID and page='makeAnote'
    where 1=1 and `+Object.keys(req.query).map(k=>k+"="+(req.query[k]?"'"+req.query[k]+"'":'NULL')).join(" and ")
    db.query(q,(err,r)=>{
      if (err) {
        res.status(500).send({error:err})
      }
      res.send(r.recordset)
    })
  },
  updatePlanner:(req,res)=>{
    function update(){
      return new Promise((resolve,reject)=>{
        db.query("delete from planners where jobID="+req.body.jobID+" and plannerDate='"+req.body.inputDate+"'",(err,r)=>{
          if (req.body.value!=undefined && req.body.value!=null && req.body.value!=='') {
            db.query("insert into planners (plannerHours,jobID,plannerDate) values ("+req.body.value+","+req.body.jobID+",'"+req.body.inputDate+"')",(err,r)=>{
              if (err) {
                console.log(err)
                res.status(500).send({error:err})
              }else {
                resolve()
              }
            })
          }else {
            resolve()
          }
        })
      })
    }
    update().then(e=>{
      const ps = new sql.Request();
      ps.input('jobID',req.body.jobID)
      ps.execute('getJobResourcePlan',(err,r)=>{
        if (err) {
          console.log(err)
          res.status(500).send({error:err})
        }
        delete ps.parameters.jobID
        ps.input('dateCount',req.body.dateCount)
        ps.execute('spNeededBooked',(err,totalsR)=>{
          if (err) {
            console.log(err)
            res.status(500).send({error:err})
          }
          let obj={}
          let d=0
          function buildObj(){
            if (r.recordset[d]) {
              if (r.recordset[d].jobID) {
                obj[moment(r.recordset[d].dte).format("YYYY-MM-DD")]=r.recordset[d]
              }
              d++
              buildObj()
            }else {
              res.send({job:obj,totals:totalsR.recordset})
            }
          }
          buildObj()
        })
      })
    })
  },
  updatePlannerAHR:(req,res)=>{
    function update(){
      return new Promise((resolve,reject)=>{
        db.query("update jobs set resourceTarget="+(Number(req.body.value)?req.body.value:'null')+" where jobID="+req.body.jobID,(err,r)=>{
          if (err) {
            console.log(err)
            res.status(500).send({error:err})
          }else {
            resolve()
          }
        })
      })
    }
    update().then(e=>{
      const ps = new sql.Request();
      ps.input('jobID',req.body.jobID)
      ps.input('dateCount',req.body.dateCount)
      ps.execute('getJobResourcePlan',(err,r)=>{
        if (err) {
          console.log(err)
          res.status(500).send({error:err})
        }
        ps.query('select ahr,resourceTarget from dbo.getResourceNeeded(@jobID)',(err,rpr)=>{
          delete ps.parameters.jobID
          ps.execute('spNeededBooked',(err,totalsR)=>{
            let obj={}
            let d=0
            obj.ahr=rpr.recordset[0].ahr
            obj.resourceTarget=rpr.recordset[0].resourceTarget
            function buildObj(){
              if (r.recordset[d]) {
                if (r.recordset[d].jobID) {
                  obj[moment(r.recordset[d].dte).format("YYYY-MM-DD")]=r.recordset[d]
                }
                d++
                buildObj()
              }else {
                res.send({job:obj,totals:totalsR.recordset})
              }
            }
            buildObj()
          })
        })
      })
    })
  },
  getProjectInfo:(req,res)=>{
    let q=`
    select *,cm.staffName cm,pm.staffName pm from
    Quotes q
    left join Projects p on p.quoteID=q.quoteID
    left join Clients c on c.clientID=q.clientID
    outer apply (
    select max(startDate) startDate,max(endDate) endDate,SUM(interviewsTarget) targetInts,SUM(intsDone) intsDone
    from jobs j
    left join (select SUM(inputInterviews) intsDone,jobID from DailyInput where inputDate<cast(getdate() as date) group by jobID) d on d.jobID=j.jobID
    where projectID=p.projectID and isJobCATI=1 and isJobInHouse=1
    ) j
    left join Staff cm on cm.staffID=p.projectCM
    left join Staff pm on pm.staffID=p.projectDP
    outer apply (select top 1 note noteBg from AllNotes where jobID=p.projectID and page='edit' and tableName='Projects' and otherID=0) n0
    outer apply (select top 1 note noteSc from AllNotes where jobID=p.projectID and page='edit' and tableName='Projects' and otherID=1) n1
    outer apply (select top 1 note noteQn from AllNotes where jobID=p.projectID and page='edit' and tableName='Projects' and otherID=2) n2
    outer apply (select top 1 note noteQu from AllNotes where jobID=p.projectID and page='edit' and tableName='Projects' and otherID=3) n3
    outer apply (select top 1 note noteSh from AllNotes where jobID=p.projectID and page='edit' and tableName='Projects' and otherID=6) n4
    outer apply (select concat(quoteNo,' ',quoteName) lastWaveName,p2.quoteID lastWaveID from Projects p2 left join Quotes q2 on q2.quoteID=p2.quoteID where projectID=p.repeatOf) r
    where q.quoteID=`+req.query.quoteID
    let jobQ=`select * from jobs where projectID in (select projectID from projects where quoteID=`+req.query.quoteID+`)`
    db.query(q,(err,r)=>{
      db.query(jobQ,(err,jobR)=>{
        if (err) {
          console.log(err)
          res.status(500).send({error:err})
        }else {
          res.send({project:r.recordset[0],jobs:jobR.recordset})
        }
      })
    })
  },
  getJobInfo:(req,res)=>{
    let q=`
    select * from
    (select * from Jobs where jobID=`+req.query.jobID+`) j
    left join Projects p on p.projectID=j.jobID
    outer apply getResourceNeeded(j.jobID) r
    outer apply (select sum(Hours) hrsDone,SUM(ints) intsDone,SUM(Pay) pay,SUM(sales) sales from ViewAgentShifts where inputDate<CAST(getdate() as date) and jobID=j.jobID) d
    outer apply (select top 1 note noteRp from AllNotes where page='view-planner' and jobID=j.jobID) n`
    let dailyQ=`
    declare @dateCount int=dateDiff(day,@st,@en)
    declare @T as table(jobID int,isJobEve bit,isJobDay bit,dtJobID int,dte date,isOfficeDay bit,bankHol varchar(255),calc decimal(10,4),resourceHours decimal(10,4),resourceHoursAcademy decimal(10,4),planned decimal(10,4),plannedAcademy decimal(10,4))
    insert into @T
    exec getJobResourcePlan @jobID,@dateCount,@st

    SELECT *,SUM(case when dte<CAST(getdate() as date) then isnull(ints,0) else coalesce(round(planned*ahr,0),round((resourceHours+isnull(resourceHoursAcademy,0))*ahr,0),round(calc*ahr,0)) end) OVER(ORDER BY dte asc) AS cumulative FROM
    @T dt
    left join (
    	select SUM(inputInterviews) ints,inputDate from
    	DailyInput d
    	left join Agents a on a.agentID=d.agentID
    	where jobID=@jobID and inputDate<CAST(getdate() as date)
    	group by inputDate
    	) s on s.inputDate=dt.dte
    outer apply getResourceNeeded(@jobID) r
    where isOfficeDay=1 or planned>0 or ints>0`
    db.query(q,(err,r)=>{
      db.input('jobID',req.query.jobID)
      db.input('st',r.recordset[0].startDate[0])
      db.input('en',r.recordset[0].endDate[0])
      db.query(dailyQ,(err,dailyR)=>{
        if (err) {
          console.log(err)
          res.status(500).send({error:err})
        }else {
          res.send({job:r.recordset[0],dailys:dailyR.recordset})
        }
      })
    })
  },
  autoResource:(req,res)=>{
    // const log4js = require('log4js');
    // log4js.configure({
    //   appenders: { autoResource: { type: 'file', filename: __dirname+'/logs/Auto-Resourcer.log' } },
    //   categories: { default: { appenders: ['autoResource'], level: 'info' } }
    // });
    // const arLog = log4js.getLogger('autoResource');
    let isClosed=false
    if (isClosed) {
      res.status(500).send({error:"Page is under maintenance. Please check back later"})
      return false
    }
    socketio.except(req.body.sid).emit("resource-updating",req.user.uName)
    resourceUpdating=req.user.uName
    let emitDoneTimeout=setTimeout(()=>{
      if (resourceUpdating) {
        socketio.except(req.body.sid).emit("resource-updated",req.user.uName)
        resourceUpdating=false
      }
    },60000)
    const moment = require('moment-business-days');
    const MomentRange = require('moment-range');
    MomentRange.extendMoment(moment)
    let params=JSON.parse(JSON.stringify(req.body.params))
    // console.log(params)

    let checkShift=(obj,shift)=>{
      // console.log(obj,shift,shift/1,!isNaN(shift/1),Number(obj.dtJobID),!isNaN(shift/1)?Number(obj.dtJobID)==Number(shift):(obj['is'+shift]==1 || obj['isJob'+shift]==1))
      return !isNaN(shift/1)?Number(obj.dtJobID)==Number(shift):((obj['is'+shift] || obj['isJob'+shift]) && !obj.dtJobID)
    }
    let progMsg=null
    let progCheck=()=>{//setTimeout(()=>{
      // console.log(progMsg)
      if (progMsg) {
        socketio.to(req.body.sid).emit("progress-update","Pass #"+req.body.passCount+": "+progMsg.msg+(progMsg.percDone!==undefined?(' '+Math.round(progMsg.percDone*100)+"%"):''))
        progMsg=null
      }
    }//,25)
    let sicknessPerc={day:0.85,eve:0.82}
    // let sendUpdate=(progMsg)=>setImmediate(()=>socketio.to(req.body.sid).emit("progress-update","Pass #"+req.body.passCount+": "+progMsg.msg+(progMsg.percDone!==undefined?(' '+Math.round(progMsg.percDone*100)+"%"):'')))
    // let sendUpdate=(progMsg)=>socketio.to(req.body.sid).emit("progress-update","Pass #"+req.body.passCount+": "+progMsg.msg))
    // let socketEmitting=false
    let plannedQ=`
    `+(params.academy?'':`update planners set plannerHours=plannerHours+isnull(plannerHoursAcademy,0) where plannerDate>getdate()
    update planners set plannerHoursAcademy=null where plannerDate>getdate()`)+`
    SELECT * from planners p left join jobs j on j.jobID=p.jobID outer apply (select top 1 jobID dtJobID from DedicatedTeams where jobID=j.jobID) d where plannerDate>getdate()`
    let bookedQ=`
    select sum(appliedHours) as Hours, isDay, isEve,dtJobID, bookingDate,isResourceable isAllocatable
    from getBookedHours(cast(getdate() as date),default)
    where bookingDate>cast(getdate() as date) and coalesce(nullif(isDay,0),nullif(isEve,0),dtJobID) is not null
    group by isDay,dtJobID, isEve, bookingDate,isResourceable`
    let forecastQ=`
    declare @C as table(agentID int,startTime time,endTime time,weekday int,appliedHours decimal(6,2),bookedHours decimal(6,2),fixedContractStart date)
    insert into @C
    exec getContractHours
    select dte forecastDate,sum(isnull(c.appliedHours,prevAvg)) Hours,isAllocatable,case when t.jobID is null then f2.isDay end isDay,case when t.jobID is null then f2.isEve end isEve,t.jobID dtJobID from
    		(select * from getDatesBetween(getdate(),dateadd(year,1,GETDATE()))) dt
    		left join (
    			select DATEPART(WEEKDAY,inputDate) as bookingDay,t.isDay isDay,t.isEve isEve,t.isAllocatable,a.agentID,SUM(b.hoursWorked)/nullif(count(nullif(b.hoursWorked,0)),0) prevAvg
    			from
    			Agents a
    			left join AgentTeams t on t.agentTeamID=a.teamID
    			left join (select agentID,inputDate,SUM(inputHours) hoursWorked from DailyInput where inputDate between DATEADD(week,-4,getdate()) and getdate() group by agentID,inputDate) b on b.agentID=a.agentID
    			where agentLeft is null
    			group by DATEPART(WEEKDAY,inputDate),a.agentID,t.isDay,t.isEve,t.isAllocatable
    		) f2 on f2.bookingDay=DATEPART(WEEKDAY,dt.dte)
    		left join @C c on c.agentID=f2.agentID and (c.weekday+1)=DATEPART(WEEKDAY,dt.dte)
    		outer apply (
    			select top 1 jobID from getDedicatedDates() dd left join DedicatedTeams dt2 on dt2.dedicationID=dd.dedicationID
    			where agentID=isnull(c.agentID,f2.agentID) and dd.dedicatedDate=dt.dte
    		) t
        where isAllocatable=1
    		group by dte,case when t.jobID is null then f2.isDay end,case when t.jobID is null then f2.isEve end,t.jobID,isAllocatable`
    let bankQ=`
    select * from bankHols`
    let plannerCleanupQ=`
    delete p from Planners p
    left join Jobs j on j.jobID=p.jobID
    where p.plannerDate not between j.startDate and j.endDate`
    db.multiple=true
    function promForEach(arr,func){
      return new Promise(res=>{
        let l=0
        function loop(){
          let item=arr[l]
          if (item) {
            func(item,l,()=>{
              progCheck()
              process.nextTick(()=>{
                l++
                loop()
              })
            })
          }else {
            res()
          }
        }
        loop()
      })
    }
    function promWhile(test,func){
      return new Promise(res=>{
        let l=0
        function loop(){
          if (test()) {
            func(()=>{
              progCheck()
              process.nextTick(()=>{
                l++
                loop()
              })
            })
            l++
          }else {
            res()
          }
        }
        loop()
      })
    }
    function promDo(test,func){
      return new Promise(res=>{
        let l=0
        function loop(){
          func(()=>{
            if (test()) {
              progCheck()
              process.nextTick(()=>{
                l++
                loop()
              })
            }else {
              res()
            }
          })
        }
        loop()
      })
    }
    // res.send('')
    let debugJob=6086
    let printJob=(stage)=>{
      if (debugJob) {
        console.log(stage,params.jobs.find(j=>j.jobID==debugJob))
      }
    }
    progMsg={msg:"Re-setting swapped shift jobs"}
    progCheck()
    function setResourceChildren(){
      return new Promise((resolve,reject)=>{
        if (params.jobs.filter(el=>el.resourceParent).length>0) {
          let resetQ=`
          --reset parent to take all future interviews
          UPDATE
          j
          SET
          j.interviewsTarget = j.interviewsTarget+(j2.interviewsTarget-round(case when j.isJobHourly=1 and j.isJobHourlyResource=0 then isnull(intsDone,0)/j.hourlyTarget when j.isJobHourly=0 and j.isJobHourlyResource=1 then isnull(intsDone,0)*j.hourlyTarget else isnull(intsDone,0) end,0))
          FROM
          Jobs j
          left join Jobs j2 on j2.resourceParent=j.jobID
          left join getResourceNeeded(0) r on r.jobID=j2.jobID
          WHERE
          j.jobID in (`+params.jobs.filter(el=>el.resourceParent).map(el=>el.resourceParent).join(",")+`);

          --reset child to 0 future interviews
          UPDATE
          j
          SET
          j.interviewsTarget = round(case when j.isJobHourly=1 and j.isJobHourlyResource=0 then isnull(intsDone,0)/j.hourlyTarget when j.isJobHourly=0 and j.isJobHourlyResource=1 then isnull(intsDone,0)*j.hourlyTarget else isnull(intsDone,0) end,0),
          j.startDate=j2.startDate,
          j.endDate=j2.endDate,
          j.dataDate=j2.dataDate,
          j.hourlyTarget=r.ahr
          FROM
          Jobs j
          left join Jobs j2 on j2.jobID=j.resourceParent
          left join getResourceNeeded(0) r on r.jobID=j.jobID
          WHERE
          j.jobID in (`+params.jobs.filter(el=>el.resourceParent).map(el=>el.jobID).join(",")+`);

          select * from jobs where jobID in (`+params.jobs.filter(el=>el.resourceParent).map(el=>el.resourceParent).join(",")+`);
          select * from jobs where jobID in (`+params.jobs.filter(el=>el.resourceParent).map(el=>el.jobID).join(",")+`);`
          db.query(resetQ,(err,r)=>{
            if (err) {
              console.log(err)
            }
            // console.log("Parents:",r.recordsets[0])
            // console.log("Children:",r.recordsets[1])
            let swapJobs=params.jobs.filter(el=>el.resourceParent && el.isSwapped)
            // console.log("swapJobs:",swapJobs)
            let s=0
            function updateTargets(){
              let swapJob=swapJobs[s]
              if (swapJob) {
                let updateQ=`
                --set child target
                update jobs set interviewsTarget=round(case when j.isJobHourly=1 and j.isJobHourlyResource=0 then floor(isnull(intsDone,0)+`+Math.ceil(swapJob.swappedShortfall)+`)/j.hourlyTarget when j.isJobHourly=0 and j.isJobHourlyResource=1 then floor(isnull(intsDone,0)+`+Math.ceil(swapJob.swappedShortfall)+`)*j.hourlyTarget else floor(isnull(intsDone,0)+`+Math.ceil(swapJob.swappedShortfall)+`) end,0)
                from
                jobs j
                outer apply (select intsDone from getResourceNeeded(j.jobID)) r
                where jobID=`+swapJob.jobID
                db.query(updateQ,(err,r)=>{
                  s++
                  updateTargets()
                })
              }else {
                resolve()
              }
            }
            updateTargets()
          })
        }else {
          resolve()
        }
      })
    }
    setResourceChildren().then(e=>{
      progMsg={msg:"Gathering info from database"}
      progCheck()
      const ps = new sql.Request()
      db.query(plannerCleanupQ,(err,pcR)=>{
        db.query('select * from getResourceNeeded(0) order by endDate desc'+plannedQ+bankQ,(err,r)=>{
          let latestEnd=moment(r.recordsets[0].find(j=>params.jobs.find(j2=>j2.jobID==j.jobID)).endDate)
          ps.input('dateCount',Math.min(180,latestEnd.diff(moment(),'d')))
          ps.execute('spNeededBooked',(err,bookedR)=>{
            progMsg={msg:"Setting up resourcer"}
            progCheck()
            if (err) {
              console.log(err,'select * from getResourceNeeded(0) order by endDate desc'+plannedQ+bookedQ+forecastQ+bankQ)
              res.status(500).send({error:err})
            }
            let response={
              jobs:r.recordsets[0].filter(j=>params.jobs.find(j2=>j2.jobID==j.jobID)),
              planned:r.recordsets[1],
              booked:bookedR.recordset,
              // forecasted:r.recordsets[3],
            }
            let bankHols=r.recordsets[2]
            let dates=moment.range(moment.utc().startOf('d').add(1,'d'),latestEnd)
            let bankHolDates=bankHols.map(el=>el.holDate.toISOString().split("T")[0])
            let datesArr=[]
            let shifts=params.shifts
            if (params.jobs.find(j=>params.jobs.find(p=>p.jobID==j.resourceParent && p.canGoEve && p.b2bHoursOnly))) {
              shifts.unshift('1to5')
            }
            let needed={}
            let dayCount=0
            let alldates=Array.from(dates.by('day'))
            let daysLeftSort=(thisDate,arr)=>{
              return arr.slice().sort((a,b)=>{
                return a.datesArr.filter(d=>d.dte.isAfter(thisDate.dte))-b.datesArr.filter(d=>d.dte.isAfter(thisDate.dte))
              })
            }
            // console.log("SHIFTS",shifts)
            function mapBookings(x){
              return promForEach(alldates,(day,ai,res) => {
                progMsg={msg:"Analysing booking data",percDone:(ai+1)/alldates.length}
                let booked={}
                let subShifts={}
                let academy={}
                let isForecasted={}
                let dte=day.format("YYYY-MM-DD")
                promForEach(shifts,(shift,i,sres) => {
                  isForecasted[shift]=datesArr.length>=params.delayForecast
                  let hoursField=isForecasted[shift]?'forecasted':'booked'
                  let bookingRow=shift
                  if (shift=='1to5') {
                    hoursField+="1to5"
                    bookingRow='Eve'
                  }
                  let bookingDay=response.booked.find(el=>dte==el.dte.toISOString().split("T")[0] && checkShift(el,bookingRow))
                  booked[shift]=0
                  academy[shift]=0
                  academy[shift]=bookingDay?bookingDay[hoursField+'Academy']:0
                  let sickReduction=sicknessPerc[(response.jobs.find(j=>checkShift(j,shift)) || {}).isJobEve?'eve':'day']
                  // console.log(shift,dte,sicknessPerc,response.jobs.find(j=>checkShift(j,shift)),(response.jobs.find(j=>checkShift(j,shift)) || {}).isJobEve,sickReduction)
                  if (params.academy) {
                    booked[shift]=academy[shift]
                  }else {
                    booked[shift]=bookingDay?bookingDay[hoursField]:0
                    let plannedHours=response.planned.filter(p=>p.plannerDate.toISOString().split("T")[0]==dte && checkShift(p,shift)).reduce((a,b)=>a+Number(b.plannerHours),0)
                    if (shift=='1to5') {
                      let jobs1to5=params.jobs.filter(j=>params.jobs.find(p=>p.jobID==j.resourceParent && p.canGoEve && p.b2bHoursOnly)).map(j=>j.jobID)
                      plannedHours=response.planned.filter(p=>p.plannerDate.toISOString().split("T")[0]==dte && jobs1to5.includes(p.jobID)).reduce((a,b)=>a+Number(b.plannerHours),0)
                    }
                    booked[shift]=Math.max(0,Math.round(((booked[shift]*sickReduction)-plannedHours)*2)/2)
                    academy[shift]=Math.round(((academy[shift]*sickReduction))*2)/2
                  }
                  let weightingField=shift=='1to5'?'recruitWeighting1to5':'recruitWeighting'
                  booked[shift]=booked[shift]+(bookingDay?(bookingDay.recruitHours*bookingDay[weightingField])*sickReduction:0)
                  sres()
                }).then(e=>{
                  booked['EveTotal']=Number(booked['Eve'])
                  datesArr.push({
                    dte:day,
                    dayType:bankHolDates.includes(dte)?'bankHol':([0,6].includes(day.day())?'weekend':'workday'),
                    booked:booked,
                    academy:academy,
                    isForecasted:isForecasted,
                    shortfall:{},
                    planned:{}
                  })
                  res()
                })
              })
            }
            let updateEveBooking=(day)=>{
              let dte=day.dte.format("YYYY-MM-DD")
              datesArr[datesArr.findIndex(d=>d.dte==day.dte)].booked['Eve']=datesArr[datesArr.findIndex(d=>d.dte==day.dte)].booked['EveTotal']-params.jobs.filter(j=>j.shift=='1to5' && j[dte]).reduce((a,b)=>a+b[dte],0)
              return datesArr[datesArr.findIndex(d=>d.dte==day.dte)]
            }
            function mapDates(x){
              return promForEach(datesArr,(day,i,res0)=>{
                progMsg={msg:"Reducing daily requirements to match booked hours",percDone:(i+1)/datesArr.length}
                let dte=day.dte.format("YYYY-MM-DD")
                day.jobs=params.jobs.filter(el=>day.dte.valueOf()>=el.stDate.valueOf() && day.dte.valueOf()<=el.enDate.valueOf() && (day.dayType=='workday' || el.weekends))
                // console.log("day with jobs",day.jobs.find(j=>j.jobID==6776))
                promForEach(shifts,(shift, i,res) => {
                  day=updateEveBooking(day)
                  let shiftJobs=day.jobs.filter(el=>el.shift==shift && el.plannerEntries[dte]===undefined)
                  day.shortfall[shift]=shiftJobs.reduce((a,b)=>a+(params.academy && b.hasMax?Math.min(b.max-Number(b.mainPlan[dte]),b.needed):b.needed),0)-day.booked[shift]
                  if (day.dayType!='workday') {
                    params.jobs=params.jobs.map(job=>{
                      if (job.weekends && shiftJobs.find(s=>s.jobID==job.jobID)) {
                        job[dte]=0
                      }
                      return job
                    })
                    res()
                  }else if (day.shortfall[shift]>0) {
                    // console.log(dte,shift,"SHORTFALL IN SHIFT",shiftJobs.reduce((a,b)=>a+(params.academy && b.hasMax?Math.min(b.max-Number(b.mainPlan[dte]),b.needed):b.needed),0),day.booked[shift])
                    let priority=2
                    let r=0
                    let prePlan=[]
                    promDo(()=>prePlan.reduce((a,b)=>a+b.reduction,0)<=day.shortfall[shift] && priority>=-1,(res2)=>{
                      let range=r/100
                      prePlan=[]
                      // console.log(dte,shiftJobs)
                      let reductionJobs=daysLeftSort(day,shiftJobs.filter(el=>el.priority>=priority))
                      promForEach(reductionJobs,(job, i,res3) => {
                        let jobNeeded=params.academy && job.hasMax?Math.min(job.max-Number(job.mainPlan[dte]),job.needed):job.needed
                        let maxReduction=job.min && day.dayType=='workday'?(jobNeeded-(job.min-(params.academy?job.mainPlan[dte]:0)))/jobNeeded:1
                        maxReduction=isNaN(maxReduction)?1:maxReduction
                        if ((!params.academy && job.useAcademy) || (job.plannedTotal>=job.neededTotal  && !job.minIgnore)) {
                          maxReduction=1
                        }
                        let reductionPerc=Math.min(maxReduction,(range/reductionJobs.length)*(i+1))
                        if (job.mustFinish && priority>=0) {
                          reductionPerc=0
                        }else if ((!job.mustFinish && priority<0) || job.sacrifice || (job.plannedTotal>=job.neededTotal  && !job.minIgnore)) {
                          reductionPerc=maxReduction
                        }
                        if (job.jobID==6895) {
                          // console.log("SHORTFALL ON DATE",dte,job.plannedTotal,job.neededTotal,job.minIgnore,maxReduction,reductionPerc)
                        }
                        if (dte=='2022-12-18' && shift=='Eve') {
                          // console.log("PREPLANNING",job.jobID,jobNeeded,reductionPerc,jobNeeded*reductionPerc)
                        }
                        prePlan.push({jobID:job.jobID,jobNeeded:jobNeeded,jobPlanned:jobNeeded-(jobNeeded*reductionPerc),reduction:jobNeeded*reductionPerc,maxed:reductionPerc>=maxReduction,mustFinish:job.mustFinish})
                        res3()
                      }).then(e=>{
                        if (priority>-1 && prePlan.filter(el=>el.maxed && !el.mustFinish).length==prePlan.filter(el=>!el.mustFinish).length) {
                          // console.log("ALL NON-MF AT ZERO",priority,JSON.parse(JSON.stringify(prePlan)))
                          priority--
                          // console.log("NEW PRIORITY",priority)
                          r=0
                        }else if (prePlan.filter(el=>el.maxed).length==prePlan.length) {
                          // console.log("ALL MF AT ZERO",priority,JSON.parse(JSON.stringify(prePlan)))
                          priority--
                          // console.log("NEW PRIORITY",priority)
                          r=0
                        }
                        r++
                        res2()
                        // console.log("CONTINUE WHILE?",prePlan.reduce((a,b)=>a+b.reduction,0)<=day.shortfall[shift] && priority>=-1,prePlan.reduce((a,b)=>a+b.reduction,0),day.shortfall[shift],priority)
                      });
                    }).then(e=>{
                      if (dte=='2022-12-18' && shift=='Eve') {
                        // console.log("INITIAL PLAN",prePlan.reduce((a,b)=>a+b.reduction,0),day.shortfall[shift],prePlan)
                      }
                      params.jobs=params.jobs.map(job=>{
                        let preJob=prePlan.find(el=>el.jobID==job.jobID)
                        let dJob=shiftJobs.find(el=>el.jobID==job.jobID)
                        let jobNeeded=params.academy && job.hasMax?Math.min(job.max-Number(job.mainPlan[dte]),job.needed):job.needed
                        if (preJob) {
                          job[dte]=jobNeeded-preJob.reduction
                          job.plannedTotal=job.plannedTotal+job[dte]
                        }else if (dJob) {
                          if (job.plannedTotal>=job.neededTotal && !job.minIgnore) {
                            jobNeeded=0
                          }
                          job[dte]=jobNeeded
                          job.plannedTotal=job.plannedTotal+job[dte]
                        }
                        return job
                      })
                      res()
                    })
                  }else if(shiftJobs.length>0) {
                    // console.log(dte,shift,"NO SHORTFALL IN SHIFT",shiftJobs.length)
                    params.jobs=params.jobs.map(job=>{
                      let dJob=shiftJobs.find(el=>el.jobID==job.jobID)
                      let jobNeeded=params.academy && job.hasMax?Math.min(job.max-Number(job.mainPlan[dte]),job.needed):job.needed
                      if (job.plannedTotal>=job.neededTotal && !job.minIgnore) {
                        jobNeeded=0
                      }
                      if (dJob) {
                        if (dJob.jobID==6895) {
                          // console.log("NO SHORTFALL ON DATE",dte,job.plannedTotal,job.neededTotal,job.minIgnore,jobNeeded)
                        }
                        job[dte]=jobNeeded
                        job.plannedTotal=job.plannedTotal+job[dte]
                      }
                      return job
                    })
                    res()
                  }else {
                    res()
                  }
                }).then(e=>{
                  datesArr[i]=day
                  res0()
                })
              })
            }
            function fillSurpluses(x){
              return promForEach(shifts,(shift, si,res) => {
                promForEach(datesArr,(day, i,dres) => {
                  day=updateEveBooking(day)
                  progMsg={msg:"Filling unused bookings with under-resourced jobs",percDone:((i+1)+(si*datesArr.length))/(datesArr.length*shifts.length)}
                  let dte=day.dte.format("YYYY-MM-DD")
                  let shiftJobs=params.jobs.filter(el=>el[dte]!==undefined && el.shift==shift)
                  // let shiftParents=params.jobs.filter(el=>el[dte]!==undefined && el.shift==shift && el.isSwapped).map(j=>({...j,parent:params.jobs.find(el=>el.jobID==j.resourceParent)}))
                  day.surplus={}
                  day.surplus[shift]=day.booked[shift]-shiftJobs.reduce((a,b)=>a+b[dte],0)
                  if (day.surplus[shift]>0) {
                    // console.log("SURPLUS FOUND",dte,shift,day.booked[shift],shiftJobs.reduce((a,b)=>a+b[dte],0),day.surplus[shift])
                    let surplusDaysLeft=datesArr.filter(el=>el.booked[shift]-params.jobs.filter(j=>j[el.dte.format("YYYY-MM-DD")]!==undefined && j.shift==shift).reduce((a,b)=>a+b[dte],0)>0 && el.dte>day.dte)
                    let shortfallJobs=shiftJobs.filter(el=>el.plannedTotal<el.neededTotal).map(sj=>{
                      sj.surplusDaysLeft=surplusDaysLeft.filter(el=>sj[el.dte.format("YYYY-MM-DD")]!==undefined).length+1
                      return sj
                    })
                    shortfallJobs=daysLeftSort(day,shortfallJobs).reverse()
                    if (dte=='2022-12-18' && shift=='Eve') {
                      // console.log("SURPLUS JOBS",dte,shift,shortfallJobs)
                    }
                    let r=0
                    let prePlan=[]
                    let priority=0
                    if (shortfallJobs.length>0) {
                      promDo(()=>prePlan.reduce((a,b)=>a+b.addition,0)<day.surplus[shift] && priority<=3,(pres)=>{
                        let range=r/100
                        prePlan=[]
                        let reductionJobs=shortfallJobs.filter(el=>el.priority<=priority)
                        //shortfall divided by number of surplus days left
                        promForEach(reductionJobs,(rJob, i,jres) => {
                          let jobShortfall=rJob.neededTotal-rJob.plannedTotal
                          let jobNeeded=rJob.hasMax?Math.min(rJob.max-(rJob[dte]+(params.academy?Number(rJob.mainPlan[dte]):0)),jobShortfall/rJob.surplusDaysLeft):jobShortfall/rJob.surplusDaysLeft
                          let additionPerc=Math.min(1,(range/reductionJobs.length)*(i+1))
                          let addition=day.surplus[shift]*additionPerc
                          if (dte=='2022-10-06' && shift=='Eve') {
                            // console.log("PREPLANNING",rJob.jobID,jobShortfall,jobNeeded,additionPerc,addition)
                          }
                          prePlan.push({jobID:rJob.jobID,addition:Math.min(jobNeeded,addition),needed:jobNeeded,maxed:Math.min(jobNeeded,addition)>=jobNeeded})
                          jres()
                        }).then(e=>{
                          // console.log("PRIORITY CHECK",prePlan.filter(el=>el.addition>=el.needed).length,prePlan.length,prePlan.reduce((a,b)=>a+b.addition,0),day.surplus[shift])
                          if (prePlan.filter(el=>el.maxed).length==prePlan.length && prePlan.reduce((a,b)=>a+b.addition,0)<day.surplus[shift]) {
                            // console.log("SURPLUS NOT FILLED",priority,JSON.parse(JSON.stringify(prePlan)))
                            priority++
                            // console.log("NEW PRIORITY",priority)
                            r=0
                          }
                          r++
                          // console.log("WHILE CONTINUE?",prePlan.reduce((a,b)=>a+b.addition,0),priority)
                          pres()
                        })
                      }).then(e=>{
                        if (dte=='2022-12-18' && shift=='Eve') {
                          // console.log("SURPLUS PREPLAN",prePlan)
                        }
                        params.jobs=params.jobs.map(job=>{
                          let preJob=prePlan.find(el=>el.jobID==job.jobID)
                          if (preJob) {
                            job[dte]=job[dte]+preJob.addition
                            job.plannedTotal=job.plannedTotal+preJob.addition
                            if (shift=='1to5') {
                              datesArr[i].booked['Eve']-=(preJob.addition || 0)
                            }
                          }
                          return job
                        })
                        dres()
                      })
                    }else {
                      dres()
                    }
                  }else {
                    dres()
                  }
                }).then(e=>res());
              });
            }
            function balanceSwaps(x){
              return promForEach(shifts,(shift,si,res)=>{
                //for each of the shortfall jobs, check each non-planner day for jobs which are planned to complete, and have a resource child with resource on a day with booking surplus
                // let resourcedChildren=params.jobs.filter(j=>j.shift==shift && Math.ceil(j.plannedTotal)>=Math.ceil(j.neededTotal) && j.resourceParent && j.neededTotal>0)
                let shoftfallJobs=params.jobs.filter(j=>j.plannedTotal<j.neededTotal && j.shift==shift)
                promForEach(shoftfallJobs,(sJob,ji,sres)=>{
                  let jobChild=params.jobs.find(j=>j.resourceParent==sJob.jobID)
                  let jobShortfall=jobChild?(sJob.neededTotal+jobChild.neededTotal)-(sJob.plannedTotal+jobChild.plannedTotal):sJob.neededTotal-sJob.plannedTotal
                  // console.log("job shortfall found",sJob.jobID,jobShortfall)
                  //days which can be used for shoftfall job
                  let jobDates=sJob.datesArr.filter(d=>sJob.plannerEntries[d.dte.format("YYYY-MM-DD")]===undefined)
                  let jd=0
                  promWhile(()=>jobDates[jd] && jobShortfall>1,(jres)=>{
                    let day=jobDates[jd]
                    day=updateEveBooking(day)
                    let dte=day.dte.format("YYYY-MM-DD")
                    //find fully resourced jobs with children
                    let isParentFinishing=(ch,pa)=>Math.ceil((pa.plannedTotal*pa.ahr)+(ch.plannedTotal*ch.ahr))*1.02>=Math.floor(pa.intsLeft)
                    let childJobs=params.jobs.filter(j=>j[dte]!==undefined && j.jobID!=sJob.jobID && j.shift==shift && params.jobs.find(el=>el.neededTotal>0 && el.resourceParent==j.jobID && el.plannedTotal<Number(j.childMax))).map(j=>params.jobs.find(el=>el.resourceParent==j.jobID))
                    // console.log("parent jobs found",dte,shift,childJobs.length)
                    //loop other shifts
                    promForEach(shifts,(childShift,i,cres)=>{
                      day=updateEveBooking(day)
                      let childShiftJobs=childJobs.filter(j=>j.shift==childShift)
                      //there are child jobs within other shift
                      if (childShiftJobs.length) {
                        let daySurplus=day.booked[childShift]-params.jobs.filter(el=>el[dte]!==undefined && el.shift==childShift).reduce((a,b)=>a+b[dte],0)
                        // console.log("child jobs found",dte,childShift,childShiftJobs.length,daySurplus,jobShortfall)
                        let r=0
                        let prePlan=[]
                        let priority=0
                        let tempJobShortfall=jobShortfall
                        let additionToPlace=()=>sJob.hasMax?Math.min(sJob[dte]-sJob.max,Math.min(tempJobShortfall,daySurplus)):Math.min(tempJobShortfall,daySurplus)
                        promDo(()=>prePlan.reduce((a,b)=>a+b.addition,0)<additionToPlace() && priority<=3,(ppres)=>{
                          tempJobShortfall=jobShortfall
                          let range=r/100
                          prePlan=[]
                          let additionJobs=childShiftJobs.filter(el=>el.priority<=priority)

                          promForEach(additionJobs,(rJob, i,ares) => {
                            let parentNeeded=params.jobs.find(el=>el.jobID==rJob.resourceParent)[dte]
                            let maxAddition=(rJob.hasMax?Math.max(rJob[dte]-rJob.max,0):parentNeeded)/additionToPlace()
                            let additionPerc=Math.min(maxAddition,(range/additionJobs.length)*(i+1))
                            let addition=additionToPlace()*additionPerc
                            tempJobShortfall=tempJobShortfall-addition
                            // console.log("adding to child",additionToPlace,maxAddition,additionPerc,addition,tempJobShortfall)
                            prePlan.push({jobID:rJob.jobID,resourceParent:rJob.resourceParent,addition:addition,maxxed:additionPerc==maxAddition})
                            ares()
                          }).then(e=>{
                            // console.log("PRIORITY CHECK",prePlan.filter(el=>el.addition>=el.needed).length,prePlan.length,prePlan.reduce((a,b)=>a+b.addition,0),day.surplus[shift])
                            if (prePlan.filter(el=>el.maxxed).length==prePlan.length && prePlan.reduce((a,b)=>a+b.addition,0)<additionToPlace()) {
                              // console.log("SURPLUS NOT FILLED",priority,JSON.parse(JSON.stringify(prePlan)))
                              priority++
                              // console.log("NEW PRIORITY",priority)
                              r=0
                            }
                            r++
                            // console.log("WHILE CONTINUE?",prePlan.reduce((a,b)=>a+b.addition,0),priority)
                            ppres()
                          });
                        }).then(e=>{
                          params.jobs=params.jobs.map(job=>{
                            let preJob=prePlan.find(el=>el.jobID==job.jobID)
                            if (preJob) {
                              job[dte]=job[dte]+preJob.addition
                              job.plannedTotal=job.plannedTotal+preJob.addition
                            }
                            let parent=prePlan.find(el=>el.resourceParent==job.jobID)
                            if (parent) {
                              job[dte]=job[dte]-parent.addition
                              job.plannedTotal=job.plannedTotal-parent.addition
                              if (shift=='1to5') {
                                datesArr[datesArr.findIndex(d=>d.dte==day.dte)].booked['Eve']+=(parent.addition || 0)
                              }
                            }
                            let shortfallJob=prePlan.find(el=>el.jobID==sJob.jobID)
                            if (shortfallJob) {
                              job[dte]=job[dte]+shortfallJob.addition
                              job.plannedTotal=job.plannedTotal+shortfallJob.addition
                            }
                            return job
                          })
                          jobShortfall=jobShortfall-prePlan.reduce((a,b)=>a+b.addition,0)
                          cres()
                        })
                      }else {
                        cres()
                      }
                    }).then(e=>{
                      jd++
                      jres()
                    })
                  }).then(e=>{
                    sres()
                  })
                }).then(e=>{
                  res()
                })
              })
            }
            function frontEnd(x){
              return promForEach(shifts,(shift,i,res)=>{
                let d=0
                promWhile(()=>datesArr[d],(res2)=>{
                  let day=datesArr[d]
                  day=updateEveBooking(day)
                  let dte=day.dte.format("YYYY-MM-DD")
                  let shiftJobs=daysLeftSort(day,params.jobs.filter(el=>el[dte]!==undefined && el.shift==shift)).reverse()
                  day.surplus[shift]=day.booked[shift]-shiftJobs.reduce((a,b)=>a+b[dte],0)
                  if (shift=='1to5') {
                    let eveJobs=daysLeftSort(day,params.jobs.filter(el=>el[dte]!==undefined && el.shift=='Eve')).reverse()
                    day.surplus[shift]=Math.min(day.booked['Eve']-eveJobs.reduce((a,b)=>a+b[dte],0),day.booked[shift]-shiftJobs.reduce((a,b)=>a+b[dte],0))
                  }
                  let prePlan=[]
                  let r=0
                  let priority=0
                  if (day.surplus[shift]>0) {
                    // console.log("SURPLUS FOUND IN SHIFT",shift,dte,day.booked[shift],shiftJobs.reduce((a,b)=>a+b[dte],0),day.surplus[shift])
                    let surplusJobs=shiftJobs.filter(j=>j.plannerEntries[dte]===undefined)
                    promDo(()=>prePlan.reduce((a,b)=>a+b.addition,0)<day.surplus[shift] && priority<=3,(res3)=>{
                      let range=r/100
                      prePlan=[]
                      let additionJobs=surplusJobs.filter(el=>el.priority<=priority)
                      //shortfall divided by number of surplus days left
                      // console.log("Do in front-end",priority,r)
                      promForEach(additionJobs,(rJob, i,res4) => {
                        // console.log("Addition job",i,rJob)
                        // console.log("Dates after",Object.keys(rJob).filter(k=>k.indexOf("-")>-1))
                        let hoursLeftAfter=Object.keys(rJob).filter(k=>k.indexOf("-")>-1).filter(k=>(new Date(k)).getTime()>(new Date(dte)).getTime()).reduce((a,b)=>a+Math.max(Number(rJob[b])-Number(rJob.min),0),0)
                        let jobNeeded=Math.max(rJob.hasMax?Math.min(rJob.max-(rJob[dte]+(params.academy?Number(rJob.mainPlan[dte]):0)),hoursLeftAfter):hoursLeftAfter,0)
                        let additionPerc=Math.min(1,(range/additionJobs.length)*(i+1))
                        let addition=day.surplus[shift]*additionPerc
                        // if (rJob.jobID==6934) {
                          // console.log("PREPLANNING",dte,hoursLeftAfter,jobNeeded,additionPerc,addition)
                          // }
                          prePlan.push({jobID:rJob.jobID,addition:Math.min(jobNeeded,addition),maxed:Math.min(jobNeeded,addition)>=jobNeeded})
                          res4()
                        }).then(e=>{
                          // console.log("PRIORITY CHECK",prePlan.filter(el=>el.maxed).length,prePlan.length,prePlan.reduce((a,b)=>a+b.addition,0),day.surplus[shift])
                          if (prePlan.filter(el=>el.maxed).length==prePlan.length && prePlan.reduce((a,b)=>a+b.addition,0)<day.surplus[shift]) {
                            // console.log("SURPLUS NOT FILLED",priority,JSON.parse(JSON.stringify(prePlan)))
                            priority++
                            // console.log("NEW PRIORITY",priority)
                            r=0
                          }
                          r++
                          // console.log("WHILE CONTINUE?",prePlan.reduce((a,b)=>a+b.addition,0),priority)
                          res3()
                        })
                      }).then(e=>{
                        // console.log("Addition to day:",prePlan.reduce((a,b)=>a+b.addition,0))
                        promForEach(prePlan,(preJob,i,res3)=>{
                          let jobIndex=params.jobs.findIndex(j=>j.jobID==preJob.jobID)
                          params.jobs[jobIndex][dte]=params.jobs[jobIndex][dte]+preJob.addition
                          let additionToMove=preJob.addition
                          let datesAfter=Object.keys(params.jobs[jobIndex]).filter(k=>k.indexOf("-")>-1).filter(k=>(new Date(k)).getTime()>(new Date(dte)).getTime())
                          datesAfter.sort((a,b)=>(new Date(b)).getTime()-(new Date(a)).getTime())
                          promWhile(()=>datesAfter.filter(k=>params.jobs[jobIndex][k]>Number(params.jobs[jobIndex].min)).length && additionToMove>0,(res4)=>{
                            let da=0
                            promWhile(()=>da<datesAfter.length && additionToMove>0,(res5)=>{
                              let movable=params.jobs[jobIndex][datesAfter[da]]-params.jobs[jobIndex].min
                              let thisMove=Math.min(movable,additionToMove)
                              params.jobs[jobIndex][datesAfter[da]]=params.jobs[jobIndex][datesAfter[da]]-thisMove
                              additionToMove=additionToMove-thisMove
                              da++
                              res5()
                            }).then(e=>{
                              res4()
                            })
                          }).then(e=>{
                            res3()
                          })
                        }).then(e=>{
                          d++
                          res2()
                        })
                      })
                    }else {
                      d++
                      res2()
                    }
                  }).then(e=>{
                    res()
                  })
                })
            }

            // console.log("datesArr",datesArr)
            // console.log("params.jobs",params.jobs.find(j=>j.jobID==6895))
            // console.log("params.jobs",params.jobs.find(j=>j.jobID==6958))
            printJob("BEFORE MAPPING")
            mapBookings(1).then(e=>{
              // console.log(datesArr.map(el=>el.booked))
              promForEach(params.jobs,(job,ji,res)=>{
                progMsg={msg:"Applying daily minimums needed to finish",percDone:(ji+1)/params.jobs.length}
                let rJob=response.jobs.find(el=>el.jobID==job.jobID)
                if (rJob) {
                  job.hasMax=job.max===0 || job.max==='0' || job.max>0
                  job.intsDone=rJob.intsDone
                  job.stDate=moment.max(moment.utc().startOf('d'),moment.utc(rJob.startDate))
                  job.enDate=moment.utc(rJob.endDate).isoWeekday()>4?moment.utc(rJob.endDate).isoWeekday(7):moment.utc(rJob.endDate)
                  job.shift=rJob.dtJobID?rJob.dtJobID:(rJob.isJobDay?'Day':'Eve')
                  job.shift=params.jobs.find(p=>p.jobID==job.resourceParent && p.canGoEve && p.b2bHoursOnly)?'1to5':job.shift
                  job.intsLeft=rJob.intsLeft
                  job.ahr=job.ahr?job.ahr:rJob.ahr
                  job.neededTotal=Math.ceil(params.academy?job.academyTarget:((job.intsLeft/job.ahr)-Number(rJob.plannerHours)))
                  job.min=job.min?job.min:0
                  job.datesArr=datesArr.filter(el=>(el.dayType=='workday' || job.weekends) && el.dte.valueOf()>=job.stDate.valueOf() && el.dte.valueOf()<=job.enDate.valueOf() && !response.planned.find(p=>p.jobID[0]==job.jobID && p.plannerDate.toISOString().split("T")[0]==el.dte.format("YYYY-MM-DD")))
                  let workDates=job.datesArr.filter(el=>el.dayType=='workday')
                  job.needed=job.hasMax?Math.min(job.max,job.neededTotal/(workDates.length)):job.neededTotal/(workDates.length)
                  job.needed=Math.max(job.needed,Number(job.min))
                  job.plannedTotal=0
                  job.plannerEntries={}
                  job.plannerAdjustments=[]
                  job.mustFinish=(!job.canGoDay && !job.canGoEve) || params.jobs.find(el=>el.resourceParent==job.jobID && el.isSwapped)?job.mustFinish:false
                }
                promForEach(response.planned.filter(el=>el.jobID[0]==job.jobID),(plans,pi,res2)=>{
                  job.plannerEntries[plans.plannerDate.toISOString().split("T")[0]]=plans.plannerHours
                  res2()
                }).then(e=>{
                  params.jobs[ji]=job
                  res()
                })
              }).then(e=>{
                params.jobs=params.jobs.filter(el=>el.enDate>moment())
                // console.log("params.jobs mapped",params.jobs.find(j=>j.jobID==6895))
                // console.log("params.jobs mapped",params.jobs.find(j=>j.jobID==6958))
                let timelineNeeded={}
                promForEach(shifts,(sh,i,res)=>{
                  timelineNeeded[sh]=params.jobs.filter(el=>el.shift==sh).reduce((a,b)=>a+b.neededTotal,0)
                  res()
                }).then(e=>{
                  params.jobs=params.jobs.map(job=>{
                    //% of total hours needed this job accounts for
                    job.allocation=job.neededTotal/timelineNeeded[job.shift]
                    return job
                  })
                  // console.log("params.jobs allocation",params.jobs)
                  // params.jobs=params.jobs.map(el=>({...el,rand:Math.random()}))
                  // console.log(params.forceRanking)
                  progMsg={msg:"Prioritising jobs"}
                  progCheck()
                  if (!params.forceRanking) {
                    // params.jobs.sort((a,b)=>a.rand-b.rand)
                    params.jobs.sort((a,b)=>a.datesArr.length-b.datesArr.length)
                    let prioritised=[]
                    prioritised=prioritised.concat(params.jobs.filter(el=>el.mustFinish).map(el=>({...el,priority:0})))
                    prioritised=prioritised.concat(params.jobs.filter(el=>!el.mustFinish && !el.sacrifice && el.hasMax).map(el=>({...el,priority:1})))
                    prioritised=prioritised.concat(params.jobs.filter(el=>!el.mustFinish && !el.sacrifice && !el.hasMax).map(el=>({...el,priority:2})))
                    prioritised=prioritised.concat(params.jobs.filter(el=>!el.mustFinish && el.sacrifice).map(el=>({...el,priority:3})))
                    params.jobs=prioritised
                  }else {
                    params.jobs.sort((a,b)=>a.ranking-b.ranking)
                  }
                  mapDates(4).then(e=>{
                    printJob("AFTER MAPPING")
                    fillSurpluses(6).then(e=>{
                      printJob("AFTER SURPLUSES")
                      progMsg={msg:"Pushing more interviews to swapped shifts"}
                      progCheck()
                      balanceSwaps(8).then(e=>{
                        printJob("AFTER SWAPS")
                        progMsg={msg:"Front-ending jobs with unutilised bookings"}
                        progCheck()
                        frontEnd(10).then(e=>{
                          printJob("AFTER FRONT-ENDING")
                          fillSurpluses().then(e=>{
                            printJob("AFTER SURPLUSES REDO")
                            progMsg={msg:"Compiling plan"}
                            progCheck()
                            // console.log("end",params.jobs.find(j=>j.jobID==6768))
                            let bookedData=[]
                            promForEach(datesArr,(day,i,res)=>{
                              let obj={
                                dte:day.dte,
                                isForecasted:day.isForecasted,
                              }
                              promForEach(shifts,(sh,si,res2)=>{
                                obj[sh]=day.booked[sh]
                                res2()
                              }).then(e=>{
                                bookedData[i]=obj
                                res()
                              })
                            }).then(e=>{
                              params.jobs=params.jobs.map((job,i)=>{
                                let swapped=params.jobs.find(el=>el.jobID==job.jobID+"a")
                                job.shift=job.shift=='1to5'?'Eve':job.shift
                                job.plannedTotalSwapped=swapped?swapped.plannedTotal:0
                                job.ranking=i
                                job.intsShort=((job.plannedTotal+job.plannedTotalSwapped)-job.neededTotal)*job.ahr
                                job.sqlData=Object.keys(job).filter(k=>k.indexOf("-")>-1).map(k=>({jobID:job.jobID,dte:k,needed:Math.round((params.academy?Number(job.mainPlan[k]):job[k])*2)/2,neededAcademy:params.academy?job[k]:null}))
                                delete job.datesArr
                                return job
                              })
                              let finalObj={params:params,booked:bookedData,jobs:{All:params.jobs}}
                              promForEach(shifts,(sh,i,res)=>{
                                finalObj.jobs[sh]=params.jobs.filter(el=>el.shift==sh)
                                res()
                              }).then(e=>{
                                socketio.except(req.body.sid).emit("resource-updated")
                                resourceUpdating=false
                                clearTimeout(emitDoneTimeout)
                                // clearInterval(progCheck)
                                res.send(finalObj)
                              })
                            })
                          })
                        })
                      })
                    })
                  })
                })
              })
            })
            // MOVE PLANNER HOURS INTO ACADEMY WHERE SHORTFALL JOBS FALL ON DAYS WITH PLANNER HOURS & ACADEMY
            if (!params.academy && false) {
              promForEach(shifts,(shift,si)=>{
                let shortfallJobs=params.jobs.filter(el=>el.shift==shift && el.plannedTotal<el.neededTotal)
                let shortfallHours=shortfallJobs.reduce((a,b)=>a+(b.neededTotal-b.plannedTotal),0)
                let plannerPlan=[]
                // console.log(shift,"shortfallJobs",shortfallJobs.length)
                promForEach(datesArr,(day,i)=>{

                  let plannerJobs=params.jobs.filter(el=>el.shift==shift && el.useAcademy && el.plannerEntries[day.dte.format("YYYY-MM-DD")]>0)
                  plannerJobs.slice().reverse()
                  promForEach(plannerJobs,job=>{
                    promForEach(Object.keys(job.plannerEntries),dte=>{
                      plannerPlan.push({jobID:job.jobID,dte:dte,academyPlanner:0,planner:job.plannerEntries[dte],shortfallJobs:shortfallJobs.filter(j=>j[dte]>=0 && j.plannerEntries[dte]===undefined)})
                    })
                  })
                })
                if (plannerPlan.length) {
                  //for each job with a planner on the same day as a shortfall job, incrementally move those planners into academy until no shortfall exists or academy is full or all planners are in academy
                  let academyHours={}
                  promForEach(datesArr,day=>{
                    academyHours[day.dte.format("YYYY-MM-DD")]={booked:day.academy[shift],needed:0}
                  })
                  // console.log(shift,"running planner academy adjustment")
                  promForEach(shortfallJobs,(job,i)=>{
                    progMsg={msg:"Moving manual hours to academy if needed",percDone:((i+1)+(si*shortfallJobs.length))/(shortfallJobs.length*shifts.length)}
                    socketio.to(req.body.sid).emit("progress-update","Pass #"+req.body.passCount+": "+progMsg.msg+(progMsg.percDone!==undefined?(' '+Math.round(progMsg.percDone*100)+"%"):''))
                    let jobShortfall=job.neededTotal-job.plannedTotal
                    promWhile(()=>plannerPlan.find(pl=>pl.shortfallJobs.map(j=>j.jobID).includes(job.jobID) && pl.planner>0 && academyHours[pl.dte].needed<academyHours[pl.dte].booked) && jobShortfall>0,()=>{
                      let plIndex=plannerPlan.findIndex(pl=>pl.shortfallJobs.map(j=>j.jobID).includes(job.jobID) && pl.planner>0 && academyHours[pl.dte].needed<academyHours[pl.dte].booked)
                      plannerPlan[plIndex].planner--
                      jobShortfall--
                      plannerPlan[plIndex].academyPlanner++
                      job[plannerPlan[plIndex].dte]++
                      job.plannedTotal++
                      academyHours[plannerPlan[plIndex].dte].needed++
                      // console.log(job.jobID,plannerPlan.find(pl=>pl.shortfallJobs.map(j=>j.jobID).includes(job.jobID) && pl.planner>0 && academyHours[pl.dte].needed<academyHours[pl.dte].booked),jobShortfall)
                      // console.log("CONTINUE?",plannerPlan.find(pl=>pl.shortfallJobs.map(j=>j.jobID).includes(job.jobID) && pl.planner>0 && academyHours[pl.dte].needed<academyHours[pl.dte].booked) && jobShortfall>0)
                    })
                    params.jobs=params.jobs.map(pJob=>{
                      if (pJob.jobID==job.jobID) {
                        return job
                      }else if(plannerPlan.find(pl=>pJob.jobID==pl.jobID)){
                        pJob.plannerAdjustments=plannerPlan.filter(pl=>pJob.jobID==pl.jobID).map(pl=>({jobID:pl.jobID,dte:pl.dte,plannerHoursAcademy:pl.academyPlanner,plannerHours:pl.planner}))
                        return pJob
                      }else {
                        return pJob
                      }
                    })
                  })
                }
              })
            }
            //REDUCE JOB SHORTFALLS WHERE JOBS NEED FINISHING BY TAKING FROM LOWER PRIORITY JOBS
            let shortfallReduced=0
            // change to 0 to activate
            let j=999999
            promWhile(()=>j<params.jobs.filter(el=>el.plannedTotal<el.neededTotal && el.mustFinish).length,()=>{
              let job=params.jobs.filter(el=>el.plannedTotal<el.neededTotal && el.mustFinish)[j]
              // console.log("SHORTFALL FOUND",job.jobName,job.neededTotal-job.plannedTotal)
              let lowerJobs=params.jobs.filter(el=>el.shift==job.shift).slice(params.jobs.indexOf(job)+1)
              let prioritisedDates=datesArr.slice().filter(el=>(el.dayType=='workday' || job.weekends) && job.plannerEntries[el.dte.format("YYYY-MM-DD")]===undefined && el.dte.valueOf()>=job.stDate.valueOf() && el.dte.valueOf()<=job.enDate.valueOf()).map(el=>{
                el.lowerHours=lowerJobs.reduce((a2,b2)=>a2+Number(b2[el.dte.format("YYYY-MM-DD")]?b2[el.dte.format("YYYY-MM-DD")]:0),0)
                return el
              }).filter(el=>el.lowerHours>0 && (job[el.dte.format("YYYY-MM-DD")]+(params.academy?Number(job.mainPlan[el.dte.format("YYYY-MM-DD")]):0)<job.max || !job.hasMax))
              prioritisedDates.sort((a,b)=>b.lowerHours-a.lowerHours)
              let totalLowerHours=prioritisedDates.reduce((a,b)=>a+b.lowerHours,0)
              shortfallReduced=0
              promForEach(prioritisedDates,(day, i) => {
                let dayProportionOfLower=day.lowerHours/totalLowerHours
                let dayShortfallToReduce=(job.neededTotal-job.plannedTotal)*dayProportionOfLower
                if (job.hasMax) {
                  let diff=job.max-(job[day.dte.format("YYYY-MM-DD")]+(params.academy?Number(job.mainPlan[day.dte.format("YYYY-MM-DD")]):0))
                  dayShortfallToReduce=Math.min(diff,dayShortfallToReduce)
                }
                // console.log("CALCULATING SHORTFALL TO REDUCE",dayShortfallToReduce,(job.neededTotal-job.plannedTotal),dayProportionOfLower,day.lowerHours,totalLowerHours)
                let dayShortfallReduced=0
                let dte=day.dte.format("YYYY-MM-DD")
                let r=0
                let prePlan=[]
                let dayJobs=lowerJobs.filter(el=>el.jobID)
                promDo(()=>dayShortfallReduced<=dayShortfallToReduce && prePlan.filter(el=>el.maxxed).length!=prePlan.length,()=>{
                  let range=r/100
                  prePlan=[]
                  let reductionJobs=lowerJobs.filter(el=>el[dte])
                  promForEach(reductionJobs,(rJob, i) => {
                    let jobNeeded=rJob[dte]
                    let maxReduction=rJob.min && day.dayType=='workday'?(jobNeeded-(rJob.min-(params.academy?rJob.mainPlan[dte]:0)))/jobNeeded:1
                    let reductionPerc=Math.min(maxReduction,(range/reductionJobs.length)*(i+1))
                    // console.log("PREPLANNING",rJob.jobID,jobNeeded,reductionPerc,jobNeeded*reductionPerc)
                    prePlan.push({jobID:rJob.jobID,reduction:jobNeeded*reductionPerc,maxxed:reductionPerc==maxReduction})
                  });
                  dayShortfallReduced=prePlan.reduce((a,b)=>a+b.reduction,0)
                  r++
                  // console.log("WHILE CONTINUE?",dayShortfallReduced<=dayShortfallToReduce && prePlan.filter(el=>el.perc==1).length!=prePlan.length,dayShortfallToReduce,dayShortfallReduced,prePlan.filter(el=>el.perc==1).length!=prePlan.length)
                })
                params.jobs=params.jobs.map(el=>{
                  let preJob=prePlan.find(p=>p.jobID==el.jobID)
                  if (preJob) {
                    el[dte]=el[dte]-preJob.reduction
                    el.plannedTotal=el.plannedTotal-preJob.reduction
                    // console.log("TAKEN "+preJob.reduction+" FROM "+el.jobName," | NOW AT "+el[dte])
                  }else if (el.jobID==job.jobID) {
                    el[dte]=el[dte]+dayShortfallReduced
                    el.plannedTotal=el.plannedTotal+dayShortfallReduced
                    // console.log("ADDED "+dayShortfallReduced+" TO "+el.jobName,dayShortfallReduced,"| NOW AT "+el.plannedTotal)
                  }
                  return el
                })
                shortfallReduced=shortfallReduced+dayShortfallReduced
              });
              if (shortfallReduced==0) {
                j++
              }
              // console.log("SHORTFALL REDUCED BY",shortfallReduced)
            })
          })
        })
      })
    })
  },
  updateResourceRecalcs:(req,res)=>{
    req.body.forEach((job, i) => {
      let calcData={
        interviewsTarget:job.interviewsTarget,
        ahr:job.ahr,
        startDate:moment(job.startDate).format("YYYY-MM-DD"),
        endDate:moment(job.endDate).format("YYYY-MM-DD"),
        isJobDay:job.isJobDay,
        isJobEve:job.isJobEve,
        plannerHours:job.plannerHoursArr,
        resourceSettings:job.resourceSettings
      }
      // if (job.jobID==6771) {
      //   console.log(job.resourceSettings,calcData,JSON.stringify(calcData))
      // }
      db.input('calc'+i,sql.VarChar(sql.MAX),JSON.stringify(calcData))
      db.query(`update jobs set lastResourceCalc=@calc`+i+` where jobID=`+job.jobID)
    });
    res.send("done")
  },
  applyPlannerAdjustments:(req,res)=>{
    let p=0
    function updatePlanner(){
      let plan=req.body.plans[p]
      if (plan) {
        let q=`update planners set plannerHours=`+plan.plannerHours+`,plannerHoursAcademy=`+plan.plannerHoursAcademy+` where jobID=`+plan.jobID+` and plannerDate='`+plan.dte+`'`
        db.query(q,(err,r)=>{
          if (err) {
            console.log(err)
          }
          p++
          updatePlanner()
        })
      }else {
        res.send("done")
      }
    }
    if (req.body.plans) {
      updatePlanner()
    }else {
      res.send("done")
    }
  },
  autoAllocate:(req,res)=>{
    const _ = require('lodash')
    let bookedQ=`select * from getBookedHours(GETDATE(),default)`
    let params=req.body.params||{}
    const ps = new sql.Request()

    let sqlData=[]
    let jobQ=`
    select *,isnull(onTarget,0)*(1-ahrSpread) priority from
    getResourceNeeded(0) r
    outer apply (
    	select (0.00+count(CASE WHEN d.InputInterviews / nullif(d.InputHours,0)>=isnull(jt.hourlyTarget,j.hourlyTarget) THEN 1 ELSE NULL END))/nullif(count(*),0) AS onTarget
    	FROM
    	DailyInput d outer apply
    		(select top 1 * from PastJobTargets p where p.dateUntil>d.inputDate and p.jobID=d.jobID
    		) jt,
    	Jobs j
    	WHERE d.InputHours>0 AND d.InputInterviews>0 AND j.jobID=r.jobID AND j.jobID = d.jobID and inputDate>DATEADD(week,-1,cast(getdate() as date))
    ) s
    outer apply(
    select (MAX(ints/hrs)-MIN(ints/hrs))/MAX(ints/hrs) ahrSpread from
    	(
    		select agentID,sum(inputInterviews) ints,sum(inputHours) hrs from
    		DailyInput d
    		where d.jobID=r.jobID
    		group by agentID having(sum(inputInterviews)>0)
    	) ag
    ) a`
    let performanceQ=`
    select isnull(l.agentID,d.agentID) agentID,jobID,agentAhr agentJobAhr,contKPI+onTargetKPI+hrsKPI+qcKPI+absenceKPI+latesKPI leagueScore from
    getLeagueTable(null,null,0,0,0,0) l
    full outer join (
  		select agentID,jobID,SUM(inputInterviews)/nullif(SUM(inputHours),0) agentAhr
  		from
  		DailyInput
      where inputDate<cast(getdate() as date)
  		group by agentID,jobID having(SUM(inputHours)>3)
    ) d on d.agentID=l.agentID`

    if (req.body.date) {
      ps.input('dateCount',1)
      ps.input('startDate',req.body.date)
    }else {
      ps.input('dateCount',params.delayForecast)
    }
    ps.multiple=true
    ps.query(jobQ+performanceQ,(err,jobR)=>{
      if (req.body.date) {
        params.jobs=jobR.recordsets[0].map(j=>{
          j.minAgentAHR=JSON.parse((j.resourceSettingsN||"{}")).minAgentAHR
          j.mustFinish=JSON.parse((j.mustFinish||"{}")).mustFinish
          return j
        })
        params.shifts=req.body.shifts
      }else {
        params.jobs=params.jobs.map(j=>({...j,...jobR.recordsets[0].find(el=>el.jobID==j.jobID)}))
      }
      let jobStats=(job)=>params.jobs.find(j=>j.jobID==job.jobID)
      let getBookings=()=>{
        if (req.body.date) {
          if(req.body.date){
            ps.input("allocDate",req.body.date)
            bookedQ=`select * from getBookedHours(@allocDate,@allocDate)`
          }
          return ps.query(bookedQ)
        }else {
          return ps.execute('spBookingForecast')
        }
      }
      ps.execute('getJobResourcePlan',(err,resourceR)=>{
        if (err) throw err;
        getBookings().then(bookingR=>{
          let dates=_.uniqBy(bookingR.recordset,a=>formatSQLdate(a.bookingDate)).map(el=>formatSQLdate(el.bookingDate)).filter(el=>el)
          let grid={}
          let bookings=bookingR.recordset

          asyncForEach(dates,(dte,di)=>{
            let bookedField=di>params.delayForecast?'forecasted':'appliedHours'
            grid[dte]={}
            asyncForEach(params.shifts,shift=>{
              let shiftCheck=(sh,obj)=>!isNaN(sh/1)?Number(obj.dtJobID)==Number(sh):((obj['is'+sh] || obj['isJob'+sh]) && !obj.dtJobID)
              let neededDisplay=(job)=>job.planned!==null?job.planned:(job.resourceHours!==null?job.resourceHours:job.isOfficeDay==1?job.calc:0)
              // if (dte=='2022-10-02') {
                // console.log("STARTING",dte,shift)
              // }
              // console.log("GETTING SHIFT",shift)
              let dayBookings=bookings.filter(el=>formatSQLdate(el.bookingDate)==dte && shiftCheck(shift,el)).map(b=>({...b,...{totalAllocated:0,booked:b[bookedField]}})).filter(el=>el.booked>0)
              // console.log("Day bookings",dayBookings.length)
              // if (dte=='2022-10-02') {
                // console.log("needed",resourceR.recordset.filter(el=>formatSQLdate(el.dte)==dte && shiftCheck(shift,el) && neededDisplay(el)>0).length)
              // }
              let jobArr=resourceR.recordset.filter(el=>formatSQLdate(el.dte)==dte && shiftCheck(shift,el) && neededDisplay(el)>0).map(job=>({...job,...jobStats(job)}))
              asyncForEach(jobArr,(job,ji)=>{
                dayBookings=dayBookings.map(b=>{
                  let perf={}
                  perf[job.jobID]={...jobR.recordsets[1].find(el=>el.agentID==b.agentID && el.jobID==job.jobID),allocated:0}
                  perf[job.jobID].agentJobAhr=perf[job.jobID].agentJobAhr===undefined?null:perf[job.jobID].agentJobAhr
                  return {...b,...perf}
                })
                let ahrs=dayBookings.filter(a=>a[job.jobID].agentJobAhr!==null).map(a=>a[job.jobID].agentJobAhr)
                let mid=((Math.max(...ahrs)-Math.min(...ahrs))/2)+Math.min(...ahrs)
                dayBookings=dayBookings.map(a=>{
                  a[job.jobID]={...a[job.jobID],priority:(a[job.jobID].agentJobAhr===null?1:(a[job.jobID].agentJobAhr>mid || ahrs.length==1?2:0))}
                  return a
                })
              })
              if (dte=='2022-10-13') {
                console.log("Day bookings",dayBookings)
              }
              // console.log("Job arr",jobArr.length)
              //prioritise jobs - how long left? how poorly performing? must finish? large AHR spreads? minimum AHR requirement?
              let sorted=jobArr.sort((a,b)=>(new Date(a.endDate)).getTime()-(new Date(b.endDate)).getTime()).sort((a,b)=>a.priority-b.priority)
              // if (dte=='2022-10-02') {
                // console.log("Sorted jobs",sorted)
              // }
              let prioritised=[]
              prioritised=prioritised.concat(sorted.filter(j=>j.minAgentAHR))
              prioritised=prioritised.concat(sorted.filter(j=>!j.minAgentAHR && j.mustFinish))
              prioritised=prioritised.concat(sorted.filter(j=>!j.minAgentAHR && !j.mustFinish))
              // console.log("Prioritised jobs",prioritised.length)
              let shiftGrid=dayBookings.map(el=>({shift:shift,agentName:el.agentName,agentID:el.agentID,booked:el.booked,totalAllocated:el.totalAllocated,leagueScore:(jobR.recordsets[1].find(p=>p.agentID==el.agentID) || {}).leagueScore}))
              asyncForEach(prioritised,(job,ji)=>{
                // if (dte=='2022-10-02') {
                //   console.log("Booked vs allocated",dte,shift,job.jobID,neededDisplay(job),dayBookings.reduce((a,b)=>a+Number(b.totalAllocated),0),dayBookings.reduce((a,b)=>a+Number(b.booked),0))
                // }
                // let neededDisplay=(job)=>job.planned!==null?job.planned:(job.resourceHours!==null?job.resourcHours:job.calc)
                shiftGrid=shiftGrid.map(s=>{
                  s[job.jobID]=0
                  s['agentJobAhr-'+job.jobID]=dayBookings.find(el=>el.agentID==s.agentID)[job.jobID].agentJobAhr
                  return s
                })
                dayBookings.sort((a,b)=>{
                  if (b[job.jobID].agentJobAhr===null) {
                    return b.leagueScore-a.leagueScore
                  }else {
                    return b[job.jobID].agentJobAhr-a[job.jobID].agentJobAhr
                  }
                })
                let jobBookings=dayBookings.filter(b=>(Number(b[job.jobID].agentJobAhr)>Number(job.minAgentAHR) || b[job.jobID].agentJobAhr===null) && b.totalAllocated<b.booked)
                jobBookings=jobBookings.map((a,i,arr)=>{
                  a[job.jobID].priority=Object.keys(a).filter(k=>!isNaN(k/1) && k!=job.jobID).filter(k=>a[k].priority>1).length && a[job.jobID].priority<2?0:a[job.jobID].priority
                  return a
                })
                let d=0
                let jobNeeded=neededDisplay(job)
                let p=2
                let prePlan=[]
                let priorityBookings=()=>{
                  let arr=jobBookings.filter(el=>el[job.jobID].priority>=p).slice()
                  arr.sort((a,b)=>b[job.jobID].priority-a[job.jobID].priority)
                  return arr
                }
                // if (dte=='2022-10-13' && job.jobID==6543) {
                  console.log("Ready to allocate",job.jobID,jobBookings,priorityBookings())
                // }
                asyncWhile(()=>p>=0 && neededDisplay(job)>prePlan.reduce((a,b)=>a+Number(b.allocated),0),()=>{
                  // if (dte=='2022-10-13') {
                    console.log("priorityBookings",d,p,job,dayBookings.find(el=>el.agentID==416),priorityBookings().find(el=>el.agentID==416))
                  // }
                  let bookings=priorityBookings()
                  if (bookings[d]) {
                    let dIndex=dayBookings.findIndex(b=>b.agentID==bookings[d].agentID)
                    let allocated=Math.min(dayBookings[dIndex].booked-dayBookings[dIndex].totalAllocated,jobNeeded)
                    prePlan.push({dIndex:dIndex,allocated:allocated})
                    jobNeeded=jobNeeded-allocated
                    d++
                    console.log("Allocating",dte,shift,job.jobID,"Agent booked:"+dayBookings[dIndex].booked,"Agent total allocated:"+dayBookings[dIndex].totalAllocated,"Allocated:",allocated,"Remaining:",jobNeeded)
                  }else {
                    d=0
                    prePlan=[]
                    jobNeeded=neededDisplay(job)
                    p--
                  }
                  // if (dte=='2022-10-02') {
                  // }
                })
                asyncForEach(prePlan,plan=>{
                  dayBookings[plan.dIndex][job.jobID].allocated=plan.allocated
                  dayBookings[plan.dIndex].totalAllocated=dayBookings[plan.dIndex].totalAllocated+plan.allocated
                  let sIndex=shiftGrid.findIndex(a=>a.agentID==dayBookings[plan.dIndex].agentID)
                  shiftGrid[sIndex][job.jobID]=plan.allocated
                  shiftGrid[sIndex].totalAllocated=dayBookings[plan.dIndex].totalAllocated
                  sqlData.push({jobID:job.jobID,agentID:dayBookings[plan.dIndex].agentID,allocDate:dte,allocHours:plan.allocated})
                })
                // if (dte=='2022-10-02') {
                  console.log("Allocated",dte,shift,"Needed:",neededDisplay(job),"Allocated:",dayBookings.reduce((a,b)=>a+Number(b[job.jobID].allocated),0),"Remaining:",jobNeeded)
                // }

              })
              grid[dte][shift]=shiftGrid
              //prioritise agents - who's already worked on it? who's performed best? who's a general high performer?
            })
          },(dte,d)=>{
            return socketProgUpdate(req.body.sid,"",{msg:"Checking allocation"})
          })
          // clearInterval(progInterval)
          db.query(`delete from AutoAllocations where allocDate>cast(getdate() as date)`, (err, d) => {
            db.query('select jobID,allocDate,allocHours,agentID from AutoAllocations where allocID<0', (err, result) => {
              var rtable=result.recordset.toTable('AutoAllocations')
              let r=0
              async function addRows(){
                if (r<sqlData.length) {
                  let row=sqlData[r]
                  await rtable.rows.add(row.jobID,new Date(row.allocDate),row.allocHours,row.agentID)
                  r++
                  addRows()
                }else {
                  db.bulk(rtable, (err, result) => {
                    if (err) {
                      console.log(err)
                      res.status(500).send(err)
                    }else {
                      res.send(grid)
                    }
                  })
                }
              }
              addRows()
            })
          })
        })
      })
    })
  },
  autoAllocateDate:(req,res)=>{
    const _ = require('lodash')
    let jobq=`
    select *,ROW_NUMBER() over(partition by agentID order by behindSchedule DESC,scheduleDone DESC,jobID) jobRanking,ROW_NUMBER() over(partition by jobID order by coalesce(case when agentRankP>0.6 then agentRankP end,99999),coalesce(onTargetKPI,-99999) DESC) agentRanking from
    (
    select b.agentID,j.jobID,j.isJobEve,j.isJobDay,coalesce(p.plannerHours,resourceHours,calcHoursNew/nullif(calcDaysNew,0))*60 needed,booked*60 booked,agentAhr,agentRankP,onTargetKPI,fieldDays,daysDone,(0.00+daysDone)/nullif(fieldDays,0) scheduleDone,0.00+(((interviewsTarget/nullif(fieldDays,0))*daysDone)-intsDone)/interviewsTarget behindSchedule
    from
    getResourceNeeded(0) j
    left join (select jobID,resourceHours from AutoResource where resourceDate=@allocDate) r on r.jobID=j.jobID
    left join (select jobID,plannerHours from planners where plannerDate=@allocDate) p on p.jobID=j.jobID
    left join (select agentID,sum(appliedHours) booked,isEve,isDay from getBookedHours(@allocDate,@allocDate) group by agentID,isEve,isDay) b on b.isEve=j.isJobEve and b.isDay=j.isJobDay
    left join Agents a on a.agentID=b.agentID
    left join (select agentID,jobID,allocHours from AutoAllocations where allocDate=@allocDate) aa on aa.jobID=j.jobID and aa.agentID=b.agentID
    left join (
        select agentID,jobID,SUM(inputInterviews)/nullif(SUM(inputHours),0) agentAhr,nullif(SUM(inputInterviews)/nullif(SUM(inputHours),0),0)/MAX(SUM(inputInterviews)/nullif(SUM(inputHours),0)) OVER(PARTITION BY jobID) agentRankP
        from
        DailyInput
        where jobID in (select jobID from getLiveJobs(@allocDate) where isJobCATI=1) and inputDate<@allocDate
        group by agentID,jobID having(SUM(inputHours)>3)
    ) t on t.jobID=j.jobID and t.agentID=b.agentID

    left join (
    select j.jobID,interviewsTarget,isJobConsumer,isJobBusiness,isJobRecruitment,
    dbo.workingDaysBetween(case when j.startDate>getdate() then cast(getdate() as date) else j.startDate end,case when j.endDate>getdate() then cast(getdate() as date) else j.endDate end) daysDone,
    dbo.workingDaysBetween(j.startdate,j.endDate) fieldDays
    from
    Jobs j
    ) d on d.jobID=j.jobID
    left join getLeagueTableGrouped(null,null,24) l on l.agentID=a.agentID and l.isJobConsumer=d.isJobConsumer and l.isJobBusiness=d.isJobBusiness and l.isJobRecruitment=d.isJobRecruitment
    where coalesce(p.plannerHours,resourceHours,calcHoursNew/nullif(calcDaysNew,0))>0 and j.jobID in (select jobID from getLiveJobs(@allocDate))`+(req.body.shifts?" and ("+req.body.shifts.map(s=>"j.isJob"+s+"=1").join(" or ")+")":"")+`
    ) x
    order by behindSchedule DESC,scheduleDone DESC,jobID,coalesce(case when agentRankP>0.6 then agentRankP end,99999),coalesce(onTargetKPI,-99999) DESC`
    db.input("allocDate",req.body.allocDate)
    db.query(jobq,(err,r)=>{
      if(err) throw err;
      let agents=_.uniqBy(JSON.parse(JSON.stringify(r.recordset)),"agentID")
      let jobs=_.uniqBy(JSON.parse(JSON.stringify(r.recordset)),"jobID")
      let jobAgents=JSON.parse(JSON.stringify(r.recordset))
      promForEach(jobAgents,(jobAgent,ji,jnext)=>{
        let agentI=agents.findIndex(a=>a.agentID==jobAgent.agentID)
        let jobI=jobs.findIndex(j=>j.jobID==jobAgent.jobID)
        agents[agentI].allocated=(agents[agentI].allocated||0)
        jobs[jobI].allocated=(jobs[jobI].allocated||0)
        if (jobAgent.jobID==7549) {
          console.log(jobs[jobI],agents[agentI])
        }
        if (agents[agentI].allocated<jobAgent.booked&&jobs[jobI].allocated<jobs[jobI].needed) {
          jobAgents[ji].allocHours=Math.max(0,Math.min(jobAgent.booked-agents[agentI].allocated,jobs[jobI].needed-jobs[jobI].allocated))
          if (jobAgent.jobID==7549) {
            console.log("allocated",jobAgents[ji].allocHours)
          }
          agents[agentI].allocated+=jobAgents[ji].allocHours
          jobs[jobI].allocated+=jobAgents[ji].allocHours
        }
        jnext()
      }).then(e=>{
        let sqlData=jobAgents.filter(j=>j.allocHours>0)
        db.query(`delete from AutoAllocations where allocDate=@allocDate`, (err, d) => {
          db.query('select jobID,allocDate,allocHours,agentID from AutoAllocations where allocID<0', (err, result) => {
            var rtable=result.recordset.toTable('AutoAllocations')
            let r=0
            async function addRows(){
              if (r<sqlData.length) {
                let row=sqlData[r]
                await rtable.rows.add(row.jobID,new Date(req.body.allocDate),Math.round((row.allocHours/60)*100)/100,row.agentID)
                r++
                addRows()
              }else {
                db.bulk(rtable, (err, result) => {
                  if (err) {
                    console.log(err)
                    res.status(500).send(err)
                  }else {
                    res.send(sqlData)
                  }
                })
              }
            }
            addRows()
          })
        })
      })
    })
  },
  getAutoAllocations:(req,res)=>{
    const _ = require('lodash')
    let q=`
    select
    a.agentName,
    dbo.getJobName(isnull(l.jobID,r.jobID)) jobName,
    b.agentID,
    isnull(l.jobID,r.jobID) jobID,
    allocHours,
    booked,
    agentAhr,agentRank,
    l.projectID,
    l.isJobDay,l.isJobEve,b.isEve isAgentEve,b.isDay isAgentDay,
	coalesce(r.planned,r.resourceHours,r.calc) resourceHours
    from
    	getDateResourcePlan(@allocDate) r
      left join getLiveJobs(@allocDate) l on r.jobID=l.jobID
    	left join (select agentID,sum(appliedHours) booked,MAX(isEve) isEve,MAX(isDay) isDay from getBookedHours(@allocDate,@allocDate) group by agentID) b on 1=1
        left join Agents a on a.agentID=b.agentID
        left join (select agentID,jobID,allocHours from AutoAllocations where allocDate=@allocDate) aa on aa.jobID=r.jobID and aa.agentID=b.agentID
        left join (
        	select agentID,jobID,SUM(inputInterviews)/nullif(SUM(inputHours),0) agentAhr,ROW_NUMBER() OVER(PARTITION BY jobID ORDER BY SUM(inputInterviews)/nullif(SUM(inputHours),0) DESC) agentRank
          	from
          	DailyInput
            where jobID in (select jobID from getLiveJobs(@allocDate) where isJobCATI=1) and inputDate<@allocDate
          	group by agentID,jobID having(SUM(inputHours)>3)
        ) j on j.jobID=r.jobID and j.agentID=b.agentID
        where l.isJobCATI=1 and l.isJobInHouse=1 and coalesce(r.planned,r.resourceHours,r.calc)>0
		order by r.jobID`
    db.input("allocDate",req.query.allocDate||moment().format("YYYY-MM-DD"))
    db.query(q,(err,r)=>{
      if (err) {
        console.log(err,q,req.query)
      }
      // console.log(r.recordset)
      let agents=_.uniqBy(r.recordset.filter(el=>el.agentName),'agentID')
      let jobs=_.uniqBy(r.recordset.filter(el=>el.agentName),'jobID')
      let agentTable=agents.map(agent=>{
        let obj=JSON.parse(JSON.stringify(agent))
        obj.allocations=_.keyBy(r.recordset.filter(d=>d.agentID==agent.agentID&&d.allocHours>0),"jobID")
        obj.jobHistory=_.keyBy(r.recordset.filter(d=>d.agentID==agent.agentID&&d.projectID>2),"jobID")
        // console.log(obj.jobHistory)
        return obj
      })
      // console.log(grid,agentTable,jobs)
      res.send({agents:agentTable,jobs:jobs})
    })
  },
  addPlannedRecruitment:(req,res)=>{
    let delQ=`delete from PlannedRecruitment where fromDate=@fromDate and shiftName='`+req.body.shift+`'`
    let insQ=`insert into PlannedRecruitment (dailyHours,fromDate,shiftName) VALUES (`+req.body.dailyHours+`,@fromDate,'`+req.body.shift+`')`
    db.input('fromDate',new Date(req.body.fromDate))
    db.query(delQ,(err,r)=>{
      if (err) {
        console.log(err)
        res.status(500).send({error:err})
      }
      if (Number(req.body.dailyHours)>0) {
        db.query(insQ,(err,r)=>{
          if (err) {
            console.log(err)
            res.status(500).send({error:err})
          }
          res.send("done")
        })
      }else {
        res.send("done")
      }
    })
  },
  downloadFile:(req,res)=>{
    if (req.query.fileName) {
      res.download(req.query.path,req.query.fileName)
    }else {
      res.download(req.query.path)
    }
  }
};
