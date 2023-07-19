const express = require('express');
const moment = require('moment');
const _ = require('lodash')
module.exports = {
  getForstaAssignmentPage:(req, res)=>{
    forstaCATIReq({url:"/groups",method:"get"},(err,group,r)=>{
      if (err) {
        console.log(err)
      }else {
        console.log(group.value)
        forstaCATIReq({url:"/interviewers",method:"get"},(err,ints)=>{
          console.log(ints)
          // console.log(surveys)
          // console.log(err,r)
          if (err) {
            console.log(err)
          }else {
            res.render("external/forsta-agent-assignment.ejs",{
              groups:group.value,
              title:"Select a project",
              interviewers:ints.value
            })
          }
        })
      }
    })
  },
  setForstaAssignment:(req, res)=>{
    forstaCATIReq({url:"/interviewers("+req.query.interviewerID+")",method:"get"},(err,int)=>{
      // console.log(int)
      let int2={
        "InterviewerId": Number(req.query.interviewerID),
        "Name": int.Name,
        // "Password":"password",
        "Description":"",
        "Location": "",
        "Mode": "Choice",
        "AssignmentsListMode": "AssignedCallsOnly",
        "AllowedTaskChoice": [ "Automatic"],
        "ParentGroups": [ 14,Number(req.query.groupId) ],
        "AutomaticSurveyId": null,
      }
      // console.log(int2)
      forstaCATIReq({url:"/interviewerproperties("+req.query.interviewerID+")",method:"put",data:int2},(err,data,r)=>{
        if (err) {
          console.log(err)
        }else {
          console.log(data)
          res.redirect("https://cati.euro.confirmit.com/catiinterviewer")
        }
      })
    })
  }
}
