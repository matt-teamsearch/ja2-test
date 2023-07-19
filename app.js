const express = require('express');
// const cluster = require('node:cluster');
// const totalCPUs = require('node:os').cpus().length;
// const process = require('node:process');
// console.log(`Number of CPUs is ${totalCPUs}`);
// console.log(`Process ${process.pid} is running`);
const fileUpload = require('express-fileupload');
const bodyParser = require('body-parser');
const sql = require('mssql');
const path = require('path');
const https = require('https');
const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json({limit: '200mb'}));
app.use(bodyParser.urlencoded({limit: '200mb', extended: true, parameterLimit: 1000000}));
app.use(bodyParser.text({ limit: '200mb' }))
const nodeMailer = require('nodemailer');
const axios = require('axios');
const crypto = require('crypto');
const algorithm = 'aes-256-cbc';
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);
const fs = require('fs');
const moment = require('moment-business-days');
const MomentRange = require('moment-range');
MomentRange.extendMoment(moment)
const momentDurationFormatSetup = require("moment-duration-format");
const uuid = require('uuid').v4;
const session = require('express-session')
const FileStore = require('session-file-store')(session)
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const cron = require('node-cron');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const flash = require('connect-flash-plus');
const fsx = require("fs-extra");
const { once, EventEmitter } = require('events');
const emitter = new EventEmitter();
const clicksend = require('./node_modules/clicksend/api.js');
const libphonenumber = require('libphonenumber-js')
const nodeoutlook = require('nodejs-nodemailer-outlook')
const _ = require('lodash')
const ja2Version=2
const dotenv = require("dotenv");
dotenv.config();
const { initializeApp }=require("firebase/app");
const { getStorage }=require("firebase/storage");
// const ngrok = require('ngrok')

global.versionPages={}
if (ja2Version==1) {
  versionPages.login='login.ejs'
  versionPages.changePassword='change-password.ejs'
  versionPages.forgotPassword='forgot-password.ejs'
  versionPages.passwordReset='password-reset.ejs'
  versionPages.header='header.ejs'
  versionPages.home=(req,res)=>getMenu(req,res)
}else if (ja2Version==2) {
  versionPages.login='login-v2.ejs'
  versionPages.changePassword='change-password-v2.ejs'
  versionPages.forgotPassword='forgot-password-v2.ejs'
  versionPages.passwordReset='password-reset-v2.ejs'
  versionPages.header='header-v2.ejs'
  versionPages.headerExt='login-header-v2.ejs'
  versionPages.home=(req,res)=>homePage(req,res)
}
// const https = require('https');

function encrypt(text) {
 let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
 let encrypted = cipher.update(text);
 encrypted = Buffer.concat([encrypted, cipher.final()]);
 return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
}

function decrypt(text) {
 let iv = Buffer.from(text.iv, 'hex');
 let encryptedText = Buffer.from(text.encryptedData, 'hex');
 let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
 try {
   let decrypted = decipher.update(encryptedText);
   decrypted = Buffer.concat([decrypted, decipher.final()]);
   return decrypted.toString();
 } catch (e) {
   return
 }
}

// log file
const monthM = new Date().getMonth()
const yearM = new Date().getFullYear()
const log4js = require('log4js');
log4js.configure({
  appenders: { theLog: { type: 'file', filename: __dirname+'/logs/Job Analysis 2.0 log ' + (monthM + 1) + "-" + yearM + '.log' } },
  categories: { default: { appenders: ['theLog'], level: 'info' } }
});
global.logger = log4js.getLogger('theLog');
global.publicPath=path.join(__dirname, 'public')


const port = 8080;
var authOn = true;
global.uncaughtException=null
process.on('uncaughtException', function (e) {
  logger.info(e);
  console.log(e)
  if (!uncaughtException && process.env.SERVICE_ID && transporter) {
    uncaughtException=e
    transporter.sendMail({from:'reports@teamsearchmr.co.uk',to:'matt@teamsearchmr.co.uk',subject:'JA2 Error',html:'<b>Data:</b><br>'+e.message+'<br>'+e.stack},(err,info)=>{
      console.log("crash email sent",info)
      uncaughtException=null
    })
  }
  console.log('Process uncaughtException event with exception: ', e);
});
console.log('connecting to server');
// create connection to database
const server = app.listen(port, function () {
  console.log('successfully connected to server');
  // (async function() {
  //   const url = await ngrok.connect({addr:port,authtoken:'2MN8B0OArGMqJOKDT0GOjXGgG4h_3Qx9Pv3jsg9ALCcFBeBSk'});
  //   console.log("ngrok connected",url)
  // })();
});

const { Server } = require("socket.io");
global.socketio = new Server(server);
let socketioEmitting=false
global.socketProgUpdate=(sid,title,progMsg)=>{
  if (progMsg && !socketioEmitting) {
    socketioEmitting=true
    socketio.to(sid).emit("progress-update",(title?(title+": "):'')+progMsg.msg+(progMsg.percDone!==undefined?(' '+Math.round(progMsg.percDone*100)+"%"):''),()=>{
      // console.log("emitted")
      socketioEmitting=false
    })
  }
}
let lastProgMessage=""
global.progressUpdate=(req,msg,ev,sid)=>{
  let id=sid||req.get("socket-id")
  if (id&&msg&&lastProgMessage!=msg) {
    socketioEmitting=true
    lastProgMessage=msg
    socketio.to(id).emit(ev||"progress-update",msg,()=>{
      // console.log("emitted")
      socketioEmitting=false
    })
  }
}
global.resourceUpdating=false
global.liveForstaData=null
let lastLiveForstaDataUpdate=0
socketio.on('connection', (socket) => {
  socket.on('resource changed',data=>{
    socket.broadcast.emit("resource changed",data)
  })
  socket.on('cc-activity-request',forceUpdate=>{
    console.log("cc-activity-request")
    getLiveForstaData(forceUpdate).then(e=>{
      console.log("cc-activity-ready")
      socket.emit("cc-activity-ready")
    })
  })
  socket.on('screenshare-request', (sid) => {
    console.log('screenshare-request from ', socket.id, " for ",sid);
    socket.to(sid).emit('screenshare-request', socket.id);
  });
  socket.on('screenshare-end', (sid) => {
    console.log('screenshare-end from ', socket.id, " for ",sid);
    socket.to(sid).emit('screenshare-end', socket.id);
  });
  socket.on('offer', (offer) => {
    console.log('new offer from ', socket.id);
    socket.to(offer.target).emit('offer', {pld:offer.pld,source:socket.id});
  });

  socket.on('answer', (answer) => {
    console.log('new answer from ', socket.id);
    socket.to(answer.target).emit('answer', {pld:answer.pld,source:socket.id});
  });

  socket.on('icecandidate', (candidate) => {
    console.log('new ice candidate from ', socket.id);
    socket.to(candidate.target).emit('icecandidate', candidate.candidate);
  });
  // console.log(socket.request.session.passport)
  // console.log('a user connected',socket);
});
global.getLiveForstaData=(forceUpdate)=>{
  return new Promise((res,rej)=>{
    let msSince=new Date().getTime()-lastLiveForstaDataUpdate
    let triggerSeconds=10
    console.log("seconds since last liveForstaData update",msSince/1000)
    if (msSince>(triggerSeconds*1000)||forceUpdate) {
      updateLiveForstaData((msSince/1000)+60).then(e=>{
        res(liveForstaData)
      }).catch(err=>{
        console.log(err)
        rej(err)
      })
    }else {
      res(liveForstaData)
    }
  })
}
global.pageGuides={
  "/data-editor":[
    "Data-editor__4T1V_waaT0O0tWSKrrgtvw"
  ]
}

console.log('creating constants');

const {viewTally, loadNewQC, addNewQC, getQCsplash, getQCsuggestion, editQC, deleteQC, checkQCID, loadTallySheet, updateTallyAllo, updateTallyDaily, updateAbsence, updateTallyNote, updateTallyBonus, updateTallyBooking, loadTallySheetPost, getTallyPerf, getAgentRecents, getJobRecents, manualBonus, getRCrecording, downloadRCrecording, qcEmailOnly, addOne2one, updateLateness, updatePayReduction,getDowntime,updateDowntime,ccActivity} = require('./routes/daily');
const {getQuotes, getClientQuotes, searchQuotesPage, getClientFilteredQuotes, deleteQuote} = require('./routes/quotes');
const {getProjectPage, getClientProjects, getLiveProject, viewPlanner, viewPlannerOld, updateResourcePlanner, foreCast, getFeedbackPage, submitFeedback, getMenu, ajaxPlanner, allocateCell, updateAlloCell, updateNote, ajaxPlannerAHR, getResourceProjections, getLiveJobs, getSearch, eventSeen, saveImg, resourcePlannerAjax, getBooked, liveReport, saveLiveReport, saveLiveReportNames, clearLiveReportCell, adminPanel, clearPDPs, clearCoachingFollowUps, saveLiveReportEdit, getLiveReportEdits,updateLiveReportInclusion,f2fTabletAdmin,getF2fTabletAllocations,checkInTablet,checkOutTablet,checkInAccessory,checkOutAccessory,getF2fAgent,inboundLinePage,updateInboundLine,addComplaintPage,addComplaint,editComplaint,getComplaintsLog,complaintsLog,updateComplaint,deleteFile,recordingSearch,addComplaintRecording,getRCrecordingStream,addSupplierPage,addSupplier,editSupplier,editSupplierPage,deleteSupplier,viewSuppliers,reviewSupplier,submitSupplierReview,prevCompsPage,prevUnusedPage,registerPrevCompsDownload,addCsatComplaints,editF2fTabletPage,editF2fTablet,editF2fAccessoryPage,editF2fAccessory,addAutoResource,removeAutoResource,bookingHubData,bookingHub,sendBookingEmail,sendBookingText,sendRCmessage,attendanceHub,attendanceHubData,contTrackingData,getFilters,postcodeLookup,longLatLookup,suggestPostcode,homePage,getNotes,updatePlanner,updatePlannerAHR,getProjectInfo,getJobInfo,autoResource,updateResourceRecalcs,applyPlannerAdjustments,autoAllocate,autoAllocateDate,getAutoAllocations,addPlannedRecruitment,allIndex,getAllProjects,getPrevCompInfo,downloadFile} = require('./routes/index');
const {addProjectPage, addProject, editProject, editProjectPage, viewProjectPage, editQuotePage, editQuote, projectClosingPage, getCostTypes, addProjectCost, updateProjectCost, closeProject, addProjectSpend, updateProjectSpend, getSuppliers, getjobCPIs, getJobFolder, createPCform, addProjectDate, addProjectToPD, checkCostDelete, updateDataFormats, getPMworkloads, compareProjectPage, getSqlPlannerTasks, postTasksToTeamup, deleteTasksFromTeamup, getTeamupTasks, projectQueryPage, getProjectQueries, addProjectQuery, getQueryReplies, addProjectqueryReply, getProject, repeatProject, getQuickReviewQueries, addQueryImg, deleteQueryImg, getProjectJobs, createContract,updateProjectAudit,addProjectAudit,deleteProjectAudit,projectStatsAjax,sampleOutcomeUpload,taskDone,sampleOutcomes,sampleOutcomesForsta,uploadSampleOutcomes,addTimedLOI,addTaskInfo,closingBudgetCheck,checkCsat,renderWorkloads,getHourlyAHR,dedicatedTeams,updateOutcomesMap,forstaOutcomesDownload,sampleOutcomeCount} = require('./routes/project');
const {addInterviewerPage, addInterviewer, editInterviewer, editInterviewerPage, deleteInterviewer, getInts, interviewerPerformance, interviewerPayPage, interviewerPaySearch, editPayRates, updatePayRates,getPayRates, leagueTable, leagueTablePost, loadTeamManagement, updateAgentTeam, updateTeam, addCoaching, loadCoaching, deleteCoaching, getBooking, setBooking, deleteBooking, getHolidays, getRegularHours, updateRegularHours, deleteRegularHours, getBookingAbsence, updateBookingAbsence, getCoachingFollowUp, updateCoachingFollowUp, checkAgentDate, getQCissuesForCoaching, getBreatheAgent, interviewerSnapshotPage, interviewerSnapshotData, updateAgentRCID,addRCuser,updateRChours,getAvgWage,getBookingRequests,bookingRequestsPage,confirmBookingRequest,getOne2oneForm,getPayrollExcel,updateAbsenceAction,getHRletter,bonusSchemesPage} = require('./routes/interviewer');
const {addClientPage, addClient, editClientPage, getClients, clientPerformance,clientStats} = require('./routes/client');
const {addPanelPage, addPanel, getPanels, panelPerformance} = require('./routes/panel');
const {viewStaff, addStaffPage, updateStaff, addStaff, deleteStaff, getTeamup, getStaff, viewF2fAgents,addF2fSupervisorPage,addF2fSupervisor,updateF2fSupervisor,deleteF2fSupervisor,addF2fAgentPage,addF2fAgent,updateF2fAgent,deleteF2fAgent} = require('./routes/staff');
const {addGroup, addGroupPage, addIncentivePage, addOtherCostPage, editGroup, updateGroup, addIncentive, editIncentive, updateIncentive, addOtherCost, editOtherCost, updateCost, addSampleSpendPage, editSampleSpend, updateSampleSpend, addSampleSpend, addOnline, addOnlineInterviews, editOnlineSpend, updateOnlineSpend, deleteGroup, updateGroupAjax, addGroupDate, checkGroupStart, checkGroupEnd, duplicateGroup, updateGroupCPI, addGroupAjax, updatePastTarget, getJobGroupings, f2fTracker, getF2fAllocations,addF2fAllocation,addF2fDaily,deleteF2fAllocation,getF2fTablets,addF2fTabletAllocation,deleteF2fTabletAllocation,onlineTracker, getOnlineAllocations,addOnlineAllocation,addOnlineDaily,deleteOnlineAllocation,changeDate,addF2fBonusCalc,getF2fBonusCalcs,updateF2fBonusAllocs,updateF2fBonus,dedicateAgent,undedicateAgent,getDedicatedTeam,updateDedicatedDates,getDedicatedDates,getPayclaimLinks,updatePayclaimLinks} = require('./routes/groups');
const {allocateDates, allocationPageRedirect, allocationPage, submitAllocation, reallocate, editAllocation, updateAllocation} = require('./routes/allocate');
const {emailFooter, emailHeader} = require('./snippets/emails');
const {viewReport, dailyReport, getDialReport, getDialHourlyReport, dialsUpload, dialIDupdate, dialsToSQL, dialsHourlyToSQL, salesSpend, clientSatReport, getCallCentreReports, emailPerf, getTeamReport, miDashboard, miDashboardAjax,getRCdials,updateSqlDials,bookingReport,dialsAnalysisPage,dialsAnalysisData,staffReports,opsDigest,logViewer,qcIssuesReport,getAdvisories,getAgentCoachings,getAdvisory,getAgentsAdvisories,getAgentAdvisories,getAdvisoryChecks,advisorySpotlights,ccKPIs,ccKPIdata,digestData,miBoardReport,quotesReport,quotesReportData,allBookingData} = require('./routes/reports');
const {apiProjects, apiSampleReports, apiDailySelect, apiDailyView} = require ('./routes/apiProjects');
const {getDashboard, getUsers, addUser} = require ('./routes/dashboard');
const {allProjects, allQCchecks, projectQCchecks, allProjectsRaw, allAgentsRaw, getPrevCompsData,getPrevUnusedData, overdueFollowups, overduePDPs, overdueTasks, getChangeLog,liveJobsRaw,allJobsRaw,getProjectDates,getProjectSpends,getClientStats,agentShifts,agentBookings,allQuotes,allOne2ones} = require ('./routes/tables');
const {getCsatScores,getForstaSurveys,getFortaCompletes,getFortaSurveyQuestions,getForstaReportLink,duplicateForstaQuestion,updateForstaData,getExportHistory,addExportHistory,getForstaDataChanges,undoForstaData,createForstaToplines,createForstaDatafile,forstaAgentByDate,getFortaIncentives,getForstaQuotas,updateForstaQuotas,getForstaActivity,getForstaAgents,getForstaGroups,addRespondents, removeForstaProjectGroups} = require ('./routes/forsta');
const {verbatimChecking,spellcheck,excelToJson,exportVerbsToWord,importVerbsFromWord,addForstaDataCleans,getForstaDataCleans,getKeywords,defineVerbatims,removeForstaDataCleans} = require ('./routes/production');
const {getForstaAssignmentPage,setForstaAssignment} = require ('./routes/external');

// var options = {
//   key: fs.readFileSync('./localhost-key.pem'),
//   cert: fs.readFileSync('./localhost.pem'),
// };

// var httpsServer=https.createServer(options, app).listen(443);
// const config = {
// user: 'ja_test',
// password: 'ja_test',
// server: 'TS-SQL\\TS_SQL',
// database: 'ja_2_test',
// };

const config = {
   user: 'project_analysis',
   password: 'TS_pa_007!',
   server: 'TS-SQL\\TS_SQL',
   database: 'project_analysis',
   requestTimeout: 180000,
 };
global.breatheEmployees=[]
global.rcEmployees=[]
// connect to database
function sqlConnect(){
  console.log("Attempting database connection")
  sql.connect(config, function (err) {
    if (err) {
      console.log(err);
      sql.close()
      setTimeout(sqlConnect,10000)
    }
    else {
      console.log("Successfully connected to database");
      emitter.emit('SQLconnected')
      rcLogin().then(e=>{
        // syncRCdials('2023-01-04',null)
        // syncRCdials(1)
        // syncRCdials('2022-12-23',null)
        // redoDials('2023-01-12','2023-01-30')
        // syncRCdialsNew('2022-05-11')
        // accouncement()
        // manualDialUpdate()
        rcPlatform.get('/restapi/v1.0/account/~/extension/',{type:'User',perPage:500}).then(function(resp){
          resp.json().then(function(rcAgents){
            rcEmployees=rcAgents.records
            // db.query("select * from agents where agentLeft is not null and ringCentralID is not null",(err,r)=>{
            //   let leftAgents=rcEmployees.map(el=>({ringCentral:el,JA2:r.recordset.find(a=>a.ringCentralID==el.id)})).filter(el=>el.JA2 && el.ringCentral.contact.department.indexOf("Interviewer")>-1 && el.ringCentral.status!='Disabled')
            //   let i=0
            //   function loop(){
            //     if (leftAgents[i]) {
            //       removeRCUser(leftAgents[i].ringCentral.id,false).then(e=>{
            //         i++
            //         loop()
            //       })
            //     }else {
            //       console.log(i+" agents disabled on RC")
            //     }
            //   }
            //   loop()
            // })
            // console.log("rcEmployees set",rcEmployees.length)
          })
        }).catch(err=>console.log("Error setting rcEmployees on restart",err))
      }).catch(e=>console.log(e))
      getBreatheEmployees().then(function(e){
        breatheEmployees=e
        // console.log("breatheEmployees set",e.length)
      }).catch(err=>{
        console.log("Error setting breatheEmployees on restart",err)
      })
      updateGoogleTally().catch(e => {
        console.log("Error in updateGoogleTally: "+e)
      })
      // sendBookingReport(1)
      // sendFollowUps()
      // sendBookingForm(true)
      contChangeCheck()
      // applyRegularHours().then(e=>{
        // sqlCleanup()
      // })
      // dbTest()
      // attendanceEmails()
      // getBookingData()
      // tuesdayReport()
      // manualQuotesChaseReport()
      // sendMondayReport()
      // quoteChaseEmails()
      // csatChaseEmails()
      // quoteChaseReport()
      // lastYearChaseReport()
      // chaseOutcomes()
      // escalationEmail()
      // sendRemoteWorkerReport()
      // sendSundayInts()
      // noShowAlerts()
      // getBookingReq()
      // rejectBookings()
      // loopWorkingHours()
      // setDailyResourceTargets().then(e=>{
      //   addAutoAllocations()
      // })
      // sendUpdateSummary(moment('2023-02-13').subtract(1,"week"),moment('2023-02-13').subtract(1,"day"),"Last Week")
      initialNoShows()
      testFunc()
      // forstaReq({method:"post",url:"/surveys/p620072690479/responses/data/query",data:{
      //   variables:'respid,status,interview_start,interview_end,lastchannel,lastdevicetype,lastrenderingmode,last_touched,lastcomplete,first_question_on_last_page_displayed,its,QS1,QS2,QS3a,QS3a.11$other,QS3b,QS3c,QS3c.11$other,QS4a,QS4b,QC_summary,FinalLOI',
      //   filterExpression:"response:status='complete' OR selected(response:LastExtStatus,'51')"
      // }}).then(e=>{
      //   console.log(e)
      //   let qid=e.queryId
        // let qid=611886
        // function checkStatus(){
        //   forstaReq({url:"/surveys/p620072690479/responses/data/query/"+qid}).then((e,r)=>{
        //     console.log(e)
        //     if (e.queryStatus=="preparing") {
        //       checkStatus()
        //     }else {
        //       let records=[]
        //       function getRecords(){
        //         forstaReq({url:"/surveys/p620072690479/responses/data/query/"+qid+"/data"},(err,r,rr)=>{
        //           records=records.concat(r)
        //           if (rr.status==206) {
        //             console.log(records.length+" records received")
        //             getRecords()
        //           }else {
        //             console.log("Query completed. "+records.length+" records received")
        //             //return data
        //           }
        //         })
        //       }
        //       getRecords()
        //     }
        //   })
        // }
        // checkStatus()
      // })
    }
  });
}
sqlConnect()

global.db = new sql.Request();
global.sql = sql;
global.logChange=function(req,changeTable,changeField,changeValue,IDs){
  let idArr=Object.keys(IDs).map(key=>{ return {field:"change"+key,value:IDs[key]}})
  let q="insert into changeLog (changeDate,changeBy,changeTable,changeField,changeValue,"+idArr.map(i=>i.field).join(",")+") VALUES "
  q=q+"(@changeDate,"+req.user.user+",'"+changeTable+"','"+changeField+"',@changeValue"+changeField+","+idArr.map(i=>i.value).join(",")+")"
  db.input('changeDate', sql.DateTime, new Date())
  db.input('changeValue'+changeField,changeValue)
  q="select 0"
  return db.query(q)
}

function royalMailTracking(id){
  axios.request({
    url: 'https://api.royalmail.net/mailpieces/v2/summary?mailPieceId='+id,
    method: 'get',
    headers: {
      Accept: 'application/json',
      'X-IBM-Client-Secret': process.env.RM_API_SECRET,
      'X-IBM-Client-Id': process.env.RM_API_CLIENT,
      "x-accept-rmg-terms": {enum:['yes']}
    }
  }).then((result,err) => {
    if (err) return console.error('Failed: %s', err.message);
    console.log('Success: ', result);
  }).catch(function(e){
    console.log("Royal Mail API bad request",e.response.status,e.response.statusText)
  });
}
// royalMailTracking("VE163101564GB")
const RC = require('@ringcentral/sdk').SDK

global.rcsdk = new RC( {server: process.env.RINGCENTRAL_SERVER, clientId: process.env.RINGCENTRAL_CLIENTID, clientSecret: process.env.RINGCENTRAL_CLIENTSECRET} );
global.rcPlatform = rcsdk.platform();
global.rcsdkMedia = new RC( {server: 'https://media.ringcentral.com', clientId: process.env.RINGCENTRAL_CLIENTID, clientSecret: process.env.RINGCENTRAL_CLIENTSECRET} );
global.rcMedia = rcsdkMedia.platform();
// rcPlatform.on(rcPlatform.events.rateLimitError, function(e){
//   console.log("caught ratelimiterror",e.request)
// });
global.bingStack={lastRequest:new Date(),requests:[]}
global.stackBingRequest=(req,cb)=>{
  let id=(new Date()).getTime()
  bingStack.requests.push({id:id,req:req})
  setTimeout(()=>{
    bingStack.lastRequest=new Date()
    axios.request(req).then(function (response) {
      bingStack.requests=bingStack.requests.filter(r=>r.id!=id)
    	cb(null,response.data)
    }).catch(function (error) {
      cb(error,null)
    });
  },bingStack.requests.length*400)
}
global.forstaToken=""
global.forstaCATIToken=""
global.forstaReq=(reqParams,cb)=>{
  console.log("ReqParams",JSON.stringify(reqParams))
  if (!cb) {
    cb=()=>{}
  }
  return new Promise((resolve,rej)=>{
    let totalRecords=1
    let fetchedRecords=0
    let p=1
    let finalData=[]
    reqParams.method=reqParams.method?reqParams.method:'get'
    reqParams.data=reqParams.data || {}
    let customPaging=!!reqParams.data.page
    reqParams.data.pageSize=reqParams.data.pageSize?reqParams.data.pageSize:10000
    function getReq(){
      reqParams.data.page=reqParams.data.page?reqParams.data.page:p
      let thisReq = axios.create({
        baseURL: 'http://ws.euro.confirmit.com/v1',
        Accept: reqParams.accept?reqParams.accept:'application/json',
        responseType:reqParams.responseType?reqParams.responseType:'json',
        headers: {'Authorization': 'Bearer '+forstaToken,Accept: reqParams.accept?reqParams.accept:'application/json'}
      });
      let thisParams={params:reqParams.data,data:reqParams.data}
      let payload=thisParams
      if (reqParams.method.toLowerCase()!="get") {
        payload=thisParams.data
      }
      if (reqParams.noPaging) {
        delete payload.pageSize
        delete payload.page
        // delete reqParams.noPaging
      }
      console.log("sending Forsta request",reqParams.method,reqParams.url,payload)
      thisReq[reqParams.method.toLowerCase()](reqParams.url,payload).then(e=>{
        // console.log(e)
        console.log("Forsta request succeeded")
        if (!e.data.items && p==1) {
          cb(null,e.data,e)
          resolve(e.data,e)
        }else {
          totalRecords=e.data.totalCount
          fetchedRecords+=e.data.itemCount
          finalData=finalData.concat(e.data.items)
          if (fetchedRecords<totalRecords && !customPaging) {
            p++
            getReq()
          }else {
            cb(null,finalData,e)
            resolve(finalData,e)
          }
        }
      }).catch(err=>{
        if (err.response) {
          if (err.response.status==401) {
            const urlx = require('url');
            let params=new urlx.URLSearchParams({
              scope:reqParams.scope?reqParams.scope:'pub.surveys',
              grant_type:'api-user',
              client_id:process.env.FORSTA_CLIENTID,
              client_secret:process.env.FORSTA_SECRET
            })
            return axios.request({
              url: 'https://idp.euro.confirmit.com/identity/connect/token',
              method: 'post',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              data:params
            }).then(e=>{
              forstaToken=e.data.access_token
              getReq()
            }).catch(err=>{
              console.log("Couldn't get Forsta token",err)
              cb(err,null,null)
              rej(err)
            })
          }else {
            cb(err,null,null)
            rej(err)
          }
        }else {
          console.log(err)
        }
      })
    }
    getReq()
  })
}
global.getForstaSchema=(pid,responses,respondents,includeCallHistory)=>{
  let getQorder=()=>{
    return new Promise(res=>{
      forstaReq({url:'/surveys/'+pid,method:"get",accept:"application/zip",responseType:"stream"},(err,r,resp)=>{
        const XmlReader = require('xml-reader');
        const uuidv4 = require('uuid').v4
        let id=uuidv4()
        let id2=uuidv4()
        let zipPath=publicPath + '/temp/'+id2+'.zip'
        resp.data.pipe(fs.createWriteStream(zipPath)).on('finish',(err)=> {
          if (err) {
            console.log(err)
          }else {
            const archiver = require('archiver');
            const DecompressZip = require('decompress-zip');
            const archive = archiver('zip');
            let unzipper = new DecompressZip(zipPath);
            unzipper.on('error', function (err) {
              console.log(err);
            });
            unzipper.on('extract', function (log) {
              const reader = XmlReader.create({stream: true});
              let file=fs.readdirSync(publicPath+'/temp/'+id+'/')[0]
              let qNames=[]
              fs.readFile(publicPath+'/temp/'+id+'/'+file, 'utf8', function(err, data) {
                reader.on('tag:Name', (data) => qNames.push(data.children[0].value))
                reader.on('done', (data) => {
                  fs.unlink(publicPath+'/temp/'+id+'/',()=>{})
                  fs.unlink(zipPath,()=>{})
                  res(qNames)
                });
                reader.parse(data)
              })
            })
            unzipper.extract({
              path: publicPath+'/temp/'+id+'/',
              restrict:false,
            })
          }
        })
      })
    })
  }
  let respondentSchema=()=>{
    return new Promise((res1,drej)=>{
      forstaReq({url:"/surveys/"+pid+"/respondents/schema"},(err,r,respondentR)=>{
        if (err) {
          drej(err)
        }
        res1(respondentR.data.root.variables.map(v=>({...v,...{db:"respondent"}})))
        // dres({schema:_.uniqBy(data.concat(respondentR.data.root.variables),"name"),loops:loops})
      })
    })
  }
  let responseSchema=()=>{
    return new Promise((res1,drej)=>{
      forstaReq({url:"/surveys/"+pid+"/responses/schema"},(err,r,responseR)=>{
        if (err) {
          drej(err)
        }
        getQorder().then(order=>{
          order.reverse()
          let data=responseR.data.root.variables
          let loops=JSON.parse(JSON.stringify(responseR.data.root.children))
          if (!includeCallHistory) {
            responseR.data.root.children=responseR.data.root.children.filter(l=>l.name!="callhistoryinfo")
            loops=loops.filter(l=>l.name!="callhistoryinfo")
          }
          function flattenLoops(){
            return new Promise(fres=>{
              if (currLevel.children) {
                promForEach(currLevel.children,(loop,li,lnext)=>{
                  if (pathPos==0) {
                    let thisOi=order.indexOf(loop.name)
                    let prevQ=order.find((o,oi)=>oi>thisOi&&data.find(d=>(d.parentVariableName||(d.originalname||d.name))==o))
                    let prevQi=data.findIndex(d=>(d.parentVariableName||(d.originalname||d.name))==prevQ)
                    insertPos=prevQi
                  }
                  promForEach(loop.keys[0].options,(option,oi,onext)=>{
                    levelPath[pathPos]=levelPath[pathPos]||{}
                    levelPath[pathPos][loop.name]=option.code
                    promForEach(loop.variables,(variable,vi,vnext)=>{
                      let newVar=JSON.parse(JSON.stringify(variable))
                      newVar.originalname=newVar.name
                      // newVar.loopParent=loop.name
                      // newVar.loopCode=option.code
                      newVar.levelPath=JSON.parse(JSON.stringify(levelPath))
                      newVar.name+=":"+levelPath.map(el=>Object.values(el)[0]).join(":")
                      // console.log(loop.name,option.code,newVar.name,levelPath)
                      if (!newVar.titles) {
                        newVar.titles=[{text:newVar.name}]
                      }
                      newVar.titles[0].text+=" - "+((option.texts || [])[0] || {}).text

                      insertPos++
                      data.splice(insertPos,0,newVar)
                      vnext()
                    }).then(e=>{
                      onext()
                    })
                  }).then(e=>{
                    currLevel=loop
                    // delete levelPath[pathPos]
                    pathPos++
                    console.log("finished iterating child")

                    flattenLoops().then(e=>{
                      levelPath=[]
                      pathPos=0
                      lnext()
                    })
                  })
                }).then(e=>{
                  fres()
                })
              }else {
                fres()
              }
            })
          }
          let levelPath=[]
          let pathPos=0
          let currLevel=responseR.data.root
          let insertPos=0
          // console.log(loops)
          data=data.concat(loops.map(l=>({...l,...{isLoop:true}})))
          flattenLoops().then(e=>{
            let inQnaire=false
            promForEach(data,(question,qi,qnext)=>{
              if (question.name=="LastQuestionSeen"||(question.tags||[]).includes("from-template")) {
                inQnaire=false
              }
              question.specifyVariables=(question.otherVariables||[]).concat((question.options||[]).filter(o=>o.hasOtherField).map(o=>question.name+"."+o.code+"$other"))
              // console.log(question)
              if (inQnaire || (question.levelPath&&Object.keys(question.levelPath[0])[0]!="callhistoryinfo")) {
                question.isInQnaire=true
              }
              if (question.name=="QC2a") {
                inQnaire=true
              }
              question.db="response"
              qnext()
            }).then(e=>{
              res1({schema:data,loops:loops})
            })
          })
        })
      })
    })
  }
  return new Promise((dres,drej)=>{
    let data={
      schema:[]
    }
    if (responses) {
      responseSchema().then(e=>{
        data=e
        if (respondents) {
          respondentSchema().then(e=>{
            data.schema=_.uniqBy(data.schema.concat(e),"name")
            dres(data)
          }).catch(drej)
        }else {
          dres(data)
        }
      }).catch(drej)
    }else {
      respondentSchema().then(e=>{
        data.schema=_.uniqBy(data.schema.concat(e),"name")
        dres(data)
      }).catch(drej)
    }
  })
}
global.getForstaData=(reqParams,isPaged,updateFunc)=>{
  //reqParams:
  //filterExpression
  //completesFilter
  //page
  //pageSize
  //pid **required
  //respondents
  //callhistory
  //variables []
  console.log(reqParams)
  let data=[]
  let params={
    url:"/surveys/"+reqParams.pid+"/responses/data",
    method:"get",
    data:{}
  }
  params.data.filterExpression=reqParams.filterExpression || null
  params.data.page=reqParams.page || null
  params.data.pageSize=reqParams.pageSize || null
  return new Promise((dres,drej)=>{
    if (!reqParams.pid) {
      dres({data:[],schema:[]})
      return false
    }
    if (!updateFunc) {
      updateFunc=()=>{}
    }
    let getRespondents=()=>{
      return new Promise(res1=>{
        params.url="/surveys/"+reqParams.pid+"/respondents/data"
        params.data.filterExpression=reqParams.sampleFilter
        updateFunc("Getting sample records")
        forstaReq(params,(err,respondentR,resp)=>{
          if (err) {
            drej(err)
          }
          res1({data:respondentR,totalCount:resp.data.totalCount})
        })
      })
    }
    let getResponses=(respondentR)=>{
      return new Promise(res1=>{
        updateFunc("Getting survey schema")
        getForstaSchema(reqParams.pid,true,true,reqParams.callhistory).then(resp=>{
          let schema=resp.schema
          let loops=resp.loops
          params.url="/surveys/"+reqParams.pid+"/responses/data"
          if (reqParams.variables) {
            // console.log(schema)
            let vars=Array.isArray(reqParams.variables)?reqParams.variables:reqParams.variables.split(",")
            vars.push("respid")
            // vars.push("TSID")
            // console.log(schema.filter(sc=>sc.originalname),vars)
            let rootVars=schema.filter(sc=>sc.db=="response" && (sc.isSystemVariable || vars.includes((sc.originalname||sc.name)) || vars.includes(sc.parentVariableName))).map(sc=>[(sc.originalname||sc.name)].concat(sc.specifyVariables)).flat(2)
            let loopVars=schema.filter(sc=>sc.levelPath && vars.includes(sc.originalname)).map(sc=>Object.keys(sc.levelPath[0])[0])
            params.data.variables=_.uniq(rootVars.concat(loopVars)).join(",")
          }
          // delete params.data.filterExpression
          params.data.filterExpression=reqParams.completesFilter||""
          if (isPaged && respondentR) {
            params.data.filterExpression+=(params.data.filterExpression?" and ":"")+"IN(response:respid,"+respondentR.data.map(el=>el.respid).join(",")+")"
          }
          if (!params.data.filterExpression) {
            delete params.data.filterExpression
          }
          delete params.data.page
          delete params.data.pageSize
          updateFunc("Getting completes data")
          forstaReq(params,(err,responseR,r)=>{
            if (err) {
              drej(err)
            }
            // console.log("got raw data",responseR)
            promForEach(schema,(variable,vi,vnext)=>{
              if (variable.levelPath) {
                promForEach(responseR,(row,ri,rnext)=>{
                  // console.log(row,variable)
                  let currPath=variable.originalname
                  let currDataLevel=row
                  promForEach(variable.levelPath,(lev,li,lnext)=>{
                    if (currDataLevel) {
                      // console.log(currDataLevel,Object.keys(lev)[0])
                      currDataLevel=(currDataLevel[Object.keys(lev)[0]]||[]).find(l=>l[Object.keys(lev)[0]]==Object.values(lev)[0])
                      // console.log(lev,currDataLevel)
                      currPath+=":"+Object.values(lev)[0]
                      if (currDataLevel) {
                        row[currPath]=currDataLevel[variable.originalname]
                      }
                      if (row[currPath]===undefined) {
                        delete row[currPath]
                      }
                      lnext()
                    }else {
                      lnext()
                    }
                  }).then(e=>{
                    // console.log("Mapped loop var",variable.levelPath,row,currPath,row[currPath])
                    responseR[ri]=row
                    rnext()
                  })
                }).then(e=>{
                  vnext()
                })
              }else {
                vnext()
              }
            }).then(e=>{
              let totalCount
              if (respondentR) {
                // console.log(respondentR.data,responseR)
                data=respondentR.data.map(r=>({...r,...responseR.find(rr=>rr.respid==r.respid)}))
                totalCount=respondentR.totalCount
              }else {
                data=responseR
                totalCount=r.data.totalCount
              }
              res1({data:data,schema:schema,totalCount:totalCount})
            })
          })
        })
      })
    }
    if (reqParams.respondents) {
      getRespondents().then(e=>{
        getResponses(e).then(d=>{
          dres(d)
        })
      })
    }else {
      getResponses().then(d=>{
        dres(d)
      })
    }
  })
}
global.forstaCATIReq=(reqParams,cb)=>{
  return new Promise((resolve,rej)=>{
    reqParams.data=reqParams.data || {}
    function getReq(){
      let thisReq = axios.create({
        baseURL: 'http://cati.euro.confirmit.com/catiapi/companies/1074',
        Accept: 'application/json',
        headers: {
          'X-Confirmit-ApiKey': forstaCATIToken,
          Accept: 'application/json',
          'Content-Type' : 'application/json'
        }
      });
      // console.log("CATI token:",forstaCATIToken)
      thisReq.get('/').then(e=>{
        let thisParams={params:reqParams.data,data:reqParams.data}
        let payload=thisParams
        reqParams.method=(reqParams.method||"get")
        if (reqParams.method.toLowerCase()!="get") {
          payload=thisParams.data
        }
        thisReq[reqParams.method.toLowerCase()](reqParams.url,payload).then(e=>{
          // console.log("SUCCESS",e)
          cb(null,e.data,e)
          resolve(e.data)
        }).catch(err=>{
          console.log(err)
          cb(err)
          rej(err)
        })
      }).catch(e=>{
        // console.log("ForstaCATI error: ",e)
        // if (e.response.status==401) {
          forstaLogin().then(e=>{
            forstaCATIToken=e
            getReq()
          }).catch(e=>{
            forstaLogin().then(e=>{
              forstaCATIToken=e
              getReq()
            }).catch(e=>{
              cb("Couldn't log in")
              rej("Couldn't log in")
            })
          })
        // }
      })
    }
    getReq()
  })
}
global.puppetPage=null
global.getPuppet=(cb)=>{
  const puppeteer = require('puppeteer');
  return new Promise(res=>{
    // console.log("puppetPage?",!!puppetPage)
    if (puppetPage) {
      cb(puppetPage)
    }else {
      (async () => {
        const browser = await puppeteer.launch();
        puppetPage = await browser.newPage();
        console.log("Loaded puppetPage")
        cb(puppetPage)
      })();
    }
  })
}
global.forstaScraper={
  data:{}
}
global.getForstaPage=(url,cb)=>{
  getPuppet(page=>{
    (async () => {
      await page.goto(url);
      // await page.setViewport({width: 1080, height: 1024});
      // console.log("Gone to url")
      await page.waitForNetworkIdle({waitUntil: 'networkidle2'})
      try{
        let findUsername=await page.waitForSelector('#username',{timeout:500})
      }catch(e){
        cb(page)
        return false
      }
      try{
        // console.log("findUsername",findUsername)
        await page.waitForSelector('#username');
        await page.waitForSelector('#password');
        await page.type('#username', process.env.FORSTA_LOGIN_USERNAME);
        await page.type('#password', process.env.FORSTA_LOGIN_PASSWORD);
        await page.click('#btnlogin');
        console.log("Logged in to Forsta")
        cb(page)
      }catch(err){
        console.log("caught error",err)
        // page.close()
        cb(null,err)
      }
    })();
  })
}
global.formatSQLdate=dte=>dte?dte.toISOString().split("T")[0]:dte
global.asyncForEach=(arr,func,afterEach)=>{
  let l=0
  function loop(){
    if (l<arr.length) {
      let item=arr[l]
      func(item,l)
      if (afterEach) {
        afterEach(item,l)
      }
      l++
      loop()
    }
  }
  loop()
}
global.promForEach=(arr,func,betweenProm)=>{
  return new Promise(res=>{
    let l=0
    function loop(){
      if (l<arr.length) {
        let item=arr[l]
        if (item) {
          func(item,l,()=>{
            if (betweenProm) {
              betweenProm().then(()=>{
                l++
                loop()
              })
            }else {
              process.nextTick(()=>{
                l++
                loop()
              })
            }
          })
        }else {
          if (betweenProm) {
            betweenProm().then(()=>{
              l++
              loop()
            })
          }else {
            process.nextTick(()=>{
              l++
              loop()
            })
          }
        }
      }else {
        res()
      }
    }
    loop()
  })
}
global.promFor=(iterations,func,betweenProm)=>{
  return new Promise(res=>{
    let l=0
    function loop(){
      if (l<iterations) {
        func(l,()=>{
          if (betweenProm) {
            betweenProm().then(()=>{
              l++
              loop()
            })
          }else {
            process.nextTick(()=>{
              l++
              loop()
            })
          }
        })
      }else {
        res()
      }
    }
    loop()
  })
}
global.asyncWhile=(test,func)=>{
  let l=0
  function loop(){
    // console.log('while',test())
    if (test()) {
      func()
      l++
      loop()
    }
  }
  loop()
}
global.asyncDo=(func,test,promise,after,ifError)=>{
  let l=0
  function loop(){
    if (promise!=undefined) {
      promise().then(e=>{
        func(e)
        if (test()) {
          l++
          loop()
        }else {
          if (after!=undefined) {
            after()
          }
        }
      }).catch(e=>{
        if (ifError!=undefined) {
          ifError(e,()=>{
            after()
          })
        }else {
          console.log("asyncDo error",e)
          logger.info("asyncDo error",e)
        }
      })
    }else {
      func()
      if (test()) {
        l++
        loop()
      }
    }
  }
  loop()
}
global.breathReq = axios.create({
    baseURL: 'https://api.breathehr.com/v1',
    headers: {'X-API-KEY': process.env.BREATHE_APIKEY}
  });
