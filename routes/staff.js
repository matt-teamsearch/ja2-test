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
  viewStaff: (req, res) => {
    let query =`
    select staffID,staffName,staffEmail,staffJoined,staffLeft,jobTitleName,breatheID,teamupID from staff
    left join JobTitles on JobTitles.jobTitleID=Staff.staffJobTitleID`
    let jobTitleQ="select * from JobTitles WHERE isJobTitleActive=1 and jobTitleID>1"
    db.query(query, (err, result) => {
      if (err) {
        logger.info("failed to get staff for view staff page " + req.user.uName);
      }
      db.query(jobTitleQ, (err, jobTitleR) => {
        if (err) {
          logger.info("Error fetching job titles for staff edit "+req.user.uName);
          console.log(err)
          //res.redirect("/home");
        }else {
          res.render('view-staff.ejs', {
            title: "View Staff"
            ,staff: result.recordset
            ,jobTitles: jobTitleR.recordset
            ,success_msg: req.flash('success_msg')
            ,error_msg: req.flash('error_msg')
          })
        }
      })
    });
  },
  addStaffPage: (req, res) => {
    let jobTitleQ="select * from JobTitles WHERE isJobTitleActive=1"
    let roleQ="select * from Roles"
    db.query(jobTitleQ, (err, jobTitleR) => {
      if (err) {
        logger.info("Error fetching job titles for staff edit "+req.user.uName);
        console.log(err)
        //res.redirect("/home");
      }else {
        db.query(roleQ, (err, roleR) => {
          if (err) {
            logger.info("Error fetching job titles for staff edit "+req.user.uName);
            console.log(err)
            //res.redirect("/home");
          }else {
            console.log(req.params.id)
            var resItems={
              title: "Edit staff member"
              ,jobTitles: jobTitleR.recordset
              ,roles: roleR.recordset
              ,edit: true
              ,staff: []
              ,breatheAgent: []
              ,teamupPlanners: []
              ,teamupColors: []
              ,success_msg: req.flash('success_msg')
              ,error_msg: req.flash('error_msg')
            }
            if (req.params.id) {
              let editQ =`
              select Staff.staffID,staffName,staffEmail,staffJoined,staffLeft,JobTitles.jobTitleID,breatheID,isUserActive,login,roleID,teamupID from staff
              left join JobTitles on JobTitles.jobTitleID=Staff.staffJobTitleID
              left join Users on Users.staffID=Staff.staffID
              WHERE Staff.StaffID=`+req.params.id
              db.query(editQ, (err, editR) => {
                if (err) {
                    logger.info("Error fetching staff member for edit "+req.user.uName);
                    console.log(err)
                    //res.redirect("/home");
                }else {
                  resItems.staff=editR.recordset[0]
                  if (editR.recordset[0].breatheID) {
                    breathReq.get('/employees/'+editR.recordset[0].breatheID).then(response => {
                      teamupReq.get('/subcalendars/').then(tresponse => {
                        resItems.breatheAgent=response.data.employees[0]
                        resItems.teamupPlanners=tresponse.data.subcalendars
                        resItems.teamupColors=lookups.teamupColors
                        res.render('add-staff.ejs', resItems);
                      }).catch(function (err) {
                        resItems.breatheAgent=response.data.employees[0]
                        res.render('add-staff.ejs', resItems);
                      })
                    }).catch(function (err) {
                      console.log(err.request.res.statusMessage)
                      res.render('add-staff.ejs', resItems);
                    });
                  }else {
                    teamupReq.get('/subcalendars/').then(tresponse => {
                      resItems.teamupPlanners=tresponse.data.subcalendars
                      resItems.teamupColors=lookups.teamupColors
                      res.render('add-staff.ejs', resItems);
                    }).catch(function (err) {
                      res.render('add-staff.ejs', resItems);
                    })
                  }
                }
              })
            }else {
              resItems.edit=false
              resItems.title="Add staff member"
              res.render('add-staff.ejs', resItems);
            }
          }
        })
      }
    })
  },
  addStaff: (req, res) => {
    var staffLeft='NULL'
    if (req.body.staffLeft) {
      staffLeft="'"+req.body.staffLeft+"'"
    }
    var isUserActive=0
    if (req.body.isUserActive=='on') {
      isUserActive=1
    }
    var teamup='NULL'
    if (req.body.isUserActive=='on') {
      teamup="'"+req.body.teamup+"'"
    }
    let updateQ=`
    INSERT INTO Staff (staffName,staffEmail,staffJobTitleID,staffJoined,breatheID,teamupID)
    VALUES (@staffName,@staffEmail,`+req.body.jobTitle+`,'`+req.body.staffJoined+`','`+req.body.breatheID+`',`+teamup+`)
    SELECT SCOPE_IDENTITY() as newStaffID`
    db.input('staffName',req.body.staffName)
    db.input('staffEmail',req.body.staffEmail)
    db.query(updateQ, (err, updateR) => {
      if (err) {
        console.log(err,updateQ)
        req.flash('error_msg','Could not add the user. Contact the administrator')
        req.session.save(function () {
          res.redirect('/add-staff/');
        })
      }else {
        let usersQ=`
        INSERT INTO Users (staffID,roleID,isUserActive,login,password)
        VALUES (`+updateR.recordset[0].newStaffID+`, `+req.body.role+`, `+isUserActive+`, @login, HASHBYTES('SHA2_512','password'))`
        db.input('login',req.body.login)
        db.query(usersQ, (err, usersR) => {
          if (err) {
            req.flash('error_msg','Could not add the user. Contact the administrator')
            req.session.save(function () {
              res.redirect('/add-staff/');
            })
          }else {
            req.flash('success_msg','User successfully added')
            req.session.save(function () {
              res.redirect('/view-staff');
            })
          }
        })
      }
    })
  },
  updateStaff: (req, res) => {
    var staffLeft='NULL'
    if (req.body.staffLeft) {
      staffLeft="'"+req.body.staffLeft+"'"
    }
    var isUserActive=0
    if (req.body.isUserActive=='on') {
      isUserActive=1
    }
    var teamup='NULL'
    if (req.body.isUserActive=='on') {
      teamup="'"+req.body.teamup+"'"
    }
    let updateQ=`
    UPDATE Staff SET
    staffName=@staffName,
    staffEmail=@staffEmail,
    staffJobTitleID=`+req.body.jobTitle+`,
    staffJoined='`+req.body.staffJoined+`',
    staffLeft=`+staffLeft+`,
    breatheID='`+req.body.breatheID+`',
    teamupID=`+teamup+`
    WHERE staffID=`+req.body.staffID
    let usersQ=`UPDATE Users SET roleID=`+req.body.role+`,isUserActive=`+isUserActive+` WHERE staffID=`+req.body.staffID
    db.input('login',req.body.login)
    db.input('staffName',req.body.staffName)
    db.input('staffEmail',req.body.staffEmail)
    db.query(updateQ, (err, updateR) => {
      if (err) {
        console.log(err)
        req.flash('error_msg','Could not update the user. Contact the administrator')
        req.session.save(function () {
          res.redirect('/edit-staff/'+req.body.staffID);
        })
      }else {
        db.query(usersQ, (err, usersR) => {
          if (err) {
            console.log(err)
            req.flash('error_msg','Could not update the user. Contact the administrator')
            req.session.save(function () {
              res.redirect('/edit-staff/'+req.body.staffID);
            })
          }else {
            req.flash('success_msg','User has been updated')
            req.session.save(function () {
              res.redirect('/view-staff');
            })
          }
        })
      }
    })
  },
  deleteStaff: (req, res) => {
    let deleteQ=`DELETE FROM Staff WHERE staffID=`+req.params.id
    let usersQ=`DELETE FROM Users WHERE staffID=`+req.params.id
    db.query(deleteQ, (err, updateR) => {
      if (err) {
        console.log(err)
        req.flash('error_msg','Could not delete the user. Contact the administrator')
        req.session.save(function () {
          res.redirect('/edit-staff/'+req.params.id);
        })
      }else {
        db.query(usersQ, (err, usersR) => {
          if (err) {
            console.log(err)
            req.flash('error_msg','Could not delete the user. Contact the administrator')
            req.session.save(function () {
              res.redirect('/edit-staff/'+req.params.id);
            })
          }else {
            req.flash('success_msg','User has been deleted')
            req.session.save(function () {
              res.redirect('/view-staff');
            })
          }
        })
      }
    })
  },
  getTeamup:(req, res) => {
    teamupReq.get('/subcalendars').then(response => {
      console.log(response.data.subcalendars[0])
      res.status(200).send({planners: response.data.subcalendars});
    }).catch(
    function (err) {
      console.log(err)
      res.status(500).send({error: err});
    });
  },
  getStaff:(req, res) => {
    db.query("select * from staff where isnull(staffLeft,'"+req.params.dte+"') >= '"+req.params.dte+"' and staffID>1 and staffJobTitleID>0", (err, staffR) => {
      breathReq.get('/absences/',{
        params: {
          start_date:req.params.dte,
          end_date:req.params.dte
        }
      }).then(function(absences){
        res.send({
          staffs:staffR.recordset,
          absences:absences.data.absences
        })
      })
    })
  },
  viewF2fAgents:(req, res) => {
    db.query("select * from FaceAgents order by agentName ASC", (err, staffR) => {
      db.query("select * from FaceSupervisors order by priorityUsage DESC", (err, supsR) => {
        db.query("select * from FaceSupervisorAreas order by areaPriority ASC", (err, areasR) => {
          res.render('view-f2f-agents.ejs', {
            title:"View F2F Staff",
            agents:staffR.recordset,
            supervisors:supsR.recordset,
            areas:areasR.recordset
            ,success_msg: req.flash('success_msg')
            ,error_msg: req.flash('error_msg')
          });
        })
      })
    })
  },
  addF2fSupervisorPage:(req, res) => {
    let edit=req.params.id>0
    db.query("select * from FaceSupervisors where id="+req.params.id, (err, supsR) => {
      db.query("select * from FaceSupervisorAreas where supervisorID="+req.params.id, (err, areasR) => {
        res.render('add-f2f-supervisor.ejs', {
          title:"View F2F Staff",
          sup:edit?supsR.recordset[0]:[],
          areas:edit?areasR.recordset:[]
        });
      })
    })
  },
  addF2fSupervisor:(req, res) => {
    let data={}
    for (const [key, value] of Object.entries(req.body)) {
      if (!value) {
        data[key]='null'
      }else {
        data[key]=value
      }
      db.input(key,value)
    }
    let insQ=`
    insert into FaceSupervisors
    (supervisorName,isActive,add1,add2,add3,add4,postcode,landlinePhone,mobilePhone,email)
    VALUES
    (@supervisorName,`+(data.isActive=='on'?1:0)+`,@add1,@add2,@add3,@add4,@postcode,@landlinePhone,@mobilePhone,@email)
    select SCOPE_IDENTITY() as id
    `
    db.query("select * from FaceSupervisors where supervisorName='"+data.supervisorName+"'", (err, supsR) => {
      if (err) {
        console.log(err)
      }
      if (supsR.recordset.length>0) {
        req.flash('error_msg','A supervisor already exists with that name')
        req.session.save(function () {
          res.redirect('/add-f2f-supervisor-page/0');
        })
      }else {
        db.query(insQ, (err, insR) => {
          if (err) {
            console.log(err)
          }
          var i=0
          function addAreas(){
            if (i<req.body.areaList.length) {
              db.query("insert into FaceSupervisorAreas (supervisorID,area) VALUES ("+insR.recordset[0].id+",'"+req.body.areaList[i]+"')", (err, insR) => {
                if (err) {
                  console.log(err)
                }
                i++
                addAreas()
              })
            }
          }
          addAreas()
          req.flash('success_msg','Supervisor added')
          req.session.save(function () {
            res.redirect('/view-f2f-agents/');
          })
        })
      }
    })
  },
  updateF2fSupervisor:(req, res) => {
    let data={}
    for (const [key, value] of Object.entries(req.body)) {
      if (!value) {
        data[key]='null'
      }else {
        data[key]=value
      }
      db.input(key,value)
    }
    let updateQ=`
    update FaceSupervisors
    set
    supervisorName=@supervisorName,
    isActive=`+(data.isActive=='on'?1:0)+`,
    add1=@add1,
    add2=@add2,
    add3=@add3,
    add4=@add4,
    postcode=@postcode,
    landlinePhone=@landlinePhone,
    mobilePhone=@mobilePhone,
    email=@email
    where id=`+req.params.id
    db.query("delete from FaceSupervisorAreas where supervisorID="+req.params.id, (err, supsR) => {
      var i=0
      function addAreas(){
        if (i<req.body.areaList.length) {
          db.query("insert into FaceSupervisorAreas (supervisorID,area) VALUES ("+req.params.id+",'"+req.body.areaList[i]+"')", (err, insR) => {
            if (err) {
              console.log(err)
            }
            i++
            addAreas()
          })
        }
      }
      addAreas()
    })
    db.query(updateQ, (err, supsR) => {
      if (err) {
        console.log(err)
        req.flash('error_msg','An error occured. Contact the system administrator')
        req.session.save(function () {
          res.redirect('back');
        })
      }else {
        req.flash('success_msg','Supervisor updated')
        req.session.save(function () {
          res.redirect('/view-f2f-agents/');
        })
      }
    })
  },
  deleteF2fSupervisor:(req, res) => {
    db.query("delete from FaceSupervisorAreas where supervisorID="+req.params.id, (err, supsR) => {
      db.query("delete from FaceSupervisors where id="+req.params.id, (err, supsR) => {
        req.flash('success_msg','Supervisor deleted')
        req.session.save(function () {
          res.redirect('/view-f2f-agents/');
        })
      })
    })
  },
  addF2fAgentPage:(req, res) => {
    let edit=req.params.id>0
    const fs = require('fs');
    db.query("select * from FaceAgents where agentID="+req.params.id, (err, agentR) => {
      db.query("select * from FaceSupervisors where isActive=1", (err, supsR) => {
        db.query("select top 1 * from AllNotes where tableName='FaceAgentWatchlist' and agentID="+req.params.id, (err, wlNoteR) => {
          fs.readdir(publicPath+'/F2F Agents/', (err, files) => {
            res.render('add-f2f-agent.ejs', {
              title:"View F2F Staff",
              agent:edit?agentR.recordset[0]:[],
              sups:supsR.recordset,
              profileImg:files?files.find(el=>el.split(".")[0]==req.params.id.toString()):'',
              watchlistNote:wlNoteR.recordset[0]
              ,success_msg: req.flash('success_msg')
              ,error_msg: req.flash('error_msg')
            });
          })
        })
      })
    })
  },
  deleteF2fAgent:(req, res) => {
    db.query("delete from FaceAgents where agentID="+req.params.id, (err, supsR) => {
      if (err) {
        console.log(err)
        req.flash('error_msg','An error occured. Contact the system administrator')
        req.session.save(function () {
          res.redirect('back');
        })
      }
      req.flash('success_msg','Agent deleted')
      req.session.save(function () {
        res.redirect('/view-f2f-agents/');
      })
    })
  },
  addF2fAgent:(req, res) => {
    let data={}
    for (const [key, value] of Object.entries(req.body)) {
      data[key]=value?value:'null'
      if (key=='badgeIssued') {

        db.input(key,value?new Date(value):null)
      }else {
        db.input(key,value?value:'null')
      }
    }
    let insQ=`
    insert into FaceAgents
    (agentName,isActive,add1,add2,add3,add4,postcode,landlinePhone,mobilePhone,email,supervisorID,badgeID,badgeIssued)
    VALUES
    (@agentName,`+(data.isActive=='on'?1:0)+`,@add1,@add2,@add3,@add4,@postcode,@landlinePhone,@mobilePhone,@email,`+data.supervisorID+`,@badgeID,@badgeIssued)
    select SCOPE_IDENTITY() as id
    `
    db.query("select * from FaceAgents where agentName=@agentName", (err, supsR) => {
      if (err) {
        console.log(err)
      }
      if (supsR.recordset.length>0) {
        req.flash('error_msg','An agent already exists with that name')
        req.session.save(function () {
          res.redirect('/add-f2f-agent/0');
        })
      }else {
        db.query(insQ, (err, insR) => {
          if (err) {
            console.log(err)
          }
          if (req.files) {
            let file=req.files.profileImg
            file.mv(publicPath+'/F2F Agents/'+insR.recordset[0].id+"."+file.name.split(".")[1])
          }
          req.flash('success_msg','Agent added')
          req.session.save(function () {
            res.redirect('/view-f2f-agents/');
          })
        })
      }
    })
  },
  updateF2fAgent:(req, res) => {
    let data={}
    for (const [key, value] of Object.entries(req.body)) {
      data[key]=value?value:'null'
      if (key=='badgeIssued') {
        console.log(value?new Date(value):null)
        db.input(key,value?new Date(value):null)
      }else {
        db.input(key,value?value:null)
      }
    }
    console.log(data)
    let updateQ=`
    update FaceAgents
    set
    agentName=@agentName,
    isActive=`+(data.isActive=='on'?1:0)+`,
    add1=@add1,
    add2=@add2,
    add3=@add3,
    add4=@add4,
    postcode=@postcode,
    landlinePhone=@landlinePhone,
    mobilePhone=@mobilePhone,
    email=@email,
    isWatchlist=`+(data.isWatchlist=='on'?1:0)+`,
    supervisorID=`+data.supervisorID+`,
    badgeID=@badgeID,
    badgeIssued=@badgeIssued
    where agentID=`+req.params.id
    db.query(updateQ, (err, supsR) => {
      if (err) {
        console.log(err,updateQ)
        req.flash('error_msg','An error occured. Contact the system administrator')
        req.session.save(function () {
          res.redirect('back');
        })
      }else {
        if (req.files) {
          let file=req.files.profileImg
          file.mv(publicPath+'/F2F Agents/'+req.params.id+"."+file.name.split(".")[1])
        }
        db.query("delete from AllNotes where agentID="+req.params.id+" and tableName='FaceAgentWatchlist'",(r,err)=>{
          req.flash('success_msg','Agent updated')
          req.session.save(function () {
            res.redirect('/view-f2f-agents/');
          })
          if (data.isWatchlist=='on') {
            db.input('note',data.watchlistNote)
            db.query("insert into AllNotes (note,tableName,agentID) VALUES (@note,'FaceAgentWatchlist',"+req.params.id+")")
          }
        })
      }
    })
  },
};
