const express = require("express");

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

module.exports = {

  allocateDates(req, res){
    var today = new Date();
    let alloShift = req.params.shift;
    let alloDate = new Date(req.params.date);
    var dd = alloDate.getDate();
    var mm = alloDate.getMonth()+1;
    var yyyy = alloDate.getFullYear(); if(dd<10){dd='0'+dd} if(mm<10){mm='0'+mm}
    var sToday = dd+'/'+mm+'/'+yyyy;
    let alloDateOriginal = req.params.date;
    let jID = req.params.id;
    let horses = req.params.hs;
    let qText = 3;
    let qText2 = 0;
    let queryText = ["","AND jobs.isJobDay = 1","AND Jobs.isJobEve = 1", "AND Jobs.jobID = "+ jID]
    let queryText2 = ["AND DailyInput.jobID = "+ jID,""]
    let shiftCheck=""
      qText = 0;
      qText2 = 1;
      if(alloShift == 'day'){
        qText = 1
        shiftCheck="isDay"
      }
      if(alloShift == 'eve'){
        qText = 2
        shiftCheck="isEve"
      }
    let projectQuery = "SELECT Projects.projectID, Projects.projectCM, Projects.projectDP, Projects.projectTL, Projects.projectGrade, Projects.setupCost, Projects.dataCost, Projects.sampleCost, Projects.codingCost, Projects.verbsCodingNumber, Projects.quotedIR, Projects.finalIR, Projects.isProjectCommissioned, Projects.isProjectLive, Projects.isProjectClosed, Projects.isProjectCancelled, CONCAT(RIGHT('0' + RTRIM(DAY(Jobs.startDate)), 2), '/', RIGHT('0' + RTRIM(MONTH(Jobs.startDate)), 2), '/', YEAR(Jobs.startDate)) as FstartDate, CONCAT(RIGHT('0' + RTRIM(DAY(Jobs.endDate)), 2), '/', RIGHT('0' + RTRIM(MONTH(Jobs.endDate)), 2), '/', YEAR(Jobs.endDate)) as FendDate, CONCAT(RIGHT('0' + RTRIM(DAY(Jobs.dataDate)), 2), '/', RIGHT('0' + RTRIM(MONTH(Jobs.dataDate)), 2), '/', YEAR(Jobs.dataDate)) as FdataDate, CONCAT(RIGHT('0' + RTRIM(DAY(Jobs.tablesDate)), 2), '/', RIGHT('0' + RTRIM(MONTH(Jobs.tablesDate)), 2), '/', YEAR(Jobs.tablesDate)) as FtablesDate, Jobs.jobID, Jobs.jobName, Jobs.interviewsTarget, Jobs.jobCPI, Jobs.hourlyTarget, Jobs.isJobDay, Jobs.isJobEve, Jobs.isJobBusiness, Jobs.isJobConsumer, Jobs.isJobCATI, Jobs.isJobOnline, Jobs.isJobFace, Jobs.isJobRecruitment, Jobs.isJobValidation, Jobs.isJobRecontacts, Jobs.isJobInternational, Jobs.isJobConfirmit, Jobs.isJobInHouse, Jobs.expectedLOI, Jobs.timedLOI, Quotes.quoteID, Quotes.quoteNo, Quotes.quoteName, Quotes.clientID, Quotes.quoteDate, Quotes.noteID, Quotes.isQuoteAsBusiness, Quotes.isQuoteAsConsumer, Quotes.isQuoteAsCATI, Quotes.isQuoteAsRecruitment, Quotes.isQuoteAsFace, Quotes.isQuoteAsOnline, Quotes.isQuoteAsInternational, Clients.clientName FROM Jobs, Clients, Quotes, Projects WHERE Jobs.projectID = Projects.projectID AND Projects.quoteID = Quotes.quoteID AND Quotes.clientID = Clients.clientID AND Quotes.quoteID > 2 AND Projects.isProjectLive = 1 AND Jobs.isJobCATI = 1 " + queryText[qText] + " ORDER BY Jobs.isJobDay, Quotes.quoteNo ASC";
    let jobQuery = "SELECT Jobs.jobID, Jobs.jobName, Jobs.startDate, Jobs.endDate, Jobs.dataDate, Jobs.tablesDate, Jobs.interviewsTarget, Jobs.jobCPI, Jobs.hourlyTarget, Jobs.isJobDay, Jobs.isJobEve, Jobs.isJobBusiness, Jobs.isJobConsumer, Jobs.isJobCATI, Jobs.isJobOnline, Jobs.isJobFace, Jobs.isJobRecruitment, Jobs.isJobValidation, Jobs.isJobRecontacts, Jobs.isJobInternational, Projects.setupCost, Projects.dataCost, Projects.sampleCost, Projects.codingCost, DI.CATIInterviews, DI.Hours, INC.IncCost, INC.IncCount, INC.IncAdm, SAMP.SampCost, SAMP.SampCount, OTH.OtherCost, PJOBS.PanelInterviews FROM Projects LEFT JOIN Jobs ON Jobs.projectID = Projects.projectID LEFT JOIN (SELECT DailyInput.jobID, SUM(DailyInput.inputInterviews) AS 'CATIInterviews', SUM(DailyInput.inputHours) AS 'Hours' FROM DailyInput GROUP BY DailyInput.jobID) DI ON Jobs.jobID = DI.jobID LEFT JOIN (SELECT Incentives.jobID, SUM(Incentives.incentiveCost) AS IncCost, SUM(Incentives.incentiveCount) AS IncCount, SUM(Incentives.incentiveAdminCost) AS IncAdm FROM Incentives GROUP BY Incentives.jobID) INC ON Jobs.jobID = INC.jobID LEFT JOIN (SELECT Samples.jobID, SUM(Samples.sampleCount) AS SampCount, SUM(Samples.totalCost) AS SampCost FROM Samples GROUP BY Samples.jobID) SAMP ON Jobs.jobID = SAMP.jobID LEFT JOIN (SELECT OtherCosts.jobID, SUM(OtherCosts.costAmount) AS OtherCost FROM OtherCosts GROUP BY OtherCosts.jobID) OTH ON Jobs.jobID = OTH.jobID LEFT JOIN (SELECT PanelJobs.jobID, SUM(PanelJobs.completesNumber) AS PanelInterviews FROM PanelJobs GROUP BY PanelJobs.jobID) PJOBS ON PJOBS.jobID = Jobs.jobID WHERE Jobs.isJobInHouse = 1 AND Projects.isProjectLive = 1 AND ((Jobs.startDate <= '" + alloDateOriginal + "') OR ((((DI.CATIInterviews + PJOBS.PanelInterviews) < Jobs.interviewsTarget) OR (PJOBS.PanelInterviews IS NULL AND DI.CATIInterviews < Jobs.interviewsTarget) OR (DI.CATIInterviews IS NULL AND PJOBS.PanelInterviews < Jobs.interviewsTarget)))" + queryText[qText] + ")";
    let interviewerQuery = `
    SELECT Agents.agentName,
       Agents.agentID,
       Agents.agentAskiaID,
       Agents.agentANo,
       Concat(Year(Agents.agentDOB), '-', RIGHT(
       '0' + Rtrim(Month(Agents.agentDOB)), 2)
       , '-', RIGHT('0' + Rtrim(Day(Agents.agentDOB)), 2)) AS aDOB,
       Concat(Year(Agents.agentJoined), '-', RIGHT(
       '0' + Rtrim(Month(Agents.agentJoined)), 2), '-', RIGHT(
       '0' + Rtrim(Day(Agents.agentJoined)), 2))           AS aJoined,
       Concat(Year(Agents.agentLeft), '-', RIGHT(
       '0' + Rtrim(Month(Agents.agentLeft)),
                                           2), '-', RIGHT(
       '0' + Rtrim(Day(Agents.agentLeft)), 2))             AS aLeft,
       Datediff(hour, Booking.startTime, Booking.endTime)  AS HoursBooked,
			 AgentTeams.isDay,
			 AgentTeams.isEve
    FROM   Agents
           LEFT JOIN Booking
                  ON Booking.agentID = Agents.agentID
                     AND Booking.bookingDate = '`+ alloDateOriginal +`' 
    			 LEFT JOIN AgentTeams ON AgentTeams.agentTeamID=Agents.teamID
    WHERE  Agents.agentLeft IS NULL
            OR Agents.agentLeft = ''
    ORDER  BY agentName ASC `;
    let dailyQuery = "SELECT SUM(DailyInput.inputInterviews) AS Interviews, SUM(DailyInput.inputHours) AS Hours, DailyInput.agentID, DailyInput.jobID, Agents.agentName FROM DailyInput, Agents WHERE DailyInput.agentID = Agents.agentID AND DailyInput.inputHours > 0 " + queryText2[qText2] + " GROUP BY DailyInput.agentID, DailyInput.jobID, Agents.agentName ORDER BY SUM(DailyInput.inputInterviews)/SUM(DailyInput.inputHours) DESC";
    let alloQuery = "SELECT SUM(agentAllocationHours) AS hours, AgentAllocation.agentAllocationDate, AgentAllocation.jobID FROM AgentAllocation WHERE CONCAT(RIGHT('0' + RTRIM(DAY(AgentAllocation.agentAllocationDate)), 2), '/', RIGHT('0' + RTRIM(MONTH(AgentAllocation.agentAllocationDate)), 2), '/', YEAR(AgentAllocation.agentAllocationDate)) = '" + sToday +  "' GROUP BY AgentAllocation.jobID, AgentAllocation.agentAllocationDate"
    let alloQueryInterviewer = "SELECT CONCAT(RIGHT('0' + RTRIM(DAY(AgentAllocation.agentAllocationDate)), 2), '/', RIGHT('0' + RTRIM(MONTH(AgentAllocation.agentAllocationDate)), 2), '/', YEAR(AgentAllocation.agentAllocationDate)) as alloDate, Agents.agentName, AgentAllocation.agentAllocationHours, AgentAllocation.agentID, AgentAllocation.agentAllocationDate, AgentAllocation.jobID, AgentTeams.isDay, AgentTeams.isEve FROM AgentAllocation, Agents, AgentTeams WHERE CONCAT(RIGHT('0' + RTRIM(DAY(AgentAllocation.agentAllocationDate)), 2), '/', RIGHT('0' + RTRIM(MONTH(AgentAllocation.agentAllocationDate)), 2), '/', YEAR(AgentAllocation.agentAllocationDate)) = '" + sToday +  "' AND Agents.agentID = AgentAllocation.agentID AND AgentTeams.AgentTeamID=Agents.teamID AND AgentTeams."+shiftCheck+"=1"
    let dailyQuery2 = "SELECT DailyInput.inputInterviews, DailyInput.inputHours, DailyInput.agentID, DailyInput.jobID, DailyInput.inputDate FROM DailyInput WHERE DailyInput.inputHours > 0 ORDER BY DailyInput.inputDate ASC"
    let allJobQ=`SELECT Jobs.jobID, Jobs.isJobDay, Jobs.isJobEve, ViewJobFullName.jobName FROM Jobs LEFT JOIN ViewJobFullName ON ViewJobFullName.jobID=Jobs.jobID WHERE '`+ alloDateOriginal +`' BETWEEN Jobs.startDate AND Jobs.endDate AND Jobs.isJobCATI=1 AND Jobs.isJobInHouse=1`
    db.query(alloQueryInterviewer, (err, resultA2) => {
      if (err) {
        logger.info("failed to select interviewer allocation for allocate dates " + req.user.uName);
        //res.redirect("/home");
      }
      db.query(alloQuery, (err, resultA) => {
        if (err) {
          logger.info("failed to get overall allocation for view allocation dates " + req.user.uName);
          //res.redirect("/home");
        }
        db.query(dailyQuery, (err, resultD) =>{
          if (err) {
            logger.info("failed to get dailys for view allocationg dates " + req.user.uName);
            //res.redirect("/home");
          }
          db.query(interviewerQuery, (err, resultI) => {
            if (err) {
              logger.info("failed to get interviewers for view allocaiton dates " + req.user.uName);
              //res.redirect("/home");
            }
            db.query(projectQuery, (err, resultP) => {
              if (err) {
                logger.info("failed to get projects for view alllocation dates " + req.user.uName);
                //res.redirect("/home");
              }
              db.query(jobQuery, (err, resultJ) => {
                if (err) {
                  logger.info("failed to get jobs for view allocation dates " + req.user.uName);
                  //res.redirect("/home");
                }
                db.query(dailyQuery2, (err, resultDD) => {
                  if (err) {
                    logger.info("failed to get jobs for view allocation dates " + req.user.uName);
                    console.log(err)
                    //res.redirect("/home");
                  }
                  db.query(allJobQ, (err, allJobR) => {
                    if (err) {
                      logger.info("failed to get jobs for view allocation dates " + req.user.uName);
                      console.log(err)
                      //res.redirect("/home");
                    }
                    res.render('allocate-dates.ejs', {
                      projects: resultP.recordset
                      ,jobs: resultJ.recordset
                      ,date: alloDate
                      ,title: "Allocation selection"
                      ,today: today
                      ,shift: alloShift
                      ,interviewers: resultI.recordset
                      ,dailys: resultD.recordset
                      ,viewType: horses
                      ,jobDefiner: jID
                      ,allocations: resultA.recordset
                      ,allocationsInts: resultA2.recordset
                      ,allDailys: resultDD.recordset
                      ,allJobs: allJobR.recordset
                    });
                  })
                });
              });
            });
          });
        });
      });
    });
  },

  allocationPageRedirect(req, res){
    req.session.allDate = req.params.date;
    req.session.alloShift = req.params.shift;
    req.session.alloJobId = req.body.alloJobId;
    req.session.allInterviewers = req.body.allocatedInterviewers;
    req.session.allType = req.params.hs;
    res.redirect('/allocation-page/'+ req.session.allType);
  },

  allocationPage(req, res){
    let date = req.session.allDate;
    let alloDateOriginal = date;
    date = new Date(date);
    let today = new Date()
    var dd = date.getDate(); var mm = date.getMonth()+1;
    var yyyy = date.getFullYear();
    if(dd<10){dd='0'+dd} if(mm<10){mm='0'+mm}
    var sToday = dd+'/'+mm+'/'+yyyy;
    let shift = req.session.alloShift
    let jID = req.session.alloJobId;
    let interviewers = req.session.allInterviewers;
    let hs = req.params.hs;
    let qText = 3;
    let shiftCheck=""
    let queryText = ["","AND jobs.isJobDay = 1","AND Jobs.isJobEve = 1", "AND Jobs.jobID = "+ jID]
    if(jID == 0){
      qText = 0;
      if(shift == 'day'){
        qText = 1
        shiftCheck="isDay"
      }
      if(shift == 'eve'){
        qText = 2
        shiftCheck="isEve"
      }
    }
    let jobQuery = "SELECT ViewJobsStats.jobID, ViewJobsStats.fullJobName, ViewJobsStats.CATI_Completes, ViewJobsStats.CATI_Hours, Jobs.interviewsTarget, Jobs.hourlyTarget, Jobs.startDate, Jobs.endDate FROM ViewJobsStats, Jobs WHERE ViewJobsStats.jobID = Jobs.jobID AND ViewJobsStats.jobID IN("+jID+")";
    let interviewerQuery = "SELECT Agents.agentName, Agents.agentID, Agents.agentAskiaID, Agents.agentANo, CONCAT(YEAR(Agents.agentDOB), '-', RIGHT('0' + RTRIM(MONTH(Agents.agentDOB)), 2), '-', RIGHT('0' + RTRIM(DAY(Agents.agentDOB)), 2)) as aDOB, CONCAT(YEAR(Agents.agentJoined), '-', RIGHT('0' + RTRIM(MONTH(Agents.agentJoined)), 2), '-', RIGHT('0' + RTRIM(DAY(Agents.agentJoined)), 2)) as aJoined, CONCAT(YEAR(Agents.agentLeft), '-', RIGHT('0' + RTRIM(MONTH(Agents.agentLeft)), 2), '-', RIGHT('0' + RTRIM(DAY(Agents.agentLeft)), 2)) as aLeft FROM Agents WHERE Agents.agentID IN (" + interviewers + ") ORDER BY agentName ASC";
    let alloQuery = `
      SELECT ViewJobFullName.jobName, ViewAllocation.agentID, ViewAllocation.jobID, Agents.agentName, ViewAllocation.agentAllocationDate, ViewAllocation.agentAllocationHours, (dInput.Ints/dInput.Hours) AS AHR
      FROM
      ViewAllocation
      LEFT JOIN ViewJobFullName ON ViewAllocation.jobID=ViewJobFullName.jobID
      LEFT JOIN Agents ON Agents.agentID = ViewAllocation.agentID
      LEFT JOIN
      (
      	SELECT DailyInput.jobID, DailyInput.agentID, sum(DailyInput.inputHours) as Hours, sum(DailyInput.inputInterviews) as Ints
      	FROM DailyInput
      	GROUP BY DailyInput.jobID, DailyInput.agentID
      ) dInput ON dInput.agentID = ViewAllocation.agentID AND dInput.jobID = ViewAllocation.jobID
      WHERE
      ViewAllocation.agentAllocationDate=FORMAT(GETDATE(),'dd/MM/yyyy')`
    let dailyQuery = "SELECT SUM(DailyInput.inputInterviews) AS Interviews, SUM(DailyInput.inputHours) AS Hours, DailyInput.agentID, DailyInput.jobID, Agents.agentName FROM DailyInput, Agents WHERE DailyInput.agentID = Agents.agentID AND DailyInput.inputHours > 0 GROUP BY DailyInput.agentID, DailyInput.jobID, Agents.agentName ORDER BY SUM(DailyInput.inputInterviews)/SUM(DailyInput.inputHours) DESC";
    db.query(interviewerQuery, (err, resultI) => {
      if (err) {
        logger.info("failed to get interviewers for view allocation page " + req.user.uName);
        //res.redirect("/home");
      }
      db.query(jobQuery, (err, resultJ) => {
        if (err) {
          logger.info("failed to get jobs for view allocation page " + req.user.uName);
          //res.redirect("/home");
        }
        db.query(alloQuery, (err, resultA) => {
          if (err) {
            logger.info("failed to get allocations for view allocation page " + req.user.uName);
            //res.redirect("/home");
          }
          db.query(dailyQuery, (err, resultD) =>{
            if (err) {
              logger.info("failed to get dailys for view allocationg dates " + req.user.uName);
              //res.redirect("/home");
            }
            res.render('allocation-page.ejs', {
              jobs: resultJ.recordset
              ,date: date
              ,title: "Allocation page"
              ,shift: shift
              ,interviewers: resultI.recordset
              ,date: date
              ,today: today
              ,allocations: resultA.recordset
              ,dailys: resultD.recordset
            });
          });
        });
      });
    });
  },

  submitAllocation(req, res){
    let date = req.session.allDate;
    let today = new Date()
    let shift = req.session.alloShift
    let jID = req.session.alloJobId;
    let interviewers = req.session.allInterviewers;
    let interviewerQuery = "SELECT Agents.agentID FROM Agents WHERE Agents.agentID IN ( " + interviewers + " )";
    let jobQuery = "SELECT Jobs.jobID FROM Jobs WHERE jobID IN ("+jID+")";
    db.query(interviewerQuery, (err, intResult) =>{
      if (err) {
        console.dir(interviewerQuery+" - "+err)
      }
      db.query(jobQuery, (err, jobResult) =>{
        if (err) {
          console.dir(err)
        }
        intIns = intResult.recordset;
        jobIns = jobResult.recordset;
        intIns.forEach((intIn) => {
          jobIns.forEach((jobIn) =>{
            let aD = "alloHours_" + jobIn.jobID + "_" + intIn.agentID
            let allocatedData = req.body[aD]
            if(allocatedData){
              let alloCheck = "SELECT * FROM AgentAllocation WHERE AgentAllocation.jobID = " + jobIn.jobID + " AND AgentAllocation.agentID = " + intIn.agentID + " AND AgentAllocation.agentAllocationDate = '" + date + "'";
              db.query(alloCheck, (err, alloCheckResult) =>{
                //DUPLICATE ALLOCATION
                if(alloCheckResult.recordset.length != 0){
                  let alloUpdate
                  if(allocatedData == 0) {
                    alloUpdate = "DELETE FROM AgentAllocation WHERE AgentAllocation.jobID = " + jobIn.jobID + " AND AgentAllocation.agentID = " + intIn.agentID + " AND AgentAllocation.agentAllocationDate = '" + date + "'"
                  } else {
                    alloUpdate = "UPDATE AgentAllocation SET agentAllocationHours = " + allocatedData + " WHERE AgentAllocation.jobID = " + jobIn.jobID + " AND AgentAllocation.agentID = " + intIn.agentID + " AND AgentAllocation.agentAllocationDate = '" + date + "'"
                  }
                  db.query(alloUpdate, (err, alloUpdateResult) =>{
                    if(err){
                      logger.info("failed to update allocaiton " + req.user.uName);
                      //res.redirect("/home");
                    }
                  });
                }else{
                  if(allocatedData > 0){
                    let alloQuery = "INSERT INTO AgentAllocation VALUES (" + jobIn.jobID + ", " + intIn.agentID + ", '" + date + "', " + allocatedData + ")"
                    db.query(alloQuery, (err, alloResult) =>{
                      if(err){
                        logger.info("failed to add allocaiton " + req.user.uName);
                        //res.redirect("/home");
                      }
                    });
                  }
                }
              });
            }
          });
        });
      });
    });
    let redirect = () =>{
      res.redirect("/view-planner/1/14");
    }
    setTimeout(redirect,2000);
  },

  reallocate(req, res){
    let alloDate = req.params.date;
    let dDate = new Date(alloDate);
    let oneBack = dDate.setDate(dDate.getDate()-1)
    oneBack = new Date(oneBack)
    var dd = oneBack.getDate();
    var mm = oneBack.getMonth()+1;
    var yyyy = oneBack.getFullYear(); if(dd<10){dd='0'+dd} if(mm<10){mm='0'+mm}
    var oneDayBack = yyyy+'-'+mm+'-'+dd;
    let shiftType = req.params.shift;
    let jID = req.params.jid;
    let qText = 0;
    let queryText = ["","AND jobs.isJobDay = 1","AND Jobs.isJobEve = 1"]
    if(jID == 0)
    {
      if(shiftType == 'day'){
        qText = 1
      }
      if(shiftType == 'eve'){
        qText = 2
      }
    }
    let alloQuery = "SELECT AgentAllocation.jobID, AgentAllocation.agentID, AgentAllocation.agentAllocationDate, AgentAllocation.agentAllocationHours, Jobs.isJobDay, jobs.isJobEve FROM AgentAllocation, Jobs WHERE Jobs.jobID = AgentAllocation.jobID AND AgentAllocation.agentAllocationDate = '" + oneDayBack + "'" + queryText[qText]
    db.query(alloQuery, (err, alloResult) =>{
      if(err){
        res.redirect("back");
      }
      if(alloResult.recordset.length > 0){
        allocations = alloResult.recordset;
        allocations.forEach((allocation, index) =>{
          let alloCheck = "SELECT * FROM AgentAllocation WHERE AgentAllocation.jobID = " + allocation.jobID + " AND AgentAllocation.agentID = " + allocation.agentID + " AND AgentAllocation.agentAllocationDate = '" + alloDate + "'";
          db.query(alloCheck, (err, alloCheckResult) =>{
            //DUPLICATE ALLOCATION
            if(alloCheckResult.recordset.length != 0){
              let alloUpdate = "UPDATE AgentAllocation SET agentAllocationHours = " + allocation.agentAllocationHours + " WHERE AgentAllocation.jobID = " + allocation.jobID + " AND AgentAllocation.agentID = " + allocation.agentID + " AND AgentAllocation.agentAllocationDate = '" + alloDate + "'"
              db.query(alloUpdate, (err, alloUpdateResult) =>{
                if(err){
                  logger.info("failed to update allocaiton " + req.user.uName);
                  //res.redirect("/home");
                }
              });
            }else{
              let alloUpdateQuery = "INSERT INTO AgentAllocation VALUES (" + allocation.jobID + ", " + allocation.agentID + ", '" + alloDate + "', " + allocation.agentAllocationHours + ")"
              db.query(alloUpdateQuery, (err, updateResult) =>{
                if(err){
                  logger.info("failed to add allocaiton " + req.user.uName);
                  //res.redirect("/home");
                }
              });
            }
          });
        });
        res.redirect('back');
      }else{
        res.redirect('back');
      }
    });
  },

  editAllocation(req, res) {
    let date = req.params.date;
    let shift = req.params.shift;
    let uDate = new Date(date);
    var sToday = dateIf(uDate,"/","f");
    let qText = 0;
    let queryText = ["","AND jobs.isJobDay = 1","AND Jobs.isJobEve = 1"]
    if(shift == 'day'){
      qText = 1
    }
    if(shift == 'eve'){
      qText = 2
    }
    let projectQuery = "SELECT Projects.projectID, Projects.projectCM, Projects.projectDP, Projects.projectTL, Projects.projectGrade, Projects.setupCost, Projects.dataCost, Projects.sampleCost, Projects.codingCost, Projects.verbsCodingNumber, Projects.quotedIR, Projects.finalIR, Projects.isProjectCommissioned, Projects.isProjectLive, Projects.isProjectClosed, Projects.isProjectCancelled, CONCAT(RIGHT('0' + RTRIM(DAY(Jobs.startDate)), 2), '/', RIGHT('0' + RTRIM(MONTH(Jobs.startDate)), 2), '/', YEAR(Jobs.startDate)) as FstartDate, CONCAT(RIGHT('0' + RTRIM(DAY(Jobs.endDate)), 2), '/', RIGHT('0' + RTRIM(MONTH(Jobs.endDate)), 2), '/', YEAR(Jobs.endDate)) as FendDate, CONCAT(RIGHT('0' + RTRIM(DAY(Jobs.dataDate)), 2), '/', RIGHT('0' + RTRIM(MONTH(Jobs.dataDate)), 2), '/', YEAR(Jobs.dataDate)) as FdataDate, CONCAT(RIGHT('0' + RTRIM(DAY(Jobs.tablesDate)), 2), '/', RIGHT('0' + RTRIM(MONTH(Jobs.tablesDate)), 2), '/', YEAR(Jobs.tablesDate)) as FtablesDate, Jobs.jobID, Jobs.jobName, Jobs.interviewsTarget, Jobs.jobCPI, Jobs.hourlyTarget, Jobs.isJobDay, Jobs.isJobEve, Jobs.isJobBusiness, Jobs.isJobConsumer, Jobs.isJobCATI, Jobs.isJobOnline, Jobs.isJobFace, Jobs.isJobRecruitment, Jobs.isJobValidation, Jobs.isJobRecontacts, Jobs.isJobInternational, Jobs.isJobConfirmit, Jobs.isJobInHouse, Jobs.expectedLOI, Jobs.timedLOI, Quotes.quoteID, Quotes.quoteNo, Quotes.quoteName, Quotes.clientID, Quotes.quoteDate, Quotes.noteID, Quotes.isQuoteAsBusiness, Quotes.isQuoteAsConsumer, Quotes.isQuoteAsCATI, Quotes.isQuoteAsRecruitment, Quotes.isQuoteAsFace, Quotes.isQuoteAsOnline, Quotes.isQuoteAsInternational, Clients.clientName FROM Jobs, Clients, Quotes, Projects WHERE Jobs.projectID = Projects.projectID AND Projects.quoteID = Quotes.quoteID AND Quotes.clientID = Clients.clientID AND Quotes.quoteID > 2 AND Projects.isProjectLive = 1 AND Jobs.isJobCATI = 1  AND Projects.isProjectLive = 1 " + queryText[qText] + " ORDER BY Jobs.isJobDay, Quotes.quoteNo ASC";
    let jobQuery = "SELECT Jobs.jobID, Jobs.jobName, Jobs.startDate, Jobs.endDate, Jobs.dataDate, Jobs.tablesDate, Jobs.interviewsTarget, Jobs.jobCPI, Jobs.hourlyTarget, Jobs.isJobDay, Jobs.isJobEve, Jobs.isJobBusiness, Jobs.isJobConsumer, Jobs.isJobCATI, Jobs.isJobOnline, Jobs.isJobFace, Jobs.isJobRecruitment, Jobs.isJobValidation, Jobs.isJobRecontacts, Jobs.isJobInternational, Projects.setupCost, Projects.dataCost, Projects.sampleCost, Projects.codingCost, DI.CATIInterviews, DI.Hours, INC.IncCost, INC.IncCount, INC.IncAdm, SAMP.SampCost, SAMP.SampCount, OTH.OtherCost, PJOBS.PanelInterviews FROM Projects LEFT JOIN Jobs ON Jobs.projectID = Projects.projectID LEFT JOIN (SELECT DailyInput.jobID, SUM(DailyInput.inputInterviews) AS 'CATIInterviews', SUM(DailyInput.inputHours) AS 'Hours' FROM DailyInput GROUP BY DailyInput.jobID) DI ON Jobs.jobID = DI.jobID LEFT JOIN (SELECT Incentives.jobID, SUM(Incentives.incentiveCost) AS IncCost, SUM(Incentives.incentiveCount) AS IncCount, SUM(Incentives.incentiveAdminCost) AS IncAdm FROM Incentives GROUP BY Incentives.jobID) INC ON Jobs.jobID = INC.jobID LEFT JOIN (SELECT Samples.jobID, SUM(Samples.sampleCount) AS SampCount, SUM(Samples.totalCost) AS SampCost FROM Samples GROUP BY Samples.jobID) SAMP ON Jobs.jobID = SAMP.jobID LEFT JOIN (SELECT OtherCosts.jobID, SUM(OtherCosts.costAmount) AS OtherCost FROM OtherCosts GROUP BY OtherCosts.jobID) OTH ON Jobs.jobID = OTH.jobID LEFT JOIN (SELECT PanelJobs.jobID, SUM(PanelJobs.completesNumber) AS PanelInterviews FROM PanelJobs GROUP BY PanelJobs.jobID) PJOBS ON PJOBS.jobID = Jobs.jobID WHERE Jobs.isJobInHouse = 1 AND Projects.isProjectLive = 1 AND (((DI.CATIInterviews + PJOBS.PanelInterviews) < Jobs.interviewsTarget) OR (PJOBS.PanelInterviews IS NULL AND DI.CATIInterviews < Jobs.interviewsTarget) OR (DI.CATIInterviews IS NULL AND PJOBS.PanelInterviews < Jobs.interviewsTarget) OR (DI.CATIInterviews IS NULL AND PJOBS.PanelInterviews IS NULL)) " + queryText[qText] + "";
    let alloQuery = "SELECT SUM(agentAllocationHours) AS hours, AgentAllocation.agentAllocationDate, AgentAllocation.jobID FROM AgentAllocation WHERE CONCAT(RIGHT('0' + RTRIM(DAY(AgentAllocation.agentAllocationDate)), 2), '/', RIGHT('0' + RTRIM(MONTH(AgentAllocation.agentAllocationDate)), 2), '/', YEAR(AgentAllocation.agentAllocationDate)) = '" + sToday +  "' GROUP BY AgentAllocation.jobID, AgentAllocation.agentAllocationDate"
    let alloQueryInterviewer = "SELECT CONCAT(RIGHT('0' + RTRIM(DAY(AgentAllocation.agentAllocationDate)), 2), '/', RIGHT('0' + RTRIM(MONTH(AgentAllocation.agentAllocationDate)), 2), '/', YEAR(AgentAllocation.agentAllocationDate)) as alloDate, Agents.agentName, AgentAllocation.agentAllocationHours, AgentAllocation.agentID, AgentAllocation.agentAllocationDate, AgentAllocation.jobID FROM AgentAllocation, Agents WHERE CONCAT(RIGHT('0' + RTRIM(DAY(AgentAllocation.agentAllocationDate)), 2), '/', RIGHT('0' + RTRIM(MONTH(AgentAllocation.agentAllocationDate)), 2), '/', YEAR(AgentAllocation.agentAllocationDate)) = '" + sToday +  "' AND Agents.agentID = AgentAllocation.agentID"
    db.query(projectQuery, (err, resultP) => {
      if (err) {
        logger.info("failed to load projects for edit allocation " + req.user.uName);
        //res.redirect("/home");
      }
      db.query(jobQuery, (err, resultJ) => {
        if (err) {
          logger.info("failed to load jobs for edit allocation " + req.user.uName);
          //res.redirect("/home");
        }
        db.query(alloQuery, (err, resultA) => {
          if (err) {
            logger.info("failed to load allocations for edit allocation " + req.user.uName);
            //res.redirect("/home");
          }
          db.query(alloQueryInterviewer, (err, resultA2) => {
            if (err) {
              logger.info("failed to load interviewer allocations for edit allocation " + req.user.uName);
              //res.redirect("/home");
            }
            let interviewersSent = []
            let projectsSent = []
            let allocations = resultA2.recordset;
            allocations.forEach((interviewer, index) =>{
              interviewersSent.push(interviewer.agentID);
              projectsSent.push(interviewer.jobID);
            });
            req.session.editAlloctionProjects = projectsSent;
            req.session.editAlloctionInterviewers = interviewersSent;
            req.session.editAlloctionDate = date;
            req.session.editAllocationShift = shift;
            res.render('edit-allocation.ejs', {
              projects: resultP.recordset
              ,jobs: resultJ.recordset
              ,title: "Allocation page"
              ,shift: shift
              ,date: uDate
              ,fDate: sToday
              ,allocations: resultA.recordset
              ,allocationsInts: resultA2.recordset
            });
          });
        });
      });
    });
  },

  updateAllocation(req, res) {
    let projects = req.session.editAlloctionProjects;
    let interviewers = req.session.editAlloctionInterviewers;
    let date = req.session.editAlloctionDate;
    let jobQuery = "SELECT Jobs.jobID FROM Jobs WHERE Jobs.jobID IN( " + projects + ")";
    let agentQuery = "SELECT Agents.agentID FROM Agents WHERE Agents.agentID IN( " + interviewers + ")";
    db.query(jobQuery, (err, jobResult) =>{
      if(err){
        console.log(err)
      }
      db.query(agentQuery, (err, agentResult) =>{
        if(err){
          console.log(err)
        }
        let jobs = jobResult.recordset;
        let agents = agentResult.recordset;
        jobs.forEach((jResult, index) =>{
          agents.forEach((aResult, index) =>{
            let agentProject = jResult.jobID + "_" + aResult.agentID;
            let alloData = req.body[agentProject];
            let alloUpdate
            if(alloData == 0) {
              alloUpdate = "DELETE FROM AgentAllocation WHERE AgentAllocation.jobID = " + jResult.jobID + " AND AgentAllocation.agentID = " + aResult.agentID + " AND AgentAllocation.agentAllocationDate = '" + date + "'"
            } else if (alloData > 0) {
              alloUpdate = "UPDATE AgentAllocation SET agentAllocationHours = " + alloData + " WHERE AgentAllocation.jobID = " + jResult.jobID + " AND AgentAllocation.agentID = " + aResult.agentID + " AND AgentAllocation.agentAllocationDate = '" + date + "'"
            }
              db.query(alloUpdate, (err, alloUpdateResult) =>{
                if(err){
                  logger.info("failed to update allocation " + req.user.uName);
                  //res.redirect("/home");
                }
              });
            });
          });
          res.redirect("/allocate/"+req.session.editAllocationShift+"/"+dateIf(date,"-","r")+"/0/2");
        });
      });
    }
  }