global.teamupReq = axios.create({
    baseURL: 'https://api.teamup.com/ks2b2409e75351521d',
    headers: {'Teamup-Token': process.env.TEAMUP_APIKEY}
  });
global.dropboxReq = axios.create({
    baseURL: 'https://content.dropboxapi.com',
    headers: {
      'Authorization': 'Bearer '+process.env.DROPBOX_APIKEY,
      'Content-Type': 'text/plain'
    }
  });
global.govAPI = axios.create({
    baseURL: 'https://www.gov.uk'
  });
global.smsApi = new clicksend.SMSApi("Mattworsley", process.env.CLICKSEND_APIKEY);
global.clicksend=clicksend
global.bookingReq = axios.create({
  baseURL: 'https://script.google.com/macros/s/AKfycbw2iXX_ZoCX_cS3xHumfjAuz6WFLSdgfhGtuVpsKRXAAoqGhdbu_z855MxcetKtbxxO',
});
global.defaultBookingRequests=[]
global.getBookingReq=(week)=>{
  let bookingWeek=week?moment(week).isoWeekday(1):moment().add(2, 'weeks').isoWeekday(1)
  let checkDefault=()=>{
    return new Promise((resolve, reject) => {
      if (defaultBookingRequests.length>0 && bookingWeek.isSame(moment().add(2, 'weeks').isoWeekday(1),'day')) {
        resolve(defaultBookingRequests)
      }else {
        bookingReq.get('/exec?reqType=getBookings&bookingWeek='+moment(bookingWeek).format("YYYY-MM-DD")).then(e=>{
          resolve(e)
        })
      }
    })
  }
  return new Promise((resolve, reject) => {
    checkDefault().then(e=>{
      getBreatheEmployees(true).then(emps=>{
        let agentQ=`
        select agentID,agentName,breatheID,teamID
        from agents
        where agentLeft is null
        and breatheID is not null
        `
        db.query(agentQ, (err, agentR) => {
          let bookings=[]
          try{
            bookings=e.data.filter(el=>agentR.recordset.map(el=>el.agentID).includes(el.agentID))
          }catch(err){
            console.log(err,e,e.data)
          }
          let formatted=bookings.map((booking, i) => {
            let tableRow={}
            let shifts=booking.Shifts.map((shift, i) => {
              let st=null
              let en=null
              if (shift) {
                switch (shift) {
                  case '9am - 5pm':
                  st='09:00:00';
                  en='17:00:00';
                  break;
                  case '9am - 1pm':
                  st='09:00:00';
                  en='13:00:00';
                  break;
                  case '9.30am - 2.30pm':
                  st='09:30:00';
                  en='14:30:00';
                  break;
                  case '1pm - 5pm':
                  st='13:00:00';
                  en='17:00:00';
                  break;
                  case '1pm - 9pm':
                  st='13:00:00';
                  en='21:00:00';
                  break;
                  case '5pm - 9pm':
                  st='17:00:00';
                  en='21:00:00';
                  break;
                  case '10am - 2pm':
                  st='10:00:00';
                  en='14:00:00';
                  break;
                  case '1pm - 7pm':
                  st='13:00:00';
                  en='19:00:00';
                  break;
                  case '3pm - 7pm':
                  st='15:00:00';
                  en='19:00:00';
                  break;
                  case '1pm - 7.30pm':
                  st='13:00:00';
                  en='19:30:00';
                  break;
                  case '3pm - 7.30pm':
                  st='15:00:00';
                  en='19:30:00';
                  break;
                  default:
                }
              }
              tableRow['shift_'+i+"_req"]={st:st,en:en}
              tableRow['shift_'+i]={st:st,en:en}
              return true
            });
            tableRow.agentID=booking.agentID
            tableRow.weeks=booking.weeks?booking.weeks:1
            tableRow.bookingWeek=booking.bookingWeek
            tableRow.agentName=agentR.recordset.find(el=>el.agentID==booking.agentID).agentName
            tableRow.teamID=agentR.recordset.find(el=>el.agentID==booking.agentID).teamID
            tableRow.agentEmail=emps.find(emp=>emp.id==agentR.recordset.find(el=>el.agentID==booking.agentID).breatheID).email
            return tableRow
          })
          resolve(bookings.length==0?[]:formatted)
        })
      })
    })
  })
}
global.shortenURL = (urls,expireDays,tags) => {
  const headers = {
    "Content-Type": "application/json",
    // "apikey": "7805126d-01f8-4b4a-ab59-0b89eb7b48f2",
    auth:{
      username:process.env.TINYCC_USERNAME,
      password:process.env.TINYCC_PASSWORD
    },
  }
  tags=typeof tags==="string"?tags.split(","):(tags||[])
  urls=typeof urls==="string"?[urls]:(urls||[])
  return new Promise((resolve, reject) => {
    let endpoint = "https://tinycc.com/tiny/api/3/urls";
    let linkRequest = {
      urls: urls.map(u=>({
        long_url:u,
        tags:(tags||[]),
        expiration_date:moment().add((expireDays||14),"d").format("YYYY-MM-DD")
      }))
    }
    const apiCall = {
      method: 'post',
      url: endpoint,
      data: linkRequest,
      headers: headers
    }
    axios.post(endpoint, linkRequest, headers).then(e=>{
      console.log(e.data.urls)
      resolve(e.data.urls)
    }).catch(e=>{
      console.log(e)
      reject(e.error)
    })
  })
}
// teamupReq.post('/events',{
//   subcalendar_id: 1282228,
//   title: 'Service Wrap Device MOT SME Spellchecking & backcoding',
//   start_dt: '2022-06-13T10:00:00Z',
//   end_dt: '2022-06-13T11:00:00Z',
//   notes: "<a target='_self' href='http://job-analysis:8080/task-done/11655/Service Wrap Device MOT SME/18'>Mark as done</a>",
//   remote_id: '{"quoteID":11655,"taskID":18,"group":"Service Wrap Device MOT SME"}',
//   all_day: false,
//   subcalendar_ids: [ 1282228 ]
// }).then(e=>console.log(e)).catch(e=>console.log(e))
var stDate
var enDate
if (moment().date()<14) {
  stDate=moment().subtract(1,"months").date(14).startOf('day')
  enDate=moment().date(13).startOf('day')
}else {
  stDate=moment().date(14).startOf('day')
  enDate=moment().add(1,"months").date(13).startOf('day')
}
global.currPayPeriodSt = stDate.format(moment.HTML5_FMT.DATE)
global.currPayPeriodEn = enDate.format(moment.HTML5_FMT.DATE)
global.currPayMonth = enDate.month()+1
global.currPayYear = enDate.year()
global.tdy = moment().format(moment.HTML5_FMT.DATE)
global.freeAgents=[318,381,394,28,293,456]
global.agentMarquee=[]
global.jobMarquee=[]
global.contCheckData={}
global.bradfordStages=[
  {score:650,text:'Termination',class:'danger'},
  {score:400,text:'Final written warning',class:'warning'},
  {score:125,text:'First written warning',class:'secondary'},
  {score:50,text:'Letter of concern',class:'info'},
  {score:0,text:'',class:'none'},
]
app.set('port', process.env.port || port);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(bodyParser({limit: '200MB'}))
app.use(bodyParser.urlencoded({ extended: true , parameterLimit: 1000000}));
app.use(bodyParser.json());
app.use(fileUpload());
app.use(session({
  genid: (req) => {
    return uuid() // use UUIDs for session IDs
  },
  store: new FileStore({
    path:  require('os').tmpdir(),
    logFn: function(){}
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
momentDurationFormatSetup(moment)
app.use(flash());
app.use((req,res,next)=>{
  if (!res.locals.success_msg) {
    res.locals.success_msg=""
  }
  if (!res.locals.error_msg) {
    res.locals.error_msg=""
  }
  res.locals.moment=moment;
  res.locals._ = _
  res.locals.pageGuides=pageGuides[req.url]
  if (req.session.passport) {
    res.locals.user=req.session.passport.user
    res.locals.userAvatar=req.session.avatar
  }else {
    res.locals.user={
      staffName:'',
      staffID:0
    }
    res.locals.userAvatar='./blank-user.jpg'
  }
  errorEmail=null
  let lastProgMessage=""
  res.progressUpdate=(msg,ev,sid)=>{
    let id=sid||req.get("socket-id")
    if (id&&msg&&lastProgMessage!=msg) {
      socketioEmitting=true
      lastProgMessage=msg
      socketio.to(id).emit(ev||"progress-update",msg,()=>{
        // console.log("emitted")
        socketioEmitting=false
      })
    }
  }
  next();
})
// app.use((req,res,next)=>{
  // let base=(url)=>{
  //   if (!url) {
  //     return ''
  //   }else {
  //     let post=url.indexOf(":8080/")>-1?url.split(":8080")[1]:url
  //     post=post.indexOf("/")==0?_.drop(post).join(""):post
  //     let base=post.split("/")[0].split("?")[0]
  //     return base
  //   }
  // }
  // if (req.session.passport && base(req.url)!='ajax-auth' && base(req.url)!='server-info' && req.url.indexOf(".")<0) {
  //   let q=`insert into SystemRequests
  //   (reqDate,reqUserID,reqURL,referer,reqMethod,reqParams,reqQuery)
  //   VALUES
  //   (getdate(),`+req.session.passport.user.user+`,'`+base(req.url)+`','`+base(req.headers.referer)+`','`+req.method+`','`+JSON.stringify(req.params)+`','`+JSON.stringify(req.query)+`')`
    // db.query(q,
    //   (err,r)=>{
    //     if (err) {
          // console.log(err,q)
    //     }
    //   }
    // )
  // }
  // next()
// })
app.use(passport.initialize());
app.use(passport.session());
// const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
// io.use(wrap(passport.initialize()));
// io.use(wrap(passport.session()));
// io.use((socket, next) => {
//   console.log(socket.request.user)
//   if (socket.request.user) {
//     next();
//   } else {
//     next(new Error("unauthorized"))
//   }
// });

// tell passport how to serialize the user
passport.serializeUser((user, done) => {
  done(null, user);
});
var failedConnections=0
passport.deserializeUser((thisUser, done) => {
  function getUser(){
    let query1 = `
    select * from
    users u
    left join staff s on s.staffID=u.staffID
    left join JobTitles j on j.jobTitleID=s.staffJobTitleID
    left join departments d on d.deptID=j.departmentID
    WHERE u.userID = `+thisUser.user+` AND u.isUserActive = 1`;
    db.query(query1, (err, result1) => {
      if (err) {
        console.log("Not connected in deserializeUser. Awaiting connection")
        failedConnections++
        if (failedConnections<10) {
          once(emitter,'SQLconnected').then(()=>{
            console.log("Connection detected.")
            failedConnections=0
            getUser()
          }).catch((err)=>console.log(err))
        }
      }else if (result1.recordset.length != 0) {
        const user = result1.recordset.length != 0 ? {user:result1.recordset[0].userID,staffID:result1.recordset[0].staffID[0],roleID:result1.recordset[0].roleID,uName:result1.recordset[0].login,isSupport:[].includes(result1.recordset[0].roleID),isQC:[13,16,18].includes(result1.recordset[0].userID),isAdmin:[2,3,9,11,14,8].includes(result1.recordset[0].roleID),isAccountsAdmin:[12,3,36].includes(result1.recordset[0].staffID[0]),password:result1.recordset[0].password,department:result1.recordset[0].departmentName} : false;
        done(null, user);
      }
    })
  }
  getUser()
});
// configure passport.js to use the local strategy
passport.use(new LocalStrategy(
  { usernameField: 'uName' , passwordField: 'pWord'},
  (username, password, done) => {
    let pwReset=false
    if (password=="password") {
      pwReset=true
    }
    const transaction = new sql.Transaction()
    transaction.begin(err => {
      if (err) {
        console.log(err)
        logger.info("Error starting transaction for LocalStrategy for "+username,err)
        return done(err)
      }else {
        const db = new sql.Request(transaction)
        let query1=`
        select * from
        users u
        left join staff s on s.staffID=u.staffID
        left join JobTitles j on j.jobTitleID=s.staffJobTitleID
        left join departments d on d.deptID=j.departmentID
        WHERE u.login = @username AND u.password=HASHBYTES('SHA2_512',@password) AND u.isUserActive = 1`
        db.input("username",username)
        db.input("password",sql.VarChar,password)
        db.query(query1, (err, result1) => {
          if (err) {
            console.log(err)
            logger.info("Error getting user from SQL for "+username,db)
            return done(err)
          }else {
            transaction.commit(err => {
              if (err) {
                console.log(err)
                logger.info("Error getting user from SQL commit for "+username,db)
                return done(err)
              }
              if(result1.recordset.length != 0) {
                const user = {
                  user:result1.recordset[0].userID,
                  uName:result1.recordset[0].login,
                  isSupport:[].includes(result1.recordset[0].roleID),
                  roleID:result1.recordset[0].roleID,
                  isAdmin:[2,3,9,11,14,8].includes(result1.recordset[0].roleID),
                  isQC:[13,16,18].includes(result1.recordset[0].userID),
                  isAccountsAdmin:[12,3,36].includes(result1.recordset[0].staffID[0]),
                  pwReset:pwReset,
                  staffName:result1.recordset[0].staffName,
                  staffID:result1.recordset[0].staffID[0],
                  department:result1.recordset[0].departmentName
                }
                return done(null, user)
              }else {
                return done(null, false)
              }
            })
          }
        })
      }
    })
  }
));


global.transporter = nodeMailer.createTransport({
  host: 'smtp.office365.com',
  port: 587,
  pool:true,
  maxConnections:3,
  rateDelta:60000,
  rateLimit:30,
  secure: false,
  auth: {
      user: 'reports@teamsearchmr.co.uk',
      pass: process.env.OUTLOOK_REPORTS_PASSWORD
  }
});

//block duplicate emails
let globalMailList=[]
function checkForDupMails(mailData,cb){
  if (globalMailList.find(m=>_.isEqual(m,mailData))) {
    cb(new Error("Duplicate email attempted"))
  }else {
    globalMailList.push(mailData)
    setTimeout(()=>{
      globalMailList=globalMailList.filter(m=>!_.isEqual(m,mailData))
    },60000)
    // console.log("Not a dupe, running cb",cb)
    cb();
  }
}
transporter.use('compile', (mail, callback) => {
  checkForDupMails(mail.data,callback)
});
global.outlookTransporter=(auth)=>{
  // console.log("creating transporter")
  var trans = nodeMailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    pool:true,
    maxConnections:3,
    rateDelta:60000,
    rateLimit:30,
    secure: false,
    auth: auth,
    tls: {ciphers: 'SSLv3'}
  });
  // console.log("created transporter")
  trans.use('compile', (mail, callback) => {
    // console.log("checking for dupe emails")
    checkForDupMails(mail.data,callback)
  });
  return trans
}

global.footer = emailFooter
global.header = emailHeader
global.bankHols=[]
global.getResourceNeeded=(fromDate,toDate,jobID)=>{
  return new Promise((resolve,reject)=>{
    let q=`
    Declare @T Table (jobID int,isJobEve bit,isJobDay bit,dtJobID int,dte date,isOfficeDay bit,bankHol varchar(255),calc decimal(10,2),resourceHours decimal(10,2),resourceHoursAcademy decimal(10,2),planned decimal(10,2),plannedAcademy decimal(10,2))
    insert @T exec getJobResourcePlan `+jobID+`,`+moment(toDate).diff(fromDate,'d')+`,'`+moment(fromDate).format("YYYY-MM-DD")+`'
    select dte,isJobEve,isJobDay,dtJobID,sum(coalesce(planned,resourceHours+isnull(resourceHoursAcademy,0),case when isOfficeDay=1 and bankHol is null then calc end)) needed from @T
    group by dte,isJobDay,isJobEve,dtJobID`
    db.query(q,(err,r)=>{
      if (err) {
        console.log(err)
        reject(err)
      }else {
        resolve(r.recordset)
      }
    })
  })
}

global.GoogleCreds = creds = require(__dirname + '/public/sodium-sublime-282910-e746aef97772.json');
GoogleCreds.private_key=process.env.GOOGLE_CLOUD_KEY
GoogleCreds.private_key_id=process.env.GOOGLE_CLOUD_KEYID
global.lookups = lookups = require(__dirname + '/public/lookups.json');
global.GoogleTallySheet = new GoogleSpreadsheet('1rKmqWDfObGeiExFtDULvewQAUSCbqEWNLoA5MHk6QYI');
async function getGoogleSheet() {
  await GoogleTallySheet.useServiceAccountAuth(GoogleCreds).catch(e => { console.log("Error in Google Auth: "+e) })
  await GoogleTallySheet.loadInfo().catch(e => { console.log("Error in Google loadInfo: "+e) }); // loads document properties and worksheets
};
getGoogleSheet().catch(e => { console.log("Error in getGoogleSheet: "+e) })
global.firestore
function initializeFireStore(){
  // See: https://firebase.google.com/docs/web/learn-more#config-object
  const firebaseConfig = {
    apiKey: process.env.FIREBASE_APIKEY,
    authDomain: "flex-9ca01.firebaseapp.com",
    projectId: "flex-9ca01",
    storageBucket: "flex-9ca01.appspot.com",
    messagingSenderId: "914861369037",
    appId: process.env.FIREBASE_APPID,
    storageBucket: 'gs://flex-9ca01.appspot.com'
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  firestore=getStorage(app);
}
initializeFireStore()



app.get('/', (req, res) => {
  if( req.query.origin ){
    req.session.returnTo = req.query.origin
  }
  res.render(versionPages.login, {
    title: "JA2 - Please log in"
    ,message: (req.session.error || "")
  });
});

app.post('/',  (req, res, next) => {
  let returnTo = '/home'
  if (req.session.returnTo) {
    returnTo = req.session.returnTo
  }
  let message = "";
  passport.authenticate('local', (err, user, info) => {
    req.login(user, (err) => {
      if (err) {
        console.log(err,user)
        res.render(versionPages.login, {
          title: "JA2 - Please log in"
          ,message: "User name or password incorrect"
        });
      }else {
        if(user.pwReset) {
          req.user.uName = user.uName;
          res.redirect('/change-password/'+user.user);
        }
        else {
          delete req.session.returnTo
          db.query("select breatheID from users left join staff on staff.staffID=users.staffID where userID="+user.user, (err, staffR) =>{
            if (err || !staffR.recordset[0].breatheID) {
              req.session.save(() => {
                res.redirect(returnTo);
              })
            }else {
              // req.user.userDb=req.user.userDb || new sql.Request()
              breathReq.get('/employees/'+staffR.recordset[0].breatheID)
              .then(response => {
                req.session.avatar=response.data.employees[0].photo_url.replace(/\r?\n\s*/g,'')
                req.session.save(() => {
                  res.redirect(returnTo);
                })
              }).catch(function (err) {
                console.log(err)
                req.session.save(() => {
                  res.redirect(returnTo);
                })
              });
            }
          })
        }
      }
    })
  })(req, res, next);
});

app.get("/change-password/:id", (req, res) =>{
  if (!req.user) {
    logger.log("error getting user when changing password")
    logger.log("req:",req)
    req.session.destroy(function (err) {
      if (!err) {
        res.clearCookie('connect.sid', {path: '/'})
        res.status(200).render(versionPages.login, {
          title: "Job Analysis 2.0 - Please log in"
          ,message: "An error occured. Please try resetting your password again"
        });;
      }
    });
  }
  let query1 = "SELECT userID FROM Users WHERE Users.login = '" + req.user.uName +"'";
  db.query(query1, (err, result) =>{
    if(result.recordset[0].userID == req.params.id){
      res.render(versionPages.changePassword, {
        title: "Welcome to Job Analysis 2.0"
        ,message: ""
      })
    } else {
      logger.info(req.user.uName + " tried to change someone elses password :o")
      res.redirect("/")
    }
  })

});

app.post("/change-password/:id", (req, res) =>{
  let password = req.body.password;
  let passConfirmation = req.body.confirmationpass;
  let userID = req.params.id;
  let thisDb=new sql.Request();
  if(password != passConfirmation){
    res.render(versionPages.changePassword, {
      title: "Welcome to Job Analysis 2.0"
      ,message: "Passwords do not match"
    })
  } else {
    let pwordUpdateQuery = "UPDATE Users SET password = HASHBYTES('SHA2_512',@password) WHERE userID = '" + userID + "'";
    thisDb.input("password",password)
    thisDb.query(pwordUpdateQuery, (err, result) =>{
      res.redirect('/home');
    })
  }
});

function auth(req, res, next){
  if(req.isAuthenticated() || !authOn){
    rcPlatform.auth().accessTokenValid().then(function(valid){
      if (valid) {
        return next();
      }else {
        rcLogin().then(function(e){
          rcPlatform.auth().accessTokenValid().then(function(validAgain){
            return next();
          })
        })
      }
    })
  } else {
    req.session.returnTo = req.originalUrl
    req.session.error = 'You were logged out after a period of inactivity. Please login again.'
    req.session.destroy(function (err) {
      if (!err) {
        res.clearCookie('connect.sid', {path: '/'})
        res.status(200).redirect( `/?origin=${req.originalUrl}` );
      }else {
        logger.info("auth destroy error",err)
        res.send("The service needs to be restarted. Contact the system administrator")
      }
    });
  }
}


app.get('/logout-confirm', (req, res) => {
  req.session.error="You have been logged out."
  res.redirect("/")
})
app.get('/logOut', (req, res) => {
  req.logout();
  req.session.destroy(function (err) {
    if (!err) {
      res.clearCookie('connect.sid', {path: '/'})
      res.status(200).redirect('/logout-confirm');
    } else {
        // handle error case...
    }
  });
});

app.get('/forgetful', (req ,res) =>{
  res.render(versionPages.forgotPassword,{
    title: "Forgot password",
    message: ""
  })
});

app.post('/forgetful', (req ,res) =>{
  let user  = req.body.uName;
  let email = "";
  let userQuery = "SELECT Staff.staffEmail, Staff.staffID from Staff, Users WHERE Staff.staffID = Users.staffID AND Users.login = '" + user + "'"
  db.query(userQuery, (err, result) =>{
    if(err || result.recordset.length<1){
      res.render(versionPages.forgotPassword,{
        title: "Forgot password",
        message: "Incorrect username"
      });
    } else {
      email = result.recordset[0].staffEmail
      enData={}
      enData.staffID=result.recordset[0].staffID.toString()
      enData.today=tdy
      let key=encrypt(JSON.stringify(enData))
      let link = "http://job-analysis:8080/reset/" + key.iv + "-" + key.encryptedData
      let mailOptions = {
        to: email,
        subject: "Job analysis 2 - forgot password",
        html: '<p>' + header + '<p>Please click on the following link to reset your password</p><p><a href="' + link + '">CLICK HERE</a></p>' + footer + '</p>'
      }
      transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
              return console.log(error);
          }
        });
        res.render(versionPages.login, {
          title: "JA2 - Please log in"
          ,message: "An email has been sent to that user with a link to reset the password"
        });
    }
  })
});

app.get('/reset/:id', (req, res) =>{
  let key={ iv: req.params.id.split("-")[0], encryptedData: req.params.id.split("-")[1] }
  if (decrypt(key)) {
    let enData=JSON.parse(decrypt(key))
    if(enData.today == tdy){
      let resetQuery = "UPDATE Users SET Users.password = HASHBYTES('SHA2_512','password') WHERE Users.staffID = "+ enData.staffID;
      db.query(resetQuery, (err, result) =>{
        if(err){
          console.log(err)
        } else {
          res.render(versionPages.passwordReset, {
            title: "Welcome to Job Analysis 2.0"
            ,message: "Your password has been reset to 'password', please try to login again."
          });
        }
      })
    } else {
      res.render(versionPages.passwordReset, {
        title: "Welcome to Job Analysis 2.0"
        ,message: "Password reset expired, please try again."
      });
    }
  } else {
    res.render(versionPages.passwordReset, {
      title: "Welcome to Job Analysis 2.0"
      ,message: "Password reset expired, please try again."
    });
  }
});

app.post('/send-email', function (req, res) {
  let mailOptions = {
    // to: 'teamsearchmr@teamsearchmr.co.uk',
    // to: 'matt@teamsearchmr.co.uk',
    to:req.body.sendTo,
    subject: req.body.subject,
    html: '<p>' + header + req.body.HTMLbody + footer + '</p>'
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        return console.log(error);
    }
    //console.log('Message %s sent: %s', info.messageId, info.response);
  });
  res.redirect('back');
  res.end();
});

app.get('/500', function(req, res){
  res.render('500.ejs', {
    title: "Error"
  })
});

app.get('/forgetful', function(req, res){
  res.render(versionPages.forgotPassword, {
    title: "Forgot password",
    message: ""
  })
});

app.get('/userguide', auth, (req, res) => {
  const fldr = __dirname + '/public/userguides/';
  let uservids=[]
  fs.readdirSync(fldr).forEach(file => {
    uservids.push(file);
  });
  res.render('user-guide.ejs', {
    title: "Job Analysis 2.0 User guide"
    ,vids: uservids
    ,message: ""
  })
});

