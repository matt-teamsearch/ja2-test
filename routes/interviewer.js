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

module.exports = {
  addInterviewerPage: (req, res) => {
    let teamNameQ = "SELECT AgentTeams.teamName, AgentTeams.agentTeamID FROM AgentTeams GROUP BY AgentTeams.agentTeamID, AgentTeams.teamName"
    db.query(teamNameQ, (err, teamsResult) => {
      if (err) {
          logger.info("Error fetching team names while adding a new interviewer "+req.user.uName);
          //res.redirect("/home");
      }else {
        let sendParams={
          title: "Add a new interviewer"
          ,teams: teamsResult.recordset
          ,edit: false
          ,agent:{}
          ,contractHistory:[]
          ,breatheAgent:{}
          ,rcAgents:[]
          ,success_msg: req.flash('success_msg')
          ,error_msg: req.flash('error_msg')
        }
        if (req.params.id>0) {
          let editQ = "SELECT * FROM Agents WHERE agentID="+req.params.id
          db.query(editQ, (err, editR) => {
            if (err) {
                logger.info("Error fetching team names while adding a new interviewer "+req.user.uName);
                //res.redirect("/home");
            }else {
              let contractQ=`
              select cd.contractID,contractName,startDate,endDate from
              AgentContractDates cd
              left join AgentContracts c on c.contractID=cd.contractID
              where cd.agentID=`+req.params.id+`
              order by startDate ASC
              `
              db.query(contractQ,(err,contractR)=>{
                if (err) {
                  console.log(err)
                }
                sendParams.title="Edit an interviewer"
                sendParams.edit=true
                sendParams.agent=editR.recordset[0]
                sendParams.contractHistory=contractR.recordset
                breathReq.get('/employees/'+editR.recordset[0].breatheID).then(response => {
                  sendParams.breatheAgent=response.data.employees[0]
                  rcPlatform.get('/restapi/v1.0/account/~/extension/',{type:'User',perPage:500}).then(function(resp){
                    resp.json().then(function(rcAgents){
                      sendParams.rcAgents=rcAgents.records.filter(el=>el.name)
                      res.render('add-interviewer.ejs', sendParams);
                    })
                  }).catch(e=>{
                    res.render('add-interviewer.ejs', sendParams);
                  })
                }).catch(function (err) {
                  console.log(err)
                  rcPlatform.get('/restapi/v1.0/account/~/extension/',{type:'User',perPage:500}).then(function(resp){
                    resp.json().then(function(rcAgents){
                      sendParams.rcAgents=rcAgents.records.filter(el=>el.name)
                      res.render('add-interviewer.ejs', sendParams);
                    })
                  }).catch(e=>{
                    res.render('add-interviewer.ejs', sendParams);
                  })
                });
              })
            }
          })
        }else {
          rcPlatform.get('/restapi/v1.0/account/~/extension/',{type:'User',perPage:500}).then(function(resp){
            resp.json().then(function(rcAgents){
              sendParams.rcAgents=rcAgents.records.filter(el=>el.name)
              res.render('add-interviewer.ejs', sendParams);
            })
          }).catch(e=>{
            res.render('add-interviewer.ejs', sendParams);
          })
        }
      }
    })
  },

  addInterviewer: (req, res) => {
    let message = '';
    let user = req.user.user;
    let intName = req.body.intName;
    let intDOB = req.body.intDOB;
    let isRemote="0"
    let payrollID=req.body.payrollID?req.body.payrollID:'NULL'
    let breatheID=req.body.breatheID?req.body.breatheID:'NULL'
    let unpaidHours=req.body.unpaidHours?req.body.unpaidHours:'NULL'
    let rcID=req.body.rcSelect?"'"+req.body.rcSelect+"'":'NULL'
    if (req.body.isRemote=="on") {
      isRemote="1"
    }
    let intJ = req.body.intJoin;
    intName = intName.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '');
    let intDupCheck = "SELECT * FROM Agents WHERE agentDOB = '" + intDOB + "' AND agentName LIKE'%" + intName + "%' AND (agentLeft IS NULL OR agentLeft='')";
    let teamNameQ = "SELECT AgentTeams.teamName, AgentTeams.agentTeamID FROM AgentTeams GROUP BY AgentTeams.agentTeamID, AgentTeams.teamName"
    db.query(teamNameQ, (err, teamsResult) => {
      if (err) {
          logger.info("Error getting teams while adding a new interviewer "+req.user.uName);
          //res.redirect("/home");
      }
      db.query(intDupCheck, (err, dupResult) => {
        if (err) {
            logger.info("Error checking for duplicate interviewers while adding a new interviewer "+req.user.uName);
            //res.redirect("/home");
        }
        if (dupResult.recordset.length > 0){
          req.flash('error_msg','Interviewer already exists. Loaded interviewer for editing instead')
          req.session.save(function () {
            res.redirect('/editint/'+dupResult.recordset[0].agentID)
          })
        }
        else {
          let query = "INSERT INTO Agents (agentName, agentDOB, agentJoined, agentAskiaID, teamID, isRemote, breatheID, payrollID, contractVersion, unpaidHours, ringCentralID,contractStart) VALUES ('"  + intName + "', '" + intDOB +"', '" + intJ + "', '" + req.body.askiaID + "', '" + req.body.agentTeam + "', " + isRemote + ", " + breatheID + ", " + payrollID + ", " + req.body.contractVersion + ", " + unpaidHours + ","+rcID+","+(req.body.contractStart?"'"+moment(req.body.contractStart).format("YYYY-MM-DD")+"'":'null')+")";
          db.query(query, (err, result) => {
            if (err){
              console.log(err)
              console.log(query)
              logger.info(req.user.uName + " failed to add an interviewer ",query);
              logger.info(err);
              req.flash('error_msg','Error while adding interviewer - contact administrator')
              req.session.save(function () {
                res.redirect('/add-interviewers/0')
              })
            }
            else{
              logger.info(req.user.uName + " added an interviewer ",query);
              req.flash('success_msg','Interviewer added')
              req.session.save(function () {
                res.redirect('/add-interviewers/0')
              })
            }
          })
        }
      });
    });
  },
  editInterviewer: (req, res) => {
    let user = req.user.user;
    let intName = req.body.intName;
    let intDOB = req.body.intDOB;
    let intJ = req.body.intJoin;
    let intL = req.body.intLeft;
    let intID = req.body.agentID;
    intName = intName.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '');
    let isRemote="0"
    if (req.body.isRemote=="on") {
      isRemote="1"
    }
    let breatheID=req.body.breatheID?req.body.breatheID:'NULL'
    let payrollID=req.body.payrollID?req.body.payrollID:'NULL'
    let unpaidHours=req.body.unpaidHours?req.body.unpaidHours:'NULL'
    let rcID=req.body.rcSelect?"'"+req.body.rcSelect+"'":'NULL'
    let newContract=req.body.contractVersion&&req.body.contractStart
    let query
    if (newContract) {
      db.query("update AgentContractDates set endDate=dateAdd(day,-1,'"+req.body.contractStart+"') where acdID=(select top 1 acdID from AgentContractDates cd where cd.agentID="+req.body.agentID+" order by startDate DESC)",(err,r)=>{
        db.query("insert into AgentContractDates (agentID,contractID,startDate) VALUES ("+req.body.agentID+","+req.body.contractVersion+",'"+req.body.contractStart+"')")
      })
    }
    if(intL==""){
      query = "UPDATE Agents SET agentName='"+intName+"', agentDOB='"+intDOB+"', agentJoined='"+intJ+"', agentAskiaID='"+req.body.askiaID+"', teamID='"+req.body.agentTeam+"', isRemote="+isRemote+", breatheID="+breatheID+", payrollID="+payrollID+(newContract?(", contractVersion="+req.body.contractVersion):"")+", unpaidHours="+unpaidHours+", agentLeft=null"+(rcID?", ringCentralID="+rcID:"")+(req.body.contractStart?", contractStart='"+moment(req.body.contractStart).format("YYYY-MM-DD")+"'":'')+" WHERE agentID = '" + intID + "'";
    } else {
      query = "UPDATE Agents SET agentName='"+intName+"', agentDOB='"+intDOB+"', agentJoined='"+intJ+"', agentAskiaID='"+req.body.askiaID+"', teamID='"+req.body.agentTeam+"', isRemote="+isRemote+", breatheID="+breatheID+", payrollID="+payrollID+(newContract?(", contractVersion="+req.body.contractVersion):"")+", unpaidHours="+unpaidHours+" , agentLeft='"+intL+"'"+(rcID?", ringCentralID="+rcID:"")+(req.body.contractStart?", contractStart='"+moment(req.body.contractStart).format("YYYY-MM-DD")+"'":'')+" WHERE agentID = '" + intID + "'";
      let dailyQ="DELETE from DailyInput where agentID="+intID+" AND inputDate>'"+intL+"' AND inputInterviews>0"
      let bookingQ="DELETE b FROM Booking b left join dailyInput d on d.inputBookingID=b.bookingID WHERE d.inputID is null and b.agentID = " + intID + " AND bookingDate>'" + intL + "'"
      let abQ="DELETE FROM Absence WHERE agentID = " + intID + " AND absenceDate>'" + intL + "'"

      db.multiple=true
      db.query(dailyQ+bookingQ+abQ, (err, bookingR) => {
        if (err) {
          logger.info(req.user.uName + " failed to delete future allocations/bookings/absences for " + intName,dailyQ+bookingQ+abQ);
        }
        logger.info(req.user.uName + " deleted future allocations for " + intName,dailyQ);
        logger.info(req.user.uName + " deleted future shifts for " + intName,bookingQ);
        let selectQ=`
        select agentPlanID
        from agentPlans ap
        where
        coachingFollowedUpDate is null
        and agentID =`+req.body.agentID+`
        `
        let delQ=`
        update agentPlans set coachingFollowedUpDate=getDate()
        where
        coachingFollowedUpDate is null
        and agentID =`+req.body.agentID+`
        `
        db.query(selectQ,(err,selectR) => {
          logger.info(req.user.uName+" cleared coaching follow-ups: ",selectR.recordset.map(el=>el.agentPlanID).join(", "))
          db.query(delQ,(err,delR) => {
            if (err) {
              console.log(err)
              logger.info(req.user.uName+" failed to clear coaching follow-ups")
            }
            if (rcID) {
              rcPlatform.put('/restapi/v1.0/account/~/extension/' + rcID, {status:"Disabled"}).then(function (disResp) {
                logger.info(req.user.uName + " disabled user on RingCentral",rcID);
                db.query('update agents set ringCentralID=null where agentID='+intID)
              }).catch(function(e){
                console.log(e.message)
                logger.info(req.user.uName+" failed to disable user on RingCentral",e.message)
              });
            }
          })
        })
      })
    }
    db.query(query, (err, result) => {
      if (err){
        console.log(err)
        console.log(query)
        logger.info(req.user.uName + " failed to update an interviewer " + intName );
        //res.redirect("/home");
      }
      else{
        console.log("updated interviewer")
        logger.info(req.user.uName + " updated an interviewer.",query);
        res.redirect('/view-interviewers/1');
      }
    });
  },
  deleteInterviewer: (req, res) => {
    let intID = req.params.id;
    let deleteUserQuery = 'DELETE FROM interviewers WHERE id = "' + intID + '"';

    db.query(deleteUserQuery, (err, result) => {
      if (err) {
        logger.info(req.user.uName + " faled to delete an interviewer");
        //res.redirect("/home");
      }
      function reDirect(){
        res.redirect('/view-interviewers/1');
      }
      setTimeout(reDirect,1000);
    });
  },
  getInts: (req, res) => {
    let query =
            `SELECT *
              FROM   Agents
              ORDER  BY agentName ASC `
    db.query(query, (err, result) => {
      if (err) {
        logger.info("failed to get interviewers for view interviewers page " + req.user.uName);
      }
      res.render('view-interviewers.ejs', {
        title: "View Interviewers"
        ,interviewers: result.recordset
        ,message: ""
      });
    });
  },

  interviewerPerformance: (req, res) => {
    let intID = req.params.id;
    let teamID = req.params.teamid;
    let startDate = req.params.start==0?currPayPeriodSt:req.params.start;
    let endDate1 = req.params.end==0?currPayPeriodEn:req.params.end;
    let endDate=moment.min(moment().subtract(1, 'day'),moment(endDate1)).format(moment.HTML5_FMT.DATE)
    let intNameQuery = "SELECT * FROM Agents LEFT JOIN AgentTeams ON Agents.teamID = AgentTeams.agentTeamID WHERE agentID = '" + intID + "'"
    let tableQ =`
    SELECT DailyInput.jobID, DailyInput.projectID,ROUND(sum(cast(isEve as int))/COUNT(*),0) isEve, isJobHourly, ViewJobFullName.jobName, isnull(DailyInput.inputDate,absenceDate) inputDate,dailyinput.inputDate sdate,absenceDate,absenceType, max(CPI) as CPI, SUM(DailyInput.hrs) as hrs, SUM(CASE WHEN isnull(excludeFromDials,0)=0 and dialDate is not null THEN DailyInput.hrs ELSE NULL END) as jobhrs, sum(Ints) as Ints, isnull(SUM(pay),0) as pay, sum(sales) as sales, max(shiftTotal.hrs) as shiftHrs, sum(CASE WHEN isnull(excludeFromDials,0)=0 THEN (dialCount/shiftTotal.hrs)*DailyInput.hrs ELSE NULL END) as dials,0.00+AVG(CAST(QCscore AS DECIMAL(10,2))) as QCscore,excludeFromDials INTO #agentReportTab
        FROM (
        	SELECT agentID,inputDate,v.jobID,jobs.projectID,excludeFromDials,sum(Hours) as hrs,sum(CASE WHEN isJobHourly=1 THEN Hours ELSE Ints END*CPI) as sales,sum(pay) as pay,sum(Ints) as Ints, max(CPI) as CPI, isJobHourly
        	FROM ViewDailyPay v
        	LEFT JOIN (SELECT jobID, isnull(CPI,0) as CPI FROM ViewJobsStats) as JobT ON JobT.jobID=v.jobID
          LEFT JOIN Jobs ON Jobs.jobID=v.jobID
        	WHERE Hours>0 AND agentID=@aid and v.jobID<>6611
        	GROUP BY inputDate, agentID, v.jobID, isJobHourly,jobs.projectID,excludeFromDials
        	) as DailyInput
        left join (select agentID,inputDate,sum(inputHours) as hrs from DailyInput d left join jobs j on j.jobID=d.jobID where isnull(excludeFromDials,0)=0 group by agentID,inputDate) shiftTotal on shiftTotal.agentID=DailyInput.agentID AND shiftTotal.inputDate=DailyInput.inputDate
        LEFT JOIN (SELECT max(Dials.talkMins+Dials.dialCount) as dialCount, Dials.agentID, Dials.dialDate FROM Dials GROUP BY Dials.agentID, Dials.dialDate) as dialsT ON dialsT.agentID=DailyInput.agentID AND dialsT.dialDate=DailyInput.inputDate
        LEFT JOIN (SELECT AVG(score) as QCscore, agentID, interviewDate, jobID FROM ViewQCscores WHERE isFinished=1 AND type='Call' GROUP BY agentID, interviewDate, jobID) as QCscores ON QCscores.agentID=DailyInput.agentID and QCscores.interviewDate=DailyInput.inputDate and QCscores.jobID=DailyInput.jobID
        LEFT JOIN ViewJobFullName on ViewJobFullName.jobID=DailyInput.jobID
    	full outer join (select absenceDate,absenceType,a.agentID,isnull(bookingTeamID,teamID) teamID from Absence a left join Booking b on b.bookingDate=a.absenceDate and b.agentID=a.agentID LEFT JOIN Agents on Agents.agentID=b.agentID where absenceType in ('No show','Sick') `+(teamID>0?` and isnull(bookingTeamID,teamID) in (`+teamID+`)`:'')+` and a.agentID=@aid) a on a.absenceDate=DailyInput.inputDate and a.agentID=DailyInput.agentID
    	LEFT JOIN (SELECT distinct bookingDate, Booking.agentID, isnull(bookingTeamID,teamID) as teamID, agentName FROM Booking LEFT JOIN Agents on Agents.agentID=Booking.agentID) Booking on Booking.agentID=isnull(DailyInput.agentID,a.agentID) AND Booking.bookingDate=isnull(DailyInput.inputDate,absenceDate)
      left join agentTeams t on t.agentTeamID=Booking.teamID
        WHERE isnull(DailyInput.inputDate,absenceDate)<cast(getdate() as date) `+(teamID>0?`AND isnull(Booking.teamID,a.teamID) in (`+teamID+`)`:'')+`
        GROUP BY DailyInput.jobID,DailyInput.projectID,isnull(DailyInput.inputDate,absenceDate),ViewJobFullName.jobName,isJobHourly,absenceType,dailyinput.inputDate,absenceDate,excludeFromDials
    `
    let agentQ=`
    SELECT sum(pay)/NULLIF(sum(sales),0) as contribution, max(dialCount)/sum(jobhrs) as avgDials, AVG(CAST(QCscore AS DECIMAL(10,2))) as QCscore,(0.00+count(distinct case when onTarget=1 then ot.inputDate end))/nullif(COUNT(distinct ot.inputdate),0) onTarget,SUM(hrs) hrs,(0.00+count(absenceType))/nullif(COUNT(distinct r.inputdate),0) percAbsent
      FROM
      #agentReportTab r
      left join getShiftsOnTarget(@stdate,@endate) ot on ot.agentID=@aid and ot.inputDate=r.inputDate
      LEFT JOIN (
        select sum(dialCount) dialCount from (
          SELECT max(d.talkMins+d.dialCount) as dialCount, d.agentID, d.dialDate FROM Dials d
          LEFT JOIN DailyInput i ON i.agentID=d.agentID and i.inputDate=d.dialDate
          LEFT JOIN Jobs ON Jobs.jobID=i.jobID
          where dialDate between @stdate AND @endate and d.agentID=@aid and isnull(excludeFromDials,0)=0
          GROUP BY d.agentID, d.dialDate
        ) dd
      ) d on 1=1
      WHERE r.inputDate BETWEEN @stdate AND @endate`
    let monthlyQ=`
    SELECT format(r.inputDate,'MMM-yy') mnth,ROUND(sum(cast(isEve as int))/COUNT(*),0) isEve,sum(pay)/NULLIF(sum(sales),0) as contribution, max(dialCount)/sum(jobhrs) as avgDials, AVG(CAST(QCscore AS DECIMAL(10,2))) as QCscore,(0.00+count(distinct case when onTarget=1 then ot.inputDate end))/nullif(COUNT(distinct ot.inputdate),0) onTarget,SUM(hrs) hrs,(0.00+count(absenceType))/nullif(COUNT(distinct r.inputdate),0) percAbsent
    FROM
    #agentReportTab r
  	left join getShiftsOnTarget('2019-01-01',DATEADD(day,-1,cast(getdate() as date))) ot on ot.agentID=@aid and ot.inputDate=r.sdate
    LEFT JOIN (
      select sum(dialCount) dialCount,format(dialDate,'MMM-yy') dialMnth from (
        SELECT max(d.talkMins+d.dialCount) as dialCount, d.agentID, d.dialDate FROM Dials d
        LEFT JOIN DailyInput i ON i.agentID=d.agentID and i.inputDate=d.dialDate
        LEFT JOIN Jobs ON Jobs.jobID=i.jobID
        where dialDate between @stdate AND @endate and d.agentID=@aid and isnull(excludeFromDials,0)=0
        GROUP BY d.agentID, d.dialDate
      ) dd
      group by format(dialDate,'MMM-yy')
    ) d on d.dialMnth=format(r.inputDate,'MMM-yy')
  	group by format(r.inputDate,'MMM-yy'),DATEPART(year,r.inputDate),datepart(month,r.inputdate)
  	order by DATEPART(year,r.inputDate),datepart(month,r.inputdate)
    DROP TABLE #agentReportTab`
    let jobQ=`
    SELECT r.jobID,projectID, jobName, sum(Ints) as Ints, isJobHourly,sum(jobhrs) jobhrs, min(r.inputDate) as dateStart, max(r.inputDate) as dateEnd, max(CPI) as CPI, sum(sales) as sales, sum(pay) as pay, sum(pay)/nullif(sum(sales),0) as contribution, sum(hrs) as hrs, sum(dials) as dials, AVG(QCscore) as QCscore,count(onTarget) onTarget,COUNT(r.jobID) shifts,(0.00+count(onTarget))/nullif(COUNT(r.jobID),0) onTargetPerc
    FROM
    #agentReportTab r
    left join getJobShiftsOnTarget(@stdate,@endate) ot on ot.agentID=@aid and ot.inputDate=r.inputDate and ot.jobID=r.jobID
    WHERE r.inputDate BETWEEN @stdate AND @endate and r.jobID is not null
    GROUP BY r.jobID, projectID,jobName, isJobHourly
    ORDER BY jobName ASC
    `
    let teamQ = `SELECT AgentTeams.teamName, AgentTeams.agentTeamID
    FROM AgentTeams
    WHERE AgentTeams.agentTeamID>1
    ORDER BY managerID`
    let prevO2oQ=`
    select * from AgentOne2ones where agentID=@aid order by o2oDate DESC`
    db.multiple=true
    db.input('stdate',new Date(startDate))
    db.input('endate',new Date(endDate))
    db.input('aid',intID)
    db.input('tid',teamID)
    db.batch(tableQ+agentQ+jobQ+monthlyQ+prevO2oQ, (err, statsR) =>{
      if (err) {
        console.log(err,tableQ+agentQ+jobQ+monthlyQ+prevO2oQ)
        res.send(err)
      }
      db.query(teamQ, (err, teamR) =>{
        db.query(intNameQuery, (err, nameResult) =>{
          if (err) {
            res.send(err)
          }
          breathReq.get('/employees/'+nameResult.recordset[0].breatheID)
          .then(response => {
            res.render('interviewer-overview.ejs', {
              title: "View Interviewers"
              ,intNames: nameResult.recordset[0]
              ,intStats: statsR.recordsets[0]
              ,jobs: statsR.recordsets[1]
              ,monthly: statsR.recordsets[2].reverse()
              ,prevO2os:statsR.recordsets[3]
              ,teams: teamR.recordset
              ,sessTeam: teamID
              ,stdate: startDate
              ,endate: endDate
              ,intAge: moment().diff(nameResult.recordset[0].agentDOB, 'years')
              ,intEmployed: moment().diff(nameResult.recordset[0].agentJoined, 'years') + ' years, ' + moment().diff(nameResult.recordset[0].agentJoined, 'months') % 12 + ' months'
              ,breatheAgent: response.data.employees[0]
            });
          }).catch(function (err) {
            res.render('interviewer-overview.ejs', {
              title: "View Interviewers"
              ,intNames: nameResult.recordset[0]
              ,intStats: statsR.recordsets[0]
              ,jobs: statsR.recordsets[1]
              ,monthly: statsR.recordsets[2].reverse()
              ,prevO2os:statsR.recordsets[3]
              ,teams: teamR.recordset
              ,sessTeam: teamID
              ,stdate: startDate
              ,endate: endDate
              ,intAge: moment().diff(nameResult.recordset[0].agentDOB, 'years')
              ,intEmployed: moment().diff(nameResult.recordset[0].agentJoined, 'years') + ' years, ' + moment().diff(nameResult.recordset[0].agentJoined, 'months') % 12 + ' months'
              ,breatheAgent: []
            });
          });
        })
      });
    });
  },

  interviewerPayPage: (req, res) => {
    let datesQuery =
          `SELECT Year(DailyInput.inputDate) AS Year
            FROM   DailyInput
            WHERE  Year(DailyInput.inputDate) > 1970
            GROUP  BY Year(DailyInput.inputDate)
            ORDER  BY Year(DailyInput.inputDate) ASC `;
    db.query(datesQuery, (err, dateResult) => {
      if(err){
        logger.info("failed to load interviewer pay page " + req.user.uName);
      }
      res.render('interviewer-pay-page.ejs',{
        message:""
        ,title: "Interviewer pay overview"
        ,dates: dateResult.recordset
      });
    });
  },

  interviewerPaySearch: (req, res) =>{
    req.params.year=req.params.year==0?moment().format("YYYY"):req.params.year
    req.params.month=req.params.month==0?moment().month()+1:req.params.month
    let searchYear = req.params.year
    let searchMonth = req.params.month
    let endDateM = moment.utc()
    endDateM.set('year',req.params.year)
    endDateM.set('month',req.params.month-1)
    let startDateM = moment.utc(endDateM)
    startDateM.subtract(1,'month')
    startDateM.set('date',14)
    endDateM.set('date',13)
    let endDate=endDateM.format("YYYY-MM-DD")
    let startDate=startDateM.format("YYYY-MM-DD")
    const monthNames = ["","January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    let shiftQ=`
    select
    isnull(payrollHours,0) hrs,
    hoursType,
    payrate*isnull(payrollHours,0) Pay,
    agentID,
    inputDate,
    band,cont,fatalCount,case when absenceType is null then null else 1 end absenceCount,absenceType,isnull(sales,0) sales,
    payrate,contractStart,contractName,isEve
    into ##tempP1
    from
    getPayrollHours(@stdate,@endate)
    where isnull(agentLeftP,@endate)>=@stdate

    select * from ##tempP1 order by inputDate ASC`
    let monthQ =`
    select agentLeft,agentJoined, payrollID, Agents.contractVersion,ac.contractName,Agents.contractStart, breatheID, agentDOB, datediff(year,agentDOB,getdate()) as agentAge,payRateOld,payRateNew,payRate,payRateOldFixed,payRateNewFixed,payRateFixed,isnull(hrsOldFixed,0) as hrsOldFixed, isnull(hrsNewFixed,0) as hrsNewFixed, isnull(hrsFixed,0) as hrsFixed,isnull(hrsOld,0) as hrsOld, isnull(hrsNew,0) as hrsNew, isnull(hrs,0) as hrs,isnull(PayFixed,0) as PayFixed,isnull(PayOldFixed,0) as PayOldFixed,isnull(PayNewFixed,0) as PayNewFixed,isnull(Pay,0) as Pay,isnull(PayOld,0) as PayOld,isnull(PayNew,0) as PayNew,(isnull(dateCount,0)+isnull(absenceCount,0)) as dateCount,DailyInput.agentID as agentID,Agents.agentName,isnull(PointsTable.bonus,0) as bonus, absenceCount, QCscore,isnull(PointsTable.cont*100,999) as cont,isnull(PointsTable.band,'') as band,case when hrs>0 then DailyInput.isEve else AgentTeams.isEve end isEve,isnull(bonusHours,0) bonusHours
          from
          (
          select
          agentID,contractName,sum(case when hrsFixed+hrsNonFixed>0 then 1 end) as dateCount,
          case when sum(isEve)>count(*)/2 then 1 else 0 end isEve,
          sum(PayrollPay) as Pay,
          sum(case when month(inputDate)=month(@stdate)+1 then PayrollPay else 0 end) as PayNew,
          sum(case when month(inputDate)=month(@stdate) then PayrollPay else 0 end) as PayOld,
          sum(PayrollPayFixed) as PayFixed,
          sum(case when month(inputDate)=month(@stdate)+1 then PayrollPayFixed else 0 end) as PayNewFixed,
          sum(case when month(inputDate)=month(@stdate) then PayrollPayFixed else 0 end) as PayOldFixed,
          sum(hrsNonFixed) as hrs,
          sum(case when month(inputDate)=month(@stdate) then hrsNonFixed else 0 end) as hrsOld,
          sum(case when month(inputDate)=month(@stdate)+1 then hrsNonFixed else 0 end) as hrsNew,
          sum(hrsFixed) as hrsFixed,
          sum(case when month(inputDate)=month(@stdate) then hrsFixed else 0 end) as hrsOldFixed,
          sum(case when month(inputDate)=month(@stdate)+1 then hrsFixed else 0 end) as hrsNewFixed,
          max(payRate) as payRate,
          max(case when month(inputDate)=month(@stdate) then payRate end) as payRateOld,
          max(case when month(inputDate)=month(@stdate)+1 then payRate end) as payRateNew,
          max(payRateFixed) as payRateFixed,
          max(case when month(inputDate)=month(@stdate) then payRateFixed end) as payRateOldFixed,
          max(case when month(inputDate)=month(@stdate)+1 then payRateFixed end) as payRateNewFixed,
          AVG(CAST(QCscore AS DECIMAL(10,2))) as QCscore
          from
          (
          select agentID,inputDate,contractName,absenceCount,isEve,
          case when hoursType<>'Variable' then hrs else 0 end hrsFixed,
          case when hoursType<>'Variable' then 0 else hrs end hrsNonFixed,
          case when hoursType<>'Variable' then Pay else 0 end PayrollPayFixed,
          case when hoursType<>'Variable' then 0 else Pay end PayrollPay,
          hrs Hours,
          case when hoursType<>'Variable' then null else payRate end payRate,
          case when hoursType<>'Variable' then payRate else null end payRateFixed,
          QCscore
          from
          ##tempP1 d
          outer apply (SELECT AVG(score+controllerScore) as QCscore FROM QualityControl WHERE isFinished=1 AND type='Call' and agentID=d.agentID and interviewDate=inputDate) qc
          ) x
          group by agentID,contractName
        ) as DailyInput
        left join Agents
          on Agents.agentID=DailyInput.agentID
        left join agentContracts ac on ac.contractID=Agents.contractVersion
        left join AgentTeams
          on AgentTeams.AgentTeamID=Agents.teamID
        left join getBonus(@stdate,@endate,`+req.params.clientExcl+`) PointsTable
          on PointsTable.agentID=DailyInput.agentID
          where DailyInput.agentID>1 and DailyInput.agentID NOT IN (`+freeAgents.join(",")+`) and (hrsFixed+hrs>0 OR isnull(ac.fixedHours,0)=0)
      order by Agents.agentName

      drop table ##tempP1`;
    let jobQ=`
    select jobName, agentID, inputDate, sum(inputHours) as hrs,excludeFromBonus from
    DailyInput left join ViewJobFullName on ViewJobFullName.jobID=DailyInput.jobID
    WHERE inputDate BETWEEN @stdate and @endate
    GROUP BY jobName, agentID, inputDate, excludeFromBonus`
    let bonusScoringQ=`select top 5 * from BonusScoringNew where dateFrom<'` + startDate + `' order by dateFrom DESC,scoreID DESC`
    let hourBandingQ=`select top 4 hourBand,addBonus from BonusHourBands where '` + startDate + `' >= fromDate ORDER BY fromDate DESC,hourBand ASC`
    let maxWageQ=`SELECT TOP 1 payrate as maxPayRate
                        FROM      PayRates
                        WHERE   '`+startDate+`' >= dateFrom
                        ORDER BY dateFrom DESC,payRate DESC`
    let thisDb=new sql.Request();
    thisDb.input('stdate',new Date(startDate))
    thisDb.input('endate',new Date(moment.min(moment.utc().subtract(1,'d'),moment.utc(endDate)).format("YYYY-MM-DD")))
    console.log("running SQL queries")
    console.log(new Date(startDate),new Date(moment.min(moment.utc().subtract(1,'d'),moment.utc(endDate)).format("YYYY-MM-DD")))
    thisDb.multiple=true
    thisDb.batch(shiftQ+monthQ, (err, monthR) =>{
      if(err){
        logger.info("failed to month stats for interviewer pay " + req.user.uName);
        console.log(monthQ,shiftQ,err)
        //res.redirect("/home");
      }
      console.log("monthQ done")
      // db.batch(shiftQ, (err, shiftR) =>{
      //   if(err){
      //     logger.info("failed to get shift stats for interviewer pay " + req.user.uName);
      //     console.log(shiftQ,err)
      //     //res.redirect("/home");
      //   }
      //   console.log("shiftQ done")
        thisDb.batch(jobQ, (err, jobR) =>{
          if(err){
            logger.info("failed to get job stats for interviewer pay " + req.user.uName);
            console.log(err)
            //res.redirect("/home");
          }
          console.log("jobQ done")
          thisDb.query(bonusScoringQ, (err, bonusScoringR) =>{
            if(err){
              logger.info("failed to get job stats for interviewer pay " + req.user.uName);
              console.log(err)
              //res.redirect("/home");
            }
            console.log("bonusScoringQ done")
            thisDb.query(maxWageQ, (err, maxWageR) =>{
              if(err){
                logger.info("failed to get job stats for interviewer pay " + req.user.uName);
                console.log(err)
                //res.redirect("/home");
              }
              console.log("maxWageQ done")
              thisDb.query(hourBandingQ, (err, hourBandingR) =>{
                if(err){
                  logger.info("failed to get job stats for interviewer pay " + req.user.uName);
                  console.log(err)
                  //res.redirect("/home");
                }
                console.log("hourBandingQ done")
                console.log('getting getBreatheEmployees')
                getBreatheEmployees(true).then(breatheEmps=>{
                  console.log('got getBreatheEmployees')
                  res.render('interviewer-pay-overview.ejs', {
                    message: ""
                    ,title: "Pay for "+monthNames[parseInt(searchMonth)]
                    ,monthStats: monthR.recordsets[1]
                    ,shiftStats: JSON.stringify(monthR.recordsets[0])
                    ,jobs: JSON.stringify(jobR.recordset)
                    ,searchYear: searchYear
                    ,searchMonth: searchMonth
                    ,startDate: startDate
                    ,endDate: endDate
                    ,breatheAgents: breatheEmps
                    ,bonusScoring:bonusScoringR.recordset
                    ,hourBanding:hourBandingR.recordset
                    ,maxPayRate:maxWageR.recordset[0].maxPayRate
                    ,clientExcl:req.params.clientExcl
                  });
                })
              })
            })
          })
        })
      // });
    });
  },

  editPayRates: (req, res) =>{
    let today = dateIf(new Date(),"-","r");
    let rateQuery = "SELECT * FROM PayRates WHERE PayRateID>1 ORDER BY dateFrom ASC"
    db.query(rateQuery, (err, rateResult) =>{
      res.render('update-pay-rates.ejs', {
        title: 'Edit Pay Rates',
        message: '',
        rates: rateResult.recordset
      });
    })
  },

  updatePayRates: (req, res) =>{
    let rate_1 = req.body.rate_1;
    let rate_2 = req.body.rate_2;
    let rate_3 = req.body.rate_3;
    let rate_4 = req.body.rate_4;
    let rate_date = req.body.rate_date;
    let rateQuery1 = "INSERT INTO PayRates (Age, payRate, dateFrom) VALUES (16, " + rate_1 + ", '" + rate_date + "')"
    let rateQuery2 = "INSERT INTO PayRates (Age, payRate, dateFrom) VALUES (18, " + rate_2 + ", '" + rate_date + "')"
    let rateQuery3 = "INSERT INTO PayRates (Age, payRate, dateFrom) VALUES (21, " + rate_3 + ", '" + rate_date + "')"
    let rateQuery4 = "INSERT INTO PayRates (Age, payRate, dateFrom) VALUES (23, " + rate_4 + ", '" + rate_date + "')"
    let today = dateIf(new Date(),"-","r");
    let rateQuery = "SELECT TOP 4 * FROM PayRates WHERE dateFrom <= '" + today + "' ORDER BY PayRateID DESC"
    db.query(rateQuery4, (err4, rateResult4) =>{
      db.query(rateQuery3, (err3, rateResult3) =>{
        db.query(rateQuery2, (err2, rateResult2) =>{
          db.query(rateQuery1, (err1, rateResult1) =>{
            db.query(rateQuery, (err1, rateResult) =>{
              logger.info(req.user.uName + " updated pay rates");
              res.render('update-pay-rates.ejs', {
                title: 'Edit Pay Rates',
                message: 'Pay rates update',
                rates: rateResult.recordset
              });
            });
          });
        });
      });
    });
  },
  leagueTable: (req, res) =>{
    let intQuery = `
    SELECT shifts.agentID,
    agentName,
    Ints,
    hrs,
    Pay,
    Sales,
    isnull((onTarget/shifts)*100,0) onTarget,
    teamName,
    isRemote,
    qcScore,
    hrsPerWeek,
    t.isEve,
	isnull((0.00+absences)/shifts,0) absencePerShift,
	isnull((0.00+lates)/shifts,0) latesPerShift
    FROM
    (
    select p.agentID,SUM(ints) ints,SUM(Hours) hrs,SUM(pay) pay,SUM(sales) sales,AVG(score) qcScore,COUNT(distinct inputDate) shifts
    from
    getAgentShifts(@ltst,@lten) p
    left join Jobs j on j.jobID=p.jobID
    left join ViewJobsStats js on js.jobID=p.jobID
    left join (select interviewDate,agentID,jobID,cast(AVG(score) as decimal(10,2)) score from ViewQCscores qc where qc.isFinished=1 and qc.type='Call' group by agentID,interviewDate,jobID) q on q.agentID=p.agentID and q.interviewDate=p.inputDate and q.jobID=p.jobID
    where p.agentID > 1
    group by p.agentID HAVING Sum(Hours)>0
    ) shifts
    left join (select agentID,COUNT(*) absences from Absence where absenceDate between @ltst and @lten and absenceType in ('Sick','Cancelled by agent','No show') group by agentID) ab on ab.agentID=shifts.agentID
    left join (select agentID,count(latemins) lates from Lateness group by agentID) l on l.agentID=shifts.agentID
    left join (select agentID,avg(0.00+hrs) hrsPerWeek from (
  		select agentID,DATEADD(day,-datepart(weekday,inputDate)+1,inputDate) wk,SUM(inputHours) as hrs
  		from DailyInput
  		where inputDate between @ltst and @lten
  		group by agentID,DATEADD(day,-datepart(weekday,inputDate)+1,inputDate)
  		) di
  		group by agentID
    ) hrsPW on hrsPW.agentID=shifts.agentID
    left join (
    	select agentID,sum(CAST(isnull(onTarget,0) AS DECIMAL(10,2))) as onTarget from (
    		SELECT DailyInput.inputDate, DailyInput.agentID, MIN(CASE WHEN DailyInput.InputInterviews / DailyInput.InputHours>=isnull(jt.hourlyTarget,Jobs.hourlyTarget) THEN 1 ELSE NULL END) AS onTarget
    		FROM
    		DailyInput outer apply
    		(select top 1 * from PastJobTargets p where p.dateUntil>DailyInput.inputDate and p.jobID=DailyInput.jobID) jt,
    		Jobs
    		WHERE DailyInput.InputHours>0 AND DailyInput.InputInterviews>0 AND Jobs.jobID = DailyInput.jobID and inputDate between @ltst and @lten
    		GROUP BY DailyInput.agentID, DailyInput.inputDate
    		) ont
    	group by agentID
    ) ot on ot.agentID=shifts.agentID
    left join Agents a on a.agentID=shifts.agentID
    LEFT JOIN AgentTeams t ON a.teamID=t.agentTeamID
    WHERE
    a.agentLeft is NULL
    and a.agentID not in (`+freeAgents.join(",")+`)
    and Sales > 0
    ORDER BY hrs DESC`;
    db.input('ltst',currPayPeriodSt)
    db.input('lten',moment.min(moment().subtract(1,'d'),moment(currPayPeriodEn)).format("YYYY-MM-DD"))
    db.query(intQuery, (err, intResult) =>{
      if (err) {
        console.log(err)
      }else {
        res.render('interviewer-league.ejs', {
          title: 'League Table',
          message: '',
          jobType: ["All"],
          interviewers: intResult.recordset,
          minHrs: 0,
          endate: currPayPeriodEn,
          stdate: currPayPeriodSt
        });
      }
    });
  },
  leagueTablePost: (req, res) =>{
    req.body.jobType=Array.isArray(req.body.jobType)?req.body.jobType:[req.body.jobType]
    console.log(req.body.jobType)
    let intQuery=`
    declare @st date='`+req.body.stdate+`'
    declare @en date='`+moment.min(moment().subtract(1,'d'),moment(req.body.endate)).format("YYYY-MM-DD")+`'

    SELECT shifts.agentID,
    agentName,
    Ints,
    hrs,
    Pay,
    Sales,
    (onTarget/shifts)*100 onTarget,
    teamName,
    isRemote,
    qcScore,
    hrsPerWeek,
    t.isEve,
	isnull((0.00+absences)/shifts,0) absencePerShift,
	isnull((0.00+lates)/shifts,0) latesPerShift
    FROM
    (
    select p.agentID,SUM(ints) ints,SUM(Hours) hrs,SUM(pay) pay,SUM(sales) sales,AVG(score) qcScore,COUNT(distinct inputDate) shifts
    from
    getAgentShifts(@st,@en) p
    left join Jobs j on j.jobID=p.jobID
    left join ViewJobsStats js on js.jobID=p.jobID
    left join (select interviewDate,agentID,jobID,cast(AVG(score) as decimal(10,2)) score from ViewQCscores qc where qc.isFinished=1 and qc.type='Call' group by agentID,interviewDate,jobID) q on q.agentID=p.agentID and q.interviewDate=p.inputDate and q.jobID=p.jobID
    where p.agentID > 1 `+(req.body.jobType[0]?"AND ("+req.body.jobType.map(j=>"j."+j+"=1").join(" AND ")+")":"")+`
    group by p.agentID HAVING Sum(Hours)>`+req.body.minHrs+`
    ) shifts
    left join (select agentID,COUNT(*) absences from Absence where absenceDate between @st and @en and absenceType in ('Sick','Cancelled by agent','No show') group by agentID) ab on ab.agentID=shifts.agentID
    left join (select agentID,count(latemins) lates from Lateness group by agentID) l on l.agentID=shifts.agentID
    left join (select agentID,avg(0.00+hrs) hrsPerWeek from (
  		select agentID,DATEADD(day,-datepart(weekday,inputDate)+1,inputDate) wk,SUM(inputHours) as hrs
  		from DailyInput
  		where inputDate between @st and @en
  		group by agentID,DATEADD(day,-datepart(weekday,inputDate)+1,inputDate)
  		) di
  		group by agentID
    ) hrsPW on hrsPW.agentID=shifts.agentID
    left join (
    	select agentID,sum(CAST(isnull(onTarget,0) AS DECIMAL(10,2))) as onTarget from (
    		SELECT DailyInput.inputDate, DailyInput.agentID, MIN(CASE WHEN DailyInput.InputInterviews / DailyInput.InputHours>=isnull(jt.hourlyTarget,Jobs.hourlyTarget) THEN 1 ELSE NULL END) AS onTarget
    		FROM
    		DailyInput outer apply
    		(select top 1 * from PastJobTargets p where p.dateUntil>DailyInput.inputDate and p.jobID=DailyInput.jobID) jt,
    		Jobs
    		WHERE DailyInput.InputHours>0 AND DailyInput.InputInterviews>0 AND Jobs.jobID = DailyInput.jobID and inputDate between @st and @en `+(req.body.jobType[0]?"AND ("+req.body.jobType.map(j=>"jobs."+j+"=1").join(" AND ")+")":"")+`
    		GROUP BY DailyInput.agentID, DailyInput.inputDate
    		) ont
    	group by agentID
    ) ot on ot.agentID=shifts.agentID
    left join Agents a on a.agentID=shifts.agentID
    LEFT JOIN AgentTeams t ON a.teamID=t.agentTeamID
    WHERE
    a.agentLeft is NULL
    and a.agentID not in (`+freeAgents.join(",")+`)
    and Sales > 0
    ORDER BY hrs DESC`
    db.query(intQuery, (err, intResult) =>{
      if (err) {
        console.log(err,intQuery)
      }else {
        res.render('interviewer-league.ejs', {
          title: 'League Table',
          message: '',
          jobType: req.body.jobType,
          interviewers: intResult.recordset,
          minHrs: req.body.minHrs,
          endate: req.body.endate,
          stdate: req.body.stdate
        });
      }
    });
  },
  loadTeamManagement: (req, res) => {
    let teamNameQ = `SELECT AgentTeams.teamName, AgentTeams.agentTeamID, AgentTeams.managerID, Staff.staffName, AgentTeams.isDay, AgentTeams.isEve, AgentTeams.teamColour,agentTeams.ringCentralID,emailCC,isAllocatable,initialTrainingDays
    FROM AgentTeams, Staff
    WHERE AgentTeams.managerID = Staff.staffID AND AgentTeams.agentTeamID<>1
    ORDER BY AgentTeams.managerID DESC`
    let agentQ=`SELECT Agents.agentName, Agents.agentID, AgentTeams.teamName, AgentTeams.agentTeamID, agents.ringCentralID
    FROM Agents, AgentTeams
    WHERE Agents.teamID = AgentTeams.agentTeamID AND Agents.agentLeft IS NULL AND Agents.agentID>1
    ORDER BY Agents.agentName`
    let managerQ=`SELECT Staff.staffID, Staff.staffName
    FROM Staff
    WHERE Staff.staffJobTitleID in (8,18,19) AND Staff.staffLeft IS NULL`
    let staffQ=`SELECT Staff.staffID, Staff.staffName, staffEmail
    FROM Staff
    WHERE Staff.staffLeft IS NULL and staffID>1
    ORDER BY staffName`
    db.query(teamNameQ, (err, teamsResult) => {
      if (err) {
          logger.info("Error fetching team names while adding a new interviewer "+req.user.uName);
          //res.redirect("/home");
      }else {
        db.query(agentQ, (err, agentResult) => {
          if (err) {
              logger.info("Error fetching agents while adding a new interviewer "+req.user.uName);
              //res.redirect("/home");
          }else {
            db.query(managerQ, (err, managerResult) => {
              if (err) {
                  logger.info("Error fetching agents while adding a new interviewer "+req.user.uName);
                  //res.redirect("/home");
              }else {
                db.query(staffQ, (err, staffR) => {
                  if (err) {
                      logger.info("Error fetching agents while adding a new interviewer "+req.user.uName);
                      //res.redirect("/home");
                  }else {
                    rcPlatform.get("/restapi/v1.0/account/~/extension/",{type:'Department',status:'Enabled'}).then(function(extResp){
                      extResp.json().then(function(ext){
                        res.render('team-management.ejs', {
                          title: "Team Management"
                          ,message: ''
                          ,teams: teamsResult.recordset
                          ,agents: agentResult.recordset
                          ,managers: managerResult.recordset
                          ,rcGroups:ext.records
                          ,staff:staffR.recordset
                        });
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
  },
  getPayrollExcel:(req,res)=>{
    console.log(req.body)
    const ExcelJS = require('exceljs');
    const fs = require('fs');
    const fsx = require("fs-extra");
    const workbook = new ExcelJS.Workbook();
    async function recurse(func,arr,ws){
      return new Promise((resolve,reject)=>{
        let i=0
        async function loop(){
          if (arr[i]) {
            // console.log(func,arr[i])
            await func(arr[i],ws)
            i++
            loop()
          }else {
            resolve()
          }
        }
        loop()
      })
    }
    let fillFormulas=(col,ws)=>ws.fillFormula(col+'2:'+col+(req.body.rows.length+1), ws.getCell(col+'2').formula, 0)
    let shiftFormulas=(col,ws)=>ws.getCell(col+'3').value = {
      formula: ws.getCell(col+'2').formula,
      result: 0,
      shareType: 'shared',
      ref: col+'2:'+col+(req.body.rows.length+1)
    };
    async function formulaCols(ws){
      let arr=[]
      await ws.getRow(2).eachCell(cell=>{
        if (cell.formula) {
          arr.push(cell._address.replace(/[0-9]/g, ''))
        }
      })
      return arr
    }
    let template=req.body.month=='April'?'/Payroll template April.xlsx':'/Payroll template.xlsx'
    workbook.xlsx.readFile(publicPath+'/templates/'+template).then(function(){
      const worksheet = workbook.getWorksheet('Sheet1')
      const rows = req.body.rows
      const headers = worksheet.getRow(1);
      let c=0
      function addKeys(){
        if (c<worksheet.columns.length) {
          worksheet.getColumn(c+1).key=headers.getCell(c+1).value
          c++
          addKeys()
        }else {
          worksheet.addRows(rows, 'i+')
          let colRefs=formulaCols(worksheet)
          formulaCols(worksheet).then(colRefs=>{
            recurse(fillFormulas,colRefs,worksheet).then(e=>{
              recurse(shiftFormulas,colRefs,worksheet).then(e=>{
                worksheet.spliceRows(2, 1);
                recurse(fillFormulas,colRefs,worksheet).then(e=>{
                  async function writeExcel(){
                    await workbook.xlsx.writeFile(publicPath + '/temp/Payroll export for '+req.body.month+' '+req.body.year+'.xlsx');
                    res.send('/temp/Payroll export for '+req.body.month+' '+req.body.year+'.xlsx')
                  }
                  writeExcel()
                })
              })
            })
          })
        }
      }
      addKeys()
    })
  },
  updateAgentTeam: (req, res) => {
    let data=req.body
    let gradQ=`select * from agents a left join agentTeams t on t.agentTeamID=a.teamID where agentID=`+data[0].agentID
    let updateQ=`UPDATE Agents SET Agents.teamID = `+data[0].agentTeamID+` WHERE Agents.agentID=`+data[0].agentID
    db.query(gradQ, (err, gradR) => {
      console.log(gradR.recordset[0],gradR.recordset[0].isAllocatable!=1)
      if (gradR.recordset[0].isAllocatable!=1) {
        db.query("update agents set graduated=getdate() where agentID="+data[0].agentID)
      }
      db.query(updateQ, (err, updateResult) => {
        if (err) {
          logger.info("Error changing agent team Agents.teamID = "+data[0].agentTeamID+" Agents.agentID="+data[0].agentID +" - "+req.user.uName);
          res.status(500).send({error: 'Could not update interviewer team'});
        }else {
          rcPlatform.put('/restapi/v1.0/account/~/extension/'+data[0].agentRCID+'/call-queues/', {
            records:[
              {id:data[0].teamRCID}
            ],
          }).then(function(e){
            res.send("Success")
          }).catch(function(err){
            console.log(err)
            res.status(500).send({error: 'Could not update interviewer team in Ring Central'});
          })
        }
      })
    })
  },
  updateTeam: (req, res) => {
    let data={}
    for (const [key, value] of Object.entries(req.body[0])) {
      if (!value) {
        data[key]='null'
      }else {
        data[key]=value
      }
    }
    let updateQ=`
    UPDATE AgentTeams SET
    teamName = @teamName,
    managerID = `+(data.managerID!=='null'?data.managerID:0)+`,
    isEve = `+data.isEve+`,
    isDay = `+data.isDay+`,
    teamColour = '`+data.teamColour+`',
    ringCentralID = '`+data.ringCentralID+`',
    emailCC = '`+data.emailCC+`',
    isAllocatable = `+data.isAllocatable+`
    WHERE
    AgentTeams.agentTeamID=`+data.agentTeamID
    db.input('teamName',data.teamName)
    db.query(updateQ, (err, updateResult) => {
      if (err) {
        logger.info("Error updating team",err,updateQ);
        res.status(500).send({error: 'Could not update team name'});
        console.log(err,updateQ)
      }else {
        console.log(data.ringCentralID)
        // if (data.ringCentralID!=='null') {
        //   rcPlatform.put('/restapi/v1.0/account/~/extension/'+data.ringCentralID,{contact:{firstName:data.teamName,pronouncedName:{text:data.teamName}}}).then(function(r){
        //     r.json().then(function(r){
        //       console.log("updated team name in RC",data.teamName)
        //       res.send("Success")
        //     })
        //   }).catch(err=>res.status(500).send({error: 'Could not update Ring Central team'}))
        // }else {
          res.send("Success")
        // }
      }
    })
  },
  loadCoaching: (req, res) => {
    req.params.stdate=req.params.stdate==0?currPayPeriodSt:req.params.stdate
    req.params.endate=req.params.endate==0?currPayPeriodEn:req.params.endate
    var stDate=req.params.stdate
    var enDate=req.params.endate
    let agentsQ = `SELECT Agents.agentName, Agents.agentID
    FROM Agents
    WHERE Agents.agentLeft IS NULL AND Agents.agentID>1
    ORDER BY Agents.agentName`
    let issuesQ = `SELECT issueID, issue FROM CoachingIssuesRef where inUse=1`
    let jobsQ=`SELECT Jobs.jobID, Jobs.jobName, Quotes.quoteName, Quotes.quoteNo
    FROM Jobs, Projects, Quotes
    WHERE
    Quotes.quoteID=Projects.quoteID
    AND projects.projectID=Jobs.projectID
    AND Jobs.projectID>2
    AND Jobs.isJobCATI=1
    AND Jobs.endDate>Dateadd(Month, Datediff(Month, 0, DATEADD(m, -6,
    current_timestamp)), 0)`
    let coachingQ=`SELECT c.coachingID, AgentPlans.coachingFollowUpDate as followUpDate, AgentPlans.coachingFollowedUpDate, AgentPlans.pdpEndDate, c.coachingDate, c.agentID, Agents.agentName, issuesCount, AgentTeams.teamName, ViewJobFullName.jobName, coachingType,type qcType
    FROM CoachingNew c
    left join QualityControl qc on qc.coachingID=c.coachingID
    left join (select coachingID, count(coachingID) as issuesCount from CoachingIssues group by coachingID) Coaching on Coaching.coachingID=c.coachingID
    left join AgentPlans on AgentPlans.coachingID=c.coachingID,
  	Agents, AgentTeams, ViewJobFullName
    WHERE Agents.agentID=c.agentID AND Agents.teamID=AgentTeams.agentTeamID AND c.agentID>1 AND ViewJobFullName.jobID=c.jobID and coachingDate BETWEEN '`+stDate+`' AND '`+enDate+`'
    ORDER BY c.coachingID DESC`
    let advisoriesQ=`SELECT CoachingIssues.coachingID, CoachingIssuesRef.issue
    FROM CoachingNew
    LEFT JOIN CoachingIssues on CoachingIssues.coachingID=CoachingNew.coachingID
    LEFT JOIN CoachingIssuesRef ON CoachingIssuesRef.issueID=CoachingIssues.issueID
    WHERE CoachingNew.coachingDate BETWEEN '`+stDate+`' AND '`+enDate+`'`
    let cStatsQ=`SELECT count(distinct CoachingNew.coachingID) as sessionsCount, sum(Coaching.issuesCount) as issuesCount, AgentTeams.teamName, AgentTeams.managerID
    FROM CoachingNew LEFT JOIN (select count(issueID) as issuesCount, coachingID from CoachingIssues group by coachingID) Coaching on Coaching.coachingID=CoachingNew.coachingID, AgentTeams, Agents
    WHERE
    Agents.agentID=CoachingNew.agentID
    AND Agents.teamID=AgentTeams.agentTeamID
    AND CoachingNew.coachingDate BETWEEN '`+stDate+`' AND '`+enDate+`'
	GROUP BY AgentTeams.teamName, AgentTeams.managerID`
    let cStatsTLQ=`SELECT count(distinct CoachingNew.coachingID) as sessionsCount, sum(Coaching.issuesCount) as issuesCount, AgentTeams2.managerID
    FROM CoachingNew
	LEFT JOIN (select count(issueID) as issuesCount, coachingID from CoachingIssues group by coachingID) Coaching on Coaching.coachingID=CoachingNew.coachingID,
	AgentTeams, AgentTeams as AgentTeams2, Agents
    WHERE
    Agents.agentID=CoachingNew.agentID
    AND Agents.teamID=AgentTeams.agentTeamID
	  AND CoachingNew.staffID=AgentTeams2.managerID
    AND CoachingNew.coachingDate BETWEEN '`+stDate+`' AND '`+enDate+`'
    GROUP BY AgentTeams2.managerID`
    let staffQ=`select * from staff where staffLeft is null and staffID>1 order by staffName`
    db.query(agentsQ, (err, agentsResult) => {
      if (err) {
          logger.info("Error fetching agents while getting coaching page "+req.user.uName);
          console.log(err)
          //res.redirect("/home");
      }else {
        db.query(issuesQ, (err, issuesResult) => {
          if (err) {
              logger.info("Error fetching issues while getting coaching page "+req.user.uName);
              console.log(err)
              //res.redirect("/home");
          }else {
            db.query(jobsQ, (err, jobsResult) => {
              if (err) {
                  logger.info("Error fetching jobs while getting coaching page "+req.user.uName);
                  console.log(err)
                  //res.redirect("/home");
              }else {
                db.query(coachingQ, (err, coachingR) => {
                  if (err) {
                      logger.info("Error fetching coaching sessions while getting coaching page "+req.user.uName);
                      console.log(err)
                      //res.redirect("/home");
                  }else {
                    db.query(advisoriesQ, (err, advisoriesR) => {
                      if (err) {
                          logger.info("Error fetching advisories while getting coaching page "+req.user.uName);
                          console.log(err)
                          //res.redirect("/home");
                      }else {
                        db.query(cStatsQ, (err, cStatsR) => {
                          if (err) {
                              logger.info("Error fetching advisories while getting coaching page "+req.user.uName);
                              console.log(err)
                              //res.redirect("/home");
                          }else {
                            db.query(cStatsTLQ, (err, cStatsTLR) => {
                              if (err) {
                                  logger.info("Error fetching advisories while getting coaching page "+req.user.uName);
                                  console.log(err)
                                  //res.redirect("/home");
                              }else {
                                db.query(staffQ, (err, staffR) => {
                                  if (err) {
                                      logger.info("Error fetching staff while getting coaching page "+req.user.uName);
                                      console.log(err)
                                      //res.redirect("/home");
                                  }else {
                                    res.render('add-coaching.ejs', {
                                      title: "Add coaching"
                                      ,message: ''
                                      ,issues: issuesResult.recordset
                                      ,agents: agentsResult.recordset
                                      ,jobs: jobsResult.recordset
                                      ,sessions: coachingR.recordset
                                      ,advisories: advisoriesR.recordset
                                      ,cStats: cStatsR.recordset
                                      ,cStatsTL: cStatsTLR.recordset
                                      ,stdate: req.params.stdate
                                      ,endate: req.params.endate
                                      ,staff:staffR.recordset
                                      ,tabulatorUpdated:true
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
          }
        })
      }
    })
  },
  getQCissuesForCoaching: (req, res) => {
    console.log(req.body[0].QCID)
    let issueQ=`
    select CoachingIssuesRef.issueID
    from
    QCissues
    left join CoachingIssuesRef on CoachingIssuesRef.QCissueID=QCissues.issueID
    where CoachingIssuesRef.issueID IS NOT NULL and qualityControlID IN (`+req.body[0].QCID.join(",")+`)`
    db.query(issueQ, (err, issueR) => {
      if (err) {
        console.log(err)
        console.log(issueQ)
        res.status(500).send({error: 'Could not get advisories from QC'});
      }else {
        res.send(JSON.stringify(issueR.recordset))
      }
    })
  },
  addCoaching: (req, res) => {
    var staffID=0
    let coachID=0
    let otherIssues=req.body.otherTotal.split(";")
    if( typeof req.body.issue === 'string' ) {
      if (req.body.issue.indexOf(",")>-1) {
        req.body.issue=req.body.issue.split(",")
      }else {
        req.body.issue = [ req.body.issue ];
      }
    }
    let today = dateIf(new Date(),"-","r");
    let QCID=JSON.parse(req.body.QCID)
    QCID=Array.isArray(QCID)?QCID:[QCID]
    db.query("select u.staffID,staffName from users u left join Staff s on s.staffID=u.staffID WHERE userID="+req.user.user, (err, staffResult) => {
      if (err) {
          logger.info(err);
          console.log(err)
      }else {
        staffID=staffResult.recordset[0].staffID
        let addQ=`INSERT INTO CoachingNew(agentID,jobID,coachingDate,staffID,coachingType)
        VALUES (`+req.body.agent+`, `+req.body.job+`,'`+req.body.coachDate+`',`+staffID+`,'`+req.body.type+`')
        SELECT SCOPE_IDENTITY() as coachingID`
        db.query(addQ, (err, addR) => {
          if (err) {
            logger.info("Error adding coaching "+req.user.uName);
            logger.info(err)
            console.log(err)
            console.log(addQ)
          }else {
            logger.info("coaching added",addQ)
            coachID=addR.recordset[0].coachingID
            let qcQ=`
            select qualityControlID,type,agentName,jobName fullJobName,interviewDate,dateMonitored,isnull(s.score,100) score from
            QualityControl q
            left join ViewQCscoresMin s on s.QCID=q.qualityControlID
            left join Agents a on a.agentID=q.agentID
            left join ViewJobFullName j on j.jobID=q.jobID
            where qualityControlID in (`+QCID.join(",")+`)`
            db.query(qcQ,(err,qcR)=>{
              if (err) {
                console.log(err)
              }else {
                let x=0
                function updateQCs(){
                  let el=QCID[x]
                  let qc=qcR.recordset.find(q=>q.qualityControlID==el)
                  if (el && qc) {
                    db.query("update qualityControl set coachingID="+coachID+" where qualityControlID="+el)
                    let qcInfo=`
                    <table>
                    <tr><td>Original QC check:</td><td>http://job-analysis:8080/edit-qc-check/`+el+`</td></tr>
                    <tr><td>Type:</td><td>`+qc.type+`</td></tr>
                    <tr><td>Agent:</td><td>`+qc.agentName+`</td></tr>
                    <tr><td>Job:</td><td>`+qc.fullJobName+`</td></tr>
                    <tr><td>Call date:</td><td>`+moment(qc.interviewDate).format("DD/MM/YYYY")+`</td></tr>
                    <tr><td>Monitored date:</td><td>`+moment(qc.dateMonitored).format("DD/MM/YYYY")+`</td></tr>
                    <tr><td>Score:</td><td>`+qc.score+`</td></tr>
                    </table>
                    `
                    let mailOptions = {
                      to: ['cath@teamsearchmr.co.uk'],
                      // to: 'matt@teamsearchmr.co.uk',
                      subject: 'QC '+(qc.type=='Intro'?'Intro Check':'Monitoring')+' #'+el+' has been fed back',
                      html: '<p>' + 'This QC '+(qc.type=='Intro'?'intro check':'call monitoring')+' has now been fed back by '+staffResult.recordset[0].staffName+':<br><br>'+qcInfo + footer + '</p>'
                    };
                    transporter.sendMail(mailOptions, (error, info) => {
                      if (error) {
                        return console.log(error);
                        logger.info(req.user.uName + " failed to send QC email to "+emailTo+": "+err)
                      }else {
                        x++
                        updateQCs()
                      }
                    });
                  }else if (x==0) {
                    logger.info("Added a QC coaching without a QC",el,qc,QCID,coachID)
                    transporter.sendMail({from:'reports@teamsearchmr.co.uk',to:'matt@teamsearchmr.co.uk',subject:'JA2 Error',html:'<b>Added a QC coaching without a QC:</b><br>'+el+'<br>'+qc+'<br>'+QCID+'<br>'+coachID})
                  }
                }
                updateQCs()
              }
            })
            if (req.body.audited=="on") {
              db.query("insert into Audits (auditorID,auditeeID,auditDate,category,categoryID) VALUES ("+req.body.auditor+","+staffID+",getdate(),'Coaching',"+coachID+")", (err, addR) => {
                if (err) {
                  logger.info("Error adding coaching "+req.user.uName);
                  logger.info(err)
                  console.log(err)
                  console.log(addQ)
                }
              })
            }
            if (req.body.issue!=undefined) {
              req.body.issue.forEach((issue, i) => {
                if (issue=="Other") {
                  otherIssues.forEach((other, i2) => {
                    let addQ=`INSERT INTO CoachingIssuesRef(issue)
                    VALUES (@otherIssue`+i2+`)
                    SELECT SCOPE_IDENTITY() as issueID`
                    db.input('otherIssue'+i2,other)
                    db.query(addQ, (err, addR2) => {
                      if (err) {
                        logger.info("Error adding to CoachingIssuesRef "+req.user.uName);
                        console.log(err+"..."+addQ)
                      }else {
                        logger.debug("added other issue to ref")
                        let addQ=`INSERT INTO CoachingIssues(issueID,coachingID)
                        VALUES (`+addR2.recordset[0].issueID+`, `+coachID+`)`
                        db.query(addQ, (err, addR3) => {
                          if (err) {
                            logger.info("Error adding to CoachingIssues "+req.user.uName);
                            console.log(err+"..."+addQ)
                          }
                        })
                      }
                    })
                  });
                }else {
                  addQ=`INSERT INTO CoachingIssues(issueID,coachingID)
                  VALUES (`+issue+`, `+coachID+`)`
                  db.query(addQ, (err, addR2) => {
                    if (err) {
                      logger.info("Error adding coaching "+req.user.uName);
                      logger.info(err)
                      console.log(err)
                      console.log(addQ)
                    }
                  })
                }
              });
            }
            function addFollowUp(){
              if (req.body.followUpDate) {
                let followupQ=`INSERT INTO AgentPlans (coachingID,agentID,coachingFollowUpDate,coachingFollowUpNotes) VALUES (`+coachID+`,`+req.body.agent+`,'`+req.body.followUpDate+`',@notes)`
                db.input('notes',req.body.followUpNotes)
                db.query(followupQ, (err, followupR) => {
                  if (err) {
                    logger.info("Error adding follow-up "+req.user.uName);
                    console.log(err+" ... "+followupQ)
                  }else {
                    if (req.body.toFollowUpPage) {
                      res.redirect("/coaching-follow-up/"+coachID)
                    }else {
                      res.redirect("/add-coaching/"+currPayPeriodSt+"/"+currPayPeriodEn)
                    }
                  }
                })
              }
              else {
                if (req.body.toFollowUpPage) {
                  res.redirect("/coaching-follow-up/"+coachID)
                }else {
                  res.redirect("/add-coaching/"+currPayPeriodSt+"/"+currPayPeriodEn)
                }
              }
            }
            setTimeout(addFollowUp,1000)
          }
        })
      }
    })
  },
  checkAgentDate: (req, res) => {
    let data=req.body[0]
    dateQ=`SELECT * FROM DailyInput WHERE agentID=`+data.agentID+` AND inputDate='`+data.dte+`'`
    db.query(dateQ, (err, dateR) => {
      if (dateR.recordset[0]) {
        res.send(false)
      }else {
        res.send('success')
      }
    })
  },
  deleteCoaching: (req, res) => {
    let deleteQ=`DELETE FROM CoachingIssues WHERE coachingID=`+req.params.id
    console.log(deleteQ)
    db.query(deleteQ, (err, deleteR0) => {
      if (err) {
          logger.info("Error deleting coaching "+req.user.uName);
          console.log(err)
          //res.redirect("/home");
      }else {
        console.log(deleteR0)
        deleteQ=`DELETE FROM AgentPlans WHERE coachingID=`+req.params.id
        db.query(deleteQ, (err, deleteR1) => {
          if (err) {
              logger.info("Error deleting coaching "+req.user.uName);
              console.log(err+" .. "+deleteQ)
              //res.redirect("/home");
          }else {
            console.log(deleteR1)
            deleteQ=`DELETE FROM CoachingNew WHERE coachingID=`+req.params.id
            db.query(deleteQ, (err, deleteR2) => {
              if (err) {
                  logger.info("Error deleting coaching "+req.user.uName);
                  console.log(err+" .. "+deleteQ)
                  //res.redirect("/home");
              }else {
                console.log(deleteR2)
                res.redirect("/add-coaching/"+currPayPeriodSt+"/"+currPayPeriodEn)
              }
            })
          }
        })
      }
    })
  },
  getCoachingFollowUp: (req, res) => {
    let followupQ=`SELECT CoachingNew.coachingID,case when type='Intro' then 'Intro' else 'QC' end type,isnull(CoachingNew.qualityControlID,qc.qualityControlID) qualityControlID,score,softScore,hardScore,controllerNotes, CoachingNew.agentID, Staff.staffName, CoachingNew.jobID, CoachingNew.coachingDate, isnull(extDate,coachingFollowUpDate) coachingFollowUpDate, coachingFollowUpNotes, coachingfollowedUpDate, coachingfollowedUpNotes,
    CASE WHEN pdpStartDate IS NOT NULL THEN 1 ELSE 0 END as PDP, pdpStartDate, pdpEndDate, pdpNotes, pdpExtensionDate, pdpOutcome, pdpOutcomeDate
    FROM
    CoachingNew
    left join ViewQCscores qc on qc.qcCoachID=CoachingNew.coachingID
    LEFT JOIN AgentPlans ON CoachingNew.coachingID = AgentPlans.coachingID
    LEFT JOIN Staff ON CoachingNew.staffID = Staff.staffID
    left join (select max(extDate) as extDate,planID from AgentPlanExtensions where extType='followUp' group by planID) e on e.planID=AgentPlans.agentPlanID
    WHERE CoachingNew.coachingID=`+req.params.id
    let advisoriesQ=`SELECT issue FROM CoachingIssues LEFT JOIN CoachingIssuesRef ON CoachingIssuesRef.issueID=CoachingIssues.issueID WHERE coachingID=`+req.params.id
    let jobQ=`SELECT * FROM ViewJobFullName`
    let agentsQ=`SELECT * FROM Agents`
    db.query(followupQ, (err, followupR) => {
      if (err) {
          logger.info("Error getting followup "+req.user.uName);
          console.log(err)
          res.send("An error has occurred: "+err)
          //res.redirect("/home");
      }else if (!followupR.recordset[0]) {
        res.send("Could not find coaching. It may have been deleted from the system.")
      }else {
        let qcIssuesQ=`
        select * from
        QCissues i
        left join QCissuesRef r on r.issueID=i.issueID
        where qualityControlID=`+(followupR.recordset[0].qualityControlID?followupR.recordset[0].qualityControlID:0)
        db.query(advisoriesQ, (err, advisoriesR) => {
          if (err) {
              logger.info("Error getting advisories for followup "+req.user.uName);
              console.log(err)
              //res.redirect("/home");
          }else {
            db.query(qcIssuesQ, (err, qcIssuesR) => {
              if (err) {
                  logger.info("Error getting qcIssues for followup "+req.user.uName);
                  console.log(err)
                  //res.redirect("/home");
              }else {
                db.query(jobQ, (err, jobR) => {
                  db.query(agentsQ, (err, agentsR) => {
                    res.render('coaching-follow-up.ejs', {
                      title: "Coaching follow-up"
                      ,message: ''
                      ,followup: followupR.recordset
                      ,advisories: advisoriesR.recordset
                      ,qcIssues: qcIssuesR.recordset
                      ,jobs: jobR.recordset
                      ,agents: agentsR.recordset
                    });
                  })
                })
              }
            })
          }
        })
      }
    })
  },
  updateCoachingFollowUp: (req, res) => {
    let coachingFollowUpDate="NULL"
    if (req.body.originalFollowUpDate) {
      coachingFollowUpDate="'"+req.body.originalFollowUpDate+"'"
    }
    let coachingfollowedUpDate="NULL"
    if (req.body.coachingfollowedUpDate) {
      coachingfollowedUpDate="'"+req.body.coachingfollowedUpDate+"'"
    }
    let pdpStartDate="NULL"
    if (req.body.pdpStartDate) {
      pdpStartDate="'"+req.body.pdpStartDate+"'"
    }
    let pdpEndDate="NULL"
    if (req.body.pdpEndDate) {
      pdpEndDate="'"+req.body.pdpEndDate+"'"
    }
    let pdpExtensionDate="NULL"
    if (req.body.pdpExtensionDate) {
      pdpExtensionDate="'"+req.body.pdpExtensionDate+"'"
    }
    let pdpOutcomeDate="NULL"
    let pdpOutcome="NULL"
    if (req.body.pdpOutcome) {
      pdpOutcomeDate="'"+tdy+"'"
      pdpOutcome="'"+req.body.pdpOutcome+"'"
    }
    let insertQ=`UPDATE AgentPlans SET
    coachingFollowUpNotes=@followUpNotes,
    coachingFollowedUpDate=`+coachingfollowedUpDate+`,
    coachingFollowedUpNotes=@followedUpNotes,
    pdpStartDate=`+pdpStartDate+`,
    pdpEndDate=`+pdpEndDate+`,
    pdpNotes=@pdpNotes,
    pdpExtensionDate=`+pdpExtensionDate+`,
    pdpOutcome=`+pdpOutcome+`,
    pdpOutcomeDate=`+pdpOutcomeDate+`
    WHERE coachingID=`+req.params.id
    db.input('followUpNotes',req.body.coachingFollowUpNotes)
    db.input('followedUpNotes',req.body.coachingfollowedUpNotes)
    db.input('pdpNotes',req.body.pdpNotes)
    db.query(insertQ, (err, insertR) => {
      if (err) {
        logger.info("Error updating followup "+err+" .. "+req.user.uName);
        console.log(err+" .. "+insertQ)
        res.send("Error updating followup "+err)
          //res.redirect("/home");
      }else {
        if (moment(req.body.originalFollowUpDate).valueOf()<moment(req.body.coachingFollowUpDate).valueOf()) {
          db.query("insert into AgentPlanExtensions (planID,extDate,extType) VALUES ((select agentPlanID from agentPlans where coachingID="+req.params.id+"),'"+req.body.coachingFollowUpDate+"','followUp')",(err,r)=>{
            if (err) {
              console.log(err)
            }
          })
        }
        if (pdpOutcome=="'Failed'") {
          let planQ=`
          select * from
          agentPlans
          left join coachingNew on coachingNew.coachingID=agentPlans.coachingID
          left join Agents on Agents.agentID=coachingNew.agentID
          left join ViewJobFullName on ViewJobFullName.jobID=coachingNew.jobID
          left join agentTeams on agentTeams.agentTeamID=Agents.teamID
          left join staff on agentTeams.managerID=staff.staffID
          where agentPlans.coachingID=`+req.body.coachingID
          let issuesQ=`
          select(select issue as li
          from
          CoachingIssues
          left join CoachingIssuesRef on CoachingIssuesRef.issueID=CoachingIssues.issueID
          where coachingID=`+req.body.coachingID+`
          FOR XML PATH('')) issues`
          let content=""
          db.query(planQ, (err, planR) => {
            if (err) {
              console.log(err)
            }
            db.query(issuesQ, (err, issuesR) => {
              if (err) {
                console.log(err)
              }
              let resp=planR.recordset[0]
              content=content+"<table class='perfTable'>"
              content=content+"<tr><td colspan='2'><a href='http://job-analysis:8080/coaching-follow-up/"+resp.coachingID+"'>View coaching on JA2</b></td></tr>"
              content=content+"<tr><td>Name:</td><td>"+resp.agentName+"</td></tr>"
              content=content+"<tr><td>Team:</td><td>"+resp.teamName+"</td></tr>"
              content=content+"<tr><td colspan='2'><b>Original coaching</b></td></tr>"
              content=content+"<tr><td>Date:</td><td>"+dateIf(resp.coachingDate,"/","f")+"</td></tr>"
              content=content+"<tr><td>Job:</td><td>"+resp.jobName+"</td></tr>"
              content=content+"<tr><td>Advisories:</td><td><ul>"+issuesR.recordset[0].issues
              content=content+"</ul></td></tr>"
              content=content+"<tr><td>Notes:</td><td>"+resp.coachingFollowUpNotes+"</td></tr>"
              content=content+"<tr><td colspan='2'><b>Follow-up</b></td></tr>"
              content=content+"<tr><td>Date:</td><td>"+dateIf(resp.coachingFollowedUpDate,"/","f")+"</td></tr>"
              content=content+"<tr><td>Notes:</td><td>"+resp.coachingFollowedUpNotes+"</td></tr>"
              content=content+"<tr><td colspan='2'><b>PDP</b></td></tr>"
              content=content+"<tr><td>Started:</td><td>"+dateIf(resp.pdpStartDate,"/","f")+"</td></tr>"
              content=content+"<tr><td>Ended:</td><td>"+dateIf(resp.pdpEndDate,"/","f")+"</td></tr>"
              content=content+"<tr><td>Extended until:</td><td>"+((resp.pdpExtensionDate)?dateIf(resp.pdpExtensionDate,"/","f"):"")+"</td></tr>"
              content=content+"<tr><td>Notes:</td><td>"+resp.pdpNotes+"</td></tr>"
              let mailOptions = {
                // to: emailTo,
                to: ['kim@teamsearchmr.co.uk',resp.staffEmail],
                subject: 'Escalation required: PDP Failure',
                html: '<p>' + content + footer + '</p>',
                priority: 'high'
              };
              transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                  return console.log(error);
                  logger.info(req.user.uName + " failed to send QC email to "+emailTo+": "+err)
                }
                console.log('Message %s sent: %s', info.messageId, info.response);
                res.redirect("/add-coaching/"+currPayPeriodSt+"/"+currPayPeriodEn)
              });
            })
          })
        }else {
          res.redirect("/add-coaching/"+currPayPeriodSt+"/"+currPayPeriodEn)
        }
      }
    })
  },
  getBooking: (req, res) => {
    let bookingWeek=""
    let teamSelect=""
    if (req.params.id == 'e') {
      teamSelect="AgentTeams.isEve=1"
    }else if (req.params.id == 'd') {
      teamSelect="AgentTeams.isDay=1"
    }else {
      teamSelect="AgentTeams.agentTeamID="+req.params.id
    }
    let fromDate=moment().add(req.params.weekAdd,'weeks').isoWeekday(1)
    let toDate=moment(fromDate).add(7,'d')
    let teamQ = `SELECT AgentTeams.teamName, AgentTeams.agentTeamID, AgentTeams.isEve, AgentTeams.isDay, AgentTeams.teamColour
    FROM AgentTeams
    WHERE AgentTeams.agentTeamID>1`
    let agentQ=`SELECT Agents.agentName, Agents.agentID, AgentTeams.teamName, AgentTeams.agentTeamID, AgentTeams.teamColour, Agents.contractVersion,fixedHours,contractStart
    FROM Agents, AgentTeams,agentContracts
    WHERE (Agents.agentLeft IS NULL or Agents.agentLeft>'`+fromDate.format("YYYY-MM-DD")+`') AND Agents.agentID>1 AND agents.contractVersion=agentContracts.contractID and Agents.teamID=AgentTeams.agentTeamID AND `+teamSelect+` AND Agents.agentJoined<'`+toDate.format("YYYY-MM-DD")+`'
    `+(req.params.incFixed==0? " AND isnull(fixedHours,0)=0 ":"")+`
    ORDER BY Agents.agentName`
    let bookingQ=`SELECT Booking.agentID, Booking.bookingDate, Booking.endTime, Booking.startTime, bookingTeamID, AgentTeams.teamName,isContractShift
    FROM Booking
    LEFT JOIN AgentTeams on AgentTeams.agentTeamID=Booking.bookingTeamID
    WHERE Booking.bookingDate BETWEEN '`+fromDate.format("YYYY-MM-DD")+`' AND '`+toDate.format("YYYY-MM-DD")+`'`
    let absenceQ=`SELECT * FROM Absence WHERE absenceDate BETWEEN '`+fromDate.format("YYYY-MM-DD")+`' AND '`+toDate.format("YYYY-MM-DD")+`'`
    db.query(agentQ, (err, agentR) => {
      if (err) {
          logger.info("Error fetching agents while getting booking page "+req.user.uName);
          console.log(agentQ+" - "+err)
          //res.redirect("/home");
      }else {
        db.query(teamQ, (err, teamR) => {
          if (err) {
              logger.info("Error fetching teams while getting booking page "+req.user.uName);
              //res.redirect("/home");
          }else {
            db.query(absenceQ, (err, absenceR) => {
              if (err) {
                  logger.info("Error fetching absences while getting booking page "+req.user.uName);
                  //res.redirect("/home");
              }else {
                db.query(bookingQ, (err, bookingR) => {
                  if (req.params.reqType=="ajax") {
                    if (err) {
                        logger.info("Error setting booking hours - "+req.user.uName);
                        res.status(500).send({error: 'Could not update hours'});
                    }else {
                      res.send(bookingR.recordset)
                    }
                  }else {
                    if (err) {
                        logger.info("Error fetching bookings while getting booking page "+req.user.uName);
                        //res.redirect("/home");
                    }else {
                      res.render('staff-booking.ejs', {
                        title: "Staff Booking"
                        ,message: ''
                        ,agents: agentR.recordset
                        ,teams: teamR.recordset
                        ,bookings: bookingR.recordset
                        ,currWeek: req.params.weekAdd
                        ,teamSel: req.params.id
                        ,absences: absenceR.recordset
                        ,incFixed:req.params.incFixed
                      })
                    }
                  }
                })
              }
            })
          }
        })
      }
    })
  },
  setBooking: (req, res) => {
    let data=req.body
    let bookingTeam=data[0].bookingTeam
    if (!data[0].bookingTeam) {
      bookingTeam='NULL'
    }
    if (data[0].days.length<60) {
      let i=0
      function addDay(){
        if (i<data[0].days.length) {
          let day=data[0].days[i]
          let checkQ=`DELETE FROM Booking WHERE bookingDate='`+day+`' AND agentID=`+data[0].agentID
          let addQ=""
          db.query(checkQ, (err, checkR) => {
            if (err) {
              let updateQ=`UPDATE Booking set startTime='`+data[0].stTime+`', endTime='`+data[0].enTime+`', bookingTeamID=`+bookingTeam+` where agentID=`+data[0].agentID+` and bookingDate='`+day+`'`
              db.query(updateQ,(err2,uR)=>{
                if (err2) {
                  console.log(err2)
                  res.status(500).send({error:"Could not change booking. Ensure the tally sheet has no hours/ints for this day."})
                }else {
                  logger.info(req.user.uName+" updated booked hours",updateQ)
                  if (data[0].stTime=="00:00") {
                    db.query(`delete from absence where agentID=`+data[0].agentID+` and absenceDate='`+day+`'`,(err,r)=>{
                      i++
                      addDay()
                    })
                  }else {
                    i++
                    addDay()
                  }
                }
              })
            }else {
              addQ=`INSERT INTO Booking (agentID, startTime, endTime, bookingDate, bookingTeamID) VALUES (`+data[0].agentID+`, '`+data[0].stTime+`', '`+data[0].enTime+`', '`+day+`', `+bookingTeam+`)`
              db.query(addQ, (err, addR) => {
                if (err) {
                  logger.info("Error setting booking hours - "+req.user.uName);
                  logger.info(err);
                  logger.info(data[0]);
                  logger.info("--end--")
                  console.log(err)
                  res.status(500).send({error:"Could not add booking"})
                }else {
                  let abQ=`
                  insert into Absence (agentID,absenceDate,absenceType)
                  select top 1 `+data[0].agentID+`,bookingDate,'No show'
                  from Booking b
                  left join Absence a on a.absenceDate=b.bookingDate and a.agentID=b.agentID
                  left join agents ag on b.agentID=ag.agentID
                  where bookingDate='`+day+`' and absenceDate is null and agentID=`+data[0].agentID+` and startTime<>'00:00:00'`
                  db.query(abQ,(err,abR)=>{
                    logger.info(req.user.uName+" added booked hours",addQ)
                    i++
                    addDay()
                  })
                }
              })
            }
          })
        }else {
          res.send("Success")
        }
      }
      addDay()
    }else {
      res.status(500).send({error:"Duration too long. Can only book a maximum of 60 days at once"})
    }
  },
  deleteBooking: (req, res) => {
    let data=req.body
    let i=0
    let returnHrs=[]
    function deleteDay(){
      if (i<data[0].days.length) {
        let day=data[0].days[i]
        let getTime=d=>d.toISOString().split("T")[1].split(".")[0]
        let fixedHrsQ=`
        select * from booking b
        left join agents a on a.agentID=b.agentID
        left join agentContracts c on c.contractID=a.contractVersion
        WHERE bookingDate='`+day+`' AND b.agentID=`+data[0].agentID
        db.query(fixedHrsQ,(err,r)=>{
          if (err || !r.recordset[0]) {
            console.log(fixedHrsQ,err,r.recordset[0])
            i++
            deleteDay()
          }else {

            if (getTime(r.recordset[0].startTime)=='00:00:00' && r.recordset[0]['start'+(moment(day).isoWeekday()-1)]) {
              let updateQ=`update Booking set startTime='`+getTime(r.recordset[0]['start'+(moment(day).isoWeekday()-1)])+`',isContractShift=1,endTime='`+getTime(r.recordset[0]['end'+(moment(day).isoWeekday()-1)])+`' WHERE bookingDate='`+day+`' AND agentID=`+data[0].agentID
              db.query(updateQ,(err,uR)=>{
                if (err) {
                  console.log(updateQ,err)
                }
                returnHrs.push({dte:day,st:getTime(r.recordset[0]['start'+(moment(day).isoWeekday()-1)]),en:getTime(r.recordset[0]['end'+(moment(day).isoWeekday()-1)])})
                i++
                deleteDay()
              })
            }else {
              let delQ=`DELETE FROM Booking WHERE bookingDate='`+day+`' AND agentID=`+data[0].agentID
              db.query(delQ, (err, delR) => {
                if (err) {
                  logger.info("Error deleting booking hours - "+req.user.uName);
                  res.status(500).send({error: 'Could not remove hours'});
                }else {
                  let abQ=`
                  delete from Absence
                  where bookingDate='`+day+`' and absenceType='No show' and agentID=`+data[0].agentID+``
                  db.query(abQ,(err,abR)=>{
                    logger.info(req.user.uName+" deleted booked hours",delQ)
                    i++
                    deleteDay()
                  })
                }
              })
            }
          }
        })
      }else {
        res.send(returnHrs)
      }
    }
    deleteDay()
  },
  getHolidays: (req,res) => {
    let data=req.body
    let holQ=`SELECT * FROM Booking WHERE agentID=`+data[0].agentID+` AND bookingDate>=dateadd(week, datediff(week, 0, '`+data[0].date+`'), 0) AND startTime='00:00:00' AND endTime='00:00:00' ORDER BY bookingDate`
    db.query(holQ, (err, holR) => {
      if (err) {
        console.log(holQ+" - "+err)
        logger.info("Error deleting booking hours - "+req.user.uName);
        res.status(500).send({error: 'Could not remove hours'});
      }else {
        res.send(holR.recordset)
      }
    })
  },
  getRegularHours: (req,res) => {
    let regQ="SELECT * FROM BookingRegular"
    db.query(regQ, (err, regR) => {
      if (err) {
        console.log(regQ+" - "+err)
        logger.info("Error getting regular hours - "+req.user.uName);
        res.status(500).send({error: 'Could not retrieve regular hours'});
      }else {
        res.send(regR.recordset)
      }
    })
  },
  deleteRegularHours: (req,res) => {
    let data=req.body
    let delQ=`DELETE FROM BookingRegular WHERE weekday='`+data[0].weekday+`' AND agentID=`+data[0].agentID
    db.query(delQ, (err, delR) => {
      if (err) {
          logger.info("Error deleting booking hours - "+req.user.uName);
          res.status(500).send({error: 'Could not remove hours'});
      }else {
        res.send("Success")
      }
    })
  },
  updateRegularHours: (req, res) => {
    let data=req.body
    let checkQ=`SELECT brID FROM BookingRegular WHERE weekday='`+data[0].weekday+`' AND agentID=`+data[0].agentID
    let addQ=""
    db.query(checkQ, (err, checkR) => {
      if (checkR.recordset.length==0) {
        addQ=`INSERT INTO BookingRegular (agentID, startTime, endTime, weekday) VALUES (`+data[0].agentID+`, '`+data[0].stTime+`', '`+data[0].enTime+`', '`+data[0].weekday+`')`
      }else {
        addQ=`UPDATE BookingRegular SET startTime='`+data[0].stTime+`', endTime='`+data[0].enTime+`' WHERE weekday='`+data[0].weekday+`' AND agentID=`+data[0].agentID
      }
      db.query(addQ, (err, addR) => {
        if (err) {
            logger.info("Error setting booking hours - "+req.user.uName);
            res.status(500).send({error: 'Could not update hours'});
        }else {
          res.send("Success")
        }
      })
    })
  },
  getBookingAbsence: (req,res) => {
    let data=req.body
    let absenceType=""
    if (typeof data[0].absenceType==="string") {
      absenceType=data[0].absenceType
    }else {
      absenceType=data[0].absenceType.join(",")
    }
    let getQ=`SELECT * FROM Absence WHERE agentID=`+data[0].agentID+` AND absenceDate>=dateadd(week, datediff(week, 0, '`+data[0].date+`'), 0) AND absenceType IN (`+absenceType+`) ORDER BY absenceDate`
    db.query(getQ, (err, getR) => {
      if (err) {
        console.log(getQ+" - "+err)
        logger.info("Error getting absence - "+req.user.uName);
        res.status(500).send({error: 'Could not retrieve absences'});
      }else {
        res.send(getR.recordset)
      }
    })
  },
  updateBookingAbsence: (req,res) => {
    let data=req.body
    data[0].days.forEach((day, i) => {
      let getQ=`DELETE FROM Absence WHERE agentID=`+data[0].agentID+` AND absenceDate='`+day+`'`
      db.query(getQ, (err, getR) => {
        let addQ=`INSERT INTO Absence (agentID, absenceDate, absenceType) VALUES (`+data[0].agentID+`,'`+day+`','`+data[0].absenceType+`')`
        if (data[0].type=="add") {
          db.query(addQ, (err, addR) => {
          })
        }
      })
    })
    res.send("Success")
  },
  getBreatheAgent: (req,res) => {
    var i=1
    var data=[]
    function getEmployees(){
      breathReq.get('/employees?page='+i)
      .then(response => {
        if (response.data.employees.length==0) {
          res.status(200).send({agent: data});
        }else {
          data.push.apply(data,response.data.employees)
          i++
          getEmployees(i)
        }
      }).catch(
        function (err) {
          console.log(err)
          res.status(500).send({error: err});
        });
    }
    getEmployees()
  },
  interviewerSnapshotPage: (req,res) => {
    res.render('interviewer-snapshot.ejs',{
      title:'Interviewer snapshot',
    })
  },
  interviewerSnapshotData: (req,res) => {
    let dailyQ
    let totalsQ
    let detailQ
    if (req.params.dataType==1) {
      dailyQ=`
      select p.agentID,isnull(bookingTeamID,teamID) teamID, inputDate, sum(inputInterviews) as dailyData, sum((inputInterviews/inputHours)-ISNULL(PastTargets.hourlyTarget,Jobs.hourlyTarget)) as onTarget into ##SnapshotDaily
      from DailyInput p
      left join booking b on b.bookingDate=p.inputDate and b.agentID=p.agentID
      outer apply (
        select top 1 jobID, hourlyTarget, dateUntil
        from PastJobTargets
        where PastJobTargets.jobID=p.jobID and p.inputDate<=PastJobTargets.dateUntil
        order by jobTargetID desc
      ) PastTargets
      left join Jobs on Jobs.jobID=p.jobID
      left join Agents a on a.agentID=p.agentID
      where inputHours>0 AND inputDate BETWEEN @ssst AND @ssen AND Jobs.projectID>2
      group by p.agentID, inputDate, isnull(bookingTeamID,teamID)
      select * from ##SnapshotDaily`
      totalsQ=`
      select ss.agentID,ss.teamID, agentName, teamName, Staff.staffName as TL, sum(dailyData) as ints, sum(CASE WHEN onTarget<0 THEN 0 ELSE 1 END) as onTargetShifts, count(distinct inputDate) as shifts
      from
      ##SnapshotDaily ss
      left join Agents on Agents.agentID=ss.agentID
      left join AgentTeams on AgentTeams.AgentTeamID=ss.teamID
      left join Staff on Staff.staffID=AgentTeams.managerID
      group by ss.agentID, agentName, teamName, Staff.staffName,ss.teamID
      drop table ##SnapshotDaily`
      detailQ=`
      select d.agentID,isnull(bookingTeamID,teamID) teamID,fullJobName as Job,inputDate,inputHours as Hours,inputInterviews as Ints from
      DailyInput d
      left join booking b on b.bookingDate=d.inputDate and b.agentID=d.agentID
      left join Agents a on d.agentID=a.agentID
      left join ViewJobsStats j on j.jobID=d.jobID
      `
    }else if (req.params.dataType==2) {
      dailyQ=`
      select agentID,qcTeamID teamID, interviewDate as inputDate, AVG(CAST(score AS DECIMAL(10,2))) as dailyData, -85+AVG(CAST(score AS DECIMAL(10,2))) as onTarget, count(QCID) as QCcount
    	from ViewQCscores
    	where isFinished=1 AND type='Call' AND interviewDate BETWEEN @ssst AND @ssen
    	group by agentID,qcTeamID, interviewDate`
      totalsQ=`
      select qc.agentID,qcTeamID teamID, agentName, teamName, Staff.staffName as TL, avg(dailyData) as QCscore, sum(QCcount) as QCcount, sum(ints) as ints
      from (
        select agentID, AVG(CAST(score AS DECIMAL(10,2))) as dailyData, count(qualityControlID) as QCcount,qcTeamID
        from
        ViewQCscores
        where isFinished=1 AND type='Call' AND interviewDate BETWEEN @ssst AND @ssen
        group by agentID,qcTeamID) qc
      left join Agents on Agents.agentID=qc.agentID
	  left join AgentTeams on agentTeams.agentTeamID=qc.qcTeamID
      left join Staff on Staff.staffID=AgentTeams.managerID
      left join (
        select sum(inputInterviews) as ints, d.agentID,b.bookingTeamID
        from
        DailyInput d
		left join Booking b on b.bookingDate=d.inputDate and b.agentID=d.agentID
        where inputDate BETWEEN @ssst AND @ssen
        group by d.agentID,bookingTeamID) DI on DI.agentID=qc.agentID and DI.bookingTeamID=qc.qcTeamID
      group by qc.agentID, agentName, teamName, Staff.staffName,qcTeamID`
      detailQ=`
      select agentID,qcTeamID teamID, fullJobName as Job, interviewDate as inputDate, CAST(score AS DECIMAL(10,2)) as Score
      from ViewQCscores qc
      left join ViewJobsStats j on j.jobID=qc.jobID
      where isFinished=1 AND type='Call'`
    }else if (req.params.dataType==3) {
      dailyQ=`
      select * into ##SnapshotHours from (
        select d.agentID,isnull(bookingTeamID,teamID) teamID, case when lateMins>0 then 'L' else cast(sum(inputHours) as varchar) end as dailyData, d.inputDate, 1 as onTarget
        from
        dailyInput d
        left join Lateness l on l.inputDate=d.inputDate and l.agentID=d.agentID and l.lateMins>0
        left join Booking b on b.bookingDate=d.inputDate and b.agentID=d.agentID
        left join Agents ag on ag.agentID=d.agentID
        left join Absence a on a.agentID=d.agentID and a.absenceDate=d.inputDate and a.absenceType='No show'
        where d.inputDate BETWEEN @ssst AND @ssen and absenceDate is null
        group by d.agentID,d.inputDate,lateMins,isnull(bookingTeamID,teamID)

        union

        select a.agentID,isnull(bookingTeamID,teamID) teamID, case when absenceType='Cancelled by agent' then 'CA' when absenceType='No show' then 'NS' else left(absenceType,1) end as dailyData,absenceDate, -1 as onTarget
        from
        Absence a
        left join Booking b on b.bookingDate=a.absenceDate and b.agentID=a.agentID
        left join Agents ag on ag.agentID=a.agentID
        where absenceDate BETWEEN @ssst AND @ssen and b.startTime<>'00:00:00' and (absenceDate<=cast(getdate() as date) or absenceType<>'No show')
      ) t
        select * from ##SnapshotHours
      `
      totalsQ=`
      select ss.agentID,ss.teamID,agentName,teamName,Staff.staffName as TL, sum(case when dailyData='L' then 1 else 0 end) as lateCount, sum(case when dailyData='S' then 1 else 0 end) as sickCount, sum(case when dailyData='C' then 1 else 0 end) as cancelledCount, sum(case when dailyData='CA' then 1 else 0 end) as cancelledAgentCount, sum(case when onTarget=-1 then 1 else 0 end) as absenceCount, sum(case when onTarget=1 then 1 else 0 end) as daysCount
      from ##SnapshotHours ss
      left join Agents on Agents.agentID=ss.agentID
      left join AgentTeams on AgentTeams.AgentTeamID=ss.teamID
      left join Staff on Staff.staffID=AgentTeams.managerID
      group by ss.agentID,agentName,teamName,Staff.staffName,ss.teamID
      drop table ##SnapshotHours
      `
      detailQ=`
      select agentID,teamID,case when lateMins>0 then CONCAT('Late by ',lateMins,' mins') else 'Present' end as Status, inputDate
      from
      (
      	select d.agentID,isnull(bookingTeamID,teamID) teamID,d.inputDate,lateMins
      	from dailyInput d
        left join Booking b on b.bookingDate=d.inputDate and b.agentID=d.agentID
        left join Agents ag on ag.agentID=d.agentID
      	left join Lateness l on l.inputDate=d.inputDate and l.agentID=d.agentID and l.lateMins>0
		left join Absence a on a.agentID=d.agentID and a.absenceDate=d.inputDate and a.absenceType='No show'
		where absenceDate is null
      	group by d.agentID,d.inputDate,lateMins,isnull(bookingTeamID,teamID)
      ) dailyInput

      union

      select a.agentID,isnull(bookingTeamID,teamID) teamID,absenceType,absenceDate
      from
      Absence a
      left join Booking b on b.bookingDate=a.absenceDate and b.agentID=a.agentID
      left join Agents ag on ag.agentID=a.agentID`
    }
    db.input('ssst',new Date(req.query.stDate))
    db.input('ssen',new Date(req.query.enDate))
    db.multiple=true
    db.batch(dailyQ+totalsQ+detailQ, (err, dailyR) => {
      if (err) {
        console.log(err)
        console.log(dailyQ+totalsQ+detailQ)
        res.status(500).send(err)
      }
      res.send({
        title:'Interviewer snapshot',
        dailys:dailyR.recordsets[0],
        totals:dailyR.recordsets[1],
        detail:dailyR.recordsets[2]
      })
    })
  },
  updateAgentRCID: (req,res) => {
    db.query("update Agents set ringCentralID='"+req.body.rcid+"' where agentID="+req.body.agentID, (err, dailyR) => {
      if (err) {
        res.status(500).send(err)
      }
      res.send("success")
    })
  },
  addRCuser: (req,res) => {
    let data=req.body
    rcPlatform.get('/restapi/v1.0/account/~/extension',{type:"User",status:"Unassigned"}).then(function (resp) {
      resp.json().then(function(jsonObj){
        var params = {
          status: "Enabled",
          contact: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            emailAsLoginName: true
          },
          password: "PassWord13256!"
        }
        let extID=jsonObj.records[0].id
        if (jsonObj.records.length==0) {
          res.status(500).send("There are no free extensions on Ring Central. Please create a new one via the admin portal.")
        }else {
          rcPlatform.put('/restapi/v1.0/account/~/extension/' + extID, params).then(function (resp) {
            resp.json().then(function(jsonObj){
              console.log(extID)
              res.send({id:extID})
            })
          })
          .catch(function(e){
            console.log(e.message)
            res.status(500).send(e.message)
          });
        }
      })
    })
    .catch(function(e){
      console.log(e.message)
      res.status(500).send(e.message)
    });
  },
  updateRChours: (req,res) => {
    let agentq=`
    select distinct agentName,ringCentralID,case when absenceType is null then startTime else cast('00:00' as time) end as startTime,case when absenceType is null then endTime else cast('00:00' as time) end as endTime
    from
    Agents
    left join Booking on bookingDate=cast(getdate() as date) and Booking.agentID=Agents.agentID
    left join Absence on absenceDate=cast(getdate() as date) and Absence.agentID=Agents.agentID
    where Agents.agentID=`+req.body.agentID
    function getTime(val){
      return val?moment.utc(val).format("HH:mm"):'00:00'
    }
    db.query(agentq, (err, agentR) => {
      if (err) {
        res.status(500).send("Error updating RingCentral hours. Contact the system administrator")
      }
      let agent=agentR.recordset[0]
      if (agent.ringCentralID) {
        updateWorkingHours(agent.ringCentralID,getTime(agent.startTime),getTime(agent.endTime),getTime(agent.endTime)=='00:00')
      }else {
        res.status(500).send({error:"Agent is not linked to a Ring Central extension, so their hours could not be updated on Ring Central"})
      }
    })
    function updateWorkingHours(id,startTime,endTime,isnull){
      let day=moment().format("dddd").toLowerCase()
      let nullday=moment().subtract(1,'d').format("dddd").toLowerCase()
      let finalday=isnull?nullday:day
      let hours={}
      hours[finalday]=[
        {
          from:startTime,
          to:endTime
        }
      ]
      let body = {
        schedule: {
          weeklyRanges: hours
        }
      };
      rcPlatform.put('/restapi/v1.0/account/~/extension/' + id + '/business-hours', body).then(function(e){
        res.send("success")
      }).catch(function(err){
        res.status(500).send(err)
      })
    }
  },
  getAvgWage: (req,res) => {
    let avgQ=`
    select avg(payrate) as avgWage,isnull(isEve,0) isEve from
    getPayRates(dateadd(day,-30,getDate()),getDate()) p
    left join Agents a on a.agentID=p.agentID
    left join AgentTeams t on t.agentTeamID=a.teamID
    group by isnull(isEve,0)`
    db.query(avgQ, (err, avgR) => {
      if (err) {
        console.log(err)
        res.status(500).send(err)
      }
      console.log(avgR.recordset)
      res.send({
        eve:avgR.recordset.find(el=>el.isEve==1),
        day:avgR.recordset.find(el=>el.isEve==0)
      })

    })
  },
  getBookingRequests: (req,res) => {
    let agentQ=`
    select agentID,c.*
    from agents a
    left join agentContracts c on c.contractID=a.contractVersion and a.contractStart<=dateadd(day,6,'`+req.params.bookingWeek+`')
    where agentLeft is null
    and breatheID is not null
    `
    let tableData=[]
    db.query(agentQ, (err, agentR) => {
      getBookingReq(req.params.bookingWeek).then(function(e){
        console.log(e)
        res.send({requests:e.length==0?[]:e.filter(el=>req.params.teamID==0 || el.teamID==req.params.teamID),agents:agentR.recordset})
      }).catch(err=>{
        console.log("getBookingRequests err",err)
        res.status(500).send(err)
      })
    })
  },
  bookingRequestsPage: (req,res) => {
    let teamQ="select * from agentTeams where agentTeamID>1"
    db.query(teamQ,(err, teamR) => {
      res.render("booking-requests.ejs",{
        title:"Booking Requests",
        teamID:req.params.teamID,
        teams:teamR.recordset,
        bookingWeek:(req.params.bookingWeek=='0'?moment().add(2, 'weeks').isoWeekday(1).format("YYYY-MM-DD"):moment(req.params.bookingWeek).isoWeekday(1).format("YYYY-MM-DD")),
      })
    })
  },
  confirmBookingRequest: (req,res) => {
    const ical = require("ical-generator");
    const calendar = ical({name: 'Teamsearch shifts'});
    let shifts=[]
    let s=0
    let w=0
    req.body.fixedHours=req.body.fixedHours=='true'
    const axios = require('axios');
    function parseShifts(){
      if (s<7 && w<req.body.weeks) {
        shifts.push({
          date:moment(req.body.bookingWeek).add(w,'weeks').add(s,'d').format("YYYY-MM-DD"),
          st:req.body['shift_'+s].st,
          en:req.body['shift_'+s].en,
        })
        calendar.createEvent({
          start: moment(req.body.bookingWeek).add(w,'weeks').add(s,'d').set({hour:req.body['shift_'+s].st.split(":")[0],minute:req.body['shift_'+s].st.split(":")[1]}),
          end: moment(req.body.bookingWeek).add(w,'weeks').add(s,'d').set({hour:req.body['shift_'+s].en.split(":")[0],minute:req.body['shift_'+s].en.split(":")[1]}),
          summary: 'Teamsearch shift',
          location: 'Floor 2, 1850 Mill, Shaw Lodge Mills, Halifax, HX3 9ET'
        });
        if (s<6) {
          s++
        }else {
          w++
          s=0
        }
        parseShifts()
      }else {
        let delQ="delete from Booking where agentID="+req.body.agentID+" and isnull(isContractShift,0)=0 and bookingDate in ("+shifts.map((el,i)=>"'"+el.date+"'").join(",")+")"
        bookingReq.get('/exec?reqType=confirmBooking&agentID='+req.body.agentID+'&bookingWeek='+req.body.bookingWeek).then(function(e){
          db.query(delQ,(err, agentR) => {
            if (err) {
              res.status(500).send({error:"Could not overwrite bookings. Ensure no hours have been allocated on the tally sheet for that week's shifts."})
            }else {
              let s=0
              function addShifts(){
                if (s<shifts.length) {
                  if (shifts[s].st) {
                    let addQ="insert into Booking (agentID,startTime,endTime,bookingDate,bookingTeamID) VALUES ("+req.body.agentID+",'"+shifts[s].st+"','"+shifts[s].en+"','"+shifts[s].date+"',"+req.body.teamID+")"
                    db.query(addQ,(err, agentR) => {
                      if (err) {
                        console.log(err)
                        logger.info(req.user.uName+" failed to add a shift: ",req.body)
                        res.status(500).send(err)
                      }else {
                        logger.info(req.user.uName+" confirmed a shift: ",req.body)
                        let abQ=`
                        insert into Absence (agentID,absenceDate,absenceType)
                        select top 1 `+req.body.agentID+`,bookingDate,'No show'
                        from Booking b
                        left join Absence a on a.absenceDate=b.bookingDate and a.agentID=b.agentID
                        left join agents ag on b.agentID=ag.agentID
                        where bookingDate='`+shifts[s].date+`' and absenceDate is null and agentID=`+req.body.agentID+` and startTime<>'00:00:00'`
                        db.query(abQ,(err,abR)=>{
                          logger.info(req.user.uName+" added booked hours",addQ)
                          s++
                          addShifts()
                        })
                      }
                    })
                  }else {
                    s++
                    addShifts()
                  }
                }else {
                  res.send("success")
                  let subject='Your '+(req.body.fixedHours?'Extra ':'')+'Hours For '+(req.body.weeks>1?'The Next '+req.body.weeks+' Weeks':'Next Week')+' - From Monday '+moment(req.body.bookingWeek).format("DD/MM/YYYY")
                  let mailOptions = {
                    from:'Teamsearch <reports@teamsearchmr.co.uk>',
                    to: req.body.agentEmail,
                    subject: subject,
                    html: '<p>' + header + '<p>Hi '+req.body.agentName+'<br><br>Please see below your confirmed* hours'+(req.body.fixedHours?', which are to be fulfilled <u>in addition to your contracted hours</u>':'')+' for '+(req.body.weeks>1?'the next '+req.body.weeks+' weeks':'next week')+':<br><br>'+req.body.table+'<br><br>If you are unable to attend your shift you must let us know why by calling the work phone (07969 909829). If you do not contact us to tell us why you will not be attending your shift, this counts as a ‘no show’, and may lead to you not being able to book any more hours.<br><br>*Please note that shifts may still be subject to cancellation by your Team Leader up to 12 hours before the start time of said shift.<br><br>Many thanks,<br>Teamsearch</p><br><br>' + footer + '</p>',
                    icalEvent: {
                      filename: 'Teamsearch shifts.ics',
                      method: 'publish',
                      content: calendar.toString()
                    }
                  }
                  transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                      console.log(error);
                      logger.info(req.user.uName+" failed to send shift confirmation: ",mailOptions)
                    }else {

                    }
                  });
                }
              }
              addShifts()
            }
          })
        }).catch(function(err){
          console.log("confirmBookingRequests err",err)
          res.status(500).send({error:err})
        })
      }
    }
    parseShifts()
  },
  getOne2oneForm:(req,res)=>{
    var Mustache = require('mustache');
    var fs = require('fs');
    let colours={
      good:{
        fill:'#e2f0d9',
        stroke:'#70ad47'
      },
      neutral:{
        fill:'#fff2cc',
        stroke:'#ffc000'
      },
      bad:{
        fill:'#fbe5d6',
        stroke:'#ed7d31'
      },
    }
    let getColours=(f,t,reverse)=>{
      let valClass='neutral'
      if (reverse) {
        if (f*0.8>t) {
          valClass="bad"
        }else if (f<=t) {
          valClass="good"
        }
      }else {
        if (f<t*0.8) {
          valClass="bad"
        }else if (f>=t) {
          valClass="good"
        }
      }
      return {fill:colours[valClass].fill,stroke:colours[valClass].stroke}
    }
    let kpiShape=`
    <p class=MsoNormal align=center style='margin-top:12.0pt;text-align:center;
    line-height:105%'>
    <a name="_Hlk98494666"></a>
    <span style='mso-bookmark:_Hlk98494666'>
    <v:oval
    id="Oval_x0020_4" o:spid="_x0000_s1030" style='width:50pt;height:50pt;
    visibility:visible;mso-wrap-style:square;mso-left-percent:-10001;
    mso-top-percent:-10001;mso-position-horizontal:absolute;
    mso-position-horizontal-relative:char;mso-position-vertical:absolute;
    mso-position-vertical-relative:line;mso-left-percent:-10001;
    mso-top-percent:-10001;v-text-anchor:middle' fillcolor="{{colours.fill}}" strokecolor="{{colours.stroke}}" strokeweight="1pt">
    <v:stroke joinstyle="miter"/>
    <v:path arrowok="t"/>
    <v:textbox inset="0,0,0,0">
    <div>
    <p class=MsoNormal align=center style='margin-bottom:0cm;text-align:center'><b
    style='mso-bidi-font-weight:normal'><span style='font-size:16.0pt;
    font-family:"Arial",sans-serif;color:{{colours.stroke}};mso-style-textfill-fill-color:{{colours.stroke}};mso-style-textfill-fill-alpha:100.0%;mso-style-textfill-fill-colortransforms:
    "lumm=40000 lumo=60000";mso-style-textoutline-type:solid;mso-style-textoutline-fill-color:
    {{colours.stroke}};mso-style-textoutline-fill-alpha:
    100.0%;mso-style-textoutline-outlinestyle-dpiwidth:.875pt;mso-style-textoutline-outlinestyle-linecap:
    flat;mso-style-textoutline-outlinestyle-join:round;mso-style-textoutline-outlinestyle-pctmiterlimit:
    0%;mso-style-textoutline-outlinestyle-dash:solid;mso-style-textoutline-outlinestyle-align:
    center;mso-style-textoutline-outlinestyle-compound:simple'>{{text}}<o:p></o:p></span></b></p>
    </div>
    </v:textbox>
    <w:wrap type="none"/>
    <w:anchorlock/>
    </v:oval></span>
    <span style='mso-bookmark:_Hlk98494666'></span><span
    style='mso-bookmark:_Hlk98494666'><span style='font-size:11.0pt;line-height:
    105%;font-family:"Calibri",sans-serif'><o:p></o:p></span></span></p>`
    let getKPI=(kpi)=>Mustache.render(kpiShape, kpi)
    console.log(req.body)
    let st=req.body.stdate
    let prevO2o=(req.body.prevO2os || []).find(el=>moment.utc(el.o2oDate).valueOf()<moment.utc(st).valueOf())
    let current=req.body.kpis
    fs.readFile(publicPath + '/templates/Interviewer One-to-One form v5.htm', 'utf8', function(err, template){
       var rendered = Mustache.render(template, {
         agentName:req.body.agentName,
         month:req.body.month,
         date:moment().format("DD/MM/YYYY"),
         prevO2o:{
           o2oDate:prevO2o?moment.utc(prevO2o.o2oDate).format("DD/MM/YYYY"):'NA'
         },
         cont:{
           target:35,
           actual:Math.round(current.contribution*100),
           // previous:prev?Math.round(prev.contribution*100):'NA',
           prevTarget:prevO2o?(prevO2o.contTarget?prevO2o.contTarget:'NA'):'NA'
         },
         qc:{
           target:85,
           actual:Math.round(current.QCscore),
           // previous:prev?Math.round(prev.QCscore):'NA',
           prevTarget:prevO2o?(prevO2o.qcTarget?prevO2o.qcTarget:'NA'):'NA'
         },
         dials:{
           target:60,
           actual:Math.round(current.avgDials),
           // previous:prev?Math.round(prev.avgDials):'NA',
           prevTarget:prevO2o?(prevO2o.dialsTarget?prevO2o.dialsTarget:'NA'):'NA'
         },
         attendance:{
           target:100,
           actual:100-Math.round(current.percAbsent*100),
           // previous:prev?100-Math.round(prev.percAbsent*100):'NA',
           prevTarget:prevO2o?(prevO2o.attendanceTarget?prevO2o.attendanceTarget:'NA'):'NA'
         },
         onTarget:{
           target:80,
           actual:Math.round(current.onTarget*100),
           // previous:prev?Math.round(prev.onTarget*100):'NA',
           prevTarget:prevO2o?(prevO2o.onTargetTarget?prevO2o.onTargetTarget:'NA'):'NA'
         },
         contKPI:function(){
           return getKPI({
             text:Math.round(current.contribution*100)+"%",
             colours:getColours(Math.round(current.contribution*100),current.isEve?35:39,true)
           })
         },
         qcKPI:function(){
           return getKPI({
             text:Math.round(current.QCscore),
             colours:getColours(Math.round(current.QCscore),85,false)
           })
         },
         dialsKPI:function(){
           return getKPI({
             text:Math.round(current.avgDials),
             colours:getColours(Math.round(current.avgDials),60,false)
           })
         },
         onTargetKPI:function(){
           return getKPI({
             text:Math.round(current.onTarget*100)+"%",
             colours:getColours(Math.round(current.onTarget*100),80,false)
           })
         },
         attendanceKPI:function(){
           return getKPI({
             text:100-Math.round(current.percAbsent*100)+"%",
             colours:getColours(100-Math.round(current.percAbsent*100),100,false)
           })
         }
       });
       res.send(rendered)
     })
  },
  updateAbsenceAction:(req,res)=>{
    let q=`insert into AbsenceActions (actionTypeID,actionDate,actionBy,agentID,absenceType,currentScore,reportURL) VALUES (`+req.body.actionTypeID+`,@actionDate,`+req.session.passport.user.staffID+`,`+req.body.agentID+`,'`+req.body.type+`',`+req.body.score+`,@reportURL)`
    if (req.body.actionID) {
      q=`delete from AbsenceActions where actionID=`+req.body.actionID
    }
    if (!req.body.delete) {
      try {
        db.input('actionDate',new Date(req.body.actionDate))
        db.input('reportURL',req.body.reportURL)
      } catch (e) {
        console.log(e)
        res.status(500).send({error:"Error changing absence action"})
      }
    }
    db.query(q,(err,r)=>{
      if (err) {
        console.log(err)
        res.status(500).send({error:"Error changing absence action"})
      }else {
        res.send(q.split(" ")[0]+" successful")
      }
    })
  },
  getHRletter:(req,res)=>{
    var PizZip = require('pizzip');
    var Docxtemplater = require('docxtemplater');
    const fs = require('fs');
    const fsx = require("fs-extra");
    const sanitize = require("sanitize-filename");
    var content
    try{
      content = fs.readFileSync(publicPath + '/templates/'+req.body.fileName+".docx", 'binary');
    }catch(err){
      console.log(err)
      res.status(500).send({error:"Error creating document. Contact the administrator"})
    }
    var zip = new PizZip(content);
    var doc;
    try {
      doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true})
    } catch(err) {
      console.log(err)
      res.status(500).send({error:"Error creating document. Contact the administrator"})
    }
    doc.setData(req.body.data);
    try {
      doc.render()
    }
    catch (err) {
      console.log(err)
      res.status(500).send({error:"Error creating document. Contact the administrator"})
    }
    var buf = doc.getZip().generate({type: 'nodebuffer'});
    let fileDate=moment(req.body.data.today,'DD/MM/YYYY').format("DDMMYYYY")
    fs.writeFileSync(publicPath + '/temp/'+req.body.newFileName+" - "+req.body.data.agentName+" "+fileDate+".docx", buf);
    res.send('/temp/'+req.body.newFileName+" - "+req.body.data.agentName+" "+fileDate+".docx")
  },
  bonusSchemesPage:(req,res)=>{
    let schemesQ=`select * from bonusSchemes`
    db.query(schemesQ,(err,schemesR)=>{
      res.render("bonus-schemes.ejs",{
        title:"Interviewer Bonus Schemes",
        schemes:schemesR.recordset
      })
    })
  },
  getPayRates:(req,res)=>{
    db.query("select top (select top 1 COUNT(*) from PayRates group by dateFrom order by dateFrom desc) * from PayRates order by dateFrom desc",(err,r)=>{
      res.send(r.recordset)
    })
  }
};
