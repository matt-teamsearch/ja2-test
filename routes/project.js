const express = require('express');

module.exports = {
  addProjectPage: (req, res) => {
    let query = "SELECT * FROM Clients ORDER BY clientName ASC";
    db.query(query, (err, result) => {
      if (err) {
        //res.redirect("/home");
        logger.info("Error in add addProjectPage",req.user.uName,err)
      }
      db.query("select * from contacts order by contactName", (err, contactsR) => {
        if (err) {
          //res.redirect("/home");
          logger.info("Error in add addProjectPage",req.user.uName,err)
        }
        if (result.recordset.length > 0) {
          res.render('add-project.ejs', {
            title: "Add a new quote"
            ,clients: result.recordset
            ,contacts: contactsR.recordset
            ,message: ''
            ,success_msg: req.flash('success_msg')
            ,error_msg: req.flash('error_msg')
          });
        }
        else {
          logger.info("No clients in add addProjectPage",req.user.uName,db)
          res.render('add-project.ejs', {
            title: "Add a new quote"
            ,clients: []
            ,contacts: contactsR.recordset
            ,message: 'No clients found'
            ,success_msg: req.flash('success_msg')
            ,error_msg: req.flash('error_msg')
          });
        }
      })
    });
  },

  addProject: (req, res) => {
    let message = '';
    let user = req.user.user;
    let cATIPhone = req.body.CATIPhone;
    if (cATIPhone != 1){
      cATIPhone = 0;
    }
    let recruit = req.body.Recruit;
    if (recruit != 1){
      recruit = 0;
    }
    let f2F = req.body.F2F;
    if (f2F != 1){
      f2F = 0;
    }
    let online = req.body.Online;
    if (online != 1){
      online = 0;
    }
    let international = req.body.International;
    if (international != 1){
      international = 0;
    }
    let dataProcessing = req.body.DP;
    if (dataProcessing != 1){
      dataProcessing = 0;
    }
    let audience = req.body.Audience;
    let dateQuoted = req.body.QuoteDate;
    let client = req.body.client;
    let jobName = req.body.jobName.trim();
    let jobNum = req.body.jobNum;
    let cName = req.body.clientName;
    let cEmail = req.body.clientEmail;
    let qNote = req.body.note;
    jobName = jobName.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '');
    cName = cName.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '');
    cEmail = cEmail.replace(/[&\/\\#,+()$~%'":*?<>{}]/g, '');
    qNote = qNote.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '');
    let contID;
    let nID;
    let business = 0;
    let consumer = 0;
    if (audience == 1 || audience == 3){ business = 1};
    if (audience == 2 || audience == 3){ consumer = 1};
    if(cName == ''){
      res.redirect("back");
    } else {
    let dupQ = "SELECT * FROM Quotes WHERE quoteNo = '" + jobNum + "'";
    db.query(dupQ, (err, dupR) => {
      if (err) {
        req.flash('error_msg','Could not add quote. Contact the system administrator')
        req.session.save(function () {
          res.redirect("back");
        })
      }
      if (dupR.recordset.length > 0) {
        req.flash('error_msg','Project Number already exists')
        req.session.save(function () {
          res.redirect('back');
        })
      } else {
        let noteQuery1 = "SELECT * FROM Notes WHERE Notes.noteText = '" + qNote + "'";
        db.query(noteQuery1, (err, nResult) => {
          if (nResult.recordset.length > 0){
            setTimeout(projectInsterQuery, 1000);
            nID = nResult.recordset[0]["noteID"];
          }
          else {
            let noteQuery2 = "INSERT INTO Notes (noteText) VALUES ('" + qNote + "')";
            db.query(noteQuery2, (err, nResult3) => {
              function noteSearch(){
                let noteQuery3 = "SELECT * FROM Notes WHERE Notes.noteText = '" + qNote + "'";
                db.query(noteQuery3, (err, nResult2) => {
                  setTimeout(projectInsterQuery, 1000);
                  nID = nResult2.recordset[0]["noteID"];
                });
              }
              setTimeout(noteSearch, 1000);
            });
          }
        });
        function projectInsterQuery(){
          let clientquery = "SELECT Contacts.contactID FROM Contacts WHERE Contacts.clientID = '" + client + "' AND Contacts.contactName ='" + cName + "'";
          db.query(clientquery, (err, clresult) => {
            if (err) {
              console.log(err)
            }
            if (clresult.recordset.length > 0){
              contID = clresult.recordset[0]["contactID"];
              let query = "INSERT INTO Quotes (quoteNo, quoteName, clientID, contactID, quoteDate, isQuoteAsInternational, isQuoteAsOnline, isQuoteAsFace, isQuoteAsRecruitment, isQuoteAsCATI, isQuoteAsBusiness, isQuoteAsConsumer, isQuoteAsDP, noteID) VALUES ('"
              + jobNum + "', @jobName, '" + client + "', '" + contID + "', '" + dateQuoted + "', '" + international + "', '" + online + "', '" + f2F + "', '" + recruit + "', '" + cATIPhone + "', '" + business + "', '" + consumer + "','" + dataProcessing + "', '" + nID + "')";
              db.input('jobName',jobName.trim())
              db.query(query, (err, result) => {
                if (err)
                {
                  logger.info(req.user.uName + " failed to add a project called " + jobNum + " " + jobName + " ");
                  req.flash('error_msg','Could not add quote. Contact the system administrator')
                  req.session.save(function () {
                    res.redirect("back");
                  })
                }
                else
                {
                  logger.info(req.user.uName + " added a project called " + jobNum + " " + jobName + " ");
                }
                let query = "SELECT * FROM Quotes INNER JOIN Clients ON Quotes.clientID = Clients.clientID WHERE Quotes.quoteNo = '" + jobNum + "' AND Quotes.quoteName = '" + jobName + "' ";
                db.query(query, (err, result) => {
                  if (err) {
                    req.flash('error_msg','Could not add quote. Contact the system administrator')
                    req.session.save(function () {
                      res.redirect("back");
                    })
                  }
                  req.flash('success_msg','Quote added')
                  req.session.save(function () {
                    res.redirect('/add/');
                  })
                });
              });
            } else {
              let clientquery2 = "INSERT INTO Contacts (clientID, contactName, contactRole, contactEmail, contactPhoneNo) VALUES ('" + client + "','" + cName + "' , 'To update', '" + cEmail + "', 'To update')";
              db.query(clientquery2, (err, clresult2) => {
              });
              function nextQuery(){
                let clientquery3 = "SELECT Contacts.contactID FROM Contacts WHERE Contacts.clientID = '" + client + "' AND Contacts.contactName ='" + cName + "'";
                db.query(clientquery3, (err, clresult3) => {
                  contID = clresult3.recordset[0]["contactID"];
                  let query = "INSERT INTO Quotes (quoteNo, quoteName, clientID, contactID, quoteDate, isQuoteAsInternational, isQuoteAsOnline, isQuoteAsFace, isQuoteAsRecruitment, isQuoteAsCATI, isQuoteAsBusiness, isQuoteAsConsumer, isQuoteAsDP, noteID) VALUES ('"
                  + jobNum + "', '" + jobName + "', '" + client + "', '" + contID + "', '" + dateQuoted + "', '" + international + "', '" + online + "', '" + f2F + "', '" + recruit + "', '" + cATIPhone + "', '" + business + "', '" + consumer + "','" + dataProcessing + "', '" + nID + "')";
                  db.query(query, (err, result) => {
                    if (err)
                    {
                      logger.info(req.user.uName + " failed to add a project called " + jobNum + " " + jobName + " ");
                      //res.redirect("/home");
                    }
                    else
                    {
                      logger.info(req.user.uName + " added a project called " + jobNum + " " + jobName + " ");
                      //res.redirect("/home");
                    }
                    let query = "SELECT * FROM Quotes INNER JOIN Clients ON Quotes.clientID = Clients.clientID WHERE Quotes.quoteNo = '" + jobNum + "' AND Quotes.quoteName = '" + jobName + "' ";
                    db.query(query, (err, result) => {
                      if (err) {
                        //res.redirect("/home");
                      }
                      req.flash('success_msg','Quote added')
                      req.session.save(function () {
                        res.redirect('/add/');
                      })
                    });
                  });
                });
              }
              setTimeout (nextQuery, 1000);
            }
          });
        }
      }
    });
  }
  },

  editProjectPage: (req, res) => {
    let qID = req.params.id;
    let dPQuery = "SELECT Staff.staffID, Staff.staffName FROM Staff WHERE (Staff.staffJobTitleID = 6) AND Staff.staffLeft IS NULL ORDER BY Staff.staffName ASC";
    let tLQuery = "SELECT Staff.staffID, Staff.staffName FROM Staff WHERE (Staff.staffJobTitleID = 8) AND Staff.staffLeft IS NULL ORDER BY Staff.staffName ASC";
    let cMQuery = "SELECT Staff.staffID, Staff.staffName FROM Staff WHERE (Staff.staffJobTitleID = 5 OR Staff.staffJobTitleID = 2) AND Staff.staffLeft IS NULL ORDER BY Staff.staffName ASC";
    let projectQuery =
          `SELECT Projects.projectID,
                   Projects.projectCM,
                   Projects.projectDP,
                   Projects.projectTL,
                   Projects.projectGrade,
                   isnull(Projects.setupCost,0) as setupCost,
                   isnull(Projects.dataCost,0) as dataCost,
                   isnull(Projects.sampleCost,0) as sampleCost,
                   isnull(Projects.codingCost,0) as codingCost,
                   Projects.verbsCodingNumber,
                   Projects.quotedIR,
                   Projects.finalIR,
                   Projects.isProjectCommissioned,
                   Projects.isProjectLive,
                   Projects.isProjectClosed,
                   Projects.isProjectCancelled,
                   Projects.sampleRatio,
                   Projects.sampleSupplier,
                   Projects.isProjectIdentified,
                   Projects.csatID,
                   Projects.repeatOf,
                   Projects.codingRequired,
                   Projects.tabsRequired,
                   Projects.inboundLineID,
                   isnull(Projects.clientPO,'') as clientPO,
                   Quotes.quoteID,
                   Quotes.quoteNo,
                   Quotes.quoteName,
                   Quotes.clientID,
                   Quotes.contactID,
                   Quotes.quoteDate,
                   Quotes.commissionDate,
                   Quotes.isQuoteAsBusiness,
                   Quotes.isQuoteAsConsumer,
                   Quotes.isQuoteAsCATI,
                   Quotes.isQuoteAsRecruitment,
                   Quotes.isQuoteAsFace,
                   Quotes.isQuoteAsOnline,
                   Quotes.isQuoteAsInternational,
                   Quotes.isQuoteAsDP,
                   Clients.clientName,
                   Contacts.contactName,
                   Contacts.contactRole,
                   Contacts.contactEmail,
                   Contacts.contactPhoneNo,
                   Notes.noteText
            FROM   Clients,
                   Contacts,
                   Notes,
                   Quotes
                   LEFT JOIN Projects
                          ON Quotes.quoteID = Projects.quoteID
            WHERE  Quotes.clientID = Clients.clientID
                   AND Quotes.contactID = Contacts.contactID
                   AND Quotes.noteID = Notes.noteID
                   AND Quotes.quoteID = '` + qID + `' `
    let jobQuery =
          `SELECT * from Jobs left join projects on projects.projectID=jobs.projectID where quoteID='` + qID + `' `
    let clientQuery = "SELECT * FROM Clients WHERE clientID>1 ORDER BY clientName ASC";
    let contactQuery = "SELECT * FROM Contacts WHERE contactID>1 ORDER BY clientID, contactName ASC";
    let staffQuery = "SELECT * FROM Staff WHERE StaffID>1 ORDER BY staffName ASC";
    let idQ=`
    IF (NOT EXISTS (SELECT *
       FROM tempdb.INFORMATION_SCHEMA.TABLES
       WHERE TABLE_NAME = '##tempProjectIds'))
    BEGIN
      select projectID into ##tempProjectIds from Projects
    END
    SET IDENTITY_INSERT ##tempProjectIds ON
    insert into ##tempProjectIds (projectID) select max(projectID)+1 from ##tempProjectIds
    SET IDENTITY_INSERT ##tempProjectIds OFF
    select max(projectID) as projectID from ##tempProjectIds`
    let failed = false
    db.query(clientQuery, (err, clientResult) => {
      if (err) {
        console.log(err)
        failed = true
      }
      db.query(jobQuery, (err, resultJ) => {
        if (err) {
          console.log(err)
          failed = true
        }
        db.query(projectQuery, (err, resultP) => {
          if (err) {
            console.log(err)
            failed = true
          }
          db.query(dPQuery, (err, resultDP) => {
            if (err) {
              console.log(err)
              failed = true
            }
            db.query(tLQuery, (err, resultTL) => {
              if (err) {
                console.log(err)
                failed = true
              }
              db.query(cMQuery, (err, resultCM) => {
                if (err) {
                  console.log(err)
                  failed = true
                }
                db.query(contactQuery, (err, resultContact) => {
                  if (err) {
                    console.log(err)
                    failed = true
                  }
                  db.query(staffQuery, (err,staffR) => {
                    if (err) {
                      console.log(err)
                      failed = true
                    }
                    if(failed){
                      logger.info(req.user.uName + " failed to edit project with id "+ qID)
                      res.redirect("/500")
                    } else {
                      var pID=resultP.recordset[0].projectID
                      function getpID(){
                        if (!pID) {
                          paddQ="insert into Projects (quoteID) VALUES ("+qID+") SELECT SCOPE_IDENTITY() as id"
                          db.query(paddQ, (err, paddR) => {
                            pID=paddR.recordset[0].id
                            getpID()
                          })
                        }else {
                          let cpiQ="select * from JobCPIs left join ProjectCosts on ProjectCosts.costID=JobCPIs.costID WHERE projectID="+pID
                          let costsQ=`
                          select costID,costName,unitValue,units,ProjectCosts.costTypeID,costTypeName,costTypeCategory
                          from ProjectCosts
                          left join CostTypes on CostTypes.CostTypeID=ProjectCosts.CostTypeID
                          WHERE ProjectCosts.ProjectID=`+pID
                          let notesQ=`SELECT * FROM AllNotes WHERE jobID=`+pID
                          let datesQ=`SELECT * FROM ProjectDates WHERE projectID=`+pID
                          let dataQ=`SELECT * FROM DataFormats
                          left join ProjectDataFormats on ProjectDataFormats.projectID=`+pID+` AND ProjectDataFormats.dataFormatID=DataFormats.dataFormatID`
                          let allProjQ=`select * from quotes left join projects on projects.quoteID=quotes.quoteID where projectID<>`+pID
                          db.query(cpiQ, (err, cpiR) => {
                            db.query(costsQ, (err, costsR) => {
                              db.query(notesQ, (err, notesR) => {
                                db.query(datesQ, (err, datesR) => {
                                  db.query(dataQ, (err, dataR) => {
                                    db.query(allProjQ, (err, allProjR) => {
                                      let renders={
                                        title: "Edit - "+resultP.recordset[0].quoteNo+" "+resultP.recordset[0].quoteName
                                        ,project: resultP.recordset
                                        ,ProductionManagers: resultDP.recordset
                                        ,TeamLeaders: resultTL.recordset
                                        ,ClientManagers: resultCM.recordset
                                        ,jobs: resultJ.recordset
                                        ,clients: clientResult.recordset
                                        ,contacts: resultContact.recordset
                                        ,projectID: pID
                                        ,cpis: cpiR.recordset
                                        ,costs: costsR.recordset
                                        ,notes: notesR.recordset
                                        ,staff:staffR.recordset
                                        ,dataFormats:dataR.recordset
                                        ,dates:datesR.recordset
                                        ,allProjects:allProjR.recordset
                                        ,success_msg: req.flash('success_msg')
                                        ,error_msg: req.flash('error_msg')
                                        ,message: ''
                                      }
                                      rcPlatform.get('/restapi/v1.0/account/~/phone-number',{perPage:500}).then(function(resp){
                                        rcPlatform.get("/restapi/v1.0/account/~/extension/",{perPage:1000}).then(function(extensions){
                                          extensions.json().then(function(ext){
                                            resp.json().then(function(nums){
                                              renders.lines=nums.records.filter(el=>el.paymentType=='TollFree').map(el=>{el.extension=ext.records.find(e=>e.id==el.extension.id); return el})
                                              res.render('edit-project.ejs',renders);
                                            })
                                          })
                                        }).catch(function(err){
                                          renders.lines=null
                                          res.render('edit-project.ejs',renders);
                                          console.log(err)
                                        })
                                      }).catch(function(err){
                                        renders.lines=null
                                        res.render('edit-project.ejs',renders);
                                        console.log(err)
                                      })
                                    })
                                  })
                                })
                              })
                            })
                          })
                        }
                      }
                      getpID()
                    }
                  })
                })
              });
            });
          });
        });
      });
    });
  },

  editProject: (req, res) => {
    let user = req.user.user;
    let pStatus = req.body.projectStatus;
    let projectCom = 0;
    let projectLive = 0;
    let projectClosed = 0;
    let projectCancelled = 0;
    if( pStatus == 1){ projectCom = 1 };
    if( pStatus == 2){ projectLive = 1 };
    if( pStatus == 3){ projectClosed = 1 };
    if( pStatus == 4){ projectCancelled = 1 };
    let quoteIR = req.body.qIR;
    let closeIR = req.body.cIR;
    let projCM = req.body.leadCM;
    let projDP = req.body.leadDP;
    let projTL = req.body.leadTL;
    let scriptCost = req.body.setupCost;
    let dataCost = req.body.dataCost;
    let sampCost = req.body.sampleCost;
    let codeCost = req.body.codingCost;
    let qName = req.body.quoteName;
    let qNum = req.body.quoteNum;
    let quoteID = req.params.id;
    let pID=req.body.projectID
    let cATIPhone = 1;
    if (req.body.CATIPhone != 'on'){
      cATIPhone = 0;
    }
    let recruit = 1;
    if (req.body.Recruit != 'on'){
      recruit = 0;
    }
    let f2F = 1;
    if (req.body.F2F != 'on'){
      f2F = 0;
    }
    let online = 1;
    if (req.body.Online != 'on'){
      online = 0;
    }
    let international = 1;
    if (req.body.International != 'on'){
      international = 0;
    }
    let dataProcessing = 1;
    if (req.body.DP != 'on'){
      dataProcessing = 0;
    }
    let intentified = 1;
    if (req.body.intentified != 'on'){
      intentified = 0;
    }
    let tabsRequired = 1;
    if (req.body.tabsRequired != 'on'){
      tabsRequired = 0;
    }
    let codingRequired = 1;
    if (req.body.codingRequired != 'on'){
      codingRequired = 0;
    }
    let dataFormats=req.body.dataFormats
    if (typeof req.body.dataFormats==="string") {
      dataFormats=[req.body.dataFormats]
    }
    let sampleRatio=req.body.sampleRatio?req.body.sampleRatio:NULL
    let audience = req.body.Audience;
    let business = 0;
    let consumer = 0;
    if (audience == 1 || audience == 3){ business = 1};
    if (audience == 2 || audience == 3){ consumer = 1};
    let updateCheckQuery = "SELECT * FROM Projects WHERE quoteID = '" + quoteID + "'";
    let updateDataQuery = "UPDATE Projects SET isProjectCommissioned = '" + projectCom + "', isProjectLive = '" + projectLive + "', isProjectClosed = '" + projectClosed + "', isProjectCancelled = '" + projectCancelled + "', projectCM = '" + projCM + "', projectDP = '" + projDP + "', projectTL = '" + projTL + "', setupCost = '" + scriptCost + "', dataCost = '" + dataCost + "', sampleCost = '" + sampCost + "', codingCost = '" + codeCost + "' , quotedIR = '" + quoteIR + "', finalIR = '" + closeIR + "', verbsCodingNumber = 0, sampleSupplier='"+req.body.sampleSupplier+"', sampleRatio="+sampleRatio+", isProjectIdentified="+intentified+", codingRequired="+codingRequired+", tabsRequired="+tabsRequired+", csatID='"+req.body.csatID+"' WHERE quoteID = '" + quoteID + "'";
    let updateQuoteQuery = "UPDATE Quotes SET quoteNo = '" + qNum + "', quoteName = @qName, isQuoteAsCATI = '" + cATIPhone + "', isQuoteAsBusiness = '" + business + "', isQuoteAsFace = '" + f2F + "', isQuoteAsConsumer = '" + consumer + "', isQuoteAsRecruitment = '" + recruit + "', isQuoteAsOnline = '" + online + "', isQuoteAsInternational = '" + international + "', isQuoteAsDP = '" + dataProcessing + "', clientID="+req.body.Client.split("-")[0]+", contactID="+req.body.Client.split("-")[1]+" WHERE quoteID = '" + quoteID + "'";
    db.input('qName',qName)
    db.query(updateQuoteQuery, (err, qresult) =>{
      if (err) {
        console.log(err)
        console.log(updateQuoteQuery)
        logger.info(err)
        logger.info(updateDataQuery)
        req.flash('error_msg','Error editing quote information. Contact the administrator.')
        req.session.save(function () {
          res.redirect('back')
        })
      }
      db.query(updateDataQuery, (err,result2) => {
        if (err){
          console.log(err)
          console.log(updateDataQuery)
          logger.info(req.user.uName + " failed to update a project with the quote ID " + quoteID );
          logger.info(err)
          logger.info(updateDataQuery)
          req.flash('error_msg','Error editing project information. Contact the administrator.')
          req.session.save(function () {
            res.redirect('back')
          })
        }else{
          let notesDelQ="DELETE FROM AllNotes WHERE tableName='Projects' AND jobID="+pID+" AND page='edit'"
          let dfDelQ="DELETE FROM ProjectDataFormats WHERE projectID="+pID
          db.query(notesDelQ+dfDelQ, (err,notesDelR) => {
            var i=0
            function addNotes(){
              if (i<req.body.projectNotes.length) {
                let notesAddQ="INSERT INTO AllNotes (tableName,jobID,page,otherID,note) VALUES ('Projects',"+pID+",'edit',"+i+",@note)"
                db.input("note",req.body.projectNotes[i])
                db.query(notesAddQ, (err,notesR) => {
                  if (err) {
                    console.log(err)
                    console.log(notesDelQ)
                    console.log(notesAddQ)
                    req.flash('error_msg','Error editing project notes. Contact the administrator.')
                    req.session.save(function () {
                      res.redirect('back')
                    })
                  }else {
                    i++
                    addNotes()
                  }
                })
              }else{
                i=0
                function addDataFormats(){
                  if (i<dataFormats.length) {
                    let dfAddQ="INSERT INTO ProjectDataFormats (projectID,dataFormatID) VALUES ("+pID+","+dataFormats[i]+")"
                    db.query(dfAddQ, (err,dfR) => {
                      if (err) {
                        console.log(err)
                        console.log(dfDelQ)
                        console.log(dfAddQ)
                        req.flash('error_msg','Error editing data formats. Contact the administrator.')
                        req.session.save(function () {
                          res.redirect('back')
                        })
                      }else {
                        i++
                        addDataFormats()
                      }
                    })
                  }else {
                    req.flash('success_msg','Project updated')
                    req.session.save(function () {
                      res.redirect('/overview/'+quoteID)
                    })
                  }
                }
                addDataFormats()
              }
            }
            addNotes()
          })
        }
      });
    })
  },
  addProjectDate:(req,res)=>{
    let query=""
    let dateVal='NULL'
    let endateVal='NULL'
    if (req.body[0].dateValue!=="") {
      dateVal="'"+req.body[0].dateValue+"'"
    }
    if (req.body[0].endDate) {
      endateVal="'"+req.body[0].endDate+"'"
    }
    query=`INSERT INTO ProjectDates (dateName,dateValue,projectID,datePos,endDate) VALUES (@dateName,`+dateVal+`,`+req.body[0].projectID+`,`+req.body[0].datePos+`,`+endateVal+`) SELECT SCOPE_IDENTITY() as id`
    console.log(query)
    db.input('dateName',req.body[0].dateName)
    db.query(query, (err, resp) =>{
      if (err) {
        res.status(500).send({error: 'Failed to update'})
        console.log(err)
        console.log(query)
      }else {
        res.status(200).send(resp.recordset[0])
      }
    })
  },
  getJobFolder:(req,res)=>{
    let jobName=req.body.quoteNo+" "+req.body.quoteName
    dropboxReq.defaults.headers.common['Dropbox-API-Arg'] = JSON.stringify({"path": "/Skeletal Job folder"})
    dropboxReq.defaults.responseType='stream'
    const fs = require('fs');
    const fsx = require("fs-extra");
    const archiver = require('archiver');
    const DecompressZip = require('decompress-zip');
    const archive = archiver('zip');
    const sanitize = require("sanitize-filename");
    dropboxReq.post('/2/files/download_zip').then(response => {
      response.data.pipe(fs.createWriteStream(publicPath + '/temp/'+sanitize(jobName)+'/TEMPjobfolder.zip')).on('finish',(err)=> {
        if (err) {
          console.log(err)
          logger.info(err)
          res.status(500).send({error:"Error creating job folder. Contact the administrator"})
        }
        let unzipper = new DecompressZip(publicPath + '/temp/'+sanitize(jobName)+'/TEMPjobfolder.zip');
        unzipper.on('error', function (err) {
          console.log(err);
          logger.info(err)
          res.status(500).send({error:"Error creating job folder. Contact the administrator"})
        });
        unzipper.on('extract', function (log) {
          fs.rename(publicPath+'/temp/'+jobName+'/'+sanitize(jobName)+' - Teamsearch Project Commission Contract.docx', publicPath + '/temp/'+sanitize(jobName)+'/TEMPjobfolder/Skeletal Job folder/Job details/'+sanitize(jobName)+' - Teamsearch Project Commission Contract.docx', (err) => {
            if (err){
              console.log(err)
              logger.info(err)
              res.status(500).send({error:"Error creating job folder. Contact the administrator"})
            }
            fs.unlink(publicPath + '/temp/'+sanitize(jobName)+'/TEMPjobfolder/Skeletal Job folder/Job details/TEMPLATE - Project Confirmation Form (Autocommission).xlsx', (err) => {
              fs.unlink(publicPath + '/temp/'+sanitize(jobName)+'/TEMPjobfolder/Skeletal Job folder/Job details/Teamsearch Project Commission Contract (autocommission).docx', (err) => {
                fs.unlink(publicPath + '/temp/'+sanitize(jobName)+'/TEMPjobfolder/Skeletal Job folder/Job details/Teamsearch Project Commission Contract.docx', (err) => {
                  let output = fs.createWriteStream(publicPath + '/temp/'+sanitize(jobName)+'/TEMPjobfolder/'+sanitize(jobName)+'.zip');
                  output.on('close', function() {
                    res.status(200).send('/temp/'+sanitize(jobName)+'/TEMPjobfolder/'+sanitize(jobName)+'.zip')
                  });
                  archive.on('error', function(err){
                    console.log(err)
                    logger.info(err)
                    res.status(500).send({error:"Error creating job folder. Contact the administrator"})
                  });
                  archive.pipe(output)
                  archive.directory(publicPath + '/temp/'+sanitize(jobName)+'/TEMPjobfolder/Skeletal Job folder/', sanitize(jobName));
                  archive.finalize()
                })
              })
            })
          })
        })
        unzipper.extract({
          path: publicPath + '/temp/'+sanitize(jobName)+'/TEMPjobfolder/',
          restrict:false,
          filter: function (file) {
            return true;
          }
        })
      })
    }).catch(e=>{
      console.log(e)
      logger.info(e)
      res.status(500).send({error:"Error creating job folder. Contact the administrator"})
    })
  },
  createContract:(req,res)=>{
    var PizZip = require('pizzip');
    var Docxtemplater = require('docxtemplater');
    var ImageModule = require('docxtemplater-image-module-free');
    var opts = {}
    opts.centered = false; //Set to true to always center images
    opts.fileType = "docx"; //Or pptx
    //Pass your image loader
    opts.getImage = function(tagValue, tagName) {
        //tagValue is 'examples/image.png'
        //tagName is 'image'
        console.log(tagValue)
        return fs.readFileSync(tagValue);
    }

    //Pass the function that return image size
    opts.getSize = function(img, tagValue, tagName) {
        //img is the image returned by opts.getImage()
        //tagValue is 'examples/image.png'
        //tagName is 'image'
        //tip: you can use node module 'image-size' here
        return [150, 150];
    }
    const fs = require('fs');
    const fsx = require("fs-extra");
    const sanitize = require("sanitize-filename");
    let jobName=sanitize(req.body.data['XProject_number_XProject_name'])
    function replaceErrors(key, value) {
    if (value instanceof Error) {
        return Object.getOwnPropertyNames(value).reduce(function(error, key) {
            error[key] = value[key];
            return error;
        }, {});
      }
      return value;
    }

    function errorHandler(error) {
        console.log(JSON.stringify({error: error}, replaceErrors));
        if (error.properties && error.properties.errors instanceof Array) {
            const errorMessages = error.properties.errors.map(function (error) {
                return error.properties.explanation;
            }).join("\n");
            console.log('errorMessages', errorMessages);
            // errorMessages is a humanly readable message looking like this:
            // 'The tag beginning with "foobar" is unopened'
        }
        throw error;
    }
    // Load the docx file as binary content
    dropboxReq.defaults.headers.common['Dropbox-API-Arg'] = JSON.stringify({"path": "/Skeletal Job folder/Job details/Teamsearch Project Commission Contract (autocommission).docx"})
    dropboxReq.defaults.responseType='stream'
    db.query("select * from Staff s left join JobTitles j on j.jobTitleID=s.staffJobTitleID where StaffID="+req.body.data.cmID,(err,pm)=>{
      db.query("select * from Contacts LEFT JOIN Clients on Clients.clientID=Contacts.ClientID where ContactID="+req.body.data.XClient_PM,(err,client)=>{
        dropboxReq.post('/2/files/download').then(response => {
          fs.mkdir(publicPath + '/temp/'+jobName, { recursive: true }, (err) => {
            if (err) {
              console.log(err)
              logger.info(err)
              res.status(500).send({error:"Error creating Commission Contract. Contact the administrator"})
            }else {
              var writeStream=fs.createWriteStream(publicPath + '/temp/'+jobName+'/Teamsearch Project Commission Contract (autocommission).docx')
              response.data.pipe(writeStream).on('finish',(err)=> {
                if (err) {
                  console.log("error on pipe",err)
                  res.status(500).send({error:"Error creating Commission Contract. Contact the administrator"})
                }
                var content
                try{
                  content = fs.readFileSync(publicPath + '/temp/'+jobName+'/Teamsearch Project Commission Contract (autocommission).docx', 'binary');
                }catch(err){
                  res.status(500).send({error:"Error creating Commission Contract. Contact the administrator"})
                }
                var zip = new PizZip(content);
                var doc;

                try {
                  doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, modules: [new ImageModule(opts)]})
                } catch(error) {
                  // Catch compilation errors (errors caused by the compilation of the template: misplaced tags)
                  errorHandler(error);
                }

                //set the templateVariables
                req.body.data.clientPM=client.recordset[0].contactName
                req.body.data.XPM=pm.recordset[0].staffName
                req.body.data.cmJobTitle=pm.recordset[0].jobTitleName
                req.body.data.cmSignature= publicPath+'/blank-user.jpg'
                doc.setData(req.body.data);

                try {
                  // render the document (replace all occurences of {first_name} by John, {last_name} by Doe, ...)
                  doc.render()
                }
                catch (error) {
                  // Catch rendering errors (errors relating to the rendering of the template: angularParser throws an error)
                  errorHandler(error);
                }

                var buf = doc.getZip()
                .generate({type: 'nodebuffer'});

                // buf is a nodejs buffer, you can either write it to a file or do anything else with it.
                fs.mkdir(publicPath + '/temp/'+jobName, { recursive: true }, (err) => {
                  if (err) {
                    console.log(err)
                    logger.info(err)
                    res.status(500).send({error:"Error creating Commission Contract. Contact the administrator"})
                  }else {
                    fs.writeFileSync(publicPath + '/temp/'+jobName+'/'+jobName+' - Teamsearch Project Commission Contract.docx', buf);
                    res.send('/temp/'+jobName+'/'+jobName+' - Teamsearch Project Commission Contract.docx')
                  }
                })
              })
            }
          })
        }).catch(function (error) {
          console.log(error);
          res.status(500).send({error:"Error creating Commission Contract. Contact the administrator"})
        })
      })
    })
  },
  createPCform:(req,res)=>{
    const ExcelJS = require('exceljs');
    const fs = require('fs');
    const fsx = require("fs-extra");
    const sanitize = require("sanitize-filename");
    db.query("select * from Staff where StaffID="+req.body.data.XPM,(err,pm)=>{
      db.query("select * from Contacts LEFT JOIN Clients on Clients.clientID=Contacts.ClientID where ContactID="+req.body.data.XClient_PM,(err,client)=>{
        req.body.data.XPM=pm.recordset[0].staffName+", "+pm.recordset[0].staffEmail+", 01422 360 371"
        req.body.data.XClient_PM=client.recordset[0].contactName+" - "+client.recordset[0].contactEmail
        dropboxReq.defaults.headers.common['Dropbox-API-Arg'] = JSON.stringify({"path": "/Skeletal Job folder/Job details/TEMPLATE - Project Confirmation Form (Autocommission).xlsx"})
        dropboxReq.defaults.responseType='stream'
        dropboxReq.post('/2/files/download').then(response => {
          const workbook = new ExcelJS.Workbook();
          workbook.xlsx.read(response.data).then(function(){
            const worksheet = workbook.getWorksheet('Proj Confirmation');
            var rowNum=0
            var cellNum=0
            var rowsToRemove=[]
            worksheet.eachRow(function (row) {
              var cell=row.getCell(1)
              var i=0
              function addLRborders(length,startRow){
                if (i<length) {
                  worksheet.getRow(startRow+i).getCell(1).style.border = {
                    left: {style:'thick'}
                  };
                  worksheet.getRow(startRow+i).getCell(6).style.border = {
                    right: {style:'thick'}
                  };
                  i++
                  addLRborders(length,startRow)
                }
              }
              if (row.getCell(2).name=="XsumFormulas") {
                row.getCell(2).value=""
              }
              if (cell.name=="XDateRowsStart") {
                worksheet.insertRows(row._number+1, req.body.dates, 'i');
                addLRborders(req.body.dates.length,row._number+1)
              }else if (cell.name=="XCostRowsStart") {
                worksheet.insertRows(row._number+1, req.body.costs, 'i');
                addLRborders(req.body.costs.length,row._number+1)
              }
            })
            var i=1
            function removeRows(){
              var row=worksheet.getRow(i)
              if (i<worksheet.rowCount) {
                var cell=row.getCell(1)
                if (cell.name=="XCostRows" || cell.name=="XDateRows" || cell.name=="XCostRowsStart" || cell.name=="XDateRowsStart") {
                  worksheet.spliceRows(i, 1)
                  i=1
                  removeRows()
                }else {
                  i++
                  removeRows()
                }
              }
            }
            removeRows()
            var mergeCells=[]
            worksheet.eachRow(function (row) {
              var cellNum=1
              row.eachCell(function (cell) {
                if (cell.name) {
                  if (cell.name==("XclientSat")) {
                    // worksheet.unMergeCells(row.getCell(cellNum+1).address)
                    // worksheet.unMergeCells(row.getCell(cellNum+2).address)
                    // worksheet.unMergeCells(row.getCell(cellNum+3).address)
                    // worksheet.unMergeCells(row.getCell(cellNum+4).address)
                    // worksheet.unMergeCells(row.getCell(cellNum+5).address)
                    // console.log("unmerged",row.getCell(cellNum+1).address,row.getCell(cellNum+5).address)
                    // mergeCells.push({start:row.getCell(cellNum+1).address,end:row.getCell(cellNum+5).address,data:{
                    //   start:row.getCell(cellNum+1),
                    //   end:row.getCell(cellNum+5)
                    // }})
                  }else{
                    cell.value=req.body.data[cell.name]
                  }
                  cell.removeName(cell.name);
                }
                cellNum++
              });
            });
            var i=0
            function mergeFoundCells(){
              if (i<mergeCells.length) {
                console.log(mergeCells[i].start,mergeCells[i].end)
                worksheet.mergeCells(mergeCells[i].start,mergeCells[i].end);
                worksheet.getCell(mergeCells[i].start).style.border = {
                  right: {style:'thick'},
                  left: {style:'thick'},
                  top: {style:'thick'},
                };
                i++
                mergeFoundCells()
              }
            }
            // mergeFoundCells()
            async function writePCform(){
              await workbook.xlsx.writeFile(publicPath + '/temp/'+sanitize(req.body.data['XProject_number_XProject_name'])+'/'+sanitize(req.body.data['XProject_number_XProject_name'])+' - Project Confirmation Form.xlsx');
              res.send('/temp/'+sanitize(req.body.data['XProject_number_XProject_name'])+'/'+sanitize(req.body.data['XProject_number_XProject_name'])+' - Project Confirmation Form.xlsx')
            }
            fs.mkdir(publicPath + '/temp/'+sanitize(req.body.data['XProject_number_XProject_name']), { recursive: true }, (err) => {
              if (err) {
                console.log(err)
                logger.info(err)
                res.status(500).send({error:"Error creating PC form. Contact the administrator"})
              }else {
                writePCform()
              }
            })
          })
        })
      })
    })
  },
  addProjectToPD:(req,res)=>{
    const axios = require('axios');
    var shifts=Object.keys(req.body)
    var i=0
    function sendRequests(){
      if (i<shifts.length) {
        var n=0
        var url='https://docs.google.com/forms/d/e/1FAIpQLSdhOkkXe3JeJ8eVQIQmz_59eK4Nj75smIeN14yQRQk2UEQCcA/formResponse'
        axios.get(url,{ params: req.body[shifts[i]] }).then(function (response) {
          i++
          sendRequests()
        }).catch(function (error) {
          res.sendStatus(500).send(error)
          console.log(error);
        })
      }else {
        res.send('success')
      }
    }
    sendRequests()
  },
  editQuotePage: (req, res) =>{
      let quoteID = req.params.id;
      let quoteQuery = "SELECT * FROM Notes, Quotes, Contacts WHERE Quotes.quoteID = " + quoteID + " AND Notes.noteID = Quotes.noteID AND Contacts.contactID = Quotes.contactID";
      let clientQuery = "SELECT * FROM Clients order by clientName ASC"
      let contactQuery = "select * from contacts order by contactName"
      db.query(quoteQuery, (err, result) =>{
        db.query(clientQuery, (err, clients) =>{
          db.query(contactQuery, (err, contacts) =>{
            console.log(result.recordset)
            res.render("edit-quote.ejs", {
              title: "Edit Quote",
              message: "",
              project: result.recordset,
              clients: clients.recordset,
              contacts: contacts.recordset
            });
          })
        });
      });
  },

  editQuote: (req, res) => {
    let quoteID = req.params.id;
    let noteID = 0;
    let message = '';
    let user = req.user.user;
    let cATIPhone = req.body.CATIPhone;
    if (cATIPhone != 1){
      cATIPhone = 0;
    }
    let recruit = req.body.Recruit;
    if (recruit != 1){
      recruit = 0;
    }
    let f2F = req.body.F2F;
    if (f2F != 1){
      f2F = 0;
    }
    let online = req.body.Online;
    if (online != 1){
      online = 0;
    }
    let international = req.body.International;
    if (international != 1){
      international = 0;
    }
    let dataProcessing = req.body.DP;
    if (dataProcessing != 1){
      dataProcessing = 0;
    }
    let audience = req.body.Audience;
    let dateQuoted = req.body.QuoteDate;
    let client = req.body.client;
    let jobName = req.body.quoteName;
    let jobNum = req.body.quoteNum;
    let cName = req.body.clientName;
    let cEmail = req.body.clientEmail;
    let chaseOutcome = req.body.chaseOutcome?req.body.chaseOutcome:null;
    jobName = jobName.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '');
    cName = cName.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '');
    cEmail = cEmail.replace(/[&\/\\#,+()$~%'":*?<>{}]/g, '');
    let contID = req.body.contact;
    let business = 0;
    let consumer = 0;
    if (audience == 1 || audience == 3){ business = 1};
    if (audience == 2 || audience == 3){ consumer = 1};
    let updateQuoteQuery=""
    console.log(contID)
    if (contID) {
      updateQuoteQuery = "UPDATE Quotes SET quoteNo = '"+ jobNum + "', quoteName = '"+ jobName + "' , clientID = "+ client + " , contactID = " + contID + " , isQuoteAsBusiness = "+ business + " , isQuoteAsConsumer = "+ consumer + " , isQuoteAsFace = "+ f2F + " , isQuoteAsRecruitment = "+ recruit + " , isQuoteAsInternational = "+ international + " , isQuoteAsOnline = "+ online + " , isQuoteAsCATI = "+ cATIPhone + " , isQuoteAsDP = "+ dataProcessing + ", chaseOutcome=@chaseOutcome WHERE Quotes.quoteID = " + quoteID + " "
      console.log("using existing contact",updateQuoteQuery)
      db.input('chaseOutcome',chaseOutcome)
      db.query(updateQuoteQuery, (err, result)=>{
        if(err) {
          console.log(err,updateQuoteQuery)
        }
        res.redirect('/overview/'+quoteID);
      })
    }else {
      db.input('contactName',cName)
      db.input('contactEmail',cEmail)
      db.input('chaseOutcome',chaseOutcome)
      db.query("insert into contacts (clientID,contactName,contactEmail)VALUES ("+client+",@contactName,@contactEmail); select SCOPE_IDENTITY() as id",(err,contactR)=>{
        if (err) {
          console.log(err,client)
        }
        updateQuoteQuery = "UPDATE Quotes SET quoteNo = '"+ jobNum + "', quoteName = '"+ jobName + "' , clientID = "+ client + " , contactID = " + contactR.recordset[0].id + " , isQuoteAsBusiness = "+ business + " , isQuoteAsConsumer = "+ consumer + " , isQuoteAsFace = "+ f2F + " , isQuoteAsRecruitment = "+ recruit + " , isQuoteAsInternational = "+ international + " , isQuoteAsOnline = "+ online + " , isQuoteAsCATI = "+ cATIPhone + " , isQuoteAsDP = "+ dataProcessing + ",chaseOutcome=@chaseOutcome WHERE Quotes.quoteID = " + quoteID + " "
        console.log("adding new contact",updateQuoteQuery)
        db.query(updateQuoteQuery, (err, result)=>{
          if(err) {
            console.log(err,updateQuoteQuery)
          }
          res.redirect('/overview/'+quoteID);
        })
      })
    }
  },
  viewProjectPage: (req, res) => {
    const moment = require('moment');
    let qID = req.params.id;
    let pIDfilt
    let pfilter=`where Quotes.QuoteID=`+qID
    if (req.params.id==-1) {
      pfilter="where Quotes.QuoteID=(SELECT Projects.QuoteID FROM Jobs LEFT JOIN Projects on Projects.projectID=Jobs.projectID WHERE JobID="+req.params.jobIDs+")"
      pIDfilt="(SELECT Projects.ProjectID FROM Jobs LEFT JOIN Projects on Projects.projectID=Jobs.projectID WHERE JobID="+req.params.jobIDs+")"
    }else {
      pIDfilt="(SELECT Projects.ProjectID FROM Projects WHERE quoteID="+qID+")"
    }
    var filter=`WHERE quoteID=`+qID
    if (req.params.jobIDs) {
      let jobIDs=req.params.jobIDs.split("j")
      filter="WHERE jobID IN ("+jobIDs.join(",")+")"
    }
    let allProjectsQ=`
    select quotes.quoteID,quotes.quoteName,quotes.quoteNo
    from
    quotes
    left join projects on projects.quoteID=quotes.quoteID
    where quotes.quoteID>2 and projects.projectID is not null`
    let allJobsQ=`
    select jobs.*,isnull(CASE WHEN Jobs.isJobHourly=1 THEN CATI_Hours ELSE CATI_Completes END,0)+isnull(WEB_Completes,0)+isnull(F2F_Completes,0) as ints from
    jobs left join viewJobsStats s on s.jobID=Jobs.jobID
    left join Quotes on Quotes.quoteID=s.jobquoteID
    `+pfilter
    let projectQ=`
    SELECT Quotes.quoteID, Projects.projectID, quoteNo, quoteName, clientName, isProjectLive, isProjectClosed, isProjectCancelled, setupCost, dataCost, sampleCost, codingCost,projectCM,projectDP,cmst.staffName as cmName,pmst.staffName as pmName,cmst.breatheID as cmBreathe,pmst.breatheID as pmBreathe
    FROM
    Projects
    full outer join Quotes on Projects.quoteID=Quotes.quoteID
    left join Clients on Quotes.clientID=Clients.clientID
    left join staff cmst on cmst.staffID=projects.projectCM
    left join staff pmst on pmst.staffID=projects.projectDP
    `+pfilter
    let jobQ=`
    SELECT *
    FROM
    Jobs
    where jobID in (`+(req.params.jobIDs?req.params.jobIDs.split("j"):'select jobID from viewJobsStats where jobQuoteID='+req.params.id)+`)`
    let kpiQ=`
    select jobID as pjobID,quoteID,sales,spend,catiSales,catiSpend,catiHours,catiInts,ints,qcScore,auditsToDo,auditsDone,faceSpend from viewJobPerformance `+filter
    let notesQ=`
    SELECT * FROM AllNotes WHERE jobID=`+pIDfilt
    let costsQ=`
    select costID,costName,unitValue,units,ProjectCosts.costTypeID,costTypeName,costTypeCategory
    from ProjectCosts
    left join CostTypes on CostTypes.CostTypeID=ProjectCosts.CostTypeID
    WHERE ProjectCosts.ProjectID=`+pIDfilt
    let spendsQ=`
    select s.spendID,s.jobID,spendName,unitValue,units,s.typeID,costTypeName,costTypeCategory,s.supplierID,s.PO,invReceived,invCorrect,spendDate,a.allocationID
    from ProjectSpends s
  	left join OnlineAllocations a on a.spendID=s.spendID
    left join CostTypes on CostTypes.CostTypeID=s.typeID
    WHERE s.ProjectID=`+pIDfilt
    db.multiple=true
    db.batch(projectQ+jobQ+allJobsQ+notesQ+costsQ+allProjectsQ+kpiQ, (err, projectR) => {
      if (err) {
        console.log(err);
        console.log(projectQ);
      }
      res.render('view-project.ejs', {
        title: "Project Overview"
        ,project: projectR.recordsets[0]
        ,jobs: projectR.recordsets[1].map(el=>{
          let obj={
            ...el,
            ...projectR.recordsets[6].find(k=>k.pjobID==el.jobID)
          }
          return obj
        })
        ,allJobs: projectR.recordsets[2]
        ,notes: projectR.recordsets[3]
        ,costs: projectR.recordsets[4]
        ,success_msg: req.flash('success_msg')
        ,error_msg: req.flash('error_msg')
        ,moment: require('moment')
        ,allProjects:projectR.recordsets[5]
        ,cmBreathe: breatheEmployees.find(el=>el.id==projectR.recordsets[0][0].cmBreathe)
        ,pmBreathe: breatheEmployees.find(el=>el.id==projectR.recordsets[0][0].pmBreathe)
      });
    });
  },
  projectStatsAjax: (req, res) => {
    const moment = require('moment');
    let qID = req.body.id;
    let pIDfilt
    let pfilter=`where Quotes.QuoteID=`+qID
    if (req.body.id==-1) {
      pfilter="where Quotes.QuoteID=(SELECT Projects.QuoteID FROM Jobs LEFT JOIN Projects on Projects.projectID=Jobs.projectID WHERE JobID="+req.body.jobIDs+")"
      pIDfilt="(SELECT Projects.ProjectID FROM Jobs LEFT JOIN Projects on Projects.projectID=Jobs.projectID WHERE JobID="+req.body.jobIDs+")"
    }else {
      pIDfilt="(SELECT Projects.ProjectID FROM Projects WHERE quoteID="+qID+")"
    }
    var filter=`WHERE Quotes.QuoteID=`+qID
    let jobIDs=req.body.jobIDs
    let query={}
    let shiftFilt=""
    if (req.body.shift) {
      shiftFilt=" and "+req.body.shift+"=1"
    }
    query.datesQ=`
    select jobID, dateName, dateValue
    from JobDates
    where jobID IN (`+jobIDs.join(",")+`)
    UNION select jobID, 'startDate', startDate from Jobs where jobID IN (`+jobIDs.join(",")+`)
    UNION select jobID, 'endDate', endDate from Jobs where jobID IN (`+jobIDs.join(",")+`)
    UNION select jobID, 'dataDate', dataDate from Jobs where jobID IN (`+jobIDs.join(",")+`) and datePart(year,dataDate)>1970 and dataDate IS NOT NULL
    UNION select jobID, 'tablesDate', tablesDate from Jobs where jobID IN (`+jobIDs.join(",")+`) and datePart(year,tablesDate)>1970 and tablesDate IS NOT NULL`
    query.shiftsQ=`
    select agentName,agents.ringCentralID,agents.vistaName, s.agentID, inputDate, sum(Ints) as ints, sum(Hours) as hrs, sum(Pay) as pay, sum(sales) as sales, NULLIF(avg(dials),0) as dials
    from
    (select * from ViewAgentShifts where jobID IN (`+jobIDs.join(",")+`) and inputDate<cast(getdate() as date)) s
    left join agents on agents.agentID=s.agentID
    left join (
      select max(NULLIF(dialCount+talkmins,0)/inputHours) as dials, Dials.agentID, dialDate
      from
      Dials
      left join (
    		select sum(inputHours) as inputHours, agentID, inputDate
    		from DailyInput
    		group by agentID, inputDate
    	) DailyInput on DailyInput.agentID=Dials.agentID and DailyInput.inputDate=Dials.dialDate
      group by Dials.agentID,dialDate
    ) dialT on dialT.agentID=s.agentID and dialT.dialDate=s.inputDate
    GROUP BY agentName, inputDate, s.agentID,agents.ringCentralID,agents.vistaName
    `
    query.statsQ=`
    select inputDate, ViewDailyPay.jobID, sum(CASE WHEN Jobs.isJobHourly=1 THEN Hours ELSE Ints END) as ints, sum(Hours) as hrs, sum(Pay) as pay, sum(CPI*CASE WHEN Jobs.isJobHourly=1 THEN Hours ELSE Ints END) as sales, NULLIF(avg(dials),0) as dials
    from
    ViewDailyPay
    left join ViewJobsStats on ViewJobsStats.jobID=ViewDailyPay.jobID
    left join Jobs on Jobs.jobID=ViewDailyPay.jobID
    left join agents on agents.agentID=ViewDailyPay.agentID
    left join agentTeams at on agents.teamID=at.agentTeamID
    left join (
      select max(NULLIF(dialCount+talkmins,0)/inputHours) as dials, Dials.agentID, dialDate
      from
      Dials
      left join (
        select sum(inputHours) as inputHours, agentID, inputDate
        from DailyInput
        group by agentID, inputDate
      ) DailyInput on DailyInput.agentID=Dials.agentID and DailyInput.inputDate=Dials.dialDate
      group by Dials.agentID,dialDate
    ) dialT on dialT.agentID=ViewDailyPay.agentID and dialT.dialDate=ViewDailyPay.inputDate
    where ViewDailyPay.jobID IN (`+jobIDs.join(",")+`) and inputDate<cast(getdate() as date)
    `+shiftFilt+`
    GROUP BY inputDate, ViewDailyPay.jobID
    union
    select inputDate,a.jobID,sum(inputInterviews),null,sum(s.unitValue*inputInterviews),sum(j.CPI*inputInterviews),null
    from
    OnlineDailyInput d
    left join OnlineAllocations a on a.allocationID=d.allocationID
    left join ProjectSpends s on s.spendID=a.spendID
    left join ViewJobsStats j on j.jobID=a.jobID
    where a.jobID IN (`+jobIDs.join(",")+`) and inputDate<cast(getdate() as date)
    group by a.jobID,inputDate
    union
    select inputDate,a.jobID,sum(inputInterviews),null,sum(a.payRate*case when a.isPaidByDay=1 then 1 else d.inputInterviews end),sum(j.CPI*inputInterviews),null
    from
    FaceDailyInput d
    left join FaceAllocations a on a.allocationID=d.allocationID
    left join ViewJobsStats j on j.jobID=a.jobID
    where a.jobID IN (`+jobIDs.join(",")+`) and inputDate<cast(getdate() as date)
    group by a.jobID,inputDate
    `
    query.projectQ=`
    SELECT Quotes.quoteID, Projects.projectID, quoteNo, quoteName, clientName, isProjectLive, isProjectClosed, isProjectCancelled, setupCost, dataCost, sampleCost, codingCost, projectCM, projectDP
    FROM
    Projects
    full outer join Quotes on Projects.quoteID=Quotes.quoteID
    left join Clients on Quotes.clientID=Clients.clientID
    `+pfilter
    query.jobsQ=`
    SELECT *
    FROM
    Jobs
    LEFT JOIN (select jobID as rjobID, ahr, calcHours, todayHours, calcDays from ViewResourceNeeded) ViewResourceNeeded on ViewResourceNeeded.rjobID=Jobs.jobID
    where Jobs.jobID IN (`+jobIDs.join(",")+`)`
    query.plannerQ=`
    select jobID, plannerDate, plannerHours+isnull(plannerHoursAcademy,0) plannerHours from Planners where jobID IN (`+jobIDs.join(",")+`)
    `
    query.projectStatsQ=`
    select inputDate, sum(CASE WHEN s.isHourly=1 THEN Hours ELSE Ints END) as ints, sum(Hours) as hrs, sum(Pay) as pay, sum(sales) as sales, NULLIF(avg(dials),0) as dials
    from
    (select * from ViewAgentShifts where jobID IN (`+jobIDs.join(",")+`) and inputDate<cast(getdate() as date)) s
    left join agents on agents.agentID=s.agentID
    left join (
      select max(NULLIF(dialCount+talkmins,0)/inputHours) as dials, Dials.agentID, dialDate
      from
      Dials
      left join (
    		select sum(inputHours) as inputHours, agentID, inputDate
    		from DailyInput
    		group by agentID, inputDate
    	) DailyInput on DailyInput.agentID=Dials.agentID and DailyInput.inputDate=Dials.dialDate
      group by Dials.agentID,dialDate
    ) dialT on dialT.agentID=s.agentID and dialT.dialDate=s.inputDate
    where 1=1
    `+shiftFilt+`
    GROUP BY inputDate
    `
    query.agentStatsQ=`
    select agentName,agents.ringCentralID,agents.vistaName,s.agentID, sum(Ints) as ints, sum(Hours) as hrs, sum(Pay) as pay, sum(sales) as sales, NULLIF(avg(dials),0) as dials
    from
    (select * from ViewAgentShifts where jobID IN (`+jobIDs.join(",")+`) and inputDate<cast(getdate() as date)) s
    left join agents on agents.agentID=s.agentID
    left join (
      select max(NULLIF(dialCount+talkmins,0)/inputHours) as dials, Dials.agentID, dialDate
      from
      Dials
      left join (
    		select sum(inputHours) as inputHours, agentID, inputDate
    		from DailyInput
    		group by agentID, inputDate
    	) DailyInput on DailyInput.agentID=Dials.agentID and DailyInput.inputDate=Dials.dialDate
      group by Dials.agentID,dialDate
    ) dialT on dialT.agentID=s.agentID and dialT.dialDate=s.inputDate
    where 1=1
    `+shiftFilt+`
    GROUP BY agentName, s.agentID, agents.ringCentralID, agents.vistaName
    `
    query.ahrQ=`
    select r.jobID,jobName,reportHour,nullif(SUM(cast(hourWorked as int)),0) hours,(0.00+sum(inputInterviews))/nullif(SUM(cast(hourWorked as int)),0) ahr
    from
    AskiaLiveReports r
    left join jobs j on j.jobID=r.jobID
    left join Projects p on p.projectID=j.projectID
    left join Quotes q on q.quoteID=p.quoteID
    where r.jobID IN (`+jobIDs.join(",")+`)
    group by r.jobID,reportHour,jobName
    order by r.jobID,reportHour
    `
    query.plannerTasksQ=`
    select * from PlannerTasks order by case when dateRelation='endDate' then 40 when fieldworkInterval is not null or completesInterval is not null then 0 else -40 end+isnull(dateOffset,0),fieldworkInterval`
    query.auditsQ=`
    select * from ProjectTaskAudits where projectID=`+pIDfilt
    query.staffsQ="select * from staff where staffID>2 order by staffName"
    var i=0
    var response={}
    function getStats(){
      if (i<req.body.queries.length) {
        let thisQ=req.body.queries[i]
        console.log("Running "+i,thisQ)
        db.query(query[thisQ+"Q"], (err, resp) => {
          if (err) {
            console.log(err);
            console.log(query[thisQ+"Q"]);
          }
          response[thisQ]=resp.recordset
          i++
          getStats()
        })
      }else {
        console.log("done")
        res.send(response)
      }
    }
    getStats()
  },
  compareProjectPage: (req, res) => {
    const moment = require('moment');
    let qID=""
    console.log(req.body)
    if (typeof req.body.quoteIDs === "string") {
      qID=req.body.quoteIDs
    }else {
      qID=req.body.quoteIDs.join(",")
    }
    let pfilter=`where Quotes.QuoteID IN (`+qID+`)`
    let pIDfilt="(SELECT Projects.ProjectID FROM Projects WHERE quoteID IN ("+qID+"))"
    var filter=`WHERE Quotes.QuoteID IN (`+qID+`)`
    if (req.body.jobIDs) {
      let jobIDs=""
      if (typeof req.body.jobIDs === "string") {
        jobIDs=req.body.jobIDs
      }else {
        jobIDs=req.body.jobIDs.join(",")
      }
      filter="WHERE jobID IN ("+jobIDs+")"
    }
    let allJobsQ=`
    select jobs.*,isnull(CASE WHEN Jobs.isJobHourly=1 THEN Hours ELSE Ints END,0) as ints from
    jobs
    left join Projects on Jobs.projectID=Projects.projectID
    left join Quotes on Quotes.quoteID=Projects.quoteID
    left join (select sum(Hours) as Hours, sum(Ints) as Ints, jobID from ViewDailyPay group by jobID) daily on daily.jobID=jobs.jobID
    `+pfilter

    let allProjectsQ=`
    select quotes.quoteID,quotes.quoteName,quotes.quoteNo
    from
    quotes
    left join projects on projects.quoteID=quotes.quoteID
    where quotes.quoteID>2 and projects.projectID is not null`
    let projectQ=`
    SELECT Quotes.quoteID, Projects.projectID, quoteNo, quoteName, clientName, isProjectLive, isProjectClosed, isProjectCancelled, setupCost, dataCost, sampleCost, codingCost
    FROM
    Projects
    full outer join Quotes on Projects.quoteID=Quotes.quoteID
    left join Clients on Quotes.clientID=Clients.clientID
    `+pfilter
    let jobQ=`
    IF OBJECT_ID('tempdb..##jobIDs') IS NOT NULL DROP TABLE ##jobIDs
    SELECT jobID INTO ##jobIDs
    from Jobs
    left join Projects on Jobs.projectID=Projects.projectID
    left join Quotes on Quotes.quoteID=Projects.quoteID
    `+filter+`

    SELECT *
    FROM
    Jobs
    LEFT JOIN (select jobID as rjobID, ahr, calcHours, todayHours, calcDays from ViewResourceNeeded) ViewResourceNeeded on ViewResourceNeeded.rjobID=Jobs.jobID
    where Jobs.jobID IN (select * from ##jobIDs)`
    let statsQ=`
    select inputDate, Jobs.jobID, Jobs.projectID, sum(CASE WHEN Jobs.isJobHourly=1 THEN Hours ELSE Ints END) as ints, sum(Hours) as hrs, sum(Pay) as pay, sum(CPI*CASE WHEN Jobs.isJobHourly=1 THEN Hours ELSE Ints END) as sales, NULLIF(avg(dials),0) as dials
    from
    ViewDailyPay
    left join ViewJobsStats on ViewJobsStats.jobID=ViewDailyPay.jobID
    left join Jobs on Jobs.jobID=ViewDailyPay.jobID
    left join agents on agents.agentID=ViewDailyPay.agentID
    left join (
      select max(NULLIF(dialCount+talkmins,0)/inputHours) as dials, Dials.agentID, dialDate
      from
      Dials
      left join (
    		select sum(inputHours) as inputHours, agentID, inputDate
    		from DailyInput
    		group by agentID, inputDate
    	) DailyInput on DailyInput.agentID=Dials.agentID and DailyInput.inputDate=Dials.dialDate
      group by Dials.agentID,dialDate
    ) dialT on dialT.agentID=ViewDailyPay.agentID and dialT.dialDate=ViewDailyPay.inputDate
    where ViewDailyPay.jobID IN (select * from ##jobIDs)
    GROUP BY inputDate, Jobs.projectID, Jobs.jobID
    `
    let datesQ=`
    select projectID, dateName, dateValue
    from JobDates
    left join Jobs on Jobs.jobID=JobDates.jobID
    where JobDates.jobID IN (select * from ##jobIDs)
    UNION select projectID, 'startDate', startDate from Jobs where jobID IN (select * from ##jobIDs)
    UNION select projectID, 'endDate', endDate from Jobs where jobID IN (select * from ##jobIDs)
    UNION select projectID, 'dataDate', dataDate from Jobs where jobID IN (select * from ##jobIDs) and datePart(year,dataDate)>1970 and dataDate IS NOT NULL
    UNION select projectID, 'tablesDate', tablesDate from Jobs where jobID IN (select * from ##jobIDs) and datePart(year,tablesDate)>1970 and tablesDate IS NOT NULL`
    let plannerQ=`
    select projectID, Planners.jobID, plannerDate, plannerHours+isnull(plannerHoursAcademy,0) plannerHours from Planners left join Jobs on Jobs.jobID=Planners.jobID where Jobs.jobID IN (select * from ##jobIDs)
    `
    let agentStatsQ=`
    select agentName, Jobs.jobID, projectID, ViewDailyPay.agentID, sum(Ints) as ints, sum(Hours) as hrs, sum(Pay) as pay, sum(CPI*CASE WHEN Jobs.isJobHourly=1 THEN Hours ELSE Ints END) as sales, NULLIF(avg(dials),0) as dials
    from
    ViewDailyPay
    left join ViewJobsStats on ViewJobsStats.jobID=ViewDailyPay.jobID
    left join Jobs on Jobs.jobID=ViewDailyPay.jobID
    left join agents on agents.agentID=ViewDailyPay.agentID
    left join (
      select max(NULLIF(dialCount+talkmins,0)/inputHours) as dials, Dials.agentID, dialDate
      from
      Dials
      left join (
    		select sum(inputHours) as inputHours, agentID, inputDate
    		from DailyInput
    		group by agentID, inputDate
    	) DailyInput on DailyInput.agentID=Dials.agentID and DailyInput.inputDate=Dials.dialDate
      group by Dials.agentID,dialDate
    ) dialT on dialT.agentID=ViewDailyPay.agentID and dialT.dialDate=ViewDailyPay.inputDate
    where ViewDailyPay.jobID IN (select * from ##jobIDs)
    GROUP BY agentName, ViewDailyPay.agentID, Jobs.jobID, projectID
    `
    let allAgentsQ=`
    select agentName, ViewDailyPay.agentID
    from
    ViewDailyPay
    left join agents on agents.agentID=ViewDailyPay.agentID
    where ViewDailyPay.jobID IN (select * from ##jobIDs)
    GROUP BY agentName, ViewDailyPay.agentID
    `
    let shiftStatsQ=`
    select agentName, ViewDailyPay.agentID, Jobs.jobID, projectID, inputDate, sum(Ints) as ints, sum(Hours) as hrs, sum(Pay) as pay, sum(CPI*CASE WHEN Jobs.isJobHourly=1 THEN Hours ELSE Ints END) as sales, NULLIF(avg(dials),0) as dials
    from
    ViewDailyPay
    left join ViewJobsStats on ViewJobsStats.jobID=ViewDailyPay.jobID
    left join Jobs on Jobs.jobID=ViewDailyPay.jobID
    left join agents on agents.agentID=ViewDailyPay.agentID
    left join (
      select max(NULLIF(dialCount+talkmins,0)/inputHours) as dials, Dials.agentID, dialDate
      from
      Dials
      left join (
    		select sum(inputHours) as inputHours, agentID, inputDate
    		from DailyInput
    		group by agentID, inputDate
    	) DailyInput on DailyInput.agentID=Dials.agentID and DailyInput.inputDate=Dials.dialDate
      group by Dials.agentID,dialDate
    ) dialT on dialT.agentID=ViewDailyPay.agentID and dialT.dialDate=ViewDailyPay.inputDate
    where ViewDailyPay.jobID IN (select * from ##jobIDs)
    GROUP BY agentName, inputDate, ViewDailyPay.agentID, Jobs.jobID, projectID
    `
    let notesQ=`
    SELECT * FROM AllNotes WHERE jobID IN `+pIDfilt
    let costsQ=`
    select ProjectCosts.projectID,costID,costName,unitValue,units,ProjectCosts.costTypeID,costTypeName,costTypeCategory
    from ProjectCosts
    left join CostTypes on CostTypes.CostTypeID=ProjectCosts.CostTypeID
    WHERE ProjectCosts.ProjectID IN (`+pIDfilt+`)`
    let projStatsQ=`
    select inputDate, projectID, sum(CASE WHEN Jobs.isJobHourly=1 THEN Hours ELSE Ints END) as ints, sum(Hours) as hrs, sum(Pay) as pay, sum(CPI*CASE WHEN Jobs.isJobHourly=1 THEN Hours ELSE Ints END) as sales, NULLIF(avg(dials),0) as dials
    from
    ViewDailyPay
    left join ViewJobsStats on ViewJobsStats.jobID=ViewDailyPay.jobID
    left join Jobs on Jobs.jobID=ViewDailyPay.jobID
    left join (
      select max(NULLIF(dialCount+talkmins,0)/inputHours) as dials, Dials.agentID, dialDate
      from
      Dials
      left join (
    		select sum(inputHours) as inputHours, agentID, inputDate
    		from DailyInput
    		group by agentID, inputDate
    	) DailyInput on DailyInput.agentID=Dials.agentID and DailyInput.inputDate=Dials.dialDate
      group by Dials.agentID,dialDate
    ) dialT on dialT.agentID=ViewDailyPay.agentID and dialT.dialDate=ViewDailyPay.inputDate
    where ViewDailyPay.jobID IN (select * from ##jobIDs)
    GROUP BY inputDate, projectID
    `
    let spendsQ=`
    select projectID,spendID,ProjectSpends.jobID,spendName,unitValue,units,ProjectSpends.typeID,costTypeName,costTypeCategory,supplierID,PO
    from ProjectSpends
    left join CostTypes on CostTypes.CostTypeID=ProjectSpends.typeID
    WHERE ProjectSpends.ProjectID IN (`+pIDfilt+`)`
    db.query(projectQ, (err, projectR) => {
      if (err) {
        console.log(err);
        console.log(projectQ);
      }
      db.query(jobQ, (err, jobR) => {
        if (err) {
          console.log(err);
          console.log(jobQ);
        }
        db.query(statsQ, (err, statsR) => {
          if (err) {
            console.log(err);
            console.log(statsQ);
          }
          db.query(datesQ, (err, datesR) => {
            if (err) {
              console.log(err);
              console.log(datesQ);
            }
            db.query(plannerQ, (err, plannerR) => {
              if (err) {
                console.log(err);
                console.log(plannerQ);
              }
              db.query(allJobsQ, (err, allJobsR) => {
                if (err) {
                  console.log(err);
                  console.log(allJobsQ);
                }
                console.log(allJobsR.recordset)
                db.query(agentStatsQ, (err, agentStatsR) => {
                  if (err) {
                    console.log(err);
                    console.log(agentStatQ);
                  }
                  db.query(shiftStatsQ, (err, shiftStatsR) => {
                    if (err) {
                      console.log(err);
                      console.log(shiftStatsQ);
                    }
                    db.query(notesQ, (err, notesR) => {
                      if (err) {
                        console.log(err);
                        console.log(notesQ);
                      }
                      db.query(costsQ, (err, costsR) => {
                        if (err) {
                          console.log(err);
                          console.log(costsQ);
                        }
                        db.query(spendsQ, (err, spendsR) => {
                          if (err) {
                            console.log(err);
                            console.log(spendsR);
                          }
                          db.query(projStatsQ, (err, projStatsR) => {
                            if (err) {
                              console.log(err);
                              console.log(projStatsQ);
                            }
                            db.query(allAgentsQ, (err, allAgentsR) => {
                              if (err) {
                                console.log(err);
                                console.log(allAgentsQ);
                              }
                              db.query(allProjectsQ, (err, allProjectsR) => {
                                if (err) {
                                  console.log(err);
                                  console.log(allAgentsQ);
                                }
                                res.render('compare-projects.ejs', {
                                  title: "Project Overview"
                                  ,projects: projectR.recordset
                                  ,jobs: jobR.recordset
                                  ,stats: statsR.recordset
                                  ,projectStats: projStatsR.recordset
                                  ,dates: datesR.recordset
                                  ,planner: plannerR.recordset
                                  ,allJobs: allJobsR.recordset
                                  ,agentStats: agentStatsR.recordset
                                  ,shifts: shiftStatsR.recordset
                                  ,notes: notesR.recordset
                                  ,costs: costsR.recordset
                                  ,spends: spendsR.recordset
                                  ,success_msg: req.flash('success_msg')
                                  ,error_msg: req.flash('error_msg')
                                  ,moment: require('moment')
                                  ,allAgents:allAgentsR.recordset
                                  ,allProjects:allProjectsR.recordset
                                });
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
          })
        });
      });
    });
  },
  projectClosingPage: (req, res) => {
    let projectQ=`select * from Projects
    left join Quotes on Quotes.quoteID=Projects.quoteID
    left join Contacts on Contacts.contactID=quotes.contactID
    left join Staff on staff.staffID=Projects.projectCM
    WHERE Projects.ProjectID=`+req.params.id
    let jobQ=`select * from Jobs left join Projects on Projects.projectID=Jobs.projectID WHERE Jobs.ProjectID=`+req.params.id
    let costsQ=`
    select costID,costName,unitValue,units,ProjectCosts.costTypeID,costTypeName,costTypeCategory
    from ProjectCosts
    left join CostTypes on CostTypes.CostTypeID=ProjectCosts.CostTypeID
    WHERE ProjectCosts.ProjectID=`+req.params.id
    let notesQ=`
    select * from AllNotes where AllNotes.jobID=`+req.params.id+` AND AllNotes.tableName='costsTable'`
    let spendsQ=`
    select spendID,ProjectSpends.jobID,spendName,unitValue,units,ProjectSpends.typeID,costTypeName,costTypeCategory,supplierID,PO,invReceived,invCorrect
    from ProjectSpends
    left join CostTypes on CostTypes.CostTypeID=ProjectSpends.typeID
    WHERE ProjectSpends.ProjectID=`+req.params.id
    let datesQ=`select * from ProjectDates where projectID=`+req.params.id+` and dateValue is not null`
    db.query(projectQ, (err, projectR) => {
      if (err) {
        console.log(err)
        res.send(err)
      }
      db.query(jobQ, (err, jobR) => {
        if (err) {
          console.log(err)
          res.send(err)
        }
        db.query(costsQ, (err, costsR) => {
          if (err) {
            console.log(err)
            res.send(err)
          }
          db.query(notesQ, (err, notesR) => {
            if (err) {
              console.log(err)
              res.send(err)
            }
            db.query(spendsQ, (err, spendsR) => {
              if (err) {
                console.log(err)
                res.send(err)
              }
              db.query(datesQ, (err, datesR) => {
                if (err) {
                  console.log(err)
                  res.send(err)
                }
                res.render('project-closing.ejs', {
                  title: "Closing "+projectR.recordset[0].quoteNo+" "+projectR.recordset[0].quoteName
                  ,project: projectR.recordset[0]
                  ,jobs: jobR.recordset
                  ,costs: costsR.recordset
                  ,notes: notesR.recordset
                  ,spends: spendsR.recordset
                  ,dates: datesR.recordset
                });
              })
            })
          })
        })
      })
    })
  },
  closingBudgetCheck:(req,res)=>{
    let q=`
    select * from ViewProjectClosing where projectID=`+req.query.projectID
    db.query(q,(err,r)=>{
      res.send(r.recordset[0])
    })
  },
  closeProject: (req, res) => {
    const moment = require('moment');
    if (typeof req.body.jobID==='string') {
      req.body.jobID=[req.body.jobID]
    }
    let projectQ=`UPDATE Projects SET closingNotes=@closingNotes,closingDate=getdate(), finalIR=`+Number(req.body.finalIR).toFixed(2)+`, isProjectLive=0, isProjectClosed=1, inboundLineID=null WHERE ProjectID=`+req.body.projectID
    db.input('closingNotes',req.body.closingNotes)
    db.query(projectQ, (err, projectR) => {
      if (err) {
        console.log(err)
        res.send(err)
      }
      req.body.jobID.forEach((jobID, i) => {
        let loi=typeof req.body.closingLOI==="string"?req.body.closingLOI:req.body.closingLOI[i]
        let ir=typeof req.body.closingIR==="string"?req.body.closingIR:req.body.closingIR[i]
        let jobQ=`UPDATE Jobs SET timedLOI=`+loi+`, closingIR=`+ir+` WHERE jobID=`+jobID
        db.query(jobQ, (err, jobR) => {})
      })
      if (req.body.inboundLineID) {
        rcPlatform.put("/restapi/v1.0/account/~/phone-number/"+req.body.inboundLineID,{label:''}).then(function(e){
          e.json().then(function(e){
            rcPlatform.put('/restapi/v1.0/account/~/extension/'+e.extension.id,{contact:{firstName:'UNUSED',pronouncedName:{text:''}}})
          })
        })
      }
      if (req.body.informPM=='on') {
        db.query("SELECT staffName, staffEmail FROM Projects left join staff on staff.staffID=Projects.projectDP WHERE projectID="+req.body.projectID, (err, pmR) => {
          if (pmR.recordset[0].staffName) {
            var txt=""
            let html="This project has been closed and now needs the completes and sample uploading to JA2. To do so, click the link below. If there is no sample and/or no completes to upload, you must still visit the link below and indicate as such to avoid further emails.<br><br>http://job-analysis:8080/sample-outcomes/"+req.body.projectID

            txt=txt+"<p>Hi "+pmR.recordset[0].staffName.split(" ")[0]+",</p><p>"+req.body.jobName+" has now been marked as complete by the CM. <p>If the project is on Forsta, please go <a href='http://job-analysis:8080/sample-outcomes-forsta/"+req.body.projectID+"'>here</a> to upload sample & data to JA2</p><p>If the project is on Askia, please use the old sample & data uploader <a href='http://job-analysis:8080/sample-outcomes/"+req.body.projectID+"'>here</a></p></p>Many thanks<br><br>"
            emailTo=[]
            emailTo.push('matt@teamsearchmr.co.uk')
            emailTo.push(pmR.recordset[0].staffEmail)
            let mailOptions = {
              from: 'JA2 <reports@teamsearchmr.co.uk>',
              to: emailTo,
              subject: "COMPLETED - "+req.body.jobName,
              html: '<p>' + header + txt + footer + '</p>'
            };
            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.log(error);
                logger.info('Could not send pm completion email: '+error);
              }else {
                console.log("pm completion email sent")
              }
            });
          }
        })
      }
      res.redirect('/live-proj')
    })
  },
  getCostTypes: (req, res) => {
    db.query("select * from CostTypes", (err, resp) => {
      if (err) {
        console.log(err)
        res.status(500).send({error:"Could not get cost categories"})
      }else {
        res.status(200).send(resp.recordset)
      }
    })
  },
  getSuppliers: (req, res) => {
    db.query("select * from Suppliers order by supplierName", (err, resp) => {
      if (err) {
        console.log(err)
        res.status(500).send({error:"Could not get supplier list"})
      }else {
        res.status(200).send(resp.recordset)
      }
    })
  },
  addProjectCost: (req, res) => {
    let insertQ=`INSERT INTO ProjectCosts
    (costName,unitValue,units,projectID,costTypeID)
    VALUES
    (@costName,`+req.body[0].unitValue+`,`+req.body[0].units+`,`+req.body[0].projectID+`,`+req.body[0].costTypeID+`)
    SELECT SCOPE_IDENTITY() as id`
    db.input('costName',req.body[0].costName)
    db.query(insertQ, (err, insertR) => {
      if (err) {
        console.log(err)
        logger.info(req.user.uName+' failed to addProjectCost',err)
        logger.info(insertQ)
        res.status(500).send({error:"Could not add cost to database"})
      }else {
        let ids={}
        ids.projectID=req.body[0].projectID
        ids.otherID=insertR.recordset[0].id
        logChange(req,'projectCosts','costUnitValue',req.body[0].unitValue,ids).catch(err=>console.log("couldn't add to changeLog",err))
        logChange(req,'projectCosts','costUnits',req.body[0].units,ids).catch(err=>console.log("couldn't add to changeLog",err))
        logger.info(req.user.uName+' ran addProjectCost',insertQ)
        res.status(200).send(insertR.recordset[0])
      }
    })
  },
  updateProjectCost: (req, res) => {
    let insertQ=`UPDATE ProjectCosts
    SET costName=@costName,unitValue=`+req.body[0].unitValue+`,units=`+req.body[0].units+`,projectID=`+req.body[0].projectID+`,costTypeID=`+req.body[0].costTypeID+`
    WHERE costID=`+req.body[0].costID
    db.input('costName',req.body[0].costName)
    db.query(insertQ, (err, insertR) => {
      if (err) {
        console.log(err)
        logger.info(req.user.uName+' failed to updateProjectCost',err)
        logger.info(insertQ)
        res.status(500).send({error:"Could not edit cost in database"})
      }else {
        logger.info(req.user.uName+' ran updateProjectCost',insertQ)
        let ids={}
        ids.projectID=req.body[0].projectID
        ids.otherID=req.body[0].costID
        logChange(req,'projectCosts','costUnitValue',req.body[0].unitValue,ids).catch(err=>console.log("couldn't add to changeLog",err))
        logChange(req,'projectCosts','costUnits',req.body[0].units,ids).catch(err=>console.log("couldn't add to changeLog",err))
        res.status(200).send('success')
      }
    })
  },
  addProjectSpend: (req, res) => {
    let insertQ=`INSERT INTO ProjectSpends
    (typeID,unitValue,units,supplierID,jobID,projectID,PO,spendDate,invReceived)
    VALUES
    (`+req.body[0].typeID+`,`+req.body[0].unitValue+`,`+req.body[0].units+`,`+req.body[0].supplierID+`,`+req.body[0].jobID+`,`+req.body[0].projectID+`,@PO,'`+req.body[0].spendDate+`',0)
    SELECT SCOPE_IDENTITY() as id`
    db.input('PO',req.body[0].PO)
    // db.input('spendName',req.body[0].spendName)
    db.query(insertQ, (err, insertR) => {
      if (err || !insertR.recordset) {
        console.log(err)
        console.log(insertQ)
        logger.info(req.user.uName+' failed to addProjectSpend',err)
        logger.info(insertQ)
        res.status(500).send({error:"Could not add spend to database"})
      }else {
        let ids={}
        ids.projectID=req.body[0].projectID
        ids.jobID=req.body[0].jobID
        ids.otherID=insertR.recordset[0].id
        logChange(req,'projectSpends','spendUnitValue',req.body[0].unitValue,ids).catch(err=>console.log("couldn't add to changeLog",err))
        logChange(req,'projectSpends','spendUnits',req.body[0].units,ids).catch(err=>console.log("couldn't add to changeLog",err))
        res.status(200).send(insertR.recordset[0])
      }
    })
  },
  updateProjectSpend: (req, res) => {
    const moment = require('moment');
    let invR=req.body[0].invReceived!==""?(req.body[0].invReceived?1:0):'NULL'
    let invC=req.body[0].invCorrect!==""?(req.body[0].invCorrect?1:0):'NULL'
    let insQ="UPDATE ProjectSpends SET typeID="+req.body[0].typeID+", unitValue="+req.body[0].spendUnitValue+", units="+req.body[0].spendUnits+", supplierID="+req.body[0].supplierID+", jobID="+(req.body[0].jobID?req.body[0].jobID:'NULL')+", projectID="+req.body[0].projectID+", invReceived="+invR+", invCorrect="+invC+", PO=@PO, spendDate='"+moment(req.body[0].spendDate).format("YYYY-MM-DD")+"' WHERE spendID="+req.body[0].spendID
    db.input('PO',req.body[0].PO)
    // db.input('spendName',req.body[0].spendName)
    db.query(insQ, (err, insertR) => {
      if (err) {
        console.log(err)
        console.log(insQ)
        logger.info(req.user.uName+' failed to updateProjectSpend',err)
        logger.info(insQ)
        res.status(500).send({error:"Could not update spend"})
      }else {
        let ids={}
        ids.projectID=req.body[0].projectID
        ids.jobID=(req.body[0].jobID?req.body[0].jobID:'NULL')
        ids.otherID=req.body[0].spendID
        logChange(req,'projectSpends','spendUnitValue',req.body[0].spendUnitValue,ids).catch(err=>console.log("couldn't add to changeLog",err))
        logChange(req,'projectSpends','spendUnits',req.body[0].spendUnits,ids).catch(err=>console.log("couldn't add to changeLog",err))
        logChange(req,'projectSpends','PO',req.body[0].PO,ids).catch(err=>console.log("couldn't add to changeLog",err))
        res.status(200).send('success')
      }
    })
  },
  addSupplier: (req, res) => {
    let insertQ=`INSERT INTO Suppliers
    (supplierName)
    VALUES
    (@supplierName)
    SELECT SCOPE_IDENTITY() as id`
    db.input('supplierName',req.body[0].supplierName)
    db.query("select * from suppliers where supplierName=@supplierName", (err, checkQ) => {
      if (checkQ.recordset.length==0) {
        db.query(insertQ, (err, insertR) => {
          if (err) {
            console.log(err)
            console.log(insertQ)
            logger.info(req.user.uName+' failed to addSupplier',err)
            logger.info(insertQ)
            res.status(500).send({error:"Could not add new supplier to database"})
          }else {
            res.status(200).send(insertR.recordset[0])
          }
        })
      }else {
        res.status(402).send({error:"'"+req.body[0].supplierName+"' is already in the Suppliers database"})
      }
    })
  },
  getjobCPIs: (req, res) => {
    let query=`
    select * from ViewProjectCosts p
    left join CostTypes on p.costTypeID=CostTypes.costTypeID
    WHERE costTypeCategory='`+req.params.type+`' AND projectID=`+req.params.id
    db.query(query, (err, result) => {
      if (err) {
        console.log(err)
        console.log(query)
        logger.info(req.user.uName+' failed to getJobCPIs',err)
        logger.info(query)
        res.status(500).send({error:"Could not get CPIs"})
      }else {
        res.status(200).send(result.recordset)
      }
    })
  },
  checkCostDelete:(req,res)=>{
    db.query("select * from JobCPIs where costID="+req.params.costID, (err, result) => {
      if (err) {
        console.log(err)
        console.log(query)
        res.sendStatus(500).send({error:"Could not run pre-delete check on cost"})
      }else {
        res.send(result.recordset)
      }
    })
  },
  updateDataFormats:(req,res)=>{
    let dfDelQ="DELETE FROM ProjectDataFormats WHERE projectID="+req.body.projectID
    let i=0
    let dataFormats=req.body.dataFormats
    if (typeof req.body.dataFormats==="string") {
      dataFormats=[req.body.dataFormats]
    }
    db.query(dfDelQ, (err,dfDelR) => {
      function addDataFormats(){
        if (i<dataFormats.length) {
          let dfAddQ="INSERT INTO ProjectDataFormats (projectID,dataFormatID) VALUES ("+req.body.projectID+","+dataFormats[i]+")"
          db.query(dfAddQ, (err,dfR) => {
            if (err) {
              console.log(err)
              console.log(dfAddQ)
              res.sendStatus(500).send({error:"Could not update project notes"})
            }else {
              i++
              addDataFormats()
            }
          })
        }else {
          res.send('success')
        }
      }
      addDataFormats()
    })
  },
  getPMworkloads:(req,res)=>{
    let jobQ=`
    WHILE (@stDatePMW<=@enDatePMW)
    BEGIN
    select
  	grouping(staffName) grpstaff,grouping(quoteNo) grpjob,
    @stDatePMW dte,
  	q.quoteID,quoteNo,quoteName,staffName,teamupID,breatheID,count(distinct p.projectID) as jobCount from
      Staff
      left join Projects p on (Staff.staffID=p.projectDP OR Staff.staffID=p.projectCM) AND projectID in (select projectID from jobs where jobs.startDate<=@stDatePMW AND jobs.endDate>=@stDatePMW)
  	left join Quotes q on p.quoteID=q.quoteID
      where
      Staff.staffJobTitleID=`+req.params.jobTitleID+`
      AND Staff.staffLeft IS NULL
      AND Staff.staffID<>3
      AND Staff.staffID<>35
      AND staff.teamupID is not null
      AND p.isProjectClosed=0 AND p.isProjectCancelled=0
      group by GROUPING sets (
  		(staffName,teamupID,breatheID),
  		(staffName,teamupID,breatheID,q.quoteID,quoteNo,quoteName)
  	)
    SET @stDatePMW=dateadd(day,1,@stDatePMW)
    END`
    db.multiple=true
    db.input('stDatePMW',new Date(req.params.fromDate))
    db.input('enDatePMW',new Date(req.params.toDate))
    db.batch(jobQ, (err,jobR) => {
      if (err) {
        console.log(err)
        res.send(err)
      }else {
        console.log("Workloads - got jobs",jobR.recordset.length)
        db.query("select * from staff where Staff.staffJobTitleID="+req.params.jobTitleID+" AND Staff.staffLeft IS NULL", (err,staffR) => {
          if (err) {
            console.log(err)
            res.send(err)
          }else {
            console.log("Workloads - got staff",staffR.recordset.length)
            teamupReq.get('/events/',{
              params: {
                startDate:req.params.fromDate,
                endDate:req.params.toDate
              }
            }).then(function(events){
              teamupReq.get('/subcalendars/').then(function(subcals){
                console.log("Workloads - got subcals")
                breathReq.get('/absences/',{
                  params: {
                    start_date:req.params.fromDate,
                    end_date:req.params.toDate
                  }
                }).then(function(absences){
                  console.log("Workloads - got absences")
                  res.send({
                    jobs:jobR.recordsets,
                    teamup:events.data.events,
                    teamupCals:subcals.data.subcalendars,
                    teamupColors:lookups.teamupColors,
                    absences:absences.data.absences
                  })
                }).catch(function (error) {
                  console.log("Error fetching Breathe",error);
                  res.send({
                    jobs:jobR.recordsets,
                    teamup:events.data.events,
                    teamupCals:subcals.data.subcalendars,
                    teamupColors:lookups.teamupColors,
                    absences:[]
                  })
                })
              }).catch(function (error) {
                console.log("Error fetching Teamup",error);
                res.send({
                  jobs:jobR.recordsets,
                  teamup:[]
                })
              })
            }).catch(function (error) {
              console.log(error);
              res.send({
                jobs:jobR.recordsets,
                teamup:[]
              })
            })
          }
        })
      }
    })
  },
  renderWorkloads:(req,res)=>{
    const moment = require('moment');
    function isSqlGroup(row,fields){
      return Object.keys(row).filter(k=>k.indexOf('grp')==0).every(k=>fields.indexOf(k)>-1?row[k]==0:row[k]==1)
    }
    let params=req.body.params
    let response=req.body.response
    var dateLabels=Array.from(moment.range(params.stDate,params.enDate).by('day'))
    res.send(response.jobs[0].filter(pmRow=>isSqlGroup(pmRow,['grpstaff']) && response.teamupCals.find(el=>el.id==pmRow.teamupID)).map((pmRow, i) => {
      var pm=pmRow.staffName
      pmRow.days=dateLabels.map((dte,d)=>({
        date:dte,
        label:dte.format("DD-MMM"),
        jobs:JSON.parse(JSON.stringify(response.jobs[d].filter(el=>el.staffName==pm))),
        teamup:response.teamup.filter(t=>t.subcalendar_ids.includes(pmRow.teamupID) && t.all_day=='false' && moment.utc(t.start_dt).isSame(dte,'day')).map(t=>({task:t,mins:moment.utc(t.end_dt).diff(moment.utc(t.start_dt),'minutes')>480?0:moment.utc(t.end_dt).diff(moment.utc(t.start_dt),'minutes'),})),
        absenceMultiplier:(dte.isSameOrAfter(params.projEnd,'day') || dte.isSameOrBefore(params.projStart,'day')?2:1)
      })).filter(dte=>dte.date.format('e')!=0 && dte.date.format('e')!=6)
      pmRow.absences=response.absences.filter(el=>el.cancelled=='false' && el.employee.id==pmRow.breatheID && moment.utc(el.start_date).isSameOrBefore(params.enDate,'day') && moment.utc(el.end_date).isSameOrAfter(params.stDate,'day'))
      pmRow.teamup=[]
      pmRow.jobs=JSON.parse(JSON.stringify(response.jobs.map(day=>day.find(staff=>isSqlGroup(staff,['grpstaff','grpjob']) && staff.staffName==pm))))
      pmRow.colourRef=response.teamupCals.find(el=>el.id==pmRow.teamupID)
      pmRow.colour=response.teamupColors.find(el=>el.id==pmRow.colourRef.color).hex
      return pmRow
    }))
  },
  getSqlPlannerTasks:(req,res)=>{
    db.query(`select * from plannerTasks order by dateRelation DESC, isnull(dateOffset,999)`, (err,ptR) => {
      res.status(200).send(ptR.recordset)
    })
  },
  getTeamupTasks:(req,res)=>{
    let params={
      query:'task-done/'+req.body.quoteID+'/',
      startDate:'2000-01-01',
      endDate:req.body.endDate
    }
    console.log(params)
    teamupReq.get('/events/',{
      params: params
    }).then(function(events){
      console.log(events,events.data.events)
      res.status(200).send(events.data.events)
    }).catch(function (error) {
      console.log(error);
      res.status(500).send(error)
    })
  },
  postTasksToTeamup:(req,res)=>{
    var i=0
    let errorTasks=[]
    var groups=req.body.tasks.map(el=>JSON.parse(el.remote_id).group).filter((el,i,self)=>self.indexOf(el)==i)
    console.log("ALL TASKS",req.body.tasks)
    let projID="(select top 1 projectID from projects where quoteID="+JSON.parse(req.body.tasks[0].remote_id).quoteID+")"
    db.query("select * from ProjectTaskAudits where doneByStaffID is not null and projectID="+projID, (err,doneAuditsR) => {
      db.query("delete from ProjectTaskAudits where auditID not in("+doneAuditsR.recordset.map(el=>el.auditID).join(",")+") and projectID="+projID, (err,audR) => {
        db.query("select * from PlannerTasks", (err,ptR) => {
          function sendTask(){
            if (i<req.body.tasks.length) {
              var task=req.body.tasks[i]
              delete task.taskName
              delete task.groupName
              delete task.interval
              delete task.include
              delete task.fwStart
              task.subcalendar_ids=[task.subcalendar_id]
              teamupReq.post('/events',task).then(function(response){
                console.log("TASK POSTED",task)
                if (!doneAuditsR.recordset.map(el=>el.taskID).includes(JSON.parse(task.remote_id).taskID)) {
                  console.log("INSERTING AUDIT",JSON.parse(task.remote_id).taskID,task.start_dt)
                  db.input('plannerGroup',JSON.parse(task.remote_id).group)
                  db.query("insert into ProjectTaskAudits (taskID,dueDate,projectID,plannerGroup,teamupID,teamupVersion) VALUES ("+JSON.parse(task.remote_id).taskID+",'"+task.start_dt+"',(select top 1 projectID from projects where quoteID="+JSON.parse(task.remote_id).quoteID+"),@plannerGroup,'"+response.data.event.id+"','"+response.data.event.version+"')")
                }
              }).then((response) => {
                i++
                sendTask()
              }).catch(function (error) {
                errorTasks.push(task)
                i++
                sendTask()
              });
            }else {
              res.status(200).send(errorTasks)
            }
          }
          // res.status(200).send('done')
          sendTask()
        });
      })
    })
  },
  deleteTasksFromTeamup:(req,res)=>{
    var i=0
    function deleteTask(){
      if (i<req.body.tasks.length) {
        var task=req.body.tasks[i]
        teamupReq.delete('/events/'+task.id,{
          params: {
            version:task.version,
            redit:'all'
          }
        }).then((response) => {
          i++
          deleteTask()
        }, (error) => {
          console.log(error)
          console.log(task)
          if (error.response.status==404) {
            i++
            deleteTask()
          }else {
            res.status(500).send(error)
          }
        });
      }else {
        res.status(200).send('done')
      }
    }
    // console.log(req.body.tasks)
    // res.status(200).send('done')
    deleteTask()
  },
  taskDone:(req,res)=>{
    const moment = require('moment');
    db.input('group',req.params.group)
    db.query("update ProjectTaskAudits set doneDate=getdate(), doneByStaffID=(select top 1 staffID from users where userID="+req.user.user+") where projectID=(select top 1 projectID from projects where quoteID="+req.params.quoteID+") and taskID="+req.params.taskID+" and plannerGroup=@group", (err,updR) => {
      if (err) {
        res.status(500).send(err)
        console.log(err)
      }
      db.query("select * from ProjectTaskAudits where projectID=(select top 1 projectID from projects where quoteID="+req.params.quoteID+") and taskID="+req.params.taskID+" and plannerGroup=@group", (err,taskR) => {
        let thisEvent=taskR.recordset[0]
        if (thisEvent) {
          teamupReq.delete('/events/'+thisEvent.teamupID).then((response) => {
            console.log(req.user.uName,"marked teamup event as done",thisEvent)
            res.render("confirmation.ejs",{
              title:"Task done",
              message:"This task has now been marked as complete.",
              redirect:"https://teamup.com/ks2b2409e75351521d"
            })
          }, (error) => {
            console.log(error,thisEvent);
            if (error.response.status==404) {
              res.render("confirmation.ejs",{
                title:"Task done",
                message:"This task has now been marked as complete, but cannot be deleted from Teamup. Please delete the task manually from your planner.",
                redirect:null,
                params:null
              })
            }else {
              res.status(500).send(error)
            }
          });
        }else {
          res.status(500).send("Task not found")
        }
      })
    })
  },
  getProjectQueries:(req,res)=>{
    let queryQ=`
    declare @staffID smallint=(select staffID from Users where userID=`+req.user.user+`)
    declare @userID smallint=`+req.user.user+`

    select ProjectQueries.queryID,projectID,queryPos,jobID,raisedByID,seenDate,raisedForID,raisedDate,query,repliesCount,newRepliesCount,resolved,queryCat,isUrgent
    from
    ProjectQueries
    left join (select eventID,eventParentID,eventType,seenBy,MAX(seenDate) seenDate from SeenLog group by eventID,eventParentID,eventType,seenBy) SeenLog on SeenLog.eventType='ProjectQueries' and SeenLog.eventID=ProjectQueries.queryID and SeenLog.eventParentID=ProjectQueries.projectID and SeenLog.seenBy=@userID
    left join (
  		select count(r.replyID) as repliesCount, sum(CASE WHEN seen IS NULL and (raisedByID=@staffID or raisedForID=@staffID or parent.replyFromID=@staffID) THEN 1 ELSE 0 END) as newRepliesCount, count(isResolution) as resolved, r.queryID
  		from
  		ProjectQueryReplies r
  		left join ProjectQueries q on q.queryID=r.queryID
  		outer apply(select top 1 replyFromID from ProjectQueryReplies where queryID=r.queryID and replyID<>r.replyID order by replyDate DESC) parent
  		left join (select count(seenID) as seen, eventID from SeenLog where seenBy=@userID and eventType='ProjectQueryReplies' group by eventID) SeenLog on SeenLog.eventID=r.replyID
  		group by r.queryID
  	) replies on replies.queryID=ProjectQueries.queryID
    where projectID=`+req.params.projectID
    let replyQ=`
    select reply,ProjectQueryReplies.queryID,staffName
    from
    ProjectQueryReplies
    left join ProjectQueries on ProjectQueries.queryID=ProjectQueryReplies.queryID
    left join Staff on StaffID=replyFromID
    where projectID=`+req.params.projectID
    let imgQ=`
    select src,ProjectQueryImages.queryID
    from
    ProjectQueryImages
    left join ProjectQueries on ProjectQueries.queryID=ProjectQueryImages.queryID
    where ProjectQueryImages.replyID is NULL and projectID=`+req.params.projectID
    db.query(queryQ, (err,queriesR) => {
      if (err) {
        console.log(err)
        console.log(queryQ)
        res.status(500).send(err)
      }
      db.query(replyQ, (err,replyR) => {
        db.query(imgQ, (err,imgR) => {
          res.status(200).send(queriesR.recordset.map(el=>{
            el.replyData=replyR.recordset.filter(el2=>el2.queryID==el.queryID).map(el2=>{
              var nameArr=el2.staffName.split(" ")
              var init=nameArr[0].charAt(0).toUpperCase()
              init=init+(nameArr[1]?nameArr[1].charAt(0).toUpperCase():'')
              return {reply:el2.reply,from:init}
            })
            el.queryImages=imgR.recordset.filter(el2=>el2.queryID==el.queryID).map(el2=>el2.src)
            return el
          }))
        })
      })
    })
  },
  projectQueryPage:(req,res)=>{
    let staffQ=`
    select staff.staffID,staffName,staffJobTitleID,roleID,userID
    from
    staff
    left join Users on users.staffID=staff.staffID
    where staffLeft is null and staff.staffID>1 and isUserActive=1
    order by staffName`
    let jobsQ=`
    select * from jobs where projectID=`+req.params.projectID
    let projectQ=`
    select * from projects left join quotes on quotes.quoteID=projects.quoteID where projectID=`+req.params.projectID
    db.query(staffQ, (err,staffR) => {
      if (err) {
        res.send(err)
      }
      db.query(jobsQ, (err,jobsR) => {
        if (err) {
          res.send(err)
        }
        db.query(projectQ, (err,projectR) => {
          if (err) {
            res.send(err)
          }
          res.render('project-queries.ejs', {
            title:"Project Queries",
            staff:staffR.recordset,
            jobs:jobsR.recordset,
            user:req.user.user,
            project:projectR.recordset[0],
          })
        })
      })
    })
  },
  addProjectQuery:(req,res)=>{
    let insQ=`INSERT INTO ProjectQueries (
      projectID,
      queryPos,
      jobID,
      raisedByID,
      raisedForID,
      raisedDate,
      queryCat,
      query
    ) VALUES (
      `+req.body.projectID+`,
      `+req.body.queryPos+`,
      `+req.body.jobID+`,
      `+req.body.raisedByID+`,
      `+req.body.raisedForID+`,
      `+req.body.raisedDate+`,
      `+req.body.queryCat+`,
      @queryTxt
    )
    SELECT SCOPE_IDENTITY() as id
    `
    db.input("queryTxt",req.body.query)
    db.query(insQ, (err,insR) => {
      if (err) {
        res.status(500).send(err)
        console.log(err)
        console.log(insQ)
      }
      res.status(200).send(insR.recordset[0])
    })
  },
  getQueryReplies:(req,res)=>{
    let selectQ=`
    select * from ProjectQueryReplies
    left join (select count(seenID) as seen, eventID from SeenLog where seenBy=`+req.user.user+` and eventType='ProjectQueryReplies' group by eventID) SeenLog on SeenLog.eventID=ProjectQueryReplies.replyID
    where queryID=`+req.params.queryID+` order by replyDate`
    db.query(selectQ, (err,resp) => {
      if (err) {
        console.log(err)
        res.status(500).send(err)
      }
      var i=0
      function addSeen(){
        if (i<resp.recordset.length) {
          var record=resp.recordset[i]
          if (!record.seen) {
            db.query("insert into SeenLog (seenDate,eventType,eventID,seenBy,eventParentID) VALUES (getDate(),'ProjectQueryReplies',"+record.replyID+","+req.user.user+","+record.queryID+")", (err,resp) => {
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
        }
      }
      addSeen()
      res.status(200).send(resp.recordset)
    })
  },
  addProjectqueryReply:(req,res)=>{
    let insQ=`insert into ProjectQueryReplies (queryID,reply,replyDate,replyFromID) VALUES (`+req.body.queryID+`,@reply,'`+req.body.replyDate+`',`+req.body.replyFromID+`)
    select SCOPE_IDENTITY() as id`
    db.input("reply",req.body.reply)
    db.query(insQ, (err,insR) => {
      if (err) {
        res.status(500).send(err)
        console.log(err)
        console.log(insQ)
      }
      res.status(200).send(insR.recordset[0])
    })
  },
  getProject:(req,res)=>{
    let selectQ=`
    select * from
    quotes
    left join projects on projects.quoteID=quotes.quoteID
    where projects.projectID=`+req.params.projectID
    let dataQ=`select dataFormatID from ProjectDataFormats where projectID=`+req.params.projectID
    let notesQ=`SELECT * FROM AllNotes WHERE jobID=`+req.params.projectID
    let costsQ=`select * from ProjectCosts where projectID=`+req.params.projectID
    let jobsQ=`select * from jobs where projectID=`+req.params.projectID
    let jobCPIQ=`select * from jobCPIs where jobID IN (select jobID from jobs where projectID=`+req.params.projectID+`)`
    db.query(selectQ, (err,selectR) => {
      if (err) {
        res.status(500).send(err)
        console.log(err)
        console.log(insQ)
      }
      db.query(dataQ, (err,dataR) => {
        db.query(notesQ, (err,notesR) => {
          db.query(costsQ, (err,costsR) => {
            db.query(jobsQ, (err,jobsR) => {
              res.status(200).send({
                project:selectR.recordset,
                dataFormats:dataR.recordset.map(el=>el.dataFormatID),
                notes:notesR.recordset,
                costs:costsR.recordset,
                jobs:jobsR.recordset,
              })
            })
          })
        })
      })
    })
  },
  repeatProject:(req,res)=>{
    let projectQ=`
    update projects
    set
      projectCM=r.projectCM,
      projectDP=r.projectDP,
      projectTL=r.projectTL,
      projectGrade=r.projectGrade,
      setupCost=r.setupCost,
      dataCost=r.dataCost,
      sampleCost=r.sampleCost,
      codingCost=r.codingCost,
      verbsCodingNumber=r.verbsCodingNumber,
      quotedIR=r.quotedIR,
      closingNotes=r.closingNotes,
      sampleSupplier=r.sampleSupplier,
      sampleRatio=r.sampleRatio,
      isProjectIdentified=r.isProjectIdentified,
      codingRequired=r.codingRequired,
      tabsRequired=r.tabsRequired
    from
      (select TOP 1 * from projects where projectID=`+req.body.repeatOf+`) r
    where projects.projectID=`+req.body.projectID
    let dataFormatsQ=`
    insert into ProjectDataFormats (projectID,dataFormatID)
    select `+req.body.projectID+`,dataFormatID from ProjectDataFormats
    where projectID=`+req.body.repeatOf
    let costsQ=`
    insert into ProjectCosts (costName,unitValue,units,projectID,costTypeID)
    select costName,unitValue,units,`+req.body.projectID+`,costTypeID from ProjectCosts
    where projectID=`+req.body.repeatOf
    let datesQ=`
    insert into ProjectDates (dateName,dateValue,projectID,datePos)
    select dateName,dateValue,`+req.body.projectID+`,datePos from ProjectDates
    where projectID=`+req.body.repeatOf
    let notesQ=`
    insert into AllNotes (tableName,jobID,otherID,note,page)
    select tableName,`+req.body.projectID+`,otherID,note,page from AllNotes
    where jobID=`+req.body.repeatOf+` and page='edit'`
    let closingNotesQ=`
    insert into AllNotes (tableName,jobID,otherID,note,page)
    values ('Projects',`+req.body.projectID+`,7,(select closingNotes from projects where projectID=`+req.body.repeatOf+`),'edit')`
    let jobQ=`
    insert into Jobs (projectID,jobName,startDate,endDate,dataDate,tablesDate,interviewsTarget,jobCPI,hourlyTarget,expectedLOI,isJobDay,isJobEve,isJobBusiness,isJobConsumer,isJobConfirmit,isJobInHouse,isJobCATI,isJobOnline,isJobFace,isJobRecruitment,isJobValidation,isJobRecontacts,isJobInternational,isJobDP,isJobHourly,resourceTarget,CPIreduction)
    select `+req.body.projectID+`,jobName,startDate,endDate,dataDate,tablesDate,interviewsTarget,jobCPI,hourlyTarget,expectedLOI,isJobDay,isJobEve,isJobBusiness,isJobConsumer,isJobConfirmit,isJobInHouse,isJobCATI,isJobOnline,isJobFace,isJobRecruitment,isJobValidation,isJobRecontacts,isJobInternational,isJobDP,isJobHourly,resourceTarget,CPIreduction from Jobs
    where projectID=`+req.body.repeatOf
    let deleteQ1=`delete from ProjectDataFormats where projectID=`+req.body.projectID
    let deleteQ2=`delete from ProjectCosts where projectID=`+req.body.projectID
    let deleteQ3=`delete from ProjectDates where projectID=`+req.body.projectID
    let deleteQ4=`delete from AllNotes where jobID=`+req.body.projectID+` and page='edit'`
    db.query(deleteQ1+deleteQ2+deleteQ3+deleteQ4, (err,deleteR) => {
      if (err) {
        console.log("Could not delete project info",err,deleteQ1+deleteQ2+deleteQ3+deleteQ4)
        logger.info("Could not delete project info in repeatProject",err,deleteQ1+deleteQ2+deleteQ3+deleteQ4)
        res.status(500).send({error:"Could not delete project info"})
      }
      db.query(projectQ, (err,projectR) => {
        if (err) {
          console.log("Could not copy project",err,projectQ)
          logger.info("Could not copy project in repeatProject",err,projectQ)
          res.status(500).send({error:"Could not copy project"})
        }
        db.query(dataFormatsQ, (err,dataFormatsR) => {
          if (err) {
            console.log("Could not copy dataFormats",err,dataFormatsQ)
            logger.info("Could not copy dataFormats in repeatProject",err,dataFormatsQ)
            res.status(500).send({error:"Could not copy dataFormats"})
          }
          db.query(costsQ, (err,costsR) => {
            if (err) {
              console.log("Could not copy costs",err,costsQ)
              logger.info("Could not copy costs in repeatProject",err,costsQ)
              res.status(500).send({error:"Could not copy costs"})
            }
            db.query(datesQ, (err,datesR) => {
              if (err) {
                console.log("Could not copy dates",err,datesQ)
                logger.info("Could not copy dates in repeatProject",err,datesQ)
                res.status(500).send({error:"Could not copy dates"})
              }
              db.query(notesQ, (err,notesR) => {
                if (err) {
                  console.log("Could not copy notes",err,notesQ)
                  logger.info("Could not copy notes in repeatProject",err,notesQ)
                  res.status(500).send({error:"Could not copy notes"})
                }
                db.query(closingNotesQ, (err,closingNotesR) => {
                  if (err) {
                    console.log("Could not copy closing notes",err,notesQ)
                    logger.info("Could not copy closing notes in repeatProject",err,notesQ)
                    res.status(500).send({error:"Could not copy closing notes"})
                  }
                  db.query(jobQ, (err,jobR) => {
                    if (err) {
                      console.log("Could not copy target groups",err,jobQ)
                      logger.info("Could not copy target groups in repeatProject",err,jobQ)
                      res.status(500).send({error:"Could not copy target groups"})
                    }
                    res.status(200).send("success")
                  })
                })
              })
            })
          })
        })
      })
    })
  },
  getQuickReviewQueries:(req,res)=>{
    let thisStaffID=req.body.staffID
    if (!thisStaffID) {
      thisStaffID="(select top 1 staffID from users where userID="+req.user.user+")"
    }
    let thisUser="(select top 1 userID from users where staffID="+thisStaffID+")"
    let queryQ=`
    declare @thisUserQr smallint=`+thisUser+`
    select projectID,queryID,jobID,raisedByID,raisedForID,raisedDate,query,seenDate,reply,replyID,replyDate,replyFromID,replyFromID as addressedByID,resolved
    from
    ViewProjectQueries
    where
    userID=@thisUserQr
    and projectid=@thisProject
    and isNew=1`
    let additionalQ=`
    declare @thisStaffQR smallint=`+thisStaffID+`
    select ProjectQueryReplies.replyID, ProjectQueryReplies.reply, ProjectQueryReplies.replyDate, ProjectQueryReplies.replyFromID, ProjectQueryReplies.queryID, seenDate
  	from
  	ProjectQueryReplies left join (select eventID,eventParentID,eventType,seenBy,MAX(seenDate) seenDate from SeenLog group by eventID,eventParentID,eventType,seenBy) SeenLog on SeenLog.eventType='ProjectQueryReplies' and SeenLog.eventID=ProjectQueryReplies.replyID and SeenLog.eventParentID=ProjectQueryReplies.queryID and SeenLog.seenBy=`+req.user.user+`
  	left join ProjectQueryReplies r2 on r2.queryID=ProjectQueryReplies.queryID and r2.replyDate>ProjectQueryReplies.replyDate and r2.replyFromID=@thisStaffQR
  	where r2.replyID is null
  	and ProjectQueryReplies.replyFromID<>@thisStaffQR
  	order by ProjectQueryReplies.replyID ASC`
    db.input('thisProject',req.body.projectID)
    db.query(queryQ, (err,queryR) => {
      if (err) {
        logger.info("Error getting queryQ in getQuickReviewQueries",req.user.uName,err,queryQ)
        console.log("Error getting queryQ in getQuickReviewQueries",req.user.uName,err,queryQ)
      }
      db.query(additionalQ, (err,additionalR) => {
        if (err) {
          logger.info("Error getting additionalQ in getQuickReviewQueries",req.user.uName,err,additionalQ)
          console.log("Error getting additionalQ in getQuickReviewQueries",req.user.uName,err,additionalQ)
        }
        res.send({queries:queryR?queryR.recordset:[],additions:additionalR?additionalR.recordset:[],userID:thisUser,userID:thisStaffID})
      })
    })
  },
  addQueryImg:(req,res)=>{
    let insQ=`insert into ProjectQueryImages (queryID,replyID,src) VALUES (`+req.body.queryID+`,`+req.body.replyID+`,'`+req.body.src+`')
    select SCOPE_IDENTITY() as id`
    db.query(insQ, (err,insR) => {
      if (err) {
        res.status(500).send(err)
        console.log(err)
        console.log(insQ)
      }
      res.status(200).send(insR.recordset[0])
    })
  },
  deleteQueryImg:(req,res)=>{
    const fs = require('fs');
    let delQ=`delete from ProjectQueryImages where queryID=`+req.body.queryID+` and replyID`+(req.body.replyID?'='+req.body.replyID:' is null')+` `+(req.body.src?`and src='`+req.body.src+`'`:'')
    db.query(delQ, (err,delR) => {
      if (err) {
        res.status(500).send(err)
        console.log(err)
        console.log(insQ)
      }
      fs.unlink(publicPath + req.body.src, function(err) {
        res.status(200).send('done');
      });
    })
  },
  getProjectJobs:(req,res)=>{
    db.query("Select jobID,jobName from jobs where projectID="+req.params.jid, (err,insR) => {
      if (err) {
        res.status(500).send(err)
        console.log(err)
      }
      res.status(200).send(insR.recordset)
    })
  },
  updateProjectAudit:(req,res)=>{
    db.input('group',req.body.group)
    db.query("update ProjectTaskAudits set doneDate='"+req.body.doneDate+"', doneByStaffID='"+req.body.doneByStaffID+"' where projectID="+req.body.projectID+" and taskID="+req.body.taskID+" and plannerGroup=@group", (err,updR) => {
      if (err) {
        res.status(500).send(err)
        console.log(err)
      }
      res.status(200).send("success")
    })
  },
  addProjectAudit:(req,res)=>{
    console.log(req.body)
    db.input('group',req.body.group)
    db.query("insert into ProjectTaskAudits (projectID,taskID,plannerGroup,dueDate) VALUES ("+req.body.projectID+","+req.body.taskID+",@group,getDate())", (err,updR) => {
      if (err) {
        res.status(500).send(err)
        console.log(err)
      }
      res.status(200).send("success")
    })
  },
  deleteProjectAudit:(req,res)=>{
    console.log(req.body)
    db.input('group',req.body.group)
    db.query("delete from ProjectTaskAudits where projectID="+req.body.projectID+" and taskID="+req.body.taskID+" and plannerGroup=@group", (err,updR) => {
      if (err) {
        res.status(500).send(err)
        console.log(err)
      }
      res.status(200).send("success")
    })
  },
  sampleOutcomeUpload:(req,res)=>{
    const _ = require('lodash')
    if (!req.files && !req.body.sampleOutcomePaste) {
      res.status(500).send({error: 'No file detected'});
    }
    function parseData(sheet,isSheetJS){
      let data={headers:Object.keys(sheet[0]),data:sheet}
      if (!isSheetJS) {
        let firstRow=sheet[0]
        let colHeaders=Object.entries(firstRow)
        // socketio.to(req.body.sid).emit("file-headers-ready-"+req.body.projectID,{headers:colHeaders,data:null})
        sheet.shift()
        console.log(sheet.length)
        data={headers:colHeaders,data:sheet.map((row,i)=>{
          let keyCounts={}
          let obj={}
          for (const [key, value] of Object.entries(row)) {
            let headerKey=firstRow[key]
            keyCounts[headerKey]=keyCounts[headerKey]==undefined?0:keyCounts[headerKey]+1
            let newKey=headerKey+(keyCounts[headerKey]>0?"_"+keyCounts[headerKey]:'')
            obj[newKey]=value
          }
          return obj
        })}
      }
      data.data=data.data.map((row, i) => {
        let valsArr=[]
        asyncForEach(Object.keys(row),key=>{
          let cell=row[key]
          let val=valsArr.find(el=>el.val==cell)
          if (val) {
            val.count++
          }else {
            valsArr.push({val:cell,count:1})
          }
        })
        asyncForEach(valsArr.filter(el=>el.count>5 && isNaN(el.val/1)),val=>{
          asyncForEach(Object.keys(row),key=>{
            row[key]=val.val==row[key]?'':row[key]
          })
        });
        return row
      });
      data.headers=data.headers.map(h=>([...h,...[(data.data.filter(el=>el[h[1]]).length/data.data.length)*100]]))
      return data
    }
    const csv=require('csvtojson')
    if (req.files) {
      if (req.files.sampleOutcome.mimetype!="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
        if (req.files.sampleOutcome.mimetype!='text/plain') {
          console.log("filetype error")
          res.status(500).send({error: 'Must be an Excel or a .txt file'});
        }else {
          let str=req.files.sampleOutcome.data.toString('utf16le')
          console.log(_.truncate(str,{length:200}),str.split(/\r\n/g)[0],str.split(/\r\n/g)[0].split("\t"))
          socketio.to(req.body.sid).emit("file-headers-ready-"+req.body.projectID,{headers:str.split(/\r\n/g)[0].split("\t"),data:null})
          let data=csv({
            noheader:true,
            trim:true,
            delimiter:'\t'
          }).fromString(str).then((e)=>{
            res.send(parseData(e))
          })
        }
      }else {
        if (req.files.sampleOutcome.size>10000000 && req.body.acceptLarge==0) {
          res.send({warning:"Warning: The file you've uploaded is large and may take a while to upload. Would you like to continue?"})
        }else {
          var xlsx = require("xlsx");
          let workbook = xlsx.read(req.files.sampleOutcome.data,{sheetRows:2})
          let sheets=workbook.SheetNames
          let sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheets[0]],{defval:""});
          console.log(sheetData)
          socketio.to(req.body.sid).emit("file-headers-ready-"+req.body.projectID,{headers:Object.keys(sheetData[0]),data:null})
          // const excelToJson = require('convert-excel-to-json');
          // let data=excelToJson({source: req.files.sampleOutcome.data})
          // let firstSheet=data[Object.keys(data)[0]]
          // res.send(parseData(firstSheet))
          let workbook2 = xlsx.read(req.files.sampleOutcome.data)
          let sheetData2 = xlsx.utils.sheet_to_json(workbook2.Sheets[sheets[0]],{defval:""});
          res.send(parseData(sheetData2,true))
        }
      }
    }else {
      console.log(req.body.sampleOutcomePaste.split(/\r\n/g).length)
      socketio.to(req.body.sid).emit("file-headers-ready-"+req.body.projectID,{headers:req.body.sampleOutcomePaste.split(/\r\n/g)[0].split("\t"),data:null})
      let data=csv({
        noheader:true,
        trim:true,
        delimiter:'\t'
      }).fromString(req.body.sampleOutcomePaste).then((e)=>{
        res.send(parseData(e))
      })
    }
  },
  sampleOutcomes:(req,res)=>{
    let projectQ=`select * from Projects
    left join Quotes on Quotes.quoteID=Projects.quoteID
    left join Contacts on Contacts.contactID=quotes.contactID
    left join Staff on staff.staffID=Projects.projectCM
    left join (select projectID as pid,count(*) as pcCount from prevComps group by projectID) c on c.pid=Projects.projectID
    WHERE Projects.ProjectID=`+req.params.projectID
    db.query(projectQ,(err,projectR)=>{
      if (err) {
        console.log(err)
        res.send(err)
      }
      res.render('sample-outcome.ejs',{
        title:'Sample outcomes',
        project:projectR.recordset[0]
        ,success_msg: req.flash('success_msg')
        ,error_msg: req.flash('error_msg')
      })
    })
  },
  sampleOutcomeCount:(req,res)=>{
    let q=`
    select COUNT(*) c from (
      select sampleID from PrevComps where projectID=`+req.query.projectID+`
      union
      select sampleID from PrevCompResults where projectID=`+req.query.projectID+`
    ) x
    select COUNT(*) c from PrevComps where projectID=`+req.query.projectID
    db.multiple=true
    db.query(q,(err,r)=>{
      res.send({all:r.recordsets[0][0].c,added:r.recordsets[1][0].c})
    })
  },
  sampleOutcomesForsta:(req,res)=>{
    let projectQ=`select * from Projects
    left join Quotes on Quotes.quoteID=Projects.quoteID
    left join Contacts on Contacts.contactID=quotes.contactID
    left join Staff on staff.staffID=Projects.projectCM
    left join (select projectID as pid,count(*) as pcCount from prevComps group by projectID) c on c.pid=Projects.projectID
    outer apply (select top 1 vistaName from jobs where vistaName is not null and jobs.projectID=Projects.projectID) j
    where isProjectClosed=1
    `
    db.query(projectQ,(err,projectR)=>{
      if (err) {
        console.log(err)
        res.send(err)
      }
      db.query("SELECT COLUMN_NAME col,DATA_TYPE dataType FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'prevComps'",(err,pccols)=>{
        res.render('sample-outcome-forsta.ejs',{
          title:'Sample outcomes',
          projectID:req.params.projectID,
          columns:pccols.recordset,
          tabulatorUpdated:true,
          projects:projectR.recordset
          ,success_msg: req.flash('success_msg')
          ,error_msg: req.flash('error_msg')
        })
      })
    })
  },
  forstaOutcomesDownload:(req,res)=>{
    console.log(req.body)
    const _ = require('lodash')
    const libphonenumber = require('libphonenumber-js')
    let getTitle=v=>v?_.truncate(v.titles?v.titles[0].text:(v.texts?v.texts[0].text:(v.name?v.name:v.code)),{length:50}):""
    let totalCount=0
    let sendUpdate=(msg)=>socketio.to(req.body.sid).emit("sampleOutcomes-progress",msg)
    req.body.sampleFilter=(req.body.dataFilters || []).map(f=>f.query || ("IN("+f.db+":"+f.q+","+f.r.map(rr=>"'"+rr+"'").join(",")+")")).join(" and ")
    // req.body.completesFilter="response:E2='1'"
    req.body.respondents=true
    req.body.variables=req.body.surveyVariables
    let infoCounts={}
    getForstaData(req.body,req.params.type=="preview",sendUpdate).then(resp=>{
      let surveyData=resp.data.filter(r=>r.E2===undefined || r.E2==1)
      let schema=resp.schema
      totalCount=resp.totalCount
      infoCounts.total=totalCount
      infoCounts.E2=totalCount-surveyData.length
      infoCounts.telnum=0
      let mappedData=[]
      let sqlData=[]
      // console.log(schema)
      let cleaners={
        telnum:val=>{
          if (val) {
            if (libphonenumber.isValidPhoneNumber(val,"GB")) {
              val="0"+libphonenumber.parsePhoneNumber(val,"GB").nationalNumber
            }else {
              val=""
            }
          }else {
            val=""
          }
          return val
        },
        email:val=>{
          var validRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
          if (val) {
            if (!val.match(validRegex) || val.indexOf("refused")>-1) {
              val=""
            }
          }else {
            val=""
          }
          return val
        },
        name:val=>{
          return _.startCase(_.toLower(val))
        }
      }
      for (var i = 0; i < surveyData.length; i++) {
        let row=surveyData[i]
        // console.log(row)
        let valid=true
        let mapped={}
        let sqlMapped={}
        let cols=Object.keys(req.body.mapping)
        for (var j = 0; j < cols.length; j++) {
          let col=cols[j]
          let val=""
          let sourceQ=""
          let cleaner=cleaners[col]===undefined?v=>v:cleaners[col]
          if(req.body.mapping[col].surveyQs) {
            let mapQs=req.body.mapping[col].surveyQs
            let mapQ=mapQs.find(q=>q.split(":")[1]?(row[q.split(":")[0]]?cleaner(row[q.split(":")[0]][q.split(":")[1]]):false):cleaner(row[q.split(":")[0]]))
            if (mapQ) {
              sourceQ=mapQ
              if (mapQ.split(":")[1]) {
                let field=mapQ.split(":")[1]
                mapQ=mapQ.split(":")[0]
                let qs=schema.find(s=>s.name==mapQ)
                if (!qs.fields) {
                  console.log("Mapping for variable "+col+" specified field where no fields were found")
                }else if(qs) {
                  if (qs.options) {
                    val=getTitle(qs.options.find(o=>o.code==row[mapQ][field]))
                  }else if(qs){
                    val=row[mapQ][field]
                  }
                }
              }else {
                let qs=schema.find(s=>s.name==mapQ)
                if (qs) {
                  if (qs.options) {
                    val=getTitle(qs.options.find(o=>o.code==row[mapQ]))
                  }else{
                    val=row[mapQ]
                  }
                }else {
                  val=row[mapQ]
                }
              }
            }else if (req.body.mapping[col].val) {
              val=req.body.mapping[col].val
            }
          }else {
            val=req.body.mapping[col].val
          }
          //validation
          val=cleaner(val)
          if (col=="telnum" && !val) {
            valid=false
            infoCounts.telnum++
          }
          mapped[col]={
            val:val,
            sourceQ:sourceQ
          }
          sqlMapped[col]=val
        }
        if (sqlMapped.result!="Completed") {
          delete mapped.interviewed
          delete sqlMapped.interviewed
        }
        if (valid) {
          sqlData.push(sqlMapped)
          mappedData.push(mapped)
        }
      }
      // console.log(req.params)
      if (req.params.type=="preview") {
        res.send({data:mappedData,totalCount:totalCount})
      }else if (req.params.type=="upload") {
        // console.log(sqlData)
        let data=sqlData
        let variables=req.body.sqlVariables
        let callVariables=req.body.callVariables
        let cols=variables.concat(callVariables)
        const transaction = new sql.Transaction()
        transaction.begin(err => {
          let thisDb=new sql.Request(transaction);
          let getq='select '+cols.join(",")+' from PrevComps cross apply(select top 1 result,resultDate,callCount from PrevCompResults where resultID<0) r where sampleID<0'
          thisDb.query(getq,(err,result)=>{
            if (err) {
              console.log(err,getq)
              transaction.rollback()
              res.status(500).send({error:err})
            }
            var sampleTable=result.recordset.toTable('#TempPrevCompsTable')
            // console.log(sampleTable.columns,sampleTable.columns[sampleTable.columns.findIndex(c=>c.name=="SampleID")])
            sampleTable.columns[sampleTable.columns.findIndex(c=>c.name=="SampleID")].nullable=true
            sampleTable.create=true
            async function addRows(row,cb){
              await sampleTable.rows.add(...cols.map(c=>row[c]===undefined?null:row[c]))
              cb()
            }
            sendUpdate("Rendering data for JA2 database")
            promForEach(data,(row,i,rnext)=>{
              // console.log(row)
              row.resultDate=new Date(row.resultDate)
              row.interviewed=row.interviewed?new Date(row.interviewed):null
              // console.log(row)
              addRows(row,rnext)
            }).then(e=>{
              sendUpdate("Uploading to JA2 database")
              thisDb.bulk(sampleTable, (err, result) => {
                if (err) {
                  console.log(err)
                  transaction.rollback()
                  res.status(500).send({error:err})
                }else {
                  let testupdates=`select * from #TempPrevCompsTable`
                  let updateVars=variables.filter(v=>v!="SampleID")
                  let dedupe=`
                  select count(*) c from #TempPrevCompsTable;
                  WITH CTE(telnum,
                      DuplicateCount)
                  AS (SELECT telnum,
                             ROW_NUMBER() OVER(PARTITION BY telnum
                             order by E2 desc) AS DuplicateCount
                      FROM #TempPrevCompsTable)
                  DELETE FROM CTE
                  WHERE DuplicateCount > 1;
                  select count(*) c from #TempPrevCompsTable;
                  `
                  thisDb.multiple=true
                  thisDb.batch(dedupe,(err,ddr)=>{
                    if (err) {
                      console.log(err)
                      transaction.rollback()
                      res.status(500).send({error:err})
                    }else {
                      // console.log(ddr)
                      infoCounts.dedupe=ddr.recordsets[0][0].c-ddr.recordsets[1][0].c
                    }
                    let updates=`
                    `+(req.body.overwriteExisting=="true"?"delete from prevComps where projectID="+req.body.projectID+"; delete from PrevCompResults where projectID="+req.body.projectID:"")+`
                    --select sampleID from #TempPrevCompsTable
                    --for testing
                    --select * into #PrevCompsTester from prevComps
                    --MERGE #PrevCompsTester pc
                    --end
                    MERGE PrevComps pc
                    USING #TempPrevCompsTable AS r ON r.telnum=pc.telnum
                    WHEN MATCHED THEN
                    UPDATE SET
                    `+updateVars.map(c=>c+"=isnull(pc."+c+",r."+c+")").join(",")+`
                    WHEN NOT MATCHED THEN
                    INSERT (
                      `+updateVars.join(",")+`
                    )
                    VALUES (
                      `+updateVars.map(c=>"r."+c).join(",")+`
                    )
                    OUTPUT
                    $action,
                    inserted.*,
                    deleted.*;

                    --select pc.sampleID,projectID,`+callVariables.join(",")+` from #TempPrevCompsTable t left join (select telnum,sampleID from PrevComps) pc on pc.telnum=t.telnum where result<>'Fresh sample'
                    insert into PrevCompResults (sampleID,projectID,`+callVariables.join(",")+`) select pc.sampleID,projectID,`+callVariables.join(",")+` from #TempPrevCompsTable t left join (select telnum,sampleID from PrevComps) pc on pc.telnum=t.telnum where result<>'Fresh sample'
                    update projects set outcomesDone=getdate() where projectID=`+req.body.projectID+`
                    delete from prevcompresults where resultID not in (select max(resultID) from prevcompresults group by projectID,sampleID)

                    select count(*) c from #TempPrevCompsTable t where result='Fresh sample' and sampleID in (select sampleID from prevcomps pc where pc.telnum=t.telnum)
                    select count(*) c,result from #TempPrevCompsTable group by result
                    `
                    thisDb.multiple=true
                    console.log(updates)
                    thisDb.batch(updates,(err,updateR)=>{
                      if (err) {
                        console.log(err,updates)
                        transaction.rollback()
                        res.status(500).send({error:err})
                      }else {
                        // console.log(updateR.recordsets)
                        transaction.commit(err=>{
                          if (err) {
                            console.log("ERROR IN COMMIT",err)
                            transaction.rollback()
                            res.status(500).send({error:err})
                          }else {
                            let updated=[]
                            infoCounts.noAction=updateR.recordsets[1][0].c
                            console.log(updateR.recordsets[2])
                            let inserted=updateR.recordsets[0].filter(el=>el.$action=="INSERT")
                            res.send({data:mappedData,infoCounts:infoCounts})
                          }
                        })
                      }
                    })
                  })
                }
              })
            })
          })
        })
      }
    }).catch(err=>{
      res.status(500).send({error:err})
    })
  },
  updateOutcomesMap:(req,res)=>{
    // console.log("updating mapping",req.body)
    if (req.body.mapping=='') {
      db.query("select outcomesMap from projects where projectID="+req.body.projectID,(err,r)=>{
        res.send(r.recordset[0].outcomesMap)
      })
    }else {
      let map=JSON.parse(req.body.mapping)
      let done=map.completes.find(el=>el.name=='ignoreOutcomescompletes' && el.value=='true') && map.sample.find(el=>el.name=='ignoreOutcomessample' && el.value=='true')?'getdate()':'outcomesDone'
      db.input('mapping',req.body.mapping)
      db.query("update projects set outcomesMap=@mapping,outcomesDone="+done+" where projectID="+req.body.projectID,(err,r)=>{
        if (err) {
          console.log(err)
        }
        res.send("done")
      })
    }
  },
  uploadSampleOutcomes:(req,res)=>{

    // console.log(req.body.sid,req.body.projectID)
    let sendUpdate=(msg,percDone)=>socketio.to(req.body.sid).emit("progress-update-outcomes-"+req.body.projectID,msg+(percDone!==undefined?(' '+Math.round(percDone*100)+"%"):''))
    const moment = require('moment');
    let completes=req.body.completesData?req.body.completesData:'[]'
    let sample=req.body.sampleData?req.body.sampleData:'[]'
    let sampleData=JSON.parse(completes).concat(JSON.parse(sample))
    let resultsData=sampleData.filter(el=>el['Last call time'])
    let newSample=sampleData.filter(el=>!el.JA2ID)
    let rCount=0
    let dCount=0
    let thisDb=new sql.Request();
    // thisDb.query(`IF OBJECT_ID('tempdb.dbo.#newSample', 'U') IS NOT NULL
    // DROP TABLE #newSample;`,err=>{
      sendUpdate("Creating temporary table for completes")
      thisDb.query('update projects set outcomesDone=getdate() where projectID='+req.body.projectID)
      thisDb.query('select projectID,serial,name,telnum,email,interviewed,gender,age,postcode,ethnicity,company,employees,industry,jobTitle,region,sampleSource,telnum2,email,email2,turnover,decisionMaking,specialistDb,SEG,workingStatus,ward,E2 from PrevComps where sampleID<0', (err, result) => {
        var table=result.recordset.toTable('##newSample')
        table.create=true
        table.columns.add('id', sql.Int)
        table.columns.add('JA2ID',sql.Int,{nullable: true})
        if (sampleData.length>0) {
          let data=sampleData
          let i=0
          console.log(data.length)
          async function addRows(){
            if (i<data.length) {
              let row=data[i]
              sendUpdate("Populating temporary table for completes",(i+1)/data.length)
              await table.rows.add(req.body.projectID, row.Serial, row.Name, row.Telnum, row.Email?row.Email:'', row['Interviewed date']?new Date(moment.utc(row['Interviewed date']).format("YYYY-MM-DD HH:mm")):null, row.Gender, row.Age, row.Postcode, row.Ethnicity, row['Company name'], row['Employee size'], row.Industry, row['Job title'], row.Region,row['Sample source'],row['Alternative telnum'],row['Alternative email'],row.Turnover,row['Decision making areas'],row['Specialist DB'],row['Social Grade'],row['Working Status'],row['Ward/District'],row.E2,i,row.JA2ID?row.JA2ID:null)
              i++
              addRows()
            }else {
              console.log("added temp sample rows",table.rows.length)
              thisDb.bulk(table, (err, result) => {
                if (err && data.length>0) {
                  console.log(err)
                  res.status(500).send(err)
                }
                console.log("sent to sql")
                // console.log(table.rows)
                // console.log(thisDb)
                sendUpdate("Cleaning & deduping completes against main database")
                let updates=`
                select * into #newSample2 from ##newSample
                --add new sample info based on phone number, where original is null
                update p set
                `+table.columns.filter(el=>el.name!='id' && el.name!='JA2ID').map(el=>'p.'+el.name+'=coalesce(p.'+el.name+',n.'+el.name+')').join(",")+`
                from PrevComps p left join #newSample2 n on n.telnum=p.telnum

                --exclude new records which are already in db
                delete from #newSample2 where telnum in (select telnum from PrevComps p) or JA2ID is not null

                --delete internal dupes
                delete from #newSample2 where id not in (select min(id) as id from #newSample2 group by telnum)

                select * from #newSample2
                drop table #newSample2
                IF OBJECT_ID('tempdb.dbo.#newSample') IS NOT NULL drop table ##newSample`
                thisDb.batch(updates,(err,newSample)=>{
                  if (err) {
                    console.log(err,updates)
                    res.status(500).send("Please try again")
                  }
                  console.log("cleaned temp sample",newSample.recordset.length)
                  sendUpdate("Adding completes to main database")
                  var newTable=newSample.recordset.toTable('prevComps')
                  newTable.columns=newTable.columns.filter(el=>el.name!='id' && el.name!='JA2ID')
                  console.log(newTable.columns)
                  function addNew(){
                    if (newTable.rows.length>0) {
                      return thisDb.bulk(newTable)
                    }else {
                      return thisDb.query("select 0")
                    }
                  }
                  addNew().then((r,err) => {
                    if (err) {
                      console.log(err)
                    }
                    console.log("sent to sql")
                    rCount=rCount+newTable.rows.length
                    if (resultsData.length>0) {
                      sendUpdate("Creating temporary table for unused sample")
                      // db.query('select * from PrevComps', (err, prevComps) => {
                        db.query('select result,resultDate,projectID,sampleID,callCount from PrevCompResults where resultID<0', (err, result) => {
                          var rtable=result.recordset.toTable('##PrevCompResultsTemp')
                          rtable.create=true
                          rtable.columns.add('telnum', sql.VarChar(50), {nullable: false})
                          let r=0
                          async function addRows(){
                            if (r<data.length) {
                              let row=data[r]
                              sendUpdate("Populating temporary table for unused sample",(r+1)/data.length)
                              // console.log(row)
                              await rtable.rows.add(row['Last call'], new Date(moment.utc(row['Last call time']).format("YYYY-MM-DD HH:mm")), req.body.projectID, (!row.JA2ID?0:row.JA2ID), row['Call count'],row.Telnum)
                              r++
                              addRows()
                            }else {
                              console.log("added results rows",rtable.rows.length)
                              db.bulk(rtable, (err, result) => {
                                if (err) {
                                  console.log(err)
                                  res.status(500).send(err)
                                }else {
                                  sendUpdate("Cleaning & deduping unused sample against main database")
                                  let addSampleID=`
                                  select * into #pcrTemp from ##PrevCompResultsTemp
                                  update r set r.sampleID=pc.sampleID from #pcrTemp r left join prevComps pc on pc.telnum=r.telnum where r.sampleID=0 and pc.sampleID is not null
                                  select * from #pcrTemp where sampleID is not null
                                  drop table #pcrTemp
                                  drop table ##PrevCompResultsTemp
                                  `
                                  db.batch(addSampleID,(err,resultClean)=>{
                                    if (err) {
                                      console.log(err)
                                    }
                                    console.log("sampleID matchup done")
                                    var rcTable=resultClean.recordset.toTable('PrevCompResults')
                                    rcTable.columns=rcTable.columns.filter(el=>el.name!='telnum')
                                    // console.log(rcTable.columns.map(el=>el.name))
                                    sendUpdate("Adding unused sample to main database")
                                    db.bulk(rcTable, (err, result) => {
                                      if (err) {
                                        console.log(err)
                                        res.status(500).send(err)
                                      }else {
                                        console.log("sent to sql")
                                        dCount=dCount+result.rowsAffected
                                        // console.log("RESULTS TO UPLOAD",rtable.rows.length)
                                        db.query('delete from prevcompresults where resultID not in (select max(resultID) from prevcompresults group by projectID,sampleID)')
                                        // req.flash('success_msg','Added '+rCount+' new records, and added outcomes for '+dCount+' database records.')
                                        // req.session.save(function () {
                                          //   res.redirect('/sample-outcomes/'+req.body.projectID)
                                          // })
                                          res.send('Added '+(isNaN(rCount)?0:rCount)+' new records, and added outcomes for '+(isNaN(dCount)?0:dCount)+' database records.')
                                        }
                                      })
                                    })
                                  }
                                })
                              }
                            }
                            addRows()
                          })
                          // })
                        }else {
                          // req.flash('success_msg','Added '+rCount+' new records to the database, and added outcomes for '+dCount+' database records.')
                          // req.session.save(function () {
                            //   res.redirect('/sample-outcomes/'+req.body.projectID)
                            // })
                            res.send('Added '+(isNaN(rCount)?0:rCount)+' new records, and added outcomes for '+(isNaN(dCount)?0:dCount)+' database records.')
                          }
                        }).catch(err=>console.log(err))
                      })
                    })
                  }
                }
                addRows()
              }else {
                // req.flash('success_msg','Added '+rCount+' new records to the database, and added outcomes for '+dCount+' database records.')
                // req.session.save(function () {
                  //   res.redirect('/sample-outcomes/'+req.body.projectID)
                  // })
                  res.send('Added '+rCount+' new records, and added outcomes for '+dCount+' database records.')
                }
              })
    // })
  },
  addTaskInfo:(req,res)=>{
    res.render('add-task-info.ejs',{
      title:"Add task info",
      params:req.params
    })
  },
  addTimedLOI:(req,res)=>{
    db.query("update jobs set timedLOI="+req.body.timedLOI+" where plannerGroup='"+req.body.group+"' and jobID in (select jobID from viewJobsStats where jobQuoteID="+req.body.quoteID+")",(err,r)=>{
      if (err) {
        console.log(err,q)
        res.send(err)
      }else {
        res.redirect('/task-done/'+req.body.quoteID+'/'+req.body.group+'/1')
      }
    })
  },
  checkCsat:(req,res)=>{
    const moment = require('moment-business-days');
    let q=`
    select *,cm.staffName as cmName,pm.staffName as pmName from
    projects p
    left join Staff cm on cm.staffID=p.projectCM
    left join Staff pm on pm.staffID=p.projectDP
    left join quotes q on q.quoteID=p.quoteID
    where csatComplete is null`
    db.query(q,(err,r)=>{
      if (err) {
        console.log(err)
      }
      req.body.data.sort((a,b)=>new Date(b.respDate).getTime()-new Date(a.respDate).getTime())
      let matchedJobs=r.recordset.filter(job=>req.body.data.find(el=>el.csatID==job.csatID))
      let j=0
      console.log(matchedJobs)
      function loopJobs(){
        let job=matchedJobs[j]
        if (job) {
          let scores=req.body.data.find(el=>el.csatID==job.csatID)
          db.input('dte',new Date(scores.start_time))
          db.input('csatID',job.csatID)
          db.query(`update projects set csatComplete=@dte where csatID=@csatID`,(err,r2)=>{
            if (err) {
              console.log(err)
            }
            console.log(job,scores)
            let poorScore=Object.keys(scores).filter(el=>el.indexOf('s5')>-1 && scores[el]).filter(el=>scores[el]<7 && scores[el]>-1)[0]
            if (poorScore) {
              let complaintQ=`
              insert into complaints
              (raisedDate,complainantName,complainantEmail,projectID,ownerID,priority,reason,action,categoryID,clientSatID,outcomeDue)
              VALUES
              (@raisedDate,@complainantName,@complainantEmail,`+job.projectID+`,`+job.projectCM+`,3,@reason,'Internal debrief',1,@clientSatID,@outcomeDue)
              select SCOPE_IDENTITY() as id
              `
              db.input('raisedDate',new Date(scores.start_time))
              db.input('complainantName',scores.cName)
              db.input('complainantEmail',scores.cEmail)
              db.input('reason','Client feedback score of '+scores[poorScore]+' at '+poorScore+'. Comments: "'+scores.s4+'"')
              db.input('clientSatID',scores.BrokerPanelId)
              db.input('outcomeDue',new Date(moment().add(7,'d').format("YYYY-MM-DD")))
              db.query(complaintQ,(err,complaintR)=>{
                if (err) {
                  console.log("Error inserting csat response into complaints",err,complaintQ)
                  logger.info("Error inserting csat response into complaints",err,complaintQ)
                }else {
                  let sendTo=['katy@teamsearchmr.co.uk','matt@teamsearchmr.co.uk']
                  sendTo.push(job.staffEmail[0])
                  let mailOptions = {
                    from:'Complaints <reports@teamsearchmr.co.uk>',
                    to: sendTo,
                    // to: 'matt@teamsearchmr.co.uk',
                    subject: 'New CSAT complaint added - '+job.quoteNo+' '+job.quoteName+' - ID '+complaintR.recordset[0].id,
                    html: '<p>' + header + '<p>A new complaint has been started as a result of poor client feedback. The complaint will be owned by '+job.cmName+'. The deadline to complete the initial investigation is '+moment().add(7,'d').format("DD/MM/YYYY")+'. For full details click the link below:<br><br>http://job-analysis:8080/edit-complaint/'+complaintR.recordset[0].id+'<br><br>' + footer + '</p>',
                    priority: 'high'
                  }
                  transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                      console.log(error);
                      logger.info("Failed to send complaint added confirmation: ",mailOptions)
                    }
                  });
                }
              })
            }
            let ynScale=["","Yes","No","n/a"]
            let isValid=(val)=>((!isNaN(val/1) && val>=0) || ynScale.includes(val)?val:'n/a')
            let html=`
            <table>
            <tbody>
            <tr>
            <td>
            <p><strong>Job num</strong></p>
            </td>
            <td>
            <p>`+job.quoteNo+`</p>
            </td>
            </tr>
            <tr>
            <td>
            <p><strong>JOB NAME</strong></p>
            </td>
            <td>
            <p>`+job.quoteName+`</p>
            </td>
            </tr>
            <tr>
            <td>
            <p><strong>CM</strong></p>
            </td>
            <td>
            <p>`+job.cmName+`</p>
            </td>
            </tr>
            <tr>
            <td>
            <p><strong>PM</strong></p>
            </td>
            <td>
            <p>`+(job.projectDP>1?job.pmName:'n/a')+`</p>
            </td>
            </tr>
            <tr>
            <td>
            <p><strong>Overall Satisfaction</strong></p>
            </td>
            <td>
            <p>`+isValid(scores.s5)+`</p>
            </td>
            </tr>
            <tr>
            <td>
            <p><strong>PMsat - scripting</strong></p>
            </td>
            <td>`+isValid(scores.s5_1)+`</td>
            </tr>
            <tr>
            <td>
            <p><strong>PMsat - data</strong></p>
            </td>
            <td>`+isValid(scores.s5_2)+`</td>
            </tr>
            <tr>
            <td>
            <p><strong>CMsat - management</strong></p>
            </td>
            <td>`+isValid(scores.s5_3)+`</td>
            </tr>
            <tr>
            <td>
            <p><strong>CMsat - comms</strong></p>
            </td>
            <td>`+isValid(scores.s5_4)+`</td>
            </tr>
            <tr>
            <td>
            <p><strong>Started on time?</strong></p>
            </td>
            <td>`+isValid(ynScale[scores.s1a])+`</td>
            </tr>
            <tr>
            <td>
            <p><strong>Finished on time?</strong></p>
            </td>
            <td>`+isValid(ynScale[scores.s1b])+`</td>
            </tr>
            <tr>
            <td>
            <p><strong>Hit quotas?</strong></p>
            </td>
            <td>`+isValid(ynScale[scores.s1c])+`</td>
            </tr>
            <tr>
            <td>
            <p><strong>Removed hassle?</strong></p>
            </td>
            <td>`+isValid(ynScale[scores.s2])+`</td>
            </tr>
            <tr>
            <td>
            <p><strong>Where met satisfaction</strong></p>
            </td>
            <td>`+scores.s3+`</td>
            </tr>
            <tr>
            <td>
            <p><strong>Where could improve</strong></p>
            </td>
            <td>`+scores.s4+`</td>
            </tr>
            <tr>
            <td>
            <p><strong>Proj. Man</strong></p>
            </td>
            <td>`+scores.cName+`</td>
            </tr>
            </tbody>
            </table>`
            let mailOptions = {
              to:[job.staffEmail[0],job.staffEmail[1],'matt@teamsearchmr.co.uk','katy@teamsearchmr.co.uk','telunit@teamsearchmr.co.uk'],
              // to:['matt@teamsearchmr.co.uk'],
              subject: `You've got feedback! - `+job.quoteNo+" "+job.quoteName,
              html: '<p>' + header + html + footer + '</p>'
            };
            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                  return console.log(error);
              }
              j++
              loopJobs()
            });
          })
        }else {
          res.send("done")
        }
      }
      loopJobs()
    })
  },
  getHourlyAHR:(req,res)=>{
    let q=`
    select r.jobID,jobName,reportHour,nullif(SUM(cast(hourWorked as int)),0) hours,(0.00+sum(inputInterviews))/nullif(SUM(cast(hourWorked as int)),0) ahr
    from
    AskiaLiveReports r
    left join jobs j on j.jobID=r.jobID
    left join Projects p on p.projectID=j.projectID
    left join Quotes q on q.quoteID=p.quoteID
    where q.quoteID=`+req.query.quoteID+`
    group by r.jobID,reportHour,jobName
    order by r.jobID,reportHour
    `
    db.query(q,(err,r)=>{
      res.send(r.recordset)
    })
  },
  dedicatedTeams:(req,res)=>{
    let q='select * from jobs j outer apply (select * from getJobQuote(j.jobID)) q where isJobCATI=1'
    req.params.projectID=Number(req.params.projectID)
    if (req.params.projectID) {
      q=q+' and projectID='+req.params.projectID
    }else {
      q=q+' and jobID in (select jobID from dedicatedTeams)'
    }
    db.query(q,(err,r)=>{
      res.render('dedicated-teams.ejs',{
        title:'Dedicated teams'+(req.params.projectID&&r.recordset.length?(' for '+r.recordset[0].quoteNo+" "+r.recordset[0].quoteName):''),
        jobs:r.recordset,
        projectID:req.params.projectID
      })
    })
  }
}