app.post('/ajax-login',  (req, res, next) => {
  req.body=req.body[0]
  passport.authenticate('local', function(err, user, info) {
    if (err)  { return next(err); }
    if (!user) { return res.status(401).send({"ok": false}); }
    req.logIn(user, function(err) {
      if (err) { return res.status(401).send({"ok": false}); }
      // req.user.userDb=req.user.userDb || new sql.Request()
      db.query("select breatheID from users left join staff on staff.staffID=users.staffID where userID="+user.user, (err, staffR) =>{
        if (err || !staffR.recordset[0].breatheID) {
          return res.send({"ok": true});
        }else {
          breathReq.get('/employees/'+staffR.recordset[0].breatheID)
          .then(response => {
            req.session.avatar=response.data.employees[0].photo_url.replace(/\r?\n\s*/g,'')
            return res.send({"ok": true});
          }).catch(function (err) {
            return res.send({"ok": true});
          });
        }
      })

    });
    })(req, res, next);
});

app.get('/ajax-auth',(req,res) => {
  if(req.isAuthenticated() || !authOn){
    let teamQ=`select * from agentTeams where managerID=`+req.session.passport.user.staffID
    let onlineQ=`
    select a.jobID,concat(q.quoteNo,' ',q.quoteName) as quoteName,sum(case when d.allocationID is null then 1 else 0 end) as neededCount from
    OnlineAllocations a
    left join (select allocationID from OnlineDailyInput where inputDate=dateadd(day,-1,cast(getDate() as date))) d on a.allocationID=d.allocationID
    left join jobs j on j.jobID=a.jobID
    left join Projects p on p.projectID=j.projectID
    left join quotes q on q.quoteID=p.quoteID
    where getdate() between startDate and endDate and d.allocationID is null and isnull(isClosed,0)<>1 and p.projectCM=`+req.session.passport.user.staffID+`
    group by a.jobID,concat(q.quoteNo,' ',q.quoteName)`
    db.query(onlineQ, (err, onlineR) =>{
      db.query(teamQ, (err, teamR) =>{
        if (teamR.recordset.length>0) {
          getBookingReq().then(function(googleResp){
            let bookingRequests=googleResp
            db.query("select sum(isNew) as newQueriesCount,count(*) as queriesCount from ViewProjectQueries where userID="+req.session.passport.user.user, (err, staffR) =>{
              if (err) {
                console.log(err)
                res.status(200).send({
                  queries:{newQueriesCount:0,queriesCount:0},
                  bookings:[],
                  onlineAllocations:0
                });
              }else {
                res.status(200).send({
                  queries:staffR.recordset.length>0?staffR.recordset[0]:{newQueriesCount:0,queriesCount:0},
                  bookings:bookingRequests.length?bookingRequests.filter(el=>el.teamID==teamR.recordset[0].agentTeamID):[],
                  onlineAllocations:onlineR.recordset.length
                });
              }
            })
          }).catch(function(err){
            console.log("ajax-auth/",err)
            db.query("select sum(isNew) as newQueriesCount,count(*) as queriesCount from ViewProjectQueries where userID="+req.session.passport.user.user, (err, staffR) =>{
              res.status(200).send({
                queries:staffR.recordset.length>0?staffR.recordset[0]:{newQueriesCount:0,queriesCount:0},
                bookings:[],
                onlineAllocations:onlineR.recordset.length
              });
            })
          })
        }else {
          db.query("select sum(isNew) as newQueriesCount,count(*) as queriesCount from ViewProjectQueries where userID="+req.session.passport.user.user, (err, staffR) =>{
            res.status(200).send({
              queries:staffR.recordset.length>0?staffR.recordset[0]:{newQueriesCount:0,queriesCount:0},
              bookings:[],
              onlineAllocations:onlineR.recordset.length
            });
          })
        }
      })
    })
  } else {
    req.session.destroy(function (err) {
      if (err) {

      }else {
        res.clearCookie('connect.sid', {path: '/'})
        res.status(401).send({error: 'Not logged in'});
      }
    })
  }
})
app.get('/vistatest', function(req, res){
  res.render('vista-test.ejs', {
    title: "Vista test",
  })
});
app.get('/get-bank-hols', auth, (req,res) => {
  res.send(bankHols)
})

function getBankHols(){
  return new Promise((resolve,reject)=>{
    govAPI.get('/bank-holidays.json').then(function(response){
      let bhDates=response.data['england-and-wales'].events.map(e=>e.date)
      let officeClosures=(yr)=>{
        let xmasEve=moment().startOf('d').set({month:11,date:24,year:yr})
        var dates=moment.range(xmasEve,moment(xmasEve).add(10,"d"))
        return Array.from(dates.by('day')).filter(el=>![0,6].includes(el.day()) && !bhDates.includes(el.format("YYYY-MM-DD"))).map(el=>{
          return {title:'Office Closed',date:el.format("YYYY-MM-DD")}
        })
      }
      let years=_.uniqBy(response.data['england-and-wales'].events,a=>moment(a.date).year())
      let y=0
      function addClosures(){
        let yr=years[y]
        if (yr) {
          response.data['england-and-wales'].events=response.data['england-and-wales'].events.concat(officeClosures(moment(yr.date).year()))
          y++
          addClosures()
        }else {
          bankHols=response.data
          let getQ=`
          delete from BankHols where isCustom is null
          declare @max int select @max=ISNULL(max([holID]),0) from [BankHols]; DBCC CHECKIDENT ('[BankHols]', RESEED, @max );
          select holTitle,holDate from bankHols where holID<0
          `
          db.query("delete from BankHols where isCustom is null;DBCC CHECKIDENT ('[BankHols]', RESEED, 0);select holTitle,holDate from bankHols where holID<0",(err,r)=>{
            if (err) {
              console.log(err)
            }
            table=r.recordset.toTable('BankHols')
            let h=0
            async function addRows(){
              let row=response.data['england-and-wales'].events[h]
              if (row) {
                await table.rows.add(row.title,new Date(row.date))
                h++
                addRows()
              }else {
                db.bulk(table,(err,tr)=>{
                  if (err) {
                    console.log(err)
                  }
                  console.log("added SQL bank hols")
                })
              }
            }
            addRows()
          })
          resolve(response.data)
        }
      }
      addClosures()
    }).catch(function (error) {
      console.log(error);
      reject(error)
    })
  })
}

app.post("/get-notifications",auth, (req,res) => {
  let queryQ=`
  select ViewProjectQueries.projectID,Quotes.quoteID,Quotes.quoteNo,Quotes.quoteName,count(*) as queryCount
  from
  ViewProjectQueries
  left join Projects on Projects.projectID=ViewProjectQueries.projectID
  left join Quotes on Projects.quoteID=Quotes.quoteID
  where userID=`+req.session.passport.user.user+` and isNew=1
  group by ViewProjectQueries.projectID,Quotes.quoteNo,Quotes.quoteName,Quotes.quoteID`
  let raisedByQ=`
  select breatheID,projectID
  from
  ViewProjectQueries
  left join staff on staff.staffID in (replyFromID,raisedByID)
  where ViewProjectQueries.userID=`+req.session.passport.user.user+` and isNew=1
  group by breatheID,projectID
  `
  let teamQ=`select * from agentTeams where managerID=`+req.session.passport.user.staffID
  let onlineQ=`
  select a.jobID,concat(q.quoteNo,' ',q.quoteName) as quoteName,sum(case when d.allocationID is null then 1 else 0 end) as neededCount from
  OnlineAllocations a
  left join (select allocationID from OnlineDailyInput where inputDate=dateadd(day,-1,cast(getDate() as date))) d on a.allocationID=d.allocationID
  left join jobs j on j.jobID=a.jobID
  left join Projects p on p.projectID=j.projectID
  left join quotes q on q.quoteID=p.quoteID
  where getdate() between startDate and endDate and d.allocationID is null and isnull(isClosed,0)<>1 and p.projectCM=`+req.session.passport.user.staffID+`
  group by a.jobID,concat(q.quoteNo,' ',q.quoteName)`
  db.query('select breatheID,agentID from agents where agentID in ('+req.body.bookings.map(el=>el.agentID).join(",")+')', (err, agentR) =>{
    db.query(queryQ, (err, queryR) =>{
      db.query(raisedByQ, (err, raisedByR) =>{
        db.query(teamQ, (err, teamR) =>{
          db.query(onlineQ, (err, onlineR) =>{
            if (err) {
              console.log(err)
            }
            var i=0
            var records=agentR?agentR.recordset.concat(raisedByR.recordset):raisedByR.recordset
            let avs=records.map(el=>{
              let obj={}
              obj.avatar=(el.breatheID && breatheEmployees?(breatheEmployees.find(b=>b.id==el.breatheID) || {photo_url:'/blank-user.jpg'}).photo_url.replace(/\r?\n\s*/g,''):'/blank-user.jpg')
              obj.teamID=(teamR.recordset[0]?teamR.recordset[0].agentTeamID:0)
              obj.agentID=el.agentID
              obj.projectID=el.projectID
              obj.breatheID=el.breatheID
              return obj
            })
            res.status(200).send({
              queries:queryR.recordset,
              raisedByAvs:avs,
              onlineAllocations:onlineR.recordset
            });
          })
        })
      })
    })
  })
})
app.post('/send-email-ajax',auth, (req,res) => {
  db.query("select * from staff where staffID="+req.body.emailTo, (err, emailToR) =>{
    let mailOptions = {
        to: emailToR.recordset[0].staffEmail.length>0?emailToR.recordset[0].staffEmail:req.body.emailTo,
        // to: 'matt@teamsearchmr.co.uk',
        subject: req.body.subject,
        html: '<p>' + header + req.body.HTMLbody+ '</p>',
        priority: req.body.priority,
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          res.status(500).send(error)
          console.log(error);
        }else {
          res.status(200).send("Done")
        }
        //console.log('Message %s sent: %s', info.messageId, info.response);
    });
  })
})
app.get('/breathe-info',auth,function(req,res){
  var i=1
  var data=[]
  function getEmployees(){
    breathReq.get('/employees?page='+i)
    .then(response => {
      if (response.data.employees.length==0) {
        res.send({
          departments:data.map(el=>el.department?el.department.name:null).filter((el,i,self)=>self.indexOf(el)==i),
          job_titles:data.map(el=>el.job_title).filter((el,i,self)=>self.indexOf(el)==i),
          person_types:data.map(el=>el.person_type).filter((el,i,self)=>self.indexOf(el)==i),
          divisions:data.map(el=>el.division?el.division.name:null).filter((el,i,self)=>self.indexOf(el)==i),
          statuses:data.map(el=>el.status).filter((el,i,self)=>self.indexOf(el)==i),
          contract_types:data.map(el=>el.contract_type).filter((el,i,self)=>self.indexOf(el)==i),
        })
      }else {
        data.push.apply(data,response.data.employees)
        i++
        getEmployees()
      }
    }).catch(err=>{
      console.log(req.originalUrl,err)
      res.status(500).send({error:err})
    })
  }
  getEmployees()
})

app.post('/menu-click',auth,(req,res)=>{
  let insQ="insert into MenuClickLogs (pageName,pageURL,pageIcon,userID,logDate) VALUES (@pageName,@pageURL,@pageIcon,"+req.user.user+",getDate())"
  db.input("pageName",req.body.pageName)
  db.input("pageURL",req.body.pageURL)
  db.input("pageIcon",req.body.pageIcon)
  db.query(insQ,(err,insR)=>console.log(err))
})
app.get('/send-csat-chase/:isReminder/:projectID',auth,(req,res)=>{
  let quoteQ=`
  select * from
  Projects p
  left join Quotes q on q.quoteID=p.quoteID
  left join Contacts c on c.contactID=q.contactID
  where p.projectID=`+req.params.projectID
  db.query(quoteQ,(err,quoteR)=>{
    if (err) {
      console.log(err)
      res.status(500).send({error:err})
    }
    // console.log(req.params.isReminder)
    sendCsatChase(quoteR.recordset[0],req.params.isReminder==1).then(e=>{
      res.send("Done")
    }).catch(err=>{
      console.log(err)
      res.status(500).send({error:err})
    })
  })
})
app.get('/server-info',(req,res)=>{
  if (uncaughtException) {
    res.status(500).send(uncaughtException)
  }else {
    res.send()
  }
})
let resourceEmails=[]
let resEmailTimeout
let emailResChanges=()=>{
  resourceEmails.forEach((em, i) => {
    let mailOptions = {
        to: em.to,
        from:'JA2 <reports@teamsearchmr.co.uk>',
        subject: em.subject,
        html: '<p>' + header + em.body+ '</p>'
    };
    transporter.sendMail(mailOptions,err=>{
      if (err) {
        console.log(err)
        logger.info("Failed to send resource changes",err)
      }
    })
  });
  clearTimeout(resEmailTimeout)
  resourceEmails=[]
}
app.post('/send-resource-emails',auth,(req,res)=>{
  // resourceEmails=req.body.data
  // clearTimeout(resEmailTimeout)
  // resEmailTimeout=setTimeout(emailResChanges,600000)
  setDailyResourceTargets().then(e=>{
    res.send("done")
  })
})
let pageClosed=(req,res)=>{
  res.render('503.ejs',{title:'Closed for maintenance'})
}
app.post('/add-office-closure',auth,(req,res)=>{
  db.query(`insert into BankHols (holTitle,holDate,isCustom) VALUES ('Office closed','`+req.body.dte+`',1)`,(err,r)=>{
    if (err) {
      console.log(err)
      res.status(500).send(err)
    }
    res.send("done")
  })
})
app.get('/get-dates/',auth,(req,res)=>{
  console.log(req.query)
  try {
    db.input('gdst',new Date(req.query.stDate))
    db.input('gden',new Date(req.query.enDate))
  } catch (e) {
    console.log(e)
    res.status(500).send("Invalid date")
  }
  let q=`
  set datefirst 1
  select dte,dbo.isOfficeDay(dte) isOfficeDay,weighting from getDatesBetween(@gdst,@gden) d left join dbo.getWeekdayBookingWeights(10) w on w.wkday=DATEPART(weekday,d.dte)`
  db.query(q,(err,r)=>{
    if (err) {
      console.log(err,q)
      res.status(500).send("Invalid date")
    }else {
      res.send(r.recordset)
    }
  })
})
app.post("/shorten-url",auth,(req,res)=>{
  shortenURL(req.body.urls,req.body.expireDays,req.body.tags).then(urls=>{
    res.send(urls)
  }).catch(err=>{
    res.status(500).send({error:err})
  })
})
app.get("/remove-forsta-project-groups",auth,removeForstaProjectGroups)
app.post("/add-forsta-respondents",auth,addRespondents)
app.get("/cc-activity",auth,ccActivity)
app.get("/forsta-groups",auth,getForstaGroups)
app.get("/forsta-agents",auth,getForstaAgents)
app.get("/forsta-activity",auth,getForstaActivity)
app.get("/payclaim-links",auth,getPayclaimLinks)
app.post("/payclaim-links",auth,updatePayclaimLinks)
app.get("/data-editor",auth,(req,res)=>{
  res.render("data-editor.ejs",{title:"Data editor",tabulatorUpdated:true})
})
app.get("/forsta-quotas",auth,getForstaQuotas)
app.post("/forsta-quotas",auth,updateForstaQuotas)
app.get("/download-file",auth,downloadFile)
app.get("/sample-outcome-count",auth,sampleOutcomeCount)
app.post("/forsta-outcomes-download/:type",auth,forstaOutcomesDownload)
app.get("/all-booking-data",auth,allBookingData)
app.post("/get-prevcomp-info",auth,getPrevCompInfo)
app.post("/define-verbatims",auth,defineVerbatims)
app.post("/get-keywords",auth,getKeywords)
app.get("/get-forsta-incentives",auth,getFortaIncentives)
app.get("/undo-forsta-data",auth,undoForstaData)
app.get("/get-forsta-data-cleans",auth,getForstaDataCleans)
app.get("/remove-forsta-data-cleans",auth,removeForstaDataCleans)
app.post("/add-forsta-data-cleans",auth,addForstaDataCleans)
app.post("/verbatims-from-word",auth,importVerbsFromWord)
app.post("/verbatims-to-word",auth,exportVerbsToWord)
app.get("/forsta-agent-by-date",auth,forstaAgentByDate)
app.post("/create-forsta-datafile",auth,createForstaDatafile)
app.get("/assign-forsta-agent",setForstaAssignment)
app.get("/forsta-agent-assignment",getForstaAssignmentPage)
app.post("/create-forsta-toplines",auth,createForstaToplines)
app.get("/all-one2ones",auth,allOne2ones)
app.post("/excel-to-json",auth,excelToJson)
app.post("/spellcheck",auth,spellcheck)
app.get("/get-forsta-data-changes",auth,getForstaDataChanges)
// app.get("/verbatim-checking/:type",auth,verbatimChecking)
app.post('/add-forsta-export-history',auth,addExportHistory)
app.get('/get-forsta-export-history',auth,getExportHistory)
app.post('/update-forsta-data/:isUndo',auth,updateForstaData)
app.post('/duplicate-forsta-question',auth,duplicateForstaQuestion)
app.get('/get-forsta-report-link',auth,getForstaReportLink)
app.get("/get-forsta-survey-questions",auth,getFortaSurveyQuestions)
app.get("/get-forsta-completes",auth,getFortaCompletes)
app.get("/get-forsta-surveys",auth,getForstaSurveys)
app.get("/get-csat-scores",auth,getCsatScores)
app.post('/update-downtime/:type',auth,updateDowntime)
app.get('/get-downtime',auth,getDowntime)
app.get("/bonus-schemes",auth,bonusSchemesPage)
app.post('/update-pay-reduction',auth,updatePayReduction)
app.get("/get-all-projects",auth,getAllProjects)
app.post('/update-outcomes-map',auth,updateOutcomesMap)
app.post('/add-planned-recruitment',auth,addPlannedRecruitment)
app.get('/auto-allocations/',auth,getAutoAllocations)
app.post('/auto-allocate',auth,autoAllocate)
app.post('/auto-allocate-date',auth,autoAllocateDate)
app.post('/apply-planner-adjustments',auth,applyPlannerAdjustments)
app.get('/get-dedicated-dates/:apartFrom/:agentID',auth,getDedicatedDates)
app.post('/update-dedicated-dates/:dedicationID',auth,updateDedicatedDates)
app.get('/dedicated-teams/:projectID',auth,dedicatedTeams)
app.get('/get-dedicated-team/:jobID',auth,getDedicatedTeam)
app.get('/undedicate-agent/:dedicationID',auth,undedicateAgent)
app.post('/dedicate-agent',auth,dedicateAgent)
app.post('/update-resource-recalcs',auth,updateResourceRecalcs)
app.post('/auto-resource',auth,autoResource)
app.get('/get-job-info',auth,getJobInfo)
app.get('/get-project-info',auth,getProjectInfo)
app.post('/update-planner-ahr',auth,updatePlannerAHR)
app.post('/update-job-planner',auth,updatePlanner)
app.post('/update-live-report-inclusion',auth,updateLiveReportInclusion)
app.get('/get-hourly-ahr',auth,getHourlyAHR)
app.post('/render-workloads',auth,renderWorkloads)
app.get('/get-notes',auth,getNotes)
app.post('/update-f2f-bonus',auth,updateF2fBonus)
app.post('/update-f2f-bonus-allocs',auth,updateF2fBonusAllocs)
app.post('/add-f2f-bonus-calc',auth,addF2fBonusCalc)
app.get('/get-f2f-bonus-calcs',auth,getF2fBonusCalcs)
app.get('/all-quotes',auth,allQuotes)
app.get('/quotes-report-data/',auth,quotesReportData)
app.get('/quotes-report/:stdate/:endate',auth,quotesReport)
app.get('/agent-bookings',auth,agentBookings)
app.get('/agent-shifts',auth,agentShifts)
app.get('/board-report',auth,miBoardReport)
app.get('/digest-data',auth,digestData)
app.get('/interviewer-hub',auth,(req,res)=>{res.render('interviewer-hub.ejs',{title:'Interviewers'})})
app.get('/suggest-postcode/:pcode',auth,suggestPostcode)
app.post('/postcode-lookup',auth,postcodeLookup)
app.post('/longlat-lookup',auth,longLatLookup)
app.get('/get-filters',auth,getFilters)
app.get('/tester',auth,(req,res)=>res.render('tester.ejs',{title:'Tester',tabulatorUpdated:true}))
app.get('/tester2',auth,(req,res)=>res.render('tester2.ejs',{title:'Tester2',tabulatorUpdated:true}))
app.post('/check-csat',auth,checkCsat)
// app.get('/get-links/',auth,getLinks)
app.get('/cc-kpis/:fromDate',auth,ccKPIs)
app.get('/cc-kpi-data/',auth,ccKPIdata)
app.get('/closing-budget-check',auth,closingBudgetCheck)
app.post('/get-hr-letter',auth,getHRletter)
app.post('/update-absence-action',auth,updateAbsenceAction)
app.get('/contribution-tracker-data',auth,contTrackingData)
app.post('/payroll-excel/',auth,getPayrollExcel)
app.get('/send-rc-text/:agentID/:bookingWeek',auth,sendRCmessage)
app.get('/send-booking-text/:agentID/:bookingWeek',auth,sendBookingText)
app.get('/send-booking-email/:agentID/:bookingWeek',auth,sendBookingEmail)
app.get('/attendance-hub/:shift/:teams',auth,attendanceHub)
app.get('/attendance-hub-data/:shift/:teams',auth,attendanceHubData)
app.get('/booking-hub/:shift/:teams/:bookingWeek',auth,bookingHub)
app.get('/booking-hub-data/:shift/:teams/:bookingWeek',auth,bookingHubData)
app.post('/update-lateness',auth,updateLateness)
app.get('/remove-auto-resource/:dte/:shift',auth,removeAutoResource)
app.post('/add-auto-resource',auth,addAutoResource)
app.get('/get-client-stats',auth,getClientStats)
app.get('/client-report',auth,clientStats)
// app.get('/get-o2o-form/:agentID/:stdate/:endate',auth,getOne2oneForm)
app.post('/get-o2o-form',auth,getOne2oneForm)
app.get('/add-task-info/:quoteID/:group/:taskID',auth,addTaskInfo)
app.post('/add-timed-loi',auth,addTimedLOI)
app.post('/add-one2one',auth,addOne2one)
app.post('/sample-outcomes/:projectID',auth,uploadSampleOutcomes)
app.get('/sample-outcomes/:projectID',auth,sampleOutcomes)
app.get('/sample-outcomes-forsta/:projectID',auth,sampleOutcomesForsta)
app.get('/get-project-spends/:projectID',auth,getProjectSpends)
app.get('/get-project-dates/:projectID',auth,getProjectDates)
app.post('/edit-f2f-accessory/:id',auth,editF2fAccessory)
app.get('/edit-f2f-accessory/:id',auth,editF2fAccessoryPage)
app.post('/edit-f2f-tablet/:id',auth,editF2fTablet)
app.get('/edit-f2f-tablet/:id',auth,editF2fTabletPage)
app.get('/advisory-spotlights',auth,advisorySpotlights)
app.get('/get-advisory-checks',auth,getAdvisoryChecks)
app.get('/get-agent-advisories',auth,getAgentAdvisories)
app.get("/get-agents-advisories",auth,getAgentsAdvisories)
app.get('/get-advisory',auth,getAdvisory)
app.get("/get-advisories",auth,getAdvisories)
app.get("/qc-issues-report/:stdate/:endate",auth,qcIssuesReport)
app.get("/live-jobs-raw",auth,liveJobsRaw)
app.get("/all-jobs-raw",auth,allJobsRaw)
app.post("/change-job-date",auth,changeDate)
app.get('/get-changelog',auth,getChangeLog)
app.get('/log-viewer',auth,logViewer)
app.get('/operations-digest',auth,opsDigest)
app.get('/staff-reports/:stdate/:endate',auth,staffReports)
app.get('/overdue-tasks',auth,overdueTasks)
app.get('/overdue-pdps',auth,overduePDPs)
app.get('/overdue-followups',auth,overdueFollowups)
app.get('/task-done/:quoteID/:group/:taskID',auth,taskDone)
app.get('/dials-analysis/:stdate/:endate/:dataType',auth,dialsAnalysisData)
app.get('/dials-analysis',auth,dialsAnalysisPage)
app.post('/add-csat-complaints',auth,addCsatComplaints)
app.post('/register-prev-comps-download',auth,registerPrevCompsDownload)
app.get('/booking-report/:prevWeeks/:prevDays',auth,bookingReport)
app.post('/send-qc-email',auth,qcEmailOnly)
app.get('/completes-database/',auth,prevCompsPage)
app.get('/unused-sample/',auth,prevUnusedPage)
app.get('/prevcomps-data/',auth,getPrevCompsData)
app.get('/prevunused-data/',auth,getPrevUnusedData)
app.post('/review-supplier/:id',auth,submitSupplierReview)
app.get('/review-supplier/:id',auth,reviewSupplier)
app.get('/delete-supplier/:id',auth,deleteSupplier)
app.post('/update-supplier/:id',auth,editSupplier)
app.post('/add-supplier',auth,addSupplier)
app.get('/edit-supplier/:id',auth,editSupplierPage)
app.get('/add-supplier',auth,addSupplierPage)
app.get('/view-suppliers',auth,viewSuppliers)
app.post('/upload-sample-outcome/',auth,sampleOutcomeUpload)
app.post('/confirm-booking-request',auth,confirmBookingRequest)
app.get("/booking-requests/:teamID/:bookingWeek",auth,bookingRequestsPage)
app.get("/get-booking-requests/:teamID/:bookingWeek",auth,getBookingRequests)
app.get('/get-recording-stream/:id',auth,getRCrecordingStream)
app.post('/add-complaint-recording/',auth,addComplaintRecording)
app.post('/recording-search/:id',auth,recordingSearch)
app.post('/delete-file',auth,deleteFile)
app.post('/update-complaint/:id/:stage',auth,updateComplaint)
app.get('/complaints-log',auth,complaintsLog)
app.get('/get-complaints-log/',auth,getComplaintsLog)
app.post('/add-complaint/',auth,addComplaint)
app.get('/edit-complaint/:id',auth,editComplaint)
app.get('/add-complaint/',auth,addComplaintPage)
app.post('/update-sql-dials',auth,updateSqlDials)
app.post('/get-project-stats',auth,projectStatsAjax)
app.post('/update-inbound-line',auth,updateInboundLine)
app.get('/inbound-lines/',auth,inboundLinePage)
app.post('/delete-Audit-task',auth,deleteProjectAudit)
app.post('/add-Audit-task',auth,addProjectAudit)
app.post('/update-Audit-task',auth,updateProjectAudit)
app.get('/download-rc-recording/:recordingID',downloadRCrecording)
app.get('/get-avg-wage',auth,getAvgWage)
app.post('/update-rc-hours',auth,updateRChours)
app.post('/add-rc-user',auth,addRCuser)
app.post('/update-agent-rcid/',auth,updateAgentRCID)
app.get('/get-f2f-agent/:agentID/:allocationID',auth,getF2fAgent)
app.post('/check-out-f2f-accessory/',auth,checkOutAccessory)
app.post('/check-in-f2f-accessory/',auth,checkInAccessory)
app.post('/check-out-f2f-tablet/',auth,checkOutTablet)
app.post('/check-in-f2f-tablet/',auth,checkInTablet)
app.post('/delete-f2f-tablet-allocation/',auth,deleteF2fTabletAllocation)
app.post('/add-f2f-tablet-allocation/',auth,addF2fTabletAllocation)
app.get('/get-f2f-tablet-allocations',auth,getF2fTabletAllocations)
app.get('/f2f-Tablet-Admin',auth,f2fTabletAdmin)
app.get('/get-RC-recording/:recID',auth,getRCrecording)
app.post('/get-all-dials',auth,getRCdials)
app.get('/delete-F2f-agent/:id',auth,deleteF2fAgent)
app.post('/edit-F2f-agent/:id',auth,updateF2fAgent)
app.post('/add-F2f-agent/',auth,addF2fAgent)
app.get('/add-F2f-agent/:id',auth,addF2fAgentPage)
app.get('/delete-F2f-Supervisor/:id',auth,deleteF2fSupervisor)
app.post('/edit-F2f-Supervisor/:id',auth,updateF2fSupervisor)
app.post('/add-F2f-Supervisor/',auth,addF2fSupervisor)
app.get('/add-F2f-Supervisor-Page/:id',auth,addF2fSupervisorPage)
app.get('/view-f2f-agents',auth,viewF2fAgents)
app.get('/get-F2f-Tablets',auth,getF2fTablets)
app.post('/delete-f2f-allocation',auth,deleteF2fAllocation)
app.post('/add-f2f-daily',auth,addF2fDaily)
app.post('/add-f2f-allocation',auth,addF2fAllocation)
app.get('/get-f2f-allocations/:jobID',auth,getF2fAllocations)
app.get('/f2f-tracker/:jobID',auth,f2fTracker)
app.post('/delete-online-allocation',auth,deleteOnlineAllocation)
app.post('/add-online-daily',auth,addOnlineDaily)
app.post('/add-online-allocation',auth,addOnlineAllocation)
app.get('/get-online-allocations/:jobID',auth,getOnlineAllocations)
app.get('/online-tracker/:jobID',auth,onlineTracker)
app.post('/create-contract/',auth,createContract)
app.get('/get-staff/:dte',auth,getStaff)
app.get('/get-live-report-edits/:dte',auth,getLiveReportEdits)
app.post("/save-Live-Report-Edit",auth,saveLiveReportEdit)
app.post('/manual-bonus/',auth,manualBonus)
app.post('/clear-coaching-followups/',auth,clearCoachingFollowUps)
app.post('/clear-pdps/',auth,clearPDPs)
app.get('/admin-panel/',auth,adminPanel)
app.get('/get-project-jobs/:jid',auth,getProjectJobs)
app.post('/mi-dashboard-ajax/',auth,miDashboardAjax)
app.get('/mi-dashboard/',auth,miDashboard)
app.post('/clear-live-report-cell/',auth,clearLiveReportCell)
app.post('/save-live-report/',auth,saveLiveReport)
app.post('/save-live-report-names/',auth,saveLiveReportNames)
app.get('/live-report/:date/:shift',auth,liveReport)
app.get('/all-agents-raw',auth,allAgentsRaw)
app.post('/all-projects-raw',auth,allProjectsRaw)
app.post('/get-booked',auth,getBooked)
app.get('/resource-planner-ajax',auth,resourcePlannerAjax)
app.post('/add-query-img',auth,addQueryImg)
app.post('/delete-query-img',auth,deleteQueryImg)
app.post("/save-img",auth,saveImg)
app.post('/get-job-recents',auth,getJobRecents)
app.post('/get-agent-recents',auth,getAgentRecents)
app.post('/event-seen/',auth,eventSeen)
app.post('/get-quickmode-queries/',auth,getQuickReviewQueries)
app.post('/repeat-project',auth,repeatProject)
app.get('/get-project/:projectID',auth,getProject)
app.get('/interviewer-snapshot/',auth,interviewerSnapshotPage)
app.get('/interviewer-snapshot/:dataType',auth,interviewerSnapshotData)
app.post('/add-Projectquery-Reply',auth,addProjectqueryReply)
app.get('/get-query-replies/:queryID',auth,getQueryReplies)
app.post('/add-project-query',auth,addProjectQuery)
app.get('/get-project-queries/:projectID',auth,getProjectQueries)
app.get('/project-queries/:projectID',auth,projectQueryPage)
app.post('/get-teamup-tasks',auth,getTeamupTasks)
app.post('/remove-tasks-from-teamup',auth,deleteTasksFromTeamup)
app.post('/post-tasks-to-teamup',auth,postTasksToTeamup)
app.get('/get-sql-planner-tasks',auth,getSqlPlannerTasks)
app.get('/get-job-groupings/:projectID/:groupCol',auth,getJobGroupings)
app.post('/compare-projects/',auth,compareProjectPage)
app.post('/update-past-target/',auth,updatePastTarget)
app.get('/get-pm-workloads/:fromDate/:toDate/:jobTitleID',auth,getPMworkloads)
app.post('/update-data-formats',auth,updateDataFormats)
app.get('/check-cost-delete/:costID',auth,checkCostDelete)
app.post('/add-project-to-pd',auth,addProjectToPD)
app.post('/add-project-date',auth,addProjectDate)
app.post('/create-pc-form',auth,createPCform)
app.post('/get-job-folder',auth,getJobFolder)
app.post('/add-group-ajax',auth,addGroupAjax)
app.get('/get-job-cpis/:id/:type',auth,getjobCPIs)
app.get('/get-search',auth,getSearch)
app.post('/update-group-CPI',auth,updateGroupCPI)
app.get('/duplicate-group/:id',auth,duplicateGroup)
app.post('/check-group-start',auth,checkGroupStart)
app.post('/check-group-end',auth,checkGroupEnd)
app.post('/project-qc-checks',auth,projectQCchecks)
app.post('/add-project-cost',auth,addProjectCost)
app.post('/update-project-cost',auth,updateProjectCost)
app.post('/add-project-spend',auth,addProjectSpend)
app.post('/update-project-spend',auth,updateProjectSpend)
app.get('/get-Cost-Types/',auth,getCostTypes)
app.get('/get-suppliers/',auth,getSuppliers)
app.post('/close-project/',auth,closeProject)
app.get('/close-project/:id',auth,projectClosingPage)
app.get('/get-teamup/',auth,getTeamup)
app.get('/delete-staff/:id',auth,deleteStaff)
app.post('/add-staff/',auth,addStaff)
app.post('/edit-staff/',auth,updateStaff)
app.get('/view-staff',auth,viewStaff)
app.get('/edit-staff/:id',auth,addStaffPage)
app.get('/add-staff/',auth,addStaffPage)
app.get('/get-breathe-agent',auth,getBreatheAgent)
app.post('/get-live-jobs',auth,getLiveJobs)
app.post('/add-group-date',auth,addGroupDate)
app.post('/update-group-ajax', auth, updateGroupAjax)
app.get('/get-breathe-agent',auth,getBreatheAgent)
app.get('/get-resource-projections/:dte', auth, getResourceProjections)
app.post('/get-qc-issues-for-coaching', auth, getQCissuesForCoaching)
app.post('/check-agent-date', auth, checkAgentDate)
app.post('/coaching-follow-up/:id', auth, updateCoachingFollowUp)
app.get('/coaching-follow-up/:id', auth, getCoachingFollowUp)
app.post('/get-tally-performance', auth, getTallyPerf)
app.post('/update-booking-absence', auth, updateBookingAbsence)
app.post('/get-booking-absence', auth, getBookingAbsence)
app.post('/tally-sheet/:date/:shift/:team/:incAcademy/', auth, loadTallySheetPost)
app.post('/update-tally-booking', auth, updateTallyBooking)
app.post('/update-tally-bonus', auth, updateTallyBonus)
app.post('/update-tally-note', auth, updateTallyNote)
app.post('/update-absence', auth, updateAbsence)
app.post('/update-tally-allo', auth, updateTallyAllo)
app.post('/update-tally-daily', auth, updateTallyDaily)
app.get('/tally-sheet/:date/:shift/:team/:incAcademy/:incFixed', auth, loadTallySheet)
app.post('/update-resource-ahr', auth, ajaxPlannerAHR);
app.get('/team-report', auth, getTeamReport);
app.post('/check-qc-id', auth, checkQCID)
app.get('/edit-qc-check/:id', auth, editQC);
app.post('/email-performance', auth, emailPerf);
app.post('/update-note', auth, updateNote);
app.post('/get-cc-reports', auth, getCallCentreReports);
app.post('/get-QC-suggestion', auth, getQCsuggestion);
app.get('/quality-control/:stDate/:enDate', auth, getQCsplash);
app.post('/delete-regular-hours', auth, deleteRegularHours);
app.post('/update-regular-hours', auth, updateRegularHours);
app.get('/get-regular-hours', auth, getRegularHours);
app.post('/add-qc-check', auth, addNewQC);
app.get('/delete-qc-check/:id', auth, deleteQC);
app.get('/add-qc-check/:agentID/:jobID/:date', auth, loadNewQC);
app.post('/update-team', auth, updateTeam);
app.post('/get-holidays', auth, getHolidays);
app.post('/update-cell-alloc', auth, updateAlloCell);
app.post('/get-cell-alloc', auth, allocateCell);
app.post('/update-planner', auth, ajaxPlanner);
app.post('/delete-booking', auth, deleteBooking);
app.post('/update-booking', auth, setBooking);
app.get('/staff-booking/:id/:weekAdd/:reqType/:incFixed', auth, getBooking);
app.get('/delete-coaching-session/:id', auth, deleteCoaching);
app.get('/add-coaching/:stdate/:endate', auth, loadCoaching);
app.post('/add-coaching', auth, addCoaching);
app.get('/client-sat', auth, clientSatReport);
app.post('/update-agent-team', auth, updateAgentTeam);
app.get('/team-management', auth, loadTeamManagement);
app.get('/home', auth, versionPages.home);
app.get('/sales-spend/:stdate/:endate/:shift/:days/:team/:excHourly/:excBMG', auth, salesSpend);
app.post('/dials-to-SQL/:date', auth, dialsToSQL);
app.post('/hourly-dials-to-SQL/:date/:hour', auth, dialsHourlyToSQL);
app.post('/update-dial-IDs', auth, dialIDupdate);
app.get('/dial-report/:date', auth, getDialReport);
app.get('/hourly-dial-report/:date', auth, getDialHourlyReport);
app.post('/dial-report/:date', auth, dialsUpload);
app.get('/interviewer-league-table', auth, leagueTable);
app.post('/interviewer-league-table', auth, leagueTablePost);
app.get('/dashboard/:year', auth, getDashboard);
app.get('/users', auth, getUsers);
app.post('/users', auth, addUser);
app.get('/feedback/:page', auth, getFeedbackPage);
app.post('/feedback/:page', auth, submitFeedback);

