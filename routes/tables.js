const NodeTable = require('nodetable');
const moment = require('moment');
const valToBool=(val)=>{
  if (typeof val==='string') {
    return val!=='0' && val!=='undefined' && val!=='null' && val!==''
  }else if (typeof val==='array') {
    return val.length>0
  }else {
    return typeof val!=='undefined' && val
  }
}
module.exports = {
  allProjectsRaw:(req, res) => {
    let projQ=`
    select projects.quoteID,projects.projectID,quoteNo, quoteName, projectCM, projectDP,endDate,isnull(closingDate,endDate) closingDate, csatID, cm.staffName, pm.staffName,quotes.clientID,c.contactName,c.excludeFromCsat,c.contactEmail,c.contactPhoneNo,csatComplete,csatPhoneChased,csatEmailChased,csatChase.note csatChaseNote
    from quotes
    left join projects on projects.quoteID=quotes.quoteID
    left join (select max(endDate) endDate,projectID from jobs group by projectID) j on j.projectID=projects.projectID
    left join staff cm on cm.staffID=projects.projectCM
    left join staff pm on pm.staffID=projects.projectDP
    left join contacts c on c.contactID=quotes.contactID
    outer apply (select top 1 note from AllNotes where jobID=projects.projectID and page='client-sat-report' and tableName='nonResponderTable' order by date DESC) csatChase
    where isnull(closingDate,endDate) between @aprSt and @aprEn`
    console.log(req.body,new Date(req.body.stDate),new Date(req.body.enDate))
    db.input('aprSt',new Date(req.body.stDate))
    db.input('aprEn',new Date(req.body.enDate))
    db.query(projQ, (err, result) => {
      if (err) {
        console.log(err)
      }
      res.send(result.recordset)
    });
  },
  allAgentsRaw:(req, res) => {
    let agentQ=`
    select agentID, agentName,agentLeft,forstaID
    from agents`
    db.query(agentQ, (err, result) => {
      if (err) {
        console.log(err)
      }
      res.send(result.recordset)
    });
  },
  liveJobsRaw:(req, res) => {
    let jobsQ=`
    select j.jobID,dbo.getJobName(j.jobID) jobName,q.quoteNo,q.quoteName,vistaName,todayHours,calcHours/nullif(calcDays,0) hoursPerDay,forstaGroupID
    from jobs j
    left join projects p on p.projectID=j.projectID
    left join quotes q on q.quoteID=p.quoteID
    left join ViewResourceNeeded r on r.jobID=j.jobID
    where getdate() between j.startDate and j.endDate and p.isProjectClosed=0`
    db.query(jobsQ, (err, result) => {
      if (err) {
        console.log(err)
      }
      res.send(result.recordset)
    });
  },
  allJobsRaw:(req, res) => {
    let jobsQ=`
    select j.jobID,dbo.getJobName(j.jobID) jobName,vistaName,forstaGroupID
    from jobs j`
    db.query(jobsQ, (err, result) => {
      if (err) {
        console.log(err)
      }
      res.send(result.recordset)
    });
  },
  allProjects: (req, res) => {
  // Get the query string paramters sent by Datatable
  req.query.size=Number(req.query.size)
  req.query.page=Number(req.query.page)
  const query = `SELECT CONCAT(Quotes.quoteName, ' - ', Jobs.jobName) As quoteName,
  Projects.projectID,
  Quotes.quoteNo,
  Quotes.noteID,
  quoteDate,
  Clients.clientName,
  Quotes.quoteID,
  chaseOutcome,
  chased,
  CASE WHEN Projects.isProjectLive = '1' THEN 'Live' WHEN Projects.isProjectClosed = '1' THEN 'Closed' WHEN Projects.isProjectCancelled = '1' THEN 'Cancelled' ELSE 'Quoted' END AS 'ProjStatus',
  startDate,
  endDate,
  Jobs.dataDate,
  Jobs.tablesDate,
  jobs.interviewsTarget,
  ViewJobsStats.hourlyTarget,
  CASE WHEN Staff.staffID < 2 THEN '' ELSE Staff.staffName END AS 'staffName',
  CASE WHEN StaffPM.staffID < 2 THEN '' ELSE StaffPM.staffName END AS 'staffPMName',
  AHR as AHR,
  isnull(WEB_Completes,0)+isnull(CATI_Completes,0)+isnull(F2F_Completes,0) as ints,
  Pay/nullif(ViewJobsStats.CPI*CASE WHEN isJobHourly=1 THEN ViewDailyPay.hours ELSE ViewDailyPay.ints END,0) as cont,
  Jobs.isJobDay
  ,Jobs.isJobEve
  ,Jobs.isJobBusiness
  ,Jobs.isJobConsumer
  ,isnull(Jobs.isJobConfirmit,0) as isJobConfirmit
  ,Jobs.isJobInHouse
  ,Jobs.isJobCATI
  ,Jobs.isJobOnline
  ,Jobs.isJobFace
  ,Jobs.isJobRecruitment
  ,Jobs.isJobValidation
  ,Jobs.isJobRecontacts
  ,Jobs.isJobInternational
  ,Jobs.isJobDP
  ,Jobs.vistaLink
  ,Jobs.isJobHourly
  FROM   Quotes
  INNER JOIN Clients
       ON Quotes.clientID = Clients.clientID
  LEFT JOIN Projects
      ON Quotes.quoteID = Projects.quoteID
  LEFT JOIN Jobs
      ON Jobs.projectID = Projects.projectID
  LEFT JOIN Staff
      ON Staff.staffID = Projects.projectCM
  LEFT JOIN Staff StaffPM
      ON StaffPM.staffID = Projects.projectDP
  LEFT JOIN (SELECT jobID, sum(inputInterviews) as ints, sum(inputInterviews)/nullif(sum(inputHours),0) as AHR, nullif(sum(inputHours),0) as inputHours from DailyInput GROUP BY jobID) DailyInput
       ON DailyInput.jobID = Jobs.jobID
  LEFT JOIN ViewJobsStats
      ON ViewJobsStats.jobID = Jobs.jobID
  LEFT JOIN (SELECT jobID, sum(Pay) as Pay, sum(Hours) as Hours, sum(Ints) as Ints FROM ViewDailyPay GROUP BY jobID) ViewDailyPay
       ON ViewDailyPay.jobID = Jobs.jobID
  WHERE  Quotes.quoteID > 1
  ORDER  BY Quotes.quoteNo DESC
  OFFSET (`+((req.query.size*req.query.page)-req.query.size)+`) ROWS FETCH NEXT (`+req.query.size+`) ROWS ONLY`
  let pageQ=`select count(*)/`+req.query.size+` lastPage from Quotes where quoteID > 1`
  var notesQ="select * from allnotes where page='edit' and tableName='Projects'"
    db.query(query, (err, result) => {
      if (err) {
        console.log(err,query)
      }
      db.query(notesQ, (err, notesR) => {
        if (err) {
          console.log(err)
        }
        res.send({
          jobs:result.recordset,
          notes:notesR.recordset
        })
      })
    });


  },
  allQCchecks: (req,res) => {
    let filters=""
    if (req.params.forCoaching=='true') {
      filters=" AND isFinished=1 AND (CoachingNew.coachingID IS NULL AND qc.coachingID is null) AND type='Call'"
    }
    let checksQ=`SELECT qc.qualityControlID as MasterQCID,qc.coachingID as MasterCoachID,* FROM QualityControl qc
    LEFT JOIN Agents ON Agents.agentID=qc.agentID
    LEFT JOIN Jobs ON Jobs.jobID=qc.jobID
  	LEFT JOIN Projects ON Jobs.projectID=Projects.projectID
  	LEFT JOIN Quotes ON Quotes.quoteID=Projects.quoteID
    LEFT JOIN CoachingNew ON CoachingNew.qualityControlID=qc.qualityControlID
    LEFT JOIN AgentTeams ON AgentTeams.agentTeamID=Agents.teamID
    WHERE qc.dateMonitored BETWEEN '`+req.params.st+`' AND '`+req.params.en+`'`+filters+`
    ORDER BY qc.qualityControlID DESC`
    db.query(checksQ, (err, checksR) => {
      if (err){
        console.log(checksQ+" - "+err)
        logger.info(req.user.uName + " failed to get monitor call");
      }else {
        res.send(JSON.stringify(checksR.recordset))
      }
    })
  },
  projectQCchecks: (req,res) => {
    let checksQ=`SELECT ViewQCscores.qualityControlID as MasterQCID,* FROM ViewQCscores
    LEFT JOIN Agents ON Agents.agentID=ViewQCscores.agentID
    LEFT JOIN Jobs ON Jobs.jobID=ViewQCscores.jobID
    LEFT JOIN Projects ON Jobs.projectID=Projects.projectID
    LEFT JOIN Quotes ON Projects.quoteID=Quotes.quoteID
    LEFT JOIN CoachingNew ON CoachingNew.qualityControlID=ViewQCscores.qualityControlID
    WHERE isFinished=1 AND type='Call' AND ViewQCscores.jobID IN (`+req.body.jobIDs.join(",")+`)
    ORDER BY ViewQCscores.qualityControlID DESC`
    db.query(checksQ, (err, checksR) => {
      if (err){
        console.log(checksQ+" - "+err)
        logger.info(req.user.uName + " failed to get monitor call");
      }else {
        res.send(JSON.stringify(checksR.recordset))
      }
    })
  },
  getPrevCompsData: (req,res) => {
    let q=`
    select * from
        prevComps pc
        left join (select projectID,p.quoteID,isQuoteAsBusiness B2B,isQuoteAsConsumer Consumer from Projects p left join Quotes q on q.quoteID=p.quoteID) q on q.projectID=pc.projectID
        left join (select sampleID as cSampleID,count(*) as Downloads from PrevCompDownloads group by sampleID) c on c.cSampleID=pc.sampleID
        left join (select sampleID as rSampleID,sum(case when result='Success' then 1 else 0 end) as surveysCompleted, max(resultDate) as lastResultDate, max(result) as lastResult,sum(callCount) as callCount from PrevCompResults group by sampleID) r on r.rSampleID=pc.sampleID
    	OUTER APPLY
        (SELECT TOP 1 d.sampleID as dSampleID, staffName as downloadedBy,d.downloadDate,concat(quoteNo,' ',quoteName) as downloadedFor
         FROM PrevCompDownloads d
    	 left join projects p on d.projectID=p.projectID
    	 left join quotes q on q.quoteID=p.quoteID
    	 left join users u on u.userID=d.downloadedBy
    	 left join staff s on s.staffID=u.staffID
    	 where p.isProjectClosed<>1 and d.sampleID=pc.sampleID
         ORDER BY d.downloadDate
        ) AS downloads
        where E2 is not null
        order by pc.sampleID`
    db.query(q, (err, r) => {
      db.query("select projectID,quoteNo,quoteName from projects p left join quotes q on q.quoteID=p.quoteID",(err,projR)=>{
        if (err){
          console.log(q+" - "+err)
        }else {
          res.send(JSON.stringify({data:r.recordset,projects:projR.recordset}))
        }
      })
    })
  },
  getPrevUnusedData: (req,res) => {
    let q=`
    select * from
        prevComps pc
        left join (select sampleID as cSampleID,count(*) as Downloads from PrevCompDownloads group by sampleID) c on c.cSampleID=pc.sampleID
        left join (select projectID,p.quoteID,isQuoteAsBusiness B2B,isQuoteAsConsumer Consumer from Projects p left join Quotes q on q.quoteID=p.quoteID) q on q.projectID=pc.projectID
        left join (select sampleID as rSampleID,sum(case when result='Success' then 1 else 0 end) as surveysCompleted, max(resultDate) as lastResultDate, max(result) as lastResult,sum(isnull(callCount,0)) as callCount from PrevCompResults group by sampleID) r on r.rSampleID=pc.sampleID
    	OUTER APPLY
        (SELECT TOP 1 d.sampleID as dSampleID, staffName as downloadedBy,d.downloadDate,concat(quoteNo,' ',quoteName) as downloadedFor
         FROM PrevCompDownloads d
    	 left join projects p on d.projectID=p.projectID
    	 left join quotes q on q.quoteID=p.quoteID
    	 left join users u on u.userID=d.downloadedBy
    	 left join staff s on s.staffID=u.staffID
    	 where p.isProjectClosed<>1 and d.sampleID=pc.sampleID
         ORDER BY d.downloadDate
        ) AS downloads
        where E2 is null and isnull(callCount,0)<3
        order by pc.sampleID`
    db.query(q, (err, r) => {
      db.query("select projectID,quoteNo,quoteName from projects p left join quotes q on q.quoteID=p.quoteID",(err,projR)=>{
        if (err){
          console.log(q+" - "+err)
        }else {
          res.send({data:r.recordset,projects:projR.recordset})
        }
      })
    })
  },
  overdueFollowups:(req,res)=>{
    console.log("OVERDUE FOLLOWUPS",req.query)
    let stdate=req.query.stdate=='0'?moment().subtract(100,'y').format("YYYY-MM-DD"):req.query.stdate
    let endate=req.query.endate=='0'?moment().subtract(1,'d').format("YYYY-MM-DD"):req.query.endate
    let q=`
    select agentPlanID,coachingID,agentName,teamName,coachingFollowUpDate,lastShift from
    (select distinct coachingID,agentID,coachingFollowUpDate,agentPlanID,coachingFollowedUpDate from AgentPlans) p
    left join agents a on a.agentID=p.agentID
    left join AgentTeams t on t.agentTeamID=a.teamID
    left join (select max(inputDate) as lastShift,agentID from DailyInput group by agentID) d on d.agentID=p.agentID
    where coachingFollowedUpDate is null and coachingFollowUpDate<cast(getdate() as date) and agentLeft is null and coachingFollowUpDate between @ofuSt and @ofuEn
    `+(valToBool(req.query.teamID)?' and teamID='+req.query.teamID:'')+`
    order by coachingFollowUpDate asc`
    db.input("ofuSt",stdate)
    db.input("ofuEn",endate)
    db.query(q,(err,r)=>{
      if (err) {
        console.log(err)
        res.status(500).send(err)
      }else {
        res.send(r.recordset)
      }
    })
  },
  overduePDPs:(req,res)=>{
    console.log("OVERDUE PDP",req.query)
    let stdate=req.query.stdate=='0'?moment().subtract(100,'y').format("YYYY-MM-DD"):req.query.stdate
    let endate=req.query.endate=='0'?moment().subtract(1,'d').format("YYYY-MM-DD"):req.query.endate
    let q=`
    select agentPlanID,coachingID,agentName,teamName,pdpEndDate,lastShift from
    (select distinct coachingID,agentID,isnull(pdpExtensionDate,pdpEndDate) as pdpEndDate,agentPlanID,pdpOutcomeDate from AgentPlans) p
    left join agents a on a.agentID=p.agentID
    left join AgentTeams t on t.agentTeamID=a.teamID
    left join (select max(inputDate) as lastShift,agentID from DailyInput group by agentID) d on d.agentID=p.agentID
    where pdpOutcomeDate is null and pdpEndDate<cast(getdate() as date) and agentLeft is null and pdpEndDate between @opdpSt and @opdpEn
    `+(valToBool(req.query.teamID)?' and teamID='+req.query.teamID:'')+`
    order by pdpEndDate asc`
    db.input("opdpSt",stdate)
    db.input("opdpEn",endate)
    db.query(q,(err,r)=>{
      if (err) {
        console.log(err)
        res.status(500).send(err)
      }else {
        res.send(r.recordset)
      }
    })
  },
  overdueTasks:(req,res)=>{
    console.log("OVERDUE TASKS",req.query)
    let stdate=req.query.stdate=='0'?moment().subtract(100,'y').format("YYYY-MM-DD"):req.query.stdate
    let endate=req.query.endate=='0'?moment().subtract(1,'d').format("YYYY-MM-DD"):req.query.endate
    let q=`
    select dueDate,a.projectID,q.quoteID,concat(q.quoteNo,' ',q.quoteName) as projectName,plannerGroup,taskName,case when isTaskPM=1 then projectDP else projectCM end as ownerID,case when isTaskPM=1 then pm.staffName else cm.staffName end as ownerName from
    projectTaskAudits a
    left join PlannerTasks t on t.taskID=a.taskID
    left join Projects p on p.projectID=a.projectID
    left join Quotes q on q.quoteID=p.quoteID
    left join staff cm on cm.staffID=p.projectCM
    left join staff pm on pm.staffID=p.projectDP
    where dueDate between '2022-01-01' and dateadd(day,-1,cast(getDate() as date)) and doneDate is null and dueDate between @otSt and @otEn
    `+(valToBool(req.query.staffID)?' and case when isTaskPM=1 then projectDP else projectCM end='+req.query.staffID:'')+`
    order by dueDate asc`
    db.input("otSt",stdate)
    db.input("otEn",endate)
    db.query(q,(err,r)=>{
      if (err) {
        console.log(err)
        res.status(500).send(err)
      }else {
        res.send(r.recordset)
      }
    })
  },
  getChangeLog:(req,res)=>{
    let q=`
    select distinct changeDate,changeField,changeValue,fullJobName as changeJob,agentName as changeAgent,u.login as changeBy,l.changeTable,concat(quoteNo,' ',quoteName) as changeProject from
    changeLog l
    left join ViewJobsStats j on j.jobID=l.changeJobID
    left join quotes q on q.quoteID=(select quoteID from Projects where projectID=l.changeProjectID)
    left join agents a on a.agentID=l.changeAgentID
    left join users u on u.userID=l.changeBy
    left join projectCosts c on c.costID=l.changeOtherID and l.changeTable='projectCosts'
    left join projectSpends s on s.spendID=l.changeOtherID and l.changeTable='projectSpends'
    order by changeDate DESC`
    db.query(q,(err,r)=>{
      res.send(r.recordset)
    })
  },
  getProjectDates:(req,res)=>{
    let q=`
    select * from projectDates d
    outer apply (
    	select top 1 note
    	from AllNotes
    	where otherID=d.dateID and jobID=d.projectID and tableName='projectDatesTable' and page='edit'
    	) n
    where d.projectID=`+req.params.projectID
    db.query(q,(err,r)=>{
      res.send(r.recordset)
    })
  },
  getProjectSpends:(req,res)=>{
    let q=`
    select s.projectID,s.spendID,s.jobID,spendName,unitValue*units as spendValue,unitValue as spendUnitValue,units as spendUnits,s.typeID,costTypeName,costTypeCategory as spendTypeCat,s.supplierID,s.PO,invReceived,invCorrect,spendDate,a.allocationID,note
    from ProjectSpends s
    left join OnlineAllocations a on a.spendID=s.spendID
    left join CostTypes on CostTypes.CostTypeID=s.typeID
    outer apply (
    	select top 1 note
    	from AllNotes
    	where otherID=s.spendID and jobID=s.projectID and tableName='spendTable' and page='overview'
    	) n
    WHERE s.ProjectID=`+req.params.projectID
    db.query(q,(err,r)=>{
      res.send(r.recordset)
    })
  },
  getClientStats:(req,res)=>{
    let q=`
    select clientName,q.clientID,count(*) as completed,sum(spend)/nullif(sum(sales),0) as cont,sum(sales) sales,sum(catiSpend) catiSpend,sum(catiSales) catiSales,sum(catiSpend)/nullif(sum(catiSales),0) catiCont from
    quotes q
    left join projects p on p.quoteID=q.quoteID
    left join clients c on c.clientID=q.clientID
    left join (
      select projectID,min(isnull(cast(isJobRecruitment as int),0)) recruit,max(endDate) as endDate
      from
      jobs
      group by projectID
      ) j on j.projectID=p.projectID
    left join (select projectID,sum(units*unitValue) sales,sum(case when costTypeID=8 then units*unitValue else 0 end) catiSales from ViewProjectCosts group by projectID) pc on pc.projectID=p.projectID
    left join (select projectID,sum(units*unitValue) spend,sum(case when typeID=8 then units*unitValue else 0 end) catiSpend from ViewProjectSpends group by projectID) ps on ps.projectID=p.projectID
    where p.isProjectClosed=1 and endDate between @stdate and @endate
    group by c.clientName,q.clientID

  	select quoteNo,quoteName,p.quoteID,p.projectID,q.clientID,co.contactEmail contactsEmail,co.contactName contacts,spend/nullif(sales,0) as cont,isnull(recruit,0) recruit,sales,spend,catiSpend,catiSales,catiSpend/nullif(catiSales,0) catiCont,isnull(p.codingCost,0)+isnull(p.dataCost,0)+isnull(p.setupCost,0) pmfee,isnull(p.sampleCost,0) samplefee from
    quotes q
    left join projects p on p.quoteID=q.quoteID
    left join clients c on c.clientID=q.clientID
    left join Contacts co on co.contactID=q.contactID
    left join (
      select projectID,min(isnull(cast(isJobRecruitment as int),0)) recruit,max(endDate) as endDate
      from
      jobs
      group by projectID
      ) j on j.projectID=p.projectID
    left join (select projectID,sum(units*unitValue) sales,sum(case when costTypeID=8 then units*unitValue else 0 end) catiSales from ViewProjectCosts group by projectID) pc on pc.projectID=p.projectID
    left join (select projectID,sum(units*unitValue) spend,sum(case when typeID=8 then units*unitValue else 0 end) catiSpend from ViewProjectSpends group by projectID) ps on ps.projectID=p.projectID
    where p.isProjectClosed=1 and endDate between @stdate and @endate

    select clientID,typeID,sum(units*unitValue) spend from ProjectSpends sp left join Quotes q on q.quoteID=(select max(quoteID) from projects where projectID=sp.projectID) group by clientID,typeID
    select clientID,costTypeID,sum(units*unitValue) sales from ProjectCosts co left join Quotes q on q.quoteID=(select max(quoteID) from projects where projectID=co.projectID) group by clientID,costTypeID
  	select sp.projectID,typeID,sum(units*unitValue) spend from ProjectSpends sp left join Quotes q on q.quoteID=(select max(quoteID) from projects where projectID=sp.projectID) group by sp.projectID,typeID
    select co.projectID,costTypeID,sum(units*unitValue) sales from ProjectCosts co left join Quotes q on q.quoteID=(select max(quoteID) from projects where projectID=co.projectID) group by co.projectID,costTypeID
    select * from CostTypes`
    db.multiple=true
    db.input('stdate',req.query.stdate)
    db.input('endate',req.query.endate)
    db.query(q,(err,r)=>{
      console.log(err)
      res.send({
        clients:r.recordsets[0],
        projects:r.recordsets[1],
        spendsClient:r.recordsets[2],
        salesClient:r.recordsets[3],
        spends:r.recordsets[4],
        sales:r.recordsets[5],
        costTypes:r.recordsets[6],
      })
    })
  },
  agentShifts:(req,res)=>{
    let q=`
    select s.agentID,agentName,teamName,s.jobID,fullJobName,inputDate,Hours,Ints,Pay,sales,s.isHourly from
    ViewAgentShifts s
    left join ViewJobsStats j on j.jobID=s.jobID
    left join Agents a on a.agentID=s.agentID
    left join AgentTeams t on t.agentTeamID=s.bookingTeamID
    where 1=1`
    if (req.query.stdate && req.query.endate) {
      q=q+" and inputDate between '"+req.query.stdate+"' and '"+req.query.endate+"'"
    }
    if (req.query.agentID) {
      q=q+" and s.agentID="+req.query.agentID
    }
    db.query(q,(err,r)=>{
      if (err) {
        console.log(err,q)
        res.status(500).send({error:err})
      }else {
        res.send(r.recordset)
      }
    })
  },
  agentBookings:(req,res)=>{
    let q=`
    select b.agentID,agentName,teamName,appliedHours,startTime,endTime,absenceType,bookingDate,s.jobID,fullJobName,Hours,Ints,Pay,sales,s.isHourly from
    `
    if (req.query.stdate && req.query.endate) {
      q=q+"getBookedHours('"+req.query.stdate+"','"+req.query.endate+"') b"
    }else {
      q=q+"getBookedHours(default,default) b"
    }
    q=q+`
    left join Absence a on a.absenceDate=b.bookingDate and a.agentID=b.agentID
    left join ViewAgentShifts s on s.agentID=b.agentID and s.inputDate=b.bookingDate
    left join ViewJobsStats j on j.jobID=s.jobID
    left join Agents ag on ag.agentID=b.agentID
    left join AgentTeams t on t.agentTeamID=b.bookingTeamID
    where 1=1`
    if (req.query.agentID) {
      q=q+" and b.agentID="+req.query.agentID
    }
    if (req.query.shift) {
      q=q+" and b.is"+req.query.shift+"=1"
    }
    db.query(q,(err,r)=>{
      if (err) {
        console.log(err,q)
        res.status(500).send({error:err})
      }else {
        res.send(r.recordset)
      }
    })
  },
  allQuotes:(req,res)=>{
    let q=`
    select * from
    ViewQuotes
    where quoteDate between @aqst and @aqen
    `
    if (req.query.client) {
      q=q+" and clientID in ("+req.query.client.join(",")+")"
    }
    db.input('aqst',new Date(req.query.stDate))
    db.input('aqen',new Date(req.query.enDate))
    db.query(q,(err,r)=>{
      if (err) {
        console.log(err)
        res.status(500).send({error:err})
      }
      res.send(r.recordset)
    })
  },
  allOne2ones:(req,res)=>{
    let stdate=req.query.stdate=='0'?moment().subtract(100,'y').format("YYYY-MM-DD"):req.query.stdate
    let endate=req.query.endate=='0'?moment().subtract(1,'d').format("YYYY-MM-DD"):req.query.endate
    console.log(req.query,stdate,endate)
    let q=`
    select o.*,agentName,staffName from
    AgentOne2ones o
    left join Agents a on a.agentID=o.agentID
    left join Users u on u.userID=o.userID
    left join Staff s on s.staffID=u.staffID
    where o2oDate between @o2ost and @o2oen
    `
    db.input('o2ost',new Date(stdate))
    db.input('o2oen',new Date(endate))
    db.query(q,(err,r)=>{
      if (err) {
        console.log(err)
        res.status(500).send({error:err})
      }else{
        res.send(r.recordset)
      }
    })
  }
};