app.get('/proj-page/:id', auth,allIndex);
app.get("/allProjects", auth, allProjects);
app.get("/all-QC-checks/:st/:en/:forCoaching", auth, allQCchecks);

app.get('/client-projects/:id', auth, getClientProjects);
app.get('/live-proj', auth, getLiveProject)

app.get('/add', auth, addProjectPage);
app.get('/edit/:id', auth, editProjectPage);
app.get('/delete/:id', auth, deleteQuote);

app.get('/overview/:id', auth, viewProjectPage);
app.get('/overview/:id/:jobIDs', auth, viewProjectPage);

app.get('/getquotes/:start/:end', auth, getQuotes);
app.get('/getquotes/:start/:end/:client', auth, getClientQuotes);
app.get('/getquotes/:start/:end/:client/:number', auth, getClientFilteredQuotes);
app.get('/view-quotes', auth, searchQuotesPage);

app.get('/view-interviewers/:id', auth, getInts);
app.get('/add-interviewers/:id', auth, addInterviewerPage);
app.get('/editint/:id', auth, addInterviewerPage);
app.get('/deleteint/:id', auth, deleteInterviewer);
app.get('/reviewint/:id', auth, interviewerPerformance);
app.get('/interviewer-pay', auth, interviewerPayPage);
app.get('/view-interviewer-pay/:month/:year/:clientExcl', auth, interviewerPaySearch);


app.get('/add-client', auth, addClientPage);
app.get('/edit-client/:id', auth, editClientPage);
app.get('/view-clients', auth, getClients);
app.get('/clientPerformance/:start/:end/:id', auth, clientPerformance);

app.get('/add-panel', auth, addPanelPage);
app.get('/view-panels', auth, getPanels);
app.get('/panelPerformance/:start/:end/:id', auth, panelPerformance);

app.get('/addgroup/:id', auth, addGroupPage);
app.get('/edit-group-page/:id', auth, editGroup);
app.get('/delete-group/:id', auth, deleteGroup);

app.get('/addincentive/:id', auth, addIncentivePage);
app.get('/edit-incentive/:id/:id2', auth, editIncentive);

app.get('/addothercost/:id', auth, addOtherCostPage);
app.get('/edit-cost/:id/:id2', auth, editOtherCost);

app.get('/add-samplespend/:id', auth, addSampleSpendPage);
app.get('/edit-samplespend/:id/:id2', auth, editSampleSpend);

app.get('/add-online/:id', auth, addOnline);
app.get('/edit-online/:id/:id2', auth, editOnlineSpend);

app.get('/view-planner/:id/:days', auth, viewPlanner);
app.get('/view-planner-new/', auth, viewPlanner);
app.post('/view-planner/:id/:days', auth, updateResourcePlanner);

app.get('/allocate/:shift/:date/:id/:hs', auth, allocateDates);
app.get('/allocation-page/:hs', auth, allocationPage);
app.get('/reallocate/:shift/:date/:jid', auth, reallocate);
app.get('/edit_allocation/:shift/:date', auth, editAllocation);

app.get('/get-payrates', auth, getPayRates);
app.get('/edit_payrates', auth, editPayRates);

app.post('/edit_payrates', updatePayRates);

app.get('/forecaster', auth, foreCast);

app.get('/int-performance/:start/:end/:id/:teamid', auth, interviewerPerformance);

app.get('/daily-reports', auth, viewReport);
app.get('/daily-update/:date', auth, dailyReport);

app.get('/api-projects', auth, apiProjects);
app.get('/api-sample-reports/:id', auth, apiSampleReports);
app.get('/api-daily', auth, apiDailySelect);
app.get('/find-api-daily/:date/:type', auth, apiDailyView);

app.get('/edit-quote/:id', auth, editQuotePage);
app.post('/edit-quote/:id', auth, editQuote);

app.post('/add', addProject);
app.post('/edit/:id', editProject);
app.post('/overview/:id', viewProjectPage);

app.post('/add-interviewers', addInterviewer);
app.post('/editint', editInterviewer);

app.post('/add-client', addClient);

app.post('/add-panel', addPanel);

app.post('/addgroup/:id', addGroup);
app.post('/addincentive/:id', addIncentive);
app.post('/edit-incentive/:id/:id2', updateIncentive);

app.post('/edit-group-page/:id', updateGroup);

app.post('/edit-cost/:id/:id2', updateCost);

app.post('/addothercost/:id', addOtherCost);

app.post('/edit-samplespend/:id/:id2', updateSampleSpend);
app.post('/add-samplespend/:id', addSampleSpend);

app.post('/add-online/:id', addOnlineInterviews);

app.post('/edit-online/:id/:id2', updateOnlineSpend);

app.post('/allocate/:shift/:date/:id/:hs', allocationPageRedirect);
app.post('/allocation-page/:id', submitAllocation);
app.post('/edit_allocation/:shift/:date', updateAllocation);
app.get('/check-connection', auth, function(req, res){
  res.send("success")
})
app.get('/somethingelse/', auth, (req,res) => {
  console.log("found")
  getRCextensions().then(function(e){
    res.send(e)
  })
})
function agentRCcheck(){
  getRCextensions().then(function(e){
    res.send(e)
  })
}
let agentMarQ=`
declare @ydayMarq date = (select top 1 inputDate from dailyInput where inputDate<cast(getdate() as date) order by inputDate desc)
select Agents.agentID,Agents.agentName,sum(isnull(CPI,0)*isnull(Ints,0)) as sales,sum(isnull(Pay,0)) as pay,inputDate,case when inputDate=@ydayMarq then 1 else 0 end as latest
from
ViewDailyPay
left join Agents on agents.agentID=ViewDailyPay.agentID
left join ViewJobsStats on ViewJobsStats.jobID=ViewDailyPay.jobID
where inputDate between dateadd(day,-10,cast(getdate() as date)) and @ydayMarq
and ViewDailyPay.agentID in (select agentID from DailyInput where inputDate=@ydayMarq)
group by agentName,inputDate,Agents.agentID
order by inputDate desc`
let jobMarQ=`
declare @ydayMarq2 date = (select top 1 inputDate from dailyInput where inputDate<cast(getdate() as date) order by inputDate desc)
select ViewJobsStats.jobID,fullJobName,sum(CPI*Ints) as sales,sum(isnull(Pay,0)) as pay,inputDate,case when inputDate=@ydayMarq2 then 1 else 0 end as latest
from
ViewDailyPay
left join ViewJobsStats on ViewJobsStats.jobID=ViewDailyPay.jobID
where inputDate between dateadd(day,-10,cast(getdate() as date)) and @ydayMarq2
and ViewDailyPay.jobID in (select jobID from DailyInput where inputDate=@ydayMarq2)
and ViewJobsStats.jobProjectID>2
group by fullJobName,inputDate,ViewJobsStats.jobID
order by inputDate desc`
once(emitter,'SQLconnected').then(()=>{
  setMarquees()
  getBankHols()
})
function setMarquees(){
  db.query(agentMarQ,(err,agentMarR)=>{
    if (err) {
      console.log(err)
    }else {
      global.agentMarquee=agentMarR.recordset.filter(el=>el.latest==1).map(el=>{
        el.lCont=el.sales>0?el.pay/el.sales:0.999
        let last=agentMarR.recordset.find(el2=>el2.agentID==el.agentID && el2.latest!=1)
        if (last) {
          el.pCont=last.sales>0?last.pay/last.sales:0.999
          el.contDiff=el.lCont-el.pCont
          return (el.contDiff<0?'<i class="fas fa-chevron-down indicator"></i> ':'<i class="fas fa-chevron-up indicator"></i> ')+"<a class='agentMarqHover "+(el.lCont<0.36?'success':'danger')+"' data-agentID='"+el.agentID+"' data-yday-date='"+moment(el.inputDate).format("YYYY-MM-DD")+"' data-past-date='"+moment(last.inputDate).format("YYYY-MM-DD")+"' href='/int-performance/"+moment(last.inputDate).format("YYYY-MM-DD")+"/"+moment(el.inputDate).format("YYYY-MM-DD")+"/"+el.agentID+"/0'>"+el.agentName+" "+Math.round(el.lCont*100)+"%</a>"
        }
      })
    }
  })
  db.query(jobMarQ,(err,jobMarR)=>{
    if (err) {
      console.log(err)
    }else {
      global.jobMarquee=jobMarR.recordset.filter(el=>el.latest==1).map(el=>{
        el.lCont=el.sales>0?el.pay/el.sales:0.999
        let last=jobMarR.recordset.find(el2=>el2.jobID==el.jobID && el2.latest!=1)
        if (last) {
          el.pCont=last.sales>0?last.pay/last.sales:0.999
          el.contDiff=el.lCont-el.pCont
          return (el.contDiff<0?'<i class="fas fa-chevron-down indicator"></i> ':'<i class="fas fa-chevron-up indicator"></i> ')+"<a class='jobMarqHover "+(el.lCont<0.36?'success':'danger')+"' data-jobID='"+el.jobID+"' data-yday-date='"+moment(el.inputDate).format("YYYY-MM-DD")+"' data-past-date='"+moment(last.inputDate).format("YYYY-MM-DD")+"' href='/overview/-1/"+el.jobID+"'>"+el.fullJobName+" "+Math.round(el.lCont*100)+"%</a>"
        }
      })
    }
  })
}
cron.schedule('0 9 * * 1,2,3,4,5', () => {
  getBankHols()
  setMarquees()
})
cron.schedule('0 0 * * *', () => {
  logger.info("SYS: Refreshing global date variables...")
  global.currPayPeriodSt = stDate.format(moment.HTML5_FMT.DATE)
  global.currPayPeriodEn = enDate.format(moment.HTML5_FMT.DATE)
  global.tdy = moment().format(moment.HTML5_FMT.DATE)
  logger.info("SYS: Global date variables refreshed...")
  logger.info("SYS:  currPayPeriodSt: "+currPayPeriodSt)
  logger.info("SYS:  currPayPeriodEn: "+currPayPeriodEn)
  logger.info("SYS:  tdy: "+tdy)
  updateGoogleTally()
  db.query("delete from MenuClickLogs where logDate<dateadd(day,-30,getDate())")
  contCheckData={}
  const directory = publicPath+'/temp/';
  fs.rm(directory,{recursive:true},err=>{
    if (err) {
      console.log("SYS: could not remove temp file:",err)
    }
    logger.info("SYS: temp storage cleared")
    fsx.ensureDir(publicPath+'/temp/Recordings', err => {
      logger.info("SYS: error adding temp/Recordings folder",err)
    })
  })
})
cron.schedule('0/10 9-21 * * *',()=>{

  getBreatheEmployees().then(function(e){
    getBradfordScores().then(br=>{
      global.breatheEmployees=e.map(agent=>{
        let rec=br.find(el=>el.breatheID==agent.id)
        rec=rec?rec:{}
        return {...agent,...rec}
      })
    })
    console.log("Breathe data downloaded",breatheEmployees.length)
  }).catch(err=>{
    console.log("error setting breatheEmployees scheduled",err)
  })
  let bookingWeek=moment().add(2, 'weeks').isoWeekday(1)
  bookingReq.get('/exec?reqType=getBookings&bookingWeek='+moment(bookingWeek).format("YYYY-MM-DD")).then(e=>{
    defaultBookingRequests=e
  })
  rejectBookings()
})
console.log("is before 23rd?",moment().isBefore('2022-12-23'))
if (process.env.SERVICE_ID) {
  cron.schedule('15 9-21 * * *',()=>{
    noShowAlerts()
  })
  cron.schedule('*/10 9-21 * * *', () => {
    contChangeCheck()
    updateAllSampleCounts()
  })
  cron.schedule('0 8 * * 1,2,3,4,5', () => {
    // sendProjectQueries().then(e=>{
      sendUnfinishedQCemails().then(e=>{
        sendFollowUps().then(e=>{
          chaseOutcomes().then(e=>{
            sendComplaintsReminders().then(e=>{
              escalationEmail()
            })
          })
        })
      })
    // })
  })
  cron.schedule('10 0 * * *', () => {
    loopWorkingHours()
  })
  cron.schedule('25 2 * * *', () => {
    applyRegularHours()
  })
  cron.schedule('30 8 * * 1', () => {
    //every Monday
    sendRemoteWorkerReport()
    sendUpdateSummary(moment().subtract(1,"week"),moment().subtract(1,"day"),"Last Week")
  })
  cron.schedule('35 8 1 * *', () => {
    //first day of the month
    sendUpdateSummary(moment().subtract(1,"month"),moment().subtract(1,"day"),"Last Month")
  })
  cron.schedule('40 8 14 * *', () => {
    //first day of the pay month
    sendUpdateSummary(moment().subtract(1,"month"),moment().subtract(1,"day"),"Last Pay Month")
  })
  cron.schedule('15 21 * * 5', () => {
    sendMondayReport()
  })
  cron.schedule('15 12 * * 1', () => {
    logger.info("sending booking forms",process.env)
    sendBookingForm(false)
  })
  cron.schedule('15 13 * * 3', () => {
    logger.info("sending booking forms",process.env)
    sendBookingForm(true)
  })
  cron.schedule('15 12 * * 7', () => {
    logger.info("sending booking forms",process.env)
    sendBookingForm(true)
  })
  cron.schedule('2 17 * * 3-5', () => {
    logger.info("sending booking report",process.env)
    sendBookingReport()
  })
  cron.schedule('0 10 * * 2', () => {
    attendanceEmails().then(e=>{
      tuesdayReport()
    })
  })
  cron.schedule('0 17 * * 7', () => {
    sendSundayInts()
  })
  cron.schedule('2 23 * * *', () => {
    syncRCdials(moment(),null)
  })
  cron.schedule('2 3 * * *', () => {
    addAutoAllocations().then(e=>{
      initialNoShows().then(e=>{
        setDailyResourceTargets().then(e=>{
          sqlCleanup()
        })
      })
    })
  })
  // cron.schedule('0 3 * * *', () => {
  //   syncRCdialsNew(moment().subtract(1,'d').format("YYYY-MM-DD"))
  // })
  // cron.schedule('2 10-21 * * *', () => {
  //   syncRCdials(moment(),moment().hour()-1)
  // })
  cron.schedule('1 17 * * *', () => {
    syncRCdials(moment(),0)
  })
  cron.schedule('1 21 * * *', () => {
    syncRCdials(moment(),1)
  })

  cron.schedule('5 10 * * *', () => {
    quoteChaseEmails()
  })
  cron.schedule('15 17 * * 5', () => {
    quoteChaseReport()
  })
  cron.schedule('1 9 * * *', () => {
    csatChaseEmails()
  })
  cron.schedule('5 12 1 * *', () => {
    lastYearChaseReport()
  })
  cron.schedule('5 9 14 * *',()=>{
    sendHoursReview(true)
  })
  cron.schedule('5 9 18 * *',()=>{
    sendHoursReview()
  })
  cron.schedule('30 16 * * *',()=>{
    cmResourceUpdate()
  })
}
function escalationEmail(){
  return new Promise((resolve,reject)=>{
    let jobQ=`
    SELECT * FROM
    Jobs
    left join ViewJobFullName on ViewJobFullName.jobID=Jobs.jobID
    left join Projects on Projects.projectID=Jobs.projectID
    left join (select jobID as dailyID from DailyInput where inputDate=dateadd(day,CASE WHEN datepart(DW,@tdy) = 2 THEN -3 ELSE -1 END, @tdy) group by jobID) daily on daily.dailyID=Jobs.jobID
    WHERE isJobHourly=0 AND dailyID IS NOT NULL AND Jobs.jobID>7`
    let jobDailyQ=`
    SELECT Jobs.jobID, Jobs.jobName, Jobs.projectID, inputDate, isnull(sum(ViewDailyPay.Pay),0) as pay, isnull(sum(CASE WHEN Jobs.isJobHourly=1 THEN Hrs ELSE Ints END*ViewJobsStats.CPI),0) as sales, Jobs.isJobEve, Jobs.isJobDay, CASE WHEN (sum(ViewDailyPay.Pay)/nullif(sum(CASE WHEN Jobs.isJobHourly=1 THEN Hrs ELSE Ints END*ViewJobsStats.CPI),0)>0.35 AND Jobs.isJobEve=1) OR (sum(ViewDailyPay.Pay)/nullif(sum(CASE WHEN Jobs.isJobHourly=1 THEN Hrs ELSE Ints END*ViewJobsStats.CPI),0)>0.4 AND Jobs.isJobDay=1) OR sum(Ints*ViewJobsStats.CPI)=0 THEN 1 ELSE 0 END as underTarget
    from (SELECT sum(Pay) as Pay, sum(Ints) as Ints, sum(Hours) as Hrs, inputDate, jobID from ViewDailyPay group by jobID, inputDate) ViewDailyPay
    LEFT JOIN ViewJobsStats ON ViewDailyPay.jobID=ViewJobsStats.jobID
    LEFT JOIN Jobs ON ViewDailyPay.jobID=Jobs.jobID
    where inputDate<cast(getdate() as date) and endDate>cast(getdate() as date) AND Jobs.projectID>2
    group by Jobs.jobID, Jobs.jobName, Jobs.projectID, inputDate, Jobs.isJobEve, Jobs.isJobDay
    order by inputDate asc`
    var txt=""
    txt=txt+"<h2>There are jobs that require escalation today</h2><table class='perfTable'><thead><th>Job</th><th style='text-align:center' colspan='3'>Last 3 shifts</th></thead><tbody>"
    db.input('tdy',new Date(tdy))
    db.query(jobQ, (err, jobR) =>{
      if (err) {
        console.log(err)
        resolve()
      }
      db.query(jobDailyQ, (err, jobDailyR) =>{
        if (err) {
          console.log(err)
          resolve()
        }
        var escCount=0
        var dte=new Date()
        dte.setHours(0,0,0,0)
        txt=txt+jobR.recordset.map((job, i) => {
          var jobDailys=jobDailyR.recordset.filter(el=>el.jobID==job.jobID[0])
          // console.log(jobDailys)
          if (jobDailys) {
            var dailyCont=jobDailys.map(el=>{
              var obj={}
              obj.cont=el.sales?((el.pay/el.sales)*100).toFixed(0):'inf'
              obj.underTarget=el.underTarget
              obj.inputDate=el.inputDate
              return obj
            })
            var consecutiveUnderTarget=0
            for (var n = 0; n < dailyCont.length; n++) {
              if (dailyCont[n].underTarget>0) {
                consecutiveUnderTarget++
              }else {
                consecutiveUnderTarget=0
              }
            }
            if (consecutiveUnderTarget>0 && consecutiveUnderTarget % 3 == 0) {
              escCount++
              return '<tr><td><a href="http://job-analysis:8080/overview/'+job.quoteID+'">'+job.jobName[1]+'</a></td><td>'+dailyCont[dailyCont.length-3].cont+'%</td><td>'+dailyCont[dailyCont.length-2].cont+'%</td><td style="color:red">'+dailyCont[dailyCont.length-1].cont+'%</td></tr>'
            }else {
              return ''
            }
          }
        }).join("")
        txt=txt+'</tbody></table><br><br>'
        if (escCount>0) {
          emailTo=[]
          emailTo.push('matt@teamsearchmr.co.uk')
          emailTo.push('tokulus@teamsearchmr.co.uk')
          let mailOptions = {
            from: 'JA2 <reports@teamsearchmr.co.uk>',
            to: emailTo,
            subject: "Escalations needed ("+moment().format("DD/MM/YYYY")+")",
            html: '<p>' + header + txt + footer + '</p>',
            priority: 'high'
          };
          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.log(error);
              logger.info('Could not send escalations email: '+error);
            }else {
              console.log("escalations email sent")
            }
            resolve()
          });
        }
      })
    })
  })
}
function sendUnfinishedQCemails(){
  return new Promise((resolve,reject)=>{
    let qcToDoQ=`
    SELECT * FROM
    QualityControl
    LEFT JOIN Agents on QualityControl.agentID=Agents.agentID
    LEFT JOIN ViewJobFullName on QualityControl.jobID=ViewJobFullName.jobID
    WHERE
    QualityControl.isFinished<>1
    `
    db.query(qcToDoQ, (err, qcToDoR) =>{
      if (err) {
        console.log(err)
        logger.info('Error getting unfinished QCs for email ' + err)
        resolve()
      }else {
        let txt=""
        txt=txt+"<h2>There are "+qcToDoR.recordset.length+" unfinished QC checks outstanding</h2><table class='perfTable'><thead><th>Agent</th><th>Job</th><th>Interview date</th><th>Monitored date</th><th>Serial</th><th></th></thead><tbody>"
        if (qcToDoR.recordset.length>0) {
          txt=txt+qcToDoR.recordset.map((qc,i)=>"<tr "+((i % 2 === 0) ? "class='alt'" : "")+"><td>"+qc.agentName+"</td><td>"+qc.jobName+"</td><td>"+moment(qc.interviewDate).format("DD/MM/YYYY")+"</td><td>"+moment(qc.dateMonitored).format("DD/MM/YYYY")+"</td><td>"+qc.serial+"</td><td><a href='http://job-analysis:8080/edit-qc-check/"+qc.qualityControlID+"'>Finish now</a></tr>").join("")
          txt=txt+"</tbody></table>"
          emailTo=[]
          // emailTo.push('matt@teamsearchmr.co.uk')
          emailTo.push('cath@teamsearchmr.co.uk')
          let mailOptions = {
            from: 'JA2 <reports@teamsearchmr.co.uk>',
            to: emailTo,
            subject: "QC checks to finish ("+moment().format("DD/MM/YYYY")+")",
            html: '<p>' + header + txt + footer + '</p>',
            priority: 'high'
          };
          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.log(error);
              logger.info('Could not send QC unfinished email: '+error);
            }else {
              console.log("QC unfinished email sent")
            }
            resolve()
          });
        }else {
          resolve()
        }
      }
    })
  })
}
function sendProjectQueries(){
  return new Promise((resolve,reject)=>{
    db.query("select * from users left join staff on staff.staffID=users.staffID where isUserActive=1", (err, usersR) =>{
      let x=0
      function cycleUsers(){
        userRec=usersR.recordset[x]
        if (userRec) {
          let queryQ=`
          select ViewProjectQueries.projectID,Quotes.quoteID,Quotes.quoteNo,Quotes.quoteName,count(*) as queryCount
          from
          ViewProjectQueries
          left join Projects on Projects.projectID=ViewProjectQueries.projectID
          left join Quotes on Projects.quoteID=Quotes.quoteID
          where userID=`+userRec.userID+` and isNew=1
          group by ViewProjectQueries.projectID,Quotes.quoteNo,Quotes.quoteName,Quotes.quoteID`
          db.query(queryQ, (err, queriesR) =>{
            if (queriesR.recordset.length>0) {
              let txt=""
              txt=txt+"You have "+queriesR.recordset.reduce((a,b)=>a+b.queryCount,0)+" project queries to address on JA2:"
              txt=txt+"<ul>"
              txt=txt+queriesR.recordset.map(query=>"<li><a href='http://job-analysis:8080/project-queries/"+query.projectID+"'>"+query.queryCount+" queries on "+query.quoteNo+" "+query.quoteName+"</a></li>").join("")
              txt=txt+"</ul>"
              let mailOptions = {
                // from: 'JA2 <reports@teamsearchmr.co.uk>',
                to: usersR.staffEmail,
                to: 'matt@teamsearchmr.co.uk',
                subject: "Project Queries To Address",
                html: '<p>' + header + txt + footer + '</p>'
              };
              transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                  console.log(error);
                  logger.info('Could not send project query email: '+error);
                }else {
                  console.log("project query email sent")
                }
                x++
                cycleUsers()
              });
            }else {
              x++
              cycleUsers()
            }
          });
        }else {
          resolve()
        }
      }
      cycleUsers()
    })
  })
}
function sendFollowUps(){
  return new Promise((resolve,reject)=>{
    let coachQ = `
    SELECT
    AgentName,
    teamID,
    coachingDate,
    CoachingNew.coachingID,
    coachingFollowUpDate,
    coachingFollowUpNotes
    FROM
    AgentPlans
    LEFT JOIN CoachingNew ON CoachingNew.coachingID=AgentPlans.coachingID
    LEFT JOIN Agents ON Agents.agentID=AgentPlans.agentID
    WHERE coachingFollowedUpDate IS NULL AND coachingFollowUpDate<=CAST(getdate() as date) AND agentLeft is null
    ORDER BY teamID`
    let pdpQ = `
    SELECT
    AgentName,
    teamID,
    pdpStartDate,
    pdpEndDate,
    pdpExtensionDate,
    coachingFollowedUpNotes,
    AgentPlans.coachingID
    FROM
    AgentPlans
    LEFT JOIN CoachingNew ON CoachingNew.coachingID=AgentPlans.coachingID
    LEFT JOIN Agents ON Agents.agentID=AgentPlans.agentID
    WHERE pdpOutcomeDate IS NULL AND (pdpEndDate<=CAST(getdate() as date) OR pdpExtensionDate<=CAST(getdate() as date)) AND agentLeft is null
    ORDER BY teamID`
    let tlQ=`
    SELECT
    agentTeamID,
    staffEmail,
    teamName
    FROM
    AgentTeams
    LEFT JOIN Staff ON Staff.staffID=AgentTeams.managerID`
    let emailTo=[]
    db.query(coachQ, (err, coachR) =>{
      if (err) {
        console.log(err);
        logger.info('Could not get coaching follow-ups for email: '+err);
        resolve()
      }else {
        db.query(pdpQ, (err, pdpR) =>{
          if (err) {
            console.log(err);
            logger.info('Could not get pdp follow-ups for email: '+err);
            resolve()
          }else {
            db.query(tlQ, (err, tlR) =>{
              if (err) {
                console.log(err);
                logger.info('Could not get TLs for coaching follow-up email: '+err);
                resolve()
              }else {
                let x=0
                function sendEmails(){
                  let tl=tlR.recordset[x]
                  if (tl) {
                    let txt=""
                    txt=txt+"<h2>There are coaching follow-ups required today for "+tl.teamName+"</h2><table class='perfTable'><thead><th>Agent</th><th>Coached</th><th>Follow-up due</th><th>Comments</th></thead><tbody>"
                    let filtered=coachR.recordset.filter(function(coach) {return coach.teamID==tl.agentTeamID})
                    if (filtered.length>0) {
                      txt=txt+filtered.map((coachAgent,i)=>"<tr "+((i % 2 === 0) ? "class='alt'" : "")+"><td>"+coachAgent.AgentName+"</td><td>"+moment(coachAgent.coachingDate).format("DD/MM/YYYY")+"</td><td style='"+((moment(coachAgent.coachingFollowUpDate)<moment().startOf('day')) ? "color:red" : "")+"'>"+moment(coachAgent.coachingFollowUpDate).format("DD/MM/YYYY")+"</td><td width='200px'>"+coachAgent.coachingFollowUpNotes+"</td><td><a href='http://job-analysis:8080/coaching-follow-up/"+coachAgent.coachingID+"'>Follow up now</a></td></tr>").join("")
                      txt=txt+"</tbody></table>"
                      emailTo=[]
                      emailTo.push(tl.staffEmail)
                      // emailTo.push('matt@teamsearchmr.co.uk')
                      emailTo.push('tokulus@teamsearchmr.co.uk')
                      emailTo.push('pjaeger@teamsearchmr.co.uk')
                      let mailOptions = {
                        from: 'JA2 <reports@teamsearchmr.co.uk>',
                        to: emailTo,
                        // to:'matt@teamsearchmr.co.uk',
                        subject: "Coaching follow-ups due ("+moment().format("DD/MM/YYYY")+")",
                        html: '<p>' + header + txt + footer + '</p>',
                        priority: 'high'
                      };
                      transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                          console.log(error);
                          logger.info('Could not send coaching follow-up email: '+error);
                          sendPDP()
                        }else {
                          sendPDP()
                          console.log("Coaching follow-up email sent")
                        }
                      });
                    }else {
                      sendPDP()
                    }
                    function sendPDP(){
                      txt2=""
                      txt2=txt2+"<h2>There are PDPs ending today for "+tl.teamName+"</h2><table class='perfTable'><thead><th>Agent</th><th>PDP started</th><th>PDP ends</th><th>Comments</th></thead><tbody>"
                      filtered2=pdpR.recordset.filter(function(coach) {return coach.teamID==tl.agentTeamID})
                      if (filtered2.length>0) {
                        txt2=txt2+filtered2.map((coachAgent, i) => {
                          let pdpEndDate2=coachAgent.pdpEndDate
                          if (coachAgent.pdpExtensionDate) {
                            pdpEndDate=coachAgent.pdpExtensionDate
                          }
                          return "<tr "+((i % 2 === 0) ? "class='alt'" : "")+"><td>"+coachAgent.AgentName+"</td><td>"+moment(coachAgent.pdpStartDate).format("DD/MM/YYYY")+"</td><td style='"+((moment(pdpEndDate2)<moment().startOf('day')) ? "color:red" : "")+"'>"+moment(pdpEndDate2).format("DD/MM/YYYY")+"</td><td width='200px'>"+coachAgent.coachingFollowedUpNotes+"</td><td><a href='http://job-analysis:8080/coaching-follow-up/"+coachAgent.coachingID+"'>Follow up now</a></td></tr>"
                        }).join("");
                        txt2=txt2+"</tbody></table>"
                        emailTo2=[]
                        emailTo2.push(tl.staffEmail)
                        // emailTo2.push('matt@teamsearchmr.co.uk')
                        emailTo2.push('tokulus@teamsearchmr.co.uk')
                        let mailOptions2 = {
                          from: 'JA2 <reports@teamsearchmr.co.uk>',
                          to: emailTo2,
                          // to:'matt@teamsearchmr.co.uk',
                          subject: "PDPs ending ("+moment().format("DD/MM/YYYY")+")",
                          html: '<p>' + header + txt2 + footer + '</p>',
                          priority: 'high'
                        };
                        transporter.sendMail(mailOptions2, (error, info) => {
                          if (error) {
                            console.log(error);
                            logger.info('Could not send pdp follow-up email: '+error);
                            x++
                            sendEmails()
                          }else {
                            x++
                            sendEmails()
                            console.log("PDP follow-up email sent")
                          }
                        });
                      }else {
                        x++
                        sendEmails()
                      }
                    }
                  }else {
                    resolve()
                  }
                }
                sendEmails()
              }
            })
          }
        })
      }
    })
  })
}

async function updateGoogleTally() {
  await GoogleTallySheet.useServiceAccountAuth(GoogleCreds).catch(e => { console.log("Error in Google Auth: "+e) })
  await GoogleTallySheet.loadInfo().catch(e => { console.log("Error in Google loadInfo: "+e) }); // loads document properties and worksheets
  let sheet=GoogleTallySheet.sheetsByTitle["Tally sheet"]
  await sheet.clear();
  await sheet.setHeaderRow(['Date','agentID','Agent','jobID','Job','Shift start','Shift end','Absence','Hours','inputInterviews'])
  let tallyQ=`
  select format(bookingDate,'dd/MM/yyyy') as 'Date', agents.agentID, agentName as Agent, dailyInput.jobID, jobName as Job, convert(char(5),convert(time(0),startTime)) as 'Shift start', convert(char(5),convert(time(0),endTime)) as 'Shift end', CASE WHEN startTime='00:00' THEN 'Holiday' ELSE absenceType END as Absence, inputHours as 'Hours', inputInterviews
  from (Select distinct bookingDate, agentID, endTime, startTime from booking) Booking
  left join dailyInput on dailyInput.inputDate=booking.bookingDate and dailyInput.agentID=booking.agentID
  left join Absence on absence.absenceDate=booking.bookingDate and Absence.agentID=booking.agentID
  left join agents on agents.agentid=booking.agentid
  left join ViewJobFullName on ViewJobFullName.jobid=dailyInput.jobid
  where bookingDate>= DATEADD(month,-2,GETDATE())
  order by bookingDate, agentName`
  let tallyResp=[]
  await db.query(tallyQ, (err, tallyR) => {
    if (err) {
      console.log(err)
    }else {
      tallyResp=tallyR.recordset
      sheet.addRows(tallyR.recordset).catch(e => { console.log("Error in db query Google Tally sheet: "+e) })
    }
  })
}

app.get('*', function(req, res){
  res.render('404.ejs', {
    title: "LOST"
  })
});
function rcLogin(){
  return rcPlatform.login( {grant_type:'password',refresh_token_ttl:604800,username: process.env.RINGCENTRAL_USERNAME, password: process.env.RINGCENTRAL_PASSWORD, extension: process.env.RINGCENTRAL_EXTENSION} ).then(function(e){
    return e.json().then(function(s){
      global.rcToken=s['access_token']
    })
    console.log("logged into RingCentral API")
    rcPlatform.on(rcPlatform.events.refreshError, function(e){
      rcLogin()
    })
  }).catch(function(e){
    return console.log(e)
  })
}
function importRCIDs(){
  let failed=[]
  db.query("update agents set ringCentralID=null", (err, r2) => {
    rcPlatform.get("/restapi/v1.0/account/~/extension/",{type:'User',perPage:500}).then(function(extResp){
      extResp.json().then(function(e){
        console.log(e.records.length+" records",e)
        for (var record of e.records){
          let q="update agents set ringCentralID="+record.id+" where agentName like '%"+record.name+"%'"
          db.query(q, (err, r) => {
            if (r.rowsAffected>0) {
            }else {
              failed.push({name:record.name,id:record.id})
            }
          })
        }
      })
    })
  })
}
function switchIVR(ivrName,ivrOpt,callQueueExtID){
  rcPlatform.get("/restapi/v1.0/account/~/ivr-menus/").then(function(ivrResp){
    ivrResp.json().then(function(ivrJ){
      ivrJ.records.forEach((ivr, i) => {
        if (ivr.name==ivrName) {
          rcPlatform.get("/restapi/v1.0/account/~/ivr-menus/"+ivr.id).then(function(ivrResp){
            ivrResp.json().then(function(ivrJ2){
              let edited={}
              edited.actions=ivrJ2.actions.map(el=>{
                if(el.input==ivrOpt){
                  el.extension={id:callQueueExtID}
                }
                return el
              })
              rcPlatform.put("/restapi/v1.0/account/~/ivr-menus/"+ivr.id,edited).then(function(e){
                console.log("switched IVR group to "+callQueueExtID)
              })
            })
          })
        }
      });
    })
  })
}

function getRCextensions(){
  return rcPlatform.get("/restapi/v1.0/account/~/extension/").then(function(extResp){
    return extResp.json().then(function(e){
      console.log(e)
      for (var record of e.records){
        console.log(record.id,record.permissions)
      }
    })
  })
}

function moveRCExtensions(fromGroup,toGroup,extID){
  rcPlatform.get("/restapi/v1.0/account/~/extension/").then(function(extensions){
    rcPlatform.post('/restapi/v1.0/account/~/call-queues/'+fromGroup+'/bulk-assign', {
      addedExtensions:[],
      removedExtensionIds:extensions.records.filter(el=>el.type=="User" && el.extensionNumber==extID).map(el=>el.id)
    }).then(function(e){
      rcPlatform.post('/restapi/v1.0/account/~/call-queues/'+toGroup+'/bulk-assign', {
        addedExtensions:extensions.records.filter(el=>el.type=="User" && el.extensionNumber==extID).map(el=>el.id),
        removedExtensionIds:[]
      }).then(function(e){
        console.log(e)
      }).catch(function(err){
        console.log(err)
      })
    }).catch(function(err){
      console.log(err)
    })
  }).catch(function(err){
    console.log(err)
  })
}

function removeRCUser(id,del){
  return rcPlatform.put('/restapi/v1.0/account/~/extension/' + id, {status:"Disabled"}).then(function (disResp) {
    console.log(disResp)
    if (del) {
      rcPlatform.delete('/restapi/v1.0/account/~/extension/'+id).then(function (resp) {
        console.log(resp)
      }).catch(function(e){
        console.log(e.message)
      });
    }
  }).catch(function(e){
    console.log(e.message)
  });
}
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
  return rcPlatform.put('/restapi/v1.0/account/~/extension/' + id + '/business-hours', body)
}
global.prepareBookingSQL=(campaign)=>{
  return new Promise((resolve,reject)=>{
    const ps = new sql.PreparedStatement()
    ps.input('type', sql.VarChar(255))
    ps.input('agentID', sql.Int)
    ps.input('msg', sql.VarChar(sql.MAX))
    ps.input('to', sql.VarChar(255))
    ps.prepare(`insert into AgentSends (sendType,sendDate,agentID,message,contact,campaign) values (@type,getdate(),@agentID,@msg,@to,'`+campaign+`')`, err => {
      if (err) {
        reject(err)
      }else {
        resolve(ps)
      }
    })
  })
}
function sendBookingForm(isReminder,customDate){
  let dte=moment().startOf('isoWeek').add(2, 'weeks')
  if (customDate) {
    dte=moment(customDate)
  }
  let agentQ=`
  select a.agentID,agentName,breatheID,teamID,booked,fixedHours
  from agents a
  left join agentTeams t on t.agentTeamID=a.teamID
  left join AgentContracts c on c.contractID=a.contractVersion
  left join (select agentID,count(*) as booked from Booking where bookingDate between '`+dte.format("YYYY-MM-DD")+`' and dateadd(day,6,'`+dte.format("YYYY-MM-DD")+`') and isnull(isContractShift,0)=0 group by agentID) b on b.agentID=a.agentID
  left join (select agentID,count(*) as absent from Absence where absenceDate between '`+dte.format("YYYY-MM-DD")+`' and dateadd(day,6,'`+dte.format("YYYY-MM-DD")+`') and absenceType<>'No show' group by agentID) ab on ab.agentID=a.agentID
  where agentLeft is null
  and breatheID is not null
  and booked is null and isnull(absent,0)<7
  and a.teamID>1
  and t.isAllocatable=1
  and c.sendBookingForm=1`
  function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
  return new Promise(fRes=>{
    prepareBookingSQL('Booking '+dte.format("YYYY-MM-DD")).then(ps=>{
      db.query(agentQ, (err, agentR) => {
        if (err) {
          logger.info('error getting booking form agents',err)
          fRes()
        }
        var i=1
        var data=[]
        let n=0
        var smsCollection = new clicksend.SmsMessageCollection();
        smsCollection.messages = []
        // let longUrls=[]
        getBreatheEmployees(true).then(data=>{
          function sendEmails(){
            if (agentR.recordset[n]) {
              let agent=agentR.recordset[n]
              agent.email=data.find(el=>el.id==agent.breatheID).email
              if (data.find(el=>el.id==agent.breatheID)['personal_mobile']) {
                try{
                  agent.telnum=libphonenumber.parsePhoneNumber(data.find(el=>el.id==agent.breatheID)['personal_mobile'],'GB')
                }catch(err){
                  logger.log('Error parseing telnum in booking form',err,agent);
                }
              }
              let subject=agent.fixedHours?"Top up ":"Please book "
              let bodySt=agent.fixedHours?"If you would like to top up your hours for week commencing "+dte.format("DD/MM/YYYY")+", please click on the link below":"Please click on the link below to enter your hours for week commencing "+dte.format("DD/MM/YYYY")
              let url='https://docs.google.com/forms/d/e/1FAIpQLSe0waJeiBfQdrL--204D9kLH5_nLLlavwxE6D-kN3WntQeBhQ/viewform?usp=pp_url&entry.155226268='+dte.format("YYYY-MM-DD")+'&entry.1134691254='+agent.agentID+'&entry.1295280051='+agent.teamID+'&entry.912589891=2'
              let body='<p>Hi '+agent.agentName+'<br><br>'+bodySt+'<br><br><b>All hours must be submitted by this Sunday ('+moment().isoWeekday(7).format("DD/MM/YYYY")+').</b><br><br>Please do not re-use this link. It is only valid for this week. If you re-use this link at a later date, your hours <b>will not be submitted.</b></p><p>'+url+'<br><br>Many thanks,<br>Teamsearch</p>'
              let mailOptions = {
                from:'Teamsearch <reports@teamsearchmr.co.uk>',
                to: agent.email,
                // to: 'matt@teamsearchmr.co.uk',
                subject: (isReminder?"REMINDER - ":"")+subject+"your hours for week commencing "+dte.format("DD/MM/YYYY"),
                html: '<p>' + header + '</p>' + body+'<br><br>' + footer + '</p>'
              }
              function sendText(link){
                if (agent.telnum) {
                  var smsMessage = new clicksend.SmsMessage();
                  smsMessage.from = "Teamsearch";
                  smsMessage.to = agent.telnum.formatInternational();
                  // smsMessage.to = '+447903612563'
                  smsMessage.body = (isReminder?"REMINDER - ":"")+subject+"your hours for week commencing "+dte.format("DD-MMM")+" before this Sunday ("+moment().isoWeekday(7).format("DD-MMM")+"): "+link;
                  smsCollection.messages.push(smsMessage);
                  ps.execute({type:'sms',msg: smsMessage.body,to:smsMessage.to,agentID:agent.agentID},err=>{
                    if (err) {
                      console.log(err)
                    }
                    sleep(1000).then(e=>{
                      n++
                      sendEmails()
                    })
                  })
                }else {
                  n++
                  sendEmails()
                }
              }
              transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                  logger.log('Error sending booking form',agent,error);
                }else {
                  ps.execute({type:'email',msg: body,to:mailOptions.to,agentID:agent.agentID},(err,r)=>{
                    if (err) {
                      console.log(err)
                    }
                    shortenURL(url).then(links=>{
                      sendText(links[0].short_url)
                    }).catch(err=>{
                      console.log(err)
                      sendText(url)
                    })
                  })
                  logger.log('Sent booking form',agent.agentName,agent.email);
                }
              });
            }else {
              smsApi.smsSendPost(smsCollection).then(function(response) {
                logger.log('Sent '+smsCollection.messages.length+' booking texts');
              }).catch(function(err){
                logger.log('Error sending booking texts',err.body,smsCollection);
              });
              ps.unprepare()
              fRes()
            }
          }
          sendEmails()
        })
      })
    }).catch(err=>{
      console.log(err)
      fRes()
    })
  })
}
global.getBreatheEmployees = function(tryCurrent){
  return new Promise((resolve, reject) => {
    var i=1
    var data=[]
    function getData(){
      breathReq.get('/employees?page='+i)
      .then(response => {
        if (response.data.employees.length==0) {
          resolve(data)
        }else {
          data.push.apply(data,response.data.employees.map(el=>({...el,telnum:(el.personal_mobile?libphonenumber.parsePhoneNumber(el.personal_mobile,'GB').number:null)})))
          i++
          getData(i)
        }
      }).catch(function (err) {
        console.log("getBreatheEmployees function error",err)
        reject(err)
      });
    }
    if (tryCurrent) {
      if (breatheEmployees.length>0) {
        resolve(breatheEmployees)
      }else {
        getData()
      }
    }else {
      getData()
    }
  })
}
function sendBookingReport(weekOffset){
  let bookingWeek=moment().add(1, 'weeks').isoWeekday(1)
  if (weekOffset) {
    bookingWeek.add(weekOffset,'weeks')
  }
  let q=`
  select
  b.agentID 'ID'
  ,agentName as 'Agent'
  ,teamName as 'Team'
  ,isnull(jobName,'') as 'Dedicated Job'
  ,case when sum(DATEDIFF(second, startTime, endTime) / 3600.0)=0 then 'Holiday' else 'Booked' end as 'Status'
  ,sum(DATEDIFF(second, startTime, endTime) / 3600.0) as Hours
  ,case when sum(DATEDIFF(second, startTime, endTime) / 3600.0)=0 then 0 else count(distinct bookingDate) end as Shifts
  ,case when sum(DATEDIFF(second, startTime, endTime) / 3600.0)=0 then 'Holiday' else '' end as 'Absence'
  from
  (SELECT DISTINCT agentID, startTime, endTime, bookingDate, bookingTeamID FROM Booking) b
  outer apply (
  	select top 1 t.jobID from
  	DedicatedTeams t
  	where b.bookingDate in (select dedicatedDate from getDedicatedDates() where dedicationID=t.dedicationID) and agentID=b.agentID
  	order by dedicationID DESC
	) dt
  left join ViewJobFullName j on j.jobID=dt.jobID
  left join agents a on a.agentID=b.agentID
  left join AgentTeams t on t.agentTeamID=isnull(bookingTeamID,a.teamID)
  LEFT JOIN (select distinct * from Absence) ab on ab.agentID=b.agentID AND ab.absenceDate=b.bookingDate
  where bookingDate between @stdate and @endate and nullif(absenceType,'No show') is null and a.agentID not in (`+freeAgents.join(",")+`)
  group by b.agentID,agentName,teamName,nullif(absenceType,'No show'),jobName

  union

  select a.agentID,agentName,teamName,'','Absent',0,0,absenceType from
    Absence a
    left join agents ag on ag.agentID=a.agentID
    left join AgentTeams t on t.agentTeamID=ag.teamID
    where absenceDate between @stdate and @endate
    and a.agentID not in (`+freeAgents.join(",")+`)
	and a.agentID not in (select agentID from Absence where absenceDate between @stdate and @endate and absenceType='No show')
	group by a.agentID,agentName,teamName,absenceType

  union

  select a.agentID,agentName,teamName,'','Not booked',0,0,'' from
    agents a
    left join AgentTeams t on t.agentTeamID=a.teamID
    where agentLeft is null
    and agentID>1
    and a.agentID not in (`+freeAgents.join(",")+`)
    and agentID not in (select agentID from booking where bookingDate between @stdate and @endate)
    and agentID not in (select agentID from Absence where absenceDate between @stdate and @endate)
    and agentTeamID>1
  `
  let shiftTimesQ=`
  SET DATEFIRST 1
  select b.isEve,b.isDay,j.jobName,teamName,case when endTime>'18:00:00' OR DATEPART(WEEKDAY,bookingDate)>5 then 1 end isEveShift,concat(CONVERT(VARCHAR(5), startTime, 108),'-',CONVERT(VARCHAR(5), endTime, 108)) shiftTime,DATEPART(WEEKDAY,bookingDate) as wkdy,count(*) as shifts,sum(bookedHours) hrs into ##bookingShifts
  from
  getBookedHours(@stdate,@endate) b
  left join Agents a on a.agentID=b.agentID
  left join AgentTeams t on t.agentTeamID=ISNULL(b.bookingTeamID,a.teamID)
  left join ViewJobFullName j on j.jobID=b.dtJobID
  group by b.isEve,b.isDay,j.jobName,teamName,concat(CONVERT(VARCHAR(5), startTime, 108),'-',CONVERT(VARCHAR(5), endTime, 108)),DATEPART(WEEKDAY,bookingDate),case when endTime>'18:00:00' OR DATEPART(WEEKDAY,bookingDate)>5 then 1 end

  select shiftTime,wkdy,sum(shifts) shifts,sum(hrs) hrs
  from ##bookingShifts
  group by shiftTime,wkdy
  order by shiftTime

  select isEve,jobName,wkdy,sum(shifts) shifts,sum(hrs) hrs
  from ##bookingShifts
  group by wkdy,isEve,jobName
  order by isEve

  select wkdy,sum(hrs) hrs
  from ##bookingShifts
  group by wkdy

  drop table ##bookingShifts`
  const xl = require('excel4node');
  function writeData(data){
    const wb = new xl.Workbook();
    const ws = wb.addWorksheet('Booking Report');
    return new Promise((resolve) => {
      let i=0
      Object.keys(data[0]).forEach((heading,h) => {
        ws.cell(1,h+1).string(heading)
      });
      function writeRows(){
        if (i<data.length) {
          let record=data[i]
          Object.keys(record).forEach((columnName,c) =>{
            if (["Hours","Shifts","ID","Bradford Score"].includes(columnName)) {
              ws.cell(i+2,c+1).number(record[columnName])
            }else {
              ws.cell(i+2,c+1).string(record[columnName])
            }
          });
          i++
          writeRows()
        }else {
          resolve(wb)
        }
      }
      writeRows()
    });
  }
  db.input('stdate',new Date(bookingWeek.format("YYYY-MM-DD")))
  db.input('endate',new Date(moment(bookingWeek).add(6,'d').format("YYYY-MM-DD")))
  db.query(q,(err,r)=>{
    if (err) {
      console.log(err)
    }
    getBradfordScores().then(brScores=>{
      let agentData=r.recordset.map(agent=>{
        let rec=brScores.find(el=>el.agentID==agent['ID'])
        agent['Bradford Score']=rec?rec.bradfordFactor:''
        delete agent.ID
        return agent
      })
      writeData(agentData).then(wb=>{
        wb.writeToBuffer().then(function(wbBuffer) {
          db.multiple=true
          db.query(shiftTimesQ,(err,stR)=>{
            if (err) {
              console.log(err)
            }
            let dtJobs=_.uniqBy(stR.recordsets[1],'jobName').filter(el=>el.jobName)
            let table="<table><th style='width:150px;'></th>"
            for (var wd = 1; wd < 8; wd++) {
              table=table+"<th style='width:50px;border:1px solid black'>"+moment().isoWeekday(wd).format("ddd")+"</th>"
            }
            let shiftTimes=stR.recordsets[0].map(el=>el.shiftTime).filter((el,i,self)=>self.indexOf(el)==i)
            table=table+shiftTimes.map(st=>{
              let row="<tr><td>"+st+"</td>"
              for (var wd = 1; wd < 8; wd++) {
                let sRow=stR.recordsets[0].find(el=>el.shiftTime==st && el.wkdy==wd && !el.jobName)
                row=row+"<td style='text-align:center;'>"+(sRow?sRow.shifts:0)+"</td>"
              }
              row=row+"</tr>"
              return row
            }).join("")+"<tfoot><tr><th>Total B2B shifts</th>"
            for (var wd = 1; wd < 8; wd++) {
              let sRow=stR.recordsets[1].find(el=>el.isEve!=1 && el.wkdy==wd && !el.jobName)
              table=table+"<th style='border:1px solid black;'>"+(sRow?sRow.shifts:0)+"</th>"
            }
            table=table+"</tr><tr><th>Total Cons shifts</th>"
            for (var wd = 1; wd < 8; wd++) {
              let sRow=stR.recordsets[1].find(el=>el.isEve==1 && el.wkdy==wd && !el.jobName)
              table=table+"<th style='border:1px solid black;'>"+(sRow?sRow.shifts:0)+"</th>"
            }
            for (var i = 0; i < dtJobs.length; i++) {
              let jobName=dtJobs[i].jobName
              table=table+"</tr><tr><th>Total "+_.truncate(jobName,20)+" shifts</th>"
              for (var wd = 1; wd < 8; wd++) {
                let sRow=stR.recordsets[1].find(el=>el.jobName==jobName && el.wkdy==wd)
                table=table+"<th style='border:1px solid black;'>"+(sRow?sRow.shifts:0)+"</th>"
              }
            }
            table=table+"</tr></tfoot></table>"
            let table2="<table><th style='width:150px;'></th>"
            for (var wd = 1; wd < 8; wd++) {
              table2=table2+"<th style='width:50px;border:1px solid black'>"+moment().isoWeekday(wd).format("ddd")+"</th>"
            }
            table2=table2+shiftTimes.map(st=>{
              let row="<tr><td>"+st+"</td>"
              for (var wd = 1; wd < 8; wd++) {
                let sRow=stR.recordsets[0].find(el=>el.shiftTime==st && el.wkdy==wd && !el.jobName)
                row=row+"<td style='text-align:center;'>"+(sRow?sRow.hrs:0)+"</td>"
              }
              row=row+"</tr>"
              return row
            }).join("")+"<tfoot><tr><th>Total B2B hours</th>"
            for (var wd = 1; wd < 8; wd++) {
              let sRow=stR.recordsets[1].find(el=>el.isEve!=1 && el.wkdy==wd && !el.jobName)
              table2=table2+"<th style='border:1px solid black;'>"+(sRow?sRow.hrs:0)+"</th>"
            }
            table2=table2+"</tr><tr><th>Total Cons hours</th>"
            for (var wd = 1; wd < 8; wd++) {
              let sRow=stR.recordsets[1].find(el=>el.isEve==1 && el.wkdy==wd && !el.jobName)
              table2=table2+"<th style='border:1px solid black;'>"+(sRow?sRow.hrs:0)+"</th>"
            }
            for (var i = 0; i < dtJobs.length; i++) {
              let jobName=dtJobs[i].jobName
              table2=table2+"</tr><tr><th>Total "+_.truncate(jobName,20)+" hours</th>"
              for (var wd = 1; wd < 8; wd++) {
                let sRow=stR.recordsets[1].find(el=>el.jobName==jobName && el.wkdy==wd)
                table2=table2+"<th style='border:1px solid black;'>"+(sRow?sRow.hrs:0)+"</th>"
              }
            }
            table2=table2+"</tr></tfoot></table>"
            db.query('select * from staff where staffJobTitleID=8 and staffLeft is null',(err,em)=>{
              let mailTo=['tokulus@teamsearchmr.co.uk','matt@teamsearchmr.co.uk']
              mailTo=mailTo.concat(em.recordset.map(el=>el.staffEmail))
              let mailOptions = {
                to: mailTo,
                // to: ['matt@teamsearchmr.co.uk'],
                subject: "Staff booking report for w/c "+bookingWeek.format("DD/MM/YYYY"),
                html: '<p>' + header + '<p>'+table+'</p><br><p>'+table2+'</p>' + footer + '</p>',
                attachments: [
                  {
                    filename: 'Booking Report WC '+bookingWeek.format("DD-MM-YYYY")+'.xlsx',
                    content: wbBuffer
                  },
                ]
              }
              transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                  console.log(error);
                }else {
                  console.log("sent")
                }
              });
            })
          })
          // let table='<table>'+Object.keys(r.recordset[0]).map(el=>"<th style='border:1px solid black;text-align:left;padding:4px;'>"+el+"</th>").join("")
          // +r.recordset.map(row=>"<tr>"+Object.keys(row).map(el=>"<td>"+row[el]+"</td>").join("")+"</tr>").join("")
          // +"</table>"
        })
      })
    })
  })
}
function sendHoursReview(tl){
  let q=`
  set datefirst 1
  declare @hrst date=(select dbo.soPayMonth(dateadd(month,-1,GETDATE()))),@hren date=(select dbo.eoPayMonth(dateadd(month,-1,GETDATE())))
  select
  isnull(payrollHours,0) hrs,
  hoursType,
  isnull(payrollHours,0)*payrate Pay,
  p.agentID,
  inputDate,
  band,cont,fatalCount,case when absenceType is null then null else 1 end absenceCount,absenceType,isnull(sales,0) sales,
  payrate,p.contractStart,contractName,
  agentName,staffName,staffEmail,a.teamID,teamName,a.breatheID
  from
  getPayrollHours(@hrst,@hren) p
  left join Agents a on a.agentID=p.agentID
  left join AgentTeams t on t.agentTeamID=a.teamID
  left join Staff s on s.staffID=t.managerID
  where (payrollHours>0 or absenceType is not null)
  order by agentName,inputDate`
  const xl = require('excel4node');
  db.query(q,(err,r)=>{
    if (err) {
      console.log(err)
    }
    function writeData(data){
      const wb = new xl.Workbook();
      const ws = wb.addWorksheet('Interviewer hours');
      return new Promise((resolve) => {
        let i=0
        Object.keys(data[0]).forEach((heading,h) => {
          ws.cell(1,h+1).string(heading)
        });
        function writeRows(){
          if (i<data.length) {
            let record=data[i]
            Object.keys(record).forEach((columnName,c) =>{
              if (["Paid hours"].includes(columnName)) {
                ws.cell(i+2,c+1).number(record[columnName])
              }else if (["Date"].includes(columnName)) {
                ws.cell(i+2,c+1).date(record[columnName])
              }else {
                ws.cell(i+2,c+1).string(record[columnName])
              }
            });
            i++
            writeRows()
          }else {
            resolve(wb)
          }
        }
        writeRows()
      });
    }
    let fileData=[]
    let errorTries=0
    if(tl){
      let teams=_.uniqBy(r.recordset,'teamID').filter(el=>el.teamID).map(el=>({teamID:el.teamID,teamName:el.teamName,tlName:el.staffName,tlEmail:el.staffEmail}))
      let t=0
      function loopTeams(){
        if (t<teams.length) {
          let team=teams[t]
          let fileData=r.recordset.filter(el=>el.teamID==team.teamID).map(el=>({'Interviewer':el.agentName,'Date':el.inputDate,'Absence':(el.absenceType || ''),'Paid hours':el.hrs,'Type':el.hoursType}))
          writeData(fileData).then(wb=>{
            wb.writeToBuffer().then(function(wbBuffer) {
              let mailTo=['matt@teamsearchmr.co.uk']
              mailTo.push(team.tlEmail)
              // mailTo.push('rachel@teamsearchmr.co.uk')
              let mailOptions = {
                from:'reports@teamsearchmr.co.uk',
                to: mailTo,
                // to: ['matt@teamsearchmr.co.uk'],
                subject: "Payroll hours for "+team.teamName+" - "+moment().format("MMM YY"),
                priority:'high',
                html: '<p>' + header + '</p><p>Hi '+team.tlName.split(" ")[0]+',</p><p>Please find attached the hours for your team. Please review and make any changes to the tally sheet. The final hours will be re-taken from the tally sheet and sent to the interviewers to review individually on the <b>18th of this month</b>.</p>' + footer + '</p>',
                attachments: [
                  {
                    filename: "Payroll hours for "+team.teamName+" - "+moment().format("MMM YY")+'.xlsx',
                    content: wbBuffer
                  },
                ]
              }
              transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                  logger.info("Error emailing TL payroll hours checks","Attempt "+(errorTries+1),error);
                  if (errorTries==0) {
                    errorTries++
                    setTimeout(loopTeams,30000)
                  }else {
                    errorTries=0
                    t++
                    loopTeams()
                  }
                }else {
                  console.log("sent")
                  t++
                  loopTeams()
                }
              });
            })
          })
        }else {
          console.log("All payroll hours sent to TLs for review")
        }
      }
      loopTeams()
    }else {
      getBreatheEmployees(true).then(emps=>{
        let agents=_.uniqBy(r.recordset.slice(52),'agentID').filter(el=>el.breatheID && el.agentID).map(el=>({...el,...emps.find(emp=>emp.id==el.breatheID)})).map(el=>({agentID:el.agentID,agentName:el.agentName,email:el.email}))
        let t=0
        //delete to go live
        // agents=_.shuffle(agents).slice(1,10)
        // end
        let errorTries=0
        function loopAgents(){
          if (t<agents.length) {
            let agent=agents[t]
            let tableData=r.recordset.filter(el=>el.agentID==agent.agentID)
            let table="<table><th>Date</th><th>Absence</th><th>Hours</th><th>Hours type</th>"
            table=table+tableData.map(el=>"<tr><td>"+moment(el.inputDate).format("DD/MM/YYYY")+"</td><td>"+(el.absenceType || '')+"</td><td>"+el.hrs+"</td><td>"+el.hoursType+"</td></tr>").join("")
            table=table+"<td><b>Total</b></td><td></td><td><b>"+(Math.round(tableData.reduce((a,b)=>a+b.hrs,0)*100)/100)+"</b></td><td></td></table>"
            transporter.sendMail({
              from:'reports@teamsearchmr.co.uk',
              // to:'matt@teamsearchmr.co.uk',
              to:[agent.staffEmail,agent.email],
              priority:'high',
              subject:'Hours you worked during the '+moment().format("MMM YYYY")+' pay period',
              html: '<p>' + header + '</p><p>Hi '+agent.agentName+',</p><p>Please see below your recorded hours between 14th '+moment().subtract(1,'month').format("MMMM")+' and 13th '+moment().format("MMMM YYYY")+'. Please review and contact your Team Leader with any queries <u>before the 21st of this month</u>.</p><p>'+table+'</p><p>' + footer + '</p>',
            }, (error, info) => {
              if (error) {
                logger.info("Error emailing agent payroll hours checks","Attempt "+(errorTries+1),error);
                if (errorTries==0) {
                  errorTries++
                  setTimeout(loopAgents,30000)
                }else {
                  errorTries=0
                  t++
                  loopAgents()
                }
              }else {
                errorTries=0
                console.log("sent")
                t++
                loopAgents()
              }
            });
          }else {
            console.log("All payroll hours sent to Agents for review")
          }
        }
        // console.log(agents)
        loopAgents()
      })
    }
  })
}
function syncRCdialsNew(dte){
  let startOfDay=moment(dte).startOf('day')
  let dateFrom=moment(startOfDay)
  let dateTo=moment(dte).endOf('day')
  let tParams={
    grouping:{
      groupBy:"Users"
    },
    timeSettings:{
      timeZone:'Europe/London',
      timeRange:{
        timeFrom:dateFrom.toISOString(),
        timeTo:dateTo.toISOString()
      }
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
  let totalPages
  let logs=[]
  let p=1
  return new Promise(res=>{
    asyncDo(resp=>{
      totalPages=resp.paging.totalPages
      logs=logs.concat(resp.data.records)
      p++
    },()=>p<=totalPages,()=>{
      return rcPlatform.post("/analytics/calls/v1/accounts/~/timeline/fetch?interval=Hour&page="+p+"&perPage=10",tParams).then(function(resp){
        return resp.json()
      })
    },()=>{
      db.query("select * from agents where ringCentralID is not null and isnull(agentLeft,getdate())>='"+dateFrom.format("YYYY-MM-DD")+"'",(err,agentR)=>{
        let a=0
        function loopAgents(){
          let agent=agentR.recordset[a]
          if (agent) {
            let delQ=`
            delete from Dials where agentID=`+agent.agentID+` and dialDate='`+dateFrom.format("YYYY-MM-DD")+`';
            delete from DialsHourly where agentID=`+agent.agentID+` and dialDate='`+dateFrom.format("YYYY-MM-DD")+`'
            `
            var extLog=logs.find(el=>el.key==agent.ringCentralID)
            if (extLog) {
              db.query(delQ,(err,delR)=>{
                extLog.points=extLog.points.filter(p=>p.counters.allCalls.values>0)
                let calls=extLog.points.reduce((a,b)=>a+Number(b.counters.allCalls.values),0)
                let talkTime=extLog.points.reduce((a,b)=>a+Number(b.timers.allCalls.values),0)
                if (calls) {
                  let h=0
                  function addHourly(){
                    let hr=extLog.points[h]
                    if (hr) {
                      let hourlyQ="insert into DialsHourly (extensionName,dialCount,talkMins,agentID,dialDate,dialHour,phoneSystem) VALUES ('"+agent.ringCentralID+"',"+hr.counters.allCalls.values+","+Math.round(hr.timers.allCalls.values/60)+","+agent.agentID+",'"+dateFrom.format("YYYY-MM-DD")+"',"+moment(hr.time).hour()+",'Ring Central')"
                      console.log(hourlyQ)
                      db.query(hourlyQ,(err,hourlyR)=>{
                        if (err) {
                          logger.info('err in syncRCdials hourly',err,hourlyQ)
                          console.log('err in syncRCdials hourly',err,hourlyQ)
                        }
                        h++
                        addHourly()
                      })
                    }else {
                      a++
                      loopAgents()
                    }
                  }
                  let dialQ="insert into Dials (extensionName,dialCount,talkMins,agentID,dialDate,phoneSystem) VALUES ('"+agent.ringCentralID+"',"+calls+","+Math.round(talkTime/60)+","+agent.agentID+",'"+dateFrom.format("YYYY-MM-DD")+"','Ring Central')"
                  console.log(dialQ)
                  db.query(dialQ,(err,dialR)=>{
                    if (err) {
                      logger.info('err in syncRCdials',err,dialQ)
                      console.log('err in syncRCdials',err,dialQ)
                    }
                    addHourly()
                  })
                }else {
                  a++
                  loopAgents()
                }
              })
            }else {
              a++
              loopAgents()
            }
          }else {
            console.log("done")
            res()
          }
        }
        loopAgents()
      })
    },(e,resume)=>{
      console.log(e)
      setTimeout(()=>{
        resume()
      },60000)
    })
  })
}
function syncRCdials(dte,hour){
  var dials=[]
  let startOfDay=moment(dte).startOf('day')
  let dateFrom=moment(startOfDay)
  let dateTo=moment(dte).endOf('day')
  if (hour!==null) {
    if (hour===0) {
      dateFrom=moment(startOfDay).set("hour", 16).set("minute",45)
      dateTo=moment(startOfDay).set("hour", 17)
    }else if (hour==1) {
      dateFrom=moment(startOfDay).set("hour", 20).set("minute",45)
      dateTo=moment(startOfDay).set("hour", 21)
    }else {
      dateFrom=moment(startOfDay).set("hour", hour)
      dateTo=moment(startOfDay).set("hour", hour+1)
    }
  }
  let today=moment(dte).format("YYYY-MM-DD")
  var logs=[]
  let p=0
  function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
  let totalTimer=(new Date()).getTime()
  return new Promise(dayRes=>{
    function getPages(){
      let params={dateTo:dateTo.toISOString(),dateFrom:dateFrom.toISOString(),perPage:5000,page:p+1}
      let timer=new Date()
      rcPlatform.get("/restapi/v1.0/account/~/call-log",params).then(function(logResp){
        console.log("Call log API responded in "+((new Date()).getTime()-timer.getTime())/1000+"s")
        logResp.json().then(function(log){
          logs=logs.concat(log.records.filter(el=>el.extension))
          if (log.navigation.nextPage) {
            p++
            sleep(1000).then(function(e){
              getPages()
            })
          }else {
            let updatedCount=0
            let delQ="delete from Dials where dialDate='"+today+"'"
            if (hour!==null) {
              delQ="delete from DialsHourly where dialDate='"+today+"' and dialHour="+hour
            }
            db.query(delQ,(err,delR)=>{
              db.query("select * from agents where ringCentralID is not null and isnull(agentLeft,getDate())>='"+today+"'",(err,agentR)=>{
                if (err) {
                  logger.info('err in syncRCdials',err)
                }else {
                  console.log(logs.length+" calls found.","Running dials for "+_.uniq(logs.map(el=>el.extension.id)).length+" agents")
                  promForEach(agentR.recordset,(agent,i,res)=>{
                    // agentR.recordset.forEach((agent, i) => {
                      var extLog=logs.filter(el=>el.extension.id==agent.ringCentralID)
                      if (extLog.length>0) {
                        let talkDur=moment.duration(extLog.reduce((a,b)=>a+Number(b.duration),0),'seconds')
                        let talkTime=Math.round(talkDur.as('minutes'))
                        let insertQ="insert into Dials (extensionName,dialCount,talkMins,agentID,dialDate,phoneSystem) VALUES ('"+agent.ringCentralID+"',"+extLog.length+","+talkTime+","+agent.agentID+",'"+today+"','Ring Central')"
                        let delQ="delete from Dials where dialDate='"+today+"'"
                        if (hour!==null) {
                          insertQ="insert into DialsHourly (extensionName,dialCount,talkMins,agentID,dialDate,dialHour,phoneSystem) VALUES ('"+agent.ringCentralID+"',"+extLog.length+","+talkTime+","+agent.agentID+",'"+today+"',"+hour+",'Ring Central')"
                          delQ="delete from DialsHourly where dialDate='"+today+"' and dialHour="+hour
                        }
                        if (hour===null) {
                          promFor(14,(h,hres)=>{
                            let hourLog=extLog.filter(el=>moment(el.startTime).hour()==(h+9))
                            if (h==12) {
                              hourLog=extLog.filter(el=>moment(el.startTime).hour()==16 && moment(el.startTime).minute()>=45)
                            }
                            if (h==13) {
                              hourLog=extLog.filter(el=>moment(el.startTime).hour()==20 && moment(el.startTime).minute()>=45)
                            }
                            let talkDur=moment.duration(hourLog.reduce((a,b)=>a+Number(b.duration),0),'seconds')
                            let talkTime=Math.round(talkDur.as('minutes'))
                            let sqlHr=h==12?0:(h==13?1:h+9)
                            let insertQH="insert into DialsHourly (extensionName,dialCount,talkMins,agentID,dialDate,dialHour,phoneSystem) VALUES ('"+agent.ringCentralID+"',"+hourLog.length+","+talkTime+","+agent.agentID+",'"+today+"',"+sqlHr+",'Ring Central')"
                            let delQH="delete from DialsHourly where extensionName='"+agent.ringCentralID+"' and dialDate='"+today+"' and dialHour="+sqlHr
                            db.query(delQH, (err, resp) =>{
                              if (hourLog.length) {
                                db.query(insertQH, (err, resp) =>{
                                  if (err) {
                                    logger.info('err in syncRCdials',err,insertQH)
                                  }else {
                                    console.log("updated hourly dials: "+sqlHr,insertQH)
                                  }
                                  hres()
                                })
                              }else {
                                hres()
                              }
                            })
                          }).then(e=>{
                            db.query(insertQ, (err, resp) =>{
                              if (err) {
                                logger.info('err in syncRCdials',err,insertQ)
                              }else {
                                console.log("updated dials",insertQ)
                                updatedCount++
                              }
                              res()
                            })
                          })
                        }else {
                          res()
                        }
                      }else {
                        res()
                      }
                    }).then(e=>{
                      if (hour!==null) {
                        console.log("Synced dials in "+((new Date()).getTime()-totalTimer)/1000+"s for hour "+hour+" on "+today,"Dials were updated for "+updatedCount+"/"+_.uniq(logs.map(el=>el.extension.id)).length+" agents")
                      }else {
                        console.log("Synced dials in "+((new Date()).getTime()-totalTimer)/1000+"s for "+today,"Dials were updated for "+updatedCount+"/"+_.uniq(logs.map(el=>el.extension.id)).length+" agents")
                      }
                      dayRes()
                    });
                  }
                })
              })
            }
          })
        }).catch(function(err){
          console.log("Error syncing RC dials",err,hour,dateFrom,dateTo)
          logger.info("Error syncing RC dials",err,hour,dateFrom,dateTo)
          setTimeout(()=>{
            getPages()
          },60000)
        })
      }
      getPages()
  })
}
function sendComplaintsReminders(){
  return new Promise((resolve,reject)=>{
    let complaintQ=`
    select outcomeDue as dueDate,'an investigation outcome' as whatsDue,* from complaints where outcomeDue<=getdate() and outcomeDate is null
    select responseDue as dueDate,'a response to the complainant' as whatsDue,* from complaints where responseDue<=getdate() and repliedDate is null
    select feedbackDue as dueDate,'feedback from the complainant' as whatsDue,* from complaints where feedbackDue<=getdate() and feedbackDate is null
    `
    let staffQ="select * from staff"
    db.multiple=true
    db.query(complaintQ,(err,complaintR)=>{
      if (err) {
        console.log(err)
      }
      db.query(staffQ,(err,staffR)=>{
        let x=0
        function cycleStages(){
          if (complaintR.recordsets.length<x) {
            let stage=complaintR.recordsets[x]
            if (stage.length) {
              let y=0
              function cycleComplaints(){
                let complaint=stage[y]
                if (complaint) {
                  let txt="This complaint is due <b>"+complaint.whatsDue+"</b> today. Click the link below to view the complaint in JA2<br><br><a href='http://job-analysis:8080/edit-complaint/"+complaint.complaintID+"'>http://job-analysis:8080/edit-complaint/"+complaint.complaintID+"</a>"
                  // let emailTo=[]
                  let emailTo=staffR.recordset.filter(el=>[complaint.ownerID,complaint.investigationBy,complaint.repliedBy].includes(el.staffID)).map(el=>el.staffEmail)
                  emailTo.push("matt@teamsearchmr.co.uk")
                  emailTo.push("tokulus@teamsearchmr.co.uk")
                  emailTo.push("pjaeger@teamsearchmr.co.uk")
                  let mailOptions = {
                    from: 'JA2 <reports@teamsearchmr.co.uk>',
                    to: emailTo,
                    subject: "Complaint ID "+complaint.complaintID+" is due to move to the next stage today",
                    html: '<p>' + header + txt + footer + '</p>'
                  };
                  transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                      console.log(error);
                      logger.info('Could not send complaints email: '+error);
                    }else {
                      console.log("complaints email sent")
                    }
                    y++
                    cycleComplaints()
                  });
                }else {
                  x++
                  cycleStages()
                }
              }
            }else {
              x++
              cycleStages()
            }
          }else {
            resolve()
          }
        }
        cycleStages()
      })
    })
  })
}
function tuesdayReport(weekOffset){
  let bookingWeek=moment().subtract(1, 'weeks').isoWeekday(1).startOf('d')
  if (weekOffset) {
    bookingWeek.add(weekOffset,'weeks')
  }
  let q=`
  SET DATEFIRST 1
  select agentID,bookingDate,ROUND(MAX(appliedHours),2) applied,ROUND(MAX(bookedHours),2) booked,ROUND(MAX(isnull(workedHours,0)),2) worked from getBookedHours(@trst,@tren) where appliedHours>0 group by agentID,bookingDate`
  let a=`
  select * from
  agents a
  left join agentTeams t on t.agentTeamID=a.teamID
  left join AgentContracts c on c.contractID=a.contractVersion
  where agentLeft is null order by AgentName`
  let absenceQ=`
  SET DATEFIRST 1
  select a.agentID,absenceType,count(*) as dayCount,sum(isnull(DATEDIFF(second,startTime,endTime),0))/3600.0 as hourCount from
  (select distinct agentID,absenceDate,absenceType from Absence) a
  left join (select distinct agentID,bookingDate,startTime,endTime from Booking) b on b.bookingDate=a.absenceDate and b.agentID=a.agentID
  where absenceDate between @trst and @tren
  group by absenceType,a.agentID`
  const xl = require('excel4node');
  db.input('trst',new Date(bookingWeek.format("YYYY-MM-DD")))
  db.input('tren',new Date(moment(bookingWeek).add(6,'d').format("YYYY-MM-DD")))
  let bstyle={border:{
    left:{style:'thin',color:'#000000'},
    right:{style:'thin',color:'#000000'},
    top:{style:'thin',color:'#000000'},
    bottom:{style:'thin',color:'#000000'},
  }}
  let flagStyle={font:{color:'#ff0000',bold:true}}
  let cstyle={alignment: {horizontal: 'center'}}
  let wk1={fill:{type:'pattern',patternType:'solid',fgColor:'#e8ffee'}}
  let wk1a={fill:{type:'pattern',patternType:'solid',fgColor:'#A7FFBE'}}
  let wk2={fill:{type:'pattern',patternType:'solid',fgColor:'#fff2e8'}}
  let headStyle={font:{bold:true}}
  function writeData(agents,shifts,absences){
    const wb = new xl.Workbook();
    const ws = wb.addWorksheet('Tuesday Report');
    return new Promise((resolve) => {
      ws.cell(1, 13, 1, 19, true).string("Booked").style({...bstyle,...cstyle,...headStyle})
      ws.cell(1, 20, 1, 26, true).string("Applied").style({...bstyle,...cstyle,...headStyle})
      ws.cell(1, 27, 1, 33, true).string("Completed").style({...bstyle,...cstyle,...headStyle})
      ws.cell(2,1).string('Agent').style({...bstyle,...headStyle})
      ws.cell(2,2).string('Contract').style({...bstyle,...headStyle})
      ws.cell(2,3).string('Total booked').style({...bstyle,...headStyle})
      ws.cell(2,4).string('Total applied').style({...bstyle,...headStyle})
      ws.cell(2,5).string('Total completed').style({...bstyle,...headStyle})
      ws.cell(2,6).string('Difference').style({...bstyle,...headStyle})
      ws.cell(2,7).string('Sick').style({...bstyle,...headStyle})
      ws.cell(2,8).string('No show').style({...bstyle,...headStyle})
      ws.cell(2,9).string('Agent canx').style({...bstyle,...headStyle})
      ws.cell(2,10).string('Mngr canx').style({...bstyle,...headStyle})
      ws.cell(2,11).string('Shift').style({...bstyle,...headStyle})
      ws.cell(2,12).string('Team').style({...bstyle,...headStyle})
      for (var c = 0; c < 7; c++) {
        ws.cell(2,13+c).string(moment(bookingWeek).add(c,'d').format("dd")).style({...bstyle,...cstyle,...wk1,...headStyle})
        ws.cell(2,20+c).string(moment(bookingWeek).add(c+7,'d').format("dd")).style({...bstyle,...cstyle,...wk1a,...headStyle})
        ws.cell(2,27+c).string(moment(bookingWeek).add(c+14,'d').format("dd")).style({...bstyle,...cstyle,...wk2,...headStyle})
      }
      let i=0
      let rcount=0
      let totals={booked:0,worked:0,applied:0}
      function writeRows(){
        if (i<agents.length) {
          let agent=agents[i]
          let data=shifts.filter(el=>el.agentID==agent.agentID)
          if (data.length>0) {
            ws.cell(3+rcount,1).string(agent.agentName).style(bstyle)
            ws.cell(3+rcount,2).string(agent.contractName).style(bstyle)
            let total=(type)=>data.reduce((a,b)=>a+Number(b[type]),0)
            let absence=(type,agentID)=>absences.find(el=>el.agentID==agent.agentID && el.absenceType==type)?absences.filter(el=>el.agentID==agent.agentID && el.absenceType==type).reduce((a,b)=>a+Number(b.hourCount),0):0
            totals.booked=totals.booked+total('booked')
            totals.applied=totals.applied+total('applied')
            totals.worked=totals.worked+total('worked')
            ws.cell(3+rcount,3).number(total('booked')).style(bstyle)
            ws.cell(3+rcount,4).number(total('applied')).style(bstyle)
            ws.cell(3+rcount,5).number(total('worked')).style(bstyle)
            ws.cell(3+rcount,6).number(total('booked')-total('worked')).style(bstyle)
            ws.cell(3+rcount,7).number(absence('Sick')).style(bstyle)
            ws.cell(3+rcount,8).number(absence('No show')).style(bstyle)
            ws.cell(3+rcount,9).number(absence('Cancelled by agent')).style(bstyle)
            ws.cell(3+rcount,10).number(absence('Cancelled by manager')).style(bstyle)
            ws.cell(3+rcount,11).string(agent.isEve?'Eve':'Day').style(bstyle)
            ws.cell(3+rcount,12).string(agent.teamName).style(bstyle)
            for (var d = 0; d < 7; d++) {
              let ddata=data.find(el=>moment.utc(el.bookingDate).isSame(moment.utc(bookingWeek).add(d,'d'),'day'))
              if (ddata) {
                ws.cell(3+rcount,13+d).number(ddata.booked).style({...bstyle,...cstyle,...wk1})
                ws.cell(3+rcount,20+d).number(ddata.applied).style({...bstyle,...cstyle,...wk1a})
                ws.cell(3+rcount,27+d).number(ddata.worked).style({...bstyle,...cstyle,...wk2})
                if (d==6 && total('applied')-total('worked')>2.5 && ddata.worked>0) {
                  ws.cell(3+rcount,27+d).style({...bstyle,...cstyle,...wk2,...flagStyle})
                  ws.cell(3+rcount,1).comment('Not eligible for Sunday bonus. Booked '+total('booked')+' hrs, worked '+total('worked')+' hrs.')
                }
              }else {
                ws.cell(3+rcount,13+d).string('').style({...bstyle,...wk1})
                ws.cell(3+rcount,20+d).string('').style({...bstyle,...wk1a})
                ws.cell(3+rcount,27+d).string('').style({...bstyle,...wk2})
              }
            }
            rcount++
          }
          i++
          writeRows()
        }else {
          ws.cell(3+rcount,2).string('Average').style(bstyle)
          ws.cell(3+rcount,3).number(totals.booked/rcount).style(bstyle)
          ws.cell(3+rcount,4).number(totals.applied/rcount).style(bstyle)
          ws.cell(3+rcount,5).number(totals.worked/rcount).style(bstyle)
          ws.row(2).filter({
            firstRow: 1,
            firstColumn: 1,
            lastRow: rcount-3,
            lastColumn: 34,
          });
          resolve(wb)
        }
      }
      writeRows()
    });
  }
  db.query(q,(err,r)=>{
    if (err) {
      console.log(err)
    }
    db.query(a,(err,ar)=>{
      if (err) {
        console.log(err)
      }
      db.query(absenceQ,(err,abr)=>{
        if (err) {
          console.log(err)
        }
        writeData(ar.recordset,r.recordset,abr.recordset).then(wb=>{
          wb.writeToBuffer().then(function(wbBuffer) {
            // let table='<table>'+Object.keys(r.recordset[0]).map(el=>"<th style='border:1px solid black;text-align:left;padding:4px;'>"+el+"</th>").join("")
            // +r.recordset.map(row=>"<tr>"+Object.keys(row).map(el=>"<td>"+row[el]+"</td>").join("")+"</tr>").join("")
            // +"</table>"
            let mailOptions = {
              to: ['rob@teamsearchmr.co.uk','tokulus@teamsearchmr.co.uk'],
              // to: ['matt@teamsearchmr.co.uk'],
              // to: ['matt@teamsearchmr.co.uk','tokulus@teamsearchmr.co.uk'],
              subject: "Interviewer Hours Report for last week (w/c "+bookingWeek.format("DD/MM/YYYY")+")",
              html: '<p>' + header + '<p>Report attached</p>' + footer + '</p>',
              attachments: [
                {
                  filename: 'Interviewer Hours Report for WC '+bookingWeek.format("DD-MM-YYYY")+'.xlsx',
                  content: wbBuffer
                },
              ]
            }
            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.log(error);
              }else {
                console.log("sent")
              }
            });
          })
        }).catch(e=>console.log(e))
      })
    })
  })
}
function sqlCleanup(){
  let noShiftQ=`
  delete b from booking b
  left join agents a on a.agentID=b.agentID
  left join AgentContracts c on c.contractID=a.contractVersion
  where bookingDate in (
    	select bookingDate from (
    		select bookingDate,sum(isnull(inputHours,0)) as hrs from booking b left join DailyInput d on d.agentID=b.agentID and d.inputDate=b.bookingDate
    		group by bookingDate
    		) b2
    	where hrs=0 and bookingDate<cast(getdate() as date)
    	)
  and (isnull(fixedHours,0)=0 or contractStart>bookingDate)`
  let leftQ=`
  delete from booking where bookingID in (select bookingID from
  Booking b
  left join agents a on b.agentID=a.agentID
  left join dailyInput d on d.inputBookingID=b.bookingID
  where a.agentLeft<b.bookingDate and d.inputID is null)`
  let dupQ=`
  delete from booking where bookingID in (
  	select bookingID from
  	(
      select min(case when inputID is null then bookingID else null end) as bookingID,b.agentID,bookingDate,count(*) as cnt from Booking b
      left join dailyInput d on d.inputBookingID=b.bookingID
      group by b.agentID,bookingDate
		) c
  	where cnt>1
  )`
  let dupRegQ=`
  delete from BookingRegular where brID in (
    	select brID from
    	(
    		select min(brID) as brID,agentID,weekday,count(*) as cnt from BookingRegular group by agentID,weekday
  		) c
    	where cnt>1
    )`
  let dupAbQ=`
  delete from Absence where absenceID in (
    select id from
  	(
    	select min(absenceID) as id,agentID,absenceDate,count(*) as cnt from Absence group by agentID,absenceDate
  	) c
    where cnt>1
  )`
  let dialHourlyQ=`
  delete from DialsHourly where dialID not in (
  	select max(dialID) id from DialsHourly group by agentID,dialDate,dialHour
  	)`
  let dialQ=`
  delete from Dials where dialID not in (
  	select max(dialID) id from Dials group by agentID,dialDate
  	)`
  let dupAuditsQ=`
  delete from projectTaskAudits where auditID not in (
  	select max(auditID) as auditID from projectTaskAudits group by plannerGroup,taskID,projectID
  )`
  logger.info("Running Booking db cleanup")
  return new Promise(res=>{
    db.query(leftQ,(err,l)=>{
      if (err) {
        console.log(err)
      }
      console.log('Ex-agent shifts deleted',l.rowsAffected[0])
      logger.info('Ex-agent shifts deleted',l.rowsAffected[0])
      db.query(dialQ,(err,l)=>{
        console.log('Duplicate dials deleted',l.rowsAffected[0])
        logger.info('Duplicate dials deleted',l.rowsAffected[0])
        db.query(dupAuditsQ,(err,l)=>{
          console.log('Duplicate audit tasks deleted',l.rowsAffected[0])
          logger.info('Duplicate audit tasks deleted',l.rowsAffected[0])
          db.query(dialHourlyQ,(err,l)=>{
            console.log('Duplicate hourly dials deleted',l.rowsAffected[0])
            logger.info('Duplicate hourly dials deleted',l.rowsAffected[0])
            function dedupe(){
              db.query(dupQ,(err,d)=>{
                if (err) {
                  console.log(err)
                }
                console.log('Duplicates deleted',d.rowsAffected[0])
                logger.info('Duplicates deleted',d.rowsAffected[0])
                if (d.rowsAffected[0]>1) {
                  dedupe()
                }else {
                  function dedupeAb(){
                    db.query(dupAbQ,(err,a)=>{
                      console.log('Absence duplicates deleted',a.rowsAffected[0])
                      logger.info('Absence duplicates deleted',a.rowsAffected[0])
                      if (a.rowsAffected[0]>1) {
                        dedupeAb()
                      }else {
                        function dedupeReg(){
                          db.query(dupRegQ,(err,dr)=>{
                            console.log('Regular hours duplicates deleted',dr.rowsAffected[0])
                            logger.info('Regular hours duplicates deleted',dr.rowsAffected[0])
                            if (dr.rowsAffected[0]>1) {
                              dedupeReg()
                            }else {
                              db.query(noShiftQ,(err,nsR)=>{
                                console.log('Bookings from cancelled days deleted')
                                logger.info('Bookings from cancelled days deleted')
                                db.query("select name from sys.tables where name like '%TEMPlookup%'",(err,tempTablesR)=>{
                                  let tcount=0
                                  promForEach(tempTablesR.recordset,(record,ri,rnext)=>{
                                    db.query("drop table "+record.name,(err,tempTablesR)=>{
                                      rnext()
                                      tcount++
                                    })
                                  }).then(e=>{
                                    console.log('Temp tables deleted',tcount)
                                    logger.info('Temp tables deleted',tcount)
                                    res()
                                  })
                                })

                              })
                            }
                          })
                        }
                        dedupeReg()
                      }
                    })
                  }
                  dedupeAb()
                }
              })
            }
            dedupe()
          })
        })
      })
    })
  })
}
function chaseOutcomes(){
  return new Promise((resolve,reject)=>{
    let q=`
    select * from
    projects p
    left join quotes q on q.quoteID=p.quoteID
    left join staff s on s.staffID=p.projectDP
    where isProjectClosed=1 and outcomesDone is null`
    db.query(q,(err,r)=>{
      let i=0
      function send(){
        if (i<r.recordset.length) {
          let project=r.recordset[i]
          if (project.staffName && project.staffEmail) {
            let html="<p>Hi "+project.staffName.split(" ")[0]+",</p><p>"+project.quoteNo+" "+project.quoteName+" has now been marked as complete by the CM. <p>If the project is on Forsta, please go <a href='http://job-analysis:8080/sample-outcomes-forsta/"+project.projectID+"'>here</a> to upload sample & data to JA2</p><p>If the project is on Askia, please use the old sample & data uploader <a href='http://job-analysis:8080/sample-outcomes/"+project.projectID+"'>here</a></p></p>Many thanks<br><br>"
            let mailOptions = {
              to: project.staffEmail,
              // to: ['matt@teamsearchmr.co.uk'],
              subject: "Please upload data for "+project.quoteNo+" "+project.quoteName,
              html: '<p>' + header + '<p>'+html+'</p>' + footer + '</p>',
            }
            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.log(error);
              }else {
                console.log("sent")
              }
              i++
              send()
            });
          }else {
            i++
            send()
          }
        }else {
          resolve()
        }
      }
      send()
    })
  })
}
function sendRemoteWorkerReport(){
  let st=moment.utc().isoWeekday(1).subtract(1,'weeks').startOf('d')
  let en=moment.utc(st).add(6,'d').endOf('d')
  let q=`
  declare @rwrst date='`+st.format("YYYY-MM-DD")+`',@rwren date='`+en.format("YYYY-MM-DD")+`'

  SELECT DailyInput.agentID, agentName, isDay, isEve, teamID, teamName, SUM(hrs) as hrs, sum(jobhrs) as jobhrs, isnull(SUM(pay),0) as pay, sum(sales) as sales,sum(pay)/nullif(sum(sales),0) cont, AVG(CAST(QCscore AS DECIMAL(10,2))) as QCscore INTO #teamReportTab
      FROM (
      	SELECT agentID,inputDate,sum(Hours) as hrs, SUM(CASE WHEN dd.dialDate is null or jobs.projectID<3 THEN NULL ELSE Hours END) as dialHrs, SUM(CASE WHEN jobs.projectID>2 THEN Hours ELSE NULL END) as jobhrs, sum(CASE WHEN clientID=130 AND isJobHourly=1 THEN 0 WHEN isJobHourly=1 THEN Hours ELSE Ints END*CPI) as sales,sum(CASE WHEN clientID=130 AND isJobHourly=1 THEN 0 ELSE Pay END) as pay
      	FROM ViewDailyPay
      	LEFT JOIN (SELECT jobID, isnull(CPI,0) as CPI FROM ViewJobsStats) as JobT ON JobT.jobID=ViewDailyPay.jobID
        LEFT JOIN Jobs ON Jobs.jobID=ViewDailyPay.jobID
        left join Projects p on p.projectID=Jobs.projectID
      	left join Quotes q on q.quoteID=p.quoteID
        left join (select distinct dialDate from Dials) dd on dd.dialDate=ViewDailyPay.inputDate
      	WHERE inputDate BETWEEN @rwrst AND @rwren AND Hours>0 AND agentID NOT IN (381,318)
      	GROUP BY inputDate, agentID
      	) as DailyInput
      LEFT JOIN (SELECT max(Dials.talkMins+Dials.dialCount) as dialCount, Dials.agentID, Dials.dialDate FROM Dials GROUP BY Dials.agentID, Dials.dialDate) as dialsT ON dialsT.agentID=DailyInput.agentID AND dialsT.dialDate=DailyInput.inputDate
      LEFT JOIN (SELECT distinct bookingDate, Booking.agentID, teamID, agentName,isRemote,agentJoined FROM Booking LEFT JOIN Agents on Agents.agentID=Booking.agentID WHERE bookingDate BETWEEN @rwrst AND @rwren) Booking on Booking.agentID=DailyInput.agentID AND Booking.bookingDate=DailyInput.inputDate
      left join AgentTeams on Booking.teamID=agentTeams.agentTeamID
      LEFT JOIN (SELECT AVG(score+controllerScore) as QCscore, sum(case when score+controllerScore<85 THEN 1 ELSE 0 END) as qcPoorCount, count(*) as qcCount, agentID, interviewDate FROM ViewQCscores WHERE isFinished=1 AND type='Call' GROUP BY agentID, interviewDate) as QCscores ON QCscores.agentID=DailyInput.agentID and QCscores.interviewDate=DailyInput.inputDate
      WHERE DailyInput.inputDate BETWEEN @rwrst AND @rwren and isRemote=1 and agentJoined>='2022-02-01'
      GROUP BY DailyInput.agentID, agentName, teamID, teamName, managerID, teamColour, isDay, isEve

  select * from #teamReportTab

  drop table #teamReportTab`
  db.query(q,(err,r)=>{
    if (err) {
      console.log(err)
    }
    let table="<table><tr><th>Name</th><th>Team</th><th>Shift</th><th>Hours</th><th>Cont.</th><th>QC score</th></tr>"+r.recordset.map(a=>"<tr><td>"+a.agentName+"</td><td>"+a.teamName+"</td><td>"+(a.isEve==1?'Eve':'Day')+"</td><td>"+a.hrs+"</td><td>"+(a.cont?Math.round(a.cont*100*100)/100:'-')+"%</td><td>"+(a.QCscore?a.QCscore:'-')+"</td></tr>").join("")+"</table>"
    let mailOptions = {
      from: 'reports@teamsearchmr.co.uk',
      to: ['tokulus@teamsearchmr.co.uk','matt@teamsearchmr.co.uk'],
      // to: ['matt@teamsearchmr.co.uk'],
      subject: "Remote workers report w/c "+st.format("DD/MM/YYYY"),
      html: '<p>' + header + '<p>'+table+'</p>' + footer + '</p>',
    }
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
      }else {
        console.log("sent")
      }
    });
  })
}
function sendSundayInts(){
  let q=`
  set datefirst 1
  select datepart(WEEKDAY,inputdate) dy,sum(isnull(inputInterviews,0)) ints from DailyInput where inputDate between dateadd(week,-1,GETDATE()) and GETDATE() group by datepart(WEEKDAY,inputdate)
  select datepart(WEEKDAY,inputdate) dy,sum(isnull(inputInterviews,0)) ints from OnlineDailyInput where inputDate between dateadd(week,-1,GETDATE()) and GETDATE() group by datepart(WEEKDAY,inputdate)
  select datepart(WEEKDAY,inputdate) dy,sum(isnull(inputInterviews,0)) ints from FaceDailyInput where inputDate between dateadd(week,-1,GETDATE()) and GETDATE() group by datepart(WEEKDAY,inputdate)`
  db.multiple=true
  db.query(q,(err,r)=>{
    let days=[]
    for (var i = 1; i < 8; i++) {
      days.push({
        n:i,
        name:moment().isoWeekday(i).format("ddd DD/MM")
      })
    }
    function getInts(set,n){
      let rec=r.recordsets[set].find(el=>el.dy==n)
      return rec?rec.ints:0
    }
    let html="<table><th></th><th>Total</th>"+days.map(d=>"<th>"+d.name+"</th>").join("")
      +"<tr><td>CATI</td><td><b>"+r.recordsets[0].reduce((a,b)=>a+Number(b.ints),0)+"</b></td>"+days.map(d=>"<td>"+getInts(0,d.n)+"</td>").join("")+"</tr>"
      +"<tr><td>Online</td><td><b>"+r.recordsets[1].reduce((a,b)=>a+Number(b.ints),0)+"</b></td>"+days.map(d=>"<td>"+getInts(1,d.n)+"</td>").join("")+"</tr>"
      +"<tr><td>F2F</td><td><b>"+r.recordsets[2].reduce((a,b)=>a+Number(b.ints),0)+"</b></td>"+days.map(d=>"<td>"+getInts(2,d.n)+"</td>").join("")+"</tr>"
      +"</table>"
    let mailOptions = {
      // to: ['matt@teamsearchmr.co.uk'],
      to: ['matt@teamsearchmr.co.uk','rob@teamsearchmr.co.uk'],
      subject: "This week's interviews (w/c "+moment().isoWeekday(1).format("DD/MM/YYYY")+")",
      html: '<p>' + header + '<p>'+html+'</p>' + footer + '</p>',
    }
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
      }else {
        console.log("sent")
      }
    });
  })
}
function initialNoShows(){
  let q=`
  delete from Absence where absenceID in (
  select absenceID from Absence a
  left join Booking b on b.agentID=a.agentID and a.absenceDate=b.bookingDate
  where AbsenceType='No show' and (bookingID is null or startTime='00:00:00') and absenceDate<cast(GETDATE() as date)
  )

  insert into Absence (agentID,absenceDate,absenceType)
  select b.agentID,bookingDate,'No show'
  from Booking b
  left join Absence a on a.absenceDate=b.bookingDate and a.agentID=b.agentID
  left join agents ag on b.agentID=ag.agentID
  left join agentTeams t on b.bookingTeamID=t.agentTeamID
  where bookingDate>cast(getdate() as date) and absenceDate is null and agentLeft is null and startTime<>'00:00:00'`
  return db.query(q)
}
function noShowAlerts(){
  let q=`
  select b.agentID,agentName,startTime,staffEmail tlEmail,teamName,ag.breatheID from
  Booking b
  left join absence a on a.absenceDate=b.bookingDate and a.agentID=b.agentID
  left join agents ag on b.agentID=ag.agentID
  left join AgentTeams t on b.bookingTeamID=t.agentTeamID
  left join staff s on s.staffID=t.managerID
  where
  bookingDate=CAST(getdate() as date)
  and absenceType='No show'
  and startTime between TIMEFROMPARTS(datepart(hour,getdate()),datepart(minute,getdate())-15,0,0,0) and TIMEFROMPARTS(datepart(hour,getdate()),datepart(minute,getdate()),0,0,0)`
  db.query(q,(err,r)=>{
    let i=0
    function sendEmail(){
      if (i<r.recordset.length) {
        let agent=r.recordset[i]
        if (breatheEmployees.find(el=>el.id==agent.breatheID)) {
          agent.email=breatheEmployees.find(el=>el.id==agent.breatheID).email
          agent.telnum=libphonenumber.parsePhoneNumber(breatheEmployees.find(el=>el.id==agent.breatheID).personal_mobile.toString(),'GB').number
        }else {
          agent.email="[unknown]"
          agent.telnum="[unknown]"
        }
        let html=""+agent.agentName+" was supposed to start their shift at "+moment.utc(agent.startTime).format("h:mma")+" but has not been marked as present. Their mobile number is <a href='tel:"+agent.telnum+"'>"+agent.telnum+"</a> and their email address is "+agent.email
        let mailOptions = {
          // to: ['matt@teamsearchmr.co.uk'],
          to: agent.tlEmail,
          subject: agent.agentName+" has not turned up",
          html: '<p>' + header + '<p>'+html+'</p>' + footer + '</p>',
          priority: 'high'
        }
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log(error);
          }
          i++
          sendEmail()
        });
      }else {
        console.log("Sent no-show alerts")
      }
    }
    sendEmail()
  })
}
function rejectBookings(){
  let bookingWeek=moment().add(2, 'weeks').isoWeekday(1)
  bookingReq.get('/exec?reqType=getInvalidBookings&bookingWeek='+moment(bookingWeek).format("YYYY-MM-DD")).then(e=>{
    db.query('select * from agents',(err,agentR)=>{
      getBreatheEmployees(true).then(emps=>{
        let b=0
        function sendEmail(){
          if (b<e.data.length) {
            let booking=e.data[b]
            let agent=agentR.recordset.find(a=>a.agentID==booking.agentID)
            agent.email=emps.find(e=>e.id==agent.breatheID).email
            let subject='Your booking request has been rejected'
            let mailOptions = {
              from:'Teamsearch <reports@teamsearchmr.co.uk>',
              to: agent.email,
              // to: 'matt@teamsearchmr.co.uk',
              subject: subject,
              html: '<p>' + header + '</p><p>Hi '+agent.agentName+'<br><br>Your hours requested for the week commencing '+moment(booking.bookingWeek).format("DD/MM/YYYY")+' have been rejected automatically because they were submitted too late. If you feel this was in error, please contact your Team Leader as soon as possible.<br><br>Many thanks,<br>Teamsearch</p><br><br>' + footer + '</p>',
            }
            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.log(error);
                logger.info("Failed to send shift rejection: ",mailOptions)
              }else {
                bookingReq.get('/exec?reqType=confirmBooking&agentID='+agent.agentID+'&bookingWeek='+booking.bookingWeek).then(function(e){
                  b++
                  sendEmail()
                }).catch(err=>console.log('confirming invalid bookings err',err))
              }
            });
          }
        }
        sendEmail()
      })
    })
  }).catch(err=>console.log('getting invalid bookings err',err))
}
function loopWorkingHours(){
  let agentq=`
  select distinct agentName,ringCentralID,case when absenceType is null then startTime else cast('00:00' as time) end as startTime,case when absenceType is null then endTime else cast('00:00' as time) end as endTime
  from
  Agents
  left join Booking on bookingDate=cast(getdate() as date) and Booking.agentID=Agents.agentID
  left join Absence on absenceDate=cast(getdate() as date) and Absence.agentID=Agents.agentID and absenceType<>'No show'
  where agentLeft is null and ringCentralID is not null`
  function getTime(val){
    return val?moment.utc(val).format("HH:mm"):'00:00'
  }
  db.query(agentq, (err, agentR) => {
    let i=0
    function sendTimes(){
      if (agentR.recordset[i]) {
        let agent=agentR.recordset[i]
        updateWorkingHours(agent.ringCentralID,getTime(agent.startTime),getTime(agent.endTime),getTime(agent.endTime)=='00:00').then(e=>{
          console.log(agent.agentName,"updated working hours")
          i++
          sendTimes()
          // setTimeout(function(){sendTimes()},1000)
        }).catch(err=>{
          console.log(err)
          logger.log("Error updating RingCentral working hours",agent,err)
          if (err.response.status=='404') {
            i++
          }
          setTimeout(function(){sendTimes()},60000)
        })
      }
    }
    sendTimes()
  })
}
global.getBradfordScores=function(stDate,enDate){
  return new Promise((resolve, reject) => {
    let st=stDate?moment(stDate):moment().subtract(365,'days')
    let en=enDate?moment(enDate):moment()
    let p=0
    let sickData=[]
    function getPages(){
      let params={params:{start_date:st.format("YYYY-MM-DD"),end_date:en.format("YYYY-MM-DD"),page:p+1,per_page:5000}}
      breathReq.get('/sicknesses/',params).then(resp=>{
        sickData=sickData.concat(resp.data.sicknesses)
        if (resp.data.sicknesses.length==0) {
          db.query('select agentID,breatheID from agents where breatheID is not null',(err,agentR)=>{
            let agentData=agentR.recordset.map(agent=>{
              agent.sicks=sickData.filter(el=>el.employee.id==agent.breatheID)
              agent.daysSick=agent.sicks.reduce((a,b)=>a+Number(b.deducted),0)
              agent.bradfordFactor=(agent.sicks.length*agent.sicks.length)*agent.daysSick
              return agent
            })
            console.log("Calculated Bradford Scores")
            resolve(agentData)
          })
        }else {
          p++
          getPages()
        }
      }).catch(err=>{
        console.log(p,"err",err,sickData.length)
        reject(err)
      })
    }
    getPages()
  })
}
function forstaLogin(){
  var soap = require('strong-soap').soap;
  var XMLHandler = soap.XMLHandler;
  var xmlHandler = new XMLHandler();
  function soapRequest(opts = {
    url: '',
    headers: {},
    xml: '',
    timeout: 10000,
    proxy: false,
  }) {
    const {
      url,
      headers,
      xml,
      timeout,
      proxy,
    } = opts;
    return new Promise((resolve, reject) => {
      axios({
        method: 'post',
        url,
        headers,
        data: xml,
        timeout,
        proxy,
      }).then((response) => {
        resolve({
          response: {
            headers: response.headers,
            body: response.data,
            statusCode: response.status,
          },
        });
      }).catch((error) => {
        if (error.response) {
          console.error(`SOAP FAIL: ${error}`);
          reject(error);
        } else {
          console.error(`SOAP FAIL: ${error}`);
          reject(error);
        }
      });
    });
  };
  const url = 'https://ws.euro.confirmit.com/confirmit/webservices/current/LogOn.asmx';

  const xml = `<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
      <LogOnUser xmlns="http://firmglobal.com/Confirmit/webservices/">
        <username>api_teamsearch</username>
        <password>`+process.env.FORSTA_SOAP_PASSWORD+`</password>
      </LogOnUser>
    </soap:Body>
  </soap:Envelope>`;
  const sampleHeaders = {
    'Host': 'ws.euro.confirmit.com',
    'Content-Length': xml.length,
    'Content-Type': 'text/xml; charset=utf-8',
    'SOAPAction': 'http://firmglobal.com/Confirmit/webservices/LogOnUser',
  };
  return new Promise((res,rej)=>{
    (async () => {
      try{
        const { response } = await soapRequest({ url: url, headers: sampleHeaders, xml: xml, timeout: 1000 }); // Optional timeout parameter(milliseconds)
        const { headers, body, statusCode } = response;
        var root = xmlHandler.xmlToJson(null, body, null);
        forstaCATIToken=root.Body.LogOnUserResponse.LogOnUserResult
        console.log("Forsta SOAP login successful")
        res(root.Body.LogOnUserResponse.LogOnUserResult)
      }catch(e){
        console.log(e)
        rej(e)
      }
    })();
  })
}
function reDoShifts(arr){
  let a=0
  function loopArr(){
    if (arr[a]) {
      const ical = require("ical-generator");
      const calendar = ical({name: 'Teamsearch shifts'});
      let shifts=[]
      let s=0
      let w=0
      const axios = require('axios');
      let req={body:arr[a]}
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
          let delQ="delete from Booking where agentID="+req.body.agentID+" and bookingDate in ("+shifts.map((el,i)=>"'"+el.date+"'").join(",")+")"
          bookingReq.get('/exec?reqType=confirmBooking&agentID='+req.body.agentID+'&bookingWeek='+req.body.bookingWeek).then(function(e){
            db.query(delQ,(err, agentR) => {
              let s=0
              function addShifts(){
                if (s<shifts.length) {
                  if (shifts[s].st) {
                    let addQ="insert into Booking (agentID,startTime,endTime,bookingDate,bookingTeamID) VALUES ("+req.body.agentID+",'"+shifts[s].st+"','"+shifts[s].en+"','"+shifts[s].date+"',"+req.body.teamID+")"
                    console.log(addQ)
                    db.query(addQ,(err, agentR) => {
                      if (err) {
                        console.log(err)
                        logger.info("failed to add a shift: ",req.body)
                        res.status(500).send(err)
                      }else {
                        logger.info("confirmed a shift: ",req.body)
                        let abQ=`
                        insert into Absence (agentID,absenceDate,absenceType)
                        select top 1 `+req.body.agentID+`,bookingDate,'No show'
                        from Booking b
                        left join Absence a on a.absenceDate=b.bookingDate and a.agentID=b.agentID
                        left join agents ag on b.agentID=ag.agentID
                        where bookingDate='`+shifts[s].date+`' and absenceDate is null and agentID=`+req.body.agentID+` and startTime<>'00:00:00'`
                        console.log(abQ)
                        db.query(abQ,(err,abR)=>{
                          logger.info(" Added booked hours",addQ)
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
                  let subject='Your Hours For '+(req.body.weeks>1?'The Next '+req.body.weeks+' Weeks':'Next Week')+' - From Monday '+moment(req.body.bookingWeek).format("DD/MM/YYYY")
                  let mailOptions = {
                    from:'Teamsearch <reports@teamsearchmr.co.uk>',
                    to: req.body.agentEmail,
                    // to: 'matt@teamsearchmr.co.uk',
                    subject: subject,
                    html: '<p>' + header + '<p>Hi '+req.body.agentName+'<br><br>Please see below your confirmed hours for '+(req.body.weeks>1?'the next '+req.body.weeks+' weeks':'next week')+':<br><br>'+req.body.table+'<br><br>Many thanks,<br>Teamsearch</p><br><br>' + footer + '</p>',
                    icalEvent: {
                      filename: 'Teamsearch shifts.ics',
                      method: 'publish',
                      content: calendar.toString()
                    }
                  }
                  transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                      console.log(error);
                      logger.info("Failed to send shift confirmation: ",mailOptions)
                    }else {
                      a++
                      loopArr()
                    }
                  });
                }
              }
              addShifts()
            })
          }).catch(function(err){
            console.log("confirmBookingRequests err",err)
            res.status(500).send(err)
          })
        }
      }
      parseShifts()
    }else {
      console.log("done")
    }
  }
  loopArr()
}
function contChangeCheck(){
  let checkQ=`
  declare @cen date=dateAdd(day,-(day(getdate())),cast(getdate() as date))
  declare @cst date=dateAdd(day,-(day(@cen)-1),@cen)
  select @cst,@cen,bookingTeamID,isnull(nullif(sum(Pay),0)/nullif(sum(sales),0),9.99) as cont,sum(Hours) hrs,sum(Ints) ints,sum(pay) pay,sum(sales) sales from
  getAgentShifts(@cst,@cen)
  WHERE bookingTeamID IS NOT NULL
  group by bookingTeamID
  order by bookingTeamID

  select *,Pay/isnull(nullif(sales,0),9.99) cont from getAgentShifts(@cst,@cen)
  WHERE bookingTeamID IS NOT NULL`
  db.multiple=true
  let decimal=(val)=>Math.round(val*Math.pow(10,4))/Math.pow(10,4)
  db.batch(checkQ,(err,checkR)=>{
    if (err) {
      console.log(err)
    }else {
      // console.log(moment().format('HH:mm:ss'),"checking teamShifts")
      if(!contCheckData.teamshifts){
        // console.log("none set, setting now",checkR.recordsets[0])
        contCheckData={
          teamshifts:checkR.recordsets[0],
          shifts:checkR.recordsets[1]
        }
        contChangeCheck()
      }else {
        // console.log("found teamShifts")
        let diffs=contCheckData.teamshifts.filter(t=>{
          let checkShift=checkR.recordsets[0].find(el=>el.bookingTeamID==t.bookingTeamID)
          return checkShift && decimal(checkShift.cont)!=decimal(t.cont)
        })
        const ps = new sql.PreparedStatement()
        ps.input('teamID', sql.Int)
        ps.input('oldCont', sql.Decimal(10,4))
        ps.input('newCont', sql.Decimal(10,4))
        ps.input('shiftChanges', sql.VarChar(sql.MAX))
        ps.prepare(`insert into ContributionTracker (teamID,changeDate,oldCont,newCont,shiftChanges) VALUES (@teamID,getdate(),@oldCont,@newCont,@shiftChanges)`, err => {
          if (err) {
            console.log(err)
          }else {
            let i=0
            function addQueries(){
              if (diffs[i]) {
                let t=diffs[i]
                let d=checkR.recordsets[0].find(el=>el.bookingTeamID==t.bookingTeamID)
                let s=checkR.recordsets[1].filter(el=>el.bookingTeamID==t.bookingTeamID)
                let sOld=contCheckData.shifts.filter(el=>el.bookingTeamID==t.bookingTeamID)
                let changes=sOld.map(shift=>({old:shift,new:s.find(el=>el.agentID==shift.agentID && el.jobID==shift.jobID && new Date(el.inputDate).getTime()==new Date(shift.inputDate).getTime())})).filter(el=>(el.new?el.new.cont:null)!=el.old.cont)
                let changesFormatted=changes.map(change=>{
                  let obj={agentID:change.old.agentID,inputDate:change.old.inputDate,jobID:change.old.jobID}
                  let changes=[]
                  let checkChange=(field)=>{
                    if (change.new[field]!=change.old[field]) {
                      let c={}
                      c[field]={old:change.old[field],new:change.new[field]}
                      changes.push(c)
                    }
                  }
                  if (change.new) {
                    checkChange('payrate')
                    checkChange('cpi')
                    checkChange('Ints')
                    checkChange('Hours')
                  }else {
                    changes.push({shiftRemoved:true})
                  }
                  obj.changes=changes
                  return obj
                })
                try{
        					let cpiChanges=changesFormatted.filter(el=>el.changes.find(c=>c.cpi)).map(el=>({jobID:el.jobID,cpi:{old:el.changes.find(c=>c.cpi).cpi.old,new:el.changes[0].cpi.new}})).filter((el,i,self)=>self.findIndex((t)=>t.jobID==el.jobID)==i)
        					let payChanges=changesFormatted.filter(el=>el.changes.find(c=>c.payrate)).map(el=>({agentID:el.agentID,payRate:{old:el.changes.find(c=>c.payrate).payrate.old,new:el.changes[0].payrate.new}})).filter((el,i,self)=>self.findIndex((t)=>t.agentID==el.agentID)==i)
        					let hoursChanges=changesFormatted.filter(el=>el.changes.find(c=>c.Hours)).map(el=>({agentID:el.agentID,jobID:el.jobID,inputDate:el.inputDate,Hours:{old:el.changes.find(c=>c.Hours).Hours.old,new:el.changes[0].Hours.new}})).filter((el,i,self)=>self.findIndex((t)=>t.agentID==el.agentID && t.jobID==el.jobID && new Date(t.inputDate).getTime()==new Date(el.inputDate).getTime())==i)
        					let intsChanges=changesFormatted.filter(el=>el.changes.find(c=>c.Ints)).map(el=>({agentID:el.agentID,jobID:el.jobID,inputDate:el.inputDate,Ints:{old:el.changes.find(c=>c.Ints).Ints.old,new:el.changes[0].Ints.new}})).filter((el,i,self)=>self.findIndex((t)=>t.agentID==el.agentID && t.jobID==el.jobID && new Date(t.inputDate).getTime()==new Date(el.inputDate).getTime())==i)
        					let hoursRemoved=sOld.filter(shift=>!s.find(el=>el.agentID==shift.agentID && el.jobID==shift.jobID && new Date(el.inputDate).getTime()==new Date(shift.inputDate).getTime())).map(el=>({agentID:el.agentID,jobID:el.jobID,inputDate:el.inputDate,Hours:{old:el.Hours,new:0}})).filter((el,i,self)=>self.findIndex((t)=>t.agentID==el.agentID && t.jobID==el.jobID && new Date(t.inputDate).getTime()==new Date(el.inputDate).getTime())==i)
        					let hoursAdded=s.filter(shift=>!sOld.find(el=>el.agentID==shift.agentID && el.jobID==shift.jobID && new Date(el.inputDate).getTime()==new Date(shift.inputDate).getTime())).map(el=>({agentID:el.agentID,jobID:el.jobID,inputDate:el.inputDate,Hours:{old:0,new:el.Hours}})).filter((el,i,self)=>self.findIndex((t)=>t.agentID==el.agentID && t.jobID==el.jobID && new Date(t.inputDate).getTime()==new Date(el.inputDate).getTime())==i)
        					let intsRemoved=sOld.filter(shift=>!s.find(el=>el.agentID==shift.agentID && el.jobID==shift.jobID && new Date(el.inputDate).getTime()==new Date(shift.inputDate).getTime())).map(el=>({agentID:el.agentID,jobID:el.jobID,inputDate:el.inputDate,Ints:{old:el.Ints,new:0}})).filter((el,i,self)=>self.findIndex((t)=>t.agentID==el.agentID && t.jobID==el.jobID && new Date(t.inputDate).getTime()==new Date(el.inputDate).getTime())==i)
        					let intsAdded=s.filter(shift=>!sOld.find(el=>el.agentID==shift.agentID && el.jobID==shift.jobID && new Date(el.inputDate).getTime()==new Date(shift.inputDate).getTime())).map(el=>({agentID:el.agentID,jobID:el.jobID,inputDate:el.inputDate,Ints:{old:0,new:el.Ints}})).filter((el,i,self)=>self.findIndex((t)=>t.agentID==el.agentID && t.jobID==el.jobID && new Date(t.inputDate).getTime()==new Date(el.inputDate).getTime())==i)
        					let changesGrouped={
        					  cpi:cpiChanges,
        					  payRate:payChanges,
        					  hours:hoursChanges.concat(hoursRemoved,hoursAdded),
        					  ints:intsChanges.concat(intsRemoved,intsAdded),
        					}
        					if (changesGrouped.cpi.length+changesGrouped.payRate.length+changesGrouped.hours.length+changesGrouped.ints.length == 0) {
        					  console.log("Contribution changes not caught",JSON.stringify(changes))
        					}
        					let insParams={teamID:t.bookingTeamID,oldCont:t.cont,newCont:d.cont,shiftChanges:JSON.stringify(changesGrouped)}
        					ps.execute(insParams,(err,r)=>{
        					  if (err) {
        						console.log(err)
        					  }
        					  i++
        					  addQueries()
        					})
        				}catch(err){
        					console.log("error saving cont changes",err,JSON.stringify(changesFormatted),JSON.stringify(changesFormatted.filter(el=>el.changes.find(c=>c.Hours))))
        				}
              }else {
                contCheckData={
                  teamshifts:checkR.recordsets[0],
                  shifts:checkR.recordsets[1]
                }
                ps.unprepare()
                if (i>0) {
                  console.log(moment().format(),"Logged contribution change. "+i+" teams affected.")
                }
              }
            }
            addQueries()
          }
        })
      }
    }
  })
}

function attendanceEmails(){
  let agentsQ=`
  select * from
  ViewAttendance a
  left join agentTeams t on t.agentTeamID=a.agentTeamID
  left join Staff s on s.staffID=t.managerID`
  let actionQ=`
  select * from AbsenceActionTypes where scoreTrigger is not null order by scoreTrigger desc`
  return new Promise((resolve,reject)=>{
    db.query(agentsQ,(err,agentsR)=>{
      db.multiple=true
      db.query(actionQ,(err,actionR)=>{
        let staffEmails=agentsR.recordset.map(el=>el.staffEmail).filter((el,i,self)=>self.indexOf(el)==i).filter(el=>el)
        let i=0
        getBradfordScores().then(brScores=>{
          function sendBradfordEmails(){
            if (staffEmails[i]) {
              let agents=agentsR.recordset.filter(el=>el.staffEmail==staffEmails[i]).map(agent=>{
                let rec=brScores.find(el=>el.agentID==agent.agentID)
                agent.bradfordFactor=rec?rec.bradfordFactor:''
                let act=actionR.recordsets[0].find(b=>agent.bradfordFactor>=b.scoreTrigger)
                agent.bradfordAction=act?act.actionName:''
                agent.bradfordActionID=act?act.actionTypeID:0
                delete agent.ID
                return agent
              })
              agents=agents.filter(el=>el.bradfordActionID > el.sickActScore).sort((a,b)=>b.bradfordFactor-a.bradfordFactor)
              if (agents.length>0) {
                let body=`Action is required regarding the following agents' Bradford Factor scores. Visit the <a href="http://job-analysis:8080/attendance-hub/0/`+agents[0].agentTeamID[0]+`">attendance hub</a> in JA2 to action:<br><br><table><th>Name</th><th>Score</th><th>Suggestion</th><tr>`+agents.map(el=>'<td>'+el.agentName+"</td><td>"+el.bradfordFactor+"</td><td>"+el.bradfordAction+"</td>").join("</tr><tr>")+"</tr></table>"
                let subject='Absences to action for '+agents[0].teamName[0]
                let mailOptions = {
                  from:'Teamsearch <reports@teamsearchmr.co.uk>',
                  to: staffEmails[i],
                  // to: 'matt@teamsearchmr.co.uk',
                  subject: subject,
                  html: '<p>' + header + '</p><p>' + body + '</p>' + footer + '</p>',
                }
                transporter.sendMail(mailOptions, (error, info) => {
                  if (error) {
                    console.log(error);
                    logger.info("Failed to send absences alert: ",mailOptions)
                    i++
                    sendBradfordEmails()
                  }else {
                    i++
                    sendBradfordEmails()
                  }
                });
              }else {
                i++
                sendBradfordEmails()
              }
            }else {
              i=0
              sendLatenessEmails()
            }
          }
          function sendLatenessEmails(){
            if (staffEmails[i]) {
              agents=agentsR.recordset.filter(el=>el.staffEmail==staffEmails[i]).filter(el=>el.latesSince>0 || (el.latesSince===null && el.lateCount>2)).sort((a,b)=>b.lateCount-a.lateCount).map(el=>({...el,lastAction:actionR.recordsets[0].find(b=>b.actionTypeID==el.lateLastActionID)}))
              if (agents.length>0) {
                let body=`Action is required regarding the following agents' latenesses. Visit the <a href="http://job-analysis:8080/attendance-hub/0/`+agents[0].agentTeamID[0]+`">attendance hub</a> in JA2 to action:<br><br><table><th>Name</th><th>Active warning</th><th>Lates (since last warning)</th><tr>`+agents.map(el=>'<td>'+el.agentName+"</td><td>"+(el.lastAction?el.lastAction.actionName:'')+"</td><td>"+(el.latesSince?el.latesSince:el.lateCount)+"</td>").join("</tr><tr>")+"</tr></table>"
                let subject='Lateness to action for '+agents[0].teamName[0]
                let mailOptions = {
                  from:'Teamsearch <reports@teamsearchmr.co.uk>',
                  to: staffEmails[i],
                  // to: 'matt@teamsearchmr.co.uk',
                  subject: subject,
                  html: '<p>' + header + '</p><p>' + body + '</p>' + footer + '</p>',
                }
                transporter.sendMail(mailOptions, (error, info) => {
                  if (error) {
                    console.log(error);
                    logger.info("Failed to send absences alert: ",mailOptions)
                    i++
                    sendLatenessEmails()
                  }else {
                    console.log("sent lateness",agents)
                    i++
                    sendLatenessEmails()
                  }
                });
              }else {
                i++
                sendLatenessEmails()
              }
            }else {
              i=0
              sendNoShowEmails()
            }
          }
          function sendNoShowEmails(){
            if (staffEmails[i]) {
              agents=agentsR.recordset.filter(el=>el.staffEmail==staffEmails[i]).filter(el=>el.noShowsSince).sort((a,b)=>b.noShowsSince-a.noShowsSince)
              if (agents.length>0) {
                let body=`The following interviewers have had unactioned no-shows and require action. Visit the <a href="http://job-analysis:8080/attendance-hub/0/`+agents[0].agentTeamID[0]+`">attendance hub</a> in JA2 to action:<br><br><table><th>Name</th><th>Unactioned no shows</th><tr>`+agents.map(el=>'<td>'+el.agentName+"</td><td>"+el.noShowsSince+"</td>").join("</tr><tr>")+"</tr></table>"
                let subject='No shows to action for '+agents[0].teamName[0]
                let mailOptions = {
                  from:'Teamsearch <reports@teamsearchmr.co.uk>',
                  to: staffEmails[i],
                  // to: 'matt@teamsearchmr.co.uk',
                  subject: subject,
                  html: '<p>' + header + '</p><p>' + body + '</p>' + footer + '</p>',
                }
                transporter.sendMail(mailOptions, (error, info) => {
                  if (error) {
                    console.log(error);
                    logger.info("Failed to send absences alert: ",mailOptions)
                    i++
                    sendNoShowEmails()
                  }else {
                    console.log("sent no show",agents)
                    i++
                    sendNoShowEmails()
                  }
                });
              }else {
                i++
                sendNoShowEmails()
              }
            }else {
              resolve()
            }
          }
          sendBradfordEmails()
        })
      })
    })
  })
}
function sendMondayReport(){
  let dte=moment().subtract(1, 'weeks').isoWeekday(1)
  var nfNumber=(val,dp)=>val?Math.round(val*Math.pow(10,dp))/Math.pow(10,dp):0
  let agentQ=`
  declare @mrst date = '`+dte.format("YYYY-MM-DD")+`'
  declare @mren date = dateadd(day,6,@mrst)
  select lw.agentID,agentName,teamName,hrs,cont,qcScore,booked,canx
  from (
  select s.agentID,agentName,teamName,sum(Hours) hrs,sum(Pay)/nullif(sum(Sales),0) cont,0.00+avg(score) qcScore from
  getAgentShifts(@mrst,@mren) s
  left join agents a on a.agentID=s.agentID
  left join getQCscores(@mrst,@mren,1,1) q on q.agentID=s.agentID and q.interviewDate=s.inputDate and q.jobID=s.jobID
  left join AgentTeams t on t.agentTeamID=a.teamID
  group by s.agentID,agentName,teamName
  ) lw
  left join (
  	select b.agentID,sum(case when nullif(absenceType,'No show') is null then bookedHours end) booked,sum(case when absenceType='Cancelled by manager' then bookedHours end) canx
  	from getBookedHours(dateAdd(week,1,@mrst),dateAdd(week,1,@mren)) b
  	left join Absence a on a.agentID=b.agentID and a.absenceDate=b.bookingDate
  	group by b.agentID
  	) b on b.agentID=lw.agentID
  order by ISNULL(cont,999)`
  db.query(agentQ,(err,agentR)=>{
    let body=`<table><tr><th rowspan="2">Name</th><th rowspan="2">Team</th><th rowspan="2">Hours</th><th rowspan="2">Contribution</th><th rowspan="2">QC scores (avg)</th><th colspan="2" style="border-bottom:1px solid gainsboro">Hours this week</th></tr><tr><th>Due to work</th><th>Cancelled</th></tr>`
      +"<tr>"+agentR.recordset.map(el=>'<td>'+el.agentName+"</td><td>"+el.teamName+"</td><td>"+nfNumber(el.hrs,1)+"</td><td>"+(el.cont?nfNumber(el.cont*100,1):'-')+"%</td><td>"+nfNumber(el.qcScore,1)+"</td><td>"+nfNumber(el.booked,2)+"</td><td>"+nfNumber(el.canx,2)+"</td>").join("</tr><tr>")+"</tr></table>"
    let subject='Agent report for w/c '+dte.format("DD/MM/YYYY")
    let mailOptions = {
      from:'Teamsearch <reports@teamsearchmr.co.uk>',
      to: ['rob@teamsearchmr.co.uk','matt@teamsearchmr.co.uk'],
      // to: 'matt@teamsearchmr.co.uk',
      subject: subject,
      html: '<p>' + header + '</p><p>' + body + '</p>' + footer + '</p>',
    }
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        logger.info("Failed to send absences alert: ",mailOptions)
      }
    });
  })
}
function accouncement(){
  var FormData = require('form-data');
  formData = new FormData();
  formData.append('json', new Buffer(JSON.stringify({
      type: 'Announcement',
      answeringRule:{id: 'business-hours-rule'}
  })), {
      filename: 'request.json',
      contentType: 'application/json'
  });
  formData.append('binary', require('fs').createReadStream(publicPath+'/temp/test1/205107065.mp3'));
  // rcPlatform.get('/restapi/v1.0/account/~/extension/664868065/greeting/205075065').then(function(resp){
  //   console.log(resp)
  //   resp.json().then(function(ext){
  //     console.log(ext)
  //   })
  // })
  rcPlatform.post('/restapi/v1.0/account/~/extension/664868065/greeting',formData).then(function(resp){
    console.log(resp)
    resp.json().then(function(ext){
      console.log(ext)
      // rcPlatform.get(ext.contentUri).then(function(logResp){
      //   logResp.buffer().then(function(result){
      //     fs.mkdir(publicPath+'/temp/test1', { recursive: true }, (err) => {
      //       let out=publicPath + '/temp/test1/'+ext.id+".mp3"
      //       fs.writeFileSync(out, result);
      //     })
      //   }).catch(function(e){
      //     console.log(e)
      //     res.status(500).send(e)
      //   })
      // })
    })
  })
}
function quoteChaseEmails(){
  return new Promise((resolve,reject)=>{
    let quoteQ=`
    select * from
    Quotes q
    left join Contacts c on c.contactID=q.contactID
    where commissionDate is null and nullif(chaseOutcome,'') is null and quoteDate=DATEADD(WEEK,-4,CAST(getdate() as date))`
    var Mustache = require('mustache');
    var fs = require('fs');
    db.query(quoteQ,(err,quoteR)=>{
      if (err) {
        console.log(err)
      }
      let q=0
      function loopQuotes(){
        let quote=quoteR.recordset[q]
        if (quote) {
          fs.readFile(publicPath + '/templates/Quote chase email.htm', 'utf8', function(err, template){
            let baseURL=(addInput)=>"https://docs.google.com/forms/d/e/1FAIpQLSc6LiLByU67BGQxHU1bYI4N9M7R2c5Plp2VuyLluNqgjChNzg/viewform?usp=pp_url&entry.1808646246="+quote.quoteID+"&entry.203574739="
            let getBtn=(opt,addInput)=>`<a class="formBtn" href="`+(baseURL(addInput))+(addInput?'__other_option__&entry.203574739.other_option_response=TYPE+IN':opt.split(" ").join("+"))+`">`+opt+`</a><br><br>`
            let buttons=getBtn("Job did not go ahead with us")+getBtn("Job went ahead but we used another supplier due to costs")+getBtn("Job went ahead but we used another supplier due to experience")+getBtn("Proposal is still live and client is considering")+getBtn("Other",true)
            var rendered = Mustache.render(template, {
              subject:'RFQ '+quote.quoteNo+" "+quote.quoteName,
              quoteNo:quote.quoteNo,
              quoteName:quote.quoteName,
              contactName:quote.contactName.split(" ")[0],
              buttons:buttons
            })
            outlookTransporter({
              user: "rob@teamsearchmr.co.uk",
              pass: process.env.OUTLOOK_ROB_PASSWORD
            }).sendMail({
              to: quote.contactEmail,
              from:'rob@teamsearchmr.co.uk',
              subject: 'RFQ '+quote.quoteNo+" "+quote.quoteName,
              html: rendered,
            },(err,info)=>{
              if (err) {
                console.log(err)
              }else {
                console.log("Sent email")
                q++
                loopQuotes()
                db.query('update quotes set chased=getdate() where quoteID='+quote.quoteID)
              }
            })
          })
        }else {
          axios.get('https://script.google.com/macros/s/AKfycbycwGtptQUJ1ysR7IWmzmIo-W3oWAWnM107OTUWt0-yqsyQEp2sjgO_BQcfYofc7JzdJw/exec').then(e=>{
            console.log(e.data)
            let r=0
            function loopResponses(){
              let resp=e.data[r]
              if (resp) {
                db.input('outcome',resp[1])
                db.input('quoteID',resp[2])
                db.query("update quotes set chaseOutcome=@outcome where quoteID=@quoteID",(err,r2)=>{
                  if (err) {
                    console.log(err)
                  }
                  r++
                  loopResponses()
                })
              }else {
                console.log("Done")
              }
            }
            loopResponses()
          })
        }
      }
      loopQuotes()
    })
  })
}
function lastYearChaseReport(){
  function separators(num,dp){
    var num_parts = (dp?Number(num).toFixed(dp):(Math.round(Number(num)*100)/100).toString()).split(".");
    num_parts[0] = num_parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return num_parts.join(".");
  }
  let q=`
  select q.quoteID,quoteNo,quoteName,clientName,contactName,contactEmail,sales,spend,closingDate from
  Quotes q
  left join Projects p on p.quoteID=q.quoteID
  left join Contacts c on c.contactID=q.contactID
  left join clients cl on cl.clientID=q.clientID
  left join (select sales.projectID,sales,spend from
  	(select projectID,SUM(unitValue*units) sales from ViewProjectCosts group by projectID) sales
  	left join (select projectID,SUM(spend) spend from (
  		select projectID,unitValue*units spend from ProjectSpends
  		union all
  		select projectID,pay from ViewDailyPay p left join Jobs j on j.jobID=p.jobID
  		) x group by projectID
  	) sp on sp.projectID=sales.projectID
  ) ss on ss.projectID=p.projectID
  where p.closingDate between DATEADD(month,-11,@lycdte) and dateadd(day,-1,DATEADD(month,-10,@lycdte))`
  db.input('lycdte',new Date())
  db.query(q,(err,r)=>{
    if (err) {
      console.log(err)
    }
    let q=0
    let table="<table><th>Project</th><th>Completed Date</th><th>Contribution</th><th>Sales</th><th>Client</th><th>Contact</th>"
    function loopQuotes(){
      let quote=r.recordset[q]
      if (quote) {
        table=table+"<tr><td><a href='http://job-analysis:8080/overview/"+quote.quoteID+"'>"+quote.quoteNo+" "+quote.quoteName+"</a></td><td>"+moment(quote.closingDate).format("DD/MM/YYYY")+"</td><td>"+Math.round((quote.sales?quote.spend/quote.sales:9.99)*10000)/100+"%</td><td>£"+separators(quote.sales,2)+"</td><td>"+quote.clientName+"</td><td><a href='mailto:"+quote.contactEmail+"?subject=RFQ%20"+quote.quoteNo+"%20"+quote.quoteName+"'>"+quote.contactName+"</a></td></tr>"
        q++
        loopQuotes()
      }else {
        table=table+"</table>"
        let mailOptions = {
          from:'Teamsearch <reports@teamsearchmr.co.uk>',
          to: ['rob@teamsearchmr.co.uk','matt@teamsearchmr.co.uk'],
          // to: 'matt@teamsearchmr.co.uk',
          subject: "Projects completed this time last year",
          html: '<p>' + header + '</p><p>' + table + '</p>' + footer + '</p>',
        }
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log(error);
          }else {
            console.log("sent")
          }
        });
      }
    }
    loopQuotes()
  })
}
function quoteChaseReport(){
  let q=`
  select * from
  Quotes q
  left join Contacts c on c.contactID=q.contactID
  left join clients cl on cl.clientID=q.clientID
  where chased between '`+moment().isoWeekday(1).format("YYYY-MM-DD")+`' and '`+moment().format("YYYY-MM-DD")+`'`
  db.query(q,(err,r)=>{
    if (err) {
      console.log(err)
    }
    let q=0
    let table="<table><th>Quote No</th><th>Quote Name</th><th>Quote Date</th><th>Client</th><th>Contact</th><th>Chased</th><th>Response</th>"
    function loopQuotes(){
      let quote=r.recordset[q]
      if (quote) {
        table=table+"<tr><td>"+quote.quoteNo+"</td><td>"+quote.quoteName+"</td><td>"+moment(quote.quoteDate).format("DD/MM/YYYY")+"</td><td>"+quote.clientName+"</td><td><a href='mailto:"+quote.contactEmail+"?subject=RFQ%20"+quote.quoteNo+"%20"+quote.quoteName+"'>"+quote.contactName+"</a></td><td>"+(quote.chased?moment(quote.chased).format("ddd Do MMM HH:mm"):'-')+"</td><td>"+(quote.chaseOutcome?quote.chaseOutcome:'-')+"</td></tr>"
        q++
        loopQuotes()
      }else {
        table=table+"</table>"
        let mailOptions = {
          from:'Teamsearch <reports@teamsearchmr.co.uk>',
          to: ['rob@teamsearchmr.co.uk','matt@teamsearchmr.co.uk'],
          // to: 'matt@teamsearchmr.co.uk',
          subject: "Quotes chases from w/c "+moment().isoWeekday(1).format("DD/MM/YYYY"),
          html: '<p>' + header + '</p><p>' + table + '</p>' + footer + '</p>',
        }
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log(error);
          }else {
            console.log("sent")
          }
        });
      }
    }
    loopQuotes()
  })
}
global.sendCsatChase=(quote,isReminder)=>{
  var Mustache = require('mustache');
  var fs = require('fs');
  // console.log(quote)
  return new Promise((resolve,reject)=>{
    fs.readFile(publicPath + '/templates/Csat chase email'+(isReminder?' reminder':'')+'.htm', 'utf8', function(err, template){
      var rendered = Mustache.render(template, {
        contactName:quote.contactName.split(" ")[0],
        csatID:quote.csatID
      })
      let data={
        to: quote.contactEmail,
        // to: 'matt@teamsearchmr.co.uk',
        from:'rachel@teamsearchmr.co.uk',
        subject: quote.quoteNo+" "+quote.quoteName,
        html: rendered,
      }
      outlookTransporter({
        user: "rachel@teamsearchmr.co.uk",
        pass: process.env.OUTLOOK_RACHEL_PASSWORD
        // user: "matt@teamsearchmr.co.uk",
        // pass: "PagesYellow16"
      }).sendMail({
        to: data.to,
        // to: "matt@teamsearchmr.co.uk",
        from:data.from,
        subject: data.subject,
        html: data.html,
      },(err,info)=>{
        if (err) {
          console.log("sendCsatChase error",err)
          logger.info("sendCsatChase error",err)
          reject(err)
        }else {
          console.log("Sent csat chase email",quote.quoteNo+" "+quote.quoteName)
          logger.info("Sent csat chase email",quote.quoteNo+" "+quote.quoteName)
          resolve()
          db.query('update projects set '+(isReminder?'csatPhoneChased':'csatEmailChased')+'=getdate() where quoteID='+quote.quoteID[0])
        }
      })
    })
  })
}
function csatChaseEmails(){
  return new Promise((resolve,reject)=>{
    let quoteQ=`
    select * from
    Projects p
    left join Quotes q on q.quoteID=p.quoteID
    left join Contacts c on c.contactID=q.contactID
    left join (select MAX(endDate) enddate,projectID from Jobs group by projectID) j on j.projectID=p.projectID
    where csatComplete is null
    and isProjectClosed=1 and isnull(c.excludeFromCsat,0)<>1
    and (
    	(csatEmailChased is null and isnull(closingDate,enddate)=DATEADD(WEEK,-1,CAST(getdate() as date)))
    	or
    	(csatEmailChased is not null and csatPhoneChased is null and isnull(closingDate,enddate)=DATEADD(WEEK,-2,CAST(getdate() as date)))
    )`
    db.query(quoteQ,(err,quoteR)=>{
      if (err) {
        logger.info("csatChaseEmails error",err)
      }
      let q=0
      function loopQuotes(){
        let quote=quoteR.recordset[q]
        if (quote) {
          sendCsatChase(quote,(quote.csatEmailChased?true:false)).then(e=>{
            q++
            loopQuotes()
          })
        }else {
          console.log("csatChaseEmails done")
        }
      }
      loopQuotes()
    })
  })
}

function manualQuotesChaseReport(){
  let q=`
  select * from
  Quotes q
  left join Contacts c on c.contactID=q.contactID
  left join clients cl on cl.clientID=q.clientID
  where chased is not null`
  db.query(q,(err,r)=>{
    if (err) {
      console.log(err)
    }
    let q=0
    let table="<table><th>Quote No</th><th>Quote Name</th><th>Client</th><th>Contact</th><th>Chased</th><th>Response</th>"
    function loopQuotes(){
      let quote=r.recordset[q]
      if (quote) {
        table=table+"<tr><td>"+quote.quoteNo+"</td><td>"+quote.quoteName+"</td><td>"+quote.clientName+"</td><td><a href='mailto:"+quote.contactEmail+"?subject=RFQ%20"+quote.quoteNo+"%20"+quote.quoteName+"'>"+quote.contactName+"</a></td><td>"+(quote.chased?moment(quote.chased).format("ddd Do MMM HH:mm"):'-')+"</td><td>"+(quote.chaseOutcome?quote.chaseOutcome:'-')+"</td></tr>"
        q++
        loopQuotes()
      }else {
        table=table+"</table>"
        let mailOptions = {
          from:'Teamsearch <reports@teamsearchmr.co.uk>',
          to: ['rob@teamsearchmr.co.uk','nick@teamsearchmr.co.uk','matt@teamsearchmr.co.uk'],
          // to: 'matt@teamsearchmr.co.uk',
          subject: "Quotes chases from all time",
          html: '<p>' + header + '</p><p>' + table + '</p>' + footer + '</p>',
        }
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log(error);
          }else {
            console.log("sent")
          }
        });
      }
    }
    loopQuotes()
  })
}
global.getAggDials=(rcIDs,date,hours)=>{
  console.log(date)
  let dte=moment(date).format("YYYY-MM-DD")
  let tData={
    grouping:{
      groupBy:"Users",
      keys:rcIDs
    },
    timeSettings:{
      timeZone:'Europe/London',
      timeRange:{
        timeFrom:moment(date).startOf('d').toISOString(),
        timeTo:moment(date).add(1,'d').startOf('d').toISOString()
      }
    },
    callFilters:{
      directions:["Outbound"],
      callTypes:["Outbound"]
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
  return new Promise((resolve,reject)=>{
    if (moment(date).isSameOrBefore(moment().subtract(184,'d'))) {
      reject("Date too far in past")
    }
    let json=[]
    let totalPages
    asyncDo(resp=>{
      totalPages=resp.paging.totalPages
      json=json.concat(resp.data.records)
      p++
    },()=>p<=totalPages,()=>{
      return rcPlatform.post("/analytics/calls/v1/accounts/~/timeline/fetch?interval=Hour&page="+p+"&perPage=10",tData).then(function(resp){
        return resp.json()
      })
    },()=>{
      let dialData=json.data.records.filter(el=>el.points)
      dialData=dialData.map(agent=>{
        let obj={}
        if (hours) {
          agent.points=agent.points.filter(el=>hours.includes(Number(moment(el.time).format("H"))))
        }
        obj.id=agent.key
        obj.hourly=agent.points.filter(el=>el.time.split("T")[0]==dte).map(el=>({hour:Number(moment(el.time).format("H")),talkTime:el.timers.allCalls.values/60,dialCount:el.counters.allCalls.values})).filter(el=>el.talkTime+el.dialCount>0)
        obj.totals={
          talkTime:obj.hourly.reduce((a,b)=>a+b.talkTime,0),
          dialCount:obj.hourly.reduce((a,b)=>a+b.dialCount,0),
        }
        return obj
      }).filter(el=>el.hourly.length>0)
      resolve(dialData)
    })
  })
}
function manualDialUpdate(){
  let dailyQ=`
  select grouping(ringCentralID) grprc,d.agentID,ringCentralID,agentName,inputDate,startTime,endTime
  from
  (select agentID,inputDate from DailyInput where liveSales>0 group by agentID,inputDate) d
  left join Agents a on a.agentID=d.agentID
  left join getBookedHours('2021-01-01','2022-06-09') b on b.agentID=d.agentID and b.bookingDate=d.inputDate
  left join (select agentID,dialDate,SUM(dialCount) dialCount from Dials group by agentID,dialDate) i on i.dialDate=d.inputDate and i.agentID=d.agentID
  where dialDate is null and ringCentralID is not null
  group by GROUPING sets(
  (d.agentID,ringCentralID,agentName,inputDate,startTime,endTime),
  (inputDate)
  )
  order by inputDate
  `
  db.query(dailyQ,(err,r)=>{
    let dates=r.recordset.filter(el=>el.grprc==1).map(el=>el.inputDate)
    let d=0
    function loopDates(){
      if (dates[d]) {
        let recs=r.recordset.filter(el=>el.grprc==0 && moment(el.inputDate).isSame(dates[d],'day'))
        let agents=recs.map(el=>el.ringCentralID)
        getAggDials(agents,dates[d]).then(dials=>{
          console.log(dials)
          if (dials.length>0) {
            dials.forEach((dial, i) => {
              db.query(
                `insert into dials (extensionName,dialDate,dialCount,talkMins,agentID,phoneSystem)
                values ('`+dial.id+`','`+dates[d].toISOString()+`',`+dial.totals.dialCount+`,`+dial.totals.talkTime+`,(select top 1 agentID from agents where ringCentralID=`+dial.id+`),'RingCentral')`,
                (err,r)=>{
                  if (err) {
                    console.log(err,dial)
                  }
                })
              });
              d++
              loopDates()
          }else {
            d++
            loopDates()
          }
        }).catch(e=>{
          d++
          loopDates()
        })
      }
    }
    loopDates()
  })
}
function dbTest(){
  let q=`
  declare @st date='2021-01-01',@en date='2021-12-31'

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
    db.query(q,(err,r)=>{
      if (err) {
        console.log(err)
      }else {
        console.log("Success!",r.recordset.length+" records")
      }
    })
}
function applyRegularHours(){
  let q=`
  set datefirst 7
  declare @T as table(agentID int,startTime time,endTime time,weekday int,appliedHours decimal(6,2),bookedHours decimal(6,2),fixedContractStart date)
  insert into @T
  exec getContractHours
  set @rbWeekStart=cast(@rbWeekStart as date)
  WHILE @rbWeekStart<dateadd(week,3,GETDATE())
  BEGIN
  	set @rbWeekStart=(select dbo.startOfWeek(dateadd(week,1,@rbWeekStart)))

    MERGE Booking b
     USING (
        select r.agentID,DATEADD(day,weekday,@rbWeekStart) bookingDate,startTime,endTime,teamID bookingTeamID
      	from
      	@T r
      	left join Agents a on a.agentID=r.agentID
        left join absence ab on ab.absenceDate=DATEADD(day,weekday,@rbWeekStart) and ab.agentID=a.agentID
        left join agentTeams t on t.agentTeamID=a.teamID
      	where a.agentLeft is null and isnull(contractStart,'9999-01-01')<=DATEADD(day,weekday,@rbWeekStart) and nullif(absenceType,'No show') is null and (t.isEve=1 OR t.isDay=1)
     ) AS r ON r.agentID=b.agentID and b.bookingDate=r.bookingDate
     WHEN MATCHED THEN
         UPDATE SET
         b.startTime = case when b.startTime='00:00:00' then '00:00:00' else r.startTime end,
    		 b.endTime = case when b.endTime='00:00:00' then '00:00:00' else r.endTime end,
         b.isContractShift=1,
         b.bookingTeamID=r.bookingTeamID
     WHEN NOT MATCHED THEN
         INSERT (
             agentID,bookingDate,startTime,endTime,bookingTeamID,isContractShift
         )
         VALUES (
             r.agentID,r.bookingDate,r.startTime,r.endTime,r.bookingTeamID,1
         );
    --debugger
    select distinct DATEADD(day,weekday,@rbWeekStart) bookingDate
    from
    @T r
    left join Agents a on a.agentID=r.agentID
    left join absence ab on ab.absenceDate=DATEADD(day,weekday,@rbWeekStart) and ab.agentID=a.agentID
    where isnull(contractStart,'9999-01-01')<=DATEADD(day,weekday,@rbWeekStart) and nullif(absenceType,'No show') is null
  END`
  let delQ=`
  delete b from
  booking b
  left join dailyInput d on d.inputBookingID=b.bookingID
  left join agents a on a.agentID=b.agentID
  left join agentContracts c on c.contractID=a.contractVersion
  left join absence ab on ab.absenceDate=b.bookingDate and ab.agentID=b.agentID
  where d.inputID is null and nullif(absenceType,'No show') is null and startTime<>'00:00:00' and c.fixedHours=1 and b.isContractShift=1 and bookingDate>=(select dbo.startOfWeek(dateadd(week,1,cast(getdate() as date))))`
  let thisDb=new sql.Request();
  thisDb.input('rbWeekStart',new Date())
  return new Promise((res,rej)=>{
    thisDb.query(delQ,(err,d)=>{
      if (err) {
        console.log(err)
      }
      thisDb.query(q,(err,r)=>{
        if (err) {
          console.log(err)
          logger.info("Error applying regular hours",err)
        }else {
          console.log("Regular hours applied",r.recordset)
          logger.info("Regular hours applied",r.recordset)
        }
        res("done")
      })
    })
  })
}
function setDailyResourceTargets(){
  let insQ=`
  Declare @DRT Table (jobID int,isJobEve bit,isJobDay bit,dtJobID int,dte date,isOfficeDay bit,bankHol varchar(255),calc decimal(10,2),resourceHours decimal(10,2),resourceHoursAcademy decimal(10,2),planned decimal(10,2),plannedAcademy decimal(10,2))
  insert into @DRT
  exec getJobResourcePlan 0
  delete from DailyResourceTargets where targetDate>getDate()
  insert into DailyResourceTargets
  select jobID,coalesce(planned+isnull(plannedAcademy,0),resourceHours+isnull(resourceHoursAcademy,0),calc,0) hoursNeeded,dte,case
  when planned is not null then 'planned'
  when resourceHours is not null then 'resourced'
  else 'calc' end type,isnull(plannedAcademy,0)+isnull(resourceHoursAcademy,0) hoursNeededAcademy
  from @DRT
  where dte>GETDATE() and jobID is not null`
  return db.query(insQ)
}
function addAutoAllocations(){
  let insQ=`
  delete from AgentAllocation where agentAllocationDate=DATEADD(DAY,1,CAST(getdate() as date)) and agentID in (
  	select agentID from
  	getDedicatedDates() d
  	left join DedicatedTeams t on t.dedicationID=d.dedicationID
  	where autoAllocate=1 and dedicatedDate=DATEADD(DAY,1,CAST(getdate() as date))
  )
  insert into AgentAllocation
  select jobID,b.agentID,bookingDate,appliedHours
  from getBookedHours(DATEADD(DAY,1,CAST(getdate() as date)),DATEADD(DAY,1,CAST(getdate() as date))) b
  right join DedicatedTeams t on t.agentID=b.agentID and t.dedicationID in (select dedicationID from getDedicatedDates() where dedicationID=t.dedicationID and dedicatedDate=b.bookingDate)
  where autoAllocate=1 and b.agentID is not null`
  return db.query(insQ)
}
function cmResourceUpdate(){
  let thisDb=new sql.Request();
  thisDb.input('dateCount',10)
  thisDb.execute('getJobResourcePlan',(err,planR)=>{
    // thisDb.execute('spNeededBooked',(err,neededR)=>{
      let jobQ=`
      select r.jobID,r.ahr,j.jobName,q.quoteNo,q.quoteName,s.staffID,s.staffName,s.staffEmail,j.timedLOI,j.expectedLOI,r.calcHoursNew,r.autoHours,isnull(r.plannerHours,0) plannerHours,intsLeft,j.isJobDay from
      getResourceNeeded(0) r
      left join Jobs j on j.jobID=r.jobID
      left join Projects p on p.projectID=j.projectID
      left join Quotes q on q.quoteID=p.quoteID
      left join Staff s on s.staffID=p.projectCM`
      db.query(jobQ,(err,jobR)=>{
        let neededDisplay=(job)=>job?(job.planned!==null?job.planned:(job.resourceHours!==null?job.resourceHours:job.isOfficeDay==1?job.calc:0)):''
        let checkShift=(shift,obj)=>!isNaN(shift/1)?Number(obj.dtJobID)==Number(shift):((obj['is'+shift] || obj['isJob'+shift]) && !obj.dtJobID)
        let plans=planR.recordset.filter(p=>p.dte)
        let jobs=_.uniqBy(plans,'jobID').map(p=>jobR.recordset.find(j=>j.jobID==p.jobID)).sort((a,b)=>(a.calcDays+a.plannerDays)-(b.calcDays+b.plannerDays))
        let cms=_.uniqBy(jobR.recordset,'staffEmail').map(el=>({email:el.staffEmail,name:el.staffName,id:el.staffID}))
        let c=0
        let dates=_.uniqBy(plans,p=>p.dte.toISOString().split("T")[0]).map(el=>el.dte.toISOString().split("T")[0])
        logger.info("CM Resource emails - CMs: "+cms)
        function loopCMs(){
          if (c<cms.length) {
            let cm=cms[c]
            let cmJobs=jobs.filter(j=>plans.find(el=>el.jobID==j.jobID) && j.staffID==cm.id).sort((a,b)=>a.isJobDay-b.isJobDay)
            let em="<h5>"+cmJobs.length+" jobs in field"+(cmJobs.filter(j=>j.calcHoursNew>=1 && j.autoHours!==null).length?", "+cmJobs.filter(j=>j.calcHoursNew>=1 && j.autoHours!==null).length+" will not hit target":'')+(cmJobs.filter(j=>j.autoHours===null).length?', '+cmJobs.filter(j=>j.autoHours===null).length+" not yet resourced":'')+":</h5><br><table><thead><th style='width:200px'></th><th>Hours needed after today</th><th>Hours resourced after today</th><th>Shortfall (ints)</th><th></th><th>Biggest team</th>"+dates.map(d=>"<th>"+moment(d).format("ddd<br>DD/MM")+"</th>").join("")+"</thead>"+cmJobs.filter(j=>j.autoHours!==null).map(j=>{
              let plan=plans.filter(el=>el.jobID==j.jobID)
              let shift=j.isJobDay?'Day':'Eve'
              if (plan.length==0) {
                return null
              }else {
                let hrsResourced=j.plannerHours+j.autoHours
                let sampleNeeded=dates.map(d=>neededDisplay(plan.find(p=>p.dte.toISOString().split("T")[0]==d))===''?'':Math.ceil(Number(neededDisplay(plan.find(p=>p.dte.toISOString().split("T")[0]==d)))*(60-((j.timedLOI==null?j.expectedLOI:j.timedLOI)*j.ahr))))
                return "<tr style='background:"+(j.isJobDay?'#f8df89':'#fbf3d7')+"'><td style='width:200px' rowspan='2'>"+j.quoteNo+" "+j.quoteName+" - "+j.jobName+"</td><td rowspan='2'>"+Math.max(0,Math.round((j.intsLeft/j.ahr)*2)/2)+"</td><td rowspan='2'>"+Math.round(hrsResourced*2)/2+"</td><td rowspan='2' style='color:"+(j.calcHoursNew>=1?'red':'green')+"'>"+(Math.round(j.calcHoursNew*j.ahr*2)/2)+"</td><td>Hours:</td><td>"+Math.max(...plan.map(d=>Number(neededDisplay(d))))+"</td>"+dates.map(d=>"<td style='white-space:nowrap'>"+neededDisplay(plan.find(p=>p.dte.toISOString().split("T")[0]==d))+"</td>").join("")+"</tr><tr style='font-style:italic;background:#e9e9e9'><td>Sample:</td><td >"+Math.max(...sampleNeeded)+"</td>"+sampleNeeded.map(s=>"<td>"+s+"</td>").join("")+"</tr>"
              }
            }).filter(el=>el).join("")+"</table>"+(cmJobs.filter(j=>j.autoHours===null).length?"<h5>Resource not yet calculated for:</h5><ul>"+cmJobs.filter(j=>j.autoHours===null).map(j=>"<li>"+j.quoteNo+" "+j.quoteName+" - "+j.jobName+"</li>").join(""):'')
            let mailOptions = {
              // to: ['matt@teamsearchmr.co.uk'],
              to: [cm.email],
              from:'JA2 <reports@teamsearchmr.co.uk>',
              subject: '10-day resource digest for your jobs - '+cm.name,
              html: '<p>' + header + em + '</p>'
            };
            transporter.sendMail(mailOptions,err=>{
              if (err) {
                console.log(err)
                logger.info("Failed to send resource changes",err)
              }
              logger.info("CM Resource emails - sent email: "+cm+" - c="+c)
              c++
              loopCMs()
            })
          }else {
            logger.info("CM resource emails sent")
          }
        }
        loopCMs()
      })
    // })
  })
}
function redoDials(dte,untilDte){
  if (moment(dte).isSameOrBefore(untilDte,'d')) {
    // syncRCdialsNew(dte).then(e=>{
    //   console.log("redone dials for "+dte)
    //   redoDials(moment(dte).add(1,'d').format("YYYY-MM-DD"),untilDte)
    // })
    syncRCdials(dte,null).then(e=>{
      // console.log("redone dials for "+dte)
      redoDials(moment(dte).add(1,'d').format("YYYY-MM-DD"),untilDte)
    })
  }else {
    console.log("redone all dials")
  }
}
function sendUpdateSummary(stdate,endate,label){
  let parser=require('node-html-parser');
  authOn=false
  axios.request({
    url: 'http://job-analysis:8080/daily-update/0?summary=true&stdate='+moment(stdate).format("YYYY-MM-DD")+'&endate='+moment(endate).format("YYYY-MM-DD"),
    method: 'get'
  }).then((result,err) => {
    authOn=true
    if (err) return console.error('Failed: %s', err.message);
    const root = parser.parse(result.data,{
      blockTextElements: {
        script: false,
        style: false,
      }
    });
    let html=""
    let div=root.querySelector("div.card.text-dark.mb-2.text-center")
    promForEach(root.querySelectorAll("table"),(el,i,res)=>{
      html+=el.toString()+"<br>"
      res()
    }).then(e=>{
        let mailOptions = {
          from: 'JA2 <reports@teamsearchmr.co.uk>',
          to:['rob@teamsearchmr.co.uk','matt@teamsearchmr.co.uk','tokulus@teamsearchmr.co.uk'],
          // to:['matt@teamsearchmr.co.uk'],
          subject: "Day/Eve Update Summary - "+label,
          html: '<p>' + header+"<h2>Date range: "+moment(stdate).format("DD/MM/YYYY")+"-"+moment(endate).format("DD/MM/YYYY")+"</h2><br>" + html + footer + '</p>'
        };
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log(error);
            logger.info('Could not send Daily Report Summary email: '+error);
          }else {
            console.log("Daily Report Summary email sent")
          }
        });
    })
  }).catch(function(e){
    authOn=true
    console.log("Error",e)
  });
}

function updateLiveForstaData(lastSeconds){

  return new Promise((res,rej)=>{
    let st=moment.utc().startOf("d").format()
    let en=moment.utc().format()
    if (liveForstaData) {
      st=moment.utc().subtract((lastSeconds||300),"seconds").format("YYYY-MM-DDTHH:mm:ss")+moment().format("Z")
    }else {
      liveForstaData=[]
    }
    // console.log(st,en)
    console.log("requesting call history",st,en)
    forstaCATIReq({url:"/callhistorywithvariables",data:{
      startTime:st,
      includeBreakTimes:true,
      includeLoginLogoutInfo:true,
      variables:'SampleGroup'
    }},(err,r)=>{
      if (err) {
        console.log(err)
        rej(err)
      }else {
        lastLiveForstaDataUpdate=new Date().getTime()
        r.value=r.value.map(b=>{
          b.SampleGroup=((b.Variables||[])[0]||{Value:null}).Value
          return {...b,...{time:new Date(new Date(b.Time).getTime()-((b.Duration||0)*1000)),duration:b.Duration,type:"Call",info:b}
        }})
        let callhistory=r.value.filter(c=>c.SurveyId.indexOf("BREAK")==-1&&c.SurveyId.indexOf("LOG")==-1)
        // console.log(r.value.length,liveForstaData.reduce((a,b)=>a+(b.timeline||[]).length,0))
        let breaks=r.value.filter(c=>c.SurveyId.indexOf("BREAK")>-1).map(c=>({...c,...{type:"Break",SurveyId:_.last(c.SurveyId.split(" "))}}))
        let logins=r.value.filter(c=>c.SurveyId=="LOGIN").map(c=>{
          let logout=r.value.find(cc=>cc.SurveyId=="LOGOUT"&&cc.InterviewerId==c.InterviewerId&&new Date(cc.time)>new Date(c.time))
          c.type="Login"
          c.LoginTime=c.time
          return c
        })
        let logouts=r.value.filter(cc=>cc.SurveyId=="LOGOUT").map(c=>({...c,...{type:"Logout"}}))
        let agents=_.uniqBy(liveForstaData.concat(logins),"InterviewerId").map(s=>s.InterviewerId)
        agents=agents.map(intid=>{
          let s={InterviewerId:intid}
          let br=breaks.filter(b=>b.InterviewerId==intid)
          let ch=callhistory.filter(c=>c.InterviewerId==intid)
          let pastData=(liveForstaData.find(l=>l.InterviewerId==intid)||{})
          let lo=_.uniqBy(logouts.filter(c=>c.InterviewerId==intid).concat((pastData.timeline||[]).filter(t=>t.type=="Logout")),"time")
          let li=_.uniqBy(logins.filter(c=>c.InterviewerId==intid).concat((pastData.timeline||[]).filter(t=>t.type=="Login")),"time").map((c,i,arr)=>{
            let logout=lo.find(cc=>cc.InterviewerId==c.InterviewerId&&new Date(cc.time)>new Date(c.time))
            c.duration=Math.round((new Date((logout||{time:new Date()}).time).getTime()-new Date(c.time).getTime())/1000)
            c.LogoutTime=logout?logout.time:null
            return c
          })
          // let lo=sessions.filter(c=>c.InterviewerId==intid && c.LogoutTime).map(b=>({time:b.LogoutTime,duration:60,type:"Logout"}))
          if (pastData) {
            s.agentInfo=pastData.agentInfo
          }
          s.jobs=pastData.jobs
          s.timeline=_.uniqBy((pastData.timeline||[]).concat(br).concat(ch).concat(li).concat(lo),t=>t.time+" "+t.type)
          // console.log(s.agentInfo,s.timeline.length-(pastData.timeline||[]).length)
          s.timeline.sort((a,b)=>new Date(a.time).getTime()-new Date(b.time).getTime())
          s.sessions=s.timeline.reduce((acc,curr)=>{
            let c=JSON.parse(JSON.stringify(curr))
            if (!acc[0].length) {
              acc[0].push(c)
              return acc
            }
            if (acc[acc.length-1][0].SampleGroup==c.SampleGroup&&acc[acc.length-1][0].SurveyId==c.SurveyId&&acc[acc.length-1][0].type==c.type) {
              acc[acc.length-1].push(c)
              return acc
            }else {
              acc.push([c])
              return acc
            }
          },[[]]).filter(t=>t.length)
          // s.sessions=_.uniqBy((pastData.sessions||[]).concat(sessions).filter(c=>c.InterviewerId==intid),"LoginTime").map(ss=>{
          //   ss.timeline=s.timeline.filter(t=>new Date(t.time).getTime()>=new Date(ss.LoginTime).getTime()&&new Date(t.time).getTime()<new Date(t.LogoutTime).getTime())
          //   return ss
          // })
          return s
        })
        console.log("liveForstaData updated")
        liveForstaData=agents
        res(liveForstaData)
      }
    })
  })
}
function updateAllSampleCounts(){
  db.query("select jobID,forstaGroupID,vistaName from jobs where forstaGroupID is not null and vistaName is not null and jobID in (select jobID from getResourceNeeded(0))",(err,r)=>{
    function getSampleCounts(){
      getForstaPage("https://author.euro.confirmit.com/home/",(page,err)=>{
        promForEach(_.uniq(r.recordset.map(rr=>rr.forstaSID)),(sid,si,snext)=>{
          getForstaPage("https://cati.euro.confirmit.com/Supervisor.New/CallManagement/CallManagement.aspx?ID="+sid,(page,err)=>{
            (async ()=>{
              try{
                await page.waitForSelector(`#Content_m_grid_dataGrid_CallState_ValueControl`)
                await page.select(`#Content_m_grid_dataGrid_CallState_ValueControl`, '2')
                // await page.waitForTimeout(1000)
                let sampleGroupSelector=await page.$(`#Content_m_grid_dataGrid_VarSampleGroup_ValueControl`)
                if (!sampleGroupSelector) {
                  await page.click("#Content_m_grid_topToolbar_leftMenu_ctl02")
                  await page.waitForSelector(`iframe[src="/Supervisor.New/OverlayProxy.aspx"]`)
                  let frameHandle=await page.$(`iframe[src="/Supervisor.New/OverlayProxy.aspx"]`)
                  let variableFrame=await frameHandle.contentFrame();
                  variableFrame.waitForSelector("table[mkr='contentTbl']")
                  let sampleGroupCell=await variableFrame.$(`td[data-ig*='val:"SampleGroup"']`)
                  if (sampleGroupCell) {
                    let tr=await sampleGroupCell.getProperty('parentNode')
                    let check=await tr.$('input[type="checkbox"]').click()
                    variableFrame.click("#Content_dialog_m_grid_btnOK")
                    await page.waitForSelector(`#Content_m_grid_dataGrid_VarSampleGroup_ValueControl`)
                    sampleGroupSelector=await page.$(`#Content_m_grid_dataGrid_VarSampleGroup_ValueControl`)
                  }
                }
                if (sampleGroupSelector) {
                  await page.evaluate(() => {
                    document.documentElement.addEventListener('custom_pageLoad', (e) => {
                      let triggerDiv=document.createElement("div")
                      triggerDiv.id="recordCountReady"
                      document.documentElement.append(triggerDiv)
                    });
                  });
                  promForEach(_.uniqBy(r.recordset.filter(rr=>rr.forstaSID==sid),"forstaGroupID"),(job,gi,gnext)=>{
                    (async ()=>{
                      await page.evaluate(() => {
                        let oldT=document.getElementById("recordCountReady")
                        if (oldT) {
                          oldT.remove()
                        }
                      });
                      await page.focus('#Content_m_grid_dataGrid_VarSampleGroup_ValueControl')
                      await page.click('#Content_m_grid_dataGrid_VarSampleGroup_ValueControl',{clickCount: 3})
                      await page.keyboard.type(job.forstaGroupID.toString())
                      await page.keyboard.press('Enter')
                      await page.waitForSelector("#recordCountReady")
                      let infoCell=await page.$("#Content_m_grid_lblRecordCount")
                      let info=await (await infoCell.getProperty('textContent')).jsonValue()
                      let sampleCount=parseInt(info.split(":")[1].split("S")[0])
                      r.recordset=r.recordset.map(j=>({...j,...{sampleCount:j.forstaGroupID==job.forstaGroupID?sampleCount:j.sampleCount}}))
                      forstaScraper.data.jobs=_.unionBy((forstaScraper.data.jobs||[]),r.recordset,"jobID")
                      gnext()
                    })()
                  }).then(e=>{
                    snext()
                  })
                }
              }catch(err){
                console.log(err)
              }
            })()
          })
        }).then(e=>{
          console.log("Sample counts updated for "+r.recordset.filter(rr=>rr.sampleCount!==undefined).length+" jobs")
        })
      })
    }
    getForstaPage("https://cati.euro.confirmit.com/catisupervisor/surveys/",(page,err)=>{
      if (err) {
        console.log(err)
      }
      (async ()=>{
        try{
          await page.waitForSelector(`iframe#listFrame`)
          const elementHandle = await page.$(
            'iframe#listFrame',
          );
          const surveyFrame = await elementHandle.contentFrame();
          await surveyFrame.waitForSelector(`table[mkr="dataTbl.hdn"]`)
          promForEach(_.uniq(r.recordset.filter(rr=>!rr.forstaSID).map(rr=>rr.vistaName)),(pid,pi,pnext)=>{
            (async ()=>{
              let pidCell=await surveyFrame.$(`td[data-ig*='val:"`+pid+`"']`)
              let sidCell=await surveyFrame.evaluateHandle(el => el.previousElementSibling, pidCell);
              let sid=await (await sidCell.getProperty('textContent')).jsonValue()
              r.recordset=r.recordset.map(j=>({...j,...{forstaSID:j.vistaName==pid?sid:j.forstaSID}}))
              pnext()
            })()
          }).then(e=>{
            getSampleCounts()
          })
        }catch(err){
          console.log(err)
        }

      })()
    })
  })
}
function testFunc(){
  const { ref,listAll }=require("firebase/storage");
  const initialRef = ref(firestore, 'complaints/'+289+'/Initial/');
  const outcomeRef = ref(firestore, 'complaints/'+289+'/Outcome/');
  listAll(initialRef)
    .then((folder) => {
      console.log("initialRef",folder.items)
    }).catch((error) => {
      console.log(error)
    });
  listAll(outcomeRef)
    .then((folder) => {
      console.log("outcomeRef",folder.items)
    }).catch((error) => {
      console.log(error)
    });
}
